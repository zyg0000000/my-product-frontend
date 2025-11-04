/**
 * @file overview-panel.js
 * @description 全周期概览模块 - 显示项目周期内所有周的状态概览
 */

import { AppCore } from '../common/app-core.js';
import { getCollabDisplayDate, parseLocalDate } from './utils.js';

const { Format } = AppCore;

export class OverviewPanel {
    constructor(dataManager, calendarView, elements) {
        this.dataManager = dataManager;
        this.calendarView = calendarView;
        this.elements = elements;
    }

    /**
     * 渲染全周期概览
     */
    renderOverview() {
        if (!this.elements.overviewContainer || !this.calendarView.projectStartDate || this.calendarView.totalWeeks <= 0) {
            if (this.elements.overviewContainer) {
                this.elements.overviewContainer.innerHTML = '<p class="col-span-7 text-sm text-center text-gray-500 py-4">暂无项目周期数据</p>';
            }
            return;
        }

        let overviewHtml = '';
        const startOfWeek = new Date(this.calendarView.projectStartDate);

        for (let i = 0; i < this.calendarView.totalWeeks; i++) {
            const weekStartDate = new Date(startOfWeek);
            weekStartDate.setDate(startOfWeek.getDate() + i * 7);
            weekStartDate.setHours(0, 0, 0, 0);  // 确保时间部分为0

            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6);
            weekEndDate.setHours(23, 59, 59, 999);  // 确保包含整天

            const isCurrentWeek = i === this.calendarView.currentCalendarWeekIndex;
            const weekClass = isCurrentWeek ? 'current' : '';

            // 统计本周状态（使用实际显示日期）
            const weekCollabs = this.dataManager.allCollaborations.filter(c => {
                const displayDate = getCollabDisplayDate(c);
                if (!displayDate) return false;
                // 修复时区问题：使用本地时区解析日期
                const date = parseLocalDate(displayDate);
                date.setHours(0, 0, 0, 0);  // 标准化到00:00:00进行比较
                return date >= weekStartDate && date <= weekEndDate;
            });

            // 添加调试日志
            if (weekCollabs.length > 0) {
                console.log(`第${i + 1}周 (${Format.date(weekStartDate, 'MM.DD')}-${Format.date(weekEndDate, 'MM.DD')}): 统计到 ${weekCollabs.length} 个合作`,
                    weekCollabs.map(c => ({
                        kol: c.kolName,
                        displayDate: getCollabDisplayDate(c),
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
                        const planned = parseLocalDate(c.plannedReleaseDate);
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
                    <p class="text-xs ${isCurrentWeek ? 'text-indigo-700 font-semibold' : 'text-gray-500'} mb-0.5">第${i + 1}周${isCurrentWeek ? '(当前)' : ''}</p>
                    <p class="text-xs font-medium ${isCurrentWeek ? 'text-indigo-900' : ''}">${Format.date(weekStartDate, 'MM.DD')}-${Format.date(weekEndDate, 'MM.DD')}</p>
                    <div class="mt-1 flex justify-center gap-0.5 h-[6px]">${dotsHtml || '&nbsp;'}</div>
                    <p class="text-xs ${isCurrentWeek ? 'text-indigo-700' : 'text-gray-600'} mt-1">${statusCounts.published}/${weekCollabs.length}</p>
                </div>
            `;
        }

        this.elements.overviewContainer.innerHTML = overviewHtml;
    }

    /**
     * 处理全周期概览点击事件
     * @param {Event} e - 点击事件
     * @returns {boolean} 是否处理了点击
     */
    handleOverviewClick(e) {
        const weekCard = e.target.closest('.overview-week');
        if (!weekCard) return false;

        const weekIndex = parseInt(weekCard.dataset.weekIndex);
        if (isNaN(weekIndex)) return false;

        // 跳转到该周
        this.calendarView.jumpToWeek(weekIndex);

        return true;
    }
}
