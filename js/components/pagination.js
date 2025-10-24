/**
 * @file pagination.js
 * @description Renders pagination controls.
 */

/**
 * Renders pagination controls in the specified container.
 * @param {HTMLElement} container - The container element for pagination controls.
 * @param {string} pageKey - Key to identify the pagination context (e.g., 'basic', 'performance').
 * @param {number} totalItems - Total number of items.
 * @param {number} currentPage - The current active page number.
 * @param {number} itemsPerPage - Number of items displayed per page.
 */
export function renderPagination(container, pageKey, totalItems, currentPage, itemsPerPage) {
    if (!container) return;
    container.innerHTML = ''; // Clear previous controls
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 0) return; // Don't render if no pages

    let buttons = '';
    // Simplified pagination buttons logic (can be expanded later if needed)
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        buttons += `<button class="pagination-btn" data-page-key="${pageKey}" data-page="1">1</button>`;
        if (startPage > 2) buttons += `<span class="pagination-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        buttons += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page-key="${pageKey}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) buttons += `<span class="pagination-ellipsis">...</span>`;
        buttons += `<button class="pagination-btn" data-page-key="${pageKey}" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Include items per page selector and summary
    const perPageOptions = [10, 20, 50]; // Example options
    const perPageSelector = `
        <div class="flex items-center text-sm">
            <span>每页:</span>
            <select class="items-per-page-select ml-2 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                ${perPageOptions.map(opt => `<option value="${opt}" ${itemsPerPage === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
        </div>`;
    const summary = `<div class="text-sm text-gray-700">共 ${totalItems} 条记录</div>`;
    const pageButtonsContainer = totalPages > 1 ? `
        <div class="flex items-center gap-1">
            <button class="pagination-btn prev-page-btn" data-page-key="${pageKey}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>
            ${buttons}
            <button class="pagination-btn next-page-btn" data-page-key="${pageKey}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
        </div>` : '<div></div>'; // Empty div to maintain layout

    // Assemble the final HTML
    container.innerHTML = `
        ${perPageSelector}
        <div class="flex items-center gap-4">
            ${summary}
            ${pageButtonsContainer}
        </div>`;
}
