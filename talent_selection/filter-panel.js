/**
 * @file talent_selection/filter-panel.js
 * @description 筛选控制器 - 管理所有筛选条件并执行筛选逻辑
 */

import { getBestPriceForSort, formatDate, getDatesBetween } from './utils.js';

export default class FilterPanel {
    constructor(options) {
        this.richTalentData = options.richTalentData;
        this.allConfigurations = options.allConfigurations;
        this.executionMonthInput = options.executionMonthInput;
        this.apiRequest = options.apiRequest;
        this.showAlert = options.showAlert;

        // DOM Elements
        this.enableScheduleFilter = document.getElementById('enable-schedule-filter');
        this.scheduleFilterInputs = document.getElementById('schedule-filter-inputs');
        this.scheduleStartDateInput = document.getElementById('schedule-start-date');
        this.scheduleEndDateInput = document.getElementById('schedule-end-date');
        this.scheduleLogicSelect = document.getElementById('schedule-logic');
        this.directSearchNickname = document.getElementById('direct-search-nickname');
        this.directSearchXingtuId = document.getElementById('direct-search-xingtu-id');
        this.talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');
        this.talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');
        this.dataFiltersContainer = document.getElementById('data-filters-container');
        this.addFilterBtn = document.getElementById('add-filter-btn');
        this.resetFiltersBtn = document.getElementById('reset-filters-btn');
        this.applyFiltersBtn = document.getElementById('apply-filters-btn');

        // State
        this.dataFilters = [];

        // Bind methods
        this.applyFiltersAndRender = this.applyFiltersAndRender.bind(this);
        this.addDataFilterRow = this.addDataFilterRow.bind(this);
        this.resetAllFilters = this.resetAllFilters.bind(this);
    }

    render() {
        this.renderFilterControls();
        this.setupEventListeners();
        this.applyFiltersAndRender();
    }

