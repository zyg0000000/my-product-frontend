/**
 * @file main.js
 * @description Automation Suite 主控制器
 * @version 1.0.0 - 模块化版本
 */

import { API_ENDPOINTS, VIEW_MODES } from './constants.js';
import WorkflowModule from './workflow.js';
import ViewSwitcher from './view-switcher.js';
import StatisticsModule from './statistics.js';
import JobsModule from './jobs.js';
import WorkflowModal from './modal-workflow.js';
import ScreenshotModal from './modal-screenshot.js';
import DataModal from './modal-data.js';

export class AutomationSuiteApp {
    constructor() {
        // 全局状态
        this.viewMode = VIEW_MODES.WORKFLOW;
        this.activeFilter = { type: 'all', value: 'all' };
        this.currentPage = 1;
        this.projectSearchTerm = '';

        // 数据缓存
        this.allProjects = [];
        this.projectMap = new Map();

        // 初始化 UI 组件
        this.initializeUIComponents();

        // 初始化模块
        this.workflowModule = new WorkflowModule(this);
        this.viewSwitcher = new ViewSwitcher(this);
        this.statisticsModule = new StatisticsModule(this);
        this.jobsModule = new JobsModule(this);

        // 初始化弹窗
        this.workflowModal = new WorkflowModal(this);
        this.screenshotModal = new ScreenshotModal(this);
        this.dataModal = new DataModal(this);

        console.log('[AutomationSuite] Constructor initialized');
    }

    /**
     * 初始化 UI 组件（Toast、Confirm）
     */
    initializeUIComponents() {
        // 创建 Confirm Modal
        const confirmModal = document.createElement('div');
        confirmModal.id = 'custom-confirm-modal';
        confirmModal.className = 'fixed inset-0 z-[100] flex items-center justify-center hidden bg-gray-800 bg-opacity-60 p-4';
        confirmModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-auto">
                <div class="p-6">
                    <h3 id="confirm-modal-title-js" class="text-lg font-semibold text-gray-800"></h3>
                    <p id="confirm-modal-message-js" class="text-sm text-gray-600 mt-2 mb-6"></p>
                    <div class="flex justify-end space-x-3">
                        <button id="confirm-modal-cancel-btn-js" class="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">取消</button>
                        <button id="confirm-modal-confirm-btn-js" class="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">确定</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(confirmModal);

        // 创建 Toast Notification
        const toastNotification = document.createElement('div');
        toastNotification.id = 'toast-notification-js';
        toastNotification.className = 'fixed top-5 right-5 z-[110] text-white py-2 px-5 rounded-lg shadow-lg transform transition-all duration-300 opacity-0 hidden';
        toastNotification.innerHTML = `<p id="toast-message-js"></p>`;
        document.body.appendChild(toastNotification);
    }

    /**
     * 应用初始化
     */
    async init() {
        console.log('[AutomationSuite] Initializing...');

        // 1. 加载数据
        await Promise.all([
            this.loadProjects(),
            this.workflowModule.load()
        ]);

        await this.jobsModule.loadAll();

        // 2. 设置全局事件监听
        this.setupEventListeners();

        // 3. 首次渲染
        this.render();

        console.log('[AutomationSuite] Initialized successfully');
    }

    /**
     * 加载项目列表
     */
    async loadProjects() {
        try {
            const response = await this.apiCall(API_ENDPOINTS.projects);
            this.allProjects = response.data || [];
            this.projectMap.clear();
            this.allProjects.forEach(p => this.projectMap.set(p.id, p.name));
        } catch (error) {
            console.error('[AutomationSuite] Load projects failed:', error);
        }
    }

    /**
     * 设置全局事件监听
     */
    setupEventListeners() {
        // 监听视图切换
        document.addEventListener('viewChanged', () => {
            this.render();
        });

        // 监听筛选变化
        document.addEventListener('filterChanged', () => {
            this.render();
        });

        // 监听任务提交
        document.addEventListener('taskExecuted', () => {
            this.render();
        });

        // 监听工作流更新
        document.addEventListener('workflowUpdated', () => {
            this.statisticsModule.render();
        });

        // 监听任务数据更新
        document.addEventListener('jobsUpdated', () => {
            this.statisticsModule.render();
        });
    }

    /**
     * 渲染应用
     */
    render() {
        this.statisticsModule.render();
        this.jobsModule.render();
        this.statisticsModule.renderPagination();
    }

    /**
     * API 调用封装
     */
    async apiCall(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: `HTTP error! status: ${response.status}`
                }));
                throw new Error(errorData.message || 'Unknown API error');
            }

            if (response.status === 204) return null;
            return response.json();
        } catch (error) {
            console.error(`[AutomationSuite] API call failed for ${method} ${url}:`, error);
            this.showToast(`操作失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 显示 Toast 消息
     */
    showToast(message, type = 'success') {
        const toastNotification = document.getElementById('toast-notification-js');
        const toastMessageEl = document.getElementById('toast-message-js');

        if (!toastNotification || !toastMessageEl) return;

        toastMessageEl.textContent = message;
        toastNotification.className = `fixed top-5 right-5 z-[110] text-white py-2 px-5 rounded-lg shadow-lg transform transition-all duration-300`;
        toastNotification.classList.toggle('bg-green-500', type === 'success');
        toastNotification.classList.toggle('bg-red-500', type === 'error');
        toastNotification.classList.remove('hidden', 'opacity-0');

        setTimeout(() => {
            toastNotification.classList.add('opacity-0');
            setTimeout(() => toastNotification.classList.add('hidden'), 300);
        }, 3000);
    }

    /**
     * 显示 Confirm 对话框
     */
    showCustomConfirm(message, title = '请确认', callback) {
        const confirmModalEl = document.getElementById('custom-confirm-modal');
        const confirmTitle = document.getElementById('confirm-modal-title-js');
        const confirmMessage = document.getElementById('confirm-modal-message-js');
        const confirmOkBtn = document.getElementById('confirm-modal-confirm-btn-js');
        const confirmCancelBtn = document.getElementById('confirm-modal-cancel-btn-js');

        if (!confirmModalEl) return;

        confirmTitle.textContent = title;
        confirmMessage.innerHTML = message;

        const handleOk = () => {
            cleanup();
            if (callback) callback(true);
        };

        const handleCancel = () => {
            cleanup();
            if (callback) callback(false);
        };

        const cleanup = () => {
            confirmOkBtn.removeEventListener('click', handleOk);
            confirmCancelBtn.removeEventListener('click', handleCancel);
            confirmModalEl.classList.add('hidden');
        };

        confirmOkBtn.addEventListener('click', handleOk, { once: true });
        confirmCancelBtn.addEventListener('click', handleCancel, { once: true });

        confirmModalEl.classList.remove('hidden');
    }
}
