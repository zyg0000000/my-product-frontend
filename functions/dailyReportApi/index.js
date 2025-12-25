/**
 * @file dailyReportApi/index.js
 * @version 2.0.0 - 纯前端计算模式
 * @description AgentWorks 日报 API - 操作 agentworks_db.collaborations.dailyStats
 *
 * v2.0 重大变更：
 * - 移除所有财务计算逻辑（revenue, cpm, averageCPM 等）
 * - 后端只返回原始数据，所有财务计算由前端 financeCalculator.ts 完成
 * - dailyStats 只存储 date, totalViews, solution, source
 *
 * 端点说明:
 * - GET  /daily-report?projectId=xxx&date=2025-12-24  获取项目日报数据
 * - POST /daily-stats                                  批量写入日报数据
 * - POST /report-solution                              保存备注
 * - GET  /tracking-overview                            获取追踪概览统计
 * - GET  /talent-trend?collaborationIds=a,b,c&days=14  获取达人趋势数据
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

// 日期工具函数
function formatDate(dateObject) {
    if (!(dateObject instanceof Date) || isNaN(dateObject)) {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}-${String(dateObject.getDate()).padStart(2, '0')}`;
}

function getTodayString() {
    return formatDate(new Date());
}

// ==================== 获取项目日报数据 ====================
/**
 * v2.0: 只返回原始数据，不做财务计算
 * 前端负责用 financeCalculator.ts 计算 revenue, cpm 等
 */
async function getDailyReport(db, projectId, date, includePrevious = false) {
    const dateStr = date || getTodayString();

    // 1. 获取项目信息
    const project = await db.collection('projects').findOne({ id: projectId });
    if (!project) {
        return { success: false, message: '项目不存在' };
    }

    // 2. 获取项目下所有合作记录（包含完整的财务原始字段）
    const collaborations = await db.collection('collaborations').find({
        projectId,
        status: { $in: ['scheduled', 'published', '客户已定档', '视频已发布'] }
    }).toArray();

    if (collaborations.length === 0) {
        return {
            success: true,
            data: {
                projectId,
                projectName: project.name,
                // 项目配置（前端计算需要）
                platformQuotationCoefficients: project.platformQuotationCoefficients || {},
                platformPricingModes: project.platformPricingModes || {},
                // 概览统计（只返回数量，财务数据由前端计算）
                overview: {
                    totalCollaborations: 0,
                    publishedVideos: 0,
                    totalViews: 0,
                    benchmarkCPM: project.trackingConfig?.benchmarkCPM || project.benchmarkCPM
                },
                trackingConfig: project.trackingConfig,
                details: [],
                missingDataVideos: [],
                date: dateStr
            }
        };
    }

    // 3. 获取达人信息
    const talentIds = [...new Set(collaborations.map(c => c.talentOneId || c.talentId).filter(Boolean))];
    const talents = await db.collection('talents').find({
        oneId: { $in: talentIds }
    }).toArray();
    const talentMap = new Map(talents.map(t => [t.oneId, t]));

    // 4. 构建详情数据（包含财务原始字段，不做计算）
    let totalViews = 0;
    let publishedCount = 0;
    const details = [];
    const missingDataVideos = [];

    for (const collab of collaborations) {
        const isPublished = ['published', '视频已发布'].includes(collab.status);

        if (isPublished) {
            publishedCount++;
        }

        // 获取当日 dailyStats
        const dailyStats = collab.dailyStats || [];
        const todayStats = dailyStats.find(s => s.date === dateStr);

        const talentKey = collab.talentOneId || collab.talentId;
        const talent = talentMap.get(talentKey);
        const talentName = collab.talentName || talent?.name || '未知达人';

        if (todayStats) {
            totalViews += todayStats.totalViews || 0;

            details.push({
                // 合作记录标识
                collaborationId: collab.id,
                talentId: talentKey,
                talentName: talentName,
                talentPlatform: collab.talentPlatform || 'douyin',
                platformAccountId: talent?.platformAccountId,
                status: collab.status,

                // 财务原始字段（前端用这些计算 revenue/cost/cpm）
                amount: collab.amount || 0,
                rebateRate: collab.rebateRate || 0,
                pricingMode: collab.pricingMode || 'framework',
                quotationPrice: collab.quotationPrice || null,
                orderPrice: collab.orderPrice || null,
                orderMode: collab.orderMode || 'adjusted',

                // 日报数据（只有播放量，cpm 由前端计算）
                totalViews: todayStats.totalViews || 0,
                solution: todayStats.solution || '',
                source: todayStats.source || 'unknown',

                // 日期
                publishDate: collab.actualReleaseDate || collab.publishDate
            });
        } else if (isPublished && (collab.actualReleaseDate || collab.publishDate) && (collab.actualReleaseDate || collab.publishDate) <= dateStr) {
            // 已发布但无数据
            missingDataVideos.push({
                collaborationId: collab.id,
                talentId: talentKey,
                talentName: talentName,
                talentPlatform: collab.talentPlatform || 'douyin',
                // 视频 ID（用于 14 天后抓取）
                videoId: collab.videoId || null,
                // 星图任务 ID（用于 14 天内抓取）
                taskId: collab.taskId || null,
                // 财务原始字段（前端可能需要）
                amount: collab.amount || 0,
                rebateRate: collab.rebateRate || 0,
                pricingMode: collab.pricingMode || 'framework',
                quotationPrice: collab.quotationPrice || null,
                orderPrice: collab.orderPrice || null,
                orderMode: collab.orderMode || 'adjusted',
                publishDate: collab.actualReleaseDate || collab.publishDate
            });
        }
    }

    // 5. 获取日期范围
    let firstReportDate = null;
    let lastReportDate = null;
    for (const collab of collaborations) {
        const stats = collab.dailyStats || [];
        for (const s of stats) {
            if (!firstReportDate || s.date < firstReportDate) firstReportDate = s.date;
            if (!lastReportDate || s.date > lastReportDate) lastReportDate = s.date;
        }
    }

    // 6. 获取前一天的播放量数据（用于前端计算环比）
    let previousData = null;
    if (includePrevious) {
        const prevDate = new Date(dateStr);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = formatDate(prevDate);

        let prevTotalViews = 0;
        const prevDetails = [];

        for (const collab of collaborations) {
            const dailyStats = collab.dailyStats || [];
            const prevStats = dailyStats.find(s => s.date === prevDateStr);

            if (prevStats) {
                prevTotalViews += prevStats.totalViews || 0;
                prevDetails.push({
                    collaborationId: collab.id,
                    totalViews: prevStats.totalViews || 0
                });
            }
        }

        previousData = {
            date: prevDateStr,
            totalViews: prevTotalViews,
            details: prevDetails
        };
    }

    // 7. 返回所有合作记录的财务原始数据（用于前端汇总计算）
    const allCollaborationsFinanceData = collaborations.map(collab => ({
        collaborationId: collab.id,
        status: collab.status,
        talentPlatform: collab.talentPlatform || 'douyin',
        amount: collab.amount || 0,
        rebateRate: collab.rebateRate || 0,
        pricingMode: collab.pricingMode || 'framework',
        quotationPrice: collab.quotationPrice || null,
        orderPrice: collab.orderPrice || null,
        orderMode: collab.orderMode || 'adjusted'
    }));

    return {
        success: true,
        data: {
            projectId,
            projectName: project.name,
            // 项目配置（前端计算需要）
            platformQuotationCoefficients: project.platformQuotationCoefficients || {},
            platformPricingModes: project.platformPricingModes || {},
            // 概览统计（只返回数量和播放量，财务数据由前端计算）
            overview: {
                totalCollaborations: collaborations.length,
                publishedVideos: publishedCount,
                totalViews,
                benchmarkCPM: project.trackingConfig?.benchmarkCPM || project.benchmarkCPM
            },
            trackingConfig: project.trackingConfig,
            // 所有合作的财务原始数据（用于前端计算 totalRevenue, publishedRevenue）
            allCollaborationsFinanceData,
            // 当日有数据的详情
            details,
            missingDataVideos,
            // 前一天数据（用于环比）
            previousData,
            firstReportDate,
            lastReportDate,
            date: dateStr
        }
    };
}

