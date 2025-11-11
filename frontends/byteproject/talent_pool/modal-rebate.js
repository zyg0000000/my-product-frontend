/**
 * modal-rebate.js - 返点管理 Modal 模块
 * 基于 talent_pool.js v6.2.1 - 包含 Chart.js 返点趋势图
 */

export class RebateModal {
    constructor(app) {
        this.app = app;
        this.currentTalentId = null;
        this.rebateTrendChart = null;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById('rebate-modal'),
            talentName: document.getElementById('rebate-talent-name'),
            closeBtn: document.getElementById('close-rebate-modal-btn'),
            form: document.getElementById('rebate-form'),
            rateInput: document.getElementById('new-rebate-rate'),
            rebateList: document.getElementById('rebate-list'),
            chartCanvas: document.getElementById('rebate-trend-chart')
        };
    }

    bindEvents() {
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.close();
        });
        this.elements.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.rebateList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-rebate-btn')) {
                this.handleDelete(e);
            }
        });
    }

    open(talentId) {
        if (!this.elements.modal || !this.elements.talentName) return;

        this.currentTalentId = talentId;
        const talent = this.app.currentTalentData.find(t => t.id === talentId);

        if (!talent) return;

        this.elements.talentName.textContent = talent.nickname;
        this.renderRebateList();
        this.renderRebateTrendChart(talent);

        this.elements.modal.classList.remove('hidden');
    }

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
        if (this.rebateTrendChart) {
            this.rebateTrendChart.destroy();
            this.rebateTrendChart = null;
        }
    }

    renderRebateList() {
        if (!this.elements.rebateList) return;
        this.elements.rebateList.innerHTML = '';

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent || !talent.rebates || talent.rebates.length === 0) {
            this.elements.rebateList.innerHTML = '<li class="text-sm text-gray-500 text-center py-4">暂无返点率</li>';
            return;
        }

        talent.rebates.forEach(rebate => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-2 bg-white border rounded-md text-sm hover:shadow-sm transition-shadow';
            li.innerHTML = '<span class="font-semibold text-gray-900">' + rebate.rate + '%</span><button data-rate="' + rebate.rate + '" class="delete-rebate-btn text-red-500 hover:text-red-700 text-xs font-medium">删除</button>';
            this.elements.rebateList.appendChild(li);
        });
    }

    // [V6.2.1 新增] 渲染返点率趋势图
    renderRebateTrendChart(talent) {
        if (!talent || !this.elements.chartCanvas) return;

        // 返点率按值从低到高排序展示
        const rebates = talent.rebates || [];

        // 如果没有返点率数据，显示空图表
        if (rebates.length === 0) {
            if (this.rebateTrendChart) {
                this.rebateTrendChart.destroy();
                this.rebateTrendChart = null;
            }
            const ctx = this.elements.chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.elements.chartCanvas.width, this.elements.chartCanvas.height);
            ctx.font = '14px Inter';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText('暂无返点率数据', this.elements.chartCanvas.width / 2, this.elements.chartCanvas.height / 2);
            return;
        }

        // 销毁旧图表
        if (this.rebateTrendChart) {
            this.rebateTrendChart.destroy();
        }

        // [V6.2.1] 按返点率值从低到高排序
        const sortedRebates = [...rebates].sort((a, b) => a.rate - b.rate);

        // 创建新图表
        const ctx = this.elements.chartCanvas.getContext('2d');
        const labels = sortedRebates.map((_, index) => String(index + 1));
        const data = sortedRebates.map(r => r.rate);

        this.rebateTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '返点率 (%)',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '返点率: ' + context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const rateValue = parseFloat(this.elements.rateInput.value);
        if (isNaN(rateValue) || rateValue < 0) {
            this.app.showToast('请输入有效的返点率。', true);
            return;
        }

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        const newRebates = [...(talent.rebates || []), { rate: rateValue }];

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                rebates: newRebates
            });

            this.app.showToast('返点率添加成功');

            if (this.elements.form) this.elements.form.reset();
            await this.app.fetchTalents();

            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.renderRebateList();
                this.renderRebateTrendChart(updatedTalent);
            } else {
                this.close();
            }
        } catch (error) {
            console.error('RebateModal: Submit error', error);
        }
    }

    async handleDelete(e) {
        const rateToDelete = parseFloat(e.target.dataset.rate);

        const talent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
        if (!talent) return;

        const newRebates = talent.rebates.filter(r => r.rate !== rateToDelete);

        try {
            await this.app.apiRequest(this.app.API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                rebates: newRebates
            });

            this.app.showToast('返点率删除成功');
            await this.app.fetchTalents();

            const updatedTalent = this.app.currentTalentData.find(t => t.id === this.currentTalentId);
            if (updatedTalent) {
                this.renderRebateList();
                this.renderRebateTrendChart(updatedTalent);
            } else {
                this.close();
            }
        } catch (error) {
            console.error('RebateModal: Delete error', error);
        }
    }
}
