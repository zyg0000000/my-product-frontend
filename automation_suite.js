/**
 * @file automation_suite.js
 * @version 7.1 - Sidebar Unification
 * @description Frontend logic for the Automation Suite.
 * --- UPDATE (v7.1) ---
 * - [核心修改] 移除了所有与旧的、硬编码侧边栏相关的 JavaScript 逻辑。
 * - [代码清理] 删除了不再需要的 `sidebar` 和 `sidebarToggleBtn` DOM 元素获取。
 * - [依赖关系] 此版本现在完全依赖外部的 `sidebar.js` 来处理所有侧边栏交互。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- Global Variables & Configuration (不变) ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const WORKFLOWS_API = `${API_BASE_URL}/automation-workflows`;
    const TASKS_API = `${API_BASE_URL}/automation-tasks`;
    const TASKS_PER_PAGE = 20;

    let activePollingIntervals = {};
    let selectedWorkflowId = null;
    let workflowsCache = [];
    let tasksCache = {};
    let sortableCanvas = null;
    let sortableLibrary = null;

    // --- Pagination State (不变) ---
    let currentPage = 1;
    let hasNextPage = true;
    let isLoadingTasks = false;

    // --- DOM Element Acquisition ---
    // [核心修改] 移除了 sidebar 和 sidebarToggleBtn 的获取
    const workflowsListContainer = document.getElementById('workflows-list');
    const xingtuIdInput = document.getElementById('xingtu-id-input');
    const executeTaskBtn = document.getElementById('execute-task-btn');
    const tasksListContainer = document.getElementById('tasks-list');
    const newWorkflowBtn = document.getElementById('new-workflow-btn');
    const workflowModal = document.getElementById('workflow-modal');
    const modalTitle = document.getElementById('modal-title');
    const workflowForm = document.getElementById('workflow-form');
    const workflowIdInput = document.getElementById('workflow-id-input');
    const workflowNameInput = document.getElementById('workflow-name-input');
    const workflowTypeSelect = document.getElementById('workflow-type-select');
    const workflowDescriptionInput = document.getElementById('workflow-description-input');
    const cancelWorkflowBtn = document.getElementById('cancel-workflow-btn');
    const actionLibrary = document.getElementById('action-library');
    const workflowCanvas = document.getElementById('workflow-canvas');
    const stepBlockTemplate = document.getElementById('step-block-template');
    
    // Screenshot Modal Elements (不变)
    const screenshotModal = document.getElementById('screenshot-modal');
    const screenshotModalTitle = document.getElementById('screenshot-modal-title');
    const closeScreenshotModalBtn = document.getElementById('close-screenshot-modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalThumbnails = document.getElementById('modal-thumbnails');
    const modalPrevBtn = document.getElementById('modal-prev-btn');
    const modalNextBtn = document.getElementById('modal-next-btn');

    // Data Modal Elements (不变)
    const dataModal = document.getElementById('data-modal');
    const dataModalTitle = document.getElementById('data-modal-title');
    const closeDataModalBtn = document.getElementById('close-data-modal');
    const dataModalTableBody = document.getElementById('data-modal-table-body');
    const copyDataBtn = document.getElementById('copy-data-btn');

    // Load More Button (不变)
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadMoreContainer = document.getElementById('load-more-container');

    // --- 所有函数 (apiCall, ACTION_DEFINITIONS, 工作流和任务管理等) 均保持不变 ---
    // ... 此处省略所有未作修改的函数代码 ...
     async function apiCall(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            if (response.status === 204) return null;
            return response.json();
        } catch (error) {
            console.error(`API call failed for ${method} ${url}:`, error);
            alert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    const ACTION_DEFINITIONS = {
        waitForSelector: {
            title: '等待元素出现',
            color: 'sky',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>`,
            fields: [
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：等待价格模块加载' },
                { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '.price-container .final-price', required: true },
            ]
        },
        click: {
            title: '点击元素',
            color: 'indigo',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>`,
            fields: [
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：点击“下一页”按钮' },
                { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '#some-button-id', required: true },
            ]
        },
        screenshot: {
            title: '截取区域',
            color: 'teal',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
            fields: [
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：截取价格区域' },
                { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: '.price-container', required: true },
                { name: 'saveAs', label: '保存为 *', type: 'text', placeholder: '价格截图.png', required: true },
                { name: 'stitched', label: '长截图模式', type: 'checkbox' }
            ]
        },
        wait: {
            title: '等待',
            color: 'orange',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            fields: [
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：等待动画加载' },
                { name: 'milliseconds', label: '等待时长 (毫秒) *', type: 'number', placeholder: '2000', required: true },
            ]
        },
        scrollPage: {
            title: '滚动页面',
            color: 'purple',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 17l-4 4m0 0l-4-4m4 4V3"></path></svg>`,
            fields: [ 
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '滚动页面以加载更多内容' },
                { name: 'selector', label: '滚动区域 (可选)', type: 'text', placeholder: '默认为整个页面, 可指定如 .scroll-div' }
            ]
        },
        waitForNetworkIdle: {
            title: '等待加载',
            color: 'gray',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M5 5a7 7 0 0012 5l-2.5-2.5M19 19v-5h-5M18 18a7 7 0 00-12-5l2.5 2.5"></path></svg>`,
            fields: [ { name: 'description', label: '步骤描述', type: 'text', placeholder: '等待所有网络请求完成' } ]
        },
        extractData: {
            title: '提取数据',
            color: 'amber',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3v3m-3-3v3m-3-3v3M3 17l6-6 4 4 6-6"></path></svg>`,
            fields: [
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：提取预期CPM' },
                { name: 'dataName', label: '数据名称 *', type: 'text', placeholder: '预期CPM', required: true },
                { name: 'selector', label: 'CSS 选择器 *', type: 'text', placeholder: 'text=预期CPM >> span.value', required: true },
            ]
        },
        compositeExtract: {
            title: '组合数据',
            color: 'rose',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
            fields: [
                { name: 'description', label: '步骤描述', type: 'text', placeholder: '例如：拼接用户画像总结' },
                { name: 'dataName', label: '最终数据名称 *', type: 'text', placeholder: '用户画像总结', required: true },
                { name: 'template', label: '组合模板 *', type: 'textarea', placeholder: '触达用户 ${age_gender}\n集中 ${city_tier}', required: true }
            ],
            isComplex: true
        }
    };
    
    function populateActionLibrary() {
        actionLibrary.innerHTML = '';
        for (const actionType in ACTION_DEFINITIONS) {
            const def = ACTION_DEFINITIONS[actionType];
            const div = document.createElement('div');
            div.className = 'action-library-item';
            div.innerHTML = `<button type="button" data-action="${actionType}" class="add-step-btn w-full text-left p-2 rounded-md bg-white hover:bg-${def.color}-50 text-gray-700 border border-gray-200 hover:border-${def.color}-300 text-sm flex items-center gap-3 transition-all">
                <span class="text-${def.color}-500">${def.icon}</span> 
                <span>${def.title}</span>
            </button>`;
            actionLibrary.appendChild(div);
        }
    }
    
    function checkCanvasEmptyState() {
        if (workflowCanvas.children.length === 0) {
            workflowCanvas.innerHTML = `<div id="canvas-placeholder" class="text-center text-gray-400 p-10 border-2 border-dashed rounded-lg">
                <p>画布为空</p>
                <p class="text-xs mt-1">请从左侧拖拽或点击动作库中的步骤来添加</p>
            </div>`;
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
        if(field.type === 'textarea') input.rows = 2;
        else input.type = field.type;
        
        input.name = field.name;
        input.placeholder = field.placeholder;
        input.required = field.required || false;
        input.className = 'mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500';
        input.value = value || '';
        return input;
    }
    
    function createStepBlockElement(actionType, data = {}) {
        const definition = ACTION_DEFINITIONS[actionType];
        if (!definition) return null;

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
        
    function createCompositeSourceElement(source = {}){
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
    
    function serializeCanvasToSteps() {
        const steps = [];
        workflowCanvas.querySelectorAll('.step-block').forEach(block => {
            const step = { action: block.dataset.actionType };
            const inputs = block.querySelectorAll('.step-block-content input, .step-block-content textarea');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    if (input.checked) {
                        step[input.name] = true;
                    }
                } else if (input.value && !input.closest('.composite-source-item')) {
                    step[input.name] = input.type === 'number' ? parseInt(input.value, 10) : input.value;
                }
            });
            if (step.action === 'compositeExtract') {
                step.sources = [];
                block.querySelectorAll('.composite-source-item').forEach(item => {
                    const name = item.querySelector('.source-name-input').value.trim();
                    const selector = item.querySelector('.source-selector-input').value.trim();
                    if(name && selector) {
                        step.sources.push({ name, selector });
                    }
                });
            }
            steps.push(step);
        });
        return steps;
    }
    
    function initializeSortable() {
        if (sortableCanvas) sortableCanvas.destroy();
        if (sortableLibrary) sortableLibrary.destroy();

        sortableCanvas = new Sortable(workflowCanvas, {
            group: 'shared-workflow',
            animation: 150, 
            handle: '.step-block-handle', 
            ghostClass: 'sortable-ghost',
            onAdd: function (evt) {
                const placeholderItem = evt.item;
                const actionType = placeholderItem.querySelector('button').dataset.action;
                const realBlock = createStepBlockElement(actionType);
                if (realBlock) {
                    placeholderItem.parentNode.replaceChild(realBlock, placeholderItem);
                }
                checkCanvasEmptyState(); 
            },
        });

        sortableLibrary = new Sortable(actionLibrary, {
            group: {
                name: 'shared-workflow',
                pull: 'clone', 
                put: false 
            },
            sort: false,
        });
    }

    async function loadWorkflows() {
        try {
            const response = await apiCall(WORKFLOWS_API);
            workflowsCache = response.data || [];
            renderWorkflows();
        } catch (error) {
            workflowsListContainer.innerHTML = '<p class="text-red-500">加载工作流失败。</p>';
        }
    }

    function renderWorkflows() {
        workflowsListContainer.innerHTML = '';
        if (workflowsCache.length === 0) {
            workflowsListContainer.innerHTML = '<p class="text-gray-500 text-center">暂无工作流，请新建。</p>';
            return;
        }
        workflowsCache.forEach(workflow => {
            const typeLabels = {
                'screenshot': { label: '截图', color: 'bg-indigo-200 text-indigo-800' },
                'data_scraping': { label: '数据抓取', color: 'bg-blue-200 text-blue-800' },
                'composite': { label: '组合任务', color: 'bg-emerald-200 text-emerald-800' }
            };
            const typeInfo = typeLabels[workflow.type] || { label: '未知', color: 'bg-gray-200 text-gray-800' };
            const item = document.createElement('div');
            item.className = 'workflow-item flex justify-between items-center p-2 rounded hover:bg-gray-200';
            item.dataset.id = workflow._id;
            item.innerHTML = `
                <div class="flex-grow cursor-pointer">
                    <span class="font-medium text-gray-800">${workflow.name}</span>
                    <span class="ml-2 text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${typeInfo.color}">${typeInfo.label}</span>
                </div>
                <div class="space-x-2 flex-shrink-0">
                    <button class="edit-workflow-btn text-gray-500 hover:text-indigo-600 text-sm" data-id="${workflow._id}">编辑</button>
                    <button class="delete-workflow-btn text-gray-500 hover:text-red-600 text-sm" data-id="${workflow._id}">删除</button>
                </div>
            `;
            workflowsListContainer.appendChild(item);
        });
        
        if (selectedWorkflowId) {
            const selectedItem = workflowsListContainer.querySelector(`.workflow-item[data-id="${selectedWorkflowId}"]`);
            if (selectedItem) selectedItem.classList.add('bg-indigo-100');
            else selectedWorkflowId = null;
        }
        updateExecuteButtonState();
    }
    
    function openWorkflowModalForCreate() {
        workflowForm.reset();
        workflowIdInput.value = '';
        modalTitle.textContent = '新建工作流';
        workflowCanvas.innerHTML = '';
        checkCanvasEmptyState();
        initializeSortable();
        workflowModal.classList.remove('hidden');
    }

    function openWorkflowModalForEdit(workflowId) {
        const workflow = workflowsCache.find(w => w._id === workflowId);
        if (!workflow) return alert('找不到要编辑的工作流。');
        
        workflowForm.reset();
        workflowIdInput.value = workflow._id;
        workflowNameInput.value = workflow.name;
        workflowTypeSelect.value = workflow.type || 'screenshot';
        workflowDescriptionInput.value = workflow.description || '';
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
        const id = workflowIdInput.value;
        const steps = serializeCanvasToSteps();
        if (steps.length === 0) return alert('工作流至少需要一个步骤。');
        const workflowData = {
            name: workflowNameInput.value,
            type: workflowTypeSelect.value,
            description: workflowDescriptionInput.value,
            steps: steps,
        };
        try {
            if (id) {
                await apiCall(`${WORKFLOWS_API}?id=${id}`, 'PUT', { _id: id, ...workflowData });
            } else {
                await apiCall(WORKFLOWS_API, 'POST', workflowData);
            }
            workflowModal.classList.add('hidden');
            loadWorkflows();
        } catch (error) {}
    }
    
    async function handleDeleteWorkflow(workflowId) {
        const workflow = workflowsCache.find(w => w._id === workflowId);
        if (!workflow) return;
        if (confirm(`确定要删除工作流 "${workflow.name}" 吗？此操作不可撤销。`)) {
            try {
                await apiCall(`${WORKFLOWS_API}?id=${workflowId}`, 'DELETE');
                if (selectedWorkflowId === workflowId) selectedWorkflowId = null;
                loadWorkflows();
            } catch (error) {}
        }
    }
    
    function renderTask(task, prepend = false) {
        const existingTaskElement = document.getElementById(`task-${task._id}`);
        if (existingTaskElement) {
            const statusElement = existingTaskElement.querySelector('.task-status');
            const resultElement = existingTaskElement.querySelector('.task-result-container');
            if (statusElement && resultElement) {
                 const currentStatus = statusElement.dataset.status;
                 if (currentStatus !== task.status) {
                     existingTaskElement.innerHTML = buildTaskInnerHTML(task);
                     if (task.status === 'pending' || task.status === 'processing') startPolling(task._id);
                     else stopPolling(task._id);
                 }
                 return;
            }
        }

        const taskElement = document.createElement('div');
        taskElement.id = `task-${task._id}`;
        taskElement.className = 'task-item p-3 bg-white rounded-lg border border-gray-200 shadow-sm';
        taskElement.innerHTML = buildTaskInnerHTML(task);
        
        if (prepend) {
            tasksListContainer.prepend(taskElement);
        } else {
            tasksListContainer.appendChild(taskElement);
        }

        if (task.status === 'pending' || task.status === 'processing') startPolling(task._id);
        else stopPolling(task._id);
    }
    
    function buildTaskInnerHTML(task) {
        const statusColors = {
            pending: { text: '等待中', bg: 'bg-yellow-100', textClr: 'text-yellow-800' },
            processing: { text: '处理中', bg: 'bg-blue-100', textClr: 'text-blue-800' },
            completed: { text: '已完成', bg: 'bg-green-100', textClr: 'text-green-800' },
            failed: { text: '失败', bg: 'bg-red-100', textClr: 'text-red-800' }
        };
        const statusInfo = statusColors[task.status] || { text: '未知', bg: 'bg-gray-100', textClr: 'text-gray-800' };

        let resultButtons = [];
        const screenshots = task.result?.screenshots;
        const data = task.result?.data;

        if (task.status === 'completed') {
            if (screenshots?.length > 0) {
                resultButtons.push(`<button data-task-id="${task._id}" class="view-screenshots-btn text-indigo-600 hover:underline text-sm font-medium">查看截图 (${screenshots.length})</button>`);
            }
            if (data && Object.keys(data).length > 0) {
                resultButtons.push(`<button data-task-id="${task._id}" class="view-data-btn text-sky-600 hover:underline text-sm font-medium">查看数据</button>`);
            }
        }
        
        let resultHtml = resultButtons.join('<span class="mx-1 text-gray-300">|</span>');

        if (task.status === 'failed') {
             resultHtml = `<span class="text-red-500 text-sm cursor-pointer" title="${task.errorMessage || '无详细错误信息'}">查看错误</span>`;
        }

        const deleteButton = `<button data-id="${task._id}" class="delete-task-btn text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>`;
        
        return `
            <div class="flex justify-between items-center">
                <div class="flex-grow min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate" title="星图ID: ${task.xingtuId}\n任务ID: ${task._id}">
                        <span class="font-mono bg-gray-100 px-1 rounded">${task.xingtuId}</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        <span class="font-medium">${task.workflowName || '...'}</span> @ ${new Date(task.createdAt).toLocaleTimeString()}
                    </p>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                    <span class="task-status text-xs font-semibold px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.textClr}" data-status="${task.status}">${statusInfo.text}</span>
                    <div class="task-result-container flex items-center gap-2">${resultHtml}</div>
                    ${deleteButton}
                </div>
            </div>`;
    }
    
    async function loadTasks(page = 1) {
        if (isLoadingTasks) return;
        isLoadingTasks = true;
        loadMoreBtn.textContent = '加载中...';

        try {
            const response = await apiCall(`${TASKS_API}?page=${page}&limit=${TASKS_PER_PAGE}`);
            
            if (page === 1) {
                tasksListContainer.innerHTML = '';
                tasksCache = {};
            }

            const tasks = response.data || [];
            tasks.forEach(task => {
                tasksCache[task._id] = task;
                renderTask(task, false);
            });

            hasNextPage = response.pagination?.hasNextPage || false;
            loadMoreContainer.classList.toggle('hidden', !hasNextPage);

        } catch (error) {
            tasksListContainer.innerHTML = '<p class="text-red-500">加载任务历史失败。</p>';
        } finally {
            isLoadingTasks = false;
            loadMoreBtn.textContent = '加载更多';
        }
    }

    function startPolling(taskId) {
        if (activePollingIntervals[taskId]) return;
        activePollingIntervals[taskId] = setInterval(async () => {
            try {
                const singleTaskResponse = await apiCall(`${TASKS_API}?id=${taskId}`);
                const updatedTask = singleTaskResponse.data;
                if(updatedTask) {
                    const taskFromCache = tasksCache[taskId];
                    if (!updatedTask.workflowName && taskFromCache && taskFromCache.workflowName) {
                        updatedTask.workflowName = taskFromCache.workflowName;
                    }
                    tasksCache[taskId] = updatedTask;
                    renderTask(updatedTask, true);
                } else {
                     stopPolling(taskId);
                }
            } catch (error) {
                stopPolling(taskId);
            }
        }, 5000);
    }

    function stopPolling(taskId) {
        if (activePollingIntervals[taskId]) {
            clearInterval(activePollingIntervals[taskId]);
            delete activePollingIntervals[taskId];
        }
    }

    function updateExecuteButtonState() {
        executeTaskBtn.disabled = !(selectedWorkflowId && xingtuIdInput.value.trim() !== '');
    }

    function openScreenshotModal(taskId) {
        const task = tasksCache[taskId];
        if (!task || !task.result?.screenshots?.length) return;

        const screenshots = task.result.screenshots;
        screenshotModal.dataset.screenshots = JSON.stringify(screenshots);
        screenshotModal.dataset.currentIndex = "0";
        
        modalThumbnails.innerHTML = '';
        screenshots.forEach((ss, index) => {
            const thumbItem = document.createElement('div');
            thumbItem.className = 'thumbnail-item p-1 border-2 border-transparent rounded-md cursor-pointer hover:border-indigo-400';
            thumbItem.dataset.index = index;
            thumbItem.innerHTML = `<img src="${ss.url}" alt="${ss.name}" class="w-full h-20 object-cover rounded">
                                 <p class="text-xs text-gray-600 truncate mt-1" title="${ss.name}">${ss.name}</p>`;
            modalThumbnails.appendChild(thumbItem);
        });

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
            if (isActive) {
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
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

        dataModalTitle.textContent = `数据抓取结果 (星图ID: ${task.xingtuId})`;
        dataModalTableBody.innerHTML = '';

        for (const key in data) {
            const row = dataModalTableBody.insertRow();
            const keyCell = row.insertCell();
            keyCell.className = "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900";
            keyCell.textContent = key;
            
            const valueCell = row.insertCell();
            valueCell.className = "px-6 py-4 whitespace-pre-wrap text-sm text-gray-500";
            valueCell.innerHTML = String(data[key]).replace(/\n/g, '<br>');
        }
        
        copyDataBtn.dataset.taskData = JSON.stringify(data);
        dataModal.classList.remove('hidden');
    }

    function closeDataModal() {
        dataModal.classList.add('hidden');
        dataModalTableBody.innerHTML = '';
        delete copyDataBtn.dataset.taskData;
    }

    function handleCopyData() {
        const data = JSON.parse(copyDataBtn.dataset.taskData || '{}');
        const textToCopy = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyDataBtn.textContent;
            copyDataBtn.textContent = '已复制!';
            setTimeout(() => {
                copyDataBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            alert('复制失败: ' + err);
        });
    }

    // --- Page Initialization ---
    function initializePage() {
        populateActionLibrary();
        xingtuIdInput.addEventListener('input', updateExecuteButtonState);
        
        workflowsListContainer.addEventListener('click', (event) => {
            const target = event.target;
            const workflowItem = target.closest('.workflow-item');
            if (!workflowItem) return;
            const workflowId = workflowItem.dataset.id;
            if (target.closest('.edit-workflow-btn')) {
                openWorkflowModalForEdit(workflowId);
            } else if (target.closest('.delete-workflow-btn')) {
                handleDeleteWorkflow(workflowId);
            } else {
                document.querySelectorAll('.workflow-item').forEach(el => el.classList.remove('bg-indigo-100'));
                workflowItem.classList.add('bg-indigo-100');
                selectedWorkflowId = workflowId;
                updateExecuteButtonState();
            }
        });
        
        tasksListContainer.addEventListener('click', async (event) => {
            const deleteBtn = event.target.closest('.delete-task-btn');
            if (deleteBtn) {
                const taskId = deleteBtn.dataset.id;
                if (confirm(`确定要删除此任务记录吗？`)) {
                    try {
                        await apiCall(`${TASKS_API}?id=${taskId}`, 'DELETE');
                        document.getElementById(`task-${taskId}`)?.remove();
                    } catch (error) {}
                }
                return;
            }

            const viewScreenshotsBtn = event.target.closest('.view-screenshots-btn');
            if (viewScreenshotsBtn) {
                openScreenshotModal(viewScreenshotsBtn.dataset.taskId);
                return;
            }

            const viewDataBtn = event.target.closest('.view-data-btn');
            if (viewDataBtn) {
                openDataModal(viewDataBtn.dataset.taskId);
            }
        });

        executeTaskBtn.addEventListener('click', async () => {
            const payload = { workflowId: selectedWorkflowId, xingtuId: xingtuIdInput.value.trim() };
            try {
                await apiCall(TASKS_API, 'POST', payload);
                currentPage = 1;
                loadTasks(currentPage);
                xingtuIdInput.value = '';
                updateExecuteButtonState();
            } catch (error) {}
        });

        newWorkflowBtn.addEventListener('click', openWorkflowModalForCreate);
        cancelWorkflowBtn.addEventListener('click', () => workflowModal.classList.add('hidden'));
        workflowForm.addEventListener('submit', handleWorkflowFormSubmit);
        
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
            if(delBtn) {
                delBtn.closest('.step-block').remove();
                checkCanvasEmptyState();
            }
            const addSourceBtn = event.target.closest('.add-source-btn');
            if(addSourceBtn) {
                 addSourceBtn.previousElementSibling.appendChild(createCompositeSourceElement());
            }
            const removeSourceBtn = event.target.closest('.remove-source-btn');
            if(removeSourceBtn) removeSourceBtn.closest('.composite-source-item').remove();
        });
        
        closeScreenshotModalBtn.addEventListener('click', closeScreenshotModal);
        modalPrevBtn.addEventListener('click', () => changeModalImage(-1));
        modalNextBtn.addEventListener('click', () => changeModalImage(1));
        modalThumbnails.addEventListener('click', (event) => {
            const thumb = event.target.closest('.thumbnail-item');
            if (thumb) {
                screenshotModal.dataset.currentIndex = thumb.dataset.index;
                updateModalView();
            }
        });
        
        closeDataModalBtn.addEventListener('click', closeDataModal);
        copyDataBtn.addEventListener('click', handleCopyData);

        loadMoreBtn.addEventListener('click', () => {
            if (hasNextPage && !isLoadingTasks) {
                currentPage++;
                loadTasks(currentPage);
            }
        });

        // --- [核心修改] ---
        // 删除所有旧的、硬编码的侧边栏控制逻辑。
        // 新的侧边栏将由 sidebar.js 完全接管。
        
        loadWorkflows();
        loadTasks(currentPage);
        updateExecuteButtonState();
    }

    initializePage();
});
