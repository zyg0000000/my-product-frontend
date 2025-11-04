/**
 * @file talent_selection/selection-panel.js
 * @description 选择列表模块 - 管理已选择的达人合作列表和项目快照
 */

export default class SelectionPanel {
    constructor(options) {
        this.selectedCollaborations = options.selectedCollaborations;
        this.targetProjectSelect = options.targetProjectSelect;
        this.allProjects = options.allProjects;
        this.apiRequest = options.apiRequest;
        this.showAlert = options.showAlert;

        // DOM Elements
        this.selectionList = document.getElementById('selection-list');
        this.selectionPlaceholder = document.getElementById('selection-placeholder');
        this.selectionCountSpan = document.getElementById('selection-count');
        this.addToProjectBtn = document.getElementById('add-to-project-btn');
        this.snapshotTotalBudget = document.getElementById('snapshot-total-budget');
        this.snapshotUsedBudget = document.getElementById('snapshot-used-budget');
        this.snapshotBudgetRate = document.getElementById('snapshot-budget-rate');
        this.snapshotTalentCount = document.getElementById('snapshot-talent-count');

        // Bind methods
        this.renderSelectionList = this.renderSelectionList.bind(this);
        this.handleSelectionListInteraction = this.handleSelectionListInteraction.bind(this);
        this.handleAddToProject = this.handleAddToProject.bind(this);
        this.handleProjectChange = this.handleProjectChange.bind(this);
    }

    setupEventListeners() {
        if (this.selectionList) {
            this.selectionList.addEventListener('click', this.handleSelectionListInteraction);
        }

        if (this.addToProjectBtn) {
            this.addToProjectBtn.addEventListener('click', this.handleAddToProject);
        }

        if (this.targetProjectSelect) {
            this.targetProjectSelect.addEventListener('change', this.handleProjectChange);
        }
    }

    init() {
        this.setupEventListeners();
        this.renderSelectionList();
    }

    renderSelectionList() {
        if (!this.selectionList) return;

        this.selectionList.innerHTML = '';

        if (this.selectionPlaceholder) {
            this.selectionPlaceholder.classList.toggle('hidden', this.selectedCollaborations.length > 0);
        }

        // Group collaborations by talent
        const groupedByTalent = this.selectedCollaborations.reduce((acc, collab) => {
            const talentId = collab.talentId || collab.talent?.id;
            if (!acc[talentId]) {
                acc[talentId] = [];
            }
            acc[talentId].push(collab);
            return acc;
        }, {});

        Object.values(groupedByTalent).forEach(collabGroup => {
            const firstCollab = collabGroup[0];
            const talent = firstCollab.talent || firstCollab;
            const talentGroupEl = document.createElement('div');
            talentGroupEl.className = 'p-2 border-b';

            talentGroupEl.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}" target="_blank" class="text-sm font-bold text-blue-600 hover:underline">${talent.nickname}</a>
                    <button class="add-another-collab-btn text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-md" data-talent-id="${talent.talentId || talent.id}">+ 添加合作</button>
                </div>
            `;

            collabGroup.forEach((collab, index) => {
                const item = document.createElement('div');
                item.className = 'selection-item flex justify-between items-center py-1';
                const tempId = collab._tempId || `${collab.talentId || collab.talent?.id}_${index}`;
                item.innerHTML = `
                    <div class="flex-grow flex items-center gap-2">
                        <span class="text-sm text-gray-600">合作 ${index + 1}:</span>
                    </div>
                    <button class="remove-selection-btn text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0" data-temp-id="${tempId}">&times;</button>
                `;
                talentGroupEl.appendChild(item);
            });

            this.selectionList.appendChild(talentGroupEl);
        });

        // Update count and button state
        if (this.selectionCountSpan) {
            this.selectionCountSpan.textContent = this.selectedCollaborations.length;
        }
        if (this.addToProjectBtn) {
            this.addToProjectBtn.disabled = this.selectedCollaborations.length === 0;
        }
    }

    resetProjectSnapshot() {
        if (this.snapshotTotalBudget) this.snapshotTotalBudget.textContent = '¥ 0';
        if (this.snapshotUsedBudget) this.snapshotUsedBudget.textContent = '¥ 0';
        if (this.snapshotBudgetRate) this.snapshotBudgetRate.textContent = '(0.00%)';
        if (this.snapshotTalentCount) this.snapshotTalentCount.textContent = '0 位';
    }

    async renderProjectSnapshot(projectId) {
        if (!projectId) {
            this.resetProjectSnapshot();
            return;
        }

        try {
            const projectData = await this.apiRequest(`/projects?projectId=${projectId}`);
            const metrics = projectData.data.metrics || {};

            if (this.snapshotTotalBudget) {
                this.snapshotTotalBudget.textContent = `¥ ${(metrics.projectBudget || 0).toLocaleString()}`;
            }
            if (this.snapshotUsedBudget) {
                this.snapshotUsedBudget.textContent = `¥ ${(metrics.totalIncome || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            }
            if (this.snapshotBudgetRate) {
                this.snapshotBudgetRate.textContent = `(${(metrics.budgetUtilization || 0).toFixed(2)}%)`;
            }
            if (this.snapshotTalentCount) {
                this.snapshotTalentCount.textContent = `${metrics.totalCollaborators || 0} 位`;
            }
        } catch (e) {
            console.error('Failed to fetch project snapshot', e);
            this.resetProjectSnapshot();
        }
    }

    handleSelectionListInteraction(e) {
        const removeButton = e.target.closest('.remove-selection-btn');
        const addButton = e.target.closest('.add-another-collab-btn');

        if (removeButton) {
            const tempId = removeButton.dataset.tempId;
            document.dispatchEvent(new CustomEvent('talentDeselected', {
                detail: { tempId }
            }));
        }

        if (addButton) {
            const talentId = addButton.dataset.talentId;
            document.dispatchEvent(new CustomEvent('addAnotherCollaboration', {
                detail: { talentId }
            }));
        }
    }

    handleAddToProject() {
        if (this.selectedCollaborations.length === 0) {
            this.showAlert('请先选择达人进行合作。');
            return;
        }

        document.dispatchEvent(new CustomEvent('openBatchImportModal', {
            detail: { selectedCollaborations: this.selectedCollaborations }
        }));
    }

    handleProjectChange() {
        const projectId = this.targetProjectSelect.value;
        this.renderProjectSnapshot(projectId);
    }

    updateCollaborations(collaborations) {
        this.selectedCollaborations = collaborations;
    }
}
