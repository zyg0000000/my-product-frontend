/**
 * table-manager.js - 表格管理模块
 * 基于 talent_pool.js v6.2.1 - 完整迁移3档价格类型显示
 */

import { stringToColor, getTextColor, PRICE_TYPES } from './utils.js';

export class TableManager {
    constructor(app) {
        this.app = app;
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.populateFilterCheckboxes();
    }

    cacheElements() {
        this.elements = {
            tableBody: document.getElementById('talent-list-body'),
            tableHeader: document.querySelector('table thead'),
            searchInput: document.getElementById('search-input'),
            paginationControls: document.getElementById('pagination-controls'),
            selectAllOnPageCheckbox: document.getElementById('select-all-on-page'),
            selectionCounter: document.getElementById('selection-counter'),
            actionBar: document.getElementById('action-bar'),
            noTalentsMessage: document.getElementById('no-talents-message'),
            filterTierCheckboxes: document.getElementById('filter-tier-checkboxes'),
            filterTypeCheckboxes: document.getElementById('filter-type-checkboxes'),
            filterPriceMonth: document.getElementById('filter-price-month'),
            filterPriceType: document.getElementById('filter-price-type'),
            filterRebateMin: document.getElementById('filter-rebate-min'),
            filterRebateMax: document.getElementById('filter-rebate-max'),
            filterPriceMin: document.getElementById('filter-price-min'),
            filterPriceMax: document.getElementById('filter-price-max'),
            applyFiltersBtn: document.getElementById('apply-filters-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn')
        };
    }

