/**
 * @file automation_suite.js
 * @version 3.4 - Instant Task Feedback
 * @description 前端逻辑，用于自动化套件控制中心。
 * - [核心优化] "执行任务"按钮的逻辑被重构。现在它会直接使用创建任务API返回的新任务对象，
 * 立即在任务列表顶部渲染该任务并启动轮询。
 * - 这解决了之前的时序竞争问题，为用户提供了即时的操作反馈，并减少了一次多余的 `loadTasks` API调用。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- 全局变量与配置 ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com'; 
    const WORKFLOWS_API = `${API_BASE_URL}/automation-workflows`;
    const TASKS_API = `${API_BASE_URL}/automation-tasks`;

    let activePollingIntervals = {};
    let selectedWorkflowId = null;

    // --- DOM 元素获取 ---
    const workflowsList = document.getElementById('workflows-list');
    const xingtuIdInput = document.getElementById('xingtu-id-input');
    const executeTaskBtn = document.getElementById('execute-task-btn');
    const tasksListContainer = document.getElementById('tasks-list');
    const resultContainer = document.getElementById('execution-result-container');
    
    // --- 工作流编辑器相关DOM ---
    const newWorkflowBtn = document.getElementById('new-workflow-btn');
    const workflowModal = document.getElementById('workflow-modal');
    const modalTitle = document.getElementById('modal-title');
    const workflowForm = document.getElementById('workflow-form');
    const workflowIdInput = document.getElementById('workflow-id-input');
    const workflowNameInput = document.getElementById('workflow-name-input');
    const workflowJsonEditor = document.getElementById('workflow-json-editor');
    const saveWorkflowBtn = document.getElementById('save-workflow-btn');
    const cancelWorkflowBtn = document.getElementById('cancel-workflow-btn');
    const deleteWorkflowBtn = document.getElementById('delete-workflow-btn');
    const jsonError = document.getElementById('json-error');

    // --- API 调用封装 ---
    async function apiCall(url, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API call failed with status ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error during API call to ${url}:`, error);
            // 这里可以添加更友好的用户错误提示
            return null;
        }
    }

    // --- 核心功能函数 ---

    async function loadWorkflows() {
        const response = await apiCall(WORKFLOWS_API);
        if (response && response.success) {
            workflowsList.innerHTML = '';
            response.data.forEach(wf => {
                const li = document.createElement('li');
                li.className = 'p-3 rounded-lg cursor-pointer transition-all duration-200';
                li.textContent = wf.name;
                li.dataset.workflowId = wf._id;
                li.addEventListener('click', () => {
                    if (selectedWorkflowId) {
                        document.querySelector(`[data-workflow-id="${selectedWorkflowId}"]`).classList.remove('bg-blue-600', 'text-white', 'shadow-md');
                         document.querySelector(`[data-workflow-id="${selectedWorkflowId}"]`).classList.add('bg-white', 'hover:bg-gray-100');
                    }
                    selectedWorkflowId = wf._id;
                    li.classList.add('bg-blue-600', 'text-white', 'shadow-md');
                    li.classList.remove('bg-white', 'hover:bg-gray-100');
                    updateExecuteButtonState();
                });
                workflowsList.appendChild(li);
            });
        }
    }
    
    async function loadTasks() {
        const response = await apiCall(TASKS_API);
        tasksListContainer.innerHTML = ''; // 清空现有列表
        if (response && response.success && Array.isArray(response.data)) {
            response.data.forEach(task => renderTask(task));
        }
    }
    
    function renderTask(task, prepend = false) {
        // 如果任务已存在，先移除旧的DOM元素
        const existingTaskElement = document.getElementById(`task-${task._id}`);
        if (existingTaskElement) {
            existingTaskElement.remove();
        }

        const taskElement = document.createElement('div');
        taskElement.id = `task-${task._id}`;
        taskElement.className = 'p-4 bg-white rounded-lg shadow flex items-center justify-between space-x-4 mb-3';
        
        let statusColor = 'bg-gray-400';
        if (task.status === 'processing') statusColor = 'bg-blue-500 animate-pulse';
        if (task.status === 'completed') statusColor = 'bg-green-500';
        if (task.status === 'failed') statusColor = 'bg-red-500';

        taskElement.innerHTML = `
            <div class="flex items-center space-x-3 flex-1">
                <span class="status-indicator w-3 h-3 ${statusColor} rounded-full"></span>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 text-sm truncate" title="任务ID: ${task._id}">目标: ${task.targetXingtuId}</p>
                    <p class="text-xs text-gray-500">创建于: ${new Date(task.createdAt).toLocaleString()}</p>
                </div>
            </div>
            <div class="status-text text-sm font-medium text-gray-700 w-20 text-center">${task.status}</div>
            <div class="flex items-center space-x-2">
                <button class="view-result-btn px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed" ${!task.result ? 'disabled' : ''}>查看结果</button>
                <button class="delete-task-btn px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">删除</button>
            </div>
        `;

        if (prepend) {
            tasksListContainer.prepend(taskElement);
        } else {
            tasksListContainer.appendChild(taskElement);
        }
        
        // 绑定事件
        taskElement.querySelector('.delete-task-btn').addEventListener('click', () => deleteTask(task._id));
        if(task.result) {
            taskElement.querySelector('.view-result-btn').addEventListener('click', () => showResult(task));
        }

        // 根据状态决定是否轮询
        if (['pending', 'processing'].includes(task.status)) {
            startPollingForTask(task._id);
        } else {
            stopPollingForTask(task._id);
        }
    }

    function updateExecuteButtonState() {
        const xingtuId = xingtuIdInput.value.trim();
        executeTaskBtn.disabled = !selectedWorkflowId || !xingtuId;
    }

    async function deleteTask(taskId) {
        const response = await apiCall(`${TASKS_API}?taskId=${taskId}`, 'DELETE');
        if (response && response.success) {
            document.getElementById(`task-${taskId}`)?.remove();
        }
    }
    
    function showResult(task) {
        resultContainer.innerHTML = '';
        if (task.status === 'completed' && task.result) {
            const screenshotsHtml = task.result.screenshots.map(img => `
                <div class="mb-4">
                    <p class="font-semibold text-gray-700">${img.name || '截图'}</p>
                    <img src="${img.path.replace(/\\/g, '/')}" alt="${img.name}" class="mt-2 rounded-lg border shadow-md w-full">
                </div>
            `).join('');
            resultContainer.innerHTML = `
                <h3 class="text-lg font-bold mb-4">任务结果 - ${task.targetXingtuId}</h3>
                ${screenshotsHtml}
            `;
        } else if (task.status === 'failed') {
            resultContainer.innerHTML = `
                 <h3 class="text-lg font-bold mb-4 text-red-600">任务失败</h3>
                 <p class="text-gray-700">失败原因:</p>
                 <pre class="mt-2 p-3 bg-gray-100 text-red-800 rounded-md text-sm">${task.errorMessage || '未知错误'}</pre>
            `;
        }
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // --- 轮询逻辑 ---
    function startPollingForTask(taskId) {
        if (activePollingIntervals[taskId]) return; // 防止重复轮询

        const intervalId = setInterval(async () => {
            const response = await apiCall(`${TASKS_API}?taskId=${taskId}`);
            if (response && response.success) {
                const updatedTask = response.data;
                // 重新渲染任务，会更新UI并根据新状态决定是否继续轮询
                renderTask(updatedTask);
            }
        }, 5000); // 5秒轮询一次

        activePollingIntervals[taskId] = intervalId;
    }

    function stopPollingForTask(taskId) {
        if (activePollingIntervals[taskId]) {
            clearInterval(activePollingIntervals[taskId]);
            delete activePollingIntervals[taskId];
        }
    }

    // --- 事件绑定 ---
    xingtuIdInput.addEventListener('input', updateExecuteButtonState);

    executeTaskBtn.addEventListener('click', async () => {
        const xingtuId = xingtuIdInput.value.trim();
        if (!selectedWorkflowId || !xingtuId) return;

        executeTaskBtn.disabled = true;
        executeTaskBtn.textContent = '任务创建中...';
        
        const payload = {
            workflowId: selectedWorkflowId,
            targetXingtuId: xingtuId
        };
        
        // [关键修改]
        const response = await apiCall(TASKS_API, 'POST', payload);
        
        if (response && response.success) {
            const newTask = response.data;
            // 直接将新任务渲染到列表顶部，并自动开始轮询
            renderTask(newTask, true); 
            xingtuIdInput.value = ''; // 清空输入框
        } else {
            // 可以在这里添加创建失败的提示
            alert('创建任务失败，请检查网络或联系管理员。');
        }

        executeTaskBtn.disabled = false;
        executeTaskBtn.textContent = '执行任务';
        updateExecuteButtonState();
    });
    
    // --- 工作流编辑器事件绑定 ---
    function openWorkflowModal(workflow = null) {
        workflowForm.reset();
        jsonError.classList.add('hidden');
        if (workflow) {
            modalTitle.textContent = '编辑工作流';
            workflowIdInput.value = workflow._id;
            workflowNameInput.value = workflow.name;
            workflowJsonEditor.value = JSON.stringify(workflow.actions, null, 2);
            deleteWorkflowBtn.classList.remove('hidden');
        } else {
            modalTitle.textContent = '新建工作流';
            workflowIdInput.value = '';
            workflowJsonEditor.value = JSON.stringify([{"type": "navigate", "url": "https://www.example.com"}], null, 2);
            deleteWorkflowBtn.classList.add('hidden');
        }
        workflowModal.classList.remove('hidden');
    }

    function closeWorkflowModal() {
        workflowModal.classList.add('hidden');
    }

    newWorkflowBtn.addEventListener('click', () => openWorkflowModal());
    cancelWorkflowBtn.addEventListener('click', closeWorkflowModal);
    
    workflowsList.addEventListener('dblclick', async (e) => {
        if (e.target && e.target.dataset.workflowId) {
            const wfId = e.target.dataset.workflowId;
            const response = await apiCall(`${WORKFLOWS_API}?workflowId=${wfId}`);
            if (response && response.success) {
                openWorkflowModal(response.data);
            }
        }
    });

    workflowJsonEditor.addEventListener('input', () => {
        try {
            JSON.parse(workflowJsonEditor.value);
            jsonError.classList.add('hidden');
            saveWorkflowBtn.disabled = false;
        } catch (e) {
            jsonError.textContent = 'JSON 格式无效';
            jsonError.classList.remove('hidden');
            saveWorkflowBtn.disabled = true;
        }
    });

    saveWorkflowBtn.addEventListener('click', async () => {
        const id = workflowIdInput.value;
        const name = workflowNameInput.value.trim();
        let actions;
        try {
            actions = JSON.parse(workflowJsonEditor.value);
        } catch (e) { return; }

        if (!name) {
            alert('工作流名称不能为空');
            return;
        }

        const payload = { name, actions };
        let response;
        if (id) {
            payload._id = id;
            response = await apiCall(WORKFLOWS_API, 'PUT', payload);
        } else {
            response = await apiCall(WORKFLOWS_API, 'POST', payload);
        }

        if (response && response.success) {
            closeWorkflowModal();
            loadWorkflows();
        } else {
            alert('保存失败');
        }
    });

    deleteWorkflowBtn.addEventListener('click', async () => {
        const id = workflowIdInput.value;
        if (!id || !confirm('确定要删除这个工作流吗？')) return;

        const response = await apiCall(WORKFLOWS_API, 'DELETE', { _id: id });
        if (response && response.success) {
            closeWorkflowModal();
            loadWorkflows();
        } else {
            alert('删除失败');
        }
    });

    // --- 页面初始化 ---
    function initializePage() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const sidebarToggleBtn = document.getElementById('sidebar-toggle');
        const navToggles = document.querySelectorAll('[data-toggle]');
        const SIDEBAR_STATE_KEY = 'sidebarCollapsed';

        if (!sidebar) {
            console.warn('Sidebar element not found. Page will render without sidebar functionality.');
        }
        
        function setSidebarState(isCollapsed) {
            if (!sidebar || !mainContent) return;
            sidebar.classList.toggle('sidebar-collapsed', isCollapsed);
            mainContent.style.marginLeft = isCollapsed ? '5rem' : '9.5rem'; // Adjust this value to match sidebar width
            document.getElementById('toggle-icon-collapse')?.classList.toggle('hidden', isCollapsed);
            document.getElementById('toggle-icon-expand')?.classList.toggle('hidden', !isCollapsed);
        }

        sidebarToggleBtn?.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
            setSidebarState(!isCollapsed);
            localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(!isCollapsed));
        });

        navToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                if (sidebar?.classList.contains('sidebar-collapsed')) return;
                const submenu = document.getElementById(toggle.dataset.toggle);
                submenu?.classList.toggle('hidden');
                toggle.querySelector('.toggle-icon-plus')?.classList.toggle('hidden');
                toggle.querySelector('.toggle-icon-minus')?.classList.toggle('hidden');
            });
        });

        const savedState = localStorage.getItem(SIDEBAR_STATE_KEY);
        if (savedState) {
            setSidebarState(JSON.parse(savedState));
        }
        
        loadWorkflows();
        loadTasks();
        updateExecuteButtonState();
    }

    initializePage();
});
