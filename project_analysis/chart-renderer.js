/**
 * @module chart-renderer
 * @description Chart rendering functions using Chart.js
 */

import { formatCurrency, formatPercent, formatNumber } from './utils.js';
import { CHART_CONFIG } from './constants.js';

// Chart instance storage
let monthlyTrendChart = null;

/**
 * Renders or updates the monthly trend chart
 * @param {Array} monthlyData - Array of monthly data objects with month, totalIncome, and margin
 */
export function renderChart(monthlyData) {
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

  // Prepare chart data
  const labels = monthlyData.map(d => d.month);
  const incomeData = monthlyData.map(d => d.totalIncome);
  const marginData = monthlyData.map(d => d.margin);

  // Update existing chart or create new one
  if (monthlyTrendChart) {
    updateChart(monthlyTrendChart, labels, incomeData, marginData);
  } else {
    monthlyTrendChart = createChart(ctx, labels, incomeData, marginData);
  }
}

/**
 * Creates a new chart instance
 * @private
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} labels - Chart labels
 * @param {Array} incomeData - Income data array
 * @param {Array} marginData - Margin data array
 * @returns {Chart} Chart.js instance
 */
function createChart(ctx, labels, incomeData, marginData) {
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
 * Updates existing chart with new data
 * @private
 * @param {Chart} chart - Chart.js instance
 * @param {Array} labels - New labels
 * @param {Array} incomeData - New income data
 * @param {Array} marginData - New margin data
 */
function updateChart(chart, labels, incomeData, marginData) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = incomeData;
  chart.data.datasets[1].data = marginData;
  chart.update();
}

/**
 * Renders KPI cards in the UI
 * @param {Object} kpiSummary - KPI summary object from calculator
 */
export function renderKpiCards(kpiSummary) {
  if (!kpiSummary) return;

  // Update KPI DOM elements
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