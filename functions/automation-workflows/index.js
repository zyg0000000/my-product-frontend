/**
 * @file Cloud Function: automation-workflows
 * @version 3.0 - dbVersion 双数据库支持
 * @description Manages CRUD operations for automation workflows.
 *
 * --- UPDATE (v3.0) ---
 * - [双数据库] 支持 dbVersion 参数：v1=kol_data, v2=agentworks_db
 * - [AgentWorks] dbVersion=v2 时支持 platform、isActive 筛选
 * - [AgentWorks] dbVersion=v2 时自动转换旧数据结构 (requiredInput -> inputConfig)
 * - [兼容性] ByteProject (v1) 逻辑完全不变
 *
 * --- UPDATE (v2.1) ---
 * - [功能增强] 在 POST 和 PUT 方法中，正式加入了对 `composite` 类型的支持。
 */
const { MongoClient, ObjectId } = require('mongodb');

// Environment variables
const MONGO_URI = process.env.MONGO_URI;

// [v3.0] 双数据库支持
const DB_NAME_V1 = process.env.DB_NAME || 'kol_data';
const DB_NAME_V2 = 'agentworks_db';
const COLLECTION_NAME = 'automation-workflows';

let cachedClient = null;

/**
 * Connects to the MongoDB client.
 */
async function connectToDatabase() {
    if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
        return cachedClient;
    }
    cachedClient = new MongoClient(MONGO_URI, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
    await cachedClient.connect();
    console.log("Successfully connected to MongoDB.");
    return cachedClient;
}

/**
 * [v3.0] 旧数据兼容性转换（仅 v2 使用）
 * 将 requiredInput 转换为 inputConfig，确保有 platform 和 isActive 字段
 */
function normalizeWorkflowForV2(workflow) {
    if (!workflow) return workflow;

    // 如果已有 inputConfig，跳过转换
    if (!workflow.inputConfig && workflow.requiredInput) {
        const inputKey = typeof workflow.requiredInput === 'object'
            ? workflow.requiredInput.key
            : workflow.requiredInput;
        const inputLabel = typeof workflow.requiredInput === 'object'
            ? workflow.requiredInput.label
            : workflow.inputLabel || inputKey;

        // 根据输入类型推断配置
        const inputConfigMap = {
            xingtuId: {
                key: 'xingtuId',
                label: '星图ID',
                placeholder: '请输入星图达人ID',
                platform: 'douyin',
                idSource: 'talent',
                idField: 'platformSpecific.xingtuId',
                required: true,
            },
            taskId: {
                key: 'taskId',
                label: '星图任务ID',
                placeholder: '请输入星图任务ID',
                platform: 'douyin',
                idSource: 'collaboration',
                idField: 'taskId',
                required: true,
            },
            videoId: {
                key: 'videoId',
                label: '视频ID',
                placeholder: '请输入视频ID',
                platform: 'douyin',
                idSource: 'collaboration',
                idField: 'videoId',
                required: true,
            },
            url: {
                key: 'url',
                label: 'URL',
                placeholder: '请输入完整URL地址',
                idSource: 'custom',
                required: true,
            },
        };

        workflow.inputConfig = inputConfigMap[inputKey] || {
            key: inputKey,
            label: inputLabel,
            idSource: 'custom',
            required: true,
        };
    }

    // 确保有 platform 字段（默认 douyin）
    if (!workflow.platform) {
        workflow.platform = 'douyin';
    }

    // 确保有 isActive 字段（默认 true）
    if (workflow.isActive === undefined) {
        workflow.isActive = true;
    }

    return workflow;
}

/**
 * The main handler for the cloud function.
 */
