/**
 * @module state-manager
 * @description Centralized state management for projects and filters
 */

import { DEFAULT_FILTERS, TIME_DIMENSIONS } from './constants.js';

/**
 * Application state
 * @private
 */
const state = {
  projects: [],
  filteredProjects: [],
  filters: { ...DEFAULT_FILTERS }
};

/**
 * Updates the projects in state
 * @param {Array} projects - Array of project objects
 */
export function updateProjects(projects) {
  state.projects = projects || [];
  applyCurrentFilters();
}

/**
 * Updates filter values
 * @param {Object} filters - Filter object with timeDimension, year, month, projectType
 */
export function updateFilters(filters) {
  state.filters = { ...state.filters, ...filters };
  applyCurrentFilters();
}

/**
 * Resets filters to default values
 */
export function resetFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  applyCurrentFilters();
}

/**
 * Gets current filter values
 * @returns {Object} Current filter values
 */
export function getFilters() {
  return { ...state.filters };
}

/**
 * Gets all projects
 * @returns {Array} All projects
 */
export function getProjects() {
  return [...state.projects];
}

/**
 * Gets filtered projects based on current filters
 * @returns {Array} Filtered projects
 */
export function getFilteredProjects() {
  return [...state.filteredProjects];
}

/**
 * Gets the entire state object
 * @returns {Object} Complete state object
 */
export function getState() {
  return {
    projects: [...state.projects],
    filteredProjects: [...state.filteredProjects],
    filters: { ...state.filters }
  };
}

/**
 * Applies current filters to projects
 * @private
 */
function applyCurrentFilters() {
  const { timeDimension, year, month, projectType } = state.filters;

  state.filteredProjects = state.projects.filter(project => {
    // Type filter
    const typeMatch = !projectType || project.type === projectType;

    // Time dimension filter
    let timeMatch = true;
    if (year || month) {
      const yearField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialYear' : 'year';
      const monthField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialMonth' : 'month';
      const yearMatch = !year || project[yearField] === year;
      const monthMatch = !month || project[monthField] === month;
      timeMatch = yearMatch && monthMatch;
    }

    return typeMatch && timeMatch;
  });
}