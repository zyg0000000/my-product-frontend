/**
 * @file dailyReportApi/index.js
 * @version 3.0.0 - 整合分组和调度管理
 * @description AgentWorks 日报 API - 日报数据 + 分组管理 + 调度管理
 *
 * v3.0 变更：
 * - 新增分组管理功能（CRUD）
 * - 整合调度配置和执行记录管理（从 schedulerApi 迁移）
 * - 使用 system_config 集合存储分组和调度配置
 * - 使用 action 参数路由（兼容火山引擎云函数）
 *
 * v2.0 变更：
 * - 移除所有财务计算逻辑（revenue, cpm, averageCPM 等）
 * - 后端只返回原始数据，所有财务计算由前端 financeCalculator.ts 完成
 * - dailyStats 只存储 date, totalViews, solution, source
 *
 * 端点说明:
 * === 日报数据（路径路由）===
 * - GET  ?projectId=xxx&date=2025-12-24 + path=/daily-report  获取项目日报数据
 * - POST path=/daily-stats                                     批量写入日报数据
 * - POST path=/report-solution                                 保存备注
 * - GET  path=/tracking-overview                               获取追踪概览统计
 * - GET  ?collaborationIds=a,b,c&days=14 + path=/talent-trend  获取达人趋势数据
 *
 * === 分组管理（action 参数路由）===
 * - GET    ?action=getGroups                       获取所有分组
 * - POST   ?action=createGroup                     创建分组
 * - PUT    ?action=updateGroup&id=xxx              更新分组
 * - DELETE ?action=deleteGroup&id=xxx              删除分组
 *
 * === 调度管理（action 参数路由）===
 * - GET    ?action=getSchedulerConfig              获取调度配置
 * - PUT    ?action=updateSchedulerConfig           更新调度配置
 * - GET    ?action=getEligibleProjects             获取可选项目列表
 * - GET    ?action=getExecutions                   获取执行记录列表
 * - GET    ?action=getExecutionDetail&id=xxx       获取单条执行记录
 * - POST   ?action=createExecution                 创建执行记录
 * - PUT    ?action=updateExecution&id=xxx          更新执行记录
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const EXECUTIONS_COLLECTION = 'scheduled_executions';

// configType 常量
const CONFIG_TYPE_GROUPS = 'daily_report_groups';
const CONFIG_TYPE_SCHEDULER = 'daily_report_scheduler';

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
 *
 * @param {boolean} forceRefresh - 如果为 true，强制刷新模式会返回所有已发布视频（含已有当日数据的）
 */
