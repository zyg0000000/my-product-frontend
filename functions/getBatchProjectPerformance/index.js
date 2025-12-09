/**
 * @file getBatchProjectPerformance.js
 * @version 1.2.0-talent-view
 * @description 批量效果看板API - 一次请求获取多个项目的效果数据
 *
 * 设计目的：
 * - 解决前端并发请求导致的数据库连接池耗尽问题
 * - 复用单个数据库连接处理多个项目
 * - 使用 $in 操作符批量查询，减少数据库往返
 *
 * v1.2.0 更新：
 * - 新增 talentId、xingtuId 字段支持达人视角
 * - 新增 platformWorkId 字段支持视频链接跳转
 *
 * v1.1.0 更新：
 * - 效果达成只统计"视频已发布"状态的合作
 */

// 效果达成统计：仅"视频已发布"状态的合作
const EFFECT_VALID_STATUS = '视频已发布';

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'kol_data';
const MAX_BATCH_SIZE = 50; // 单次请求最大项目数

let client;
async function connectToDatabase() {
    if (client && client.topology && client.topology.isConnected()) {
        return client;
    }
    client = new MongoClient(MONGO_URI);
    await client.connect();
    return client;
}

function addDays(date, days) {
    if (!date) return null;
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
}

/**
 * 计算单个项目的效果数据
 * @param {Object} project - 项目数据
 * @param {Array} collaborations - 该项目的合作数据
 * @param {Array} works - 作品数据
 * @param {Array} talents - 达人数据
 * @returns {Object} 项目效果数据 { overall, talents }
 */
