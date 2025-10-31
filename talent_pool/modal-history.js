/**
 * modal-history.js - 合作历史 Modal 模块
 * 基于 talent_pool.js v6.2.1 - 方案A设计：时间轴 + 统计面板 + 双图表可视化
 *
 * 功能特性:
 * 1. 统计面板：总合作次数、总金额、平均返点率、筛选结果
 * 2. 时间筛选：年份/月份筛选器
 * 3. 时间轴视图：卡片式展示合作记录
 * 4. 双图表可视化：返点率趋势 + 每月合作次数
 */

export class HistoryModal {
    constructor(app) {
        this.app = app;
        this.currentTalentId = null;
        this.allHistoryData = [];
        this.filteredHistoryData = [];
        this.rebateChart = null;
        this.monthlyChart = null;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById('history-modal'),
            talentName: document.getElementById('history-talent-name'),
            closeBtn: document.getElementById('close-history-modal-btn'),

            // Statistics
            statTotal: document.getElementById('history-stat-total'),
            statAmount: document.getElementById('history-stat-amount'),
            statAvgRebate: document.getElementById('history-stat-avg-rebate'),
            statFiltered: document.getElementById('history-stat-filtered'),

            // Filters
            yearFilter: document.getElementById('history-year-filter'),
            monthFilter: document.getElementById('history-month-filter'),
            resetFilterBtn: document.getElementById('history-reset-filter-btn'),

            // Timeline
            timelineContainer: document.getElementById('history-timeline-container'),

            // Charts
            rebateChartCanvas: document.getElementById('history-rebate-chart'),
            monthlyChartCanvas: document.getElementById('history-monthly-chart')
        };
    }

    bindEvents() {
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.close();
        });

        this.elements.yearFilter?.addEventListener('change', () => this.applyFilters());
        this.elements.monthFilter?.addEventListener('change', () => this.applyFilters());
        this.elements.resetFilterBtn?.addEventListener('click', () => this.resetFilters());
    }

    async open(talentId) {
        const talent = this.app.currentTalentData.find(t => t.id === talentId);
        if (!talent || !this.elements.talentName) return;

        this.currentTalentId = talentId;
        this.elements.talentName.textContent = talent.nickname;

        // 显示模态框
        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
            // 触发动画
            setTimeout(() => {
                const content = this.elements.modal.querySelector('.modal-content');
                if (content) {
                    content.classList.remove('opacity-0', 'scale-95');
                    content.classList.add('opacity-100', 'scale-100');
                }
            }, 10);
        }

        // 获取该达人的合作历史
        this.allHistoryData = (this.app.allCollaborations.get(talentId) || []).map(collab => {
            const project = this.app.allProjects.find(p => p.id === collab.projectId);
            const date = new Date(collab.createdAt);
            return {
                ...collab,
                projectName: project ? project.name : '未知项目',
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                dateObj: date
            };
        }).sort((a, b) => b.dateObj - a.dateObj);

        // 初始化筛选器和数据
        this.initializeFilters();
        this.filteredHistoryData = [...this.allHistoryData];

        // 渲染所有组件
        this.renderStatistics();
        this.renderTimeline();
        this.renderCharts();
    }

    close() {
        if (this.elements.modal) {
            const content = this.elements.modal.querySelector('.modal-content');
            if (content) {
                content.classList.remove('opacity-100', 'scale-100');
                content.classList.add('opacity-0', 'scale-95');
            }
            setTimeout(() => {
                this.elements.modal.classList.add('hidden');
            }, 200);
        }

        // 销毁图表
        if (this.rebateChart) {
            this.rebateChart.destroy();
            this.rebateChart = null;
        }
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
            this.monthlyChart = null;
        }
    }

    initializeFilters() {
        if (!this.elements.yearFilter || !this.elements.monthFilter) return;

        const years = [...new Set(this.allHistoryData.map(h => h.year))].sort((a, b) => b - a);
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        this.elements.yearFilter.innerHTML = '<option value="">全部年份</option>' +
            years.map(y => `<option value="${y}">${y}年</option>`).join('');

        this.elements.monthFilter.innerHTML = '<option value="">全部月份</option>' +
            months.map(m => `<option value="${m}">${m}月</option>`).join('');
    }

    applyFilters() {
        const selectedYear = this.elements.yearFilter?.value;
        const selectedMonth = this.elements.monthFilter?.value;

        this.filteredHistoryData = this.allHistoryData.filter(item => {
            const yearMatch = !selectedYear || item.year === parseInt(selectedYear);
            const monthMatch = !selectedMonth || item.month === parseInt(selectedMonth);
            return yearMatch && monthMatch;
        });

        this.renderStatistics();
        this.renderTimeline();
        this.renderCharts();
    }

    resetFilters() {
        if (this.elements.yearFilter) this.elements.yearFilter.value = '';
        if (this.elements.monthFilter) this.elements.monthFilter.value = '';
        this.applyFilters();
    }

    renderStatistics() {
        if (!this.elements.statTotal) return;

        // 总合作次数
        const totalCount = this.allHistoryData.length;
        this.elements.statTotal.textContent = totalCount;

        // 总合作金额
        const totalAmount = this.allHistoryData.reduce((sum, item) => sum + (item.amount || 0), 0);
        this.elements.statAmount.textContent = '¥' + totalAmount.toLocaleString();

        // 平均返点率
        const validRebates = this.allHistoryData.filter(item => item.rebate !== null && item.rebate !== undefined);
        const avgRebate = validRebates.length > 0
            ? (validRebates.reduce((sum, item) => sum + item.rebate, 0) / validRebates.length).toFixed(1)
            : 0;
        this.elements.statAvgRebate.textContent = avgRebate + '%';

        // 筛选结果数量
        this.elements.statFiltered.textContent = this.filteredHistoryData.length;
    }

    renderTimeline() {
        if (!this.elements.timelineContainer) return;

        if (this.filteredHistoryData.length === 0) {
            this.elements.timelineContainer.innerHTML = '<p class="text-center text-gray-500 py-8">暂无符合条件的合作历史记录。</p>';
            return;
        }

        this.elements.timelineContainer.innerHTML = this.filteredHistoryData.map((item, index) => {
            const projectLink = `<a href="order_list.html?projectId=${item.projectId}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">${item.projectName}</a>`;
            const amount = '¥' + Number(item.amount || 0).toLocaleString();
            const rebate = item.rebate !== null && item.rebate !== undefined ? item.rebate + '%' : 'N/A';
            const status = item.status || 'N/A';
            const videoLink = item.videoId
                ? `<a href="https://www.douyin.com/video/${item.videoId}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs">查看视频 →</a>`
                : '<span class="text-gray-400 text-xs">无视频</span>';

            const dateStr = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.dateObj.getDate()).padStart(2, '0')}`;

            // 状态颜色映射
            const statusColors = {
                '已完成': 'bg-green-100 text-green-800 border-green-200',
                '进行中': 'bg-blue-100 text-blue-800 border-blue-200',
                '待确认': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                '已取消': 'bg-red-100 text-red-800 border-red-200'
            };
            const statusClass = statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';

            return `
                <div class="relative bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <!-- Timeline dot -->
                    <div class="absolute -left-7 top-5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow"></div>
                    ${index < this.filteredHistoryData.length - 1 ? '<div class="absolute -left-6 top-8 w-0.5 h-full bg-gray-300"></div>' : ''}

                    <!-- Date badge -->
                    <div class="text-xs text-gray-500 mb-2 font-medium">
                        <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        ${dateStr}
                    </div>

                    <!-- Project name -->
                    <div class="text-sm mb-2">${projectLink}</div>

                    <!-- Details grid -->
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="flex items-center gap-1">
                            <span class="text-gray-500">金额:</span>
                            <span class="font-semibold text-gray-900">${amount}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-gray-500">返点:</span>
                            <span class="font-semibold text-purple-600">${rebate}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-gray-500">状态:</span>
                            <span class="inline-block px-2 py-0.5 rounded border text-xs ${statusClass}">${status}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            ${videoLink}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCharts() {
        this.renderRebateTrendChart();
        this.renderMonthlyCountChart();
    }

    renderRebateTrendChart() {
        if (!this.elements.rebateChartCanvas) return;

        // 销毁旧图表
        if (this.rebateChart) {
            this.rebateChart.destroy();
            this.rebateChart = null;
        }

        // 过滤出有返点率的数据，按时间排序
        const rebateData = this.filteredHistoryData
            .filter(item => item.rebate !== null && item.rebate !== undefined)
            .sort((a, b) => a.dateObj - b.dateObj);

        if (rebateData.length === 0) {
            const ctx = this.elements.rebateChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.elements.rebateChartCanvas.width, this.elements.rebateChartCanvas.height);
            ctx.font = '12px Inter';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText('暂无返点率数据', this.elements.rebateChartCanvas.width / 2, this.elements.rebateChartCanvas.height / 2);
            return;
        }

        const labels = rebateData.map(item => {
            return `${item.month}/${item.dateObj.getDate()}`;
        });
        const data = rebateData.map(item => item.rebate);

        const ctx = this.elements.rebateChartCanvas.getContext('2d');
        this.rebateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '返点率 (%)',
                    data: data,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#f97316',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const index = context[0].dataIndex;
                                const item = rebateData[index];
                                return `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.dateObj.getDate()).padStart(2, '0')}`;
                            },
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
                            },
                            font: {
                                size: 10
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    renderMonthlyCountChart() {
        if (!this.elements.monthlyChartCanvas) return;

        // 销毁旧图表
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
            this.monthlyChart = null;
        }

        if (this.filteredHistoryData.length === 0) {
            const ctx = this.elements.monthlyChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.elements.monthlyChartCanvas.width, this.elements.monthlyChartCanvas.height);
            ctx.font = '12px Inter';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText('暂无统计数据', this.elements.monthlyChartCanvas.width / 2, this.elements.monthlyChartCanvas.height / 2);
            return;
        }

        // 按年月统计合作次数
        const monthlyStats = {};
        this.filteredHistoryData.forEach(item => {
            const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
            monthlyStats[key] = (monthlyStats[key] || 0) + 1;
        });

        // 排序并转换为数组
        const sortedMonths = Object.keys(monthlyStats).sort();
        const labels = sortedMonths.map(key => {
            const [year, month] = key.split('-');
            return `${year}年${parseInt(month)}月`;
        });
        const data = sortedMonths.map(key => monthlyStats[key]);

        const ctx = this.elements.monthlyChartCanvas.getContext('2d');
        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '合作次数',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '合作次数: ' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 10
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }
}
