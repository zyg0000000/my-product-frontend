/**
 * utils.js - 通用工具函数模块
 * 包含 alert 提示、日期格式化、百分比格式化等通用工具函数
 */

// --- Modal Alert ---
const modal = document.createElement('div');
modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
modal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="modal-title-custom"></h3><div class="mt-2 py-3"><div class="text-sm text-gray-500" id="modal-message-custom"></div></div><div class="mt-4 flex justify-end space-x-2" id="modal-actions-custom"><button id="modal-cancel-custom" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button id="modal-confirm-custom" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
document.body.appendChild(modal);

const modalTitleEl = document.getElementById('modal-title-custom');
const modalMessageEl = document.getElementById('modal-message-custom');
const modalConfirmBtn = document.getElementById('modal-confirm-custom');
const modalCancelBtn = document.getElementById('modal-cancel-custom');

/**
 * 显示自定义提示框
 * @param {string} message - 提示信息
 * @param {string} title - 提示标题
 */
export const showCustomAlert = (message, title = '提示') => {
    modalTitleEl.textContent = title;
    modalMessageEl.innerHTML = message;
    modalConfirmBtn.textContent = '确定';
    modalConfirmBtn.onclick = () => { modal.classList.add('hidden'); };
    modalCancelBtn.style.display = 'none';
    modal.classList.remove('hidden');
};

/**
 * 隐藏自定义提示框
 */
export const hideCustomAlert = () => {
    modal.classList.add('hidden');
};

/**
 * 格式化日期（提取日期部分）
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
export const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return dateString;
    try {
        return String(dateString).split('T')[0];
    } catch (e) {
        console.error("Could not parse date:", dateString);
        return dateString;
    }
};

/**
 * 格式化百分比
 * @param {number|string} value - 数值
 * @returns {string} 格式化后的百分比字符串
 */
export const formatPercentage = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${(num * 100).toFixed(2)}%`;
};

/**
 * 处理空值显示
 * @param {*} value - 值
 * @param {string} defaultValue - 默认值
 * @returns {string} 处理后的值
 */
export const handleEmptyValue = (value, defaultValue = 'N/A') => {
    if (value === undefined || value === null) return defaultValue;
    if (Array.isArray(value)) return value.length > 0 ? value : defaultValue;
    return value;
};

/**
 * 字符串转颜色（哈希算法）- 用于内容标签彩色显示
 * @param {string} str - 字符串
 * @returns {string} 十六进制颜色值
 */
export const stringToColor = (str) => {
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
};

/**
 * 根据背景色计算文字颜色
 * @param {string} hexColor - 十六进制背景色
 * @returns {string} 文字颜色（黑或白）
 */
export const getTextColor = (hexColor) => {
    if (!hexColor) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * 格式化数组类型字段为彩色标签 HTML
 * @param {Array} arr - 数组值
 * @returns {string} HTML 字符串
 */
export const formatArrayAsTags = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return 'N/A';
    return arr.map(item => {
        const color = stringToColor(item);
        const textColor = getTextColor(color);
        return `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium mr-1 mb-1" style="background-color:${color}; color:${textColor};">${item}</span>`;
    }).join('');
};