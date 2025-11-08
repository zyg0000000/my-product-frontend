/**
 * filter-panel.js - 筛选面板模块
 * 处理所有筛选相关功能，包括筛选器渲染、筛选条件构建等
 */

import {
    dimensions,
    talentTypes,
    talentTiers,
    dataFilters,
    currentPage,
    itemsPerPage,
    sortConfig,
    updateDataFilters,
    resetFiltersState,
    updateCurrentPage
} from './state-manager.js';
import { showCustomAlert } from './utils.js';

/**
 * 渲染筛选复选框
 */
export function renderFilterCheckboxes() {
    const talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');
    const talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');

    // 渲染达人类型筛选器
    talentTypeFiltersContainer.innerHTML = talentTypes.map(type => `
        <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" value="${type}" class="talent-type-checkbox rounded text-blue-600">
            <span class="text-sm text-gray-700">${type}</span>
        </label>
    `).join('');

    // 渲染达人层级筛选器
    talentTierFiltersContainer.innerHTML = talentTiers.map(tier => `
        <label class="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" value="${tier}" class="talent-tier-checkbox rounded text-blue-600">
            <span class="text-sm text-gray-700">${tier}</span>
        </label>
    `).join('');

    renderDataFilterRows();
}

/**
 * 渲染数据筛选行
 */
export function renderDataFilterRows() {
    const dataFiltersContainer = document.getElementById('data-filters-container');
    dataFiltersContainer.innerHTML = '';

    const excludedIds = ['talentTier', 'talentType', 'lastUpdated', 'nickname', 'xingtuId', 'uid'];

    dataFilters.forEach((filter, index) => {
        const filterRow = document.createElement('div');
        filterRow.className = 'grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 bg-white rounded-md border';

        // 维度选项
        const dimensionOptions = dimensions
            .filter(d => !excludedIds.includes(d.id))
            .map(d => `<option value="${d.id}" ${d.id === filter.dimension ? 'selected' : ''}>${d.name}</option>`)
            .join('');

        // 操作符选项
        const selectedDim = dimensions.find(d => d.id === filter.dimension) || {};
        let operatorOptions = '';

        if (selectedDim.type === 'number' || selectedDim.type === 'percentage') {
            operatorOptions = `
                <option value=">">&gt;</option>
                <option value=">=">&ge;</option>
                <option value="<">&lt;</option>
                <option value="<=">&le;</option>
                <option value="=">=</option>
                <option value="!=">&ne;</option>
                <option value="between">介于</option>
                <option value="isEmpty">为空</option>
                <option value="isNotEmpty">不为空</option>
            `;
        } else {
            operatorOptions = `
                <option value="=">等于</option>
                <option value="!=">不等于</option>
                <option value="contains">包含</option>
                <option value="notContains">不包含</option>
                <option value="isEmpty">为空</option>
                <option value="isNotEmpty">不为空</option>
            `;
        }

        // 值输入框
        const baseInputClasses = "block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 transition";
        let valueInputHtml = '';

        if (filter.operator === 'between') {
            valueInputHtml = `
                <div class="flex items-center gap-2">
                    <input type="number" class="${baseInputClasses} filter-value-min" data-index="${index}"
                        value="${(filter.value || [])[0] ?? ''}">
                    <span class="text-gray-500">-</span>
                    <input type="number" class="${baseInputClasses} filter-value-max" data-index="${index}"
                        value="${(filter.value || [])[1] ?? ''}">
                </div>
            `;
        } else if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
            valueInputHtml = `<input type="text" class="${baseInputClasses} filter-value" data-index="${index}" value="" disabled>`;
        } else {
            valueInputHtml = `<input type="text" class="${baseInputClasses} filter-value" data-index="${index}" value="${filter.value ?? ''}">`;
        }

        filterRow.innerHTML = `
            <select class="${baseInputClasses} md:col-span-4 filter-dimension" data-index="${index}">
                ${dimensionOptions}
            </select>
            <select class="${baseInputClasses} md:col-span-3 filter-operator" data-index="${index}">
                ${operatorOptions}
            </select>
            <div class="md:col-span-4">
                ${valueInputHtml}
            </div>
            <button class="remove-filter-btn text-red-500 hover:bg-red-100 p-2 rounded-lg flex justify-center items-center md:col-span-1"
                data-index="${index}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                    </path>
                </svg>
            </button>
        `;

        dataFiltersContainer.appendChild(filterRow);

        // 设置操作符选中值
        filterRow.querySelector('.filter-operator').value = filter.operator;
    });
}

