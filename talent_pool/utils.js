/**
 * utils.js
 * Talent Pool 工具函数模块
 *
 * 提供共享的工具函数，用于：
 * - 颜色生成和处理
 * - 字符串处理
 * - 数字格式化
 * - 日期处理
 */

/**
 * 将字符串转换为颜色（哈希算法）
 * 用于为标签生成一致的颜色
 *
 * @param {string} str - 输入字符串
 * @returns {string} 十六进制颜色值 (如 '#3498db')
 */
export function stringToColor(str) {
    if (!str) return '#e5e7eb'; // gray-200 作为默认颜色

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
}

/**
 * 根据背景颜色计算合适的文字颜色（黑色或白色）
 * 使用 YIQ 公式计算亮度
 *
 * @param {string} hexColor - 十六进制颜色值 (如 '#3498db')
 * @returns {string} 文字颜色 '#000000' 或 '#FFFFFF'
 */
export function getTextColor(hexColor) {
    if (!hexColor) return '#000000';

    // 移除 # 符号
    const hex = hexColor.replace('#', '');

    // 提取 RGB 值
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 计算亮度 (YIQ formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // 亮度大于 0.5 使用黑色，否则使用白色
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * 格式化数字为千分位表示
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串 (如 '1,234,567')
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toLocaleString();
}

/**
 * 格式化价格（带货币符号）
 * @param {number} price - 价格
 * @param {string} currency - 货币符号（默认 '¥'）
 * @returns {string} 格式化后的价格字符串 (如 '¥ 1,234,567')
 */
export function formatPrice(price, currency = '¥') {
    if (price === null || price === undefined) return 'N/A';
    return `${currency} ${formatNumber(price)}`;
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期
 * @param {string} format - 格式 ('date', 'datetime', 'time')
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'date') {
    if (!date) return 'N/A';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
        case 'date':
            return `${year}-${month}-${day}`;
        case 'datetime':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        case 'time':
            return `${hours}:${minutes}:${seconds}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * 解析标签字符串（支持中英文逗号）
 * @param {string} tagString - 标签字符串 (如 '美妆,剧情，搞笑')
 * @returns {Array<string>} 标签数组
 */
export function parseTags(tagString) {
    if (!tagString || typeof tagString !== 'string') return [];
    return tagString
        .split(/,|，/)
        .map(tag => tag.trim())
        .filter(Boolean);
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证数字范围
 * @param {number} num - 数字
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否在范围内
 */
export function isInRange(num, min, max) {
    return num >= min && num <= max;
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 生成UUID（简化版）
 * @returns {string} UUID字符串
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * 获取URL参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
export function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 将对象转换为URL查询字符串
 * @param {Object} obj - 对象
 * @returns {string} 查询字符串 (如 'key1=value1&key2=value2')
 */
export function objectToQueryString(obj) {
    return Object.keys(obj)
        .filter(key => obj[key] !== null && obj[key] !== undefined && obj[key] !== '')
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
        .join('&');
}

/**
 * 等待指定时间
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 导出所有工具函数
export default {
    stringToColor,
    getTextColor,
    formatNumber,
    formatPrice,
    formatDate,
    parseTags,
    isValidEmail,
    isInRange,
    debounce,
    throttle,
    deepClone,
    generateUUID,
    getURLParameter,
    objectToQueryString,
    sleep
};
