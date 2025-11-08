/**
 * @file utils.js
 * @description 工具函数模块 - 包含自定义模态框等通用功能
 */

// 创建自定义模态框 DOM 元素
const modal = document.createElement('div');
modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
modal.innerHTML = `
    <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-bold text-gray-900" id="modal-title-custom"></h3>
        <div class="mt-2 py-3">
            <div class="text-sm text-gray-500" id="modal-message-custom"></div>
        </div>
        <div class="mt-4 flex justify-end space-x-2" id="modal-actions-custom">
            <button id="modal-cancel-custom" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
            <button id="modal-confirm-custom" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button>
        </div>
    </div>
`;
document.body.appendChild(modal);

const modalTitleEl = document.getElementById('modal-title-custom');
const modalMessageEl = document.getElementById('modal-message-custom');
const modalConfirmBtn = document.getElementById('modal-confirm-custom');
const modalCancelBtn = document.getElementById('modal-cancel-custom');

/**
 * 显示自定义提示框
 * @param {string} message - 提示消息
 * @param {string} title - 标题
 * @param {Function} callback - 回调函数
 */
export const showCustomAlert = (message, title = '提示', callback) => {
    modalTitleEl.textContent = title;
    modalMessageEl.innerHTML = message;
    modalConfirmBtn.textContent = '确定';
    modalConfirmBtn.onclick = () => {
        modal.classList.add('hidden');
        if (callback) callback(true);
    };
    modalCancelBtn.classList.add('hidden');
    modal.classList.remove('hidden');
};

/**
 * 显示自定义确认框
 * @param {string} message - 确认消息
 * @param {string} title - 标题
 * @param {Function} callback - 回调函数
 */
export const showCustomConfirm = (message, title = '确认操作', callback) => {
    modalTitleEl.textContent = title;
    modalMessageEl.innerHTML = message;
    modalConfirmBtn.textContent = '确定';
    modalConfirmBtn.onclick = () => {
        modal.classList.add('hidden');
        callback(true);
    };
    modalCancelBtn.classList.remove('hidden');
    modalCancelBtn.onclick = () => {
        modal.classList.add('hidden');
        callback(false);
    };
    modal.classList.remove('hidden');
};

/**
 * 隐藏模态框
 */
export const hideModal = () => {
    modal.classList.add('hidden');
};