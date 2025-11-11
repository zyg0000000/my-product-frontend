/**
 * @file utils.js
 * @description Automation Suite 工具函数
 */

/**
 * 格式化相对时间
 * @param {string} isoString - ISO 时间字符串
 * @returns {string} 格式化后的时间
 */
export function formatRelativeTime(isoString) {
    if (!isoString) return '无记录';
    const date = new Date(isoString);
    const diff = new Date() - date;
    const diffMinutes = Math.floor(diff / 60000);
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
}

/**
 * 构建状态徽章 HTML
 * @param {string} status - 状态值
 * @param {object} statusConfig - 状态配置
 * @returns {string} HTML 字符串
 */
export function buildStatusBadge(status, statusConfig) {
    const info = statusConfig[status] || { text: status, color: 'gray' };
    return `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${info.color}-100 text-${info.color}-800">${info.text}</span>`;
}
