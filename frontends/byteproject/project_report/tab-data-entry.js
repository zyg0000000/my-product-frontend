/**
 * @file tab-data-entry.js
 * @description 数据录入 Tab 模块
 * @version 1.0.0
 *
 * 职责:
 * - 加载可录入视频列表
 * - 渲染视频录入表格（分页）
 * - 处理播放量输入
 * - 统计信息更新（已完成/待完成）
 * - 保存录入数据
 * - 调用自动化抓取功能
 */

import { AppCore } from '../common/app-core.js';
import { API_ENDPOINTS, BUSINESS_CONSTANTS } from './constants.js';
import { ReportUtils } from './utils.js';

const { API, Modal, Pagination } = AppCore;

export class DataEntryTab {
    constructor(app, projectId, project, automationManager) {
        this.app = app;
        this.projectId = projectId;
        this.project = project;
        this.automationManager = automationManager;

        // 状态数据
        this.allVideosForEntry = [];
        this.overdueVideos = [];
        this.entryCurrentPage = 1;
        this.entryItemsPerPage = 10;
        this.initialized = false;

        // DOM 元素
        this.elements = {
            entryDatePicker: document.getElementById('entry-date-picker'),
            videoEntryList: document.getElementById('video-entry-list'),
            saveEntryBtn: document.getElementById('save-entry-btn'),
            cancelEntryBtn: document.getElementById('cancel-entry-btn'),
            autoScrapeBtn: document.getElementById('auto-scrape-btn'),
            autoScrapeOverdueBtn: document.getElementById('auto-scrape-overdue-btn'),
            manualUpdateBtn: document.getElementById('manual-update-btn'),
            entryTotalCount: document.getElementById('entry-total-count'),
            entryCompletedCount: document.getElementById('entry-completed-count'),
            entryPendingCount: document.getElementById('entry-pending-count'),
            videoEntryPaginationControls: document.getElementById('video-entry-pagination-controls')
        };

        // 从 localStorage 读取每页条目数
        this.entryItemsPerPage = parseInt(localStorage.getItem(BUSINESS_CONSTANTS.ITEMS_PER_PAGE_KEY) || '10');

        // 设置自动化管理器的回调
        if (this.automationManager) {
            this.automationManager.onTaskStatusUpdate = () => {
                this.renderVideoEntryList();
            };
        }
    }

    /**
     * 加载Tab数据
     */
    async load() {
        if (!this.initialized) {
            this.setupEventListeners();
            this.initialized = true;
        }

        await this.loadVideosForEntry();
    }

    /**
     * 加载可录入视频列表
     */
    async loadVideosForEntry() {
        if (!this.elements.videoEntryList) return;

        this.elements.videoEntryList.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">正在加载视频列表...</td></tr>`;

        try {
            const response = await API.request(`${API_ENDPOINTS.VIDEOS_FOR_ENTRY}?projectId=${this.projectId}&date=${this.elements.entryDatePicker.value}`);
            this.allVideosForEntry = response.data || [];

            // 过滤超期视频
            const today = new Date();
            this.overdueVideos = this.allVideosForEntry
                .map(video => ({
                    ...video,
                    overdueInfo: ReportUtils.getOverdueInfo(video.publishDate, BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today)
                }))
                .filter(video => video.overdueInfo.isOverdue);

            this.entryCurrentPage = 1;

            // 清空任务状态
            if (this.automationManager) {
                this.automationManager.clearTaskStatuses();
            }

            // 更新按钮状态
            this.updateButtonStates(today);

            // 渲染
            this.renderEntryPage();
        } catch (error) {
            this.elements.videoEntryList.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">加载失败: ${error.message}</td></tr>`;
        }
    }

