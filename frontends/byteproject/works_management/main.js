/**
 * @file main.js
 * @description Main controller for works management - orchestrates all modules
 * @version 3.6-modularized
 */

import { API_PATHS } from './constants.js';
import { setLoadingState } from './utils.js';
import { apiRequest } from './api.js';
import { getQueryState } from './state-manager.js';
import { fetchAndRenderDashboard } from './dashboard.js';
import { loadProjectFilter, applyFilters, resetFilters } from './filter.js';
import { renderTable } from './table-renderer.js';
import { renderPagination, buildQueryString } from './pagination.js';
import {
    setupModalListeners,
    setupTableListeners,
    setupPaginationListeners
} from './event-handlers.js';

/**
 * Fetch and render works table with pagination
 */
async function fetchAndRenderWorks() {
    setLoadingState(true);
    try {
        const queryState = getQueryState();
        const queryString = buildQueryString(queryState);
        const response = await apiRequest(`${API_PATHS.getWorks}?${queryString}`);
        const { works, pagination } = response.data;

        renderTable(works);
        renderPagination(pagination);
    } catch (error) {
        const worksListBody = document.getElementById('works-list-body');
        worksListBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-red-500">
                    获取作品列表失败，请稍后重试。
                </td>
            </tr>
        `;
    } finally {
        setLoadingState(false);
    }
}

/**
 * Fetch and render all data (works + dashboard)
 */
async function fetchAndRenderAll() {
    await Promise.all([
        fetchAndRenderWorks(),
        fetchAndRenderDashboard()
    ]);
}

/**
 * Set up filter event listeners
 */
function setupFilterListeners() {
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            applyFilters();
            fetchAndRenderAll();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            resetFilters();
            fetchAndRenderAll();
        });
    }
}

/**
 * Initialize the page
 */
async function initializePage() {
    try {
        // Set up all event listeners
        setupModalListeners();
        setupFilterListeners();
        setupTableListeners(fetchAndRenderAll);
        setupPaginationListeners(fetchAndRenderWorks);

        // Load initial data
        await loadProjectFilter();
        await fetchAndRenderAll();
    } catch (error) {
        console.error('Failed to initialize page:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOM is already loaded
    initializePage();
}

// Export for debugging/testing purposes
export { fetchAndRenderWorks, fetchAndRenderAll };