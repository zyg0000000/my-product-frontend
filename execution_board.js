/**
 * @file execution_board.js
 * @description 执行看板 - 跨项目发布计划管理
 * @version 1.0.0
 *
 * 功能:
 * - 支持按年月筛选项目
 * - 支持周/双周模式切换
 * - 跨项目日历视图
 * - KPI统计
 * - 发布信息编辑（基于项目状态权限控制）
 */

import { AppCore } from './common/app-core.js';

const { API, Modal, Format, Utils } = AppCore;

// 项目颜色配置
const PROJECT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

class ExecutionBoard {
    constructor() {
        // 数据
        this.allProjects = []; // 所有项目简化数据
        this.selectedProjects = []; // 当前选中月份的项目详细数据
        this.allCollaborations = []; // 所有合作数据（聚合自多个项目）
        this.projectColorMap = new Map(); // 项目ID -> 颜色映射

        // 项目周期数据
        this.projectStartDate = null; // 项目最早发布日期（倒推到周一）
        this.projectEndDate = null; // 项目最晚发布日期（延长到周日）
        this.totalWeeks = 0; // 项目总周数
        this.currentCalendarWeekIndex = 0; // 当前日历视图显示的周索引（从0开始）

        // 视图状态
        this.viewMode = 'week'; // 'week' or 'biweek'
        this.currentWeekStart = this.getMonday(new Date()); // 当前周的周一
        this.selectedYear = new Date().getFullYear();
        this.selectedMonth = `M${new Date().getMonth() + 1}`;

        // DOM元素缓存
        this.elements = this.cacheElements();

        // 绑定事件
        this.bindEvents();

        // 初始化
        this.init();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        return {
            // 筛选器
            yearSelector: document.getElementById('year-selector'),
            monthSelector: document.getElementById('month-selector'),
            btnWeekMode: document.getElementById('btn-week-mode'),
            btnBiweekMode: document.getElementById('btn-biweek-mode'),
            refreshBtn: document.getElementById('refresh-btn'),

            // KPI - 全周期统计
            kpiAllTotalPlan: document.getElementById('kpi-all-total-plan'),
            kpiAllPublishedCount: document.getElementById('kpi-all-published-count'),
            kpiAllPublishedRate: document.getElementById('kpi-all-published-rate'),
            kpiAllDelayed: document.getElementById('kpi-all-delayed'),

            // KPI - 当周统计
            currentWeekRange: document.getElementById('current-week-range'),
            kpiTotalPlan: document.getElementById('kpi-total-plan'),
            kpiPublishedCount: document.getElementById('kpi-published-count'),
            kpiPublishedRate: document.getElementById('kpi-published-rate'),
            kpiDueToday: document.getElementById('kpi-due-today'),
            kpiDueWeek: document.getElementById('kpi-due-week'),
            kpiDelayed: document.getElementById('kpi-delayed'),

            // 日历
            calendarContainer: document.getElementById('calendar-container'),
            calendarLoading: document.getElementById('calendar-loading'),
            overviewContainer: document.getElementById('project-overview-container'), // 全周期概览
            weekNav: document.getElementById('week-nav'),
            weekDisplay: document.getElementById('week-display'),
            prevWeekBtn: document.getElementById('prev-week-btn'),
            nextWeekBtn: document.getElementById('next-week-btn'),
            backToTodayBtn: document.getElementById('back-to-today-btn'),
            calendarHeaders: document.getElementById('calendar-headers'),
            calendarGrid: document.getElementById('calendar-grid'),

            // 无数据提示
            noDataMessage: document.getElementById('no-data-message'),

            // 编辑弹窗
            quickInputModal: document.getElementById('quickInputModal'),
            quickInputTitle: document.getElementById('quickInputTitle'),
            quickInputForm: document.getElementById('quickInputForm'),
            quickInputCollabId: document.getElementById('quick-input-collab-id'),
            quickInputProjectId: document.getElementById('quick-input-project-id'),
            quickInputProjectName: document.getElementById('quick-input-project-name'),
            quickInputTalentName: document.getElementById('quick-input-talent-name'),
            quickInputDate: document.getElementById('quick-input-date'),
            quickInputVideoId: document.getElementById('quick-input-videoId'),
            quickInputTaskId: document.getElementById('quick-input-taskId'),
            openVideoLinkBtn: document.getElementById('open-video-link-btn'),
            openTaskLinkBtn: document.getElementById('open-task-link-btn'),
            saveQuickInputBtn: document.getElementById('saveQuickInputBtn'),
            cancelModalBtn: document.getElementById('cancelModalBtn'),
            closeModalBtn: document.getElementById('closeModalBtn'),

            // 查看详情弹窗（只读模式）
            viewDetailModal: document.getElementById('viewDetailModal'),
            viewProjectName: document.getElementById('view-project-name'),
            viewTalentName: document.getElementById('view-talent-name'),
            viewDate: document.getElementById('view-date'),
            viewVideoId: document.getElementById('view-videoId'),
            viewTaskId: document.getElementById('view-taskId'),
            copyVideoIdBtn: document.getElementById('copy-video-id-btn'),
            copyTaskIdBtn: document.getElementById('copy-task-id-btn'),
            viewOpenVideoLinkBtn: document.getElementById('view-open-video-link-btn'),
            viewOpenTaskLinkBtn: document.getElementById('view-open-task-link-btn'),
            closeViewModalBtn: document.getElementById('closeViewModalBtn'),
            closeViewModalBtn2: document.getElementById('closeViewModalBtn2')
        };
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 年月选择
        this.elements.yearSelector.addEventListener('change', () => this.handleMonthChange());
        this.elements.monthSelector.addEventListener('change', () => this.handleMonthChange());

        // 视图模式切换
        this.elements.btnWeekMode.addEventListener('click', () => this.switchViewMode('week'));
        this.elements.btnBiweekMode.addEventListener('click', () => this.switchViewMode('biweek'));

        // 刷新按钮
        this.elements.refreshBtn.addEventListener('click', () => this.refresh());

        // 周导航
        this.elements.prevWeekBtn.addEventListener('click', () => this.navigateWeek(-1));
        this.elements.nextWeekBtn.addEventListener('click', () => this.navigateWeek(1));
        this.elements.backToTodayBtn.addEventListener('click', () => this.backToToday());

        // 日历格子点击（事件委托）
        this.elements.calendarGrid.addEventListener('click', (e) => this.handleCalendarClick(e));

        // 全周期概览点击（事件委托）
        this.elements.overviewContainer.addEventListener('click', (e) => this.handleOverviewClick(e));

        // 编辑弹窗
        this.elements.saveQuickInputBtn.addEventListener('click', () => this.saveEdit());
        this.elements.cancelModalBtn.addEventListener('click', () => this.closeModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.elements.quickInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        // 监听视频ID和任务ID输入框变化，动态启用/禁用链接按钮
        this.elements.quickInputVideoId.addEventListener('input', () => this.updateLinkButtons());
        this.elements.quickInputTaskId.addEventListener('input', () => this.updateLinkButtons());

        // 链接按钮点击事件
        this.elements.openVideoLinkBtn.addEventListener('click', () => this.openVideoLink());
        this.elements.openTaskLinkBtn.addEventListener('click', () => this.openTaskLink());

        // 查看详情弹窗
        this.elements.closeViewModalBtn.addEventListener('click', () => this.closeViewModal());
        this.elements.closeViewModalBtn2.addEventListener('click', () => this.closeViewModal());
        this.elements.copyVideoIdBtn.addEventListener('click', () => this.copyToClipboard(this.elements.viewVideoId.value, '视频ID'));
        this.elements.copyTaskIdBtn.addEventListener('click', () => this.copyToClipboard(this.elements.viewTaskId.value, '任务ID'));
        this.elements.viewOpenVideoLinkBtn.addEventListener('click', () => this.openViewVideoLink());
        this.elements.viewOpenTaskLinkBtn.addEventListener('click', () => this.openViewTaskLink());
    }

    /**
     * 初始化
     */
    async init() {
        this.initYearSelector();
        this.setDefaultMonth();
        await this.loadAllProjects();
        await this.loadSelectedMonthProjects();
    }

    /**
     * 初始化年份选择器
     */
    initYearSelector() {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

        this.elements.yearSelector.innerHTML = years.map(year =>
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
        ).join('');
    }

    /**
     * 设置默认月份（当前月）
     */
    setDefaultMonth() {
        const currentMonth = new Date().getMonth() + 1;
        this.selectedMonth = `M${currentMonth}`;
        this.elements.monthSelector.value = this.selectedMonth;
    }

    /**
     * 获取周一
     */
    getMonday(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);  // 标准化到00:00:00
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d;
    }