    /**
     * 更新按钮状态
     * @param {Date} today - 今天的日期
     */
    updateButtonStates(today) {
        // 自动抓取按钮（≤14天）
        const uncompletedNonOverdue = this.allVideosForEntry.filter(v => {
            const info = ReportUtils.getOverdueInfo(v.publishDate, BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today);
            return !info.isOverdue && v.taskId;
        }).length;

        if (this.elements.autoScrapeBtn) {
            this.elements.autoScrapeBtn.disabled = (uncompletedNonOverdue === 0);
        }

        // 自动抓取超期按钮（>14天）
        const uncompletedOverdue = this.allVideosForEntry.filter(v => {
            const info = ReportUtils.getOverdueInfo(v.publishDate, BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today);
            return info.isOverdue && v.videoId;
        }).length;

        if (this.elements.autoScrapeOverdueBtn) {
            this.elements.autoScrapeOverdueBtn.disabled = (uncompletedOverdue === 0);
        }

        // 手动更新按钮
        if (this.elements.manualUpdateBtn) {
            this.elements.manualUpdateBtn.disabled = (this.overdueVideos.length === 0);
        }
    }

    /**
     * 渲染录入页面（列表+分页）
     */
    renderEntryPage() {
        this.renderVideoEntryList();
        this.renderEntryPagination();
    }

