/**
 * @file dashboard.js
 * @description Dashboard statistics rendering for works management
 */

import { API_PATHS } from './constants.js';
import { apiRequest } from './api.js';
import { getQueryState } from './state-manager.js';

/**
 * Fetch and render dashboard statistics
 */
export async function fetchAndRenderDashboard() {
    try {
        const queryState = getQueryState();

        // Build query string with only filter parameters
        const params = new URLSearchParams();
        if (queryState.projectId) params.append('projectId', queryState.projectId);
        if (queryState.sourceType) params.append('sourceType', queryState.sourceType);
        if (queryState.search) params.append('search', queryState.search);

        const queryString = params.toString();
        const endpoint = queryString ? `${API_PATHS.getStats}?${queryString}` : API_PATHS.getStats;

        const response = await apiRequest(endpoint);
        const stats = response.data;

        // Update dashboard elements
        const statsTotalWorks = document.getElementById('stats-total-works');
        const statsCollabWorks = document.getElementById('stats-collab-works');
        const statsOrganicWorks = document.getElementById('stats-organic-works');
        const statsTotalViews = document.getElementById('stats-total-views');

        if (statsTotalWorks) {
            statsTotalWorks.textContent = (stats.totalWorks || 0).toLocaleString();
        }
        if (statsCollabWorks) {
            statsCollabWorks.textContent = (stats.collabWorks || 0).toLocaleString();
        }
        if (statsOrganicWorks) {
            statsOrganicWorks.textContent = (stats.organicWorks || 0).toLocaleString();
        }
        if (statsTotalViews) {
            statsTotalViews.textContent = (stats.totalViews || 0).toLocaleString();
        }
    } catch (error) {
        console.error("Failed to load dashboard stats:", error);
    }
}