/**
 * @module filter
 * @description Filter management and UI population
 * @version 2.0 - Added project selector functionality
 */

import { getProjects, updateFilters, resetFilters as resetStateFilters, getFilters, setSelectedProjects, getSelectedProjects, setEffectFilters, getEffectFilters } from './state-manager.js';
import { getUniqueYears, getUniqueValues } from './utils.js';
import { TIME_DIMENSIONS } from './constants.js';

// Default time dimension state
let currentTimeDimension = TIME_DIMENSIONS.CUSTOMER;

// Module-level variable to store all projects for project selector
let allProjectsForSelector = [];

/**
 * Populates filter dropdowns with data from projects
 * @param {Array} projects - Array of project objects
 */
export function populateFilterOptions(projects) {
  const filters = getFilters();
  const timeDimension = filters.timeDimension || currentTimeDimension;

  // Populate year filter
  populateYearFilter(projects, timeDimension);

  // Populate month range filters
  populateMonthRangeFilters();

  // Populate project type filter
  populateProjectTypeFilter(projects);

  // Populate effect section filters
  populateEffectFilters(projects);
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
 * Populates month range filter dropdowns
 * @private
 */
function populateMonthRangeFilters() {
  const filterMonthStart = document.getElementById('filter-month-start');
  const filterMonthEnd = document.getElementById('filter-month-end');

  [filterMonthStart, filterMonthEnd].forEach((filter, index) => {
    if (!filter) return;

    const currentValue = filter.value;
    const label = index === 0 ? '起始月' : '结束月';

    filter.innerHTML = `<option value="">${label}</option>`;
    for (let i = 1; i <= 12; i++) {
      const option = document.createElement('option');
      option.value = `M${i}`;
      option.textContent = `${i}月`;
      filter.appendChild(option);
    }

    // Restore previous selection if it exists
    if (currentValue) {
      filter.value = currentValue;
    }
  });
}

/**
 * Populates effect section filters
 * @private
 * @param {Array} projects - Array of project objects
 */
function populateEffectFilters(projects) {
  const effectYearFilter = document.getElementById('effect-filter-year');
  const effectMonthStart = document.getElementById('effect-filter-month-start');
  const effectMonthEnd = document.getElementById('effect-filter-month-end');

  // Populate year filter for effect section
  if (effectYearFilter) {
    const years = getUniqueYears(projects, 'year');
    const currentValue = effectYearFilter.value;

    effectYearFilter.innerHTML = '<option value="">全部年份</option>';
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `${year}年`;
      effectYearFilter.appendChild(option);
    });

    if (currentValue && years.includes(currentValue)) {
      effectYearFilter.value = currentValue;
    }
  }

  // Populate month range for effect section
  [effectMonthStart, effectMonthEnd].forEach((filter, index) => {
    if (!filter) return;

    const currentValue = filter.value;
    const label = index === 0 ? '起始月' : '结束月';

    filter.innerHTML = `<option value="">${label}</option>`;
    for (let i = 1; i <= 12; i++) {
      const option = document.createElement('option');
      option.value = `M${i}`;
      option.textContent = `${i}月`;
      filter.appendChild(option);
    }

    if (currentValue) {
      filter.value = currentValue;
    }
  });
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
  const filterYear = document.getElementById('filter-year');
  const filterMonthStart = document.getElementById('filter-month-start');
  const filterMonthEnd = document.getElementById('filter-month-end');
  const filterProjectType = document.getElementById('filter-project-type');

  const filters = {
    timeDimension: currentTimeDimension,
    year: filterYear?.value || '',
    monthStart: filterMonthStart?.value || '',
    monthEnd: filterMonthEnd?.value || '',
    projectType: filterProjectType?.value || ''
  };

  updateFilters(filters);
}

/**
 * Applies effect section filters
 */
export function applyEffectFilters() {
  const effectYearFilter = document.getElementById('effect-filter-year');
  const effectMonthStart = document.getElementById('effect-filter-month-start');
  const effectMonthEnd = document.getElementById('effect-filter-month-end');

  const filters = {
    year: effectYearFilter?.value || '',
    monthStart: effectMonthStart?.value || '',
    monthEnd: effectMonthEnd?.value || ''
  };

  setEffectFilters(filters);
}

/**
 * Sets the time dimension and repopulates year filter
 * @param {string} dimension - Time dimension value
 */
export function setTimeDimension(dimension) {
  currentTimeDimension = dimension;
  populateYearFilter(getProjects(), dimension);
}

/**
 * Gets the current time dimension
 * @returns {string} Current time dimension
 */
export function getTimeDimension() {
  return currentTimeDimension;
}

/**
 * Resets all filters to default values
 */
