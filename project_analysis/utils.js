/**
 * @module utils
 * @description Utility functions for formatting and data manipulation
 */

/**
 * Formats a number with thousand separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  return (Number(num) || 0).toLocaleString();
}

/**
 * Formats a number as currency (Chinese Yuan)
 * @param {number} num - The number to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(num) {
  return `¥${(Number(num) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Formats a number as percentage
 * @param {number} num - The number to format
 * @returns {string} Formatted percentage string
 */
export function formatPercent(num) {
  return `${(Number(num) || 0).toFixed(2)}%`;
}

/**
 * Sorts an array of monthly data by year and month
 * @param {Array} monthlyData - Array of objects with month property (format: "YYYY-MX")
 * @returns {Array} Sorted array
 */
export function sortMonthlyData(monthlyData) {
  return monthlyData.sort((a, b) => {
    const [yearA, monthA] = a.month.split('-');
    const [yearB, monthB] = b.month.split('-');
    const monthNumA = parseInt(monthA.replace('M', ''));
    const monthNumB = parseInt(monthB.replace('M', ''));

    if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
    return monthNumA - monthNumB;
  });
}

/**
 * Extracts unique values from an array of objects for a given field
 * @param {Array} items - Array of objects
 * @param {string} field - Field name to extract unique values from
 * @returns {Array} Sorted array of unique values
 */
export function getUniqueValues(items, field) {
  return [...new Set(items.map(item => item[field]).filter(Boolean))].sort();
}

/**
 * Gets unique years sorted in descending order
 * @param {Array} items - Array of objects
 * @param {string} field - Field name for year (e.g., 'financialYear' or 'year')
 * @returns {Array} Sorted array of unique years
 */
export function getUniqueYears(items, field) {
  return [...new Set(items.map(item => item[field]).filter(Boolean))].sort((a, b) => b - a);
}