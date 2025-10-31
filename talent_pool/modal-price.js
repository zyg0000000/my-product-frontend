/**
 * modal-price.js
 * 价格管理模态框模块
 *
 * 功能：
 * - 查看达人的历史一口价列表（按年月倒序）
 * - 添加新的一口价（年月+金额+状态）
 * - 更新已存在的一口价（相同年月会覆盖）
 * - 删除指定年月的一口价
 * - 区分暂定价和已确认价
 */

export class PriceModal {
    constructor(app) {
        this.app = app;  // Reference to main TalentPoolApp
        this.currentTalentId = null;
        this.elements = {
            modal: null,
            talentName: null,
            closeBtn: null,
            // Form elements
            form: null,
            yearSelect: null,
            monthSelect: null,
            amountInput: null,
            statusSelect: null,
            submitBtn: null,
            // Price list
            priceList: null
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
        this.elements.modal = document.getElementById('price-modal');
        this.elements.talentName = document.getElementById('price-talent-name');
        this.elements.closeBtn = document.querySelector('#price-modal .close-modal-btn');

        // Form elements
        this.elements.form = document.getElementById('price-form');
        this.elements.yearSelect = document.getElementById('price-year');
        this.elements.monthSelect = document.getElementById('price-month');
        this.elements.amountInput = document.getElementById('new-price-amount');
        this.elements.statusSelect = document.getElementById('price-status');
        this.elements.submitBtn = document.querySelector('#price-form button[type="submit"]');

        // Price list
        this.elements.priceList = document.getElementById('price-list');
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
        this.elements.priceList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-price-btn')) {
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
            console.error('PriceModal: Required elements not found');
            return;
        }

        this.currentTalentId = talentId;
        const talent = this.app.currentTalentData.find(t => t.id === talentId);

        if (!talent) {
            console.error('PriceModal: Talent not found:', talentId);
            return;
        }

        // Set talent name
        this.elements.talentName.textContent = talent.nickname;

        // Populate date selects
        this.populateDateSelects();

        // Render price list
        this.renderPriceList();

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
     * 填充年份和月份下拉列表
     */
    populateDateSelects() {
        if (!this.elements.yearSelect || !this.elements.monthSelect) return;

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Populate years (last year to next 2 years)
        this.elements.yearSelect.innerHTML = '';
        for (let i = currentYear - 1; i <= currentYear + 2; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}年`;
            this.elements.yearSelect.appendChild(option);
        }
        this.elements.yearSelect.value = currentYear;

        // Populate months (1-12)
        this.elements.monthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}月`;
            this.elements.monthSelect.appendChild(option);
        }
        this.elements.monthSelect.value = currentMonth;
    }

    /**
     * 渲染价格列表
     */
    renderPriceList() {
        if (!this.elements.priceList) return;

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        this.elements.priceList.innerHTML = '';

        if (talent.prices && talent.prices.length > 0) {
            // Sort by year and month (descending)
            const sortedPrices = [...talent.prices].sort((a, b) => {
                if (b.year !== a.year) return b.year - a.year;
                return b.month - a.month;
            });

            sortedPrices.forEach(price => {
                const statusLabel = price.status === 'provisional' ? '(暂定价)' : '(已确认)';
                const statusColor = price.status === 'provisional' ? 'text-yellow-600' : 'text-green-600';

                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
                li.innerHTML = `
                    <div>
                        <span>${price.year}年 ${price.month}月: <span class="font-medium">¥ ${price.price.toLocaleString()}</span></span>
                        <span class="text-xs ml-2 ${statusColor}">${statusLabel}</span>
                    </div>
                    <button data-year="${price.year}" data-month="${price.month}"
                            class="delete-price-btn text-red-500 hover:text-red-700 text-xs">删除</button>
                `;
                this.elements.priceList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'text-sm text-gray-500 text-center';
            li.textContent = '暂无一口价记录';
            this.elements.priceList.appendChild(li);
        }
    }

    /**
     * 处理表单提交（添加/更新价格）
     * @param {Event} e - 表单提交事件
     */
    async handleSubmit(e) {
        e.preventDefault();

        const year = parseInt(this.elements.yearSelect.value);
        const month = parseInt(this.elements.monthSelect.value);
        const amount = parseFloat(this.elements.amountInput.value);
        const status = this.elements.statusSelect.value;

        // Validation
        if (isNaN(amount) || amount < 0) {
            this.app.showToast('请输入有效的金额。', true);
            return;
        }

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) {
            console.error('PriceModal: Talent not found for submit');
            return;
        }

        // Remove existing price for the same year/month (if any)
        const newPrices = (talent.prices || []).filter(p =>
            !(p.year === year && p.month === month)
        );

        // Add new price
        newPrices.push({
            year,
            month,
            price: amount,
            status
        });

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                prices: newPrices
            });

            this.app.showToast('一口价添加/更新成功');

            // Reset form
            if (this.elements.form) {
                this.elements.form.reset();
            }

            // Repopulate date selects to restore defaults
            this.populateDateSelects();

            // Refresh data
            await this.app.fetchTalents();

            // Re-render price list
            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.renderPriceList();
            } else {
                // Talent no longer exists, close modal
                this.close();
            }
        } catch (error) {
            console.error('PriceModal: Submit error', error);
        }
    }

    /**
     * 处理删除价格
     * @param {Event} e - 点击事件
     */
    async handleDelete(e) {
        const year = parseInt(e.target.dataset.year);
        const month = parseInt(e.target.dataset.month);

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        // Remove the price for this year/month
        const newPrices = talent.prices.filter(p =>
            !(p.year === year && p.month === month)
        );

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                prices: newPrices
            });

            this.app.showToast('一口价删除成功');

            // Refresh data
            await this.app.fetchTalents();

            // Re-render price list
            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.renderPriceList();
            } else {
                // Talent no longer exists, close modal
                this.close();
            }
        } catch (error) {
            console.error('PriceModal: Delete error', error);
        }
    }
}