/**
 * 构建搜索载荷
 * @returns {Object} 搜索参数对象
 */
export function buildSearchPayload() {
    const directSearchNickname = document.getElementById('direct-search-nickname');
    const directSearchXingtuId = document.getElementById('direct-search-xingtu-id');
    const directSearchUid = document.getElementById('direct-search-uid');
    const talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');
    const talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');

    const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);

    const validDataFilters = dataFilters.filter(f =>
        f.dimension &&
        (f.operator === 'isEmpty' || f.operator === 'isNotEmpty' ||
            (f.value !== '' && f.value !== undefined && f.value !== null))
    );

    const filters = validDataFilters.map(f => ({
        ...f,
        dimension: topLevelFields.has(f.dimension) ? f.dimension : `performanceData.${f.dimension}`
    }));

    return {
        page: currentPage,
        pageSize: itemsPerPage,
        search: directSearchNickname.value.trim() || directSearchXingtuId.value.trim() || directSearchUid.value.trim(),
        tiers: Array.from(talentTierFiltersContainer.querySelectorAll('input:checked')).map(cb => cb.value),
        types: Array.from(talentTypeFiltersContainer.querySelectorAll('input:checked')).map(cb => cb.value),
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        filterLogic: document.querySelector('input[name="filter-logic"]:checked').value,
        filters: filters
    };
}

/**
 * 处理数据筛选器变化
 * @param {Event} e - 事件对象
 */
export function handleDataFilterChange(e) {
    const target = e.target;
    const index = target.dataset.index;
    if (!index || !dataFilters[index]) return;

    const filter = dataFilters[index];

    if (target.classList.contains('filter-dimension')) {
        filter.dimension = target.value;
        filter.operator = '>';
        filter.value = '';
    } else if (target.classList.contains('filter-operator')) {
        filter.operator = target.value;
    } else if (target.classList.contains('filter-value')) {
        filter.value = target.value;
    } else if (target.classList.contains('filter-value-min') || target.classList.contains('filter-value-max')) {
        const min = target.parentElement.querySelector('.filter-value-min').value;
        const max = target.parentElement.querySelector('.filter-value-max').value;
        filter.value = [min, max];
    }

    renderDataFilterRows();
}

/**
 * 添加数据筛选行
 */
export function addDataFilterRow() {
    const excludedIds = ['talentTier', 'talentType', 'lastUpdated', 'nickname', 'xingtuId', 'uid'];
    const defaultDim = dimensions.find(d => !excludedIds.includes(d.id));

    if (defaultDim) {
        dataFilters.push({
            dimension: defaultDim.id,
            operator: '>',
            value: ''
        });
        renderDataFilterRows();
    } else {
        showCustomAlert('没有可供筛选的数据维度。');
    }
}

/**
 * 重置所有筛选器
 * @param {Function} fetchCallback - 获取数据的回调函数
 */
export function resetAllFilters(fetchCallback) {
    const directSearchNickname = document.getElementById('direct-search-nickname');
    const directSearchXingtuId = document.getElementById('direct-search-xingtu-id');
    const directSearchUid = document.getElementById('direct-search-uid');
    const talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');
    const talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');

    directSearchNickname.value = '';
    directSearchXingtuId.value = '';
    directSearchUid.value = '';

    if (talentTypeFiltersContainer) {
        talentTypeFiltersContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
    }
    if (talentTierFiltersContainer) {
        talentTierFiltersContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
    }

    resetFiltersState();
    renderDataFilterRows();
    fetchCallback();
}