    /**
     * 获取合作的实际显示日期（已发布用publishDate，未发布用plannedReleaseDate）
     */
    getCollabDisplayDate(collab) {
        if (collab.status === '视频已发布' && collab.publishDate) {
            return collab.publishDate;
        }
        return collab.plannedReleaseDate;
    }

    /**
     * 加载所有项目（简化版）
     */
    async loadAllProjects() {
        try {
            const loading = Modal.showLoading('正在加载项目数据...');
            // 修复：使用正确的 API 调用，获取所有项目
            const response = await API.request('/projects');
            this.allProjects = response.data || [];
            loading.close();

            console.log(`加载了 ${this.allProjects.length} 个项目`);

            // 调试：打印前3个项目的详细信息
            if (this.allProjects.length > 0) {
                console.log('=== 项目数据样例（前3个）===');
                this.allProjects.slice(0, 3).forEach((p, i) => {
                    console.log(`项目${i + 1}:`, {
                        name: p.name,
                        financialYear: p.financialYear,
                        financialMonth: p.financialMonth,
                        yearType: typeof p.financialYear,
                        monthType: typeof p.financialMonth,
                        collaborationsCount: (p.collaborations || []).length
                    });
                });
            }
        } catch (error) {
            console.error('加载项目列表失败:', error);
            Modal.showAlert('加载项目列表失败');
        }
    }

