/**
 * @file event-handlers.js
 * @description Event handlers for works management
 */

import { API_PATHS } from './constants.js';
import { apiRequest } from './api.js';
import { showConfirmModal, closeConfirmModal, getConfirmCallback } from './utils.js';
import {
    toggleWorkDetails,
    updateQueryState,
    clearOpenWorkDetails,
    setConfirmCallback
} from './state-manager.js';

/**
 * Handle toggle details button click (expand/collapse)
 * @param {string} workId - Work ID
 * @param {HTMLElement} button - Toggle button element
 */
export function handleToggleDetails(workId, button) {
    const mainRow = button.closest('tr');
    const subRow = mainRow.nextElementSibling;

    if (subRow && subRow.classList.contains('collapsible-row')) {
        const isExpanded = toggleWorkDetails(workId);

        // Update UI
        subRow.classList.toggle('expanded', isExpanded);
        button.querySelector('.rotate-icon').classList.toggle('rotated', isExpanded);
    }
}

/**
 * Handle delete button click
 * @param {string} workId - Work ID to delete
 * @param {string} workTitle - Work title for confirmation message
 * @param {Function} onSuccess - Callback to execute on successful deletion
 */
export function handleDelete(workId, workTitle, onSuccess) {
    const confirmMessage = `您确定要删除视频 "<strong>${workTitle}</strong>" 吗？此操作不可撤销。`;

    showConfirmModal(confirmMessage, '删除确认', false, async () => {
        try {
            await apiRequest(API_PATHS.deleteWork, 'DELETE', { id: workId });
            closeConfirmModal();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            // Error is already handled in apiRequest
        }
    });
}

/**
 * Handle pagination button click
 * @param {number} newPage - New page number
 * @param {Function} onPageChange - Callback to execute on page change
 */
export function handlePaginationClick(newPage, onPageChange) {
    updateQueryState({ page: newPage });
    clearOpenWorkDetails();  // [v3.4 BUG修复] Clear expanded state when changing pages

    if (onPageChange) {
        onPageChange(newPage);
    }
}

/**
 * Handle items per page change
 * @param {number} newPageSize - New page size
 * @param {Function} onPageSizeChange - Callback to execute on page size change
 */
export function handleItemsPerPageChange(newPageSize, onPageSizeChange) {
    updateQueryState({
        pageSize: newPageSize,
        page: 1  // Reset to first page when changing page size
    });
    clearOpenWorkDetails();  // [v3.4 BUG修复] Clear expanded state when changing page size

    if (onPageSizeChange) {
        onPageSizeChange(newPageSize);
    }
}

/**
 * Handle modal confirm button click
 */
export function handleModalConfirm() {
    const callback = getConfirmCallback();
    if (typeof callback === 'function') {
        callback();
    } else {
        closeConfirmModal();
    }
}

/**
 * Handle modal cancel button click
 */
export function handleModalCancel() {
    closeConfirmModal();
}

/**
 * Set up modal event listeners
 */
export function setupModalListeners() {
    const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');
    const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');

    if (confirmModalCancelBtn) {
        confirmModalCancelBtn.addEventListener('click', handleModalCancel);
    }

    if (confirmModalConfirmBtn) {
        confirmModalConfirmBtn.addEventListener('click', handleModalConfirm);
    }
}

/**
 * Set up works table event listeners (delegation)
 * @param {Function} onRefresh - Callback to refresh all data
 */
export function setupTableListeners(onRefresh) {
    const worksListBody = document.getElementById('works-list-body');

    if (worksListBody) {
        worksListBody.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            const workId = target.dataset.id;

            if (target.classList.contains('toggle-details-btn')) {
                handleToggleDetails(workId, target);
            } else if (target.classList.contains('delete-btn')) {
                const workTitle = target.dataset.title;
                handleDelete(workId, workTitle, onRefresh);
            }
        });
    }
}

/**
 * Set up pagination event listeners (delegation)
 * @param {Function} onPageChange - Callback when page changes
 */
export function setupPaginationListeners(onPageChange) {
    const paginationControls = document.getElementById('pagination-controls');

    if (paginationControls) {
        // Handle page button clicks
        paginationControls.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target || target.disabled) return;

            const newPage = Number(target.dataset.page);
            if (newPage && !isNaN(newPage)) {
                handlePaginationClick(newPage, onPageChange);
            }
        });

        // Handle items per page change
        paginationControls.addEventListener('change', (event) => {
            if (event.target.id === 'items-per-page') {
                const newPageSize = parseInt(event.target.value, 10);
                handleItemsPerPageChange(newPageSize, onPageChange);
            }
        });
    }
}