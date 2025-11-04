/**
 * @file filter-panel.js
 * @description 筛选控制模块 - 负责年份/月份/项目/状态选择器和刷新功能
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
     * 更新项目筛选器选项
     * @param {Array} projects - 项目列表
     */
    updateProjectFilter(projects) {
        const options = ['<option value="all">全部项目</option>'];
        projects.forEach(project => {
            options.push(`<option value="${project.id}">${project.name}</option>`);
        });
        this.elements.projectFilter.innerHTML = options.join('');
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

    /**
     * 获取当前选中的项目ID
     */
    getSelectedProject() {
        return this.elements.projectFilter.value;
    }

    /**
     * 获取当前选中的状态
     */
    getSelectedStatus() {
        return this.elements.statusFilter.value;
    }

    /**
     * 重置项目筛选
     */
    resetProjectFilter() {
        this.elements.projectFilter.value = 'all';
    }

    /**
     * 重置状态筛选
     */
    resetStatusFilter() {
        this.elements.statusFilter.value = 'all';
    }
}