    setupEventListeners() {
        // 档期筛选开关
        if (this.enableScheduleFilter) {
            this.enableScheduleFilter.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                [this.scheduleStartDateInput, this.scheduleEndDateInput, this.scheduleLogicSelect].forEach(el => {
                    if (el) el.disabled = !enabled;
                });
                if (this.scheduleFilterInputs) {
                    this.scheduleFilterInputs.style.opacity = enabled ? '1' : '0.5';
                }
            });
        }

        // 搜索框实时筛选
        [this.directSearchNickname, this.directSearchXingtuId].forEach(input => {
            if (input) input.addEventListener('input', this.applyFiltersAndRender);
        });

        // 筛选按钮
        if (this.applyFiltersBtn) this.applyFiltersBtn.addEventListener('click', this.applyFiltersAndRender);
        if (this.resetFiltersBtn) this.resetFiltersBtn.addEventListener('click', this.resetAllFilters);
        if (this.addFilterBtn) this.addFilterBtn.addEventListener('click', this.addDataFilterRow);

        // 数据筛选容器变化
        if (this.dataFiltersContainer) {
            this.dataFiltersContainer.addEventListener('change', () => this.updateDataFiltersState());
        }
    }

    renderFilterControls() {
        // 渲染达人类型筛选
        if (this.talentTypeFiltersContainer && this.allConfigurations.talentTypes) {
            this.talentTypeFiltersContainer.innerHTML = this.allConfigurations.talentTypes.map(t =>
                `<label class="inline-flex items-center mr-4">
                    <input type="checkbox" value="${t.value}" class="rounded text-blue-600 mr-1">
                    <span class="text-sm">${t.name}</span>
                </label>`
            ).join('');
        }

        // 渲染达人等级筛选
        if (this.talentTierFiltersContainer && this.allConfigurations.talentTiers) {
            this.talentTierFiltersContainer.innerHTML = this.allConfigurations.talentTiers.map(t =>
                `<label class="inline-flex items-center mr-4">
                    <input type="checkbox" value="${t.value}" class="rounded text-blue-600 mr-1">
                    <span class="text-sm">${t.name}</span>
                </label>`
            ).join('');
        }

        // 渲染数据筛选区域
        this.renderDataFilterRows();
    }

    renderDataFilterRows() {
        if (!this.dataFiltersContainer) return;

        if (this.dataFilters.length === 0) {
            this.dataFiltersContainer.innerHTML = '<p class="text-sm text-gray-500">点击"添加筛选条件"按钮开始筛选</p>';
            return;
        }

        this.dataFiltersContainer.innerHTML = this.dataFilters.map((filter, index) => {
            const dimensionOptions = [
                '<option value="">-- 选择维度 --</option>',
                '<option value="price">一口价</option>',
                ...this.allConfigurations.dimensions.map(d =>
                    `<option value="${d.id}" ${filter.dimension === d.id ? 'selected' : ''}>${d.name}</option>`
                )
            ].join('');

            const operatorOptions = [
                '<option value="">--</option>',
                '<option value=">" ${filter.operator === ">" ? "selected" : ""}>大于</option>',
                '<option value=">=" ${filter.operator === ">=" ? "selected" : ""}>大于等于</option>',
                '<option value="<" ${filter.operator === "<" ? "selected" : ""}>小于</option>',
                '<option value="<=" ${filter.operator === "<=" ? "selected" : ""}>小于等于</option>',
                '<option value="=" ${filter.operator === "=" ? "selected" : ""}>等于</option>',
                '<option value="!=" ${filter.operator === "!=" ? "selected" : ""}>不等于</option>',
                '<option value="contains" ${filter.operator === "contains" ? "selected" : ""}>包含</option>',
                '<option value="notContains" ${filter.operator === "notContains" ? "selected" : ""}>不包含</option>',
                '<option value="isEmpty" ${filter.operator === "isEmpty" ? "selected" : ""}>为空</option>',
                '<option value="isNotEmpty" ${filter.operator === "isNotEmpty" ? "selected" : ""}>不为空</option>',
                '<option value="between" ${filter.operator === "between" ? "selected" : ""}>介于</option>'
            ].join('');

            return `
                <div class="flex items-center gap-2 mb-2" data-filter-index="${index}">
                    <select class="filter-dimension text-sm rounded-md border-gray-300">${dimensionOptions}</select>
                    <select class="filter-operator text-sm rounded-md border-gray-300">${operatorOptions}</select>
                    ${filter.operator === 'between' ?
                        `<input type="number" class="filter-value-min text-sm rounded-md border-gray-300 w-24" placeholder="最小值" value="${filter.value?.[0] || ''}">
                         <input type="number" class="filter-value-max text-sm rounded-md border-gray-300 w-24" placeholder="最大值" value="${filter.value?.[1] || ''}">` :
                        ['isEmpty', 'isNotEmpty'].includes(filter.operator) ? '' :
                        `<input type="text" class="filter-value text-sm rounded-md border-gray-300" placeholder="筛选值" value="${filter.value || ''}">`
                    }
                    <button class="remove-filter text-red-600 hover:text-red-800 text-sm">删除</button>
                </div>`;
        }).join('');

        // 绑定删除按钮
        this.dataFiltersContainer.querySelectorAll('.remove-filter').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.dataFilters.splice(index, 1);
                this.renderDataFilterRows();
            });
        });
    }

    addDataFilterRow() {
        this.dataFilters.push({ dimension: '', operator: '', value: '' });
        this.renderDataFilterRows();
    }

    updateDataFiltersState() {
        const rows = this.dataFiltersContainer.querySelectorAll('[data-filter-index]');
        rows.forEach((row, index) => {
            const dimension = row.querySelector('.filter-dimension')?.value;
            const operator = row.querySelector('.filter-operator')?.value;
            let value = '';

            if (operator === 'between') {
                const min = row.querySelector('.filter-value-min')?.value;
                const max = row.querySelector('.filter-value-max')?.value;
                value = [min, max];
            } else if (!['isEmpty', 'isNotEmpty'].includes(operator)) {
                value = row.querySelector('.filter-value')?.value;
            }

            this.dataFilters[index] = { dimension, operator, value };
        });
    }

    applyFiltersAndRender() {
        let filtered = [...this.richTalentData];

        // 档期筛选
        if (this.enableScheduleFilter?.checked && this.scheduleStartDateInput?.value && this.scheduleEndDateInput?.value) {
            const [y1, m1, d1] = this.scheduleStartDateInput.value.split('-').map(Number);
            const start = new Date(y1, m1 - 1, d1);
            const [y2, m2, d2] = this.scheduleEndDateInput.value.split('-').map(Number);
            const end = new Date(y2, m2 - 1, d2);
            const requiredDates = getDatesBetween(start, end);
            const logic = this.scheduleLogicSelect?.value || 'ANY';

            if (requiredDates.length > 0) {
                filtered = filtered.filter(talent => {
                    const availableDates = requiredDates.filter(date => talent.schedules.has(formatDate(date)));
                    if (logic === 'ALL') return availableDates.length === requiredDates.length;
                    return availableDates.length > 0;
                });
            }
        }

        // 昵称搜索
        const nicknameQuery = this.directSearchNickname?.value.toLowerCase().trim();
        if (nicknameQuery) filtered = filtered.filter(t => t.nickname.toLowerCase().includes(nicknameQuery));

        // 星图ID搜索
        const xingtuIdQuery = this.directSearchXingtuId?.value.trim();
        if (xingtuIdQuery) filtered = filtered.filter(t => t.xingtuId === xingtuIdQuery);

        // 达人类型筛选
        const selectedTypes = Array.from(this.talentTypeFiltersContainer?.querySelectorAll('input:checked') || []).map(cb => cb.value);
        if (selectedTypes.length > 0) {
            filtered = filtered.filter(t =>
                Array.isArray(t.talentType) ? t.talentType.some(type => selectedTypes.includes(type)) : selectedTypes.includes(t.talentType)
            );
        }

        // 达人等级筛选
        const selectedTiers = Array.from(this.talentTierFiltersContainer?.querySelectorAll('input:checked') || []).map(cb => cb.value);
        if (selectedTiers.length > 0) filtered = filtered.filter(t => selectedTiers.includes(t.talentTier));

        // 数据维度筛选
        if (this.dataFilters.length > 0) {
            const logic = document.querySelector('input[name="filter-logic"]:checked')?.value || 'AND';
            filtered = filtered.filter(talent => {
                const checkCondition = (filter) => {
                    const talentValue = filter.dimension === 'price'
                        ? getBestPriceForSort(talent, '60s_plus', this.executionMonthInput.value)
                        : (talent.performanceData?.[filter.dimension] ?? talent[filter.dimension]);

                    const hasValue = talentValue !== undefined && talentValue !== null && talentValue !== '' && talentValue !== '未设置' && talentValue !== -1;

                    if (filter.operator === 'isEmpty') return !hasValue;
                    if (filter.operator === 'isNotEmpty') return hasValue;
                    if (!hasValue || filter.value === undefined) return false;

                    const numericTalentValue = parseFloat(talentValue);

                    if (filter.operator === 'between') {
                        const [min, max] = (filter.value || []).map(parseFloat);
                        return !isNaN(numericTalentValue) && numericTalentValue >= min && numericTalentValue <= max;
                    }

                    const numericFilterValue = parseFloat(filter.value);
                    switch (filter.operator) {
                        case '>': return !isNaN(numericTalentValue) && numericTalentValue > numericFilterValue;
                        case '>=': return !isNaN(numericTalentValue) && numericTalentValue >= numericFilterValue;
                        case '<': return !isNaN(numericTalentValue) && numericTalentValue < numericFilterValue;
                        case '<=': return !isNaN(numericTalentValue) && numericTalentValue <= numericFilterValue;
                        case '=': return String(talentValue).toLowerCase() == String(filter.value).toLowerCase();
                        case '!=': return String(talentValue).toLowerCase() != String(filter.value).toLowerCase();
                        case 'contains': return String(talentValue).toLowerCase().includes(String(filter.value).toLowerCase());
                        case 'notContains': return !String(talentValue).toLowerCase().includes(String(filter.value).toLowerCase());
                        default: return true;
                    }
                };

                if (logic === 'AND') return this.dataFilters.every(checkCondition);
                return this.dataFilters.some(checkCondition);
            });
        }

        // 触发筛选完成事件
        document.dispatchEvent(new CustomEvent('filtersApplied', {
            detail: { filteredTalents: filtered }
        }));
    }

    resetAllFilters() {
        // 清空所有筛选条件
        if (this.enableScheduleFilter) this.enableScheduleFilter.checked = false;
        if (this.scheduleStartDateInput) this.scheduleStartDateInput.value = '';
        if (this.scheduleEndDateInput) this.scheduleEndDateInput.value = '';
        if (this.directSearchNickname) this.directSearchNickname.value = '';
        if (this.directSearchXingtuId) this.directSearchXingtuId.value = '';

        this.talentTypeFiltersContainer?.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
        this.talentTierFiltersContainer?.querySelectorAll('input:checked').forEach(cb => cb.checked = false);

        this.dataFilters = [];
        this.renderDataFilterRows();
        this.applyFiltersAndRender();
    }

    updateData(richTalentData) {
        this.richTalentData = richTalentData;
    }
}
