/**
 * @module dimension-config
 * @description 维度配置模块，定义所有导出主体的筛选条件和可导出维度
 * @version 2.0.0 - 支持从后端动态加载字段元数据
 */

import { fetchFieldMetadata, convertMetadataToDimensions } from './field-metadata.js';

/**
 * 维度配置对象
 * 包含三种导出主体（talent/collaboration/project）的完整配置
 */
export const DIMENSION_CONFIG = {
    talent: {
        filters: [
            {
                id: 'search',
                label: '达人昵称/ID',
                type: 'text',
                placeholder: '搜索昵称或星图ID...'
            },
            {
                id: 'tiers',
                label: '达人层级',
                type: 'checkbox',
                optionsKey: 'talentTiers'
            },
            {
                id: 'types',
                label: '内容标签',
                type: 'checkbox',
                optionsKey: 'talentTypes'
            }
        ],
        dimensions: {
            '基础信息': [
                { id: 'nickname', label: '达人昵称' },
                { id: 'xingtuId', label: '星图ID' },
                { id: 'uid', label: 'UID' },
                { id: 'talentTier', label: '达人层级' },
                { id: 'talentSource', label: '达人来源' },
                { id: 'talentType', label: '内容标签' },
            ],
            '商务信息': [
                { id: 'price', label: '一口价 (指定月份)' },
                { id: 'highestRebate', label: '最高返点率' },
            ],
            '合作数据': [
                { id: 'collaboration_count', label: '历史合作总次数' },
            ],
            '作品表现 (T+7)': [
                { id: 'work_total_t7_views', label: 'T+7 总播放量' }
            ],
            '粉丝画像 - 基础指标': [
                { id: 'cpm60s', label: '60s+预期CPM' },
                { id: 'maleAudienceRatio', label: '男性观众比例' },
                { id: 'femaleAudienceRatio', label: '女性观众比例' },
            ],
            '粉丝画像 - 年龄段分布': [
                { id: 'ratio_18_23', label: '18-23岁粉丝比例' },
                { id: 'ratio_24_30', label: '24-30岁粉丝比例' },
                { id: 'ratio_31_40', label: '31-40岁粉丝比例' },
                { id: 'ratio_41_50', label: '41-50岁粉丝比例' },
                { id: 'ratio_50_plus', label: '50岁以上粉丝比例' },
                { id: 'audience_18_40_ratio', label: '18-40岁观众占比（计算）' },
                { id: 'audience_40_plus_ratio', label: '40岁以上观众占比（计算）' },
            ],
            '粉丝画像 - 八大人群': [
                { id: 'ratio_town_middle_aged', label: '小镇中老年粉丝比例' },
                { id: 'ratio_senior_middle_class', label: '资深中产粉丝比例' },
                { id: 'ratio_z_era', label: 'Z时代粉丝比例' },
                { id: 'ratio_urban_silver', label: '都市银发粉丝比例' },
                { id: 'ratio_town_youth', label: '小镇青年粉丝比例' },
                { id: 'ratio_exquisite_mom', label: '精致妈妈粉丝比例' },
                { id: 'ratio_new_white_collar', label: '新锐白领粉丝比例' },
                { id: 'ratio_urban_blue_collar', label: '都市蓝领粉丝比例' },
            ]
        }
    },

    collaboration: {
        filters: [
            {
                id: 'status',
                label: '合作状态',
                type: 'checkbox',
                options: ['待提报工作台', '工作台已提交', '客户已定档', '视频已发布']
            },
            {
                id: 'orderType',
                label: '下单方式',
                type: 'select',
                options: ['改价下单', '原价下单']
            },
            {
                id: 'publishDateRange',
                label: '发布日期范围',
                type: 'daterange'
            }
        ],
        dimensions: {
            '合作信息': [
                { id: 'collaboration_status', label: '合作状态' },
                { id: 'collaboration_amount', label: '合作金额' },
                { id: 'collaboration_orderType', label: '下单方式' },
                { id: 'collaboration_plannedReleaseDate', label: '计划发布日期' },
                { id: 'collaboration_publishDate', label: '实际发布日期' },
                { id: 'taskId', label: '星图任务ID' },
                { id: 'videoId', label: '视频ID' },
            ],
            '项目信息': [
                { id: 'project_name', label: '所属项目' },
                { id: 'project_type', label: '项目类型' },
            ],
            '达人信息': [
                { id: 'nickname', label: '达人昵称' },
                { id: 'talentTier', label: '达人层级' },
            ],
            '作品表现 (T+7)': [
                { id: 'work_t7_totalViews', label: 'T+7 播放量' },
                { id: 'work_t7_likeCount', label: 'T+7 点赞数' },
            ]
        }
    },

    project: {
        filters: [
            {
                id: 'monthType',
                label: '时间维度类型',
                type: 'radio',
                options: [
                    { value: 'customer', label: '客户月份' },
                    { value: 'financial', label: '财务月份' }
                ],
                defaultValue: 'customer'
            },
            {
                id: 'yearMonth',
                label: '年份月份',
                type: 'yearmonth'
            },
            {
                id: 'status',
                label: '合作状态',
                type: 'checkbox',
                options: ['待提报工作台', '工作台已提交', '客户已定档', '视频已发布']
            },
            {
                id: 'projectIds',
                label: '选择项目',
                type: 'checkbox',
                optionsKey: 'projects',
                dependsOn: 'yearMonth'  // 标记依赖于时间选择
            }
        ],
        dimensions: {
            '合作信息': [
                { id: 'collaboration_status', label: '合作状态' },
                { id: 'collaboration_amount', label: '合作金额' },
                { id: 'collaboration_rebate', label: '合作返点' },
                { id: 'collaboration_orderType', label: '下单方式' },
                { id: 'collaboration_plannedReleaseDate', label: '计划发布日期' },
                { id: 'collaboration_publishDate', label: '实际发布日期' },
                { id: 'taskId', label: '星图任务ID' },
                { id: 'videoId', label: '视频ID' },
            ],
            '项目信息': [
                { id: 'project_name', label: '所属项目' },
                { id: 'project_type', label: '项目类型' },
            ],
            '达人信息': [
                { id: 'nickname', label: '达人昵称' },
                { id: 'xingtuId', label: '星图ID' },
                { id: 'talentTier', label: '达人层级' },
                { id: 'talent_price_60s', label: '达人60s+价格 (当月)' },
                { id: 'talent_highest_rebate', label: '达人最高返点率' },
            ],
            '作品表现 (T+7)': [
                { id: 'work_t7_totalViews', label: 'T+7 播放量' },
                { id: 'work_t7_likeCount', label: 'T+7 点赞数' },
            ]
        }
    }
};

