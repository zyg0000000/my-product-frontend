/**
 * modal-dimensions.js - 维度管理模态框模块
 * 管理维度选择、排序和保存功能
 */

import {
    dimensions,
    sortableInstance,
    updateDimensions,
    updateSortableInstance,
    saveDimensionsConfig
} from './state-manager.js';
import { renderTable } from './table-renderer.js';

/**
 * 渲染维度管理模态框
 */
export function renderDimensionsModal() {
    const dimensionsModal = document.getElementById('dimensions-modal');
    const availablePool = document.getElementById('available-dimensions-pool');
    const selectedList = document.getElementById('selected-dimensions-list');
    const selectedPlaceholder = document.getElementById('selected-placeholder');

    availablePool.innerHTML = '';
    selectedList.innerHTML = '';

    const selectedDimensions = dimensions.filter(d => d.visible);
    const availableDimensions = dimensions.filter(d => !d.visible);

    // 渲染可用维度池
    renderAvailablePool(availablePool, availableDimensions);

    // 渲染已选择维度列表
    renderSelectedList(selectedList, selectedPlaceholder, selectedDimensions);

    // 初始化拖拽排序
    initializeSortable(selectedList);

    dimensionsModal.classList.remove('hidden');
}

/**
 * 渲染可用维度池
 * @param {HTMLElement} container - 容器元素
 * @param {Array} availableDimensions - 可用维度数组
 */
function renderAvailablePool(container, availableDimensions) {
    // 按类别分组
    const groupedAvailable = availableDimensions.reduce((acc, dim) => {
        const category = dim.category || '其他';
        if (!acc[category]) acc[category] = [];
        acc[category].push(dim);
        return acc;
    }, {});

    // 渲染每个类别
    for (const category in groupedAvailable) {
        const details = document.createElement('details');
        details.className = 'dimension-group border-b last:border-b-0';
        details.open = true;

        const summary = document.createElement('summary');
        summary.className = 'font-semibold text-gray-800 cursor-pointer p-2 hover:bg-gray-100 list-none flex justify-between items-center text-sm';
        summary.innerHTML = `
            <span>${category}</span>
            <svg class="w-4 h-4 transform transition-transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        `;

        const content = document.createElement('div');
        content.className = 'p-2 grid grid-cols-1 gap-2';

        groupedAvailable[category].forEach(d => {
            content.innerHTML += `
                <div class="p-2 rounded-md bg-white border cursor-pointer hover:bg-blue-50 hover:border-blue-300 add-dim-btn text-sm"
                    data-id="${d.id}">
                    ${d.name}
                </div>
            `;
        });

        details.appendChild(summary);
        details.appendChild(content);
        container.appendChild(details);
    }
}

/**
 * 渲染已选择维度列表
 * @param {HTMLElement} container - 容器元素
 * @param {HTMLElement} placeholder - 占位符元素
 * @param {Array} selectedDimensions - 已选择维度数组
 */
function renderSelectedList(container, placeholder, selectedDimensions) {
    if (selectedDimensions.length > 0) {
        if (placeholder) placeholder.classList.add('hidden');

        selectedDimensions.forEach(d => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2 rounded-md bg-white border dimension-item';
            item.dataset.id = d.id;

            item.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400 drag-handle"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span class="text-sm">${d.name}</span>
                </div>
                ${d.required ? '' : `<button class="remove-dim-btn text-red-500 text-xl font-light leading-none" data-id="${d.id}">&times;</button>`}
            `;

            container.appendChild(item);
        });
    } else {
        if (placeholder) {
            container.appendChild(placeholder);
            placeholder.classList.remove('hidden');
        }
    }
}

/**
 * 初始化拖拽排序
 * @param {HTMLElement} container - 容器元素
 */
function initializeSortable(container) {
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    const instance = new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
    });

    updateSortableInstance(instance);
}

/**
 * 处理保存维度设置
 * @param {Array} displayedTalents - 显示的达人数据
 */
export function handleSaveDimensions(displayedTalents) {
    const dimensionsModal = document.getElementById('dimensions-modal');
    const newOrderedIds = [...document.querySelectorAll('#selected-dimensions-list .dimension-item')]
        .map(el => el.dataset.id);

    const newDimensions = [];
    const addedIds = new Set();

    // 添加已选择的项目（按新顺序）
    newOrderedIds.forEach(id => {
        const dim = dimensions.find(d => d.id === id);
        if (dim) {
            newDimensions.push({ ...dim, visible: true });
            addedIds.add(id);
        }
    });

    // 添加未选择的项目（保持相对顺序）
    dimensions.forEach(dim => {
        if (!addedIds.has(dim.id)) {
            newDimensions.push({ ...dim, visible: false });
        }
    });

    updateDimensions(newDimensions);
    saveDimensionsConfig();
    renderTable(displayedTalents);
    dimensionsModal.classList.add('hidden');
}

/**
 * 处理维度添加
 * @param {string} dimensionId - 维度 ID
 */
export function handleAddDimension(dimensionId) {
    const dim = dimensions.find(d => d.id === dimensionId);
    if (dim) {
        dim.visible = true;
        renderDimensionsModal();
    }
}

/**
 * 处理维度移除
 * @param {string} dimensionId - 维度 ID
 */
export function handleRemoveDimension(dimensionId) {
    const dim = dimensions.find(d => d.id === dimensionId);
    if (dim && !dim.required) {
        dim.visible = false;
        renderDimensionsModal();
    }
}