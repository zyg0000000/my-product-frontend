/**
 * @file modal-data.js
 * @description 数据查看弹窗模块
 */

export default class DataModal {
    constructor(app) {
        this.app = app;
        this.currentTaskData = {};

        // DOM 元素
        this.modal = document.getElementById('data-modal');
        this.modalTitle = document.getElementById('data-modal-title');
        this.closeBtn = document.getElementById('close-data-modal');
        this.tableBody = document.getElementById('data-modal-table-body');
        this.copyBtn = document.getElementById('copy-data-btn');

        // 绑定事件处理器
        this.handleClose = this.handleClose.bind(this);
        this.handleCopy = this.handleCopy.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this.handleClose);
        }
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', this.handleCopy);
        }
    }

    open(taskId) {
        const task = this.app.jobsModule.allJobsCache
            .flatMap(j => j.tasks || [])
            .find(t => t._id === taskId);

        const data = task?.result?.data;
        if (!data || Object.keys(data).length === 0) return;

        this.currentTaskData = data;

        // 更新标题
        if (this.modalTitle) {
            this.modalTitle.textContent = `数据抓取结果 (目标ID: ${task.targetId || task.xingtuId || 'N/A'})`;
        }

        // 渲染表格
        if (this.tableBody) {
            this.tableBody.innerHTML = Object.entries(data).map(([key, value]) => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">${key}</td>
                    <td class="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">${String(value).replace(/\n/g, '<br>')}</td>
                </tr>
            `).join('');
        }

        // 保存数据供复制使用
        if (this.copyBtn) {
            this.copyBtn.dataset.taskData = JSON.stringify(data);
        }

        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.currentTaskData = {};
    }

    handleClose() {
        this.close();
    }

    handleCopy() {
        const data = this.currentTaskData;
        const textToCopy = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '已复制!';
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            alert('复制失败: ' + err);
        });
    }

    // 资源清理
    unload() {
        if (this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.handleClose);
        }
        if (this.copyBtn) {
            this.copyBtn.removeEventListener('click', this.handleCopy);
        }
    }
}
