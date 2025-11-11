/**
 * @file jobs.js
 * @description 任务批次管理模块
 */

import { API_ENDPOINTS, CONFIG, STATUS_CONFIG, TASK_STATUS_CONFIG } from './constants.js';
import { formatRelativeTime } from './utils.js';

export default class JobsModule {
    constructor(app) {
        this.app = app;
        this.allJobsCache = [];
        this.openJobDetails = new Set();
        this.tasksPaginationState = {};

        // DOM 元素
        this.listContainer = document.getElementById('filtered-jobs-list');

        // 绑定事件处理器
        this.handleListClick = this.handleListClick.bind(this);
    }

    async loadAll() {
        const projectIds = this.app.allProjects.map(p => p.id);
        const jobPromises = projectIds.map(id => this.app.apiCall(`${API_ENDPOINTS.jobs}?projectId=${id}`));
        const independentJobsPromise = this.app.apiCall(`${API_ENDPOINTS.jobs}?projectId=null`);

        try {
            const results = await Promise.all([...jobPromises, independentJobsPromise]);
            this.allJobsCache = results.flatMap(res => res.data || []);

            // 加载独立测试任务
            await this.loadIndependentTasks();

        } catch (error) {
            console.error('[JobsModule] Load failed:', error);
            this.allJobsCache = [];
        }
    }

    async loadIndependentTasks() {
        try {
            // 查询 jobId 为 null 的测试任务
            const response = await this.app.apiCall(`${API_ENDPOINTS.tasks}?jobId=null&limit=100`);
            const tasks = response.data || [];

            // 为每个独立任务创建虚拟 Job
            const virtualJobs = tasks.map(task => ({
                _id: `test_${task._id}`,
                workflowId: task.workflowId,
                projectId: task.projectId,
                createdAt: task.createdAt,
                status: task.status,
                tasks: [task],
                isVirtualJob: true,
                isTestTask: true
            }));

            // 将虚拟 Jobs 添加到缓存
            this.allJobsCache = [...this.allJobsCache, ...virtualJobs];

            console.log(`[JobsModule] Loaded ${virtualJobs.length} independent test tasks`);
        } catch (error) {
            console.error('[JobsModule] Load independent tasks failed:', error);
        }
    }

    render() {
        if (!this.listContainer) return;

        const jobsToDisplay = this.getFilteredJobs();

        this.listContainer.innerHTML = '';

        if (jobsToDisplay.length === 0) {
            if (this.app.viewMode === 'project' && this.app.activeFilter.type !== 'project') {
                this.listContainer.innerHTML = `<p class="text-center py-6 text-sm text-gray-500">请先在上方选择一个项目。</p>`;
            } else {
                this.listContainer.innerHTML = `<p class="text-center py-6 text-sm text-gray-500">没有找到匹配的任务批次。</p>`;
            }
        } else {
            jobsToDisplay.forEach(job => {
                const jobElement = document.createElement('div');
                const isExpanded = this.openJobDetails.has(job._id);
                jobElement.className = `job-row bg-white rounded-lg border border-gray-200 transition-all duration-300 ${isExpanded ? 'expanded' : ''}`;
                jobElement.innerHTML = this.buildJobRowHTML(job);
                this.listContainer.appendChild(jobElement);

                if (isExpanded) {
                    this.renderTasksForJob(job, jobElement.querySelector('.tasks-sublist'));
                }
            });
        }

        // 绑定事件（使用事件委托）
        this.listContainer.removeEventListener('click', this.handleListClick);
        this.listContainer.addEventListener('click', this.handleListClick);
    }

