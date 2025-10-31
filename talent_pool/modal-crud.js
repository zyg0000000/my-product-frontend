/**
 * modal-crud.js
 * 达人创建/编辑模态框模块
 *
 * 功能：
 * - 打开新增达人模态框
 * - 打开编辑达人模态框（自动填充现有数据）
 * - 表单验证和提交
 * - 创建/更新达人信息
 */

export class CrudModal {
    constructor(app) {
        this.app = app;  // Reference to main TalentPoolApp
        this.currentTalentId = null;
        this.elements = {
            modal: null,
            modalContent: null,
            modalTitle: null,
            form: null,
            closeBtn: null,
            submitBtn: null,
            // Form fields
            nicknameInput: null,
            xingtuIdInput: null,
            uidInput: null,
            typeInput: null,
            sourceSelect: null,
            tierSelect: null,
            editingIdInput: null
        };
    }

    /**
     * 初始化模块
     */
    init() {
        this.cacheElements();
        this.bindEvents();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements.modal = document.getElementById('talent-modal');
        this.elements.modalContent = document.querySelector('#talent-modal .modal-content');
        this.elements.modalTitle = document.getElementById('modal-title');
        this.elements.form = document.getElementById('talent-form');
        this.elements.closeBtn = document.querySelector('#talent-modal .close-modal-btn');
        this.elements.submitBtn = document.getElementById('modal-submit-btn');

        // Form fields
        this.elements.nicknameInput = document.getElementById('talent-nickname');
        this.elements.xingtuIdInput = document.getElementById('talent-xingtu-id');
        this.elements.uidInput = document.getElementById('talent-uid');
        this.elements.typeInput = document.getElementById('talent-type');
        this.elements.sourceSelect = document.getElementById('talent-source');
        this.elements.tierSelect = document.getElementById('talent-tier');
        this.elements.editingIdInput = document.getElementById('editing-talent-id');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // Close button
        this.elements.closeBtn?.addEventListener('click', () => this.close());

        // Click outside to close
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.close();
            }
        });

        // Form submission
        this.elements.form?.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    /**
     * 打开模态框
     * @param {string|null} talentId - 达人ID，null表示新增模式，有ID表示编辑模式
     */
    open(talentId = null) {
        if (!this.elements.form || !this.elements.modal || !this.elements.modalContent) {
            console.error('CrudModal: Required elements not found');
            return;
        }

        // Reset form
        this.elements.form.reset();
        this.elements.editingIdInput.value = '';
        this.currentTalentId = talentId;

        // Populate tier select
        this.populateTierSelect();

        if (talentId) {
            // Edit mode - populate with existing data
            const talent = this.app.currentTalentData.find(t => t.id === talentId);
            if (talent) {
                this.elements.modalTitle.textContent = '编辑达人';
                this.elements.submitBtn.textContent = '保存更改';
                this.elements.editingIdInput.value = talent.id;
                this.elements.nicknameInput.value = talent.nickname;
                this.elements.xingtuIdInput.value = talent.xingtuId;
                this.elements.uidInput.value = talent.uid || '';
                this.elements.typeInput.value = (talent.talentType || []).join(', ');
                this.elements.sourceSelect.value = talent.talentSource || '野生达人';
                this.elements.tierSelect.value = talent.talentTier || '';
            }
        } else {
            // Create mode
            this.elements.modalTitle.textContent = '新增达人';
            this.elements.submitBtn.textContent = '确认创建';
        }

        // Show modal with animation
        this.elements.modal.classList.remove('hidden');
        setTimeout(() => {
            this.elements.modalContent.classList.remove('opacity-0', 'scale-95');
        }, 10);
    }

    /**
     * 关闭模态框（带动画）
     */
    close() {
        if (!this.elements.modal || !this.elements.modalContent) return;

        this.elements.modalContent.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            this.elements.modal.classList.add('hidden');
        }, 300);
    }

    /**
     * 填充层级下拉列表
     * @param {string} selectedTier - 当前选中的层级
     */
    populateTierSelect(selectedTier = '') {
        if (!this.elements.tierSelect) return;

        this.elements.tierSelect.innerHTML = '<option value="">请选择层级</option>';
        this.app.talentTiers.forEach(tier => {
            const option = document.createElement('option');
            option.value = tier;
            option.textContent = tier;
            if (tier === selectedTier) {
                option.selected = true;
            }
            this.elements.tierSelect.appendChild(option);
        });
    }

    /**
     * 处理表单提交
     * @param {Event} e - 表单提交事件
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Get form values
        const nickname = this.elements.nicknameInput.value.trim();
        const xingtuId = this.elements.xingtuIdInput.value.trim();
        const uid = this.elements.uidInput.value.trim();
        const typeString = this.elements.typeInput.value.trim();
        const talentSource = this.elements.sourceSelect.value;
        const talentTier = this.elements.tierSelect.value;
        const editingId = this.elements.editingIdInput.value;

        // Validation
        if (!nickname || !xingtuId) {
            this.app.showToast('达人昵称和达人星图ID为必填项。', true);
            return;
        }

        // Parse tags (support both Chinese and English commas)
        const talentType = typeString
            ? typeString.split(/,|，/).map(t => t.trim()).filter(Boolean)
            : [];

        // Build payload
        const payload = {
            nickname,
            xingtuId,
            uid,
            talentType,
            talentTier,
            talentSource
        };

        try {
            if (editingId) {
                // Update existing talent
                await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                    id: editingId,
                    ...payload
                });
                this.app.showToast('达人信息更新成功！');
            } else {
                // Create new talent
                await this.app.apiRequest(this.app.API_PATHS.createSingle, 'POST', payload);
                this.app.showToast('达人创建成功！');
                // Reset to page 1 for new talent
                this.app.queryState.page = 1;
            }

            // Close modal
            this.close();

            // Reload configurations (in case new tiers/types were added)
            await this.app.loadConfigurations();

            // Refresh the table
            await this.app.fetchTalents();
        } catch (err) {
            // Error is already handled in apiRequest with toast
            console.error('CrudModal: Submit error', err);
        }
    }
}
