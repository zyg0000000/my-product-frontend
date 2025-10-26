/**
 * @file order_list/tab-performance.js
 * @description 执行信息 Tab 模块 (优化版 - 包含日历和列表视图)
 * @version 2.1.0 (Status Filter Fix)
 *
 * 变更日志:
 * - v2.1.0:
 * - [核心修复] 增加了对合作状态的过滤。
 * - `load()` 方法现在会从 `this.allCollaborations` 过滤出 '客户已定档' 和 '视频已发布' 状态的数据到 `this.filteredCollaborations` 中。
 * - 所有的 KPI 和视图渲染方法 (renderKPIs, renderCalendarView 等) 现在都使用 `this.filteredCollaborations` 进行计算，解决了数据不准确和 NaN 错误。
 *
 * 功能:
 * - 加载项目合作数据
 * - 渲染 KPI、项目周期概览
 * - 实现日历视图和列表视图的切换
 * ... (其他功能)
 */

import { AppCore } from '../common/app-core.js';

// 解构 AppCore 以方便使用
const { API, Modal, Format, Pagination, Utils } = AppCore;

export class PerformanceTab {
    constructor(projectId, project, allCollaborations) { // [v1.2.0] 接收全量数据
        this.projectId = projectId;
        this.project = project;
        this.allCollaborations = allCollaborations; // [v1.2.0] 存储全量数据

        // [v2.1.0 新增] 存储过滤后的执行数据
        this.filteredCollaborations = []; 

        // 数据
        this.projectStartDate = null;
        this.projectEndDate = null;
        this.totalWeeks = 0;
        this.currentCalendarWeek = 0; // 当前日历视图显示的周数 (从1开始)

        // 视图状态
        this.currentViewMode = 'calendar'; // 'calendar' or 'list'
        this.listCurrentPage = 1;
        this.listItemsPerPage = 10; // 列表视图每页显示数量
        this.editingListRowId = null; // 列表视图中正在编辑的行ID

        // DOM 元素缓存
        this.elements = this.cacheElements();

        // 绑定 this
        this.handleViewToggle = this.handleViewToggle.bind(this);
        this.handleWeekNav = this.handleWeekNav.bind(this);
        this.handleCalendarInteraction = this.handleCalendarInteraction.bind(this);
        this.handleListInteraction = this.handleListInteraction.bind(this);
        this.handlePaginationClick = this.handlePaginationClick.bind(this);
        this.saveQuickEdit = this.saveQuickEdit.bind(this);
        this.load = this.load.bind(this); // [v1.2.1] 确保 load 方法被绑定
    }

    /**
     * 缓存 DOM 元素引用
     */
    cacheElements() {
        return {
            // KPIs & Overview
            kpiTotalPlan: document.getElementById('kpi-total-plan'),
            kpiPublishedCount: document.getElementById('kpi-published-count'),
            kpiPublishedRate: document.getElementById('kpi-published-rate'),
            kpiDueToday: document.getElementById('kpi-due-today'),
            kpiDueWeek: document.getElementById('kpi-due-week'),
            kpiDelayed: document.getElementById('kpi-delayed'),
            kpiRemainingDays: document.getElementById('kpi-remaining-days'),
            projectCycleDateRange: document.getElementById('project-cycle-date-range'),
            projectCycleDuration: document.getElementById('project-cycle-duration'),
            publishProgressBar: document.getElementById('publish-progress-bar'),
            publishProgressPercent: document.getElementById('publish-progress-percent'),
            overviewContainer: document.getElementById('project-overview-container'), // 全周期概览容器

            // View Toggles
            btnListView: document.getElementById('btn-list-view'),
            btnCalendarView: document.getElementById('btn-calendar-view'),

            // List View Elements
            listViewContainer: document.getElementById('list-view-container'),
            listViewTbody: document.getElementById('list-view-tbody'),
            listPaginationControls: document.getElementById('list-pagination-controls'),
            listLoadingIndicator: document.getElementById('list-view-loading'), // [v2.1.0] 新增
            listTable: document.getElementById('list-view-table'), // [v2.1.0] 新增

            // Calendar View Elements
            calendarViewContainer: document.getElementById('calendar-view-container'),
            calendarWeekNav: document.getElementById('calendar-week-nav'),
            prevWeekBtn: document.getElementById('calendar-prev-week-btn'),
            currentWeekDisplay: document.getElementById('calendar-current-week'),
            nextWeekBtn: document.getElementById('calendar-next-week-btn'),
            backToTodayBtn: document.getElementById('calendar-back-to-today-btn'),
            calendarGridMain: document.getElementById('calendar-grid-main'),
            calendarGridContent: document.getElementById('calendar-grid-content'), // 日历格子容器
            calendarLoadingIndicator: document.getElementById('calendar-view-loading'), // [v2.1.0] 新增

            // Quick Input Modal
            quickInputModal: document.getElementById('quickInputModal'),
            quickInputTitle: document.getElementById('quickInputTitle'),
            quickInputForm: document.getElementById('quickInputForm'),
            quickInputCollabId: document.getElementById('quick-input-collab-id'),
            quickInputTalentSelect: document.getElementById('quick-input-talent-select'),
            quickInputDate: document.getElementById('quick-input-date'),
            quickInputVideoId: document.getElementById('quick-input-videoId'),
            quickInputTaskId: document.getElementById('quick-input-taskId'),
            saveQuickInputBtn: document.getElementById('saveQuickInputBtn'),
            cancelModalBtn: document.getElementById('cancelModalBtn'),
            closeModalBtn: document.getElementById('closeModalBtn')
        };
    }

