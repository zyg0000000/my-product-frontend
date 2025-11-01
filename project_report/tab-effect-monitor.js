/**
 * @file tab-effect-monitor.js
 * @description 效果监测 Tab 模块
 * @version 2.0.0
 *
 * 职责:
 * - 展示达人效果数据趋势
 * - 支持日期范围筛选（默认14天）
 * - 支持搜索和排序
 * - 可视化播放量和CPM趋势
 * - 预留历史对比功能接口
 */

import { AppCore } from '../common/app-core.js';
import { API_ENDPOINTS } from './constants.js';
import { ReportUtils } from './utils.js';

const { API, Format } = AppCore;

/**
 * 格式化大数字为紧凑格式 (1M, 150K, 等)
 * @param {number} num - 数值
 * @returns {string} 格式化后的字符串
 */
function compactNumber(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) {
        return (n / 1000000).toFixed(1) + 'M';
    } else if (n >= 1000) {
        return (n / 1000).toFixed(1) + 'K';
    }
    return n.toString();
}

export class EffectMonitorTab {
    constructor(app, projectId, project) {
        this.app = app;
        this.projectId = projectId;
        this.project = project;

        // 数据状态
        this.talentList = [];              // 聚合后的达人列表
        this.filteredTalentList = [];      // 过滤排序后的列表
        this.selectedTalent = null;        // 当前选中的达人
        this.selectedTalentDetail = null;  // 选中达人的详细数据

        // Chart.js 实例
        this.viewsChart = null;
        this.cpmChart = null;

        // 搜索和排序状态
        this.searchKeyword = '';
        this.sortBy = 'totalViews_desc';

        // 日期范围状态
        this.dateRange = [];
        this.defaultDaysRange = 14;
        this.currentRangeType = '14'; // '7', '14', '30', 'all'
        this.projectStartDate = null;

        // 初始化标志
        this.initialized = false;
    }

    /**
     * 加载Tab数据
     */
    async load() {
        if (!this.initialized) {
            // 渲染基础布局
            this.renderLayout();

            // 获取项目第一个发布日期
            await this.fetchProjectStartDate();

            // 设置初始日期范围（默认14天）
            this.setDateRange(this.defaultDaysRange);

            // 设置事件监听
            this.setupEventListeners();

            this.initialized = true;
        }

        // 加载数据
        await this.loadEffectData();
    }

    /**
     * 渲染基础布局
     */
    renderLayout() {
        const container = document.getElementById('effect-monitor-tab');
        if (!container) {
            console.error('效果监测容器未找到: effect-monitor-tab');
            return;
        }

        container.innerHTML = `
            <!-- 顶部：日期范围选择器 -->
            <div class="mb-4 p-4 bg-white rounded-lg border">
                <div class="flex items-center gap-4 flex-wrap">
                    <!-- 快捷选项 -->
                    <div class="flex gap-2">
                        <button class="range-quick-btn px-4 py-2 rounded text-sm font-medium transition-colors" data-days="7">最近7天</button>
                        <button class="range-quick-btn px-4 py-2 rounded text-sm font-medium transition-colors active" data-days="14">最近14天</button>
                        <button class="range-quick-btn px-4 py-2 rounded text-sm font-medium transition-colors" data-days="30">最近30天</button>
                        <button class="range-quick-btn px-4 py-2 rounded text-sm font-medium transition-colors" data-days="all">全部</button>
                    </div>

                    <!-- 自定义日期 -->
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-gray-600">自定义:</span>
                        <input type="date" id="effectMonitorStartDate" class="border rounded px-2 py-1 text-sm">
                        <span class="text-gray-600">至</span>
                        <input type="date" id="effectMonitorEndDate" class="border rounded px-2 py-1 text-sm">
                        <button id="applyCustomRange" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">应用</button>
                    </div>
                </div>
            </div>

            <!-- 主内容区 -->
            <div class="flex gap-4 h-[calc(100vh-280px)]">

                <!-- 左侧：达人列表 -->
                <div class="w-1/3 flex flex-col border rounded-lg bg-white overflow-hidden">

                    <!-- 搜索栏 -->
                    <div class="p-4 border-b">
                        <input type="text" id="talentSearchInput"
                               placeholder="🔍 搜索达人..."
                               class="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>

                    <!-- 排序选项 -->
                    <div class="px-4 py-3 border-b bg-gray-50">
                        <select id="talentSortSelect" class="w-full rounded-md border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="totalViews_desc">总播放量 ↓</option>
                            <option value="totalViews_asc">总播放量 ↑</option>
                            <option value="avgCpm_desc">平均CPM ↓</option>
                            <option value="avgCpm_asc">平均CPM ↑</option>
                            <option value="latestViews_desc">最新播放 ↓</option>
                            <option value="viewsGrowthRate_desc">增长率 ↓</option>
                        </select>
                    </div>

                    <!-- 达人列表 -->
                    <div class="flex-1 overflow-y-auto" id="talentListContainer">
                        <div class="text-center py-8 text-gray-500">加载中...</div>
                    </div>
                </div>

                <!-- 右侧：达人详情 -->
                <div class="w-2/3 flex flex-col border rounded-lg bg-white overflow-hidden">
                    <div class="flex-1 overflow-y-auto" id="talentDetailContainer">
                        <!-- 未选中时的占位 -->
                        <div id="emptyStateTip" class="flex items-center justify-center h-full">
                            <div class="text-center text-gray-400">
                                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                <p class="text-lg">← 请从左侧选择达人查看详细数据</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style>
                .range-quick-btn {
                    background-color: #f3f4f6;
                    color: #6b7280;
                }
                .range-quick-btn.active {
                    background-color: #3b82f6;
                    color: white;
                }
                .range-quick-btn:hover:not(.active) {
                    background-color: #e5e7eb;
                }
                .talent-card {
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .talent-card:hover {
                    background-color: #f0f9ff;
                }
                .talent-card.selected {
                    background-color: #dbeafe;
                    border-left: 4px solid #3b82f6;
                }
            </style>
        `;
    }

