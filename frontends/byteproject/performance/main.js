/**
 * main.js - 主入口模块
 * @version 12.10-style-centering
 * @description
 * - [UI/UX优化] 在`renderTable`函数中增加了单元格对齐逻辑，除"达人昵称"列保持左对齐外，所有其他数据列均实现居中显示，提升了表格的可读性和美观度。
 * - [模块化重构] 将单体文件拆分为11个独立模块，提升代码可维护性
 */

import {
    TALENT_SEARCH_ENDPOINT,
    TALENT_FILTER_OPTIONS_ENDPOINT,
    ITEMS_PER_PAGE_KEY
} from './constants.js';
import { apiRequest } from './api.js';
import { showCustomAlert } from './utils.js';
import {
    loadDimensions,
    updateItemsPerPage,
    updateTalentTypes,
    updateTalentTiers,
    updateDisplayedTalents,
    updateTotalTalents,
    updateCurrentPage,
    displayedTalents,
    dataFilters,
    updateDataFilters
} from './state-manager.js';
import { renderTable, handleSort } from './table-renderer.js';
import {
    renderFilterCheckboxes,
    renderDataFilterRows,
    buildSearchPayload,
    handleDataFilterChange,
    addDataFilterRow,
    resetAllFilters
} from './filter-panel.js';
import { renderDashboard } from './dashboard.js';
import { handlePaginationClick, handleItemsPerPageChange } from './pagination.js';
import {
    handleExcelImport,
    handleFeishuUrlSubmit,
    handleExportAll,
    handleConfirmImport
} from './import-export.js';
import {
    renderDimensionsModal,
    handleSaveDimensions,
    handleAddDimension,
    handleRemoveDimension
} from './modal-dimensions.js';

/**
 * 初始化页面
 */
async function initializePage() {
    setupEventListeners();

    // 加载用户设置
    const savedItemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '20');
    updateItemsPerPage(savedItemsPerPage);
    loadDimensions();

    try {
        await loadAndRenderFilterOptions();
        await fetchAndRenderTalents();
    } catch (error) {
        console.error("Page initialization failed due to API error:", error);
    }
}

/**
 * 加载并渲染筛选选项
 */
async function loadAndRenderFilterOptions() {
    try {
        const response = await apiRequest(TALENT_FILTER_OPTIONS_ENDPOINT);
        if (response.success && response.data) {
            updateTalentTiers(response.data.tiers || []);
            updateTalentTypes(response.data.types || []);
        }
    } catch (error) {
        console.error("加载筛选器选项失败:", error);
        updateTalentTiers([]);
        updateTalentTypes([]);
    } finally {
        renderFilterCheckboxes();
    }
}

/**
 * 获取并渲染达人数据
 */
