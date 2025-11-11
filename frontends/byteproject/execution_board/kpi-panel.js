/**
 * @file kpi-panel.js
 * @description KPI统计模块 - 计算和显示全周期统计和当周统计
 */

import { AppCore } from '../common/app-core.js';
import { getCollabDisplayDate, parseLocalDate } from './utils.js';

const { Format } = AppCore;

export class KPIPanel {
    constructor(dataManager, calendarView, elements) {
        this.dataManager = dataManager;
        this.calendarView = calendarView;
        this.elements = elements;
    }

    /**
     * 渲染KPI (区分全周期统计和当周统计)
     */
    renderKPIs() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = Format.date(today);

        // ===== 全周期统计 =====
        const allTotalPlan = this.dataManager.allCollaborations.length;
        const allPublishedCount = this.dataManager.allCollaborations.filter(c => c.status === '视频已发布').length;
        const allPublishedRate = allTotalPlan > 0 ? (allPublishedCount / allTotalPlan * 100) : 0;

        // 全周期延期：计划发布日期 < 今天且未发布
        const allDelayedCount = this.dataManager.allCollaborations.filter(c => {
            if (!c.plannedReleaseDate || c.status === '视频已发布') return false;
            const plannedDate = parseLocalDate(c.plannedReleaseDate);
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
        const periodEnd = new Date(this.calendarView.currentWeekStart);
        periodEnd.setDate(periodEnd.getDate() + days - 1);
        periodEnd.setHours(23, 59, 59, 999);  // 确保包含整天

        // 更新当前周时间范围显示
        if (this.elements.currentWeekRange) {
            const rangeText = `(${Format.date(this.calendarView.currentWeekStart, 'YYYY-MM-DD')} ~ ${Format.date(periodEnd, 'YYYY-MM-DD')})`;
            this.elements.currentWeekRange.textContent = rangeText;
        }

        const periodCollabs = this.dataManager.allCollaborations.filter(c => {
            const displayDate = getCollabDisplayDate(c);
            if (!displayDate) return false;
            const collabDate = parseLocalDate(displayDate);
            collabDate.setHours(0, 0, 0, 0);  // 标准化到00:00:00进行比较
            return collabDate >= this.calendarView.currentWeekStart && collabDate <= periodEnd;
        });

        // 添加调试日志
        console.log(`当周统计范围: ${Format.date(this.calendarView.currentWeekStart, 'YYYY-MM-DD')} ~ ${Format.date(periodEnd, 'YYYY-MM-DD')}`);
        console.log(`当周统计到 ${periodCollabs.length} 个合作:`,
            periodCollabs.map(c => ({
                kol: c.kolName,
                displayDate: getCollabDisplayDate(c),
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
            const plannedDate = parseLocalDate(c.plannedReleaseDate);
            return plannedDate >= today && plannedDate <= sunday;
        }).length;

        // 延期：计划发布日期 < 今天且未发布
        const delayedCount = periodCollabs.filter(c => {
            if (!c.plannedReleaseDate || c.status === '视频已发布') return false;
            const plannedDate = parseLocalDate(c.plannedReleaseDate);
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
}
