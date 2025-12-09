/**
 * @module chart-renderer
 * @description Chart rendering functions using Chart.js
 * @version 3.0 - Added effect performance chart for customer view
 */

import { formatCurrency, formatPercent, formatNumber } from './utils.js';
import { CHART_CONFIG, VIEW_MODES, CHART_FIELD_OPTIONS, EFFECT_METRIC_OPTIONS, getActualFieldName, getActualLabel } from './constants.js';
import { getViewMode, getChartFields, setChartFields, getEffectMetric, getEffectChartView, getDataPeriod, getPeriodLabel } from './state-manager.js';

// Chart instance storage
let monthlyTrendChart = null;
let effectPerformanceChart = null;

/**
 * Renders or updates the monthly trend chart based on view mode
 * @param {Array} monthlyData - Array of monthly data objects
 * @param {string} viewMode - Optional view mode override
 */
export function renderChart(monthlyData, viewMode = null) {
  const currentViewMode = viewMode || getViewMode();
  const ctx = document.getElementById('monthly-trend-chart')?.getContext('2d');
  if (!ctx) return;

  const canvasParent = ctx.canvas.parentElement;

  // Handle empty data case
  if (!monthlyData || monthlyData.length === 0) {
    if (monthlyTrendChart) {
      monthlyTrendChart.destroy();
      monthlyTrendChart = null;
    }
    canvasParent.innerHTML = '<p class="text-center py-16 text-gray-500">暂无月度数据可供分析。</p><canvas id="monthly-trend-chart" class="hidden"></canvas>';
    return;
  }

  // Destroy existing chart before creating new one (for view mode switches)
  if (monthlyTrendChart) {
    monthlyTrendChart.destroy();
    monthlyTrendChart = null;
  }

  // Create chart based on view mode
  if (currentViewMode === VIEW_MODES.CUSTOMER) {
    monthlyTrendChart = createCustomerChart(ctx, monthlyData);
  } else {
    monthlyTrendChart = createFinancialChart(ctx, monthlyData);
  }
}

/**
 * Creates a chart for customer view with field selection
 * @private
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} monthlyData - Monthly data array
 * @returns {Chart} Chart.js instance
 */
function createCustomerChart(ctx, monthlyData) {
  const chartFields = getChartFields();
  const leftFieldConfig = CHART_FIELD_OPTIONS.leftAxis.find(f => f.id === chartFields.leftAxis);
  const rightFieldConfig = CHART_FIELD_OPTIONS.rightAxis.find(f => f.id === chartFields.rightAxis);

  const labels = monthlyData.map(d => d.month);
  const leftData = monthlyData.map(d => d[chartFields.leftAxis] || 0);
  const rightData = monthlyData.map(d => d[chartFields.rightAxis] || 0);

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: leftFieldConfig?.label || '左轴数据',
          data: leftData,
          backgroundColor: CHART_CONFIG.COLORS.CUSTOMER_BAR,
          borderColor: CHART_CONFIG.COLORS.CUSTOMER_BAR_BORDER,
          borderWidth: 1,
          yAxisID: 'y-left',
        },
        {
          label: rightFieldConfig?.label || '右轴数据',
          data: rightData,
          type: 'line',
          borderColor: CHART_CONFIG.COLORS.CUSTOMER_LINE,
          backgroundColor: CHART_CONFIG.COLORS.CUSTOMER_LINE_FILL,
          borderWidth: 2,
          tension: CHART_CONFIG.LINE_TENSION,
          fill: false,
          yAxisID: 'y-right',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        'y-left': {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: leftFieldConfig?.label || '左轴'
          },
          ticks: {
            callback: function(value) {
              return leftFieldConfig?.format === 'currency'
                ? formatCurrency(value)
                : formatNumber(value);
            }
          }
        },
        'y-right': {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: rightFieldConfig?.label || '右轴'
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return rightFieldConfig?.format === 'currency'
                ? formatCurrency(value)
                : formatNumber(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const datasetLabel = context.dataset.label;
              const value = context.parsed.y;
              const dataIndex = context.dataIndex;

              // Determine format based on field config
              const isLeftAxis = context.datasetIndex === 0;
              const fieldConfig = isLeftAxis ? leftFieldConfig : rightFieldConfig;

              if (fieldConfig?.format === 'currency') {
                return `${datasetLabel}: ${formatCurrency(value)}`;
              }
              return `${datasetLabel}: ${formatNumber(value)}`;
            },
            afterBody: function(context) {
              // Show funds occupation cost info in tooltip
              const dataIndex = context[0]?.dataIndex;
              if (dataIndex !== undefined) {
                const fundsCost = monthlyData[dataIndex]?.fundsOccupationCost;
                if (fundsCost > 0) {
                  return [``, `资金占用费用: ${formatCurrency(fundsCost)}`];
                }
              }
              return [];
            }
          }
        }
      }
    }
  });
}

