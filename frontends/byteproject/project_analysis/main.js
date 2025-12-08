/**
 * @module main
 * @description Main initialization and coordination module for project analysis
 * @version 5.0 - Added effect performance chart for customer view
 */

import { API_ENDPOINTS, VIEW_MODES } from './constants.js';
import { apiRequest } from './api.js';
import { updateProjects, getFilteredProjects, getProjects, setViewMode, getViewMode, setChartFields, getChartFields, setEffectPerformanceData, getAllEffectPerformanceData, setEffectMetric, getEffectMetric, setEffectChartView, getEffectChartView, getEffectFilters } from './state-manager.js';
import { populateFilterOptions, applyFilters, resetFilters, getCurrentFilterValues, initProjectSelector, resetProjectSelector, setTimeDimension, applyEffectFilters } from './filter.js';
import { calculateKpiSummary, calculateMonthlyTrend } from './kpi-calculator.js';
import { renderChart, renderKpiCards, updateChartFields, renderEffectPerformanceChart, renderEffectByProjectChart, showEffectChartLoading, destroyEffectChart, renderEffectKpiCards } from './chart-renderer.js';

/**
 * DOM elements cache
 * @private
 */
const elements = {
  loadingIndicator: null,
  analysisContent: null,
  applyFiltersBtn: null,
  resetFiltersBtn: null,
  // View mode elements
  viewCustomerBtn: null,
  viewFinancialBtn: null,
  // Chart field selectors
  chartLeftAxis: null,
  chartRightAxis: null,
  chartFieldSelectors: null,
  // Effect performance chart elements
  effectMetricSelect: null,
  effectPerformanceSection: null,
  effectViewToggle: null,
  // New filter elements
  timeDimensionToggle: null,
  effectFilterApply: null
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
  // View mode elements
  elements.viewCustomerBtn = document.getElementById('view-customer');
  elements.viewFinancialBtn = document.getElementById('view-financial');
  // Chart field selectors
  elements.chartLeftAxis = document.getElementById('chart-left-axis');
  elements.chartRightAxis = document.getElementById('chart-right-axis');
  elements.chartFieldSelectors = document.getElementById('chart-field-selectors');
  // Effect performance chart elements
  elements.effectMetricSelect = document.getElementById('effect-metric-select');
  elements.effectPerformanceSection = document.getElementById('effect-performance-section');
  elements.effectViewToggle = document.getElementById('effect-view-toggle');
  // New filter elements
  elements.timeDimensionToggle = document.getElementById('time-dimension-toggle');
  elements.effectFilterApply = document.getElementById('effect-filter-apply');
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

    // Initialize project selector with callback
    initProjectSelector(projects, renderAnalysis);

    // Initialize view mode UI
    updateViewModeUI(getViewMode());

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
 * Renders the complete analysis view based on current view mode
 */
export function renderAnalysis() {
  const viewMode = getViewMode();

  // Get filtered projects from state
  const filteredProjects = getFilteredProjects();

  // Calculate KPI summary based on view mode
  const kpiSummary = calculateKpiSummary(filteredProjects, viewMode);
  renderKpiCards(kpiSummary, viewMode);

  // Calculate and render monthly trends based on view mode
  const monthlyData = calculateMonthlyTrend(filteredProjects, viewMode);
  renderChart(monthlyData, viewMode);

  // Render effect performance chart (customer view only)
  if (viewMode === VIEW_MODES.CUSTOMER) {
    fetchAndRenderEffectChart(filteredProjects);
  } else {
    // Hide effect chart section in financial view
    if (elements.effectPerformanceSection) {
      elements.effectPerformanceSection.classList.add('hidden');
    }
  }
}

// ========== Effect Performance Chart ==========

/**
 * Fetches effect performance data for all projects using batch API
 * @private
 * @param {Array} projects - Array of filtered projects
 */
async function fetchAndRenderEffectChart(projects) {
  if (!projects || projects.length === 0) {
    renderEffectPerformanceChart([]);
    return;
  }

  // Show loading state
  showEffectChartLoading();

  try {
    // Use batch API to fetch all project performance data in one request
    const projectIds = projects.map(p => p.id);
    const response = await apiRequest(API_ENDPOINTS.BATCH_PROJECT_PERFORMANCE, {
      method: 'POST',
      body: { projectIds }
    });

    const { results, errors } = response;
    const validResults = [];

    // Process batch results
    projects.forEach(project => {
      const data = results[project.id];
      if (data && data.overall) {
        setEffectPerformanceData(project.id, data);
        validResults.push({ projectId: project.id, data, project });
      } else if (errors[project.id]) {
        console.warn(`Failed to fetch effect data for project ${project.id}:`, errors[project.id]);
      }
    });

    // Debug: log results by month
    console.log('[Effect Chart] Valid results:', validResults.length, 'out of', projects.length);
    const byMonth = {};
    validResults.forEach(r => {
      const key = `${r.project.year}-${r.project.month}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    console.log('[Effect Chart] Results by month:', byMonth);

    // Calculate monthly aggregates
    const monthlyEffectData = calculateMonthlyEffectTrend(validResults);
    console.log('[Effect Chart] Monthly effect data:', monthlyEffectData);

    // Calculate overall effect summary for KPI cards
    const effectSummary = calculateEffectSummary(validResults);
    console.log('[Effect KPI] Effect summary:', effectSummary);

    // Render effect KPI cards
    renderEffectKpiCards(effectSummary);

    // Render the chart based on current view mode
    const chartView = getEffectChartView();
    if (chartView === 'project') {
      // 按项目视图
      const projectEffectData = calculateProjectEffectData(validResults);
      renderEffectByProjectChart(projectEffectData, getEffectMetric());
    } else {
      // 按月汇总视图
      renderEffectPerformanceChart(monthlyEffectData, getEffectMetric());
    }
  } catch (error) {
    console.error('Failed to fetch effect performance data:', error);
    renderEffectPerformanceChart([]);
    renderEffectKpiCards(null);
  }
}

/**
 * Calculates overall effect summary for KPI cards
 * @private
 * @param {Array} effectResults - Array of { projectId, data, project } objects
 * @returns {Object} Summary { targetViews, actualViews, targetCPM, actualCPM }
 */
function calculateEffectSummary(effectResults) {
  let totalTargetViews = 0;
  let totalActualViews = 0;
  let totalActualInteractions = 0;
  let totalExecutionAmount = 0;
  let weightedTargetCPM = 0;
  let weightedActualCPM = 0;
  let validProjectCount = 0;
  let skippedCount = 0;

  const today = new Date();

  effectResults.forEach(({ data, project }) => {
    if (!data?.overall) return;

    // Check if T+21 delivery date has passed
    // deliveryDate = lastPublishDate + 21 days
    const deliveryDate = data.overall.deliveryDate;

    // If no deliveryDate, project hasn't completed publishing yet - skip it
    if (!deliveryDate) {
      skippedCount++;
      return;
    }

    const deliveryDateObj = new Date(deliveryDate);
    if (deliveryDateObj > today) {
      // T+21 not yet reached, skip this project
      skippedCount++;
      return;
    }

    const targetViews = data.overall.targetViews || 0;
    const actualViews = data.overall.t21_totalViews || 0;
    const actualInteractions = data.overall.t21_totalInteractions || 0;
    const benchmarkCPM = data.overall.benchmarkCPM || 0;
    const actualCPM = data.overall.t21_cpm || 0;
    const executionAmount = project.metrics?.totalExpense || 0;

    // Always accumulate interactions for valid projects
    totalActualInteractions += actualInteractions;

    // Only count if we have target views (means benchmarkCPM was set)
    if (targetViews > 0) {
      totalTargetViews += targetViews;
      totalActualViews += actualViews;
      totalExecutionAmount += executionAmount;

      // Weighted average for CPM
      weightedTargetCPM += benchmarkCPM * executionAmount;
      weightedActualCPM += actualCPM * executionAmount;
      validProjectCount++;
    }
  });

  console.log(`[Effect KPI] Valid projects with T+21 data: ${validProjectCount}, skipped (not yet T+21): ${skippedCount}`);

  // Calculate weighted average CPM
  const targetCPM = totalExecutionAmount > 0 ? weightedTargetCPM / totalExecutionAmount : 0;
  const actualCPM = totalExecutionAmount > 0 ? weightedActualCPM / totalExecutionAmount : 0;

  return {
    targetViews: totalTargetViews,
    actualViews: totalActualViews,
    actualInteractions: totalActualInteractions,
    targetCPM,
    actualCPM,
    validProjectCount,
    totalProjects: effectResults.length,
    skippedCount
  };
}

/**
 * Calculates per-project effect performance data
 * @private
 * @param {Array} effectResults - Array of { projectId, data, project } objects
 * @returns {Array} Per-project effect data sorted by achievement rate
 */
function calculateProjectEffectData(effectResults) {
  const projectData = [];
  const today = new Date();

  effectResults.forEach(({ data, project }) => {
    if (!data?.overall) return;

    // Check if T+21 delivery date has passed
    const deliveryDate = data.overall.deliveryDate;
    if (!deliveryDate) return;

    const deliveryDateObj = new Date(deliveryDate);
    if (deliveryDateObj > today) return;

    const targetViews = data.overall.targetViews || 0;
    if (targetViews <= 0) return;

    const actualViews = data.overall.t21_totalViews || 0;
    const benchmarkCPM = data.overall.benchmarkCPM || 0;
    const actualCPM = data.overall.t21_cpm || 0;

    // Calculate achievement rates
    const viewsRate = targetViews > 0 ? (actualViews / targetViews) : 0;
    const cpmRate = actualCPM > 0 ? (benchmarkCPM / actualCPM) : 0;

    projectData.push({
      projectId: project.id,
      projectName: project.name || project.id,
      customerMonth: `${project.year}-${project.month}`,
      targetViews,
      actualViews: actualViews,
      viewsRate,
      benchmarkCPM,
      actualCPM: actualCPM,
      cpmRate,
      executionAmount: project.metrics?.totalExpense || 0
    });
  });

  // Sort by views achievement rate (descending)
  projectData.sort((a, b) => b.viewsRate - a.viewsRate);

  return projectData;
}

/**
 * Calculates monthly effect performance trend from project data
 * @private
 * @param {Array} effectResults - Array of { projectId, data, project } objects
 * @returns {Array} Monthly aggregated effect data
 */
function calculateMonthlyEffectTrend(effectResults) {
  const monthlyMap = new Map();
  const today = new Date();

  effectResults.forEach(({ data, project }) => {
    if (!data?.overall) return;

    // Check if T+21 delivery date has passed (same filter as calculateEffectSummary)
    const deliveryDate = data.overall.deliveryDate;

    // If no deliveryDate, project hasn't completed publishing yet - skip it
    if (!deliveryDate) return;

    const deliveryDateObj = new Date(deliveryDate);
    if (deliveryDateObj > today) {
      // T+21 not yet reached, skip this project
      return;
    }

    // Only include projects with target views set
    const targetViews = data.overall.targetViews || 0;
    if (targetViews <= 0) return;

    // Use customer month for grouping - project has 'year' and 'month' fields
    const projectYear = project.year;
    const projectMonth = project.month; // Format: "M1", "M2", etc.
    if (!projectYear || !projectMonth) return;

    // Parse month (e.g., "M11" -> "11")
    const monthMatch = projectMonth.match(/M(\d+)/);
    if (!monthMatch) return;

    const monthNum = monthMatch[1].padStart(2, '0');
    const monthKey = `${projectYear}-${monthNum}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        targetViews: 0,
        t21_totalViews: 0,
        benchmarkCPM: 0,
        t21_cpm: 0,
        projectCount: 0,
        // For weighted average of CPM
        totalExecutionAmount: 0
      });
    }

    const monthData = monthlyMap.get(monthKey);

    // Sum up views
    monthData.targetViews += data.overall.targetViews || 0;
    monthData.t21_totalViews += data.overall.t21_totalViews || 0;

    // For CPM, we need weighted average based on execution amount (totalExpense)
    const executionAmount = project.metrics?.totalExpense || 0;
    monthData.totalExecutionAmount += executionAmount;

    // Accumulate for weighted average
    monthData.benchmarkCPM += (data.overall.benchmarkCPM || 0) * executionAmount;
    monthData.t21_cpm += (data.overall.t21_cpm || 0) * executionAmount;

    monthData.projectCount++;
  });

  // Calculate weighted average for CPM values
  monthlyMap.forEach((monthData) => {
    if (monthData.totalExecutionAmount > 0) {
      monthData.benchmarkCPM = monthData.benchmarkCPM / monthData.totalExecutionAmount;
      monthData.t21_cpm = monthData.t21_cpm / monthData.totalExecutionAmount;
    }
  });

  // Sort by month and return as array
  return Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Handles effect metric selector change
 * @private
 */
