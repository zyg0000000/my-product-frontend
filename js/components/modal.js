/**
 * @file modal.js
 * @description Encapsulates logic for showing custom alert, confirm, and loading modals.
 */

// --- DOM Elements (created dynamically or assumed to exist) ---
let alertModal, alertModalTitleEl, alertModalMessageEl, alertModalOkBtn;
let confirmModal, confirmModalTitleEl, confirmModalMessageEl, confirmModalConfirmBtn, confirmModalCancelBtn;
let loadingModal, loadingModalTitleEl, loadingModalMessageEl;

/**
 * Creates and appends the necessary modal elements to the DOM if they don't exist.
 */
function ensureModalsExist() {
    if (!document.getElementById('custom-alert-modal')) {
        alertModal = document.createElement('div');
        alertModal.id = 'custom-alert-modal';
        alertModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
        alertModal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="alert-modal-title"></h3><div class="mt-2 py-3"><p class="text-sm text-gray-500" id="alert-modal-message"></p></div><div class="mt-4 flex justify-end"><button id="alert-modal-ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
        document.body.appendChild(alertModal);
        alertModalTitleEl = document.getElementById('alert-modal-title');
        alertModalMessageEl = document.getElementById('alert-modal-message');
        alertModalOkBtn = document.getElementById('alert-modal-ok-btn');
    }

    if (!document.getElementById('custom-confirm-modal')) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'custom-confirm-modal';
        confirmModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
        confirmModal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="confirm-modal-title"></h3><div class="mt-2 py-3"><p class="text-sm text-gray-500" id="confirm-modal-message"></p></div><div class="mt-4 flex justify-end space-x-2"><button id="confirm-modal-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button id="confirm-modal-confirm-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
        document.body.appendChild(confirmModal);
        confirmModalTitleEl = document.getElementById('confirm-modal-title');
        confirmModalMessageEl = document.getElementById('confirm-modal-message');
        confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');
        confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');
    }

     if (!document.getElementById('custom-loading-modal')) {
        loadingModal = document.createElement('div');
        loadingModal.id = 'custom-loading-modal';
        loadingModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
        // Simple loading indicator
        loadingModal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-sm shadow-lg rounded-md bg-white flex items-center gap-4"><div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div><div><h3 class="text-lg font-bold text-gray-900" id="loading-modal-title">请稍候</h3><p class="text-sm text-gray-500" id="loading-modal-message">正在处理...</p></div></div>`;
        document.body.appendChild(loadingModal);
        loadingModalTitleEl = document.getElementById('loading-modal-title');
        loadingModalMessageEl = document.getElementById('loading-modal-message');
    }
}

/**
 * Shows a custom alert modal.
 * @param {string} message - The message to display.
 * @param {string} [title='提示'] - The modal title.
 * @param {Function} [callback] - Function to call after OK is clicked.
 */
export function showCustomAlert(message, title = '提示', callback) {
    ensureModalsExist();
    alertModalTitleEl.textContent = title;
    alertModalMessageEl.innerHTML = message; // Use innerHTML to allow basic formatting like <br>
    alertModalOkBtn.onclick = () => {
        alertModal.classList.add('hidden');
        if (callback) callback();
    };
    alertModal.classList.remove('hidden');
}

/**
 * Shows a custom confirm modal.
 * @param {string} message - The confirmation message.
 * @param {string} [title='确认操作'] - The modal title.
 * @param {Function} callback - Function called with true (confirm) or false (cancel).
 */
export function showCustomConfirm(message, title = '确认操作', callback) {
    ensureModalsExist();
    confirmModalTitleEl.textContent = title;
    confirmModalMessageEl.innerHTML = message;
    confirmModalConfirmBtn.onclick = () => {
        confirmModal.classList.add('hidden');
        if (callback) callback(true);
    };
    confirmModalCancelBtn.onclick = () => {
        confirmModal.classList.add('hidden');
        if (callback) callback(false);
    };
    confirmModal.classList.remove('hidden');
}

/**
 * Shows a loading indicator modal.
 * @param {string} message - The loading message.
 * @param {string} [title='请稍候'] - The modal title.
 * @returns {object} An object with a `close` method to hide the modal.
 */
export function showLoadingAlert(message = '正在处理...', title = '请稍候') {
    ensureModalsExist();
    loadingModalTitleEl.textContent = title;
    loadingModalMessageEl.innerHTML = message;
    loadingModal.classList.remove('hidden');
    return {
        close: () => {
            if(loadingModal) loadingModal.classList.add('hidden');
        }
    };
}
