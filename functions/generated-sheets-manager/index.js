/**
 * @file 云函数: generated-sheets-manager
 * @version 2.2.0
 * @date 2025-11-24
 * @changelog
 * - v2.2.0 (2025-11-24): 诊断模式 - 详细日志定位权限问题
 *   - 添加完整的飞书 API 调用日志（Token、URL、请求体、响应）
 *   - 权限错误时返回详细诊断信息（不再跳过，便于定位问题）
 *   - 诊断信息包含：sheetToken、文件名、URL、创建时间、错误类型
 *   - 提供排查建议：文件位置、回收站状态、应用权限
 * - v2.1.0 (2025-11-24): 修复删除飞书文件权限问题
 *   - 将直接删除 API 改为移动到回收站 API
 *   - 针对权限错误 (Code: 1062501) 特殊处理
 *   - 优化错误日志
 * - v2.0.0 (之前): Feishu File Deletion
 *   - 新增同步删除飞书云端电子表格功能
 *   - 遵循"先删云端，再删本地"原则
 *
 * @description
 * - [核心功能] 管理飞书表格生成历史记录
 * - [删除策略] 移动文件到回收站，出错时返回详细诊断信息
 * - [诊断模式] 当前版本重点是定位权限问题的根本原因
 * - [依赖] axios
 * - [配置] 需要环境变量: FEISHU_APP_ID, FEISHU_APP_SECRET, MONGODB_URI
 */

const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

// --- 版本信息 ---
const VERSION = '2.2.0';

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

            // 步骤 2: 调用飞书 API 将文件移动到回收站
            try {
                const accessToken = await getTenantAccessToken();
                console.log(`[v${VERSION}] ========== 开始飞书 API 调用 ==========`);
                console.log(`[v${VERSION}] SheetToken:`, sheetToken);
                console.log(`[v${VERSION}] AccessToken 前10位:`, accessToken.substring(0, 10) + '...');
                console.log(`[v${VERSION}] API URL:`, `https://open.feishu.cn/open-apis/drive/v1/files/${sheetToken}/trash`);

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

                console.log(`[v${VERSION}] 飞书 API 响应:`, JSON.stringify(response.data, null, 2));

                if (response.data.code === 0) {
                    console.log(`[v${VERSION}] ✅ 成功移动文件到回收站`);
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

                // 特殊情况处理
                if (status === 404) {
                    // 文件不存在，认为已删除，继续删除数据库记录
                    console.warn(`[v${VERSION}] 文件不存在 (404)，继续删除数据库记录`);
                    await collection.deleteOne({ _id: new ObjectId(id) });
                    return createResponse(204, {});
                } else if (feishuCode === 1062501 || feishuCode === 1061045) {
                    // 权限错误 - 先返回详细错误，不要跳过
                    console.error(`[v${VERSION}] ❌ 权限错误，返回详细信息供诊断`);
                    return createResponse(502, {
                        error: 'FEISHU_PERMISSION_ERROR',
                        message: `飞书 API 权限错误 (Code: ${feishuCode})`,
                        details: diagnosticInfo,
                        suggestion: '请检查：1. 文件是否被移动 2. 文件是否在回收站 3. 飞书应用权限配置'
                    });
                } else {
                    // 其他错误：返回详细信息
                    console.error(`[v${VERSION}] ❌ 未知错误，返回详细信息供诊断`);
                    return createResponse(502, {
                        error: 'FEISHU_API_ERROR',
                        message: `飞书 API 调用失败: ${feishuMsg}`,
                        details: diagnosticInfo
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
