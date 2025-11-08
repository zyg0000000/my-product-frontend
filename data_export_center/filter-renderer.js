/**
 * @module filter-renderer
 * @description 筛选器渲染模块，负责动态生成和管理筛选条件UI
 */

import { FILTER_TYPES } from './constants.js';
import { getEntityConfig } from './dimension-config.js';
import { getInitialConfigs, getSelectedEntity } from './state-manager.js';

/**
 * 渲染指定实体的筛选条件
 * @param {string} entity - 实体类型 (talent/collaboration/project)
 * @param {HTMLElement} container - 筛选器容器元素
 */
export function renderFilters(entity, container) {
    if (!container) {
        console.error('Filter container element not provided');
        return;
    }

    // 清空容器
    container.innerHTML = '';

    // 获取实体配置
    const config = getEntityConfig(entity);
    if (!config || !config.filters || config.filters.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center">此导出主体暂无可用筛选条件。</p>';
        return;
    }

    // 创建筛选器网格容器
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    // 渲染每个筛选器
    config.filters.forEach(filter => {
        const filterElement = renderFilterInput(filter);
        gridContainer.appendChild(filterElement);
    });

    container.appendChild(gridContainer);
}

/**
 * 渲染单个筛选器输入控件
 * @param {Object} filter - 筛选器配置对象
 * @returns {HTMLElement} 筛选器DOM元素
 */
export function renderFilterInput(filter) {
    const filterWrapper = document.createElement('div');

    // 创建标签
    const label = document.createElement('label');
    label.setAttribute('for', `filter-${filter.id}`);
    label.className = 'block text-sm font-medium text-gray-700';
    label.textContent = filter.label;
    filterWrapper.appendChild(label);

    // 获取选项数据
    const options = getFilterOptions(filter);

    // 根据类型创建输入控件
    const inputElement = createFilterControl(filter, options);
    filterWrapper.appendChild(inputElement);

    return filterWrapper;
}

/**
 * 创建筛选器控件
 * @param {Object} filter - 筛选器配置
 * @param {Array} options - 选项数据
 * @returns {HTMLElement} 控件元素
 */
function createFilterControl(filter, options) {
    switch (filter.type) {
        case FILTER_TYPES.TEXT:
            return createTextInput(filter);

        case FILTER_TYPES.SELECT:
            return createSelectInput(filter, options);

        case FILTER_TYPES.MULTISELECT:
            return createMultiSelectInput(filter, options);

        case FILTER_TYPES.CHECKBOX:
            return createCheckboxGroup(filter, options);

        case FILTER_TYPES.DATERANGE:
            return createDateRangeInput(filter);

        default:
            console.warn(`Unknown filter type: ${filter.type}`);
            return document.createElement('div');
    }
}

/**
 * 创建文本输入框
 * @param {Object} filter - 筛选器配置
 * @returns {HTMLInputElement} 输入元素
 */
function createTextInput(filter) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `filter-${filter.id}`;
    input.className = 'form-input';
    input.placeholder = filter.placeholder || '';
    return input;
}

/**
 * 创建单选下拉框
 * @param {Object} filter - 筛选器配置
 * @param {Array} options - 选项数据
 * @returns {HTMLSelectElement} 下拉框元素
 */
function createSelectInput(filter, options) {
    const select = document.createElement('select');
    select.id = `filter-${filter.id}`;
    select.className = 'form-select';

    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '所有';
    select.appendChild(defaultOption);

    // 添加其他选项
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });

    return select;
}

/**
 * 创建多选下拉框
 * @param {Object} filter - 筛选器配置
 * @param {Array} options - 选项数据
 * @returns {HTMLSelectElement} 多选下拉框元素
 */
function createMultiSelectInput(filter, options) {
    const select = document.createElement('select');
    select.id = `filter-${filter.id}`;
    select.className = 'form-select';
    select.multiple = true;
    select.size = 4;

    // 添加选项 (假设options是对象数组，有id和name属性)
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = typeof option === 'object' ? option.id : option;
        optionElement.textContent = typeof option === 'object' ? option.name : option;
        select.appendChild(optionElement);
    });

    return select;
}

/**
 * 创建复选框组
 * @param {Object} filter - 筛选器配置
 * @param {Array} options - 选项数据
 * @returns {HTMLDivElement} 复选框组容器
 */
