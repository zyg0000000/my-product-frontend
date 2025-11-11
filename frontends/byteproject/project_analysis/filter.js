/**
 * @module filter
 * @description Filter management and UI population
 */

import { getProjects, updateFilters, resetFilters as resetStateFilters, getFilters } from './state-manager.js';
import { getUniqueYears, getUniqueValues } from './utils.js';
import { TIME_DIMENSIONS } from './constants.js';

/**
 * Populates filter dropdowns with data from projects
 * @param {Array} projects - Array of project objects
 */
export function populateFilterOptions(projects) {
  const filters = getFilters();
  const timeDimension = filters.timeDimension;

  // Populate year filter
  populateYearFilter(projects, timeDimension);

  // Populate month filter
  populateMonthFilter();

  // Populate project type filter
  populateProjectTypeFilter(projects);
}

/**
 * Populates year filter dropdown
 * @private
 * @param {Array} projects - Array of project objects
 * @param {string} timeDimension - Current time dimension (financial or natural)
 */
function populateYearFilter(projects, timeDimension) {
  const filterYear = document.getElementById('filter-year');
  if (!filterYear) return;

  const yearField = timeDimension === TIME_DIMENSIONS.FINANCIAL ? 'financialYear' : 'year';
  const years = getUniqueYears(projects, yearField);
  const currentValue = filterYear.value;

  filterYear.innerHTML = '<option value="">所有年份</option>';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year}年`;
    filterYear.appendChild(option);
  });

  // Restore previous selection if it exists
  if (currentValue && years.includes(currentValue)) {
    filterYear.value = currentValue;
  }
}

/**
 * Populates month filter dropdown
 * @private
 */
function populateMonthFilter() {
  const filterMonth = document.getElementById('filter-month');
  if (!filterMonth) return;

  const currentValue = filterMonth.value;

  filterMonth.innerHTML = '<option value="">所有月份</option>';
  for (let i = 1; i <= 12; i++) {
    const option = document.createElement('option');
    option.value = `M${i}`;
    option.textContent = `M${i}`;
    filterMonth.appendChild(option);
  }

  // Restore previous selection if it exists
  if (currentValue) {
    filterMonth.value = currentValue;
  }
}

/**
 * Populates project type filter dropdown
 * @private
 * @param {Array} projects - Array of project objects
 */
function populateProjectTypeFilter(projects) {
  const filterProjectType = document.getElementById('filter-project-type');
  if (!filterProjectType) return;

  const types = getUniqueValues(projects, 'type');
  const currentValue = filterProjectType.value;

  filterProjectType.innerHTML = '<option value="">所有类型</option>';
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    filterProjectType.appendChild(option);
  });

  // Restore previous selection if it exists
  if (currentValue && types.includes(currentValue)) {
    filterProjectType.value = currentValue;
  }
}

/**
 * Applies current filter selections
 */
export function applyFilters() {
  const filterTimeDimension = document.getElementById('filter-time-dimension');
  const filterYear = document.getElementById('filter-year');
  const filterMonth = document.getElementById('filter-month');
  const filterProjectType = document.getElementById('filter-project-type');

  const filters = {
    timeDimension: filterTimeDimension?.value || TIME_DIMENSIONS.FINANCIAL,
    year: filterYear?.value || '',
    month: filterMonth?.value || '',
    projectType: filterProjectType?.value || ''
  };

  updateFilters(filters);

  // If time dimension changed, repopulate year filter
  if (filterTimeDimension && filters.timeDimension !== getFilters().timeDimension) {
    populateYearFilter(getProjects(), filters.timeDimension);
  }
}

/**
 * Resets all filters to default values
 */
export function resetFilters() {
  // Reset state
  resetStateFilters();

  // Reset UI elements
  const filterTimeDimension = document.getElementById('filter-time-dimension');
  const filterYear = document.getElementById('filter-year');
  const filterMonth = document.getElementById('filter-month');
  const filterProjectType = document.getElementById('filter-project-type');

  if (filterTimeDimension) filterTimeDimension.value = TIME_DIMENSIONS.FINANCIAL;
  if (filterYear) filterYear.selectedIndex = 0;
  if (filterMonth) filterMonth.selectedIndex = 0;
  if (filterProjectType) filterProjectType.selectedIndex = 0;
}

/**
 * Gets current filter values from DOM
 * @returns {Object} Current filter values
 */
export function getCurrentFilterValues() {
  return {
    timeDimension: document.getElementById('filter-time-dimension')?.value || TIME_DIMENSIONS.FINANCIAL,
    year: document.getElementById('filter-year')?.value || '',
    month: document.getElementById('filter-month')?.value || '',
    projectType: document.getElementById('filter-project-type')?.value || ''
  };
}