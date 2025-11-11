/**
 * @file details-panel.js
 * @description 详情面板操作模块
 */

import { apiRequest } from './api.js';
import { showCustomAlert, showCustomConfirm, hideModal } from './utils.js';
import { openRowId, getTaskById, updateOpenRowId, updateTask } from './state-manager.js';
import { renderTable } from './table-renderer.js';

/**
 * 处理保存返点信息
 * @param {string} taskId - 任务ID
 */
export async function handleSaveRebate(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;

    const amountInput = document.getElementById('recovered-amount-input');
    const dateInput = document.getElementById('recovery-date-input');
    const reasonInput = document.getElementById('discrepancy-reason-input');

    const amountValue = amountInput.value.trim();
    const recoveredAmount = amountValue === '' ? null : parseFloat(amountValue);
    const recoveryDate = dateInput.value;
    const reason = reasonInput.value.trim();

    if (recoveredAmount === null && recoveryDate) {
        showCustomAlert('录入回收日期时，必须填写实收金额。');
        return;
    }
    if (recoveredAmount !== null && isNaN(recoveredAmount)) {
        showCustomAlert('实收金额格式无效。');
        return;
    }
    if (recoveredAmount !== null && !recoveryDate) {
        showCustomAlert('请填写回收日期。');
        return;
    }

    const hasDiscrepancy = recoveredAmount !== null && Math.abs(recoveredAmount - task.receivable) > 0.01;
    if (hasDiscrepancy && !reason) {
        showCustomAlert('实收金额与应收金额不一致，请填写差异原因。');
        return;
    }

    const finalScreenshots = task.screenshots || [];
    if (hasDiscrepancy && finalScreenshots.length === 0) {
        showCustomAlert('返点金额有差异，必须上传凭证截图才能保存。');
        return;
    }

    try {
        const payload = {
            id: taskId,
            actualRebate: recoveredAmount,
            recoveryDate: recoveryDate,
            discrepancyReason: reason,
            rebateScreenshots: finalScreenshots
        };

        const success = await apiRequest('/update-collaboration', 'PUT', payload);
        if (success) {
            showCustomAlert('保存成功！');
            updateOpenRowId(null);
            // 需要重新加载数据，这将在主模块中处理
            const event = new CustomEvent('rebate-data-changed');
            document.dispatchEvent(event);
        }
    } catch (error) {
        // Error is handled in apiRequest
    }
}

/**
 * 处理删除记录
 * @param {string} taskId - 任务ID
 */
export async function handleDeleteRecord(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;

    const performDelete = async () => {
        try {
            // Step 1: Delete all associated screenshots from TOS
            const screenshotsToDelete = task.screenshots || [];
            if (screenshotsToDelete.length > 0) {
                showCustomAlert(`正在删除 ${screenshotsToDelete.length} 张关联凭证...`, '请稍候');
                const deletePromises = screenshotsToDelete.map(url =>
                    apiRequest('/delete-file', 'POST', {
                        projectId: task.projectId,
                        fileUrl: url
                    })
                );
                await Promise.allSettled(deletePromises);
            }

            // Step 2: Clear the database record
            await apiRequest('/update-collaboration', 'PUT', {
                id: taskId,
                actualRebate: null,
                recoveryDate: null,
                discrepancyReason: null,
                rebateScreenshots: []
            });

            hideModal();
            showCustomAlert('记录已成功清除');
            updateOpenRowId(null);
            // 触发数据重新加载事件
            const event = new CustomEvent('rebate-data-changed');
            document.dispatchEvent(event);
        } catch (error) {
            console.error("Failed to delete record:", error);
        }
    };

    showCustomConfirm(
        '您确定要删除此条回收记录吗？<br><span class="text-xs text-red-500">将清空所有已填信息并永久删除所有关联的凭证图片。</span>',
        '确认删除',
        async (confirmed) => {
            if (confirmed) {
                await performDelete();
            }
        }
    );
}

/**
 * 智能刷新详情视图
 * @param {string} taskId - 任务ID
 * @param {Object} updates - 更新的数据
 */
export async function smartRefreshDetailsView(taskId, updates) {
    const task = getTaskById(taskId);
    if (!task) return;

    const amountInput = document.getElementById('recovered-amount-input');
    const dateInput = document.getElementById('recovery-date-input');
    const reasonInput = document.getElementById('discrepancy-reason-input');

    if (updates.screenshots !== undefined) {
        updateTask(taskId, { screenshots: updates.screenshots });
    }

    // 获取更新的时间戳
    const updatedTaskData = await apiRequest(`/collaborations?collaborationId=${taskId}`);
    if (updatedTaskData.data) {
        updateTask(taskId, { discrepancyReasonUpdatedAt: updatedTaskData.data.discrepancyReasonUpdatedAt });
    }

    // 保存当前输入值
    if (amountInput) {
        updateTask(taskId, { recoveredAmount: amountInput.value });
    }
    if (dateInput) {
        updateTask(taskId, { recoveryDate: dateInput.value });
    }
    if (reasonInput) {
        updateTask(taskId, { discrepancyReason: reasonInput.value });
    }

    updateOpenRowId(taskId);
    renderTable();
}