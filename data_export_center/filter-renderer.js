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

    // 项目导出使用左右分栏布局 (5:5)
    if (entity === 'project') {
        const mainContainer = document.createElement('div');
        mainContainer.className = 'grid grid-cols-2 gap-6';

        // 左侧筛选条件区域 (50%)
        const leftPanel = document.createElement('div');
        leftPanel.className = 'space-y-4';

        // 右侧项目列表区域 (50%)
        const rightPanel = document.createElement('div');
        rightPanel.className = '';

        // 筛选器顺序：monthType, yearMonth, status (左侧), projectIds (右侧)
        config.filters.forEach(filter => {
            const filterElement = renderFilterInput(filter, entity);
            if (filter.id === 'projectIds') {
                rightPanel.appendChild(filterElement);
            } else {
                leftPanel.appendChild(filterElement);
            }
        });

        mainContainer.appendChild(leftPanel);
        mainContainer.appendChild(rightPanel);
        container.appendChild(mainContainer);
    } else {
        // 其他导出主体使用3列布局
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

        config.filters.forEach(filter => {
            const filterElement = renderFilterInput(filter, entity);
            gridContainer.appendChild(filterElement);
        });

        container.appendChild(gridContainer);
    }
}

/**
 * 渲染单个筛选器输入控件
 * @param {Object} filter - 筛选器配置对象
 * @param {string} entity - 实体类型（可选）
 * @returns {HTMLElement} 筛选器DOM元素
 */
export function renderFilterInput(filter, entity = null) {
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
    const inputElement = createFilterControl(filter, options, entity);
    filterWrapper.appendChild(inputElement);

    return filterWrapper;
}

/**
 * 创建筛选器控件
 * @param {Object} filter - 筛选器配置
 * @param {Array} options - 选项数据
 * @param {string} entity - 实体类型（可选）
 * @returns {HTMLElement} 控件元素
 */