async function fetchAndRenderTalents() {
    const performanceTableContainer = document.getElementById('performance-table-container');
    const loadingIndicator = document.createElement('p');
    loadingIndicator.className = 'p-8 text-center text-gray-500';
    loadingIndicator.textContent = '正在加载数据...';
    performanceTableContainer.innerHTML = '';
    performanceTableContainer.appendChild(loadingIndicator);

    const payload = buildSearchPayload();

    try {
        const response = await apiRequest(TALENT_SEARCH_ENDPOINT, 'POST', payload);

        if (response.success && response.data) {
            if (!response.data.pagination) {
                throw new Error("后端返回数据格式不兼容。请确认 getTalentsSearch 云函数已更新至 v8.2 或更高版本。");
            }

            updateDisplayedTalents(response.data.talents || []);
            updateTotalTalents(response.data.pagination.totalItems || 0);
            renderTable(response.data.talents || []);
            renderDashboard(response.data.dashboardStats);
        } else {
            throw new Error(response.message || '返回数据格式不正确');
        }
    } catch (error) {
        performanceTableContainer.innerHTML = `<p class="p-8 text-center text-red-500">数据加载失败: ${error.message}</p>`;
        renderDashboard(null);
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 维度管理
    const manageDimensionsBtn = document.getElementById('manage-dimensions-btn');
    if (manageDimensionsBtn) {
        manageDimensionsBtn.addEventListener('click', renderDimensionsModal);
    }

    // 导入导出
    const importExportBtn = document.getElementById('import-export-btn');
    const importExportDropdown = document.getElementById('import-export-dropdown');
    const dropdownImportExcelBtn = document.getElementById('dropdown-import-excel-btn');
    const dropdownFeishuImportBtn = document.getElementById('dropdown-feishu-import-btn');
    const dropdownExportAllBtn = document.getElementById('dropdown-export-all-btn');
    const importExcelInput = document.getElementById('import-excel-input');

    if (importExportBtn) {
        importExportBtn.addEventListener('click', () => {
            importExportDropdown.classList.toggle('hidden');
        });
    }

    if (dropdownImportExcelBtn) {
        dropdownImportExcelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            importExcelInput.click();
            importExportDropdown.classList.add('hidden');
        });
    }

    if (dropdownFeishuImportBtn) {
        dropdownFeishuImportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const feishuImportModal = document.getElementById('feishu-import-modal');
            feishuImportModal.classList.remove('hidden');
            importExportDropdown.classList.add('hidden');
        });
    }

    if (dropdownExportAllBtn) {
        dropdownExportAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleExportAll();
            importExportDropdown.classList.add('hidden');
        });
    }

    // 关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (importExportBtn && !importExportBtn.contains(e.target) &&
            importExportDropdown && !importExportDropdown.contains(e.target)) {
            importExportDropdown.classList.add('hidden');
        }
    });

    // 搜索框回车事件
    const setupSearchOnEnter = (element) => {
        if (element) {
            element.addEventListener('keyup', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    updateCurrentPage(1);
                    fetchAndRenderTalents();
                }
            });
        }
    };

    setupSearchOnEnter(document.getElementById('unified-search'));

    // Excel 导入
    if (importExcelInput) {
        importExcelInput.addEventListener('change', handleExcelImport);
    }

    // 高级筛选折叠按钮
    const toggleAdvancedFiltersBtn = document.getElementById('toggle-advanced-filters');
    const advancedFiltersContent = document.getElementById('advanced-filters-content');

    if (toggleAdvancedFiltersBtn && advancedFiltersContent) {
        toggleAdvancedFiltersBtn.addEventListener('click', () => {
            const isCollapsed = advancedFiltersContent.classList.contains('hidden');
            if (isCollapsed) {
                advancedFiltersContent.classList.remove('hidden');
                toggleAdvancedFiltersBtn.classList.remove('collapsed');
            } else {
                advancedFiltersContent.classList.add('hidden');
                toggleAdvancedFiltersBtn.classList.add('collapsed');
            }
        });
        // 默认折叠状态
        toggleAdvancedFiltersBtn.classList.add('collapsed');
    }

    // 筛选器按钮
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const addFilterBtn = document.getElementById('add-filter-btn');

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            updateCurrentPage(1);
            fetchAndRenderTalents();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            resetAllFilters(fetchAndRenderTalents);
        });
    }

    if (addFilterBtn) {
        addFilterBtn.addEventListener('click', addDataFilterRow);
    }

    // 维度模态框按钮
    const saveDimBtn = document.getElementById('save-dimensions-settings-btn');
    const closeDimBtn = document.getElementById('close-dimensions-modal-btn');

    if (saveDimBtn) {
        saveDimBtn.addEventListener('click', () => handleSaveDimensions(displayedTalents));
    }

    if (closeDimBtn) {
        closeDimBtn.addEventListener('click', () => {
            const dimensionsModal = document.getElementById('dimensions-modal');
            dimensionsModal.classList.add('hidden');
        });
    }

    // 导入确认模态框
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const cancelImportBtn = document.getElementById('cancel-import-btn');

    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', () => handleConfirmImport(fetchAndRenderTalents));
    }

    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', () => {
            const importConfirmModal = document.getElementById('import-confirm-modal');
            importConfirmModal.classList.add('hidden');
        });
    }

    // 飞书导入模态框
    const closeFeishuModalBtn = document.getElementById('close-feishu-modal-btn');
    const confirmFeishuImportBtn = document.getElementById('confirm-feishu-import-btn');

    if (closeFeishuModalBtn) {
        closeFeishuModalBtn.addEventListener('click', () => {
            const feishuImportModal = document.getElementById('feishu-import-modal');
            feishuImportModal.classList.add('hidden');
        });
    }

    if (confirmFeishuImportBtn) {
        confirmFeishuImportBtn.addEventListener('click', () => handleFeishuUrlSubmit(fetchAndRenderTalents));
    }

    // 维度模态框内部事件
    const dimensionsModal = document.getElementById('dimensions-modal');
    if (dimensionsModal) {
        dimensionsModal.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('add-dim-btn')) {
                handleAddDimension(target.dataset.id);
            } else if (target.classList.contains('remove-dim-btn')) {
                handleRemoveDimension(target.dataset.id);
            }
        });
    }

    // 数据筛选器容器
    const dataFiltersContainer = document.getElementById('data-filters-container');
    if (dataFiltersContainer) {
        dataFiltersContainer.addEventListener('change', handleDataFilterChange);
        dataFiltersContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-filter-btn');
            if (removeBtn) {
                const newFilters = [...dataFilters];
                newFilters.splice(removeBtn.dataset.index, 1);
                updateDataFilters(newFilters);
                renderDataFilterRows();
            }
        });
    }

    // 表格排序
    const performanceTableContainer = document.getElementById('performance-table-container');
    if (performanceTableContainer) {
        performanceTableContainer.addEventListener('click', (e) => {
            if (e.target.closest('.sortable-header')) {
                handleSort(e.target.closest('.sortable-header'), fetchAndRenderTalents);
            }
        });
    }

    // 分页控件
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.addEventListener('click', (e) => handlePaginationClick(e, fetchAndRenderTalents));
        paginationControls.addEventListener('change', (e) => {
            if (e.target.id === 'items-per-page') {
                handleItemsPerPageChange(parseInt(e.target.value), fetchAndRenderTalents);
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializePage);