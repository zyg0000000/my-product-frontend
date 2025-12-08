/**
 * @module state-manager
 * @description Centralized state management for projects and filters
 * @version 2.0 - Added view mode, project selection, and chart field state
 */

import { DEFAULT_FILTERS, TIME_DIMENSIONS, VIEW_MODES, DEFAULT_CHART_FIELDS } from './constants.js';

/**
 * Application state
 * @private
 */
const state = {
  projects: [],
  filteredProjects: [],
  filters: { ...DEFAULT_FILTERS },
  // New state for customer view feature
  viewMode: VIEW_MODES.CUSTOMER,       // 默认客户视角
  selectedProjectIds: [],               // 空数组表示全选
  chartFields: { ...DEFAULT_CHART_FIELDS },
  // Effect performance data (keyed by projectId)
  effectPerformanceData: {},            // { projectId: { overall, talents } }
  effectMetric: 'views',                // 当前选择的效果指标 ('views' 或 'cpm')
  effectChartView: 'monthly',           // 效果图表视图模式 ('monthly' 或 'project')
  // 效果达成独立筛选
  effectFilters: {
    year: '',
    monthStart: '',
    monthEnd: ''
  }
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
    filters: { ...state.filters },
    viewMode: state.viewMode,
    selectedProjectIds: [...state.selectedProjectIds],
    chartFields: { ...state.chartFields }
  };
}

// ========== View Mode Management ==========

/**
 * Sets the current view mode
 * @param {string} mode - View mode ('customer' or 'financial')
 */
export function setViewMode(mode) {
  if (mode === VIEW_MODES.CUSTOMER || mode === VIEW_MODES.FINANCIAL) {
    state.viewMode = mode;
  }
}

/**
 * Gets the current view mode
 * @returns {string} Current view mode
 */
export function getViewMode() {
  return state.viewMode;
}

// ========== Project Selection Management ==========

/**
 * Sets the selected project IDs for filtering
 * @param {Array} projectIds - Array of project IDs to include (empty array means all)
 */
export function setSelectedProjects(projectIds) {
  state.selectedProjectIds = projectIds || [];
  applyCurrentFilters();
}

/**
 * Gets the currently selected project IDs
 * @returns {Array} Selected project IDs (empty means all)
 */
export function getSelectedProjects() {
  return [...state.selectedProjectIds];
}

// ========== Chart Fields Management ==========

/**
 * Sets the chart field selections
 * @param {Object} fields - Object with leftAxis and/or rightAxis field IDs
 */
export function setChartFields(fields) {
  state.chartFields = { ...state.chartFields, ...fields };
}

/**
 * Gets the current chart field selections
 * @returns {Object} Chart field selections
 */
export function getChartFields() {
  return { ...state.chartFields };
}

/**
 * Resets all state including view mode and selections
 */
export function resetAllState() {
  state.filters = { ...DEFAULT_FILTERS };
  state.viewMode = VIEW_MODES.CUSTOMER;
  state.selectedProjectIds = [];
  state.chartFields = { ...DEFAULT_CHART_FIELDS };
  state.effectPerformanceData = {};
  state.effectMetric = 'views';
  applyCurrentFilters();
}

// ========== Effect Performance Data Management ==========

/**
 * Sets effect performance data for a project
 * @param {string} projectId - Project ID
 * @param {Object} data - Performance data { overall, talents }
 */
export function setEffectPerformanceData(projectId, data) {
  state.effectPerformanceData[projectId] = data;
}

/**
 * Gets effect performance data for a project
 * @param {string} projectId - Project ID
 * @returns {Object|null} Performance data or null if not loaded
 */
export function getEffectPerformanceData(projectId) {
  return state.effectPerformanceData[projectId] || null;
}

/**
 * Gets all effect performance data
 * @returns {Object} All performance data keyed by projectId
 */
export function getAllEffectPerformanceData() {
  return { ...state.effectPerformanceData };
}

/**
 * Sets the current effect metric selection
 * @param {string} metric - Metric ID ('views' or 'cpm')
 */
export function setEffectMetric(metric) {
  if (metric === 'views' || metric === 'cpm') {
    state.effectMetric = metric;
  }
}

/**
 * Gets the current effect metric selection
 * @returns {string} Current effect metric
 */
export function getEffectMetric() {
  return state.effectMetric;
}

/**
 * Sets the current effect chart view mode
 * @param {string} view - View mode ('monthly' or 'project')
 */
export function setEffectChartView(view) {
  if (view === 'monthly' || view === 'project') {
    state.effectChartView = view;
  }
}

/**
 * Gets the current effect chart view mode
 * @returns {string} Current effect chart view ('monthly' or 'project')
 */
export function getEffectChartView() {
  return state.effectChartView;
}

/**
 * Sets the effect section filters
 * @param {Object} filters - { year, monthStart, monthEnd }
 */
export function setEffectFilters(filters) {
  state.effectFilters = { ...state.effectFilters, ...filters };
}

/**
 * Gets the current effect section filters
 * @returns {Object} Effect filters { year, monthStart, monthEnd }
 */
export function getEffectFilters() {
  return { ...state.effectFilters };
}

/**
 * Applies current filters to projects
 * @private
 */
function applyCurrentFilters() {
  const { timeDimension, year, monthStart, monthEnd, projectType } = state.filters;

  state.filteredProjects = state.projects.filter(project => {
    // Type filter
    const typeMatch = !projectType || project.type === projectType;

    // Time dimension filter
    let timeMatch = true;
    const yearField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialYear' : 'year';
    const monthField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialMonth' : 'month';

    // Year filter
    const yearMatch = !year || project[yearField] === year;

    // Month range filter
    let monthMatch = true;
    if (monthStart || monthEnd) {
      const projectMonth = project[monthField];
      if (projectMonth) {
        // Parse month number (M1 -> 1, M12 -> 12)
        const projectMonthNum = parseInt(projectMonth.replace('M', ''), 10);
        const startNum = monthStart ? parseInt(monthStart.replace('M', ''), 10) : 1;
        const endNum = monthEnd ? parseInt(monthEnd.replace('M', ''), 10) : 12;
        monthMatch = projectMonthNum >= startNum && projectMonthNum <= endNum;
      }
    }

    timeMatch = yearMatch && monthMatch;

    // Project selection filter (empty array means all projects selected)
    const projectMatch = state.selectedProjectIds.length === 0 ||
                         state.selectedProjectIds.includes(project.id);

    return typeMatch && timeMatch && projectMatch;
  });
}