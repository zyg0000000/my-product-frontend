/**
 * @file performance-sync.js
 * @description Performance data sync functionality
 */

import { SYNC_FROM_FEISHU_ENDPOINT } from './constants.js';
import { apiRequest } from './api.js';
import { showToast } from './utils.js';

/**
 * Render performance sync component
 * @param {HTMLElement} container - Container element
 */
export function renderPerformanceSyncComponent(container) {
    container.innerHTML = `
        <div class="p-4 space-y-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">飞书电子表格链接</label>
            <input type="url"
                class="performance-sync-url w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                placeholder="https://xxxx.feishu.cn/sheets/xxxxxx">
            <p class="text-xs text-gray-500 mt-1">表格需包含"达人星图ID"列及各项待更新的数据列。</p>
            <button class="performance-sync-btn w-full h-10 px-5 flex items-center justify-center bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                <span>开始同步</span>
                <div class="loader hidden animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            </button>
            <div class="performance-sync-result mt-2 text-sm"></div>
        </div>
    `;
}

/**
 * Handle performance sync button click
 * @param {Event} e - Click event
 */
export async function handlePerformanceSync(e) {
    const syncBtn = e.target.closest('.performance-sync-btn');
    if (!syncBtn) return;

    const component = syncBtn.closest('.p-4');
    const urlInput = component.querySelector('.performance-sync-url');
    const resultDiv = component.querySelector('.performance-sync-result');
    const url = urlInput.value.trim();

    if (!url) {
        resultDiv.innerHTML = `<p class="text-red-600">请输入有效的飞书表格链接。</p>`;
        return;
    }

    // Extract spreadsheet token from URL
    // Fix bug: Backend expects spreadsheetToken, not full URL
    const spreadsheetToken = (url.match(/\/(?:sheets|spreadsheet)\/([a-zA-Z0-9]+)/) || [])[1];

    console.log('[DEBUG] 输入的URL:', url);
    console.log('[DEBUG] 提取的spreadsheetToken:', spreadsheetToken);

    if (!spreadsheetToken) {
        resultDiv.innerHTML = `<p class="text-red-600">无法解析飞书表格链接，请检查链接格式。</p>`;
        return;
    }

    // Update button state
    syncBtn.disabled = true;
    syncBtn.querySelector('span').classList.add('hidden');
    syncBtn.querySelector('.loader').classList.remove('hidden');
    resultDiv.innerHTML = `<p class="text-gray-600">正在从飞书读取并处理数据，请稍候...</p>`;

    try {
        // Use nested structure, matching backend utils.js V11.0+ expected format
        const payload = {
            dataType: 'talentPerformance',
            payload: {
                spreadsheetToken: spreadsheetToken
            }
        };

        console.log('[DEBUG] 发送的payload:', JSON.stringify(payload));
        const result = await apiRequest(SYNC_FROM_FEISHU_ENDPOINT, 'POST', payload);

        resultDiv.innerHTML = `<p class="text-green-600">同步完成！成功更新 ${result.data?.updated || 0} 条，失败 ${result.data?.failed || 0} 条。</p>`;
        showToast('同步成功，状态将在2秒后刷新。');

        // Trigger refresh after delay
        setTimeout(() => {
            const refreshStatusEvent = new CustomEvent('refreshSystemStatus');
            const refreshLogsEvent = new CustomEvent('refreshLogs');
            document.dispatchEvent(refreshStatusEvent);
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