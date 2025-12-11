/**
 * [生产版 v3.0 - 双数据库支持]
 * 云函数：deleteFile
 * 描述：处理文件删除请求，同步删除TOS上的物理文件和项目数据库中的文件引用。
 *
 * --- v3.0 更新日志 ---
 * - [架构升级] 新增 dbVersion 参数支持，v2 使用 agentworks_db 数据库
 * - [实现优化] 从 HTTP API 调用改为直接 MongoDB 操作，提高性能和可靠性
 * - [字段扩展] 支持 settlementFiles（结算文件）和 projectFiles（项目文件）两种文件类型
 * - [向后兼容] 默认 dbVersion=v1 保持与 byteproject 的兼容
 *
 * --- v2.1 更新日志 ---
 * - [核心BUG修复] 修正了 require('https) 语句中缺失的单引号
 *
 * --- v2.0 更新日志 ---
 * - [核心功能] 新增了完整的数据库操作逻辑
 */
const { MongoClient } = require('mongodb');
const { TosClient } = require('@volcengine/tos-sdk');

// --- MongoDB 配置 ---
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME_V1 = process.env.MONGO_DB_NAME || 'kol_data';
const DB_NAME_V2 = 'agentworks_db';
const PROJECTS_COLLECTION = 'projects';

// --- TOS 配置 (部署时必须设置) ---
const TOS_ACCESS_KEY_ID = process.env.TOS_ACCESS_KEY_ID;
const TOS_SECRET_ACCESS_KEY = process.env.TOS_SECRET_ACCESS_KEY;
const TOS_ENDPOINT = process.env.TOS_ENDPOINT;
const TOS_REGION = process.env.TOS_REGION;
const TOS_BUCKET_NAME = process.env.TOS_BUCKET_NAME;

// MongoDB 连接复用
let client;

/**
 * 连接 MongoDB
 */
async function connectToDatabase() {
    if (client && client.topology && client.topology.isConnected()) {
        return client;
    }
    client = new MongoClient(MONGO_URI);
    await client.connect();
    return client;
}

/**
 * 从 URL 中提取 TOS 文件 Key
 * 支持两种格式：
 * 1. 直接 TOS URL: https://{bucket}.{endpoint}/{key}
 * 2. 预览代理 URL: .../preview-file?fileKey={key}
 */
function getKeyFromUrl(url) {
    try {
        const parsedUrl = new URL(url);
        // 格式1: 直接 TOS URL
        if (parsedUrl.hostname === `${TOS_BUCKET_NAME}.${TOS_ENDPOINT}`) {
            return parsedUrl.pathname.substring(1);
        }
        // 格式2: 预览代理 URL
        if (parsedUrl.pathname.endsWith('/preview-file') && parsedUrl.searchParams.has('fileKey')) {
            const fileKey = parsedUrl.searchParams.get('fileKey');
            if (fileKey) return fileKey;
        }
        console.warn(`URL格式无法识别: ${url}`);
        return null;
    } catch (error) {
        console.error("从URL解析文件名时发生异常:", url, error);
        return null;
    }
}

/**
 * 主处理函数
 *
 * 请求参数：
 * - projectId: 项目 ID（必填）
 * - fileUrl: 文件 URL（必填）
 * - dbVersion: 数据库版本，'v1' (kol_data) 或 'v2' (agentworks_db)，默认 'v1'
 * - fileType: 文件类型，'projectFiles' 或 'settlementFiles'，默认 'projectFiles'
 */
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ message: "Method Not Allowed" }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const {
            projectId,
            fileUrl,
            dbVersion = 'v1',
            fileType = 'projectFiles'
        } = body;

        // 参数验证
        if (!projectId || !fileUrl) {
            return {
                statusCode: 400, headers,
                body: JSON.stringify({ success: false, message: '请求体中缺少必要的字段 (projectId, fileUrl)。' })
            };
        }

        // 验证 fileType
        const validFileTypes = ['projectFiles', 'settlementFiles'];
        if (!validFileTypes.includes(fileType)) {
            return {
                statusCode: 400, headers,
                body: JSON.stringify({
                    success: false,
                    message: `无效的 fileType: ${fileType}。有效值: ${validFileTypes.join(', ')}`
                })
            };
        }

        const fileKey = getKeyFromUrl(fileUrl);
        if (!fileKey) {
            return {
                statusCode: 400, headers,
                body: JSON.stringify({ success: false, message: `提供的fileUrl格式无法被服务器识别: ${fileUrl}` })
            };
        }

        // 选择数据库
        const DB_NAME = dbVersion === 'v2' ? DB_NAME_V2 : DB_NAME_V1;
        console.log(`[deleteFile] 使用数据库: ${DB_NAME} (dbVersion=${dbVersion}), 文件类型: ${fileType}`);

        // --- 步骤 1: 从 TOS 删除物理文件 ---
        console.log(`[${projectId}] 准备从TOS删除文件, Key: ${fileKey}`);
        const tosClient = new TosClient({
            accessKeyId: TOS_ACCESS_KEY_ID,
            accessKeySecret: TOS_SECRET_ACCESS_KEY,
            endpoint: TOS_ENDPOINT,
            region: TOS_REGION,
        });

        try {
            await tosClient.deleteObject({ bucket: TOS_BUCKET_NAME, key: fileKey });
            console.log(`[${projectId}] 文件已从TOS成功删除。`);
        } catch (tosError) {
            if (tosError.statusCode === 404) {
                console.log(`[${projectId}] 文件在TOS上未找到 (404)，可能已被删除。将继续执行数据库清理。`);
            } else {
                throw tosError;
            }
        }

        // --- 步骤 2: 从数据库中移除文件引用（直接 MongoDB 操作）---
        console.log(`[${projectId}] 准备更新数据库，移除文件引用: ${fileUrl}`);

        const dbClient = await connectToDatabase();
        const collection = dbClient.db(DB_NAME).collection(PROJECTS_COLLECTION);

        // 查询项目
        const project = await collection.findOne({ id: projectId });
        if (!project) {
            console.warn(`[${projectId}] 项目不存在于数据库 ${DB_NAME}`);
            return {
                statusCode: 404, headers,
                body: JSON.stringify({ success: false, message: `项目 ${projectId} 不存在` })
            };
        }

        // 获取当前文件列表
        const currentFiles = project[fileType];
        if (!Array.isArray(currentFiles)) {
            console.log(`[${projectId}] 项目没有 ${fileType} 字段或不是数组，无需更新。`);
            return {
                statusCode: 200, headers,
                body: JSON.stringify({ success: true, message: '文件删除完成（TOS 已清理）。' })
            };
        }

        // 过滤掉要删除的文件
        const updatedFiles = currentFiles.filter(file => file.url !== fileUrl);

        // 如果文件列表有变化，更新数据库
        if (updatedFiles.length < currentFiles.length) {
            await collection.updateOne(
                { id: projectId },
                {
                    $set: {
                        [fileType]: updatedFiles,
                        updatedAt: new Date()
                    }
                }
            );
            console.log(`[${projectId}] 数据库更新成功，${fileType} 从 ${currentFiles.length} 减少到 ${updatedFiles.length} 个文件。`);
        } else {
            console.log(`[${projectId}] 文件引用已在数据库中不存在，无需更新。`);
        }

        return {
            statusCode: 200, headers,
            body: JSON.stringify({
                success: true,
                message: '文件删除流程处理完成。',
                dbVersion,
                fileType
            }),
        };

    } catch (error) {
        console.error(`[deleteFile] 删除文件时发生严重错误:`, error);
        return {
            statusCode: 500, headers,
            body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message }),
        };
    }
};

