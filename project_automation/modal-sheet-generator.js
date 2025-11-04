/**
 * @file project_automation/modal-sheet-generator.js
 * @description 表格生成抽屉 - 模板选择、任务筛选、飞书表格生成
 */

export default class SheetGeneratorDrawer {
    constructor(options) {
        this.options = options;
        this.projectId = options.projectId;
        this.projectData = options.projectData;
        this.apiRequest = options.apiRequest;
        this.showToast = options.showToast;
        this.showConfirm = options.showConfirm;
        this.API_BASE_URL = options.API_BASE_URL;

        // --- API URLs ---
        this.MAPPING_TEMPLATES_API = `${this.API_BASE_URL}/mapping-templates`;
        this.FEISHU_API = `${this.API_BASE_URL}/sync-from-feishu`;
        this.GENERATED_SHEETS_API = `${this.API_BASE_URL}/generated-sheets`;

        // --- State ---
        this.mappingTemplatesCache = [];
        this.allCompletedTasks = [];
        this.allJobsCache = [];

        // --- DOM Elements ---
        this.sheetGeneratorDrawerOverlay = document.getElementById('sheet-generator-drawer-overlay');
        this.sheetGeneratorDrawer = document.getElementById('sheet-generator-drawer');
        this.closeSheetGeneratorBtn = document.getElementById('close-sheet-generator-btn');
        this.mappingTemplateSelect = document.getElementById('mapping-template-select');
        this.tasksSelectionContainer = document.getElementById('tasks-selection-container');
        this.tasksForSelectionList = document.getElementById('tasks-for-selection-list');
        this.generateSheetBtn = document.getElementById('generate-sheet-btn');
        this.destinationFolderInput = document.getElementById('destination-folder-input');
        this.progressModal = document.getElementById('generation-progress-modal');
        this.progressStepsContainer = document.getElementById('progress-steps-container');
        this.closeProgressModalBtn = document.getElementById('close-progress-modal-btn');

        // --- Bind Methods ---
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.handleTemplateSelectionChange = this.handleTemplateSelectionChange.bind(this);
        this.handleGenerate = this.handleGenerate.bind(this);

        // 设置事件监听
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 关闭按钮
        if (this.closeSheetGeneratorBtn) {
            this.closeSheetGeneratorBtn.addEventListener('click', this.close);
        }
        if (this.sheetGeneratorDrawerOverlay) {
            this.sheetGeneratorDrawerOverlay.addEventListener('click', this.close);
        }

        // 模板选择
        if (this.mappingTemplateSelect) {
            this.mappingTemplateSelect.addEventListener('change', this.handleTemplateSelectionChange);
        }

        // 生成按钮
        if (this.generateSheetBtn) {
            this.generateSheetBtn.addEventListener('click', this.handleGenerate);
        }

        // 监听打开抽屉事件
        document.addEventListener('openSheetGeneratorDrawer', () => {
            this.open();
        });

        // 进度弹窗关闭按钮
        if (this.closeProgressModalBtn) {
            this.closeProgressModalBtn.addEventListener('click', () => {
                if (this.progressModal) this.progressModal.classList.add('hidden');
            });
        }
    }

    async open() {
        console.log('[SheetGeneratorDrawer] 打开抽屉');

        // 显示抽屉
        if (this.sheetGeneratorDrawerOverlay) this.sheetGeneratorDrawerOverlay.classList.remove('hidden');
        if (this.sheetGeneratorDrawer) this.sheetGeneratorDrawer.classList.add('open');

        // 隐藏任务选择区域
        if (this.tasksSelectionContainer) this.tasksSelectionContainer.classList.add('hidden');
        if (this.generateSheetBtn) this.generateSheetBtn.disabled = true;

        // 加载映射模板
        await this.loadMappingTemplates();
    }

    close() {
        console.log('[SheetGeneratorDrawer] 关闭抽屉');
        if (this.sheetGeneratorDrawer) this.sheetGeneratorDrawer.classList.remove('open');
        if (this.sheetGeneratorDrawerOverlay) this.sheetGeneratorDrawerOverlay.classList.add('hidden');
    }