function calculateProjectPerformance(project, collaborations, works, talents) {
    if (collaborations.length === 0) {
        return { overall: {}, talents: [] };
    }

    const benchmarkCPM = project.benchmarkCPM || null;
    const projectDiscount = (project.discount !== null && project.discount !== undefined) ? Number(project.discount) : 1;

    let lastPublishDate = null;

    const talentData = collaborations.map(collab => {
        const work = works.find(w => w.collaborationId === collab.id) || {};
        const talentInfo = talents.find(t => t.id === collab.talentId);
        const collabStatus = collab.status || '';

        // 只有视频已发布的合作才记录发布日期
        if (collabStatus === EFFECT_VALID_STATUS && collab.publishDate) {
            const currentPublishDate = new Date(collab.publishDate);
            if (!lastPublishDate || currentPublishDate > lastPublishDate) {
                lastPublishDate = currentPublishDate;
            }
        }

        const executionAmount = (Number(collab.amount) || 0) * projectDiscount * 1.05;

        // 判断是否符合效果达成统计条件（仅视频已发布）
        const isEffectValid = collabStatus === EFFECT_VALID_STATUS;

        // --- T+7 Metrics ---
        const t7_views = work.t7_totalViews || 0;
        const t7_likes = work.t7_likeCount || 0;
        const t7_comments = work.t7_commentCount || 0;
        const t7_shares = work.t7_shareCount || 0;
        const t7_interactions = t7_likes + t7_comments + t7_shares;

        const t7_componentClicks = work.t7_componentClickCount || 0;
        const t7_componentImpressions = work.t7_componentImpressionCount || 0;

        const t7_completionRate = work.t7_completionRate || 0;
        const t7_completionViews = t7_views * t7_completionRate;

        const t7_reachByFrequency = work.t7_reachByFrequency || {};
        const t7_totalReach = Object.values(t7_reachByFrequency).reduce((sum, count) => sum + (count || 0), 0);

        const t7_cpm = t7_views > 0 ? (executionAmount / t7_views) * 1000 : 0;
        const t7_cpe = t7_interactions > 0 ? executionAmount / t7_interactions : 0;
        const t7_ctr = t7_componentImpressions > 0 ? t7_componentClicks / t7_componentImpressions : 0;
        const t7_interactionRate = t7_views > 0 ? t7_interactions / t7_views : 0;
        const t7_likeToViewRatio = t7_views > 0 ? t7_likes / t7_views : 0;

        // --- T+21 Metrics ---
        const t21_views = work.t21_totalViews || 0;
        const t21_likes = work.t21_likeCount || 0;
        const t21_comments = work.t21_commentCount || 0;
        const t21_shares = work.t21_shareCount || 0;
        const t21_interactions = t21_likes + t21_comments + t21_shares;

        const t21_componentClicks = work.t21_componentClickCount || 0;
        const t21_componentImpressions = work.t21_componentImpressionCount || 0;

        const t21_completionRate = work.t21_completionRate || 0;
        const t21_completionViews = t21_views * t21_completionRate;

        const t21_reachByFrequency = work.t21_reachByFrequency || {};
        const t21_totalReach = Object.values(t21_reachByFrequency).reduce((sum, count) => sum + (count || 0), 0);

        const t21_cpm = t21_views > 0 ? (executionAmount / t21_views) * 1000 : 0;
        const t21_cpe = t21_interactions > 0 ? executionAmount / t21_interactions : 0;
        const t21_ctr = t21_componentImpressions > 0 ? t21_componentClicks / t21_componentImpressions : 0;
        const t21_interactionRate = t21_views > 0 ? t21_interactions / t21_views : 0;
        const t21_likeToViewRatio = t21_views > 0 ? t21_likes / t21_views : 0;

        return {
            id: collab.id,
            talentId: collab.talentId,
            talentName: talentInfo?.nickname || '未知达人',
            xingtuId: talentInfo?.xingtuId || null,
            publishDate: collab.publishDate,
            status: collabStatus,
            executionAmount,
            // 视频链接相关
            platformWorkId: work.platformWorkId || null,
            // 状态标志：是否纳入效果达成统计
            isEffectValid,

            // T+7 完整指标
            t7_views, t7_likes, t7_comments, t7_shares, t7_interactions,
            t7_componentClicks, t7_componentImpressions,
            t7_completionRate, t7_completionViews,
            t7_totalReach,
            t7_cpm, t7_cpe, t7_ctr, t7_interactionRate, t7_likeToViewRatio,

            // T+21 完整指标
            t21_views, t21_likes, t21_comments, t21_shares, t21_interactions,
            t21_componentClicks, t21_componentImpressions,
            t21_completionRate, t21_completionViews,
            t21_totalReach,
            t21_cpm, t21_cpe, t21_ctr, t21_interactionRate, t21_likeToViewRatio
        };
    });

    const overall = talentData.reduce((acc, talent) => {
        // 效果达成统计：只计算"视频已发布"状态的合作
        if (!talent.isEffectValid) {
            return acc;
        }

        // 累计执行金额
        acc.totalExecutionAmount += talent.executionAmount;

        // T+7 汇总
        acc.t7_totalViews += talent.t7_views;
        acc.t7_totalInteractions += talent.t7_interactions;
        acc.t7_totalComponentClicks += talent.t7_componentClicks;
        acc.t7_totalComponentImpressions += talent.t7_componentImpressions;

        // T+21 汇总
        acc.t21_totalViews += talent.t21_views;
        acc.t21_totalInteractions += talent.t21_interactions;
        return acc;
    }, {
        totalExecutionAmount: 0,
        t7_totalViews: 0, t7_totalInteractions: 0,
        t7_totalComponentClicks: 0, t7_totalComponentImpressions: 0,
        t21_totalViews: 0, t21_totalInteractions: 0
    });

    overall.t7_cpm = overall.t7_totalViews > 0 ? (overall.totalExecutionAmount / overall.t7_totalViews) * 1000 : 0;
    overall.t7_cpe = overall.t7_totalInteractions > 0 ? (overall.totalExecutionAmount / overall.t7_totalInteractions) : 0;
    overall.t7_ctr = overall.t7_totalComponentImpressions > 0 ? overall.t7_totalComponentClicks / overall.t7_totalComponentImpressions : 0;

    // T+21 指标计算 - totalExecutionAmount 已经只包含"视频已发布"状态的合作
    if (overall.t21_totalViews > 0 && overall.totalExecutionAmount > 0) {
        overall.t21_cpm = (overall.totalExecutionAmount / overall.t21_totalViews) * 1000;
        if (benchmarkCPM && benchmarkCPM > 0) {
            // 目标播放量 = 视频已发布合作执行金额 / 基准CPM * 1000
            overall.targetViews = (overall.totalExecutionAmount / benchmarkCPM) * 1000;
            overall.viewsGap = overall.t21_totalViews - overall.targetViews;
        } else {
            overall.targetViews = null;
            overall.viewsGap = null;
        }
    } else {
        // 没有效果数据时
        overall.t21_cpm = null;
        overall.targetViews = null;
        overall.viewsGap = null;
    }

    const deliveryDate = addDays(lastPublishDate, 21);

    return {
        overall: {
            benchmarkCPM,
            lastPublishDate: lastPublishDate ? lastPublishDate.toISOString().split('T')[0] : null,
            deliveryDate,
            targetViews: overall.targetViews,
            viewsGap: overall.viewsGap,
            totalExecutionAmount: overall.totalExecutionAmount,  // 用于CPM计算，与达人视角保持一致
            t7_totalViews: overall.t7_totalViews,
            t7_totalInteractions: overall.t7_totalInteractions,
            t7_cpm: overall.t7_cpm,
            t7_cpe: overall.t7_cpe,
            t7_ctr: overall.t7_ctr,
            t21_totalViews: overall.t21_totalViews,
            t21_totalInteractions: overall.t21_totalInteractions,
            t21_cpm: overall.t21_cpm
        },
        talents: talentData
    };
}

