/**
 * @file utils.js
 * @description Project Report 页面工具函数
 * @version 1.0.0
 */

import { BUSINESS_CONSTANTS } from './constants.js';

/**
 * 项目报告工具类
 */
export class ReportUtils {
    /**
     * 获取本地日期字符串（YYYY-MM-DD格式）
     * 修复时区问题：使用本地时间而不是UTC时间
     * @param {Date} date - 日期对象，默认为当前日期
     * @returns {string} YYYY-MM-DD 格式的日期字符串
     */
    static getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 格式化日期
     * @param {string} isoString - ISO格式的日期字符串
     * @returns {string} 格式化后的日期字符串
     */
    static formatDate(isoString) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date)) return '无效日期';

        // 修复：确保日期解析正确，不因时区偏移一天
        const [year, month, day] = isoString.split('T')[0].split('-');
        return `${year}-${month}-${day}`;
    }

    /**
     * 统一的本地时区日期解析工具
     * 将 YYYY-MM-DD 格式的字符串解析为本地时区的日期对象（避免UTC时区问题）
     * @param {string} dateString - 日期字符串 (YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss)
     * @returns {Date|null} 本地时区的日期对象，解析失败返回 null
     */
    static parseLocalDate(dateString) {
        if (!dateString) return null;
        try {
            // 提取日期部分（去掉时间部分）
            const datePart = String(dateString).split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);

            if (!year || !month || !day) return null;

            // 使用本地时区创建日期
            return new Date(year, month - 1, day);
        } catch (e) {
            console.warn(`Failed to parse date: ${dateString}`, e);
            return null;
        }
    }

    /**
     * 检查视频是否发布超过 N 天
     * @param {string} publishDate - 视频发布日期 (YYYY-MM-DD)
     * @param {number} days - 天数阈值 (例如 14)
     * @param {Date} today - (可选) 用于比较的"今天"的日期对象
     * @returns {object} { isOverdue: boolean, overdueDays: number }
     */
    static getOverdueInfo(publishDate, days = BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today = new Date()) {
        if (!publishDate) return { isOverdue: false, overdueDays: 0 };

        try {
            // 修复时区问题：统一使用本地时区解析日期
            const [year, month, day] = publishDate.split('-').map(Number);
            const pubDate = new Date(year, month - 1, day);
            // 确保比较的是日期而不是时间
            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const diffTime = todayDateOnly.getTime() - pubDate.getTime();
            if (diffTime < 0) return { isOverdue: false, overdueDays: 0 }; // 还没发布

            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            return {
                isOverdue: diffDays >= days,  // 修复：发布满14天（含）即为超期
                overdueDays: diffDays
            };
        } catch(e) {
            console.warn(`Invalid date format for publishDate: ${publishDate}`);
            return { isOverdue: false, overdueDays: 0 };
        }
    }

    /**
     * 复制文本到剪贴板 (兼容 iFrame)
     * @param {string} text - 要复制的文本
     */
    static copyToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (err) {
            console.error('复制失败:', err);
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * 显示剪贴板提示 Toast
     * @param {HTMLElement} toastElement - Toast 元素
     */
    static showClipboardToast(toastElement) {
        if (!toastElement) return;
        toastElement.classList.remove('opacity-0');
        setTimeout(() => {
            toastElement.classList.add('opacity-0');
        }, BUSINESS_CONSTANTS.TOAST_DURATION);
    }

    /**
     * 解析播放量字符串（支持 "220.58w" 格式）
     * @param {string} viewString - 播放量字符串（例如 "220.58w" 或 "1,818.39w"）
     * @returns {number|null} 转换后的整数播放量（例如 2205800），失败返回 null
     */
    static parseViewCount(viewString) {
        if (!viewString || typeof viewString !== 'string') return null;

        try {
            // 去掉逗号
            let cleaned = viewString.replace(/,/g, '').trim();

            // 检查是否有 "w" 或 "W" 后缀（表示万）
            const hasWanSuffix = /w$/i.test(cleaned);

            if (hasWanSuffix) {
                // 去掉 "w" 后缀
                cleaned = cleaned.replace(/w$/i, '');
                // 解析数字并乘以 10000
                const numValue = parseFloat(cleaned);
                if (isNaN(numValue)) return null;
                return Math.round(numValue * 10000);
            } else {
                // 没有 "w" 后缀，直接解析数字
                const numValue = parseFloat(cleaned);
                if (isNaN(numValue)) return null;
                return Math.round(numValue);
            }
        } catch (e) {
            console.warn(`Failed to parse view count: ${viewString}`, e);
            return null;
        }
    }
}