    /**
     * [v1.2.1] 新增：用于 main.js 更新数据
     */
    updateData(project, allCollaborations) {
        this.project = project;
        this.allCollaborations = allCollaborations;
        // 注意：此时不立即 load，等待 main.js 的 switchTab 调用
    }

    /**
     * 加载数据 (由 main.js 调用)
     */
    async load() {
        this.showLoading();
        try {
            // [v2.1.0 核心修复]
            // 过滤出此 Tab 关心的数据
            const executionStatuses = ['客户已定档', '视频已发布'];

            console.log('========== 执行信息Tab加载 ==========');
            console.log('[DEBUG] load - 原始合作数据量:', (this.allCollaborations || []).length);
            console.log('[DEBUG] load - 原始数据状态分布:',
                (this.allCollaborations || []).reduce((acc, c) => {
                    acc[c.status] = (acc[c.status] || 0) + 1;
                    return acc;
                }, {})
            );

            this.filteredCollaborations = (this.allCollaborations || []).filter(c =>
                executionStatuses.includes(c.status)
            );

            console.log('[DEBUG] load - 过滤后数据量:', this.filteredCollaborations.length);
            console.log('[DEBUG] load - 过滤后的日期:', this.filteredCollaborations.map(c => ({
                nickname: c.talentInfo?.nickname,
                date: c.plannedReleaseDate,
                status: c.status
            })));

            // 计算项目周期 (现在使用过滤后的数据)
            this.calculateProjectCycle();

            // 渲染公共部分 (KPIs, Overview)
            this.renderKPIs();
            this.renderOverview();

            // 根据当前视图模式渲染对应视图
            if (this.currentViewMode === 'calendar') {
                this.renderCalendarView();
            } else {
                this.renderListView();
            }

            this.hideLoading();
            this.bindCommonEvents(); // 绑定公共事件

        } catch (error) {
            console.error('加载执行信息失败:', error);
            this.showError(error.message); // [v2.1.0] 传递错误信息
        }
    }

    /**
     * 计算项目周期和当前周
     */
    calculateProjectCycle() {
        // [v2.1.0] 使用过滤后的数据
        const dates = this.filteredCollaborations
            .map(c => c.plannedReleaseDate)
            .filter(Boolean)
            .map(d => new Date(d.split('T')[0])); // 修复时区问题

        // [debug] 打印过滤后的数据量和日期
        console.log('[DEBUG] calculateProjectCycle - 过滤后的合作数:', this.filteredCollaborations.length);
        console.log('[DEBUG] calculateProjectCycle - 有效日期数:', dates.length);

        if (dates.length > 0) {
            dates.sort((a, b) => a - b);
            this.projectStartDate = dates[0];
            this.projectEndDate = dates[dates.length - 1];

            console.log('[DEBUG] projectStartDate:', Format.date(this.projectStartDate));
            console.log('[DEBUG] projectEndDate:', Format.date(this.projectEndDate));

            // [bugfix] 正确计算总周数：计算从起始日期所在的周一到结束日期所在的周日，总共有多少周
            // 先计算起始日期所在周的周一
            const startDay = new Date(this.projectStartDate);
            startDay.setHours(0, 0, 0, 0);
            const startDayOfWeek = startDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const startMonday = new Date(startDay);
            startMonday.setDate(startDay.getDate() - (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1));

            // 再计算结束日期所在周的周日
            const endDay = new Date(this.projectEndDate);
            endDay.setHours(0, 0, 0, 0);
            const endDayOfWeek = endDay.getDay();
            const endSunday = new Date(endDay);
            endSunday.setDate(endDay.getDate() + (endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek));

            // 计算从第一个周一到最后一个周日的总天数，再除以7
            const totalDays = Utils.daysBetween(startMonday, endSunday) + 1;
            this.totalWeeks = Math.ceil(totalDays / 7);

            console.log('[DEBUG] startMonday:', Format.date(startMonday));
            console.log('[DEBUG] endSunday:', Format.date(endSunday));
            console.log('[DEBUG] totalDays (周一到周日):', totalDays);
            console.log('[DEBUG] totalWeeks (修复后):', this.totalWeeks);


            // 计算今天所在的周数
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const projectStart = new Date(this.projectStartDate);
            projectStart.setHours(0, 0, 0, 0);
            const projectEnd = new Date(this.projectEndDate);
            projectEnd.setHours(0, 0, 0, 0);

            // 确保 projectStart 是项目周期的第一天（周一）
            const startWeekDay = projectStart.getDay(); // 0=Sun, 1=Mon
            const cycleRealStartDate = new Date(projectStart);
            cycleRealStartDate.setDate(projectStart.getDate() - (startWeekDay === 0 ? 6 : startWeekDay - 1));

            // [bugfix] 智能计算当前周
            if (today < cycleRealStartDate) {
                // 今天在项目开始之前，显示第1周
                this.currentCalendarWeek = 1;
                console.log('[DEBUG] 今天在项目开始之前，显示第1周');
            } else if (today > projectEnd) {
                // 今天在项目结束之后，显示最后1周
                this.currentCalendarWeek = this.totalWeeks;
                console.log('[DEBUG] 今天在项目结束之后，显示最后1周');
            } else {
                // 今天在项目周期内，计算所在周数
                const daysFromStart = Utils.daysBetween(cycleRealStartDate, today);
                this.currentCalendarWeek = Math.floor(daysFromStart / 7) + 1;
                console.log('[DEBUG] 今天在项目周期内，daysFromStart:', daysFromStart, '初步周数:', this.currentCalendarWeek);
                // 确保在有效范围内
                this.currentCalendarWeek = Math.max(1, Math.min(this.currentCalendarWeek, this.totalWeeks));
            }

            console.log('[DEBUG] 最终 currentCalendarWeek:', this.currentCalendarWeek);
            console.log('[DEBUG] 最终 totalWeeks:', this.totalWeeks);

        } else {
            // [v2.1.0] 修复：如果没有有效日期，设置 null，而不是 new Date()
            this.projectStartDate = null;
            this.projectEndDate = null;
            this.totalWeeks = 1; // 至少显示1周
            this.currentCalendarWeek = 1;
        }
    }

