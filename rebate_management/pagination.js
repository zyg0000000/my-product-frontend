/**
 * @file pagination.js
 * @description 分页控件渲染模块
 */

import { currentPage, itemsPerPage } from './state-manager.js';

/**
 * 渲染分页控件
 * @param {number} totalPages - 总页数
 * @param {number} totalItems - 总条数
 */
export function renderPagination(totalPages, totalItems) {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    if (totalItems === 0) return;

    const perPageSelector = `
        <div class="flex items-center text-sm">
            <span class="mr-2 text-gray-600">每页显示:</span>
            <select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option>
                <option value="30" ${itemsPerPage === 30 ? 'selected' : ''}>30</option>
                <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
            </select>
        </div>`;

    const pageButtons = [];
    const maxButtons = 7;
    const currentPageNum = currentPage;

    if (totalPages > 1) {
        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) {
                pageButtons.push(`<button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
        } else {
            pageButtons.push(`<button class="pagination-btn ${1 === currentPageNum ? 'active' : ''}" data-page="1">1</button>`);
            let startPage = Math.max(2, currentPageNum - 2);
            let endPage = Math.min(totalPages - 1, currentPageNum + 2);

            if (currentPageNum - 1 > 3) {
                pageButtons.push('<span class="pagination-ellipsis">...</span>');
            }
            if (currentPageNum <= 4) {
                endPage = 5;
            }
            if (currentPageNum >= totalPages - 3) {
                startPage = totalPages - 4;
            }

            for (let i = startPage; i <= endPage; i++) {
                pageButtons.push(`<button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }

            if (totalPages - currentPageNum > 3) {
                pageButtons.push('<span class="pagination-ellipsis">...</span>');
            }
            pageButtons.push(`<button class="pagination-btn ${totalPages === currentPageNum ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
        }
    }

    const pageButtonsContainer = totalPages > 1
        ? `<div class="flex items-center gap-2">
            <button id="prev-page-btn" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>&lt;</button>
            ${pageButtons.join('')}
            <button id="next-page-btn" class="pagination-btn" ${currentPageNum === totalPages ? 'disabled' : ''}>&gt;</button>
          </div>`
        : '<div></div>';

    paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
}