module.exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const queryParams = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};

        // [v3.0] 根据 dbVersion 参数选择数据库
        const dbVersion = queryParams.dbVersion || body.dbVersion || 'v1';
        const DB_NAME = dbVersion === 'v2' ? DB_NAME_V2 : DB_NAME_V1;
        console.log(`[automation-workflows] 使用数据库: ${DB_NAME} (dbVersion=${dbVersion})`);

        const client = await connectToDatabase();
        const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

        const workflowIdFromQuery = queryParams.id;

        switch (event.httpMethod) {
            case 'GET': {
                // 如果有 id 参数，返回单个工作流
                if (workflowIdFromQuery) {
                    if (!ObjectId.isValid(workflowIdFromQuery)) {
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid Workflow ID format.' }) };
                    }
                    let workflow = await collection.findOne({ _id: new ObjectId(workflowIdFromQuery) });
                    if (!workflow) {
                        return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Workflow not found.' }) };
                    }
                    // [v3.0] 仅 v2 做数据转换
                    if (dbVersion === 'v2') {
                        workflow = normalizeWorkflowForV2(workflow);
                    }
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ success: true, data: workflow })
                    };
                }

                // 构建查询条件
                const query = {};

                // [v3.0] 仅 v2 支持 platform 和 isActive 筛选
                if (dbVersion === 'v2') {
                    if (queryParams.platform) {
                        query.platform = queryParams.platform;
                    }
                    if (queryParams.isActive !== undefined) {
                        query.isActive = queryParams.isActive === 'true';
                    }
                }

                const workflows = await collection.find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();

                // [v3.0] 仅 v2 做数据转换
                const normalizedWorkflows = dbVersion === 'v2'
                    ? workflows.map(normalizeWorkflowForV2)
                    : workflows;

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        data: normalizedWorkflows,
                        count: normalizedWorkflows.length
                    })
                };
            }

            case 'POST': {
                if (!body.name || !body.steps || !Array.isArray(body.steps)) {
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing required fields: name and steps array.' }) };
                }

                const newWorkflow = {
                    name: body.name,
                    description: body.description || '',
                    type: body.type || 'screenshot',
                    steps: body.steps,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // [v3.0] 仅 v2 支持额外字段
                if (dbVersion === 'v2') {
                    newWorkflow.platform = body.platform || 'douyin';
                    newWorkflow.inputConfig = body.inputConfig || null;
                    newWorkflow.isActive = body.isActive !== undefined ? body.isActive : true;
                    // [v3.1] 支持 VNC 远程桌面模式
                    if (body.enableVNC !== undefined) {
                        newWorkflow.enableVNC = body.enableVNC;
                    }
                }

                const createResult = await collection.insertOne(newWorkflow);
                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({ success: true, data: { insertedId: createResult.insertedId } })
                };
            }

            case 'PUT': {
                const workflowIdToUpdate = workflowIdFromQuery || body._id;
                if (!workflowIdToUpdate) {
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Workflow ID is required for updates.' }) };
                }
                if (!ObjectId.isValid(workflowIdToUpdate)) {
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid Workflow ID format.' }) };
                }

                delete body._id;
                delete body.dbVersion; // 不存储 dbVersion
                const updateData = { ...body, updatedAt: new Date() };

                const updateResult = await collection.updateOne(
                    { _id: new ObjectId(workflowIdToUpdate) },
                    { $set: updateData }
                );

                if (updateResult.matchedCount === 0) {
                    return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Workflow not found.' }) };
                }
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Workflow updated successfully.' }) };
            }

            case 'DELETE': {
                if (!workflowIdFromQuery) {
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Workflow ID is required in query parameter for deletion.' }) };
                }
                if (!ObjectId.isValid(workflowIdFromQuery)) {
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid Workflow ID format.' }) };
                }

                const deleteResult = await collection.deleteOne({ _id: new ObjectId(workflowIdFromQuery) });

                if (deleteResult.deletedCount === 0) {
                    return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Workflow not found.' }) };
                }
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Workflow deleted successfully.' }) };
            }

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ success: false, message: `Method Not Allowed: ${event.httpMethod}` })
                };
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'An internal server error occurred.', error: error.message })
        };
    }
};