/**
 * Creates a chart for financial view (original chart with income and margin)
 * @private
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} monthlyData - Monthly data array
 * @returns {Chart} Chart.js instance
 */
function createFinancialChart(ctx, monthlyData) {
  const labels = monthlyData.map(d => d.month);
  const incomeData = monthlyData.map(d => d.totalIncome);
  const marginData = monthlyData.map(d => d.margin || 0);

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '总收入 (元)',
          data: incomeData,
          backgroundColor: CHART_CONFIG.COLORS.INCOME_BAR,
          borderColor: CHART_CONFIG.COLORS.INCOME_BORDER,
          borderWidth: 1,
          yAxisID: 'y-axis-income',
        },
        {
          label: '经营毛利率 (%)',
          data: marginData,
          type: 'line',
          borderColor: CHART_CONFIG.COLORS.MARGIN_LINE,
          backgroundColor: CHART_CONFIG.COLORS.MARGIN_FILL,
          borderWidth: 2,
          tension: CHART_CONFIG.LINE_TENSION,
          fill: false,
          yAxisID: 'y-axis-margin',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        'y-axis-income': {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: '金额 (元)'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        },
        'y-axis-margin': {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: '利润率 (%)'
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return formatPercent(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const datasetLabel = context.dataset.label;
              const value = context.parsed.y;

              if (datasetLabel.includes('总收入')) {
                return `${datasetLabel}: ${formatCurrency(value)}`;
              } else if (datasetLabel.includes('毛利率')) {
                return `${datasetLabel}: ${formatPercent(value)}`;
              }
              return `${datasetLabel}: ${value}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Updates chart fields and re-renders (for customer view)
 * @param {string} leftAxis - Left axis field ID
 * @param {string} rightAxis - Right axis field ID
 * @param {Array} monthlyData - Monthly data for re-render
 */
export function updateChartFields(leftAxis, rightAxis, monthlyData) {
  setChartFields({ leftAxis, rightAxis });
  renderChart(monthlyData, VIEW_MODES.CUSTOMER);
}

/**
 * Renders KPI cards in the UI based on view mode
 * @param {Object} kpiSummary - KPI summary object from calculator
 * @param {string} viewMode - Optional view mode override
 */
export function renderKpiCards(kpiSummary, viewMode = null) {
  if (!kpiSummary) return;

  const currentViewMode = viewMode || getViewMode();

  // Toggle visibility of KPI sections
  const customerKpiSection = document.getElementById('kpi-customer-view');
  const financialKpiSection = document.getElementById('kpi-financial-view');

  if (currentViewMode === VIEW_MODES.CUSTOMER) {
    // Show customer view KPIs
    if (customerKpiSection) customerKpiSection.classList.remove('hidden');
    if (financialKpiSection) financialKpiSection.classList.add('hidden');

    // Update customer view KPI elements
    updateElementText('kpi-biz-projects', formatNumber(kpiSummary.totalProjects));
    updateElementText('kpi-biz-collaborators', formatNumber(kpiSummary.totalCollaborators));
    updateElementText('kpi-biz-income', formatCurrency(kpiSummary.totalIncomeAgg));
    updateElementText('kpi-biz-funds-cost', formatCurrency(kpiSummary.fundsOccupationCost));
  } else {
    // Show financial view KPIs
    if (customerKpiSection) customerKpiSection.classList.add('hidden');
    if (financialKpiSection) financialKpiSection.classList.remove('hidden');

    // Update financial view KPI elements
    updateElementText('kpi-total-projects', formatNumber(kpiSummary.totalProjects));
    updateElementText('kpi-total-collaborators', formatNumber(kpiSummary.totalCollaborators));
    updateElementText('kpi-total-income-agg', formatCurrency(kpiSummary.totalIncomeAgg));
    updateElementText('kpi-income-adjustments', formatCurrency(kpiSummary.incomeAdjustments));
    updateElementText('kpi-pre-adjustment-profit', formatCurrency(kpiSummary.preAdjustmentProfit));
    updateElementText('kpi-pre-adjustment-margin', formatPercent(kpiSummary.preAdjustmentMargin));
    updateElementText('kpi-operational-profit', formatCurrency(kpiSummary.operationalProfit));
    updateElementText('kpi-operational-margin', formatPercent(kpiSummary.operationalMargin));
    updateElementText('kpi-total-expense', formatCurrency(kpiSummary.totalExpense));
    updateElementText('kpi-funds-occupation-cost', formatCurrency(kpiSummary.fundsOccupationCost));
    updateElementText('kpi-expense-adjustments', formatCurrency(kpiSummary.expenseAdjustments));
    updateElementText('kpi-total-operational-cost', formatCurrency(kpiSummary.totalOperationalCost));
  }
}

/**
 * Updates element text content if element exists
 * @private
 * @param {string} elementId - DOM element ID
 * @param {string} text - Text to set
 */
function updateElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

/**
 * Destroys the chart instance
 */
export function destroyChart() {
  if (monthlyTrendChart) {
    monthlyTrendChart.destroy();
    monthlyTrendChart = null;
  }
}

// ========== Effect Performance Chart ==========

/**
 * Renders the effect performance trend chart (customer view only)
 * @param {Array} monthlyEffectData - Array of monthly effect data objects
 * @param {string} metric - Metric to display ('views' or 'cpm')
 */
export function renderEffectPerformanceChart(monthlyEffectData, metric = null) {
  const currentMetric = metric || getEffectMetric();
  const metricConfig = EFFECT_METRIC_OPTIONS[currentMetric];
  const dataPeriod = getDataPeriod();

  // 动态生成实际字段名和标签
  const actualField = getActualFieldName(metricConfig.actualFieldBase, dataPeriod);
  const actualLabel = getActualLabel('实际' + metricConfig.label, dataPeriod);

  const section = document.getElementById('effect-performance-section');
  const container = document.getElementById('effect-chart-container');
  const emptyMessage = document.getElementById('effect-chart-empty');
  const loadingMessage = document.getElementById('effect-chart-loading');
  const ctx = document.getElementById('effect-performance-chart')?.getContext('2d');

  // Hide loading
  if (loadingMessage) loadingMessage.classList.add('hidden');

  // Handle view mode - hide for financial view
  const viewMode = getViewMode();
  if (viewMode !== VIEW_MODES.CUSTOMER) {
    if (section) section.classList.add('hidden');
    return;
  }
  if (section) section.classList.remove('hidden');

  // Handle empty data
  if (!monthlyEffectData || monthlyEffectData.length === 0) {
    if (effectPerformanceChart) {
      effectPerformanceChart.destroy();
      effectPerformanceChart = null;
    }
    if (container) container.classList.add('hidden');
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    return;
  }

  // Show container, hide empty message
  if (container) container.classList.remove('hidden');
  if (emptyMessage) emptyMessage.classList.add('hidden');

  if (!ctx) return;

  // Destroy existing chart
  if (effectPerformanceChart) {
    effectPerformanceChart.destroy();
    effectPerformanceChart = null;
  }

  const labels = monthlyEffectData.map(d => d.month);
  const targetData = monthlyEffectData.map(d => d[metricConfig.targetField] || 0);
  const actualData = monthlyEffectData.map(d => d[actualField] || 0);

  effectPerformanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: metricConfig.targetLabel,
          data: targetData,
          backgroundColor: CHART_CONFIG.COLORS.TARGET_BAR,
          borderColor: CHART_CONFIG.COLORS.TARGET_BAR_BORDER,
          borderWidth: 1
        },
        {
          label: actualLabel,
          data: actualData,
          backgroundColor: CHART_CONFIG.COLORS.ACTUAL_BAR,
          borderColor: CHART_CONFIG.COLORS.ACTUAL_BAR_BORDER,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: metricConfig.label
          },
          ticks: {
            callback: function(value) {
              if (metricConfig.format === 'currency') {
                return formatCurrency(value);
              }
              // 大数字使用中文单位
              if (value >= 100000000) {
                return (value / 100000000).toFixed(1) + '亿';
              } else if (value >= 10000) {
                return (value / 10000).toFixed(0) + '万';
              }
              return formatNumber(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: function(context) {
            // Custom HTML tooltip
            let tooltipEl = document.getElementById('effect-chart-tooltip');

            // Create tooltip element if it doesn't exist
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'effect-chart-tooltip';
              tooltipEl.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.85);
                border-radius: 8px;
                padding: 12px 16px;
                pointer-events: none;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
                color: #fff;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                min-width: 200px;
              `;
              document.body.appendChild(tooltipEl);
            }

            const tooltipModel = context.tooltip;

            // Hide if no tooltip
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = '0';
              return;
            }

            // Get data
            const dataIndex = tooltipModel.dataPoints?.[0]?.dataIndex;
            if (dataIndex === undefined) return;

            const monthLabel = labels[dataIndex];
            const target = targetData[dataIndex];
            const actual = actualData[dataIndex];

            // Calculate achievement rate
            let rateHtml = '';
            if (target > 0 && actual > 0) {
              const isCPM = currentMetric === 'cpm';
              const rate = isCPM ? (target / actual) : (actual / target);
              const ratePercent = (rate * 100).toFixed(1);
              const rateColor = rate >= 1 ? '#10b981' : '#ef4444';
              rateHtml = `<span style="color: ${rateColor}; font-weight: 600; font-size: 14px;">达成率: ${ratePercent}%</span>`;
            }

            // Format values
            const formatValue = (val) => {
              if (metricConfig.format === 'currency') {
                return formatCurrency(val);
              }
              return formatNumber(val);
            };

            // Build tooltip content
            tooltipEl.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
                <span style="font-weight: 600; font-size: 14px;">${monthLabel}</span>
                ${rateHtml}
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 6px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${CHART_CONFIG.COLORS.TARGET_BAR}; border: 1px solid ${CHART_CONFIG.COLORS.TARGET_BAR_BORDER}; margin-right: 8px; border-radius: 2px;"></span>
                <span>${metricConfig.targetLabel}: ${formatValue(target)}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${CHART_CONFIG.COLORS.ACTUAL_BAR}; border: 1px solid ${CHART_CONFIG.COLORS.ACTUAL_BAR_BORDER}; margin-right: 8px; border-radius: 2px;"></span>
                <span>${actualLabel}: ${formatValue(actual)}</span>
              </div>
            `;

            // Position tooltip
            const position = context.chart.canvas.getBoundingClientRect();
            tooltipEl.style.opacity = '1';
            tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + 10 + 'px';
            tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY - 10 + 'px';

            // Adjust if tooltip goes off screen
            const tooltipRect = tooltipEl.getBoundingClientRect();
            if (tooltipRect.right > window.innerWidth) {
              tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX - tooltipRect.width - 10 + 'px';
            }
          }
        },
        legend: {
          position: 'top'
        }
      }
    }
  });
}

/**
 * Shows loading state for effect chart
 */
export function showEffectChartLoading() {
  const container = document.getElementById('effect-chart-container');
  const emptyMessage = document.getElementById('effect-chart-empty');
  const loadingMessage = document.getElementById('effect-chart-loading');

  if (container) container.classList.add('hidden');
  if (emptyMessage) emptyMessage.classList.add('hidden');
  if (loadingMessage) loadingMessage.classList.remove('hidden');
}

/**
 * Destroys the effect performance chart
 */
export function destroyEffectChart() {
  if (effectPerformanceChart) {
    effectPerformanceChart.destroy();
    effectPerformanceChart = null;
  }
}

/**
 * Renders the effect performance chart by project (horizontal bar chart)
 * @param {Array} projectEffectData - Array of per-project effect data
 * @param {string} metric - Metric to display ('views' or 'cpm')
 */
export function renderEffectByProjectChart(projectEffectData, metric = null) {
  const currentMetric = metric || getEffectMetric();

  const section = document.getElementById('effect-performance-section');
  const container = document.getElementById('effect-chart-container');
  const emptyMessage = document.getElementById('effect-chart-empty');
  const loadingMessage = document.getElementById('effect-chart-loading');
  const ctx = document.getElementById('effect-performance-chart')?.getContext('2d');

  // Hide loading
  if (loadingMessage) loadingMessage.classList.add('hidden');

  // Handle view mode - hide for financial view
  const viewMode = getViewMode();
  if (viewMode !== VIEW_MODES.CUSTOMER) {
    if (section) section.classList.add('hidden');
    return;
  }
  if (section) section.classList.remove('hidden');

  // Handle empty data
  if (!projectEffectData || projectEffectData.length === 0) {
    if (effectPerformanceChart) {
      effectPerformanceChart.destroy();
      effectPerformanceChart = null;
    }
    if (container) container.classList.add('hidden');
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    return;
  }

  // Show container, hide empty message
  if (container) container.classList.remove('hidden');
  if (emptyMessage) emptyMessage.classList.add('hidden');

  if (!ctx) return;

  // Destroy existing chart
  if (effectPerformanceChart) {
    effectPerformanceChart.destroy();
    effectPerformanceChart = null;
  }

  // Prepare data based on metric
  const isViews = currentMetric === 'views';
  const rateField = isViews ? 'viewsRate' : 'cpmRate';
  const rateLabel = isViews ? '播放量达成率' : 'CPM达成率';

  // Sort by achievement rate (different direction for CPM)
  const sortedData = [...projectEffectData].sort((a, b) => {
    return isViews ? (b[rateField] - a[rateField]) : (b[rateField] - a[rateField]);
  });

  // Limit to reasonable number for display
  const displayData = sortedData.slice(0, 20);

  const labels = displayData.map(d => {
    const name = d.projectName || d.projectId;
    // Truncate long names
    return name.length > 15 ? name.substring(0, 15) + '...' : name;
  });
  const rateData = displayData.map(d => (d[rateField] * 100).toFixed(1));

  // Color based on achievement (green if >= 100%, red if < 100%)
  const backgroundColors = displayData.map(d => {
    const rate = d[rateField];
    return rate >= 1 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
  });
  const borderColors = displayData.map(d => {
    const rate = d[rateField];
    return rate >= 1 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)';
  });

  // Adjust container height based on data count
  const containerHeight = Math.max(400, displayData.length * 35);
  if (container) {
    container.style.height = containerHeight + 'px';
  }

  effectPerformanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: rateLabel,
        data: rateData,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: '达成率 (%)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        y: {
          ticks: {
            font: {
              size: 11
            }
          }
        }
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: function(context) {
            let tooltipEl = document.getElementById('effect-project-tooltip');

            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'effect-project-tooltip';
              tooltipEl.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.85);
                border-radius: 8px;
                padding: 12px 16px;
                pointer-events: none;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
                color: #fff;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                min-width: 220px;
              `;
              document.body.appendChild(tooltipEl);
            }

            const tooltipModel = context.tooltip;

            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = '0';
              return;
            }

            const dataIndex = tooltipModel.dataPoints?.[0]?.dataIndex;
            if (dataIndex === undefined) return;

            const project = displayData[dataIndex];
            const rate = project[rateField];
            const ratePercent = (rate * 100).toFixed(1);
            const rateColor = rate >= 1 ? '#10b981' : '#ef4444';

            let detailHtml = '';
            if (isViews) {
              detailHtml = `
                <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
                  <div>目标播放量: ${formatLargeNumber(project.targetViews)}</div>
                  <div>实际播放量: ${formatLargeNumber(project.actualViews)}</div>
                </div>
              `;
            } else {
              detailHtml = `
                <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
                  <div>目标CPM: ${formatCurrency(project.benchmarkCPM)}</div>
                  <div>实际CPM: ${formatCurrency(project.actualCPM)}</div>
                </div>
              `;
            }

            tooltipEl.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 4px;">${project.projectName || project.projectId}</div>
              <div style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">${project.customerMonth}</div>
              <div style="color: ${rateColor}; font-weight: 600; font-size: 16px;">${rateLabel}: ${ratePercent}%</div>
              ${detailHtml}
            `;

            const position = context.chart.canvas.getBoundingClientRect();
            tooltipEl.style.opacity = '1';
            tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + 10 + 'px';
            tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY - 10 + 'px';

            // Adjust if tooltip goes off screen
            const tooltipRect = tooltipEl.getBoundingClientRect();
            if (tooltipRect.right > window.innerWidth) {
              tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX - tooltipRect.width - 10 + 'px';
            }
          }
        },
        legend: {
          display: false
        }
      }
    }
  });

  // Add 100% reference line annotation
  const xScale = effectPerformanceChart.scales.x;
  const yScale = effectPerformanceChart.scales.y;

  // Draw 100% line using afterDraw plugin
  const originalAfterDraw = effectPerformanceChart.options.plugins.afterDraw;
  effectPerformanceChart.options.plugins = {
    ...effectPerformanceChart.options.plugins,
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const xAxis = chart.scales.x;
      const yAxis = chart.scales.y;

      // Draw 100% vertical line
      const x100 = xAxis.getPixelForValue(100);
      ctx.save();
      ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x100, yAxis.top);
      ctx.lineTo(x100, yAxis.bottom);
      ctx.stroke();
      ctx.restore();

      // Add label
      ctx.save();
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('100%', x100, yAxis.top - 5);
      ctx.restore();
    }
  };
}

/**
 * Renders effect KPI cards (views and CPM achievement rates)
 * @param {Object} effectSummary - Summary of effect data { targetViews, actualViews, targetCPM, actualCPM, validProjectCount, totalProjects, skippedCount }
 */
export function renderEffectKpiCards(effectSummary) {
  const viewMode = getViewMode();
  const section = document.getElementById('effect-kpi-section');
  const statsEl = document.getElementById('effect-kpi-stats');
  const chartStatsEl = document.getElementById('effect-chart-stats');

  // Hide section if not in customer view or no data
  if (viewMode !== VIEW_MODES.CUSTOMER) {
    if (section) section.classList.add('hidden');
    return;
  }
  if (section) section.classList.remove('hidden');

  const { targetViews, actualViews, targetCPM, actualCPM, validProjectCount, totalProjects, skippedCount } = effectSummary || {};

  // Update stats text for KPI section
  if (statsEl) {
    if (totalProjects > 0) {
      const pendingCount = skippedCount || 0;
      if (pendingCount > 0) {
        statsEl.textContent = `共 ${totalProjects} 个项目，已统计 ${validProjectCount} 个，${pendingCount} 个待统计(未发布/未到T+21)`;
      } else {
        statsEl.textContent = `共 ${totalProjects} 个项目，已统计 ${validProjectCount} 个`;
      }
    } else {
      statsEl.textContent = '';
    }
  }

  // Update stats text for chart section (simpler format)
  if (chartStatsEl) {
    if (validProjectCount > 0) {
      chartStatsEl.textContent = `统计 ${validProjectCount} 个项目`;
    } else {
      chartStatsEl.textContent = '';
    }
  }

  // Views achievement rate card
  const viewsRateEl = document.getElementById('kpi-views-rate');
  const viewsDetailEl = document.getElementById('kpi-views-detail');

  if (targetViews > 0 && actualViews > 0) {
    const viewsRate = actualViews / targetViews;
    const viewsRatePercent = (viewsRate * 100).toFixed(1);
    const viewsRateColor = viewsRate >= 1 ? '#10b981' : '#ef4444';

    if (viewsRateEl) {
      viewsRateEl.textContent = `${viewsRatePercent}%`;
      viewsRateEl.style.color = viewsRateColor;
    }
    if (viewsDetailEl) {
      // 优化展示格式：分两行显示
      viewsDetailEl.innerHTML = `
        <span class="text-gray-400">目标</span> ${formatLargeNumber(targetViews)}
        <span class="mx-1 text-gray-300">|</span>
        <span class="text-gray-400">实际</span> ${formatLargeNumber(actualViews)}
      `;
    }
  } else {
    if (viewsRateEl) {
      viewsRateEl.textContent = '--';
      viewsRateEl.style.color = '#6b7280';
    }
    if (viewsDetailEl) {
      viewsDetailEl.textContent = '暂无效果数据';
    }
  }

  // CPM achievement rate card (lower is better, so rate = target/actual)
  const cpmRateEl = document.getElementById('kpi-cpm-rate');
  const cpmDetailEl = document.getElementById('kpi-cpm-detail');

  if (targetCPM > 0 && actualCPM > 0) {
    const cpmRate = targetCPM / actualCPM;
    const cpmRatePercent = (cpmRate * 100).toFixed(1);
    const cpmRateColor = cpmRate >= 1 ? '#10b981' : '#ef4444';

    if (cpmRateEl) {
      cpmRateEl.textContent = `${cpmRatePercent}%`;
      cpmRateEl.style.color = cpmRateColor;
    }
    if (cpmDetailEl) {
      // 优化展示格式
      cpmDetailEl.innerHTML = `
        <span class="text-gray-400">目标</span> ¥${targetCPM.toFixed(1)}
        <span class="mx-1 text-gray-300">|</span>
        <span class="text-gray-400">实际</span> ¥${actualCPM.toFixed(1)}
      `;
    }
  } else {
    if (cpmRateEl) {
      cpmRateEl.textContent = '--';
      cpmRateEl.style.color = '#6b7280';
    }
    if (cpmDetailEl) {
      cpmDetailEl.textContent = '暂无效果数据';
    }
  }

  // Total views card - 优化展示
  const totalViewsEl = document.getElementById('kpi-total-views');
  const viewsGapEl = document.getElementById('kpi-views-gap');
  if (totalViewsEl) {
    if (actualViews > 0) {
      totalViewsEl.textContent = formatLargeNumber(actualViews);
    } else {
      totalViewsEl.textContent = '--';
    }
  }
  if (viewsGapEl) {
    if (targetViews > 0 && actualViews > 0) {
      const gap = actualViews - targetViews;
      const gapText = gap >= 0 ? `+${formatLargeNumber(gap)}` : formatLargeNumber(gap);
      const gapColor = gap >= 0 ? '#10b981' : '#ef4444';
      viewsGapEl.innerHTML = `超出目标 <span style="color:${gapColor};font-weight:500">${gap >= 0 ? gapText : formatLargeNumber(Math.abs(gap))}</span>`;
      if (gap < 0) {
        viewsGapEl.innerHTML = `距目标差 <span style="color:${gapColor};font-weight:500">${formatLargeNumber(Math.abs(gap))}</span>`;
      }
    } else {
      viewsGapEl.textContent = '目标: --';
    }
  }

  // 实际 CPM card (替代原来的总互动量)
  const actualCpmEl = document.getElementById('kpi-actual-cpm');
  const cpmCompareEl = document.getElementById('kpi-cpm-compare');
  if (actualCpmEl) {
    if (actualCPM > 0) {
      actualCpmEl.textContent = `¥${actualCPM.toFixed(1)}`;
      // 根据是否达标设置颜色
      if (targetCPM > 0) {
        const isGood = actualCPM <= targetCPM;
        actualCpmEl.style.color = isGood ? '#10b981' : '#f59e0b';
      }
    } else {
      actualCpmEl.textContent = '--';
      actualCpmEl.style.color = '#d97706';
    }
  }
  if (cpmCompareEl) {
    if (targetCPM > 0) {
      cpmCompareEl.innerHTML = `目标 <span class="font-medium">¥${targetCPM.toFixed(1)}</span>`;
    } else {
      cpmCompareEl.textContent = '目标: --';
    }
  }
}

/**
 * Formats large numbers with 亿/万 suffix (Chinese format)
 * @private
 * @param {number} value - Number to format
 * @returns {string} Formatted string
 */
function formatLargeNumber(value) {
  if (value >= 100000000) {
    // 1亿及以上
    return (value / 100000000).toFixed(2) + '亿';
  } else if (value >= 10000) {
    // 1万及以上
    return (value / 10000).toFixed(1) + '万';
  }
  return formatNumber(value);
}