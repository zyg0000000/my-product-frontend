/**
 * @file project_automation/main.js
 * @description 主控制器 - 页面初始化、Tab切换、事件协调
 */

import TalentsTab from './tab-talents.js';
import JobsTab from './tab-jobs.js';
import SheetsTab from './tab-sheets.js';
import AutomationModal from './modal-automation.js';
import SheetGeneratorDrawer from './modal-sheet-generator.js';
import { JobDetailsModal, ScreenshotModal, DataModal, ToastManager } from './modals.js';

export class ProjectAutomationApp {
    constructor() {
        // --- API Configuration ---
        this.API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
        this.PROJECTS_API = `${this.API_BASE_URL}/projects`;
        this.COLLABORATIONS_API = `${this.API_BASE_URL}/collaborations`;
        this.AUTOMATION_JOBS_GET_API = `${this.API_BASE_URL}/automation-jobs-get`;

        // --- Global State ---
        this.currentProjectId = null;
        this.projectData = {};
        this.currentTab = 'talents';

        // --- DOM Elements ---
        this.breadcrumbProjectName = document.getElementById('breadcrumb-project-name');
        this.projectMainTitle = document.getElementById('project-main-title');
        this.projectQianchuanId = document.getElementById('project-qianchuan-id');
        this.automationTabBtns = document.querySelectorAll('.automation-tab-btn');
        this.talentsTabPanel = document.getElementById('talents-tab');
        this.jobsTabPanel = document.getElementById('jobs-tab');
        this.sheetsTabPanel = document.getElementById('sheets-tab');
        this.toastNotification = document.getElementById('toast-notification');
        this.toastMessage = document.getElementById('toast-message');

        // --- Module Instances ---
        this.tabs = {};
        this.modals = {};
        this.toastManager = null;

        // --- Bind Methods ---
        this.switchTab = this.switchTab.bind(this);
        this.handleRefreshEvents = this.handleRefreshEvents.bind(this);
    }

    async init() {
        // 获取项目ID
        this.currentProjectId = new URLSearchParams(window.location.search).get('id');
        if (!this.currentProjectId) {
            document.body.innerHTML = '<div class="p-8 text-center text-red-500">错误：URL中缺少项目ID。</div>';
            return;
        }

        // 初始化 Toast 管理器
        this.toastManager = new ToastManager(this.toastNotification, this.toastMessage);

        // 运行一次性迁移
        await this.runOneTimeLocalStorageMigration();

        // 加载项目数据
        try {
            await this.loadProjectData();
        } catch (error) {
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">无法加载页面数据: ${error.message}</div>`;
            return;
        }

        // 初始化模块
        this.initializeModules();

        // 设置事件监听
        this.setupEventListeners();

        // 渲染项目详情
        this.renderProjectDetails(this.projectData);

        // 加载默认Tab（达人选择）
        this.tabs.talents.load();

        console.log('[ProjectAutomationApp] 页面初始化完成');
    }

    async loadProjectData() {
        const [projectResponse, collaborationsResponse, automationData] = await Promise.all([
            this.apiRequest(`${this.PROJECTS_API}?projectId=${this.currentProjectId}`),
            this.apiRequest(`${this.COLLABORATIONS_API}?projectId=${this.currentProjectId}&limit=1000`),
            this.apiRequest(`${this.AUTOMATION_JOBS_GET_API}?projectId=${this.currentProjectId}`)
        ]);

        this.projectData = projectResponse.data;
        this.projectData.collaborations = collaborationsResponse.data || [];
        this.projectData.automationJobs = automationData.data || [];

        console.log(`[ProjectAutomationApp] 加载项目数据完成:`, {
            collaborations: this.projectData.collaborations.length,
            jobs: this.projectData.automationJobs.length
        });
    }

    initializeModules() {
        // 初始化 Tab 模块
        this.tabs.talents = new TalentsTab({
            projectId: this.currentProjectId,
            projectData: this.projectData,
            apiRequest: this.apiRequest.bind(this),
            showToast: this.toastManager.show.bind(this.toastManager),
            showConfirm: this.showCustomConfirm.bind(this)
        });

        this.tabs.jobs = new JobsTab({
            projectId: this.currentProjectId,
            automationJobs: this.projectData.automationJobs,
            apiRequest: this.apiRequest.bind(this),
            showToast: this.toastManager.show.bind(this.toastManager),
            showConfirm: this.showCustomConfirm.bind(this)
        });

        this.tabs.sheets = new SheetsTab({
            projectId: this.currentProjectId,
            apiRequest: this.apiRequest.bind(this),
            showToast: this.toastManager.show.bind(this.toastManager),
            showConfirm: this.showCustomConfirm.bind(this)
        });

        // 初始化 Modal 模块
        this.modals.automation = new AutomationModal({
            projectId: this.currentProjectId,
            projectData: this.projectData,
            apiRequest: this.apiRequest.bind(this),
            showToast: this.toastManager.show.bind(this.toastManager),
            showConfirm: this.showCustomConfirm.bind(this)
        });

        this.modals.sheetGenerator = new SheetGeneratorDrawer({
            projectId: this.currentProjectId,
            projectData: this.projectData,
            apiRequest: this.apiRequest.bind(this),
            showToast: this.toastManager.show.bind(this.toastManager),
            showConfirm: this.showCustomConfirm.bind(this),
            API_BASE_URL: this.API_BASE_URL
        });

        this.modals.jobDetails = new JobDetailsModal({
            apiRequest: this.apiRequest.bind(this),
            showToast: this.toastManager.show.bind(this.toastManager),
            showConfirm: this.showCustomConfirm.bind(this),
            API_BASE_URL: this.API_BASE_URL
        });

        this.modals.screenshot = new ScreenshotModal();
        this.modals.data = new DataModal(this.toastManager.show.bind(this.toastManager));
    }

