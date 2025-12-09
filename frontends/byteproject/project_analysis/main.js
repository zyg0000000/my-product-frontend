/**
 * @module main
 * @description Main initialization and coordination module for project analysis
 * @version 6.0 - Added talent collaboration view
 */

import { API_ENDPOINTS, VIEW_MODES, DATA_PERIODS } from './constants.js';
import { apiRequest } from './api.js';
import { updateProjects, getFilteredProjects, getProjects, setViewMode, getViewMode, setChartFields, getChartFields, setEffectPerformanceData, getAllEffectPerformanceData, setEffectMetric, getEffectMetric, setEffectChartView, getEffectChartView, getEffectFilters, setDataPeriod, getDataPeriod, getPeriodFieldName } from './state-manager.js';
import { populateFilterOptions, applyFilters, resetFilters, getCurrentFilterValues, initProjectSelector, resetProjectSelector, setTimeDimension, applyEffectFilters } from './filter.js';
import { calculateKpiSummary, calculateMonthlyTrend } from './kpi-calculator.js';
import { renderChart, renderKpiCards, updateChartFields, renderEffectPerformanceChart, renderEffectByProjectChart, showEffectChartLoading, destroyEffectChart, renderEffectKpiCards } from './chart-renderer.js';
import { initTalentViewElements, showTalentViewSection, hideTalentViewSection, aggregateTalentData, sortTalents, renderTalentKpiCards, renderTalentRankingTable, getCurrentTalentSort, destroyTalentWorksChart, initTalentProjectSelector, setAllTalents } from './talent-view.js';

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
  viewTalentBtn: null,
  // View content sections
  kpiCustomerView: null,
  kpiFinancialView: null,
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
  effectFilterApply: null,
  // Filter sections
  bizFilters: null,
  talentFiltersSection: null,
  // Data period toggle
  dataPeriodToggle: null
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
  elements.viewTalentBtn = document.getElementById('view-talent');
  // View content sections
  elements.kpiCustomerView = document.getElementById('kpi-customer-view');
  elements.kpiFinancialView = document.getElementById('kpi-financial-view');
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
  // Filter sections
  elements.bizFilters = document.getElementById('biz-filters');
  elements.talentFiltersSection = document.getElementById('talent-filters');
  // Data period toggle
  elements.dataPeriodToggle = document.getElementById('data-period-toggle');
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
  console.log('[renderAnalysis] Current view mode:', viewMode, 'Is TALENT?', viewMode === VIEW_MODES.TALENT);

  // Get filtered projects from state
  const filteredProjects = getFilteredProjects();

  // Handle talent view separately
  if (viewMode === VIEW_MODES.TALENT) {
    console.log('[renderAnalysis] Entering TALENT branch, calling renderTalentView...');
    // Hide effect chart section
    if (elements.effectPerformanceSection) {
      elements.effectPerformanceSection.classList.add('hidden');
    }
    // Render talent-specific view
    renderTalentView();
    return;
  }

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
        // Debug: verify talents array is present when storing
        if (!data.talents || data.talents.length === 0) {
          console.warn(`[Effect Data] Project ${project.id} has no talents array`);
        }
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

  // 获取当前数据周期
  const currentPeriod = getDataPeriod();
  const periodDays = currentPeriod === 't7' ? 7 : 21;
  const periodLabel = currentPeriod === 't7' ? 'T+7' : 'T+21';

  // 获取动态字段名
  const viewsField = getPeriodFieldName('totalViews');
  const interactionsField = getPeriodFieldName('totalInteractions');
  const cpmField = getPeriodFieldName('cpm');

  // 调试：记录被排除的项目
  const excludedProjects = {
    noDeliveryDate: [],
    deliveryDateNotReached: [],
    noTargetViews: []
  };

  effectResults.forEach(({ data, project }) => {
    if (!data?.overall) return;

    // 从 API 直接获取 lastPublishDate（最后发布日期）
    const lastPublishDate = data.overall.lastPublishDate;
    const actualViews = data.overall[viewsField] || 0;

    // If no lastPublishDate, project hasn't completed publishing yet - skip it
    if (!lastPublishDate) {
      skippedCount++;
      excludedProjects.noDeliveryDate.push({
        name: project.name || project.id,
        id: project.id,
        views: actualViews
      });
      return;
    }

    // 根据数据周期计算交付日期
    // T+7: lastPublishDate + 7天
    // T+21: lastPublishDate + 21天
    const lastPublishDateObj = new Date(lastPublishDate);
    const checkDeliveryDate = new Date(lastPublishDateObj);
    checkDeliveryDate.setDate(checkDeliveryDate.getDate() + periodDays);
    const checkDeliveryDateStr = checkDeliveryDate.toISOString().split('T')[0];

    if (checkDeliveryDate > today) {
      // 交付日期未到，跳过此项目
      skippedCount++;
      excludedProjects.deliveryDateNotReached.push({
        name: project.name || project.id,
        id: project.id,
        deliveryDate: checkDeliveryDateStr,
        views: actualViews
      });
      return;
    }

    const targetViews = data.overall.targetViews || 0;
    const actualInteractions = data.overall[interactionsField] || 0;
    const benchmarkCPM = data.overall.benchmarkCPM || 0;
    const actualCPM = data.overall[cpmField] || 0;
    // 使用 API 返回的 totalExecutionAmount（与达人视角一致）
    const executionAmount = data.overall.totalExecutionAmount || 0;

    // 所有已交付项目都纳入播放量和互动量统计
    totalActualViews += actualViews;
    totalActualInteractions += actualInteractions;
    totalExecutionAmount += executionAmount;
    validProjectCount++;

    // 只有设置了基准CPM的项目才纳入目标播放量和CPM统计
    if (targetViews > 0) {
      totalTargetViews += targetViews;
      // Weighted average for CPM (只计算有基准CPM的项目)
      weightedTargetCPM += benchmarkCPM * executionAmount;
      weightedActualCPM += actualCPM * executionAmount;
    } else {
      // 记录没有设置基准CPM的项目（仅用于调试）
      excludedProjects.noTargetViews.push({
        name: project.name || project.id,
        id: project.id,
        views: actualViews,
        benchmarkCPM
      });
    }
  });

  // 输出详细的排除项目信息
  console.log(`[Effect KPI] ========== 客户视角数据过滤详情 (${periodLabel}) ==========`);
  console.log(`[Effect KPI] 数据周期: ${periodLabel}, 交付天数: ${periodDays}天`);
  console.log(`[Effect KPI] 总项目数: ${effectResults.length}`);
  console.log(`[Effect KPI] 纳入统计: ${validProjectCount}`);
  console.log(`[Effect KPI] 被排除: ${effectResults.length - validProjectCount}`);

  if (excludedProjects.noDeliveryDate.length > 0) {
    const totalViews = excludedProjects.noDeliveryDate.reduce((sum, p) => sum + p.views, 0);
    console.log(`[Effect KPI] 无交付日期 (${excludedProjects.noDeliveryDate.length}个, 播放量${(totalViews/100000000).toFixed(2)}亿):`,
      excludedProjects.noDeliveryDate.map(p => p.name));
  }

  if (excludedProjects.deliveryDateNotReached.length > 0) {
    const totalViews = excludedProjects.deliveryDateNotReached.reduce((sum, p) => sum + p.views, 0);
    console.log(`[Effect KPI] 交付日期未到 (${excludedProjects.deliveryDateNotReached.length}个, 播放量${(totalViews/100000000).toFixed(2)}亿):`,
      excludedProjects.deliveryDateNotReached.map(p => `${p.name}(${p.deliveryDate})`));
  }

  if (excludedProjects.noTargetViews.length > 0) {
    const totalViews = excludedProjects.noTargetViews.reduce((sum, p) => sum + p.views, 0);
    console.log(`[Effect KPI] 无目标播放量 (${excludedProjects.noTargetViews.length}个, 播放量${(totalViews/100000000).toFixed(2)}亿):`,
      excludedProjects.noTargetViews.map(p => p.name));
  }

  console.log(`[Effect KPI] ==========================================`);

  // 计算实际CPM：总执行金额 / 总播放量 * 1000（与达人视角一致）
  const actualCPM = totalActualViews > 0 ? (totalExecutionAmount / totalActualViews) * 1000 : 0;

  // 目标CPM：只计算设置了基准CPM的项目的加权平均
  const targetCPM = weightedTargetCPM > 0 && totalTargetViews > 0
    ? weightedTargetCPM / (totalTargetViews / 1000)  // 加权目标CPM
    : 0;

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

  // 获取动态字段名
  const viewsField = getPeriodFieldName('totalViews');
  const cpmField = getPeriodFieldName('cpm');

  // 获取当前数据周期
  const currentPeriod = getDataPeriod();
  const periodDays = currentPeriod === 't7' ? 7 : 21;

  effectResults.forEach(({ data, project }) => {
    if (!data?.overall) return;

    // 使用 lastPublishDate 计算交付日期
    const lastPublishDate = data.overall.lastPublishDate;
    if (!lastPublishDate) return;

    const lastPublishDateObj = new Date(lastPublishDate);
    const deliveryDateObj = new Date(lastPublishDateObj);
    deliveryDateObj.setDate(deliveryDateObj.getDate() + periodDays);
    if (deliveryDateObj > today) return;

    const targetViews = data.overall.targetViews || 0;
    if (targetViews <= 0) return;

    const actualViews = data.overall[viewsField] || 0;
    const benchmarkCPM = data.overall.benchmarkCPM || 0;
    const actualCPM = data.overall[cpmField] || 0;

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
      // 使用 API 返回的 totalExecutionAmount（与达人视角一致）
      executionAmount: data.overall.totalExecutionAmount || 0
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

  // 获取动态字段名
  const viewsField = getPeriodFieldName('totalViews');
  const cpmField = getPeriodFieldName('cpm');

  // 获取当前数据周期
  const currentPeriod = getDataPeriod();
  const periodDays = currentPeriod === 't7' ? 7 : 21;

  effectResults.forEach(({ data, project }) => {
    if (!data?.overall) return;

    // 使用 lastPublishDate 计算交付日期（与 calculateEffectSummary 保持一致）
    const lastPublishDate = data.overall.lastPublishDate;

    // If no lastPublishDate, project hasn't completed publishing yet - skip it
    if (!lastPublishDate) return;

    const lastPublishDateObj = new Date(lastPublishDate);
    const deliveryDateObj = new Date(lastPublishDateObj);
    deliveryDateObj.setDate(deliveryDateObj.getDate() + periodDays);

    if (deliveryDateObj > today) {
      // 交付日期未到，跳过此项目
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
        [viewsField]: 0,
        benchmarkCPM: 0,
        [cpmField]: 0,
        projectCount: 0,
        // For weighted average of CPM
        totalExecutionAmount: 0
      });
    }

    const monthData = monthlyMap.get(monthKey);

    // Sum up views
    monthData.targetViews += data.overall.targetViews || 0;
    monthData[viewsField] += data.overall[viewsField] || 0;

    // For CPM, we need weighted average based on execution amount
    // 使用 API 返回的 totalExecutionAmount（与达人视角一致）
    const executionAmount = data.overall.totalExecutionAmount || 0;
    monthData.totalExecutionAmount += executionAmount;

    // Accumulate for weighted average
    monthData.benchmarkCPM += (data.overall.benchmarkCPM || 0) * executionAmount;
    monthData[cpmField] += (data.overall[cpmField] || 0) * executionAmount;

    monthData.projectCount++;
  });

  // Calculate weighted average for CPM values
  monthlyMap.forEach((monthData) => {
    if (monthData.totalExecutionAmount > 0) {
      monthData.benchmarkCPM = monthData.benchmarkCPM / monthData.totalExecutionAmount;
      monthData[cpmField] = monthData[cpmField] / monthData.totalExecutionAmount;
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
 * @param {string} mode - View mode ('customer', 'financial', or 'talent')
 */
function updateViewModeUI(mode) {
  // Update toggle button states
  if (elements.viewCustomerBtn) {
    elements.viewCustomerBtn.classList.toggle('active', mode === VIEW_MODES.CUSTOMER);
  }
  if (elements.viewFinancialBtn) {
    elements.viewFinancialBtn.classList.toggle('active', mode === VIEW_MODES.FINANCIAL);
  }
  if (elements.viewTalentBtn) {
    elements.viewTalentBtn.classList.toggle('active', mode === VIEW_MODES.TALENT);
  }

  // Show/hide view content sections based on mode - 使用直接样式设置确保生效
  if (elements.kpiCustomerView) {
    if (mode !== VIEW_MODES.CUSTOMER) {
      elements.kpiCustomerView.style.display = 'none';
    } else {
      elements.kpiCustomerView.style.display = '';
    }
  }
  if (elements.kpiFinancialView) {
    if (mode !== VIEW_MODES.FINANCIAL) {
      elements.kpiFinancialView.style.display = 'none';
    } else {
      elements.kpiFinancialView.style.display = '';
    }
  }

  // Show/hide chart field selectors (only for customer view)
  if (elements.chartFieldSelectors) {
    elements.chartFieldSelectors.classList.toggle('hidden', mode !== VIEW_MODES.CUSTOMER);
  }

  // Show/hide effect performance section (only for customer view)
  if (elements.effectPerformanceSection) {
    elements.effectPerformanceSection.classList.toggle('hidden', mode !== VIEW_MODES.CUSTOMER);
  }

  // Show/hide talent view section
  if (mode === VIEW_MODES.TALENT) {
    showTalentViewSection();
  } else {
    hideTalentViewSection();
    destroyTalentWorksChart();
  }

  // Toggle filter sections based on view mode
  if (elements.bizFilters) {
    elements.bizFilters.classList.toggle('hidden', mode === VIEW_MODES.TALENT);
  }
  if (elements.talentFiltersSection) {
    elements.talentFiltersSection.classList.toggle('hidden', mode !== VIEW_MODES.TALENT);
  }
}

/**
 * Switches the view mode
 * @private
 * @param {string} mode - View mode to switch to
 */
function switchViewMode(mode) {
  console.log('[switchViewMode] Switching to mode:', mode);
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
 * Updates UI labels based on current data period
 * @private
 * @param {string} period - Data period ('t7' or 't21')
 */
function updatePeriodLabels(period) {
  const periodLabel = period === 't7' ? 'T+7' : 'T+21';

  // Update effect views label (客户视角)
  const effectViewsLabel = document.getElementById('effect-views-label');
  if (effectViewsLabel) {
    effectViewsLabel.textContent = `总播放量(${periodLabel})`;
  }

  // Update talent views label (达人视角)
  const talentViewsLabel = document.getElementById('talent-views-label');
  if (talentViewsLabel) {
    talentViewsLabel.textContent = `总播放量(${periodLabel})`;
  }
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
  if (elements.viewTalentBtn) {
    elements.viewTalentBtn.addEventListener('click', () => switchViewMode(VIEW_MODES.TALENT));
  }

  // Data period toggle (T+7 / T+21)
  if (elements.dataPeriodToggle) {
    elements.dataPeriodToggle.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (button) {
        const period = button.getAttribute('data-period');
        if (period && (period === DATA_PERIODS.T7 || period === DATA_PERIODS.T21)) {
          // Update button states
          const buttons = elements.dataPeriodToggle.querySelectorAll('button');
          buttons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-period') === period);
          });
          // Update state and re-render
          setDataPeriod(period);
          // Update dynamic labels
          updatePeriodLabels(period);
          renderAnalysis();
        }
      }
    });
  }

  // Talent sort change event
  document.addEventListener('talentSortChange', (e) => {
    rerenderTalentView(e.detail.sortBy);
  });

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

// ========== Talent View Functions ==========

/**
 * Cached talent effect results for re-sorting
 * @private
 */
let cachedTalentEffectResults = [];

/**
 * Fetches effect data and renders talent view
 * @private
 */
async function renderTalentView() {
  const filteredProjects = getFilteredProjects();
  console.log('[Talent View] Filtered projects:', filteredProjects?.length);

  if (!filteredProjects || filteredProjects.length === 0) {
    renderTalentKpiCards({ uniqueTalentCount: 0, totalCollaborations: 0, totalViews: 0, avgCPM: 0 });
    renderTalentRankingTable([]);
    return;
  }

  try {
    // Check if we have cached effect data
    const allEffectData = getAllEffectPerformanceData();
    let effectResults = [];

    filteredProjects.forEach(project => {
      const data = allEffectData[project.id];
      if (data) {
        effectResults.push({ projectId: project.id, data, project });
      }
    });

    console.log('[Talent View] Cache check:', {
      cachedProjectIds: Object.keys(allEffectData),
      filteredProjectIds: filteredProjects.map(p => p.id),
      matchedCount: effectResults.length
    });

    // If no cached data, fetch from API
    if (effectResults.length === 0) {
      console.log('[Talent View] No cached data, fetching from API...');
      const projectIds = filteredProjects.map(p => p.id);
      const response = await apiRequest(API_ENDPOINTS.BATCH_PROJECT_PERFORMANCE, {
        method: 'POST',
        body: { projectIds }
      });

      const { results, errors } = response;
      console.log('[Talent View] API response:', { resultsCount: Object.keys(results || {}).length, errors });

      filteredProjects.forEach(project => {
        const data = results[project.id];
        if (data && data.talents) {
          setEffectPerformanceData(project.id, data);
          effectResults.push({ projectId: project.id, data, project });
        } else if (errors && errors[project.id]) {
          console.warn(`Failed to fetch talent data for project ${project.id}:`, errors[project.id]);
        }
      });
    }

    // Debug: check if talents array exists in data
    if (effectResults.length > 0) {
      const sampleData = effectResults[0].data;
      console.log('[Talent View] Sample data structure:', {
        hasOverall: !!sampleData?.overall,
        hasTalents: !!sampleData?.talents,
        talentsCount: sampleData?.talents?.length,
        sampleTalent: sampleData?.talents?.[0]
      });
    }

    // Cache results for re-sorting
    cachedTalentEffectResults = effectResults;

    // Initialize talent project selector with all projects (使用所有项目，不仅是筛选后的)
    const allProjects = getProjects();
    initTalentProjectSelector(allProjects);

    // Aggregate talent data
    const { talents, summary } = aggregateTalentData(effectResults);
    console.log('[Talent View] Aggregated:', { talentsCount: talents.length, summary });

    // Store all talents for filtering
    setAllTalents(talents);

    // Render KPI cards
    renderTalentKpiCards(summary);

    // Sort and render ranking table
    const sortBy = getCurrentTalentSort();
    const sortedTalents = sortTalents(talents, sortBy);
    renderTalentRankingTable(sortedTalents);

  } catch (error) {
    console.error('Failed to render talent view:', error);
    renderTalentKpiCards({ uniqueTalentCount: 0, totalCollaborations: 0, totalViews: 0, avgCPM: 0 });
    renderTalentRankingTable([]);
  }
}

/**
 * Re-renders talent view with new sort order
 * @private
 * @param {string} sortBy - Sort field ('collaborations', 'views', 'cpm')
 */
function rerenderTalentView(sortBy) {
  if (cachedTalentEffectResults.length === 0) return;

  const { talents, summary } = aggregateTalentData(cachedTalentEffectResults);
  renderTalentKpiCards(summary);

  const sortedTalents = sortTalents(talents, sortBy);
  renderTalentRankingTable(sortedTalents);
}

/**
 * Main initialization function
 * Called when DOM is ready
 */
function initializePage() {
  // Initialize DOM element references
  initializeElements();

  // Initialize talent view elements
  initTalentViewElements();

  // Set up event listeners
  setupEventListeners();

  // Initialize period labels with default value
  updatePeriodLabels(getDataPeriod());

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