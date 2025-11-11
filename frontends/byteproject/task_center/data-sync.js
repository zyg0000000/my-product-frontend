/**
 * @file data-sync.js
 * @description Data sync functionality (T+7/T+21) for task center
 */

import { SYNC_FROM_FEISHU_ENDPOINT } from './constants.js';
import { apiRequest } from './api.js';
import { showToast } from './utils.js';

/**
 * Render data sync component for T+7/T+21 data
 * @param {HTMLElement} container - Container element
 * @param {string} taskType - Task type (PROJECT_DATA_OVERDUE_T7 or PROJECT_DATA_OVERDUE_T21)
 */
export function renderDataSyncComponent(container, taskType) {
    const isT7 = taskType.includes('T7');

    container.innerHTML = `
        <div class="p-4 space-y-4" data-task-type="${taskType}">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">飞书电子表格链接</label>
                <input type="url"
                    class="mini-sync-url w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                    placeholder="https://xxxx.feishu.cn/sheets/xxxxxx">
            </div>
            <fieldset>
                <legend class="text-sm font-medium text-gray-700 mb-1">数据类型</legend>
                <div class="flex items-center gap-x-4">
                    <div class="flex items-center">
                        <input id="dtype-t7-${taskType}"
                            name="dataType-${taskType}"
                            type="radio"
                            value="t7"
                            class="h-4 w-4"
                            ${isT7 ? 'checked' : ''}>
                        <label for="dtype-t7-${taskType}" class="ml-2 block text-sm">T+7 数据</label>
                    </div>
                    <div class="flex items-center">
                        <input id="dtype-t21-${taskType}"
                            name="dataType-${taskType}"
                            type="radio"
                            value="t21"
                            class="h-4 w-4"
                            ${!isT7 ? 'checked' : ''}>
                        <label for="dtype-t21-${taskType}" class="ml-2 block text-sm">T+21 数据</label>
                    </div>
                </div>
            </fieldset>
            <button class="mini-sync-btn w-full h-10 px-5 flex items-center justify-center bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                <span>开始同步</span>
                <div class="loader hidden animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            </button>
            <div class="mini-sync-result mt-2 text-sm"></div>
        </div>
    `;
}

/**
 * Handle data sync button click
 * @param {Event} e - Click event
 */
export async function handleDataSync(e) {
    const syncBtn = e.target.closest('.mini-sync-btn');
    if (!syncBtn) return;

    const component = syncBtn.closest('.p-4');
    const urlInput = component.querySelector('.mini-sync-url');
    const resultDiv = component.querySelector('.mini-sync-result');

    // Extract spreadsheet token from URL
    const spreadsheetToken = (urlInput.value.match(/\/(?:sheets|spreadsheet)\/([a-zA-Z0-9]+)/) || [])[1];

    if (!spreadsheetToken) {
        resultDiv.innerHTML = `<p class="text-red-600">请输入有效的飞书表格链接。</p>`;
        return;
    }

    // Update button state
    syncBtn.disabled = true;
    syncBtn.querySelector('span').classList.add('hidden');
    syncBtn.querySelector('.loader').classList.remove('hidden');
    resultDiv.innerHTML = `<p class="text-gray-600">正在同步中...</p>`;

    try {
        const payload = {
            spreadsheetToken,
            dataType: component.querySelector(`input[name="dataType-${component.dataset.taskType}"]:checked`).value
        };

        const result = await apiRequest(SYNC_FROM_FEISHU_ENDPOINT, 'POST', payload);

        resultDiv.innerHTML = `<p class="text-green-600">同步成功！处理了 ${result.processedRows} 行。</p>`;
        showToast('同步成功，任务列表将在2秒后刷新。');

        // Trigger refresh after delay
        setTimeout(() => {
            const refreshTasksEvent = new CustomEvent('refreshTasks');
            const refreshLogsEvent = new CustomEvent('refreshLogs');
            document.dispatchEvent(refreshTasksEvent);
            document.dispatchEvent(refreshLogsEvent);
        }, 2000);
    } catch (error) {
        resultDiv.innerHTML = `<p class="text-red-600">同步失败: ${error.message}</p>`;
    } finally {
        syncBtn.disabled = false;
        syncBtn.querySelector('span').classList.remove('hidden');
        syncBtn.querySelector('.loader').classList.add('hidden');
    }
}