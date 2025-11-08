/**
 * @file main.js
 * @version 12.1-modular
 * @description Main controller and event coordination for task center
 * - [核心重构] 模块化重构版本，将原有的单文件拆分为11个模块
 * - [核心修正] 不再调用本地的 sidebar 初始化函数，完全依赖外部的 sidebar.js 组件
 */

// Import all modules
import { TASKS_API_ENDPOINT, TASK_SERVICE_ENDPOINT } from './constants.js';
import { showToast } from './utils.js';
import { apiRequest } from './api.js';
import { updateTasks } from './state-manager.js';
import { fetchAndRenderSystemStatus, handleMaintenanceCardClick } from './system-status.js';
import { distributeAndRenderTasks } from './task-list.js';
import { handleGroupHeaderClick, handleSaveCollaboration } from './task-details.js';
import { handleDataSync } from './data-sync.js';
import { handlePerformanceSync } from './performance-sync.js';
import { fetchAndRenderLogs } from './logs.js';

/**
 * Fetch and render tasks
 */
async function fetchAndRenderTasks() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    const layoutContainer = document.getElementById('task-layout-container');

    loadingIndicator.classList.remove('hidden');
    emptyState.classList.add('hidden');
    layoutContainer.classList.add('hidden');

    try {
        const response = await apiRequest(TASKS_API_ENDPOINT);
        if (response.success && response.data) {
            updateTasks(response.data);
            distributeAndRenderTasks(response.data);
        } else {
            throw new Error(response.message || '返回数据格式不正确');
        }
    } catch (error) {
        // Error already handled in apiRequest
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

/**
 * Handle trigger scan button click
 */
async function handleTriggerScan() {
    const triggerScanBtn = document.getElementById('trigger-scan-btn');

    triggerScanBtn.classList.add('trigger-btn-loading');
    triggerScanBtn.disabled = true;

    try {
        await apiRequest(TASK_SERVICE_ENDPOINT, 'POST', { action: 'triggerScan' });
        showToast('扫描任务已成功触发，正在后台运行...');

        // Refresh data after delay
        setTimeout(() => {
            fetchAndRenderTasks();
            fetchAndRenderLogs();
            fetchAndRenderSystemStatus();
        }, 5000);
    } catch (error) {
        // Error already handled in apiRequest
    } finally {
        setTimeout(() => {
            triggerScanBtn.classList.remove('trigger-btn-loading');
            triggerScanBtn.disabled = false;
        }, 5000);
    }
}

/**
 * Initialize the page
 */
function initializePage() {
    // [核心修正] 不再调用本地的 sidebar 初始化函数，完全依赖 sidebar.js

    // Initial data fetch
    fetchAndRenderSystemStatus();
    fetchAndRenderTasks();
    fetchAndRenderLogs();

    // Set up global event delegation
    document.body.addEventListener('click', (e) => {
        // Task group header clicks (accordion)
        if (e.target.closest('.task-group-header')) {
            handleGroupHeaderClick(e);
        }

        // Save collaboration button
        if (e.target.closest('.save-collab-btn')) {
            handleSaveCollaboration(e);
        }

        // Data sync button (T+7/T+21)
        if (e.target.closest('.mini-sync-btn')) {
            handleDataSync(e);
        }

        // Performance sync button
        if (e.target.closest('.performance-sync-btn')) {
            handlePerformanceSync(e);
        }

        // Maintenance card buttons
        if (e.target.closest('#update-performance-btn, #update-price-btn')) {
            handleMaintenanceCardClick(e);
        }

        // Trigger scan button
        if (e.target.closest('#trigger-scan-btn')) {
            handleTriggerScan();
        }
    });

    // Set up custom event listeners for module communication
    document.addEventListener('refreshTasks', () => {
        fetchAndRenderTasks();
    });

    document.addEventListener('refreshLogs', () => {
        fetchAndRenderLogs();
    });

    document.addEventListener('refreshSystemStatus', () => {
        fetchAndRenderSystemStatus();
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOM is already ready
    initializePage();
}