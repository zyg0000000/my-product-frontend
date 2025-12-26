/**
 * @file registration-results/index.js
 * @version 1.0.0
 * @description 报名管理 - 抓取结果 API
 *
 * 端点说明:
 * - GET  /registration-results?projectId=xxx                 获取项目的所有抓取结果
 * - GET  /registration-results?collaborationId=xxx           获取单个达人的抓取结果
 * - GET  /registration-results?projectId=xxx&action=list-talents  获取达人列表（合并 collaborations + results）
 * - POST /registration-results                               保存抓取结果（upsert by collaborationId）
 * - DELETE /registration-results?collaborationId=xxx         删除抓取结果
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';

let client;

async function connectToDatabase() {
    if (client && client.topology && client.topology.isConnected()) {
        return client;
    }
    client = new MongoClient(MONGO_URI);
    await client.connect();
    return client;
}

/**
 * 生成唯一 ID
 */
function generateId() {
    return 'reg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ==================== 获取项目的所有抓取结果 ====================
async function getResultsByProject(db, projectId) {
    const results = await db.collection('registration_results')
        .find({ projectId })
        .sort({ fetchedAt: -1 })
        .toArray();

    return {
        success: true,
        data: results
    };
}

// ==================== 获取单个达人的抓取结果 ====================
async function getResultByCollaboration(db, collaborationId) {
    const result = await db.collection('registration_results').findOne({ collaborationId });

    return {
        success: true,
        data: result
    };
}

// ==================== 获取达人列表（合并 collaborations + results） ====================
async function listTalentsWithResults(db, projectId) {
    // 1. 获取项目下所有合作记录
    const collaborations = await db.collection('collaborations').find({
        projectId,
        status: { $in: ['客户已定档', '视频已发布', 'scheduled', 'published'] }
    }).toArray();

    // 2. 获取项目的所有抓取结果
    const results = await db.collection('registration_results')
        .find({ projectId })
        .toArray();
    const resultMap = new Map(results.map(r => [r.collaborationId, r]));

    // 3. 获取达人信息
    const talentIds = [...new Set(collaborations.map(c => c.talentOneId || c.talentId).filter(Boolean))];
    const talents = await db.collection('talents').find({
        oneId: { $in: talentIds }
    }).toArray();
    const talentMap = new Map(talents.map(t => [t.oneId, t]));

    // 4. 合并数据
    const talentItems = collaborations.map(collab => {
        const talentKey = collab.talentOneId || collab.talentId;
        const talent = talentMap.get(talentKey);
        const result = resultMap.get(collab.id);

        return {
            collaborationId: collab.id,
            talentName: collab.talentName || talent?.name || '未知达人',
            platform: collab.talentPlatform || 'douyin',
            xingtuId: collab.xingtuId || talent?.platformSpecific?.xingtuId || null,
            fetchStatus: result?.status || null,
            fetchedAt: result?.fetchedAt || null,
            hasResult: !!result,
            result: result || null
        };
    });

    return {
        success: true,
        data: talentItems
    };
}

// ==================== 保存抓取结果（upsert） ====================
async function saveResult(db, data) {
    const {
        collaborationId,
        projectId,
        talentName,
        xingtuId,
        workflowId,
        workflowName,
        status,
        screenshots,
        extractedData,
        error,
        fetchedAt
    } = data;

    if (!collaborationId || !projectId) {
        return { success: false, message: '缺少 collaborationId 或 projectId' };
    }

    const now = new Date().toISOString();

    // 尝试更新已有记录，如果不存在则插入
    const result = await db.collection('registration_results').findOneAndUpdate(
        { collaborationId },
        {
            $set: {
                projectId,
                talentName: talentName || '',
                xingtuId: xingtuId || '',
                workflowId: workflowId || '',
                workflowName: workflowName || '',
                status: status || 'pending',
                screenshots: screenshots || [],
                extractedData: extractedData || {},
                error: error || null,
                fetchedAt: fetchedAt || now,
                updatedAt: now
            },
            $setOnInsert: {
                _id: generateId(),
                createdAt: now
            }
        },
        {
            upsert: true,
            returnDocument: 'after'
        }
    );

    return {
        success: true,
        data: result.value
    };
}

// ==================== 删除抓取结果 ====================
async function deleteResult(db, collaborationId) {
    const result = await db.collection('registration_results').deleteOne({ collaborationId });

    if (result.deletedCount === 0) {
        return { success: false, message: '未找到对应的抓取结果' };
    }

    return { success: true, message: '删除成功' };
}

// ==================== 主处理函数 ====================
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const dbClient = await connectToDatabase();
        const db = dbClient.db(DB_NAME);

        const httpMethod = event.httpMethod;
        const path = event.path || '';

        let queryParams = event.queryStringParameters || {};
        let bodyParams = {};
        if (event.body) {
            try {
                bodyParams = JSON.parse(event.body);
            } catch (e) { /* ignore */ }
        }

        let result;

        if (httpMethod === 'GET') {
            const { projectId, collaborationId, action } = queryParams;

            if (action === 'list-talents' && projectId) {
                // 获取达人列表（合并数据）
                result = await listTalentsWithResults(db, projectId);
            } else if (collaborationId) {
                // 获取单个达人的结果
                result = await getResultByCollaboration(db, collaborationId);
            } else if (projectId) {
                // 获取项目的所有结果
                result = await getResultsByProject(db, projectId);
            } else {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: '缺少 projectId 或 collaborationId 参数' })
                };
            }

        } else if (httpMethod === 'POST') {
            // 保存抓取结果
            result = await saveResult(db, bodyParams);

        } else if (httpMethod === 'DELETE') {
            const { collaborationId } = queryParams;
            if (!collaborationId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: '缺少 collaborationId 参数' })
                };
            }
            result = await deleteResult(db, collaborationId);

        } else {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, message: '未知的 API 端点' })
            };
        }

        return {
            statusCode: result.success ? 200 : 400,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('registration-results API 错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message })
        };
    }
};