/**
 * 获取指定实体的配置
 * @param {string} entity - 实体类型 (talent/collaboration/project)
 * @returns {Object|null} 实体配置对象，如果实体不存在则返回null
 */
export function getEntityConfig(entity) {
    return DIMENSION_CONFIG[entity] || null;
}

/**
 * 获取指定实体的筛选器配置
 * @param {string} entity - 实体类型
 * @returns {Array} 筛选器配置数组
 */
export function getEntityFilters(entity) {
    const config = getEntityConfig(entity);
    return config ? config.filters : [];
}

/**
 * 获取指定实体的维度配置
 * @param {string} entity - 实体类型
 * @returns {Object} 维度配置对象
 */
export function getEntityDimensions(entity) {
    const config = getEntityConfig(entity);
    return config ? config.dimensions : {};
}

/**
 * 获取所有可用的实体类型
 * @returns {string[]} 实体类型数组
 */
export function getAvailableEntities() {
    return Object.keys(DIMENSION_CONFIG);
}

/**
 * 验证维度ID是否有效
 * @param {string} entity - 实体类型
 * @param {string} dimensionId - 维度ID
 * @returns {boolean} 维度是否有效
 */
export function isValidDimension(entity, dimensionId) {
    const dimensions = getEntityDimensions(entity);
    for (const groupName in dimensions) {
        if (dimensions[groupName].some(dim => dim.id === dimensionId)) {
            return true;
        }
    }
    return false;
}

