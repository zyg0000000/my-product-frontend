/**
 * @file project_automation/tab-jobs.js
 * @description 任务批次Tab - 工作流筛选、任务列表、轮询机制
 */

export default class JobsTab {
    constructor(options) {
        this.options = options;
        this.projectId = options.projectId;
        this.automationJobs = options.automationJobs || [];
        this.apiRequest = options.apiRequest;
        this.showToast = options.showToast;
        this.showConfirm = options.showConfirm;

        // --- API URLs ---
        this.API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
        this.AUTOMATION_JOBS_GET_API = `${this.API_BASE_URL}/automation-jobs-get`;
        this.AUTOMATION_JOBS_MANAGE_API = `${this.API_BASE_URL}/automation-jobs`;

        // --- State ---
        this.allJobsCache = this.automationJobs;
        this.tasksCache = {};
        this.allCompletedTasks = [];
        this.selectedWorkflowFilter = 'all';
        this.currentPage = 1;
        this.ITEMS_PER_PAGE = 10;
        this.pollingInterval = null;
        this.initialized = false;

        // --- DOM Elements ---
        this.workflowFilterCards = document.getElementById('workflow-filter-cards');
        this.jobsContainer = document.getElementById('jobs-container');
        this.jobsPaginationContainer = document.getElementById('jobs-pagination-container');
        this.jobsTableTitle = document.getElementById('jobs-table-title');

        // --- Bind Methods ---
        this.handleJobsAreaClick = this.handleJobsAreaClick.bind(this);

        // 初始化任务缓存
        this.rebuildTasksCache();
    }

    async load() {
        console.log('[JobsTab] 加载任务批次列表');

        // 只在首次加载时渲染
        if (!this.initialized) {
            this.setupEventListeners();
            this.renderWorkflowFilterCards();
            this.renderFilteredJobsList();
            this.initialized = true;
        }

        // 启动轮询
        this.startPolling();
    }

    unload() {
        console.log('[JobsTab] 卸载Tab，停止轮询');
        this.stopPolling();
    }

    setupEventListeners() {
        if (this.jobsContainer) {
            this.jobsContainer.removeEventListener('click', this.handleJobsAreaClick);
            this.jobsContainer.addEventListener('click', this.handleJobsAreaClick);
        }
    }

    updateJobs(newJobs) {
        this.allJobsCache = newJobs;
        this.rebuildTasksCache();
    }

    rebuildTasksCache() {
        this.tasksCache = {};
        this.allCompletedTasks = [];
        this.allJobsCache.forEach(job => {
            (job.tasks || []).forEach(task => {
                this.tasksCache[task._id] = task;
                if (task.status === 'completed') {
                    this.allCompletedTasks.push(task);
                }
            });
        });
    }

    renderWorkflowFilterCards() {
        if (!this.workflowFilterCards) return;

        if (!this.allJobsCache || this.allJobsCache.length === 0) {
            this.workflowFilterCards.innerHTML = '';
            return;
        }

        // 按工作流统计
        const workflowStats = {
            all: { name: '全部任务', count: this.allJobsCache.length }
        };

        this.allJobsCache.forEach(job => {
            const workflowId = job.workflowId || 'unknown';
            const workflowName = job.workflowName || '未知工作流';

            if (!workflowStats[workflowId]) {
                workflowStats[workflowId] = { name: workflowName, count: 0 };
            }
            workflowStats[workflowId].count++;
        });

        // 渲染卡片
        const cardsHtml = Object.entries(workflowStats).map(([key, stat]) => {
            const isActive = this.selectedWorkflowFilter === key;
            const bgColor = isActive ? 'bg-indigo-100 border-indigo-500' : 'bg-white border-gray-200 hover:border-indigo-300';
            const textColor = isActive ? 'text-indigo-700' : 'text-gray-700';

            return `
                <div class="workflow-filter-card cursor-pointer border-2 ${bgColor} rounded-lg p-4 transition-all hover:shadow-md"
                     data-workflow-id="${key}">
                    <div class="text-xs ${textColor} font-medium mb-1">${stat.name}</div>
                    <div class="text-2xl font-bold ${textColor}">${stat.count}</div>
                </div>`;
        }).join('');

        this.workflowFilterCards.innerHTML = cardsHtml;

        // 绑定点击事件
        this.workflowFilterCards.querySelectorAll('.workflow-filter-card').forEach(card => {
            card.addEventListener('click', () => {
                const workflowId = card.dataset.workflowId;
                this.selectedWorkflowFilter = workflowId;
                this.currentPage = 1; // 重置页码
                this.renderWorkflowFilterCards(); // 重新渲染卡片（更新选中状态）
                this.renderFilteredJobsList(); // 重新渲染任务列表
            });
        });
    }

