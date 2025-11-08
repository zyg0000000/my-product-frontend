/**
 * table-renderer.js - 表格渲染模块
 * 负责渲染数据表格，处理单元格格式化和排序功能
 */

import { dimensions, sortConfig, totalTalents, itemsPerPage, updateSortConfig, updateCurrentPage } from './state-manager.js';
import { formatDate, formatPercentage, handleEmptyValue } from './utils.js';
import { renderPagination } from './pagination.js';

/**
 * 渲染表格
 * @param {Array} talentsToRender - 要渲染的达人数据
 */
export function renderTable(talentsToRender) {
    const performanceTableContainer = document.getElementById('performance-table-container');
    performanceTableContainer.innerHTML = '';

    if (talentsToRender.length === 0 && totalTalents === 0) {
        performanceTableContainer.innerHTML = `<p class="p-8 text-center text-gray-500">达人库为空，请先导入数据。</p>`;
        renderPagination(0, 0);
        return;
    }

    if (talentsToRender.length === 0) {
        performanceTableContainer.innerHTML = `<p class="p-8 text-center text-gray-500">未找到符合条件的达人。</p>`;
    } else {
        const table = document.createElement('table');
        table.className = 'w-full text-sm text-gray-500';

        // 创建表头
        const thead = createTableHeader();
        table.appendChild(thead);

        // 创建表体
        const tbody = createTableBody(talentsToRender);
        table.appendChild(tbody);

        performanceTableContainer.appendChild(table);
    }

    const totalPages = Math.ceil(totalTalents / itemsPerPage);
    renderPagination(totalPages, totalTalents);
}

/**
 * 创建表头
 * @returns {HTMLElement} 表头元素
 */
function createTableHeader() {
    const thead = document.createElement('thead');
    thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';

    let headerHtml = '<tr>';
    const visibleCols = dimensions.filter(d => d.visible);

    visibleCols.forEach(col => {
        const sortableClass = col.sortable ? 'sortable-header' : '';
        const headerAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
        const sortKey = col.id;

        let sortIcon = '';
        if (col.sortable) {
            const isAsc = sortConfig.key === sortKey && sortConfig.direction === 'asc';
            const isDesc = sortConfig.key === sortKey && sortConfig.direction === 'desc';
            sortIcon = `<span class="inline-flex flex-col ml-1">
                <svg class="w-3 h-3 ${isAsc ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3l3 3-1.414 1.414L10 5.414 7.707 7.707 6.293 6.293 10 3z"/>
                </svg>
                <svg class="w-3 h-3 ${isDesc ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 17l-3-3 1.414-1.414L10 14.586l2.293-2.293 1.414 1.414L10 17z"/>
                </svg>
            </span>`;
        }

        headerHtml += `<th scope="col" class="px-6 py-3 ${sortableClass} ${headerAlign}" data-sort-key="${sortKey}">
            <div class="flex items-center ${col.id === 'nickname' ? '' : 'justify-center'}">
                ${col.name} ${sortIcon}
            </div>
        </th>`;
    });

    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;
    return thead;
}

/**
 * 创建表体
 * @param {Array} talentsToRender - 要渲染的达人数据
 * @returns {HTMLElement} 表体元素
 */
function createTableBody(talentsToRender) {
    const tbody = document.createElement('tbody');
    const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);
    const visibleCols = dimensions.filter(d => d.visible);

    talentsToRender.forEach(talent => {
        const row = document.createElement('tr');
        row.className = 'border-b bg-white';

        visibleCols.forEach(col => {
            const cell = document.createElement('td');
            const cellAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
            cell.className = `px-6 py-4 ${cellAlign}`;

            // 获取单元格值
            let cellValue = topLevelFields.has(col.id)
                ? talent[col.id]
                : (talent.performanceData ? talent.performanceData[col.id] : undefined);

            let displayValue = handleEmptyValue(cellValue);

            // 格式化显示值
            if (col.id === 'lastUpdated' && displayValue !== 'N/A') {
                displayValue = formatDate(displayValue);
            } else if (col.type === 'percentage' && !isNaN(parseFloat(displayValue))) {
                displayValue = formatPercentage(displayValue);
            }

            // 处理昵称链接
            if (col.id === 'nickname' && talent.xingtuId && talent.xingtuId !== 'N/A') {
                cell.innerHTML = `<a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}"
                    target="_blank" class="text-blue-600 hover:underline">${displayValue}</a>`;
            } else {
                cell.textContent = displayValue;
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    return tbody;
}

/**
 * 处理排序
 * @param {HTMLElement} headerElement - 点击的表头元素
 * @param {Function} fetchCallback - 获取数据的回调函数
 */
export function handleSort(headerElement, fetchCallback) {
    const key = headerElement.dataset.sortKey;

    if (sortConfig.key === key) {
        updateSortConfig({
            key,
            direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
        });
    } else {
        updateSortConfig({
            key,
            direction: 'desc'
        });
    }

    updateCurrentPage(1);
    fetchCallback();
}