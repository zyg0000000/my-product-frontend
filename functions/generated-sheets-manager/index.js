/**
 * @file 云函数: generated-sheets-manager
 * @version 2.1.0
 * @date 2025-11-24
 * @changelog
 * - v2.1.0 (2025-11-24): 修复删除飞书文件权限问题
 *   - 将直接删除 API 改为移动到回收站 API（解决权限不足问题）
 *   - 针对权限错误 (Code: 1062501) 特殊处理：跳过飞书删除，直接删除数据库记录
 *   - 优化错误日志，增加详细的错误信息输出
 * - v2.0.0 (之前): Feishu File Deletion
 *   - 新增了在删除历史记录时，同步删除飞书云端电子表格的功能
 *   - 遵循"先删云端，再删本地"的原则
 *   - 增加了 axios 用于和飞书API进行通信
 *
 * @description
 * - [核心功能] 管理飞书表格生成历史记录，支持创建、查询、删除操作
 * - [删除策略] 优先将飞书文件移动到回收站，如遇权限问题则跳过并直接删除数据库记录
 * - [严谨性] 遵循"先处理云端，再处理本地"的原则
 * - [依赖] 使用 axios 与飞书 API 通信
 * - [配置] 需要环境变量: FEISHU_APP_ID, FEISHU_APP_SECRET
 */

const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

// --- 版本信息 ---
const VERSION = '2.1.0';

// --- 配置信息 ---
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = 'kol_data';
const COLLECTION_NAME = 'generated_sheets';

// 飞书应用凭证，需要配置在云函数环境变量中
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

// --- 模块级缓存 ---
let cachedDb = null;
let tenantAccessToken = null;
let tokenExpiresAt = 0;

// --- 数据库连接管理 ---
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
}

// --- 飞书认证 ---
async function getTenantAccessToken() {
    if (Date.now() < tokenExpiresAt && tenantAccessToken) {
        return tenantAccessToken;
    }
    if (!APP_ID || !APP_SECRET) {
        throw new Error('环境变量 FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置。');
    }
    try {
        const response = await axios.post(
            'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
            { app_id: APP_ID, app_secret: APP_SECRET }
        );
        if (response.data.code !== 0) {
            throw new Error(`获取 tenant_access_token 失败: ${response.data.msg}`);
        }
        tenantAccessToken = response.data.tenant_access_token;
        tokenExpiresAt = Date.now() + (response.data.expire - 300) * 1000; // 提前5分钟过期
        return tenantAccessToken;
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("getTenantAccessToken error:", errorMessage);
        throw new Error(`获取飞书 token 时发生网络或API错误: ${errorMessage}`);
    }
}


// --- 统一响应工具 ---
const createResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify(body),
    };
};

