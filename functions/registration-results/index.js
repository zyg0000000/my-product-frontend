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

/**
 * 计算两个日期之间的天数差
 * @param {string} date1 - ISO 日期字符串
 * @param {string} date2 - ISO 日期字符串
 * @returns {number} 天数差（绝对值）
 */
function calculateDaysDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(Math.floor((d1 - d2) / (1000 * 60 * 60 * 24)));
}

/**
 * 确定达人的抓取状态
 * @param {boolean} hasCurrentResult - 当前项目是否有抓取结果
 * @param {Array} historyRecords - 历史抓取记录
 * @returns {'fetched' | 'reusable' | 'expired' | 'none'}
 */
function determineFetchStatus(hasCurrentResult, historyRecords) {
    if (hasCurrentResult) return 'fetched';
    if (!historyRecords || historyRecords.length === 0) return 'none';

    // 检查是否有未过期的记录
    const hasValidRecord = historyRecords.some(r => !r.isExpired);
    return hasValidRecord ? 'reusable' : 'expired';
}

// ==================== 获取达人列表（合并 collaborations + results + 跨项目历史） ====================
async function listTalentsWithResults(db, projectId) {
    const EXPIRY_THRESHOLD_DAYS = 30;

    // 1. 获取项目下所有合作记录
    const collaborations = await db.collection('collaborations').find({
        projectId,
        status: { $in: ['客户已定档', '视频已发布', 'scheduled', 'published', '待提报工作台', '工作台已提交'] }
    }).toArray();

    // 2. 获取当前项目的所有抓取结果
    const currentResults = await db.collection('registration_results')
        .find({ projectId })
        .toArray();
    const currentResultMap = new Map(currentResults.map(r => [r.collaborationId, r]));

    // 3. 获取达人信息
    const talentIds = [...new Set(collaborations.map(c => c.talentOneId || c.talentId).filter(Boolean))];
    const talents = await db.collection('talents').find({
        oneId: { $in: talentIds }
    }).toArray();
    const talentMap = new Map(talents.map(t => [t.oneId, t]));

    // 4. 收集所有 xingtuId，用于查询跨项目历史
    const allXingtuIds = [];
    const collabXingtuIdMap = new Map(); // collaborationId -> xingtuId

    collaborations.forEach(collab => {
        const talentKey = collab.talentOneId || collab.talentId;
        const talent = talentMap.get(talentKey);
        const xingtuId = collab.xingtuId || talent?.platformSpecific?.xingtuId || talent?.platformAccountId || null;

        if (xingtuId) {
            allXingtuIds.push(xingtuId);
            collabXingtuIdMap.set(collab.id, xingtuId);
        }
    });

    // 5. 查询所有相关达人的全局抓取记录（跨项目）
    const uniqueXingtuIds = [...new Set(allXingtuIds.filter(Boolean))];
    const globalResults = uniqueXingtuIds.length > 0
        ? await db.collection('registration_results')
            .find({
                xingtuId: { $in: uniqueXingtuIds },
                status: 'success'  // 只查成功的记录
            })
            .sort({ fetchedAt: -1 })
            .toArray()
        : [];

    // 6. 按 xingtuId 分组历史记录
    const historyByXingtuId = new Map();
    globalResults.forEach(r => {
        if (!historyByXingtuId.has(r.xingtuId)) {
            historyByXingtuId.set(r.xingtuId, []);
        }
        historyByXingtuId.get(r.xingtuId).push(r);
    });

    // 7. 获取所有涉及的项目名称
    const allProjectIds = [...new Set(globalResults.map(r => r.projectId))];
    const projects = allProjectIds.length > 0
        ? await db.collection('projects').find({ id: { $in: allProjectIds } }).toArray()
        : [];
    const projectNameMap = new Map(projects.map(p => [p.id, p.name]));

    // 7.5 查询当前项目的已生成表格，构建 collaborationId → sheets 的映射
    const generatedSheets = await db.collection('generated_sheets').find({
        projectId,
        type: 'registration'
    }).toArray();

    const talentSheetsMap = new Map();
    for (const sheet of generatedSheets) {
        for (const collabId of sheet.collaborationIds || []) {
            if (!talentSheetsMap.has(collabId)) {
                talentSheetsMap.set(collabId, []);
            }
            talentSheetsMap.get(collabId).push({
                sheetId: sheet._id.toString(),
                fileName: sheet.fileName,
                sheetUrl: sheet.sheetUrl,
                createdAt: sheet.createdAt
            });
        }
    }

    // 8. 合并数据，计算状态
    const talentItems = collaborations.map(collab => {
        const talentKey = collab.talentOneId || collab.talentId;
        const talent = talentMap.get(talentKey);
        const currentResult = currentResultMap.get(collab.id);
        const xingtuId = collabXingtuIdMap.get(collab.id);

        // 获取该达人的所有历史记录
        const allHistoryRecords = xingtuId ? (historyByXingtuId.get(xingtuId) || []) : [];

        // 计算每条历史记录的状态（排除当前项目的记录，因为那是"已抓取"）
        const collaborationCreatedAt = collab.createdAt || new Date().toISOString();
        const historyRecords = allHistoryRecords
            .filter(r => r.projectId !== projectId)  // 排除当前项目
            .map(r => {
                const daysDiff = calculateDaysDiff(r.fetchedAt, collaborationCreatedAt);
                const isExpired = daysDiff > EXPIRY_THRESHOLD_DAYS;
                return {
                    projectId: r.projectId,
                    projectName: projectNameMap.get(r.projectId) || '未知项目',
                    collaborationId: r.collaborationId,
                    fetchedAt: r.fetchedAt,
                    daysDiff,
                    isExpired,
                    result: r
                };
            })
            .sort((a, b) => a.daysDiff - b.daysDiff);  // 按距离排序，最近的在前

        // 找到推荐记录（未过期且距离最近的）
        const recommendedRecord = historyRecords.find(r => !r.isExpired) || null;

        // 确定抓取状态
        const fetchStatusType = determineFetchStatus(!!currentResult, historyRecords);

        return {
            collaborationId: collab.id,
            collaborationCreatedAt,
            talentName: collab.talentName || talent?.name || '未知达人',
            platform: collab.talentPlatform || 'douyin',
            xingtuId,
            // 当前项目的抓取状态
            fetchStatus: currentResult?.status || null,
            fetchedAt: currentResult?.fetchedAt || null,
            hasResult: !!currentResult,
            result: currentResult || null,
            // 新增：跨项目复用相关字段
            fetchStatusType,  // 'fetched' | 'reusable' | 'expired' | 'none'
            historyRecords,   // 其他项目的历史记录列表
            recommendedRecord, // 系统推荐的复用记录
            // 新增：该达人已在哪些表格中（当前项目）
            generatedSheets: talentSheetsMap.get(collab.id) || []
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