    /**
     * 渲染 KPI 统计
     */
    renderKPIs() {
        // [v2.1.0] 使用过滤后的数据
        const totalPlan = this.filteredCollaborations.length; 
        const published = this.filteredCollaborations.filter(c => c.status === '视频已发布');
        const publishedCount = published.length;
        const publishedRate = totalPlan > 0 ? (publishedCount / totalPlan * 100) : 0;

        const todayStr = Format.date(new Date());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - (today.getDay() === 0 ? 7 : today.getDay()))); // 到本周日

        let dueTodayCount = 0;
        let dueWeekCount = 0;
        let delayedCount = 0;

        this.filteredCollaborations.forEach(c => {
            if (c.plannedReleaseDate && c.status === '客户已定档') {
                const plannedDate = new Date(c.plannedReleaseDate.split('T')[0]); // 修复时区
                plannedDate.setHours(0, 0, 0, 0); // 确保只比较日期

                if (Format.date(plannedDate) === todayStr) {
                    dueTodayCount++;
                }
                if (plannedDate >= today && plannedDate <= endOfWeek) {
                    dueWeekCount++;
                }
                if (plannedDate < today) {
                    delayedCount++;
                }
            }
        });

        const cycleDays = this.projectStartDate && this.projectEndDate ? Utils.daysBetween(this.projectStartDate, this.projectEndDate) + 1 : 1;
        const remainingDays = this.projectEndDate ? Math.max(0, Utils.daysBetween(today, this.projectEndDate)) : 0;

        // 更新 DOM
        if (this.elements.kpiTotalPlan) this.elements.kpiTotalPlan.textContent = totalPlan;
        if (this.elements.kpiPublishedCount) this.elements.kpiPublishedCount.textContent = publishedCount;
        if (this.elements.kpiPublishedRate) this.elements.kpiPublishedRate.textContent = Format.percent(publishedRate, 1);
        if (this.elements.kpiDueToday) this.elements.kpiDueToday.textContent = dueTodayCount;
        if (this.elements.kpiDueWeek) this.elements.kpiDueWeek.textContent = dueWeekCount;
        if (this.elements.kpiDelayed) this.elements.kpiDelayed.textContent = delayedCount;
        if (this.elements.kpiRemainingDays) this.elements.kpiRemainingDays.textContent = remainingDays;

        // 更新项目周期和进度条
        if (this.elements.projectCycleDateRange) {
            this.elements.projectCycleDateRange.textContent = (this.projectStartDate && this.projectEndDate) ?
                `${Format.date(this.projectStartDate)} - ${Format.date(this.projectEndDate)}` : 'N/A';
        }
        if (this.elements.projectCycleDuration) {
             this.elements.projectCycleDuration.textContent = `共 ${this.totalWeeks} 周 (${cycleDays} 天)`;
        }
        if (this.elements.publishProgressBar) this.elements.publishProgressBar.style.width = `${publishedRate.toFixed(0)}%`;
        if (this.elements.publishProgressPercent) this.elements.publishProgressPercent.textContent = `${publishedRate.toFixed(0)}%`;
    }

    /**
     * 渲染项目全周期概览
     */
    renderOverview() {
        console.log('[DEBUG] renderOverview - totalWeeks:', this.totalWeeks);
        console.log('[DEBUG] renderOverview - projectStartDate:', this.projectStartDate);

        if (!this.elements.overviewContainer || !this.projectStartDate || this.totalWeeks <= 0) {
             if (this.elements.overviewContainer) this.elements.overviewContainer.innerHTML = '<p class="col-span-7 text-sm text-center text-gray-500">暂无项目周期数据</p>';
             console.log('[DEBUG] renderOverview - 提前返回（无数据）');
             return;
        }

        let overviewHtml = '';
        const startOfWeek = new Date(this.projectStartDate);
        // 调整起始周的第一天为周一
        const dayOfWeek = startOfWeek.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        console.log('[DEBUG] renderOverview - 开始循环，总共', this.totalWeeks, '周');

        for (let i = 0; i < this.totalWeeks; i++) {
            console.log('[DEBUG] renderOverview - 渲染第', i + 1, '周');
            const weekStartDate = new Date(startOfWeek);
            weekStartDate.setDate(startOfWeek.getDate() + i * 7);
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6);

            const isCurrentWeek = i + 1 === this.currentCalendarWeek;
            const weekClass = isCurrentWeek ? 'current' : '';

            // 统计本周状态 (使用过滤后的数据)
            const weekCollabs = this.filteredCollaborations.filter(c => {
                if (!c.plannedReleaseDate) return false;
                const plannedDate = new Date(c.plannedReleaseDate.split('T')[0]);
                return plannedDate >= weekStartDate && plannedDate <= weekEndDate;
            });

            const statusCounts = weekCollabs.reduce((acc, c) => {
                if (c.status === '视频已发布') acc.published++;
                else if (c.status === '客户已定档') {
                    const planned = new Date(c.plannedReleaseDate.split('T')[0]);
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (planned < today) acc.delayed++; else acc.scheduled++;
                } else acc.pending++;
                return acc;
            }, { published: 0, scheduled: 0, delayed: 0, pending: 0 });

            let dotsHtml = '';
            if (statusCounts.published > 0) dotsHtml += `<span class="status-dot dot-published" title="已发布"></span>`;
            if (statusCounts.scheduled > 0) dotsHtml += `<span class="status-dot dot-scheduled" title="待发布"></span>`;
            if (statusCounts.delayed > 0) dotsHtml += `<span class="status-dot dot-delayed" title="延期"></span>`;
            // 待确认状态(pending)不在此处显示，因为它不属于“执行”阶段

            overviewHtml += `
                <div class="overview-week text-center border border-gray-200 rounded bg-white p-3 ${weekClass}">
                    <p class="text-xs ${isCurrentWeek ? 'text-blue-700 font-semibold' : 'text-gray-500'} mb-0.5">第${i + 1}周${isCurrentWeek ? '(当前)' : ''}</p>
                    <p class="text-xs font-medium ${isCurrentWeek ? 'text-blue-900' : ''}">${Format.date(weekStartDate, 'MM.DD')}-${Format.date(weekEndDate, 'MM.DD')}</p>
                    <div class="mt-1 flex justify-center gap-0.5 h-[6px]">${dotsHtml || '&nbsp;'}</div>
                    <p class="text-xs ${isCurrentWeek ? 'text-blue-700' : 'text-gray-600'} mt-1">${weekCollabs.length}个达人</p>
                </div>
            `;
        }

        this.elements.overviewContainer.innerHTML = overviewHtml;
    }

    /**
     * 渲染日历视图
     */
    renderCalendarView() {
        const { calendarGridContent, currentWeekDisplay, prevWeekBtn, nextWeekBtn } = this.elements;
        if (!calendarGridContent || !this.projectStartDate) {
            // [v2.1.0] 修复：如果项目开始日期无效（例如没有已定档达人），显示提示
            calendarGridContent.innerHTML = `<p class="col-span-7 text-center py-10 text-gray-500">暂无已定档的达人，无法生成日历。</p>`;
            if (currentWeekDisplay) currentWeekDisplay.textContent = '暂无数据';
            if (prevWeekBtn) prevWeekBtn.disabled = true;
            if (nextWeekBtn) nextWeekBtn.disabled = true;
            return;
        }

        // 计算当前周的起始日期 (周一)
        const startOfWeek = new Date(this.projectStartDate);
        const dayOfWeek = startOfWeek.getDay(); // 0=Sun, 1=Mon
        startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (this.currentCalendarWeek - 1) * 7);

        // 更新周导航显示
        const weekEndDate = new Date(startOfWeek);
        weekEndDate.setDate(startOfWeek.getDate() + 6);
        currentWeekDisplay.textContent = `第${this.currentCalendarWeek}周 (${Format.date(startOfWeek, 'YYYY-MM-DD')} - ${Format.date(weekEndDate, 'YYYY-MM-DD')})`;

        // 更新周导航按钮状态
        prevWeekBtn.disabled = this.currentCalendarWeek <= 1;
        nextWeekBtn.disabled = this.currentCalendarWeek >= this.totalWeeks;

        // 清空并渲染日历格子
        calendarGridContent.innerHTML = '';
        const todayStr = Format.date(new Date());

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = Format.date(date);
            const dayOfWeekIndex = date.getDay(); // 0=Sun, 6=Sat

            const dayDiv = document.createElement('div');
            dayDiv.className = `calendar-day ${dayOfWeekIndex === 0 || dayOfWeekIndex === 6 ? 'weekend-day' : ''}`;
            if (dateStr === todayStr) {
                dayDiv.classList.add('today-indicator');
            }
            dayDiv.dataset.date = dateStr;

            // 日期头
            dayDiv.innerHTML = `
                <div class="day-header flex justify-between items-start mb-1 flex-shrink-0 p-2">
                    <div>
                        <span class="text-sm font-medium ${dateStr === todayStr ? 'text-blue-900 font-bold' : 'text-gray-900'}">${date.getDate()}日</span>
                        <span class="text-xs ${dayOfWeekIndex === 0 || dayOfWeekIndex === 6 ? 'text-orange-600' : 'text-gray-400'} ml-1">${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeekIndex]}</span>
                    </div>
                    <span class="day-talent-count text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">0个</span>
                </div>
                <div class="day-content space-y-1.5 custom-scrollbar pr-1 px-2 flex-grow">
                    <!-- Talent cards go here -->
                </div>
            `;

            // 填充达人卡片
            const dayContentDiv = dayDiv.querySelector('.day-content');
            // [v2.1.0] 使用过滤后的数据
            const talentsForDay = this.filteredCollaborations.filter(c => c.plannedReleaseDate === dateStr);
            let talentCount = 0;

            talentsForDay.forEach(collab => {
                const card = this.createTalentCard(collab);
                dayContentDiv.appendChild(card);
                talentCount++;
            });

            if (talentCount === 0) {
                dayContentDiv.innerHTML = '<p class="text-center text-gray-400 text-xs mt-4">暂无安排</p>';
            }
            dayDiv.querySelector('.day-talent-count').textContent = `${talentCount}个`;

            calendarGridContent.appendChild(dayDiv);
        }

        // 绑定日历格子上的事件
        this.bindCalendarEvents();
    }

    /**
     * 创建达人卡片 HTML 元素
     */
    createTalentCard(collab) {
        const card = document.createElement('div');
        const talentName = collab.talentInfo?.nickname || '(未知达人)';
        const today = new Date(); today.setHours(0,0,0,0);
        const plannedDate = new Date(collab.plannedReleaseDate.split('T')[0]); plannedDate.setHours(0,0,0,0);

        let statusClass = 'status-pending'; // 默认待确认 (理论上不会出现)
        let statusText = '待确认';
        if (collab.status === '视频已发布') {
            statusClass = 'status-published';
            statusText = '已发布';
        } else if (collab.status === '客户已定档') {
            if (plannedDate < today) {
                statusClass = 'status-delayed';
                statusText = '延期';
            } else {
                statusClass = 'status-scheduled';
                statusText = '待发布';
            }
        }

        card.className = `talent-card ${statusClass} rounded px-2 py-1.5 group`;
        card.dataset.collabId = collab.id;

        card.innerHTML = `
            <p class="font-medium text-gray-800 truncate" title="${talentName}">${talentName}</p>
            <p class="text-gray-500">${statusText}</p>
            ${statusClass === 'status-delayed' ? `<p class="text-xs text-red-500">原: ${Format.date(collab.plannedReleaseDate)}</p>` : ''}
            <button class="edit-btn p-0.5 hover:bg-gray-200 rounded text-gray-500" title="编辑">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
            </button>
        `;
        return card;
    }

    /**
     * 渲染列表视图
     */
    renderListView() {
        const { listViewTbody, listPaginationControls, listTable, listLoadingIndicator } = this.elements;
        if (!listViewTbody || !listTable || !listLoadingIndicator) return;

        const isReadOnly = this.project.status !== '执行中';
        
        // [v2.1.0] 使用过滤后的数据
        const totalItems = this.filteredCollaborations.length;
        const totalPages = Math.ceil(totalItems / this.listItemsPerPage);
        this.listCurrentPage = Math.min(this.listCurrentPage, totalPages || 1);

        const startIndex = (this.listCurrentPage - 1) * this.listItemsPerPage;
        const endIndex = startIndex + this.listItemsPerPage;
        const paginatedCollaborators = this.filteredCollaborations.slice(startIndex, endIndex);

        listViewTbody.innerHTML = ''; // 清空列表

        if (paginatedCollaborators.length === 0) {
            listTable.classList.add('hidden'); // 隐藏表格
            listLoadingIndicator.innerHTML = '<p class="text-center py-12 text-gray-500">暂无已定档或已发布的达人。</p>';
            listLoadingIndicator.classList.remove('hidden'); // 显示提示信息
        } else {
            listTable.classList.remove('hidden'); // 显示表格
            listLoadingIndicator.classList.add('hidden'); // 隐藏提示信息

            const fragment = document.createDocumentFragment();
            paginatedCollaborators.forEach(collab => {
                const row = this.renderListRow(collab, isReadOnly);
                fragment.appendChild(row);
            });
            listViewTbody.appendChild(fragment);
        }

        // 渲染列表分页
        Pagination.render(
            listPaginationControls,
            this.listCurrentPage,
            totalItems,
            this.listItemsPerPage,
            this.handlePaginationClick // 传递回调
        );
         // 绑定列表上的事件
        this.bindListEvents();
    }

    /**
     * 渲染列表视图的单行
     */
    renderListRow(collab, isReadOnly) {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-gray-50 data-row';
        row.dataset.id = collab.id;

        const isEditingThisRow = this.editingListRowId === collab.id;

        // 构建可编辑单元格 (与原 PerformanceTab 类似)
        const renderCell = (value, fieldName, type = 'text') => {
             // 如果是 videoId 或 taskId，并且值存在，则显示为链接
            if ((fieldName === 'videoId' || fieldName === 'taskId') && value) {
                const isVideo = fieldName === 'videoId';
                const url = isVideo ? `https://www.douyin.com/video/${value}` : `#`; // 假设任务ID没有直接链接
                const linkClass = isVideo ? 'text-blue-600 hover:underline' : 'text-gray-600';
                const displayValue = value.length > 20 ? `${value.substring(0, 10)}...${value.slice(-6)}` : value;

                if (isEditingThisRow && !isReadOnly) {
                    return `<input type="${type}" class="data-input performance-input" data-field="${fieldName}" value="${value || ''}" placeholder="${fieldName === 'videoId' ? '视频 ID' : '任务 ID'}">`;
                }
                return `<a href="${url}" target="_blank" class="${linkClass} font-mono text-xs" title="${value}">${displayValue}</a>`;
            }

            if (isEditingThisRow && !isReadOnly) {
                return `<input type="${type}" class="data-input performance-input" data-field="${fieldName}" value="${value || ''}" ${type === 'date' ? '' : 'placeholder="N/A"'}>`;
            }
            if (!value) return `<div class="text-gray-400">N/A</div>`;
            return `<div title="${value}">${value}</div>`;
        };

        // 操作按钮
        let actionsCellHtml = '';
        if (isEditingThisRow && !isReadOnly) {
            actionsCellHtml = `
                <button class="save-list-row-btn px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" data-id="${collab.id}">保存</button>
                <button class="cancel-edit-list-row-btn px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 ml-2" data-id="${collab.id}">取消</button>
            `;
        } else {
            actionsCellHtml = `<button class="edit-list-row-btn px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50" data-id="${collab.id}" ${isReadOnly ? 'disabled' : ''}>编辑</button>`;
        }

        row.innerHTML = `
            <td class="px-6 py-4 font-medium whitespace-nowrap">${collab.talentInfo?.nickname || 'N/A'}</td>
            <td class="px-6 py-4">${collab.plannedReleaseDate || '<span class="text-gray-400">待定</span>'}</td>
            <td class="px-6 py-4">${collab.talentSource || '野生达人'}</td>
            <td class="px-6 py-4">${renderCell(collab.contentFile, 'contentFile')}</td>
            <td class="px-6 py-4">${renderCell(collab.taskId, 'taskId')}</td>
            <td class="px-6 py-4">${renderCell(collab.videoId, 'videoId')}</td>
            <td class="px-6 py-4">${renderCell(collab.publishDate, 'publishDate', 'date')}</td>
            <td class="px-6 py-4 text-center">${actionsCellHtml}</td>
        `;
        return row;
    }

    // --- [v2.1.0] 改进的加载/错误显示 ---
    showLoading() {
        if (this.currentViewMode === 'list') {
            if (this.elements.listTable) this.elements.listTable.classList.add('hidden');
            if (this.elements.listPaginationControls) this.elements.listPaginationControls.innerHTML = '';
            if (this.elements.listLoadingIndicator) {
                this.elements.listLoadingIndicator.innerHTML = '<p class="text-center py-12 text-gray-500">加载中...</p>';
                this.elements.listLoadingIndicator.classList.remove('hidden');
            }
        } else { // 'calendar'
            if (this.elements.calendarGridContent) {
                // 仅在日历格子区域显示加载
                this.elements.calendarGridContent.innerHTML = `<p class="col-span-7 text-center py-10 text-gray-500">加载中...</p>`;
            }
            // 保持 KPI 和 概览 可见，但可以置灰
            if (this.elements.calendarViewContainer) this.elements.calendarViewContainer.style.opacity = '0.7';
        }
    }
    hideLoading() {
        if (this.elements.listLoadingIndicator) this.elements.listLoadingIndicator.classList.add('hidden');
        if (this.elements.calendarViewContainer) this.elements.calendarViewContainer.style.opacity = '1';
    }
    showError(message) {
         if (this.currentViewMode === 'list') {
            if (this.elements.listTable) this.elements.listTable.classList.add('hidden');
            if (this.elements.listPaginationControls) this.elements.listPaginationControls.innerHTML = '';
            if (this.elements.listLoadingIndicator) {
                this.elements.listLoadingIndicator.innerHTML = `<p class="text-center py-12 text-red-500">加载失败: ${message}</p>`;
                this.elements.listLoadingIndicator.classList.remove('hidden');
            }
        } else { // 'calendar'
             if (this.elements.calendarGridContent) {
                this.elements.calendarGridContent.innerHTML = `<p class="col-span-7 text-center py-10 text-red-500">加载失败: ${message}</p>`;
            }
            if (this.elements.calendarViewContainer) this.elements.calendarViewContainer.style.opacity = '1';
        }
    }

    // --- 事件绑定 ---
    bindCommonEvents() {
        const { btnListView, btnCalendarView } = this.elements;
        if (btnListView) btnListView.addEventListener('click', this.handleViewToggle);
        if (btnCalendarView) btnCalendarView.addEventListener('click', this.handleViewToggle);

        // 关闭弹窗按钮
        if (this.elements.closeModalBtn) this.elements.closeModalBtn.addEventListener('click', this.closeQuickEditModal.bind(this));
        if (this.elements.cancelModalBtn) this.elements.cancelModalBtn.addEventListener('click', this.closeQuickEditModal.bind(this));
        if (this.elements.quickInputModal) {
            this.elements.quickInputModal.addEventListener('click', (e) => {
                if (e.target === this.elements.quickInputModal) this.closeQuickEditModal();
            });
        }
        // 保存弹窗表单
        if (this.elements.quickInputForm) this.elements.quickInputForm.addEventListener('submit', this.saveQuickEdit);

    }

    bindCalendarEvents() {
        const { calendarGridContent, prevWeekBtn, nextWeekBtn, backToTodayBtn } = this.elements;

        // [bugfix] 移除旧的事件监听器，避免重复绑定
        if (calendarGridContent) {
            calendarGridContent.removeEventListener('click', this.handleCalendarInteraction);
            calendarGridContent.addEventListener('click', this.handleCalendarInteraction);
        }

        // [bugfix] 使用命名函数，方便移除
        if (prevWeekBtn) {
            const prevHandler = () => this.handleWeekNav(-1);
            prevWeekBtn.removeEventListener('click', prevHandler);
            prevWeekBtn.onclick = prevHandler; // 使用 onclick 避免重复绑定
        }
        if (nextWeekBtn) {
            const nextHandler = () => this.handleWeekNav(1);
            nextWeekBtn.removeEventListener('click', nextHandler);
            nextWeekBtn.onclick = nextHandler;
        }
        if (backToTodayBtn) {
            const todayHandler = () => this.handleWeekNav(0);
            backToTodayBtn.removeEventListener('click', todayHandler);
            backToTodayBtn.onclick = todayHandler;
        }
    }

    bindListEvents() {
        const { listViewTbody } = this.elements;
        if (listViewTbody) {
            listViewTbody.addEventListener('click', this.handleListInteraction);
        }
    }

    // --- 事件处理 ---
    handleViewToggle(e) {
        const targetView = e.currentTarget.id === 'btn-list-view' ? 'list' : 'calendar';
        if (targetView !== this.currentViewMode) {
            this.currentViewMode = targetView;
            this.updateViewUI();
            if (targetView === 'calendar') {
                this.renderCalendarView();
            } else {
                this.listCurrentPage = 1; // 切换到列表时重置页码
                this.renderListView();
            }
        }
    }

    updateViewUI() {
        const { btnListView, btnCalendarView, listViewContainer, calendarViewContainer } = this.elements;
        const isCalendar = this.currentViewMode === 'calendar';

        if (listViewContainer) listViewContainer.classList.toggle('hidden', isCalendar);
        if (calendarViewContainer) calendarViewContainer.classList.toggle('hidden', !isCalendar);

        if (btnListView) {
            btnListView.classList.toggle('active', !isCalendar);
            btnListView.classList.toggle('bg-blue-600', !isCalendar);
            btnListView.classList.toggle('text-white', !isCalendar);
            btnListView.classList.toggle('text-gray-700', isCalendar);
            btnListView.classList.toggle('hover:bg-gray-50', isCalendar);
        }
        if (btnCalendarView) {
            btnCalendarView.classList.toggle('active', isCalendar);
            btnCalendarView.classList.toggle('bg-blue-600', isCalendar);
            btnCalendarView.classList.toggle('text-white', isCalendar);
            btnCalendarView.classList.toggle('text-gray-700', !isCalendar);
            btnCalendarView.classList.toggle('hover:bg-gray-50', !isCalendar);
        }
    }

    handleWeekNav(direction) {
        if (direction === 0) { // 回到今天
            // [v2.1.0] 重新计算今天的周数
            const today = new Date(); today.setHours(0,0,0,0);
            const startDay = new Date(this.projectStartDate); startDay.setHours(0,0,0,0);
            const dayOfWeek = startDay.getDay();
            const cycleRealStartDate = new Date(startDay);
            cycleRealStartDate.setDate(startDay.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const daysFromStart = Utils.daysBetween(cycleRealStartDate, today);
            this.currentCalendarWeek = Math.floor(daysFromStart / 7) + 1;
        } else {
            this.currentCalendarWeek += direction;
        }
        // 边界检查
        this.currentCalendarWeek = Math.max(1, Math.min(this.currentCalendarWeek, this.totalWeeks));
        this.renderCalendarView();
    }

    handleCalendarInteraction(e) {
        const editBtn = e.target.closest('.edit-btn');
        const card = e.target.closest('.talent-card');

        if (editBtn && card) {
            e.stopPropagation(); // 阻止触发卡片点击
            const collabId = card.dataset.collabId;
            this.openQuickEditModal(collabId);
        } else if (card) {
            const collabId = card.dataset.collabId;
            this.openQuickEditModal(collabId);
        }
    }

    handleListInteraction(e) {
        const editBtn = e.target.closest('.edit-list-row-btn');
        const saveBtn = e.target.closest('.save-list-row-btn');
        const cancelBtn = e.target.closest('.cancel-edit-list-row-btn');

        if (editBtn && !editBtn.disabled) {
            this.editingListRowId = editBtn.dataset.id;
            this.renderListView(); // 重新渲染列表以显示输入框
        } else if (saveBtn) {
            this.handleSaveListRow(saveBtn.dataset.id);
        } else if (cancelBtn) {
            this.editingListRowId = null;
            this.renderListView(); // 重新渲染以取消编辑状态
        }
    }

    handlePaginationClick(page) {
        // [v2.1.0] 确保分页点击被正确处理
        this.listCurrentPage = page;
        this.renderListView();
    }

    // --- Quick Edit Modal Logic ---
    openQuickEditModal(collabId) {
        const { quickInputModal, quickInputTitle, quickInputForm, quickInputCollabId, quickInputTalentSelect, quickInputDate, quickInputVideoId, quickInputTaskId } = this.elements;

        // 只支持编辑模式，不支持新增
        if (!collabId) {
            console.warn('openQuickEditModal: 仅支持编辑模式');
            return;
        }

        quickInputForm.reset(); // 清空表单
        quickInputCollabId.value = collabId; // 存储 ID

        quickInputTitle.textContent = '编辑发布信息';
        // [v2.1.0] 从过滤后的数据中查找
        const collab = this.filteredCollaborations.find(c => c.id === collabId);
        if (!collab) return;

        // 填充表单
        quickInputTalentSelect.innerHTML = `<option value="${collab.talentId}" selected>${collab.talentInfo?.nickname || '(未知达人)'}</option>`;
        quickInputTalentSelect.disabled = true; // 编辑时不允许修改达人
        quickInputDate.value = collab.plannedReleaseDate || '';
        quickInputVideoId.value = collab.videoId || '';
        quickInputTaskId.value = collab.taskId || '';

        quickInputModal.classList.remove('hidden');
        quickInputModal.classList.add('flex');
    }

    closeQuickEditModal() {
        if (this.elements.quickInputModal) {
            this.elements.quickInputModal.classList.add('hidden');
            this.elements.quickInputModal.classList.remove('flex');
        }
    }

    async saveQuickEdit(e) {
        e.preventDefault(); // 阻止表单默认提交

        const { quickInputCollabId, quickInputTalentSelect, quickInputDate, quickInputVideoId, quickInputTaskId, saveQuickInputBtn } = this.elements;

        const collabId = quickInputCollabId.value;

        // 只支持编辑模式
        if (!collabId) {
            Modal.showAlert('仅支持编辑现有达人的发布信息');
            return;
        }

        const payload = {
            id: collabId,
            talentId: quickInputTalentSelect.value,
            plannedReleaseDate: quickInputDate.value || null,
            videoId: quickInputVideoId.value.trim() || null,
            taskId: quickInputTaskId.value.trim() || null
        };

        // 基本校验
        if (!payload.talentId) { Modal.showAlert('请选择达人'); return; }
        if (!payload.plannedReleaseDate) { Modal.showAlert('请选择发布日期'); return; }

        // 自动判断状态：如果录入了 videoId 或 taskId，状态为"视频已发布"，否则为"客户已定档"
        if (payload.videoId || payload.taskId) {
            payload.status = '视频已发布';
            // [bugfix] 自动设置实际发布日期为用户输入的日期
            payload.publishDate = quickInputDate.value;
        } else {
            payload.status = '客户已定档';
        }

        // 禁用按钮，显示加载状态
        saveQuickInputBtn.disabled = true;
        saveQuickInputBtn.textContent = '保存中...';

        try {
            await API.request('/update-collaboration', 'PUT', payload);

            // [bugfix] 先关闭弹窗，立即触发刷新，提升用户体验
            this.closeQuickEditModal();

            // 立即触发刷新，让用户看到数据变化
            document.dispatchEvent(new CustomEvent('refreshProject'));

            // 简短的成功提示（可选，因为数据变化已经是很好的反馈）
            Modal.showAlert('保存成功！', '成功');

        } catch (error) {
            // API.request 已经处理了错误弹窗
        } finally {
            // 恢复按钮状态
            saveQuickInputBtn.disabled = false;
            saveQuickInputBtn.textContent = '保存';
        }
    }

    /**
     * 保存列表行编辑
     */
    async handleSaveListRow(collabId) {
        const row = this.elements.listViewTbody.querySelector(`tr[data-id="${collabId}"]`);
        if (!row) return;

        const currentCollaborator = this.allCollaborations.find(c => c.id === collabId); // [v2.1.0] 从 allCollaborations 查找
        if (!currentCollaborator) return;

        const payload = {
            id: collabId,
            publishDate: row.querySelector('.publish-date-input')?.value.trim() || null,
            contentFile: row.querySelector('input[data-field="contentFile"]')?.value.trim() || null,
            taskId: row.querySelector('input[data-field="taskId"]')?.value.trim() || null,
            videoId: row.querySelector('input[data-field="videoId"]')?.value.trim() || null,
        };

        let statusChangeMessage = '';
        if (payload.publishDate && currentCollaborator.status !== '视频已发布') {
            payload.status = '视频已发布';
            statusChangeMessage = '<br><br><b>请注意：</b>录入发布日期后，该合作状态将自动更新为 <b>[视频已发布]</b>。';
        } else if (!payload.publishDate && currentCollaborator.status === '视频已发布') {
            // [v2.1.0] 检查 payload.videoId 是否也为空
            if (!payload.videoId) {
                payload.status = '客户已定档';
                statusChangeMessage = '<br><br><b>请注意：</b>清空发布日期和VideoID后，状态将回滚至 <b>[客户已定档]</b>。';
            }
        }
        // [v2.1.0] 如果录入了 videoId，也自动更新状态
        if (payload.videoId && currentCollaborator.status !== '视频已发布') {
             payload.status = '视频已发布';
             statusChangeMessage = '<br><br><b>请注意：</b>录入VideoID后，状态将自动更新为 <b>[视频已发布]</b>。';
        }


        Modal.showConfirm(`您确定要保存这些更改吗？${statusChangeMessage}`, '确认保存', async (confirmed) => {
            if (!confirmed) return;

            const loading = Modal.showLoading('正在保存...');

            try {
                await API.request('/update-collaboration', 'PUT', payload);
                this.editingListRowId = null; // 退出编辑模式
                loading.close();
                Modal.showAlert('保存成功！', '成功', async () => {
                    // [v2.1.0] 触发 main.js 刷新
                    document.dispatchEvent(new CustomEvent('refreshProject'));
                });
            } catch (error) {
                loading.close();
            }
        });
    }

}

export default PerformanceTab;