    /**
     * 获取项目第一个发布日期
     */
    async fetchProjectStartDate() {
        try {
            // 获取项目的所有视频数据，找到最早的发布日期
            // 使用一个足够远的日期作为查询起点
            const farPastDate = '2020-01-01';
            const today = ReportUtils.getLocalDateString();

            // 从今天往前推30天，获取视频列表
            const testDate = new Date();
            testDate.setDate(testDate.getDate() - 30);
            const testDateString = ReportUtils.getLocalDateString(testDate);

            const response = await API.request(`${API_ENDPOINTS.VIDEOS_FOR_ENTRY}?projectId=${this.projectId}&date=${testDateString}`);
            const videos = response.data || [];

            if (videos.length > 0) {
                // 找到所有发布日期中最早的
                const publishDates = videos
                    .map(v => v.publishDate)
                    .filter(date => date) // 过滤掉空值
                    .sort(); // 字符串日期可以直接排序 (YYYY-MM-DD 格式)

                if (publishDates.length > 0) {
                    this.projectStartDate = publishDates[0];
                } else {
                    // 如果没有发布日期，默认使用30天前
                    this.projectStartDate = testDateString;
                }
            } else {
                // 如果没有视频，默认使用30天前
                this.projectStartDate = testDateString;
            }

            // 设置日期选择器的最小值
            const startDateInput = document.getElementById('effectMonitorStartDate');
            const endDateInput = document.getElementById('effectMonitorEndDate');

            if (startDateInput && endDateInput) {
                startDateInput.min = this.projectStartDate;
                startDateInput.max = today;
                endDateInput.min = this.projectStartDate;
                endDateInput.max = today;
            }

        } catch (error) {
            console.error('获取项目开始日期失败:', error);
            // 默认使用30天前
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() - 30);
            this.projectStartDate = ReportUtils.getLocalDateString(defaultDate);
        }
    }

    /**
     * 设置日期范围
     * @param {number|string} days - 天数或'all'
     */
    setDateRange(days) {
        const today = new Date();
        let startDate;

        if (days === 'all' || days === null) {
            // 全部：从项目开始日期到今天
            startDate = new Date(this.projectStartDate || '2024-01-01');
            this.currentRangeType = 'all';
        } else {
            // 指定天数
            startDate = new Date(today);
            startDate.setDate(today.getDate() - days + 1); // +1 包含今天
            this.currentRangeType = String(days);
        }

        // 生成日期范围数组
        this.dateRange = [];
        const current = new Date(startDate);

        while (current <= today) {
            this.dateRange.push(ReportUtils.getLocalDateString(current));
            current.setDate(current.getDate() + 1);
        }

        // 更新自定义日期输入框
        const startDateInput = document.getElementById('effectMonitorStartDate');
        const endDateInput = document.getElementById('effectMonitorEndDate');

        if (startDateInput && endDateInput) {
            startDateInput.value = this.dateRange[0];
            endDateInput.value = this.dateRange[this.dateRange.length - 1];
        }
    }

    /**
     * 加载效果监测数据
     */
    async loadEffectData() {
        const listContainer = document.getElementById('talentListContainer');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="text-center py-8 text-gray-500">正在加载数据...</div>';

        try {
            // 获取日期范围内的所有日报数据
            const promises = this.dateRange.map(date =>
                API.request(`${API_ENDPOINTS.REPORT}?projectId=${this.projectId}&date=${date}`)
            );

            const responses = await Promise.all(promises);

            // 聚合数据：按达人分组
            const talentMap = new Map();

            responses.forEach((response, index) => {
                const date = this.dateRange[index];
                const data = response.data;

                if (!data || !data.details) return;

                const details = data.details;

                // 遍历所有分类的视频
                ['hotVideos', 'goodVideos', 'normalVideos', 'badVideos', 'worstVideos'].forEach(category => {
                    const videos = details[category] || [];

                    videos.forEach(video => {
                        const talentName = video.talentName;

                        if (!talentMap.has(talentName)) {
                            talentMap.set(talentName, {
                                talentName: talentName,
                                dailyData: [],
                                videoCount: 0
                            });
                        }

                        const talent = talentMap.get(talentName);

                        // 添加每日数据
                        talent.dailyData.push({
                            date: date,
                            views: video.totalViews || 0,
                            cpm: video.cpm || 0
                        });

                        talent.videoCount++;
                    });
                });
            });

            // 计算聚合指标
            this.talentList = Array.from(talentMap.values()).map(talent => {
                // 按日期排序
                talent.dailyData.sort((a, b) => a.date.localeCompare(b.date));

                // 计算总播放量（最新一天的播放量）
                const latestData = talent.dailyData[talent.dailyData.length - 1];
                talent.totalViews = latestData ? latestData.views : 0;

                // 计算平均CPM
                const validCpms = talent.dailyData.filter(d => d.cpm > 0);
                talent.avgCpm = validCpms.length > 0
                    ? validCpms.reduce((sum, d) => sum + d.cpm, 0) / validCpms.length
                    : 0;

                // 最新一天播放量
                talent.latestViews = latestData ? latestData.views : 0;

                // 计算增长率（最后一天 vs 第一天）
                if (talent.dailyData.length >= 2) {
                    const firstViews = talent.dailyData[0].views;
                    const lastViews = talent.dailyData[talent.dailyData.length - 1].views;
                    talent.viewsGrowthRate = firstViews > 0
                        ? ((lastViews - firstViews) / firstViews) * 100
                        : 0;
                } else {
                    talent.viewsGrowthRate = 0;
                }

                // 合作天数
                talent.collaborationDays = talent.dailyData.length;

                return talent;
            });

            // 应用过滤和排序
            this.applyFilterAndSort();

            // 渲染列表
            this.renderTalentList();

        } catch (error) {
            console.error('加载效果监测数据失败:', error);
            listContainer.innerHTML = '<div class="text-center py-8 text-red-500">加载失败，请重试</div>';
        }
    }

    /**
     * 应用搜索和排序
     */
    applyFilterAndSort() {
        let filtered = [...this.talentList];

        // 搜索过滤
        if (this.searchKeyword.trim()) {
            const keyword = this.searchKeyword.trim().toLowerCase();
            filtered = filtered.filter(t =>
                t.talentName.toLowerCase().includes(keyword)
            );
        }

        // 排序
        const [field, order] = this.sortBy.split('_');
        filtered.sort((a, b) => {
            const aVal = a[field] || 0;
            const bVal = b[field] || 0;
            return order === 'desc' ? bVal - aVal : aVal - bVal;
        });

        this.filteredTalentList = filtered;
    }

    /**
     * 渲染达人列表
     */
    renderTalentList() {
        const container = document.getElementById('talentListContainer');
        if (!container) return;

        if (this.filteredTalentList.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <p>暂无数据</p>
                    ${this.searchKeyword ? '<p class="text-sm mt-2">试试调整搜索关键词</p>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredTalentList.map(talent => {
            const isSelected = this.selectedTalent && this.selectedTalent.talentName === talent.talentName;

            return `
                <div class="talent-card p-4 border-b ${isSelected ? 'selected' : ''}" data-talent-name="${talent.talentName}">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-medium text-gray-900">${talent.talentName}</h4>
                        <span class="text-xs text-gray-500">${talent.collaborationDays}天</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span class="text-gray-500">播放量:</span>
                            <span class="font-semibold text-blue-600">${compactNumber(talent.totalViews)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">CPM:</span>
                            <span class="font-semibold text-purple-600">¥${talent.avgCpm.toFixed(1)}</span>
                        </div>
                    </div>
                    ${talent.viewsGrowthRate !== 0 ? `
                        <div class="mt-2 text-xs">
                            <span class="text-gray-500">增长:</span>
                            <span class="${talent.viewsGrowthRate > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${talent.viewsGrowthRate > 0 ? '↑' : '↓'} ${Math.abs(talent.viewsGrowthRate).toFixed(1)}%
                            </span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // 绑定点击事件
        container.querySelectorAll('.talent-card').forEach(card => {
            card.addEventListener('click', () => {
                const talentName = card.dataset.talentName;
                const talent = this.filteredTalentList.find(t => t.talentName === talentName);
                if (talent) {
                    this.handleTalentSelect(talent);
                }
            });
        });
    }

    /**
     * 处理达人选中
     * @param {object} talent - 选中的达人
     */
    async handleTalentSelect(talent) {
        this.selectedTalent = talent;
        this.selectedTalentDetail = talent; // 数据已在聚合时计算完成

        // 重新渲染列表（更新选中状态）
        this.renderTalentList();

        // 渲染详情
        this.renderTalentDetail();
    }

    /**
     * 渲染达人详情
     */
    renderTalentDetail() {
        const container = document.getElementById('talentDetailContainer');
        if (!container || !this.selectedTalentDetail) return;

        const talent = this.selectedTalentDetail;

        container.innerHTML = `
            <!-- 标题 -->
            <div class="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
                <h3 class="text-xl font-semibold text-gray-800">📊 ${talent.talentName} - 效果数据</h3>
            </div>

            <!-- 关键指标卡片 -->
            <div class="p-4 grid grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">总播放量</div>
                    <div class="text-2xl font-bold text-blue-600">${compactNumber(talent.totalViews)}</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">平均CPM</div>
                    <div class="text-2xl font-bold text-purple-600">¥${talent.avgCpm.toFixed(1)}</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">合作天数</div>
                    <div class="text-2xl font-bold text-green-600">${talent.collaborationDays}</div>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">视频数量</div>
                    <div class="text-2xl font-bold text-orange-600">${talent.videoCount}</div>
                </div>
            </div>

            <!-- 趋势图 -->
            <div class="p-4 grid grid-cols-2 gap-4">
                <div class="border rounded-lg p-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">累积播放量趋势</h4>
                    <div style="height: 250px;">
                        <canvas id="viewsTrendChart"></canvas>
                    </div>
                </div>
                <div class="border rounded-lg p-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">CPM 趋势</h4>
                    <div style="height: 250px;">
                        <canvas id="cpmTrendChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- 历史对比占位 -->
            <div class="p-4 border-t">
                <div id="historyComparisonPlaceholder"></div>
            </div>

            <!-- 每日数据明细表 -->
            <div class="p-4">
                <h4 class="text-sm font-medium text-gray-700 mb-3">📅 每日数据明细</h4>
                <div class="border rounded-lg overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left text-gray-600">日期</th>
                                <th class="px-4 py-2 text-right text-gray-600">累积播放量</th>
                                <th class="px-4 py-2 text-right text-gray-600">CPM</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${talent.dailyData.map((day, index) => `
                                <tr class="border-t hover:bg-gray-50">
                                    <td class="px-4 py-2">${day.date}</td>
                                    <td class="px-4 py-2 text-right font-mono">${Format.number(day.views)}</td>
                                    <td class="px-4 py-2 text-right font-mono">¥${day.cpm.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 隐藏空状态提示
        const emptyTip = document.getElementById('emptyStateTip');
        if (emptyTip) emptyTip.style.display = 'none';

        // 渲染图表
        this.renderTrendsCharts();

        // 渲染历史对比占位
        this.renderHistoryPlaceholder();
    }

    /**
     * 渲染趋势图表
     */
    renderTrendsCharts() {
        if (!this.selectedTalentDetail) return;

        const dailyData = this.selectedTalentDetail.dailyData;

        // 销毁旧图表
        if (this.viewsChart) {
            this.viewsChart.destroy();
            this.viewsChart = null;
        }
        if (this.cpmChart) {
            this.cpmChart.destroy();
            this.cpmChart = null;
        }

        // 播放量趋势图
        const viewsCtx = document.getElementById('viewsTrendChart');
        if (viewsCtx) {
            this.viewsChart = new Chart(viewsCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: dailyData.map(d => d.date.substring(5)), // "11-01"
                    datasets: [{
                        label: '累积播放量',
                        data: dailyData.map(d => d.views),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `播放量: ${Format.number(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => compactNumber(value),
                                font: { size: 10 }
                            }
                        },
                        x: {
                            ticks: { font: { size: 10 } }
                        }
                    }
                }
            });
        }

        // CPM 趋势图
        const cpmCtx = document.getElementById('cpmTrendChart');
        if (cpmCtx) {
            this.cpmChart = new Chart(cpmCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: dailyData.map(d => d.date.substring(5)),
                    datasets: [{
                        label: 'CPM',
                        data: dailyData.map(d => d.cpm),
                        borderColor: '#9333EA',
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `CPM: ¥${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => `¥${value.toFixed(0)}`,
                                font: { size: 10 }
                            }
                        },
                        x: {
                            ticks: { font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }

    /**
     * 渲染历史对比占位区域
     */
    renderHistoryPlaceholder() {
        const placeholder = document.getElementById('historyComparisonPlaceholder');
        if (!placeholder) return;

        placeholder.innerHTML = `
            <div class="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p class="text-gray-500 font-medium">🔄 历史对比功能开发中...</p>
                <p class="text-sm text-gray-400 mt-2">即将支持与历史合作项目的数据对比</p>
            </div>
        `;
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 快捷日期范围按钮
        document.querySelectorAll('.range-quick-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // 移除所有 active 状态
                document.querySelectorAll('.range-quick-btn').forEach(b => b.classList.remove('active'));
                // 添加当前按钮的 active 状态
                e.target.classList.add('active');

                const days = e.target.dataset.days;
                this.setDateRange(days === 'all' ? 'all' : parseInt(days));
                await this.loadEffectData();
            });
        });

        // 自定义日期范围应用按钮
        const applyBtn = document.getElementById('applyCustomRange');
        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                const startInput = document.getElementById('effectMonitorStartDate');
                const endInput = document.getElementById('effectMonitorEndDate');

                if (!startInput.value || !endInput.value) {
                    alert('请选择开始和结束日期');
                    return;
                }

                const startDate = new Date(startInput.value);
                const endDate = new Date(endInput.value);

                if (startDate > endDate) {
                    alert('开始日期不能晚于结束日期');
                    return;
                }

                // 生成自定义日期范围
                this.dateRange = [];
                const current = new Date(startDate);

                while (current <= endDate) {
                    this.dateRange.push(ReportUtils.getLocalDateString(current));
                    current.setDate(current.getDate() + 1);
                }

                // 移除所有快捷按钮的 active 状态
                document.querySelectorAll('.range-quick-btn').forEach(b => b.classList.remove('active'));

                await this.loadEffectData();
            });
        }

        // 搜索输入
        const searchInput = document.getElementById('talentSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchKeyword = e.target.value;
                this.applyFilterAndSort();
                this.renderTalentList();
            });
        }

        // 排序选择
        const sortSelect = document.getElementById('talentSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilterAndSort();
                this.renderTalentList();
            });
        }
    }

    /**
     * 【占位】获取达人历史合作数据
     * @param {string} talentId - 达人ID
     * @returns {Array} 历史合作项目列表
     */
    async fetchTalentHistory(talentId) {
        // TODO: 后期实现历史对比功能时使用
        try {
            const response = await API.request(
                `/talent-collaboration-history?talentId=${talentId}&excludeProjectId=${this.projectId}`
            );
            return response.data || [];
        } catch (error) {
            console.log('历史数据接口暂未实现');
            return [];
        }
    }

    /**
     * 【占位】渲染历史对比视图
     * @param {Array} historyList - 历史合作列表
     */
    renderHistoryComparison(historyList) {
        // TODO: 后期实现历史对比功能
        console.log('历史对比功能待开发', historyList);
    }

    /**
     * 更新数据（用于主控制器刷新）
     * @param {object} project - 项目数据
     */
    updateData(project) {
        this.project = project;
    }

    /**
     * 销毁Tab，清理资源
     */
    destroy() {
        // 销毁图表实例
        if (this.viewsChart) {
            this.viewsChart.destroy();
            this.viewsChart = null;
        }
        if (this.cpmChart) {
            this.cpmChart.destroy();
            this.cpmChart = null;
        }
    }
}
