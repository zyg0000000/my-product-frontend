/**
 * @file statistics.js
 * @description 统计展示模块
 */

import { CONFIG } from './constants.js';
import { formatRelativeTime } from './utils.js';

export default class StatisticsModule {
    constructor(app) {
        this.app = app;

        // DOM 元素
        this.cardsContainer = document.getElementById('statistic-cards-container');
        this.paginationContainer = document.getElementById('jobs-pagination-container');

        // 绑定事件处理器
        this.handlePaginationClick = this.handlePaginationClick.bind(this);
    }

    generate() {
        const grouped = {};

        // 根据视图模式筛选任务
        let jobsToProcess = this.app.jobsModule.allJobsCache.filter(job => job && job._id);

        // 测试任务视图：只显示测试任务
        if (this.app.viewMode === 'test') {
            jobsToProcess = jobsToProcess.filter(job => job.isTestTask === true);
        } else {
            // 工作流/项目视图：排除测试任务
            jobsToProcess = jobsToProcess.filter(job => !job.isTestTask);
        }

        // 工作流视图：只显示有效工作流的任务
        if (this.app.viewMode === 'workflow') {
            jobsToProcess = jobsToProcess.filter(job =>
                this.app.workflowModule.workflowMap.has(job.workflowId)
            );
        }

        jobsToProcess.forEach(job => {
            let key, name, color;
            if (this.app.viewMode === 'workflow' || this.app.viewMode === 'test') {
                const workflow = this.app.workflowModule.workflowMap.get(job.workflowId);
                key = job.workflowId;
                name = workflow ? workflow.name : '未知工作流';
                color = this.app.viewMode === 'test' ? 'amber' : 'indigo';
            } else {
                const projectName = this.app.projectMap.get(job.projectId);
                key = job.projectId || 'independent';
                name = projectName || '独立任务';
                color = 'purple';
            }

            if (!grouped[key]) {
                grouped[key] = {
                    key,
                    name,
                    color,
                    total: 0,
                    success: 0,
                    failed: 0,
                    processing: 0,
                    lastRun: new Date(0)
                };
            }

            grouped[key].total++;
            if (new Date(job.createdAt) > grouped[key].lastRun) {
                grouped[key].lastRun = new Date(job.createdAt);
            }

            const taskStatuses = (job.tasks || []).map(t => t.status);
            if (taskStatuses.includes('failed')) {
                grouped[key].failed++;
            } else if (taskStatuses.includes('processing') || taskStatuses.includes('pending')) {
                grouped[key].processing++;
            } else if (job.status === 'completed' || job.status === 'awaiting_review') {
                grouped[key].success++;
            }
        });

        const allStatsName = this.app.viewMode === 'test' ? '所有测试' : '所有任务';
        const allStats = {
            key: 'all',
            name: allStatsName,
            color: 'gray',
            total: 0,
            success: 0,
            failed: 0,
            processing: 0,
            lastRun: new Date(0)
        };

        Object.values(grouped).forEach(stat => {
            allStats.total += stat.total;
            allStats.success += stat.success;
            allStats.failed += stat.failed;
            allStats.processing += stat.processing;
            if (stat.lastRun > allStats.lastRun) {
                allStats.lastRun = stat.lastRun;
            }
        });

        return [allStats, ...Object.values(grouped).sort((a, b) => b.lastRun - a.lastRun)];
    }

    render() {
        if (!this.cardsContainer) return;

        this.cardsContainer.innerHTML = '';
        let stats = this.generate();

        if (this.app.viewMode === 'project') {
            const searchTerm = this.app.projectSearchTerm.toLowerCase();
            if (searchTerm) {
                stats = stats.filter(stat =>
                    stat.key === 'all' || (stat.name && stat.name.toLowerCase().includes(searchTerm))
                );
            } else if (this.app.activeFilter.type !== 'project') {
                this.cardsContainer.innerHTML = `<div class="col-span-1 md:col-span-2 text-center text-sm text-gray-500 py-4">请在上方搜索并选择一个项目以查看其统计数据。</div>`;
                return;
            }
        }

        stats.forEach(stat => {
            const card = document.createElement('div');
            const isActive = (this.app.activeFilter.type === this.app.viewMode || this.app.activeFilter.type === 'all') &&
                this.app.activeFilter.value === stat.key;
            card.className = `stat-card p-4 bg-white rounded-lg shadow-sm border-2 ${isActive ? 'active border-indigo-500' : 'border-transparent'}`;
            card.dataset.filterType = this.app.viewMode;
            card.dataset.filterValue = stat.key;

            const successRate = stat.total > 0 ? (stat.success / stat.total) * 100 : 0;

            card.innerHTML = `
                <h4 class="font-bold text-gray-800 truncate">${stat.name}</h4>
                <p class="text-xs text-gray-500">共执行 ${stat.total} 次 &bull; 最近: ${stat.lastRun.getTime() > 0 ? formatRelativeTime(stat.lastRun) : '无记录'}</p>
                <div class="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                    <div class="bg-green-500 h-1.5 rounded-full" style="width: ${successRate.toFixed(0)}%"></div>
                </div>
                <div class="flex justify-between items-center mt-2 text-xs font-medium">
                    <span class="text-green-600">成功: ${stat.success}</span>
                    <span class="text-red-600">失败: ${stat.failed}</span>
                    <span class="text-blue-600">处理中: ${stat.processing}</span>
                </div>
            `;
            this.cardsContainer.appendChild(card);
        });
    }

    renderPagination() {
        if (!this.paginationContainer) return;

        const jobsToDisplay = this.app.jobsModule.getFilteredJobs();
        const totalItems = this.app.jobsModule.allJobsCache.filter(job => {
            if (!job || !job._id) return false;
            if (this.app.viewMode === 'test') {
                if (!job.isTestTask) return false;
            } else {
                if (job.isTestTask) return false;
            }
            if (this.app.activeFilter.type === 'all' || this.app.activeFilter.type === 'none') return true;
            if (this.app.activeFilter.type === 'workflow' || this.app.activeFilter.type === 'test') {
                return job.workflowId === this.app.activeFilter.value;
            }
            if (this.app.activeFilter.type === 'project') {
                return (job.projectId || 'independent') === this.app.activeFilter.value;
            }
            return true;
        }).length;

        const totalPages = Math.ceil(totalItems / CONFIG.JOBS_PER_PAGE);
        const currentPage = this.app.currentPage;

        this.paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        this.paginationContainer.innerHTML = `
            <button data-page="${currentPage - 1}" class="pagination-btn px-3 py-1 text-sm rounded-md" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
            <span class="px-4 text-sm text-gray-700">第 ${currentPage} / ${totalPages} 页</span>
            <button data-page="${currentPage + 1}" class="pagination-btn px-3 py-1 text-sm rounded-md" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
        `;

        // 绑定事件
        this.paginationContainer.removeEventListener('click', this.handlePaginationClick);
        this.paginationContainer.addEventListener('click', this.handlePaginationClick);
    }

    handlePaginationClick(e) {
        const button = e.target.closest('button[data-page]');
        if (button && !button.disabled) {
            this.app.currentPage = parseInt(button.dataset.page, 10);
            this.app.render();
        }
    }

    // 资源清理
    unload() {
        if (this.paginationContainer) {
            this.paginationContainer.removeEventListener('click', this.handlePaginationClick);
        }
    }
}