    /**
     * 渲染视频录入列表
     */
    renderVideoEntryList() {
        if (!this.allVideosForEntry || this.allVideosForEntry.length === 0) {
            this.elements.videoEntryList.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">此项目暂无可录入数据的视频。</td></tr>`;
            this.updateEntryStats();
            return;
        }

        const startIndex = (this.entryCurrentPage - 1) * this.entryItemsPerPage;
        const paginatedVideos = this.allVideosForEntry.slice(startIndex, startIndex + this.entryItemsPerPage);

        const today = new Date();

        this.elements.videoEntryList.innerHTML = paginatedVideos.map(video => {
            const task = this.automationManager ? this.automationManager.getTaskStatus(video.collaborationId) : null;

            // 检查是否超期
            const { isOverdue, overdueDays } = ReportUtils.getOverdueInfo(video.publishDate, BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today);

            let statusHtml = '';
            let isInputDisabled = false;

            // 优先显示任务状态，其次才显示是否超期
            if (task) {
                switch (task.status) {
                    case 'pending':
                        statusHtml = '<span class="text-xs font-semibold text-yellow-600">排队中...</span>';
                        isInputDisabled = true;
                        break;
                    case 'processing':
                        statusHtml = '<span class="text-xs font-semibold text-blue-600">自动抓取中...</span>';
                        isInputDisabled = true;
                        break;
                    case 'completed':
                        statusHtml = '<span class="text-xs font-semibold text-green-600">✓ 已完成</span>';
                        isInputDisabled = true;
                        // 解析播放量
                        const viewsRaw = task.result?.data?.['播放量'];
                        if (viewsRaw) {
                            const viewsParsed = ReportUtils.parseViewCount(viewsRaw);
                            if (viewsParsed !== null) {
                                const videoInMemory = this.allVideosForEntry.find(v => v.collaborationId === video.collaborationId);
                                if (videoInMemory) videoInMemory.totalViews = viewsParsed;
                            }
                        }
                        break;
                    case 'failed':
                        statusHtml = `<div class="flex items-center justify-center gap-2">
                                          <span class="text-xs font-semibold text-red-600 cursor-pointer" title="${task.errorMessage || '未知错误'}">✗ 失败</span>
                                          <button data-task-id="${task._id}" class="retry-scrape-btn text-xs text-blue-600 hover:underline">重试</button>
                                      </div>`;
                        break;
                }
            } else if (isOverdue) {
                statusHtml = '<span class="text-xs font-semibold text-amber-600" title="视频已超14天，可使用超期抓取功能">超14天</span>';
                isInputDisabled = false;
            } else if (video.publishDate) {
                statusHtml = `<span class="text-xs text-gray-600">已发布${overdueDays}天</span>`;
                isInputDisabled = false;
            } else {
                statusHtml = '<span class="text-xs text-gray-400">-</span>';
                isInputDisabled = true;
            }

            // 显示视频链接
            const videoLink = video.videoId
                ? `<a href="https://www.douyin.com/video/${video.videoId}" target="_blank" class="text-blue-600 hover:underline font-mono text-sm">${video.videoId}</a>`
                : '<span class="text-gray-400 text-sm">N/A</span>';

            return `
                <tr class="hover:bg-indigo-50 transition-colors">
                    <td class="px-4 py-3 font-medium text-gray-900 text-sm" style="width: 15%">${video.talentName}</td>
                    <td class="px-4 py-3 font-mono text-sm text-gray-600" style="width: 15%">${video.taskId || '<span class="text-gray-400">N/A</span>'}</td>
                    <td class="px-4 py-3 text-sm text-gray-600" style="width: 12%">${ReportUtils.formatDate(video.publishDate)}</td>
                    <td class="px-4 py-3 text-center" style="width: 20%">${videoLink}</td>
                    <td class="px-4 py-3" style="width: 25%">
                        <input type="number"
                               class="${isInputDisabled ? 'view-input w-full border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-400 cursor-not-allowed text-sm' : 'view-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm'}"
                               placeholder="${video.publishDate ? '请输入当日累计总播放' : '未发布，不可录入'}"
                               value="${video.totalViews || ''}"
                               data-collaboration-id="${video.collaborationId}"
                               ${isInputDisabled ? 'disabled' : ''}>
                    </td>
                    <td class="px-4 py-3 text-center" style="width: 13%">${statusHtml}</td>
                </tr>
            `;
        }).join('');

        // 绑定输入事件
        this.elements.videoEntryList.querySelectorAll('input.view-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const videoToUpdate = this.allVideosForEntry.find(v => v.collaborationId === e.target.dataset.collaborationId);
                if (videoToUpdate) {
                    videoToUpdate.totalViews = e.target.value;
                    this.updateEntryStats();
                }
            });
        });

        // 绑定重试按钮事件
        this.elements.videoEntryList.querySelectorAll('.retry-scrape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                if (this.automationManager) {
                    this.automationManager.handleRetryScrape(taskId);
                }
            });
        });

        this.updateEntryStats();
    }

    /**
     * 渲染分页控件
     */
    renderEntryPagination() {
        if (!this.elements.videoEntryPaginationControls) return;

        if (!this.allVideosForEntry || this.allVideosForEntry.length === 0) {
            this.elements.videoEntryPaginationControls.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(this.allVideosForEntry.length / this.entryItemsPerPage);
        const perPageOptions = [5, 10, 20, 50];

        const perPageSelector = `
            <div class="flex items-center text-sm">
                <span class="mr-2 text-gray-600">每页显示:</span>
                <select id="entry-items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    ${perPageOptions.map(opt => `<option value="${opt}" ${this.entryItemsPerPage === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </div>`;

        let pageButtons = totalPages > 1
            ? Array.from({ length: totalPages }, (_, i) => `<button class="pagination-btn ${i + 1 === this.entryCurrentPage ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')
            : '';

        const pageButtonsContainer = totalPages > 1
            ? `<div class="flex items-center gap-2">
                <button id="entry-prev-page" class="pagination-btn" ${this.entryCurrentPage === 1 ? 'disabled' : ''}>&lt;</button>
                ${pageButtons}
                <button id="entry-next-page" class="pagination-btn" ${this.entryCurrentPage === totalPages ? 'disabled' : ''}>&gt;</button>
               </div>`
            : '<div></div>';

        this.elements.videoEntryPaginationControls.innerHTML = `${perPageSelector}${pageButtonsContainer}`;

        // 绑定事件
        this.bindPaginationEvents();
    }

    /**
     * 绑定分页事件
     */
    bindPaginationEvents() {
        // 页码按钮
        this.elements.videoEntryPaginationControls.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.entryCurrentPage = parseInt(btn.dataset.page, 10);
                this.renderEntryPage();
            });
        });

        // 上一页
        const prevBtn = document.getElementById('entry-prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.entryCurrentPage--;
                this.renderEntryPage();
            });
        }

        // 下一页
        const nextBtn = document.getElementById('entry-next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.entryCurrentPage++;
                this.renderEntryPage();
            });
        }

        // 每页条目数变化
        const itemsPerPageSelect = document.getElementById('entry-items-per-page');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.entryItemsPerPage = parseInt(e.target.value, 10);
                localStorage.setItem(BUSINESS_CONSTANTS.ITEMS_PER_PAGE_KEY, this.entryItemsPerPage);
                this.entryCurrentPage = 1;
                this.renderEntryPage();
            });
        }
    }

    /**
     * 更新统计信息
     */
    updateEntryStats() {
        if (!this.allVideosForEntry || this.allVideosForEntry.length === 0) {
            if (this.elements.entryTotalCount) this.elements.entryTotalCount.textContent = '0';
            if (this.elements.entryCompletedCount) this.elements.entryCompletedCount.textContent = '0';
            if (this.elements.entryPendingCount) this.elements.entryPendingCount.textContent = '0';
            return;
        }

        const total = this.allVideosForEntry.length;
        const completed = this.allVideosForEntry.filter(video => {
            return video.totalViews !== null && video.totalViews !== undefined && String(video.totalViews).trim() !== '';
        }).length;
        const pending = total - completed;

        if (this.elements.entryTotalCount) this.elements.entryTotalCount.textContent = total;
        if (this.elements.entryCompletedCount) this.elements.entryCompletedCount.textContent = completed;
        if (this.elements.entryPendingCount) this.elements.entryPendingCount.textContent = pending;
    }

    /**
     * 保存当日数据
     */
    async saveDailyData() {
        // 过滤出有总曝光数据的视频
        const dataToSave = this.allVideosForEntry
            .filter(video => video.totalViews !== null && video.totalViews !== undefined && String(video.totalViews).trim() !== '')
            .map(video => ({
                collaborationId: video.collaborationId,
                totalViews: parseInt(String(video.totalViews).replace(/,/g, ''), 10)
            }));

        if (dataToSave.length === 0) {
            Modal.showAlert('您没有输入任何数据。', '提示');
            return;
        }

        const confirmed = await new Promise((resolve) => {
            Modal.showConfirm(`即将保存 ${dataToSave.length} 条记录，确认提交吗？`, '确认保存', resolve);
        });

        if (!confirmed) return;

        this.elements.saveEntryBtn.disabled = true;
        this.elements.saveEntryBtn.textContent = '保存中...';

        try {
            const payload = {
                projectId: this.projectId,
                date: this.elements.entryDatePicker.value,
                data: dataToSave
            };
            await API.request(API_ENDPOINTS.DAILY_STATS, 'POST', payload);

            Modal.showAlert(`✅ 保存成功！\n已更新 ${dataToSave.length} 条记录\n日期: ${this.elements.entryDatePicker.value}`, '成功', () => {
                // 触发CustomEvent，通知主控制器切换到日报Tab
                document.dispatchEvent(new CustomEvent('dataEntrySaved', {
                    detail: { date: this.elements.entryDatePicker.value }
                }));
            });
        } catch (error) {
            // 错误已在 API.request 中处理
        } finally {
            this.elements.saveEntryBtn.disabled = false;
            this.elements.saveEntryBtn.textContent = '保存当日数据';
        }
    }

    /**
     * 处理自动抓取（≤14天）
     */
    async handleAutoScrape() {
        if (!this.elements.autoScrapeBtn) return;

        this.elements.autoScrapeBtn.disabled = true;
        const originalContent = this.elements.autoScrapeBtn.innerHTML;
        this.elements.autoScrapeBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            创建任务中...
        `;

        const reportDate = this.elements.entryDatePicker.value;
        const today = new Date();

        const targets = this.allVideosForEntry.filter(video => {
            const { isOverdue } = ReportUtils.getOverdueInfo(video.publishDate, BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today);
            const taskStatus = this.automationManager ? this.automationManager.getTaskStatus(video.collaborationId) : null;
            return video.taskId && !isOverdue && taskStatus?.status !== 'completed';
        }).map(v => ({ ...v, reportDate }));

        if (targets.length === 0) {
            Modal.showAlert('没有需要自动抓取(≤14天)的视频任务。', '提示');
            this.elements.autoScrapeBtn.disabled = false;
            this.elements.autoScrapeBtn.innerHTML = originalContent;
            return;
        }

        const result = await this.automationManager.createScrapeJob(targets, false, reportDate);

        if (result.success) {
            Modal.showAlert(`${targets.length} 个视频的抓取任务已创建！页面将自动刷新状态。`, '成功');
        }

        this.elements.autoScrapeBtn.disabled = false;
        this.elements.autoScrapeBtn.innerHTML = originalContent;
    }

    /**
     * 处理超期自动抓取（>14天）
     */
    async handleAutoScrapeOverdue() {
        if (!this.elements.autoScrapeOverdueBtn) return;

        this.elements.autoScrapeOverdueBtn.disabled = true;
        const originalContent = this.elements.autoScrapeOverdueBtn.innerHTML;
        this.elements.autoScrapeOverdueBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            创建任务中...
        `;

        const reportDate = this.elements.entryDatePicker.value;
        const today = new Date();

        const targets = this.allVideosForEntry.filter(video => {
            const { isOverdue } = ReportUtils.getOverdueInfo(video.publishDate, BUSINESS_CONSTANTS.OVERDUE_THRESHOLD_DAYS, today);
            const taskStatus = this.automationManager ? this.automationManager.getTaskStatus(video.collaborationId) : null;
            return video.videoId && isOverdue && taskStatus?.status !== 'completed';
        }).map(v => ({ ...v, reportDate }));

        if (targets.length === 0) {
            Modal.showAlert('没有需要自动抓取(>14天)的视频任务。', '提示');
            this.elements.autoScrapeOverdueBtn.disabled = false;
            this.elements.autoScrapeOverdueBtn.innerHTML = originalContent;
            return;
        }

        const result = await this.automationManager.createScrapeJob(targets, true, reportDate);

        if (result.success) {
            Modal.showAlert(`${targets.length} 个超期视频的抓取任务已创建！页面将自动刷新状态。`, '成功');
        }

        this.elements.autoScrapeOverdueBtn.disabled = false;
        this.elements.autoScrapeOverdueBtn.innerHTML = originalContent;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 保存按钮
        if (this.elements.saveEntryBtn) {
            this.elements.saveEntryBtn.addEventListener('click', () => this.saveDailyData());
        }

        // 取消按钮
        if (this.elements.cancelEntryBtn) {
            this.elements.cancelEntryBtn.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('switchToDailyReport'));
            });
        }

        // 日期选择器
        if (this.elements.entryDatePicker) {
            this.elements.entryDatePicker.addEventListener('change', () => this.loadVideosForEntry());
        }

        // 自动抓取按钮
        if (this.elements.autoScrapeBtn) {
            this.elements.autoScrapeBtn.addEventListener('click', () => this.handleAutoScrape());
        }

        // 超期自动抓取按钮
        if (this.elements.autoScrapeOverdueBtn) {
            this.elements.autoScrapeOverdueBtn.addEventListener('click', () => this.handleAutoScrapeOverdue());
        }
    }

    /**
     * 获取超期视频列表（供主控制器调用）
     */
    getOverdueVideos() {
        return this.overdueVideos;
    }

    /**
     * 更新数据（用于主控制器刷新）
     * @param {object} project - 项目数据
     */
    updateData(project) {
        this.project = project;
    }

    /**
     * 销毁Tab，清理资源
     */
    destroy() {
        if (this.automationManager) {
            this.automationManager.destroy();
        }
    }
}