    bindEvents() {
        // 搜索
        this.elements.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.app.queryState.search = e.target.value.trim();
                this.app.queryState.page = 1;
                this.app.fetchTalents();
            }
        });

        // 排序
        this.elements.tableHeader?.addEventListener('click', (e) => this.handleSort(e));

        // 全选
        this.elements.selectAllOnPageCheckbox?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.talent-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const talentId = cb.dataset.id;
                if (e.target.checked) {
                    this.app.selectedTalents.add(talentId);
                } else {
                    this.app.selectedTalents.delete(talentId);
                }
            });
            this.updateSelectionCounter();
        });

        // 表格行点击
        this.elements.tableBody?.addEventListener('click', (e) => this.handleTableClick(e));

        // 筛选器
        this.elements.applyFiltersBtn?.addEventListener('click', () => this.applyFilters());
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
    }

    handleTableClick(e) {
        const target = e.target;
        const talentId = target.dataset.id;
        if (!talentId) return;

        console.log('[TableManager Debug] 点击按钮:', target.className, ', talentId:', talentId);

        if (target.classList.contains('talent-checkbox')) {
            if (target.checked) {
                this.app.selectedTalents.add(talentId);
            } else {
                this.app.selectedTalents.delete(talentId);
            }
            this.updateSelectionCounter();
            this.updateSelectAllOnPageCheckboxState();
        }
        else if (target.classList.contains('edit-btn')) {
            this.app.crudModal?.open(talentId);
        }
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
        else if (target.classList.contains('price-btn')) {
            this.app.priceModal?.open(talentId);
        }
        else if (target.classList.contains('rebate-btn')) {
            this.app.rebateModal?.open(talentId);
        }
        else if (target.classList.contains('history-btn')) {
            this.app.historyModal?.open(talentId);
        }
    }

    render(talents, pagination) {
        this.renderTable(talents);
        this.renderPagination(pagination.totalPages, pagination.totalItems);
        this.updateSelectionCounter();
        this.updateSortIcons();
    }

    renderTable(talentsToRender) {
        if (!this.elements.tableBody) return;
        this.elements.tableBody.innerHTML = '';
        const tableContainer = this.elements.tableBody.closest('.overflow-x-auto')?.parentElement;
        if (!tableContainer) return;

        if (talentsToRender.length === 0) {
            tableContainer.classList.add('hidden');
            if (this.elements.actionBar) this.elements.actionBar.classList.add('hidden');
            if (this.app.totalFilteredItems === 0) {
                if (this.elements.noTalentsMessage) this.elements.noTalentsMessage.classList.remove('hidden');
            } else {
                if (this.elements.noTalentsMessage) this.elements.noTalentsMessage.classList.add('hidden');
                this.elements.tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-gray-500">未找到匹配的达人。</td></tr>`;
                tableContainer.classList.remove('hidden');
            }
        } else {
            if (this.elements.noTalentsMessage) this.elements.noTalentsMessage.classList.add('hidden');
            tableContainer.classList.remove('hidden');
            if (this.app.totalFilteredItems > 0 && this.elements.actionBar) {
                this.elements.actionBar.classList.remove('hidden');
            }

            talentsToRender.forEach(talent => {
                const row = this.createTableRow(talent);
                this.elements.tableBody.appendChild(row);
            });
        }
        this.updateSelectAllOnPageCheckboxState();
    }

    createTableRow(talent) {
        const isSelected = this.app.selectedTalents.has(talent.id);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // ========== [V6.2.1 关键] 3档价格类型显示逻辑 ==========
        let priceDisplay = '<div class="text-gray-400 text-sm">暂无价格</div>';
        const currentPrices = (talent.prices || []).filter(p => p.year === currentYear && p.month === currentMonth);

        if (currentPrices.length > 0 || true) {
            const priceElements = PRICE_TYPES.map(type => {
                const price = currentPrices.find(p => p.type === type.key);
                if (!price) {
                    return '<div class="flex items-center gap-2"><span class="talent-type-tag" style="background-color:#e5e7eb; color:#6b7280;">' + type.label + '</span><span class="text-gray-400 text-sm">N/A</span></div>';
                }
                const priceText = '¥ ' + price.price.toLocaleString();
                const bgColor = price.status === 'provisional' ? '#fef3c7' : type.bgColor;
                const textColor = price.status === 'provisional' ? '#92400e' : type.textColor;
                const statusMark = price.status === 'provisional' ? ' *' : '';
                return '<div class="flex items-center gap-2"><span class="talent-type-tag" style="background-color:' + bgColor + '; color:' + textColor + ';">' + type.label + '</span><span class="text-gray-900 text-sm font-medium">' + priceText + statusMark + '</span></div>';
            });
            priceDisplay = priceElements.join('');
        }

        // 返点显示
        let rebatesHtml = 'N/A';
        if (talent.rebates && talent.rebates.length > 0) {
            const sortedRebates = [...talent.rebates].sort((a, b) => a.rate - b.rate);
            const allRebatesString = sortedRebates.map(r => r.rate + '%').join(', ');

            if (sortedRebates.length > this.app.REBATE_DISPLAY_LIMIT) {
                const visibleRebates = sortedRebates.slice(0, this.app.REBATE_DISPLAY_LIMIT).map(r => r.rate + '%').join(', ');
                rebatesHtml = '<div class="relative group cursor-pointer"><span>' + visibleRebates + '...</span><div class="absolute bottom-full mb-2 w-max hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 shadow-lg">' + allRebatesString + '</div></div>';
            } else {
                rebatesHtml = allRebatesString;
            }
        }

        // 标签显示
        let typesCellContent;
        if (talent.talentType && Array.isArray(talent.talentType) && talent.talentType.length > 0) {
            typesCellContent = talent.talentType.map(type => {
                const color = stringToColor(type);
                const textColor = getTextColor(color);
                return '<span class="talent-type-tag" style="background-color:' + color + '; color:' + textColor + ';">' + type + '</span>';
            }).join(' ');
        } else {
            typesCellContent = 'N/A';
        }

        const row = document.createElement('tr');
        row.className = 'bg-white' + (isSelected ? ' table-row-selected' : '');
        row.innerHTML = `
            <td class="px-4 py-4 text-center text-sm text-gray-500"><input type="checkbox" class="talent-checkbox h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" data-id="${talent.id}" ${isSelected ? 'checked' : ''}></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${talent.nickname}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline"><a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}" target="_blank" rel="noopener noreferrer">${talent.xingtuId}</a></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${talent.uid || 'N/A'}</td>
            <td class="px-6 py-4 text-sm text-gray-500"><div class="flex flex-col gap-1">${priceDisplay}</div></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rebatesHtml}</td>
            <td class="px-6 py-4 text-sm text-gray-500"><div class="flex flex-wrap gap-1 items-center">${typesCellContent}</div></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${talent.talentTier || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                <button data-id="${talent.id}" class="price-btn text-purple-600 hover:text-purple-900">一口价</button>
                <button data-id="${talent.id}" class="rebate-btn text-green-600 hover:text-green-900">返点</button>
                <button data-id="${talent.id}" class="history-btn text-gray-600 hover:text-gray-900">历史</button>
                <button data-id="${talent.id}" class="edit-btn text-blue-600 hover:text-blue-900">编辑</button>
                <button data-id="${talent.id}" class="delete-btn text-red-600 hover:text-red-900">删除</button>
            </td>`;
        return row;
    }

    renderPagination(totalPages, totalItems) {
        if (!this.elements.paginationControls) return;
        this.elements.paginationControls.innerHTML = '';
        if (totalItems === 0) return;

        const summary = '<div class="text-sm text-gray-700">共 ' + totalItems + ' 条记录</div>';
        const perPageOptions = [10,15,20,30,50].map(v => '<option value="' + v + '" ' + (this.app.queryState.pageSize === v ? 'selected' : '') + '>' + v + '</option>').join('');
        const perPageSelector = '<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">' + perPageOptions + '</select></div>';

        const pageButtons = [];
        const maxButtons = 7;
        const currentPageNum = this.app.queryState.page;
        if (totalPages > 1) {
            if (totalPages <= maxButtons) {
                for (let i = 1; i <= totalPages; i++) {
                    pageButtons.push('<button class="pagination-btn ' + (i === currentPageNum ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>');
                }
            } else {
                pageButtons.push('<button class="pagination-btn ' + (1 === currentPageNum ? 'active' : '') + '" data-page="1">1</button>');
                let start = Math.max(2, currentPageNum - 2), end = Math.min(totalPages - 1, currentPageNum + 2);
                if (currentPageNum > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                if (currentPageNum <= 4) end = 5;
                if (currentPageNum >= totalPages - 3) start = totalPages - 4;
                for (let i = start; i <= end; i++) {
                    pageButtons.push('<button class="pagination-btn ' + (i === currentPageNum ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>');
                }
                if (totalPages - currentPageNum > 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                pageButtons.push('<button class="pagination-btn ' + (totalPages === currentPageNum ? 'active' : '') + '" data-page="' + totalPages + '">' + totalPages + '</button>');
            }
        }
        const pageButtonsContainer = totalPages > 1 ? '<div class="flex items-center gap-1"><button id="prev-page" class="pagination-btn" ' + (currentPageNum === 1 ? 'disabled' : '') + '>&lt;</button>' + pageButtons.join('') + '<button id="next-page" class="pagination-btn" ' + (currentPageNum === totalPages ? 'disabled' : '') + '>&gt;</button></div>' : '';

        this.elements.paginationControls.innerHTML = '<div class="flex-1">' + perPageSelector + '</div><div class="flex items-center gap-4">' + summary + pageButtonsContainer + '</div>';

        // 绑定分页事件
        document.getElementById('items-per-page')?.addEventListener('change', (e) => {
            this.app.queryState.pageSize = parseInt(e.target.value);
            this.app.queryState.page = 1;
            localStorage.setItem(this.app.ITEMS_PER_PAGE_KEY, e.target.value);
            this.app.fetchTalents();
        });

        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.app.queryState.page > 1) {
                this.app.queryState.page--;
                this.app.fetchTalents();
            }
        });

        document.getElementById('next-page')?.addEventListener('click', () => {
            if (this.app.queryState.page < totalPages) {
                this.app.queryState.page++;
                this.app.fetchTalents();
            }
        });

        document.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.app.queryState.page = parseInt(btn.dataset.page);
                this.app.fetchTalents();
            });
        });
    }

    populateFilterCheckboxes() {
        if (!this.elements.filterTierCheckboxes || !this.elements.filterTypeCheckboxes || !this.elements.filterPriceMonth) return;

        this.elements.filterTierCheckboxes.innerHTML = '';
        Array.from(this.app.talentTiers).sort().forEach(tier => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = '<input type="checkbox" value="' + tier + '" class="filter-checkbox rounded text-blue-600 focus:ring-blue-500"><span class="text-sm text-gray-700">' + tier + '</span>';
            this.elements.filterTierCheckboxes.appendChild(label);
        });

        this.elements.filterTypeCheckboxes.innerHTML = '';
        Array.from(this.app.talentTypes).sort().forEach(type => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = '<input type="checkbox" value="' + type + '" class="filter-checkbox rounded text-blue-600 focus:ring-blue-500"><span class="text-sm text-gray-700">' + type + '</span>';
            this.elements.filterTypeCheckboxes.appendChild(label);
        });

        this.elements.filterPriceMonth.innerHTML = '<option value="">选择月份</option>';
        const today = new Date();
        for(let i = -3; i < 6; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            this.elements.filterPriceMonth.innerHTML += '<option value="' + year + '-' + month + '">' + year + '年' + month + '月</option>';
        }
    }

    applyFilters() {
        const tierCheckboxes = this.elements.filterTierCheckboxes?.querySelectorAll('input:checked');
        const typeCheckboxes = this.elements.filterTypeCheckboxes?.querySelectorAll('input:checked');

        this.app.queryState.tiers = tierCheckboxes ? Array.from(tierCheckboxes).map(cb => cb.value) : [];
        this.app.queryState.types = typeCheckboxes ? Array.from(typeCheckboxes).map(cb => cb.value) : [];

        const priceMonthValue = this.elements.filterPriceMonth?.value;
        if (priceMonthValue) {
            const [year, month] = priceMonthValue.split('-').map(Number);
            this.app.queryState.priceYear = year;
            this.app.queryState.priceMonth = month;
        } else {
            this.app.queryState.priceYear = null;
            this.app.queryState.priceMonth = null;
        }

        this.app.queryState.priceType = this.elements.filterPriceType?.value || null;
        this.app.queryState.rebateMin = parseFloat(this.elements.filterRebateMin?.value) || null;
        this.app.queryState.rebateMax = parseFloat(this.elements.filterRebateMax?.value) || null;
        this.app.queryState.priceMin = parseFloat(this.elements.filterPriceMin?.value) || null;
        this.app.queryState.priceMax = parseFloat(this.elements.filterPriceMax?.value) || null;

        this.app.queryState.page = 1;
        this.app.fetchTalents();
    }

    clearFilters() {
        if (this.elements.filterTierCheckboxes) {
            this.elements.filterTierCheckboxes.querySelectorAll('input').forEach(cb => cb.checked = false);
        }
        if (this.elements.filterTypeCheckboxes) {
            this.elements.filterTypeCheckboxes.querySelectorAll('input').forEach(cb => cb.checked = false);
        }
        if (this.elements.filterPriceMonth) this.elements.filterPriceMonth.value = '';
        if (this.elements.filterPriceType) this.elements.filterPriceType.value = '';
        if (this.elements.filterRebateMin) this.elements.filterRebateMin.value = '';
        if (this.elements.filterRebateMax) this.elements.filterRebateMax.value = '';
        if (this.elements.filterPriceMin) this.elements.filterPriceMin.value = '';
        if (this.elements.filterPriceMax) this.elements.filterPriceMax.value = '';

        this.app.queryState.tiers = [];
        this.app.queryState.types = [];
        this.app.queryState.priceYear = null;
        this.app.queryState.priceMonth = null;
        this.app.queryState.priceType = null;
        this.app.queryState.rebateMin = null;
        this.app.queryState.rebateMax = null;
        this.app.queryState.priceMin = null;
        this.app.queryState.priceMax = null;
        this.app.queryState.page = 1;

        this.app.fetchTalents();
    }

    handleSort(e) {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortBy = header.dataset.sort;
        if (this.app.queryState.sortBy === sortBy) {
            this.app.queryState.sortOrder = this.app.queryState.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.app.queryState.sortBy = sortBy;
            this.app.queryState.sortOrder = 'asc';
        }

        this.app.fetchTalents();
    }

    updateSortIcons() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === this.app.queryState.sortBy) {
                header.classList.add(this.app.queryState.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    updateSelectionCounter() {
        if (this.elements.selectionCounter) {
            this.elements.selectionCounter.textContent = '已勾选 ' + this.app.selectedTalents.size + ' 位达人';
        }
    }

    updateSelectAllOnPageCheckboxState() {
        if (!this.elements.selectAllOnPageCheckbox) return;
        const checkboxesOnPage = document.querySelectorAll('.talent-checkbox');
        if(checkboxesOnPage.length === 0) {
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

    setLoadingState(isLoading) {
        if (!this.elements.tableBody) return;
        if (isLoading) {
            this.elements.tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-10"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"><span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span></div></td></tr>';
        }
    }

    showError(message) {
        if (this.elements.tableBody) {
            this.elements.tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-10 text-red-500">' + message + '</td></tr>';
        }
    }
}
