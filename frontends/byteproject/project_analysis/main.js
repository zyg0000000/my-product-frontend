/**
 * @module main
 * @description Main initialization and coordination module for project analysis
 * @version 3.0 - Modularized ES6 version
 */

import { API_ENDPOINTS } from './constants.js';
import { apiRequest } from './api.js';
import { updateProjects, getFilteredProjects } from './state-manager.js';
import { populateFilterOptions, applyFilters, resetFilters, getCurrentFilterValues } from './filter.js';
import { calculateKpiSummary, calculateMonthlyTrend } from './kpi-calculator.js';
import { renderChart, renderKpiCards } from './chart-renderer.js';

/**
 * DOM elements cache
 * @private
 */
const elements = {
  loadingIndicator: null,
  analysisContent: null,
  applyFiltersBtn: null,
  resetFiltersBtn: null
};

/**
 * Initializes DOM element references
 * @private
 */
function initializeElements() {
  elements.loadingIndicator = document.getElementById('loading-indicator');
  elements.analysisContent = document.getElementById('analysis-content');
  elements.applyFiltersBtn = document.getElementById('apply-filters-btn');
  elements.resetFiltersBtn = document.getElementById('reset-filters-btn');
}

/**
 * Shows loading state
 * @private
 */
function showLoading() {
  if (elements.loadingIndicator) {
    elements.loadingIndicator.classList.remove('hidden');
  }
  if (elements.analysisContent) {
    elements.analysisContent.classList.add('hidden');
  }
}

/**
 * Hides loading state
 * @private
 */
function hideLoading() {
  if (elements.loadingIndicator) {
    elements.loadingIndicator.classList.add('hidden');
  }
  if (elements.analysisContent) {
    elements.analysisContent.classList.remove('hidden');
  }
}

/**
 * Shows error message in content area
 * @private
 * @param {string} message - Error message to display
 */
function showError(message) {
  if (elements.analysisContent) {
    elements.analysisContent.innerHTML = `
      <p class="text-center py-16 text-red-500">${message}</p>
    `;
  }
}

/**
 * Fetches project data from API and renders the analysis
 */
export async function fetchAndRenderData() {
  showLoading();

  try {
    // Fetch projects from API
    const response = await apiRequest(API_ENDPOINTS.PROJECTS);
    const projects = response.data || [];

    // Update state with fetched projects
    updateProjects(projects);

    // Populate filter options based on data
    populateFilterOptions(projects);

    // Render analysis with current filters
    renderAnalysis();
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    showError('数据加载失败，请刷新重试。');
  } finally {
    hideLoading();
  }
}

/**
 * Renders the complete analysis view
 */
export function renderAnalysis() {
  // Get filtered projects from state
  const filteredProjects = getFilteredProjects();

  // Calculate KPI summary
  const kpiSummary = calculateKpiSummary(filteredProjects);
  renderKpiCards(kpiSummary);

  // Calculate and render monthly trends
  const monthlyData = calculateMonthlyTrend(filteredProjects);
  renderChart(monthlyData);
}

/**
 * Handles apply filters button click
 * @private
 */
function handleApplyFilters() {
  // Apply current filter selections
  applyFilters();

  // Re-render analysis with new filters
  renderAnalysis();
}

/**
 * Handles reset filters button click
 * @private
 */
function handleResetFilters() {
  // Reset filters to defaults
  resetFilters();

  // Re-render analysis
  renderAnalysis();
}

/**
 * Sets up event listeners for UI interactions
 * @private
 */
function setupEventListeners() {
  // Apply filters button
  if (elements.applyFiltersBtn) {
    elements.applyFiltersBtn.addEventListener('click', handleApplyFilters);
  }

  // Reset filters button
  if (elements.resetFiltersBtn) {
    elements.resetFiltersBtn.addEventListener('click', handleResetFilters);
  }

  // Time dimension change handler
  const filterTimeDimension = document.getElementById('filter-time-dimension');
  if (filterTimeDimension) {
    filterTimeDimension.addEventListener('change', () => {
      // Re-populate filter options when time dimension changes
      populateFilterOptions(getFilteredProjects());
    });
  }
}

/**
 * Initializes the month filter with M1-M12 options
 * @private
 */
function initializeMonthFilter() {
  const filterMonth = document.getElementById('filter-month');
  if (!filterMonth) return;

  filterMonth.innerHTML = '<option value="">所有月份</option>';
  for (let i = 1; i <= 12; i++) {
    const option = document.createElement('option');
    option.value = `M${i}`;
    option.textContent = `M${i}`;
    filterMonth.appendChild(option);
  }
}

/**
 * Main initialization function
 * Called when DOM is ready
 */
function initializePage() {
  // Initialize DOM element references
  initializeElements();

  // Initialize month filter
  initializeMonthFilter();

  // Set up event listeners
  setupEventListeners();

  // Load data and render initial view
  fetchAndRenderData();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  // DOM is already ready
  initializePage();
}

// Export for potential external use
export default {
  initializePage,
  fetchAndRenderData,
  renderAnalysis
};