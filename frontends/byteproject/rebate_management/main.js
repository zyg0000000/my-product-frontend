/**
 * @file main.js
 * @version 6.0 - Added batch edit mode and quick recovery
 * @description 返点管理页面主入口模块 - 协调所有子模块
 */

import { apiRequest } from './api.js';
import {
    updateAllProjects,
    updateAllCollaborations,
    updateRebateTasks,
    updateDisplayedTasks,
    updateCurrentPage,
    updateItemsPerPage,
    updateOpenRowId,
    updateCurrentUploadTaskId,
    allProjects,
    allCollaborations,
    rebateTasks,
    displayedTasks,
    currentPage,
    itemsPerPage,
    openRowId,
    toggleTaskSelection,
    setTaskSelection
} from './state-manager.js';
import { renderDashboard } from './dashboard.js';
import { renderTable } from './table-renderer.js';
import { renderProjectFilter, applyFilters } from './filter-panel.js';
import { handleSaveRebate, handleDeleteRecord } from './details-panel.js';
import { handleImageUpload, handleDeleteScreenshot, initImageViewer, showImageViewer } from './image-handler.js';
import {
    enterBatchMode,
    exitBatchMode,
    selectAllPendingTasks,
    clearSelections,
    batchFullRecovery,
    quickFullRecovery
} from './batch-operations.js';

/**
 * 加载初始数据
 */
async function loadInitialData() {
    try {
        const [projectsResponse, collabsResponse] = await Promise.all([
            apiRequest('/projects?view=simple'),
            apiRequest('/collaborations?allowGlobal=true&limit=9999')
        ]);

        updateAllProjects(projectsResponse.data || []);
        updateAllCollaborations(collabsResponse.data || []);

        aggregateRebateTasks();
        renderProjectFilter();
        renderPage();

    } catch (error) {
        console.error("Failed to load initial data:", error);
        const rebateListBody = document.getElementById('rebate-list-body');
        rebateListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-red-500">数据加载失败，请刷新页面重试。</td></tr>`;
    }
}

/**
 * 聚合返点任务数据
 */
function aggregateRebateTasks() {
    const projectMap = new Map(allProjects.map(p => [p.id, p]));

    const tasks = allCollaborations
        .filter(collab => {
            return (collab.talentSource || '野生达人') === '野生达人' &&
                collab.status === '视频已发布' &&
                collab.metrics &&
                collab.metrics.rebateReceivable > 0;
        })
        .map(collab => {
            const projectInfo = projectMap.get(collab.projectId);

            return {
                id: collab.id,
                projectId: collab.projectId,
                projectName: projectInfo ? projectInfo.name : '未知项目',
                talentId: collab.talentId,
                talentName: collab.talentInfo ? collab.talentInfo.nickname : '未知达人',
                talentSource: collab.talentSource || '野生达人',
                publishDate: collab.publishDate,
                receivable: collab.metrics.rebateReceivable,
                recoveredAmount: collab.actualRebate,
                recoveryDate: collab.recoveryDate,
                discrepancyReason: collab.discrepancyReason,
                discrepancyReasonUpdatedAt: collab.discrepancyReasonUpdatedAt,
                screenshots: collab.rebateScreenshots || []
            };
        });

    updateRebateTasks(tasks);
}

/**
 * 渲染页面
 */
function renderPage() {
    applyFilters();
    renderDashboard();
    renderTable();
}

/**
 * 触发数据刷新事件
 */
function triggerDataRefresh() {
    const event = new CustomEvent('rebate-data-changed');
    document.dispatchEvent(event);
}

/**
 * 初始化页面
 */