exports.handler = async (event, context) => {
    const headers = { 'Content-Type': 'application/json' };

    try {
        const { projectIds } = JSON.parse(event.body || '{}');

        // 参数验证
        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: '请求错误：缺少 projectIds 数组。' })
            };
        }

        // 限制批量大小
        if (projectIds.length > MAX_BATCH_SIZE) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: `请求错误：projectIds 数量超过上限 ${MAX_BATCH_SIZE}。` })
            };
        }

        const dbClient = await connectToDatabase();
        const db = dbClient.db(DB_NAME);

        const projectsCollection = db.collection('projects');
        const collaborationsCollection = db.collection('collaborations');
        const worksCollection = db.collection('works');
        const talentsCollection = db.collection('talents');

        // 批量查询所有项目
        const projects = await projectsCollection.find({ id: { $in: projectIds } }).toArray();
        const projectMap = new Map(projects.map(p => [p.id, p]));

        // 批量查询所有合作
        const allCollaborations = await collaborationsCollection.find({ projectId: { $in: projectIds } }).toArray();

        // 获取所有合作ID和达人ID
        const allCollaborationIds = allCollaborations.map(c => c.id);
        const allTalentIds = [...new Set(allCollaborations.map(c => c.talentId))];

        // 批量查询作品和达人（并行）
        const [allWorks, allTalents] = await Promise.all([
            worksCollection.find({ collaborationId: { $in: allCollaborationIds } }).toArray(),
            talentsCollection.find({ id: { $in: allTalentIds } }).toArray()
        ]);

        // 按项目处理数据
        const results = {};
        const errors = {};

        for (const projectId of projectIds) {
            try {
                const project = projectMap.get(projectId);
                if (!project) {
                    errors[projectId] = '找不到指定的项目';
                    results[projectId] = null;
                    continue;
                }

                // 筛选该项目的合作数据
                const projectCollaborations = allCollaborations.filter(c => c.projectId === projectId);
                const projectCollaborationIds = projectCollaborations.map(c => c.id);
                const projectTalentIds = projectCollaborations.map(c => c.talentId);

                // 筛选该项目的作品和达人
                const projectWorks = allWorks.filter(w => projectCollaborationIds.includes(w.collaborationId));
                const projectTalents = allTalents.filter(t => projectTalentIds.includes(t.id));

                // 计算效果数据
                const performanceData = calculateProjectPerformance(
                    project,
                    projectCollaborations,
                    projectWorks,
                    projectTalents
                );

                results[projectId] = performanceData;
            } catch (err) {
                console.error(`Error processing project ${projectId}:`, err);
                errors[projectId] = err.message;
                results[projectId] = null;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ results, errors })
        };
    } catch (error) {
        console.error('Error in getBatchProjectPerformance function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: `服务器内部错误: ${error.message}` })
        };
    } finally {
        if (client) {
            await client.close();
        }
    }
};
