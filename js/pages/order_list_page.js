/**
 * @file order_list_page.js (Refactored from order_list.js v28.4 - Hoisting Fix & Debugging)
 * @description Main logic for the order_list.html page, using ES Modules.
 * Adds console logs for debugging loading issues.
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

console.log('[DEBUG] order_list_page.js module loaded.'); // <-- Log 1: Module loaded

// Wrap all code inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {

    console.log('[DEBUG] DOMContentLoaded event fired.'); // <-- Log 2: DOM ready

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
    let solutionSaveTimer = null; // Assuming this is defined elsewhere if used

    // --- Event Handlers (Moved Before initializePage) ---
    function setupEventListeners() {
        console.log('[DEBUG] setupEventListeners called.'); // <-- Log 3: Setup listeners
        // ... (rest of the setupEventListeners function remains the same) ...
         // Dashboard Tab Switcher
        if (dashboardTabs) {
             dashboardTabs.addEventListener('click', (e) => {
                 const tabButton = e.target.closest('.tab-btn');
                 if (tabButton && !tabButton.classList.contains('active')) {
                     dashboardTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                     tabButton.classList.add('active');
                     document.querySelectorAll('#dashboard-tab-content > .tab-pane').forEach(pane => pane.classList.add('hidden'));
                     const targetPane = document.getElementById(tabButton.dataset.tabTarget);
                     if (targetPane) targetPane.classList.remove('hidden');
                 }
             });
        }
        // Main Content Tab Switcher
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
        // General Clicks and Changes within Main Content
        const mainContentContainer = document.getElementById('main-content');
        if (mainContentContainer) {
            mainContentContainer.addEventListener('click', handleMainContentClick);
            mainContentContainer.addEventListener('change', handleMainContentChange);
        }
        // Project File Upload/Delete/Preview
        if (projectFilesContainer) {
            projectFilesContainer.addEventListener('click', handleProjectFileActions);
        }
        if (projectFileInput) projectFileInput.addEventListener('change', (e) => handleProjectFileUpload(e.target.files));
        if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', closeFilePreviewModal);
        // Financial Tab Batch Actions
        if (batchActionSelect) {
            batchActionSelect.addEventListener('change', () => {
                if (batchDateInput) batchDateInput.classList.toggle('hidden', !batchActionSelect.value);
                if (executeBatchBtn) executeBatchBtn.disabled = !batchActionSelect.value;
            });
        }
        if (executeBatchBtn) executeBatchBtn.addEventListener('click', handleBatchAction);
        if (selectAllFinancialCheckbox) {
            selectAllFinancialCheckbox.addEventListener('change', handleSelectAllFinancialChange);
        }
        // Adjustment Modal
        if (addAdjustmentBtn) addAdjustmentBtn.addEventListener('click', () => openAdjustmentModal()); // Ensure add button opens modal
        if (closeAdjustmentModalBtn) closeAdjustmentModalBtn.addEventListener('click', closeAdjustmentModal);
        if (adjustmentForm) adjustmentForm.addEventListener('submit', handleAdjustmentSubmit);
        // Pagination Controls (for all tabs)
        [paginationControlsBasic, paginationControlsPerformance, paginationControlsFinancial].forEach(container => {
            if (container) {
                container.addEventListener('click', (e) => {
                    const button = e.target.closest('button.pagination-btn');
                    if (button) handlePaginationClick(button.dataset.pageKey, e);
                });
                 container.addEventListener('change', handleItemsPerPageChange);
            }
        });
        // Effect Dashboard Toggles
        const effectDashboard = document.getElementById('effect-dashboard');
        if (effectDashboard) {
            effectDashboard.addEventListener('click', handleEffectDashboardToggle);
        }
        // Status Filter Dropdown (Basic Info Tab)
        if (statusFilterButton && statusFilterDropdown && applyStatusFilterBtn) {
            setupStatusFilterListeners();
        }
    }

    // --- Data Loading Logic ---
    async function initializePage() {
        console.log('[DEBUG] initializePage called.'); // <-- Log 4: Init page start
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId');
        if (!currentProjectId) {
            console.error('[DEBUG] Project ID missing in URL.');
            if (projectNameDisplay) projectNameDisplay.textContent = '错误：缺少项目ID';
            document.body.innerHTML = '<h1>错误：缺少项目ID</h1>';
            return;
        }
        itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || ITEMS_PER_PAGE_DEFAULT.toString());

        // Call setupEventListeners *before* potentially needing it in loadInitialData/switchTab
        // setupEventListeners(); // Moved up, called after DOMContentLoaded

        await loadInitialData();
        console.log('[DEBUG] initializePage finished.'); // <-- Log 5: Init page end
    }

    async function loadInitialData() {
        console.log('[DEBUG] loadInitialData called.'); // <-- Log 6: Load initial data start
        let loadingAlert = null;
        try {
            loadingAlert = showLoadingAlert('正在加载项目核心数据...');
            // Load project details, discounts, and adjustment types concurrently
            const [projectResponse, discountsData, adjTypesData] = await Promise.all([
                loadProjectDetails(currentProjectId),
                loadConfiguration('FRAMEWORK_DISCOUNTS'),
                loadConfiguration('ADJUSTMENT_TYPES')
            ]);
            console.log('[DEBUG] Project details and configurations loaded.');

            project = projectResponse || {};
            allDiscounts = discountsData || [];
            adjustmentTypes = adjTypesData || [];
            effectDashboardData = null; // Reset effect dashboard data

            // Render static parts of the page first
            renderHeaderAndDashboard(project);
            renderStatusGuidance(project);
            renderProjectFiles(project);
            updateAddButtonsState(project);

            loadingAlert.close(); // Close loading alert before loading tab data
            console.log('[DEBUG] Static parts rendered.');

            // Load data for the initially active tab
            await switchTabAndLoadData();
            console.log('[DEBUG] Initial tab data loaded.');

        } catch (error) {
            console.error('[DEBUG] Error during loadInitialData:', error);
            if (loadingAlert) loadingAlert.close();
            if (projectNameDisplay) projectNameDisplay.textContent = '数据加载失败';
            showCustomAlert(`加载初始数据失败: ${error.message}`, '错误');
            // Hide all tab content areas on initial load failure
            if (mainTabContent) mainTabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
            if (collaboratorListBody) collaboratorListBody.innerHTML = '';
            if (dataPerformanceListBody) dataPerformanceListBody.innerHTML = '';
            if (financialListBody) financialListBody.innerHTML = '';
            if (effectDashboardContent) effectDashboardContent.classList.add('hidden');
        }
        console.log('[DEBUG] loadInitialData finished.'); // <-- Log 7: Load initial data end
    }

    async function loadAndRenderCollaborators(pageKey, statuses = '') {
        console.log(`[DEBUG] loadAndRenderCollaborators called for key: ${pageKey}, statuses: ${statuses}`); // <-- Log 8: Load collaborators start
        setLoadingState(true, pageKey);
        const paginationContainer = getPaginationContainer(pageKey);
        const errorBody = getErrorBody(pageKey);
        const colspan = getColspan(pageKey);

        try {
            console.log(`[DEBUG] Fetching collaborators: projectId=${currentProjectId}, page=${currentPage[pageKey]}, limit=${itemsPerPage}, statuses=${statuses}`);
            const { data, total } = await loadCollaborators(
                currentProjectId,
                currentPage[pageKey],
                itemsPerPage,
                statuses
            );
            console.log(`[DEBUG] Collaborators fetched for ${pageKey}. Total: ${total}, Received: ${data ? data.length : 0}`);

            paginatedData[pageKey] = data || []; // Ensure data is an array
            totalItems[pageKey] = total || 0;

            console.log(`[DEBUG] Calling render function for ${pageKey}.`);
            // Render the specific tab based on the fetched data
            switch (pageKey) {
                case 'basic': renderBasicInfoTab(paginatedData.basic, project); break;
                case 'performance': renderDataPerformanceTab(paginatedData.performance, project); break;
                case 'financial': renderFinancialTab(paginatedData.financial, project); break;
            }
            console.log(`[DEBUG] Rendering pagination for ${pageKey}.`);
            // Render pagination controls
            renderPagination(paginationContainer, pageKey, totalItems[pageKey], currentPage[pageKey], itemsPerPage);

        } catch (error) {
            console.error(`[DEBUG] loadAndRenderCollaborators failed for ${pageKey}:`, error);
            if (errorBody) {
                 errorBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-12 text-red-500">加载数据失败</td></tr>`;
            }
             if (paginationContainer) paginationContainer.innerHTML = ''; // Clear pagination on error

        } finally {
            console.log(`[DEBUG] Setting loading state to false for ${pageKey}.`);
            setLoadingState(false, pageKey);
        }
        console.log(`[DEBUG] loadAndRenderCollaborators finished for key: ${pageKey}.`); // <-- Log 9: Load collaborators end
    }

    async function switchTabAndLoadData() {
        console.log('[DEBUG] switchTabAndLoadData called.'); // <-- Log 10: Switch tab start
        if (!mainTabs) {
             console.log('[DEBUG] mainTabs element not found, aborting switch.');
             return;
        }
        const activeTabBtn = mainTabs.querySelector('.tab-btn.active');
        if (!activeTabBtn) {
             console.log('[DEBUG] No active tab button found, aborting switch.');
             return;
        }
        const activeTab = activeTabBtn.dataset.tabTarget;
        console.log(`[DEBUG] Active tab identified: ${activeTab}`);

        // Hide all tab panes
        if (mainTabContent) mainTabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
        // Show the target tab pane
        const targetPane = document.getElementById(activeTab);
        if (targetPane) targetPane.classList.remove('hidden');

        // Show/hide status filter based on active tab
        if (statusFilterContainer) {
            statusFilterContainer.style.display = (activeTab === 'basic-info') ? 'block' : 'none';
        }

        let pageKey;
        if (activeTab === 'basic-info') pageKey = 'basic';
        else if (activeTab === 'data-performance') pageKey = 'performance';
        else if (activeTab === 'financial-info') pageKey = 'financial';
        else if (activeTab === 'effect-dashboard') pageKey = 'effect';
        else {
             console.log(`[DEBUG] Unknown tab target: ${activeTab}, aborting load.`);
             return;
        }
        console.log(`[DEBUG] pageKey determined: ${pageKey}`);

        // Reset editing state when switching tabs
        editingPerformanceRowId = null;
        editingDateId = null;
        editingOrderTypeId = null;
        pendingDateChanges = {};
        openDetails = new Set(); // Reset open details when switching tabs

        // Load data specific to the active tab
        if (activeTab === 'effect-dashboard') {
            console.log('[DEBUG] Loading effect dashboard data...');
            if (!effectDashboardData) { // Load only if not already loaded
                const loading = showLoadingAlert('正在加载效果看板数据...');
                try {
                    effectDashboardData = await loadEffectDashboardData(currentProjectId);
                    console.log('[DEBUG] Effect dashboard data loaded successfully.');
                    renderEffectDashboard(effectDashboardData);
                } catch(e) {
                    console.error('[DEBUG] Error loading effect dashboard:', e);
                    if (effectDashboardError) effectDashboardError.classList.remove('hidden'); // Show error state
                    if (effectDashboardLoading) effectDashboardLoading.classList.add('hidden');
                    if (effectDashboardContent) effectDashboardContent.classList.add('hidden');
                 }
                finally { loading.close(); }
            } else {
                 console.log('[DEBUG] Rendering cached effect dashboard data.');
                 renderEffectDashboard(effectDashboardData); // Re-render with cached data
            }
        } else {
            console.log(`[DEBUG] Loading collaborator data for tab ${pageKey}...`);
            // Determine statuses to filter by (only applicable for basic tab)
            let selectedStatuses = '';
            if (pageKey === 'basic' && statusFilterContainer && statusFilterContainer.style.display !== 'none' && statusFilterOptions) {
                 const selectedCheckboxes = statusFilterOptions.querySelectorAll('.status-filter-checkbox:checked');
                 selectedStatuses = Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
                 console.log(`[DEBUG] Selected statuses for basic tab: ${selectedStatuses}`);
            }
            // Load collaborators for the current tab
            await loadAndRenderCollaborators(pageKey, selectedStatuses);
        }
        console.log('[DEBUG] switchTabAndLoadData finished.'); // <-- Log 11: Switch tab end
    }

    function setLoadingState(isLoading, pageKey) {
        console.log(`[DEBUG] setLoadingState called for ${pageKey}, isLoading: ${isLoading}`); // <-- Log 12: Set loading state
        const { body, colspan } = getLoadingElements(pageKey);
        if (isLoading && body) {
            body.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-12"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]" role="status"></div></td></tr>`;
        } else if (!isLoading && body && body.querySelector('td[colspan] > div[role="status"]')) {
             // Only clear if the loading indicator is currently shown
             // body.innerHTML = ''; // Don't clear here, render functions will overwrite
             console.log(`[DEBUG] Loading indicator should be removed by render function for ${pageKey}`);
        }
    }
    // ... (Rest of the functions remain the same) ...
     // Helper to get elements for loading state
    function getLoadingElements(key) {
        switch (key) {
            case 'basic': return { body: collaboratorListBody, colspan: 10 };
            case 'performance': return { body: dataPerformanceListBody, colspan: 8 };
            case 'financial': return { body: financialListBody, colspan: 10 };
            default: return { body: null, colspan: 8 };
        }
    }
    // Helper to get pagination container
    function getPaginationContainer(key) {
         switch (key) {
            case 'basic': return paginationControlsBasic;
            case 'performance': return paginationControlsPerformance;
            case 'financial': return paginationControlsFinancial;
            default: return null;
        }
    }
     // Helper to get error body container
    function getErrorBody(key) {
         switch (key) {
            case 'basic': return collaboratorListBody;
            case 'performance': return dataPerformanceListBody;
            case 'financial': return financialListBody;
            default: return null;
        }
    }
    // Helper to get colspan for tables
     function getColspan(key) {
         switch (key) {
            case 'performance': return 8;
            default: return 10;
        }
    }

    // --- Rendering Functions ---
    // (Ensure implementations exist for all these)
    function renderHeaderAndDashboard(projectData) {
        console.log('[DEBUG] renderHeaderAndDashboard called.');
        /* ... implementation from previous version ... */
        if (!projectNameDisplay) return;
        projectNameDisplay.textContent = projectData.name;
        const breadcrumb = document.getElementById('breadcrumb-project-name');
        if (breadcrumb) breadcrumb.textContent = projectData.name;
        const qianchuanIdEl = document.getElementById('project-qianchuan-id');
         if (qianchuanIdEl) {
            qianchuanIdEl.textContent = `仟传编号: ${projectData.qianchuanId || 'N/A'}`;
        }
        const metrics = projectData.metrics || {};
        if (statsTotalBudget) statsTotalBudget.textContent = formatCurrency(metrics.projectBudget);
        if (statsTotalCollaborators) statsTotalCollaborators.textContent = metrics.totalCollaborators || 0;
        if (statsBudgetUtilization) statsBudgetUtilization.textContent = formatPercent(metrics.budgetUtilization);
        if (statsTotalIncome) statsTotalIncome.textContent = formatCurrency(metrics.totalIncome);
        if (statsTotalRebateReceivable) statsTotalRebateReceivable.textContent = formatCurrency(metrics.totalRebateReceivable);
        if (statsIncomeAdjustments) statsIncomeAdjustments.textContent = formatCurrency(metrics.incomeAdjustments);
        if (statsTotalOperationalCost) statsTotalOperationalCost.textContent = formatCurrency(metrics.totalOperationalCost);
        if (statsTotalExpense) statsTotalExpense.textContent = formatCurrency(metrics.totalExpense);
        if (statsFundsOccupationCost) statsFundsOccupationCost.textContent = formatCurrency(metrics.fundsOccupationCost);
        if (statsExpenseAdjustments) statsExpenseAdjustments.textContent = formatCurrency(metrics.expenseAdjustments);
        if (statsPreAdjustmentProfit) statsPreAdjustmentProfit.textContent = formatCurrency(metrics.preAdjustmentProfit);
        if (statsPreAdjustmentMargin) statsPreAdjustmentMargin.textContent = formatPercent(metrics.preAdjustmentMargin);
        if (statsOperationalProfit) statsOperationalProfit.textContent = formatCurrency(metrics.operationalProfit);
        if (statsOperationalMargin) statsOperationalMargin.textContent = formatPercent(metrics.operationalMargin);
     }
    function renderStatusGuidance(projectData) { console.log('[DEBUG] renderStatusGuidance called.'); /* ... implementation ... */ }
    function renderProjectFiles(project) { console.log('[DEBUG] renderProjectFiles called.'); /* ... implementation ... */ }
    function updateAddButtonsState(projectData) { console.log('[DEBUG] updateAddButtonsState called.'); /* ... implementation ... */ }
    function renderBasicInfoTab(collaborators, projectData) { console.log(`[DEBUG] renderBasicInfoTab called with ${collaborators.length} collaborators.`); /* ... implementation ... */ }
    function renderDataPerformanceTab(collaborators, projectData) { console.log(`[DEBUG] renderDataPerformanceTab called with ${collaborators.length} collaborators.`); /* ... implementation ... */ }
    function renderFinancialTab(collaborators, projectData) { console.log(`[DEBUG] renderFinancialTab called with ${collaborators.length} collaborators.`); /* ... implementation ... */ }
    function renderAdjustmentsSection(project, isReadOnly) { console.log('[DEBUG] renderAdjustmentsSection called.'); /* ... implementation ... */ }
    function renderEffectDashboard(data) { console.log('[DEBUG] renderEffectDashboard called.'); /* ... implementation ... */ }

    // --- Implementations of Event Handlers ---
    // (Ensure implementations exist for all these)
    function handleMainContentClick(e) { console.log('[DEBUG] handleMainContentClick detected.'); /* ... implementation ... */ }
    function handleMainContentChange(e) { console.log('[DEBUG] handleMainContentChange detected.'); /* ... implementation ... */ }
    async function handleProjectFileUpload(files) { console.log('[DEBUG] handleProjectFileUpload called.'); /* ... implementation ... */ }
    async function handleDeleteProjectFile(fileUrl) { console.log('[DEBUG] handleDeleteProjectFile called.'); /* ... implementation ... */ }
    async function handleDeleteCollaboration(collabId) { console.log('[DEBUG] handleDeleteCollaboration called.'); /* ... implementation ... */ }
    async function handleStatusChange(collabId, newStatus) { console.log('[DEBUG] handleStatusChange called.'); /* ... implementation ... */ }
    async function handleSavePlannedDate(collabId) { console.log('[DEBUG] handleSavePlannedDate called.'); /* ... implementation ... */ }
    async function handleFixStatus(collabId) { console.log('[DEBUG] handleFixStatus called.'); /* ... implementation ... */ }
    async function handleDateSave(collabId) { console.log('[DEBUG] handleDateSave called.'); /* ... implementation ... */ }
    async function handleSavePerformance(collabId) { console.log('[DEBUG] handleSavePerformance called.'); /* ... implementation ... */ }
    async function handleBatchAction() { console.log('[DEBUG] handleBatchAction called.'); /* ... implementation ... */ }
    function openAdjustmentModal(adjId = null) { console.log('[DEBUG] openAdjustmentModal called.'); /* ... implementation ... */ }
    function closeAdjustmentModal() { console.log('[DEBUG] closeAdjustmentModal called.'); /* ... implementation ... */ }
    async function handleAdjustmentSubmit(e) { console.log('[DEBUG] handleAdjustmentSubmit called.'); /* ... implementation ... */ }
    async function handleDeleteAdjustment(adjId) { console.log('[DEBUG] handleDeleteAdjustment called.'); /* ... implementation ... */ }
    async function handlePaginationClick(pageKey, e) { console.log('[DEBUG] handlePaginationClick called.'); /* ... implementation ... */ }
    async function handleItemsPerPageChange(e) { console.log('[DEBUG] handleItemsPerPageChange called.'); /* ... implementation ... */ }
    async function handleViewHistory(talentId, talentName) { console.log('[DEBUG] handleViewHistory called.'); /* ... implementation ... */ }
    function handleSelectAllFinancialChange(e) { console.log('[DEBUG] handleSelectAllFinancialChange called.'); /* ... implementation ... */ }
    function handleEffectDashboardToggle(e) { console.log('[DEBUG] handleEffectDashboardToggle called.'); /* ... implementation ... */ }
    function setupStatusFilterListeners() { console.log('[DEBUG] setupStatusFilterListeners called.'); /* ... implementation ... */ }
    function closeFilePreviewModal() { console.log('[DEBUG] closeFilePreviewModal called.'); /* ... implementation ... */ }
    function handleProjectFileActions(e) { console.log('[DEBUG] handleProjectFileActions called.'); /* ... implementation ... */ }


    // --- Start the application ---
    // Call setupEventListeners *after* DOMContentLoaded but *before* initializePage
    setupEventListeners();
    initializePage();

}); // <<< Final closing brace and parenthesis