// ==================== 批量写入日报数据 ====================
/**
 * v2.0: 只存储播放量，不计算/存储 cpm
 */
async function saveDailyStats(db, projectId, date, data) {
    const dateStr = date || getTodayString();

    // 验证项目存在
    const project = await db.collection('projects').findOne({ id: projectId });
    if (!project) {
        return { success: false, message: '项目不存在' };
    }

    const bulkOps = [];

    for (const item of data) {
        const { collaborationId, totalViews, solution, source } = item;

        // 先删除当日旧数据
        bulkOps.push({
            updateOne: {
                filter: { id: collaborationId },
                update: { $pull: { dailyStats: { date: dateStr } } }
            }
        });

        // 再插入新数据（只存播放量，不存 cpm）
        bulkOps.push({
            updateOne: {
                filter: { id: collaborationId },
                update: {
                    $push: {
                        dailyStats: {
                            $each: [{
                                date: dateStr,
                                totalViews: parseInt(totalViews) || 0,
                                solution: solution || '',
                                source: source || 'manual',
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }],
                            $sort: { date: 1 }
                        }
                    },
                    $set: { lastReportDate: dateStr }
                }
            }
        });
    }

    if (bulkOps.length > 0) {
        await db.collection('collaborations').bulkWrite(bulkOps);
    }

    return { success: true, message: `成功写入 ${data.length} 条日报数据` };
}

