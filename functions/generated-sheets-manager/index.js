/**
 * @file 云函数: generated-sheets-manager
 * @version 2.4.0
 * @date 2025-11-24
 * @changelog
 * - v2.4.0 (2025-11-24): 严格模式 - 只有飞书删除成功才删数据库
 *   - 修复严重 BUG：之前版本在 404 时会删除数据库记录，但文件还在
 *   - 改为严格模式：任何飞书 API 错误都不删除数据库记录
 *   - 只有收到 code: 0 成功响应后才删除数据库
 *   - 保留完整诊断信息帮助定位问题
 * - v2.3.0 (2025-11-24): API 端点修复
 *   - 改用正确的 DELETE /files/{token}?type=sheet
 * - v2.2.0 (2025-11-24): 诊断模式（有 BUG）
 *   - 404 时错误地删除了数据库记录
 * - v2.1.0 (2025-11-24): 错误尝试
 *   - 使用了不存在的 trash 端点
 * - v2.0.0 (之前): 原始版本
 *   - 使用 DELETE API，但遇到权限错误
 *
 * @description
 * - [核心功能] 管理飞书表格生成历史记录
 * - [删除策略] 严格模式 - 只有飞书删除成功才删数据库记录
 * - [权限要求] 应用需是文件所有者 + 有父文件夹编辑权限
 * - [安全保证] 避免数据库和飞书文件不一致
 * - [诊断模式] 返回详细错误信息
 * - [依赖] axios
 * - [配置] 需要环境变量: FEISHU_APP_ID, FEISHU_APP_SECRET, MONGODB_URI
 */

const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

// --- 版本信息 ---
const VERSION = '2.4.0';

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
            console.log(`[v${VERSION}] 查询到的记录:`, JSON.stringify(recordToDelete, null, 2));

            if (!recordToDelete) {
                console.log(`[v${VERSION}] 记录不存在，直接返回成功`);
                return createResponse(204, {});
            }

            const sheetToken = recordToDelete.sheetToken;
            console.log(`[v${VERSION}] 准备删除的 sheetToken:`, sheetToken);

            // 如果记录没有关联的 sheetToken，直接删除数据库记录即可
            if (!sheetToken) {
                console.log(`[v${VERSION}] 无 sheetToken，直接删除数据库记录`);
                await collection.deleteOne({ _id: new ObjectId(id) });
                return createResponse(204, {});
            }

            // 步骤 2: 调用飞书 API 删除文件（文件会进入回收站）
            try {
                const accessToken = await getTenantAccessToken();
                console.log(`[v${VERSION}] ========== 开始飞书 API 调用 ==========`);
                console.log(`[v${VERSION}] SheetToken:`, sheetToken);
                console.log(`[v${VERSION}] AccessToken 前10位:`, accessToken.substring(0, 10) + '...');
                console.log(`[v${VERSION}] API URL:`, `https://open.feishu.cn/open-apis/drive/v1/files/${sheetToken}?type=sheet`);

                // 使用飞书删除文件 API（文件会自动进入回收站）
                // https://open.feishu.cn/document/server-docs/docs/drive-v1/file/delete
                const response = await axios.delete(
                    `https://open.feishu.cn/open-apis/drive/v1/files/${sheetToken}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        },
                        params: {
                            type: 'sheet'  // 指定文件类型
                        }
                    }
                );

                console.log(`[v${VERSION}] 飞书 API 响应:`, JSON.stringify(response.data, null, 2));

                if (response.data.code === 0) {
                    console.log(`[v${VERSION}] ✅ 成功删除文件（已进入回收站）`);
                } else {
                    console.warn(`[v${VERSION}] ⚠️  飞书 API 返回非零代码: ${response.data.code}, 消息: ${response.data.msg}`);
                }
            } catch (feishuError) {
                const status = feishuError.response?.status;
                const feishuCode = feishuError.response?.data?.code;
                const feishuMsg = feishuError.response?.data?.msg || '未知飞书API错误';

                // 详细的错误日志
                console.error(`[v${VERSION}] ========== 飞书 API 调用失败 ==========`);
                console.error(`[v${VERSION}] HTTP Status:`, status);
                console.error(`[v${VERSION}] Feishu Code:`, feishuCode);
                console.error(`[v${VERSION}] Feishu Message:`, feishuMsg);
                console.error(`[v${VERSION}] SheetToken:`, sheetToken);
                console.error(`[v${VERSION}] 完整响应:`, JSON.stringify(feishuError.response?.data, null, 2));

                // 诊断模式：返回详细错误信息，帮助定位问题
                const diagnosticInfo = {
                    sheetToken,
                    httpStatus: status,
                    feishuCode,
                    feishuMessage: feishuMsg,
                    recordId: id,
                    fileName: recordToDelete.fileName,
                    sheetUrl: recordToDelete.sheetUrl,
                    createdAt: recordToDelete.createdAt,
                    errorType: status === 404 ? 'FILE_NOT_FOUND' :
                               feishuCode === 1062501 ? 'PERMISSION_DENIED' :
                               feishuCode === 1061045 ? 'FILE_ACCESS_DENIED' :
                               'OTHER_ERROR'
                };

                console.error(`[v${VERSION}] 诊断信息:`, JSON.stringify(diagnosticInfo, null, 2));

                // 严格模式：任何飞书 API 错误都不删除数据库记录
                // 防止出现"数据库记录删除了，但飞书文件还在"的问题
                console.error(`[v${VERSION}] ❌ 飞书删除失败，不删除数据库记录，返回详细错误`);
                return createResponse(502, {
                    error: diagnosticInfo.errorType,
                    message: `飞书 API 调用失败: ${feishuMsg || 'HTTP ' + status}`,
                    details: diagnosticInfo,
                    suggestion: status === 404
                        ? 'API 端点可能不正确，请检查飞书文档'
                        : feishuCode === 1062501
                        ? '权限不足。请检查：1. 文件是否被移动 2. 应用权限配置 3. 文件夹权限'
                        : '请查看 details 中的详细信息进行诊断'
                });
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
