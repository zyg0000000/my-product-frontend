/**
 * @file pagination.js
 * @description Pagination controls rendering for works management
 */

import { PAGE_SIZE_OPTIONS } from './constants.js';

/**
 * Build query string from state object
 * @param {Object} state - Query state object
 * @returns {string} Query string
 */
export function buildQueryString(state) {
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
        if (value !== null && value !== '') {
            params.append(key, value);
        }
    });
    return params.toString();
}

/**
 * Render pagination controls
 * @param {Object} pagination - Pagination data from API
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.pageSize - Items per page
 * @param {number} pagination.totalItems - Total number of items
 * @param {number} pagination.totalPages - Total number of pages
 */
export function renderPagination({ page, pageSize, totalItems, totalPages }) {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    if (totalItems === 0) return;

    // Create summary text
    const summary = createSummary(totalItems);

    // Create items per page selector
    const perPageSelector = createPerPageSelector(pageSize);

    // Create page buttons
    const pageButtonsContainer = createPageButtons(page, totalPages);

    // Assemble pagination controls
    paginationControls.innerHTML = `
        <div class="flex-1">${perPageSelector}</div>
        <div class="flex items-center gap-4">
            ${summary}
            ${pageButtonsContainer}
        </div>
    `;
}

/**
 * Create summary text showing total records
 */
function createSummary(totalItems) {
    return `<div class="text-sm text-gray-700">共 ${totalItems} 条记录</div>`;
}

/**
 * Create items per page selector dropdown
 */
function createPerPageSelector(currentPageSize) {
    const options = PAGE_SIZE_OPTIONS
        .map(size => `<option value="${size}" ${currentPageSize === size ? 'selected' : ''}>${size}</option>`)
        .join('');

    return `
        <div class="flex items-center text-sm">
            <span class="mr-2 text-gray-600">每页显示:</span>
            <select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">
                ${options}
            </select>
        </div>
    `;
}

/**
 * Create page navigation buttons with ellipsis for large page counts
 */
function createPageButtons(currentPage, totalPages) {
    if (totalPages <= 1) return '';

    let pageButtons = '';

    // Previous button
    pageButtons += `
        <button id="prev-page-btn" class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            &lt;
        </button>
    `;

    // Page number buttons with ellipsis logic
    if (totalPages <= 7) {
        // Show all pages if 7 or fewer
        for (let i = 1; i <= totalPages; i++) {
            pageButtons += createPageButton(i, currentPage);
        }
    } else {
        // Show first page
        pageButtons += createPageButton(1, currentPage);

        // Show ellipsis if current page is far from start
        if (currentPage > 4) {
            pageButtons += `<span class="pagination-ellipsis">...</span>`;
        }

        // Show pages around current page
        const start = Math.max(2, currentPage - 2);
        const end = Math.min(totalPages - 1, currentPage + 2);
        for (let i = start; i <= end; i++) {
            pageButtons += createPageButton(i, currentPage);
        }

        // Show ellipsis if current page is far from end
        if (currentPage < totalPages - 3) {
            pageButtons += `<span class="pagination-ellipsis">...</span>`;
        }

        // Show last page
        pageButtons += createPageButton(totalPages, currentPage);
    }

    // Next button
    pageButtons += `
        <button id="next-page-btn" class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            &gt;
        </button>
    `;

    return `<div class="flex items-center gap-1">${pageButtons}</div>`;
}

/**
 * Create individual page button
 */
function createPageButton(pageNumber, currentPage) {
    const isActive = pageNumber === currentPage;
    return `
        <button class="pagination-btn ${isActive ? 'active' : ''}" data-page="${pageNumber}">
            ${pageNumber}
        </button>
    `;
}