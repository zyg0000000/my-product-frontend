/**
 * @module field-metadata
 * @description 字段元数据管理模块，支持从后端动态获取字段配置
 */

import { API_ENDPOINTS } from './constants.js';

// 内存缓存
let metadataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从后端获取字段元数据
 * @param {string} entity - 实体类型 (talent/collaboration/project)，可选
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} 字段元数据对象
 */
export async function fetchFieldMetadata(entity = null, forceRefresh = false) {
    // 检查缓存
    if (!forceRefresh && metadataCache && cacheTimestamp) {
        const now = Date.now();
        if (now - cacheTimestamp < CACHE_DURATION) {
            console.log('[Field Metadata] 使用缓存数据');
            return entity ? metadataCache[entity] : metadataCache;
        }
    }

    try {
        const url = entity
            ? `${API_ENDPOINTS.fieldMetadata}?entity=${entity}`
            : API_ENDPOINTS.fieldMetadata;

        console.log('[Field Metadata] 从后端获取元数据:', url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '获取字段元数据失败');
        }

        // 更新缓存
        if (entity) {
            // 如果只请求了特定实体，更新该实体的缓存
            if (!metadataCache) metadataCache = {};
            metadataCache[entity] = result.metadata;
        } else {
            // 如果请求了全部，更新整个缓存
            metadataCache = result.metadata;
        }

        cacheTimestamp = Date.now();

        console.log('[Field Metadata] 元数据获取成功');
        return entity ? result.metadata : metadataCache;

    } catch (error) {
        console.error('[Field Metadata] 获取失败:', error);

        // 如果获取失败且有缓存，返回缓存数据
        if (metadataCache) {
            console.warn('[Field Metadata] 使用过期缓存数据');
            return entity ? metadataCache[entity] : metadataCache;
        }

        // 如果完全没有缓存，返回降级数据（静态配置）
        console.warn('[Field Metadata] 使用降级静态配置');
        return getFallbackMetadata(entity);
    }
}

/**
 * 将字段元数据转换为 dimension-config 格式
 * @param {Object} metadata - 后端返回的元数据
 * @returns {Object} dimension-config 格式的维度配置
 */
export function convertMetadataToDimensions(metadata) {
    const dimensions = {};

    for (const [groupName, fields] of Object.entries(metadata)) {
        dimensions[groupName] = fields.map(field => ({
            id: field.id,
            label: field.label
        }));
    }

    return dimensions;
}

/**
 * 构建字段映射表（fieldId -> backendKey）
 * @param {Object} metadata - 后端返回的元数据
 * @returns {Object} 字段映射对象
 */
export function buildFieldMapping(metadata) {
    const mapping = {};

    for (const fields of Object.values(metadata)) {
        for (const field of fields) {
            mapping[field.id] = field.backendKey;
        }
    }

    return mapping;
}

/**
 * 构建字段标签映射表（fieldId -> label）
 * @param {Object} metadata - 后端返回的元数据
 * @returns {Object} 标签映射对象
 */
export function buildLabelMapping(metadata) {
    const mapping = {};

    for (const fields of Object.values(metadata)) {
        for (const field of fields) {
            mapping[field.id] = field.label;
        }
    }

    return mapping;
}

/**
 * 清除缓存（用于调试或强制刷新）
 */
export function clearMetadataCache() {
    metadataCache = null;
    cacheTimestamp = null;
    console.log('[Field Metadata] 缓存已清除');
}

/**
 * 降级静态配置（当后端API不可用时使用）
 * @param {string} entity - 实体类型
 * @returns {Object} 静态字段元数据
 */
