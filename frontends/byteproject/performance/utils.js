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
    if (Array.isArray(value)) return value.join(', ');
    return value;
};