// ==================== 保存备注 ====================
async function saveReportSolution(db, collaborationId, date, solution) {
    const result = await db.collection('collaborations').updateOne(
        { id: collaborationId, 'dailyStats.date': date },
        {
            $set: {
                'dailyStats.$.solution': solution,
                'dailyStats.$.updatedAt': new Date()
            }
        }
    );

    if (result.matchedCount === 0) {
        return { success: false, message: '未找到对应的日报记录' };
    }

    return { success: true, message: '备注保存成功' };
}

// ==================== 获取达人趋势数据 ====================
/**
 * v2.0: 只返回播放量，cpm 由前端计算
 * 同时返回合作记录的财务原始字段，供前端计算 cpm
 */
async function getTalentTrend(db, collaborationIds, days = 14) {
    const results = [];

    for (const collaborationId of collaborationIds) {
        const collab = await db.collection('collaborations').findOne({ id: collaborationId });
        if (!collab) continue;

        const dailyStats = collab.dailyStats || [];
        // 按日期排序（最近的在前）
        const sortedStats = dailyStats.sort((a, b) => b.date.localeCompare(a.date));
        // 取最近 N 天
        const recentStats = sortedStats.slice(0, days).reverse();

        results.push({
            collaborationId,
            talentName: collab.talentName || '未知达人',
            talentPlatform: collab.talentPlatform || 'douyin',
            // 财务原始字段（前端计算 cpm 需要）
            amount: collab.amount || 0,
            rebateRate: collab.rebateRate || 0,
            pricingMode: collab.pricingMode || 'framework',
            quotationPrice: collab.quotationPrice || null,
            orderPrice: collab.orderPrice || null,
            orderMode: collab.orderMode || 'adjusted',
            // 只返回日期和播放量
            data: recentStats.map(s => ({
                date: s.date,
                totalViews: s.totalViews || 0
            }))
        });
    }

    return {
        success: true,
        data: results
    };
}

// ==================== 追踪概览统计 ====================
/**
 * v2.0: 简化统计，不再判断 CPM 异常（因为没有 cpm 数据了）
 */
async function getTrackingOverview(db) {
    // 获取所有启用追踪的项目
    const activeProjects = await db.collection('projects').find({
        $or: [
            { 'trackingConfig.status': 'active' },
            { trackingStatus: 'active' }
        ]
    }).toArray();

    const archivedProjects = await db.collection('projects').find({
        $or: [
            { 'trackingConfig.status': 'archived' },
            { trackingStatus: 'archived' }
        ]
    }).toArray();

    const todayStr = getTodayString();
    let totalPendingEntries = 0;

    for (const project of activeProjects) {
        // 统计待录入数量
        const collabs = await db.collection('collaborations').find({
            projectId: project.id,
            status: { $in: ['published', '视频已发布'] },
            $or: [
                { actualReleaseDate: { $lte: todayStr } },
                { publishDate: { $lte: todayStr } }
            ]
        }).toArray();

        for (const collab of collabs) {
            const stats = collab.dailyStats || [];
            const hasToday = stats.some(s => s.date === todayStr);
            if (!hasToday) {
                totalPendingEntries++;
            }
        }
    }

    return {
        success: true,
        data: {
            activeProjectCount: activeProjects.length,
            archivedProjectCount: archivedProjects.length,
            pendingEntriesCount: totalPendingEntries,
            date: todayStr
        }
    };
}

// ==================== 主处理函数 ====================
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

        // 路由分发（注意：更具体的路由要放在前面）
        if (httpMethod === 'GET' && path.includes('/talent-trend')) {
            // 获取达人趋势数据
            const { collaborationIds, days } = queryParams;
            if (!collaborationIds) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 collaborationIds 参数' }) };
            }
            const ids = collaborationIds.split(',').filter(Boolean);
            result = await getTalentTrend(db, ids, parseInt(days) || 14);

        } else if (httpMethod === 'GET' && path.includes('/tracking-overview')) {
            // 获取追踪概览
            result = await getTrackingOverview(db);

        } else if (httpMethod === 'GET' && path.includes('/daily-report')) {
            // 获取项目日报
            const { projectId, date, includePrevious } = queryParams;
            if (!projectId) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 projectId 参数' }) };
            }
            result = await getDailyReport(db, projectId, date, includePrevious === 'true');

        } else if (httpMethod === 'POST' && path.includes('/daily-stats')) {
            // 批量写入日报数据
            const { projectId, date, data } = bodyParams;
            if (!projectId || !Array.isArray(data)) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 projectId 或 data 参数' }) };
            }
            result = await saveDailyStats(db, projectId, date, data);

        } else if (httpMethod === 'POST' && path.includes('/report-solution')) {
            // 保存备注
            const { collaborationId, date, solution } = bodyParams;
            if (!collaborationId || !date) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 collaborationId 或 date 参数' }) };
            }
            result = await saveReportSolution(db, collaborationId, date, solution);

        } else {
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: '未知的 API 端点' }) };
        }

        return {
            statusCode: result.success ? 200 : 400,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('dailyReportApi 错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message })
        };
    }
};
