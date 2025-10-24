/**
 * @file order_list_page.js (Refactored from order_list.js v28.4 - Hoisting Fix & Debugging)
 * @description Main logic for the order_list.html page, using ES Modules.
 * Attempts to fix event handling and tab switching logic based on common refactoring errors.
 * Adds more detailed logging. Reverted forced statuses for performance/financial tabs.
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

console.log('[DEBUG] order_list_page.js module loaded.');

document.addEventListener('DOMContentLoaded', function() {

    console.log('[DEBUG] DOMContentLoaded event fired.');

    // --- DOM Elements ---
    // (Ensure all IDs match your HTML exactly)
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
    const addCollaboratorLink = document.getElementById('add-collaborator-link'); // Check if this ID is still used
    const mainTabsContainer = document.getElementById('tabs-container'); // Container for main tabs
    const mainTabContent = document.getElementById('tab-content');
    const dashboardTabsContainer = document.getElementById('dashboard-tabs'); // Container for dashboard tabs
    const dashboardTabContent = document.getElementById('dashboard-tab-content');
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
    const batchActionsBar = document.getElementById('batch-actions-bar'); // Ensure this ID exists if logic uses it
    const batchActionSelect = document.getElementById('batch-action-select');
    const batchDateInput = document.getElementById('batch-date-input');
    const executeBatchBtn = document.getElementById('execute-batch-btn');
    const selectAllFinancialCheckbox = document.getElementById('select-all-on-page-financial');
    const adjustmentsSection = document.getElementById('adjustments-section'); // Ensure this ID exists if logic uses it
    const adjustmentsListBody = document.getElementById('adjustments-list-body');
    const addAdjustmentBtn = document.getElementById('add-adjustment-btn');
    const adjustmentModal = document.getElementById('adjustment-modal');
    const closeAdjustmentModalBtn = document.getElementById('close-adjustment-modal-btn');
    const adjustmentForm = document.getElementById('adjustment-form');
    const adjustmentModalTitle = document.getElementById('adjustment-modal-title');
    const editingAdjustmentIdInput = document.getElementById('editing-adjustment-id');
    const adjustmentTypeSelect = document.getElementById('adjustment-type');
    const effectDashboard = document.getElementById('effect-dashboard'); // Tab pane for effect dashboard
    const effectDashboardLoading = document.getElementById('effect-dashboard-loading');
    const effectDashboardError = document.getElementById('effect-dashboard-error');
    const effectDashboardContent = document.getElementById('effect-dashboard-content');
    // ... (other effect dashboard elements) ...
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

    // --- Event Handlers ---
    function setupEventListeners() {
        console.log('[DEBUG] setupEventListeners called.');
        // Dashboard Tab Switcher
        if (dashboardTabsContainer) {
             dashboardTabsContainer.addEventListener('click', (e) => {
                 const tabButton = e.target.closest('.tab-btn');
                 if (tabButton && !tabButton.classList.contains('active')) {
                     console.log('[DEBUG] Dashboard tab clicked:', tabButton.dataset.tabTarget);
                     dashboardTabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                     tabButton.classList.add('active');
                     if (dashboardTabContent) dashboardTabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
                     const targetPane = document.getElementById(tabButton.dataset.tabTarget);
                     if (targetPane) targetPane.classList.remove('hidden');
                 }
             });
        } else { console.warn('[DEBUG] dashboardTabsContainer not found'); }

        // Main Content Tab Switcher
        if (mainTabsContainer) {
            mainTabsContainer.addEventListener('click', async (e) => {
                const tabButton = e.target.closest('.tab-btn');
                if (tabButton && !tabButton.classList.contains('active')) {
                    console.log('[DEBUG] Main tab clicked:', tabButton.dataset.tabTarget);
                    // Deactivate all buttons within the container first
                    mainTabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    // Activate the clicked button
                    tabButton.classList.add('active');
                    // Reload data based on the newly active tab
                    await switchTabAndLoadData();
                }
            });
        } else { console.warn('[DEBUG] mainTabsContainer not found'); }

        // General Clicks and Changes within Main Content (Event Delegation)
        const mainContentContainer = document.getElementById('main-content');
        if (mainContentContainer) {
            console.log('[DEBUG] Adding main content event listeners.');
            mainContentContainer.addEventListener('click', handleMainContentClick);
            mainContentContainer.addEventListener('change', handleMainContentChange);
        } else { console.warn('[DEBUG] main-content container not found'); }

        // Project File Upload/Delete/Preview (Specific container)
        if (projectFilesContainer) {
            projectFilesContainer.addEventListener('click', handleProjectFileActions);
        } else { console.warn('[DEBUG] projectFilesContainer not found'); }
        if (projectFileInput) {
            projectFileInput.addEventListener('change', (e) => handleProjectFileUpload(e.target.files));
        } else { console.warn('[DEBUG] projectFileInput not found'); }
        if (closePreviewModalBtn) {
            closePreviewModalBtn.addEventListener('click', closeFilePreviewModal);
        } else { console.warn('[DEBUG] closePreviewModalBtn not found'); }

        // Financial Tab Batch Actions
        if (batchActionSelect) {
            batchActionSelect.addEventListener('change', () => {
                const isActionSelected = batchActionSelect.value !== "";
                if (batchDateInput) batchDateInput.classList.toggle('hidden', !isActionSelected);
                if (executeBatchBtn) executeBatchBtn.disabled = !isActionSelected;
            });
        } else { console.warn('[DEBUG] batchActionSelect not found'); }
        if (executeBatchBtn) {
            executeBatchBtn.addEventListener('click', handleBatchAction);
        } else { console.warn('[DEBUG] executeBatchBtn not found'); }
        if (selectAllFinancialCheckbox) {
            selectAllFinancialCheckbox.addEventListener('change', handleSelectAllFinancialChange);
        } else { console.warn('[DEBUG] selectAllFinancialCheckbox not found'); }

        // Adjustment Modal
        if (addAdjustmentBtn) {
            addAdjustmentBtn.addEventListener('click', () => openAdjustmentModal());
        } else { console.warn('[DEBUG] addAdjustmentBtn not found'); }
        if (closeAdjustmentModalBtn) {
            closeAdjustmentModalBtn.addEventListener('click', closeAdjustmentModal);
        } else { console.warn('[DEBUG] closeAdjustmentModalBtn not found'); }
        if (adjustmentForm) {
            adjustmentForm.addEventListener('submit', handleAdjustmentSubmit);
        } else { console.warn('[DEBUG] adjustmentForm not found'); }

        // Pagination Controls (Add listeners to all potential containers)
        [paginationControlsBasic, paginationControlsPerformance, paginationControlsFinancial].forEach((container, index) => {
            const key = ['basic', 'performance', 'financial'][index];
            if (container) {
                console.log(`[DEBUG] Adding pagination listeners for ${key}`);
                // Listen for clicks on buttons within the container
                container.addEventListener('click', (e) => {
                    const button = e.target.closest('button.pagination-btn');
                    if (button) {
                        console.log(`[DEBUG] Pagination button clicked for ${key}`);
                        handlePaginationClick(button.dataset.pageKey || key, e); // Ensure pageKey is passed
                    }
                });
                // Listen for changes on select elements within the container
                container.addEventListener('change', (e) => {
                     const select = e.target.closest('select.items-per-page-select');
                     if (select) {
                        console.log(`[DEBUG] Items per page changed for ${key}`);
                        handleItemsPerPageChange(e, key); // Pass key
                     }
                });
            } else { console.warn(`[DEBUG] Pagination container not found for ${key}`); }
        });

        // Effect Dashboard Toggles
        if (effectDashboard) {
            effectDashboard.addEventListener('click', handleEffectDashboardToggle);
        } else { console.warn('[DEBUG] effectDashboard container not found'); }

        // Status Filter Dropdown (Basic Info Tab)
        if (statusFilterButton && statusFilterDropdown && applyStatusFilterBtn) {
            setupStatusFilterListeners();
        } else { console.warn('[DEBUG] Status filter elements not found'); }
    }

    // --- Data Loading Logic ---
    async function initializePage() { /* ... unchanged ... */ }
    async function loadInitialData() { /* ... unchanged ... */ }
    async function loadAndRenderCollaborators(pageKey, statuses = '') { /* ... unchanged ... */ }

    // --- [REVISED] switchTabAndLoadData (Reverted forced statuses) ---
    async function switchTabAndLoadData() {
        console.log('[DEBUG] switchTabAndLoadData called.');
        if (!mainTabsContainer) { console.warn('[DEBUG] mainTabsContainer not found'); return; }
        const activeTabBtn = mainTabsContainer.querySelector('.tab-btn.active'); // Use container to scope query
        if (!activeTabBtn) { console.warn('[DEBUG] No active main tab button found'); return; }
        const activeTab = activeTabBtn.dataset.tabTarget;
        console.log(`[DEBUG] Active main tab identified: ${activeTab}`);

        // Hide all main tab panes
        if (mainTabContent) mainTabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
        // Show the target main tab pane
        const targetPane = document.getElementById(activeTab);
        if (targetPane) targetPane.classList.remove('hidden');

        // Show/hide status filter based on active tab
        if (statusFilterContainer) {
            statusFilterContainer.style.display = (activeTab === 'basic-info') ? 'block' : 'none';
        }

        let pageKey;
        // Map tab IDs to page keys
        switch (activeTab) {
            case 'basic-info': pageKey = 'basic'; break;
            case 'data-performance': pageKey = 'performance'; break;
            case 'financial-info': pageKey = 'financial'; break;
            case 'effect-dashboard': pageKey = 'effect'; break;
            default:
                console.warn(`[DEBUG] Unknown main tab target: ${activeTab}`);
                return;
        }
        console.log(`[DEBUG] pageKey determined: ${pageKey}`);

        // Reset editing state
        editingPerformanceRowId = null;
        editingDateId = null;
        editingOrderTypeId = null;
        pendingDateChanges = {};
        openDetails = new Set();

        // Load data specific to the active tab
        if (pageKey === 'effect') {
            console.log('[DEBUG] Loading effect dashboard data...');
             if (!effectDashboardData) {
                const loading = showLoadingAlert('正在加载效果看板数据...');
                try {
                    effectDashboardData = await loadEffectDashboardData(currentProjectId);
                    renderEffectDashboard(effectDashboardData);
                } catch(e) {
                    console.error('[DEBUG] Failed to load effect dashboard:', e);
                    if (effectDashboardError) effectDashboardError.classList.remove('hidden');
                    if (effectDashboardLoading) effectDashboardLoading.classList.add('hidden');
                    if (effectDashboardContent) effectDashboardContent.classList.add('hidden');
                }
                finally { loading.close(); }
            } else {
                 renderEffectDashboard(effectDashboardData);
            }
        } else if (pageKey) { // Valid pageKey (basic, performance, financial)
            console.log(`[DEBUG] Loading collaborator data for tab ${pageKey}...`);
            let statusesToLoad = '';
            // Only apply UI filter for basic tab, use specific statuses for others
            if (pageKey === 'basic') {
                if (statusFilterContainer && statusFilterContainer.style.display !== 'none' && statusFilterOptions) {
                     const selectedCheckboxes = statusFilterOptions.querySelectorAll('.status-filter-checkbox:checked');
                     statusesToLoad = Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
                }
            } else if (pageKey === 'performance' || pageKey === 'financial') {
                // These tabs require specific statuses from backend logic
                statusesToLoad = ["客户已定档", "视频已发布"].join(',');
            }
            console.log(`[DEBUG] Using statuses for ${pageKey}: '${statusesToLoad}'`);
            await loadAndRenderCollaborators(pageKey, statusesToLoad);
        }
        console.log('[DEBUG] switchTabAndLoadData finished.');
    }


    function setLoadingState(isLoading, pageKey) { /* ... unchanged ... */ }
    function getLoadingElements(key) { /* ... unchanged ... */ }
    function getPaginationContainer(key) { /* ... unchanged ... */ }
    function getErrorBody(key) { /* ... unchanged ... */ }
    function getColspan(key) { /* ... unchanged ... */ }

    // --- Rendering Functions ---
    function renderHeaderAndDashboard(projectData) { /* ... unchanged ... */ }
    function renderStatusGuidance(projectData) { /* ... unchanged ... */ }
    function renderProjectFiles(project) { /* ... unchanged ... */ }
    function updateAddButtonsState(projectData) { /* ... unchanged ... */ }
    function renderBasicInfoTab(collaborators, projectData) { /* ... unchanged ... */ }
    function renderDataPerformanceTab(collaborators, projectData) { /* ... unchanged ... */ }
    function renderFinancialTab(collaborators, projectData) { /* ... unchanged ... */ }
    function renderAdjustmentsSection(project, isReadOnly) { /* ... unchanged ... */ }
    function renderEffectDashboard(data) { /* ... unchanged ... */ }

    // --- Implementations of Event Handlers ---
    // Make sure all these functions are defined and correctly handle interactions
    function handleMainContentClick(e) {
        console.log('[DEBUG] Click detected in main content:', e.target);
        const button = e.target.closest('button'); // Find the closest button ancestor
        if (!button) {
            // If not a button, check if it's an image for preview
             const img = e.target.closest('.view-file-btn'); // Assuming previewable images have this class or similar data attribute
             if (img && img.dataset.url) {
                 console.log('[DEBUG] View file button clicked.');
                 handlePreviewFile(img.dataset.url, img.dataset.name);
             }
            return; // Exit if not a button or relevant element
        }

        const collabId = button.dataset.id || button.closest('[data-id]')?.dataset.id; // Try getting ID from button or parent
        const action = button.dataset.action || ''; // Add data-action attribute to buttons if needed

        // --- Basic Info Tab Interactions ---
        if (button.classList.contains('inline-edit-date-btn')) {
            console.log('[DEBUG] Edit/Save date button clicked.');
            const state = button.dataset.state;
            if (state === 'edit') {
                editingDateId = collabId;
                renderBasicInfoTab(paginatedData.basic, project); // Re-render to enable input
            } else if (state === 'save') {
                handleSavePlannedDate(collabId);
            }
            return; // Handled
        }
        if (button.classList.contains('toggle-details-btn')) {
            console.log('[DEBUG] Toggle details button clicked.');
            handleToggleDetails(collabId);
            return; // Handled
        }
        if (button.classList.contains('delete-btn') && !button.disabled) {
            console.log('[DEBUG] Delete collaboration button clicked.');
            handleDeleteCollaboration(collabId);
            return; // Handled
        }
        if (button.classList.contains('view-history-btn')) {
             console.log('[DEBUG] View history button clicked.');
             handleViewHistory(button.dataset.talentId, button.dataset.talentName);
             return; // Handled
        }

        // --- Performance Tab Interactions ---
        if (button.classList.contains('edit-performance-btn') && !button.disabled) {
            console.log('[DEBUG] Edit performance button clicked.');
            editingPerformanceRowId = collabId;
            renderDataPerformanceTab(paginatedData.performance, project); // Re-render to show inputs
            return; // Handled
        }
        if (button.classList.contains('cancel-edit-performance-row-btn')) {
            console.log('[DEBUG] Cancel edit performance button clicked.');
            editingPerformanceRowId = null;
            renderDataPerformanceTab(paginatedData.performance, project); // Re-render to disable inputs
            return; // Handled
        }
        if (button.classList.contains('save-performance-row-btn')) {
            console.log('[DEBUG] Save performance button clicked.');
            handleSavePerformance(collabId);
            return; // Handled
        }
        // Performance tab copy/open buttons (use specific classes or data-action)
        if (button.classList.contains('copy-btn')) {
             console.log('[DEBUG] Copy button clicked.');
             copyToClipboard(button.dataset.value);
             return;
        }
        if (button.classList.contains('open-link-btn')) {
            console.log('[DEBUG] Open link button clicked.');
            window.open(button.dataset.url, '_blank');
            return;
        }
         if (button.classList.contains('open-video-btn')) {
            console.log('[DEBUG] Open video button clicked.');
             window.open(`https://www.douyin.com/video/${button.dataset.videoid}`, '_blank');
             return;
         }


        // --- Financial Tab Interactions ---
         if (button.classList.contains('edit-ordertype-btn') && !button.disabled) {
            console.log('[DEBUG] Edit order type button clicked.');
            editingOrderTypeId = collabId;
            renderFinancialTab(paginatedData.financial, project); // Re-render to show select
            return; // Handled
        }
        if (button.classList.contains('save-dates-btn')) { // This button saves both dates and potentially order type
            console.log('[DEBUG] Save dates/order type button clicked.');
            handleDateSave(collabId);
            return; // Handled
        }
         if (button.classList.contains('edit-adjustment-btn') && !button.disabled) {
             console.log('[DEBUG] Edit adjustment button clicked.');
             openAdjustmentModal(button.dataset.id);
             return;
         }
         if (button.classList.contains('delete-adjustment-btn') && !button.disabled) {
             console.log('[DEBUG] Delete adjustment button clicked.');
             handleDeleteAdjustment(button.dataset.id);
             return;
         }

        // --- Effect Dashboard Interactions ---
        if (button.classList.contains('details-toggle-btn')) {
             console.log('[DEBUG] Effect details toggle button clicked.');
             handleEffectDashboardToggle(e); // Let the specific handler manage this
             return;
        }

        console.log('[DEBUG] Unhandled button click:', button);
    }
    function handleMainContentChange(e) {
        console.log('[DEBUG] Change detected in main content:', e.target);
        const target = e.target;
        const collabId = target.dataset.id || target.closest('[data-id]')?.dataset.id;

        if (target.classList.contains('status-select')) {
            console.log('[DEBUG] Status select changed.');
            handleStatusChange(collabId, target.value);
        } else if (target.classList.contains('date-input')) {
            console.log('[DEBUG] Date input changed.');
            if (!pendingDateChanges[collabId]) pendingDateChanges[collabId] = {};
            pendingDateChanges[collabId][target.dataset.type] = target.value;
            // Show the save button container in the sub-row
            const subRow = financialListBody?.querySelector(`.collapsible-row[data-id="${collabId}"]`);
            const saveBtnContainer = subRow?.querySelector('.save-dates-btn')?.parentElement;
             if (saveBtnContainer) saveBtnContainer.classList.remove('hidden');
        } else if (target.classList.contains('items-per-page-select')) {
             console.log('[DEBUG] Items per page select changed directly.');
            // This case might be redundant if pagination handler catches it, but added for safety
            const pageKey = target.closest('[id^="pagination-controls-"]')?.id.replace('pagination-controls-', '');
            if(pageKey) handleItemsPerPageChange(e, pageKey);
        } else if (target.classList.contains('order-type-select')) {
             console.log('[DEBUG] Order type select changed.');
             // Show the save button container
             const subRow = financialListBody?.querySelector(`.collapsible-row[data-id="${collabId}"]`);
             const saveBtnContainer = subRow?.querySelector('.save-dates-btn')?.parentElement;
             if (saveBtnContainer) saveBtnContainer.classList.remove('hidden');
        } else {
             console.log('[DEBUG] Unhandled change event target:', target);
        }
    }
    async function handleProjectFileUpload(files) { console.log('[DEBUG] handleProjectFileUpload called.'); /* ... existing logic ... */ }
    async function handleDeleteProjectFile(fileUrl) { console.log('[DEBUG] handleDeleteProjectFile called.'); /* ... existing logic ... */ }
    async function handleDeleteCollaboration(collabId) { console.log('[DEBUG] handleDeleteCollaboration called.'); /* ... existing logic ... */ }
    async function handleStatusChange(collabId, newStatus) { console.log('[DEBUG] handleStatusChange called.'); /* ... existing logic ... */ }
    async function handleSavePlannedDate(collabId) { console.log('[DEBUG] handleSavePlannedDate called.'); /* ... existing logic ... */ }
    async function handleFixStatus(collabId) { /* Might be obsolete? */ console.log('[DEBUG] handleFixStatus called.'); /* ... */ }
    async function handleDateSave(collabId) { console.log('[DEBUG] handleDateSave called.'); /* ... existing logic ... */ }
    async function handleSavePerformance(collabId) { console.log('[DEBUG] handleSavePerformance called.'); /* ... existing logic ... */ }
    async function handleBatchAction() { console.log('[DEBUG] handleBatchAction called.'); /* ... existing logic ... */ }
    function openAdjustmentModal(adjId = null) { console.log('[DEBUG] openAdjustmentModal called.'); /* ... existing logic ... */ }
    function closeAdjustmentModal() { console.log('[DEBUG] closeAdjustmentModal called.'); adjustmentModal.classList.add('hidden'); }
    async function handleAdjustmentSubmit(e) { console.log('[DEBUG] handleAdjustmentSubmit called.'); /* ... existing logic ... */ }
    async function handleDeleteAdjustment(adjId) { console.log('[DEBUG] handleDeleteAdjustment called.'); /* ... existing logic ... */ }
    // --- [REVISED] handlePaginationClick ---
    async function handlePaginationClick(pageKey, e) {
         const target = e.target.closest('button.pagination-btn');
         // Ensure pageKey is valid AND the target is a valid pagination button
         if (!target || target.disabled || !pageKey || !['basic', 'performance', 'financial'].includes(pageKey)) {
             console.warn(`[DEBUG] Invalid pagination click. Target: ${target}, Disabled: ${target?.disabled}, PageKey: ${pageKey}`);
             return;
         }
         console.log(`[DEBUG] handlePaginationClick called for key: ${pageKey}`);

         const totalPages = Math.ceil(totalItems[pageKey] / itemsPerPage);
         let newPage = currentPage[pageKey];

         if (target.classList.contains('prev-page-btn')) { newPage--; }
         else if (target.classList.contains('next-page-btn')) { newPage++; }
         else if (target.dataset.page) { newPage = Number(target.dataset.page); }

         newPage = Math.max(1, Math.min(newPage, totalPages || 1));

         if (newPage !== currentPage[pageKey]) {
             currentPage[pageKey] = newPage;
             console.log(`[DEBUG] New page for ${pageKey}: ${newPage}`);
             // Reload data ONLY for the specific tab associated with this pagination
             await loadAndRenderCollaborators(pageKey, getStatusesForPageKey(pageKey)); // Pass correct statuses
         } else {
             console.log(`[DEBUG] Page ${newPage} is already the current page for ${pageKey}. No reload needed.`);
         }
     }
     // --- [REVISED] handleItemsPerPageChange ---
    async function handleItemsPerPageChange(e, key) {
        const select = e.target;
        // Ensure the event target is the select element and we have a valid key
        if (select && select.classList.contains('items-per-page-select') && key && ['basic', 'performance', 'financial'].includes(key)) {
             console.log(`[DEBUG] Items per page changed for key: ${key}`);
             itemsPerPage = Number(select.value);
             localStorage.setItem(ITEMS_PER_PAGE_KEY, itemsPerPage.toString());
             currentPage[key] = 1; // Reset to first page for this specific key
             await loadAndRenderCollaborators(key, getStatusesForPageKey(key)); // Reload data for the specific tab
         } else {
             console.error(`[DEBUG] Invalid call to handleItemsPerPageChange. Key: ${key}, Target:`, select);
         }
     }
    // --- [NEW HELPER] getStatusesForPageKey ---
    function getStatusesForPageKey(pageKey) {
        if (pageKey === 'basic') {
            if (statusFilterContainer && statusFilterContainer.style.display !== 'none' && statusFilterOptions) {
                const selectedCheckboxes = statusFilterOptions.querySelectorAll('.status-filter-checkbox:checked');
                return Array.from(selectedCheckboxes).map(cb => cb.value).join(',');
            }
            return ''; // Default empty for basic if filter not visible
        } else if (pageKey === 'performance' || pageKey === 'financial') {
            return ["客户已定档", "视频已发布"].join(',');
        }
        return ''; // Default empty
    }
    async function handleViewHistory(talentId, talentName) { console.log('[DEBUG] handleViewHistory called.'); /* ... existing logic ... */ }
    function handleSelectAllFinancialChange(e) { console.log('[DEBUG] handleSelectAllFinancialChange called.'); /* ... existing logic ... */ }
    function handleEffectDashboardToggle(e) { console.log('[DEBUG] handleEffectDashboardToggle called.'); /* ... existing logic ... */ }
    function setupStatusFilterListeners() { console.log('[DEBUG] setupStatusFilterListeners called.'); /* ... existing logic ... */ }
    function closeFilePreviewModal() { console.log('[DEBUG] closeFilePreviewModal called.'); /* ... implementation ... */ }
    function handleProjectFileActions(e) { console.log('[DEBUG] handleProjectFileActions called.'); /* ... implementation ... */ }
    function handleToggleDetails(collabId) {
         console.log(`[DEBUG] handleToggleDetails called for ${collabId}`);
         if (openDetails.has(collabId)) {
             openDetails.delete(collabId);
         } else {
             openDetails.add(collabId);
         }
         // Re-render the currently active tab to show/hide the details row
         const activeTabBtn = mainTabsContainer?.querySelector('.tab-btn.active');
         const activeTab = activeTabBtn?.dataset.tabTarget;
         let pageKey;
         switch (activeTab) {
            case 'basic-info': pageKey = 'basic'; break;
            case 'financial-info': pageKey = 'financial'; break;
            // Add other cases if details are needed in other tabs
            default: return;
         }
         // Directly call the render function for the current tab
         if (pageKey === 'basic') renderBasicInfoTab(paginatedData.basic, project);
         else if (pageKey === 'financial') renderFinancialTab(paginatedData.financial, project);
         // else if ...
    }
    function handlePreviewFile(url, name) {
        console.log(`[DEBUG] handlePreviewFile called for ${name}`);
        if (!filePreviewModal || !previewModalTitle || !previewModalIframe) return;
        previewModalTitle.textContent = `预览: ${name}`;
        previewModalIframe.src = url; // Use the proxied URL directly
        filePreviewModal.classList.remove('hidden');
    }


    // --- Start the application ---
    // Call setupEventListeners *after* DOMContentLoaded but *before* initializePage
    setupEventListeners();
    initializePage();

});

