/**
 * @file filter-panel.js
 * @description 筛选控制模块 - 负责年份/月份选择器和刷新功能
 */

export class FilterPanel {
    constructor(elements) {
        this.elements = elements;
    }

    /**
     * 初始化年份选择器
     */
    initYearSelector() {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

        this.elements.yearSelector.innerHTML = years.map(year =>
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
        ).join('');
    }

    /**
     * 设置默认月份（当前月）
     */
    setDefaultMonth() {
        const currentMonth = new Date().getMonth() + 1;
        const selectedMonth = `M${currentMonth}`;
        this.elements.monthSelector.value = selectedMonth;
    }

    /**
     * 获取当前选中的年份
     */
    getSelectedYear() {
        return this.elements.yearSelector.value;
    }

    /**
     * 获取当前选中的月份
     */
    getSelectedMonth() {
        return this.elements.monthSelector.value;
    }
}
