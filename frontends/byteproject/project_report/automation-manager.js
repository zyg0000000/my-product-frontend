/**
 * @file automation-manager.js
 * @description 自动化抓取管理器
 * @version 1.0.0
 *
 * 职责:
 * - 创建自动化抓取任务（≤14天）
 * - 创建超期视频抓取任务（>14天）
 * - 轮询任务状态
 * - 处理任务重试
 */

import { AppCore } from '../common/app-core.js';
import { API_ENDPOINTS, WORKFLOW_IDS, BUSINESS_CONSTANTS } from './constants.js';
import { ReportUtils } from './utils.js';

const { API, Modal } = AppCore;

export class AutomationManager {
    constructor(projectId) {
        this.projectId = projectId;
        this.taskStatuses = {};  // collaborationId -> task对象
        this.poller = null;
        this.onTaskStatusUpdate = null;  // 回调函数，用于通知 Tab 更新视图
    }

    /**
     * 创建抓取任务
     * @param {Array} videos - 视频列表
     * @param {boolean} isOverdue - 是否为超期视频
     * @param {string} reportDate - 报告日期
     * @returns {Promise<object>} { success: boolean, jobId?: string, error?: string }
     */
    async createScrapeJob(videos, isOverdue = false, reportDate) {
        const workflowId = isOverdue ? WORKFLOW_IDS.SCRAPE_OVERDUE : WORKFLOW_IDS.SCRAPE_NORMAL;

        const targets = videos.map(v => {
            const target = {
                collaborationId: v.collaborationId,
                nickname: v.talentName,
                reportDate: reportDate
            };

            // 超期视频使用 videoId，否则使用 taskId
            if (isOverdue) {
                target.videoId = v.videoId;
            } else {
                target.taskId = v.taskId;
            }

            return target;
        });

        try {
            const response = await API.request(API_ENDPOINTS.AUTOMATION_JOBS_CREATE, 'POST', {
                projectId: this.projectId,
                workflowId: workflowId,
                targets: targets
            });

            if (response.data && response.data.jobId) {
                this.startPollingTasks(response.data.jobId);
                return { success: true, jobId: response.data.jobId };
            } else {
                throw new Error('未返回 Job ID');
            }
        } catch (error) {
            console.error('创建抓取任务失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 开始轮询任务状态
     * @param {string} jobId - 任务ID
     */
    startPollingTasks(jobId) {
        if (this.poller) {
            clearInterval(this.poller);
        }

        const poll = async () => {
            try {
                const response = await API.request(`${API_ENDPOINTS.AUTOMATION_JOBS_GET}?jobId=${jobId}`);
                const job = response.data;
                let allDone = true;

                (job.tasks || []).forEach(task => {
                    const collabId = task.metadata?.collaborationId;
                    if (collabId) {
                        this.taskStatuses[collabId] = task;
                    }
                    if (task.status === 'pending' || task.status === 'processing') {
                        allDone = false;
                    }
                });

                // 通知 Tab 更新视图
                if (this.onTaskStatusUpdate) {
                    this.onTaskStatusUpdate();
                }

                if (allDone) {
                    this.stopPolling();
                    console.log('所有日报抓取任务已完成，轮询停止。');
                }
            } catch (error) {
                console.error('轮询任务状态失败:', error);
                this.stopPolling();
            }
        };

        poll();  // 立即执行一次
        this.poller = setInterval(poll, BUSINESS_CONSTANTS.POLLING_INTERVAL);
    }

    /**
     * 停止轮询
     */
    stopPolling() {
        if (this.poller) {
            clearInterval(this.poller);
            this.poller = null;
        }
    }

    /**
     * 获取任务状态
     * @param {string} collaborationId - 合作ID
     * @returns {object|null} 任务对象
     */
    getTaskStatus(collaborationId) {
        return this.taskStatuses[collaborationId];
    }

    /**
     * 清空任务状态
     */
    clearTaskStatuses() {
        this.taskStatuses = {};
    }

    /**
     * 处理任务重试
     * @param {string} taskId - 任务ID
     */
    async handleRetryScrape(taskId) {
        if (!taskId) return;

        try {
            await API.request(`${API_ENDPOINTS.AUTOMATION_TASKS}?id=${taskId}`, 'PUT', { action: 'rerun' });

            // 查找父 jobId 并重新启动轮询
            for (const collabId in this.taskStatuses) {
                if (this.taskStatuses[collabId]._id === taskId) {
                    const parentJobId = this.taskStatuses[collabId].jobId;
                    if (parentJobId) {
                        this.startPollingTasks(parentJobId);
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('重试任务失败:', error);
            // 刷新视图，显示失败状态
            if (this.onTaskStatusUpdate) {
                this.onTaskStatusUpdate();
            }
        }
    }

    /**
     * 销毁管理器，清理资源
     */
    destroy() {
        this.stopPolling();
        this.taskStatuses = {};
        this.onTaskStatusUpdate = null;
    }
}
