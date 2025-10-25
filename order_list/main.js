/**
 * @file order_list/main.js
 * @description Order List 页面主控制器
 * @version 1.0.0
 *
 * 职责:
 * - 页面初始化和协调
 * - Tab 切换管理
 * - 顶部统计看板渲染
 * - 项目数据加载
 * - 状态筛选器
 * - 项目文件管理
 * - 全局事件监听
 */

import { AppCore } from '../common/app-core.js';
import { BasicInfoTab } from './tab-basic.js';
import { PerformanceTab } from './tab-performance.js';
import { FinancialTab } from './tab-financial.js';
import { EffectTab } from './tab-effect.js';

const { API, Modal, Format, Utils } = AppCore;

export class OrderListApp {
    constructor() {
        // 当前项目ID
        this.projectId = null;

        // 项目数据
        this.project = {};

        // 配置数据
        this.allDiscounts = [];
        this.adjustmentTypes = [];

        // DOM 元素引用
        this.elements = {
            // 顶部信息
            projectNameDisplay: document.getElementById('project-name-display'),
            breadcrumbProjectName: document.getElementById('breadcrumb-project-name'),
            projectQianchuanId: document.getElementById('project-qianchuan-id'),
            statusAlertBanner: document.getElementById('status-alert-banner'),

            // 按钮
            addSingleTalentBtn: document.getElementById('add-single-talent-btn'),
            addBatchTalentBtn: document.getElementById('add-batch-talent-btn'),

            // Tab 相关
            dashboardTabs: document.getElementById('dashboard-tabs'),
            mainTabs: document.getElementById('tabs'),

            // 统计数据
            stats: {
                totalBudget: document.getElementById('stats-total-budget'),
                totalCollaborators: document.getElementById('stats-total-collaborators'),
                budgetUtilization: document.getElementById('stats-budget-utilization'),
                totalIncome: document.getElementById('stats-total-income'),
                totalRebateReceivable: document.getElementById('stats-total-rebate-receivable'),
                incomeAdjustments: document.getElementById('stats-income-adjustments'),
                totalOperationalCost: document.getElementById('stats-total-operational-cost'),
                totalExpense: document.getElementById('stats-total-expense'),
                fundsOccupationCost: document.getElementById('stats-funds-occupation-cost'),
                expenseAdjustments: document.getElementById('stats-expense-adjustments'),
                preAdjustmentProfit: document.getElementById('stats-pre-adjustment-profit'),
                preAdjustmentMargin: document.getElementById('stats-pre-adjustment-margin'),
                operationalProfit: document.getElementById('stats-operational-profit'),
                operationalMargin: document.getElementById('stats-operational-margin')
            },

            // 文件管理
            projectFilesContainer: document.getElementById('project-files-container'),
            projectFileInput: document.getElementById('project-file-input'),
            filePreviewModal: document.getElementById('file-preview-modal'),
            previewModalTitle: document.getElementById('preview-modal-title'),
            previewModalIframe: document.getElementById('preview-modal-iframe'),
            closePreviewModalBtn: document.getElementById('close-preview-modal-btn'),

            // 状态筛选器
            statusFilterContainer: document.getElementById('basic-info-filter-container'),
            statusFilterButton: document.getElementById('status-filter-button'),
            statusFilterDropdown: document.getElementById('status-filter-dropdown'),
            statusFilterOptions: document.getElementById('status-filter-options'),
            applyStatusFilterBtn: document.getElementById('apply-status-filter-btn')
        };

        // Tab 实例
        this.tabs = {
            basic: null,
            performance: null,
            financial: null,
            effect: null
        };

        // 当前激活的 Tab
        this.activeTab = 'basic-info';
    }

