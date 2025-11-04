/**
 * @file utils.js
 * @description 执行看板工具函数
 */

import { AppCore } from '../common/app-core.js';

const { Format } = AppCore;

// 项目颜色配置
export const PROJECT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

/**
 * 获取周一
 * @param {Date} date - 输入日期
 * @returns {Date} 该日期所在周的周一
 */
export function getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);  // 标准化到00:00:00
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
}

/**
 * 获取合作的实际显示日期（已发布用publishDate，未发布用plannedReleaseDate）
 * @param {Object} collab - 合作对象
 * @returns {string} 日期字符串
 */
export function getCollabDisplayDate(collab) {
    if (collab.status === '视频已发布' && collab.publishDate) {
        return collab.publishDate;
    }
    return collab.plannedReleaseDate;
}

/**
 * 解析日期字符串为本地时区的Date对象（修复时区问题）
 * @param {string} dateStr - ISO日期字符串
 * @returns {Date} 本地时区的Date对象
 */
export function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
}

/**
 * 标准化日期到00:00:00
 * @param {Date} date - 日期对象
 * @returns {Date} 标准化后的日期
 */
export function normalizeDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
