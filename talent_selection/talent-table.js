/**
 * @file talent_selection/talent-table.js
 * @description 达人表格模块 - 表格渲染、排序、分页、价格类型切换
 */

import { getBestPrice, getBestPriceForSort, formatDate, getDatesBetween } from './utils.js';

export default class TalentTable {
    constructor(options) {
        this.displayedTalents = options.displayedTalents;
        this.visibleColumns = options.visibleColumns;
        this.executionMonthInput = options.executionMonthInput;
        this.ITEMS_PER_PAGE_KEY = options.ITEMS_PER_PAGE_KEY;
        this.apiRequest = options.apiRequest;
        this.showAlert = options.showAlert;

        // DOM Elements
        this.tableContainer = document.getElementById('table-container');
        this.paginationControls = document.getElementById('pagination-controls');
        this.tablePriceTypeFilter = document.getElementById('table-price-type-filter');
        this.customizeColsBtn = document.getElementById('customize-cols-btn');
        this.scheduleStartDateInput = document.getElementById('schedule-start-date');
        this.scheduleEndDateInput = document.getElementById('schedule-end-date');

        // State
        this.currentPage = 1;
        this.itemsPerPage = parseInt(localStorage.getItem(this.ITEMS_PER_PAGE_KEY) || '15');
        this.selectedPriceType = '60s_plus';
        this.sortConfig = { key: '', direction: 'asc' };
        this.selectedTalentIds = new Set();

        // Bind methods
        this.render = this.render.bind(this);
        this.handleSort = this.handleSort.bind(this);
        this.handlePaginationClick = this.handlePaginationClick.bind(this);
        this.handleItemsPerPageChange = this.handleItemsPerPageChange.bind(this);
        this.handleTableCheckbox = this.handleTableCheckbox.bind(this);
        this.handlePriceTypeChange = this.handlePriceTypeChange.bind(this);
        this.handleCustomizeColumns = this.handleCustomizeColumns.bind(this);
    }

    setupEventListeners() {
        if (this.tablePriceTypeFilter) {
            this.tablePriceTypeFilter.addEventListener('change', this.handlePriceTypeChange);
        }

        if (this.tableContainer) {
            this.tableContainer.addEventListener('click', this.handleSort);
            this.tableContainer.addEventListener('change', this.handleTableCheckbox);
        }

        if (this.paginationControls) {
            this.paginationControls.addEventListener('click', this.handlePaginationClick);
            this.paginationControls.addEventListener('change', this.handleItemsPerPageChange);
        }

        if (this.customizeColsBtn) {
            this.customizeColsBtn.addEventListener('click', this.handleCustomizeColumns);
        }
    }

    render() {
        this.renderTable();

        // Setup event listeners only once
        if (!this._listenersSetup) {
            this.setupEventListeners();
            this._listenersSetup = true;
        }
    }