    getFilteredJobs() {
        const totalItems = this.allJobsCache
            .filter(job => {
                if (!job || !job._id) return false;

                // 根据视图模式筛选
                if (this.app.viewMode === 'test') {
                    if (!job.isTestTask) return false;
                } else {
                    if (job.isTestTask) return false;
                }

                // 根据卡片筛选条件
                if (this.app.activeFilter.type === 'all' || this.app.activeFilter.type === 'none') return true;
                if (this.app.activeFilter.type === 'workflow' || this.app.activeFilter.type === 'test') {
                    return job.workflowId === this.app.activeFilter.value;
                }
                if (this.app.activeFilter.type === 'project') {
                    return (job.projectId || 'independent') === this.app.activeFilter.value;
                }
                return true;
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const totalPages = Math.ceil(totalItems.length / CONFIG.JOBS_PER_PAGE);
        this.app.currentPage = Math.min(this.app.currentPage, totalPages || 1);

        return totalItems.slice((this.app.currentPage - 1) * CONFIG.JOBS_PER_PAGE, this.app.currentPage * CONFIG.JOBS_PER_PAGE);
    }

    buildJobRowHTML(job) {
        const total = job.tasks?.length || 0;
        const success = (job.tasks || []).filter(t => t.status === 'completed').length;
        const failed = (job.tasks || []).filter(t => t.status === 'failed').length;
        const progressPercent = total > 0 ? ((success + failed) / total) * 100 : 0;
        const statusInfo = STATUS_CONFIG[job.status] || { text: job.status, color: 'gray' };

        const workflow = this.app.workflowModule.workflowMap.get(job.workflowId) || { name: '未知工作流' };

        // 获取参数类型标签
        const paramKey = workflow?.requiredInput?.key || 'xingtuId';
        let paramTypeLabel = '';
        let paramTypeBgColor = '';
        let paramTypeTextColor = '';

        if (paramKey === 'videoId') {
            paramTypeLabel = '视频ID';
            paramTypeBgColor = 'bg-amber-100';
            paramTypeTextColor = 'text-amber-700';
        } else if (paramKey === 'taskId') {
            paramTypeLabel = '任务ID';
            paramTypeBgColor = 'bg-green-100';
            paramTypeTextColor = 'text-green-700';
        } else {
            paramTypeLabel = '星图ID';
            paramTypeBgColor = 'bg-indigo-100';
            paramTypeTextColor = 'text-indigo-700';
        }

        // 调整按钮逻辑
        let topRightControls = `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-800">${statusInfo.text}</span>`;
        if (job.status === 'awaiting_review') {
            topRightControls += `<button class="font-medium text-green-600 hover:text-green-800 text-xs bg-green-100 hover:bg-green-200 rounded-full px-3 py-1" data-action="complete-review" data-job-id="${job._id}">完成审查</button>`;
        } else if (job.status !== 'completed') {
            topRightControls += `<button class="font-medium text-red-600 hover:text-red-800 text-xs bg-red-100 hover:bg-red-200 rounded-full px-3 py-1" data-action="delete-job" data-job-id="${job._id}">删除</button>`;
        }

        return `
        <div class="job-header p-3 hover:bg-gray-50 cursor-pointer" data-action="toggle-details" data-job-id="${job._id}">
            <div class="flex justify-between items-center">
                <div>
                    <div class="flex items-center gap-2">
                        <p class="font-semibold text-gray-800 text-sm">${workflow.name}</p>
                        <span class="px-2 py-0.5 rounded text-xs font-medium ${paramTypeBgColor} ${paramTypeTextColor}">使用${paramTypeLabel}</span>
                    </div>
                    <p class="text-xs text-gray-500">#${job._id.slice(-6)} &bull; ${formatRelativeTime(job.createdAt)}</p>
                </div>
                <div class="flex items-center gap-3">
                    ${topRightControls}
                    <svg class="w-4 h-4 text-gray-500 expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
            </div>
            <div class="mt-2">
                <div class="flex justify-between text-xs text-gray-600 mb-1">
                    <span>进度: ${success + failed} / ${total}</span>
                    <span>成功: <b class="text-green-600">${success}</b>, 失败: <b class="text-red-600">${failed}</b></span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-blue-600 h-1.5 rounded-full" style="width: ${progressPercent}%"></div></div>
            </div>
        </div>
        <div class="job-details-content"><div class="tasks-sublist p-2 space-y-2"></div></div>`;
    }

    renderTasksForJob(job, container) {
        if (!this.tasksPaginationState[job._id]) {
            this.tasksPaginationState[job._id] = { loaded: 0 };
        }

        const state = this.tasksPaginationState[job._id];
        const tasks = job.tasks || [];
        const tasksToRender = tasks.slice(0, state.loaded + CONFIG.TASKS_PER_LOAD);

        container.innerHTML = tasksToRender.map(task => this.buildTaskRowHTML(task, job)).join('');

        state.loaded = tasksToRender.length;

        if (state.loaded < tasks.length) {
            const remaining = tasks.length - state.loaded;
            container.innerHTML += `<button class="load-more-tasks-btn w-full text-center text-xs text-blue-600 hover:underline py-2" data-job-id="${job._id}">加载更多 (${remaining}条)</button>`;
        }
    }

    buildTaskRowHTML(task, job) {
        const statusInfo = TASK_STATUS_CONFIG[task.status] || { text: '未知', color: 'gray' };

        // 获取参数类型信息
        const workflow = this.app.workflowModule.workflowMap.get(job?.workflowId);
        const paramKey = workflow?.requiredInput?.key || 'xingtuId';
        const paramLabel = workflow?.requiredInput?.label || '星图ID';

        // 根据参数类型确定显示值和标签颜色
        let targetId = 'N/A';
        let paramTypeLabel = '';
        let paramTypeBgColor = '';
        let paramTypeTextColor = '';

        if (paramKey === 'videoId' && task.videoId) {
            targetId = task.videoId;
            paramTypeLabel = '视频ID';
            paramTypeBgColor = 'bg-amber-100';
            paramTypeTextColor = 'text-amber-700';
        } else if (paramKey === 'taskId' && task.taskId) {
            targetId = task.taskId;
            paramTypeLabel = '任务ID';
            paramTypeBgColor = 'bg-green-100';
            paramTypeTextColor = 'text-green-700';
        } else if (paramKey === 'xingtuId' && (task.xingtuId || task.targetId)) {
            targetId = task.xingtuId || task.targetId;
            paramTypeLabel = '星图ID';
            paramTypeBgColor = 'bg-indigo-100';
            paramTypeTextColor = 'text-indigo-700';
        } else {
            targetId = task.targetId || task.xingtuId || task.taskId || task.videoId || 'N/A';
            paramTypeLabel = paramLabel;
            paramTypeBgColor = 'bg-gray-100';
            paramTypeTextColor = 'text-gray-700';
        }

        let resultHtml = '';
        if (task.status === 'completed') {
            const buttons = [];
            if (task.result?.screenshots?.length > 0) {
                buttons.push(`<button class="text-blue-600 hover:underline" data-action="view-screenshots" data-task-id="${task._id}">截图</button>`);
            }
            if (task.result?.data && Object.keys(task.result.data).length > 0) {
                buttons.push(`<button class="text-sky-600 hover:underline" data-action="view-data" data-task-id="${task._id}">数据</button>`);
            }
            resultHtml = buttons.join('<span class="mx-1 text-gray-300">|</span>');
        } else if (task.status === 'failed') {
            resultHtml = `<button class="text-red-600 hover:underline" title="${task.errorMessage || ''}" data-action="view-error" data-task-id="${task._id}">错误</button>`;
        }

        return `
        <div class="task-item flex justify-between items-center p-2 bg-gray-100 rounded-md text-xs">
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${paramTypeBgColor} ${paramTypeTextColor} flex-shrink-0">${paramTypeLabel}</span>
                <p class="font-mono text-gray-700 truncate" title="${paramTypeLabel}: ${targetId}">${targetId}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <span class="font-semibold text-${statusInfo.color}-600">${statusInfo.text}</span>
                <div class="space-x-2 w-20 text-center">${resultHtml}</div>
            </div>
        </div>`;
    }

    handleListClick(e) {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const jobId = actionTarget.dataset.jobId;

        if (actionTarget.tagName === 'BUTTON') {
            e.stopPropagation();
        }

        switch (action) {
            case 'toggle-details':
                this.toggleDetails(jobId);
                break;
            case 'complete-review':
                this.handleCompleteReview(jobId);
                break;
            case 'delete-job':
                this.handleDeleteJob(jobId);
                break;
            case 'view-screenshots':
                this.app.screenshotModal.open(actionTarget.dataset.taskId);
                break;
            case 'view-data':
                this.app.dataModal.open(actionTarget.dataset.taskId);
                break;
            case 'view-error':
                this.handleViewError(actionTarget.dataset.taskId);
                break;
            default:
                if (action === 'load-more-tasks') {
                    this.loadMoreTasks(jobId);
                }
                break;
        }
    }

    toggleDetails(jobId) {
        if (this.openJobDetails.has(jobId)) {
            this.openJobDetails.delete(jobId);
        } else {
            this.openJobDetails.add(jobId);
            this.tasksPaginationState[jobId] = { loaded: 0 };
        }
        this.render();
    }

    async handleCompleteReview(jobId) {
        this.app.showCustomConfirm('确定要将此批次标记为"已完成"吗？', '确认', async (confirmed) => {
            if (confirmed) {
                try {
                    await this.app.apiCall(`${API_ENDPOINTS.jobsManage}?id=${jobId}`, 'POST', { status: 'completed' });
                    this.app.showToast('批次状态已更新为"已完成"');

                    const job = this.allJobsCache.find(j => j._id === jobId);
                    if (job) job.status = 'completed';

                    this.render();
                } catch (error) {
                    console.error('[JobsModule] Complete review failed:', error);
                }
            }
        });
    }

    async handleDeleteJob(jobId) {
        this.app.showCustomConfirm('确定要删除此任务批次吗？如果批次下仍有子任务，删除将失败。', '确认删除', async (confirmed) => {
            if (confirmed) {
                try {
                    await this.app.apiCall(`${API_ENDPOINTS.jobsManage}?id=${jobId}`, 'DELETE');
                    this.app.showToast('任务批次已删除');

                    this.allJobsCache = this.allJobsCache.filter(j => j._id !== jobId);
                    this.render();
                } catch (error) {
                    console.error('[JobsModule] Delete job failed:', error);
                }
            }
        });
    }

    handleViewError(taskId) {
        const task = this.allJobsCache.flatMap(j => j.tasks || []).find(t => t._id === taskId);
        if (task) {
            alert(`错误详情:\n\n${task.errorMessage}`);
        }
    }

    loadMoreTasks(jobId) {
        const job = this.allJobsCache.find(j => j._id === jobId);
        if (!job) return;

        const jobElement = this.listContainer.querySelector(`[data-job-id="${jobId}"]`).closest('.job-row');
        const container = jobElement.querySelector('.tasks-sublist');

        this.renderTasksForJob(job, container);
    }

    // 资源清理
    unload() {
        if (this.listContainer) {
            this.listContainer.removeEventListener('click', this.handleListClick);
        }
    }
}
