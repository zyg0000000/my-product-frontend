/**
 * @module modal-dimensions
 * @description 维度管理模态框模块，管理维度选择和顺序调整
 * @version 2.2.0 - 支持分组折叠功能，优化大量字段展示
 */

import { getEntityDimensionsSmart } from './dimension-config.js';
import { getState, updateSelectedDimensions } from './state-manager.js';

/**
 * 打开维度管理模态框
 */
export function openDimensionsModal() {
    const modal = document.getElementById('dimensions-modal');
    if (!modal) return;

    renderDimensionsModal();
    modal.classList.remove('hidden');
}

/**
 * 关闭维度管理模态框
 */
export function closeDimensionsModal() {
    const modal = document.getElementById('dimensions-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 渲染维度管理模态框内容
 */
export function renderDimensionsModal() {
    const state = getState();
    const { selectedEntity } = state;

    // 获取当前实体的所有维度（智能选择动态或静态配置）
    const allDimensionGroups = getEntityDimensionsSmart(selectedEntity);
    if (!allDimensionGroups) {
        console.warn('No dimensions available for entity:', selectedEntity);
        return;
    }

    // 将分组维度转换为平面数组
    const allDimensions = [];
    Object.entries(allDimensionGroups).forEach(([groupName, dimensions]) => {
        dimensions.forEach(dim => {
            allDimensions.push({
                ...dim,
                group: groupName
            });
        });
    });

    // 获取已选维度ID列表
    const selectedDimensionIds = state.selectedDimensions[selectedEntity] || [];

    // 分离已选和未选维度
    const selectedDimensions = allDimensions.filter(d => selectedDimensionIds.includes(d.id));
    const availableDimensions = allDimensions.filter(d => !selectedDimensionIds.includes(d.id));

    // 渲染两个面板
    renderAvailablePool(availableDimensions);
    renderSelectedList(selectedDimensions);

    // 更新计数
    updateCounts(availableDimensions.length, selectedDimensions.length);
}

/**
 * 渲染可选维度池（左侧面板）
 * @param {Array} dimensions - 可选维度数组
 */
function renderAvailablePool(dimensions) {
    const container = document.getElementById('available-dimensions-pool');
    if (!container) return;

    container.innerHTML = '';

    if (dimensions.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">所有维度已选择</p>';
        return;
    }

    // 按组分类
    const grouped = {};
    dimensions.forEach(dim => {
        const group = dim.group || '其他';
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(dim);
    });

    // 渲染每个组
    let isFirstGroup = true;
    Object.entries(grouped).forEach(([groupName, dims]) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'mb-3 border border-gray-200 rounded-lg bg-gray-50';

        // 组标题（可折叠）
        const groupTitle = document.createElement('div');
        groupTitle.className = 'text-xs font-semibold text-gray-700 px-3 py-2.5 bg-white rounded-t-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors select-none';
        const isExpanded = isFirstGroup; // 默认第一个分组展开

        groupTitle.innerHTML = `
            <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 chevron-icon ${isExpanded ? '' : '-rotate-90'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            <span>${groupName}</span>
            <span class="ml-auto text-xs text-gray-400 font-normal">${dims.length}个</span>
        `;

        // 维度项容器
        const itemsContainer = document.createElement('div');
        itemsContainer.className = `space-y-1.5 p-2 transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`;

        dims.forEach(dim => {
            const item = document.createElement('div');
            item.className = 'dimension-available-item p-2.5 rounded-lg bg-white border border-gray-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all text-sm flex items-center justify-between group';
            item.dataset.id = dim.id;

            item.innerHTML = `
                <span class="text-gray-700 group-hover:text-indigo-700 font-medium">${dim.label}</span>
                <svg class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
            `;

            item.addEventListener('click', () => handleAddDimension(dim.id));
            itemsContainer.appendChild(item);
        });

        // 点击标题切换展开/折叠
        groupTitle.addEventListener('click', () => {
            const chevron = groupTitle.querySelector('.chevron-icon');
            const isCurrentlyExpanded = !itemsContainer.classList.contains('max-h-0');

            if (isCurrentlyExpanded) {
                // 折叠
                itemsContainer.classList.remove('max-h-[2000px]', 'opacity-100');
                itemsContainer.classList.add('max-h-0', 'opacity-0');
                chevron.classList.add('-rotate-90');
            } else {
                // 展开
                itemsContainer.classList.remove('max-h-0', 'opacity-0');
                itemsContainer.classList.add('max-h-[2000px]', 'opacity-100');
                chevron.classList.remove('-rotate-90');
            }
        });

        groupEl.appendChild(groupTitle);
        groupEl.appendChild(itemsContainer);
        container.appendChild(groupEl);

        isFirstGroup = false;
    });
}

/**
 * 渲染已选维度列表（右侧面板）
 * @param {Array} dimensions - 已选维度数组
 */
function renderSelectedList(dimensions) {
    const container = document.getElementById('selected-dimensions-list');
    const placeholder = document.getElementById('selected-placeholder');

    if (!container) return;

    // 清空容器（保留placeholder）
    Array.from(container.children).forEach(child => {
        if (child.id !== 'selected-placeholder') {
            child.remove();
        }
    });

    if (dimensions.length === 0) {
        if (placeholder) placeholder.classList.remove('hidden');
        return;
    }

    if (placeholder) placeholder.classList.add('hidden');

    dimensions.forEach((dim, index) => {
        const item = document.createElement('div');
        item.className = 'dimension-selected-item flex items-center justify-between p-3 rounded-lg bg-white border-2 border-indigo-200 mb-2 group hover:shadow-sm transition-all';
        item.dataset.id = dim.id;
        item.dataset.index = index;

        item.innerHTML = `
            <div class="flex items-center gap-3 flex-1">
                <div class="flex flex-col gap-0.5">
                    <button class="move-up-btn text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" ${index === 0 ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                    </button>
                    <button class="move-down-btn text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" ${index === dimensions.length - 1 ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800">${dim.label}</div>
                    <div class="text-xs text-gray-500">${dim.group || '其他'}</div>
                </div>
            </div>
            <button class="remove-btn opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        // 绑定事件
        const removeBtn = item.querySelector('.remove-btn');
        const moveUpBtn = item.querySelector('.move-up-btn');
        const moveDownBtn = item.querySelector('.move-down-btn');

        removeBtn.addEventListener('click', () => handleRemoveDimension(dim.id));
        moveUpBtn.addEventListener('click', () => handleMoveDimension(index, 'up'));
        moveDownBtn.addEventListener('click', () => handleMoveDimension(index, 'down'));

        container.appendChild(item);
    });
}

/**
 * 更新计数显示
 * @param {number} availableCount - 可选维度数量
 * @param {number} selectedCount - 已选维度数量
 */
function updateCounts(availableCount, selectedCount) {
    const availableCountEl = document.getElementById('available-count');
    const selectedCountEl = document.getElementById('selected-count');

    if (availableCountEl) availableCountEl.textContent = `${availableCount} 个`;
    if (selectedCountEl) selectedCountEl.textContent = `${selectedCount} 个`;
}

/**
 * 处理添加维度
 * @param {string} dimensionId - 维度ID
 */
function handleAddDimension(dimensionId) {
    const state = getState();
    const { selectedEntity } = state;
    const currentSelected = state.selectedDimensions[selectedEntity] || [];

    if (!currentSelected.includes(dimensionId)) {
        const newSelected = [...currentSelected, dimensionId];
        updateSelectedDimensions(selectedEntity, newSelected);
        renderDimensionsModal();
    }
}

/**
 * 处理移除维度
 * @param {string} dimensionId - 维度ID
 */
function handleRemoveDimension(dimensionId) {
    const state = getState();
    const { selectedEntity } = state;
    const currentSelected = state.selectedDimensions[selectedEntity] || [];

    const newSelected = currentSelected.filter(id => id !== dimensionId);
    updateSelectedDimensions(selectedEntity, newSelected);
    renderDimensionsModal();
}

/**
 * 处理维度移动（上/下）
 * @param {number} index - 当前索引
 * @param {string} direction - 方向 ('up' 或 'down')
 */
function handleMoveDimension(index, direction) {
    const state = getState();
    const { selectedEntity } = state;
    const currentSelected = [...(state.selectedDimensions[selectedEntity] || [])];

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < currentSelected.length) {
        // 交换位置
        [currentSelected[index], currentSelected[newIndex]] = [currentSelected[newIndex], currentSelected[index]];
        updateSelectedDimensions(selectedEntity, currentSelected);
        renderDimensionsModal();
    }
}

/**
 * 处理全选维度
 */
export function handleSelectAll() {
    const state = getState();
    const { selectedEntity } = state;

    // 获取所有维度
    const allDimensionGroups = getEntityDimensions(selectedEntity);
    if (!allDimensionGroups) return;

    const allDimensionIds = [];
    Object.values(allDimensionGroups).forEach(dimensions => {
        dimensions.forEach(dim => allDimensionIds.push(dim.id));
    });

    updateSelectedDimensions(selectedEntity, allDimensionIds);
    renderDimensionsModal();
}

/**
 * 保存维度设置
 */
export function handleSaveDimensions() {
    // 更新主页面的预览区域
    updateDimensionsPreview();
    closeDimensionsModal();
}

/**
 * 更新主页面的维度预览区域
 */
export function updateDimensionsPreview() {
    const state = getState();
    const { selectedEntity } = state;
    const selectedDimensionIds = state.selectedDimensions[selectedEntity] || [];

    const container = document.getElementById('selected-dimensions-preview');
    if (!container) return;

    if (selectedDimensionIds.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 w-full text-center py-2">请点击"管理维度"按钮选择要导出的数据列...</p>';
        return;
    }

    // 获取维度详情
    const allDimensionGroups = getEntityDimensions(selectedEntity);
    const allDimensions = [];
    Object.values(allDimensionGroups || {}).forEach(dimensions => {
        dimensions.forEach(dim => allDimensions.push(dim));
    });

    // 按选中的顺序构建维度列表
    const selectedDimensions = selectedDimensionIds
        .map(id => allDimensions.find(d => d.id === id))
        .filter(Boolean);

    container.innerHTML = selectedDimensions.map(dim => `
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            ${dim.label}
        </span>
    `).join('');
}

/**
 * 初始化维度管理模态框事件监听
 */
export function initializeDimensionModal() {
    // 打开模态框按钮
    const manageDimensionsBtn = document.getElementById('manage-dimensions-btn');
    if (manageDimensionsBtn) {
        manageDimensionsBtn.addEventListener('click', openDimensionsModal);
    }

    // 关闭按钮
    const closeBtns = [
        document.getElementById('close-dimensions-modal-btn'),
        document.getElementById('cancel-dimensions-btn')
    ];
    closeBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', closeDimensionsModal);
    });

    // 保存按钮
    const saveBtn = document.getElementById('save-dimensions-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveDimensions);
    }

    // 全选按钮
    const selectAllBtn = document.getElementById('select-all-dimensions-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', handleSelectAll);
    }

    // 点击模态框外部关闭
    const modal = document.getElementById('dimensions-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDimensionsModal();
            }
        });
    }
}
