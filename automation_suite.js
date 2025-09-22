/**
 * @file automation_suite.js
 * @version 3.2 - API Endpoint Configuration
 * @description 前端逻辑，用于自动化套件控制中心。
 * - [核心配置] 增加了 API_BASE_URL 的配置项，现在需要您填入真实的API网关地址。
 * - [代码内嵌] 保持了从 index.js 迁移过来的独立侧边栏交互逻辑。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- 全局变量与配置 ---
    // !!! 关键步骤: 请将下面的占位符替换为您的真实API网关地址 !!!
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
    const jsonError = document.getElementById('json-error');
    const saveWorkflowBtn = document.getElementById('save-workflow-btn');
    const cancelWorkflowBtn = document.getElementById('cancel-workflow-btn');
    
    // --- 函数定义 (页面核心逻辑) ---

    /**
     * 加载并渲染工作流列表
     */
    async function loadWorkflows() {
        if (API_BASE_URL.includes('YOUR_API_GATEWAY_BASE_URL')) {
            workflowsList.innerHTML = `<p class="text-center py-4 text-red-500">错误：请先在 JS 文件中配置API网关地址</p>`;
            return;
        }
        try {
            const response = await fetch(WORKFLOWS_API);
             if (!response.ok) { // 首先检查网络层面的错误
                throw new Error(`网络错误: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                workflowsList.innerHTML = '';
                if (result.data.length === 0) {
                     workflowsList.innerHTML = `<p class="text-center py-4 text-gray-500">暂无工作流，请点击“新建”创建第一个。</p>`;
                }
                result.data.forEach(workflow => {
                    const isSelected = workflow._id === selectedWorkflowId;
                    const typeTag = workflow.type === 'scrape' 
                        ? `<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">scrape</span>`
                        : `<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">screenshot</span>`;

                    const item = document.createElement('div');
                    item.className = `p-3 rounded-lg border cursor-pointer transition-all workflow-item ${isSelected ? 'selected' : ''}`;
                    item.dataset.id = workflow._id;
                    item.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span class="font-semibold text-gray-800">${workflow.name}</span>
                            <div class="flex items-center gap-2">
                                ${typeTag}
                                <button class="edit-workflow-btn p-1 rounded-md hover:bg-gray-200 text-gray-400" data-id="${workflow._id}">
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                                </button>
                            </div>
                        </div>
                    `;
                    workflowsList.appendChild(item);
                });
            } else {
                workflowsList.innerHTML = `<p class="text-center py-4 text-red-500">请求工作流API时出错: ${result.message}</p>`;
            }
        } catch (error) {
            console.error('请求工作流API时出错:', error);
            workflowsList.innerHTML = `<p class="text-center py-4 text-red-500">请求工作流API时出错: ${error.message}</p>`;
        }
    }

    /**
     * 加载并渲染最近的任务列表
     */
    async function loadTasks() {
        if (API_BASE_URL.includes('YOUR_API_GATEWAY_BASE_URL')) return;
        try {
            const response = await fetch(`${TASKS_API}?limit=10`); // 获取最近10条
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                tasksListContainer.innerHTML = '';
                if (result.data.length === 0) {
                    tasksListContainer.innerHTML = `<p class="text-center py-4 text-gray-500">暂无任务记录</p>`;
                }
                result.data.forEach(renderTaskItem);

                // 对正在运行的任务启动轮询
                result.data.forEach(task => {
                    if (task.status === 'pending' || task.status === 'processing') {
                        startPollingForTask(task._id);
                    }
                });
                resultContainer.classList.toggle('visible', result.data.length > 0);
            }
        } catch (error) {
            console.error('请求任务API时出错:', error);
        }
    }

    /**
     * 渲染单个任务项
     */
    function renderTaskItem(task) {
        let existingItem = document.getElementById(`task-${task._id}`);
        if (!existingItem) {
            existingItem = document.createElement('div');
            existingItem.id = `task-${task._id}`;
            tasksListContainer.prepend(existingItem);
        }

        let statusBadge, resultHtml = '';
        switch (task.status) {
            case 'pending': statusBadge = `<span class="text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">等待中</span>`; break;
            case 'processing': statusBadge = `<span class="text-xs font-semibold rounded-full bg-blue-100 text-blue-800">处理中</span>`; break;
            case 'completed': 
                statusBadge = `<span class="text-xs font-semibold rounded-full bg-green-100 text-green-800">已完成</span>`;
                resultHtml = `<a href="${task.result?.screenshotPath || '#'}" target="_blank" class="text-indigo-600 hover:underline text-sm">查看结果</a>`;
                break;
            case 'failed': 
                statusBadge = `<span class="text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>`;
                resultHtml = `<span class="text-red-600 text-sm" title="${task.error || ''}">查看原因</span>`;
                break;
            default: statusBadge = `<span class="text-xs font-semibold rounded-full bg-gray-100 text-gray-800">未知</span>`;
        }

        existingItem.className = 'p-3 border rounded-md bg-white';
        existingItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-sm font-mono text-gray-500" title="${task._id}">ID: ...${task._id.slice(-6)}</p>
                    <p class="text-xs text-gray-400 mt-1">${new Date(task.createdAt).toLocaleString()}</p>
                </div>
                <div class="flex items-center gap-4">
                    ${statusBadge}
                    ${resultHtml}
                    <button class="text-red-500 hover:text-red-700 text-sm delete-task-btn" data-id="${task._id}">删除</button>
                </div>
            </div>`;
    }

    /**
     * 为指定任务开始轮询状态
     */
    function startPollingForTask(taskId) {
        if (activePollingIntervals[taskId]) return; // 防止重复轮询

        activePollingIntervals[taskId] = setInterval(async () => {
            try {
                const response = await fetch(`${TASKS_API}?id=${taskId}`);
                const result = await response.json();
                if (result.success) {
                    renderTaskItem(result.data);
                    if (result.data.status === 'completed' || result.data.status === 'failed') {
                        stopPollingForTask(taskId);
                    }
                } else {
                    stopPollingForTask(taskId);
                }
            } catch (error) {
                console.error(`Polling for task ${taskId} failed:`, error);
                stopPollingForTask(taskId);
            }
        }, 3000);
    }

    /**
     * 停止指定任务的轮询
     */
    function stopPollingForTask(taskId) {
        if (activePollingIntervals[taskId]) {
            clearInterval(activePollingIntervals[taskId]);
            delete activePollingIntervals[taskId];
        }
    }
    
    /**
     * 打开工作流编辑器弹窗
     */
    function openWorkflowModal(workflowData = null) {
        workflowForm.reset();
        jsonError.classList.add('hidden');
        if (workflowData) {
            modalTitle.textContent = '编辑工作流';
            workflowIdInput.value = workflowData._id;
            workflowNameInput.value = workflowData.name;
            workflowJsonEditor.value = JSON.stringify(workflowData.steps, null, 2);
        } else {
            modalTitle.textContent = '新建工作流';
            workflowIdInput.value = '';
            const template = [{ "type": "goto", "name": "访问页面", "url": "https://www.bytedance.com/" }];
            workflowJsonEditor.value = JSON.stringify(template, null, 2);
        }
        workflowModal.classList.remove('hidden');
    }

    function closeWorkflowModal() {
        workflowModal.classList.add('hidden');
    }

    async function saveWorkflow() {
        let steps;
        try {
            steps = JSON.parse(workflowJsonEditor.value);
            jsonError.classList.add('hidden');
        } catch (e) {
            jsonError.textContent = 'JSON 格式无效，请检查！';
            jsonError.classList.remove('hidden');
            return;
        }

        const workflowData = { name: workflowNameInput.value, steps: steps };
        const id = workflowIdInput.value;
        const method = id ? 'PUT' : 'POST';
        if(id) workflowData._id = id;

        try {
            const response = await fetch(WORKFLOWS_API, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowData)
            });
            const result = await response.json();
            if (result.success) {
                closeWorkflowModal();
                loadWorkflows();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert(`保存工作流失败: ${error.message}`);
        }
    }

    function updateExecuteButtonState() {
        const hasId = xingtuIdInput.value.trim() !== '';
        const hasWorkflow = selectedWorkflowId !== null;
        
        if (!hasWorkflow) {
            executeTaskBtn.disabled = true;
            executeTaskBtn.textContent = '请先选择一个工作流';
            executeTaskBtn.classList.add('bg-gray-300', 'cursor-not-allowed');
            executeTaskBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        } else if (!hasId) {
            executeTaskBtn.disabled = true;
            executeTaskBtn.textContent = '请输入星图ID';
            executeTaskBtn.classList.add('bg-gray-300', 'cursor-not-allowed');
            executeTaskBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        } else {
            executeTaskBtn.disabled = false;
            executeTaskBtn.textContent = '执行';
            executeTaskBtn.classList.remove('bg-gray-300', 'cursor-not-allowed');
            executeTaskBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
    }


    // --- 事件监听 ---

    // 执行任务
    executeTaskBtn.addEventListener('click', async () => {
        const xingtuId = xingtuIdInput.value.trim();
        if (!selectedWorkflowId || !xingtuId) return;

        try {
            const response = await fetch(TASKS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowId: selectedWorkflowId, parameters: { xingtuId } }),
            });
            const result = await response.json();
            if (result.success) {
                loadTasks(); // 立即刷新任务列表
            } else {
                alert(`创建任务失败: ${result.message}`);
            }
        } catch (error) {
            alert('创建任务API请求失败');
        }
    });

    // 事件委托处理工作流和任务列表的点击
    document.body.addEventListener('click', async (event) => {
        // 选择工作流
        const workflowItem = event.target.closest('.workflow-item');
        if (workflowItem) {
            selectedWorkflowId = workflowItem.dataset.id;
            loadWorkflows(); // 重新渲染以更新选中状态
            updateExecuteButtonState();
            return;
        }

        // 编辑工作流 (通过按钮)
        const editWorkflowBtn = event.target.closest('.edit-workflow-btn');
        if (editWorkflowBtn) {
            const workflowId = editWorkflowBtn.dataset.id;
             try {
                const response = await fetch(`${WORKFLOWS_API}?id=${workflowId}`);
                const result = await response.json();
                if(result.success) openWorkflowModal(result.data);
            } catch (error) { alert('加载工作流数据失败'); }
            return;
        }

        // 删除任务
        const deleteTaskBtn = event.target.closest('.delete-task-btn');
        if (deleteTaskBtn) {
            const taskId = deleteTaskBtn.dataset.id;
            if (confirm(`确定要删除任务 ${taskId.slice(-6)} 吗？`)) {
                try {
                    const response = await fetch(TASKS_API, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ _id: taskId }),
                    });
                    if (response.ok) {
                        document.getElementById(`task-${taskId}`).remove();
                    } else {
                        const result = await response.json();
                        alert(`删除失败: ${result.message}`);
                    }
                } catch (error) {
                    alert('删除任务API请求失败。');
                }
            }
        }
    });
    
    // 输入星图ID时更新按钮状态
    xingtuIdInput.addEventListener('input', updateExecuteButtonState);

    // 工作流编辑器事件
    newWorkflowBtn.addEventListener('click', () => openWorkflowModal(null));
    saveWorkflowBtn.addEventListener('click', saveWorkflow);
    cancelWorkflowBtn.addEventListener('click', closeWorkflowModal);


    // --- 初始化 ---
    function initializePage() {
        // --- [核心改造] 从 index.js 严格迁移过来的侧边栏交互逻辑 ---
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const sidebarToggleBtn = document.getElementById('sidebar-toggle');
        const navToggles = sidebar.querySelectorAll('.nav-toggle');
        const SIDEBAR_STATE_KEY = 'sidebarCollapsed';

        // 高亮当前页面链接
        const activeLink = document.getElementById('nav-automation_suite'); // 直接指定当前页ID
        if (activeLink) {
            activeLink.classList.add('active');
            const parentMenu = activeLink.closest('.submenu');
            if (parentMenu) {
                parentMenu.classList.remove('hidden');
                const toggleButton = document.querySelector(`button[data-toggle="${parentMenu.id}"]`);
                if (toggleButton) {
                    toggleButton.querySelector('.toggle-icon-plus')?.classList.add('hidden');
                    toggleButton.querySelector('.toggle-icon-minus')?.classList.remove('hidden');
                }
            }
        }
        
        // 设置侧边栏状态函数
        function setSidebarState(isCollapsed) {
            if (!sidebar || !mainContent) return;
            sidebar.classList.toggle('sidebar-collapsed', isCollapsed);
            mainContent.style.marginLeft = isCollapsed ? '5rem' : '9.5rem';
            document.getElementById('toggle-icon-collapse')?.classList.toggle('hidden', isCollapsed);
            document.getElementById('toggle-icon-expand')?.classList.toggle('hidden', !isCollapsed);
        }

        // 绑定事件
        sidebarToggleBtn?.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
            setSidebarState(!isCollapsed);
            localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(!isCollapsed));
        });

        navToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                if (sidebar.classList.contains('sidebar-collapsed')) return;
                const submenu = document.getElementById(toggle.dataset.toggle);
                submenu?.classList.toggle('hidden');
                toggle.querySelector('.toggle-icon-plus')?.classList.toggle('hidden');
                toggle.querySelector('.toggle-icon-minus')?.classList.toggle('hidden');
            });
        });

        // 恢复状态
        setSidebarState(JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY)));
        // --- 侧边栏逻辑结束 ---

        
        // 页面核心功能加载
        loadWorkflows();
        loadTasks();
        updateExecuteButtonState();
    }

    initializePage();
});

