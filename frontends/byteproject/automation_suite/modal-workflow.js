/**
 * @file modal-workflow.js
 * @description 工作流编辑弹窗模块
 */

import { API_ENDPOINTS, ACTION_DEFINITIONS } from './constants.js';

export default class WorkflowModal {
    constructor(app) {
        this.app = app;
        this.sortableCanvas = null;
        this.sortableLibrary = null;

        // DOM 元素
        this.modal = document.getElementById('workflow-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.form = document.getElementById('workflow-form');
        this.workflowIdInput = document.getElementById('workflow-id-input');
        this.workflowNameInput = document.getElementById('workflow-name-input');
        this.workflowTypeSelect = document.getElementById('workflow-type-select');
        this.workflowDescriptionInput = document.getElementById('workflow-description-input');
        this.requiredInputKeyInput = document.getElementById('required-input-key');
        this.requiredInputLabelInput = document.getElementById('required-input-label');
        this.closeBtn = document.getElementById('close-workflow-modal');
        this.cancelBtn = document.getElementById('cancel-workflow-btn');
        this.actionLibrary = document.getElementById('action-library');
        this.workflowCanvas = document.getElementById('workflow-canvas');
        this.stepBlockTemplate = document.getElementById('step-block-template');

        // 绑定事件处理器
        this.handleFormSubmit = this.handleFormSubmit.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleLibraryClick = this.handleLibraryClick.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleFormSubmit);
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this.handleCancel);
        }
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', this.handleCancel);
        }
        if (this.actionLibrary) {
            this.actionLibrary.addEventListener('click', this.handleLibraryClick);
        }
        if (this.workflowCanvas) {
            this.workflowCanvas.addEventListener('click', this.handleCanvasClick);
        }
    }

    openForCreate() {
        if (!this.form) return;

        this.form.reset();
        this.workflowIdInput.value = '';
        this.modalTitle.textContent = '新建工作流';
        this.workflowCanvas.innerHTML = '';
        this.checkCanvasEmptyState();
        this.populateActionLibrary();
        this.initializeSortable();
        this.modal.classList.remove('hidden');
    }

    openForEdit(workflowId) {
        const workflow = this.app.workflowModule.workflows.find(w => w._id === workflowId);
        if (!workflow) {
            alert('找不到要编辑的工作流。');
            return;
        }

        this.form.reset();
        this.workflowIdInput.value = workflow._id;
        this.workflowNameInput.value = workflow.name;
        this.workflowTypeSelect.value = workflow.type || 'screenshot';
        this.workflowDescriptionInput.value = workflow.description || '';

        // 加载 requiredInput 配置
        if (workflow.requiredInput) {
            this.requiredInputKeyInput.value = workflow.requiredInput.key || '';
            this.requiredInputLabelInput.value = workflow.requiredInput.label || '';
        } else {
            this.requiredInputKeyInput.value = '';
            this.requiredInputLabelInput.value = '';
        }

        this.modalTitle.textContent = `编辑工作流: ${workflow.name}`;

        this.workflowCanvas.innerHTML = '';
        const steps = workflow.steps || [];
        steps.forEach(step => {
            const block = this.createStepBlockElement(step.action, step);
            if (block) this.workflowCanvas.appendChild(block);
        });

        this.checkCanvasEmptyState();
        this.populateActionLibrary();
        this.initializeSortable();
        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        // 清理 Sortable 实例
        if (this.sortableCanvas) {
            this.sortableCanvas.destroy();
            this.sortableCanvas = null;
        }
        if (this.sortableLibrary) {
            this.sortableLibrary.destroy();
            this.sortableLibrary = null;
        }
    }

    handleCancel() {
        this.close();
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-workflow-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        const id = this.workflowIdInput.value;
        const steps = this.serializeCanvas();

        if (steps.length === 0) {
            alert('工作流至少需要一个步骤。');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存工作流';
            return;
        }

        const workflowData = {
            name: this.workflowNameInput.value,
            type: this.workflowTypeSelect.value,
            description: this.workflowDescriptionInput.value,
            steps: steps
        };

        // 添加 requiredInput 配置（如果填写了）
        const inputKey = this.requiredInputKeyInput.value.trim();
        const inputLabel = this.requiredInputLabelInput.value.trim();
        if (inputKey && inputLabel) {
            workflowData.requiredInput = {
                key: inputKey,
                label: inputLabel
            };
        }

        try {
            if (id) {
                await this.app.apiCall(`${API_ENDPOINTS.workflows}?id=${id}`, 'PUT', { _id: id, ...workflowData });
            } else {
                await this.app.apiCall(API_ENDPOINTS.workflows, 'POST', workflowData);
            }

            this.close();
            await this.app.workflowModule.load();

            // 触发工作流更新事件
            document.dispatchEvent(new CustomEvent('workflowUpdated', {
                detail: { workflowId: id }
            }));

        } catch (error) {
            alert(`保存失败: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存工作流';
        }
    }

    handleLibraryClick(event) {
        const btn = event.target.closest('.add-step-btn');
        if (btn) {
            this.checkCanvasEmptyState();
            const newBlock = this.createStepBlockElement(btn.dataset.action);
            if (newBlock) this.workflowCanvas.appendChild(newBlock);
        }
    }

    handleCanvasClick(event) {
        const delBtn = event.target.closest('.delete-step-btn');
        if (delBtn) {
            delBtn.closest('.step-block').remove();
            this.checkCanvasEmptyState();
        }

        const addSourceBtn = event.target.closest('.add-source-btn');
        if (addSourceBtn) {
            addSourceBtn.previousElementSibling.appendChild(this.createCompositeSourceElement());
        }

        const removeSourceBtn = event.target.closest('.remove-source-btn');
        if (removeSourceBtn) {
            removeSourceBtn.closest('.composite-source-item').remove();
        }
    }

    populateActionLibrary() {
        if (!this.actionLibrary) return;
        this.actionLibrary.innerHTML = Object.entries(ACTION_DEFINITIONS).map(([key, def]) => `
            <div class="action-library-item">
                <button type="button" data-action="${key}" class="add-step-btn w-full text-left p-2 rounded-md bg-white hover:bg-${def.color}-50 text-gray-700 border border-gray-200 hover:border-${def.color}-300 text-sm flex items-center gap-3 transition-all">
                    <span class="text-${def.color}-500">${def.icon}</span> <span>${def.title}</span>
                </button>
            </div>
        `).join('');
    }

    checkCanvasEmptyState() {
        if (this.workflowCanvas && this.workflowCanvas.children.length === 0) {
            this.workflowCanvas.innerHTML = `<div id="canvas-placeholder" class="text-center text-gray-400 p-10 border-2 border-dashed rounded-lg"><p>画布为空</p><p class="text-xs mt-1">请从左侧拖拽或点击动作库中的步骤来添加</p></div>`;
        } else {
            const placeholder = document.getElementById('canvas-placeholder');
            if (placeholder) placeholder.remove();
        }
    }

    createInputElement(field, value) {
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
        if (field.type === 'textarea') input.rows = 2;
        else input.type = field.type;
        input.name = field.name;
        input.placeholder = field.placeholder;
        input.required = field.required || false;
        input.className = 'mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500';
        input.value = value || '';
        return input;
    }

    createCompositeSourceElement(source = {}) {
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

    createStepBlockElement(actionType, data = {}) {
        const definition = ACTION_DEFINITIONS[actionType];
        if (!definition || !this.stepBlockTemplate) return null;

        const block = this.stepBlockTemplate.content.cloneNode(true).firstElementChild;
        block.dataset.actionType = actionType;
        block.querySelector('.step-block-title').textContent = definition.title;
        block.classList.add(`border-l-4`, `border-${definition.color}-400`);

        const contentDiv = block.querySelector('.step-block-content');
        definition.fields.forEach(field => {
            const fieldContainer = document.createElement('div');
            const inputElement = this.createInputElement(field, data[field.name]);
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

            (data.sources || [{ name: '', selector: '' }]).forEach(source => {
                sourcesContainer.appendChild(this.createCompositeSourceElement(source));
            });

            const addSourceBtn = document.createElement('button');
            addSourceBtn.type = 'button';
            addSourceBtn.textContent = '+ 添加数据源';
            addSourceBtn.className = 'add-source-btn text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1';
            contentDiv.appendChild(addSourceBtn);
        }

        return block;
    }

    serializeCanvas() {
        const steps = [];
        this.workflowCanvas.querySelectorAll('.step-block').forEach(block => {
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
                    if (name && selector) step.sources.push({ name, selector });
                });
            }

            steps.push(step);
        });
        return steps;
    }

    initializeSortable() {
        // 清理旧实例
        if (this.sortableCanvas) this.sortableCanvas.destroy();
        if (this.sortableLibrary) this.sortableLibrary.destroy();

        if (!this.workflowCanvas || !this.actionLibrary) return;

        // 检查 Sortable 是否可用
        if (typeof Sortable === 'undefined') {
            console.warn('[WorkflowModal] Sortable.js not loaded');
            return;
        }

        this.sortableCanvas = new Sortable(this.workflowCanvas, {
            group: 'shared-workflow',
            animation: 150,
            handle: '.step-block-handle',
            ghostClass: 'sortable-ghost',
            onAdd: (evt) => {
                const placeholder = evt.item;
                const actionType = placeholder.querySelector('button')?.dataset.action;
                if (actionType) {
                    const realBlock = this.createStepBlockElement(actionType);
                    if (realBlock) placeholder.parentNode.replaceChild(realBlock, placeholder);
                }
                this.checkCanvasEmptyState();
            }
        });

        this.sortableLibrary = new Sortable(this.actionLibrary, {
            group: { name: 'shared-workflow', pull: 'clone', put: false },
            sort: false
        });
    }

    // 资源清理
    unload() {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleFormSubmit);
        }
        if (this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.handleCancel);
        }
        if (this.cancelBtn) {
            this.cancelBtn.removeEventListener('click', this.handleCancel);
        }
        if (this.actionLibrary) {
            this.actionLibrary.removeEventListener('click', this.handleLibraryClick);
        }
        if (this.workflowCanvas) {
            this.workflowCanvas.removeEventListener('click', this.handleCanvasClick);
        }

        if (this.sortableCanvas) {
            this.sortableCanvas.destroy();
            this.sortableCanvas = null;
        }
        if (this.sortableLibrary) {
            this.sortableLibrary.destroy();
            this.sortableLibrary = null;
        }
    }
}
