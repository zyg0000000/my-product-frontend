/**
 * @file state-manager.js
 * @description 状态管理模块 - 管理应用程序的所有状态
 * @version 2.0 - Added batch edit mode state
 */

import { ITEMS_PER_PAGE_KEY, BATCH_MODE } from './constants.js';

// --- 状态变量 ---
export let allProjects = [];
export let allCollaborations = [];
export let rebateTasks = [];
export let displayedTasks = [];
export let currentPage = 1;
export let itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '15');
export let openRowId = null;
export let currentUploadTaskId = null;

// 批量编辑模式状态
export let batchMode = BATCH_MODE.OFF;
export let selectedTaskIds = new Set();

// --- 状态更新函数 ---

/**
 * 更新当前页码
 * @param {number} page - 新页码
 */
export function updateCurrentPage(page) {
    currentPage = page;
}

/**
 * 更新每页显示条数
 * @param {number} count - 每页条数
 */
export function updateItemsPerPage(count) {
    itemsPerPage = count;
    localStorage.setItem(ITEMS_PER_PAGE_KEY, count.toString());
}

/**
 * 更新打开的详情行ID
 * @param {string|null} id - 任务ID
 */
export function updateOpenRowId(id) {
    openRowId = id;
}

/**
 * 更新当前上传任务ID
 * @param {string|null} id - 任务ID
 */
export function updateCurrentUploadTaskId(id) {
    currentUploadTaskId = id;
}

/**
 * 更新所有项目列表
 * @param {Array} projects - 项目数组
 */
export function updateAllProjects(projects) {
    allProjects = projects;
}

/**
 * 更新所有合作列表
 * @param {Array} collaborations - 合作数组
 */
export function updateAllCollaborations(collaborations) {
    allCollaborations = collaborations;
}

/**
 * 更新返点任务列表
 * @param {Array} tasks - 任务数组
 */
export function updateRebateTasks(tasks) {
    rebateTasks = tasks;
}

/**
 * 更新显示的任务列表
 * @param {Array} tasks - 任务数组
 */
export function updateDisplayedTasks(tasks) {
    displayedTasks = tasks;
}

/**
 * 获取任务通过ID
 * @param {string} taskId - 任务ID
 * @returns {Object|undefined} - 任务对象
 */
export function getTaskById(taskId) {
    return rebateTasks.find(t => t.id === taskId);
}

/**
 * 更新单个任务
 * @param {string} taskId - 任务ID
 * @param {Object} updates - 更新的字段
 */
export function updateTask(taskId, updates) {
    const task = rebateTasks.find(t => t.id === taskId);
    if (task) {
        Object.assign(task, updates);
    }
}

// ========== 批量编辑模式相关函数 ==========

/**
 * 设置批量编辑模式
 * @param {string} mode - 模式 (BATCH_MODE.ON 或 BATCH_MODE.OFF)
 */
export function setBatchMode(mode) {
    batchMode = mode;
    if (mode === BATCH_MODE.OFF) {
        selectedTaskIds.clear();
    }
}

/**
 * 获取批量编辑模式状态
 * @returns {string} - 当前模式
 */
export function getBatchMode() {
    return batchMode;
}

/**
 * 切换任务选中状态
 * @param {string} taskId - 任务ID
 */
export function toggleTaskSelection(taskId) {
    if (selectedTaskIds.has(taskId)) {
        selectedTaskIds.delete(taskId);
    } else {
        selectedTaskIds.add(taskId);
    }
}

/**
 * 设置任务选中状态
 * @param {string} taskId - 任务ID
 * @param {boolean} selected - 是否选中
 */
export function setTaskSelection(taskId, selected) {
    if (selected) {
        selectedTaskIds.add(taskId);
    } else {
        selectedTaskIds.delete(taskId);
    }
}

/**
 * 全选当前页任务
 * @param {Array} taskIds - 要选中的任务ID数组
 */
export function selectAllTasks(taskIds) {
    taskIds.forEach(id => selectedTaskIds.add(id));
}

/**
 * 清空所有选中
 */
export function clearAllSelections() {
    selectedTaskIds.clear();
}

/**
 * 获取选中的任务ID数组
 * @returns {Array} - 选中的任务ID数组
 */
export function getSelectedTaskIds() {
    return Array.from(selectedTaskIds);
}

/**
 * 检查任务是否被选中
 * @param {string} taskId - 任务ID
 * @returns {boolean} - 是否选中
 */
export function isTaskSelected(taskId) {
    return selectedTaskIds.has(taskId);
}