    /**
     * 初始化应用
     */
    async init() {
        // 获取项目ID
        this.projectId = Utils.getUrlParam('projectId');

        if (!this.projectId) {
            if (this.elements.projectNameDisplay) {
                this.elements.projectNameDisplay.textContent = '错误：缺少项目ID';
            }
            Modal.showAlert('缺少项目ID参数，请从项目列表进入。', '错误');
            return;
        }

        // 加载初始数据
        await this.loadInitialData();

        // 初始化各个 Tab
        this.initTabs();

        // 设置事件监听器
        this.setupEventListeners();

        // 初始化状态筛选器
        this.initStatusFilter();

        // 触发项目数据加载事件 (供侧边栏使用)
        document.dispatchEvent(new CustomEvent('projectDataLoaded'));

        // 加载默认Tab（基础信息）的数据
        await this.switchTab();
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        const loading = Modal.showLoading('正在加载项目核心数据...');

        try {
            // 加载项目数据
            const projectResponse = await API.request(`/projects?projectId=${this.projectId}`);
            this.project = projectResponse.data;

            // 加载配置数据
            const [discountsResponse, adjTypesResponse] = await Promise.all([
                API.request('/configurations?type=FRAMEWORK_DISCOUNTS'),
                API.request('/configurations?type=ADJUSTMENT_TYPES')
            ]);

            this.allDiscounts = discountsResponse ?
                (discountsResponse.find(c => c.type === 'FRAMEWORK_DISCOUNTS')?.values || []) : [];
            this.adjustmentTypes = adjTypesResponse ?
                (adjTypesResponse.find(c => c.type === 'ADJUSTMENT_TYPES')?.values || []) : [];

            // 渲染页面基础信息
            this.renderHeader();
            this.renderStatusGuidance();
            this.renderProjectFiles();
            this.updateAddButtonsState();

            loading.close();
        } catch (error) {
            loading.close();
            console.error('加载初始数据失败:', error);
            if (this.elements.projectNameDisplay) {
                this.elements.projectNameDisplay.textContent = '数据加载失败';
            }
        }
    }

    /**
     * 初始化各个 Tab
     */
    initTabs() {
        this.tabs.basic = new BasicInfoTab(this.projectId, this.project, this.allDiscounts);
        this.tabs.performance = new PerformanceTab(this.projectId, this.project);
        this.tabs.financial = new FinancialTab(this.projectId, this.project, this.adjustmentTypes);
        this.tabs.effect = new EffectTab(this.projectId, this.project);
    }

    /**
     * 渲染页面头部信息
     */
    renderHeader() {
        const { projectNameDisplay, breadcrumbProjectName, projectQianchuanId, stats } = this.elements;

        if (projectNameDisplay) {
            projectNameDisplay.textContent = this.project.name;
        }

        if (breadcrumbProjectName) {
            breadcrumbProjectName.textContent = this.project.name;
        }

        if (projectQianchuanId) {
            projectQianchuanId.textContent = `仟传编号: ${this.project.qianchuanId || 'N/A'}`;
        }

        // 渲染统计数据
        const metrics = this.project.metrics || {};

        if (stats.totalBudget) stats.totalBudget.textContent = Format.currency(metrics.projectBudget);
        if (stats.totalCollaborators) stats.totalCollaborators.textContent = metrics.totalCollaborators || 0;
        if (stats.budgetUtilization) stats.budgetUtilization.textContent = Format.percent(metrics.budgetUtilization);
        if (stats.totalIncome) stats.totalIncome.textContent = Format.currency(metrics.totalIncome);
        if (stats.totalRebateReceivable) stats.totalRebateReceivable.textContent = Format.currency(metrics.totalRebateReceivable);
        if (stats.incomeAdjustments) stats.incomeAdjustments.textContent = Format.currency(metrics.incomeAdjustments);
        if (stats.totalOperationalCost) stats.totalOperationalCost.textContent = Format.currency(metrics.totalOperationalCost);
        if (stats.totalExpense) stats.totalExpense.textContent = Format.currency(metrics.totalExpense);
        if (stats.fundsOccupationCost) stats.fundsOccupationCost.textContent = Format.currency(metrics.fundsOccupationCost);
        if (stats.expenseAdjustments) stats.expenseAdjustments.textContent = Format.currency(metrics.expenseAdjustments);
        if (stats.preAdjustmentProfit) stats.preAdjustmentProfit.textContent = Format.currency(metrics.preAdjustmentProfit);
        if (stats.preAdjustmentMargin) stats.preAdjustmentMargin.textContent = Format.percent(metrics.preAdjustmentMargin);
        if (stats.operationalProfit) stats.operationalProfit.textContent = Format.currency(metrics.operationalProfit);
        if (stats.operationalMargin) stats.operationalMargin.textContent = Format.percent(metrics.operationalMargin);
    }

