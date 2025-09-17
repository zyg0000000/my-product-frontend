/**
 * @file order_list.js
 * @version 25.1-fix-performance-actions
 * @description [功能修复] 修复了“执行信息”选项卡中操作按钮（复制、打开链接）无效的问题，并优化了剪贴板功能。
 * * --- 更新日志 (v25.1) ---
 * - [BUG修复] 调整了 `handleMainContentClick` 事件处理函数。现在，点击单元格内的操作按钮（如复制、打开视频）会正确执行其功能，而不会错误地触发单元格的编辑模式。
 * - [功能优化] 将复制到剪贴板的功能从 `navigator.clipboard.writeText` 更改为使用 `document.execCommand('copy')`。这提高了在某些（如iframe）环境下的兼容性和稳定性。
 * - [代码优化] 修正了从单元格中提取数据值的逻辑，移除了一个不正确的后备方案，使代码更健壮。
 * * --- 历史更新 (v25.0) ---
 * - [业务规则] 新增核心逻辑：只有当合作状态不为“视频已发布”、“待结算”、“已收款”或“已终结”时，才允许用户编辑“合作档期”。
 * - [UI/UX优化] 在不允许编辑的状态下，“合作档期”列将只显示只读的日期文本，隐藏编辑按钮，界面更简洁。
 * - [代码重构] 重构了 renderBasicInfoTab 函数，以实现新的权限判断和UI渲染逻辑。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- API Configuration & DOM Elements ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const PERFORMANCE_API_ENDPOINT = '/project-performance';
    const HISTORY_API_ENDPOINT = '/getTalentHistory';

    // DOM Elements (Page specific)
    const projectNameDisplay = document.getElementById('project-name-display');
    const projectTagsDisplay = document.getElementById('project-tags-display');
    const statusAlertBanner = document.getElementById('status-alert-banner');
    const projectFilesContainer = document.getElementById('project-files-container');
    const projectFileInput = document.getElementById('project-file-input');
    const filePreviewModal = document.getElementById('file-preview-modal');
    const previewModalTitle = document.getElementById('preview-modal-title');
    const previewModalIframe = document.getElementById('preview-modal-iframe');
    const closePreviewModalBtn = document.getElementById('close-preview-modal-btn');
    const addSingleTalentBtn = document.getElementById('add-single-talent-btn');
    const addBatchTalentBtn = document.getElementById('add-batch-talent-btn');
    const addCollaboratorLink = document.getElementById('add-collaborator-link');
    const mainTabs = document.getElementById('tabs');
    const mainTabContent = document.getElementById('tab-content');
    const dashboardTabs = document.getElementById('dashboard-tabs');
    const statsTotalBudget = document.getElementById('stats-total-budget');
    const statsTotalCollaborators = document.getElementById('stats-total-collaborators');
    const statsBudgetUtilization = document.getElementById('stats-budget-utilization');
    const statsTotalIncome = document.getElementById('stats-total-income');
    const statsTotalExpense = document.getElementById('stats-total-expense');
    const statsTotalRebateReceivable = document.getElementById('stats-total-rebate-receivable');
    const statsIncomeAdjustments = document.getElementById('stats-income-adjustments');
    const statsFundsOccupationCost = document.getElementById('stats-funds-occupation-cost');
    const statsExpenseAdjustments = document.getElementById('stats-expense-adjustments');
    const statsTotalOperationalCost = document.getElementById('stats-total-operational-cost');
    const statsPreAdjustmentProfit = document.getElementById('stats-pre-adjustment-profit');
    const statsPreAdjustmentMargin = document.getElementById('stats-pre-adjustment-margin');
    const statsOperationalProfit = document.getElementById('stats-operational-profit');
    const statsOperationalMargin = document.getElementById('stats-operational-margin');
    const collaboratorListBody = document.getElementById('collaborator-list-body');
    const noDataMessage = document.getElementById('no-data-message');
    const paginationControlsBasic = document.getElementById('pagination-controls-basic');
    const dataPerformanceListBody = document.getElementById('data-performance-list-body');
    const noDataPerformanceMessage = document.getElementById('no-data-performance-message');
    const paginationControlsPerformance = document.getElementById('pagination-controls-performance');
    const financialListBody = document.getElementById('financial-list-body');
    const noFinancialMessage = document.getElementById('no-financial-message');
    const paginationControlsFinancial = document.getElementById('pagination-controls-financial');
    const batchActionSelect = document.getElementById('batch-action-select');
    const batchDateInput = document.getElementById('batch-date-input');
    const executeBatchBtn = document.getElementById('execute-batch-btn');
    const selectAllFinancialCheckbox = document.getElementById('select-all-on-page-financial');
    const adjustmentsListBody = document.getElementById('adjustments-list-body');
    const addAdjustmentBtn = document.getElementById('add-adjustment-btn');
    const adjustmentModal = document.getElementById('adjustment-modal');
    const closeAdjustmentModalBtn = document.getElementById('close-adjustment-modal-btn');
    const adjustmentForm = document.getElementById('adjustment-form');
    const adjustmentModalTitle = document.getElementById('adjustment-modal-title');
    const editingAdjustmentIdInput = document.getElementById('editing-adjustment-id');
    const adjustmentTypeSelect = document.getElementById('adjustment-type');
    const effectDashboardLoading = document.getElementById('effect-dashboard-loading');
    const effectDashboardError = document.getElementById('effect-dashboard-error');
    const effectDashboardContent = document.getElementById('effect-dashboard-content');
    const effDeliveryDate = document.getElementById('eff-delivery-date');
    const effProgressSummary = document.getElementById('eff-progress-summary');
    const effProgressBar = document.getElementById('eff-progress-bar');
    const effViewsGap = document.getElementById('eff-views-gap');
    const effT21Views = document.getElementById('eff-t21-views');
    const effT21Cpm = document.getElementById('eff-t21-cpm');
    const effBenchmarkCpm = document.getElementById('eff-benchmark-cpm');
    const effTargetViews = document.getElementById('eff-target-views');
    const effT7Views = document.getElementById('eff-t7-views');
    const effT7Interactions = document.getElementById('eff-t7-interactions');
    const effT7Cpm = document.getElementById('eff-t7-cpm');
    const effT7Cpe = document.getElementById('eff-t7-cpe');
    const effT7Ctr = document.getElementById('eff-t7-ctr');
    const effectTalentListBody = document.getElementById('effect-talent-list-body');

    // --- State ---
    const MANUAL_STATUS_OPTIONS = ['待提报工作台', '工作台已提交', '客户已定档'];
    let currentProjectId = null;
    let project = {};
    let paginatedData = { basic: [], performance: [], financial: [] };
    let totalItems = { basic: 0, performance: 0, financial: 0 };
    let allDiscounts = [];
    let adjustmentTypes = [];
    let currentPage = { basic: 1, performance: 1, financial: 1 };
    let itemsPerPage = 10;
    let openDetails = new Set();
    let pendingDateChanges = {};
    let editingOrderTypeId = null;
    let effectDetailsToggle = { interaction: false, component: false };
    let effectDashboardData = null;
    let editingDateId = null;
    let editingPerformanceCells = new Set();
    let dirtyPerformanceRows = new Set();

    // --- Modal Logic ---

    const alertModal = document.createElement('div');
    alertModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
    alertModal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="alert-modal-title"></h3><div class="mt-2 py-3"><p class="text-sm text-gray-500" id="alert-modal-message"></p></div><div class="mt-4 flex justify-end"><button id="alert-modal-ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
    document.body.appendChild(alertModal);
    const alertModalTitleEl = document.getElementById('alert-modal-title');
    const alertModalMessageEl = document.getElementById('alert-modal-message');
    const alertModalOkBtn = document.getElementById('alert-modal-ok-btn');
    
    const showCustomAlert = (message, title = '提示', callback) => {
        alertModalTitleEl.textContent = title;
        alertModalMessageEl.innerHTML = message;
        alertModalOkBtn.onclick = () => {
            alertModal.classList.add('hidden');
            if (callback) callback();
        };
        alertModal.classList.remove('hidden');
    };

    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
    confirmModal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="confirm-modal-title"></h3><div class="mt-2 py-3"><p class="text-sm text-gray-500" id="confirm-modal-message"></p></div><div class="mt-4 flex justify-end space-x-2"><button id="confirm-modal-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button id="confirm-modal-confirm-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
    document.body.appendChild(confirmModal);
    const confirmModalTitleEl = document.getElementById('confirm-modal-title');
    const confirmModalMessageEl = document.getElementById('confirm-modal-message');
    const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');

    const showCustomConfirm = (message, title = '确认操作', callback) => {
        confirmModalTitleEl.textContent = title;
        confirmModalMessageEl.innerHTML = message;
        confirmModalConfirmBtn.onclick = () => {
            confirmModal.classList.add('hidden');
            if (callback) callback(true);
        };
        confirmModalCancelBtn.onclick = () => {
            confirmModal.classList.add('hidden');
            if (callback) callback(false);
        };
        confirmModal.classList.remove('hidden');
    };
    
    const loadingModal = document.createElement('div');
    loadingModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
    loadingModal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="loading-modal-title"></h3><div class="mt-2 py-3"><p class="text-sm text-gray-500" id="loading-modal-message"></p></div></div>`;
    document.body.appendChild(loadingModal);
    const loadingModalTitleEl = document.getElementById('loading-modal-title');
    const loadingModalMessageEl = document.getElementById('loading-modal-message');

    const showLoadingAlert = (message, title = '请稍候') => {
        loadingModalTitleEl.textContent = title;
        loadingModalMessageEl.innerHTML = message;
        loadingModal.classList.remove('hidden');
        return {
            close: () => {
                loadingModal.classList.add('hidden');
            }
        };
    };
    
    // --- API Request Function ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        if (method === 'GET' && body) {
            Object.keys(body).forEach(key => {
                if (body[key] !== undefined && body[key] !== null) {
                    url.searchParams.append(key, body[key]);
                }
            });
        }

        const options = { method, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } };
        if (body && method !== 'GET') { options.body = JSON.stringify(body); }
        try {
            const response = await fetch(url.toString(), options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            if (response.headers.get('Content-Type')?.includes('application/pdf')) { return response.blob(); }
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            showCustomAlert(`操作失败: ${error.message}`);
            throw error;
        }
    }
    
    // --- Data Loading Logic ---
    async function initializePage() {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId');
        if (!currentProjectId) { 
            if(projectNameDisplay) projectNameDisplay.textContent = '错误：缺少项目ID'; 
            return; 
        }
        await loadInitialData();
        setupEventListeners();
    }

    async function loadInitialData() {
        try {
            const loadingAlert = showLoadingAlert('正在加载项目核心数据...');
            const projectResponse = await apiRequest(`/projects?projectId=${currentProjectId}`);
            project = projectResponse.data;
            document.dispatchEvent(new CustomEvent('projectDataLoaded'));

            const [discountsResponse, adjTypesResponse] = await Promise.all([
                apiRequest('/configurations?type=FRAMEWORK_DISCOUNTS'),
                apiRequest('/configurations?type=ADJUSTMENT_TYPES')
            ]);
            allDiscounts = discountsResponse.data || [];
            adjustmentTypes = adjTypesResponse.data || [];
            effectDashboardData = null;
            
            renderHeaderAndDashboard(project);
            renderStatusGuidance(project);
            renderProjectFiles(project);
            updateAddButtonsState(project);

            loadingAlert.close();
            await switchTabAndLoadData();

        } catch (error) {
            if(projectNameDisplay) projectNameDisplay.textContent = '数据加载失败';
        }
    }
    
    async function loadCollaborators(pageKey) {
        setLoadingState(true, pageKey);
        try {
            const response = await apiRequest('/collaborations', 'GET', {
                projectId: currentProjectId,
                page: currentPage[pageKey],
                limit: itemsPerPage,
                sortBy: 'createdAt',
                order: 'desc'
            });
            
            paginatedData[pageKey] = response.data || [];
            totalItems[pageKey] = response.total || 0;

            switch (pageKey) {
                case 'basic': renderBasicInfoTab(paginatedData.basic, project); break;
                case 'performance': renderDataPerformanceTab(paginatedData.performance, project); break;
                case 'financial': renderFinancialTab(paginatedData.financial, project); break;
            }
        } catch (error) {
            console.error(`加载 ${pageKey} 数据失败:`, error);
        } finally {
            setLoadingState(false, pageKey);
        }
    }
    
    async function switchTabAndLoadData() {
        const activeTabBtn = mainTabs.querySelector('.tab-btn.active');
        if (!activeTabBtn) return;
        const activeTab = activeTabBtn.dataset.tabTarget;
        
        mainTabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
        const targetPane = document.getElementById(activeTab);
        if(targetPane) targetPane.classList.remove('hidden');

        let pageKey = activeTab.replace('-info', '');
        if (pageKey === 'data-performance') pageKey = 'performance';

        editingPerformanceCells.clear();
        dirtyPerformanceRows.clear();

        switch (activeTab) {
            case 'basic-info':
            case 'data-performance':
            case 'financial-info':
                await loadCollaborators(pageKey);
                break;
            case 'effect-dashboard':
                if (!effectDashboardData) { await loadEffectDashboardData(); } 
                else { renderEffectDashboard(effectDashboardData); }
                break;
        }
    }

    function setLoadingState(isLoading, pageKey) {
        const getBodyAndColspan = (key) => {
            switch(key) {
                case 'basic': return { body: collaboratorListBody, colspan: 10 };
                case 'performance': return { body: dataPerformanceListBody, colspan: 8 };
                case 'financial': return { body: financialListBody, colspan: 10 };
                default: return { body: null, colspan: 8 };
            }
        };
        const { body, colspan } = getBodyAndColspan(pageKey);
        if (isLoading && body) {
            body.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-12 text-gray-500">正在加载...</td></tr>`;
        }
    }
    
    function renderPage() {
        if (!project || !project.id) return;
        
        renderHeaderAndDashboard(project);
        renderStatusGuidance(project);
        renderProjectFiles(project);
        updateAddButtonsState(project);
        
        const activeTab = mainTabs.querySelector('.tab-btn.active').dataset.tabTarget;
        
        switch (activeTab) {
            case 'basic-info': renderBasicInfoTab(paginatedData.basic, project); break;
            case 'data-performance': renderDataPerformanceTab(paginatedData.performance, project); break;
            case 'financial-info': renderFinancialTab(paginatedData.financial, project); break;
            case 'effect-dashboard':
                if (effectDashboardData) { renderEffectDashboard(effectDashboardData); }
                break;
        }
    }

    function updateAddButtonsState(projectData) {
        const isExecuting = !['待结算', '已收款', '已终结'].includes(projectData.status);
        const singleAddUrl = `order_form.html?projectId=${currentProjectId}`;
        const batchAddUrl = `talent_selection.html?projectId=${currentProjectId}`;
        if(addCollaboratorLink) addCollaboratorLink.href = singleAddUrl;
        if (isExecuting) {
            if(addSingleTalentBtn) { addSingleTalentBtn.href = singleAddUrl; addSingleTalentBtn.classList.remove('disabled'); }
            if(addBatchTalentBtn) { addBatchTalentBtn.href = batchAddUrl; addBatchTalentBtn.classList.remove('disabled'); }
        } else {
            if(addSingleTalentBtn) { addSingleTalentBtn.removeAttribute('href'); addSingleTalentBtn.classList.add('disabled');}
            if(addBatchTalentBtn) { addBatchTalentBtn.removeAttribute('href'); addBatchTalentBtn.classList.add('disabled');}
        }
    }

    // --- Rendering Functions ---
    function renderHeaderAndDashboard(projectData) {
        if (!projectNameDisplay) return;
        projectNameDisplay.textContent = projectData.name;
        projectTagsDisplay.innerHTML = [
            projectData.type && `<span class="tag"><span class="tag-dot" style="background-color: #7c3aed;"></span>${projectData.type}</span>`,
            projectData.year && projectData.month && `<span class="tag" title="客户视角月份"><span class="tag-dot bg-green-400"></span>客-${(projectData.year || '').slice(-2)}年${projectData.month}</span>`,
            projectData.financialYear && projectData.financialMonth && `<span class="tag" title="财务归属月份"><span class="tag-dot bg-purple-400"></span>财-${(projectData.financialYear || '').slice(-2)}年${projectData.financialMonth}</span>`
        ].filter(Boolean).join('');
        const metrics = projectData.metrics || {};
        const formatCurrency = (num) => `¥ ${(Number(num) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const formatPercent = (num) => `${(Number(num) || 0).toFixed(2)}%`;
        if(statsTotalBudget) statsTotalBudget.textContent = formatCurrency(metrics.projectBudget);
        if(statsTotalCollaborators) statsTotalCollaborators.textContent = metrics.totalCollaborators || 0;
        if(statsBudgetUtilization) statsBudgetUtilization.textContent = formatPercent(metrics.budgetUtilization);
        if(statsTotalIncome) statsTotalIncome.textContent = formatCurrency(metrics.totalIncome);
        if(statsTotalRebateReceivable) statsTotalRebateReceivable.textContent = formatCurrency(metrics.totalRebateReceivable);
        if(statsIncomeAdjustments) statsIncomeAdjustments.textContent = formatCurrency(metrics.incomeAdjustments);
        if(statsTotalOperationalCost) statsTotalOperationalCost.textContent = formatCurrency(metrics.totalOperationalCost);
        if(statsTotalExpense) statsTotalExpense.textContent = formatCurrency(metrics.totalExpense);
        if(statsFundsOccupationCost) statsFundsOccupationCost.textContent = formatCurrency(metrics.fundsOccupationCost);
        if(statsExpenseAdjustments) statsExpenseAdjustments.textContent = formatCurrency(metrics.expenseAdjustments);
        if(statsPreAdjustmentProfit) statsPreAdjustmentProfit.textContent = formatCurrency(metrics.preAdjustmentProfit);
        if(statsPreAdjustmentMargin) statsPreAdjustmentMargin.textContent = formatPercent(metrics.preAdjustmentMargin);
        if(statsOperationalProfit) statsOperationalProfit.textContent = formatCurrency(metrics.operationalProfit);
        if(statsOperationalMargin) statsOperationalMargin.textContent = formatPercent(metrics.operationalMargin);
    }
    
    function renderStatusGuidance(projectData) {
        if (!statusAlertBanner) return;
        statusAlertBanner.innerHTML = '';
        statusAlertBanner.className = 'hidden mb-6 p-4 rounded-lg text-sm items-center justify-between';
        let message = '', colorClass = '';
        switch (projectData.status) {
            case '待结算': message = '此项目当前为部分只读模式，仅可编辑财务信息。'; colorClass = 'bg-orange-100 text-orange-800 block'; break;
            case '已收款': message = '此项目已完成收款，可手动终结项目。'; colorClass = 'bg-green-100 text-green-800 flex'; break;
            case '已终结': message = '此项目已终结，当前为完全只读模式，无法进行任何修改。'; colorClass = 'bg-gray-200 text-gray-800 block'; break;
        }
        if (message) {
            statusAlertBanner.innerHTML = `<div>${message}</div>`;
            statusAlertBanner.className = `mb-6 p-4 rounded-lg text-sm items-center justify-between ${colorClass}`;
        }
    }

    function renderProjectFiles(project) {
        if (!projectFilesContainer) return;
        projectFilesContainer.innerHTML = '';
        const files = project.projectFiles || [];
        const canEdit = project.status === '待结算' || project.status === '已收款';
        files.forEach((file) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item flex items-center justify-between p-2 rounded-lg hover:bg-gray-50';
            fileElement.innerHTML = `<div class="flex items-center gap-2 overflow-hidden"><svg class="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span class="text-sm text-gray-800 truncate" title="${file.name}">${file.name}</span></div><div class="flex items-center gap-3 flex-shrink-0"><button class="view-file-btn text-sm font-medium text-blue-600 hover:underline" data-url="${file.url}" data-name="${file.name}">预览</button>${canEdit ? `<button class="delete-file-btn text-sm font-medium text-red-600 hover:underline" data-url="${file.url}">删除</button>` : ''}</div>`;
            projectFilesContainer.appendChild(fileElement);
        });
        if (canEdit && files.length < 5) {
            const uploadButton = document.createElement('button');
            uploadButton.id = 'upload-file-btn';
            uploadButton.className = 'w-full mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition border-2 border-dashed border-gray-300 hover:border-gray-400';
            uploadButton.textContent = `+ 点击上传 (${files.length}/5)`;
            projectFilesContainer.appendChild(uploadButton);
        } else if (files.length === 0) {
            projectFilesContainer.innerHTML = `<p class="text-sm text-center text-gray-500 py-2">${project.status === '已终结' ? '项目已终结，未上传文件。' : '项目进入结算阶段后可上传。'}</p>`;
        }
    }

    function renderBasicInfoTab(collaborators, projectData) {
        if (!collaboratorListBody || !noDataMessage) return;
        if (collaborators.length === 0) {
            noDataMessage.classList.remove('hidden');
            collaboratorListBody.closest('table').classList.add('hidden');
        } else {
            noDataMessage.classList.add('hidden');
            collaboratorListBody.closest('table').classList.remove('hidden');
            const fragment = document.createDocumentFragment();
            collaborators.forEach(c => {
                const talentInfo = c.talentInfo || {};
                const talentNickname = talentInfo.nickname || '（已删除）';
                const financials = c.metrics;
                const isDeleteDisabled = c.status === '视频已发布' || projectData.status !== '执行中';
                
                let statusCellHtml = '';
                const isStatusSelectDisabled = c.status === '视频已发布' || projectData.status !== '执行中';
                let statusOptionsHtml = MANUAL_STATUS_OPTIONS.map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('');
                if (c.status === '视频已发布') statusOptionsHtml += `<option value="视频已发布" selected>视频已发布</option>`;
                statusCellHtml = `<select class="table-select status-select" data-id="${c.id}" ${isStatusSelectDisabled ? 'disabled' : ''}>${statusOptionsHtml}</select>`;

                // [v25.0] Business rule for date editing
                const canEditDate = !['视频已发布', '待结算', '已收款', '已终结'].includes(c.status);
                let dateCellHtml = '';
                if (canEditDate) {
                    const isEditingThisRow = editingDateId === c.id;
                    const dateInputId = `planned-date-input-${c.id}`;
                    dateCellHtml = `
                        <div class="flex items-center gap-2">
                            <input type="date" id="${dateInputId}" class="data-input w-full" value="${c.plannedReleaseDate || ''}" ${!isEditingThisRow ? 'disabled' : ''}>
                            <button class="p-1 rounded-md text-gray-500 hover:bg-gray-200 transition-colors inline-edit-date-btn" data-id="${c.id}" data-state="${isEditingThisRow ? 'save' : 'edit'}">
                                ${isEditingThisRow ? 
                                    '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>'
                                }
                            </button>
                        </div>`;
                } else {
                    dateCellHtml = c.plannedReleaseDate || '<span class="text-gray-400">待定</span>';
                }

                const mainRow = document.createElement('tr');
                mainRow.className = 'bg-white border-b hover:bg-gray-50';
                mainRow.id = `collab-row-${c.id}`;
                const xingtuUrl = talentInfo.xingtuId ? `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talentInfo.xingtuId}` : '#';
                const talentLink = talentInfo.xingtuId ? `<a href="${xingtuUrl}" target="_blank" class="text-blue-600 hover:underline">${talentNickname}</a>` : talentNickname;
                const orderTypeText = c.orderType === 'original' ? '原价下单' : '改价下单';

                mainRow.innerHTML = `
                    <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${talentLink}</td>
                    <td class="px-6 py-4">${dateCellHtml}</td>
                    <td class="px-6 py-4">${c.talentSource || '未指定'}</td>
                    <td class="px-6 py-4">${orderTypeText}</td>
                    <td class="px-6 py-4" title="${c.priceInfo || ''}">¥ ${Number(c.amount || 0).toLocaleString()}</td>
                    <td class="px-6 py-4 text-center">${c.rebate || 'N/A'}%</td>
                    <td class="px-6 py-4 font-medium">¥ ${(financials.income || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td class="px-6 py-4 font-semibold text-center ${(financials.grossProfitMargin || 0) < 0 ? 'text-red-600' : 'text-green-600'}">${(financials.grossProfitMargin || 0).toFixed(2)}%</td>
                    <td class="px-6 py-4">${statusCellHtml}</td>
                    <td class="px-6 py-4 flex items-center justify-center space-x-2">
                        <button data-id="${c.id}" class="toggle-details-btn p-1 rounded-md text-gray-500 hover:bg-gray-100"><svg class="w-5 h-5 rotate-icon ${openDetails.has(c.id) ? 'rotated' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
                        <button data-id="${c.id}" class="delete-btn p-1 rounded-md text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed" ${isDeleteDisabled ? 'disabled' : ''}><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </td>`;

                const subRow = document.createElement('tr');
                subRow.className = `collapsible-row bg-gray-50/70 ${openDetails.has(c.id) ? 'expanded' : ''}`;
                
                const tagsHtml = (talentInfo.tags && talentInfo.tags.length > 0) 
                    ? talentInfo.tags.map(tag => `<span class="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">${tag}</span>`).join('')
                    : '<span class="text-gray-500">暂无</span>';

                subRow.innerHTML = `
                    <td colspan="10" class="p-4">
                        <div class="bg-white p-4 rounded-lg border">
                            <div class="flex justify-between items-center mb-3 border-b pb-2">
                                <h4 class="text-sm font-semibold text-gray-800">达人档案</h4>
                                <button class="view-history-btn text-sm font-medium text-blue-600 hover:underline" data-talent-id="${c.talentId}" data-talent-name="${talentNickname}">
                                    查看合作历史 &rarr;
                                </button>
                            </div>
                            <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">星图ID:</span>
                                    ${talentInfo.xingtuId ? `<a href="${xingtuUrl}" target="_blank" class="font-medium text-blue-600 hover:underline">${talentInfo.xingtuId}</a>` : '<span class="font-medium text-gray-500">N/A</span>'}
                                </div>
                                <div class="flex justify-between"><span class="text-gray-500">UID:</span><span class="font-medium text-gray-800">${talentInfo.uid || 'N/A'}</span></div>
                                <div class="flex justify-between"><span class="text-gray-500">达人层级:</span><span class="font-medium text-gray-800">${talentInfo.level || 'N/A'}</span></div>
                                <div class="flex items-start justify-between"><span class="text-gray-500 flex-shrink-0 mr-4">内容标签:</span><div class="text-right">${tagsHtml}</div></div>
                            </div>
                        </div>
                    </td>`;
                
                fragment.appendChild(mainRow);
                fragment.appendChild(subRow);
            });
            collaboratorListBody.innerHTML = '';
            collaboratorListBody.appendChild(fragment);
        }
        renderPagination(paginationControlsBasic, 'basic', totalItems.basic);
    }
    
    function renderDataPerformanceTab(collaborators, projectData) {
        if (!dataPerformanceListBody || !noDataPerformanceMessage) return;
        const isReadOnly = projectData.status !== '执行中';
        if (collaborators.length === 0) {
            noDataPerformanceMessage.classList.remove('hidden');
            dataPerformanceListBody.closest('table').classList.add('hidden');
        } else {
            noDataPerformanceMessage.classList.add('hidden');
            dataPerformanceListBody.closest('table').classList.remove('hidden');
            const fragment = document.createDocumentFragment();
            collaborators.forEach(c => {
                const row = document.createElement('tr');
                row.className = 'bg-white border-b data-row';
                row.dataset.id = c.id;

                const renderEditableCell = (value, fieldName) => {
                    const cellKey = `${c.id}_${fieldName}`;
                    if (editingPerformanceCells.has(cellKey)) {
                        return `<input type="text" class="data-input performance-input" data-field="${fieldName}" value="${value || ''}" ${isReadOnly ? 'disabled' : ''}>`;
                    } else {
                        if (!value) return `<div class="text-gray-400 editable-cell cursor-pointer" data-id="${c.id}" data-field="${fieldName}">N/A</div>`;
                        const displayValue = value.length > 15 ? `${value.substring(0, 8)}...${value.slice(-4)}` : value;
                        const actionButtons = `
                            <div class="flex items-center ml-2">
                                <button class="copy-btn p-1 rounded-md text-gray-400 hover:bg-gray-100" title="复制"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                                ${fieldName === 'contentFile' ? `<button class="open-link-btn p-1 rounded-md text-blue-500 hover:bg-blue-100" title="打开链接"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></button>` : ''}
                                ${fieldName === 'videoId' ? `<button class="open-video-btn p-1 rounded-md text-red-500 hover:bg-red-100" title="打开抖音视频"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg></button>` : ''}
                            </div>`;
                        return `<div class="flex items-center justify-between editable-cell ${isReadOnly ? '' : 'cursor-pointer'}" data-id="${c.id}" data-field="${fieldName}" title="点击编辑: ${value}"><span class="truncate">${displayValue}</span>${actionButtons}</div>`;
                    }
                };
                
                const isRowDirty = dirtyPerformanceRows.has(c.id);

                row.innerHTML = `
                    <td class="px-6 py-4 font-medium whitespace-nowrap">${c.talentInfo.nickname}</td>
                    <td class="px-6 py-4">${c.plannedReleaseDate || '<span class="text-gray-400">待定</span>'}</td>
                    <td class="px-6 py-4">${c.talentSource || '野生达人'}</td>
                    <td class="px-6 py-4">${renderEditableCell(c.contentFile, 'contentFile')}</td>
                    <td class="px-6 py-4">${renderEditableCell(c.taskId, 'taskId')}</td>
                    <td class="px-6 py-4">${renderEditableCell(c.videoId, 'videoId')}</td>
                    <td class="px-6 py-4"><input type="date" class="data-input publish-date-input" data-field="publishDate" value="${c.publishDate || ''}" ${isReadOnly ? 'disabled' : ''}></td>
                    <td class="px-6 py-4 text-center"><button class="save-performance-btn px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed" data-id="${c.id}" ${!isRowDirty || isReadOnly ? 'disabled' : ''}>保存</button></td>`;
                fragment.appendChild(row);
            });
            dataPerformanceListBody.innerHTML = '';
            dataPerformanceListBody.appendChild(fragment);
        }
        renderPagination(paginationControlsPerformance, 'performance', totalItems.performance);
    }
    
    function renderFinancialTab(collaborators, projectData) {
        if (!financialListBody || !noFinancialMessage) return;
        const isReadOnly = projectData.status === '已终结';
        if (collaborators.length === 0) {
            noFinancialMessage.classList.remove('hidden');
            financialListBody.closest('table').classList.add('hidden');
        } else {
            noFinancialMessage.classList.add('hidden');
            financialListBody.closest('table').classList.remove('hidden');
            const fragment = document.createDocumentFragment();
            collaborators.forEach(c => {
                const financials = c.metrics;
                let rebateStatus, rebateStatusColor;
                const talentSource = c.talentSource || '未指定';
                if (talentSource === '机构达人') {
                    rebateStatus = '统一处理';
                    rebateStatusColor = 'bg-indigo-100 text-indigo-800';
                } else if (c.status !== '视频已发布') {
                    rebateStatus = '视频未发布';
                    rebateStatusColor = 'bg-blue-100 text-blue-800';
                } else {
                    rebateStatus = c.actualRebate != null ? (Math.abs(c.actualRebate - (financials.rebateReceivable || 0)) > 0.01 ? '有差异' : '已回收') : '待回收';
                    rebateStatusColor = { '已回收': 'bg-green-100 text-green-800', '有差异': 'bg-red-100 text-red-800', '待回收': 'bg-yellow-100 text-yellow-800' }[rebateStatus];
                }
                const mainRow = document.createElement('tr');
                mainRow.className = 'bg-white border-b hover:bg-gray-50';
                mainRow.innerHTML = `<td class="px-4 py-4 w-12 text-center"><input type="checkbox" class="collaborator-checkbox-financial rounded text-blue-600" data-id="${c.id}" ${isReadOnly ? 'disabled' : ''}></td><td class="px-6 py-4 font-medium text-gray-900">${c.talentInfo.nickname || '(已删除)'}</td><td class="px-6 py-4">${c.plannedReleaseDate || '<span class="text-gray-400">待定</span>'}</td><td class="px-6 py-4">${talentSource}</td><td class="px-6 py-4">¥ ${Number(c.amount || 0).toLocaleString()}</td><td class="px-6 py-4">¥ ${(financials.income || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td><td class="px-6 py-4">¥ ${(financials.expense || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td><td class="px-6 py-4 font-semibold ${(financials.grossProfit || 0) < 0 ? 'text-red-600' : 'text-blue-600'}">¥ ${(financials.grossProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td><td class="px-6 py-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${rebateStatusColor}">${rebateStatus}</span></td><td class="px-6 py-4 text-center"><button data-id="${c.id}" class="toggle-details-btn p-1 rounded-md text-gray-500 hover:bg-gray-100"><svg class="w-5 h-5 rotate-icon ${openDetails.has(c.id) ? 'rotated' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button></td>`;
                const subRow = document.createElement('tr');
                subRow.className = `collapsible-row bg-gray-50/70 ${openDetails.has(c.id) ? 'expanded' : ''}`;
                subRow.dataset.id = c.id;
                const isEditingOrderType = editingOrderTypeId === c.id;
                let orderTypeHtml;
                if (isEditingOrderType) {
                    orderTypeHtml = `<select class="order-type-select table-select w-full"><option value="original" ${c.orderType === 'original' ? 'selected' : ''}>原价下单</option><option value="modified" ${c.orderType === 'modified' ? 'selected' : ''}>改价下单</option></select>`;
                } else {
                    orderTypeHtml = `<strong>${c.orderType === 'original' ? '原价下单' : '改价下单'}</strong><button class="edit-ordertype-btn p-1 rounded-md text-gray-500 hover:bg-gray-200 ml-2" data-id="${c.id}" title="修改下单方式" ${isReadOnly ? 'disabled' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></button>`;
                }
                const hasPending = pendingDateChanges[c.id];
                const dateInputStyles = "rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm w-36 text-right disabled:bg-gray-100 disabled:cursor-not-allowed";
                const discountValue = project.discount || '1';
                const discountInfo = allDiscounts.find(d => d.value === discountValue);
                const discountDisplayName = discountInfo ? discountInfo.name : `${(Number(discountValue) * 100).toFixed(2)}%`;
                subRow.innerHTML = `<td colspan="10" class="p-4 bg-gray-50 border-t"><div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm"><div class="space-y-2"><h4 class="font-semibold text-gray-800 mb-2 border-b pb-1">基础信息</h4><div class="flex justify-between items-center"><span>星图一口价:</span><span class="font-medium">¥ ${Number(c.amount || 0).toLocaleString()}</span></div><div class="flex justify-between items-center"><span>项目折扣:</span><span class="font-medium">${discountDisplayName}</span></div><div class="flex justify-between items-center"><span>返点率:</span><span class="font-medium">${c.rebate || 'N/A'}%</span></div><div class="flex justify-between items-center"><span>下单方式:</span><div class="flex items-center">${orderTypeHtml}</div></div><div class="flex justify-between items-center"><label class="font-medium">下单日期:</label><input type="date" class="date-input ${dateInputStyles}" data-type="orderDate" data-id="${c.id}" value="${hasPending?.orderDate ?? c.orderDate ?? ''}" ${isReadOnly ? 'disabled' : ''}></div><div class="flex justify-between items-center"><label class="font-medium">回款日期:</label><input type="date" class="date-input ${dateInputStyles}" data-type="paymentDate" data-id="${c.id}" value="${hasPending?.paymentDate ?? c.paymentDate ?? ''}" ${isReadOnly ? 'disabled' : ''}></div></div><div class="space-y-2"><h4 class="font-semibold text-gray-800 mb-2 border-b pb-1">财务明细</h4><div class="flex justify-between items-center"><span>收入 (执行价格):</span><span class="font-medium text-green-600">¥ ${(financials.income || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div><div class="flex justify-between items-center"><span>支出 (下单金额):</span><span class="font-medium text-red-600">¥ ${(financials.expense || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div><div class="flex justify-between items-center"><span>应收/实收返点:</span><span>¥ ${(financials.rebateReceivable || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} / ${c.actualRebate != null ? '¥ ' + Number(c.actualRebate).toLocaleString(undefined, {minimumFractionDigits: 2}) : 'N/A'}</span></div><div class="flex justify-between items-center"><span>资金占用费用:</span><span class="font-medium text-red-600">¥ ${(financials.fundsOccupationCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div><div class="flex justify-between items-center border-t pt-2 mt-1"><strong>下单毛利:</strong><strong class="${(financials.grossProfit || 0) < 0 ? 'text-red-600' : 'text-blue-600'}">¥ ${(financials.grossProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></div><div class="flex justify-between items-center"><strong>下单毛利率:</strong><strong class="${(financials.grossProfitMargin || 0) < 0 ? 'text-red-600' : 'text-green-600'}">${(financials.grossProfitMargin || 0).toFixed(2)}%</strong></div>${c.status === '视频已发布' && talentSource !== '机构达人' ? `<div class="text-right mt-4"><a href="rebate_management.html?from=order_list&projectId=${currentProjectId}" class="text-blue-600 hover:underline">前往返点管理 &rarr;</a></div>` : ''}</div></div><div class="mt-4 text-right ${hasPending || isEditingOrderType ? '' : 'hidden'}"><span class="text-sm text-yellow-700 mr-4">有未保存的更改</span><button class="save-dates-btn px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700" data-id="${c.id}">保存日期/更改</button></div></td>`;
                fragment.appendChild(mainRow);
                fragment.appendChild(subRow);
            });
            financialListBody.innerHTML = '';
            financialListBody.appendChild(fragment);
        }
        renderPagination(paginationControlsFinancial, 'financial', totalItems.financial);
        renderAdjustmentsSection(project, isReadOnly);
    }
    
    function renderAdjustmentsSection(project, isReadOnly) {
        if(!adjustmentsListBody) return;
        adjustmentsListBody.innerHTML = '';
        if(addAdjustmentBtn) addAdjustmentBtn.style.display = isReadOnly ? 'none' : 'flex';
        (project.adjustments || []).forEach(adj => {
            const amount = Number(adj.amount) || 0;
            const row = document.createElement('tr');
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4">${adj.date || ''}</td><td class="px-6 py-4">${adj.type || '未分类'}</td><td class="px-6 py-4">${adj.description || ''}</td><td class="px-6 py-4 font-medium ${amount > 0 ? 'text-green-600' : 'text-red-600'}">${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td><td class="px-6 py-4 text-center"><button data-id="${adj.id}" class="edit-adjustment-btn font-medium text-blue-600 hover:underline mr-2" ${isReadOnly ? 'disabled' : ''}>编辑</button><button data-id="${adj.id}" class="delete-adjustment-btn font-medium text-red-600 hover:underline" ${isReadOnly ? 'disabled' : ''}>删除</button></td>`;
            adjustmentsListBody.appendChild(row);
        });
    }

    function renderPagination(container, pageKey, totalItems) {
        if(!container) return;
        container.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return;

        let buttons = '';
        for (let i = 1; i <= totalPages; i++) {
             buttons += `<button class="pagination-btn ${i === currentPage[pageKey] ? 'active' : ''}" data-page-key="${pageKey}" data-page="${i}">${i}</button>`;
        }
        
        const perPageSelector = container.id.includes('basic') ? `<div class="flex items-center text-sm"><span>每页:</span><select id="items-per-page" class="ml-2 rounded-md border-gray-300"><option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option><option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option></select></div>` : '<div></div>';
        container.innerHTML = `${perPageSelector}<div class="flex items-center gap-2"><button class="pagination-btn prev-page-btn" data-page-key="${pageKey}" ${currentPage[pageKey] === 1 ? 'disabled' : ''}>&lt;</button>${buttons}<button class="pagination-btn next-page-btn" data-page-key="${pageKey}" ${currentPage[pageKey] === totalPages ? 'disabled' : ''}>&gt;</button></div>`;
    }
    
    async function loadEffectDashboardData() {
        if(effectDashboardLoading) effectDashboardLoading.classList.remove('hidden');
        if(effectDashboardError) effectDashboardError.classList.add('hidden');
        if(effectDashboardContent) effectDashboardContent.classList.add('hidden');
        try {
            const response = await apiRequest(PERFORMANCE_API_ENDPOINT, 'POST', { projectId: currentProjectId });
            effectDashboardData = response;
            renderEffectDashboard(effectDashboardData);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            if(effectDashboardLoading) effectDashboardLoading.classList.add('hidden');
            if(effectDashboardError) effectDashboardError.classList.remove('hidden');
        }
    }

    function renderEffectDashboard(data) {
        if(effectDashboardLoading) effectDashboardLoading.classList.add('hidden');
        if(effectDashboardContent) effectDashboardContent.classList.remove('hidden');
        const { overall = {}, talents = [] } = data;
        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatPercent = (num) => (num === null || num === undefined) ? notEnteredSpan : `${(Number(num) * 100).toFixed(2)}%`;
        const formatDate = (dateStr) => (dateStr) ? new Date(dateStr).toLocaleDateString() : 'N/A';
        const t7ReviewDateEl = document.getElementById('eff-t7-review-date');
        if (t7ReviewDateEl) {
            const lastPublishDate = talents
                .filter(t => t.publishDate)
                .map(t => new Date(t.publishDate))
                .sort((a, b) => b - a)[0]; 

            if (lastPublishDate) {
                const reviewDate = new Date(lastPublishDate);
                reviewDate.setDate(reviewDate.getDate() + 7);
                t7ReviewDateEl.textContent = reviewDate.toLocaleDateString();
            } else {
                t7ReviewDateEl.textContent = 'N/A';
            }
        }

        const isT21DataAvailable = overall.t21_totalViews !== null && overall.t21_totalViews !== undefined;
        if(effDeliveryDate) effDeliveryDate.textContent = `[${overall.deliveryDate || 'N/A'}]`;
        if(effBenchmarkCpm) effBenchmarkCpm.innerHTML = formatCurrency(overall.benchmarkCPM);
        if (isT21DataAvailable) {
            const currentViews = overall.t21_totalViews;
            const targetViews = overall.targetViews;
            if(effProgressSummary) effProgressSummary.innerHTML = `当前 <span class="font-bold">${currentViews.toLocaleString()}</span> / 目标 <span class="font-bold">${(targetViews || 0).toLocaleString()}</span>`;
            const progress = (targetViews && targetViews > 0) ? (currentViews / targetViews) * 100 : 0;
            const progressPercent = Math.min(progress, 100).toFixed(0);
            if(effProgressBar) { effProgressBar.style.width = `${progressPercent}%`; effProgressBar.textContent = `${progressPercent}%`; }
            const gap = overall.viewsGap;
            if(effViewsGap) effViewsGap.innerHTML = `GAP: <span class="font-bold ${gap >= 0 ? 'text-green-600' : 'text-red-500'}">${Number(gap || 0).toLocaleString()}</span>`;
            if(effT21Views) effT21Views.innerHTML = `[${formatNumber(currentViews)}]`;
            if(effT21Cpm) effT21Cpm.innerHTML = formatCurrency(overall.t21_cpm);
            if(effTargetViews) effTargetViews.innerHTML = `[${formatNumber(targetViews)}]`;
        } else {
            if(effProgressSummary) effProgressSummary.innerHTML = `当前 ${notEnteredSpan} / 目标 ${notEnteredSpan}`;
            if(effProgressBar) { effProgressBar.style.width = '0%'; effProgressBar.textContent = '0%'; }
            if(effViewsGap) effViewsGap.innerHTML = `GAP: ${notEnteredSpan}`;
            if(effT21Views) effT21Views.innerHTML = `[${notEnteredSpan}]`;
            if(effT21Cpm) effT21Cpm.innerHTML = notEnteredSpan;
            if(effTargetViews) effTargetViews.innerHTML = `[${notEnteredSpan}]`;
        }
        if(effT7Views) effT7Views.innerHTML = `[${formatNumber(overall.t7_totalViews)}]`;
        if(effT7Interactions) effT7Interactions.innerHTML = `[${formatNumber(overall.t7_totalInteractions)}]`;
        if(effT7Cpm) effT7Cpm.innerHTML = formatCurrency(overall.t7_cpm);
        if(effT7Cpe) effT7Cpe.innerHTML = formatCurrency(overall.t7_cpe);
        if(effT7Ctr) effT7Ctr.innerHTML = formatPercent(overall.t7_ctr);
        if(effectTalentListBody) {
            effectTalentListBody.innerHTML = '';
            if (talents.length > 0) {
                talents.forEach(talent => {
                    const mainRow = document.createElement('tr');
                    mainRow.className = 'bg-white border-b hover:bg-gray-50/50';
                    mainRow.innerHTML = `<td class="px-4 py-4 font-medium text-gray-900">${talent.talentName}</td><td class="px-4 py-4">${formatCurrency(talent.executionAmount)}</td><td class="px-4 py-4">${formatDate(talent.publishDate)}</td><td class="px-4 py-3 font-medium border-l">${formatNumber(talent.t21_views)}</td><td class="px-4 py-3 font-medium">${formatCurrency(talent.t21_cpm)}</td><td class="px-4 py-3 font-medium border-l">${formatNumber(talent.t7_views)}</td><td class="px-4 py-3 font-medium">${formatNumber(talent.t7_interactions)}</td><td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpm)}</td><td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpe)}</td><td class="px-4 py-3 font-medium">${formatPercent(talent.t7_ctr)}</td><td class="px-4 py-3 font-medium">${formatPercent(talent.t7_completionRate)}</td><td class="px-4 py-3 font-medium">${formatNumber(talent.t7_totalReach)}</td>`;
                    const interactionDetailRow = document.createElement('tr');
                    interactionDetailRow.className = 'detail-row interaction-detail-row bg-gray-100';
                    interactionDetailRow.innerHTML = `<td colspan="12" class="px-6 py-3 text-xs"><div class="grid grid-cols-5 gap-4 text-center"><div><span class="font-semibold text-gray-500">点赞量:</span> ${formatNumber(talent.t7_likes)}</div><div><span class="font-semibold text-gray-500">评论量:</span> ${formatNumber(talent.t7_comments)}</div><div><span class="font-semibold text-gray-500">分享量:</span> ${formatNumber(talent.t7_shares)}</div><div><span class="font-semibold text-gray-500">互动率:</span> ${formatPercent(talent.t7_interactionRate)}</div><div><span class="font-semibold text-gray-500">赞播比:</span> ${formatPercent(talent.t7_likeToViewRatio)}</div></div></td>`;
                    const componentDetailRow = document.createElement('tr');
                    componentDetailRow.className = 'detail-row component-detail-row bg-gray-100';
                    componentDetailRow.innerHTML = `<td colspan="12" class="px-6 py-3 text-xs"><div class="grid grid-cols-2 gap-4 text-center"><div><span class="font-semibold text-gray-500">组件展示量:</span> ${formatNumber(talent.t7_componentImpressions)}</div><div><span class="font-semibold text-gray-500">组件点击量:</span> ${formatNumber(talent.t7_componentClicks)}</div></div></td>`;
                    effectTalentListBody.appendChild(mainRow);
                    effectTalentListBody.appendChild(interactionDetailRow);
                    effectTalentListBody.appendChild(componentDetailRow);
                });
            } else {
                effectTalentListBody.innerHTML = `<tr><td colspan="12" class="text-center py-8 text-gray-500">暂无达人效果数据</td></tr>`;
            }
        }
    }
    
    // --- Event Listeners & Handlers ---
    function setupEventListeners() {
        if (dashboardTabs) {
            dashboardTabs.addEventListener('click', (e) => {
                const tabButton = e.target.closest('.tab-btn');
                if (tabButton && !tabButton.classList.contains('active')) {
                    dashboardTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    tabButton.classList.add('active');
                    document.querySelectorAll('#dashboard-tab-content > .tab-pane').forEach(pane => pane.classList.add('hidden'));
                    const targetPane = document.getElementById(tabButton.dataset.tabTarget);
                    if(targetPane) targetPane.classList.remove('hidden');
                }
            });
        }
        if (mainTabs) {
            mainTabs.addEventListener('click', async (e) => {
                const tabButton = e.target.closest('.tab-btn');
                if (tabButton && !tabButton.classList.contains('active')) {
                    mainTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    tabButton.classList.add('active');
                    await switchTabAndLoadData(); 
                }
            });
        }
        const mainContentContainer = document.querySelector('.container.mx-auto');
        if (mainContentContainer) {
            mainContentContainer.addEventListener('click', handleMainContentClick);
            mainContentContainer.addEventListener('change', handleMainContentChange);
        }
        if (projectFilesContainer) {
            projectFilesContainer.addEventListener('click', async (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                if (target.id === 'upload-file-btn') { if (projectFileInput) projectFileInput.click(); } 
                else if (target.classList.contains('view-file-btn')) {
                    const proxyUrl = target.dataset.url;
                    const fileName = target.dataset.name;
                    if (proxyUrl && proxyUrl !== '#') {
                        if (previewModalTitle) previewModalTitle.textContent = `预览: ${fileName}`;
                        if (previewModalIframe) previewModalIframe.src = proxyUrl;
                        if (filePreviewModal) filePreviewModal.classList.remove('hidden');
                    } else { showCustomAlert('无效的文件链接，无法预览。'); }
                } else if (target.classList.contains('delete-file-btn')) {
                    const fileUrl = target.dataset.url;
                    if (fileUrl) { handleDeleteProjectFile(fileUrl); }
                }
            });
        }
        if (projectFileInput) projectFileInput.addEventListener('change', (e) => handleProjectFileUpload(e.target.files));
        if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', () => {
            if(filePreviewModal) filePreviewModal.classList.add('hidden');
            if(previewModalIframe) previewModalIframe.src = 'about:blank';
        });
        if (batchActionSelect) {
            batchActionSelect.addEventListener('change', () => {
                if (batchDateInput) batchDateInput.classList.toggle('hidden', !batchActionSelect.value);
                if (executeBatchBtn) executeBatchBtn.disabled = !batchActionSelect.value;
            });
        }
        if (executeBatchBtn) executeBatchBtn.addEventListener('click', handleBatchAction);
        if (selectAllFinancialCheckbox) {
            selectAllFinancialCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('.collaborator-checkbox-financial:not(:disabled)').forEach(cb => cb.checked = e.target.checked);
            });
        }
        if (closeAdjustmentModalBtn) closeAdjustmentModalBtn.addEventListener('click', () => adjustmentModal.classList.add('hidden'));
        if (adjustmentForm) adjustmentForm.addEventListener('submit', handleAdjustmentSubmit);
        [paginationControlsBasic, paginationControlsPerformance, paginationControlsFinancial].forEach(container => {
            if(container) {
                container.addEventListener('click', (e) => {
                    const button = e.target.closest('button.pagination-btn');
                    if (button) handlePaginationClick(button.dataset.pageKey, e);
                });
            }
        });
        if (paginationControlsBasic) {
            paginationControlsBasic.addEventListener('change', async (e) => {
                if (e.target.id === 'items-per-page') {
                    itemsPerPage = Number(e.target.value);
                    currentPage = { basic: 1, performance: 1, financial: 1 };
                    await switchTabAndLoadData();
                }
            });
        }
        document.addEventListener('projectDataLoaded', () => renderHeaderAndDashboard(project));
        const effectDashboard = document.getElementById('effect-dashboard');
        if (effectDashboard) {
            effectDashboard.addEventListener('click', (e) => {
                const toggleBtn = e.target.closest('.details-toggle-btn');
                if (toggleBtn) {
                    const targetType = toggleBtn.dataset.target;
                    effectDetailsToggle[targetType] = !effectDetailsToggle[targetType];
                    toggleBtn.querySelector('.details-toggle-icon').classList.toggle('rotated', effectDetailsToggle[targetType]);
                    document.querySelectorAll(`.${targetType}-detail-row`).forEach(row => {
                        row.style.display = effectDetailsToggle[targetType] ? 'table-row' : 'none';
                    });
                }
            });
        }
    }
    
    // --- REVISED AND FIXED FUNCTION ---
    function handleMainContentClick(e) {
        const button = e.target.closest('button');
        const editableCell = e.target.closest('.editable-cell');

        if (button?.classList.contains('inline-edit-date-btn')) {
            const collabId = button.dataset.id;
            const state = button.dataset.state;
            if (state === 'edit') {
                editingDateId = collabId;
                renderBasicInfoTab(paginatedData.basic, project);
            } else if (state === 'save') {
                handleSavePlannedDate(collabId);
            }
            return; 
        }

        // --- FIX 1: Prevent cell edit mode when clicking on a button inside it ---
        // This condition now correctly checks if the click was on the cell itself, and not on a button within it.
        if (editableCell && !e.target.closest('button')) {
            const isReadOnly = project.status !== '执行中';
            if (isReadOnly) return;
            const collabId = editableCell.dataset.id;
            const fieldName = editableCell.dataset.field;
            const cellKey = `${collabId}_${fieldName}`;
            if (!editingPerformanceCells.has(cellKey)) {
                editingPerformanceCells.add(cellKey);
                dirtyPerformanceRows.add(collabId);
                renderDataPerformanceTab(paginatedData.performance, project);
            }
            return;
        }

        if (!button) return;
        const collabId = button.dataset.id;

        // --- FIX 2 & 3: Correctly handle button clicks that were previously ignored ---
        if (button.classList.contains('copy-btn')) {
            const cell = button.closest('td');
            // Corrected value retrieval
            const fullValue = cell.querySelector('.editable-cell')?.title.replace('点击编辑: ', '');
            if (fullValue) {
                // Use document.execCommand for better compatibility in iframe environments
                const textArea = document.createElement("textarea");
                textArea.value = fullValue;
                textArea.style.position = 'fixed';
                textArea.style.top = '-9999px';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showCustomAlert('已复制到剪贴板');
                } catch (err) {
                    showCustomAlert('复制失败。');
                }
                document.body.removeChild(textArea);
            }
        } else if (button.classList.contains('open-link-btn')) {
            const cell = button.closest('td');
            // Corrected value retrieval
            const url = cell.querySelector('.editable-cell')?.title.replace('点击编辑: ', '');
            if(url) window.open(url, '_blank');
        } else if (button.classList.contains('open-video-btn')) {
            const cell = button.closest('td');
            // Corrected value retrieval
            const videoId = cell.querySelector('.editable-cell')?.title.replace('点击编辑: ', '');
            if(videoId) window.open(`https://www.douyin.com/video/${videoId}`, '_blank');
        } else if (button.classList.contains('toggle-details-btn')) {
            openDetails.has(collabId) ? openDetails.delete(collabId) : openDetails.add(collabId);
            renderPage();
        } else if (button.classList.contains('delete-btn') && !button.disabled) {
            handleDeleteCollaboration(collabId);
        } else if (button.classList.contains('save-performance-btn')) {
            handleSavePerformance(collabId);
        } else if (button.classList.contains('save-dates-btn')) {
            handleDateSave(collabId);
        } else if (button.classList.contains('edit-ordertype-btn')) {
            editingOrderTypeId = collabId;
            renderPage();
        } else if (button.classList.contains('fix-status-btn')) {
            handleFixStatus(collabId);
        } else if (button.classList.contains('view-history-btn')) { 
            handleViewHistory(button.dataset.talentId, button.dataset.talentName);
        } else if (button.id === 'add-adjustment-btn') {
            openAdjustmentModal();
        } else if (button.matches('.edit-adjustment-btn:not(:disabled)')) {
            openAdjustmentModal(button.dataset.id);
        } else if (button.matches('.delete-adjustment-btn:not(:disabled)')) {
            handleDeleteAdjustment(button.dataset.id);
        }
    }

    function handleMainContentChange(e) {
        const target = e.target;
        if (target.matches('.status-select')) {
             handleStatusChange(target.dataset.id, target.value);
        } else if (target.matches('.date-input')) {
            const collabId = target.dataset.id;
            if (!pendingDateChanges[collabId]) pendingDateChanges[collabId] = {};
            pendingDateChanges[collabId][target.dataset.type] = target.value;
            const subRow = financialListBody.querySelector(`.collapsible-row[data-id="${collabId}"]`);
            if(subRow) subRow.querySelector('.save-dates-btn').parentElement.classList.remove('hidden');
        } else if (target.matches('.publish-date-input') || target.matches('.performance-input')) {
            const collabId = target.closest('tr').dataset.id;
            dirtyPerformanceRows.add(collabId);
            const saveBtn = document.querySelector(`.save-performance-btn[data-id="${collabId}"]`);
            if(saveBtn) saveBtn.disabled = false;
        }
    }
    
    async function handleViewHistory(talentId, talentName) {
        if (!talentId) return;
        const historyModal = document.createElement('div');
        historyModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-center justify-center p-4';
        historyModal.innerHTML = `
            <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-900" id="history-modal-title"></h3>
                    <button id="history-modal-close-btn" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div id="history-modal-body" class="max-h-[60vh] overflow-y-auto"></div>
            </div>`;
        document.body.appendChild(historyModal);
        const historyModalTitle = historyModal.querySelector('#history-modal-title');
        const historyModalBody = historyModal.querySelector('#history-modal-body');
        const closeModalBtn = historyModal.querySelector('#history-modal-close-btn');
        
        closeModalBtn.onclick = () => historyModal.remove();
        historyModal.onclick = (e) => { if (e.target === historyModal) historyModal.remove(); };

        historyModalTitle.textContent = `达人“${talentName}”的过往合作`;
        historyModalBody.innerHTML = '<p class="text-center text-gray-500">正在加载历史记录...</p>';

        try {
            const response = await apiRequest(HISTORY_API_ENDPOINT, 'GET', { 
                talentId: talentId, 
                excludeProjectId: currentProjectId 
            });
            if (response.success && response.data.length > 0) {
                const historyHtml = response.data.map(item => `
                    <div class="grid grid-cols-4 gap-4 text-sm py-2 border-b last:border-b-0">
                        <div class="font-medium text-gray-800 truncate" title="${item.projectName}">${item.projectName || 'N/A'}</div>
                        <div class="text-gray-600">${item.projectYear || ''}年${item.projectMonth || ''}月</div>
                        <div class="text-gray-600">¥ ${Number(item.amount || 0).toLocaleString()}</div>
                        <div><span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-800">${item.status}</span></div>
                    </div>
                `).join('');
                historyModalBody.innerHTML = `
                    <div class="grid grid-cols-4 gap-4 text-xs font-bold text-gray-500 uppercase px-0 py-2 border-b">
                        <div>项目名称</div>
                        <div>项目月份</div>
                        <div>合作金额</div>
                        <div>最终状态</div>
                    </div>
                    ${historyHtml}`;
            } else {
                historyModalBody.innerHTML = '<p class="text-center text-gray-500">未找到该达人的其他合作历史。</p>';
            }
        } catch (error) {
            historyModalBody.innerHTML = '<p class="text-center text-red-500">加载历史记录失败，请稍后重试。</p>';
        }
    }

    async function handleProjectFileUpload(files) {
        const currentFiles = project.projectFiles || [];
        if (currentFiles.length + files.length > 5) { showCustomAlert('最多只能上传5个文件。'); return; }
        const loadingAlert = showLoadingAlert('正在上传文件...');
        try {
            const uploadPromises = Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const response = await apiRequest('/upload-file', 'POST', { fileName: file.name, fileData: e.target.result });
                            resolve({ name: file.name, url: response.data.url });
                        } catch (err) { reject(err); }
                    };
                    reader.readAsDataURL(file);
                });
            });
            const newFiles = await Promise.all(uploadPromises);
            await apiRequest('/update-project', 'PUT', { id: currentProjectId, projectFiles: [...currentFiles, ...newFiles] });
            await loadInitialData();
        } catch (error) {
            showCustomAlert('文件上传失败。');
        } finally {
            loadingAlert.close();
        }
    }
    
    async function handleDeleteProjectFile(fileUrl) {
        showCustomConfirm('您确定要删除这个文件吗？<br><span class="text-xs text-red-500">此操作将从服务器永久删除文件，无法撤销。</span>', '确认删除', async (confirmed) => {
            if (confirmed) {
                const loadingAlert = showLoadingAlert('正在删除...');
                try {
                    await apiRequest('/delete-file', 'POST', { projectId: currentProjectId, fileUrl: fileUrl });
                    loadingAlert.close();
                    showCustomAlert('文件删除成功！', '操作成功', async () => {
                        await loadInitialData();
                    });
                } catch (error) {
                    loadingAlert.close();
                }
            }
        });
    }

    async function handleDeleteCollaboration(collabId) {
        showCustomConfirm('您确定要移除该达人吗？此操作不可撤销。', '确认移除', async (confirmed) => {
            if (confirmed) {
                const loadingAlert = showLoadingAlert('正在移除合作记录...');
                try {
                    await apiRequest('/delete-collaboration', 'DELETE', { collaborationId: collabId });
                    loadingAlert.close();
                    showCustomAlert('移除成功！', '操作成功', async () => {
                        await loadInitialData();
                    });
                } catch (error) {
                    loadingAlert.close();
                    console.error("删除合作时出错:", error);
                }
            }
        });
    }
    
    async function handleStatusChange(collabId, newStatus) {
        if (newStatus === '客户已定档') {
            const collab = paginatedData.basic.find(c => c.id === collabId);
            if (!collab || !collab.plannedReleaseDate) {
                showCustomAlert('请先为该合作指定一个计划发布日期，才能将其状态设置为“客户已定档”。');
                const selectElement = document.querySelector(`.status-select[data-id="${collabId}"]`);
                if(selectElement && collab) selectElement.value = collab.status;
                return;
            }
        }
        await apiRequest('/update-collaboration', 'PUT', { id: collabId, status: newStatus });
        await switchTabAndLoadData();
    }
    
    async function handleSavePlannedDate(collabId) {
        const dateInput = document.getElementById(`planned-date-input-${collabId}`);
        if (!dateInput) return;
        
        const newDate = dateInput.value;
        const loadingAlert = showLoadingAlert('正在保存档期...');
        try {
            await apiRequest('/update-collaboration', 'PUT', {
                id: collabId,
                plannedReleaseDate: newDate || null
            });
            
            const collabInBasic = paginatedData.basic.find(c => c.id === collabId);
            if(collabInBasic) collabInBasic.plannedReleaseDate = newDate || null;
            
            editingDateId = null; 
            loadingAlert.close();
            showCustomAlert('合作档期更新成功！');
            renderBasicInfoTab(paginatedData.basic, project); 
        } catch (error) {
            loadingAlert.close();
            showCustomAlert('保存失败，请重试。');
        }
    }

    async function handleFixStatus(collabId) {
        await apiRequest('/update-collaboration', 'PUT', { id: collabId, status: '客户已定档' });
        await switchTabAndLoadData();
    }

    async function handleDateSave(collabId) {
        const payload = { id: collabId, ...pendingDateChanges[collabId] };
        const subRow = financialListBody.querySelector(`.collapsible-row[data-id="${collabId}"]`);
        const orderTypeSelect = subRow?.querySelector('.order-type-select');
        if (orderTypeSelect) payload.orderType = orderTypeSelect.value;
        await apiRequest('/update-collaboration', 'PUT', payload);
        delete pendingDateChanges[collabId];
        editingOrderTypeId = null;
        await switchTabAndLoadData();
    }

    async function handleSavePerformance(collabId) {
        const row = dataPerformanceListBody.querySelector(`tr[data-id="${collabId}"]`);
        if (!row) return;

        const currentCollaborator = paginatedData.performance.find(c => c.id === collabId);
        if(!currentCollaborator) return;
        
        const payload = { 
            id: collabId,
            publishDate: row.querySelector('.publish-date-input')?.value.trim() || null,
            contentFile: row.querySelector('input[data-field="contentFile"]')?.value ?? currentCollaborator.contentFile,
            taskId: row.querySelector('input[data-field="taskId"]')?.value ?? currentCollaborator.taskId,
            videoId: row.querySelector('input[data-field="videoId"]')?.value ?? currentCollaborator.videoId,
        };

        let statusChangeMessage = '';
        if (payload.publishDate && currentCollaborator.status !== '视频已发布') {
            payload.status = '视频已发布';
            statusChangeMessage = '<br><br><b>请注意：</b>录入发布日期后，该合作状态将自动更新为 <b>[视频已发布]</b>。';
        } else if (!payload.publishDate && currentCollaborator.status === '视频已发布') {
            payload.status = '客户已定档';
            statusChangeMessage = '<br><br><b>请注意：</b>清空发布日期后，该合作状态将自动回滚至 <b>[客户已定档]</b>。';
        }

        showCustomConfirm(`您确定要保存这些更改吗？${statusChangeMessage}`, '确认保存', async (confirmed) => {
            if (confirmed) {
                const loadingAlert = showLoadingAlert('正在保存...');
                try {
                    await apiRequest('/update-collaboration', 'PUT', payload);
                    dirtyPerformanceRows.delete(collabId);
                    for (const key of ['contentFile', 'taskId', 'videoId']) {
                        editingPerformanceCells.delete(`${collabId}_${key}`);
                    }
                    await loadCollaborators('performance');
                    loadingAlert.close();
                    showCustomAlert('保存成功！');
                } catch (error) {
                    loadingAlert.close();
                }
            }
        });
    }

    async function handleBatchAction() {
        if(project.status === '已终结') return;
        const selectedAction = batchActionSelect.value;
        const batchDate = batchDateInput.value;
        const selectedIds = Array.from(document.querySelectorAll('.collaborator-checkbox-financial:checked')).map(cb => cb.dataset.id);

        if (!selectedAction || !batchDate || selectedIds.length === 0) {
            showCustomAlert('请选择操作、日期并至少勾选一位达人。');
            return;
        }

        showCustomConfirm(`确定要为 ${selectedIds.length} 位达人批量录入日期吗？`, '批量操作确认', async (confirmed) => {
            if (confirmed) {
                const loadingAlert = showLoadingAlert(`正在为 ${selectedIds.length} 位达人批量更新...`);
                try {
                    const updatePromises = selectedIds.map(id => {
                        const payload = { id: id, [selectedAction === 'setOrderDate' ? 'orderDate' : 'paymentDate']: batchDate };
                        return apiRequest('/update-collaboration', 'PUT', payload);
                    });
                    await Promise.all(updatePromises);
                    await switchTabAndLoadData();
                    loadingAlert.close();
                    showCustomAlert('批量更新成功！');
                } catch (error) {
                    loadingAlert.close();
                }
            }
        });
    }

    function openAdjustmentModal(adjId = null) {
        if(!adjustmentForm) return;
        adjustmentForm.reset();
        adjustmentTypeSelect.innerHTML = adjustmentTypes.map(type => `<option value="${type}">${type}</option>`).join('');
        editingAdjustmentIdInput.value = '';
        if (adjId) {
            const adjToEdit = project.adjustments.find(a => a.id === adjId);
            if (adjToEdit) {
                adjustmentModalTitle.textContent = '编辑调整项';
                editingAdjustmentIdInput.value = adjId;
                document.getElementById('adjustment-date').value = adjToEdit.date;
                adjustmentTypeSelect.value = adjToEdit.type;
                document.getElementById('adjustment-desc').value = adjToEdit.description;
                document.getElementById('adjustment-amount').value = adjToEdit.amount;
            }
        } else {
            adjustmentModalTitle.textContent = '添加调整项';
        }
        adjustmentModal.classList.remove('hidden');
    }

    async function handleAdjustmentSubmit(e) {
        e.preventDefault();
        if (project.status === '已终结') return;
        const date = document.getElementById('adjustment-date').value;
        const type = adjustmentTypeSelect.value;
        const desc = document.getElementById('adjustment-desc').value.trim();
        const amount = parseFloat(document.getElementById('adjustment-amount').value);
        const editingId = editingAdjustmentIdInput.value;
        if (!date || !type || !desc || isNaN(amount)) { showCustomAlert('请填写所有必填项。'); return; }
        if (!project.adjustments) project.adjustments = [];
        if (editingId) {
            const adjIndex = project.adjustments.findIndex(a => a.id === editingId);
            if (adjIndex > -1) project.adjustments[adjIndex] = { ...project.adjustments[adjIndex], date, type, description: desc, amount };
        } else {
            project.adjustments.push({ id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, date, type, description: desc, amount });
        }
        await apiRequest('/update-project', 'PUT', { id: currentProjectId, adjustments: project.adjustments });
        await loadInitialData();
        adjustmentModal.classList.add('hidden');
    }
    
    async function handleDeleteAdjustment(adjId) {
         showCustomConfirm('确定要删除此条调整记录吗？', '确认删除', async (confirmed) => {
            if(confirmed) {
                const updatedAdjustments = project.adjustments.filter(adj => adj.id !== adjId);
                await apiRequest('/update-project', 'PUT', { id: currentProjectId, adjustments: updatedAdjustments });
                await loadInitialData();
            }
        });
    }

    async function handlePaginationClick(pageKey, e) {
        const target = e.target.closest('button.pagination-btn');
        if (!target || target.disabled || !pageKey) return;

        const totalPages = Math.ceil(totalItems[pageKey] / itemsPerPage);
        let newPage = currentPage[pageKey];

        if (target.classList.contains('prev-page-btn')) { newPage--; } 
        else if (target.classList.contains('next-page-btn')) { newPage++; } 
        else if (target.dataset.page) { newPage = Number(target.dataset.page); }
        
        newPage = Math.max(1, Math.min(newPage, totalPages));

        if (newPage !== currentPage[pageKey]) {
            currentPage[pageKey] = newPage;
            await loadCollaborators(pageKey);
        }
    }
    
    initializePage();
});