function handleEffectMetricChange() {
  const metric = elements.effectMetricSelect?.value || 'views';
  setEffectMetric(metric);

  // Re-render with new metric
  rerenderEffectChart();
}

/**
 * Handles effect chart view toggle
 * @private
 * @param {string} view - View mode ('monthly' or 'project')
 */
function handleEffectViewChange(view) {
  setEffectChartView(view);

  // Update toggle button states
  if (elements.effectViewToggle) {
    const buttons = elements.effectViewToggle.querySelectorAll('button');
    buttons.forEach(btn => {
      const btnView = btn.getAttribute('data-view');
      btn.classList.toggle('active', btnView === view);
    });
  }

  // Re-render with new view
  rerenderEffectChart();
}

/**
 * Re-renders the effect chart with current settings
 * @private
 */
function rerenderEffectChart() {
  const filteredProjects = getFilteredProjects();
  const effectResults = [];

  // Get cached effect data from state
  const allEffectData = getAllEffectPerformanceData();
  filteredProjects.forEach(project => {
    const data = allEffectData[project.id];
    if (data) {
      effectResults.push({ projectId: project.id, data, project });
    }
  });

  // Apply effect-specific filters
  const filteredEffectResults = applyEffectFilterToResults(effectResults);

  const chartView = getEffectChartView();
  const metric = getEffectMetric();

  // Calculate KPI summary with filtered results
  const effectSummary = calculateEffectSummary(filteredEffectResults);
  renderEffectKpiCards(effectSummary);

  if (chartView === 'project') {
    const projectEffectData = calculateProjectEffectData(filteredEffectResults);
    renderEffectByProjectChart(projectEffectData, metric);
  } else {
    const monthlyEffectData = calculateMonthlyEffectTrend(filteredEffectResults);
    renderEffectPerformanceChart(monthlyEffectData, metric);
  }
}

