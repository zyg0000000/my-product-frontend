/**
 * @file order_list_page.js (Refactored from order_list.js v28.4 - Bracket Fix Attempt)
 * @description Main logic for the order_list.html page, using ES Modules.
 * Handles UI rendering, event handling, and coordination of service calls for the order list page.
 * Includes unified width for status capsules and plus/minus icons for details toggle.
 */

// --- Imports ---
import { API_PATHS, MANUAL_STATUS_OPTIONS, ITEMS_PER_PAGE_DEFAULT, ITEMS_PER_PAGE_KEY } from '../utils/constants.js';
import { formatDate, formatCurrency, formatPercent, copyToClipboard } from '../utils/helpers.js';
import { showCustomAlert, showCustomConfirm, showLoadingAlert } from '../components/modal.js';
import { renderPagination } from '../components/pagination.js';
import { getStatusCapsuleHtml } from '../components/statusCapsule.js';
import { apiRequest } from '../services/api.js';
import {
    loadProjectDetails,
    loadConfiguration,
    uploadProjectFiles,
    deleteProjectFile,
    saveAdjustment,
    deleteAdjustment,
    updateProjectStatus,
    loadEffectDashboardData
} from '../services/projectService.js';
import {
    loadCollaborators,
    deleteCollaboration,
    updateCollaborationStatus,
    savePlannedDate,
    savePerformanceData,
    saveFinancialDatesAndType,
    executeBatchDateUpdate,
    getTalentHistory
} from '../services/collaborationService.js';

// --- DOM Elements ---
const projectNameDisplay = document.getElementById('project-name-display');
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
const statusFilterContainer = document.getElementById('basic-info-filter-container');
const statusFilterButton = document.getElementById('status-filter-button');
const statusFilterDropdown = document.getElementById('status-filter-dropdown');
const statusFilterOptions = document.getElementById('status-filter-options');
const applyStatusFilterBtn = document.getElementById('apply-status-filter-btn');

// --- State ---
let currentProjectId = null;
let project = {};
let paginatedData = { basic: [], performance: [], financial: [] };
let totalItems = { basic: 0, performance: 0, financial: 0 };
let allDiscounts = [];
let adjustmentTypes = [];
let currentPage = { basic: 1, performance: 1, financial: 1 };
let itemsPerPage = ITEMS_PER_PAGE_DEFAULT;
let openDetails = new Set();
let pendingDateChanges = {};
let editingOrderTypeId = null;
let effectDetailsToggle = { interaction: false, component: false };
let effectDashboardData = null;
let editingDateId = null;
let editingPerformanceRowId = null;
let solutionSaveTimer = null;

