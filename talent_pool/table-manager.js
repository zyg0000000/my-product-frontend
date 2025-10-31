/**
 * @file talent_pool/table-manager.js
 * @description 达人表格管理模块
 * @version 1.0.0
 *
 * 职责:
 * - 表格渲染（达人列表展示）
 * - 搜索功能（实时搜索）
 * - 高级筛选（层级、标签、返点率、价格区间）
 * - 分页控制（上一页、下一页、页码跳转）
 * - 排序功能（昵称、星图ID排序）
 * - 批量选择（全选、单选）
 * - 行级操作按钮事件绑定
 */

export class TableManager {
    constructor(app) {
        this.app = app;  // 引用主控制器

        // DOM 元素引用
        this.elements = {
            // 表格相关
            tableHeader: null,
            talentListBody: null,
            noTalentsMessage: null,
            actionBar: null,

            // 搜索
            searchInput: null,

            // 高级筛选
            advancedFilterDetails: null,
            filterTierCheckboxes: null,
            filterTypeCheckboxes: null,
            filterRebateMin: null,
            filterRebateMax: null,
            filterPriceMonth: null,
            filterPriceType: null,
            filterPriceMin: null,
            filterPriceMax: null,
            applyFiltersBtn: null,
            resetFiltersBtn: null,

            // 分页
            paginationControls: null,

            // 选择
            selectAllOnPageCheckbox: null,
            selectionCounter: null
        };

        // 常量
        this.REBATE_DISPLAY_LIMIT = 1;
    }

    // ========== 初始化方法 ==========
    init() {
        console.log('[TableManager] 初始化...');
        this.cacheElements();
        this.bindEvents();
        this.populateFilterCheckboxes();
    }

    cacheElements() {
        // 表格
        this.elements.tableHeader = document.querySelector('table thead');
        this.elements.talentListBody = document.getElementById('talent-list-body');
        this.elements.noTalentsMessage = document.getElementById('no-talents-message');
        this.elements.actionBar = document.getElementById('action-bar');

        // 搜索
        this.elements.searchInput = document.getElementById('search-input');

        // 高级筛选
        this.elements.advancedFilterDetails = document.getElementById('advanced-filter-details');
        this.elements.filterTierCheckboxes = document.getElementById('filter-tier-checkboxes');
        this.elements.filterTypeCheckboxes = document.getElementById('filter-type-checkboxes');
        this.elements.filterRebateMin = document.getElementById('filter-rebate-min');
        this.elements.filterRebateMax = document.getElementById('filter-rebate-max');
        this.elements.filterPriceMonth = document.getElementById('filter-price-month');
        this.elements.filterPriceType = document.getElementById('filter-price-type');
        this.elements.filterPriceMin = document.getElementById('filter-price-min');
        this.elements.filterPriceMax = document.getElementById('filter-price-max');
        this.elements.applyFiltersBtn = document.getElementById('apply-filters-btn');
        this.elements.resetFiltersBtn = document.getElementById('reset-filters-btn');

        // 分页
        this.elements.paginationControls = document.getElementById('pagination-controls');

        // 选择
        this.elements.selectAllOnPageCheckbox = document.getElementById('select-all-on-page');
        this.elements.selectionCounter = document.getElementById('selection-counter');
    }

