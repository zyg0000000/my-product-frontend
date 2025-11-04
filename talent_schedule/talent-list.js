/**
 * @file talent-list.js
 * @description 达人列表模块 - 负责达人卡片渲染和分页
 */

import { formatDate, generatePastelColorFromString } from './utils.js';

const ITEMS_PER_PAGE_KEY = 'scheduleItemsPerPage';

export class TalentList {
    constructor(elements) {
        this.elements = elements;
        this.currentPage = 1;
        this.itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY)) || 10;
        this.openCalendarCallback = null;
        this.onPageChangeCallback = null;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 管理档期按钮点击
        this.elements.talentListContainer.addEventListener('click', (e) => {
            const manageBtn = e.target.closest('.manage-schedule-btn');
            if (manageBtn && this.openCalendarCallback) {
                this.openCalendarCallback(manageBtn.dataset.talentId);
            }
        });

        // 分页控制
        this.elements.paginationControls.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target || target.disabled) return;

            this.handlePaginationClick(target);
        });

        // 每页显示数量变更
        this.elements.paginationControls.addEventListener('change', (e) => {
            if (e.target.id === 'items-per-page') {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                localStorage.setItem(ITEMS_PER_PAGE_KEY, this.itemsPerPage);
                if (this.onPageChangeCallback) {
                    this.onPageChangeCallback();
                }
            }
        });
    }

    /**
     * 处理分页按钮点击
     * @param {HTMLElement} target - 点击的按钮元素
     */
    handlePaginationClick(target) {
        const totalPages = this.totalPages;

        if (target.id === 'prev-page-btn' && this.currentPage > 1) {
            this.currentPage--;
        } else if (target.id === 'next-page-btn' && this.currentPage < totalPages) {
            this.currentPage++;
        } else if (target.dataset.page) {
            this.currentPage = Number(target.dataset.page);
        }

        if (this.onPageChangeCallback) {
            this.onPageChangeCallback();
        }
    }

    /**
     * 设置打开日历回调
     * @param {Function} callback - 回调函数
     */
    onOpenCalendar(callback) {
        this.openCalendarCallback = callback;
    }

    /**
     * 设置页面变更回调
     * @param {Function} callback - 回调函数
     */
    onPageChange(callback) {
        this.onPageChangeCallback = callback;
    }

    /**
     * 渲染达人列表
     * @param {Array} talents - 达人数据数组
     * @param {Object} talentCollaborationStats - 达人合作统计
     */
    render(talents, talentCollaborationStats) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageData = talents.slice(start, end);

        if (pageData.length === 0) {
            this.elements.noTalentsPrompt.classList.remove('hidden');
            this.elements.talentListContainer.innerHTML = '';
            this.elements.paginationControls.innerHTML = '';
            return;
        }

        this.elements.noTalentsPrompt.classList.add('hidden');
        this.elements.talentListContainer.innerHTML = pageData.map(talent =>
            this.renderTalentCard(talent, talentCollaborationStats)
        ).join('');

        this.totalPages = Math.ceil(talents.length / this.itemsPerPage);
        this.renderPagination(this.totalPages, talents.length);
    }

    /**
     * 渲染单个达人卡片
     * @param {Object} talent - 达人数据
     * @param {Object} talentCollaborationStats - 达人合作统计
     * @returns {string} HTML字符串
     */
    renderTalentCard(talent, talentCollaborationStats) {
        const stats = talentCollaborationStats[talent.id] || { total: 0, published: 0 };
        const schedulePreview = this.renderSchedulePreview(talent, 30);
        const colors = generatePastelColorFromString(talent.nickname);

        return `
            <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div class="flex items-center">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mr-3"
                             style="background-color: ${colors.bg}; color: ${colors.text};">
                            ${(talent.nickname || '?')[0]}
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800">${talent.nickname || '未命名达人'}</h3>
                            <p class="text-sm text-gray-500">
                                已投稿: ${stats.published} / ${stats.total} (${stats.total > 0 ? Math.round(stats.published / stats.total * 100) : 0}%)
                            </p>
                        </div>
                    </div>
                    <button class="manage-schedule-btn px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
                            data-talent-id="${talent.id}">
                        管理档期
                    </button>
                </div>
                <div class="pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500 mb-2">未来30天档期预览 (绿色=有空):</p>
                    <div class="flex gap-1 flex-wrap">${schedulePreview}</div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染档期预览
     * @param {Object} talent - 达人数据
     * @param {number} days - 预览天数
     * @returns {string} HTML字符串
     */
    renderSchedulePreview(talent, days) {
        const schedules = talent.schedules || [];
        const scheduleSet = new Set(schedules);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let previewHtml = '';
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateString = formatDate(date);
            const isAvailable = scheduleSet.has(dateString);
            const bgColor = isAvailable ? 'bg-green-400' : 'bg-gray-300';
            const tooltipText = `${dateString} (${isAvailable ? '有空' : '没空'})`;
            previewHtml += `<div class="schedule-block w-4 h-4 rounded-sm ${bgColor}"><span class="schedule-tooltip">${tooltipText}</span></div>`;
        }
        return previewHtml;
    }

    /**
     * 渲染分页控制
     * @param {number} totalPages - 总页数
     * @param {number} totalItems - 总项目数
     */
    renderPagination(totalPages, totalItems) {
        this.elements.paginationControls.innerHTML = '';
        if (totalItems === 0) return;

        const perPageSelector = `
            <div class="flex items-center text-sm">
                <span class="mr-2 text-gray-600">每页显示:</span>
                <select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="5" ${this.itemsPerPage === 5 ? 'selected' : ''}>5</option>
                    <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="15" ${this.itemsPerPage === 15 ? 'selected' : ''}>15</option>
                    <option value="20" ${this.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                </select>
            </div>
        `;

        const pageButtons = [];
        const maxButtons = 7;

        if (totalPages > 1) {
            if (totalPages <= maxButtons) {
                for (let i = 1; i <= totalPages; i++) {
                    pageButtons.push(`<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
                }
            } else {
                pageButtons.push(`<button class="pagination-btn ${1 === this.currentPage ? 'active' : ''}" data-page="1">1</button>`);
                let start = Math.max(2, this.currentPage - 2);
                let end = Math.min(totalPages - 1, this.currentPage + 2);
                if (this.currentPage > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                for (let i = start; i <= end; i++) {
                    pageButtons.push(`<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
                }
                if (this.currentPage < totalPages - 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                pageButtons.push(`<button class="pagination-btn ${totalPages === this.currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
            }
        }

        const pageButtonsContainer = totalPages > 1
            ? `<div class="flex items-center gap-2">
                   <button id="prev-page-btn" class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''}>&lt;</button>
                   ${pageButtons.join('')}
                   <button id="next-page-btn" class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
               </div>`
            : '<div></div>';

        this.elements.paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }

    /**
     * 重置到第一页
     */
    resetToFirstPage() {
        this.currentPage = 1;
    }
}
