/**
 * @file automation_suite.js
 * @version 10.2 - Final Simplification & Cleanup
 * @description
 * - [UI简化] 根据最终要求，仅移除了非审查状态下的“查看详情”按钮，界面更加简洁。
 * - [功能保留] “待审查”状态下的“完成审查”功能，以及为其他状态保留的“删除”功能，均保持不变。
 * - [代码清理] 彻底移除了所有与“查看详情”弹窗相关的函数和逻辑。
 * - [代码健壮性] 包含所有必要的辅助函数，确保无运行时错误。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- 全局变量与配置 ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const API_PATHS = {
        workflows: `${API_BASE_URL}/automation-workflows`,
        tasks: `${API_BASE_URL}/automation-tasks`,
        projects: `${API_BASE_URL}/projects?view=simple`,
        jobs: `${API_BASE_URL}/automation-jobs-get`,
        jobsManage: `${API_BASE_URL}/automation-jobs`
    };
    const JOBS_PER_PAGE = 4;
    const TASKS_PER_LOAD = 10;

    // --- 状态管理 ---
    let state = {
        viewMode: 'workflow',
        activeFilter: { type: 'all', value: 'all' },
        currentPage: 1,
        projectSearchTerm: ''
    };
    let allWorkflows = [];
    let allProjects = [];
    let allJobsCache = [];
    let projectMap = new Map();
    let workflowMap = new Map();
    let openJobDetails = new Set();
    let tasksPaginationState = {};
    let selectedWorkflowId = null;
    let sortableCanvas = null;
    let sortableLibrary = null;

    // --- DOM 元素获取 ---
    const workflowsListContainer = document.getElementById('workflows-list');
    const targetIdInput = document.getElementById('target-id-input');
    const targetIdLabel = document.getElementById('target-id-label');
    const executeTaskBtn = document.getElementById('execute-task-btn');
    const newWorkflowBtn = document.getElementById('new-workflow-btn');
    const workflowModal = document.getElementById('workflow-modal');
    const modalTitle = document.getElementById('modal-title');
    const workflowForm = document.getElementById('workflow-form');
    const workflowIdInput = document.getElementById('workflow-id-input');
    const workflowNameInput = document.getElementById('workflow-name-input');
    const workflowTypeSelect = document.getElementById('workflow-type-select');
    const workflowDescriptionInput = document.getElementById('workflow-description-input');
    const requiredInputKeyInput = document.getElementById('required-input-key');
    const requiredInputLabelInput = document.getElementById('required-input-label');
    const cancelWorkflowBtn = document.getElementById('cancel-workflow-btn');
    const actionLibrary = document.getElementById('action-library');
    const workflowCanvas = document.getElementById('workflow-canvas');
    const stepBlockTemplate = document.getElementById('step-block-template');
    
    const statisticCardsContainer = document.getElementById('statistic-cards-container');
    const filteredJobsList = document.getElementById('filtered-jobs-list');
    const jobsPaginationContainer = document.getElementById('jobs-pagination-container');
    const toggleViewWorkflowBtn = document.getElementById('toggle-view-workflow');
    const toggleViewProjectBtn = document.getElementById('toggle-view-project');
    const toggleViewTestBtn = document.getElementById('toggle-view-test');
    const projectFilterContainer = document.getElementById('project-filter-container');
    const projectSearchInput = document.getElementById('project-search-input');
    const projectSearchResults = document.getElementById('project-search-results');
    
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

    // --- API & 工具函数 ---
    async function apiCall(url, method = 'GET', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || 'Unknown API error');
            }
            if (response.status === 204) return null;
            return response.json();
        } catch (error) {
            console.error(`API call failed for ${method} ${url}:`, error);
            showToast(`操作失败: ${error.message}`, 'error');
            throw error;
        }
    }

    // --- 辅助弹窗函数 ---
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

    const toastNotification = document.createElement('div');
    toastNotification.id = 'toast-notification-js';
    toastNotification.className = 'fixed top-5 right-5 z-[110] text-white py-2 px-5 rounded-lg shadow-lg transform transition-all duration-300 opacity-0 hidden';
    toastNotification.innerHTML = `<p id="toast-message-js"></p>`;
    document.body.appendChild(toastNotification);
    
    function showToast(message, type = 'success') {
        const toastMessageEl = document.getElementById('toast-message-js');
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
    
    function showCustomConfirm(message, title = '请确认', callback) {
        const confirmModalEl = document.getElementById('custom-confirm-modal');
        const confirmTitle = document.getElementById('confirm-modal-title-js');
        const confirmMessage = document.getElementById('confirm-modal-message-js');
        const confirmOkBtn = document.getElementById('confirm-modal-confirm-btn-js');
        const confirmCancelBtn = document.getElementById('confirm-modal-cancel-btn-js');

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

    function formatRelativeTime(isoString) {
        if (!isoString) return '无记录';
        const date = new Date(isoString);
        const diff = new Date() - date;
        const diffMinutes = Math.floor(diff / 60000);
        if (diffMinutes < 1) return '刚刚';
        if (diffMinutes < 60) return `${diffMinutes}分钟前`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}小时前`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}天前`;
    }
    
    const ACTION_DEFINITIONS = {
        'Go to URL': { title: '导航到页面', color: 'cyan', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.536a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：打开达人主页' }, { name: 'url', label: '页面URL *', type: 'text', placeholder: 'https://example.com/{{placeholder}}', required: true }, ] },
        waitForSelector: { title: '等待元素出现', color: 'sky', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：等待价格模块加载' }, { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '.price-container .final-price', required: true }, ] },
        click: { title: '点击元素', color: 'indigo', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：点击“下一页”按钮' }, { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '#some-button-id', required: true }, ] },
        screenshot: { title: '截取区域', color: 'teal', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：截取价格区域' }, { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '.price-container', required: true }, { name: 'saveAs', label: '保存为 *', type: 'text', placeholder: '价格截图.png', required: true }, { name: 'stitched', label: '长截图模式', type: 'checkbox' } ] },
        wait: { title: '等待', color: 'orange', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：等待动画加载' }, { name: 'milliseconds', label: '等待时长 (毫秒) *', type: 'number', placeholder: '2000', required: true }, ] },
        scrollPage: { title: '滚动页面', color: 'purple', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 17l-4 4m0 0l-4-4m4 4V3"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '滚动页面以加载更多内容' }, { name: 'selector', label: '滚动区域 (可选)', type: 'text', placeholder: '默认为整个页面, 可指定如 .scroll-div' } ] },
        waitForNetworkIdle: { title: '等待加载', color: 'gray', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M5 5a7 7 0 0012 5l-2.5-2.5M19 19v-5h-5M18 18a7 7 0 00-12-5l2.5 2.5"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '等待所有网络请求完成' } ] },
        extractData: { title: '提取数据', color: 'amber', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3v3m-3-3v3m-3-3v3M3 17l6-6 4 4 6-6"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：提取预期CPM' }, { name: 'dataName', label: '数据名称 *', type: 'text', placeholder: '预期CPM', required: true }, { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: 'text=预期CPM >> span.value', required: true }, ] },
        compositeExtract: { title: '组合数据', color: 'rose', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`, fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：拼接用户画像总结' }, { name: 'dataName', label: '最终数据名称 *', type: 'text', placeholder: '用户画像总结', required: true }, { name: 'template', label: '组合模板 *', type: 'textarea', placeholder: '触达用户 ${age_gender}\\n集中 ${city_tier}', required: true } ], isComplex: true }
    };

    // --- 初始化 ---
    async function initializeApp() {
        setupEventListeners();
        populateActionLibrary();
        
        renderApp();

        await Promise.all([
            loadWorkflows(),
            loadProjects(),
        ]);
        
        await loadAllJobs();
        
        renderApp();
    }
    
    async function loadWorkflows() {
        try {
            const response = await apiCall(API_PATHS.workflows);
            allWorkflows = response.data || [];
            workflowMap.clear();
            allWorkflows.filter(wf => wf && wf._id).forEach(wf => workflowMap.set(wf._id, wf));
            renderWorkflowsList();
        } catch (error) {
            workflowsListContainer.innerHTML = '<p class="text-red-500">加载工作流失败。</p>';
        }
    }

    async function loadProjects() {
        try {
            const response = await apiCall(API_PATHS.projects);
            allProjects = response.data || [];
            projectMap.clear();
            allProjects.forEach(p => projectMap.set(p.id, p.name));
        } catch (error) {
            console.error("加载项目列表失败:", error);
        }
    }
    
    async function loadAllJobs() {
        const projectIds = allProjects.map(p => p.id);
        const jobPromises = projectIds.map(id => apiCall(`${API_PATHS.jobs}?projectId=${id}`));
        const independentJobsPromise = apiCall(`${API_PATHS.jobs}?projectId=null`);

        try {
            const results = await Promise.all([...jobPromises, independentJobsPromise]);
            allJobsCache = results.flatMap(res => res.data || []);

            // 加载独立测试任务并添加到缓存
            await loadIndependentTasks();
        } catch (error) {
            console.error("加载所有任务批次失败:", error);
            allJobsCache = [];
        }
    }

    async function loadIndependentTasks() {
        try {
            // 查询 jobId 为 null 的测试任务
            const response = await apiCall(`${API_PATHS.tasks}?jobId=null&limit=100`);
            const tasks = response.data || [];

            // 为每个独立任务创建虚拟 Job，以复用现有展示逻辑
            const virtualJobs = tasks.map(task => ({
                _id: `test_${task._id}`,
                workflowId: task.workflowId,
                projectId: task.projectId,
                createdAt: task.createdAt,
                status: task.status,
                tasks: [task],
                isVirtualJob: true,  // 标记为虚拟 Job
                isTestTask: true     // 标记为测试任务
            }));

            // 将虚拟 Jobs 添加到缓存
            allJobsCache = [...allJobsCache, ...virtualJobs];

            console.log(`[Test Tasks] Loaded ${virtualJobs.length} independent test tasks`);
        } catch (error) {
            console.error("加载独立测试任务失败:", error);
        }
    }

    // --- 核心渲染逻辑 ---
    function renderApp() {
        renderStatisticCards();
        renderFilteredJobsList();
    }

    function generateStatistics() {
        const grouped = {};

        // 根据视图模式筛选任务
        let jobsToProcess = allJobsCache.filter(job => job && job._id);

        // 测试任务视图：只显示测试任务
        if (state.viewMode === 'test') {
            jobsToProcess = jobsToProcess.filter(job => job.isTestTask === true);
        } else {
            // 工作流/项目视图：排除测试任务
            jobsToProcess = jobsToProcess.filter(job => !job.isTestTask);
        }

        // 工作流视图：只显示有效工作流的任务
        if (state.viewMode === 'workflow') {
            jobsToProcess = jobsToProcess.filter(job => workflowMap.has(job.workflowId));
        }

        jobsToProcess.forEach(job => {
            let key, name, color;
            if (state.viewMode === 'workflow' || state.viewMode === 'test') {
                const workflow = workflowMap.get(job.workflowId);
                key = job.workflowId;
                name = workflow ? workflow.name : '未知工作流';
                color = state.viewMode === 'test' ? 'amber' : 'indigo';
            } else {
                const projectName = projectMap.get(job.projectId);
                key = job.projectId || 'independent';
                name = projectName || '独立任务';
                color = 'purple';
            }
            if (!grouped[key]) {
                grouped[key] = { key, name, color, total: 0, success: 0, failed: 0, processing: 0, lastRun: new Date(0) };
            }
            grouped[key].total++;
            if (new Date(job.createdAt) > grouped[key].lastRun) grouped[key].lastRun = new Date(job.createdAt);

            const taskStatuses = (job.tasks || []).map(t => t.status);
            if(taskStatuses.includes('failed')) grouped[key].failed++;
            else if (taskStatuses.includes('processing') || taskStatuses.includes('pending')) grouped[key].processing++;
            else if (job.status === 'completed' || job.status === 'awaiting_review') grouped[key].success++;
        });

        const allStatsName = state.viewMode === 'test' ? '所有测试' : '所有任务';
        const allStats = { key: 'all', name: allStatsName, color: 'gray', total: 0, success: 0, failed: 0, processing: 0, lastRun: new Date(0) };
        Object.values(grouped).forEach(stat => {
            allStats.total += stat.total;
            allStats.success += stat.success;
            allStats.failed += stat.failed;
            allStats.processing += stat.processing;
            if (stat.lastRun > allStats.lastRun) allStats.lastRun = stat.lastRun;
        });
        return [allStats, ...Object.values(grouped).sort((a,b) => b.lastRun - a.lastRun)];
    }

    function renderStatisticCards() {
        statisticCardsContainer.innerHTML = '';
        let stats = generateStatistics();

        if (state.viewMode === 'project') {
            const searchTerm = state.projectSearchTerm.toLowerCase();
            if (searchTerm) {
                 stats = stats.filter(stat => stat.key === 'all' || (stat.name && stat.name.toLowerCase().includes(searchTerm)));
            } else if (state.activeFilter.type !== 'project') {
                 statisticCardsContainer.innerHTML = `<div class="col-span-1 md:col-span-2 text-center text-sm text-gray-500 py-4">请在上方搜索并选择一个项目以查看其统计数据。</div>`;
                return;
            }
        }
        
        stats.forEach(stat => {
            const card = document.createElement('div');
            const isActive = (state.activeFilter.type === state.viewMode || state.activeFilter.type === 'all') && state.activeFilter.value === stat.key;
            card.className = `stat-card p-4 bg-white rounded-lg shadow-sm border-2 ${isActive ? 'active border-indigo-500' : 'border-transparent'}`;
            card.dataset.filterType = state.viewMode;
            card.dataset.filterValue = stat.key;
            
            const successRate = stat.total > 0 ? (stat.success / stat.total) * 100 : 0;
            
            card.innerHTML = `
                <h4 class="font-bold text-gray-800 truncate">${stat.name}</h4>
                <p class="text-xs text-gray-500">共执行 ${stat.total} 次 &bull; 最近: ${stat.lastRun.getTime() > 0 ? formatRelativeTime(stat.lastRun) : '无记录'}</p>
                <div class="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                    <div class="bg-green-500 h-1.5 rounded-full" style="width: ${successRate.toFixed(0)}%"></div>
                </div>
                <div class="flex justify-between items-center mt-2 text-xs font-medium">
                    <span class="text-green-600">成功: ${stat.success}</span>
                    <span class="text-red-600">失败: ${stat.failed}</span>
                    <span class="text-blue-600">处理中: ${stat.processing}</span>
                </div>
            `;
            statisticCardsContainer.appendChild(card);
        });
    }

    function renderFilteredJobsList() {
        const jobsToDisplay = allJobsCache
            .filter(job => {
                if (!job || !job._id) return false;

                // 🆕 根据视图模式筛选
                if (state.viewMode === 'test') {
                    // 测试任务视图：只显示测试任务
                    if (!job.isTestTask) return false;
                } else {
                    // 工作流/项目视图：排除测试任务
                    if (job.isTestTask) return false;
                }

                // 根据卡片筛选条件
                if (state.activeFilter.type === 'all' || state.activeFilter.type === 'none') return true;
                if (state.activeFilter.type === 'workflow' || state.activeFilter.type === 'test') return job.workflowId === state.activeFilter.value;
                if (state.activeFilter.type === 'project') return (job.projectId || 'independent') === state.activeFilter.value;
                return true;
            })
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        filteredJobsList.innerHTML = '';
        const totalItems = jobsToDisplay.length;
        const totalPages = Math.ceil(totalItems / JOBS_PER_PAGE);
        state.currentPage = Math.min(state.currentPage, totalPages || 1);
        
        const paginatedJobs = jobsToDisplay.slice((state.currentPage - 1) * JOBS_PER_PAGE, state.currentPage * JOBS_PER_PAGE);

        if (paginatedJobs.length === 0) {
             if (state.viewMode === 'project' && state.activeFilter.type !== 'project') {
                filteredJobsList.innerHTML = `<p class="text-center py-6 text-sm text-gray-500">请先在上方选择一个项目。</p>`;
            } else {
                filteredJobsList.innerHTML = `<p class="text-center py-6 text-sm text-gray-500">没有找到匹配的任务批次。</p>`;
            }
        } else {
            paginatedJobs.forEach(job => {
                const jobElement = document.createElement('div');
                const isExpanded = openJobDetails.has(job._id);
                jobElement.className = `job-row bg-white rounded-lg border border-gray-200 transition-all duration-300 ${isExpanded ? 'expanded' : ''}`;
                jobElement.innerHTML = buildJobRowHTML(job);
                filteredJobsList.appendChild(jobElement);
                if (isExpanded) {
                    renderTasksForJob(job, jobElement.querySelector('.tasks-sublist'));
                }
            });
        }
        renderJobsPagination(totalPages, state.currentPage);
    }
    
    function buildJobRowHTML(job) {
        const total = job.tasks?.length || 0;
        const success = (job.tasks || []).filter(t => t.status === 'completed').length;
        const failed = (job.tasks || []).filter(t => t.status === 'failed').length;
        const progressPercent = total > 0 ? ((success + failed) / total) * 100 : 0;
        const statusConfig = { processing: { text: '执行中', color: 'blue' }, awaiting_review: { text: '待审查', color: 'yellow' }, completed: { text: '已完成', color: 'green' }, failed: { text: '失败', color: 'red' } };
        const statusInfo = statusConfig[job.status] || { text: job.status, color: 'gray' };
        
        const workflow = workflowMap.get(job.workflowId) || { name: '未知工作流' };

        // [v10.1 简化] 调整按钮逻辑
        let topRightControls = `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-800">${statusInfo.text}</span>`;
        if (job.status === 'awaiting_review') {
            topRightControls += `<button class="font-medium text-green-600 hover:text-green-800 text-xs bg-green-100 hover:bg-green-200 rounded-full px-3 py-1" data-action="complete-review" data-job-id="${job._id}">完成审查</button>`;
        } else if (job.status !== 'completed') {
             // 为 'processing', 'failed' 等状态保留删除按钮
             topRightControls += `<button class="font-medium text-red-600 hover:text-red-800 text-xs bg-red-100 hover:bg-red-200 rounded-full px-3 py-1" data-action="delete-job" data-job-id="${job._id}">删除</button>`;
        }
        
        return `
        <div class="job-header p-3 hover:bg-gray-50 cursor-pointer" data-action="toggle-details" data-job-id="${job._id}">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-semibold text-gray-800 text-sm">${workflow.name}</p>
                    <p class="text-xs text-gray-500">#${job._id.slice(-6)} &bull; ${formatRelativeTime(job.createdAt)}</p>
                </div>
                <div class="flex items-center gap-3">
                    ${topRightControls}
                    <svg class="w-4 h-4 text-gray-500 expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
            </div>
            <div class="mt-2">
                <div class="flex justify-between text-xs text-gray-600 mb-1">
                    <span>进度: ${success + failed} / ${total}</span>
                    <span>成功: <b class="text-green-600">${success}</b>, 失败: <b class="text-red-600">${failed}</b></span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-blue-600 h-1.5 rounded-full" style="width: ${progressPercent}%"></div></div>
            </div>
        </div>
        <div class="job-details-content"><div class="tasks-sublist p-2 space-y-2"></div></div>`;
    }

    function renderTasksForJob(job, container) {
        if (!tasksPaginationState[job._id]) {
            tasksPaginationState[job._id] = { loaded: 0 };
        }
        
        const state = tasksPaginationState[job._id];
        const tasks = job.tasks || [];
        const tasksToRender = tasks.slice(0, state.loaded + TASKS_PER_LOAD);
        
        container.innerHTML = tasksToRender.map(task => buildTaskRowHTML(task)).join('');

        state.loaded = tasksToRender.length;
        
        if (state.loaded < tasks.length) {
            const remaining = tasks.length - state.loaded;
            container.innerHTML += `<button class="load-more-tasks-btn w-full text-center text-xs text-blue-600 hover:underline py-2" data-job-id="${job._id}">加载更多 (${remaining}条)</button>`;
        }
    }
    
    function buildTaskRowHTML(task) {
        const statusConfig = { 
            pending: { text: '等待中', color: 'gray' }, 
            processing: { text: '处理中', color: 'blue' }, 
            completed: { text: '成功', color: 'green' }, 
            failed: { text: '失败', color: 'red' }
        };
        const statusInfo = statusConfig[task.status] || { text: '未知', color: 'gray' };
        const targetId = task.targetId || task.xingtuId || 'N/A';
        
        let resultHtml = '';
        if (task.status === 'completed') {
            const buttons = [];
            if (task.result?.screenshots?.length > 0) buttons.push(`<button class="text-blue-600 hover:underline" data-action="view-screenshots" data-task-id="${task._id}">截图</button>`);
            if (task.result?.data && Object.keys(task.result.data).length > 0) buttons.push(`<button class="text-sky-600 hover:underline" data-action="view-data" data-task-id="${task._id}">数据</button>`);
            resultHtml = buttons.join('<span class="mx-1 text-gray-300">|</span>');
        } else if (task.status === 'failed') {
            resultHtml = `<button class="text-red-600 hover:underline" title="${task.errorMessage || ''}" data-action="view-error" data-task-id="${task._id}">错误</button>`;
        }

        return `
        <div class="task-item flex justify-between items-center p-2 bg-gray-100 rounded-md text-xs">
            <p class="font-mono text-gray-700 truncate" title="目标ID: ${targetId}">${targetId}</p>
            <div class="flex items-center gap-3 flex-shrink-0">
                <span class="font-semibold text-${statusInfo.color}-600">${statusInfo.text}</span>
                <div class="space-x-2 w-20 text-center">${resultHtml}</div>
            </div>
        </div>`;
    }

    function renderJobsPagination(totalPages, currentPage) {
        jobsPaginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        jobsPaginationContainer.innerHTML = `
            <button data-page="${currentPage - 1}" class="pagination-btn px-3 py-1 text-sm rounded-md" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
            <span class="px-4 text-sm text-gray-700">第 ${currentPage} / ${totalPages} 页</span>
            <button data-page="${currentPage + 1}" class="pagination-btn px-3 py-1 text-sm rounded-md" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
        `;
    }

    // --- 事件处理器 ---
    function setupEventListeners() {
        toggleViewWorkflowBtn.addEventListener('click', () => {
            state.viewMode = 'workflow';
            state.activeFilter = { type: 'all', value: 'all' };
            state.currentPage = 1;
            state.projectSearchTerm = '';
            projectSearchInput.value = '';
            toggleViewWorkflowBtn.classList.add('active');
            toggleViewProjectBtn.classList.remove('active');
            toggleViewTestBtn.classList.remove('active');
            projectFilterContainer.classList.add('hidden');
            renderApp();
        });

        toggleViewProjectBtn.addEventListener('click', () => {
            state.viewMode = 'project';
            state.activeFilter = { type: 'none', value: null };
            state.currentPage = 1;
            toggleViewProjectBtn.classList.add('active');
            toggleViewWorkflowBtn.classList.remove('active');
            toggleViewTestBtn.classList.remove('active');
            projectFilterContainer.classList.remove('hidden');
            renderApp();
        });

        toggleViewTestBtn.addEventListener('click', () => {
            state.viewMode = 'test';
            state.activeFilter = { type: 'all', value: 'all' };
            state.currentPage = 1;
            state.projectSearchTerm = '';
            projectSearchInput.value = '';
            toggleViewTestBtn.classList.add('active');
            toggleViewWorkflowBtn.classList.remove('active');
            toggleViewProjectBtn.classList.remove('active');
            projectFilterContainer.classList.add('hidden');
            renderApp();
        });

        projectSearchInput.addEventListener('input', () => {
            const searchTerm = projectSearchInput.value.toLowerCase();
            projectSearchResults.innerHTML = '';
            if (!searchTerm) {
                projectSearchResults.classList.add('hidden');
                return;
            }
            const matchedProjects = allProjects.filter(p => p.name.toLowerCase().includes(searchTerm));
            if (matchedProjects.length > 0) {
                matchedProjects.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
                    item.textContent = p.name;
                    item.dataset.projectId = p.id;
                    projectSearchResults.appendChild(item);
                });
                projectSearchResults.classList.remove('hidden');
            } else {
                projectSearchResults.classList.add('hidden');
            }
        });

        projectSearchResults.addEventListener('click', e => {
            const item = e.target.closest('[data-project-id]');
            if (item) {
                const projectId = item.dataset.projectId;
                projectSearchInput.value = item.textContent;
                projectSearchResults.classList.add('hidden');

                state.activeFilter = { type: 'project', value: projectId };
                state.currentPage = 1;
                renderApp();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!projectFilterContainer.contains(e.target)) {
                projectSearchResults.classList.add('hidden');
            }
        });


        statisticCardsContainer.addEventListener('click', e => {
            const card = e.target.closest('.stat-card');
            if (!card) return;
            
            const clickedFilterValue = card.dataset.filterValue;

            if (card.classList.contains('active') && clickedFilterValue !== 'all') {
                card.classList.remove('active');
                state.activeFilter = { type: 'all', value: 'all' };
                statisticCardsContainer.querySelector('[data-filter-value="all"]').classList.add('active');
            } else {
                statisticCardsContainer.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                state.activeFilter = { type: card.dataset.filterType, value: clickedFilterValue };
            }
            state.currentPage = 1;
            renderFilteredJobsList();
        });
        
        filteredJobsList.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
        
            const action = actionTarget.dataset.action;
            const jobId = actionTarget.dataset.jobId;
        
            if (actionTarget.tagName === 'BUTTON') {
                e.stopPropagation();
            }
        
            switch (action) {
                case 'toggle-details':
                    if (openJobDetails.has(jobId)) {
                        openJobDetails.delete(jobId);
                    } else {
                        openJobDetails.add(jobId);
                        tasksPaginationState[jobId] = { loaded: 0 };
                    }
                    renderFilteredJobsList();
                    break;
                case 'complete-review':
                    showCustomConfirm('确定要将此批次标记为“已完成”吗？', '确认', async (confirmed) => {
                        if (confirmed) {
                            try {
                                await apiCall(`${API_PATHS.jobsManage}?id=${jobId}`, 'POST', { status: 'completed' });
                                showToast('批次状态已更新为“已完成”');
                                const job = allJobsCache.find(j => j._id === jobId);
                                if (job) job.status = 'completed';
                                renderFilteredJobsList();
                            } catch (error) { /* handled in apiCall */ }
                        }
                    });
                    break;
                case 'delete-job':
                    showCustomConfirm('确定要删除此任务批次吗？如果批次下仍有子任务，删除将失败。', '确认删除', async (confirmed) => {
                        if (confirmed) {
                            try {
                                await apiCall(`${API_PATHS.jobsManage}?id=${jobId}`, 'DELETE');
                                showToast('任务批次已删除');
                                allJobsCache = allJobsCache.filter(j => j._id !== jobId);
                                renderFilteredJobsList();
                            } catch (error) { /* handled in apiCall */ }
                        }
                    });
                    break;
                default:
                    const taskId = actionTarget.dataset.taskId;
                    handleTaskActions(action, taskId);
                    break;
            }
        });
        
        jobsPaginationContainer.addEventListener('click', e => {
            const button = e.target.closest('button[data-page]');
            if (button && !button.disabled) {
                state.currentPage = parseInt(button.dataset.page, 10);
                renderFilteredJobsList();
            }
        });
        
        workflowsListContainer.addEventListener('click', (event) => {
            const workflowItem = event.target.closest('.workflow-item');
            const editBtn = event.target.closest('.edit-workflow-btn');
            const deleteBtn = event.target.closest('.delete-workflow-btn');

            if (deleteBtn) {
                handleDeleteWorkflow(deleteBtn.dataset.id);
            } else if (editBtn) {
                openWorkflowModalForEdit(editBtn.dataset.id);
            } else if (workflowItem) {
                handleWorkflowSelection(workflowItem.dataset.id);
            }
        });

        executeTaskBtn.addEventListener('click', async () => {
             if (executeTaskBtn.disabled) return;
            const workflow = allWorkflows.find(w => w._id === selectedWorkflowId);
            if (!workflow) return;
            const requiredInputKey = workflow.requiredInput?.key || 'xingtuId';
            const payload = { 
                workflowId: selectedWorkflowId, 
                projectId: null,
                [requiredInputKey]: targetIdInput.value.trim() 
            };
            try {
                executeTaskBtn.disabled = true;
                const response = await apiCall(API_PATHS.tasks, 'POST', payload);
                if(response.data) {
                    const tempJob = {
                         _id: `temp_job_${Date.now()}`,
                        workflowId: payload.workflowId,
                        projectId: null,
                        createdAt: new Date().toISOString(),
                        status: 'processing',
                        tasks: [response.data]
                    };
                    allJobsCache.unshift(tempJob);
                    renderApp();
                }
                targetIdInput.value = '';
                updateExecuteButtonState();
            } catch (error) {
                // error is alerted in apiCall
            } finally {
                executeTaskBtn.disabled = false;
            }
        });
        newWorkflowBtn.addEventListener('click', openWorkflowModalForCreate);
        cancelWorkflowBtn.addEventListener('click', () => workflowModal.classList.add('hidden'));
        workflowForm.addEventListener('submit', handleWorkflowFormSubmit);
        targetIdInput.addEventListener('input', updateExecuteButtonState);

        if (closeScreenshotModalBtn) closeScreenshotModalBtn.addEventListener('click', closeScreenshotModal);
        if (modalPrevBtn) modalPrevBtn.addEventListener('click', () => changeModalImage(-1));
        if (modalNextBtn) modalNextBtn.addEventListener('click', () => changeModalImage(1));
        if (modalThumbnails) modalThumbnails.addEventListener('click', (e) => {
            const thumb = e.target.closest('.thumbnail-item');
            if (thumb) { screenshotModal.dataset.currentIndex = thumb.dataset.index; updateModalView(); }
        });
        if (closeDataModalBtn) closeDataModalBtn.addEventListener('click', closeDataModal);
        if (copyDataBtn) copyDataBtn.addEventListener('click', handleCopyData);
        
        actionLibrary.addEventListener('click', (event) => {
            const btn = event.target.closest('.add-step-btn');
            if (btn) {
                checkCanvasEmptyState();
                const newBlock = createStepBlockElement(btn.dataset.action);
                if(newBlock) workflowCanvas.appendChild(newBlock);
            }
        });
        workflowCanvas.addEventListener('click', (event) => {
            const delBtn = event.target.closest('.delete-step-btn');
            if(delBtn) { delBtn.closest('.step-block').remove(); checkCanvasEmptyState(); }
            const addSourceBtn = event.target.closest('.add-source-btn');
            if(addSourceBtn) addSourceBtn.previousElementSibling.appendChild(createCompositeSourceElement());
            const removeSourceBtn = event.target.closest('.remove-source-btn');
            if(removeSourceBtn) removeSourceBtn.closest('.composite-source-item').remove();
        });
    }
    
    function handleTaskActions(action, taskId) {
        if(!taskId) return;
        const task = allJobsCache.flatMap(j => j.tasks || []).find(t => t._id === taskId);
        if(!task) return;

        switch(action) {
            case 'view-screenshots':
                openScreenshotModal(taskId);
                break;
            case 'view-data':
                openDataModal(taskId);
                break;
            case 'view-error':
                alert(`错误详情:\n\n${task.errorMessage}`);
                break;
        }
    }
    
    function renderWorkflowsList() {
        if (!workflowsListContainer) return;
        if (allWorkflows.length === 0) {
            workflowsListContainer.innerHTML = '<p class="text-gray-500 text-center">暂无工作流。</p>';
            return;
        }
        workflowsListContainer.innerHTML = allWorkflows
            .filter(workflow => workflow && workflow._id) 
            .map(workflow => {
                const typeLabels = {
                    'screenshot': { label: '截图', color: 'bg-indigo-200 text-indigo-800' },
                    'data_scraping': { label: '数据抓取', color: 'bg-blue-200 text-blue-800' },
                    'composite': { label: '组合任务', color: 'bg-emerald-200 text-emerald-800' }
                };
                const typeInfo = typeLabels[workflow.type] || { label: '未知', color: 'bg-gray-200 text-gray-800' };
                return `
                <div class="workflow-item flex justify-between items-center p-2 rounded hover:bg-gray-200" data-id="${workflow._id}">
                    <div class="flex-grow cursor-pointer" data-action="select">
                        <span class="font-medium text-gray-800">${workflow.name}</span>
                        <span class="ml-2 text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${typeInfo.color}">${typeInfo.label}</span>
                    </div>
                    <div class="space-x-2 flex-shrink-0">
                        <button class="edit-workflow-btn text-gray-500 hover:text-indigo-600 text-sm" data-id="${workflow._id}">编辑</button>
                        <button class="delete-workflow-btn text-gray-500 hover:text-red-600 text-sm" data-id="${workflow._id}">删除</button>
                    </div>
                </div>
            `}).join('');
    }
    function handleWorkflowSelection(workflowId) {
        document.querySelectorAll('.workflow-item').forEach(el => el.classList.remove('bg-indigo-100'));
        const selectedItem = workflowsListContainer.querySelector(`.workflow-item[data-id="${workflowId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('bg-indigo-100');
            selectedWorkflowId = workflowId;
            
            const workflow = allWorkflows.find(w => w._id === workflowId);
            const requiredInput = workflow?.requiredInput || { key: 'xingtuId', label: '达人星图ID' };
            
            targetIdLabel.textContent = requiredInput.label;
            targetIdInput.placeholder = `请输入${requiredInput.label}`;
            targetIdInput.disabled = false;
        } else {
            selectedWorkflowId = null;
            targetIdLabel.textContent = '目标 ID';
            targetIdInput.placeholder = '请先选择一个工作流';
            targetIdInput.disabled = true;
        }
        updateExecuteButtonState();
    }
    function updateExecuteButtonState() {
        if(!executeTaskBtn) return;
        executeTaskBtn.disabled = !(selectedWorkflowId && targetIdInput.value.trim() !== '');
    }
    function populateActionLibrary(){
        if (!actionLibrary) return;
        actionLibrary.innerHTML = Object.entries(ACTION_DEFINITIONS).map(([key, def]) => `
            <div class="action-library-item">
                <button type="button" data-action="${key}" class="add-step-btn w-full text-left p-2 rounded-md bg-white hover:bg-${def.color}-50 text-gray-700 border border-gray-200 hover:border-${def.color}-300 text-sm flex items-center gap-3 transition-all">
                    <span class="text-${def.color}-500">${def.icon}</span> <span>${def.title}</span>
                </button>
            </div>
        `).join('');
    }
    function checkCanvasEmptyState(){
        if (workflowCanvas && workflowCanvas.children.length === 0) {
            workflowCanvas.innerHTML = `<div id="canvas-placeholder" class="text-center text-gray-400 p-10 border-2 border-dashed rounded-lg"><p>画布为空</p><p class="text-xs mt-1">请从左侧拖拽或点击动作库中的步骤来添加</p></div>`;
        } else {
            const placeholder = document.getElementById('canvas-placeholder');
            if (placeholder) placeholder.remove();
        }
    }
    function createInputElement(field, value) {
        if (field.type === 'checkbox') {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center mt-2';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = field.name;
            checkbox.checked = !!value;
            checkbox.className = 'h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500';
            const label = document.createElement('label');
            label.textContent = field.label;
            label.className = 'ml-2 block text-sm text-gray-900';
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            return wrapper;
        }
        const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
        if(field.type === 'textarea') input.rows = 2; else input.type = field.type;
        input.name = field.name;
        input.placeholder = field.placeholder;
        input.required = field.required || false;
        input.className = 'mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500';
        input.value = value || '';
        return input;
    }
    function createCompositeSourceElement(source = {}) {
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'composite-source-item flex items-center gap-2 p-2 border rounded-md bg-gray-100';
        sourceDiv.innerHTML = `
            <div class="flex-1 space-y-1">
                <input type="text" value="${source.name || ''}" class="source-name-input w-full p-1 border rounded-md text-xs" placeholder="名称 (例如: age_gender)" required>
                <input type="text" value="${source.selector || ''}" class="source-selector-input w-full p-1 border rounded-md text-xs" placeholder="选择器 (例如: text=触达用户 >> strong)" required>
            </div>
            <button type="button" class="remove-source-btn text-gray-400 hover:text-red-600 p-1 rounded-full">
                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>
            </button>
        `;
        return sourceDiv;
    }
    function createStepBlockElement(actionType, data = {}){
        const definition = ACTION_DEFINITIONS[actionType];
        if (!definition || !stepBlockTemplate) return null;
        const block = stepBlockTemplate.content.cloneNode(true).firstElementChild;
        block.dataset.actionType = actionType;
        block.querySelector('.step-block-title').textContent = definition.title;
        block.classList.add(`border-l-4`, `border-${definition.color}-400`);
        const contentDiv = block.querySelector('.step-block-content');
        definition.fields.forEach(field => {
            const fieldContainer = document.createElement('div');
            const inputElement = createInputElement(field, data[field.name]);
            if (field.type !== 'checkbox') {
                const label = document.createElement('label');
                label.className = 'block text-xs font-medium text-gray-600';
                label.textContent = field.label;
                fieldContainer.appendChild(label);
            }
            fieldContainer.appendChild(inputElement);
            contentDiv.appendChild(fieldContainer);
        });

        if (definition.isComplex && actionType === 'compositeExtract') {
             const sourcesContainer = document.createElement('div');
             sourcesContainer.className = 'composite-sources-container mt-2 pt-2 border-t space-y-2';
             contentDiv.appendChild(sourcesContainer);
             const sourcesLabel = document.createElement('label');
             sourcesLabel.className = 'block text-xs font-medium text-gray-600';
             sourcesLabel.textContent = '数据源 (至少一个)';
             sourcesContainer.appendChild(sourcesLabel);
             (data.sources || [{name: '', selector: ''}]).forEach(source => {
                sourcesContainer.appendChild(createCompositeSourceElement(source));
             });
             const addSourceBtn = document.createElement('button');
             addSourceBtn.type = 'button';
             addSourceBtn.textContent = '+ 添加数据源';
             addSourceBtn.className = 'add-source-btn text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1';
             contentDiv.appendChild(addSourceBtn);
        }
        return block;
    }
    function serializeCanvasToSteps(){
        const steps = [];
        workflowCanvas.querySelectorAll('.step-block').forEach(block => {
            const step = { action: block.dataset.actionType };
            block.querySelectorAll('.step-block-content input, .step-block-content textarea').forEach(input => {
                if (input.closest('.composite-source-item')) return;
                if (input.type === 'checkbox') {
                    if (input.checked) step[input.name] = true;
                } else if (input.value) {
                    step[input.name] = input.type === 'number' ? parseInt(input.value, 10) : input.value;
                }
            });
            if (step.action === 'compositeExtract') {
                step.sources = [];
                block.querySelectorAll('.composite-source-item').forEach(item => {
                    const name = item.querySelector('.source-name-input').value.trim();
                    const selector = item.querySelector('.source-selector-input').value.trim();
                    if(name && selector) step.sources.push({ name, selector });
                });
            }
            steps.push(step);
        });
        return steps;
    }
    function initializeSortable(){
        if (sortableCanvas) sortableCanvas.destroy();
        if (sortableLibrary) sortableLibrary.destroy();
        if(!workflowCanvas || !actionLibrary) return;
        sortableCanvas = new Sortable(workflowCanvas, {
            group: 'shared-workflow', animation: 150, handle: '.step-block-handle', ghostClass: 'sortable-ghost',
            onAdd: (evt) => {
                const placeholder = evt.item;
                const actionType = placeholder.querySelector('button').dataset.action;
                const realBlock = createStepBlockElement(actionType);
                if (realBlock) placeholder.parentNode.replaceChild(realBlock, placeholder);
                checkCanvasEmptyState(); 
            },
        });
        sortableLibrary = new Sortable(actionLibrary, {
            group: { name: 'shared-workflow', pull: 'clone', put: false },
            sort: false,
        });
    }
    function openWorkflowModalForCreate() {
        if (!workflowForm) return;
        workflowForm.reset();
        workflowIdInput.value = '';
        modalTitle.textContent = '新建工作流';
        workflowCanvas.innerHTML = '';
        checkCanvasEmptyState();
        initializeSortable();
        workflowModal.classList.remove('hidden');
    }
    function openWorkflowModalForEdit(workflowId) {
        const workflow = allWorkflows.find(w => w._id === workflowId);
        if (!workflow) return alert('找不到要编辑的工作流。');
        
        workflowForm.reset();
        workflowIdInput.value = workflow._id;
        workflowNameInput.value = workflow.name;
        workflowTypeSelect.value = workflow.type || 'screenshot';
        workflowDescriptionInput.value = workflow.description || '';

        // 加载 requiredInput 配置
        if (workflow.requiredInput) {
            requiredInputKeyInput.value = workflow.requiredInput.key || '';
            requiredInputLabelInput.value = workflow.requiredInput.label || '';
        } else {
            requiredInputKeyInput.value = '';
            requiredInputLabelInput.value = '';
        }

        modalTitle.textContent = `编辑工作流: ${workflow.name}`;

        workflowCanvas.innerHTML = '';
        const steps = workflow.steps || [];
        steps.forEach(step => {
            const block = createStepBlockElement(step.action, step);
            if(block) workflowCanvas.appendChild(block);
        });

        checkCanvasEmptyState();
        initializeSortable();
        workflowModal.classList.remove('hidden');
    }
    async function handleWorkflowFormSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-workflow-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        const id = workflowIdInput.value;
        const steps = serializeCanvasToSteps();
        if (steps.length === 0) {
            alert('工作流至少需要一个步骤。');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存工作流';
            return;
        }
        const workflowData = {
            name: workflowNameInput.value,
            type: workflowTypeSelect.value,
            description: workflowDescriptionInput.value,
            steps: steps,
        };

        // 添加 requiredInput 配置（如果填写了）
        const inputKey = requiredInputKeyInput.value.trim();
        const inputLabel = requiredInputLabelInput.value.trim();
        if (inputKey && inputLabel) {
            workflowData.requiredInput = {
                key: inputKey,
                label: inputLabel
            };
        }
        try {
            if (id) {
                await apiCall(`${API_PATHS.workflows}?id=${id}`, 'PUT', { _id: id, ...workflowData });
            } else {
                await apiCall(API_PATHS.workflows, 'POST', workflowData);
            }
            workflowModal.classList.add('hidden');
            await loadWorkflows();
        } catch (error) {
             alert(`保存失败: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存工作流';
        }
    }
    async function handleDeleteWorkflow(workflowId) {
        const workflow = allWorkflows.find(w => w._id === workflowId);
        if (!workflow) return;
        if (confirm(`确定要删除工作流 "${workflow.name}" 吗？此操作不可撤销。`)) {
            try {
                await apiCall(`${API_PATHS.workflows}?id=${workflowId}`, 'DELETE');
                if (selectedWorkflowId === workflowId) handleWorkflowSelection(null);
                await loadWorkflows();
            } catch (error) {}
        }
    }
    
    function openScreenshotModal(taskId) {
        const task = allJobsCache.flatMap(j => j.tasks || []).find(t => t._id === taskId);
        if (!task || !task.result?.screenshots?.length) return;
        const screenshots = task.result.screenshots;
        screenshotModal.dataset.screenshots = JSON.stringify(screenshots);
        screenshotModal.dataset.currentIndex = "0";
        modalThumbnails.innerHTML = screenshots.map((ss, index) => `
            <div class="thumbnail-item p-1 border-2 border-transparent rounded-md cursor-pointer hover:border-indigo-400" data-index="${index}">
                <img src="${ss.url}" alt="${ss.name}" class="w-full h-20 object-cover rounded">
                <p class="text-xs text-gray-600 truncate mt-1" title="${ss.name}">${ss.name}</p>
            </div>`).join('');
        updateModalView();
        screenshotModal.classList.remove('hidden');
    }

    function closeScreenshotModal() { 
        if(screenshotModal) screenshotModal.classList.add('hidden');
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
        const task = allJobsCache.flatMap(j => j.tasks || []).find(t => t._id === taskId);
        const data = task?.result?.data;
        if (!data || Object.keys(data).length === 0) return;
        dataModalTitle.textContent = `数据抓取结果 (目标ID: ${task.targetId || task.xingtuId})`;
        dataModalTableBody.innerHTML = Object.entries(data).map(([key, value]) => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">${key}</td>
                <td class="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">${String(value).replace(/\n/g, '<br>')}</td>
            </tr>`).join('');
        copyDataBtn.dataset.taskData = JSON.stringify(data);
        dataModal.classList.remove('hidden');
    }

    function closeDataModal() {
        if(dataModal) dataModal.classList.add('hidden');
    }

    function handleCopyData() {
        const data = JSON.parse(copyDataBtn.dataset.taskData || '{}');
        const textToCopy = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyDataBtn.textContent;
            copyDataBtn.textContent = '已复制!';
            setTimeout(() => { copyDataBtn.textContent = originalText; }, 2000);
        }).catch(err => alert('复制失败: ' + err));
    }
    
    // --- 启动应用 ---
    initializeApp();
});

