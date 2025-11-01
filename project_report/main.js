/**
 * @file main.js
 * @description Project Report 主控制器
 * @version 1.0.0
 *
 * 职责:
 * - 页面初始化
 * - 加载项目基础数据
 * - Tab切换管理
 * - 协调各个子模块
 * - 全局事件监听
 * - 超期视频弹窗管理
 */

import { AppCore } from '../common/app-core.js';
import { DailyReportTab } from './tab-daily-report.js';
import { DataEntryTab } from './tab-data-entry.js';
import { EffectMonitorTab } from './tab-effect-monitor.js';
import { AutomationManager } from './automation-manager.js';
import { ReportUtils } from './utils.js';
import { API_ENDPOINTS, TAB_NAMES } from './constants.js';

const { API, Modal, Utils } = AppCore;

export class ProjectReportApp {
    constructor() {
        this.projectId = null;
        this.project = {};
        this.currentTab = TAB_NAMES.DAILY_REPORT;

        // Tab 实例
        this.tabs = {
            dailyReport: null,
            dataEntry: null,
            effectMonitor: null
        };

        // 自动化管理器
        this.automationManager = null;

        // DOM 元素
        this.elements = {
            breadcrumbProjectName: document.getElementById('breadcrumb-project-name'),
            globalDatePicker: document.getElementById('global-date-picker'),
            reportDatePicker: document.getElementById('report-date-picker'),
            entryDatePicker: document.getElementById('entry-date-picker'),
            trackingTabBtns: document.querySelectorAll('.tracking-tab-btn'),
            dailyReportTab: document.getElementById('daily-report-tab'),
            dataEntryTab: document.getElementById('data-entry-tab'),
            effectMonitorTab: document.getElementById('effect-monitor-tab'),
            // 日期快捷按钮
            reportDateToday: document.getElementById('report-date-today'),
            reportDateYesterday: document.getElementById('report-date-yesterday'),
            reportDateBeforeYesterday: document.getElementById('report-date-before-yesterday'),
            entryDateToday: document.getElementById('entry-date-today'),
            entryDateYesterday: document.getElementById('entry-date-yesterday'),
            entryDateBeforeYesterday: document.getElementById('entry-date-before-yesterday'),
            // 超期视频弹窗
            manualUpdateBtn: document.getElementById('manual-update-btn'),
            overdueTasksModal: document.getElementById('overdue-tasks-modal'),
            closeOverdueModalBtn: document.getElementById('close-overdue-modal-btn'),
            overdueTasksList: document.getElementById('overdue-tasks-list'),
            noOverdueTasksMessage: document.getElementById('no-overdue-tasks-message'),
            copyTaskIdsBtn: document.getElementById('copy-task-ids-btn'),
            clipboardToast: document.getElementById('clipboard-toast')
        };
    }

    /**
     * 初始化应用
     */
    async init() {
        // 获取项目ID
        this.projectId = Utils.getUrlParam('projectId');

        if (!this.projectId) {
            document.body.innerHTML = '<div class="p-8 text-center text-red-500">错误：URL中缺少项目ID。</div>';
            return;
        }

        // 初始化日期选择器（修复时区问题）
        const today = ReportUtils.getLocalDateString();
        if (this.elements.globalDatePicker) this.elements.globalDatePicker.value = today;
        if (this.elements.entryDatePicker) this.elements.entryDatePicker.value = today;
        if (this.elements.reportDatePicker) this.elements.reportDatePicker.value = today;

        // 加载项目数据
        const canProceed = await this.loadProjectDetails();
        if (!canProceed) return; // 未启用追踪

        // 初始化模块
        this.initModules();

        // 设置事件监听
        this.setupEventListeners();

        // 初始化默认显示日报Tab
        await this.switchTab(TAB_NAMES.DAILY_REPORT);
    }

