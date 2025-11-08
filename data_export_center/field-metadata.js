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
    // 这里可以返回一个基础的静态配置作为降级方案
    const fallback = {
        talent: {
            '基础信息': [
                { id: 'nickname', label: '达人昵称', backendKey: '达人昵称', dataType: 'string' },
                { id: 'xingtuId', label: '星图ID', backendKey: '星图ID', dataType: 'string' },
            ]
        },
        collaboration: {
            '合作信息': [
                { id: 'collaboration_status', label: '合作状态', backendKey: '合作状态', dataType: 'string' },
            ]
        },
        project: {
            '项目信息': [
                { id: 'project_name', label: '所属项目', backendKey: '项目名称', dataType: 'string' },
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
