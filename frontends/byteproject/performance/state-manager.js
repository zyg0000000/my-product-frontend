/**
 * state-manager.js - 状态管理模块
 * 管理应用的全局状态，包括维度配置、分页、排序、筛选等
 */

import { PRESET_DIMENSIONS, DIMENSIONS_CONFIG_KEY, ITEMS_PER_PAGE_KEY } from './constants.js';

// --- 全局状态变量 ---
export let dimensions = [];
export let displayedTalents = [];
export let totalTalents = 0;
export let talentTypes = [];
export let talentTiers = [];
export let dataFilters = [];
export let importDataCache = null;
export let currentPage = 1;
export let itemsPerPage = 20;
export let sortConfig = { key: 'lastUpdated', direction: 'desc' };
export let sortableInstance = null;

// --- 状态更新函数 ---
export function updateDimensions(newDimensions) {
    dimensions = newDimensions;
}

export function updateDisplayedTalents(talents) {
    displayedTalents = talents;
}

export function updateTotalTalents(total) {
    totalTalents = total;
}

export function updateTalentTypes(types) {
    talentTypes = types;
}

export function updateTalentTiers(tiers) {
    talentTiers = tiers;
}

export function updateDataFilters(filters) {
    dataFilters = filters;
}

export function updateImportDataCache(data) {
    importDataCache = data;
}

export function updateCurrentPage(page) {
    currentPage = page;
}

export function updateItemsPerPage(items) {
    itemsPerPage = items;
    localStorage.setItem(ITEMS_PER_PAGE_KEY, items);
}

export function updateSortConfig(config) {
    sortConfig = config;
}

export function updateSortableInstance(instance) {
    sortableInstance = instance;
}

// --- 维度配置管理 ---
export function loadDimensions() {
    const savedConfig = JSON.parse(localStorage.getItem(DIMENSIONS_CONFIG_KEY));
    if (savedConfig) {
        const savedMap = new Map(savedConfig.map(d => [d.id, d]));
        const orderedDimensions = savedConfig.map(savedDim => {
            const presetDim = PRESET_DIMENSIONS.find(pd => pd.id === savedDim.id);
            return presetDim ? { ...presetDim, ...savedDim } : null;
        }).filter(Boolean);

        PRESET_DIMENSIONS.forEach(presetDim => {
            if (!savedMap.has(presetDim.id)) {
                orderedDimensions.push(presetDim);
            }
        });
        dimensions = orderedDimensions;
    } else {
        dimensions = PRESET_DIMENSIONS;
    }
}

export function saveDimensionsConfig() {
    const configToSave = dimensions.map(({ id, visible }) => ({ id, visible }));
    localStorage.setItem(DIMENSIONS_CONFIG_KEY, JSON.stringify(configToSave));
}

// --- 筛选器状态管理 ---
export function resetFiltersState() {
    dataFilters = [];
    currentPage = 1;
}

export function addDataFilter(filter) {
    dataFilters.push(filter);
}

export function removeDataFilter(index) {
    dataFilters.splice(index, 1);
}

export function updateDataFilter(index, filter) {
    if (dataFilters[index]) {
        dataFilters[index] = filter;
    }
}