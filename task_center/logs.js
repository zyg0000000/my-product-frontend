/**
 * @file logs.js
 * @description Logs management for task center
 */

import { TASK_SERVICE_ENDPOINT } from './constants.js';
import { apiRequest } from './api.js';
import { formatRelativeTime } from './utils.js';
import { updateLogs } from './state-manager.js';

/**
 * Fetch and render logs
 */
export async function fetchAndRenderLogs() {
    const logsContainer = document.getElementById('logs-container');

    try {
        const response = await apiRequest(TASK_SERVICE_ENDPOINT, 'POST', {
            action: 'getLogs',
            limit: 1
        });

        if (response.success && response.data.length > 0) {
            const log = response.data[0];
            const isSuccess = log.status === 'SUCCESS';

            // Update state
            updateLogs(response.data);

            // Render logs
            logsContainer.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="log-status-dot ${isSuccess ? 'bg-green-500' : 'bg-red-500'}"></div>
                    <div>
                        <p class="font-semibold text-gray-700">
                            ${isSuccess ? '上次运行: 成功' : '上次运行: 失败'}
                        </p>
                        <p class="text-gray-500" title="${new Date(log.timestamp).toLocaleString()}">
                            ${formatRelativeTime(log.timestamp)} - ${log.summary}
                        </p>
                    </div>
                </div>
            `;
        } else {
            logsContainer.innerHTML = '<p class="text-sm text-gray-500">暂无运行记录。</p>';
        }
    } catch (error) {
        logsContainer.innerHTML = '<p class="text-sm text-red-500">无法加载运行记录。</p>';
    }
}