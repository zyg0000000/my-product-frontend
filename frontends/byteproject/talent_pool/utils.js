/**
 * utils.js - 工具函数模块
 * 基于 talent_pool.js v6.2.1
 */

/**
 * 字符串转颜色（哈希算法）
 */
export function stringToColor(str) {
    let hash = 0;
    if (!str) return '#e5e7eb';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

/**
 * 根据背景色计算文字颜色
 */
export function getTextColor(hexColor) {
    if (!hexColor) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * 价格类型配置（v6.2.1）
 */
export const PRICE_TYPES = [
    { key: '60s_plus', label: '60s+', fullLabel: '60s+视频', bgColor: '#dbeafe', textColor: '#1e40af' },
    { key: '20_to_60s', label: '20-60s', fullLabel: '20-60s视频', bgColor: '#d1fae5', textColor: '#065f46' },
    { key: '1_to_20s', label: '1-20s', fullLabel: '1-20s视频', bgColor: '#e9d5ff', textColor: '#6b21a8' }
];

export const PRICE_TYPE_ORDER = { '60s_plus': 0, '20_to_60s': 1, '1_to_20s': 2 };

export const PRICE_TYPE_LABELS = {
    '60s_plus': '60s+视频',
    '20_to_60s': '20-60s视频',
    '1_to_20s': '1-20s视频'
};