    /**
     * 加载项目详情
     * @returns {Promise<boolean>} 是否可以继续加载
     */
    async loadProjectDetails() {
        const loading = Modal.showLoading('正在加载项目数据...');

        try {
            const response = await API.request(`${API_ENDPOINTS.PROJECTS}?projectId=${this.projectId}`);
            this.project = response.data;

            // 更新页面标题和面包屑
            document.title = `${this.project.name} - 项目执行报告`;
            if (this.elements.breadcrumbProjectName) {
                this.elements.breadcrumbProjectName.textContent = this.project.name;
            }

            // 检查效果追踪权限（只有明确为true才允许访问）
            if (this.project.trackingEnabled !== true) {
                loading.close();
                this.showTrackingDisabledMessage();
                return false; // 阻止后续加载
            }

            loading.close();
            return true; // 允许继续加载
        } catch (error) {
            loading.close();
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">无法加载页面数据: ${error.message}</div>`;
            return false;
        }
    }

    /**
     * 显示追踪未启用的提示页面
     */
    showTrackingDisabledMessage() {
        const mainContent = document.getElementById('main-content') || document.querySelector('main');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div class="max-w-md w-full">
                    <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
                            <svg class="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">效果追踪未启用</h2>
                        <p class="text-gray-600 mb-6">该项目尚未启用效果追踪功能，无法查看项目日报和数据录入页面。</p>

                        <div class="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                            <p class="text-sm text-blue-900 font-medium mb-2">如需启用追踪功能：</p>
                            <ol class="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                <li>返回项目列表页面</li>
                                <li>编辑该项目的基础信息</li>
                                <li>勾选"启用效果追踪"选项</li>
                                <li>保存更改后即可访问</li>
                            </ol>
                        </div>

                        <div class="flex gap-3">
                            <a href="index.html" class="flex-1 inline-flex justify-center items-center px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                                </svg>
                                返回项目列表
                            </a>
                            <a href="order_list.html?projectId=${this.projectId}" class="flex-1 inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                                查看项目进展
                                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 初始化各个模块
     */
    initModules() {
        // 初始化自动化管理器
        this.automationManager = new AutomationManager(this.projectId);

        // 初始化各个 Tab
        this.tabs.dailyReport = new DailyReportTab(this, this.projectId, this.project);
        this.tabs.dataEntry = new DataEntryTab(this, this.projectId, this.project, this.automationManager);
        this.tabs.effectMonitor = new EffectMonitorTab(this, this.projectId, this.project);
    }

    /**
     * 切换Tab
     * @param {string} tabName - Tab名称
     */
    async switchTab(tabName) {
        console.log(`[Tab切换] 切换到: ${tabName}`);

        // 隐藏所有Tab面板
        if (this.elements.dailyReportTab) this.elements.dailyReportTab.classList.add('hidden');
        if (this.elements.dataEntryTab) this.elements.dataEntryTab.classList.add('hidden');
        if (this.elements.effectMonitorTab) this.elements.effectMonitorTab.classList.add('hidden');

        // 移除所有Tab按钮的active状态
        this.elements.trackingTabBtns.forEach(btn => btn.classList.remove('active'));

        // 显示目标Tab并激活按钮
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        if (tabName === TAB_NAMES.DAILY_REPORT && this.elements.dailyReportTab) {
            this.elements.dailyReportTab.classList.remove('hidden');
            await this.tabs.dailyReport.load();
        } else if (tabName === TAB_NAMES.DATA_ENTRY && this.elements.dataEntryTab) {
            this.elements.dataEntryTab.classList.remove('hidden');
            await this.tabs.dataEntry.load();
        } else if (tabName === TAB_NAMES.EFFECT_MONITOR && this.elements.effectMonitorTab) {
            this.elements.effectMonitorTab.classList.remove('hidden');
            await this.tabs.effectMonitor.load();
        }

        this.currentTab = tabName;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // Tab切换事件
        this.elements.trackingTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 全局日期选择器事件（用于日报Tab）
        if (this.elements.globalDatePicker) {
            this.elements.globalDatePicker.addEventListener('change', () => {
                const selectedDate = this.elements.globalDatePicker.value;
                // 同步到隐藏的reportDatePicker
                if (this.elements.reportDatePicker) {
                    this.elements.reportDatePicker.value = selectedDate;
                }
                // 重新加载日报数据
                if (this.tabs.dailyReport) {
                    this.tabs.dailyReport.load(selectedDate);
                }
            });
        }

        // 日报日期快捷按钮
        this.setupReportDateShortcuts();

        // 数据录入日期快捷按钮
        this.setupEntryDateShortcuts();

        // 超期视频弹窗相关
        this.setupOverdueModal();

        // 监听来自Tab的CustomEvent
        document.addEventListener('switchToDataEntry', () => {
            this.switchTab(TAB_NAMES.DATA_ENTRY);
        });

        document.addEventListener('switchToDailyReport', () => {
            this.switchTab(TAB_NAMES.DAILY_REPORT);
        });

        document.addEventListener('dataEntrySaved', (e) => {
            // 保存成功后，同步日期并切换到日报Tab
            if (this.elements.reportDatePicker && e.detail && e.detail.date) {
                this.elements.reportDatePicker.value = e.detail.date;
                this.elements.globalDatePicker.value = e.detail.date;
            }
            this.switchTab(TAB_NAMES.DAILY_REPORT);
        });
    }

    /**
     * 设置日报日期快捷按钮
     */
    setupReportDateShortcuts() {
        // 辅助函数：更新按钮高亮状态
        const updateHighlight = (activeButton) => {
            const buttons = [
                this.elements.reportDateToday,
                this.elements.reportDateYesterday,
                this.elements.reportDateBeforeYesterday
            ];
            buttons.forEach(btn => {
                if (btn) {
                    if (btn === activeButton) {
                        btn.classList.remove('bg-gray-100', 'text-gray-700');
                        btn.classList.add('bg-indigo-100', 'text-indigo-700');
                    } else {
                        btn.classList.remove('bg-indigo-100', 'text-indigo-700');
                        btn.classList.add('bg-gray-100', 'text-gray-700');
                    }
                }
            });
        };

        // 今天
        if (this.elements.reportDateToday) {
            this.elements.reportDateToday.addEventListener('click', () => {
                const today = ReportUtils.getLocalDateString();
                this.elements.reportDatePicker.value = today;
                this.elements.globalDatePicker.value = today;
                updateHighlight(this.elements.reportDateToday);
                if (this.tabs.dailyReport) this.tabs.dailyReport.load(today);
            });
        }

        // 昨天
        if (this.elements.reportDateYesterday) {
            this.elements.reportDateYesterday.addEventListener('click', () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = ReportUtils.getLocalDateString(yesterday);
                this.elements.reportDatePicker.value = yesterdayStr;
                this.elements.globalDatePicker.value = yesterdayStr;
                updateHighlight(this.elements.reportDateYesterday);
                if (this.tabs.dailyReport) this.tabs.dailyReport.load(yesterdayStr);
            });
        }

        // 前天
        if (this.elements.reportDateBeforeYesterday) {
            this.elements.reportDateBeforeYesterday.addEventListener('click', () => {
                const beforeYesterday = new Date();
                beforeYesterday.setDate(beforeYesterday.getDate() - 2);
                const beforeYesterdayStr = ReportUtils.getLocalDateString(beforeYesterday);
                this.elements.reportDatePicker.value = beforeYesterdayStr;
                this.elements.globalDatePicker.value = beforeYesterdayStr;
                updateHighlight(this.elements.reportDateBeforeYesterday);
                if (this.tabs.dailyReport) this.tabs.dailyReport.load(beforeYesterdayStr);
            });
        }
    }

