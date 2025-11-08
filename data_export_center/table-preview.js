/**
 * @module table-preview
 * @description 数据预览表格渲染和分页管理模块
 */

import { getEntityDimensions } from './dimension-config.js';
import { getState } from './state-manager.js';

// 分页状态
let currentPage = 1;
let pageSize = 50;
let totalRecords = 0;
let allData = [];

/**
 * 渲染数据预览表格
 * @param {Array} data - 预览数据
 * @param {Array} selectedFields - 选中的字段ID列表
 */
export function renderPreviewTable(data, selectedFields) {
    if (!data || data.length === 0) {
        renderEmptyState();
        return;
    }

    allData = data;
    totalRecords = data.length;
    currentPage = 1;

    // 获取字段配置（用于显示友好的列名）
    const state = getState();
    const { selectedEntity } = state;
    const dimensionGroups = getEntityDimensions(selectedEntity);

    // 构建字段映射
    const fieldMap = new Map();
    Object.values(dimensionGroups).forEach(group => {
        group.forEach(dim => {
            fieldMap.set(dim.id, dim.label);
        });
    });

    // 渲染表头
    renderTableHeader(selectedFields, fieldMap);

    // 渲染当前页数据
    renderCurrentPage();

    // 设置分页控件
    setupPagination();

    // 更新统计信息
    updateDataStats();
}

/**
 * 渲染表头
 * @param {Array} fields - 字段ID列表
 * @param {Map} fieldMap - 字段ID到标签的映射
 */
function renderTableHeader(fields, fieldMap) {
    const headerRow = document.getElementById('table-header-row');
    if (!headerRow) return;

    headerRow.innerHTML = fields.map(fieldId => {
        const label = fieldMap.get(fieldId) || fieldId;
        return `
            <th class="sticky top-0 bg-gray-50">
                <div class="flex items-center gap-2">
                    ${label}
                </div>
            </th>
        `;
    }).join('');
}

/**
 * 渲染当前页的表格数据
 */
function renderCurrentPage() {
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, totalRecords);
    const pageData = allData.slice(start, end);

    renderTableBody(pageData);
}

/**
 * 渲染表格体
 * @param {Array} data - 当前页数据
 */
function renderTableBody(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    if (data.length === 0) {
        renderEmptyState();
        return;
    }

    const state = getState();
    const selectedFields = state.selectedDimensions[state.selectedEntity] || [];

    tbody.innerHTML = data.map((row, index) => {
        const cells = selectedFields.map(fieldId => {
            const value = row[fieldId];
            return `<td>${formatCellValue(value)}</td>`;
        }).join('');

        return `<tr>${cells}</tr>`;
    }).join('');
}

/**
 * 格式化单元格值
 * @param {any} value - 原始值
 * @returns {string} 格式化后的值
 */
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return '<span class="text-gray-400">-</span>';
    }

    if (typeof value === 'number') {
        return value.toLocaleString('zh-CN');
    }

    if (typeof value === 'boolean') {
        return value ? '是' : '否';
    }

    return String(value);
}

/**
 * 渲染空状态
 */
function renderEmptyState() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="100" class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-lg font-medium">没有找到符合条件的数据</p>
                <p class="text-sm mt-2">请调整筛选条件后重新生成预览</p>
            </td>
        </tr>
    `;

    // 重置统计
    totalRecords = 0;
    currentPage = 1;
    updateDataStats();
    setupPagination();
}

/**
 * 设置分页控件
 */
function setupPagination() {
    const totalPages = Math.ceil(totalRecords / pageSize);

    // 更新分页按钮状态
    const firstBtn = document.getElementById('first-page-btn');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const lastBtn = document.getElementById('last-page-btn');

    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (lastBtn) lastBtn.disabled = currentPage >= totalPages;

    // 渲染页码按钮
    renderPageNumbers(totalPages);
}

/**
 * 渲染页码按钮
 * @param {number} totalPages - 总页数
 */
function renderPageNumbers(totalPages) {
    const container = document.getElementById('page-numbers');
    if (!container) return;

    if (totalPages === 0) {
        container.innerHTML = '<button class="pagination-btn active">1</button>';
        return;
    }

    // 计算显示的页码范围
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const buttons = [];
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttons.push(`
            <button
                class="pagination-btn ${isActive ? 'active' : ''}"
                data-page="${i}"
                ${isActive ? 'disabled' : ''}
            >
                ${i}
            </button>
        `);
    }

    container.innerHTML = buttons.join('');

    // 绑定页码点击事件
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            if (!isNaN(page)) {
                changePage(page);
            }
        });
    });
}

/**
 * 更新数据统计信息
 */
function updateDataStats() {
    const totalRecordsEl = document.getElementById('total-records');
    const currentPageDisplay = document.getElementById('current-page-display');
    const rangeStart = document.getElementById('range-start');
    const rangeEnd = document.getElementById('range-end');
    const rangeTotal = document.getElementById('range-total');

    const totalPages = Math.ceil(totalRecords / pageSize);
    const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);

    if (totalRecordsEl) totalRecordsEl.textContent = totalRecords.toLocaleString('zh-CN');
    if (currentPageDisplay) currentPageDisplay.textContent = `${currentPage} / ${totalPages || 1}`;
    if (rangeStart) rangeStart.textContent = start.toLocaleString('zh-CN');
    if (rangeEnd) rangeEnd.textContent = end.toLocaleString('zh-CN');
    if (rangeTotal) rangeTotal.textContent = totalRecords.toLocaleString('zh-CN');
}

/**
 * 切换页码
 * @param {number} page - 目标页码
 */
export function changePage(page) {
    const totalPages = Math.ceil(totalRecords / pageSize);

    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderCurrentPage();
    setupPagination();
    updateDataStats();

    // 滚动到表格顶部
    const table = document.getElementById('data-preview-table');
    if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * 更改每页显示数量
 * @param {number} newPageSize - 新的页面大小
 */
export function changePageSize(newPageSize) {
    pageSize = parseInt(newPageSize);
    currentPage = 1; // 重置到第一页
    renderCurrentPage();
    setupPagination();
    updateDataStats();
}

/**
 * 初始化表格预览事件监听器
 */
export function initializeTablePreview() {
    // 分页按钮事件
    const firstBtn = document.getElementById('first-page-btn');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const lastBtn = document.getElementById('last-page-btn');

    if (firstBtn) {
        firstBtn.addEventListener('click', () => changePage(1));
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => changePage(currentPage + 1));
    }

    if (lastBtn) {
        lastBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(totalRecords / pageSize);
            changePage(totalPages);
        });
    }

    // 每页显示数量选择
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            changePageSize(e.target.value);
        });
    }
}

/**
 * 获取当前预览数据
 * @returns {Array} 预览数据
 */
export function getPreviewData() {
    return allData;
}

/**
 * 清空预览数据
 */
export function clearPreviewData() {
    allData = [];
    totalRecords = 0;
    currentPage = 1;
    renderEmptyState();
}