    /**
     * 加载选中月份的项目详细数据
     */
    async loadSelectedMonthProjects() {
        // 修复：数据库存储的年份是字符串，所以这里也用字符串比较
        this.selectedYear = this.elements.yearSelector.value; // 保持字符串类型
        this.selectedMonth = this.elements.monthSelector.value;

        console.log('=== 筛选条件 ===');
        console.log('选择的年份:', this.selectedYear, '类型:', typeof this.selectedYear);
        console.log('选择的月份:', this.selectedMonth, '类型:', typeof this.selectedMonth);

        // 前端筛选该月份的项目（使用 financialYear 和 financialMonth 字段）
        this.selectedProjects = this.allProjects.filter(p => {
            const yearMatch = p.financialYear === this.selectedYear;
            const monthMatch = p.financialMonth === this.selectedMonth;

            // 调试：打印不匹配的项目信息
            if (!yearMatch || !monthMatch) {
                console.log('未匹配项目:', p.name, {
                    项目年份: p.financialYear,
                    筛选年份: this.selectedYear,
                    年份匹配: yearMatch,
                    项目月份: p.financialMonth,
                    筛选月份: this.selectedMonth,
                    月份匹配: monthMatch
                });
            }

            return yearMatch && monthMatch;
        });

        console.log(`${this.selectedYear}年${this.selectedMonth}月有 ${this.selectedProjects.length} 个项目`);

        // 输出匹配项目信息用于调试
        this.selectedProjects.forEach(p => {
            console.log(`✓ 匹配项目：${p.name}, 年份：${p.financialYear}, 月份：${p.financialMonth}, 合作数：${(p.collaborations || []).length}`);
        });

        // 如果没有项目，显示提示
        if (this.selectedProjects.length === 0) {
            this.showNoData();
            return;
        }

        // 修复：不需要再次加载详情，/projects 已经返回了完整数据
        try {
            // 聚合所有合作数据
            this.aggregateCollaborations();

            // 分配项目颜色
            this.assignProjectColors();

            // 渲染视图
            this.render();

        } catch (error) {
            console.error('处理项目数据失败:', error);
            Modal.showAlert('处理项目数据失败');
        }
    }

    /**
     * 聚合所有合作数据
     */
    aggregateCollaborations() {
        this.allCollaborations = [];

        this.selectedProjects.forEach(project => {
            const collaborations = project.collaborations || [];

            // 为每个合作添加项目信息
            collaborations.forEach(collab => {
                this.allCollaborations.push({
                    ...collab,
                    projectId: project.id,
                    projectName: project.name,
                    projectStatus: project.status,
                    projectYear: project.financialYear,
                    projectMonth: project.financialMonth
                });
            });
        });

        // 只保留"客户已定档"和"视频已发布"状态的合作
        this.allCollaborations = this.allCollaborations.filter(c =>
            c.status === '客户已定档' || c.status === '视频已发布'
        );

        console.log(`聚合了 ${this.allCollaborations.length} 个合作`);
    }

    /**
     * 分配项目颜色
     */
    assignProjectColors() {
        this.projectColorMap.clear();
        this.selectedProjects.forEach((project, index) => {
            const colorIndex = index % PROJECT_COLORS.length;
            this.projectColorMap.set(project.id, {
                color: PROJECT_COLORS[colorIndex],
                index: colorIndex
            });
        });
    }

    /**
     * 显示无数据提示
     */
    showNoData() {
        this.elements.noDataMessage.classList.remove('hidden');
        this.elements.calendarContainer.classList.add('hidden');

        // 清空KPI
        if (this.elements.kpiTotalPlan) this.elements.kpiTotalPlan.textContent = '0';
        if (this.elements.kpiPublishedCount) this.elements.kpiPublishedCount.textContent = '0';
        if (this.elements.kpiPublishedRate) this.elements.kpiPublishedRate.textContent = '0%';
        if (this.elements.kpiDueToday) this.elements.kpiDueToday.textContent = '0';
        if (this.elements.kpiDueWeek) this.elements.kpiDueWeek.textContent = '0';
        if (this.elements.kpiDelayed) this.elements.kpiDelayed.textContent = '0';
        if (this.elements.kpiRemainingDays) this.elements.kpiRemainingDays.textContent = '0';
    }

    /**
     * 渲染视图
     */
    render() {
        this.elements.noDataMessage.classList.add('hidden');
        this.elements.calendarContainer.classList.remove('hidden');

        // 计算项目周期
        this.calculateProjectCycle();

        // 渲染全周期概览
        this.renderOverview();

        // 渲染日历和KPI
        this.renderCalendar();
        this.renderKPIs();
    }