    /**
     * 渲染状态提示横幅
     */
    renderStatusGuidance() {
        const { statusAlertBanner } = this.elements;
        if (!statusAlertBanner) return;

        statusAlertBanner.innerHTML = '';
        statusAlertBanner.className = 'hidden mb-6 p-4 rounded-lg text-sm items-center justify-between';

        let message = '', colorClass = '';

        switch (this.project.status) {
            case '待结算':
                message = '此项目当前为部分只读模式，仅可编辑财务信息。';
                colorClass = 'bg-orange-100 text-orange-800 block';
                break;
            case '已收款':
                message = '此项目已完成收款，可手动终结项目。';
                colorClass = 'bg-green-100 text-green-800 flex';
                break;
            case '已终结':
                message = '此项目已终结，当前为完全只读模式，无法进行任何修改。';
                colorClass = 'bg-gray-200 text-gray-800 block';
                break;
        }

        if (message) {
            statusAlertBanner.innerHTML = `<div>${message}</div>`;
            statusAlertBanner.className = `mb-6 p-4 rounded-lg text-sm items-center justify-between ${colorClass}`;
        }
    }

    /**
     * 渲染项目文件
     */
    renderProjectFiles() {
        const { projectFilesContainer } = this.elements;
        if (!projectFilesContainer) return;

        projectFilesContainer.innerHTML = '';
        const files = this.project.projectFiles || [];
        const canEdit = this.project.status !== '已终结';

        files.forEach((file) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item flex items-center justify-between p-2 rounded-lg hover:bg-gray-50';
            fileElement.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <svg class="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="text-sm text-gray-800 truncate" title="${file.name}">${file.name}</span>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                    <button class="view-file-btn text-sm font-medium text-blue-600 hover:underline" data-url="${file.url}" data-name="${file.name}">预览</button>
                    ${canEdit ? `<button class="delete-file-btn text-sm font-medium text-red-600 hover:underline" data-url="${file.url}">删除</button>` : ''}
                </div>
            `;
            projectFilesContainer.appendChild(fileElement);
        });

        if (canEdit && files.length < 5) {
            const uploadButton = document.createElement('button');
            uploadButton.id = 'upload-file-btn';
            uploadButton.className = 'w-full mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition border-2 border-dashed border-gray-300 hover:border-gray-400';
            uploadButton.textContent = `+ 点击上传 (${files.length}/5)`;
            projectFilesContainer.appendChild(uploadButton);
        } else if (files.length === 0) {
            const emptyMessage = this.project.status === '已终结' ? '项目已终结，未上传文件。' :
                                (this.project.status === '执行中' ? '项目进入结算阶段后可上传。' : '暂无结算文件。');
            projectFilesContainer.innerHTML = `<p class="text-sm text-center text-gray-500 py-2">${emptyMessage}</p>`;
        }
    }

    /**
     * 更新添加按钮状态
     */
    updateAddButtonsState() {
        const { addSingleTalentBtn, addBatchTalentBtn } = this.elements;
        const isExecuting = !['待结算', '已收款', '已终结'].includes(this.project.status);
        const singleAddUrl = `order_form.html?projectId=${this.projectId}`;
        const batchAddUrl = `talent_selection.html?projectId=${this.projectId}`;

        if (isExecuting) {
            if (addSingleTalentBtn) {
                addSingleTalentBtn.href = singleAddUrl;
                addSingleTalentBtn.classList.remove('disabled');
            }
            if (addBatchTalentBtn) {
                addBatchTalentBtn.href = batchAddUrl;
                addBatchTalentBtn.classList.remove('disabled');
            }
        } else {
            if (addSingleTalentBtn) {
                addSingleTalentBtn.removeAttribute('href');
                addSingleTalentBtn.classList.add('disabled');
            }
            if (addBatchTalentBtn) {
                addBatchTalentBtn.removeAttribute('href');
                addBatchTalentBtn.classList.add('disabled');
            }
        }
    }

    /**
     * 初始化状态筛选器
     */
    initStatusFilter() {
        const { statusFilterOptions, applyStatusFilterBtn } = this.elements;
        if (!statusFilterOptions) return;

        const allStatuses = ['待提报工作台', '工作台已提交', '客户已定档', '视频已发布'];

        statusFilterOptions.innerHTML = allStatuses.map(status => `
            <label class="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="${status}" class="status-filter-checkbox rounded text-indigo-600 mr-2">
                <span class="text-sm text-gray-700">${status}</span>
            </label>
        `).join('');

        // 默认全选
        statusFilterOptions.querySelectorAll('.status-filter-checkbox').forEach(cb => {
            cb.checked = true;
        });

        // 应用筛选按钮事件
        if (applyStatusFilterBtn) {
            applyStatusFilterBtn.addEventListener('click', () => {
                this.applyStatusFilter();
            });
        }
    }

    /**
     * 应用状态筛选
     */
    applyStatusFilter() {
        const { statusFilterDropdown, statusFilterButton } = this.elements;

        if (statusFilterDropdown) {
            statusFilterDropdown.classList.add('hidden');
        }

        // 重新加载当前 Tab 的数据
        const activeTabInstance = this.getActiveTabInstance();
        if (activeTabInstance && activeTabInstance.load) {
            const selectedStatuses = this.getSelectedStatuses();
            activeTabInstance.load(selectedStatuses);
        }

        // 更新按钮文本
        if (statusFilterButton) {
            const selectedCount = this.getSelectedStatuses().split(',').filter(s => s).length;
            const buttonText = statusFilterButton.querySelector('#status-filter-button-text');
            if (buttonText) {
                buttonText.textContent = selectedCount === 4 ? '合作状态' : `已选 ${selectedCount} 项`;
            }
        }
    }

    /**
     * 获取选中的状态
     */
    getSelectedStatuses() {
        const { statusFilterOptions } = this.elements;
        if (!statusFilterOptions) return '';

        const selectedCheckboxes = statusFilterOptions.querySelectorAll('.status-filter-checkbox:checked');
        return Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
    }

    /**
     * 获取当前激活的 Tab 实例
     */
    getActiveTabInstance() {
        const tabMap = {
            'basic-info': this.tabs.basic,
            'data-performance': this.tabs.performance,
            'financial-info': this.tabs.financial,
            'effect-dashboard': this.tabs.effect
        };
        return tabMap[this.activeTab];
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // Dashboard Tab 切换
        if (this.elements.dashboardTabs) {
            this.elements.dashboardTabs.addEventListener('click', (e) => {
                const tabButton = e.target.closest('.tab-btn');
                if (tabButton && !tabButton.classList.contains('active')) {
                    this.elements.dashboardTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    tabButton.classList.add('active');
                    document.querySelectorAll('#dashboard-tab-content > .tab-pane').forEach(pane => pane.classList.add('hidden'));
                    const targetPane = document.getElementById(tabButton.dataset.tabTarget);
                    if (targetPane) targetPane.classList.remove('hidden');
                }
            });
        }

        // Main Tab 切换
        if (this.elements.mainTabs) {
            this.elements.mainTabs.addEventListener('click', async (e) => {
                const tabButton = e.target.closest('.tab-btn');
                if (tabButton && !tabButton.classList.contains('active')) {
                    this.elements.mainTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    tabButton.classList.add('active');
                    this.activeTab = tabButton.dataset.tabTarget;
                    await this.switchTab();
                }
            });
        }

        // 状态筛选器下拉
        if (this.elements.statusFilterButton) {
            this.elements.statusFilterButton.addEventListener('click', () => {
                if (this.elements.statusFilterDropdown) {
                    this.elements.statusFilterDropdown.classList.toggle('hidden');
                }
            });
        }

        // 点击外部关闭筛选器
        document.addEventListener('click', (e) => {
            if (this.elements.statusFilterContainer &&
                !this.elements.statusFilterContainer.contains(e.target)) {
                if (this.elements.statusFilterDropdown) {
                    this.elements.statusFilterDropdown.classList.add('hidden');
                }
            }
        });

        // 项目文件相关事件
        this.setupFileListeners();

        // 监听来自各个 Tab 的项目刷新事件
        document.addEventListener('refreshProject', () => {
            this.refreshProject();
        });
    }

    /**
     * 设置文件相关监听器
     */
    setupFileListeners() {
        const { projectFilesContainer, projectFileInput, closePreviewModalBtn } = this.elements;

        if (projectFilesContainer) {
            projectFilesContainer.addEventListener('click', async (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                if (target.id === 'upload-file-btn') {
                    if (projectFileInput) projectFileInput.click();
                } else if (target.classList.contains('view-file-btn')) {
                    const proxyUrl = target.dataset.url;
                    const fileName = target.dataset.name;
                    this.previewFile(proxyUrl, fileName);
                } else if (target.classList.contains('delete-file-btn')) {
                    const fileUrl = target.dataset.url;
                    await this.deleteFile(fileUrl);
                }
            });
        }

        if (projectFileInput) {
            projectFileInput.addEventListener('change', (e) => this.uploadFiles(e.target.files));
        }

        if (closePreviewModalBtn) {
            closePreviewModalBtn.addEventListener('click', () => this.closeFilePreview());
        }
    }

    /**
     * 切换 Tab
     */
    async switchTab() {
        // 隐藏所有 Tab 内容
        document.querySelectorAll('#tab-content > .tab-pane').forEach(pane => pane.classList.add('hidden'));

        // 显示当前 Tab
        const targetPane = document.getElementById(this.activeTab);
        if (targetPane) targetPane.classList.remove('hidden');

        // 控制筛选器显示/隐藏
        if (this.elements.statusFilterContainer) {
            this.elements.statusFilterContainer.style.display =
                (this.activeTab === 'basic-info') ? 'block' : 'none';
        }

        // 加载对应 Tab 的数据
        const activeTabInstance = this.getActiveTabInstance();
        if (activeTabInstance && activeTabInstance.load) {
            const selectedStatuses = (this.activeTab === 'basic-info') ? this.getSelectedStatuses() : '';
            await activeTabInstance.load(selectedStatuses);
        }
    }

    /**
     * 预览文件
     */
    previewFile(url, name) {
        const { filePreviewModal, previewModalTitle, previewModalIframe } = this.elements;

        if (url && url !== '#') {
            if (previewModalTitle) previewModalTitle.textContent = `预览: ${name}`;
            if (previewModalIframe) previewModalIframe.src = url;
            if (filePreviewModal) filePreviewModal.classList.remove('hidden');
        } else {
            Modal.showAlert('无效的文件链接，无法预览。');
        }
    }

    /**
     * 关闭文件预览
     */
    closeFilePreview() {
        const { filePreviewModal, previewModalIframe } = this.elements;
        if (filePreviewModal) filePreviewModal.classList.add('hidden');
        if (previewModalIframe) previewModalIframe.src = 'about:blank';
    }

    /**
     * 上传文件
     */
    async uploadFiles(files) {
        if (!files || files.length === 0) return;

        const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            Modal.showAlert('仅支持上传 PDF 文件。');
            return;
        }

        const loading = Modal.showLoading('正在上传文件...');

        try {
            for (const file of pdfFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', this.projectId);

                await fetch(`${API.baseUrl}/upload-project-file`, {
                    method: 'POST',
                    body: formData
                });
            }

            loading.close();
            Modal.showAlert('文件上传成功！', '成功', async () => {
                await this.loadInitialData();
            });
        } catch (error) {
            loading.close();
            Modal.showAlert(`文件上传失败: ${error.message}`, '错误');
        }

        // 重置文件输入
        if (this.elements.projectFileInput) {
            this.elements.projectFileInput.value = '';
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(fileUrl) {
        Modal.showConfirm('确定要删除此文件吗？', '确认删除', async (confirmed) => {
            if (!confirmed) return;

            const loading = Modal.showLoading('正在删除文件...');

            try {
                await API.request('/delete-project-file', 'DELETE', {
                    projectId: this.projectId,
                    fileUrl: fileUrl
                });

                loading.close();
                Modal.showAlert('文件删除成功！', '成功', async () => {
                    await this.loadInitialData();
                });
            } catch (error) {
                loading.close();
                Modal.showAlert(`文件删除失败: ${error.message}`, '错误');
            }
        });
    }

    /**
     * 刷新项目数据
     */
    async refreshProject() {
        await this.loadInitialData();

        // 刷新当前激活的 Tab
        const activeTabInstance = this.getActiveTabInstance();
        if (activeTabInstance && activeTabInstance.load) {
            await activeTabInstance.load();
        }
    }
}

// 导出
export default OrderListApp;