async function getDailyReport(db, projectId, date, includePrevious = false, forceRefresh = false) {
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
        }

        // 判断是否需要加入 missingDataVideos
        // forceRefresh=true: 返回所有已发布视频（用于强制刷新覆盖已有数据）
        // forceRefresh=false: 仅返回无当日数据的视频
        const publishDate = collab.actualReleaseDate || collab.publishDate;
        const shouldIncludeInMissing = isPublished && publishDate && publishDate <= dateStr &&
            (forceRefresh || !todayStats);

        if (shouldIncludeInMissing) {
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
                publishDate: publishDate,
                // 标记是否已有当日数据（用于前端显示）
                hasCurrentData: !!todayStats
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

// ==================== 分组管理 ====================

/**
 * 获取所有分组
 */
async function getGroups(db) {
    const config = await db.collection(SYSTEM_CONFIG_COLLECTION).findOne({
        configType: CONFIG_TYPE_GROUPS
    });

    return {
        success: true,
        data: config?.groups || []
    };
}

/**
 * 创建分组
 */
async function createGroup(db, groupData) {
    const { name, primaryProjectId, projectIds } = groupData;

    if (!primaryProjectId || !projectIds || projectIds.length === 0) {
        return { success: false, message: '缺少必要字段: primaryProjectId, projectIds' };
    }

    // 检查 primaryProjectId 是否在 projectIds 中
    if (!projectIds.includes(primaryProjectId)) {
        return { success: false, message: 'primaryProjectId 必须在 projectIds 中' };
    }

    // 获取现有分组
    const config = await db.collection(SYSTEM_CONFIG_COLLECTION).findOne({
        configType: CONFIG_TYPE_GROUPS
    });
    const existingGroups = config?.groups || [];

    // 检查项目冲突
    const allProjectIds = existingGroups.flatMap(g => g.projectIds);
    const conflictIds = projectIds.filter(id => allProjectIds.includes(id));
    if (conflictIds.length > 0) {
        return {
            success: false,
            message: `项目已被其他分组占用: ${conflictIds.join(', ')}`
        };
    }

    // 生成新分组
    const now = new Date().toISOString();
    const newGroup = {
        id: `grp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        name: name || null,
        primaryProjectId,
        projectIds,
        createdAt: now,
        updatedAt: now
    };

    // 保存
    await db.collection(SYSTEM_CONFIG_COLLECTION).updateOne(
        { configType: CONFIG_TYPE_GROUPS },
        {
            $set: {
                configType: CONFIG_TYPE_GROUPS,
                updatedAt: now
            },
            $push: { groups: newGroup }
        },
        { upsert: true }
    );

    return {
        success: true,
        data: newGroup,
        message: '分组创建成功'
    };
}

/**
 * 更新分组
 */
async function updateGroup(db, groupId, groupData) {
    const { name, primaryProjectId, projectIds } = groupData;

    if (!groupId) {
        return { success: false, message: '缺少分组 ID' };
    }

    // 获取现有分组
    const config = await db.collection(SYSTEM_CONFIG_COLLECTION).findOne({
        configType: CONFIG_TYPE_GROUPS
    });
    const existingGroups = config?.groups || [];

    const groupIndex = existingGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
        return { success: false, message: '分组不存在' };
    }

    // 检查项目冲突（排除当前分组）
    const otherGroups = existingGroups.filter(g => g.id !== groupId);
    const otherProjectIds = otherGroups.flatMap(g => g.projectIds);
    const conflictIds = (projectIds || []).filter(id => otherProjectIds.includes(id));
    if (conflictIds.length > 0) {
        return {
            success: false,
            message: `项目已被其他分组占用: ${conflictIds.join(', ')}`
        };
    }

    // 检查 primaryProjectId
    if (projectIds && primaryProjectId && !projectIds.includes(primaryProjectId)) {
        return { success: false, message: 'primaryProjectId 必须在 projectIds 中' };
    }

    // 更新
    const now = new Date().toISOString();
    const updatedGroup = {
        ...existingGroups[groupIndex],
        ...(name !== undefined && { name }),
        ...(primaryProjectId && { primaryProjectId }),
        ...(projectIds && { projectIds }),
        updatedAt: now
    };

    existingGroups[groupIndex] = updatedGroup;

    await db.collection(SYSTEM_CONFIG_COLLECTION).updateOne(
        { configType: CONFIG_TYPE_GROUPS },
        { $set: { groups: existingGroups, updatedAt: now } }
    );

    return {
        success: true,
        data: updatedGroup,
        message: '分组更新成功'
    };
}

/**
 * 删除分组
 */
async function deleteGroup(db, groupId) {
    if (!groupId) {
        return { success: false, message: '缺少分组 ID' };
    }

    const config = await db.collection(SYSTEM_CONFIG_COLLECTION).findOne({
        configType: CONFIG_TYPE_GROUPS
    });
    const existingGroups = config?.groups || [];

    const groupIndex = existingGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
        return { success: false, message: '分组不存在' };
    }

    existingGroups.splice(groupIndex, 1);

    const now = new Date().toISOString();
    await db.collection(SYSTEM_CONFIG_COLLECTION).updateOne(
        { configType: CONFIG_TYPE_GROUPS },
        { $set: { groups: existingGroups, updatedAt: now } }
    );

    return {
        success: true,
        message: '分组删除成功'
    };
}

// ==================== 调度配置管理 ====================

/**
 * 获取调度配置
 */
async function getSchedulerConfig(db) {
    let config = await db.collection(SYSTEM_CONFIG_COLLECTION).findOne({
        configType: CONFIG_TYPE_SCHEDULER
    });

    // 如果配置不存在，返回默认配置
    if (!config) {
        config = {
            configType: CONFIG_TYPE_SCHEDULER,
            enabled: false,
            time: '10:00',
            frequency: 'daily',
            selectedProjectIds: [],
            lastExecutedAt: null,
            updatedAt: null
        };
    }

    // 移除 MongoDB _id
    delete config._id;

    return {
        success: true,
        data: config
    };
}

/**
 * 更新调度配置
 */
async function updateSchedulerConfig(db, configData) {
    const { enabled, time, frequency, selectedProjectIds } = configData;

    const validConfig = {
        configType: CONFIG_TYPE_SCHEDULER,
        updatedAt: new Date().toISOString()
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
        const projects = await db.collection('projects').find({
            id: { $in: selectedProjectIds },
            'trackingConfig.status': 'active'
        }).toArray();

        const validProjectIds = projects.map(p => p.id);
        validConfig.selectedProjectIds = validProjectIds;

        const invalidIds = selectedProjectIds.filter(id => !validProjectIds.includes(id));
        if (invalidIds.length > 0) {
            console.log(`[dailyReportApi] 忽略无效或非 active 状态的项目: ${invalidIds.join(', ')}`);
        }
    }

    // 使用 upsert
    await db.collection(SYSTEM_CONFIG_COLLECTION).updateOne(
        { configType: CONFIG_TYPE_SCHEDULER },
        { $set: validConfig },
        { upsert: true }
    );

    const updatedConfig = await db.collection(SYSTEM_CONFIG_COLLECTION).findOne({
        configType: CONFIG_TYPE_SCHEDULER
    });
    delete updatedConfig._id;

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
    const projects = await db.collection('projects').find({
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

// ==================== 执行记录管理 ====================

/**
 * 获取执行记录列表
 */
async function getExecutions(db, projectId, limit = 20) {
    const query = {};

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

// ==================== 主处理函数 ====================
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

        const queryParams = event.queryStringParameters || {};
        let bodyParams = {};
        if (event.body) {
            try {
                bodyParams = JSON.parse(event.body);
            } catch (e) { /* ignore */ }
        }

        let result;
        // 同时从 queryParams 和 bodyParams 中获取 action 和 id（POST/PUT/DELETE 可能在 body 中）
        const action = queryParams.action || bodyParams.action;
        const id = queryParams.id || bodyParams.id;

        // ========== 分组管理（使用 action 参数） ==========
        if (action === 'getGroups') {
            result = await getGroups(db);
        }
        else if (action === 'createGroup') {
            result = await createGroup(db, bodyParams);
        }
        else if (action === 'updateGroup') {
            result = await updateGroup(db, id, bodyParams);
        }
        else if (action === 'deleteGroup') {
            result = await deleteGroup(db, id);
        }
        // ========== 调度管理（使用 action 参数） ==========
        else if (action === 'getSchedulerConfig') {
            result = await getSchedulerConfig(db);
        }
        else if (action === 'updateSchedulerConfig') {
            result = await updateSchedulerConfig(db, bodyParams);
        }
        else if (action === 'getEligibleProjects') {
            result = await getEligibleProjects(db);
        }
        else if (action === 'getExecutions') {
            result = await getExecutions(db, queryParams.projectId, queryParams.limit);
        }
        else if (action === 'getExecutionDetail') {
            result = await getExecutionDetail(db, id);
        }
        else if (action === 'createExecution') {
            result = await createExecution(db, bodyParams);
        }
        else if (action === 'updateExecution') {
            result = await updateExecution(db, id, bodyParams);
        }
        // ========== 日报数据（原有路由，保持兼容） ==========
        else if (path.includes('/talent-trend') && httpMethod === 'GET') {
            const { collaborationIds, days } = queryParams;
            if (!collaborationIds) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 collaborationIds 参数' }) };
            }
            const ids = collaborationIds.split(',').filter(Boolean);
            result = await getTalentTrend(db, ids, parseInt(days) || 14);

        } else if (path.includes('/tracking-overview') && httpMethod === 'GET') {
            result = await getTrackingOverview(db);

        } else if (path.includes('/daily-report') && httpMethod === 'GET') {
            const { projectId, date, includePrevious, forceRefresh } = queryParams;
            if (!projectId) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 projectId 参数' }) };
            }
            result = await getDailyReport(db, projectId, date, includePrevious === 'true', forceRefresh === 'true');

        } else if (path.includes('/daily-stats') && httpMethod === 'POST') {
            const { projectId, date, data } = bodyParams;
            if (!projectId || !Array.isArray(data)) {
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '缺少 projectId 或 data 参数' }) };
            }
            result = await saveDailyStats(db, projectId, date, data);

        } else if (path.includes('/report-solution') && httpMethod === 'POST') {
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
