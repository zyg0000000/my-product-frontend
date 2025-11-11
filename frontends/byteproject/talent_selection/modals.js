/**
 * @file talent_selection/modals.js
 * @description 通用弹窗模块 - 成功提示、自定义提示
 */

// ==================== SuccessModal - 成功提示弹窗 ====================
export class SuccessModal {
    constructor() {
        this.successModal = document.getElementById('success-modal');
        this.successModalTitle = document.getElementById('success-modal-title');
        this.successModalMessage = document.getElementById('success-modal-message');
        this.closeSuccessModalBtn = document.getElementById('close-success-modal-btn');
        this.goToProjectBtn = document.getElementById('go-to-project-btn');

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.closeSuccessModalBtn) {
            this.closeSuccessModalBtn.addEventListener('click', () => this.close());
        }
    }

    show(title, message, projectId = null) {
        if (!this.successModal) return;

        this.successModalTitle.textContent = title;
        this.successModalMessage.textContent = message;

        // 如果提供了 projectId，显示"前往项目"按钮
        if (projectId && this.goToProjectBtn) {
            this.goToProjectBtn.classList.remove('hidden');
            this.goToProjectBtn.onclick = () => {
                window.location.href = `project_report.html?id=${projectId}`;
            };
        } else if (this.goToProjectBtn) {
            this.goToProjectBtn.classList.add('hidden');
        }

        this.successModal.classList.remove('hidden');
    }

    close() {
        if (this.successModal) {
            this.successModal.classList.add('hidden');
        }
    }
}

// ==================== CustomAlertModal - 自定义提示弹窗 ====================
export class CustomAlertModal {
    constructor() {
        // 动态创建 modal 元素（如果不存在）
        this.ensureModalExists();

        this.modal = document.getElementById('custom-alert-modal-dynamic');
        this.modalTitle = document.getElementById('modal-title-custom');
        this.modalMessage = document.getElementById('modal-message-custom');
        this.modalConfirmBtn = document.getElementById('modal-confirm-custom');
        this.modalCancelBtn = document.getElementById('modal-cancel-custom');
    }

    ensureModalExists() {
        if (document.getElementById('custom-alert-modal-dynamic')) return;

        const modal = document.createElement('div');
        modal.id = 'custom-alert-modal-dynamic';
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
            </div>`;
        document.body.appendChild(modal);
    }

    /**
     * 显示提示弹窗
     * @param {string} message - 提示信息
     * @param {string} title - 标题（默认：'提示'）
     * @param {Function} callback - 回调函数，参数为 true（确认）或 false（取消）
     */
    show(message, title = '提示', callback = null) {
        this.modalTitle.textContent = title;
        this.modalMessage.innerHTML = message;
        this.modalConfirmBtn.textContent = '确定';

        const handleConfirm = () => {
            this.modal.classList.add('hidden');
            if (callback) callback(true);
            cleanup();
        };

        const handleCancel = () => {
            this.modal.classList.add('hidden');
            if (callback) callback(false);
            cleanup();
        };

        const cleanup = () => {
            this.modalConfirmBtn.removeEventListener('click', handleConfirm);
            this.modalCancelBtn.removeEventListener('click', handleCancel);
        };

        // 如果只有确定按钮（纯提示）
        if (!callback) {
            this.modalCancelBtn.style.display = 'none';
        } else {
            this.modalCancelBtn.style.display = '';
            this.modalCancelBtn.addEventListener('click', handleCancel);
        }

        this.modalConfirmBtn.addEventListener('click', handleConfirm);
        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }
}
