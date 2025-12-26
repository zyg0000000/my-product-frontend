/**
 * @file Cloud Function: report-templates
 * @version 1.0.0 - Initial Release
 * @description
 * - 报告模板 CRUD API
 * - 支持 dbVersion 双数据库（v1=kol_data, v2=agentworks_db）
 * - 复用 mapping-templates-api 逻辑，适配报名管理场景
 *
 * @changelog
 * v1.0.0 (2025-12-26)
 * - 初始版本，支持模板 CRUD
 * - 支持 type 筛选（registration/general）
 * - 支持 allowedWorkflowIds 工作流关联
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

// 根据 dbVersion 选择数据库和集合
function getDbConfig(dbVersion) {
    if (dbVersion === 'v2') {
        return {
            dbName: 'agentworks_db',
            collectionName: 'report_templates'
        };
    }
    // v1 或默认使用 kol_data
    return {
        dbName: 'kol_data',
        collectionName: 'mapping_templates'
    };
}

let cachedClient = null;

async function connectToDatabase(dbName) {
    if (cachedClient) {
        return cachedClient.db(dbName);
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    cachedClient = client;
    return client.db(dbName);
}

function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify(body),
    };
}

exports.handler = async (event) => {
    // CORS 预检请求
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(204, {});
    }

    try {
        // 解析 dbVersion
        const queryParams = event.queryStringParameters || {};
        let dbVersion = queryParams.dbVersion;

        // 如果 query 没有，尝试从 body 获取
        if (!dbVersion && event.body) {
            try {
                const body = JSON.parse(event.body);
                dbVersion = body.dbVersion;
            } catch (e) {
                // ignore
            }
        }

        // 默认使用 v2（AgentWorks）
        dbVersion = dbVersion || 'v2';
        const { dbName, collectionName } = getDbConfig(dbVersion);

        console.log(`[report-templates] dbVersion=${dbVersion}, db=${dbName}, collection=${collectionName}`);

        const db = await connectToDatabase(dbName);
        const collection = db.collection(collectionName);
        const { id, type } = queryParams;

        switch (event.httpMethod) {
            case 'GET': {
                // 获取单个模板
                if (id) {
                    if (!ObjectId.isValid(id)) {
                        return createResponse(400, { success: false, message: 'Invalid ID format.' });
                    }
                    const template = await collection.findOne({ _id: new ObjectId(id) });
                    if (!template) {
                        return createResponse(404, { success: false, message: 'Template not found.' });
                    }
                    return createResponse(200, { success: true, data: template });
                }

                // 获取模板列表
                const query = {};
                if (type) {
                    query.type = type;
                }
                const templates = await collection.find(query).sort({ createdAt: -1 }).toArray();
                return createResponse(200, { success: true, data: templates });
            }

            case 'POST':
            case 'PUT': {
                const isUpdate = event.httpMethod === 'PUT';

                if (isUpdate && (!id || !ObjectId.isValid(id))) {
                    return createResponse(400, { success: false, message: 'A valid template ID is required for updating.' });
                }

                const body = JSON.parse(event.body || '{}');
                const { name, spreadsheetToken, mappingRules, allowedWorkflowIds } = body;

                // 验证必填字段
                if (!name || !spreadsheetToken || typeof mappingRules !== 'object') {
                    return createResponse(400, {
                        success: false,
                        message: 'Missing required fields: name, spreadsheetToken, and mappingRules.'
                    });
                }

                // 构建文档
                const document = {
                    name,
                    spreadsheetToken,
                    mappingRules,
                    description: body.description || '',
                    feishuSheetHeaders: body.feishuSheetHeaders || [],
                    type: body.type || 'registration',
                    isActive: body.isActive !== undefined ? body.isActive : true,
                    updatedAt: new Date(),
                };

                // 处理 allowedWorkflowIds 字段
                if (Array.isArray(allowedWorkflowIds)) {
                    document.allowedWorkflowIds = allowedWorkflowIds;
                } else if (allowedWorkflowIds !== undefined) {
                    return createResponse(400, { success: false, message: 'allowedWorkflowIds must be an array.' });
                } else if (!isUpdate) {
                    document.allowedWorkflowIds = [];
                }

                if (isUpdate) {
                    const result = await collection.updateOne(
                        { _id: new ObjectId(id) },
                        { $set: document }
                    );
                    if (result.matchedCount === 0) {
                        return createResponse(404, { success: false, message: 'Template not found.' });
                    }
                    const updatedDoc = await collection.findOne({ _id: new ObjectId(id) });
                    return createResponse(200, { success: true, data: updatedDoc });
                } else {
                    document.createdAt = new Date();
                    const result = await collection.insertOne(document);
                    const createdDoc = await collection.findOne({ _id: result.insertedId });
                    return createResponse(201, { success: true, data: createdDoc });
                }
            }

            case 'DELETE': {
                if (!id || !ObjectId.isValid(id)) {
                    return createResponse(400, { success: false, message: 'A valid ID is required.' });
                }
                const result = await collection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) {
                    return createResponse(404, { success: false, message: 'Template not found.' });
                }
                return createResponse(204, {});
            }

            default:
                return createResponse(405, { success: false, message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Error in report-templates handler:', error);
        return createResponse(500, {
            success: false,
            message: 'An internal server error occurred.',
            error: error.message
        });
    }
};