    setupEventListeners() {
        // Tab 切换事件
        this.automationTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 监听模块间通信事件
        document.addEventListener('refreshTalents', this.handleRefreshEvents);
        document.addEventListener('refreshJobs', this.handleRefreshEvents);
        document.addEventListener('refreshSheets', this.handleRefreshEvents);
    }

    async handleRefreshEvents(e) {
        console.log(`[ProjectAutomationApp] 收到刷新事件: ${e.type}`);

        if (e.type === 'refreshTalents') {
            await this.tabs.talents.load();
        } else if (e.type === 'refreshJobs') {
            // 重新加载任务数据
            const automationData = await this.apiRequest(`${this.AUTOMATION_JOBS_GET_API}?projectId=${this.currentProjectId}`);
            this.projectData.automationJobs = automationData.data || [];
            this.tabs.jobs.updateJobs(this.projectData.automationJobs);
            await this.tabs.jobs.load();
        } else if (e.type === 'refreshSheets') {
            await this.tabs.sheets.load();
        }
    }

    switchTab(tabName) {
        console.log(`[Tab切换] 切换到: ${tabName}`);

        // 隐藏所有Tab面板
        if (this.talentsTabPanel) this.talentsTabPanel.classList.add('hidden');
        if (this.jobsTabPanel) this.jobsTabPanel.classList.add('hidden');
        if (this.sheetsTabPanel) this.sheetsTabPanel.classList.add('hidden');

        // 移除所有Tab按钮的active状态
        this.automationTabBtns.forEach(btn => btn.classList.remove('active'));

        // 显示目标Tab并激活按钮
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        // 卸载当前Tab（清理资源）
        if (this.currentTab && this.tabs[this.currentTab]) {
            this.tabs[this.currentTab].unload();
        }

        // 显示并加载新Tab
        if (tabName === 'talents' && this.talentsTabPanel) {
            this.talentsTabPanel.classList.remove('hidden');
            this.tabs.talents.load();
        } else if (tabName === 'jobs' && this.jobsTabPanel) {
            this.jobsTabPanel.classList.remove('hidden');
            this.tabs.jobs.load();
        } else if (tabName === 'sheets' && this.sheetsTabPanel) {
            this.sheetsTabPanel.classList.remove('hidden');
            this.tabs.sheets.load();
        }

        this.currentTab = tabName;
    }

    renderProjectDetails(project) {
        if (!project) return;
        document.title = `${project.name} - 自动化任务中心`;
        this.breadcrumbProjectName.textContent = project.name;
        this.projectMainTitle.textContent = `${project.name}`;
        this.projectQianchuanId.textContent = `仟传编号: ${project.qianchuanId || 'N/A'}`;
    }

    async runOneTimeLocalStorageMigration() {
        const MIGRATION_FLAG = 'sheet_history_migrated_v1';
        if (localStorage.getItem(MIGRATION_FLAG)) return;

        try {
            const oldStorageKey = `generated_sheets_${this.currentProjectId}`;
            const oldHistoryJSON = localStorage.getItem(oldStorageKey);
            if (oldHistoryJSON) {
                const oldHistory = JSON.parse(oldHistoryJSON);
                if (Array.isArray(oldHistory) && oldHistory.length > 0) {
                    const dataToMigrate = oldHistory.map(item => ({
                        ...item,
                        projectId: this.currentProjectId
                    }));
                    await this.apiRequest(
                        `${this.API_BASE_URL}/generated-sheets?action=migrate`,
                        'POST',
                        dataToMigrate
                    );
                }
            }
        } catch (error) {
            console.error('迁移本地历史记录时发生错误:', error);
        } finally {
            localStorage.setItem(MIGRATION_FLAG, 'true');
        }
    }

    // --- Helper Functions ---
    async apiRequest(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);
            if (response.status === 204) return { success: true, message: "Operation successful." };

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: `HTTP error! status: ${response.status}`
                }));
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request error for ${method} ${url}:`, error);
            this.toastManager.show(`操作失败: ${error.message}`, 'error');
            throw error;
        }
    }

    showCustomConfirm(message, confirmText = '确认', callback) {
        const confirmModal = document.getElementById('custom-confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmOkBtn = document.getElementById('confirm-ok-btn');
        const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

        confirmMessage.textContent = message;
        confirmOkBtn.textContent = confirmText;
        confirmOkBtn.className = confirmText === '确认删除'
            ? 'px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600'
            : 'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600';

        const handleOk = () => { cleanup(); callback(true); };
        const handleCancel = () => { cleanup(); callback(false); };
        const cleanup = () => {
            confirmModal.classList.add('hidden');
            confirmOkBtn.removeEventListener('click', handleOk);
            confirmCancelBtn.removeEventListener('click', handleCancel);
        };

        confirmOkBtn.addEventListener('click', handleOk, { once: true });
        confirmCancelBtn.addEventListener('click', handleCancel, { once: true });
        confirmModal.classList.remove('hidden');
    }
}

export default ProjectAutomationApp;