function getFallbackMetadata(entity) {
    // 完整的降级配置，确保API失败时仍有完整字段可用
    const fallback = {
        talent: {
            '基础信息': [
                { id: 'nickname', label: '达人昵称', backendKey: '达人昵称', dataType: 'string' },
                { id: 'xingtuId', label: '星图ID', backendKey: '星图ID', dataType: 'string' },
                { id: 'uid', label: 'UID', backendKey: 'UID', dataType: 'string' },
                { id: 'talentTier', label: '达人层级', backendKey: '达人层级', dataType: 'string' },
                { id: 'talentSource', label: '达人来源', backendKey: '达人来源', dataType: 'string' },
                { id: 'talentType', label: '内容标签', backendKey: '内容标签', dataType: 'string' },
            ],
            '商务信息': [
                { id: 'price', label: '一口价 (指定月份)', backendKey: '一口价', dataType: 'number' },
                { id: 'highestRebate', label: '最高返点率', backendKey: '最高返点率', dataType: 'percentage' },
            ],
            '合作数据': [
                { id: 'collaboration_count', label: '历史合作总次数', backendKey: '历史合作总次数', dataType: 'number' },
            ],
            '作品表现 (T+7)': [
                { id: 'work_total_t7_views', label: 'T+7 总播放量', backendKey: 'T+7 总播放量', dataType: 'number' }
            ],
            '粉丝画像 - 基础指标': [
                { id: 'cpm60s', label: '60s+预期CPM', backendKey: 'cpm60s', dataType: 'number' },
                { id: 'maleAudienceRatio', label: '男性观众比例', backendKey: 'maleAudienceRatio', dataType: 'percentage' },
                { id: 'femaleAudienceRatio', label: '女性观众比例', backendKey: 'femaleAudienceRatio', dataType: 'percentage' },
            ],
            '粉丝画像 - 年龄段分布': [
                { id: 'ratio_18_23', label: '18-23岁粉丝比例', backendKey: 'ratio_18_23', dataType: 'percentage' },
                { id: 'ratio_24_30', label: '24-30岁粉丝比例', backendKey: 'ratio_24_30', dataType: 'percentage' },
                { id: 'ratio_31_40', label: '31-40岁粉丝比例', backendKey: 'ratio_31_40', dataType: 'percentage' },
                { id: 'ratio_41_50', label: '41-50岁粉丝比例', backendKey: 'ratio_41_50', dataType: 'percentage' },
                { id: 'ratio_50_plus', label: '50岁以上粉丝比例', backendKey: 'ratio_50_plus', dataType: 'percentage' },
                { id: 'audience_18_40_ratio', label: '18-40岁观众占比（计算）', backendKey: 'audience_18_40_ratio', dataType: 'percentage' },
                { id: 'audience_40_plus_ratio', label: '40岁以上观众占比（计算）', backendKey: 'audience_40_plus_ratio', dataType: 'percentage' },
            ],
            '粉丝画像 - 八大人群': [
                { id: 'ratio_town_middle_aged', label: '小镇中老年粉丝比例', backendKey: 'ratio_town_middle_aged', dataType: 'percentage' },
                { id: 'ratio_senior_middle_class', label: '资深中产粉丝比例', backendKey: 'ratio_senior_middle_class', dataType: 'percentage' },
                { id: 'ratio_z_era', label: 'Z时代粉丝比例', backendKey: 'ratio_z_era', dataType: 'percentage' },
                { id: 'ratio_urban_silver', label: '都市银发粉丝比例', backendKey: 'ratio_urban_silver', dataType: 'percentage' },
                { id: 'ratio_town_youth', label: '小镇青年粉丝比例', backendKey: 'ratio_town_youth', dataType: 'percentage' },
                { id: 'ratio_exquisite_mom', label: '精致妈妈粉丝比例', backendKey: 'ratio_exquisite_mom', dataType: 'percentage' },
                { id: 'ratio_new_white_collar', label: '新锐白领粉丝比例', backendKey: 'ratio_new_white_collar', dataType: 'percentage' },
                { id: 'ratio_urban_blue_collar', label: '都市蓝领粉丝比例', backendKey: 'ratio_urban_blue_collar', dataType: 'percentage' },
            ]
        },
        collaboration: {
            '合作信息': [
                { id: 'collaboration_status', label: '合作状态', backendKey: '合作状态', dataType: 'string' },
                { id: 'collaboration_amount', label: '合作金额', backendKey: '合作金额', dataType: 'number' },
                { id: 'collaboration_orderType', label: '下单方式', backendKey: '下单方式', dataType: 'string' },
                { id: 'collaboration_plannedReleaseDate', label: '计划发布日期', backendKey: '计划发布日期', dataType: 'date' },
                { id: 'collaboration_publishDate', label: '实际发布日期', backendKey: '实际发布日期', dataType: 'date' },
            ],
            '项目信息': [
                { id: 'project_name', label: '所属项目', backendKey: '项目名称', dataType: 'string' },
                { id: 'project_type', label: '项目类型', backendKey: '项目类型', dataType: 'string' },
            ],
            '达人信息': [
                { id: 'nickname', label: '达人昵称', backendKey: '达人昵称', dataType: 'string' },
                { id: 'talentTier', label: '达人层级', backendKey: '达人层级', dataType: 'string' },
            ],
            '作品表现 (T+7)': [
                { id: 'work_t7_totalViews', label: 'T+7 播放量', backendKey: 'T+7 播放量', dataType: 'number' },
                { id: 'work_t7_likeCount', label: 'T+7 点赞数', backendKey: 'T+7 点赞数', dataType: 'number' },
            ]
        },
        project: {
            '项目信息': [
                { id: 'project_name', label: '项目名称', backendKey: '项目名称', dataType: 'string' },
                { id: 'project_type', label: '项目类型', backendKey: '项目类型', dataType: 'string' },
                { id: 'project_brand', label: '品牌', backendKey: '品牌', dataType: 'string' },
            ],
            '合作统计': [
                { id: 'total_collaborations', label: '合作达人数', backendKey: '合作达人数', dataType: 'number' },
                { id: 'total_amount', label: '合作总金额', backendKey: '合作总金额', dataType: 'number' },
            ]
        }
    };

    return entity ? fallback[entity] : fallback;
}

/**
 * 预加载所有实体的元数据（可在应用启动时调用）
 * @returns {Promise<void>}
 */
export async function preloadMetadata() {
    console.log('[Field Metadata] 预加载所有元数据');
    await fetchFieldMetadata();
}
