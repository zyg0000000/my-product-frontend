/**
 * @file project_automation.js
 * @version 4.3 - Smart Polling
 * @description
 * - [核心优化] 轮询逻辑现在具备智能启停功能。当所有任务都完成后，轮询会自动停止以节省资源。
 * - 当用户创建新任务或重试失败任务时，轮询会自动重启。
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


    // --- DOM Elements ---
    const jobsContainer = document.getElementById('jobs-container');
    const talentsContainer = document.getElementById('talents-container');
    const talentsPaginationContainer = document.getElementById('talents-pagination-container');
    const breadcrumbProjectName = document.getElementById('breadcrumb-project-name');
    const projectMainTitle = document.getElementById('project-main-title');
    const projectQianchuanId = document.getElementById('project-qianchuan-id');
    const batchActionsBar = document.getElementById('batch-actions-bar');
    const selectionCountSpan = document.getElementById('selection-count');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const selectAllTalentsCheckbox = document.getElementById('select-all-talents');
    
    // --- Modals and other UI elements ---
    const configModal = document.getElementById('automation-config-modal');
    const closeConfigModalBtn = document.getElementById('close-config-modal-btn');
    const cancelConfigBtn = document.getElementById('cancel-config-btn');
    const configForm = document.getElementById('automation-config-form');
    const workflowSelect = document.getElementById('automation-workflow-select');
    const selectedCountModalSpan = document.getElementById('selected-talents-count-modal');
    const startAutomationBtn = document.getElementById('start-automation-btn');
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
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

    // --- New UI elements for UX improvements ---
    const toastNotification = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    const progressModal = document.getElementById('generation-progress-modal');
    const progressStepsContainer = document.getElementById('progress-steps-container');
    const closeProgressModalBtn = document.getElementById('close-progress-modal-btn');
    const generatedSheetsContainer = document.getElementById('generated-sheets-container');


    // --- Global State ---
    let currentProjectId = null;
    let projectData = {};
    let allCompletedTasks = [];
    let mappingTemplatesCache = [];
    let selectedTalentIds = new Set();
    let pollingInterval = null;
    let tasksCache = {};
    const TALENTS_PER_PAGE = 10;
    let talentCurrentPage = 1;
    let expandedJobIds = new Set();


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
        
        setupEventListeners();
        loadGeneratedSheets();

        try {
            const [projectResponse, collaborationsResponse, automationData] = await Promise.all([
                apiRequest(`${PROJECTS_API}?projectId=${currentProjectId}`),
                apiRequest(`${COLLABORATIONS_API}?projectId=${currentProjectId}&limit=1000`),
                apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`)
            ]);
            
            projectData = projectResponse.data;
            projectData.collaborations = collaborationsResponse.data || [];
            
            const jobs = automationData.data || [];
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
            renderAutomationJobs(jobs);

            startPolling(jobs); // Pass initial jobs to decide if polling should start

        } catch (error) {
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">无法加载页面数据: ${error.message}</div>`;
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
            renderPaginationControls(talentsPaginationContainer, 0, page, TALENTS_PER_PAGE, renderTalentList);
            return;
        }
        
        const start = (page - 1) * TALENTS_PER_PAGE;
        const end = start + TALENTS_PER_PAGE;
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
        
        renderPaginationControls(talentsPaginationContainer, collaborators.length, page, TALENTS_PER_PAGE, renderTalentList);
        updateSelectAllCheckboxState();
    }
    
    function renderAutomationJobs(jobs) {
        if (!jobs || jobs.length === 0) {
            jobsContainer.innerHTML = `<div class="p-8 text-center text-gray-500">此项目暂无自动化任务。</div>`;
            return;
        }

        jobsContainer.innerHTML = jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(job => {
            const completedTasks = (job.tasks || []).filter(t => t.status === 'completed' || t.status === 'failed').length;
            const totalTasks = (job.tasks || []).length;
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            const approveButtonHtml = job.status === 'awaiting_review' ? `<button class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-200" data-action="approve-job" data-job-id="${job._id}">审核通过</button>` : '';
            const deleteButtonHtml = `<button class="text-gray-400 hover:text-red-600 p-1 rounded-full" data-action="delete-job" data-job-id="${job._id}" title="删除任务批次"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>`;

            return `
                <div id="job-${job._id}" class="bg-white rounded-lg shadow-sm border mb-4">
                    <div class="p-4 border-b cursor-pointer flex justify-between items-center" data-action="toggle-job" data-job-id="${job._id}">
                        <div class="flex items-center gap-2">
                            ${deleteButtonHtml}
                            <div>
                                <p class="font-bold text-gray-800">任务批次 #${job._id.slice(-6)}</p>
                                <p class="text-xs text-gray-500">创建于: ${formatDate(job.createdAt, true)}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            ${approveButtonHtml}
                            ${getStatusBadge(job.status)}
                            <svg class="w-5 h-5 text-gray-400 transition-transform" data-arrow-id="${job._id}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                    <div class="p-4 border-b bg-gray-50">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-gray-700">执行进度: ${job.successTasks || 0} 成功, ${job.failedTasks || 0} 失败</span>
                            <span class="text-sm font-medium text-gray-700">${completedTasks} / ${totalTasks}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5"><div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div></div>
                    </div>
                    <div data-job-content-id="${job._id}" class="hidden p-1 sm:p-2">${renderAutomationTasks(job.tasks || [])}</div>
                </div>`;
        }).join('');
    }

    function renderAutomationTasks(tasks) {
        if (!tasks || tasks.length === 0) return '<p class="p-4 text-sm text-center text-gray-500">此批次无子任务。</p>';
        const header = `<div class="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                            <div class="col-span-3">达人昵称</div><div class="col-span-2">状态</div><div class="col-span-5">结果/错误</div><div class="col-span-2 text-right">操作</div>
                        </div>`;
        return header + tasks.map(task => {
            let resultHtml = '';
            if (task.status === 'completed') {
                const buttons = [];
                if (task.result?.screenshots?.length > 0) buttons.push(`<button class="text-blue-600 hover:underline" data-action="view-screenshots" data-task-id="${task._id}">查看截图</button>`);
                if (task.result?.data && Object.keys(task.result.data).length > 0) buttons.push(`<button class="text-sky-600 hover:underline" data-action="view-data" data-task-id="${task._id}">查看数据</button>`);
                resultHtml = buttons.join('<span class="mx-1 text-gray-300">|</span>');
            } else if (task.status === 'failed') {
                resultHtml = `<span class="text-red-600 text-xs cursor-help" title="${task.errorMessage || ''}">${(task.errorMessage || '未知错误').substring(0, 50)}...</span>`;
            }
            const actionsHtml = `
                ${task.status === 'failed' ? `<button class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-lg hover:bg-yellow-200" data-action="retry-task" data-task-id="${task._id}">重试</button>` : ''}
                <button class="text-gray-400 hover:text-red-600 p-1 rounded-full" data-action="delete-task" data-task-id="${task._id}" title="删除任务"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>
            `;
            return `<div id="task-${task._id}" class="grid grid-cols-12 gap-4 px-4 py-3 border-t items-center text-sm">
                        <div class="col-span-12 md:col-span-3"><span class="font-medium text-gray-800">${task.metadata?.talentNickname || 'N/A'}</span></div>
                        <div class="col-span-12 md:col-span-2">${getStatusBadge(task.status)}</div>
                        <div class="col-span-12 md:col-span-5 break-words">${resultHtml || '<span class="text-gray-400">---</span>'}</div>
                        <div class="col-span-12 md:col-span-2 text-left md:text-right space-x-2">${actionsHtml}</div>
                    </div>`;
        }).join('');
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
        container.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => onPageChange(parseInt(e.currentTarget.dataset.page, 10)));
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
    function hasActiveTasks(jobs) {
        for (const job of jobs) {
            for (const task of (job.tasks || [])) {
                if (['pending', 'processing'].includes(task.status)) {
                    return true;
                }
            }
        }
        return false;
    }

    function startPolling(initialJobs = []) {
        if (pollingInterval) clearInterval(pollingInterval);
        
        if (!hasActiveTasks(initialJobs)) {
            console.log("No active tasks on initial load. Polling will not start.");
            return;
        }

        const poll = async () => {
            if (document.hidden) return;
            try {
                const data = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
                const jobs = data.data || [];
                
                allCompletedTasks = [];
                jobs.forEach(job => (job.tasks || []).forEach(task => {
                    tasksCache[task._id] = task;
                    if (task.status === 'completed') allCompletedTasks.push(task);
                }));
                
                renderAutomationJobs(jobs);

                if (expandedJobIds.size > 0) {
                    expandedJobIds.forEach(jobId => {
                        const content = document.querySelector(`[data-job-content-id="${jobId}"]`);
                        const arrow = document.querySelector(`[data-arrow-id="${jobId}"]`);
                        if (content) content.classList.remove('hidden');
                        if (arrow) arrow.classList.add('rotate-180');
                    });
                }

                // [Smart Polling] Stop if no active tasks are left
                if (!hasActiveTasks(jobs)) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    console.log("All tasks completed. Polling stopped.");
                    showToast("所有任务已完成，自动刷新已停止。");
                }
            } catch (error) { 
                console.error("轮询失败:", error);
                clearInterval(pollingInterval); // Stop polling on error to prevent loops
                pollingInterval = null;
            }
        };

        pollingInterval = setInterval(poll, 5000);
        console.log("Polling started.");
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
        generatedSheetsContainer.addEventListener('click', handleSheetHistoryClick);
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
            
            // [Smart Polling] Fetch new jobs and restart polling
            const automationData = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
            const newJobs = automationData.data || [];
            renderAutomationJobs(newJobs);
            startPolling(newJobs);

        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '开始执行';
            btn.querySelector('.btn-loader').classList.add('hidden');
        }
    }

    async function handleJobsAreaClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action, jobId = target.dataset.jobId, taskId = target.dataset.taskId;

        if (action === 'toggle-job') {
            const content = document.querySelector(`[data-job-content-id="${jobId}"]`);
            const arrow = document.querySelector(`[data-arrow-id="${jobId}"]`);
            const isHidden = content.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180', !isHidden);
            if (isHidden) {
                expandedJobIds.delete(jobId);
            } else {
                expandedJobIds.add(jobId);
            }
            return;
        }

        if (action === 'delete-job') {
            showCustomConfirm('确定要删除此任务批次吗？只有在批次下没有任何子任务时才可删除。', '确认删除', async c => {
                if (c) try { await apiRequest(`${AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'DELETE'); document.getElementById(`job-${jobId}`)?.remove(); showToast('任务批次已删除'); } catch (e) {}
            });
            return;
        }
        
        if (action === 'retry-task') {
            showCustomConfirm('确定要重试此任务吗？此操作会清除该任务之前的截图和数据。', '确认重试', async c => {
                if(c) try { 
                    const url = `${AUTOMATION_TASKS_API}?id=${taskId}`;
                    await apiRequest(url, 'PUT', { action: 'rerun' });
                    showToast('任务已重新开始');
                    // [Smart Polling] Fetch data and restart polling
                    const automationData = await apiRequest(`${AUTOMATION_JOBS_GET_API}?projectId=${currentProjectId}`);
                    startPolling(automationData.data || []);
                } catch (e) {}
            });
        } else if (action === 'delete-task') {
             showCustomConfirm('确定要删除此任务吗？此操作会清除该任务的所有数据且不可撤销。', '确认删除', async c => {
                if(c) try { 
                    const url = `${AUTOMATION_TASKS_API}?id=${taskId}`;
                    await apiRequest(url, 'DELETE');
                    document.getElementById(`task-${taskId}`)?.remove();
                    showToast('任务已删除');
                } catch (e) {}
            });
        } else if (action === 'view-screenshots') openScreenshotModal(taskId);
        else if (action === 'view-data') openDataModal(taskId);
        else if (action === 'approve-job') {
            showCustomConfirm('确定要将此任务批次标记为“已完成”吗？', '确认完成', async c => {
                if(c) {
                    target.disabled = true; target.textContent = '...';
                    try {
                        await apiRequest(`${AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'PUT', { status: 'completed' });
                        const jobCard = document.getElementById(`job-${jobId}`), statusBadge = jobCard?.querySelector('[data-status]');
                        if (statusBadge) statusBadge.outerHTML = getStatusBadge('completed');
                        target.remove();
                    } catch (e) { target.disabled = false; target.textContent = '审核通过'; }
                }
            });
        }
    }
    
    // --- Sheet Generation and History ---
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

        // --- Progress Modal Logic ---
        const steps = [
            { id: 'copy', text: `步骤1: 复制飞书模板表格` },
            { id: 'aggregate', text: `步骤2: 聚合 ${selectedTaskIds.length} 条任务数据` },
            { id: 'write', text: `步骤3: 写入数据与图片` },
            { id: 'permission', text: `步骤4: 处理文件权限` }
        ];
        progressStepsContainer.innerHTML = steps.map(step => `
            <div id="step-${step.id}" class="flex items-center text-gray-500">
                <div class="status-icon w-6 h-6 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0"></div>
                <span>${step.text}</span>
            </div>`).join('');
        progressModal.classList.remove('hidden');
        closeProgressModalBtn.disabled = true;
        
        const updateStep = (stepId, status, text) => {
            const stepDiv = document.getElementById(`step-${stepId}`);
            if (!stepDiv) return;
            const icon = stepDiv.querySelector('.status-icon');
            const span = stepDiv.querySelector('span');
            stepDiv.className = "flex items-center"; // reset classes
            icon.innerHTML = '';
            icon.className = 'status-icon w-6 h-6 rounded-full mr-3 flex-shrink-0 flex items-center justify-center';

            if (status === 'processing') {
                stepDiv.classList.add('text-blue-600', 'font-semibold');
                icon.classList.add('border-2', 'border-blue-500');
                icon.innerHTML = `<svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
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
        // --- End of Progress Logic ---

        try {
            const payload = {
                primaryCollection: selectedTemplate.primaryCollection,
                mappingTemplate: selectedTemplate,
                taskIds: selectedTaskIds,
                projectName: projectData.name,
                destinationFolderToken: destinationFolderInput.value.trim()
            };

            const response = await apiRequest(FEISHU_API, 'POST', {
                dataType: 'generateAutomationReport', payload
            });
            
            clearInterval(simulationInterval);
            steps.forEach(s => updateStep(s.id, 'completed'));
            
            const { sheetUrl, sheetToken, fileName } = response.data;
            saveGeneratedSheet({ sheetUrl, sheetToken, fileName, timestamp: new Date().toISOString() });
            loadGeneratedSheets();

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
    
    function saveGeneratedSheet(sheetData) {
        const key = `generated_sheets_${currentProjectId}`;
        let history = JSON.parse(localStorage.getItem(key) || '[]');
        history.unshift(sheetData);
        if (history.length > 10) history = history.slice(0, 10); // Keep last 10
        localStorage.setItem(key, JSON.stringify(history));
    }

    function loadGeneratedSheets() {
        const key = `generated_sheets_${currentProjectId}`;
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        if (history.length === 0) {
            generatedSheetsContainer.innerHTML = '<div class="text-center py-6 text-sm text-gray-400">暂无历史记录</div>';
            return;
        }
        generatedSheetsContainer.innerHTML = history.map(item => `
            <div class="border rounded-md p-3 hover:bg-gray-50">
                <p class="font-medium text-gray-800 truncate" title="${item.fileName}">${item.fileName}</p>
                <p class="text-xs text-gray-500 mt-1">生成于: ${formatDate(item.timestamp, true)}</p>
                <div class="flex items-center justify-between mt-2">
                    <a href="${item.sheetUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">打开表格</a>
                    <button data-action="copy-token" data-token="${item.sheetToken}" class="text-xs text-gray-500 hover:text-blue-600 p-1 rounded">复制TOKEN</button>
                </div>
            </div>
        `).join('');
    }

    function handleSheetHistoryClick(e) {
        const target = e.target.closest('[data-action="copy-token"]');
        if (!target) return;
        const token = target.dataset.token;
        navigator.clipboard.writeText(token).then(() => {
            showToast('表格TOKEN已复制!');
        }).catch(err => showToast('复制失败: ' + err, 'error'));
    }


    // --- Result Modal Logic ---
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

    // --- Start the application ---
    initializePage();
});