function createCheckboxGroup(filter, options) {
    const container = document.createElement('div');
    container.className = 'mt-2 space-y-2 border p-2 rounded-md max-h-32 overflow-y-auto custom-scrollbar';

    options.forEach(option => {
        const label = document.createElement('label');
        label.className = 'flex items-center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.className = 'form-checkbox filter-checkbox';
        checkbox.setAttribute('data-filter-id', filter.id);

        const span = document.createElement('span');
        span.className = 'ml-2 text-sm';
        span.textContent = option;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });

    return container;
}

/**
 * 创建日期范围选择器
 * @param {Object} filter - 筛选器配置
 * @returns {HTMLDivElement} 日期范围容器
 */
function createDateRangeInput(filter) {
    const container = document.createElement('div');
    container.className = 'mt-1 flex items-center gap-2';

    const startDate = document.createElement('input');
    startDate.type = 'date';
    startDate.id = `filter-${filter.id}-start`;
    startDate.className = 'form-input';

    const separator = document.createElement('span');
    separator.className = 'text-gray-500';
    separator.textContent = '-';

    const endDate = document.createElement('input');
    endDate.type = 'date';
    endDate.id = `filter-${filter.id}-end`;
    endDate.className = 'form-input';

    container.appendChild(startDate);
    container.appendChild(separator);
    container.appendChild(endDate);

    return container;
}

/**
 * 获取筛选器的选项数据
 * @param {Object} filter - 筛选器配置
 * @returns {Array} 选项数组
 */
function getFilterOptions(filter) {
    // 如果筛选器配置中直接提供了选项
    if (filter.options) {
        return filter.options;
    }

    // 如果需要从初始配置中获取选项
    if (filter.optionsKey) {
        const initialConfigs = getInitialConfigs();
        return initialConfigs[filter.optionsKey] || [];
    }

    return [];
}

/**
 * 填充筛选器选项（用于动态更新选项）
 * @param {string} filterId - 筛选器ID
 * @param {Array} options - 新的选项数据
 */
export function populateFilterOptions(filterId, options) {
    const element = document.getElementById(`filter-${filterId}`);
    if (!element) {
        console.warn(`Filter element not found: filter-${filterId}`);
        return;
    }

    // 如果是select元素
    if (element.tagName === 'SELECT') {
        // 保留第一个默认选项（如果有）
        const hasDefault = element.options.length > 0 && element.options[0].value === '';
        element.innerHTML = '';

        if (hasDefault) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '所有';
            element.appendChild(defaultOption);
        }

        // 添加新选项
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = typeof option === 'object' ? option.id : option;
            optionElement.textContent = typeof option === 'object' ? option.name : option;
            element.appendChild(optionElement);
        });
    }
}

/**
 * 获取当前筛选器的值
 * @param {string} entity - 实体类型
 * @returns {Object} 筛选器值对象
 */
export function getFilterValues(entity) {
    const config = getEntityConfig(entity);
    if (!config || !config.filters) {
        return {};
    }

    const filters = {};

    config.filters.forEach(filter => {
        switch (filter.type) {
            case FILTER_TYPES.TEXT:
                const textInput = document.getElementById(`filter-${filter.id}`);
                if (textInput) {
                    const value = textInput.value.trim();
                    if (value) filters[filter.id] = value;
                }
                break;

            case FILTER_TYPES.SELECT:
                const selectInput = document.getElementById(`filter-${filter.id}`);
                if (selectInput && selectInput.value) {
                    filters[filter.id] = selectInput.value;
                }
                break;

            case FILTER_TYPES.MULTISELECT:
                const multiSelect = document.getElementById(`filter-${filter.id}`);
                if (multiSelect) {
                    const selectedValues = Array.from(multiSelect.selectedOptions).map(opt => opt.value);
                    if (selectedValues.length > 0) {
                        filters[filter.id] = selectedValues;
                    }
                }
                break;

            case FILTER_TYPES.CHECKBOX:
                const checkedBoxes = document.querySelectorAll(`.filter-checkbox[data-filter-id="${filter.id}"]:checked`);
                if (checkedBoxes.length > 0) {
                    filters[filter.id] = Array.from(checkedBoxes).map(cb => cb.value);
                }
                break;

            case FILTER_TYPES.DATERANGE:
                const startDate = document.getElementById(`filter-${filter.id}-start`);
                const endDate = document.getElementById(`filter-${filter.id}-end`);
                if (startDate && endDate && (startDate.value || endDate.value)) {
                    filters[filter.id] = {
                        start: startDate.value,
                        end: endDate.value
                    };
                }
                break;
        }
    });

    return filters;
}