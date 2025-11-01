/**
 * @file constants.js
 * @description Project Report 页面常量定义
 * @version 1.0.0
 */

/**
 * API 端点配置
 */
export const API_ENDPOINTS = {
    PROJECTS: '/projects',
    REPORT: '/project-report',
    VIDEOS_FOR_ENTRY: '/videos-for-entry',
    DAILY_STATS: '/daily-stats',
    REPORT_SOLUTION: '/report-solution',
    AUTOMATION_JOBS_CREATE: '/automation-jobs-create',
    AUTOMATION_JOBS_GET: '/automation-jobs-get',
    AUTOMATION_TASKS: '/automation-tasks',
    COLLABORATORS: '/getCollaborators'
};

/**
 * 工作流ID配置
 */
export const WORKFLOW_IDS = {
    SCRAPE_NORMAL: '68ee679ef3daa8fdc9ea730f',   // 抓取≤14天的视频
    SCRAPE_OVERDUE: '68fdae01656eacf1bfacb66c'  // 抓取>14天的视频（使用videoId）
};

/**
 * 业务常量
 */
export const BUSINESS_CONSTANTS = {
    OVERDUE_THRESHOLD_DAYS: 14,           // 超期天数阈值
    POLLING_INTERVAL: 5000,               // 任务状态轮询间隔（毫秒）
    ITEMS_PER_PAGE_KEY: 'reportEntryItemsPerPage', // 本地存储键
    TOAST_DURATION: 1500                  // Toast提示显示时长（毫秒）
};

/**
 * Tab 名称映射
 */
export const TAB_NAMES = {
    DAILY_REPORT: 'daily-report',
    DATA_ENTRY: 'data-entry',
    EFFECT_MONITOR: 'effect-monitor'
};
