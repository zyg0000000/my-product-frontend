/**
 * @module dimension-renderer
 * @description 维度渲染模块，负责动态生成和管理可导出维度的UI
 */

import { getEntityDimensions } from './dimension-config.js';
import { toggleDimension, getSelectedDimensionIds } from './state-manager.js';

/**
 * 渲染指定实体的可导出维度
 * @param {string} entity - 实体类型 (talent/collaboration/project)
 * @param {HTMLElement} container - 维度容器元素
 */
export function renderDimensions(entity, container) {
    if (!container) {
        console.error('Dimensions container element not provided');
        return;
    }

    // 清空容器
    container.innerHTML = '';

    // 获取维度配置
    const dimensionGroups = getEntityDimensions(entity);
    if (!dimensionGroups || Object.keys(dimensionGroups).length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center col-span-full">无可用维度。</p>';
        return;
    }

    // 渲染维度组
    renderDimensionGroups(dimensionGroups, container);

    // 绑定维度选择事件
    setupDimensionEventListeners(container);
}

/**
 * 渲染维度组
 * @param {Object} dimensionGroups - 维度组配置对象
 * @param {HTMLElement} container - 容器元素
 */
export function renderDimensionGroups(dimensionGroups, container) {
    Object.entries(dimensionGroups).forEach(([groupName, dimensions]) => {
        const groupElement = createDimensionGroup(groupName, dimensions);
        container.appendChild(groupElement);
    });
}

/**
 * 创建单个维度组元素
 * @param {string} groupName - 组名称
 * @param {Array} dimensions - 维度数组
 * @returns {HTMLElement} 维度组元素
 */
function createDimensionGroup(groupName, dimensions) {
    const details = document.createElement('details');
    details.className = 'dimension-group';
    details.open = true; // 默认展开

    // 创建摘要标题
    const summary = createGroupSummary(groupName);
    details.appendChild(summary);

    // 创建维度选项容器
    const optionsContainer = createDimensionOptions(dimensions);
    details.appendChild(optionsContainer);

    return details;
}

/**
 * 创建维度组摘要标题
 * @param {string} groupName - 组名称
 * @returns {HTMLElement} 摘要元素
 */
function createGroupSummary(groupName) {
    const summary = document.createElement('summary');
    summary.className = 'flex justify-between items-center cursor-pointer p-3 bg-gray-50 hover:bg-gray-100 font-medium text-sm text-gray-700';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = groupName;

    const arrowIcon = createArrowIcon();

    summary.appendChild(titleSpan);
    summary.appendChild(arrowIcon);

    return summary;
}

/**
 * 创建箭头图标
 * @returns {SVGElement} SVG箭头图标
 */
function createArrowIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'w-4 h-4 arrow-icon');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('viewBox', '0 0 24 24');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M9 5l7 7-7 7');

    svg.appendChild(path);
    return svg;
}

/**
 * 创建维度选项容器
 * @param {Array} dimensions - 维度配置数组
 * @returns {HTMLElement} 选项容器元素
 */
function createDimensionOptions(dimensions) {
    const container = document.createElement('div');
    container.className = 'dimension-options p-4 grid grid-cols-1 md:grid-cols-2 gap-3';

    dimensions.forEach(dimension => {
        const optionElement = createDimensionOption(dimension);
        container.appendChild(optionElement);
    });

    return container;
}

/**
 * 创建单个维度选项
 * @param {Object} dimension - 维度配置对象
 * @returns {HTMLElement} 维度选项元素
 */
function createDimensionOption(dimension) {
    const label = document.createElement('label');
    label.className = 'flex items-center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = dimension.id;
    checkbox.className = 'form-checkbox dimension-checkbox';
    checkbox.setAttribute('data-dimension-id', dimension.id);

    // 检查是否已选中
    const selectedIds = getSelectedDimensionIds();
    if (selectedIds.includes(dimension.id)) {
        checkbox.checked = true;
    }

    const span = document.createElement('span');
    span.className = 'ml-2 text-sm text-gray-600';
    span.textContent = dimension.label;

    label.appendChild(checkbox);
    label.appendChild(span);

    return label;
}

/**
 * 设置维度选择事件监听器
 * @param {HTMLElement} container - 容器元素
 */
function setupDimensionEventListeners(container) {
    container.addEventListener('change', handleDimensionSelection);
}

/**
 * 处理维度选择事件
 * @param {Event} event - 变更事件对象
 */
export function handleDimensionSelection(event) {
    if (!event.target.classList.contains('dimension-checkbox')) {
        return;
    }

    const dimensionId = event.target.value;
    const isChecked = event.target.checked;

    // 更新状态管理器中的选中维度
    toggleDimension(dimensionId, isChecked);

    // 可以在此添加其他逻辑，如更新选中计数显示等
    updateSelectedCount();
}

/**
 * 更新选中维度计数（可选功能）
 */
function updateSelectedCount() {
    const selectedIds = getSelectedDimensionIds();
    const count = selectedIds.length;

    // 可以在页面上显示选中的维度数量
    const countElement = document.getElementById('selected-dimensions-count');
    if (countElement) {
        countElement.textContent = `已选择 ${count} 个维度`;
    }
}

/**
 * 获取所有选中的维度ID
 * @returns {string[]} 选中的维度ID数组
 */
export function getSelectedDimensions() {
    const checkboxes = document.querySelectorAll('.dimension-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * 全选指定组的维度
 * @param {string} groupName - 组名称
 */
export function selectAllInGroup(groupName) {
    const groups = document.querySelectorAll('.dimension-group');
    groups.forEach(group => {
        const summary = group.querySelector('summary span');
        if (summary && summary.textContent === groupName) {
            const checkboxes = group.querySelectorAll('.dimension-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = true;
                toggleDimension(cb.value, true);
            });
        }
    });
}

/**
 * 取消选择指定组的维度
 * @param {string} groupName - 组名称
 */
export function deselectAllInGroup(groupName) {
    const groups = document.querySelectorAll('.dimension-group');
    groups.forEach(group => {
        const summary = group.querySelector('summary span');
        if (summary && summary.textContent === groupName) {
            const checkboxes = group.querySelectorAll('.dimension-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = false;
                toggleDimension(cb.value, false);
            });
        }
    });
}

/**
 * 全选所有维度
 */
export function selectAllDimensions() {
    const checkboxes = document.querySelectorAll('.dimension-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = true;
        toggleDimension(cb.value, true);
    });
    updateSelectedCount();
}

/**
 * 取消选择所有维度
 */
export function deselectAllDimensions() {
    const checkboxes = document.querySelectorAll('.dimension-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        toggleDimension(cb.value, false);
    });
    updateSelectedCount();
}

/**
 * 恢复维度选择状态（用于页面刷新或实体切换后）
 * @param {string[]} selectedIds - 需要选中的维度ID数组
 */
export function restoreDimensionSelection(selectedIds) {
    const checkboxes = document.querySelectorAll('.dimension-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(cb.value);
    });
}