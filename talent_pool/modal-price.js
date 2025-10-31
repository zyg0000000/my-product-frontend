/**
 * modal-price.js - 价格管理 Modal 模块
 * 基于 talent_pool.js v6.2.1 - 完整包含3种价格类型 + Chart.js 图表
 */

import { PRICE_TYPE_LABELS, PRICE_TYPE_ORDER } from './utils.js';

export class PriceModal {
    constructor(app) {
        this.app = app;
        this.currentTalentId = null;
        this.priceTrendChart = null;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById('price-modal'),
            talentName: document.getElementById('price-talent-name'),
            closeBtn: document.getElementById('close-price-modal-btn'),
            form: document.getElementById('price-form'),
            yearSelect: document.getElementById('price-year'),
            monthSelect: document.getElementById('price-month'),
            typeSelect: document.getElementById('price-type'),
            amountInput: document.getElementById('new-price-amount'),
            statusSelect: document.getElementById('price-status'),
            priceList: document.getElementById('price-list'),
            // 筛选器
            listYearFilter: document.getElementById('price-list-year-filter'),
            listMonthFilter: document.getElementById('price-list-month-filter'),
            // 图表
            chartCanvas: document.getElementById('price-trend-chart'),
            chartTypeFilter: document.getElementById('price-chart-type-filter'),
            chartYearFilter: document.getElementById('price-chart-year-filter')
        };
    }

    bindEvents() {
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.close();
        });
        this.elements.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.priceList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-price-btn')) {
                this.handleDelete(e);
            }
        });

        // 筛选器变化
        this.elements.listYearFilter?.addEventListener('change', () => this.renderPriceList());
        this.elements.listMonthFilter?.addEventListener('change', () => this.renderPriceList());

        // 图表筛选器变化
        this.elements.chartTypeFilter?.addEventListener('change', () => this.renderPriceTrendChart());
        this.elements.chartYearFilter?.addEventListener('change', () => this.renderPriceTrendChart());
    }

    open(talentId) {
        if (!this.elements.modal || !this.elements.talentName) return;

        this.currentTalentId = talentId;
        const talent = this.app.currentTalentData.find(t => t.id === talentId);

        if (!talent) return;

        this.elements.talentName.textContent = talent.nickname;
        this.populateDateSelects();
        this.initializeFilters(talent);
        this.renderPriceList();
        this.renderPriceTrendChart();

        this.elements.modal.classList.remove('hidden');
    }

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
        if (this.priceTrendChart) {
            this.priceTrendChart.destroy();
            this.priceTrendChart = null;
        }
    }

    populateDateSelects() {
        if (!this.elements.yearSelect || !this.elements.monthSelect) return;

        const currentYear = new Date().getFullYear();
        this.elements.yearSelect.innerHTML = '';
        for (let i = currentYear - 1; i <= currentYear + 2; i++) {
            this.elements.yearSelect.innerHTML += '<option value="' + i + '">' + i + '年</option>';
        }
        this.elements.monthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            this.elements.monthSelect.innerHTML += '<option value="' + i + '">' + i + '月</option>';
        }
        this.elements.yearSelect.value = currentYear;
        this.elements.monthSelect.value = new Date().getMonth() + 1;
    }

    // [V6.2 新增] 初始化筛选器
    initializeFilters(talent) {
        if (!talent || !talent.prices || !this.elements.listYearFilter || !this.elements.listMonthFilter || !this.elements.chartYearFilter) return;

        const years = [...new Set(talent.prices.map(p => p.year))].sort((a,b) => b-a);
        const months = [...new Set(talent.prices.map(p => p.month))].sort((a,b) => a-b);

        this.elements.listYearFilter.innerHTML = '<option value="">全部年份</option>' + years.map(y => '<option value="' + y + '">' + y + '年</option>').join('');
        this.elements.listMonthFilter.innerHTML = '<option value="">全部月份</option>' + months.map(m => '<option value="' + m + '">' + m + '月</option>').join('');

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        if (years.includes(currentYear)) {
            this.elements.listYearFilter.value = currentYear;
        }
        if (months.includes(currentMonth)) {
            this.elements.listMonthFilter.value = currentMonth;
        }

        this.elements.chartYearFilter.innerHTML = years.map(y => '<option value="' + y + '">' + y + '年</option>').join('');
        if (years.length > 0) this.elements.chartYearFilter.value = years[0];
    }

    renderPriceList() {
        if (!this.elements.priceList) return;
        this.elements.priceList.innerHTML = '';

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent || !talent.prices || talent.prices.length === 0) {
            this.elements.priceList.innerHTML = '<li class="text-sm text-gray-500 text-center py-4">暂无一口价记录</li>';
            return;
        }

        // [V6.2] 支持年月筛选
        const yearFilter = this.elements.listYearFilter?.value;
        const monthFilter = this.elements.listMonthFilter?.value;

        let filteredPrices = [...talent.prices];
        if (yearFilter) filteredPrices = filteredPrices.filter(p => p.year === parseInt(yearFilter));
        if (monthFilter) filteredPrices = filteredPrices.filter(p => p.month === parseInt(monthFilter));

        // 排序：year>month>type
        const sortedPrices = filteredPrices.sort((a,b) => {
            if (b.year !== a.year) return b.year - a.year;
            if (b.month !== a.month) return b.month - a.month;
            return (PRICE_TYPE_ORDER[a.type] || 99) - (PRICE_TYPE_ORDER[b.type] || 99);
        });

        if (sortedPrices.length === 0) {
            this.elements.priceList.innerHTML = '<li class="text-sm text-gray-500 text-center py-4">暂无符合条件的价格记录</li>';
            return;
        }

        const showYearMonth = !yearFilter || !monthFilter;

        sortedPrices.forEach(price => {
            const statusLabel = price.status === 'provisional' ? '(暂定价)' : '(已确认)';
            const statusColor = price.status === 'provisional' ? 'text-yellow-600' : 'text-green-600';
            const typeLabel = PRICE_TYPE_LABELS[price.type] || price.type || '未知类型';

            const dateDisplay = showYearMonth ? '<span class="text-gray-700">' + price.year + '年 ' + price.month + '月</span> - ' : '';

            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-2 bg-white border rounded-md text-sm hover:shadow-sm transition-shadow';
            li.innerHTML = '<div>' + dateDisplay + '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">' + typeLabel + '</span>: <span class="font-semibold text-gray-900">¥ ' + price.price.toLocaleString() + '</span><span class="text-xs ml-2 ' + statusColor + '">' + statusLabel + '</span></div><button data-year="' + price.year + '" data-month="' + price.month + '" data-type="' + price.type + '" class="delete-price-btn text-red-500 hover:text-red-700 text-xs font-medium">删除</button>';
            this.elements.priceList.appendChild(li);
        });
    }

    // [V6.2 新增] 渲染价格趋势图
    renderPriceTrendChart() {
        if (!this.elements.chartCanvas) return;

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        const selectedType = this.elements.chartTypeFilter?.value || '60s_plus';
        const selectedYear = this.elements.chartYearFilter?.value ? parseInt(this.elements.chartYearFilter.value) : new Date().getFullYear();

        // 获取该年份该类型的所有价格数据（按月）
        const priceData = new Array(12).fill(null);
        (talent.prices || []).forEach(p => {
            if (p.year === selectedYear && p.type === selectedType) {
                priceData[p.month - 1] = p.price;
            }
        });

        // 销毁旧图表
        if (this.priceTrendChart) {
            this.priceTrendChart.destroy();
        }

        // 创建新图表
        const ctx = this.elements.chartCanvas.getContext('2d');
        this.priceTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                datasets: [{
                    label: selectedYear + '年价格趋势',
                    data: priceData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.parsed.y !== null) {
                                    return '价格: ¥ ' + context.parsed.y.toLocaleString();
                                }
                                return '暂无数据';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '¥ ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const year = parseInt(this.elements.yearSelect.value);
        const month = parseInt(this.elements.monthSelect.value);
        const type = this.elements.typeSelect.value;
        const amount = parseFloat(this.elements.amountInput.value);
        const status = this.elements.statusSelect.value;

        if (isNaN(amount) || amount < 0) {
            this.app.showToast('请输入有效的金额。', true);
            return;
        }
        if (!type) {
            this.app.showToast('请选择视频类型。', true);
            return;
        }

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        // [V6.1] 过滤时使用 year + month + type 作为唯一键
        const newPrices = (talent.prices || []).filter(p =>
            !(p.year === year && p.month === month && p.type === type)
        );
        newPrices.push({ year, month, type, price: amount, status });

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                prices: newPrices
            });

            this.app.showToast('一口价添加/更新成功');

            if (this.elements.form) this.elements.form.reset();
            this.populateDateSelects();
            await this.app.fetchTalents();

            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.initializeFilters(updatedTalent);
                this.renderPriceList();
                this.renderPriceTrendChart();
            } else {
                this.close();
            }
        } catch (error) {
            console.error('PriceModal: Submit error', error);
        }
    }

    async handleDelete(e) {
        const year = parseInt(e.target.dataset.year);
        const month = parseInt(e.target.dataset.month);
        const type = e.target.dataset.type;

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        const newPrices = talent.prices.filter(p =>
            !(p.year === year && p.month === month && p.type === type)
        );

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                prices: newPrices
            });

            this.app.showToast('一口价删除成功');
            await this.app.fetchTalents();

            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.initializeFilters(updatedTalent);
                this.renderPriceList();
                this.renderPriceTrendChart();
            } else {
                this.close();
            }
        } catch (error) {
            console.error('PriceModal: Delete error', error);
        }
    }
}