    /**
     * 计算项目周期和总周数
     */
    calculateProjectCycle() {
        // 获取所有合作的发布日期（优先使用实际发布日期）
        const dates = this.allCollaborations
            .map(c => {
                // 已发布的使用实际发布日期，未发布的使用计划发布日期
                if (c.status === '视频已发布' && c.publishDate) {
                    return c.publishDate;
                }
                return c.plannedReleaseDate;
            })
            .filter(d => d)
            .map(d => {
                // 修复时区问题：使用本地时区解析日期
                const [y, m, day] = d.split('T')[0].split('-').map(Number);
                return new Date(y, m - 1, day);
            });

        if (dates.length > 0) {
            dates.sort((a, b) => a - b);
            const earliestDate = dates[0];
            const latestDate = dates[dates.length - 1];

            // 计算起始日期所在周的周一
            const startDay = new Date(earliestDate);
            startDay.setHours(0, 0, 0, 0);
            const startDayOfWeek = startDay.getDay(); // 0=Sun, 1=Mon
            const startMonday = new Date(startDay);
            startMonday.setDate(startDay.getDate() - (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1));
            this.projectStartDate = startMonday;

            // 计算结束日期所在周的周日
            const endDay = new Date(latestDate);
            endDay.setHours(0, 0, 0, 0);
            const endDayOfWeek = endDay.getDay();
            const endSunday = new Date(endDay);
            endSunday.setDate(endDay.getDate() + (endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek));
            this.projectEndDate = endSunday;

            // 计算总周数
            const totalDays = Math.ceil((this.projectEndDate - this.projectStartDate) / (1000 * 60 * 60 * 24)) + 1;
            this.totalWeeks = Math.ceil(totalDays / 7);

            // 计算当前周索引（基于当前 currentWeekStart）
            const weeksDiff = Math.floor((this.currentWeekStart - this.projectStartDate) / (1000 * 60 * 60 * 24 * 7));
            this.currentCalendarWeekIndex = Math.max(0, Math.min(weeksDiff, this.totalWeeks - 1));

            console.log(`项目周期：${Format.date(this.projectStartDate)} - ${Format.date(this.projectEndDate)}, 共 ${this.totalWeeks} 周`);
        } else {
            this.projectStartDate = null;
            this.projectEndDate = null;
            this.totalWeeks = 0;
            this.currentCalendarWeekIndex = 0;
        }
    }

    /**
     * 渲染全周期概览
     */
    renderOverview() {
        if (!this.elements.overviewContainer || !this.projectStartDate || this.totalWeeks <= 0) {
            if (this.elements.overviewContainer) {
                this.elements.overviewContainer.innerHTML = '<p class="col-span-7 text-sm text-center text-gray-500 py-4">暂无项目周期数据</p>';
            }
            return;
        }

        let overviewHtml = '';
        const startOfWeek = new Date(this.projectStartDate);

        for (let i = 0; i < this.totalWeeks; i++) {
            const weekStartDate = new Date(startOfWeek);
            weekStartDate.setDate(startOfWeek.getDate() + i * 7);
            weekStartDate.setHours(0, 0, 0, 0);  // 确保时间部分为0

            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6);
            weekEndDate.setHours(23, 59, 59, 999);  // 确保包含整天

            const isCurrentWeek = i === this.currentCalendarWeekIndex;
            const weekClass = isCurrentWeek ? 'current' : '';

            // 统计本周状态（使用实际显示日期）
            const weekCollabs = this.allCollaborations.filter(c => {
                const displayDate = this.getCollabDisplayDate(c);
                if (!displayDate) return false;
                // 修复时区问题：使用本地时区解析日期
                const [y, m, d] = displayDate.split('T')[0].split('-').map(Number);
                const date = new Date(y, m - 1, d);
                date.setHours(0, 0, 0, 0);  // 标准化到00:00:00进行比较
                return date >= weekStartDate && date <= weekEndDate;
            });

            // 添加调试日志
            if (weekCollabs.length > 0) {
                console.log(`第${i + 1}周 (${Format.date(weekStartDate, 'MM.DD')}-${Format.date(weekEndDate, 'MM.DD')}): 统计到 ${weekCollabs.length} 个合作`,
                    weekCollabs.map(c => ({
                        kol: c.kolName,
                        displayDate: this.getCollabDisplayDate(c),
                        status: c.status
                    }))
                );
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const statusCounts = weekCollabs.reduce((acc, c) => {
                if (c.status === '视频已发布') {
                    acc.published++;
                } else if (c.status === '客户已定档') {
                    // 延期判断：计划发布日期 < 今天，但还没发布
                    if (c.plannedReleaseDate) {
                        // 修复时区问题：使用本地时区解析日期
                        const [y, m, d] = c.plannedReleaseDate.split('T')[0].split('-').map(Number);
                        const planned = new Date(y, m - 1, d);
                        if (planned < today) {
                            acc.delayed++;
                        } else {
                            acc.scheduled++;
                        }
                    } else {
                        acc.scheduled++;
                    }
                }
                return acc;
            }, { published: 0, scheduled: 0, delayed: 0 });

            let dotsHtml = '';
            if (statusCounts.published > 0) dotsHtml += `<span class="status-dot dot-published" title="已发布"></span>`;
            if (statusCounts.scheduled > 0) dotsHtml += `<span class="status-dot dot-scheduled" title="待发布"></span>`;
            if (statusCounts.delayed > 0) dotsHtml += `<span class="status-dot dot-delayed" title="延期"></span>`;

            overviewHtml += `
                <div class="overview-week text-center border border-gray-200 rounded bg-white p-3 ${weekClass}" data-week-index="${i}">
                    <p class="text-xs ${isCurrentWeek ? 'text-blue-700 font-semibold' : 'text-gray-500'} mb-0.5">第${i + 1}周${isCurrentWeek ? '(当前)' : ''}</p>
                    <p class="text-xs font-medium ${isCurrentWeek ? 'text-blue-900' : ''}">${Format.date(weekStartDate, 'MM.DD')}-${Format.date(weekEndDate, 'MM.DD')}</p>
                    <div class="mt-1 flex justify-center gap-0.5 h-[6px]">${dotsHtml || '&nbsp;'}</div>
                    <p class="text-xs ${isCurrentWeek ? 'text-blue-700' : 'text-gray-600'} mt-1">${statusCounts.published}/${weekCollabs.length}</p>
                </div>
            `;
        }

        this.elements.overviewContainer.innerHTML = overviewHtml;
    }