    renderTable() {
        if (!this.tableContainer) return;

        console.log('[TalentTable] renderTable called, displayedTalents:', this.displayedTalents.length);
        console.log('[TalentTable] visibleColumns:', this.visibleColumns.length);

        this.tableContainer.innerHTML = '';

        // Apply sorting
        const sortKey = this.sortConfig.key;
        if (sortKey) {
            this.displayedTalents.sort((a, b) => {
                let valA, valB;
                const topLevelFields = ['nickname', 'talentTier', 'highestRebate'];

                if (sortKey === 'price') {
                    valA = getBestPriceForSort(a, this.selectedPriceType, this.executionMonthInput.value);
                    valB = getBestPriceForSort(b, this.selectedPriceType, this.executionMonthInput.value);
                } else if (topLevelFields.includes(sortKey)) {
                    valA = a[sortKey];
                    valB = b[sortKey];
                } else {
                    valA = (a.performanceData || {})[sortKey];
                    valB = (b.performanceData || {})[sortKey];
                }

                const aHasValue = !(valA === undefined || valA === null || valA === '' || valA === -1);
                const bHasValue = !(valB === undefined || valB === null || valB === '' || valB === -1);

                if (aHasValue && !bHasValue) return this.sortConfig.direction === 'asc' ? 1 : -1;
                if (!aHasValue && bHasValue) return this.sortConfig.direction === 'asc' ? -1 : 1;
                if (!aHasValue && !bHasValue) return 0;

                const numA = parseFloat(valA);
                const numB = parseFloat(valB);

                if (this.sortConfig.direction === 'asc') {
                    return numA - numB;
                } else {
                    return numB - numA;
                }
            });
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.displayedTalents.length / this.itemsPerPage);
        this.currentPage = Math.min(Math.max(1, this.currentPage), totalPages || 1);
        const paginatedTalents = this.displayedTalents.slice(
            (this.currentPage - 1) * this.itemsPerPage,
            this.currentPage * this.itemsPerPage
        );

        if (paginatedTalents.length === 0) {
            this.tableContainer.innerHTML = `<p class="p-8 text-center text-gray-500">没有找到符合条件的达人。</p>`;
            this.renderPagination(totalPages);
            return;
        }

        // Build table
        const table = document.createElement('table');
        table.className = 'w-full text-sm text-gray-500 whitespace-nowrap';

        const visibleCols = this.visibleColumns.filter(d => d.visible);
        console.log('[TalentTable] visibleCols after filter:', visibleCols.length);
        console.log('[TalentTable] visibleCols:', visibleCols);

        const columns = [
            { id: 'checkbox', name: '', sortable: false },
            ...visibleCols,
            { id: 'scheduleMatch', name: '档期匹配度', sortable: false }
        ];

        // Render header
        let headerHtml = '<thead><tr class="text-xs text-gray-700 uppercase bg-gray-50">';
        columns.forEach(col => {
            const isSortable = col.sortable !== false && col.id !== 'checkbox' && col.id !== 'scheduleMatch';
            const headerAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
            let sortIcon = '';
            if (isSortable) {
                sortIcon = `<span class="inline-flex flex-col ml-1">
                    <svg class="w-3 h-3 ${this.sortConfig.key === col.id && this.sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"/>
                    </svg>
                    <svg class="w-3 h-3 ${this.sortConfig.key === col.id && this.sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"/>
                    </svg>
                </span>`;
            }
            headerHtml += `<th scope="col" class="px-6 py-3 ${isSortable ? 'sortable-header cursor-pointer hover:bg-gray-100' : ''} ${headerAlign}" data-sort-key="${col.id}">
                <div class="flex items-center ${col.id === 'nickname' ? '' : 'justify-center'}">${col.name}${sortIcon}</div>
            </th>`;
        });
        headerHtml += '</tr></thead>';
        table.innerHTML = headerHtml;

        // Render body
        const tbody = document.createElement('tbody');
        paginatedTalents.forEach(talent => {
            const isSelected = this.selectedTalentIds.has(talent.id);
            let row = document.createElement('tr');
            row.className = `bg-white border-b ${isSelected ? 'bg-blue-50' : ''}`;

            columns.forEach(col => {
                const cell = document.createElement('td');
                const cellAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
                cell.className = `px-6 py-4 ${cellAlign}`;
                let cellValue;

                switch (col.id) {
                    case 'checkbox':
                        cell.innerHTML = `<input type="checkbox" class="talent-checkbox rounded" data-talent-id="${talent.id}" ${isSelected ? 'checked' : ''}>`;
                        break;
                    case 'price':
                        const priceInfo = getBestPrice(talent, this.selectedPriceType, this.executionMonthInput.value);
                        if (priceInfo.value === '没有') {
                            cell.textContent = '没有';
                            cell.classList.add('text-gray-400', 'italic');
                        } else if (priceInfo.isFallback) {
                            cell.textContent = priceInfo.value;
                            cell.classList.add('text-gray-500', 'italic');
                        } else {
                            cell.textContent = typeof priceInfo.value === 'number'
                                ? `¥ ${priceInfo.value.toLocaleString()}`
                                : priceInfo.value;
                        }
                        break;
                    case 'highestRebate':
                        cell.textContent = `${talent.highestRebate}%`;
                        break;
                    case 'scheduleMatch':
                        cell.innerHTML = this.calculateScheduleMatch(talent);
                        break;
                    case 'nickname':
                        cellValue = talent[col.id];
                        cell.innerHTML = cellValue
                            ? `<a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}" target="_blank" class="text-blue-600 hover:underline">${cellValue}</a>`
                            : 'N/A';
                        break;
                    case 'lastUpdated':
                        cellValue = (talent.performanceData || {})[col.id];
                        cell.textContent = cellValue ? new Date(cellValue).toLocaleDateString() : 'N/A';
                        break;
                    default:
                        cellValue = talent[col.id] ?? (talent.performanceData || {})[col.id];
                        if (col.type === 'percentage' && typeof cellValue === 'number') {
                            cell.textContent = `${(cellValue * 100).toFixed(2)}%`;
                        } else {
                            cell.textContent = (cellValue !== undefined && cellValue !== null)
                                ? (Array.isArray(cellValue) ? cellValue.join(', ') : cellValue)
                                : 'N/A';
                        }
                }
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        this.tableContainer.appendChild(table);
        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        if (!this.paginationControls) return;

        this.paginationControls.innerHTML = '';
        if (totalPages <= 0) return;

        const perPageSelector = `<div class="flex items-center text-sm">
            <span class="mr-2 text-gray-600">每页显示:</span>
            <select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm">
                <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${this.itemsPerPage === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${this.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                <option value="30" ${this.itemsPerPage === 30 ? 'selected' : ''}>30</option>
                <option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>
            </select>
        </div>`;

        const pageButtons = [];
        const maxButtons = 7;

        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) {
                pageButtons.push(`<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
        } else {
            pageButtons.push(`<button class="pagination-btn ${1 === this.currentPage ? 'active' : ''}" data-page="1">1</button>`);
            let start = Math.max(2, this.currentPage - 2);
            let end = Math.min(totalPages - 1, this.currentPage + 2);
            if (this.currentPage > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
            for (let i = start; i <= end; i++) {
                pageButtons.push(`<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
            }
            if (this.currentPage < totalPages - 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
            pageButtons.push(`<button class="pagination-btn ${totalPages === this.currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
        }

        const pageButtonsContainer = `<div class="flex items-center gap-2">
            <button class="pagination-btn prev-page-btn" ${this.currentPage === 1 ? 'disabled' : ''}>&lt;</button>
            ${pageButtons.join('')}
            <button class="pagination-btn next-page-btn" ${this.currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
        </div>`;

        this.paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }

    calculateScheduleMatch(talent) {
        if (!this.scheduleStartDateInput?.value || !this.scheduleEndDateInput?.value) {
            return '未设置日期';
        }

        // 修复时区问题：使用本地时区解析日期
        const [y1, m1, d1] = this.scheduleStartDateInput.value.split('-').map(Number);
        const start = new Date(y1, m1 - 1, d1);
        const [y2, m2, d2] = this.scheduleEndDateInput.value.split('-').map(Number);
        const end = new Date(y2, m2 - 1, d2);
        const requiredDates = getDatesBetween(start, end);

        if (requiredDates.length === 0) return '日期无效';

        const availableCount = requiredDates.filter(date => talent.schedules.has(formatDate(date))).length;
        if (availableCount === requiredDates.length) {
            return `<span class="text-green-600 font-semibold">档期完全匹配</span>`;
        }
        return `${availableCount} / ${requiredDates.length} 天有档期`;
    }

    handleSort(e) {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const key = header.dataset.sortKey;
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }
        this.renderTable();
    }

    handlePaginationClick(e) {
        const target = e.target.closest('button');
        if (!target || target.disabled) return;

        if (target.classList.contains('prev-page-btn')) {
            this.currentPage--;
        } else if (target.classList.contains('next-page-btn')) {
            this.currentPage++;
        } else if (target.dataset.page) {
            this.currentPage = Number(target.dataset.page);
        }
        this.renderTable();
    }

    handleItemsPerPageChange(e) {
        if (e.target.id === 'items-per-page') {
            this.itemsPerPage = parseInt(e.target.value);
            localStorage.setItem(this.ITEMS_PER_PAGE_KEY, this.itemsPerPage);
            this.currentPage = 1;
            this.renderTable();
        }
    }

    handleTableCheckbox(e) {
        if (!e.target.classList.contains('talent-checkbox')) return;

        const talentId = e.target.dataset.talentId;
        const talent = this.displayedTalents.find(t => t.id === talentId);
        if (!talent) return;

        if (e.target.checked) {
            this.selectedTalentIds.add(talentId);
            document.dispatchEvent(new CustomEvent('talentSelected', {
                detail: { talent }
            }));
        } else {
            this.selectedTalentIds.delete(talentId);
            document.dispatchEvent(new CustomEvent('talentDeselected', {
                detail: { talentId }
            }));
        }

        this.renderTable();
    }

    handlePriceTypeChange() {
        this.selectedPriceType = this.tablePriceTypeFilter.value;
        this.renderTable();
    }

    handleCustomizeColumns() {
        document.dispatchEvent(new CustomEvent('openColumnsModal'));
    }

    updateDisplayedTalents(displayedTalents) {
        this.displayedTalents = displayedTalents;
        this.currentPage = 1;
    }

    updateVisibleColumns(visibleColumns) {
        this.visibleColumns = visibleColumns;
    }

    clearAllSelections() {
        this.selectedTalentIds.clear();
        this.renderTable();
    }
}
