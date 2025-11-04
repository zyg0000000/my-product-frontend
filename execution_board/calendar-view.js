/**
 * @file calendar-view.js
 * @description 日历视图模块 - 负责日历网格的渲染和导航
 */

import { AppCore } from '../common/app-core.js';
import { getCollabDisplayDate, getMonday, parseLocalDate, normalizeDate } from './utils.js';

const { Format } = AppCore;

export class CalendarView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;

        // 项目周期数据
        this.projectStartDate = null; // 项目最早发布日期（倒推到周一）
        this.projectEndDate = null; // 项目最晚发布日期（延长到周日）
        this.totalWeeks = 0; // 项目总周数
        this.currentCalendarWeekIndex = 0; // 当前日历视图显示的周索引（从0开始）

        // 视图状态
        this.currentWeekStart = getMonday(new Date()); // 当前周的周一

        // 筛选条件
        this.filters = {
            projectId: 'all',
            status: 'all'
        };

        // 拖拽状态
        this.draggedCollabId = null;
    }

    /**
     * 开始拖拽
     * @param {Event} e - 拖拽事件
     * @param {string} collabId - 合作ID
     */
    handleDragStart(e, collabId) {
        this.draggedCollabId = collabId;
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    }

    /**
     * 拖拽结束
     * @param {Event} e - 拖拽事件
     */
    handleDragEnd(e) {
        e.target.style.opacity = '1';
        this.draggedCollabId = null;
    }

    /**
     * 拖拽悬停
     * @param {Event} e - 拖拽事件
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    /**
     * 拖拽进入
     * @param {Event} e - 拖拽事件
     */
    handleDragEnter(e) {
        const dayDiv = e.target.closest('.calendar-day');
        if (dayDiv) {
            dayDiv.classList.add('bg-indigo-50');
        }
    }

    /**
     * 拖拽离开
     * @param {Event} e - 拖拽事件
     */
    handleDragLeave(e) {
        const dayDiv = e.target.closest('.calendar-day');
        if (dayDiv && !dayDiv.contains(e.relatedTarget)) {
            dayDiv.classList.remove('bg-indigo-50');
        }
    }

    /**
     * 放置
     * @param {Event} e - 拖拽事件
     * @param {Function} onDrop - 放置回调函数
     */
    async handleDrop(e, onDrop) {
        e.preventDefault();
        e.stopPropagation();

        const dayDiv = e.target.closest('.calendar-day');
        if (!dayDiv) return;

        dayDiv.classList.remove('bg-indigo-50');

        const targetDate = dayDiv.dataset.date;
        if (!this.draggedCollabId || !targetDate) return;

        // 调用回调函数处理放置
        if (onDrop) {
            await onDrop(this.draggedCollabId, targetDate);
        }

        return false;
    }

    /**
     * 设置筛选条件
     * @param {Object} filters - 筛选条件 { projectId, status }
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
    }

    /**
     * 应用筛选条件到合作列表
     * @param {Array} collabs - 合作列表
     * @returns {Array} 筛选后的合作列表
     */
    applyFilters(collabs) {
        let filtered = collabs;

        // 项目筛选
        if (this.filters.projectId !== 'all') {
            filtered = filtered.filter(c => c.projectId === this.filters.projectId);
        }

        // 状态筛选
        if (this.filters.status !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (this.filters.status === 'delayed') {
                // 延期：计划发布日期 < 今天且未发布
                filtered = filtered.filter(c => {
                    if (!c.plannedReleaseDate || c.status === '视频已发布') return false;
                    const plannedDate = new Date(c.plannedReleaseDate);
                    return plannedDate < today;
                });
            } else {
                filtered = filtered.filter(c => c.status === this.filters.status);
            }
        }

        return filtered;
    }

    /**
     * 计算项目周期和总周数
     */
    calculateProjectCycle() {
        // 获取所有合作的发布日期（优先使用实际发布日期）
        const dates = this.dataManager.allCollaborations
            .map(c => {
                // 已发布的使用实际发布日期，未发布的使用计划发布日期
                if (c.status === '视频已发布' && c.publishDate) {
                    return c.publishDate;
                }
                return c.plannedReleaseDate;
            })
            .filter(d => d)
            .map(d => parseLocalDate(d));

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
     * 渲染日历
     */
    renderCalendar() {
        // 简化为只支持周模式
        const days = 7;

        // 更新周导航显示
        const endDate = new Date(this.currentWeekStart);
        endDate.setDate(endDate.getDate() + days - 1);
        this.elements.weekDisplay.textContent =
            `${Format.date(this.currentWeekStart, 'YYYY-MM-DD')} - ${Format.date(endDate, 'YYYY-MM-DD')}`;

        // 渲染日历格子
        this.renderDays();
    }

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
            let dayCollabs = this.dataManager.allCollaborations.filter(c => {
                const displayDate = getCollabDisplayDate(c);
                return displayDate && Format.date(new Date(displayDate)) === dateStr;
            });

            // 应用筛选条件
            dayCollabs = this.applyFilters(dayCollabs);

            gridHtml += `
                <div class="calendar-day border rounded-lg ${isWeekend ? 'weekend-day' : ''} ${isToday ? 'today-indicator' : ''}"
                     data-date="${dateStr}">
                    <div class="day-header">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-sm font-medium ${isToday ? 'text-indigo-900' : 'text-gray-900'}">${date.getDate()}日</span>
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
            const project = this.dataManager.selectedProjects.find(p => p.id === collab.projectId);
            const projectColor = this.dataManager.projectColorMap.get(collab.projectId);
            const talentName = collab.talentInfo?.nickname || '未知达人';

            // 判断状态
            let statusClass = 'status-scheduled';
            let statusText = '待发布';
            if (collab.status === '视频已发布') {
                statusClass = 'status-published';
                statusText = '已发布';
            } else if (collab.status === '客户已定档' && collab.plannedReleaseDate) {
                // 延期判断：计划发布日期 < 今天，但还没发布
                const plannedDate = parseLocalDate(collab.plannedReleaseDate);
                if (plannedDate < today) {
                    statusClass = 'status-delayed';
                    statusText = '延期';
                }
            }

            // 判断是否可编辑（基于项目状态）
            const isEditable = project && project.status === '执行中';
            const disabledClass = isEditable ? '' : 'disabled';
            const colorClass = projectColor ? `project-color-${projectColor.index}` : '';
            const draggableAttr = isEditable ? 'draggable="true"' : '';
            const cursorClass = isEditable ? 'cursor-move' : '';

            return `
                <div class="talent-card ${statusClass} ${colorClass} ${disabledClass} ${cursorClass}"
                     ${draggableAttr}
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
    }

    /**
     * 回到今天
     */
    backToToday() {
        this.currentWeekStart = getMonday(new Date());

        // 更新当前周索引
        if (this.projectStartDate) {
            const weeksDiff = Math.floor((this.currentWeekStart - this.projectStartDate) / (1000 * 60 * 60 * 24 * 7));
            this.currentCalendarWeekIndex = Math.max(0, Math.min(weeksDiff, this.totalWeeks - 1));
        }
    }

    /**
     * 跳转到指定周
     * @param {number} weekIndex - 周索引
     */
    jumpToWeek(weekIndex) {
        if (!this.projectStartDate) return;

        const newWeekStart = new Date(this.projectStartDate);
        newWeekStart.setDate(this.projectStartDate.getDate() + weekIndex * 7);

        this.currentWeekStart = newWeekStart;
        this.currentCalendarWeekIndex = weekIndex;
    }
}
