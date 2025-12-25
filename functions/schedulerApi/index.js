/**
 * @file schedulerApi/index.js
 * @version 1.0.0
 * @description 调度器 API - 管理自动抓取调度配置和执行记录
 *
 * 端点说明:
 * - GET  /config                    获取全局调度配置
 * - PUT  /config                    更新调度配置
 * - GET  /config/projects           获取可选项目列表（active 状态）
 * - GET  /executions                获取执行记录列表
 * - GET  /executions/:id            获取单条执行记录详情
 * - POST /executions                创建执行记录
 * - PUT  /executions/:id            更新执行记录
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const CONFIG_COLLECTION = 'scheduler_config';
const EXECUTIONS_COLLECTION = 'scheduled_executions';
const PROJECTS_COLLECTION = 'projects';

let client;

async function connectToDatabase() {
    if (client && client.topology && client.topology.isConnected()) {
        return client;
    }
    client = new MongoClient(MONGO_URI);
    await client.connect();
    return client;
}

// ============================================================================
// 调度配置相关
// ============================================================================

/**
 * 获取全局调度配置
 */
async function getConfig(db) {
    let config = await db.collection(CONFIG_COLLECTION).findOne({ _id: 'global' });

    // 如果配置不存在，返回默认配置
    if (!config) {
        config = {
            _id: 'global',
            enabled: false,
            time: '10:00',
            frequency: 'daily',
            selectedProjectIds: [],
            lastExecutedAt: null,
            updatedAt: null
        };
    }

    return {
        success: true,
        data: config
    };
}

/**
 * 更新调度配置
 */
async function updateConfig(db, configData) {
    const { enabled, time, frequency, selectedProjectIds } = configData;

    // 验证字段
    const validConfig = {
        _id: 'global',
        updatedAt: new Date()
    };

    // enabled: boolean
    if (typeof enabled === 'boolean') {
        validConfig.enabled = enabled;
    }

    // time: string (e.g., "10:00")
    if (typeof time === 'string' && /^\d{2}:00$/.test(time)) {
        validConfig.time = time;
    }

    // frequency: 'daily' | 'weekdays'
    if (['daily', 'weekdays'].includes(frequency)) {
        validConfig.frequency = frequency;
    }

    // selectedProjectIds: string[]
    if (Array.isArray(selectedProjectIds)) {
        // 验证项目 ID 是否存在且为 active 状态
        const projects = await db.collection(PROJECTS_COLLECTION).find({
            id: { $in: selectedProjectIds },
            'trackingConfig.status': 'active'
        }).toArray();

        const validProjectIds = projects.map(p => p.id);
        validConfig.selectedProjectIds = validProjectIds;

        // 如果有无效的项目 ID，记录警告
        const invalidIds = selectedProjectIds.filter(id => !validProjectIds.includes(id));
        if (invalidIds.length > 0) {
            console.log(`[schedulerApi] 忽略无效或非 active 状态的项目: ${invalidIds.join(', ')}`);
        }
    }

    // 使用 upsert 确保配置存在
    await db.collection(CONFIG_COLLECTION).updateOne(
        { _id: 'global' },
        { $set: validConfig },
        { upsert: true }
    );

    // 返回更新后的配置
    const updatedConfig = await db.collection(CONFIG_COLLECTION).findOne({ _id: 'global' });

    return {
        success: true,
        data: updatedConfig,
        message: '调度配置已更新'
    };
}

/**
 * 获取可选项目列表（仅 active 状态）
 */
async function getEligibleProjects(db) {
    const projects = await db.collection(PROJECTS_COLLECTION).find({
        'trackingConfig.status': 'active'
    }, {
        projection: {
            id: 1,
            name: 1,
            'trackingConfig.status': 1,
            'trackingConfig.version': 1,
            'trackingConfig.benchmarkCPM': 1
        }
    }).sort({ updatedAt: -1 }).toArray();

    return {
        success: true,
        data: projects.map(p => ({
            id: p.id,
            name: p.name,
            trackingStatus: p.trackingConfig?.status,
            trackingVersion: p.trackingConfig?.version,
            benchmarkCPM: p.trackingConfig?.benchmarkCPM
        }))
    };
}

// ============================================================================
// 执行记录相关
// ============================================================================

/**
 * 获取执行记录列表
 */
async function getExecutions(db, projectId, limit = 20) {
    const query = {};

    // 可选按项目筛选
    if (projectId) {
        query.projectId = projectId;
    }

    const executions = await db.collection(EXECUTIONS_COLLECTION)
        .find(query)
        .sort({ executedAt: -1 })
        .limit(parseInt(limit, 10))
        .toArray();

    return {
        success: true,
        data: executions.map(e => ({
            ...e,
            _id: e._id.toString()
        }))
    };
}