    bindEvents() {
        // 搜索
        this.elements.searchInput?.addEventListener('input', () => {
            this.app.queryState.search = this.elements.searchInput.value.trim();
        });

        this.elements.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.app.queryState.page = 1;
                this.app.fetchTalents();
            }
        });

        // 高级筛选
        this.elements.applyFiltersBtn?.addEventListener('click', () => this.applyFilters());
        this.elements.resetFiltersBtn?.addEventListener('click', () => this.resetFilters());

        // 排序
        this.elements.tableHeader?.addEventListener('click', (e) => this.handleSort(e));

        // 分页
        this.elements.paginationControls?.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target || target.disabled) return;

            if (target.id === 'prev-page') this.app.queryState.page--;
            else if (target.id === 'next-page') this.app.queryState.page++;
            else if (target.dataset.page) this.app.queryState.page = Number(target.dataset.page);

            this.app.fetchTalents();
        });

        this.elements.paginationControls?.addEventListener('change', (e) => {
            if (e.target.id === 'items-per-page') {
                this.app.queryState.pageSize = parseInt(e.target.value);
                localStorage.setItem(this.app.ITEMS_PER_PAGE_KEY, this.app.queryState.pageSize);
                this.app.queryState.page = 1;
                this.app.fetchTalents();
            }
        });

        // 表格行点击事件（编辑、删除、价格、返点、历史）
        this.elements.talentListBody?.addEventListener('click', (e) => {
            const target = e.target;
            const talentId = target.closest('[data-id]')?.dataset.id;

            if (!talentId) return;

            // 复选框选择
            if (target.classList.contains('talent-checkbox')) {
                const checkbox = target;
                if (checkbox.checked) {
                    this.app.selectedTalents.add(talentId);
                } else {
                    this.app.selectedTalents.delete(talentId);
                }
                this.updateSelectionCounter();
                this.updateSelectAllOnPageCheckboxState();
            }
            // 编辑按钮
            else if (target.classList.contains('edit-btn')) {
                console.log('[TableManager] 编辑按钮点击:', talentId);
                this.app.crudModal?.open(talentId);
            }
            // 删除按钮
            else if (target.classList.contains('delete-btn')) {
                this.app.openConfirmModal(
                    '确定要删除该达人吗？此操作将删除其所有关联的合作历史，且不可撤销。',
                    async () => {
                        try {
                            await this.app.apiRequest(this.app.API_PATHS.delete, 'DELETE', { talentId });
                            this.app.showToast('达人已成功删除。');
                            this.app.fetchTalents();
                        } finally {
                            this.app.closeConfirmModal();
                        }
                    }
                );
            }
            // 价格按钮（后续由 priceModal 处理）
            else if (target.classList.contains('price-btn')) {
                console.log('[TableManager] 价格按钮点击:', talentId);
                // TODO: this.app.priceModal.open(talentId);
            }
            // 返点按钮（后续由 rebateModal 处理）
            else if (target.classList.contains('rebate-btn')) {
                console.log('[TableManager] 返点按钮点击:', talentId);
                // TODO: this.app.rebateModal.open(talentId);
            }
            // 历史按钮（后续由 historyModal 处理）
            else if (target.classList.contains('history-btn')) {
                console.log('[TableManager] 历史按钮点击:', talentId);
                // TODO: this.app.historyModal.open(talentId);
            }
        });

        // 全选
        this.elements.selectAllOnPageCheckbox?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.talent-checkbox').forEach(cb => {
                const talentId = cb.dataset.id;
                cb.checked = isChecked;
                if (isChecked) {
                    this.app.selectedTalents.add(talentId);
                } else {
                    this.app.selectedTalents.delete(talentId);
                }
            });
            this.updateSelectionCounter();
        });
    }

    // ========== 渲染方法 ==========
    render(talents, pagination) {
        this.renderTable(talents);
        this.renderPagination(pagination.totalPages, pagination.totalItems);
        this.updateSelectionCounter();
        this.updateSortIcons();
    }

    renderTable(talentsToRender) {
        if (!this.elements.talentListBody) return;

        this.elements.talentListBody.innerHTML = '';
        const tableContainer = this.elements.talentListBody.closest('.overflow-x-auto')?.parentElement;
        if (!tableContainer) return;

        // 空状态处理
        if (talentsToRender.length === 0) {
            tableContainer.classList.add('hidden');
            this.elements.actionBar?.classList.add('hidden');

            if (this.app.totalFilteredItems === 0) {
                this.elements.noTalentsMessage?.classList.remove('hidden');
            } else {
                this.elements.noTalentsMessage?.classList.add('hidden');
                this.elements.talentListBody.innerHTML = `
                    <tr><td colspan="9" class="text-center py-10 text-gray-500">未找到匹配的达人。</td></tr>
                `;
                tableContainer.classList.remove('hidden');
            }
            return;
        }

        // 有数据时渲染表格
        this.elements.noTalentsMessage?.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        if (this.app.totalFilteredItems > 0) {
            this.elements.actionBar?.classList.remove('hidden');
        }

        talentsToRender.forEach(talent => {
            const row = this.createTableRow(talent);
            this.elements.talentListBody.appendChild(row);
        });

        this.updateSelectAllOnPageCheckboxState();
    }

    createTableRow(talent) {
        const isSelected = this.app.selectedTalents.has(talent.id);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // 当前月份价格
        const priceDisplay = this.getPriceDisplay(talent, currentYear, currentMonth);

        // 返点率显示
        const rebatesHtml = this.getRebatesDisplay(talent);

        // 内容标签显示
        const typesCellContent = this.getTypesDisplay(talent);

        const row = document.createElement('tr');
        row.className = `bg-white ${isSelected ? 'table-row-selected' : ''}`;
        row.innerHTML = `
            <td class="px-4 py-4 text-center text-sm text-gray-500">
                <input type="checkbox" class="talent-checkbox h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                       data-id="${talent.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${talent.nickname}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline">
                <a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}"
                   target="_blank" rel="noopener noreferrer">${talent.xingtuId}</a>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${talent.uid || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${priceDisplay}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rebatesHtml}</td>
            <td class="px-6 py-4 text-sm text-gray-500">
                <div class="flex flex-wrap gap-1 items-center">${typesCellContent}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${talent.talentTier || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                <button data-id="${talent.id}" class="price-btn text-purple-600 hover:text-purple-900">一口价</button>
                <button data-id="${talent.id}" class="rebate-btn text-green-600 hover:text-green-900">返点</button>
                <button data-id="${talent.id}" class="history-btn text-gray-600 hover:text-gray-900">历史</button>
                <button data-id="${talent.id}" class="edit-btn text-blue-600 hover:text-blue-900">编辑</button>
                <button data-id="${talent.id}" class="delete-btn text-red-600 hover:text-red-900">删除</button>
            </td>
        `;

        return row;
    }

    getPriceDisplay(talent, year, month) {
        const prices = talent.prices || [];

        // 查找已确认价格
        const confirmedPrice = prices.find(p =>
            p.year === year && p.month === month && p.status === 'confirmed'
        );

        if (confirmedPrice) {
            return `¥ ${confirmedPrice.price.toLocaleString()}`;
        }

        // 查找暂定价
        const provisionalPrice = prices.find(p =>
            p.year === year && p.month === month && p.status === 'provisional'
        );

        if (provisionalPrice) {
            return `<span class="text-yellow-600">¥ ${provisionalPrice.price.toLocaleString()} (暂定价)</span>`;
        }

        return 'N/A';
    }

    getRebatesDisplay(talent) {
        if (!talent.rebates || talent.rebates.length === 0) {
            return 'N/A';
        }

        const sortedRebates = [...talent.rebates].sort((a, b) => a.rate - b.rate);
        const allRebatesString = sortedRebates.map(r => `${r.rate}%`).join(', ');

        // 如果返点率超过显示限制，显示悬浮提示
        if (sortedRebates.length > this.REBATE_DISPLAY_LIMIT) {
            const visibleRebates = sortedRebates
                .slice(0, this.REBATE_DISPLAY_LIMIT)
                .map(r => `${r.rate}%`)
                .join(', ');

            return `
                <div class="relative group cursor-pointer">
                    <span>${visibleRebates}...</span>
                    <div class="absolute bottom-full mb-2 w-max hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 shadow-lg">
                        ${allRebatesString}
                    </div>
                </div>
            `;
        }

        return allRebatesString;
    }

    getTypesDisplay(talent) {
        if (!talent.talentType || !Array.isArray(talent.talentType) || talent.talentType.length === 0) {
            return 'N/A';
        }

        return talent.talentType.map(type => {
            const color = this.stringToColor(type);
            const textColor = this.getTextColor(color);
            return `<span class="talent-type-tag" style="background-color:${color}; color:${textColor};">${type}</span>`;
        }).join(' ');
    }

    renderPagination(totalPages, totalItems) {
        if (!this.elements.paginationControls) return;

        this.elements.paginationControls.innerHTML = '';

        if (totalItems === 0) return;

        // 摘要信息
        const summary = `<div class="text-sm text-gray-700">共 ${totalItems} 条记录</div>`;

        // 每页显示数量选择器
        const perPageOptions = [10, 15, 20, 30, 50];
        const perPageSelector = `
            <div class="flex items-center text-sm">
                <span class="mr-2 text-gray-600">每页显示:</span>
                <select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">
                    ${perPageOptions.map(v => `
                        <option value="${v}" ${this.app.queryState.pageSize === v ? 'selected' : ''}>${v}</option>
                    `).join('')}
                </select>
            </div>
        `;

        // 页码按钮
        let pageButtonsContainer = '';
        if (totalPages > 1) {
            const pageButtons = this.generatePageButtons(totalPages, this.app.queryState.page);
            const currentPageNum = this.app.queryState.page;

            pageButtonsContainer = `
                <div class="flex items-center gap-1">
                    <button id="prev-page" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>&lt;</button>
                    ${pageButtons.join('')}
                    <button id="next-page" class="pagination-btn" ${currentPageNum === totalPages ? 'disabled' : ''}>&gt;</button>
                </div>
            `;
        }

        this.elements.paginationControls.innerHTML = `
            <div class="flex-1">${perPageSelector}</div>
            <div class="flex items-center gap-4">${summary}${pageButtonsContainer}</div>
        `;
    }

    generatePageButtons(totalPages, currentPage) {
        const pageButtons = [];
        const maxButtons = 7;

        if (totalPages <= maxButtons) {
            // 页数少，全部显示
            for (let i = 1; i <= totalPages; i++) {
                pageButtons.push(
                    `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`
                );
            }
        } else {
            // 页数多，智能省略
            pageButtons.push(
                `<button class="pagination-btn ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>`
            );

            let start = Math.max(2, currentPage - 2);
            let end = Math.min(totalPages - 1, currentPage + 2);

            if (currentPage > 4) {
                pageButtons.push('<span class="pagination-ellipsis">...</span>');
            }

            if (currentPage <= 4) end = 5;
            if (currentPage >= totalPages - 3) start = totalPages - 4;

            for (let i = start; i <= end; i++) {
                pageButtons.push(
                    `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`
                );
            }

            if (totalPages - currentPage > 3) {
                pageButtons.push('<span class="pagination-ellipsis">...</span>');
            }

            pageButtons.push(
                `<button class="pagination-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`
            );
        }

        return pageButtons;
    }

    // ========== 筛选功能 ==========
    populateFilterCheckboxes() {
        if (!this.elements.filterTierCheckboxes || !this.elements.filterTypeCheckboxes || !this.elements.filterPriceMonth) {
            return;
        }

        // 渲染层级筛选
        this.elements.filterTierCheckboxes.innerHTML = '';
        Array.from(this.app.talentTiers).sort().forEach(tier => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = `
                <input type="checkbox" value="${tier}" class="filter-checkbox rounded text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">${tier}</span>
            `;
            this.elements.filterTierCheckboxes.appendChild(label);
        });

        // 渲染标签筛选
        this.elements.filterTypeCheckboxes.innerHTML = '';
        Array.from(this.app.talentTypes).sort().forEach(type => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = `
                <input type="checkbox" value="${type}" class="filter-checkbox rounded text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">${type}</span>
            `;
            this.elements.filterTypeCheckboxes.appendChild(label);
        });

        // 渲染月份选择器
        this.elements.filterPriceMonth.innerHTML = '<option value="">选择月份</option>';
        const today = new Date();
        for (let i = -3; i < 6; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            this.elements.filterPriceMonth.innerHTML += `
                <option value="${year}-${month}">${year}年${month}月</option>
            `;
        }
    }

    applyFilters() {
        this.app.queryState.page = 1;

        // 搜索关键词
        if (this.elements.searchInput) {
            this.app.queryState.search = this.elements.searchInput.value;
        }

        // 层级筛选
        this.app.queryState.tiers = Array.from(
            document.querySelectorAll('#filter-tier-checkboxes input:checked')
        ).map(cb => cb.value);

        // 标签筛选
        this.app.queryState.types = Array.from(
            document.querySelectorAll('#filter-type-checkboxes input:checked')
        ).map(cb => cb.value);

        // 返点率筛选
        this.app.queryState.rebateMin = this.elements.filterRebateMin?.value
            ? parseFloat(this.elements.filterRebateMin.value)
            : null;
        this.app.queryState.rebateMax = this.elements.filterRebateMax?.value
            ? parseFloat(this.elements.filterRebateMax.value)
            : null;

        // 价格月份筛选
        const priceMonthVal = this.elements.filterPriceMonth?.value;
        if (priceMonthVal) {
            const [year, month] = priceMonthVal.split('-').map(Number);
            this.app.queryState.priceYear = year;
            this.app.queryState.priceMonth = month;
        } else {
            this.app.queryState.priceYear = null;
            this.app.queryState.priceMonth = null;
        }

        // 价格类型筛选
        this.app.queryState.priceType = this.elements.filterPriceType?.value || null;

        // 价格区间筛选
        this.app.queryState.priceMin = this.elements.filterPriceMin?.value
            ? parseFloat(this.elements.filterPriceMin.value)
            : null;
        this.app.queryState.priceMax = this.elements.filterPriceMax?.value
            ? parseFloat(this.elements.filterPriceMax.value)
            : null;

        this.app.fetchTalents();
    }

    resetFilters() {
        // 清空搜索框
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }

        // 取消所有筛选复选框
        document.querySelectorAll('#filter-tier-checkboxes input:checked, #filter-type-checkboxes input:checked')
            .forEach(cb => cb.checked = false);

        // 清空筛选输入框
        if (this.elements.filterRebateMin) this.elements.filterRebateMin.value = '';
        if (this.elements.filterRebateMax) this.elements.filterRebateMax.value = '';
        if (this.elements.filterPriceMonth) this.elements.filterPriceMonth.selectedIndex = 0;
        if (this.elements.filterPriceType) this.elements.filterPriceType.selectedIndex = 0;
        if (this.elements.filterPriceMin) this.elements.filterPriceMin.value = '';
        if (this.elements.filterPriceMax) this.elements.filterPriceMax.value = '';

        // 重置查询状态
        Object.assign(this.app.queryState, {
            page: 1,
            search: '',
            tiers: [],
            types: [],
            rebateMin: null,
            rebateMax: null,
            priceYear: null,
            priceMonth: null,
            priceType: null,
            priceMin: null,
            priceMax: null
        });

        this.app.queryState.sortBy = 'createdAt';
        this.app.queryState.sortOrder = 'desc';

        // 关闭高级筛选面板
        if (this.elements.advancedFilterDetails) {
            this.elements.advancedFilterDetails.open = false;
        }

        this.app.fetchTalents();
    }

    // ========== 排序功能 ==========
    handleSort(e) {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortBy = header.dataset.sort;
        if (!sortBy) return;

        // 切换排序方向
        if (this.app.queryState.sortBy === sortBy) {
            this.app.queryState.sortOrder = this.app.queryState.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.app.queryState.sortBy = sortBy;
            this.app.queryState.sortOrder = 'desc';
        }

        this.app.queryState.page = 1;
        this.app.fetchTalents();
    }

    updateSortIcons() {
        if (!this.elements.tableHeader) return;

        this.elements.tableHeader.querySelectorAll('.sortable-header').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (!icon) return;

            const sortBy = header.dataset.sort;

            if (sortBy === this.app.queryState.sortBy) {
                header.dataset.sortActive = 'true';
                icon.textContent = this.app.queryState.sortOrder === 'asc' ? '↑' : '↓';
            } else {
                header.dataset.sortActive = 'false';
                icon.textContent = '↕';
            }
        });
    }

    // ========== 选择功能 ==========
    updateSelectionCounter() {
        if (this.elements.selectionCounter) {
            this.elements.selectionCounter.textContent = `已勾选 ${this.app.selectedTalents.size} 位达人`;
        }
    }

    updateSelectAllOnPageCheckboxState() {
        if (!this.elements.selectAllOnPageCheckbox) return;

        const checkboxesOnPage = document.querySelectorAll('.talent-checkbox');

        if (checkboxesOnPage.length === 0) {
            this.elements.selectAllOnPageCheckbox.checked = false;
            this.elements.selectAllOnPageCheckbox.indeterminate = false;
            return;
        }

        const checkedCount = Array.from(checkboxesOnPage).filter(cb => cb.checked).length;

        if (checkedCount === 0) {
            this.elements.selectAllOnPageCheckbox.checked = false;
            this.elements.selectAllOnPageCheckbox.indeterminate = false;
        } else if (checkedCount === checkboxesOnPage.length) {
            this.elements.selectAllOnPageCheckbox.checked = true;
            this.elements.selectAllOnPageCheckbox.indeterminate = false;
        } else {
            this.elements.selectAllOnPageCheckbox.checked = false;
            this.elements.selectAllOnPageCheckbox.indeterminate = true;
        }
    }

    // ========== 工具方法 ==========
    stringToColor(str) {
        let hash = 0;
        if (!str) return '#e5e7eb';

        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }

        return color;
    }

    getTextColor(hexColor) {
        if (!hexColor) return '#000000';

        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    setLoadingState(isLoading) {
        if (!this.elements.talentListBody) return;

        if (isLoading) {
            this.elements.talentListBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-10">
                        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                            <span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

export default TableManager;
