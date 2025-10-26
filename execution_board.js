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

            // KPI
            kpiTotalPlan: document.getElementById('kpi-total-plan'),
            kpiPublishedCount: document.getElementById('kpi-published-count'),
            kpiPublishedRate: document.getElementById('kpi-published-rate'),
            kpiDueToday: document.getElementById('kpi-due-today'),
            kpiDueWeek: document.getElementById('kpi-due-week'),
            kpiDelayed: document.getElementById('kpi-delayed'),
            kpiRemainingDays: document.getElementById('kpi-remaining-days'),

            // 日历
            calendarContainer: document.getElementById('calendar-container'),
            calendarLoading: document.getElementById('calendar-loading'),
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
            saveQuickInputBtn: document.getElementById('saveQuickInputBtn'),
            cancelModalBtn: document.getElementById('cancelModalBtn'),
            closeModalBtn: document.getElementById('closeModalBtn')
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

        // 编辑弹窗
        this.elements.saveQuickInputBtn.addEventListener('click', () => this.saveEdit());
        this.elements.cancelModalBtn.addEventListener('click', () => this.closeModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.elements.quickInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });
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
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
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
        } catch (error) {
            console.error('加载项目列表失败:', error);
            Modal.showAlert('加载项目列表失败');
        }
    }

    /**
     * 加载选中月份的项目详细数据
     */
    async loadSelectedMonthProjects() {
        this.selectedYear = parseInt(this.elements.yearSelector.value);
        this.selectedMonth = this.elements.monthSelector.value;

        // 前端筛选该月份的项目（使用 financialYear 和 financialMonth 字段）
        this.selectedProjects = this.allProjects.filter(p =>
            p.financialYear === this.selectedYear && p.financialMonth === this.selectedMonth
        );

        console.log(`${this.selectedYear}年${this.selectedMonth}月有 ${this.selectedProjects.length} 个项目`);

        // 输出项目信息用于调试
        this.selectedProjects.forEach(p => {
            console.log(`项目：${p.name}, 年份：${p.financialYear}, 月份：${p.financialMonth}, 合作数：${(p.collaborations || []).length}`);
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

        this.renderCalendar();
        this.renderKPIs();
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

            // 获取该日期的合作
            const dayCollabs = this.allCollaborations.filter(c => c.plannedReleaseDate === dateStr);

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
        const plannedDate = new Date(date);
        plannedDate.setHours(0, 0, 0, 0);

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
            } else if (plannedDate < today) {
                statusClass = 'status-delayed';
                statusText = '延期';
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
     * 渲染KPI (简化为仅支持周模式)
     */
    renderKPIs() {
        // 获取当前显示周期的合作数据 (固定为7天)
        const days = 7;
        const periodEnd = new Date(this.currentWeekStart);
        periodEnd.setDate(periodEnd.getDate() + days - 1);

        const periodCollabs = this.allCollaborations.filter(c => {
            const collabDate = new Date(c.plannedReleaseDate);
            return collabDate >= this.currentWeekStart && collabDate <= periodEnd;
        });

        const totalPlan = periodCollabs.length;
        const publishedCount = periodCollabs.filter(c => c.status === '视频已发布').length;
        const publishedRate = totalPlan > 0 ? (publishedCount / totalPlan * 100) : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = Format.date(today);

        const dueTodayCount = periodCollabs.filter(c =>
            c.plannedReleaseDate === todayStr && c.status !== '视频已发布'
        ).length;

        // 本周到期（今天到本周日）
        const sunday = new Date(today);
        sunday.setDate(today.getDate() + (7 - today.getDay()));
        const dueWeekCount = periodCollabs.filter(c => {
            const collabDate = new Date(c.plannedReleaseDate);
            return collabDate >= today && collabDate <= sunday && c.status !== '视频已发布';
        }).length;

        const delayedCount = periodCollabs.filter(c => {
            const collabDate = new Date(c.plannedReleaseDate);
            return collabDate < today && c.status !== '视频已发布';
        }).length;

        const remainingDays = Math.max(0, Utils.daysBetween(today, periodEnd));

        // 更新DOM
        if (this.elements.kpiTotalPlan) this.elements.kpiTotalPlan.textContent = totalPlan;
        if (this.elements.kpiPublishedCount) this.elements.kpiPublishedCount.textContent = publishedCount;
        if (this.elements.kpiPublishedRate) this.elements.kpiPublishedRate.textContent = Format.percent(publishedRate, 1);
        if (this.elements.kpiDueToday) this.elements.kpiDueToday.textContent = dueTodayCount;
        if (this.elements.kpiDueWeek) this.elements.kpiDueWeek.textContent = dueWeekCount;
        if (this.elements.kpiDelayed) this.elements.kpiDelayed.textContent = delayedCount;
        if (this.elements.kpiRemainingDays) this.elements.kpiRemainingDays.textContent = remainingDays;
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
        this.render();
    }

    /**
     * 回到今天
     */
    backToToday() {
        this.currentWeekStart = this.getMonday(new Date());
        this.render();
    }

    /**
     * 刷新数据
     */
    async refresh() {
        await this.loadAllProjects();
        await this.loadSelectedMonthProjects();
    }

    /**
     * 处理日历点击事件
     */
    handleCalendarClick(e) {
        const card = e.target.closest('.talent-card');
        if (!card) return;

        const isEditable = card.dataset.editable === 'true';
        if (!isEditable) {
            Modal.showAlert('该项目已结束，不可编辑发布信息');
            return;
        }

        const collabId = card.dataset.collabId;
        this.openEditModal(collabId);
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
        this.elements.quickInputDate.value = collab.plannedReleaseDate || '';
        this.elements.quickInputVideoId.value = collab.videoId || '';
        this.elements.quickInputTaskId.value = collab.taskId || '';

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
    }

    /**
     * 保存编辑
     */
    async saveEdit() {
        const collabId = this.elements.quickInputCollabId.value;
        const plannedReleaseDate = this.elements.quickInputDate.value;
        const videoId = this.elements.quickInputVideoId.value.trim();
        const taskId = this.elements.quickInputTaskId.value.trim();

        if (!plannedReleaseDate) {
            Modal.showAlert('请选择发布日期');
            return;
        }

        const payload = {
            id: collabId,
            plannedReleaseDate,
            videoId: videoId || null,
            taskId: taskId || null
        };

        // 自动判断状态
        if (videoId || taskId) {
            payload.status = '视频已发布';
        } else {
            payload.status = '客户已定档';
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
