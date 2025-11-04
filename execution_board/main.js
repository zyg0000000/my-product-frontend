/**
 * @file main.js
 * @description 执行看板主入口 - 协调所有模块
 * @version 2.0.0
 *
 * 功能:
 * - 支持按年月筛选项目
 * - 跨项目日历视图
 * - KPI统计
 * - 发布信息编辑（基于项目状态权限控制）
 */

import { DataManager } from './data-manager.js';
import { CalendarView } from './calendar-view.js';
import { OverviewPanel } from './overview-panel.js';
import { KPIPanel } from './kpi-panel.js';
import { FilterPanel } from './filter-panel.js';
import { ModalEdit } from './modal-edit.js';
import { ModalView } from './modal-view.js';

class ExecutionBoard {
    constructor() {
        // DOM元素缓存
        this.elements = this.cacheElements();

        // 初始化各个模块
        this.dataManager = new DataManager();
        this.calendarView = new CalendarView(this.dataManager, this.elements);
        this.overviewPanel = new OverviewPanel(this.dataManager, this.calendarView, this.elements);
        this.kpiPanel = new KPIPanel(this.dataManager, this.calendarView, this.elements);
        this.filterPanel = new FilterPanel(this.elements);
        this.modalEdit = new ModalEdit(this.dataManager, this.elements);
        this.modalView = new ModalView(this.dataManager, this.elements);

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
        this.elements.cancelModalBtn.addEventListener('click', () => this.modalEdit.closeModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.modalEdit.closeModal());
        this.elements.quickInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        // 监听视频ID和任务ID输入框变化，动态启用/禁用链接按钮
        this.elements.quickInputVideoId.addEventListener('input', () => this.modalEdit.updateLinkButtons());
        this.elements.quickInputTaskId.addEventListener('input', () => this.modalEdit.updateLinkButtons());

        // 链接按钮点击事件
        this.elements.openVideoLinkBtn.addEventListener('click', () => this.modalEdit.openVideoLink());
        this.elements.openTaskLinkBtn.addEventListener('click', () => this.modalEdit.openTaskLink());

        // 查看详情弹窗
        this.elements.closeViewModalBtn.addEventListener('click', () => this.modalView.closeViewModal());
        this.elements.closeViewModalBtn2.addEventListener('click', () => this.modalView.closeViewModal());
        this.elements.copyVideoIdBtn.addEventListener('click', () => this.modalView.copyToClipboard(this.elements.viewVideoId.value, '视频ID'));
        this.elements.copyTaskIdBtn.addEventListener('click', () => this.modalView.copyToClipboard(this.elements.viewTaskId.value, '任务ID'));
        this.elements.viewOpenVideoLinkBtn.addEventListener('click', () => this.modalView.openViewVideoLink());
        this.elements.viewOpenTaskLinkBtn.addEventListener('click', () => this.modalView.openViewTaskLink());
    }

    /**
     * 初始化
     */
    async init() {
        this.filterPanel.initYearSelector();
        this.filterPanel.setDefaultMonth();
        await this.dataManager.loadAllProjects();
        await this.loadSelectedMonthProjects();
    }

    /**
     * 加载选中月份的项目
     */
    async loadSelectedMonthProjects() {
        const year = this.filterPanel.getSelectedYear();
        const month = this.filterPanel.getSelectedMonth();

        const result = await this.dataManager.loadSelectedMonthProjects(year, month);

        // 如果没有项目，显示提示
        if (!result.hasProjects) {
            this.showNoData();
            return;
        }

        // 渲染视图
        this.render();
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
        if (this.elements.kpiAllTotalPlan) this.elements.kpiAllTotalPlan.textContent = '0';
        if (this.elements.kpiAllPublishedCount) this.elements.kpiAllPublishedCount.textContent = '0';
        if (this.elements.kpiAllPublishedRate) this.elements.kpiAllPublishedRate.textContent = '0%';
        if (this.elements.kpiAllDelayed) this.elements.kpiAllDelayed.textContent = '0';
    }

    /**
     * 渲染视图
     */
    render() {
        this.elements.noDataMessage.classList.add('hidden');
        this.elements.calendarContainer.classList.remove('hidden');

        // 计算项目周期
        this.calendarView.calculateProjectCycle();

        // 渲染全周期概览
        this.overviewPanel.renderOverview();

        // 渲染日历和KPI
        this.calendarView.renderCalendar();
        this.kpiPanel.renderKPIs();
    }

    /**
     * 处理月份变更
     */
    async handleMonthChange() {
        await this.loadSelectedMonthProjects();
    }

    /**
     * 周导航
     */
    navigateWeek(direction) {
        this.calendarView.navigateWeek(direction);

        // 重新渲染全周期概览和日历
        this.overviewPanel.renderOverview();
        this.calendarView.renderCalendar();
        this.kpiPanel.renderKPIs();
    }

    /**
     * 回到今天
     */
    backToToday() {
        this.calendarView.backToToday();

        // 重新渲染全周期概览和日历
        this.overviewPanel.renderOverview();
        this.calendarView.renderCalendar();
        this.kpiPanel.renderKPIs();
    }

    /**
     * 刷新数据
     */
    async refresh() {
        await this.dataManager.loadAllProjects();
        await this.loadSelectedMonthProjects();
    }

    /**
     * 处理全周期概览点击事件
     */
    handleOverviewClick(e) {
        const handled = this.overviewPanel.handleOverviewClick(e);
        if (handled) {
            // 重新渲染全周期概览和日历
            this.overviewPanel.renderOverview();
            this.calendarView.renderCalendar();
            this.kpiPanel.renderKPIs();
        }
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
            this.modalView.openViewModal(collabId);
        } else {
            // 打开编辑弹窗
            this.modalEdit.openEditModal(collabId);
        }
    }

    /**
     * 保存编辑
     */
    async saveEdit() {
        await this.modalEdit.saveEdit(async () => {
            // 重新加载数据
            await this.loadSelectedMonthProjects();
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ExecutionBoard();
});
