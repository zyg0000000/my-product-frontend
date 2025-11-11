/**
 * @file utils.js
 * @description Utility functions for works management
 */

let confirmCallback = null;

/**
 * Show confirmation modal with custom message and actions
 * @param {string} message - Modal message content (supports HTML)
 * @param {string} title - Modal title
 * @param {boolean} isError - Whether this is an error message
 * @param {Function} onConfirm - Callback function for confirmation
 */
export function showConfirmModal(message, title = '请确认', isError = false, onConfirm = null) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalTitle = document.getElementById('confirm-modal-title');
    const confirmModalMessage = document.getElementById('confirm-modal-message');
    const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');

    confirmModalTitle.textContent = title;
    confirmModalMessage.innerHTML = message;
    confirmModalConfirmBtn.className = `px-4 py-2 text-white rounded-md ${isError ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`;
    confirmModalConfirmBtn.textContent = isError ? '好的' : '确定';
    confirmModalCancelBtn.style.display = isError ? 'none' : 'inline-block';
    confirmModal.classList.remove('hidden');
    confirmCallback = onConfirm;
}

/**
 * Close the confirmation modal
 */
export function closeConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    confirmModal.classList.add('hidden');
    confirmCallback = null;
}

/**
 * Get current confirmation callback
 */
export function getConfirmCallback() {
    return confirmCallback;
}

/**
 * Set loading state in the works table
 * @param {boolean} isLoading - Whether to show loading state
 */
export function setLoadingState(isLoading) {
    const worksListBody = document.getElementById('works-list-body');
    if (isLoading) {
        worksListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div></td></tr>`;
    }
}

/**
 * Format number for display (handles null/undefined)
 * @param {number} num - Number to format
 * @returns {string} Formatted number or 'N/A'
 */
export function formatNum(num) {
    return (num === null || num === undefined) ? 'N/A' : num.toLocaleString();
}