/**
 * @file utils.js
 * @description Utility functions for task center
 */

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {boolean} isError - Whether this is an error message
 */
export function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `fixed top-5 right-5 z-50 px-4 py-2 rounded-md text-white shadow-lg ${
        isError ? 'bg-red-500' : 'bg-green-500'
    }`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Format ISO string to relative time
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted relative time
 */
export function formatRelativeTime(isoString) {
    if (!isoString) return '未知时间';
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const time = date.toTimeString().substr(0, 5);
    if (date >= today) return `今天 ${time}`;
    if (date >= yesterday) return `昨天 ${time}`;
    return date.toLocaleDateString();
}

/**
 * Get next occurrence of a specific day of week
 * @param {number} dayOfWeek - Day of week (0-6, 0 is Sunday)
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function getNextDayOfWeek(dayOfWeek) {
    const now = new Date();
    now.setDate(now.getDate() + (dayOfWeek - 1 - now.getDay() + 7) % 7 + 1);
    return now.toISOString().split('T')[0];
}

/**
 * Get next occurrence of a specific day of month
 * @param {number} day - Day of month
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function getNextMonthDay(day) {
    const now = new Date();
    let d = new Date(now.getFullYear(), now.getMonth(), day);
    if (now.getDate() >= day) {
        d = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }
    return d.toISOString().split('T')[0];
}