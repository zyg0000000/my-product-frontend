/**
 * @file helpers.js
 * @description Contains general utility functions used across the application.
 */

/**
 * Formats an ISO date string or Date object into YYYY-MM-DD format.
 * Returns 'N/A' for invalid dates.
 * @param {string|Date} dateInput - The date string or Date object.
 * @returns {string} Formatted date string or 'N/A'.
 */
export function formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    try {
        const date = (typeof dateInput === 'string' && !dateInput.includes('T'))
            ? new Date(dateInput + 'T00:00:00Z') // Assume UTC if only date part is given
            : new Date(dateInput);

        if (isNaN(date.getTime())) return '无效日期';

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return '日期错误';
    }
}

/**
 * Formats a number as currency (¥).
 * @param {number|string|null|undefined} num - The number to format.
 * @returns {string} Formatted currency string or '¥ 0.00'.
 */
export function formatCurrency(num) {
    const number = Number(num);
    if (isNaN(number)) return '¥ 0.00';
    return `¥ ${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a number as a percentage string (e.g., "12.34%").
 * @param {number|string|null|undefined} num - The number to format (expected as decimal, e.g., 0.1234).
 * @returns {string} Formatted percentage string or '0.00%'.
 */
export function formatPercent(num) {
     const number = Number(num);
     // Note: Assuming the number comes from backend already multiplied by 100 for percentages
     if (isNaN(number)) return '0.00%';
     return `${number.toFixed(2)}%`;
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add any other general utility functions here (e.g., copyToClipboard if used elsewhere)
export function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
        // Use document.execCommand for iframe compatibility
        success = document.execCommand('copy');
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
    document.body.removeChild(textArea);
    return success;
}
