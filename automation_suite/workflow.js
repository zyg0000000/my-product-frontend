/**
 * @file workflow.js
 * @description 工作流管理模块
 */

import { API_ENDPOINTS } from './constants.js';

export default class WorkflowModule {
    constructor(app) {
        this.app = app;
        this.workflows = [];
        this.workflowMap = new Map();
        this.selectedWorkflowId = null;

        // DOM 元素
        this.listContainer = document.getElementById('workflows-list');
        this.targetIdInput = document.getElementById('target-id-input');
        this.targetIdLabel = document.getElementById('target-id-label');
        this.executeBtn = document.getElementById('execute-task-btn');
        this.newWorkflowBtn = document.getElementById('new-workflow-btn');

        // 绑定事件处理器
        this.handleListClick = this.handleListClick.bind(this);
        this.handleExecute = this.handleExecute.bind(this);
        this.handleNewWorkflow = this.handleNewWorkflow.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    }

    async load() {
        try {
            const response = await this.app.apiCall(API_ENDPOINTS.workflows);
            this.workflows = response.data || [];

            // 构建 Map
            this.workflowMap.clear();
            this.workflows.filter(wf => wf && wf._id).forEach(wf => {
                this.workflowMap.set(wf._id, wf);
            });

            this.render();
        } catch (error) {
            console.error('[WorkflowModule] Load failed:', error);
            if (this.listContainer) {
                this.listContainer.innerHTML = '<p class="text-red-500">加载工作流失败。</p>';
            }
        }
    }

    render() {
        if (!this.listContainer) return;

        if (this.workflows.length === 0) {
            this.listContainer.innerHTML = '<p class="text-gray-500 text-center">暂无工作流。</p>';
            return;
        }

        this.listContainer.innerHTML = this.workflows
            .filter(workflow => workflow && workflow._id)
            .map(workflow => this.buildItemHTML(workflow))
            .join('');

        // 绑定事件（使用事件委托）
        this.listContainer.removeEventListener('click', this.handleListClick);
        this.listContainer.addEventListener('click', this.handleListClick);

        // 绑定其他按钮
        if (this.executeBtn) {
            this.executeBtn.removeEventListener('click', this.handleExecute);
            this.executeBtn.addEventListener('click', this.handleExecute);
        }

        if (this.newWorkflowBtn) {
            this.newWorkflowBtn.removeEventListener('click', this.handleNewWorkflow);
            this.newWorkflowBtn.addEventListener('click', this.handleNewWorkflow);
        }

        if (this.targetIdInput) {
            this.targetIdInput.removeEventListener('input', this.handleInputChange);
            this.targetIdInput.addEventListener('input', this.handleInputChange);
        }
    }

    buildItemHTML(workflow) {
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
        `;
    }

    handleListClick(e) {
        const item = e.target.closest('.workflow-item');
        const editBtn = e.target.closest('.edit-workflow-btn');
        const deleteBtn = e.target.closest('.delete-workflow-btn');

        if (deleteBtn) {
            this.handleDelete(deleteBtn.dataset.id);
        } else if (editBtn) {
            this.app.workflowModal.openForEdit(editBtn.dataset.id);
        } else if (item) {
            this.handleSelection(item.dataset.id);
        }
    }

    handleSelection(workflowId) {
        // 移除旧的选中状态
        document.querySelectorAll('.workflow-item').forEach(el => el.classList.remove('bg-indigo-100'));

        // 添加新的选中状态
        const selectedItem = this.listContainer.querySelector(`.workflow-item[data-id="${workflowId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('bg-indigo-100');
            this.selectedWorkflowId = workflowId;

            const workflow = this.workflows.find(w => w._id === workflowId);
            const requiredInput = workflow?.requiredInput || { key: 'xingtuId', label: '达人星图ID' };

            if (this.targetIdLabel) {
                this.targetIdLabel.textContent = requiredInput.label;
            }
            if (this.targetIdInput) {
                this.targetIdInput.placeholder = `请输入${requiredInput.label}`;
                this.targetIdInput.disabled = false;
            }
        } else {
            this.selectedWorkflowId = null;
            if (this.targetIdLabel) {
                this.targetIdLabel.textContent = '目标 ID';
            }
            if (this.targetIdInput) {
                this.targetIdInput.placeholder = '请先选择一个工作流';
                this.targetIdInput.disabled = true;
            }
        }

        this.updateExecuteButtonState();

        // 触发事件
        document.dispatchEvent(new CustomEvent('workflowSelected', {
            detail: { workflowId }
        }));
    }

    async handleExecute() {
        if (this.executeBtn.disabled) return;

        const workflow = this.workflows.find(w => w._id === this.selectedWorkflowId);
        if (!workflow) return;

        const requiredInputKey = workflow.requiredInput?.key || 'xingtuId';
        const payload = {
            workflowId: this.selectedWorkflowId,
            projectId: null,
            [requiredInputKey]: this.targetIdInput.value.trim()
        };

        try {
            this.executeBtn.disabled = true;
            const response = await this.app.apiCall(API_ENDPOINTS.tasks, 'POST', payload);

            if (response.data) {
                // 创建临时 Job 用于立即显示
                const tempJob = {
                    _id: `temp_job_${Date.now()}`,
                    workflowId: payload.workflowId,
                    projectId: null,
                    createdAt: new Date().toISOString(),
                    status: 'processing',
                    tasks: [response.data]
                };

                // 添加到任务列表开头
                this.app.jobsModule.allJobsCache.unshift(tempJob);

                // 触发任务执行事件
                document.dispatchEvent(new CustomEvent('taskExecuted'));
            }

            this.targetIdInput.value = '';
            this.updateExecuteButtonState();

        } catch (error) {
            console.error('[WorkflowModule] Execute failed:', error);
        } finally {
            this.executeBtn.disabled = false;
        }
    }

    handleNewWorkflow() {
        this.app.workflowModal.openForCreate();
    }

    handleInputChange() {
        this.updateExecuteButtonState();
    }

    updateExecuteButtonState() {
        if (!this.executeBtn) return;
        this.executeBtn.disabled = !(this.selectedWorkflowId && this.targetIdInput.value.trim() !== '');
    }

    async handleDelete(workflowId) {
        const workflow = this.workflows.find(w => w._id === workflowId);
        if (!workflow) return;

        if (!confirm(`确定要删除工作流 "${workflow.name}" 吗？此操作不可撤销。`)) {
            return;
        }

        try {
            await this.app.apiCall(`${API_ENDPOINTS.workflows}?id=${workflowId}`, 'DELETE');

            if (this.selectedWorkflowId === workflowId) {
                this.handleSelection(null);
            }

            await this.load();

            // 触发更新事件
            document.dispatchEvent(new CustomEvent('workflowUpdated'));

        } catch (error) {
            console.error('[WorkflowModule] Delete failed:', error);
        }
    }

    // 资源清理
    unload() {
        if (this.listContainer) {
            this.listContainer.removeEventListener('click', this.handleListClick);
        }
        if (this.executeBtn) {
            this.executeBtn.removeEventListener('click', this.handleExecute);
        }
        if (this.newWorkflowBtn) {
            this.newWorkflowBtn.removeEventListener('click', this.handleNewWorkflow);
        }
        if (this.targetIdInput) {
            this.targetIdInput.removeEventListener('input', this.handleInputChange);
        }
    }
}
