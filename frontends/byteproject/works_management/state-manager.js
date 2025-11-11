/**
 * @file state-manager.js
 * @description Global state management for works management
 */

import { DEFAULT_QUERY_STATE } from './constants.js';

// Private state
let queryState = { ...DEFAULT_QUERY_STATE };
let openWorkDetails = new Set();
let confirmCallback = null;

/**
 * Get current query state
 * @returns {Object} Current query state
 */
export function getQueryState() {
    return { ...queryState };
}

/**
 * Update query state with new values
 * @param {Object} updates - Partial query state updates
 */
export function updateQueryState(updates) {
    queryState = { ...queryState, ...updates };
}

/**
 * Reset query state to defaults
 */
export function resetQueryState() {
    queryState = { ...DEFAULT_QUERY_STATE };
}

/**
 * Get the set of open work details
 * @returns {Set} Set of work IDs that are expanded
 */
export function getOpenWorkDetails() {
    return openWorkDetails;
}

/**
 * Toggle work details expansion state
 * @param {string} workId - Work ID to toggle
 * @returns {boolean} New expansion state
 */
export function toggleWorkDetails(workId) {
    if (openWorkDetails.has(workId)) {
        openWorkDetails.delete(workId);
        return false;
    } else {
        openWorkDetails.add(workId);
        return true;
    }
}

/**
 * Check if work details are expanded
 * @param {string} workId - Work ID to check
 * @returns {boolean} Whether work is expanded
 */
export function isWorkDetailsOpen(workId) {
    return openWorkDetails.has(workId);
}

/**
 * Clear all open work details
 * Used when changing pages or filters
 */
export function clearOpenWorkDetails() {
    openWorkDetails.clear();
}

/**
 * Set the confirmation callback
 * @param {Function} callback - Callback function
 */
export function setConfirmCallback(callback) {
    confirmCallback = callback;
}

/**
 * Get the confirmation callback
 * @returns {Function|null} Current confirmation callback
 */
export function getConfirmCallback() {
    return confirmCallback;
}