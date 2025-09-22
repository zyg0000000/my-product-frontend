/**
 * @file automation_suite.js
 * @version 2.3 - Workflow Editor Integration
 * @description 前端逻辑，用于自动化套件控制中心。
 * - [NEW v2.3] 新增了完整的工作流创建和编辑功能。
 * - [NEW v2.3] "新建"按钮现在可以打开一个功能完善的编辑器弹窗。
 * - [NEW v2.3] 工作流列表新增"编辑"按钮，可加载现有数据进行修改。
 * - [NEW v2.3] 编辑器弹窗内的"保存"按钮会调用云函数API，实现工作流的云端持久化。
 */

document.addEventListener('DOMContentLoaded', function () {
    // --- 全局变量与配置 ---
    const API_BASE_URL = 'YOUR_API_GATEWAY_BASE_URL'; // TODO: 替换为您的API网关地址
    const WORKFLOWS_API = `${API_BASE_URL}/automation-workflows`;
    const TASKS_API = `${API_BASE_URL}/automation-tasks`;

    let tasksPollingInterval;

    // --- DOM 元素获取 ---
    const workflowsTableBody = document.getElementById('workflows-table-body');
    const workflowSelect = document.getElementById('workflow-select');
    const executeTaskBtn = document.getElementById('execute-task-btn');
    const tasksTableBody = document.getElementById('tasks-table-body');
    const xingtuIdInput = document.getElementById('xingtu-id-input');

    // --- [v2.3] 新增工作流编辑器相关DOM ---
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
    
    // --- 函数定义 ---

    /**
     * 加载并渲染工作流列表
     */
    async function loadWorkflows() {
        try {
            const response = await fetch(WORKFLOWS_API, { method: 'GET' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                workflowsTableBody.innerHTML = '';
                workflowSelect.innerHTML = '';

                if (result.data.length === 0) {
                     workflowsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">暂无工作流，请点击右上角“新建工作流”创建。</td></tr>`;
                }

                result.data.forEach(workflow => {
                    // 填充表格
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${workflow.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${workflow._id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button class="text-indigo-600 hover:text-indigo-900 edit-workflow-btn" data-id="${workflow._id}">编辑</button>
                        </td>
                    `;
                    workflowsTableBody.appendChild(row);

                    // 填充下拉菜单
                    const option = document.createElement('option');
                    option.value = workflow._id;
                    option.textContent = `${workflow.name} (${workflow._id})`;
                    workflowSelect.appendChild(option);
                });
            } else {
                console.error('加载工作流失败:', result.message);
                workflowsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">加载工作流失败</td></tr>`;
            }
        } catch (error) {
            console.error('请求工作流API时出错:', error);
            workflowsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">请求工作流API时出错</td></tr>`;
        }
    }

    /**
     * 加载并渲染任务列表
     */
    async function loadTasks() {
        try {
            const response = await fetch(TASKS_API, { method: 'GET' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                tasksTableBody.innerHTML = '';

                if (result.data.length === 0) {
                    tasksTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">暂无任务记录</td></tr>`;
                }

                result.data.forEach(task => {
                    const row = document.createElement('tr');
                    let statusBadge;
                    switch (task.status) {
                        case 'pending':
                            statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">等待中</span>`;
                            break;
                        case 'processing':
                            statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">处理中</span>`;
                            break;
                        case 'completed':
                            statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">已完成</span>`;
                            break;
                        case 'failed':
                            statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">失败</span>`;
                            break;
                        default:
                            statusBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">未知</span>`;
                    }
                    
                    let resultCell = 'N/A';
                    if (task.status === 'completed' && task.result) {
                        resultCell = `<a href="${task.result.screenshotPath || '#'}" target="_blank" class="text-indigo-600 hover:underline">查看截图</a>`;
                    } else if (task.status === 'failed') {
                        resultCell = `<span class="text-red-600" title="${task.error || '无详细信息'}">执行失败</span>`;
                    }

                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${task._id}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${resultCell}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(task.createdAt).toLocaleString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button class="text-red-600 hover:text-red-900 delete-task-btn" data-id="${task._id}">删除</button>
                        </td>
                    `;
                    tasksTableBody.appendChild(row);
                });
            } else {
                console.error('加载任务列表失败:', result.message);
            }
        } catch (error) {
            console.error('请求任务API时出错:', error);
        }
    }
    
    /**
     * [v2.3] 打开工作流编辑器弹窗
     * @param {object | null} workflowData - 如果是编辑，则传入工作流对象；如果是新建，则为 null
     */
    function openWorkflowModal(workflowData = null) {
        workflowForm.reset();
        jsonError.classList.add('hidden');
        if (workflowData) {
            modalTitle.textContent = '编辑工作流';
            workflowIdInput.value = workflowData._id;
            workflowNameInput.value = workflowData.name;
            workflowJsonEditor.value = JSON.stringify(workflowData.steps, null, 2); // 格式化JSON
        } else {
            modalTitle.textContent = '新建工作流';
            workflowIdInput.value = '';
            // 提供一个模板
            const template = [
                { "type": "goto", "name": "访问页面", "url": "https://www.bytedance.com/" },
                { "type": "screenshot", "name": "页面截图", "fullPage": true }
            ];
            workflowJsonEditor.value = JSON.stringify(template, null, 2);
        }
        workflowModal.classList.remove('hidden');
    }

    /**
     * [v2.3] 关闭工作流编辑器弹窗
     */
    function closeWorkflowModal() {
        workflowModal.classList.add('hidden');
    }

    /**
     * [v2.3] 保存工作流
     */
    async function saveWorkflow() {
        // 验证JSON格式
        let steps;
        try {
            steps = JSON.parse(workflowJsonEditor.value);
            jsonError.classList.add('hidden');
        } catch (e) {
            jsonError.textContent = 'JSON 格式无效，请检查！';
            jsonError.classList.remove('hidden');
            return;
        }

        const workflowData = {
            name: workflowNameInput.value,
            steps: steps,
        };
        
        // 如果是编辑，则添加_id
        if (workflowIdInput.value) {
            workflowData._id = workflowIdInput.value;
        }

        try {
            const response = await fetch(WORKFLOWS_API, {
                method: 'POST', // 后端云函数通过有无 _id 来区分创建和更新
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflowData)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                alert('工作流保存成功!');
                closeWorkflowModal();
                loadWorkflows(); // 重新加载列表
            } else {
                throw new Error(result.message || '保存失败');
            }
        } catch (error) {
            console.error('保存工作流失败:', error);
            alert(`保存工作流失败: ${error.message}`);
        }
    }


    // --- 事件监听 ---

    // 执行任务
    executeTaskBtn.addEventListener('click', async () => {
        const workflowId = workflowSelect.value;
        const xingtuId = xingtuIdInput.value;

        if (!workflowId || !xingtuId) {
            alert('请选择一个工作流并输入星图ID。');
            return;
        }

        try {
            const response = await fetch(TASKS_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workflowId: workflowId,
                    parameters: { xingtuId: xingtuId }
                }),
            });
            const result = await response.json();
            if (result.success) {
                alert('任务创建成功！');
                loadTasks(); // 立即刷新一次
            } else {
                alert(`创建任务失败: ${result.message}`);
            }
        } catch (error) {
            console.error('创建任务API请求失败:', error);
            alert('创建任务API请求失败，请检查网络或联系管理员。');
        }
    });

    // 使用事件委托处理任务删除
    tasksTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-task-btn')) {
            const taskId = event.target.getAttribute('data-id');
            if (confirm(`确定要删除任务 ${taskId} 吗？`)) {
                try {
                    const response = await fetch(TASKS_API, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ _id: taskId }),
                    });
                    const result = await response.json();
                    if (result.success) {
                        alert('任务删除成功！');
                        loadTasks();
                    } else {
                        alert(`删除失败: ${result.message}`);
                    }
                } catch (error) {
                    alert('删除任务API请求失败。');
                    console.error('删除任务失败:', error);
                }
            }
        }
    });
    
    // --- [v2.3] 新增工作流编辑器事件监听 ---

    // 打开新建弹窗
    newWorkflowBtn.addEventListener('click', () => {
        openWorkflowModal(null);
    });

    // 打开编辑弹窗 (事件委托)
    workflowsTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-workflow-btn')) {
            const workflowId = event.target.getAttribute('data-id');
            // 从API获取最新的工作流数据以进行编辑
             try {
                const response = await fetch(`${WORKFLOWS_API}?id=${workflowId}`, { method: 'GET' });
                const result = await response.json();
                if(result.success) {
                    openWorkflowModal(result.data);
                } else {
                    alert(`加载工作流数据失败: ${result.message}`);
                }
            } catch (error) {
                alert('加载工作流数据失败');
            }
        }
    });

    // 保存按钮
    saveWorkflowBtn.addEventListener('click', saveWorkflow);

    // 取消按钮
    cancelWorkflowBtn.addEventListener('click', closeWorkflowModal);


    // --- 初始化 ---
    function initialize() {
        // 注入侧边栏
        if (typeof loadSidebar === 'function') {
            loadSidebar('automation_suite');
        }
        
        // 页面加载时立即获取一次数据
        loadWorkflows();
        loadTasks();

        // 启动任务列表的轮询
        if (tasksPollingInterval) clearInterval(tasksPollingInterval);
        tasksPollingInterval = setInterval(loadTasks, 5000); // 每5秒刷新一次任务列表
    }

    initialize();
});