export function resetFilters() {
  // Reset state
  resetStateFilters();

  // Reset time dimension toggle
  currentTimeDimension = TIME_DIMENSIONS.CUSTOMER;
  const timeDimensionToggle = document.getElementById('time-dimension-toggle');
  if (timeDimensionToggle) {
    const buttons = timeDimensionToggle.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-value') === 'customer');
    });
  }

  // Reset UI elements
  const filterYear = document.getElementById('filter-year');
  const filterMonthStart = document.getElementById('filter-month-start');
  const filterMonthEnd = document.getElementById('filter-month-end');
  const filterProjectType = document.getElementById('filter-project-type');

  if (filterYear) filterYear.selectedIndex = 0;
  if (filterMonthStart) filterMonthStart.selectedIndex = 0;
  if (filterMonthEnd) filterMonthEnd.selectedIndex = 0;
  if (filterProjectType) filterProjectType.selectedIndex = 0;

  // Repopulate year filter with new time dimension
  populateYearFilter(getProjects(), currentTimeDimension);
}

/**
 * Gets current filter values from DOM
 * @returns {Object} Current filter values
 */
export function getCurrentFilterValues() {
  return {
    timeDimension: currentTimeDimension,
    year: document.getElementById('filter-year')?.value || '',
    monthStart: document.getElementById('filter-month-start')?.value || '',
    monthEnd: document.getElementById('filter-month-end')?.value || '',
    projectType: document.getElementById('filter-project-type')?.value || ''
  };
}

// ========== Project Selector Functions ==========

/**
 * Initializes the project selector with available projects
 * @param {Array} projects - Array of project objects
 * @param {Function} onSelectionChange - Callback when selection changes
 */
export function initProjectSelector(projects, onSelectionChange) {
  allProjectsForSelector = projects;
  renderProjectOptions(projects);
  setupProjectSelectorEvents(onSelectionChange);
}

/**
 * Renders project options in the dropdown
 * @private
 * @param {Array} projects - Array of project objects
 */
function renderProjectOptions(projects) {
  const container = document.getElementById('project-options');
  if (!container) return;

  container.innerHTML = projects.map(p => `
    <label class="dropdown-option">
      <input type="checkbox" value="${p.id}" checked>
      <span>${p.name || p.id}</span>
    </label>
  `).join('');
}

/**
 * Sets up event listeners for project selector
 * @private
 * @param {Function} onSelectionChange - Callback when selection changes
 */
function setupProjectSelectorEvents(onSelectionChange) {
  const dropdownBtn = document.getElementById('project-dropdown-btn');
  const dropdownMenu = document.getElementById('project-dropdown-menu');
  const selectAllBtn = document.getElementById('select-all-projects');
  const clearAllBtn = document.getElementById('clear-all-projects');
  const searchInput = document.getElementById('project-search-input');
  const optionsContainer = document.getElementById('project-options');

  if (!dropdownBtn || !dropdownMenu) return;

  // Toggle dropdown
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
  });

  // Select all
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      setAllProjectCheckboxes(true);
      updateProjectSelection(onSelectionChange);
    });
  }

  // Clear all
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      setAllProjectCheckboxes(false);
      updateProjectSelection(onSelectionChange);
    });
  }

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterProjectOptions(e.target.value);
    });
  }

  // Checkbox change
  if (optionsContainer) {
    optionsContainer.addEventListener('change', () => {
      updateProjectSelection(onSelectionChange);
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
    }
  });
}

/**
 * Sets all project checkboxes to a given state
 * @private
 * @param {boolean} checked - Whether to check or uncheck
 */
function setAllProjectCheckboxes(checked) {
  const checkboxes = document.querySelectorAll('#project-options input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
}

/**
 * Filters project options by search term
 * @private
 * @param {string} searchTerm - Search term to filter by
 */
function filterProjectOptions(searchTerm) {
  const options = document.querySelectorAll('#project-options .dropdown-option');
  const term = searchTerm.toLowerCase();

  options.forEach(option => {
    const label = option.querySelector('span')?.textContent?.toLowerCase() || '';
    option.style.display = label.includes(term) ? 'flex' : 'none';
  });
}

/**
 * Updates project selection state and UI
 * @private
 * @param {Function} onSelectionChange - Callback when selection changes
 */
function updateProjectSelection(onSelectionChange) {
  const checkboxes = document.querySelectorAll('#project-options input[type="checkbox"]');
  const selectedIds = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  // Update display text
  const textElement = document.getElementById('selected-projects-text');
  if (textElement) {
    if (selectedIds.length === allProjectsForSelector.length) {
      textElement.textContent = '全部项目';
    } else if (selectedIds.length === 0) {
      textElement.textContent = '未选择项目';
    } else {
      textElement.textContent = `已选 ${selectedIds.length} 个项目`;
    }
  }

  // Update state (empty array means all selected)
  const projectIds = selectedIds.length === allProjectsForSelector.length ? [] : selectedIds;
  setSelectedProjects(projectIds);

  // Trigger callback
  if (onSelectionChange) {
    onSelectionChange();
  }
}

/**
 * Resets project selector to all selected
 */
export function resetProjectSelector() {
  setAllProjectCheckboxes(true);
  const textElement = document.getElementById('selected-projects-text');
  if (textElement) {
    textElement.textContent = '全部项目';
  }
  setSelectedProjects([]);
}