// --- 云函数主处理程序 ---
exports.handler = async (event, context) => {
    console.log(`[v${VERSION}] 云函数开始执行 - Method: ${event.httpMethod}`);

    // 预检请求处理
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(204, {});
    }

    try {
        const db = await connectToDatabase();
        const collection = db.collection(COLLECTION_NAME);
        const method = event.httpMethod;
        const queryParams = event.queryStringParameters || {};

        console.log(`[v${VERSION}] 请求参数:`, { method, queryParams });

        // --- API 路由逻辑 ---

        // GET 和 POST 逻辑保持不变
        if (method === 'GET') {
            const { projectId } = queryParams;
            if (!projectId) {
                return createResponse(400, { error: 'projectId is required' });
            }
            const records = await collection.find({ projectId }).sort({ createdAt: -1 }).toArray();
            return createResponse(200, { data: records });
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body || 'null');
            if (queryParams.action === 'migrate') {
                const recordsToMigrate = body;
                if (!Array.isArray(recordsToMigrate) || recordsToMigrate.length === 0) {
                    return createResponse(400, { error: 'Invalid migration data' });
                }
                const tokens = recordsToMigrate.map(r => r.sheetToken).filter(Boolean);
                const existingRecords = await collection.find({ sheetToken: { $in: tokens } }).toArray();
                const existingTokens = new Set(existingRecords.map(r => r.sheetToken));
                const newRecords = recordsToMigrate.filter(r => r.sheetToken && !existingTokens.has(r.sheetToken));

                if (newRecords.length > 0) {
                    const recordsToInsert = newRecords.map(r => ({
                        projectId: r.projectId,
                        fileName: r.fileName,
                        sheetUrl: r.sheetUrl,
                        sheetToken: r.sheetToken,
                        createdBy: "migration",
                        createdAt: new Date(r.timestamp || Date.now())
                    }));
                    await collection.insertMany(recordsToInsert);
                }
                return createResponse(200, { message: 'Migration complete', migrated: newRecords.length });
            } else {
                const { projectId, fileName, sheetUrl, sheetToken, createdBy } = body;
                if (!projectId || !fileName || !sheetUrl || !sheetToken) {
                    return createResponse(400, { error: 'Missing required fields' });
                }
                const newRecord = { projectId, fileName, sheetUrl, sheetToken, createdBy: createdBy || "unknown", createdAt: new Date() };
                const result = await collection.insertOne(newRecord);
                return createResponse(201, { data: { ...newRecord, _id: result.insertedId } });
            }
        }

        // [核心修改] 重写 DELETE 逻辑
        if (method === 'DELETE') {
            const { id } = queryParams;
            if (!id || !ObjectId.isValid(id)) {
                return createResponse(400, { error: 'Valid record id is required' });
            }
            
            // 步骤 1: 从数据库查找记录，获取 sheetToken
            const recordToDelete = await collection.findOne({ _id: new ObjectId(id) });
            if (!recordToDelete) {
                // 如果记录本就不存在，直接返回成功，避免前端报错
                return createResponse(204, {});
            }

            const sheetToken = recordToDelete.sheetToken;
            
            // 如果记录没有关联的 sheetToken，直接删除数据库记录即可
            if (!sheetToken) {
                await collection.deleteOne({ _id: new ObjectId(id) });
                return createResponse(204, {});
            }

            // 步骤 2: 调用飞书 API 将文件移动到回收站
            // 注意：直接删除需要用户权限，这里改用移动到回收站 API（只需 tenant_access_token）
            try {
                const accessToken = await getTenantAccessToken();
                console.log(`[Feishu API] Attempting to move file to recycle bin with token: ${sheetToken}`);

                // 使用移动到回收站 API 代替直接删除
                // https://open.feishu.cn/open-apis/drive/v1/files/{file_token}/trash
                const response = await axios.post(
                    `https://open.feishu.cn/open-apis/drive/v1/files/${sheetToken}/trash`,
                    { type: 'sheet' }, // 请求体指定文件类型
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.code === 0) {
                    console.log(`[Feishu API] Successfully moved file to recycle bin: ${sheetToken}`);
                } else {
                    console.warn(`[Feishu API] Move to recycle bin returned non-zero code: ${response.data.code}, msg: ${response.data.msg}`);
                }
            } catch (feishuError) {
                const status = feishuError.response?.status;
                const feishuCode = feishuError.response?.data?.code;
                const feishuMsg = feishuError.response?.data?.msg || '未知飞书API错误';

                console.error('Feishu API Error Details:', {
                    status,
                    code: feishuCode,
                    message: feishuMsg,
                    sheetToken
                });

                // 特殊情况处理
                if (status === 404) {
                    // 文件不存在，认为已删除，继续删除数据库记录
                    console.warn(`[Feishu API] File with token ${sheetToken} not found on Feishu. Proceeding to delete local record.`);
                } else if (feishuCode === 1062501 || feishuCode === 1061045) {
                    // 权限错误处理（宽容策略）
                    // Code 1062501: operate node no permission - 文件操作权限不足
                    // Code 1061045: file not found - 文件不存在
                    // 可能原因：
                    // 1. 文件已被手动删除
                    // 2. 文件被移动到其他文件夹导致权限变化
                    // 3. 文件被共享后所有者改变
                    // 4. 文件已在回收站中
                    // 5. 飞书应用权限配置发生变化
                    // 策略：跳过飞书删除，直接删除数据库记录
                    console.warn(`[Feishu API] Permission or access denied (Code: ${feishuCode}). File may be deleted, moved, or inaccessible. Proceeding to delete local record.`);
                } else {
                    // 其他错误：严格遵守约定，中断操作并返回错误
                    console.error('Failed to move Feishu file to recycle bin:', feishuError.response ? feishuError.response.data : feishuError.message);
                    return createResponse(502, {
                        error: 'Failed to delete the file in Feishu',
                        message: `移动飞书文件到回收站失败：${feishuMsg} (Code: ${feishuCode || 'unknown'})`
                    });
                }
            }
            
            // 步骤 3: 飞书文件删除成功（或已不存在）后，删除数据库记录
            await collection.deleteOne({ _id: new ObjectId(id) });
            console.log(`[MongoDB] Successfully deleted record with id: ${id}`);

            return createResponse(204, {}); // 204 No Content 表示成功删除
        }

        return createResponse(404, { error: 'Not Found' });

    } catch (error) {
        console.error('An error occurred:', error);
        return createResponse(500, { error: 'Internal Server Error', message: error.message });
    }
};
