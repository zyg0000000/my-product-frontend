/**
 * @module kpi-calculator
 * @description KPI calculation functions aligned with index.js logic
 * @version 2.0 - Added view mode support for customer/financial views
 */

import { getFilters, getViewMode } from './state-manager.js';
import { TIME_DIMENSIONS, VIEW_MODES } from './constants.js';

/**
 * Calculates KPI summary from filtered projects
 * @param {Array} projects - Array of filtered project objects
 * @param {string} viewMode - Optional view mode override ('customer' or 'financial')
 * @returns {Object} KPI summary object with metrics based on view mode
 */
export function calculateKpiSummary(projects, viewMode = null) {
  const currentViewMode = viewMode || getViewMode();

  // Aggregate metrics from all projects
  const aggregated = projects.reduce((acc, project) => {
    const metrics = project.metrics || {};

    // Aggregate each metric
    Object.keys(acc).forEach(key => {
      let sourceKey = key;

      // Handle special case for funds occupation cost field name mapping
      if (key === 'totalFundsOccupationCost') {
        sourceKey = 'fundsOccupationCost';
      }

      // Add metric value if it exists and is a number
      if (metrics[sourceKey] && typeof metrics[sourceKey] === 'number') {
        acc[key] += metrics[sourceKey];
      }
    });

    return acc;
  }, {
    totalProjects: 0,
    totalCollaborators: 0,
    projectBudget: 0,
    totalIncome: 0,
    operationalProfit: 0,
    totalExpense: 0,
    totalOperationalCost: 0,
    preAdjustmentProfit: 0,
    totalFundsOccupationCost: 0,
    totalRebateReceivable: 0,
    incomeAdjustments: 0,
    expenseAdjustments: 0
  });

  // Calculate derived metrics
  aggregated.totalProjects = projects.length;

  // Calculate margin percentages
  aggregated.operationalMargin = aggregated.totalIncome === 0
    ? 0
    : (aggregated.operationalProfit / aggregated.totalIncome) * 100;

  aggregated.preAdjustmentMargin = aggregated.totalIncome === 0
    ? 0
    : (aggregated.preAdjustmentProfit / aggregated.totalIncome) * 100;

  aggregated.budgetUtilization = aggregated.projectBudget === 0
    ? 0
    : (aggregated.totalIncome / aggregated.projectBudget) * 100;

  // Return different metrics based on view mode
  if (currentViewMode === VIEW_MODES.CUSTOMER) {
    // Customer view: only business metrics, hide profit-related info
    return {
      totalProjects: aggregated.totalProjects,
      totalCollaborators: aggregated.totalCollaborators,
      totalIncomeAgg: aggregated.totalIncome,
      fundsOccupationCost: aggregated.totalFundsOccupationCost
    };
  }

  // Financial view: return all metrics
  return {
    totalProjects: aggregated.totalProjects,
    totalCollaborators: aggregated.totalCollaborators,
    totalIncomeAgg: aggregated.totalIncome,
    incomeAdjustments: aggregated.incomeAdjustments,
    preAdjustmentProfit: aggregated.preAdjustmentProfit,
    preAdjustmentMargin: aggregated.preAdjustmentMargin,
    operationalProfit: aggregated.operationalProfit,
    operationalMargin: aggregated.operationalMargin,
    totalExpense: aggregated.totalExpense,
    fundsOccupationCost: aggregated.totalFundsOccupationCost,
    expenseAdjustments: aggregated.expenseAdjustments,
    totalOperationalCost: aggregated.totalOperationalCost
  };
}

/**
 * Calculates monthly trend data for charts
 * @param {Array} projects - Array of filtered project objects
 * @param {string} viewMode - Optional view mode override ('customer' or 'financial')
 * @returns {Array} Array of monthly trend data objects with all metrics
 */
export function calculateMonthlyTrend(projects, viewMode = null) {
  const currentViewMode = viewMode || getViewMode();
  const filters = getFilters();
  const timeDimension = filters.timeDimension;
  const yearField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialYear' : 'year';
  const monthField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialMonth' : 'month';

  // Group projects by year-month
  const monthlyMap = {};

  projects.forEach(project => {
    const year = project[yearField];
    const month = project[monthField];

    // Skip if year or month is missing
    if (!year || !month) return;

    const key = `${year}-${month}`;

    // Initialize monthly data if not exists
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        year,
        month,
        projectIds: new Set(),
        totalIncome: 0,
        operationalProfit: 0,
        collaboratorCount: 0,
        fundsOccupationCost: 0
      };
    }

    // Track unique projects
    monthlyMap[key].projectIds.add(project.id);

    // Aggregate metrics
    const metrics = project.metrics || {};
    if (metrics.totalIncome) {
      monthlyMap[key].totalIncome += metrics.totalIncome;
    }
    if (metrics.operationalProfit) {
      monthlyMap[key].operationalProfit += metrics.operationalProfit;
    }
    if (metrics.totalCollaborators) {
      monthlyMap[key].collaboratorCount += metrics.totalCollaborators;
    }
    if (metrics.fundsOccupationCost) {
      monthlyMap[key].fundsOccupationCost += metrics.fundsOccupationCost;
    }
  });

  // Convert to array and calculate margins
  const monthlyArray = Object.values(monthlyMap).map(item => {
    const margin = item.totalIncome === 0
      ? 0
      : (item.operationalProfit / item.totalIncome) * 100;

    const result = {
      month: `${item.year}-${item.month}`,
      totalIncome: item.totalIncome,
      collaboratorCount: item.collaboratorCount,
      fundsOccupationCost: item.fundsOccupationCost,
      projectCount: item.projectIds.size
    };

    // Only include margin for financial view
    if (currentViewMode === VIEW_MODES.FINANCIAL) {
      result.margin = margin;
      result.operationalProfit = item.operationalProfit;
    }

    return result;
  });

  // Sort by year and month
  monthlyArray.sort((a, b) => {
    const [yearA, monthA] = a.month.split('-');
    const [yearB, monthB] = b.month.split('-');
    const monthNumA = parseInt(monthA.replace('M', ''));
    const monthNumB = parseInt(monthB.replace('M', ''));

    if (yearA !== yearB) {
      return parseInt(yearA) - parseInt(yearB);
    }
    return monthNumA - monthNumB;
  });

  return monthlyArray;
}