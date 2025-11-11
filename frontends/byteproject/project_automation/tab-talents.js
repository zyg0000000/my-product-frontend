/**
 * @file project_automation/tab-talents.js
 * @description 达人选择Tab - 管理达人列表、选择操作、批量操作栏
 */

export default class TalentsTab {
    constructor(options) {
        this.options = options;
        this.projectId = options.projectId;
        this.projectData = options.projectData;
        this.apiRequest = options.apiRequest;
        this.showToast = options.showToast;
        this.showConfirm = options.showConfirm;

        // --- State ---
        this.selectedTalentIds = new Set();
        this.currentPage = 1;
        this.ITEMS_PER_PAGE = 10;

        // --- DOM Elements ---
        this.talentsContainer = document.getElementById('talents-container');
        this.talentsPaginationContainer = document.getElementById('talents-pagination-container');
        this.batchActionsBar = document.getElementById('batch-actions-bar');
        this.selectionCountSpan = document.getElementById('selection-count');
        this.generateReportBtn = document.getElementById('generate-report-btn');
        this.selectAllTalentsCheckbox = document.getElementById('select-all-talents');

        // --- Bind Methods ---
        this.handleSelectionChange = this.handleSelectionChange.bind(this);
        this.handleSelectAllChange = this.handleSelectAllChange.bind(this);
        this.openAutomationConfig = this.openAutomationConfig.bind(this);
    }

    async load() {
        console.log('[TalentsTab] 加载达人列表');
        this.setupEventListeners();
        this.render();
    }

    unload() {
        // 清理事件监听（如有必要）
        console.log('[TalentsTab] 卸载Tab，清理资源');
    }

    setupEventListeners() {
        // 使用事件委托处理选择变化
        if (this.talentsContainer) {
            this.talentsContainer.removeEventListener('change', this.handleSelectionChange);
            this.talentsContainer.addEventListener('change', this.handleSelectionChange);
        }

        // 全选复选框
        if (this.selectAllTalentsCheckbox) {
            this.selectAllTalentsCheckbox.removeEventListener('change', this.handleSelectAllChange);
            this.selectAllTalentsCheckbox.addEventListener('change', this.handleSelectAllChange);
        }

        // 打开自动化配置弹窗
        if (this.generateReportBtn) {
            this.generateReportBtn.removeEventListener('click', this.openAutomationConfig);
            this.generateReportBtn.addEventListener('click', this.openAutomationConfig);
        }
    }

    render(page = 1) {
        this.currentPage = page;
        const collaborators = this.projectData.collaborations || [];

        if (collaborators.length === 0) {
            this.talentsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">此项目暂无合作达人。</td>
                </tr>`;
            this.renderPaginationControls(0);
            return;
        }

        // 分页
        const start = (page - 1) * this.ITEMS_PER_PAGE;
        const end = start + this.ITEMS_PER_PAGE;
        const paginatedCollaborators = collaborators.slice(start, end);

        // 渲染达人列表
        this.talentsContainer.innerHTML = paginatedCollaborators.map(c => {
            const talentInfo = c.talentInfo || {};
            const isChecked = this.selectedTalentIds.has(c.id);
            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="p-4 w-12 text-center">
                        <input type="checkbox"
                               class="talent-checkbox rounded text-blue-600"
                               data-collaborator-id="${c.id}"
                               ${isChecked ? 'checked' : ''}>
                    </td>
                    <td class="px-6 py-4 font-medium text-gray-900">${talentInfo.nickname || 'N/A'}</td>
                    <td class="px-6 py-4">${talentInfo.xingtuId || 'N/A'}</td>
                    <td class="px-6 py-4">${c.status || 'N/A'}</td>
                    <td class="px-6 py-4">${this.formatDate(c.plannedReleaseDate || c.orderDate)}</td>
                </tr>`;
        }).join('');

        // 更新全选复选框状态
        this.updateSelectAllCheckboxState();

        // 渲染分页控件
        this.renderPaginationControls(collaborators.length);
    }

    renderPaginationControls(totalItems) {
        if (!this.talentsPaginationContainer) return;

        this.talentsPaginationContainer.innerHTML = '';
        if (totalItems <= this.ITEMS_PER_PAGE) return;

        const totalPages = Math.ceil(totalItems / this.ITEMS_PER_PAGE);
        const prevDisabled = this.currentPage === 1;
        const nextDisabled = this.currentPage === totalPages;

        let paginationHtml = `<span class="text-sm text-gray-700 mr-4">总计 ${totalItems} 项</span>`;
        paginationHtml += `
            <button data-page="${this.currentPage - 1}"
                    class="px-3 py-1 text-sm rounded-md ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}"
                    ${prevDisabled ? 'disabled' : ''}>上一页</button>`;
        paginationHtml += `<span class="px-4 text-sm text-gray-700">第 ${this.currentPage} / ${totalPages} 页</span>`;
        paginationHtml += `
            <button data-page="${this.currentPage + 1}"
                    class="px-3 py-1 text-sm rounded-md ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}"
                    ${nextDisabled ? 'disabled' : ''}>下一页</button>`;

        this.talentsPaginationContainer.innerHTML = paginationHtml;

        // 绑定分页按钮事件
        this.talentsPaginationContainer.querySelectorAll('button[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page, 10);
                this.render(targetPage);
            });
        });
    }

    handleSelectionChange(e) {
        if (!e.target.classList.contains('talent-checkbox')) return;

        const collaboratorId = e.target.dataset.collaboratorId;
        if (e.target.checked) {
            this.selectedTalentIds.add(collaboratorId);
        } else {
            this.selectedTalentIds.delete(collaboratorId);
        }

        this.updateBatchActionBar();
        this.updateSelectAllCheckboxState();
    }

    handleSelectAllChange(e) {
        const isChecked = e.target.checked;
        this.talentsContainer.querySelectorAll('.talent-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
            const collaboratorId = checkbox.dataset.collaboratorId;
            if (isChecked) {
                this.selectedTalentIds.add(collaboratorId);
            } else {
                this.selectedTalentIds.delete(collaboratorId);
            }
        });
        this.updateBatchActionBar();
    }

    updateBatchActionBar() {
        if (!this.selectionCountSpan || !this.batchActionsBar) return;

        this.selectionCountSpan.textContent = `已选择 ${this.selectedTalentIds.size} 位达人`;
        this.batchActionsBar.classList.toggle('hidden', this.selectedTalentIds.size === 0);
    }

    updateSelectAllCheckboxState() {
        if (!this.selectAllTalentsCheckbox) return;

        const checkboxesOnPage = this.talentsContainer.querySelectorAll('.talent-checkbox');
        if (checkboxesOnPage.length === 0) {
            this.selectAllTalentsCheckbox.checked = false;
            return;
        }
        this.selectAllTalentsCheckbox.checked = Array.from(checkboxesOnPage).every(cb => cb.checked);
    }

    async openAutomationConfig() {
        if (this.selectedTalentIds.size === 0) {
            this.showToast('请至少选择一位达人。', 'error');
            return;
        }

        // 触发打开自动化配置弹窗事件
        document.dispatchEvent(new CustomEvent('openAutomationModal', {
            detail: {
                selectedTalentIds: Array.from(this.selectedTalentIds)
            }
        }));
    }

    // 清空选择（任务创建成功后调用）
    clearSelection() {
        this.selectedTalentIds.clear();
        this.updateBatchActionBar();
        this.render(this.currentPage);
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
