/**
 * @file state-manager.js
 * @description Global state management for task center
 */

// Global state object
const state = {
    tasks: {},
    systemStatus: {
        performance: null,
        price: null
    },
    logs: []
};

/**
 * Update tasks in state
 * @param {Object} tasks - Tasks data from API
 */
export function updateTasks(tasks) {
    state.tasks = tasks;
}

/**
 * Update system status in state
 * @param {Object} status - System status data
 */
export function updateSystemStatus(status) {
    state.systemStatus = status;
}

/**
 * Update logs in state
 * @param {Array} logs - Logs array from API
 */
export function updateLogs(logs) {
    state.logs = logs;
}

/**
 * Get current state
 * @returns {Object} Current state object
 */
export function getState() {
    return state;
}

/**
 * Get tasks from state
 * @returns {Object} Current tasks
 */
export function getTasks() {
    return state.tasks;
}

/**
 * Get system status from state
 * @returns {Object} Current system status
 */
export function getSystemStatus() {
    return state.systemStatus;
}

/**
 * Get logs from state
 * @returns {Array} Current logs
 */
export function getLogs() {
    return state.logs;
}