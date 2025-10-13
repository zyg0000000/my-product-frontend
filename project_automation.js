/**
 * @file project_automation.js
 * @version 6.4 - Update via POST
 * @description
 * - [核心修复] 将“完成审查”操作的API请求方法从 `PUT` 修改为 `POST`，以绕过潜在的环境限制，确保状态更新功能恢复正常。
 */
document.addEventListener('DOMContentLoaded', function () {
    
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const MAPPING_TEMPLATES_API = `${API_BASE_URL}/mapping-templates`;
    const FEISHU_API = `${API_BASE_URL}/sync-from-feishu`;
    const PROJECTS_API = `${API_BASE_URL}/projects`;
    const COLLABORATIONS_API = `${API_BASE_URL}/collaborations`;
    const AUTOMATION_JOBS_GET_API = `${API_BASE_URL}/automation-jobs-get`;
    const AUTOMATION_JOBS_CREATE_API = `${API_BASE_URL}/automation-jobs-create`;
    const AUTOMATION_JOBS_MANAGE_API = `${API_BASE_URL}/automation-jobs`;
    const AUTOMATION_TASKS_API = `${API_BASE_URL}/automation-tasks`;
    const AUTOMATION_WORKFLOWS_API = `${API_BASE_URL}/automation-workflows`;
    const GENERATED_SHEETS_API = `${API_BASE_URL}/generated-sheets`;


    // --- DOM Elements ---
    const jobsContainer = document.getElementById('jobs-container');
    const jobsPaginationContainer = document.getElementById('jobs-pagination-container');
    const talentsContainer = document.getElementById('talents-container');
    const talentsPaginationContainer = document.getElementById('talents-pagination-container');
    const breadcrumbProjectName = document.getElementById('breadcrumb-project-name');
    const projectMainTitle = document.getElementById('project-main-title');
    const projectQianchuanId = document.getElementById('project-qianchuan-id');
    const batchActionsBar = document.getElementById('batch-actions-bar');
    const selectionCountSpan = document.getElementById('selection-count');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const selectAllTalentsCheckbox = document.getElementById('select-all-talents');
    const generatedSheetsContainer = document.getElementById('generated-sheets-container');
    const generatedSheetsPaginationContainer = document.getElementById('generated-sheets-pagination-container');
    
    const jobDetailsModal = document.getElementById('job-details-modal');
    const jobDetailsModalTitle = document.getElementById('job-details-modal-title');
    const jobDetailsModalCloseBtn = document.getElementById('job-details-modal-close-btn');
    const jobDetailsStatsContainer = document.getElementById('job-details-stats-container');
    const jobDetailsTasksContainer = document.getElementById('job-details-tasks-container');
    const jobDetailsDeleteBtn = document.getElementById('job-details-delete-btn');
    const jobDetailsFooterCloseBtn = document.getElementById('job-details-footer-close-btn');

    const configModal = document.getElementById('automation-config-modal');
    const closeConfigModalBtn = document.getElementById('close-config-modal-btn');
    const cancelConfigBtn = document.getElementById('cancel-config-btn');
    const configForm = document.getElementById('automation-config-form');
    const workflowSelect = document.getElementById('automation-workflow-select');
    const selectedCountModalSpan = document.getElementById('selected-talents-count-modal');
    const startAutomationBtn = document.getElementById('start-automation-btn');
    const screenshotModal = document.getElementById('screenshot-modal');
    const screenshotModalTitle = document.getElementById('screenshot-modal-title');
    const closeScreenshotModalBtn = document.getElementById('close-screenshot-modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalThumbnails = document.getElementById('modal-thumbnails');
    const modalPrevBtn = document.getElementById('modal-prev-btn');
    const modalNextBtn = document.getElementById('modal-next-btn');
    const dataModal = document.getElementById('data-modal');
    const dataModalTitle = document.getElementById('data-modal-title');
    const closeDataModalBtn = document.getElementById('close-data-modal');
    const dataModalTableBody = document.getElementById('data-modal-table-body');
    const copyDataBtn = document.getElementById('copy-data-btn');
    const openSheetGeneratorBtn = document.getElementById('open-sheet-generator-btn');
    const sheetGeneratorDrawerOverlay = document.getElementById('sheet-generator-drawer-overlay');
    const sheetGeneratorDrawer = document.getElementById('sheet-generator-drawer');
    const closeSheetGeneratorBtn = document.getElementById('close-sheet-generator-btn');
    const mappingTemplateSelect = document.getElementById('mapping-template-select');
    const tasksSelectionContainer = document.getElementById('tasks-selection-container');
    const tasksForSelectionList = document.getElementById('tasks-for-selection-list');
    const generateSheetBtn = document.getElementById('generate-sheet-btn');
    const destinationFolderInput = document.getElementById('destination-folder-input');
    const toastNotification = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    const progressModal = document.getElementById('generation-progress-modal');
    const progressStepsContainer = document.getElementById('progress-steps-container');
    const closeProgressModalBtn = document.getElementById('close-progress-modal-btn');


    // --- Global State ---
    let currentProjectId = null;
    let projectData = {};
    let allCompletedTasks = [];
    let allJobsCache = [];
    let allSheetsCache = [];
    let mappingTemplatesCache = [];
    let selectedTalentIds = new Set();
    let pollingInterval = null;
    let tasksCache = {};
    const ITEMS_PER_PAGE = 10;
    let talentCurrentPage = 1;
    let jobCurrentPage = 1;
    let sheetCurrentPage = 1;


    // --- Helper Functions ---
    async function apiRequest(url, method = 'GET', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options);
            if (response.status === 204) return { success: true, message: "Operation successful." };
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API request error for ${method} ${url}:`, error);
            showToast(`操作失败: ${error.message}`, 'error');
            throw error;
        }
    }

    function formatDate(isoString, includeTime = false) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '无效日期';
        const pad = (num) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        if(includeTime) {
            const hours = pad(date.getHours());
            const minutes = pad(date.getMinutes());
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return `${year}-${month}-${day}`;
    }

    function showCustomConfirm(message, confirmText = '确认', callback) {
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
    
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        toastNotification.className = `fixed top-5 right-5 z-[100] text-white py-2 px-5 rounded-lg shadow-lg transform transition-transform duration-300`;
        if (type === 'success') {
            toastNotification.classList.add('bg-green-500');
        } else {
            toastNotification.classList.add('bg-red-500');
        }
        toastNotification.classList.remove('hidden');
        toastNotification.classList.remove('opacity-0');
        
        setTimeout(() => {
            toastNotification.classList.add('opacity-0');
            setTimeout(() => toastNotification.classList.add('hidden'), 300);
        }, 3000);
    }

    // --- Initialization ---
    async function initializePage() {
        currentProjectId = new URLSearchParams(window.location.search).get('id');
        if (!currentProjectId) {
            document.body.innerHTML = '<div class="p-8 text-center text-red-500">错误：URL中缺少项目ID。</div>';
            return;
        }
        
        await runOneTimeLocalStorageMigration();
        setupEventListeners();
        loadGeneratedSheets(1);

        try {
            const [projectResponse, collaborationsResponse, automationData] = await Promise.all([
                apiRequest(`${PROJECTS_API}?projectId=${currentProjectId}`),
                apiRequest(`${COLLABORATIONS_API}?projectId=${currentProjectId}&limit=1000`),
                apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`)
            ]);
            
            projectData = projectResponse.data;
            projectData.collaborations = collaborationsResponse.data || [];
            
            const jobs = automationData.data || [];
            allJobsCache = jobs;
            tasksCache = {};
            allCompletedTasks = [];
            jobs.forEach(job => {
                (job.tasks || []).forEach(task => {
                    tasksCache[task._id] = task;
                    if (task.status === 'completed') {
                        allCompletedTasks.push(task);
                    }
                });
            });

            renderProjectDetails(projectData);
            renderTalentList(1);
            renderAutomationJobs(1);
            startPolling(jobs);

        } catch (error) {
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">无法加载页面数据: ${error.message}</div>`;
        }
    }
    
    async function runOneTimeLocalStorageMigration() {
        const MIGRATION_FLAG = 'sheet_history_migrated_v1';
        if (localStorage.getItem(MIGRATION_FLAG)) {
            return;
        }
        try {
            const oldStorageKey = `generated_sheets_${currentProjectId}`;
            const oldHistoryJSON = localStorage.getItem(oldStorageKey);
            if (oldHistoryJSON) {
                const oldHistory = JSON.parse(oldHistoryJSON);
                if (Array.isArray(oldHistory) && oldHistory.length > 0) {
                    const dataToMigrate = oldHistory.map(item => ({ ...item, projectId: currentProjectId }));
                    await apiRequest(`${GENERATED_SHEETS_API}?action=migrate`, 'POST', dataToMigrate);
                }
            }
        } catch (error) {
            console.error('迁移本地历史记录时发生错误:', error);
        } finally {
            localStorage.setItem(MIGRATION_FLAG, 'true');
        }
    }

    // --- Rendering Functions ---
    function renderProjectDetails(project) {
        if (!project) return;
        document.title = `${project.name} - 自动化任务中心`;
        breadcrumbProjectName.textContent = project.name;
        projectMainTitle.textContent = `${project.name}`;
        projectQianchuanId.textContent = `仟传编号: ${project.qianchuanId || 'N/A'}`;
    }
    
    function renderTalentList(page) {
        talentCurrentPage = page;
        const collaborators = projectData.collaborations || [];
        if (collaborators.length === 0) {
            talentsContainer.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">此项目暂无合作达人。</td></tr>`;
            renderPaginationControls(talentsPaginationContainer, 0, page, ITEMS_PER_PAGE, renderTalentList);
            return;
        }
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const paginatedCollaborators = collaborators.slice(start, end);
        talentsContainer.innerHTML = paginatedCollaborators.map(c => {
            const talentInfo = c.talentInfo || {};
            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="p-4 w-12 text-center"><input type="checkbox" class="talent-checkbox rounded text-blue-600" data-collaborator-id="${c.id}" ${selectedTalentIds.has(c.id) ? 'checked' : ''}></td>
                    <td class="px-6 py-4 font-medium text-gray-900">${talentInfo.nickname || 'N/A'}</td>
                    <td class="px-6 py-4">${talentInfo.xingtuId || 'N/A'}</td>
                    <td class="px-6 py-4">${c.status || 'N/A'}</td>
                    <td class="px-6 py-4">${formatDate(c.plannedReleaseDate || c.orderDate)}</td>
                </tr>`;
        }).join('');
        renderPaginationControls(talentsPaginationContainer, collaborators.length, page, ITEMS_PER_PAGE, renderTalentList);
    }
    
    function renderAutomationJobs(page) {
        jobCurrentPage = page;
        if (!allJobsCache || allJobsCache.length === 0) {
            jobsContainer.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">此项目暂无自动化任务。</td></tr>`;
            renderPaginationControls(jobsPaginationContainer, 0, page, ITEMS_PER_PAGE, renderAutomationJobs);
            return;
        }
        const jobs = allJobsCache.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const paginatedJobs = jobs.slice(start, end);
        jobsContainer.innerHTML = paginatedJobs.map(job => {
            // [新增调试代码] 在浏览器控制台打印每个job的真实status值
            console.log(`Job ID: ${job._id}, Status: '${job.status}'`);

            const totalTasks = (job.tasks || []).length;
            const completedTasks = (job.tasks || []).filter(t => ['completed', 'failed'].includes(t.status)).length;
            
            let actionsHtml = '';
            if (job.status === 'awaiting_review') {
                actionsHtml = `
                    <button class="font-medium text-green-600 hover:underline" data-action="complete-review" data-job-id="${job._id}">完成审查</button>
                    <button class="font-medium text-blue-600 hover:underline" data-action="view-job-details" data-job-id="${job._id}">查看详情</button>
                `;
            } else {
                 actionsHtml = `
                    <button class="font-medium text-blue-600 hover:underline" data-action="view-job-details" data-job-id="${job._id}">查看详情</button>
                    <button class="font-medium text-red-600 hover:underline" data-action="delete-job" data-job-id="${job._id}">删除</button>
                `;
            }

            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <div class="font-bold text-gray-900">#${job._id.slice(-6)}</div>
                        <div class="text-xs text-gray-500">${formatDate(job.createdAt, true)}</div>
                    </td>
                    <td class="px-6 py-4">${getStatusBadge(job.status)}</td>
                    <td class="px-6 py-4 font-mono text-center">${completedTasks} / ${totalTasks}</td>
                    <td class="px-6 py-4 font-mono text-green-600 text-center">${job.successTasks || 0}</td>
                    <td class="px-6 py-4 font-mono text-red-600 text-center">${job.failedTasks || 0}</td>
                    <td class="px-6 py-4 text-right space-x-4">
                        ${actionsHtml}
                    </td>
                </tr>`;
        }).join('');
        renderPaginationControls(jobsPaginationContainer, jobs.length, page, ITEMS_PER_PAGE, renderAutomationJobs);
    }
    
    async function loadGeneratedSheets(page) {
        sheetCurrentPage = page;
        try {
            if (allSheetsCache.length === 0) {
                const response = await apiRequest(`${GENERATED_SHEETS_API}?projectId=${currentProjectId}`);
                allSheetsCache = response.data || [];
            }
            const history = allSheetsCache.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
            if (history.length === 0) {
                generatedSheetsContainer.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-sm text-gray-400">暂无历史记录</td></tr>';
                renderPaginationControls(generatedSheetsPaginationContainer, 0, page, ITEMS_PER_PAGE, loadGeneratedSheets);
                return;
            }
            const start = (page - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const paginatedHistory = history.slice(start, end);
            generatedSheetsContainer.innerHTML = paginatedHistory.map(item => `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <p class="font-medium text-gray-800 truncate" title="${item.fileName}">${item.fileName}</p>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(item.createdAt || item.timestamp, true)}</td>
                    <td class="px-6 py-4">
                        <a href="${item.sheetUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">打开表格</a>
                    </td>
                    <td class="px-6 py-4 text-right space-x-4">
                        <button data-action="copy-token" data-token="${item.sheetToken}" class="font-medium text-gray-600 hover:underline">复制TOKEN</button>
                        <button data-action="delete-sheet" data-id="${item._id}" class="font-medium text-red-600 hover:underline">删除</button>
                    </td>
                </tr>
            `).join('');
            renderPaginationControls(generatedSheetsPaginationContainer, history.length, page, ITEMS_PER_PAGE, loadGeneratedSheets);
        } catch (error) {
            console.error("加载历史记录失败:", error);
            generatedSheetsContainer.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-sm text-red-500">加载历史记录失败</td></tr>';
        }
    }
    
    function renderPaginationControls(container, totalItems, currentPage, itemsPerPage, onPageChange) {
        container.innerHTML = '';
        if (totalItems <= itemsPerPage) return;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const prevDisabled = currentPage === 1;
        const nextDisabled = currentPage === totalPages;
        let paginationHtml = `<span class="text-sm text-gray-700 mr-4">总计 ${totalItems} 项</span>`;
        paginationHtml += `<button data-page="${currentPage - 1}" class="px-3 py-1 text-sm rounded-md ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}" ${prevDisabled ? 'disabled' : ''}>上一页</button>`;
        paginationHtml += `<span class="px-4 text-sm text-gray-700">第 ${currentPage} / ${totalPages} 页</span>`;
        paginationHtml += `<button data-page="${currentPage + 1}" class="px-3 py-1 text-sm rounded-md ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}" ${nextDisabled ? 'disabled' : ''}>下一页</button>`;
        container.innerHTML = paginationHtml;
        container.querySelectorAll('button[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page, 10);
                onPageChange(targetPage);
            });
        });
    }

    function getStatusBadge(status) {
        const config = {
            'pending': { text: '待处理', color: 'gray' }, 'processing': { text: '执行中', color: 'blue' },
            'completed': { text: '已完成', color: 'green' }, 'failed': { text: '失败', color: 'red' },
            'awaiting_review': { text: '待审查', color: 'yellow' },
        };
        const c = config[status] || { text: status, color: 'gray' };
        return `<span data-status="${status}" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${c.color}-100 text-${c.color}-800">${c.text}</span>`;
    }

    // --- Polling ---
    function startPolling(initialJobs = []) {
        if (pollingInterval) clearInterval(pollingInterval);
        const hasActiveTasks = (jobs) => jobs.some(job => (job.tasks || []).some(task => ['pending', 'processing'].includes(task.status)));

        if (!hasActiveTasks(initialJobs)) {
            console.log("No active tasks on initial load. Polling will not start.");
            return;
        }

        const poll = async () => {
            if (document.hidden) return;
            try {
                const data = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
                allJobsCache = data.data || [];
                
                allCompletedTasks = [];
                allJobsCache.forEach(job => (job.tasks || []).forEach(task => {
                    tasksCache[task._id] = task;
                    if (task.status === 'completed') allCompletedTasks.push(task);
                }));
                
                renderAutomationJobs(jobCurrentPage);

                if (!hasActiveTasks(allJobsCache)) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    showToast("所有任务已完成，自动刷新已停止。");
                }
            } catch (error) { 
                console.error("轮询失败:", error);
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        };
        pollingInterval = setInterval(poll, 5000);
    }
    
    // --- Event Listeners & Handlers ---
    function setupEventListeners() {
        talentsContainer.addEventListener('change', handleTalentSelectionChange);
        selectAllTalentsCheckbox.addEventListener('change', handleSelectAllChange);
        generateReportBtn.addEventListener('click', openConfigModal);
        closeConfigModalBtn.addEventListener('click', closeConfigModal);
        cancelConfigBtn.addEventListener('click', closeConfigModal);
        configForm.addEventListener('submit', handleConfigFormSubmit);
        jobsContainer.addEventListener('click', handleJobsAreaClick);
        generatedSheetsContainer.addEventListener('click', handleSheetHistoryClick);
        
        if (jobDetailsModal) {
            jobDetailsModalCloseBtn.addEventListener('click', closeJobDetailsModal);
            jobDetailsFooterCloseBtn.addEventListener('click', closeJobDetailsModal);
            jobDetailsModal.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                handleTaskActions(target.dataset.action, target.dataset.taskId);
            });
        }

        closeScreenshotModalBtn.addEventListener('click', closeScreenshotModal);
        modalPrevBtn.addEventListener('click', () => changeModalImage(-1));
        modalNextBtn.addEventListener('click', () => changeModalImage(1));
        modalThumbnails.addEventListener('click', (e) => {
            const thumb = e.target.closest('.thumbnail-item');
            if (thumb) { screenshotModal.dataset.currentIndex = thumb.dataset.index; updateModalView(); }
        });
        closeDataModalBtn.addEventListener('click', closeDataModal);
        copyDataBtn.addEventListener('click', handleCopyData);
        openSheetGeneratorBtn.addEventListener('click', openSheetGeneratorDrawer);
        closeSheetGeneratorBtn.addEventListener('click', closeSheetGeneratorDrawer);
        sheetGeneratorDrawerOverlay.addEventListener('click', closeSheetGeneratorDrawer);
        mappingTemplateSelect.addEventListener('change', handleTemplateSelectionChange);
        generateSheetBtn.addEventListener('click', handleGenerateSheet);
        closeProgressModalBtn.addEventListener('click', () => progressModal.classList.add('hidden'));
    }

    function updateSelectAllCheckboxState() {
        const checkboxesOnPage = talentsContainer.querySelectorAll('.talent-checkbox');
        if (checkboxesOnPage.length === 0) { selectAllTalentsCheckbox.checked = false; return; }
        selectAllTalentsCheckbox.checked = Array.from(checkboxesOnPage).every(cb => cb.checked);
    }

    function handleTalentSelectionChange(e) {
        if (!e.target.classList.contains('talent-checkbox')) return;
        const collaboratorId = e.target.dataset.collaboratorId;
        if (e.target.checked) selectedTalentIds.add(collaboratorId);
        else selectedTalentIds.delete(collaboratorId);
        updateBatchActionBar();
        updateSelectAllCheckboxState();
    }
    
    function handleSelectAllChange(e) {
        const isChecked = e.target.checked;
        talentsContainer.querySelectorAll('.talent-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
            const collaboratorId = checkbox.dataset.collaboratorId;
            if (isChecked) selectedTalentIds.add(collaboratorId);
            else selectedTalentIds.delete(collaboratorId);
        });
        updateBatchActionBar();
    }
    
    function updateBatchActionBar() {
        selectionCountSpan.textContent = `已选择 ${selectedTalentIds.size} 位达人`;
        batchActionsBar.classList.toggle('hidden', selectedTalentIds.size === 0);
    }

    async function openConfigModal() {
        if (selectedTalentIds.size === 0) {
            showToast('请至少选择一位达人。', 'error');
            return;
        }
        selectedCountModalSpan.textContent = selectedTalentIds.size;
        const btn = startAutomationBtn;
        btn.disabled = true;
        workflowSelect.innerHTML = '<option>正在加载工作流...</option>';
        try {
            const workflowsResponse = await apiRequest(AUTOMATION_WORKFLOWS_API);
            const workflows = workflowsResponse.data || [];
            if (workflows.length > 0) {
                workflowSelect.innerHTML = workflows.map(wf => `<option value="${wf._id}">${wf.name}</option>`).join('');
                btn.disabled = false;
            } else {
                workflowSelect.innerHTML = '<option disabled selected>没有可用的工作流</option>';
            }
        } catch (error) {
            workflowSelect.innerHTML = '<option disabled selected>加载工作流失败</option>';
        }
        configModal.classList.remove('hidden');
    }
    
    function closeConfigModal() {
        configModal.classList.add('hidden');
        configForm.reset();
    }
    
    async function handleConfigFormSubmit(e) {
        e.preventDefault();
        const workflowId = workflowSelect.value;
        if (!workflowId || workflowSelect.options[workflowSelect.selectedIndex]?.disabled) {
            showToast('请选择一个有效的自动化工作流。', 'error');
            return;
        }
        const btn = startAutomationBtn;
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = '正在创建...';
        btn.querySelector('.btn-loader').classList.remove('hidden');
        const targets = Array.from(selectedTalentIds).map(id => {
            const collab = projectData.collaborations.find(c => c.id === id);
            return collab ? {
                collaborationId: collab.id,
                talentId: collab.talentId,
                nickname: collab.talentInfo?.nickname,
                xingtuId: collab.talentInfo?.xingtuId
            } : null;
        }).filter(Boolean);

        try {
            await apiRequest(AUTOMATION_JOBS_CREATE_API, 'POST', { projectId: currentProjectId, workflowId, targets });
            showToast('自动化任务已成功创建！');
            closeConfigModal();
            selectedTalentIds.clear();
            updateBatchActionBar();
            renderTalentList(talentCurrentPage);
            
            const automationData = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
            allJobsCache = automationData.data || [];
            renderAutomationJobs(1);
            startPolling(allJobsCache);

        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '开始执行';
            btn.querySelector('.btn-loader').classList.add('hidden');
        }
    }
    
    async function handleJobsAreaClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const jobId = target.dataset.jobId;

        if (action === 'view-job-details') {
            openJobDetailsModal(jobId);
            return;
        }

        // [新增] 恢复“完成审查”按钮的点击事件处理
        if (action === 'complete-review') {
            showCustomConfirm('确定要将此批次标记为“已完成”吗？', '确认', async c => {
                if (c) {
                    try {
                        // 使用 POST 方法更新状态以提高兼容性
                        await apiRequest(`${AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'POST', { status: 'completed' });
                        showToast('批次状态已更新为“已完成”');
                        // 重新加载数据以刷新UI
                        const automationData = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
                        allJobsCache = automationData.data || [];
                        renderAutomationJobs(jobCurrentPage);
                    } catch (e) { /* 错误已在 apiRequest 中处理 */ }
                }
            });
            return;
        }

        if (action === 'delete-job') {
            showCustomConfirm('确定要删除此任务批次吗？如果批次下仍有子任务，删除将失败。', '确认删除', async c => {
                if (c) {
                    try {
                        // 使用 POST 方法执行删除操作以提高兼容性
                        await apiRequest(`${AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'POST');
                        showToast('任务批次已删除');
                        allJobsCache = allJobsCache.filter(j => j._id !== jobId);
                        renderAutomationJobs(jobCurrentPage);
                    } catch (e) {
                         // apiRequest 已经处理了错误弹窗
                    }
                }
            });
            return;
        }
    }
    
    async function handleTaskActions(action, taskId) {
        if (!taskId) return;
        if (action === 'retry-task') {
            showCustomConfirm('确定要重试此任务吗？', '确认重试', async c => {
                if(c) try { 
                    await apiRequest(`${AUTOMATION_TASKS_API}?id=${taskId}`, 'PUT', { action: 'rerun' });
                    showToast('任务已重新开始');
                    const data = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
                    allJobsCache = data.data || [];
                    startPolling(allJobsCache);
                } catch (e) {}
            });
        } else if (action === 'delete-task') {
             showCustomConfirm('确定要删除此子任务吗？此操作不可撤销。', '确认删除', async c => {
                if(c) try { 
                    await apiRequest(`${AUTOMATION_TASKS_API}?id=${taskId}`, 'DELETE');
                    let deletedFromJobId = null;
                    allJobsCache.forEach(job => {
                        const taskIndex = job.tasks.findIndex(t => t._id === taskId);
                        if (taskIndex > -1) {
                            job.tasks.splice(taskIndex, 1);
                            deletedFromJobId = job._id;
                        }
                    });
                    
                    renderAutomationJobs(jobCurrentPage);
                    
                    const currentlyOpenModal = document.querySelector('#job-details-modal:not(.hidden)');
                    if(currentlyOpenModal && deletedFromJobId) {
                        openJobDetailsModal(deletedFromJobId);
                    }
                    showToast('子任务已删除');
                } catch (e) {}
            });
        } else if (action === 'view-screenshots') openScreenshotModal(taskId);
        else if (action === 'view-data') openDataModal(taskId);
    }
    
    // ... 此处省略所有未作修改的函数代码 ...
    // (handleSheetHistoryClick, openSheetGeneratorDrawer, etc.)
    // Note: All other functions from the original file are preserved here without change.
    // I will include them to make sure the file is complete.

    async function handleSheetHistoryClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        if (action === "copy-token") {
            const token = target.dataset.token;
            navigator.clipboard.writeText(token).then(() => {
                showToast('表格TOKEN已复制!');
            }).catch(err => showToast('复制失败: ' + err, 'error'));
            return;
        }
        if (action === "delete-sheet") {
            const sheetId = target.dataset.id;
            showCustomConfirm('确定要删除这条历史记录吗？此操作不可撤销。', '确认删除', async (confirmed) => {
                if (confirmed) {
                    try {
                        await apiRequest(`${GENERATED_SHEETS_API}?id=${sheetId}`, 'DELETE');
                        allSheetsCache = allSheetsCache.filter(s => s._id !== sheetId);
                        loadGeneratedSheets(sheetCurrentPage);
                        showToast('记录已删除');
                    } catch (error) {}
                }
            });
        }
    }

    async function openSheetGeneratorDrawer() {
        sheetGeneratorDrawerOverlay.classList.remove('hidden');
        sheetGeneratorDrawer.classList.add('open');
        mappingTemplateSelect.innerHTML = '<option>正在加载模板...</option>';
        tasksSelectionContainer.classList.add('hidden');
        generateSheetBtn.disabled = true;
        try {
            const response = await apiRequest(MAPPING_TEMPLATES_API);
            mappingTemplatesCache = response.data || [];
            if (mappingTemplatesCache.length > 0) {
                mappingTemplateSelect.innerHTML = '<option value="">-- 请选择一个报告模板 --</option>' + 
                    mappingTemplatesCache.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
            } else {
                mappingTemplateSelect.innerHTML = '<option value="">没有可用的模板</option>';
            }
        } catch (e) { mappingTemplateSelect.innerHTML = '<option value="">加载模板失败</option>'; }
    }

    function closeSheetGeneratorDrawer() {
        sheetGeneratorDrawer.classList.remove('open');
        sheetGeneratorDrawerOverlay.classList.add('hidden');
    }

    function handleTemplateSelectionChange() {
        tasksSelectionContainer.classList.toggle('hidden', !mappingTemplateSelect.value);
        if (mappingTemplateSelect.value) renderTasksForSelection();
        updateGenerateSheetButtonState();
    }

    function renderTasksForSelection() {
        if (allCompletedTasks.length === 0) {
            tasksForSelectionList.innerHTML = '<div class="p-4 text-center text-gray-500">此项目暂无任何已完成的任务记录。</div>';
            return;
        }
        tasksForSelectionList.innerHTML = allCompletedTasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(task => `
            <div class="p-3">
                <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" data-task-id="${task._id}" class="h-4 w-4 text-indigo-600 border-gray-300 rounded task-for-selection-checkbox">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${task.metadata?.talentNickname || '未知达人'}</p>
                        <p class="text-xs text-gray-500">执行于: ${formatDate(task.createdAt, true)}</p>
                    </div>
                </label>
            </div>`).join('');
        
        tasksForSelectionList.querySelectorAll('.task-for-selection-checkbox')
            .forEach(cb => cb.addEventListener('change', updateGenerateSheetButtonState));
    }

    function updateGenerateSheetButtonState() {
        const selectedTasks = tasksForSelectionList.querySelectorAll('.task-for-selection-checkbox:checked');
        generateSheetBtn.disabled = !(mappingTemplateSelect.value && selectedTasks.length > 0);
    }

    async function handleGenerateSheet() {
        const selectedTemplateId = mappingTemplateSelect.value;
        const selectedTaskIds = Array.from(tasksForSelectionList.querySelectorAll('.task-for-selection-checkbox:checked')).map(cb => cb.dataset.taskId);
        if (!selectedTemplateId || selectedTaskIds.length === 0) return;
        const selectedTemplate = mappingTemplatesCache.find(t => t._id === selectedTemplateId);
        if (!selectedTemplate) {
            showToast('错误：找不到所选的模板信息。', 'error');
            return;
        }
        closeSheetGeneratorDrawer();
        const btn = generateSheetBtn;
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = '生成中...';
        btn.querySelector('.btn-loader').classList.remove('hidden');
        const steps = [
            { id: 'copy', text: `步骤1: 复制飞书模板表格` },
            { id: 'aggregate', text: `步骤2: 聚合 ${selectedTaskIds.length} 条任务数据` },
            { id: 'write', text: `步骤3: 写入数据与图片` },
            { id: 'permission', text: `步骤4: 处理文件权限` }
        ];
        progressStepsContainer.innerHTML = steps.map(step => `<div id="step-${step.id}" class="flex items-center text-gray-500"><div class="status-icon w-6 h-6 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0"></div><span>${step.text}</span></div>`).join('');
        progressModal.classList.remove('hidden');
        closeProgressModalBtn.disabled = true;
        const updateStep = (stepId, status, text) => {
            const stepDiv = document.getElementById(`step-${stepId}`);
            if (!stepDiv) return;
            const icon = stepDiv.querySelector('.status-icon');
            const span = stepDiv.querySelector('span');
            stepDiv.className = "flex items-center";
            icon.innerHTML = '';
            icon.className = 'status-icon w-6 h-6 rounded-full mr-3 flex-shrink-0 flex items-center justify-center';
            if (status === 'processing') {
                stepDiv.classList.add('text-blue-600', 'font-semibold');
                icon.classList.add('border-2', 'border-blue-500');
                icon.innerHTML = `<svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
            } else if (status === 'completed') {
                stepDiv.classList.add('text-green-600');
                icon.classList.add('bg-green-500', 'border-green-500', 'text-white');
                icon.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            }
            if (text) span.textContent = text;
        };
        const runSimulation = () => {
            let currentStep = 0;
            updateStep(steps[currentStep].id, 'processing');
            const interval = setInterval(() => {
                if (currentStep < steps.length - 1) {
                    updateStep(steps[currentStep].id, 'completed');
                    currentStep++;
                    updateStep(steps[currentStep].id, 'processing');
                } else {
                    clearInterval(interval);
                }
            }, 1500);
            return interval;
        };
        const simulationInterval = runSimulation();

        try {
            const payload = {
                primaryCollection: selectedTemplate.primaryCollection,
                mappingTemplate: selectedTemplate,
                taskIds: selectedTaskIds,
                projectName: projectData.name,
                destinationFolderToken: destinationFolderInput.value.trim()
            };
            const response = await apiRequest(FEISHU_API, 'POST', { dataType: 'generateAutomationReport', payload });
            clearInterval(simulationInterval);
            steps.forEach(s => updateStep(s.id, 'completed'));
            const { sheetUrl, sheetToken, fileName } = response.data;
            await apiRequest(GENERATED_SHEETS_API, 'POST', { projectId: currentProjectId, fileName, sheetUrl, sheetToken });
            allSheetsCache = []; 
            loadGeneratedSheets(1);
            showToast('飞书表格生成成功！');
            if (sheetUrl) {
                window.open(sheetUrl, '_blank');
            }
        } catch (error) {
            clearInterval(simulationInterval);
            showToast('生成失败，请检查配置或联系管理员', 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '生成表格';
            btn.querySelector('.btn-loader').classList.add('hidden');
            closeProgressModalBtn.disabled = false;
        }
    }

    function openJobDetailsModal(jobId) {
        const job = allJobsCache.find(j => j._id === jobId);
        if (!job) {
            showToast("找不到该任务批次的信息", "error");
            return;
        }
        jobDetailsModalTitle.innerHTML = `任务批次 #${job._id.slice(-6)} - 详情 <p class="text-sm text-gray-500 mt-1">创建于: ${formatDate(job.createdAt, true)}</p>`;
        jobDetailsStatsContainer.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-2xl font-bold text-gray-800">${(job.tasks || []).length}</p><p class="text-sm text-gray-500">总任务数</p></div>
            <div class="bg-green-50 p-4 rounded-lg text-center"><p class="text-2xl font-bold text-green-600">${job.successTasks || 0}</p><p class="text-sm text-green-500">成功</p></div>
            <div class="bg-red-50 p-4 rounded-lg text-center"><p class="text-2xl font-bold text-red-600">${job.failedTasks || 0}</p><p class="text-sm text-red-500">失败</p></div>
            <div class="bg-blue-50 p-4 rounded-lg text-center"><p class="text-2xl font-bold text-blue-600">${(job.tasks || []).length - (job.successTasks || 0) - (job.failedTasks || 0)}</p><p class="text-sm text-blue-500">处理中/待处理</p></div>
        `;
        const tasks = job.tasks || [];
        if(tasks.length > 0) {
            jobDetailsTasksContainer.innerHTML = `
            <div class="border rounded-lg overflow-hidden">
                <table class="w-full text-sm text-left text-gray-700">
                    <thead class="text-xs text-gray-800 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3">达人昵称</th>
                            <th scope="col" class="px-6 py-3">状态</th>
                            <th scope="col" class="px-6 py-3">结果 / 错误</th>
                            <th scope="col" class="px-6 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y" id="job-details-tasks-tbody">
                        ${tasks.map(task => `
                            <tr class="hover:bg-gray-50" id="details-task-${task._id}">
                                <td class="px-6 py-4 font-medium text-gray-900">${task.metadata?.talentNickname || 'N/A'}</td>
                                <td class="px-6 py-4">${getStatusBadge(task.status)}</td>
                                <td class="px-6 py-4 text-xs">${getTaskResultHtml(task)}</td>
                                <td class="px-6 py-4 text-right space-x-4">${getTaskActionsHtml(task)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        } else {
            jobDetailsTasksContainer.innerHTML = `<div class="text-center py-8 text-gray-500">此批次下无子任务。</div>`;
        }
        jobDetailsDeleteBtn.onclick = () => {
             showCustomConfirm('确定要删除此任务批次及其所有子任务吗？此操作不可撤销。', '确认删除', async c => {
                if (c) {
                    closeJobDetailsModal();
                    await apiRequest(`${AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'POST');
                    allJobsCache = allJobsCache.filter(j => j._id !== jobId);
                    renderAutomationJobs(jobCurrentPage);
                    showToast('任务批次已删除');
                }
            });
        };
        jobDetailsModal.classList.remove('hidden');
    }
    
    function closeJobDetailsModal() {
        jobDetailsModal.classList.add('hidden');
    }

    function getTaskResultHtml(task) {
        if (task.status === 'completed') {
            const buttons = [];
            if (task.result?.screenshots?.length > 0) buttons.push(`<button class="text-blue-600 hover:underline" data-action="view-screenshots" data-task-id="${task._id}">查看截图</button>`);
            if (task.result?.data && Object.keys(task.result.data).length > 0) buttons.push(`<button class="text-sky-600 hover:underline" data-action="view-data" data-task-id="${task._id}">查看数据</button>`);
            return buttons.join('<span class="mx-1 text-gray-300">|</span>') || '<span class="text-gray-400">---</span>';
        } else if (task.status === 'failed') {
            return `<span class="text-red-600" title="${task.errorMessage || ''}">${(task.errorMessage || '未知错误').substring(0, 50)}...</span>`;
        }
        return '<span class="text-gray-400">---</span>';
    }

    function getTaskActionsHtml(task) {
        const actions = [];
        if (task.status === 'failed') {
            actions.push(`<button class="font-medium text-yellow-600 hover:underline" data-action="retry-task" data-task-id="${task._id}">重试</button>`);
        }
        actions.push(`<button class="font-medium text-red-600 hover:underline" data-action="delete-task" data-task-id="${task._id}">删除</button>`);
        return actions.join('<span class="mx-2"></span>');
    }

    function openScreenshotModal(taskId) {
        const task = tasksCache[taskId];
        if (!task || !task.result?.screenshots?.length) return;
        const screenshots = task.result.screenshots;
        screenshotModal.dataset.screenshots = JSON.stringify(screenshots);
        screenshotModal.dataset.currentIndex = "0";
        modalThumbnails.innerHTML = screenshots.map((ss, index) => `
            <div class="thumbnail-item p-1 border-2 border-transparent rounded-md cursor-pointer hover:border-indigo-400" data-index="${index}">
                <img src="${ss.url}" alt="${ss.name}" class="w-full h-20 object-cover rounded">
                <p class="text-xs text-gray-600 truncate mt-1" title="${ss.name}">${ss.name}</p>
            </div>
        `).join('');
        updateModalView();
        screenshotModal.classList.remove('hidden');
    }

    function closeScreenshotModal() {
        screenshotModal.classList.add('hidden');
        modalMainImage.src = '';
    }

    function updateModalView() {
        const screenshots = JSON.parse(screenshotModal.dataset.screenshots || '[]');
        let currentIndex = parseInt(screenshotModal.dataset.currentIndex, 10);
        if (screenshots.length === 0) return;
        modalMainImage.src = screenshots[currentIndex].url;
        screenshotModalTitle.textContent = `截图结果 (${currentIndex + 1} / ${screenshots.length}) - ${screenshots[currentIndex].name}`;
        modalThumbnails.querySelectorAll('.thumbnail-item').forEach(thumb => {
            const isActive = parseInt(thumb.dataset.index, 10) === currentIndex;
            thumb.classList.toggle('active', isActive);
            if (isActive) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        modalPrevBtn.hidden = currentIndex === 0;
        modalNextBtn.hidden = currentIndex === screenshots.length - 1;
    }
    
    function changeModalImage(direction) {
        let currentIndex = parseInt(screenshotModal.dataset.currentIndex, 10);
        const screenshots = JSON.parse(screenshotModal.dataset.screenshots || '[]');
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < screenshots.length) {
            screenshotModal.dataset.currentIndex = newIndex.toString();
            updateModalView();
        }
    }

    function openDataModal(taskId) {
        const task = tasksCache[taskId];
        const data = task?.result?.data;
        if (!data || Object.keys(data).length === 0) return;
        dataModalTitle.textContent = `数据抓取结果 (星图ID: ${task.metadata?.xingtuId || 'N/A'})`;
        dataModalTableBody.innerHTML = Object.entries(data).map(([key, value]) => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">${key}</td>
                <td class="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">${String(value).replace(/\n/g, '<br>')}</td>
            </tr>
        `).join('');
        copyDataBtn.dataset.taskData = JSON.stringify(data);
        dataModal.classList.remove('hidden');
    }

    function closeDataModal() {
        dataModal.classList.add('hidden');
    }

    function handleCopyData() {
        const data = JSON.parse(copyDataBtn.dataset.taskData || '{}');
        const textToCopy = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('数据已复制!');
        }).catch(err => showToast('复制失败: ' + err, 'error'));
    }

    initializePage();
});