/**
 * Applies effect section filters to effect results
 * @private
 * @param {Array} effectResults - Array of effect results
 * @returns {Array} Filtered effect results
 */
function applyEffectFilterToResults(effectResults) {
  const { year, monthStart, monthEnd } = getEffectFilters();

  if (!year && !monthStart && !monthEnd) {
    return effectResults;
  }

  return effectResults.filter(({ project }) => {
    // Year filter
    if (year && project.year !== year) {
      return false;
    }

    // Month range filter
    if (monthStart || monthEnd) {
      const projectMonth = project.month;
      if (projectMonth) {
        const projectMonthNum = parseInt(projectMonth.replace('M', ''), 10);
        const startNum = monthStart ? parseInt(monthStart.replace('M', ''), 10) : 1;
        const endNum = monthEnd ? parseInt(monthEnd.replace('M', ''), 10) : 12;
        if (projectMonthNum < startNum || projectMonthNum > endNum) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Handles effect filter apply button click
 * @private
 */
function handleEffectFilterApply() {
  // Apply effect filters from UI
  applyEffectFilters();

  // Re-render effect section
  rerenderEffectChart();
}

// ========== View Mode Management ==========

/**
 * Updates UI elements based on view mode
 * @private
 * @param {string} mode - View mode ('customer' or 'financial')
 */
function updateViewModeUI(mode) {
  // Update toggle button states
  if (elements.viewCustomerBtn) {
    elements.viewCustomerBtn.classList.toggle('active', mode === VIEW_MODES.CUSTOMER);
  }
  if (elements.viewFinancialBtn) {
    elements.viewFinancialBtn.classList.toggle('active', mode === VIEW_MODES.FINANCIAL);
  }

  // Show/hide chart field selectors (only for customer view)
  if (elements.chartFieldSelectors) {
    elements.chartFieldSelectors.classList.toggle('hidden', mode !== VIEW_MODES.CUSTOMER);
  }
}

/**
 * Switches the view mode
 * @private
 * @param {string} mode - View mode to switch to
 */
function switchViewMode(mode) {
  setViewMode(mode);
  updateViewModeUI(mode);
  renderAnalysis();
}

/**
 * Handles chart field selection change
 * @private
 */
function handleChartFieldChange() {
  const leftAxis = elements.chartLeftAxis?.value;
  const rightAxis = elements.chartRightAxis?.value;

  if (leftAxis && rightAxis) {
    const filteredProjects = getFilteredProjects();
    const monthlyData = calculateMonthlyTrend(filteredProjects, VIEW_MODES.CUSTOMER);
    updateChartFields(leftAxis, rightAxis, monthlyData);
  }
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

  // Reset project selector
  resetProjectSelector();

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

  // Time dimension toggle handler
  if (elements.timeDimensionToggle) {
    elements.timeDimensionToggle.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (button) {
        const dimension = button.getAttribute('data-value');
        if (dimension) {
          // Update button states
          const buttons = elements.timeDimensionToggle.querySelectorAll('button');
          buttons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === dimension);
          });
          // Update filter state and repopulate year filter
          setTimeDimension(dimension);
        }
      }
    });
  }

  // Effect filter apply button
  if (elements.effectFilterApply) {
    elements.effectFilterApply.addEventListener('click', handleEffectFilterApply);
  }

  // View mode toggle buttons
  if (elements.viewCustomerBtn) {
    elements.viewCustomerBtn.addEventListener('click', () => switchViewMode(VIEW_MODES.CUSTOMER));
  }
  if (elements.viewFinancialBtn) {
    elements.viewFinancialBtn.addEventListener('click', () => switchViewMode(VIEW_MODES.FINANCIAL));
  }

  // Chart field selectors
  if (elements.chartLeftAxis) {
    elements.chartLeftAxis.addEventListener('change', handleChartFieldChange);
  }
  if (elements.chartRightAxis) {
    elements.chartRightAxis.addEventListener('change', handleChartFieldChange);
  }

  // Effect metric selector
  if (elements.effectMetricSelect) {
    elements.effectMetricSelect.addEventListener('change', handleEffectMetricChange);
  }

  // Effect view toggle
  if (elements.effectViewToggle) {
    elements.effectViewToggle.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (button) {
        const view = button.getAttribute('data-view');
        if (view) {
          handleEffectViewChange(view);
        }
      }
    });
  }
}

/**
 * Main initialization function
 * Called when DOM is ready
 */
function initializePage() {
  // Initialize DOM element references
  initializeElements();

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