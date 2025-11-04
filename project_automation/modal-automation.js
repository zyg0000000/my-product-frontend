/**
 * @file project_automation/modal-automation.js
 * @description 自动化配置弹窗 - 工作流选择、任务创建
 */

export default class AutomationModal {
    constructor(options) {
        this.options = options;
        this.projectId = options.projectId;
        this.projectData = options.projectData;
        this.apiRequest = options.apiRequest;
        this.showToast = options.showToast;
        this.showConfirm = options.showConfirm;

        // --- API URLs ---
        this.API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
        this.AUTOMATION_WORKFLOWS_API = `${this.API_BASE_URL}/automation-workflows`;
        this.AUTOMATION_JOBS_CREATE_API = `${this.API_BASE_URL}/automation-jobs-create`;

        // --- State ---
        this.selectedTalentIds = [];

        // --- DOM Elements ---
        this.configModal = document.getElementById('automation-config-modal');
        this.closeConfigModalBtn = document.getElementById('close-config-modal-btn');
        this.cancelConfigBtn = document.getElementById('cancel-config-btn');
        this.configForm = document.getElementById('automation-config-form');
        this.workflowSelect = document.getElementById('automation-workflow-select');
        this.selectedCountModalSpan = document.getElementById('selected-talents-count-modal');
        this.startAutomationBtn = document.getElementById('start-automation-btn');

        // --- Bind Methods ---
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        // 设置事件监听
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 关闭按钮
        if (this.closeConfigModalBtn) {
            this.closeConfigModalBtn.addEventListener('click', this.close);
        }
        if (this.cancelConfigBtn) {
            this.cancelConfigBtn.addEventListener('click', this.close);
        }

        // 表单提交
        if (this.configForm) {
            this.configForm.addEventListener('submit', this.handleSubmit);
        }

        // 监听打开弹窗事件
        document.addEventListener('openAutomationModal', (e) => {
            this.open(e.detail.selectedTalentIds);
        });
    }

    async open(selectedTalentIds) {
        this.selectedTalentIds = selectedTalentIds;

        if (this.selectedTalentIds.length === 0) {
            this.showToast('请至少选择一位达人。', 'error');
            return;
        }

        // 更新已选择数量
        if (this.selectedCountModalSpan) {
            this.selectedCountModalSpan.textContent = this.selectedTalentIds.length;
        }

        // 加载工作流列表
        await this.loadWorkflows();

        // 显示弹窗
        if (this.configModal) {
            this.configModal.classList.remove('hidden');
        }

        console.log(`[AutomationModal] 打开弹窗，已选择 ${this.selectedTalentIds.length} 位达人`);
    }

    close() {
        if (this.configModal) {
            this.configModal.classList.add('hidden');
        }
        if (this.configForm) {
            this.configForm.reset();
        }
        console.log('[AutomationModal] 关闭弹窗');
    }

    async loadWorkflows() {
        const btn = this.startAutomationBtn;
        if (btn) btn.disabled = true;

        if (this.workflowSelect) {
            this.workflowSelect.innerHTML = '<option>正在加载工作流...</option>';
        }

        try {
            const workflowsResponse = await this.apiRequest(this.AUTOMATION_WORKFLOWS_API);
            const workflows = workflowsResponse.data || [];

            if (workflows.length > 0) {
                this.workflowSelect.innerHTML = workflows.map(wf =>
                    `<option value="${wf._id}">${wf.name}</option>`
                ).join('');
                if (btn) btn.disabled = false;
            } else {
                this.workflowSelect.innerHTML = '<option disabled selected>没有可用的工作流</option>';
            }
        } catch (error) {
            this.workflowSelect.innerHTML = '<option disabled selected>加载工作流失败</option>';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const workflowId = this.workflowSelect.value;
        if (!workflowId || this.workflowSelect.options[this.workflowSelect.selectedIndex]?.disabled) {
            this.showToast('请选择一个有效的自动化工作流。', 'error');
            return;
        }

        const btn = this.startAutomationBtn;
        if (btn) {
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = '正在创建...';
            btn.querySelector('.btn-loader').classList.remove('hidden');
        }

        // 构建 targets 数据
        const targets = this.selectedTalentIds.map(id => {
            const collab = this.projectData.collaborations.find(c => c.id === id);
            return collab ? {
                collaborationId: collab.id,
                talentId: collab.talentId,
                nickname: collab.talentInfo?.nickname,
                xingtuId: collab.talentInfo?.xingtuId,
                taskId: collab.taskId
            } : null;
        }).filter(Boolean);

        try {
            await this.apiRequest(this.AUTOMATION_JOBS_CREATE_API, 'POST', {
                projectId: this.projectId,
                workflowId,
                targets
            });

            this.showToast('自动化任务已成功创建！');
            this.close();

            // 触发刷新事件
            document.dispatchEvent(new CustomEvent('refreshTalents'));
            document.dispatchEvent(new CustomEvent('refreshJobs'));

        } catch (error) {
            // 错误已在 apiRequest 中处理
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.querySelector('.btn-text').textContent = '开始执行';
                btn.querySelector('.btn-loader').classList.add('hidden');
            }
        }
    }
}