    /**
     * 设置数据录入日期快捷按钮
     */
    setupEntryDateShortcuts() {
        // 今天
        if (this.elements.entryDateToday) {
            this.elements.entryDateToday.addEventListener('click', () => {
                const today = ReportUtils.getLocalDateString();
                this.elements.entryDatePicker.value = today;
                if (this.tabs.dataEntry) this.tabs.dataEntry.loadVideosForEntry();
            });
        }

        // 昨天
        if (this.elements.entryDateYesterday) {
            this.elements.entryDateYesterday.addEventListener('click', () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                this.elements.entryDatePicker.value = ReportUtils.getLocalDateString(yesterday);
                if (this.tabs.dataEntry) this.tabs.dataEntry.loadVideosForEntry();
            });
        }

        // 前天
        if (this.elements.entryDateBeforeYesterday) {
            this.elements.entryDateBeforeYesterday.addEventListener('click', () => {
                const beforeYesterday = new Date();
                beforeYesterday.setDate(beforeYesterday.getDate() - 2);
                this.elements.entryDatePicker.value = ReportUtils.getLocalDateString(beforeYesterday);
                if (this.tabs.dataEntry) this.tabs.dataEntry.loadVideosForEntry();
            });
        }
    }

    /**
     * 设置超期视频弹窗
     */
    setupOverdueModal() {
        // 手动更新按钮
        if (this.elements.manualUpdateBtn) {
            this.elements.manualUpdateBtn.addEventListener('click', () => this.openOverdueModal());
        }

        // 关闭按钮
        if (this.elements.closeOverdueModalBtn) {
            this.elements.closeOverdueModalBtn.addEventListener('click', () => this.closeOverdueModal());
        }

        // 点击背景关闭
        if (this.elements.overdueTasksModal) {
            this.elements.overdueTasksModal.addEventListener('click', (e) => {
                if (e.target === this.elements.overdueTasksModal) this.closeOverdueModal();
            });
        }

        // 复制TaskID按钮
        if (this.elements.copyTaskIdsBtn) {
            this.elements.copyTaskIdsBtn.addEventListener('click', () => this.copyOverdueTaskIds());
        }
    }

    /**
     * 打开超期视频弹窗
     */
    openOverdueModal() {
        if (!this.elements.overdueTasksModal || !this.tabs.dataEntry) return;

        const overdueVideos = this.tabs.dataEntry.getOverdueVideos();

        const listHtml = overdueVideos.map(video => `
            <tr class="bg-white">
                <td class="px-6 py-4 font-medium text-gray-900">${video.talentName}</td>
                <td class="px-6 py-4 font-mono text-gray-600">${video.taskId || 'N/A'}</td>
                <td class="px-6 py-4 text-gray-500">${ReportUtils.formatDate(video.publishDate)}</td>
                <td class="px-6 py-4 text-red-600 font-medium">${video.overdueInfo.overdueDays} 天</td>
            </tr>
        `).join('');

        if (overdueVideos.length > 0) {
            this.elements.overdueTasksList.innerHTML = listHtml;
            this.elements.overdueTasksList.closest('table').classList.remove('hidden');
            this.elements.noOverdueTasksMessage.classList.add('hidden');
            this.elements.copyTaskIdsBtn.disabled = false;
        } else {
            this.elements.overdueTasksList.innerHTML = '';
            this.elements.overdueTasksList.closest('table').classList.add('hidden');
            this.elements.noOverdueTasksMessage.classList.remove('hidden');
            this.elements.copyTaskIdsBtn.disabled = true;
        }

        this.elements.overdueTasksModal.classList.remove('hidden');
    }

    /**
     * 关闭超期视频弹窗
     */
    closeOverdueModal() {
        if (this.elements.overdueTasksModal) {
            this.elements.overdueTasksModal.classList.add('hidden');
        }
    }

    /**
     * 复制超期视频的TaskID
     */
    copyOverdueTaskIds() {
        if (!this.tabs.dataEntry) return;

        const overdueVideos = this.tabs.dataEntry.getOverdueVideos();
        const taskIds = overdueVideos
            .map(v => v.taskId)
            .filter(Boolean)
            .join('\n');

        if (!taskIds) {
            Modal.showAlert('没有可复制的任务ID。', '提示');
            return;
        }

        const success = ReportUtils.copyToClipboard(taskIds);
        if (success) {
            ReportUtils.showClipboardToast(this.elements.clipboardToast);
        } else {
            Modal.showAlert('复制失败，请手动复制。', '错误');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new ProjectReportApp();
    app.init();
});
