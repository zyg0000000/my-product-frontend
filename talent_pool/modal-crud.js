/**
 * modal-crud.js - CRUD Modal 模块
 * 基于 talent_pool.js v6.2.1
 */

export class CrudModal {
    constructor(app) {
        this.app = app;
        this.currentTalentId = null;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById('talent-modal'),
            modalContent: document.getElementById('talent-modal-content'),
            modalTitle: document.getElementById('modal-title'),
            form: document.getElementById('talent-form'),
            closeBtn: document.getElementById('close-modal-btn'),
            closeBtnFooter: document.getElementById('close-modal-btn-footer'),
            submitBtn: document.getElementById('modal-submit-btn'),
            nicknameInput: document.getElementById('talent-nickname'),
            xingtuIdInput: document.getElementById('talent-xingtu-id'),
            uidInput: document.getElementById('talent-uid'),
            typeInput: document.getElementById('talent-type'),
            sourceSelect: document.getElementById('talent-source'),
            tierSelect: document.getElementById('talent-tier'),
            editingIdInput: document.getElementById('editing-talent-id')
        };
    }

    bindEvents() {
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.closeBtnFooter?.addEventListener('click', () => this.close());
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.close();
        });
        this.elements.form?.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    open(talentId = null) {
        if (!this.elements.form || !this.elements.modal || !this.elements.modalContent) return;

        this.elements.form.reset();
        this.elements.editingIdInput.value = '';
        this.currentTalentId = talentId;
        this.populateTierSelect();

        if (talentId) {
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
            this.elements.modalTitle.textContent = '新增达人';
            this.elements.submitBtn.textContent = '确认创建';
        }

        this.elements.modal.classList.remove('hidden');
        setTimeout(() => {
            this.elements.modalContent.classList.remove('opacity-0', 'scale-95');
        }, 10);
    }

    close() {
        if (!this.elements.modal || !this.elements.modalContent) return;
        this.elements.modalContent.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            this.elements.modal.classList.add('hidden');
        }, 300);
    }

    populateTierSelect(selectedTier = '') {
        if (!this.elements.tierSelect) return;
        this.elements.tierSelect.innerHTML = '<option value="">请选择层级</option>';
        this.app.talentTiers.forEach(tier => {
            const option = document.createElement('option');
            option.value = tier;
            option.textContent = tier;
            if (tier === selectedTier) option.selected = true;
            this.elements.tierSelect.appendChild(option);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const nickname = this.elements.nicknameInput.value.trim();
        const xingtuId = this.elements.xingtuIdInput.value.trim();
        const uid = this.elements.uidInput.value.trim();
        const typeString = this.elements.typeInput.value.trim();
        const talentSource = this.elements.sourceSelect.value;
        const talentTier = this.elements.tierSelect.value;
        const editingId = this.elements.editingIdInput.value;

        if (!nickname || !xingtuId) {
            this.app.showToast('达人昵称和达人星图ID为必填项。', true);
            return;
        }

        const talentType = typeString
            ? typeString.split(/,|，/).map(t => t.trim()).filter(Boolean)
            : [];

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
                await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                    id: editingId,
                    ...payload
                });
                this.app.showToast('达人信息更新成功！');
            } else {
                await this.app.apiRequest(this.app.API_PATHS.createSingle, 'POST', payload);
                this.app.showToast('达人创建成功！');
                this.app.queryState.page = 1;
            }

            this.close();
            await this.app.loadConfigurations();
            this.app.tableManager?.populateFilterCheckboxes();
            await this.app.fetchTalents();
        } catch (err) {
            console.error('CrudModal: Submit error', err);
        }
    }
}
