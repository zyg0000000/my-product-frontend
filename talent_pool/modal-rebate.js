/**
 * modal-rebate.js
 * 返点管理模态框模块
 *
 * 功能：
 * - 查看达人的返点率列表
 * - 添加新的返点率
 * - 删除指定返点率
 * - 返点率按从小到大排序显示
 */

export class RebateModal {
    constructor(app) {
        this.app = app;  // Reference to main TalentPoolApp
        this.currentTalentId = null;
        this.elements = {
            modal: null,
            talentName: null,
            closeBtn: null,
            // Form elements
            form: null,
            rateInput: null,
            submitBtn: null,
            // Rebate list
            rebateList: null
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
        this.elements.modal = document.getElementById('rebate-modal');
        this.elements.talentName = document.getElementById('rebate-talent-name');
        this.elements.closeBtn = document.querySelector('#rebate-modal .close-modal-btn');

        // Form elements
        this.elements.form = document.getElementById('rebate-form');
        this.elements.rateInput = document.getElementById('new-rebate-rate');
        this.elements.submitBtn = document.querySelector('#rebate-form button[type="submit"]');

        // Rebate list
        this.elements.rebateList = document.getElementById('rebate-list');
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

        // Delete button delegation
        this.elements.rebateList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-rebate-btn')) {
                this.handleDelete(e);
            }
        });
    }

    /**
     * 打开模态框
     * @param {string} talentId - 达人ID
     */
    open(talentId) {
        if (!this.elements.modal || !this.elements.talentName) {
            console.error('RebateModal: Required elements not found');
            return;
        }

        this.currentTalentId = talentId;
        const talent = this.app.currentTalentData.find(t => t.id === talentId);

        if (!talent) {
            console.error('RebateModal: Talent not found:', talentId);
            return;
        }

        // Set talent name
        this.elements.talentName.textContent = talent.nickname;

        // Render rebate list
        this.renderRebateList();

        // Show modal
        this.elements.modal.classList.remove('hidden');
    }

    /**
     * 关闭模态框
     */
    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
    }

    /**
     * 渲染返点率列表
     */
    renderRebateList() {
        if (!this.elements.rebateList) return;

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        this.elements.rebateList.innerHTML = '';

        if (talent.rebates && talent.rebates.length > 0) {
            talent.rebates.forEach(rebate => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
                li.innerHTML = `
                    <span>${rebate.rate}%</span>
                    <button data-rate="${rebate.rate}"
                            class="delete-rebate-btn text-red-500 hover:text-red-700 text-xs">删除</button>
                `;
                this.elements.rebateList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'text-sm text-gray-500 text-center';
            li.textContent = '暂无返点率';
            this.elements.rebateList.appendChild(li);
        }
    }

    /**
     * 处理表单提交（添加返点率）
     * @param {Event} e - 表单提交事件
     */
    async handleSubmit(e) {
        e.preventDefault();

        const rateValue = parseFloat(this.elements.rateInput.value);

        // Validation
        if (isNaN(rateValue) || rateValue < 0) {
            this.app.showToast('请输入有效的返点率。', true);
            return;
        }

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) {
            console.error('RebateModal: Talent not found for submit');
            return;
        }

        // Check for duplicate
        if (talent.rebates && talent.rebates.some(r => r.rate === rateValue)) {
            this.app.showToast('该返点率已存在。', true);
            return;
        }

        // Add new rebate
        const newRebates = [...(talent.rebates || []), { rate: rateValue }];

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                rebates: newRebates
            });

            this.app.showToast('返点率添加成功');

            // Reset form
            if (this.elements.form) {
                this.elements.form.reset();
            }

            // Refresh data
            await this.app.fetchTalents();

            // Re-render rebate list
            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.renderRebateList();
            } else {
                // Talent no longer exists, close modal
                this.close();
            }
        } catch (error) {
            console.error('RebateModal: Submit error', error);
        }
    }

    /**
     * 处理删除返点率
     * @param {Event} e - 点击事件
     */
    async handleDelete(e) {
        const rateToDelete = parseFloat(e.target.dataset.rate);

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        // Remove the rebate with this rate
        const newRebates = talent.rebates.filter(r => r.rate !== rateToDelete);

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                rebates: newRebates
            });

            this.app.showToast('返点率删除成功');

            // Refresh data
            await this.app.fetchTalents();

            // Re-render rebate list
            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.renderRebateList();
            } else {
                // Talent no longer exists, close modal
                this.close();
            }
        } catch (error) {
            console.error('RebateModal: Delete error', error);
        }
    }
}