function createFilterControl(filter, options, entity = null) {
    switch (filter.type) {
        case FILTER_TYPES.TEXT:
            return createTextInput(filter);

        case FILTER_TYPES.SELECT:
            return createSelectInput(filter, options);

        case FILTER_TYPES.MULTISELECT:
            return createMultiSelectInput(filter, options);

        case FILTER_TYPES.CHECKBOX:
            return createCheckboxGroup(filter, options, entity);

        case FILTER_TYPES.DATERANGE:
            return createDateRangeInput(filter);

        case FILTER_TYPES.RADIO:
            return createRadioGroup(filter);

        case FILTER_TYPES.YEARMONTH:
            return createYearMonthSelector(filter);

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
 * @param {string} entity - 实体类型（可选）
 * @returns {HTMLDivElement} 复选框组容器
 */
function createCheckboxGroup(filter, options, entity = null) {
    const container = document.createElement('div');

    // 合作状态使用横向平铺展示，项目列表使用高容器，其他使用默认滚动容器
    if (filter.id === 'status') {
        container.className = 'mt-2 flex flex-wrap gap-4';
    } else if (filter.id === 'projectIds') {
        container.className = 'mt-2 space-y-2 border p-3 rounded-md max-h-[500px] overflow-y-auto custom-scrollbar';
    } else {
        container.className = 'mt-2 space-y-2 border p-2 rounded-md max-h-32 overflow-y-auto custom-scrollbar';
    }
    container.id = `checkbox-group-${filter.id}`;

    // 存储完整的选项数据，用于筛选
    let allOptions = options;

    // 渲染复选框列表
    const renderCheckboxes = (optionsToRender) => {
        // 保存当前选中的项目ID
        const selectedValues = Array.from(
            container.querySelectorAll('.filter-checkbox:checked')
        ).map(cb => cb.value);

        container.innerHTML = '';

        if (optionsToRender.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-sm text-gray-500 text-center py-2';
            emptyMsg.textContent = '暂无匹配的项目';
            container.appendChild(emptyMsg);
            return;
        }

        optionsToRender.forEach(option => {
            const label = document.createElement('label');
            label.className = 'flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            // 支持对象类型的选项（如项目数据）
            const optionValue = typeof option === 'object' ? option.id : option;
            checkbox.value = optionValue;
            checkbox.className = 'form-checkbox filter-checkbox';
            checkbox.setAttribute('data-filter-id', filter.id);

            // 恢复之前的选中状态
            if (selectedValues.includes(optionValue)) {
                checkbox.checked = true;
            }

            const span = document.createElement('span');
            span.className = 'ml-2 text-sm';
            // 支持对象类型的选项（如项目数据）
            span.textContent = typeof option === 'object' ? option.name : option;

            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
        });
    };

    // 初始渲染
    renderCheckboxes(allOptions);

    // 如果是项目选择器，监听时间变化事件
    if (filter.id === 'projectIds' && entity === 'project') {
        // 输出第一个项目对象结构，帮助调试
        if (allOptions.length > 0) {
            console.log('[项目筛选] 第一个项目对象结构:', allOptions[0]);
            console.log('[项目筛选] 项目对象所有字段:', Object.keys(allOptions[0]));
        }

        const handleTimeFilter = (event) => {
            const { year, month } = event.detail;

            console.log('[项目筛选] 触发筛选事件:', { year, month });

            // 如果时间未选择完整，显示所有项目
            if (!year || !month) {
                console.log('[项目筛选] 时间未选择完整，显示所有项目');
                renderCheckboxes(allOptions);
                return;
            }

            // 获取项目的时间字段（根据时间维度类型）
            const monthTypeRadio = document.querySelector('input[name="filter-monthType"]:checked');
            const monthType = monthTypeRadio ? monthTypeRadio.value : 'customer';
            console.log('[项目筛选] 时间维度类型:', monthType);

            // 筛选符合时间条件的项目
            const filteredOptions = allOptions.filter((option, index) => {
                if (typeof option !== 'object') return true;

                // 输出前3个项目的详细信息
                if (index < 3) {
                    console.log(`[项目筛选] 项目 ${index + 1}:`, option);
                    console.log(`[项目筛选] 项目 ${index + 1} 字段:`, Object.keys(option));
                }

                // 根据时间维度类型组合年月字段
                // 客户月份：year + month
                // 财务月份：financialYear + financialMonth
                let projectYear, projectMonth;
                if (monthType === 'customer') {
                    projectYear = option.year;
                    projectMonth = option.month;
                } else {
                    projectYear = option.financialYear;
                    projectMonth = option.financialMonth;
                }

                // 如果项目没有对应的月份数据，不显示该项目
                if (!projectYear || !projectMonth) {
                    return false;
                }

                // 组合并匹配 "YYYY-MXX" 格式，例如 "2025-M10"
                const projectYearMonth = `${projectYear}-${projectMonth}`;
                const targetYearMonth = `${year}-${month}`;
                const matched = projectYearMonth === targetYearMonth;

                if (matched) {
                    console.log('[项目筛选] ✓ 匹配项目:', option.name, projectYearMonth, '=', targetYearMonth);
                }

                return matched;
            });

            console.log('[项目筛选] 筛选结果:', `${filteredOptions.length}/${allOptions.length} 个项目`);
            renderCheckboxes(filteredOptions);
        };

        document.addEventListener('yearmonth-changed', handleTimeFilter);
    }

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
 * 创建单选按钮组
 * @param {Object} filter - 筛选器配置
 * @returns {HTMLDivElement} 单选按钮组容器
 */
function createRadioGroup(filter) {
    const container = document.createElement('div');
    container.className = 'mt-2 flex items-center gap-4';

    const options = filter.options || [];
    options.forEach((option, index) => {
        const label = document.createElement('label');
        label.className = 'flex items-center cursor-pointer';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `filter-${filter.id}`;
        radio.value = typeof option === 'object' ? option.value : option;
        radio.className = 'form-radio';
        radio.id = `filter-${filter.id}-${index}`;

        // 设置默认选中
        if (filter.defaultValue === radio.value || (index === 0 && !filter.defaultValue)) {
            radio.checked = true;
        }

        const span = document.createElement('span');
        span.className = 'ml-2 text-sm';
        span.textContent = typeof option === 'object' ? option.label : option;

        label.appendChild(radio);
        label.appendChild(span);
        container.appendChild(label);
    });

    return container;
}

/**
 * 创建年月选择器
 * @param {Object} filter - 筛选器配置
 * @returns {HTMLDivElement} 年月选择器容器
 */
function createYearMonthSelector(filter) {
    const container = document.createElement('div');
    container.className = 'mt-1 flex items-center gap-2';

    // 年份下拉框
    const yearSelect = document.createElement('select');
    yearSelect.id = `filter-${filter.id}-year`;
    yearSelect.className = 'form-select';

    // 默认选项
    const defaultYearOption = document.createElement('option');
    defaultYearOption.value = '';
    defaultYearOption.textContent = '选择年份';
    yearSelect.appendChild(defaultYearOption);

    // 生成年份选项（前3年到未来1年）
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 3; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }

    // 月份下拉框
    const monthSelect = document.createElement('select');
    monthSelect.id = `filter-${filter.id}-month`;
    monthSelect.className = 'form-select';

    // 默认选项
    const defaultMonthOption = document.createElement('option');
    defaultMonthOption.value = '';
    defaultMonthOption.textContent = '选择月份';
    monthSelect.appendChild(defaultMonthOption);

    // 生成月份选项（M01-M12格式）
    const currentMonth = new Date().getMonth() + 1;
    for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        const monthStr = `M${month.toString().padStart(2, '0')}`;
        option.value = monthStr;
        option.textContent = monthStr;
        if (month === currentMonth) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    }

    container.appendChild(yearSelect);
    container.appendChild(monthSelect);

    // 添加"筛选"按钮
    const filterButton = document.createElement('button');
    filterButton.type = 'button';
    filterButton.className = 'px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap min-w-[80px]';
    filterButton.textContent = '筛选';
    filterButton.id = 'filter-projects-btn';

    filterButton.addEventListener('click', () => {
        // 触发自定义事件，通知项目筛选器更新
        const event = new CustomEvent('yearmonth-changed', {
            detail: {
                year: yearSelect.value,
                month: monthSelect.value
            }
        });
        document.dispatchEvent(event);
    });

    container.appendChild(filterButton);

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

            case FILTER_TYPES.RADIO:
                const selectedRadio = document.querySelector(`input[name="filter-${filter.id}"]:checked`);
                if (selectedRadio) {
                    filters[filter.id] = selectedRadio.value;
                }
                break;

            case FILTER_TYPES.YEARMONTH:
                const yearSelect = document.getElementById(`filter-${filter.id}-year`);
                const monthSelect = document.getElementById(`filter-${filter.id}-month`);
                if (yearSelect && monthSelect) {
                    const year = yearSelect.value;
                    const month = monthSelect.value;
                    // 只有当年份和月份都选择了才添加到筛选条件
                    if (year && month) {
                        filters[filter.id] = {
                            year: year,
                            month: month
                        };
                    }
                }
                break;
        }
    });

    return filters;
}