async function initializePage() {
    const statusFilter = document.getElementById('status-filter');
    const projectFilter = document.getElementById('project-filter');
    const talentSearchInput = document.getElementById('talent-search');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const paginationControls = document.getElementById('pagination-controls');
    const rebateListBody = document.getElementById('rebate-list-body');
    const imageUploadInput = document.getElementById('image-upload-input');

    // 设置默认筛选状态
    statusFilter.value = 'pending';

    // 加载初始数据
    await loadInitialData();

    // 初始化图片查看器
    initImageViewer();

    // --- 事件监听器 ---

    // 筛选按钮事件
    applyFiltersBtn.addEventListener('click', () => {
        updateCurrentPage(1);
        renderPage();
    });

    resetFiltersBtn.addEventListener('click', () => {
        projectFilter.value = '';
        statusFilter.value = '';
        talentSearchInput.value = '';
        updateCurrentPage(1);
        renderPage();
    });

    // 分页控件事件
    paginationControls.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target || target.disabled) return;

        const totalPages = Math.ceil(displayedTasks.length / itemsPerPage);

        if (target.id === 'prev-page-btn') {
            updateCurrentPage(currentPage - 1);
        } else if (target.id === 'next-page-btn') {
            updateCurrentPage(currentPage + 1);
        } else if (target.dataset.page) {
            updateCurrentPage(Number(target.dataset.page));
        }
        renderTable();
    });

    // 每页显示数量变更
    paginationControls.addEventListener('change', (e) => {
        if (e.target.id === 'items-per-page') {
            updateItemsPerPage(parseInt(e.target.value));
            updateCurrentPage(1);
            renderTable();
        }
    });

    // 表格内按钮点击事件（事件委托）
    rebateListBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');

        // 处理图片点击查看
        if (!target) {
            const img = e.target.closest('.view-screenshot-btn');
            if (img && img.dataset.url) {
                showImageViewer(img.dataset.url);
            }
            return;
        }

        const rowElement = target.closest('tr.details-row')
            ? rebateListBody.querySelector(`tr[data-task-id="${openRowId}"]`)
            : target.closest('tr');
        const taskId = openRowId || rowElement?.dataset.taskId;

        // 切换详情行
        if (target.closest('.toggle-details-btn')) {
            updateOpenRowId(openRowId === taskId ? null : taskId);
            renderTable();
        }
        // 保存按钮
        else if (target.closest('.save-btn')) {
            await handleSaveRebate(openRowId);
        }
        // 取消按钮
        else if (target.closest('.cancel-btn')) {
            updateOpenRowId(null);
            renderTable();
        }
        // 删除记录按钮
        else if (target.closest('.delete-record-btn')) {
            await handleDeleteRecord(openRowId);
        }
        // 添加截图按钮
        else if (target.closest('#add-screenshot-btn') || target.closest('label[for="image-upload-trigger"]')) {
            updateCurrentUploadTaskId(openRowId);
            imageUploadInput.click();
        }
        // 删除单个截图
        else if (target.closest('.delete-screenshot-btn')) {
            const index = parseInt(target.dataset.index, 10);
            const fileUrl = target.dataset.url;
            await handleDeleteScreenshot(index, fileUrl);
        }
        // 快速全额回收按钮
        else if (target.closest('.quick-recovery-btn')) {
            const quickTaskId = target.dataset.taskId;
            await quickFullRecovery(quickTaskId, triggerDataRefresh);
        }
    });

    // 批量选择复选框事件（事件委托）
    rebateListBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('batch-select-checkbox')) {
            const taskId = e.target.dataset.taskId;
            setTaskSelection(taskId, e.target.checked);
            // 更新工具栏显示选中数量
            renderTable();
        }
    });

    // 批量操作工具栏事件（事件委托）
    const batchToolbarContainer = document.getElementById('batch-toolbar-container');
    batchToolbarContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        // 进入批量编辑模式
        if (target.id === 'enter-batch-mode-btn') {
            enterBatchMode(renderTable);
        }
        // 退出批量编辑模式
        else if (target.id === 'exit-batch-mode-btn') {
            exitBatchMode(renderTable);
        }
        // 全选待回收
        else if (target.id === 'select-all-pending-btn') {
            selectAllPendingTasks(renderTable);
        }
        // 清空选择
        else if (target.id === 'clear-selection-btn') {
            clearSelections(renderTable);
        }
        // 批量全额回收
        else if (target.id === 'batch-full-recovery-btn') {
            await batchFullRecovery(triggerDataRefresh);
        }
    });

    // 监听实收金额输入变化
    rebateListBody.addEventListener('input', (e) => {
        if (e.target.id === 'recovered-amount-input') {
            const task = rebateTasks.find(t => t.id === openRowId);
            if (!task) return;

            const reasonContainer = document.getElementById('discrepancy-reason-container');
            if (!reasonContainer) return;

            const amountValue = e.target.value.trim();
            const amount = parseFloat(amountValue);

            const hasDiscrepancy = amountValue !== '' && !isNaN(amount) && Math.abs(amount - task.receivable) > 0.01;

            if (hasDiscrepancy) {
                reasonContainer.className = 'bg-red-50 border border-red-200 p-3 rounded-lg';
            } else {
                reasonContainer.className = 'hidden';
            }
        }
    });

    // 图片上传事件
    imageUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleImageUpload(e.target.files, openRowId);
        }
    });

    // 监听数据变更事件（从 details-panel.js 触发）
    document.addEventListener('rebate-data-changed', async () => {
        // 1. 保存当前筛选状态
        const savedFilters = {
            project: document.getElementById('project-filter').value,
            status: document.getElementById('status-filter').value,
            search: document.getElementById('talent-search').value
        };

        // 2. 重新加载数据
        await loadInitialData();

        // 3. 恢复筛选状态
        document.getElementById('project-filter').value = savedFilters.project;
        document.getElementById('status-filter').value = savedFilters.status;
        document.getElementById('talent-search').value = savedFilters.search;

        // 4. 重新应用筛选并渲染
        renderPage();
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});