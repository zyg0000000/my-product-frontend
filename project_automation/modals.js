/**
 * @file project_automation/modals.js
 * @description 其他弹窗 - 任务详情、截图查看、数据查看、Toast通知
 */

// ==================== JobDetailsModal ====================
export class JobDetailsModal {
    constructor(options) {
        this.options = options;
        this.apiRequest = options.apiRequest;
        this.showToast = options.showToast;
        this.showConfirm = options.showConfirm;
        this.API_BASE_URL = options.API_BASE_URL;

        // --- API URLs ---
        this.AUTOMATION_JOBS_MANAGE_API = `${this.API_BASE_URL}/automation-jobs`;
        this.AUTOMATION_TASKS_API = `${this.API_BASE_URL}/automation-tasks`;
        this.AUTOMATION_JOBS_GET_API = `${this.API_BASE_URL}/automation-jobs-get`;

        // --- State ---
        this.currentJobId = null;
        this.allJobsCache = [];
        this.tasksCache = {};

        // --- DOM Elements ---
        this.jobDetailsModal = document.getElementById('job-details-modal');
        this.jobDetailsModalTitle = document.getElementById('job-details-modal-title');
        this.jobDetailsModalCloseBtn = document.getElementById('job-details-modal-close-btn');
        this.jobDetailsStatsContainer = document.getElementById('job-details-stats-container');
        this.jobDetailsTasksContainer = document.getElementById('job-details-tasks-container');
        this.jobDetailsDeleteBtn = document.getElementById('job-details-delete-btn');
        this.jobDetailsFooterCloseBtn = document.getElementById('job-details-footer-close-btn');

        // --- Bind Methods ---
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.handleTaskActions = this.handleTaskActions.bind(this);

        // 设置事件监听
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.jobDetailsModalCloseBtn) {
            this.jobDetailsModalCloseBtn.addEventListener('click', this.close);
        }
        if (this.jobDetailsFooterCloseBtn) {
            this.jobDetailsFooterCloseBtn.addEventListener('click', this.close);
        }

