/**
 * @file filter.js
 * @description Filter functionality for works management
 */

import { API_PATHS } from './constants.js';
import { apiRequest } from './api.js';
import { updateQueryState, clearOpenWorkDetails } from './state-manager.js';

/**
 * Load and populate project filter dropdown
 */
export async function loadProjectFilter() {
    const projectFilter = document.getElementById('project-filter');

    try {
        const response = await apiRequest(API_PATHS.getProjects);
        const projects = response.data || [];

        projectFilter.innerHTML = '<option value="">所有项目</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load project filter:", error);
        projectFilter.innerHTML = '<option value="">加载项目失败</option>';
    }
}

/**
 * Apply current filter selections
 * @returns {Object} Updated query state
 */
export function applyFilters() {
    const projectFilter = document.getElementById('project-filter');
    const sourceFilter = document.getElementById('source-filter');
    const talentSearchInput = document.getElementById('talent-search');

    const updates = {
        page: 1,  // Reset to first page when applying filters
        projectId: projectFilter.value,
        sourceType: sourceFilter.value,
        search: talentSearchInput.value.trim()
    };

    updateQueryState(updates);
    clearOpenWorkDetails();  // Clear expanded rows when filtering

    return updates;
}

/**
 * Reset all filters to default values
 */
export function resetFilters() {
    const projectFilter = document.getElementById('project-filter');
    const sourceFilter = document.getElementById('source-filter');
    const talentSearchInput = document.getElementById('talent-search');

    // Reset UI elements
    projectFilter.value = '';
    sourceFilter.value = '';
    talentSearchInput.value = '';

    // Reset state
    updateQueryState({
        page: 1,
        projectId: '',
        sourceType: '',
        search: ''
    });

    clearOpenWorkDetails();  // Clear expanded rows when resetting
}