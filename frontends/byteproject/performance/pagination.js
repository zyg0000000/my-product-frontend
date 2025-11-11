/**
 * pagination.js - 分页功能模块
 * 处理分页控件渲染和分页交互
 */

import { currentPage, itemsPerPage, totalTalents, updateCurrentPage, updateItemsPerPage } from './state-manager.js';
import { ITEMS_PER_PAGE_KEY } from './constants.js';

/**
 * 渲染分页控件
 * @param {number} totalPages - 总页数
 * @param {number} totalItems - 总条目数
 */
export function renderPagination(totalPages, totalItems) {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    if (totalItems === 0) return;

    // 每页条数选择器
    const perPageSelector = `
        <div class="flex items-center text-sm">
            <span class="mr-2 text-gray-600">每页:</span>
            <select id="items-per-page" class="rounded-md border-gray-300 text-sm">
                <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option>
                <option value="30" ${itemsPerPage === 30 ? 'selected' : ''}>30</option>
                <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
            </select>
            <span class="ml-4 text-gray-600">共 ${totalItems} 条</span>
        </div>
    `;

    // 页码按钮
    const pageButtons = [];
    const maxButtons = 7;

    if (totalPages > 1) {
        if (totalPages <= maxButtons) {
            // 显示所有页码
            for (let i = 1; i <= totalPages; i++) {
                pageButtons.push(`
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `);
            }
        } else {
            // 显示部分页码，带省略号
            pageButtons.push(`
                <button class="pagination-btn ${1 === currentPage ? 'active' : ''}" data-page="1">
                    1
                </button>
            `);

            let start = Math.max(2, currentPage - 2);
            let end = Math.min(totalPages - 1, currentPage + 2);

            if (currentPage > 4) {
                pageButtons.push('<span class="pagination-ellipsis">...</span>');
            }

            for (let i = start; i <= end; i++) {
                pageButtons.push(`
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `);
            }

            if (currentPage < totalPages - 3) {
                pageButtons.push('<span class="pagination-ellipsis">...</span>');
            }

            pageButtons.push(`
                <button class="pagination-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">
                    ${totalPages}
                </button>
            `);
        }
    }

    // 分页按钮容器
    const pageButtonsContainer = totalPages > 1 ? `
        <div class="flex items-center gap-2">
            <button id="prev-page-btn" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                &lt;
            </button>
            ${pageButtons.join('')}
            <button id="next-page-btn" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                &gt;
            </button>
        </div>
    ` : '<div></div>';

    paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
}

/**
 * 处理分页点击事件
 * @param {Event} e - 点击事件
 * @param {Function} fetchCallback - 获取数据的回调函数
 */
export function handlePaginationClick(e, fetchCallback) {
    const target = e.target.closest('button');
    if (!target || target.disabled) return;

    const totalPages = Math.ceil(totalTalents / itemsPerPage);
    let newPage = currentPage;

    if (target.id === 'prev-page-btn') {
        newPage--;
    } else if (target.id === 'next-page-btn') {
        newPage++;
    } else if (target.dataset.page) {
        newPage = Number(target.dataset.page);
    }

    newPage = Math.max(1, Math.min(newPage, totalPages || 1));

    if (newPage !== currentPage) {
        updateCurrentPage(newPage);
        fetchCallback();
    }
}

/**
 * 处理每页条数变化
 * @param {number} newItemsPerPage - 新的每页条数
 * @param {Function} fetchCallback - 获取数据的回调函数
 */
export function handleItemsPerPageChange(newItemsPerPage, fetchCallback) {
    updateItemsPerPage(newItemsPerPage);
    localStorage.setItem(ITEMS_PER_PAGE_KEY, newItemsPerPage);
    updateCurrentPage(1);
    fetchCallback();
}