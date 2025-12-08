/**
 * @file batch-operations.js
 * @description 批量操作模块 - 处理批量编辑和快速回收功能
 * @version 1.0
 */

import { apiRequest } from './api.js';
import { showCustomAlert, showCustomConfirm } from './utils.js';
import { BATCH_MODE } from './constants.js';
import {
    setBatchMode,
    getBatchMode,
    getSelectedTaskIds,
    clearAllSelections,
    selectAllTasks,
    getTaskById,
    displayedTasks,
    currentPage,
    itemsPerPage
} from './state-manager.js';

/**
 * 获取当前页的任务
 * @returns {Array} 当前页任务数组
 */
function getCurrentPageTasks() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return displayedTasks.slice(start, end);
}

/**
 * 进入批量编辑模式
 * @param {Function} renderCallback - 渲染回调函数
 */
export function enterBatchMode(renderCallback) {
    setBatchMode(BATCH_MODE.ON);
    if (renderCallback) renderCallback();
}

/**
 * 退出批量编辑模式
 * @param {Function} renderCallback - 渲染回调函数
 */
export function exitBatchMode(renderCallback) {
    setBatchMode(BATCH_MODE.OFF);
    if (renderCallback) renderCallback();
}

/**
 * 全选当前页待回收任务
 * @param {Function} renderCallback - 渲染回调函数
 */
export function selectAllPendingTasks(renderCallback) {
    const currentTasks = getCurrentPageTasks();
    const pendingTaskIds = currentTasks
        .filter(task => task.recoveredAmount == null)
        .map(task => task.id);
    selectAllTasks(pendingTaskIds);
    if (renderCallback) renderCallback();
}

/**
 * 清空选中
 * @param {Function} renderCallback - 渲染回调函数
 */
export function clearSelections(renderCallback) {
    clearAllSelections();
    if (renderCallback) renderCallback();
}

/**
 * 批量全额回收（选中的任务）
 * @param {Function} onComplete - 完成回调函数
 */
export async function batchFullRecovery(onComplete) {
    const selectedIds = getSelectedTaskIds();
    if (selectedIds.length === 0) {
        showCustomAlert('请先选择要回收的任务');
        return;
    }

    // 过滤出待回收的任务
    const tasksToRecover = selectedIds
        .map(id => getTaskById(id))
        .filter(task => task && task.recoveredAmount == null);

    if (tasksToRecover.length === 0) {
        showCustomAlert('选中的任务已全部回收');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const totalAmount = tasksToRecover.reduce((sum, task) => sum + task.receivable, 0);

    showCustomConfirm(
        `确认批量全额回收 ${tasksToRecover.length} 条记录？<br><br>` +
        `<span class="text-sm text-gray-600">总金额: ¥${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span><br>` +
        `<span class="text-sm text-gray-600">回收日期: ${today}</span>`,
        '确认批量回收',
        async (confirmed) => {
            if (!confirmed) return;

            showCustomAlert(`正在处理 ${tasksToRecover.length} 条记录...`, '请稍候');

            let successCount = 0;
            let failedCount = 0;

            for (const task of tasksToRecover) {
                try {
                    await apiRequest('/update-collaboration', 'PUT', {
                        id: task.id,
                        actualRebate: task.receivable,
                        recoveryDate: today,
                        discrepancyReason: null,
                        rebateScreenshots: task.screenshots || []
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Failed to recover task ${task.id}:`, error);
                    failedCount++;
                }
            }

            // 退出批量模式
            setBatchMode(BATCH_MODE.OFF);

            // 显示结果
            if (failedCount === 0) {
                showCustomAlert(`成功回收 ${successCount} 条记录！`);
            } else {
                showCustomAlert(`完成！成功 ${successCount} 条，失败 ${failedCount} 条`);
            }

            // 触发数据刷新
            if (onComplete) onComplete();
        }
    );
}

/**
 * 快速全额回收（单条记录）
 * @param {string} taskId - 任务ID
 * @param {Function} onComplete - 完成回调函数
 */
export async function quickFullRecovery(taskId, onComplete) {
    const task = getTaskById(taskId);
    if (!task) {
        showCustomAlert('任务不存在');
        return;
    }

    if (task.recoveredAmount != null) {
        showCustomAlert('该任务已回收');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
        await apiRequest('/update-collaboration', 'PUT', {
            id: taskId,
            actualRebate: task.receivable,
            recoveryDate: today,
            discrepancyReason: null,
            rebateScreenshots: task.screenshots || []
        });

        showCustomAlert('回收成功！');

        // 触发数据刷新
        if (onComplete) onComplete();
    } catch (error) {
        console.error('Quick recovery failed:', error);
    }
}

/**
 * 渲染批量操作工具栏
 * @returns {string} HTML 字符串
 */
export function renderBatchToolbar() {
    const isBatchMode = getBatchMode() === BATCH_MODE.ON;
    const selectedCount = getSelectedTaskIds().length;

    if (!isBatchMode) {
        return `
            <div class="flex items-center gap-3 mb-4">
                <button id="enter-batch-mode-btn" class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium text-sm inline-flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    批量编辑
                </button>
            </div>
        `;
    }

    return `
        <div class="flex items-center justify-between mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-indigo-700">批量编辑模式</span>
                <span class="text-sm text-indigo-600">已选 ${selectedCount} 条</span>
            </div>
            <div class="flex items-center gap-2">
                <button id="select-all-pending-btn" class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    全选待回收
                </button>
                <button id="clear-selection-btn" class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    清空选择
                </button>
                <button id="batch-full-recovery-btn" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" ${selectedCount === 0 ? 'disabled' : ''}>
                    批量全额回收
                </button>
                <button id="exit-batch-mode-btn" class="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">
                    退出批量模式
                </button>
            </div>
        </div>
    `;
}