    /**
     * 渲染日历
     */
    renderCalendar() {
        // 修复：简化为只支持周模式
        const days = 7;

        // 更新周导航显示
        const endDate = new Date(this.currentWeekStart);
        endDate.setDate(endDate.getDate() + days - 1);
        this.elements.weekDisplay.textContent =
            `${Format.date(this.currentWeekStart, 'YYYY-MM-DD')} - ${Format.date(endDate, 'YYYY-MM-DD')}`;

        // 渲染日历格子
        this.renderDays();
    }

    // 移除 renderHeaders 方法，HTML 中已经固定了星期标题

    /**
     * 渲染日历格子 (简化为仅支持周模式)
     */
    renderDays() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = Format.date(today);

        // 周模式：一行7天
        this.elements.calendarGrid.className = `grid grid-cols-7 gap-3`;
        let gridHtml = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);
            const dateStr = Format.date(date);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isToday = dateStr === todayStr;

            // 获取该日期的合作（使用实际显示日期）
            const dayCollabs = this.allCollaborations.filter(c => {
                const displayDate = this.getCollabDisplayDate(c);
                return displayDate && Format.date(new Date(displayDate)) === dateStr;
            });

            gridHtml += `
                <div class="calendar-day border rounded-lg ${isWeekend ? 'weekend-day' : ''} ${isToday ? 'today-indicator' : ''}"
                     data-date="${dateStr}">
                    <div class="day-header">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-sm font-medium ${isToday ? 'text-blue-900' : 'text-gray-900'}">${date.getDate()}日</span>
                            </div>
                            <span class="text-xs text-gray-500">${dayCollabs.length}个</span>
                        </div>
                    </div>
                    <div class="day-content custom-scrollbar">
                        ${this.renderDayCollabs(dayCollabs, date)}
                    </div>
                </div>
            `;
        }

        this.elements.calendarGrid.innerHTML = gridHtml;
    }

    /**
     * 渲染某天的达人卡片
     */
    renderDayCollabs(collabs, date) {
        if (collabs.length === 0) {
            return '<p class="text-center text-gray-400 text-xs mt-4">暂无安排</p>';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return collabs.map(collab => {
            const project = this.selectedProjects.find(p => p.id === collab.projectId);
            const projectColor = this.projectColorMap.get(collab.projectId);
            const talentName = collab.talentInfo?.nickname || '未知达人';

            // 判断状态
            let statusClass = 'status-scheduled';
            let statusText = '待发布';
            if (collab.status === '视频已发布') {
                statusClass = 'status-published';
                statusText = '已发布';
            } else if (collab.status === '客户已定档' && collab.plannedReleaseDate) {
                // 延期判断：计划发布日期 < 今天，但还没发布
                // 修复时区问题：使用本地时区解析日期
                const [y, m, d] = collab.plannedReleaseDate.split('T')[0].split('-').map(Number);
                const plannedDate = new Date(y, m - 1, d);
                if (plannedDate < today) {
                    statusClass = 'status-delayed';
                    statusText = '延期';
                }
            }

            // 判断是否可编辑（基于项目状态）
            const isEditable = project && project.status === '执行中';
            const disabledClass = isEditable ? '' : 'disabled';
            const colorClass = projectColor ? `project-color-${projectColor.index}` : '';

            return `
                <div class="talent-card ${statusClass} ${colorClass} ${disabledClass}"
                     data-collab-id="${collab.id}"
                     data-project-id="${collab.projectId}"
                     data-editable="${isEditable}">
                    <div class="text-xs font-medium text-gray-700 mb-1">[${collab.projectName}]</div>
                    <div class="text-sm font-medium text-gray-900">${talentName}</div>
                    <div class="text-xs text-gray-500 mt-1">${statusText}</div>
                    ${!isEditable ? '<div class="text-xs text-gray-400 mt-1">已结束</div>' : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * 渲染KPI (区分全周期统计和当周统计)
     */
    renderKPIs() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = Format.date(today);

        // ===== 全周期统计 =====
        const allTotalPlan = this.allCollaborations.length;
        const allPublishedCount = this.allCollaborations.filter(c => c.status === '视频已发布').length;
        const allPublishedRate = allTotalPlan > 0 ? (allPublishedCount / allTotalPlan * 100) : 0;

        // 全周期延期：计划发布日期 < 今天且未发布
        const allDelayedCount = this.allCollaborations.filter(c => {
            if (!c.plannedReleaseDate || c.status === '视频已发布') return false;
            // 修复时区问题：使用本地时区解析日期
            const [y, m, d] = c.plannedReleaseDate.split('T')[0].split('-').map(Number);
            const plannedDate = new Date(y, m - 1, d);
            return plannedDate < today;
        }).length;

        // 更新全周期统计DOM
        if (this.elements.kpiAllTotalPlan) this.elements.kpiAllTotalPlan.textContent = allTotalPlan;
        if (this.elements.kpiAllPublishedCount) this.elements.kpiAllPublishedCount.textContent = allPublishedCount;
        if (this.elements.kpiAllPublishedRate) this.elements.kpiAllPublishedRate.textContent = Format.percent(allPublishedRate, 1);
        if (this.elements.kpiAllDelayed) this.elements.kpiAllDelayed.textContent = allDelayedCount;

        // ===== 当周统计 =====
        // 获取当前显示周期的合作数据 (固定为7天)，使用实际显示日期
        const days = 7;
        const periodEnd = new Date(this.currentWeekStart);
        periodEnd.setDate(periodEnd.getDate() + days - 1);
        periodEnd.setHours(23, 59, 59, 999);  // 确保包含整天

        // 更新当前周时间范围显示
        if (this.elements.currentWeekRange) {
            const rangeText = `(${Format.date(this.currentWeekStart, 'YYYY-MM-DD')} ~ ${Format.date(periodEnd, 'YYYY-MM-DD')})`;
            this.elements.currentWeekRange.textContent = rangeText;
        }

        const periodCollabs = this.allCollaborations.filter(c => {
            const displayDate = this.getCollabDisplayDate(c);
            if (!displayDate) return false;
            // 修复时区问题：使用本地时区解析日期
            const [y, m, d] = displayDate.split('T')[0].split('-').map(Number);
            const collabDate = new Date(y, m - 1, d);
            collabDate.setHours(0, 0, 0, 0);  // 标准化到00:00:00进行比较
            return collabDate >= this.currentWeekStart && collabDate <= periodEnd;
        });

        // 添加调试日志
        console.log(`当周统计范围: ${Format.date(this.currentWeekStart, 'YYYY-MM-DD')} ~ ${Format.date(periodEnd, 'YYYY-MM-DD')}`);
        console.log(`当周统计到 ${periodCollabs.length} 个合作:`,
            periodCollabs.map(c => ({
                kol: c.kolName,
                displayDate: this.getCollabDisplayDate(c),
                status: c.status,
                project: c.projectName
            }))
        );

        const totalPlan = periodCollabs.length;
        const publishedCount = periodCollabs.filter(c => c.status === '视频已发布').length;
        const publishedRate = totalPlan > 0 ? (publishedCount / totalPlan * 100) : 0;

        // 今日到期：计划发布日期是今天且未发布
        const dueTodayCount = periodCollabs.filter(c =>
            c.plannedReleaseDate && Format.date(new Date(c.plannedReleaseDate)) === todayStr && c.status !== '视频已发布'
        ).length;

        // 本周到期（今天到本周日）：计划发布日期在今天到本周日之间且未发布
        const sunday = new Date(today);
        sunday.setDate(today.getDate() + (7 - today.getDay()));
        const dueWeekCount = periodCollabs.filter(c => {
            if (!c.plannedReleaseDate || c.status === '视频已发布') return false;
            // 修复时区问题：使用本地时区解析日期
            const [y, m, d] = c.plannedReleaseDate.split('T')[0].split('-').map(Number);
            const plannedDate = new Date(y, m - 1, d);
            return plannedDate >= today && plannedDate <= sunday;
        }).length;

        // 延期：计划发布日期 < 今天且未发布
        const delayedCount = periodCollabs.filter(c => {
            if (!c.plannedReleaseDate || c.status === '视频已发布') return false;
            // 修复时区问题：使用本地时区解析日期
            const [y, m, d] = c.plannedReleaseDate.split('T')[0].split('-').map(Number);
            const plannedDate = new Date(y, m - 1, d);
            return plannedDate < today;
        }).length;

        // 更新当周统计DOM
        if (this.elements.kpiTotalPlan) this.elements.kpiTotalPlan.textContent = totalPlan;
        if (this.elements.kpiPublishedCount) this.elements.kpiPublishedCount.textContent = publishedCount;
        if (this.elements.kpiPublishedRate) this.elements.kpiPublishedRate.textContent = Format.percent(publishedRate, 1);
        if (this.elements.kpiDueToday) this.elements.kpiDueToday.textContent = dueTodayCount;
        if (this.elements.kpiDueWeek) this.elements.kpiDueWeek.textContent = dueWeekCount;
        if (this.elements.kpiDelayed) this.elements.kpiDelayed.textContent = delayedCount;
    }

    /**
     * 处理月份变更
     */
    async handleMonthChange() {
        await this.loadSelectedMonthProjects();
    }

    /**
     * 切换视图模式
     */
    switchViewMode(mode) {
        this.viewMode = mode;

        // 更新按钮状态
        if (mode === 'week') {
            this.elements.btnWeekMode.classList.add('active');
            this.elements.btnBiweekMode.classList.remove('active');
        } else {
            this.elements.btnBiweekMode.classList.add('active');
            this.elements.btnWeekMode.classList.remove('active');
        }

        this.render();
    }

    /**
     * 周导航 (简化为仅支持周模式)
     */
    navigateWeek(direction) {
        const daysToMove = 7;
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (direction * daysToMove));

        // 更新当前周索引
        if (this.projectStartDate) {
            const weeksDiff = Math.floor((this.currentWeekStart - this.projectStartDate) / (1000 * 60 * 60 * 24 * 7));
            this.currentCalendarWeekIndex = Math.max(0, Math.min(weeksDiff, this.totalWeeks - 1));
        }

        // 重新渲染全周期概览和日历
        this.renderOverview();
        this.renderCalendar();
    }

    /**
     * 回到今天
     */
    backToToday() {
        this.currentWeekStart = this.getMonday(new Date());

        // 更新当前周索引
        if (this.projectStartDate) {
            const weeksDiff = Math.floor((this.currentWeekStart - this.projectStartDate) / (1000 * 60 * 60 * 24 * 7));
            this.currentCalendarWeekIndex = Math.max(0, Math.min(weeksDiff, this.totalWeeks - 1));
        }

        // 重新渲染全周期概览和日历
        this.renderOverview();
        this.renderCalendar();
    }

    /**
     * 刷新数据
     */
    async refresh() {
        await this.loadAllProjects();
        await this.loadSelectedMonthProjects();
    }

    /**
     * 处理全周期概览点击事件
     */
    handleOverviewClick(e) {
        const weekCard = e.target.closest('.overview-week');
        if (!weekCard) return;

        const weekIndex = parseInt(weekCard.dataset.weekIndex);
        if (isNaN(weekIndex)) return;

        // 计算该周的周一日期
        const newWeekStart = new Date(this.projectStartDate);
        newWeekStart.setDate(this.projectStartDate.getDate() + weekIndex * 7);

        // 更新当前周
        this.currentWeekStart = newWeekStart;
        this.currentCalendarWeekIndex = weekIndex;

        // 重新渲染全周期概览和日历
        this.renderOverview();
        this.renderCalendar();
    }

    /**
     * 处理日历点击事件
     */
    handleCalendarClick(e) {
        const card = e.target.closest('.talent-card');
        if (!card) return;

        const collabId = card.dataset.collabId;
        const isEditable = card.dataset.editable === 'true';

        if (!isEditable) {
            // 打开查看详情弹窗（只读模式）
            this.openViewModal(collabId);
        } else {
            // 打开编辑弹窗
            this.openEditModal(collabId);
        }
    }

    /**
     * 打开编辑弹窗
     */
    openEditModal(collabId) {
        const collab = this.allCollaborations.find(c => c.id === collabId);
        if (!collab) return;

        this.elements.quickInputCollabId.value = collabId;
        this.elements.quickInputProjectId.value = collab.projectId;
        this.elements.quickInputProjectName.value = collab.projectName;
        this.elements.quickInputTalentName.value = collab.talentInfo?.nickname || '未知达人';

        // 修复：根据状态显示不同的日期
        // 已发布：显示实际发布日期
        // 未发布：显示计划发布日期
        if (collab.status === '视频已发布' && collab.publishDate) {
            this.elements.quickInputDate.value = collab.publishDate;
        } else {
            this.elements.quickInputDate.value = collab.plannedReleaseDate || '';
        }

        this.elements.quickInputVideoId.value = collab.videoId || '';
        this.elements.quickInputTaskId.value = collab.taskId || '';

        // 更新链接按钮状态
        this.updateLinkButtons();

        this.elements.quickInputModal.classList.remove('hidden');
        this.elements.quickInputModal.classList.add('flex');
    }

    /**
     * 关闭弹窗
     */
    closeModal() {
        this.elements.quickInputModal.classList.add('hidden');
        this.elements.quickInputModal.classList.remove('flex');
        this.elements.quickInputForm.reset();
        // 重置链接按钮状态
        this.updateLinkButtons();
    }

    /**
     * 更新链接按钮的启用/禁用状态
     */
    updateLinkButtons() {
        const videoId = this.elements.quickInputVideoId.value.trim();
        const taskId = this.elements.quickInputTaskId.value.trim();

        // 视频ID按钮：有视频ID时启用
        this.elements.openVideoLinkBtn.disabled = !videoId;

        // 任务ID按钮：有任务ID时启用
        this.elements.openTaskLinkBtn.disabled = !taskId;
    }

    /**
     * 打开抖音视频链接
     */
    openVideoLink() {
        const videoId = this.elements.quickInputVideoId.value.trim();
        if (!videoId) {
            Modal.showAlert('请先输入视频ID');
            return;
        }

        const url = `https://www.douyin.com/video/${videoId}`;
        window.open(url, '_blank');
    }

    /**
     * 打开星图任务链接
     */
    openTaskLink() {
        const taskId = this.elements.quickInputTaskId.value.trim();
        if (!taskId) {
            Modal.showAlert('请先输入任务ID');
            return;
        }

        const url = `https://www.xingtu.cn/ad/creator/task/detail/${taskId}`;
        window.open(url, '_blank');
    }

    /**
     * 打开查看详情弹窗（只读模式）
     */
    openViewModal(collabId) {
        const collab = this.allCollaborations.find(c => c.id === collabId);
        if (!collab) return;

        const project = this.selectedProjects.find(p => p.id === collab.projectId);
        const talentName = collab.talentInfo?.nickname || '未知达人';

        // 填充数据
        this.elements.viewProjectName.value = collab.projectName || '';
        this.elements.viewTalentName.value = talentName;

        // 显示正确的日期
        if (collab.status === '视频已发布' && collab.publishDate) {
            this.elements.viewDate.value = collab.publishDate;
        } else {
            this.elements.viewDate.value = collab.plannedReleaseDate || '';
        }

        this.elements.viewVideoId.value = collab.videoId || '';
        this.elements.viewTaskId.value = collab.taskId || '';

        // 更新复制和链接按钮状态
        const hasVideoId = !!collab.videoId;
        const hasTaskId = !!collab.taskId;

        this.elements.copyVideoIdBtn.disabled = !hasVideoId;
        this.elements.viewOpenVideoLinkBtn.disabled = !hasVideoId;
        this.elements.copyTaskIdBtn.disabled = !hasTaskId;
        this.elements.viewOpenTaskLinkBtn.disabled = !hasTaskId;

        // 显示弹窗
        this.elements.viewDetailModal.classList.remove('hidden');
        this.elements.viewDetailModal.classList.add('flex');
    }

    /**
     * 关闭查看详情弹窗
     */
    closeViewModal() {
        this.elements.viewDetailModal.classList.add('hidden');
        this.elements.viewDetailModal.classList.remove('flex');
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text, label) {
        if (!text) {
            Modal.showAlert(`${label}为空，无法复制`);
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            Modal.showAlert(`${label}已复制：${text}`);
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                Modal.showAlert(`${label}已复制：${text}`);
            } catch (e) {
                Modal.showAlert('复制失败，请手动复制');
            }
            document.body.removeChild(textarea);
        }
    }

    /**
     * 打开抖音视频链接（查看模式）
     */
    openViewVideoLink() {
        const videoId = this.elements.viewVideoId.value.trim();
        if (!videoId) {
            Modal.showAlert('视频ID为空');
            return;
        }

        const url = `https://www.douyin.com/video/${videoId}`;
        window.open(url, '_blank');
    }

    /**
     * 打开星图任务链接（查看模式）
     */
    openViewTaskLink() {
        const taskId = this.elements.viewTaskId.value.trim();
        if (!taskId) {
            Modal.showAlert('任务ID为空');
            return;
        }

        const url = `https://www.xingtu.cn/ad/creator/task/detail/${taskId}`;
        window.open(url, '_blank');
    }

    /**
     * 保存编辑
     */
    async saveEdit() {
        const collabId = this.elements.quickInputCollabId.value;
        const dateValue = this.elements.quickInputDate.value;
        const videoId = this.elements.quickInputVideoId.value.trim();
        const taskId = this.elements.quickInputTaskId.value.trim();

        if (!dateValue) {
            Modal.showAlert('请选择发布日期');
            return;
        }

        const payload = {
            id: collabId,
            videoId: videoId || null,
            taskId: taskId || null
        };

        // 自动判断状态并设置对应的日期字段
        if (videoId || taskId) {
            // 已发布：设置实际发布日期和状态
            payload.status = '视频已发布';
            payload.publishDate = dateValue;
            // 如果之前没有计划日期，也设置一下
            payload.plannedReleaseDate = dateValue;
        } else {
            // 未发布：只设置计划发布日期
            payload.status = '客户已定档';
            payload.plannedReleaseDate = dateValue;
        }

        try {
            this.elements.saveQuickInputBtn.disabled = true;
            this.elements.saveQuickInputBtn.textContent = '保存中...';

            await API.request('/update-collaboration', 'PUT', payload);

            this.closeModal();
            Modal.showAlert('保存成功！', '成功', async () => {
                // 重新加载数据
                await this.loadSelectedMonthProjects();
            });

        } catch (error) {
            // API已处理错误提示
        } finally {
            this.elements.saveQuickInputBtn.disabled = false;
            this.elements.saveQuickInputBtn.textContent = '保存';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ExecutionBoard();
});
