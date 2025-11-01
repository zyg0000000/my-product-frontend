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
        this.videoList = [];               // 聚合后的视频列表
        this.filteredVideoList = [];       // 过滤排序后的列表
        this.selectedVideo = null;         // 当前选中的视频
        this.selectedVideoDetail = null;   // 选中视频的详细数据

        // Chart.js 实例
        this.viewsChart = null;
        this.cpmChart = null;

        // 搜索和排序状态
        this.searchKeyword = '';
        this.sortBy = 'latestCpm_asc';  // 默认按CPM从低到高

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
            <!-- 主内容区 -->
            <div class="flex gap-4 h-[calc(100vh-200px)]">

                <!-- 左侧：视频列表 -->
                <div class="w-1/3 flex flex-col border rounded-lg bg-white overflow-hidden">
                    <!-- 视频列表 -->
                    <div class="flex-1 overflow-y-auto" id="videoListContainer">
                        <div class="text-center py-8 text-gray-500">加载中...</div>
                    </div>
                </div>

                <!-- 右侧：视频详情 -->
                <div class="w-2/3 flex flex-col border rounded-lg bg-white overflow-hidden">
                    <div class="flex-1 overflow-y-auto" id="videoDetailContainer">
                        <!-- 未选中时的占位 -->
                        <div id="emptyStateTip" class="flex items-center justify-center h-full">
                            <div class="text-center text-gray-400">
                                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <p class="text-lg">← 请从左侧选择视频查看效果数据</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style>
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
        let endDate = new Date(today);

        if (days === 'all' || days === null) {
            // 全部：从项目最早发布日期到今天
            startDate = new Date(this.projectStartDate || '2024-01-01');
            this.currentRangeType = 'all';
        } else {
            // 指定天数：从最早发布日开始算N天
            startDate = new Date(this.projectStartDate || '2024-01-01');
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + days - 1); // -1 因为起始日也算一天

            // 如果计算的结束日期超过今天，则截止到今天
            if (endDate > today) {
                endDate = new Date(today);
            }

            this.currentRangeType = String(days);
        }

        // 生成日期范围数组
        this.dateRange = [];
        const current = new Date(startDate);

        while (current <= endDate) {
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
        const listContainer = document.getElementById('videoListContainer');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="text-center py-8 text-gray-500">正在加载数据...</div>';

        try {
            // 1. 先获取项目的所有视频，建立collaborationId到videoId/taskId的映射
            // 使用VIDEOS_FOR_ENTRY API（使用今天的日期）
            const today = ReportUtils.getLocalDateString();
            const videosResponse = await API.request(`${API_ENDPOINTS.VIDEOS_FOR_ENTRY}?projectId=${this.projectId}&date=${today}`);
            const videos = videosResponse.data || [];

            // 建立映射表：collaborationId -> { videoId, taskId, talentName }
            const collabIdMap = new Map();
            videos.forEach(video => {
                collabIdMap.set(video.collaborationId, {
                    videoId: video.videoId || null,
                    taskId: video.taskId || null,
                    talentName: video.talentName
                });
            });

            // 2. 获取日期范围内的所有日报数据
            const promises = this.dateRange.map(date =>
                API.request(`${API_ENDPOINTS.REPORT}?projectId=${this.projectId}&date=${date}`)
            );

            const responses = await Promise.all(promises);

            // 聚合数据：按视频ID分组（每个视频是独立的实体）
            const videoMap = new Map();

            responses.forEach((response, index) => {
                const date = this.dateRange[index];
                const data = response.data;

                if (!data || !data.details) return;

                const details = data.details;

                // 第一步：按 videoId + date 去重，同一视频在同一天的重复数据求平均
                const videoDateMap = new Map();

                ['hotVideos', 'goodVideos', 'normalVideos', 'badVideos', 'worstVideos'].forEach(category => {
                    const videos = details[category] || [];
                    videos.forEach(video => {
                        // 从collaborations集合获取真正的videoId和taskId
                        const collaborationId = video.collaborationId;
                        const collabInfo = collabIdMap.get(collaborationId);

                        if (!collabInfo) {
                            console.warn(`找不到collaborationId=${collaborationId}的合作订单信息`);
                            return; // 跳过没有映射信息的视频
                        }

                        // 使用真正的videoId（如果没有则使用taskId或collaborationId作为fallback）
                        const videoId = collabInfo.videoId || collabInfo.taskId || collaborationId;
                        const taskId = collabInfo.taskId || collaborationId;
                        const talentName = collabInfo.talentName || video.talentName;
                        const videoKey = `${collaborationId}_${date}`; // 使用collaborationId作为key更准确

                        if (!videoDateMap.has(videoKey)) {
                            // 第一次遇到这个视频
                            videoDateMap.set(videoKey, {
                                collaborationId: collaborationId,
                                talentName: talentName,
                                taskId: taskId,
                                videoId: videoId,
                                date: date,
                                viewsSum: video.totalViews || 0,
                                cpmSum: video.cpm || 0,
                                count: 1  // 用于求平均
                            });
                        } else {
                            // 同一视频在同一天出现多次（不同分类），累加后求平均
                            const existing = videoDateMap.get(videoKey);
                            existing.viewsSum += (video.totalViews || 0);
                            existing.cpmSum += (video.cpm || 0);
                            existing.count++;
                        }
                    });
                });

                // 第二步：将去重后的数据按 collaborationId 聚合（每个合作独立）
                videoDateMap.forEach(videoData => {
                    const collaborationId = videoData.collaborationId;

                    // 计算该视频当天的平均值
                    const avgViews = videoData.viewsSum / videoData.count;
                    const avgCpm = videoData.cpmSum / videoData.count;

                    if (!videoMap.has(collaborationId)) {
                        // 第一次遇到这个合作，创建新条目
                        videoMap.set(collaborationId, {
                            collaborationId: collaborationId,
                            videoId: videoData.videoId,
                            taskId: videoData.taskId,
                            talentName: videoData.talentName,
                            dailyData: []
                        });
                    }

                    const video = videoMap.get(collaborationId);

                    // 添加每日数据
                    video.dailyData.push({
                        date: videoData.date,
                        views: avgViews,  // 累积播放量（已去重平均）
                        cpm: avgCpm       // CPM（已去重平均）
                    });
                });
            });

            // 计算每个视频的聚合指标和环比增长
            this.videoList = Array.from(videoMap.values()).map(video => {
                // 按日期排序
                video.dailyData.sort((a, b) => a.date.localeCompare(b.date));

                // 计算每日环比增长
                for (let i = 0; i < video.dailyData.length; i++) {
                    const currentDay = video.dailyData[i];

                    if (i === 0) {
                        // 第一天：日增量 = 当天累积播放量
                        currentDay.dailyIncrease = currentDay.views;
                        currentDay.cpmChange = 0;
                    } else {
                        const previousDay = video.dailyData[i - 1];
                        // 日增量 = 今天累积 - 昨天累积
                        currentDay.dailyIncrease = currentDay.views - previousDay.views;
                        // CPM环比 = 今天CPM - 昨天CPM
                        currentDay.cpmChange = currentDay.cpm - previousDay.cpm;
                    }
                }

                // 总播放量（最新一天的累积播放量）
                const latestData = video.dailyData[video.dailyData.length - 1];
                video.totalViews = latestData ? latestData.views : 0;

                // 最新CPM（最新一天的CPM）
                video.latestCpm = latestData ? latestData.cpm : 0;

                // 最新一天播放量
                video.latestViews = latestData ? latestData.views : 0;

                // 总增长率（最后一天 vs 第一天）
                if (video.dailyData.length >= 2) {
                    const firstViews = video.dailyData[0].views;
                    const lastViews = video.dailyData[video.dailyData.length - 1].views;
                    video.viewsGrowthRate = firstViews > 0
                        ? ((lastViews - firstViews) / firstViews) * 100
                        : 0;
                } else {
                    video.viewsGrowthRate = 0;
                }

                // 数据天数
                video.collaborationDays = video.dailyData.length;

                // 视频数量（每个视频都是1）
                video.videoCount = 1;

                return video;
            });

            // 应用过滤和排序
            this.applyFilterAndSort();

            // 渲染列表
            this.renderVideoList();

        } catch (error) {
            console.error('加载效果监测数据失败:', error);
            listContainer.innerHTML = '<div class="text-center py-8 text-red-500">加载失败，请重试</div>';
        }
    }

    /**
     * 应用搜索和排序
     */
    applyFilterAndSort() {
        // 简化：不再需要搜索和排序，直接使用原始列表
        // 默认按CPM从低到高排序
        this.filteredVideoList = [...this.videoList].sort((a, b) => {
            return (a.latestCpm || 0) - (b.latestCpm || 0);
        });
    }

    /**
     * 渲染视频列表
     */
    renderVideoList() {
        const container = document.getElementById('videoListContainer');
        if (!container) return;

        if (this.filteredVideoList.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <p>暂无数据</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredVideoList.map(video => {
            const isSelected = this.selectedVideo && this.selectedVideo.collaborationId === video.collaborationId;

            // 如果videoId或taskId为空，显示N/A
            const videoIdDisplay = video.videoId || '<span class="text-gray-400">N/A</span>';
            const taskIdDisplay = video.taskId || '<span class="text-gray-400">N/A</span>';
            const hasVideoId = !!video.videoId;

            return `
                <div class="talent-card p-4 border-b ${isSelected ? 'selected' : ''}" data-collaboration-id="${video.collaborationId}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900 mb-1">${video.talentName}</h4>
                            <div class="text-xs text-gray-500 space-y-0.5">
                                <div>任务ID: ${taskIdDisplay}</div>
                                <div class="flex items-center gap-1">
                                    <span>视频ID:</span>
                                    ${hasVideoId ? `
                                        <a href="https://www.douyin.com/video/${video.videoId}"
                                           target="_blank"
                                           class="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5"
                                           onclick="event.stopPropagation()">
                                            ${video.videoId}
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                            </svg>
                                        </a>
                                    ` : videoIdDisplay}
                                </div>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500">${video.collaborationDays}天</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span class="text-gray-500">播放量:</span>
                            <span class="font-semibold text-blue-600">${compactNumber(video.totalViews)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">CPM:</span>
                            <span class="font-semibold text-purple-600">¥${video.latestCpm.toFixed(1)}</span>
                        </div>
                    </div>
                    ${video.viewsGrowthRate !== 0 ? `
                        <div class="mt-2 text-xs">
                            <span class="text-gray-500">增长:</span>
                            <span class="${video.viewsGrowthRate > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${video.viewsGrowthRate > 0 ? '↑' : '↓'} ${Math.abs(video.viewsGrowthRate).toFixed(1)}%
                            </span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // 绑定点击事件
        container.querySelectorAll('.talent-card').forEach(card => {
            card.addEventListener('click', () => {
                const collaborationId = card.dataset.collaborationId;
                const video = this.filteredVideoList.find(v => v.collaborationId === collaborationId);
                if (video) {
                    this.handleVideoSelect(video);
                }
            });
        });
    }

    /**
     * 处理视频选中
     * @param {object} video - 选中的视频
     */
    async handleVideoSelect(video) {
        this.selectedVideo = video;
        this.selectedVideoDetail = video; // 数据已在聚合时计算完成

        // 重新渲染列表（更新选中状态）
        this.renderVideoList();

        // 渲染详情
        this.renderVideoDetail();
    }

    /**
     * 渲染视频详情
     */
    renderVideoDetail() {
        const container = document.getElementById('videoDetailContainer');
        if (!container || !this.selectedVideoDetail) return;

        const video = this.selectedVideoDetail;

        // 处理可能为空的videoId和taskId
        const taskIdDisplay = video.taskId || '<span class="text-gray-400">N/A</span>';
        const hasVideoId = !!video.videoId;

        container.innerHTML = `
            <!-- 标题 -->
            <div class="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
                <h3 class="text-xl font-semibold text-gray-800">📊 视频效果数据</h3>
                <div class="mt-2 text-sm text-gray-600 space-y-1">
                    <div>达人: <span class="font-medium text-gray-800">${video.talentName}</span></div>
                    <div>任务ID: <span class="font-mono text-gray-800">${taskIdDisplay}</span></div>
                    <div class="flex items-center gap-1">
                        <span>视频ID:</span>
                        ${hasVideoId ? `
                            <a href="https://www.douyin.com/video/${video.videoId}"
                               target="_blank"
                               class="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-mono">
                                ${video.videoId}
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </a>
                        ` : '<span class="font-mono text-gray-400">N/A</span>'}
                    </div>
                </div>
            </div>

            <!-- 关键指标卡片 -->
            <div class="p-4 grid grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">总播放量</div>
                    <div class="text-2xl font-bold text-blue-600">${compactNumber(video.totalViews)}</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">最新CPM</div>
                    <div class="text-2xl font-bold text-purple-600">¥${video.latestCpm.toFixed(1)}</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-sm text-gray-600 mb-1">数据天数</div>
                    <div class="text-2xl font-bold text-green-600">${video.collaborationDays}</div>
                </div>
            </div>

            <!-- 每日数据明细表 -->
            <div class="p-4 flex flex-col" style="height: calc(100vh - 320px);">
                <h4 class="text-sm font-medium text-gray-700 mb-3">📅 每日数据明细</h4>
                <div class="border rounded-lg overflow-hidden flex-1 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left text-gray-600">日期</th>
                                <th class="px-4 py-2 text-right text-gray-600">累积播放量</th>
                                <th class="px-4 py-2 text-right text-gray-600">日增量</th>
                                <th class="px-4 py-2 text-right text-gray-600">CPM</th>
                                <th class="px-4 py-2 text-right text-gray-600">CPM环比</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${video.dailyData.map((day, index) => {
                                const increaseClass = day.dailyIncrease > 0 ? 'text-green-600' : 'text-gray-600';
                                const cpmChangeClass = day.cpmChange > 0 ? 'text-red-600' : day.cpmChange < 0 ? 'text-green-600' : 'text-gray-600';
                                const cpmChangeSymbol = day.cpmChange > 0 ? '+' : '';

                                return `
                                    <tr class="border-t hover:bg-gray-50">
                                        <td class="px-4 py-2">${day.date}</td>
                                        <td class="px-4 py-2 text-right font-mono">${Format.number(day.views)}</td>
                                        <td class="px-4 py-2 text-right font-mono ${increaseClass}">
                                            ${index === 0 ? '-' : '+' + Format.number(day.dailyIncrease)}
                                        </td>
                                        <td class="px-4 py-2 text-right font-mono">¥${day.cpm.toFixed(2)}</td>
                                        <td class="px-4 py-2 text-right font-mono ${cpmChangeClass}">
                                            ${index === 0 ? '-' : cpmChangeSymbol + day.cpmChange.toFixed(2)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 隐藏空状态提示
        const emptyTip = document.getElementById('emptyStateTip');
        if (emptyTip) emptyTip.style.display = 'none';
    }

    /**
     * 渲染趋势图表
     */
    renderTrendsCharts() {
        if (!this.selectedVideoDetail) return;

        const dailyData = this.selectedVideoDetail.dailyData;

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
        // 移除了日期范围选择、搜索、排序等事件监听
        // 保持方法以防未来需要添加事件监听
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