/**
 * 获取单条执行记录详情
 */
async function getExecutionDetail(db, executionId) {
    let objectId;
    try {
        objectId = new ObjectId(executionId);
    } catch (e) {
        return { success: false, message: '无效的执行记录 ID' };
    }

    const execution = await db.collection(EXECUTIONS_COLLECTION).findOne({ _id: objectId });

    if (!execution) {
        return { success: false, message: '执行记录不存在' };
    }

    return {
        success: true,
        data: {
            ...execution,
            _id: execution._id.toString()
        }
    };
}

/**
 * 创建执行记录
 */
async function createExecution(db, data) {
    const { projectId, projectName, triggerType, tasks } = data;

    if (!projectId) {
        return { success: false, message: '缺少 projectId' };
    }

    const now = new Date();

    const execution = {
        projectId,
        projectName: projectName || '',
        triggerType: triggerType || 'manual',
        scheduledAt: now,
        executedAt: now,
        completedAt: null,
        status: 'pending',
        taskCount: tasks?.length || 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        duration: null,
        error: null,
        tasks: tasks || [],
        createdAt: now,
        updatedAt: now
    };

    const result = await db.collection(EXECUTIONS_COLLECTION).insertOne(execution);

    return {
        success: true,
        data: {
            ...execution,
            _id: result.insertedId.toString()
        },
        message: '执行记录已创建'
    };
}

/**
 * 更新执行记录
 */
async function updateExecution(db, executionId, data) {
    let objectId;
    try {
        objectId = new ObjectId(executionId);
    } catch (e) {
        return { success: false, message: '无效的执行记录 ID' };
    }

    const updateFields = {
        updatedAt: new Date()
    };

    // 可更新的字段
    const allowedFields = [
        'status', 'completedAt', 'taskCount', 'successCount',
        'failedCount', 'skippedCount', 'duration', 'error', 'tasks'
    ];

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            updateFields[field] = data[field];
        }
    }

    const result = await db.collection(EXECUTIONS_COLLECTION).updateOne(
        { _id: objectId },
        { $set: updateFields }
    );

    if (result.matchedCount === 0) {
        return { success: false, message: '执行记录不存在' };
    }

    // 返回更新后的记录
    const updated = await db.collection(EXECUTIONS_COLLECTION).findOne({ _id: objectId });

    return {
        success: true,
        data: {
            ...updated,
            _id: updated._id.toString()
        },
        message: '执行记录已更新'
    };
}

// ============================================================================
// 主处理函数
// ============================================================================

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const dbClient = await connectToDatabase();
        const db = dbClient.db(DB_NAME);

        const path = event.path || '';
        const method = event.httpMethod || 'GET';
        const queryParams = event.queryStringParameters || {};

        // 解析请求体
        let body = {};
        if (event.body) {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                // ignore
            }
        }

        let result;

        // 解析路径
        // 支持格式: /scheduler-api/config, /scheduler-api/executions, /scheduler-api/executions/:id
        const pathParts = path.split('/').filter(Boolean);
        // pathParts 可能是 ['scheduler-api', 'config'] 或 ['scheduler-api', 'executions', 'xxx']
        const resource = pathParts[1] || pathParts[0]; // config 或 executions
        const resourceId = pathParts[2]; // 可能是 'projects' 或执行记录 ID

        // ========== 配置相关 ==========
        if (resource === 'config') {
            // GET /config/projects - 获取可选项目列表
            if (resourceId === 'projects' && method === 'GET') {
                result = await getEligibleProjects(db);
            }
            // GET /config - 获取配置
            else if (method === 'GET') {
                result = await getConfig(db);
            }
            // PUT /config - 更新配置
            else if (method === 'PUT') {
                result = await updateConfig(db, body);
            }
            else {
                result = { success: false, message: '不支持的操作' };
            }
        }
        // ========== 执行记录相关 ==========
        else if (resource === 'executions') {
            // GET /executions/:id - 获取单条记录详情
            if (method === 'GET' && resourceId && ObjectId.isValid(resourceId)) {
                result = await getExecutionDetail(db, resourceId);
            }
            // GET /executions - 获取列表
            else if (method === 'GET') {
                result = await getExecutions(db, queryParams.projectId, queryParams.limit);
            }
            // POST /executions - 创建记录
            else if (method === 'POST') {
                result = await createExecution(db, body);
            }
            // PUT /executions/:id - 更新记录
            else if (method === 'PUT' && resourceId) {
                result = await updateExecution(db, resourceId, body);
            }
            else {
                result = { success: false, message: '不支持的操作' };
            }
        }
        else {
            result = { success: false, message: '未知的资源路径' };
        }

        return {
            statusCode: result.success ? 200 : 400,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('[schedulerApi] 错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: '服务器内部错误',
                error: error.message
            })
        };
    }
};