        // 任务操作事件委托
        if (this.jobDetailsModal) {
            this.jobDetailsModal.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                this.handleTaskActions(target.dataset.action, target.dataset.taskId);
            });
        }

        // 监听打开弹窗事件
        document.addEventListener('openJobDetailsModal', (e) => {
            const { jobId, allJobsCache, tasksCache } = e.detail;
            this.allJobsCache = allJobsCache;
            this.tasksCache = tasksCache;
            this.open(jobId);
        });
    }

    open(jobId) {
        this.currentJobId = jobId;
        const job = this.allJobsCache.find(j => j._id === jobId);

        if (!job) {
            this.showToast("找不到该任务批次的信息", "error");
            return;
        }

        // 渲染标题
        this.jobDetailsModalTitle.innerHTML = `
            任务批次 #${job._id.slice(-6)} - 详情
            <p class="text-sm text-gray-500 mt-1">创建于: ${this.formatDate(job.createdAt, true)}</p>`;

        // 渲染统计信息
        this.renderStats(job);

        // 渲染任务列表
        this.renderTasks(job.tasks || []);

        // 删除按钮
        if (this.jobDetailsDeleteBtn) {
            this.jobDetailsDeleteBtn.onclick = () => this.handleDeleteJob(jobId);
        }

        // 显示弹窗
        if (this.jobDetailsModal) {
            this.jobDetailsModal.classList.remove('hidden');
        }

        console.log(`[JobDetailsModal] 打开任务详情: ${jobId}`);
    }

    close() {
        if (this.jobDetailsModal) {
            this.jobDetailsModal.classList.add('hidden');
        }
        console.log('[JobDetailsModal] 关闭弹窗');
    }

    renderStats(job) {
        const totalTasks = (job.tasks || []).length;
        const successTasks = job.successTasks || 0;
        const failedTasks = job.failedTasks || 0;
        const processingTasks = totalTasks - successTasks - failedTasks;

        this.jobDetailsStatsContainer.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-gray-800">${totalTasks}</p>
                <p class="text-sm text-gray-500">总任务数</p>
            </div>
            <div class="bg-green-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-green-600">${successTasks}</p>
                <p class="text-sm text-green-500">成功</p>
            </div>
            <div class="bg-red-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-red-600">${failedTasks}</p>
                <p class="text-sm text-red-500">失败</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-blue-600">${processingTasks}</p>
                <p class="text-sm text-blue-500">处理中/待处理</p>
            </div>`;
    }

    renderTasks(tasks) {
        if (tasks.length === 0) {
            this.jobDetailsTasksContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">此批次下无子任务。</div>`;
            return;
        }

        this.jobDetailsTasksContainer.innerHTML = `
            <div class="border rounded-lg overflow-hidden">
                <table class="w-full text-sm text-left text-gray-700">
                    <thead class="text-xs text-gray-800 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3">达人昵称</th>
                            <th scope="col" class="px-6 py-3">状态</th>
                            <th scope="col" class="px-6 py-3">结果 / 错误</th>
                            <th scope="col" class="px-6 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y" id="job-details-tasks-tbody">
                        ${tasks.map(task => `
                            <tr class="hover:bg-gray-50" id="details-task-${task._id}">
                                <td class="px-6 py-4 font-medium text-gray-900">${task.metadata?.talentNickname || 'N/A'}</td>
                                <td class="px-6 py-4">${this.getStatusBadge(task.status)}</td>
                                <td class="px-6 py-4 text-xs">${this.getTaskResultHtml(task)}</td>
                                <td class="px-6 py-4 text-right space-x-4">${this.getTaskActionsHtml(task)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    getTaskResultHtml(task) {
        if (task.status === 'completed') {
            const buttons = [];
            if (task.result?.screenshots?.length > 0) {
                buttons.push(`<button class="text-blue-600 hover:underline" data-action="view-screenshots" data-task-id="${task._id}">查看截图</button>`);
            }
            if (task.result?.data && Object.keys(task.result.data).length > 0) {
                buttons.push(`<button class="text-sky-600 hover:underline" data-action="view-data" data-task-id="${task._id}">查看数据</button>`);
            }
            return buttons.join('<span class="mx-1 text-gray-300">|</span>') || '<span class="text-gray-400">---</span>';
        } else if (task.status === 'failed') {
            return `<span class="text-red-600" title="${task.errorMessage || ''}">${(task.errorMessage || '未知错误').substring(0, 50)}...</span>`;
        }
        return '<span class="text-gray-400">---</span>';
    }

    getTaskActionsHtml(task) {
        const actions = [];
        if (task.status === 'failed') {
            actions.push(`<button class="font-medium text-yellow-600 hover:underline" data-action="retry-task" data-task-id="${task._id}">重试</button>`);
        }
        actions.push(`<button class="font-medium text-red-600 hover:underline" data-action="delete-task" data-task-id="${task._id}">删除</button>`);
        return actions.join('<span class="mx-2"></span>');
    }

    async handleTaskActions(action, taskId) {
        if (!taskId) return;

        if (action === 'retry-task') {
            this.showConfirm('确定要重试此任务吗？', '确认重试', async (confirmed) => {
                if (confirmed) {
                    try {
                        await this.apiRequest(`${this.AUTOMATION_TASKS_API}?id=${taskId}`, 'PUT', {
                            action: 'rerun'
                        });
                        this.showToast('任务已重新开始');
                        document.dispatchEvent(new CustomEvent('refreshJobs'));
                    } catch (e) {
                        // 错误已处理
                    }
                }
            });
        } else if (action === 'delete-task') {
            this.showConfirm('确定要删除此子任务吗？此操作不可撤销。', '确认删除', async (confirmed) => {
                if (confirmed) {
                    try {
                        await this.apiRequest(`${this.AUTOMATION_TASKS_API}?id=${taskId}`, 'DELETE');

                        // 从缓存中删除任务
                        let deletedFromJobId = null;
                        this.allJobsCache.forEach(job => {
                            const taskIndex = job.tasks.findIndex(t => t._id === taskId);
                            if (taskIndex > -1) {
                                job.tasks.splice(taskIndex, 1);
                                deletedFromJobId = job._id;
                            }
                        });

                        this.showToast('子任务已删除');

                        // 如果当前弹窗打开，则刷新
                        if (deletedFromJobId === this.currentJobId) {
                            this.open(this.currentJobId);
                        }

                        document.dispatchEvent(new CustomEvent('refreshJobs'));
                    } catch (e) {
                        // 错误已处理
                    }
                }
            });
        } else if (action === 'view-screenshots') {
            document.dispatchEvent(new CustomEvent('openScreenshotModal', {
                detail: { taskId, tasksCache: this.tasksCache }
            }));
        } else if (action === 'view-data') {
            document.dispatchEvent(new CustomEvent('openDataModal', {
                detail: { taskId, tasksCache: this.tasksCache }
            }));
        }
    }

    handleDeleteJob(jobId) {
        this.showConfirm('确定要删除此任务批次及其所有子任务吗？此操作不可撤销。', '确认删除', async (confirmed) => {
            if (confirmed) {
                this.close();
                try {
                    await this.apiRequest(`${this.AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'POST');
                    this.showToast('任务批次已删除');
                    document.dispatchEvent(new CustomEvent('refreshJobs'));
                } catch (e) {
                    // 错误已处理
                }
            }
        });
    }

    getStatusBadge(status) {
        const config = {
            'pending': { text: '待处理', color: 'gray' },
            'processing': { text: '执行中', color: 'blue' },
            'completed': { text: '已完成', color: 'green' },
            'failed': { text: '失败', color: 'red' },
            'awaiting_review': { text: '待审查', color: 'yellow' }
        };
        const c = config[status] || { text: status, color: 'gray' };
        return `<span data-status="${status}" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${c.color}-100 text-${c.color}-800">${c.text}</span>`;
    }

    formatDate(isoString, includeTime = false) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '无效日期';

        const pad = (num) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());

        if (includeTime) {
            const hours = pad(date.getHours());
            const minutes = pad(date.getMinutes());
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return `${year}-${month}-${day}`;
    }
}

// ==================== ScreenshotModal ====================
export class ScreenshotModal {
    constructor() {
        // --- State ---
        this.screenshots = [];
        this.currentIndex = 0;

        // --- DOM Elements ---
        this.screenshotModal = document.getElementById('screenshot-modal');
        this.screenshotModalTitle = document.getElementById('screenshot-modal-title');
        this.closeScreenshotModalBtn = document.getElementById('close-screenshot-modal');
        this.modalMainImage = document.getElementById('modal-main-image');
        this.modalThumbnails = document.getElementById('modal-thumbnails');
        this.modalPrevBtn = document.getElementById('modal-prev-btn');
        this.modalNextBtn = document.getElementById('modal-next-btn');

        // --- Bind Methods ---
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.changeImage = this.changeImage.bind(this);
        this.updateView = this.updateView.bind(this);

        // 设置事件监听
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.closeScreenshotModalBtn) {
            this.closeScreenshotModalBtn.addEventListener('click', this.close);
        }
        if (this.modalPrevBtn) {
            this.modalPrevBtn.addEventListener('click', () => this.changeImage(-1));
        }
        if (this.modalNextBtn) {
            this.modalNextBtn.addEventListener('click', () => this.changeImage(1));
        }

        // 缩略图点击
        if (this.modalThumbnails) {
            this.modalThumbnails.addEventListener('click', (e) => {
                const thumb = e.target.closest('.thumbnail-item');
                if (thumb) {
                    this.currentIndex = parseInt(thumb.dataset.index, 10);
                    this.updateView();
                }
            });
        }

        // 监听打开弹窗事件
        document.addEventListener('openScreenshotModal', (e) => {
            const { taskId, tasksCache } = e.detail;
            const task = tasksCache[taskId];
            if (task && task.result?.screenshots?.length) {
                this.open(task.result.screenshots);
            }
        });
    }

    open(screenshots) {
        this.screenshots = screenshots;
        this.currentIndex = 0;

        // 渲染缩略图
        this.modalThumbnails.innerHTML = this.screenshots.map((ss, index) => `
            <div class="thumbnail-item p-1 border-2 border-transparent rounded-md cursor-pointer hover:border-indigo-400"
                 data-index="${index}">
                <img src="${ss.url}" alt="${ss.name}" class="w-full h-20 object-cover rounded">
                <p class="text-xs text-gray-600 truncate mt-1" title="${ss.name}">${ss.name}</p>
            </div>`).join('');

        this.updateView();

        // 显示弹窗
        if (this.screenshotModal) {
            this.screenshotModal.classList.remove('hidden');
        }

        console.log(`[ScreenshotModal] 打开截图查看，共 ${screenshots.length} 张`);
    }

    close() {
        if (this.screenshotModal) {
            this.screenshotModal.classList.add('hidden');
        }
        if (this.modalMainImage) {
            this.modalMainImage.src = '';
        }
        console.log('[ScreenshotModal] 关闭弹窗');
    }

    updateView() {
        if (this.screenshots.length === 0) return;

        // 更新主图
        this.modalMainImage.src = this.screenshots[this.currentIndex].url;

        // 更新标题
        this.screenshotModalTitle.textContent = `截图结果 (${this.currentIndex + 1} / ${this.screenshots.length}) - ${this.screenshots[this.currentIndex].name}`;

        // 更新缩略图选中状态
        this.modalThumbnails.querySelectorAll('.thumbnail-item').forEach(thumb => {
            const isActive = parseInt(thumb.dataset.index, 10) === this.currentIndex;
            thumb.classList.toggle('active', isActive);
            if (isActive) {
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        // 更新前后按钮状态
        if (this.modalPrevBtn) this.modalPrevBtn.hidden = this.currentIndex === 0;
        if (this.modalNextBtn) this.modalNextBtn.hidden = this.currentIndex === this.screenshots.length - 1;
    }

    changeImage(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.screenshots.length) {
            this.currentIndex = newIndex;
            this.updateView();
        }
    }
}

// ==================== DataModal ====================
export class DataModal {
    constructor(showToast) {
        this.showToast = showToast;

        // --- State ---
        this.currentData = {};

        // --- DOM Elements ---
        this.dataModal = document.getElementById('data-modal');
        this.dataModalTitle = document.getElementById('data-modal-title');
        this.closeDataModalBtn = document.getElementById('close-data-modal');
        this.dataModalTableBody = document.getElementById('data-modal-table-body');
        this.copyDataBtn = document.getElementById('copy-data-btn');

        // --- Bind Methods ---
        this.open = this.open.bind(this);
        this.close = this.close.bind(this);
        this.handleCopyData = this.handleCopyData.bind(this);

        // 设置事件监听
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.closeDataModalBtn) {
            this.closeDataModalBtn.addEventListener('click', this.close);
        }
        if (this.copyDataBtn) {
            this.copyDataBtn.addEventListener('click', this.handleCopyData);
        }

        // 监听打开弹窗事件
        document.addEventListener('openDataModal', (e) => {
            const { taskId, tasksCache } = e.detail;
            const task = tasksCache[taskId];
            if (task && task.result?.data) {
                this.open(task.result.data, task.xingtuId || task.targetId || 'N/A');
            }
        });
    }

    open(data, xingtuId) {
        this.currentData = data;

        if (!data || Object.keys(data).length === 0) return;

        // 更新标题
        this.dataModalTitle.textContent = `数据抓取结果 (星图ID: ${xingtuId})`;

        // 渲染表格
        this.dataModalTableBody.innerHTML = Object.entries(data).map(([key, value]) => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">${key}</td>
                <td class="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">${String(value).replace(/\n/g, '<br>')}</td>
            </tr>`).join('');

        // 显示弹窗
        if (this.dataModal) {
            this.dataModal.classList.remove('hidden');
        }

        console.log('[DataModal] 打开数据查看');
    }

    close() {
        if (this.dataModal) {
            this.dataModal.classList.add('hidden');
        }
        console.log('[DataModal] 关闭弹窗');
    }

    handleCopyData() {
        const textToCopy = Object.entries(this.currentData)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        // 使用 document.execCommand 以确保在 iFrame 中可用
        try {
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('数据已复制!');
        } catch (err) {
            this.showToast('复制失败: ' + err, 'error');
        }
    }
}

// ==================== ToastManager ====================
export class ToastManager {
    constructor(toastNotification, toastMessage) {
        this.toastNotification = toastNotification;
        this.toastMessage = toastMessage;
        this.show = this.show.bind(this);
    }

    show(message, type = 'success') {
        if (!this.toastNotification || !this.toastMessage) return;

        this.toastMessage.textContent = message;
        this.toastNotification.className = `fixed top-5 right-5 z-[100] text-white py-2 px-5 rounded-lg shadow-lg transform transition-transform duration-300`;

        if (type === 'success') {
            this.toastNotification.classList.add('bg-green-500');
        } else {
            this.toastNotification.classList.add('bg-red-500');
        }

        this.toastNotification.classList.remove('hidden');
        this.toastNotification.classList.remove('opacity-0');

        setTimeout(() => {
            this.toastNotification.classList.add('opacity-0');
            setTimeout(() => this.toastNotification.classList.add('hidden'), 300);
        }, 3000);
    }
}
