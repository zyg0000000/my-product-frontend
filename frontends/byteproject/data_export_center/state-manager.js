/**
 * @module state-manager
 * @description 状态管理模块，管理应用程序的全局状态
 */

import { EXPORT_ENTITIES } from './constants.js';

// 私有状态对象
const state = {
    selectedEntity: EXPORT_ENTITIES.TALENT,
    currentFilters: {},
    // selectedDimensions 现在是一个对象，每个实体有自己的维度ID数组（保持顺序）
    selectedDimensions: {
        talent: [],
        collaboration: [],
        project: []
    },
    initialConfigs: {
        talentTiers: [],
        talentTypes: [],
        projects: []
    },
    // 预览数据状态
    previewData: null,
    hasPreviewData: false
};

/**
 * 更新当前选中的导出主体
 * @param {string} entity - 导出主体类型 (talent/collaboration/project)
 */
export function updateSelectedEntity(entity) {
    if (Object.values(EXPORT_ENTITIES).includes(entity)) {
        state.selectedEntity = entity;
        // 切换实体时清空筛选条件和选中维度
        state.currentFilters = {};
        state.selectedDimensions = {};
    } else {
        console.error(`Invalid entity type: ${entity}`);
    }
}

/**
 * 更新筛选条件
 * @param {Object} filters - 筛选条件对象
 */
export function updateFilters(filters) {
    state.currentFilters = { ...filters };
}

/**
 * 更新单个筛选条件
 * @param {string} filterKey - 筛选条件键名
 * @param {any} filterValue - 筛选条件值
 */
export function updateFilter(filterKey, filterValue) {
    state.currentFilters[filterKey] = filterValue;
}

/**
 * 更新选中的维度（全量替换）
 * @param {Object} dimensions - 选中的维度对象，格式：{ talent: [...], collaboration: [...], project: [...] }
 */
export function updateDimensions(dimensions) {
    state.selectedDimensions = { ...dimensions };
}

/**
 * 更新指定实体的已选维度列表
 * @param {string} entity - 实体类型 (talent/collaboration/project)
 * @param {string[]} dimensionIds - 维度ID数组（有序）
 */
export function updateSelectedDimensions(entity, dimensionIds) {
    if (Object.values(EXPORT_ENTITIES).includes(entity)) {
        state.selectedDimensions[entity] = [...dimensionIds];
    } else {
        console.error(`Invalid entity type: ${entity}`);
    }
}

/**
 * 添加或移除单个维度（兼容旧代码）
 * @param {string} dimensionId - 维度ID
 * @param {boolean} selected - 是否选中
 */
export function toggleDimension(dimensionId, selected) {
    const entity = state.selectedEntity;
    const currentList = state.selectedDimensions[entity] || [];

    if (selected && !currentList.includes(dimensionId)) {
        state.selectedDimensions[entity] = [...currentList, dimensionId];
    } else if (!selected) {
        state.selectedDimensions[entity] = currentList.filter(id => id !== dimensionId);
    }
}

/**
 * 获取当前实体的选中维度ID列表
 * @returns {string[]} 选中的维度ID数组（有序）
 */
export function getSelectedDimensionIds() {
    const entity = state.selectedEntity;
    return state.selectedDimensions[entity] || [];
}

/**
 * 更新初始配置
 * @param {Object} configs - 初始配置对象
 * @param {Array} [configs.talentTiers] - 达人层级选项
 * @param {Array} [configs.talentTypes] - 内容标签选项
 * @param {Array} [configs.projects] - 项目列表
 */
export function updateInitialConfigs(configs) {
    Object.assign(state.initialConfigs, configs);
}

/**
 * 获取初始配置
 * @returns {Object} 初始配置对象
 */
export function getInitialConfigs() {
    return { ...state.initialConfigs };
}

/**
 * 获取当前状态的完整副本
 * @returns {Object} 状态对象的副本
 */
export function getState() {
    return {
        selectedEntity: state.selectedEntity,
        currentFilters: { ...state.currentFilters },
        selectedDimensions: { ...state.selectedDimensions },
        initialConfigs: { ...state.initialConfigs }
    };
}

/**
 * 获取当前选中的实体类型
 * @returns {string} 当前选中的实体类型
 */
export function getSelectedEntity() {
    return state.selectedEntity;
}

/**
 * 获取当前筛选条件
 * @returns {Object} 当前筛选条件的副本
 */
export function getCurrentFilters() {
    return { ...state.currentFilters };
}

/**
 * 清空所有筛选条件
 */
export function clearFilters() {
    state.currentFilters = {};
}

/**
 * 清空所有选中维度
 */
export function clearDimensions() {
    state.selectedDimensions = {
        talent: [],
        collaboration: [],
        project: []
    };
}

/**
 * 重置所有状态到初始值
 */
export function resetState() {
    state.selectedEntity = EXPORT_ENTITIES.TALENT;
    state.currentFilters = {};
    state.selectedDimensions = {
        talent: [],
        collaboration: [],
        project: []
    };
    state.previewData = null;
    state.hasPreviewData = false;
}

/**
 * 更新预览数据
 * @param {Array} data - 预览数据
 */
export function updatePreviewData(data) {
    state.previewData = data;
    state.hasPreviewData = data && data.length > 0;
}

/**
 * 获取预览数据
 * @returns {Array|null} 预览数据
 */
export function getPreviewData() {
    return state.previewData;
}

/**
 * 检查是否有预览数据
 * @returns {boolean} 是否有预览数据
 */
export function hasPreviewData() {
    return state.hasPreviewData;
}

/**
 * 清空预览数据
 */
export function clearPreviewData() {
    state.previewData = null;
    state.hasPreviewData = false;
}