    renderFilteredJobsList() {
        if (!this.jobsContainer) return;

        if (!this.allJobsCache || this.allJobsCache.length === 0) {
            this.jobsContainer.innerHTML = `
                <tr><td colspan="7" class="text-center py-8 text-gray-500">此项目暂无自动化任务。</td></tr>`;
            if (this.jobsPaginationContainer) this.jobsPaginationContainer.innerHTML = '';
            if (this.jobsTableTitle) this.jobsTableTitle.textContent = '全部任务批次';
            return;
        }

        // 筛选任务
        let filteredJobs = this.allJobsCache;
        if (this.selectedWorkflowFilter !== 'all') {
            filteredJobs = this.allJobsCache.filter(job => job.workflowId === this.selectedWorkflowFilter);
        }

        // 排序
        const sortedJobs = filteredJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 分页
        const start = (this.currentPage - 1) * this.ITEMS_PER_PAGE;
        const end = start + this.ITEMS_PER_PAGE;
        const paginatedJobs = sortedJobs.slice(start, end);

        // 更新标题
        const workflowName = this.selectedWorkflowFilter === 'all'
            ? '全部任务批次'
            : (this.allJobsCache.find(j => j.workflowId === this.selectedWorkflowFilter)?.workflowName || '任务批次');
        if (this.jobsTableTitle) {
            this.jobsTableTitle.textContent = `${workflowName} (${filteredJobs.length})`;
        }

        // 渲染表格
        this.jobsContainer.innerHTML = paginatedJobs.map(job => {
            const totalTasks = (job.tasks || []).length;
            const completedTasks = (job.tasks || []).filter(t => ['completed', 'failed'].includes(t.status)).length;

            let actionsHtml = '';
            if (job.status === 'awaiting_review') {
                actionsHtml = `
                    <button class="font-medium text-green-600 hover:underline"
                            data-action="complete-review"
                            data-job-id="${job._id}">完成审查</button>
                    <button class="font-medium text-blue-600 hover:underline"
                            data-action="view-job-details"
                            data-job-id="${job._id}">查看详情</button>`;
            } else {
                actionsHtml = `
                    <button class="font-medium text-blue-600 hover:underline"
                            data-action="view-job-details"
                            data-job-id="${job._id}">查看详情</button>
                    <button class="font-medium text-red-600 hover:underline"
                            data-action="delete-job"
                            data-job-id="${job._id}">删除</button>`;
            }

            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <div class="font-bold text-gray-900">#${job._id.slice(-6)}</div>
                        <div class="text-xs text-gray-500">${this.formatDate(job.createdAt, true)}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">${job.workflowName || '未知'}</span>
                    </td>
                    <td class="px-6 py-4">${this.getStatusBadge(job.status)}</td>
                    <td class="px-6 py-4 font-mono text-center">${completedTasks} / ${totalTasks}</td>
                    <td class="px-6 py-4 font-mono text-green-600 text-center">${job.successTasks || 0}</td>
                    <td class="px-6 py-4 font-mono text-red-600 text-center">${job.failedTasks || 0}</td>
                    <td class="px-6 py-4 text-right space-x-4">${actionsHtml}</td>
                </tr>`;
        }).join('');

        // 渲染分页
        this.renderPaginationControls(filteredJobs.length);
    }

    renderPaginationControls(totalItems) {
        if (!this.jobsPaginationContainer) return;

        this.jobsPaginationContainer.innerHTML = '';
        if (totalItems <= this.ITEMS_PER_PAGE) return;

        const totalPages = Math.ceil(totalItems / this.ITEMS_PER_PAGE);
        const prevDisabled = this.currentPage === 1;
        const nextDisabled = this.currentPage === totalPages;

        let paginationHtml = `<span class="text-sm text-gray-700 mr-4">总计 ${totalItems} 项</span>`;
        paginationHtml += `
            <button data-page="${this.currentPage - 1}"
                    class="px-3 py-1 text-sm rounded-md ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}"
                    ${prevDisabled ? 'disabled' : ''}>上一页</button>`;
        paginationHtml += `<span class="px-4 text-sm text-gray-700">第 ${this.currentPage} / ${totalPages} 页</span>`;
        paginationHtml += `
            <button data-page="${this.currentPage + 1}"
                    class="px-3 py-1 text-sm rounded-md ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50 border'}"
                    ${nextDisabled ? 'disabled' : ''}>下一页</button>`;

        this.jobsPaginationContainer.innerHTML = paginationHtml;

        // 绑定分页按钮事件
        this.jobsPaginationContainer.querySelectorAll('button[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page, 10);
                this.currentPage = targetPage;
                this.renderFilteredJobsList();
            });
        });
    }

    async handleJobsAreaClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const jobId = target.dataset.jobId;

        if (action === 'view-job-details') {
            // 触发打开任务详情弹窗事件
            document.dispatchEvent(new CustomEvent('openJobDetailsModal', {
                detail: { jobId, allJobsCache: this.allJobsCache, tasksCache: this.tasksCache }
            }));
            return;
        }

        if (action === 'complete-review') {
            this.showConfirm('确定要将此批次标记为"已完成"吗？', '确认', async (confirmed) => {
                if (confirmed) {
                    try {
                        await this.apiRequest(`${this.AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'POST', {
                            status: 'completed'
                        });
                        this.showToast('批次状态已更新为"已完成"');
                        // 触发刷新事件
                        document.dispatchEvent(new CustomEvent('refreshJobs'));
                    } catch (e) {
                        // 错误已在 apiRequest 中处理
                    }
                }
            });
            return;
        }

        if (action === 'delete-job') {
            this.showConfirm('确定要删除此任务批次吗？如果批次下仍有子任务，删除将失败。', '确认删除', async (confirmed) => {
                if (confirmed) {
                    try {
                        await this.apiRequest(`${this.AUTOMATION_JOBS_MANAGE_API}?id=${jobId}`, 'POST');
                        this.showToast('任务批次已删除');
                        this.allJobsCache = this.allJobsCache.filter(j => j._id !== jobId);
                        this.rebuildTasksCache();
                        this.renderWorkflowFilterCards();
                        this.renderFilteredJobsList();
                    } catch (e) {
                        // 错误已在 apiRequest 中处理
                    }
                }
            });
            return;
        }
    }

    startPolling() {
        // 先停止已有轮询
        this.stopPolling();

        // 检查是否有正在运行的任务
        const hasActiveTasks = this.allJobsCache.some(job =>
            (job.tasks || []).some(task => ['pending', 'processing'].includes(task.status))
        );

        if (!hasActiveTasks) {
            console.log('[JobsTab] 没有活动任务，不启动轮询');
            return;
        }

        console.log('[JobsTab] 启动轮询（每5秒）');
        this.pollingInterval = setInterval(async () => {
            if (document.hidden) return; // 页面隐藏时跳过

            try {
                const data = await this.apiRequest(`${this.AUTOMATION_JOBS_GET_API}?projectId=${this.projectId}`);
                this.allJobsCache = data.data || [];
                this.rebuildTasksCache();
                this.renderWorkflowFilterCards();
                this.renderFilteredJobsList();

                // 检查是否还有活动任务
                const stillHasActiveTasks = this.allJobsCache.some(job =>
                    (job.tasks || []).some(task => ['pending', 'processing'].includes(task.status))
                );

                if (!stillHasActiveTasks) {
                    this.stopPolling();
                    this.showToast('所有任务已完成，自动刷新已停止。');
                }
            } catch (error) {
                console.error('轮询失败:', error);
                this.stopPolling();
            }
        }, 5000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            console.log('[JobsTab] 停止轮询');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
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
