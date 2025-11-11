/**
 * @file calendar-modal.js
 * @description 日历弹窗模块 - 负责日历显示、交互和档期选择
 */

import { formatDate } from './utils.js';

const WEEKS_TO_SHOW = 5;

export class CalendarModal {
    constructor(elements, remarkManager) {
        this.elements = elements;
        this.remarkManager = remarkManager;

        // 状态
        this.currentEditingTalentId = null;
        this.viewStartDate = new Date();
        this.modalSelectedDates = new Set();

        // 拖拽状态
        this.isDragging = false;
        this.dragStartDate = null;
        this.wasSelectedOnDragStart = false;

        // 回调
        this.onSaveCallback = null;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭弹窗
        this.elements.closeModalBtn.addEventListener('click', () => this.close());
        this.elements.calendarModal.addEventListener('click', (e) => {
            if (e.target === this.elements.calendarModal) this.close();
        });

        // 周导航
        this.elements.prevWeekBtn.addEventListener('click', () => {
            this.viewStartDate.setDate(this.viewStartDate.getDate() - 7);
            this.render();
        });

        this.elements.nextWeekBtn.addEventListener('click', () => {
            this.viewStartDate.setDate(this.viewStartDate.getDate() + 7);
            this.render();
        });

        this.elements.backToTodayBtn.addEventListener('click', () => {
            const today = new Date();
            this.viewStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
            this.render();
        });

        // 保存按钮
        this.elements.saveScheduleBtn.addEventListener('click', () => this.handleSave());

        // 日历拖拽选择
        this.setupDragSelection();
    }

    /**
     * 设置拖拽选择功能
     */
    setupDragSelection() {
        // 开始拖拽/单击
        this.elements.calendarGrid.addEventListener('mousedown', (e) => {
            const day = e.target.closest('.calendar-day');
            if (!day || day.classList.contains('other-month')) return;
            e.preventDefault();

            this.isDragging = true;
            const dateStr = day.dataset.date;
            this.dragStartDate = new Date(dateStr);
            this.wasSelectedOnDragStart = this.modalSelectedDates.has(dateStr);

            // 单击切换
            if (e.detail === 1) {
                if (this.wasSelectedOnDragStart) {
                    this.modalSelectedDates.delete(dateStr);
                } else {
                    this.modalSelectedDates.add(dateStr);
                }
                day.classList.toggle('selected');
            }
        });

        // 拖拽选择
        this.elements.calendarGrid.addEventListener('mouseover', (e) => {
            if (!this.isDragging) return;
            const day = e.target.closest('.calendar-day');
            if (!day || day.classList.contains('other-month')) return;

            const dragEndDate = new Date(day.dataset.date);
            const start = new Date(Math.min(this.dragStartDate, dragEndDate));
            const end = new Date(Math.max(this.dragStartDate, dragEndDate));

            // 更新选中范围
            document.querySelectorAll('.calendar-day[data-date]').forEach(d => {
                const currentDate = new Date(d.dataset.date);
                if (currentDate >= start && currentDate <= end) {
                    d.classList.toggle('selected', !this.wasSelectedOnDragStart);
                }
            });
        });

        // 结束拖拽
        window.addEventListener('mouseup', () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            // 同步选中状态到 modalSelectedDates
            document.querySelectorAll('.calendar-day.selected[data-date]').forEach(d =>
                this.modalSelectedDates.add(d.dataset.date)
            );
            document.querySelectorAll('.calendar-day:not(.selected)[data-date]').forEach(d =>
                this.modalSelectedDates.delete(d.dataset.date)
            );
        });
    }

    /**
     * 设置保存回调
     * @param {Function} callback - 保存时的回调函数
     */
    onSave(callback) {
        this.onSaveCallback = callback;
    }

    /**
     * 打开弹窗
     * @param {string} talentId - 达人ID
     * @param {Object} talent - 达人数据
     */
    open(talentId, talent) {
        this.currentEditingTalentId = talentId;

        // 设置达人名称
        this.elements.modalTalentName.textContent = talent.nickname;

        // 加载档期和备注数据
        this.modalSelectedDates = new Set(talent.schedules || []);
        this.remarkManager.loadRemarks(talent.remarks || {});

        // 重置到本周
        const today = new Date();
        this.viewStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());

        // 渲染日历
        this.render();

        // 显示弹窗（带动画）
        this.elements.calendarModal.classList.remove('hidden');
        setTimeout(() => {
            this.elements.calendarModalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    /**
     * 关闭弹窗
     */
    close() {
        this.elements.calendarModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.elements.calendarModal.classList.add('hidden');
            this.currentEditingTalentId = null;
        }, 300);
    }

    /**
     * 渲染日历
     */
    render() {
        this.elements.calendarGrid.innerHTML = '';

        const startDate = new Date(this.viewStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + WEEKS_TO_SHOW * 7 - 1);

        // 更新日期范围显示
        this.elements.currentDateRange.textContent =
            `${formatDate(startDate, 'YYYY-MM-DD')} ~ ${formatDate(endDate, 'YYYY-MM-DD')}`;

        const todayString = formatDate(new Date());
        const visibleMonths = new Set();

        // 渲染日历格子
        for (let i = 0; i < WEEKS_TO_SHOW * 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = formatDate(date);
            visibleMonths.add(formatDate(date, 'YYYY-MM'));

            const day = document.createElement('div');
            day.className = 'calendar-day';
            day.dataset.date = dateString;
            day.innerHTML = `<span class="date-number">${date.getDate()}</span>`;

            if (this.modalSelectedDates.has(dateString)) {
                day.classList.add('selected');
            }
            if (dateString === todayString) {
                day.classList.add('today');
            }
            if (date.getDate() === 1) {
                day.innerHTML = `<span class="date-number font-bold text-indigo-600">${date.getMonth() + 1}月${date.getDate()}</span>`;
            }

            this.elements.calendarGrid.appendChild(day);
        }

        // 渲染备注区域
        this.remarkManager.render(Array.from(visibleMonths));
    }

    /**
     * 处理保存操作
     */
    async handleSave() {
        if (!this.onSaveCallback) return;

        const schedules = Array.from(this.modalSelectedDates);
        const remarks = this.remarkManager.getRemarks();

        await this.onSaveCallback(this.currentEditingTalentId, { schedules, remarks });
    }
}