// Wrap all code inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {

    // --- Data Loading Logic ---
    async function initializePage() {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId');
        if (!currentProjectId) {
            if (projectNameDisplay) projectNameDisplay.textContent = '错误：缺少项目ID';
            document.body.innerHTML = '<h1>错误：缺少项目ID</h1>';
            return;
        }
        itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || ITEMS_PER_PAGE_DEFAULT.toString());

        await loadInitialData();
        setupEventListeners();
    }

    async function loadInitialData() {
        let loadingAlert = null;
        try {
            loadingAlert = showLoadingAlert('正在加载项目核心数据...');
            const [projectResponse, discountsData, adjTypesData] = await Promise.all([
                loadProjectDetails(currentProjectId),
                loadConfiguration('FRAMEWORK_DISCOUNTS'),
                loadConfiguration('ADJUSTMENT_TYPES')
            ]);

            project = projectResponse || {};
            allDiscounts = discountsData || [];
            adjustmentTypes = adjTypesData || [];
            effectDashboardData = null;

            renderHeaderAndDashboard(project);
            renderStatusGuidance(project);
            renderProjectFiles(project);
            updateAddButtonsState(project);

            loadingAlert.close();
            await switchTabAndLoadData();

        } catch (error) {
            if (loadingAlert) loadingAlert.close();
            if (projectNameDisplay) projectNameDisplay.textContent = '数据加载失败';
            showCustomAlert(`加载初始数据失败: ${error.message}`, '错误');
        }
    }

    async function loadAndRenderCollaborators(pageKey, statuses = '') {
        setLoadingState(true, pageKey);
        try {
            const { data, total } = await loadCollaborators(
                currentProjectId,
                currentPage[pageKey],
                itemsPerPage,
                statuses
            );

            paginatedData[pageKey] = data;
            totalItems[pageKey] = total;

            switch (pageKey) {
                case 'basic': renderBasicInfoTab(paginatedData.basic, project); break;
                case 'performance': renderDataPerformanceTab(paginatedData.performance, project); break;
                case 'financial': renderFinancialTab(paginatedData.financial, project); break;
            }
            const paginationContainer = pageKey === 'basic' ? paginationControlsBasic : (pageKey === 'performance' ? paginationControlsPerformance : paginationControlsFinancial);
            renderPagination(paginationContainer, pageKey, totalItems[pageKey], currentPage[pageKey], itemsPerPage);

        } catch (error) {
            console.error(`加载 ${pageKey} 数据失败:`, error);
            const errorBody = pageKey === 'basic' ? collaboratorListBody : (pageKey === 'performance' ? dataPerformanceListBody : financialListBody);
            if (errorBody) {
                 const colspan = pageKey === 'performance' ? 8 : 10;
                 errorBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-12 text-red-500">加载数据失败</td></tr>`;
            }
             const paginationContainer = pageKey === 'basic' ? paginationControlsBasic : (pageKey === 'performance' ? paginationControlsPerformance : paginationControlsFinancial);
             if (paginationContainer) paginationContainer.innerHTML = '';

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
        if (targetPane) targetPane.classList.remove('hidden');

        if (statusFilterContainer) {
            statusFilterContainer.style.display = (activeTab === 'basic-info') ? 'block' : 'none';
        }

        let pageKey;
        if (activeTab === 'basic-info') pageKey = 'basic';
        else if (activeTab === 'data-performance') pageKey = 'performance';
        else if (activeTab === 'financial-info') pageKey = 'financial';
        else if (activeTab === 'effect-dashboard') pageKey = 'effect';
        else return;

        editingPerformanceRowId = null;

        if (activeTab === 'effect-dashboard') {
            if (!effectDashboardData) {
                const loading = showLoadingAlert('正在加载效果看板数据...');
                try {
                    effectDashboardData = await loadEffectDashboardData(currentProjectId);
                    renderEffectDashboard(effectDashboardData);
                } catch(e) { /* Error handled */ }
                finally { loading.close(); }
            } else {
                 renderEffectDashboard(effectDashboardData);
            }
        } else {
            let selectedStatuses = '';
            if (statusFilterContainer && statusFilterContainer.style.display !== 'none') {
                 const selectedCheckboxes = statusFilterOptions.querySelectorAll('.status-filter-checkbox:checked');
                 selectedStatuses = Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
            }
            await loadAndRenderCollaborators(pageKey, selectedStatuses);
        }
    }

    function setLoadingState(isLoading, pageKey) {
        const getBodyAndColspan = (key) => {
            switch (key) {
                case 'basic': return { body: collaboratorListBody, colspan: 10 };
                case 'performance': return { body: dataPerformanceListBody, colspan: 8 };
                case 'financial': return { body: financialListBody, colspan: 10 };
                default: return { body: null, colspan: 8 };
            }
        };
        const { body, colspan } = getBodyAndColspan(pageKey);
        if (isLoading && body) {
            body.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-12"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]" role="status"></div></td></tr>`;
        }
    }

    function renderPage() {
        if (!project || !project.id) return;

        renderHeaderAndDashboard(project);
        renderStatusGuidance(project);
        renderProjectFiles(project);
        updateAddButtonsState(project);

        const activeTab = mainTabs.querySelector('.tab-btn.active').dataset.tabTarget;
        let pageKey;
        if (activeTab === 'basic-info') pageKey = 'basic';
        else if (activeTab === 'data-performance') pageKey = 'performance';
        else if (activeTab === 'financial-info') pageKey = 'financial';
        else if (activeTab === 'effect-dashboard') pageKey = 'effect';
        else return;

        switch (activeTab) {
            case 'basic-info': renderBasicInfoTab(paginatedData.basic, project); break;
            case 'data-performance': renderDataPerformanceTab(paginatedData.performance, project); break;
            case 'financial-info': renderFinancialTab(paginatedData.financial, project); break;
            case 'effect-dashboard':
                if (effectDashboardData) { renderEffectDashboard(effectDashboardData); }
                break;
        }
        if (pageKey !== 'effect') {
            const paginationContainer = pageKey === 'basic' ? paginationControlsBasic : (pageKey === 'performance' ? paginationControlsPerformance : paginationControlsFinancial);
            renderPagination(paginationContainer, pageKey, totalItems[pageKey], currentPage[pageKey], itemsPerPage);
        }
    }

    // --- Rendering Functions ---
    function updateAddButtonsState(projectData) { /* ... implementation ... */ }
    function renderHeaderAndDashboard(projectData) { /* ... implementation ... */ }
    function renderStatusGuidance(projectData) { /* ... implementation ... */ }
    function renderProjectFiles(project) { /* ... implementation ... */ }
    function renderBasicInfoTab(collaborators, projectData) {
        if (!collaboratorListBody || !noDataMessage) return;
        if (!Array.isArray(collaborators)) {
            console.error("renderBasicInfoTab received invalid collaborators data:", collaborators);
            collaborators = []; // Ensure it's an array
        }
        if (collaborators.length === 0) {
            noDataMessage.classList.remove('hidden');
            collaboratorListBody.innerHTML = ''; // Clear body
            if(collaboratorListBody.closest('table')) collaboratorListBody.closest('table').classList.add('hidden');
        } else {
            noDataMessage.classList.add('hidden');
            if(collaboratorListBody.closest('table')) collaboratorListBody.closest('table').classList.remove('hidden');
            const fragment = document.createDocumentFragment();
            collaborators.forEach(c => {
                 if (!c || !c.id) {
                     console.warn("Skipping rendering invalid collaborator:", c);
                     return;
                 }
                const talentInfo = c.talentInfo || {};
                const talentNickname = talentInfo.nickname || '（已删除）';
                const financials = c.metrics || {}; // Use metrics sub-object
                const isDeleteDisabled = c.status === '视频已发布' || projectData?.status !== '执行中';

                // Choose between select (editable) or capsule (read-only), apply unified width
                let statusCellHtml = '';
                const isStatusSelectDisabled = c.status === '视频已发布' || projectData?.status !== '执行中';
                if (!isStatusSelectDisabled && MANUAL_STATUS_OPTIONS.includes(c.status)) {
                    let statusOptionsHtml = MANUAL_STATUS_OPTIONS.map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('');
                    // Determine background/text color for the select based on current status
                    let bgColor, textColor;
                    switch (c.status) {
                        case '待提报工作台': bgColor = 'bg-gray-100'; textColor = 'text-gray-700'; break;
                        case '工作台已提交': bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; break;
                        case '客户已定档': bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; break;
                        default: bgColor = 'bg-gray-200'; textColor = 'text-gray-800';
                    }
                    // Wrap select in a div for layout control, apply width to div
                    statusCellHtml = `
                        <div class="relative inline-block w-36">
                             <select class="table-select status-select appearance-none w-full px-3 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor} text-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400" data-id="${c.id}">
                                ${statusOptionsHtml}
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${textColor}">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>`;
                } else {
                    statusCellHtml = getStatusCapsuleHtml(c.status); // Static capsule with w-36
                }


                const canEditDate = !['视频已发布', '待结算', '已收款', '已终结'].includes(c.status);
                let dateCellHtml = '';
                if (canEditDate && projectData?.status === '执行中') { // Only allow editing if project is executing
                    const isEditingThisRow = editingDateId === c.id;
                    const dateInputId = `planned-date-input-${c.id}`;
                    dateCellHtml = `
                        <div class="flex items-center gap-2">
                            <input type="date" id="${dateInputId}" class="data-input w-full" value="${formatDate(c.plannedReleaseDate) !== 'N/A' ? formatDate(c.plannedReleaseDate) : ''}" ${!isEditingThisRow ? 'disabled' : ''}>
                            <button class="p-1 rounded-md text-gray-500 hover:bg-gray-200 transition-colors inline-edit-date-btn" data-id="${c.id}" data-state="${isEditingThisRow ? 'save' : 'edit'}">
                                ${isEditingThisRow ?
                            '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>'
                        }
                            </button>
                        </div>`;
                } else {
                    dateCellHtml = formatDate(c.plannedReleaseDate);
                }

                const mainRow = document.createElement('tr');
                mainRow.className = 'bg-white border-b hover:bg-gray-50';
                mainRow.id = `collab-row-${c.id}`;
                const xingtuUrl = talentInfo.xingtuId ? `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talentInfo.xingtuId}` : '#';
                const talentLink = talentInfo.xingtuId ? `<a href="${xingtuUrl}" target="_blank" class="text-blue-600 hover:underline">${talentNickname}</a>` : talentNickname;
                const orderTypeText = c.orderType === 'original' ? '原价下单' : '改价下单';
                const isExpanded = openDetails.has(c.id);

                mainRow.innerHTML = `
                    <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${talentLink}</td>
                    <td class="px-6 py-4">${dateCellHtml}</td>
                    <td class="px-6 py-4">${c.talentSource || '未指定'}</td>
                    <td class="px-6 py-4">${orderTypeText}</td>
                    <td class="px-6 py-4" title="${c.priceInfo || ''}">${formatCurrency(c.amount)}</td>
                    <td class="px-6 py-4 text-center">${c.rebate ?? 'N/A'}%</td>
                    <td class="px-6 py-4 font-medium">${formatCurrency(financials.income)}</td>
                    <td class="px-6 py-4 font-semibold text-center ${(financials.grossProfitMargin || 0) < 0 ? 'text-red-600' : 'text-green-600'}">${formatPercent(financials.grossProfitMargin)}</td>
                    <td class="px-6 py-4">${statusCellHtml}</td>
                    <td class="px-6 py-4 flex items-center justify-center space-x-2">
                         <button data-id="${c.id}" class="toggle-details-btn p-1 rounded-md text-gray-500 hover:bg-gray-100">
                             <svg class="w-5 h-5 icon-plus ${isExpanded ? 'hidden' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                             <svg class="w-5 h-5 icon-minus ${isExpanded ? '' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
                         </button>
                        <button data-id="${c.id}" class="delete-btn p-1 rounded-md text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed" ${isDeleteDisabled ? 'disabled' : ''} title="删除合作"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </td>`;

                const subRow = document.createElement('tr');
                subRow.className = `collapsible-row bg-gray-50/70 ${isExpanded ? 'expanded' : ''}`;
                // Simplified sub-row content for brevity in example
                subRow.innerHTML = `
                    <td colspan="10" class="p-0">
                         <div class="collapsible-content px-4"> {/* Apply padding here */}
                            <div class="bg-white p-4 rounded-lg border">
                                <div class="flex justify-between items-center mb-3 border-b pb-2">
                                    <h4 class="text-sm font-semibold text-gray-800">达人档案</h4>
                                    <button class="view-history-btn text-sm font-medium text-blue-600 hover:underline" data-talent-id="${c.talentId}" data-talent-name="${talentNickname}">
                                        查看合作历史 &rarr;
                                    </button>
                                </div>
                                <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                     <div class="flex justify-between"><span class="text-gray-500">星图ID:</span>${talentInfo.xingtuId ? `<a href="${xingtuUrl}" target="_blank" class="font-medium text-blue-600 hover:underline">${talentInfo.xingtuId}</a>` : '<span class="font-medium text-gray-500">N/A</span>'}</div>
                                     <div class="flex justify-between"><span class="text-gray-500">UID:</span><span class="font-medium text-gray-800">${talentInfo.uid || 'N/A'}</span></div>
                                     {/* ... other details ... */}
                                </div>
                            </div>
                         </div>
                    </td>`;
                fragment.appendChild(mainRow);
                fragment.appendChild(subRow);
            });
            collaboratorListBody.innerHTML = ''; // Clear existing content
            collaboratorListBody.appendChild(fragment);
        }
    }
    // ... Implement other tab renderers similarly ...
    function renderDataPerformanceTab(collaborators, projectData) { /* ... implementation ... */ }
    function renderFinancialTab(collaborators, projectData) { /* ... implementation ... */ }
    function renderAdjustmentsSection(project, isReadOnly) { /* ... implementation ... */ }
    function renderEffectDashboard(data) { /* ... implementation ... */ }

    // --- Implementations of Event Handlers ---
    function handleMainContentClick(e) { /* ... implementation ... */ }
    function handleMainContentChange(e) { /* ... implementation ... */ }
    async function handleProjectFileUpload(files) { /* ... implementation ... */ }
    async function handleDeleteProjectFile(fileUrl) { /* ... implementation ... */ }
    async function handleDeleteCollaboration(collabId) { /* ... implementation ... */ }
    async function handleStatusChange(collabId, newStatus) { /* ... implementation ... */ }
    async function handleSavePlannedDate(collabId) { /* ... implementation ... */ }
    async function handleFixStatus(collabId) { /* ... implementation ... */ }
    async function handleDateSave(collabId) { /* ... implementation ... */ }
    async function handleSavePerformance(collabId) { /* ... implementation ... */ }
    async function handleBatchAction() { /* ... implementation ... */ }
    function openAdjustmentModal(adjId = null) { /* ... implementation ... */ }
    function closeAdjustmentModal() { /* ... implementation ... */ }
    async function handleAdjustmentSubmit(e) { /* ... implementation ... */ }
    async function handleDeleteAdjustment(adjId) { /* ... implementation ... */ }
    async function handlePaginationClick(pageKey, e) { /* ... implementation ... */ }
    async function handleItemsPerPageChange(e) { /* ... implementation ... */ }
    async function handleViewHistory(talentId, talentName) { /* ... implementation ... */ }
    function handleSelectAllFinancialChange(e) { /* ... implementation ... */ }
    function handleEffectDashboardToggle(e) { /* ... implementation ... */ }
    function setupStatusFilterListeners() { /* ... implementation ... */ }
    function closeFilePreviewModal() { /* ... implementation ... */ }
    function handleProjectFileActions(e) { /* ... implementation ... */ } // Added for delegation

    // --- Start the application ---
    initializePage();

}); // <<< Final closing brace and parenthesis