// ==================== 动态维度加载功能 ====================

/**
 * 动态维度缓存（从后端加载的维度）
 */
let dynamicDimensionsCache = {};

/**
 * 是否启用动态加载（默认启用）
 * [临时禁用] 后端 /get-field-metadata API 尚未更新 taskId 和 videoId 字段
 */
let useDynamicLoading = false;

/**
 * 设置是否启用动态加载
 * @param {boolean} enabled - 是否启用
 */
export function setDynamicLoadingEnabled(enabled) {
    useDynamicLoading = enabled;
    console.log(`[Dimension Config] 动态加载已${enabled ? '启用' : '禁用'}`);
}

/**
 * 从后端动态获取实体的维度配置
 * @param {string} entity - 实体类型
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<Object>} 维度配置对象
 */
export async function getEntityDimensionsDynamic(entity, forceRefresh = false) {
    if (!useDynamicLoading) {
        console.log('[Dimension Config] 动态加载已禁用，使用静态配置');
        return getEntityDimensions(entity);
    }

    try {
        // 检查缓存
        if (!forceRefresh && dynamicDimensionsCache[entity]) {
            console.log(`[Dimension Config] 使用缓存的动态维度: ${entity}`);
            return dynamicDimensionsCache[entity];
        }

        // 从后端获取元数据
        console.log(`[Dimension Config] 从后端加载维度配置: ${entity}`);
        const metadata = await fetchFieldMetadata(entity, forceRefresh);

        if (!metadata) {
            console.warn(`[Dimension Config] 后端返回空数据，使用静态配置: ${entity}`);
            return getEntityDimensions(entity);
        }

        // 转换为维度配置格式
        const dimensions = convertMetadataToDimensions(metadata);

        // 更新缓存
        dynamicDimensionsCache[entity] = dimensions;

        console.log(`[Dimension Config] 动态维度加载成功: ${entity}`, dimensions);
        return dimensions;

    } catch (error) {
        console.error(`[Dimension Config] 动态加载失败: ${entity}`, error);
        console.warn('[Dimension Config] 降级使用静态配置');
        return getEntityDimensions(entity);
    }
}

/**
 * 预加载所有实体的动态维度
 * @returns {Promise<void>}
 */
export async function preloadAllDynamicDimensions() {
    if (!useDynamicLoading) {
        console.log('[Dimension Config] 动态加载已禁用，跳过预加载');
        return;
    }

    console.log('[Dimension Config] 预加载所有实体的动态维度');
    const entities = getAvailableEntities();

    const promises = entities.map(entity =>
        getEntityDimensionsDynamic(entity).catch(err => {
            console.error(`预加载 ${entity} 失败:`, err);
        })
    );

    await Promise.all(promises);
    console.log('[Dimension Config] 所有动态维度预加载完成');
}

/**
 * 清除动态维度缓存
 */
export function clearDynamicDimensionsCache() {
    dynamicDimensionsCache = {};
    console.log('[Dimension Config] 动态维度缓存已清除');
}

/**
 * 获取实体的维度配置（智能选择静态或动态）
 * 如果动态加载已初始化，优先使用动态数据；否则使用静态配置
 * @param {string} entity - 实体类型
 * @returns {Object} 维度配置对象
 */
export function getEntityDimensionsSmart(entity) {
    // 如果有动态缓存，使用动态数据
    if (useDynamicLoading && dynamicDimensionsCache[entity]) {
        console.log(`[Dimension Config] 使用动态配置: ${entity}`);
        return dynamicDimensionsCache[entity];
    }

    // 否则使用静态配置
    const staticDimensions = getEntityDimensions(entity);
    console.log(`[Dimension Config] 使用静态配置: ${entity}`, staticDimensions);
    return staticDimensions;
}