    async loadMappingTemplates() {
        if (this.mappingTemplateSelect) {
            this.mappingTemplateSelect.innerHTML = '<option>正在加载模板...</option>';
        }

        try {
            const response = await this.apiRequest(this.MAPPING_TEMPLATES_API);
            this.mappingTemplatesCache = response.data || [];

            if (this.mappingTemplatesCache.length > 0) {
                this.mappingTemplateSelect.innerHTML =
                    '<option value="">-- 请选择一个报告模板 --</option>' +
                    this.mappingTemplatesCache.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
            } else {
                this.mappingTemplateSelect.innerHTML = '<option value="">没有可用的模板</option>';
            }
        } catch (e) {
            this.mappingTemplateSelect.innerHTML = '<option value="">加载模板失败</option>';
        }
    }

    handleTemplateSelectionChange() {
        if (this.tasksSelectionContainer) {
            this.tasksSelectionContainer.classList.toggle('hidden', !this.mappingTemplateSelect.value);
        }

        if (this.mappingTemplateSelect.value) {
            this.renderTasksForSelection();
        }

        this.updateGenerateSheetButtonState();
    }

    renderTasksForSelection() {
        const templateId = this.mappingTemplateSelect.value;
        if (!templateId) {
            this.tasksForSelectionList.innerHTML = '<div class="p-4 text-center text-gray-500">请先选择报告模板。</div>';
            return;
        }

        // 获取模板配置
        const template = this.mappingTemplatesCache.find(t => t._id === templateId);
        const allowedWorkflowIds = template?.allowedWorkflowIds || [];

        // 获取所有已完成任务
        this.updateTasksFromJobsCache();

        // 筛选任务
        let filteredTasks = this.allCompletedTasks;

        if (allowedWorkflowIds.length > 0) {
            // 如果模板配置了允许的工作流，则只显示匹配的任务
            filteredTasks = this.allCompletedTasks.filter(task => {
                const job = this.allJobsCache.find(j => j._id === task.jobId);
                return job && allowedWorkflowIds.includes(job.workflowId);
            });

            if (filteredTasks.length === 0) {
                const workflowNames = this.allJobsCache
                    .filter(j => allowedWorkflowIds.includes(j.workflowId))
                    .map(j => j.workflowName)
                    .filter((name, index, self) => self.indexOf(name) === index)
                    .join('、') || '指定工作流';

                this.tasksForSelectionList.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        <p class="mb-2">暂无"${workflowNames}"的已完成任务。</p>
                        <button class="text-indigo-600 hover:underline text-sm"
                                onclick="document.querySelector('[data-tab=\\'talents\\']').click()">
                            前往发起任务 →
                        </button>
                    </div>`;
                return;
            }
        } else {
            // 如果没有配置，显示所有已完成任务（向后兼容）
            if (this.allCompletedTasks.length === 0) {
                this.tasksForSelectionList.innerHTML = '<div class="p-4 text-center text-gray-500">此项目暂无任何已完成的任务记录。</div>';
                return;
            }
        }

        // 渲染任务列表
        this.tasksForSelectionList.innerHTML = filteredTasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(task => {
                const job = this.allJobsCache.find(j => j._id === task.jobId);
                return `
                <div class="p-3 border-b border-gray-100 last:border-b-0">
                    <label class="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded p-2">
                        <input type="checkbox"
                               data-task-id="${task._id}"
                               class="h-4 w-4 text-indigo-600 border-gray-300 rounded task-for-selection-checkbox">
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-800">${task.metadata?.talentNickname || '未知达人'}</p>
                            <div class="flex items-center gap-2 mt-1">
                                ${job ? `<span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">${job.workflowName}</span>` : ''}
                                <span class="text-xs text-gray-500">执行于: ${this.formatDate(task.createdAt, true)}</span>
                            </div>
                        </div>
                    </label>
                </div>`;
            }).join('');

        // 绑定任务复选框变化事件
        this.tasksForSelectionList.querySelectorAll('.task-for-selection-checkbox')
            .forEach(cb => cb.addEventListener('change', () => this.updateGenerateSheetButtonState()));
    }

    updateTasksFromJobsCache() {
        // 从 projectData 获取最新的 jobs 数据
        this.allJobsCache = this.projectData.automationJobs || [];
        this.allCompletedTasks = [];

        this.allJobsCache.forEach(job => {
            (job.tasks || []).forEach(task => {
                if (task.status === 'completed') {
                    this.allCompletedTasks.push(task);
                }
            });
        });
    }

    updateGenerateSheetButtonState() {
        if (!this.generateSheetBtn || !this.tasksForSelectionList) return;

        const selectedTasks = this.tasksForSelectionList.querySelectorAll('.task-for-selection-checkbox:checked');
        this.generateSheetBtn.disabled = !(this.mappingTemplateSelect.value && selectedTasks.length > 0);
    }

    async handleGenerate() {
        const selectedTemplateId = this.mappingTemplateSelect.value;
        const selectedTaskIds = Array.from(
            this.tasksForSelectionList.querySelectorAll('.task-for-selection-checkbox:checked')
        ).map(cb => cb.dataset.taskId);

        if (!selectedTemplateId || selectedTaskIds.length === 0) return;

        const selectedTemplate = this.mappingTemplatesCache.find(t => t._id === selectedTemplateId);
        if (!selectedTemplate) {
            this.showToast('错误：找不到所选的模板信息。', 'error');
            return;
        }

        this.close();

        const btn = this.generateSheetBtn;
        if (btn) {
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = '生成中...';
            btn.querySelector('.btn-loader').classList.remove('hidden');
        }

        // 构建 payload（符合 V11.0+ utils.js 的 dataType 结构）
        const innerPayload = {
            primaryCollection: selectedTemplate.primaryCollection,
            mappingTemplate: selectedTemplate,
            taskIds: selectedTaskIds,
            projectName: this.projectData.name,
            destinationFolderToken: this.destinationFolderInput.value.trim()
        };

        const finalPayload = {
            dataType: 'generateAutomationReport',
            payload: innerPayload
        };

        // 显示进度弹窗
        this.showProgressModal(selectedTaskIds.length);

        try {
            const response = await this.apiRequest(this.FEISHU_API, 'POST', finalPayload);

            this.completeAllSteps();

            const { sheetUrl, sheetToken, fileName } = response.data;

            // 保存到数据库
            await this.apiRequest(this.GENERATED_SHEETS_API, 'POST', {
                projectId: this.projectId,
                fileName,
                sheetUrl,
                sheetToken
            });

            this.showToast('飞书表格生成成功！');

            // 触发刷新表格历史
            document.dispatchEvent(new CustomEvent('refreshSheets'));

            // 打开生成的表格
            if (sheetUrl) {
                window.open(sheetUrl, '_blank');
            }
        } catch (error) {
            this.showToast('生成失败，请检查配置或联系管理员', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.querySelector('.btn-text').textContent = '生成表格';
                btn.querySelector('.btn-loader').classList.add('hidden');
            }
            if (this.closeProgressModalBtn) this.closeProgressModalBtn.disabled = false;
        }
    }

    showProgressModal(taskCount) {
        const steps = [
            { id: 'copy', text: `步骤1: 复制飞书模板表格` },
            { id: 'aggregate', text: `步骤2: 聚合 ${taskCount} 条任务数据` },
            { id: 'write', text: `步骤3: 写入数据与图片` },
            { id: 'permission', text: `步骤4: 处理文件权限` }
        ];

        this.progressStepsContainer.innerHTML = steps.map(step => `
            <div id="step-${step.id}" class="flex items-center text-gray-500">
                <div class="status-icon w-6 h-6 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0"></div>
                <span>${step.text}</span>
            </div>`).join('');

        if (this.progressModal) this.progressModal.classList.remove('hidden');
        if (this.closeProgressModalBtn) this.closeProgressModalBtn.disabled = true;

        // 模拟进度（每1.5秒一步）
        this.runProgressSimulation(steps);
    }

    runProgressSimulation(steps) {
        let currentStep = 0;
        this.updateStepStatus(steps[currentStep].id, 'processing');

        this.simulationInterval = setInterval(() => {
            if (currentStep < steps.length - 1) {
                this.updateStepStatus(steps[currentStep].id, 'completed');
                currentStep++;
                this.updateStepStatus(steps[currentStep].id, 'processing');
            } else {
                clearInterval(this.simulationInterval);
            }
        }, 1500);
    }

    completeAllSteps() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        ['copy', 'aggregate', 'write', 'permission'].forEach(stepId => {
            this.updateStepStatus(stepId, 'completed');
        });
    }

    updateStepStatus(stepId, status) {
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
    }

    formatDate(isoString, includeTime = false) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '无效日期';

        const pad = (num) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());

        if (includeTime) {
            const hours = pad(date.getHours());
            const minutes = pad(date.getMinutes());
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return `${year}-${month}-${day}`;
    }
}
