/**
 * @file talent_selection.js
 * @version 2.9.4-price-type-ui-enhancement
 * @description
 * - [V2.9 新增] 在表格上方添加了"价格类型筛选器"，默认显示60s+档位价格，支持切换到20-60s和1-20s档位。
 * - [V2.9 重构] 严格按照选定类型显示价格，当该档位不存在时显示"没有"，不再fallback到其他类型。
 * - [V2.9 重构] 批量录入弹窗UI重新设计：将长下拉菜单改为"视频类型"+"价格时间"两步选择器，选择后自动显示对应价格。
 * - [V2.9 增强] 批量录入时如果所选类型+时间没有价格，会清晰地显示"没有此档位价格"（红色提示），防止误操作。
 * - [V2.9.4 修复] 修复批量录入联动失效问题：更新价格显示时保留price-display类名，确保后续querySelector能正确找到元素。
 * --- v2.7 ---
 * - [核心修复] 修正了`generateConfigurationsFromData`函数，为所有自定义数据维度（特别是新的粉丝画像比例）提供了正确的中文名称映射，解决了在"自定义显示列"弹窗中显示为英文ID的问题。
 * - [代码健壮性] 统一了与`performance.js`页面处理自定义列的逻辑，增强了代码的一致性和可维护性。
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

    // --- DOM Elements ---
    const targetProjectSelect = document.getElementById('target-project');
    const executionMonthInput = document.getElementById('execution-month');
    const enableScheduleFilter = document.getElementById('enable-schedule-filter');
    const scheduleFilterInputs = document.getElementById('schedule-filter-inputs');
    const scheduleStartDateInput = document.getElementById('schedule-start-date');
    const scheduleEndDateInput = document.getElementById('schedule-end-date');
    const scheduleLogicSelect = document.getElementById('schedule-logic');
    const tableContainer = document.getElementById('performance-table-container');
    const paginationControls = document.getElementById('pagination-controls');
    const selectionList = document.getElementById('selection-list');
    const selectionPlaceholder = document.getElementById('selection-placeholder');
    const selectionCountSpan = document.getElementById('selection-count');
    const addToProjectBtn = document.getElementById('add-to-project-btn');
    const batchImportModal = document.getElementById('batch-import-modal');
    const closeImportModalBtn = document.getElementById('close-import-modal-btn');
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const batchImportTableBody = document.getElementById('batch-import-table-body');
    const successModal = document.getElementById('success-modal');
    const successModalTitle = document.getElementById('success-modal-title');
    const successModalMessage = document.getElementById('success-modal-message');
    const closeSuccessModalBtn = document.getElementById('close-success-modal-btn');
    const goToProjectBtn = document.getElementById('go-to-project-btn');
    const directSearchNickname = document.getElementById('direct-search-nickname');
    const directSearchXingtuId = document.getElementById('direct-search-xingtu-id');
    const talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');
    const talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');
    const dataFiltersContainer = document.getElementById('data-filters-container');
    const addFilterBtn = document.getElementById('add-filter-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const customizeColsBtn = document.getElementById('customize-cols-btn');
    const columnsModal = document.getElementById('columns-modal');
    const closeColumnsModalBtn = document.getElementById('close-columns-modal-btn');
    const saveColumnsBtn = document.getElementById('save-columns-btn');
    const snapshotTotalBudget = document.getElementById('snapshot-total-budget');
    const snapshotUsedBudget = document.getElementById('snapshot-used-budget');
    const snapshotBudgetRate = document.getElementById('snapshot-budget-rate');
    const snapshotTalentCount = document.getElementById('snapshot-talent-count');
    const tablePriceTypeFilter = document.getElementById('table-price-type-filter');

    // --- State ---
    const ITEMS_PER_PAGE_KEY = 'talentSelectionItemsPerPage';
    const VISIBLE_COLUMNS_KEY = 'talentSelectionVisibleColumns';

    let allProjects = [];
    let allTalents = [];
    let allConfigurations = { talentTypes: [], talentTiers: [], dimensions: [] };
    let richTalentData = [];
    let displayedTalents = [];
    let selectedCollaborations = [];
    let currentPage = 1;
    let itemsPerPage = 15;
    let sortConfig = { key: 'cpm60s', direction: 'desc' };
    let dataFilters = [];
    let sortableInstance = null;
    let selectedPriceType = '60s_plus'; // [V2.9] 表格一口价显示档位

    // --- API Request & Utility Functions ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            showCustomAlert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
    modal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="modal-title-custom"></h3><div class="mt-2 py-3"><div class="text-sm text-gray-500" id="modal-message-custom"></div></div><div class="mt-4 flex justify-end space-x-2" id="modal-actions-custom"><button id="modal-cancel-custom" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button id="modal-confirm-custom" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
    document.body.appendChild(modal);
    const modalTitleEl = document.getElementById('modal-title-custom');
    const modalMessageEl = document.getElementById('modal-message-custom');
    const modalConfirmBtn = document.getElementById('modal-confirm-custom');
    const modalCancelBtn = document.getElementById('modal-cancel-custom');

    const showCustomAlert = (message, title = '提示', callback) => {
        modalTitleEl.textContent = title;
        modalMessageEl.innerHTML = message;
        modalConfirmBtn.textContent = '确定';
        modalConfirmBtn.onclick = () => { modal.classList.add('hidden'); if (callback) callback(true); };
        modalCancelBtn.style.display = 'none';
        modal.classList.remove('hidden');
    };
    
    // [V2.9 重构] 严格按照指定类型显示价格，不fallback到其他类型
    function getBestPrice(talent, requiredType = '60s_plus') {
        if (!talent.prices || talent.prices.length === 0 || !executionMonthInput.value) {
            return { value: '没有', isFallback: false, sortValue: -1 };
        }
        const [execYear, execMonth] = executionMonthInput.value.split('-').map(Number);

        // 严格筛选：仅查找指定类型的价格
        const typedPrices = talent.prices.filter(p => p.type === requiredType);

        if (typedPrices.length === 0) {
            return { value: '没有', isFallback: false, sortValue: -1 };
        }

        // 优先1: 当前月份 + 指定类型
        const currentMonthPrices = typedPrices.filter(p => p.year === execYear && p.month === execMonth);
        if (currentMonthPrices.length > 0) {
            const confirmedPrice = currentMonthPrices.find(p => p.status !== 'provisional');
            const selectedPrice = confirmedPrice || currentMonthPrices[0];
            return { value: selectedPrice.price, isFallback: false, sortValue: selectedPrice.price };
        }

        // 优先2: 最近月份 + 指定类型
        const sortedTypedPrices = typedPrices.sort((a, b) => (b.year - a.year) || (b.month - a.month));
        const latestPrice = sortedTypedPrices[0];
        const priceText = `¥ ${latestPrice.price.toLocaleString()} (${latestPrice.month}月)`;
        return { value: priceText, isFallback: true, sortValue: latestPrice.price };
    }

    function getBestPriceForSort(talent) {
        const priceInfo = getBestPrice(talent, selectedPriceType);
        return priceInfo.sortValue;
    }
    
    function populateProjectSelect() {
        targetProjectSelect.innerHTML = '<option value="">-- 请选择一个项目 --</option>';
        const activeProjects = allProjects.filter(p => p.status === '执行中' || !p.status);
        activeProjects.forEach(p => {
            targetProjectSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }
    
    function setDefaultExecutionMonth() {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const year = nextMonth.getFullYear();
        const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
        executionMonthInput.value = `${year}-${month}`;
    }

    async function initializePage() {
        itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '15');
        
        try {
            const [projectsRes, talentsRes] = await Promise.all([
                apiRequest('/projects?view=simple'),
                apiRequest('/talents'),
            ]);

            allProjects = projectsRes.data || [];
            allTalents = talentsRes.data || [];
            
            generateConfigurationsFromData(allTalents);
            initializeVisibleColumns();

            richTalentData = allTalents.map(talent => {
                const highestRebate = talent.rebates && talent.rebates.length > 0 ? Math.max(...talent.rebates.map(r => r.rate)) : 0;
                return {
                    ...talent,
                    highestRebate,
                    schedules: new Set(talent.schedules || [])
                };
            });

            populateProjectSelect();
            setDefaultExecutionMonth();
            renderFilterControls();
            resetProjectSnapshot();
            applyFiltersAndRender();
            setupEventListeners();

        } catch (error) {
            console.error("Initialization failed:", error);
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">页面初始化失败: ${error.message}</div>`;
        }
    }
    
    function generateConfigurationsFromData(talents) {
        const typeSet = new Set();
        const tierSet = new Set();
        const dimensionSet = new Set();

        talents.forEach(talent => {
            if (Array.isArray(talent.talentType)) {
                talent.talentType.forEach(type => type && typeSet.add(type));
            } else if (talent.talentType) {
                typeSet.add(talent.talentType);
            }
            if (talent.talentTier) {
                tierSet.add(talent.talentTier);
            }
            if (talent.performanceData) {
                Object.keys(talent.performanceData).forEach(key => dimensionSet.add(key));
            }
        });

        allConfigurations.talentTypes = Array.from(typeSet).sort().map(t => ({ name: t, value: t }));
        allConfigurations.talentTiers = Array.from(tierSet).sort().map(t => ({ name: t, value: t }));
        
        // [核心修复] 统一中文名称映射
        const displayNameMap = {
            'cpm60s': '60s+预期CPM',
            'audience_18_40_ratio': '18-40岁观众占比',
            'audience_40_plus_ratio': '40岁以上观众占比',
            'femaleAudienceRatio': '女性观众比例',
            'maleAudienceRatio': '男性观众比例',
            'lastUpdated': '更新日期',
            'ratio_18_23': '18-23岁',
            'ratio_24_30': '24-30岁',
            'ratio_31_40': '31-40岁',
            'ratio_41_50': '41-50岁',
            'ratio_50_plus': '50岁以上',
            'ratio_town_middle_aged': '小镇中老年',
            'ratio_senior_middle_class': '资深中产',
            'ratio_z_era': 'Z世代',
            'ratio_urban_silver': '都市银发',
            'ratio_town_youth': '小镇青年',
            'ratio_exquisite_mom': '精致妈妈',
            'ratio_new_white_collar': '新锐白领',
            'ratio_urban_blue_collar': '都市蓝领',
        };

        const percentageFields = new Set([
            'femaleAudienceRatio', 'maleAudienceRatio', 'audience_18_40_ratio', 'audience_40_plus_ratio',
            'ratio_18_23', 'ratio_24_30', 'ratio_31_40', 'ratio_41_50', 'ratio_50_plus',
            'ratio_town_middle_aged', 'ratio_senior_middle_class', 'ratio_z_era', 'ratio_urban_silver',
            'ratio_town_youth', 'ratio_exquisite_mom', 'ratio_new_white_collar', 'ratio_urban_blue_collar'
        ]);

        allConfigurations.dimensions = Array.from(dimensionSet).sort().map(id => ({
            id: id,
            name: displayNameMap[id] || id,
            type: percentageFields.has(id) ? 'percentage' : 'number',
            visible: ['cpm60s', 'femaleAudienceRatio', 'audience_18_40_ratio'].includes(id),
            required: false,
        }));
    }

    function initializeVisibleColumns() {
        const baseStructure = [
            { id: 'nickname', name: '达人昵称', visible: true, required: true },
            { id: 'price', name: '一口价', visible: true, required: true },
            { id: 'highestRebate', name: '最高返点率', visible: true, required: true },
            { id: 'talentTier', name: '达人层级', visible: true, required: true },
        ];
        
        const savedConfig = JSON.parse(localStorage.getItem(VISIBLE_COLUMNS_KEY));
        let fullDimensionList = [...baseStructure, ...allConfigurations.dimensions];

        if (savedConfig) {
            const savedMap = new Map(savedConfig.map(d => [d.id, d]));
            const orderedDimensions = savedConfig.map(savedDim => {
                const presetDim = fullDimensionList.find(pd => pd.id === savedDim.id);
                return presetDim ? { ...presetDim, visible: savedDim.visible } : null;
            }).filter(Boolean);

            fullDimensionList.forEach(presetDim => {
                if (!savedMap.has(presetDim.id)) {
                    orderedDimensions.push(presetDim);
                }
            });
            allConfigurations.dimensions = orderedDimensions;
        } else {
            allConfigurations.dimensions = fullDimensionList;
        }
    }


    function applyFiltersAndRender() {
        let filtered = [...richTalentData];

        if (enableScheduleFilter.checked && scheduleStartDateInput.value && scheduleEndDateInput.value) {
            const start = new Date(scheduleStartDateInput.value);
            const end = new Date(scheduleEndDateInput.value);
            const requiredDates = getDatesBetween(start, end);
            const logic = scheduleLogicSelect.value;
            if (requiredDates.length > 0) {
                filtered = filtered.filter(talent => {
                    const availableDates = requiredDates.filter(date => talent.schedules.has(formatDate(date)));
                    if (logic === 'ALL') return availableDates.length === requiredDates.length;
                    return availableDates.length > 0;
                });
            }
        }

        const nicknameQuery = directSearchNickname.value.toLowerCase().trim();
        const xingtuIdQuery = directSearchXingtuId.value.trim();
        if (nicknameQuery) filtered = filtered.filter(t => t.nickname.toLowerCase().includes(nicknameQuery));
        if (xingtuIdQuery) filtered = filtered.filter(t => t.xingtuId === xingtuIdQuery);

        const selectedTypes = Array.from(talentTypeFiltersContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selectedTypes.length > 0) {
            filtered = filtered.filter(t => Array.isArray(t.talentType) ? t.talentType.some(type => selectedTypes.includes(type)) : selectedTypes.includes(t.talentType));
        }
        
        const selectedTiers = Array.from(talentTierFiltersContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selectedTiers.length > 0) filtered = filtered.filter(t => selectedTiers.includes(t.talentTier));

        if (dataFilters.length > 0) {
            const logic = document.querySelector('input[name="filter-logic"]:checked').value;
            filtered = filtered.filter(talent => {
                const checkCondition = (filter) => {
                    const talentValue = filter.dimension === 'price'
                        ? getBestPriceForSort(talent)
                        : (talent.performanceData ? talent.performanceData[filter.dimension] : talent[filter.dimension]);
                    
                    const hasValue = talentValue !== undefined && talentValue !== null && talentValue !== '' && talentValue !== '未设置' && talentValue !== -1;
                    switch (filter.operator) {
                        case 'isEmpty': return !hasValue;
                        case 'isNotEmpty': return hasValue;
                    }
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
                if (logic === 'AND') return dataFilters.every(checkCondition);
                return dataFilters.some(checkCondition);
            });
        }

        displayedTalents = filtered;
        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        tableContainer.innerHTML = '';
        const sortKey = sortConfig.key;
        if (sortKey) {
            displayedTalents.sort((a, b) => {
                let valA, valB;
                const topLevelFields = ['nickname', 'talentTier', 'highestRebate'];

                if (sortKey === 'price') {
                    valA = getBestPriceForSort(a);
                    valB = getBestPriceForSort(b);
                } else if (topLevelFields.includes(sortKey)) {
                    valA = a[sortKey];
                    valB = b[sortKey];
                } else {
                    valA = (a.performanceData || {})[sortKey];
                    valB = (b.performanceData || {})[sortKey];
                }
                
                const aHasValue = !(valA === undefined || valA === null || valA === '' || valA === -1);
                const bHasValue = !(valB === undefined || valB === null || valB === '' || valB === -1);

                if (aHasValue && !bHasValue) return sortConfig.direction === 'asc' ? 1 : -1; 
                if (!aHasValue && bHasValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (!aHasValue && !bHasValue) return 0;
                
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);

                if (sortConfig.direction === 'asc') {
                    return numA - numB;
                } else {
                    return numB - numA;
                }
            });
        }

        const totalPages = Math.ceil(displayedTalents.length / itemsPerPage);
        currentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
        const paginatedTalents = displayedTalents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        if (paginatedTalents.length === 0) {
            tableContainer.innerHTML = `<p class="p-8 text-center text-gray-500">没有找到符合条件的达人。</p>`;
            renderPagination(totalPages);
            return;
        }

        const table = document.createElement('table');
        table.className = 'w-full text-sm text-gray-500 whitespace-nowrap';
        
        const visibleCols = allConfigurations.dimensions.filter(d => d.visible);
        const columns = [ { id: 'checkbox', name: '', sortable: false }, ...visibleCols, { id: 'scheduleMatch', name: '档期匹配度', sortable: false } ];

        let headerHtml = '<thead><tr class="text-xs text-gray-700 uppercase bg-gray-50">';
        columns.forEach(col => {
            const isSortable = col.sortable !== false && col.id !== 'checkbox' && col.id !== 'scheduleMatch';
            const headerAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
            let sortIcon = '';
            if (isSortable) {
                 sortIcon = `<span class="inline-flex flex-col ml-1"><svg class="w-3 h-3 ${sortConfig.key === col.id && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"/></svg><svg class="w-3 h-3 ${sortConfig.key === col.id && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"/></svg></span>`;
            }
            headerHtml += `<th scope="col" class="px-6 py-3 ${isSortable ? 'sortable-header' : ''} ${headerAlign}" data-sort-key="${col.id}"><div class="flex items-center ${col.id === 'nickname' ? '' : 'justify-center'}">${col.name}${sortIcon}</div></th>`;
        });
        headerHtml += '</tr></thead>';
        table.innerHTML = headerHtml;

        const tbody = document.createElement('tbody');
        paginatedTalents.forEach(talent => {
            const isSelected = selectedCollaborations.some(c => c.talent.id === talent.id);
            let row = document.createElement('tr');
            row.className = `bg-white border-b ${isSelected ? 'bg-blue-50' : ''}`;
            
            columns.forEach(col => {
                const cell = document.createElement('td');
                const cellAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
                cell.className = `px-6 py-4 ${cellAlign}`;
                let cellValue;

                switch(col.id) {
                    case 'checkbox':
                        cell.innerHTML = `<input type="checkbox" class="talent-checkbox rounded" data-talent-id="${talent.id}" ${isSelected ? 'checked' : ''}>`;
                        break;
                    case 'price':
                        const priceInfo = getBestPrice(talent, selectedPriceType);
                        if (priceInfo.value === '没有') {
                            cell.textContent = '没有';
                            cell.classList.add('text-gray-400', 'italic');
                        } else if (priceInfo.isFallback) {
                            cell.textContent = priceInfo.value;
                            cell.classList.add('text-gray-500', 'italic');
                        } else {
                            cell.textContent = typeof priceInfo.value === 'number' ? `¥ ${priceInfo.value.toLocaleString()}` : priceInfo.value;
                        }
                        break;
                    case 'highestRebate':
                        cell.textContent = `${talent.highestRebate}%`;
                        break;
                    case 'scheduleMatch':
                        cell.innerHTML = calculateScheduleMatch(talent);
                        break;
                    case 'nickname':
                        cellValue = talent[col.id];
                        cell.innerHTML = cellValue ? `<a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}" target="_blank" class="text-blue-600 hover:underline">${cellValue}</a>` : 'N/A';
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
                            cell.textContent = (cellValue !== undefined && cellValue !== null) ? (Array.isArray(cellValue) ? cellValue.join(', ') : cellValue) : 'N/A';
                        }
                }
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableContainer.appendChild(table);
        renderPagination(totalPages);
    }
    
    function renderPagination(totalPages) {
        paginationControls.innerHTML = '';
        if (totalPages <= 0) return;
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm"><option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option><option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option><option value="30" ${itemsPerPage === 30 ? 'selected' : ''}>30</option><option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option></select></div>`;
        const pageButtons = [];
        const maxButtons = 7;
        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
        } else {
            pageButtons.push(`<button class="pagination-btn ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>`);
            let start = Math.max(2, currentPage - 2), end = Math.min(totalPages - 1, currentPage + 2);
            if (currentPage > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
            for (let i = start; i <= end; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
            if (currentPage < totalPages - 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
            pageButtons.push(`<button class="pagination-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
        }
        const pageButtonsContainer = `<div class="flex items-center gap-2"><button class="pagination-btn prev-page-btn" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons.join('')}<button class="pagination-btn next-page-btn" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button></div>`;
        paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }
    
    function renderSelectionList() {
        selectionList.innerHTML = '';
        selectionPlaceholder.classList.toggle('hidden', selectedCollaborations.length > 0);
        
        const groupedByTalent = selectedCollaborations.reduce((acc, collab) => {
            if (!acc[collab.talent.id]) {
                acc[collab.talent.id] = [];
            }
            acc[collab.talent.id].push(collab);
            return acc;
        }, {});

        Object.values(groupedByTalent).forEach(collabGroup => {
            const talent = collabGroup[0].talent;
            const talentGroupEl = document.createElement('div');
            talentGroupEl.className = 'p-2 border-b';

            talentGroupEl.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}" target="_blank" class="text-sm font-bold text-blue-600 hover:underline">${talent.nickname}</a>
                    <button class="add-another-collab-btn text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-md" data-talent-id="${talent.id}">+ 添加合作</button>
                </div>
            `;

            collabGroup.forEach((collab, index) => {
                const item = document.createElement('div');
                item.className = 'selection-item flex justify-between items-center py-1';
                item.innerHTML = `
                    <div class="flex-grow flex items-center gap-2">
                        <span class="text-sm text-gray-600">合作 ${index + 1}:</span>
                    </div>
                    <button class="remove-selection-btn text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0" data-temp-id="${collab._tempId}">&times;</button>
                `;
                talentGroupEl.appendChild(item);
            });
            selectionList.appendChild(talentGroupEl);
        });

        selectionCountSpan.textContent = selectedCollaborations.length;
        addToProjectBtn.disabled = selectedCollaborations.length === 0;
    }
    
    function resetProjectSnapshot() {
        snapshotTotalBudget.textContent = '¥ 0';
        snapshotUsedBudget.textContent = '¥ 0';
        snapshotBudgetRate.textContent = '(0.00%)';
        snapshotTalentCount.textContent = '0 位';
    }

    async function renderProjectSnapshot(projectId) {
        if (!projectId) {
            resetProjectSnapshot();
            return;
        }
        try {
            const projectData = await apiRequest(`/projects?projectId=${projectId}`);
            const metrics = projectData.data.metrics || {};
            snapshotTotalBudget.textContent = `¥ ${(metrics.projectBudget || 0).toLocaleString()}`;
            snapshotUsedBudget.textContent = `¥ ${(metrics.totalIncome || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            snapshotBudgetRate.textContent = `(${(metrics.budgetUtilization || 0).toFixed(2)}%)`;
            snapshotTalentCount.textContent = `${metrics.totalCollaborators || 0} 位`;
        } catch(e) {
            console.error('Failed to fetch project snapshot', e);
            resetProjectSnapshot();
        }
    }

    function setupEventListeners() {
        applyFiltersBtn.addEventListener('click', applyFiltersAndRender);
        resetFiltersBtn.addEventListener('click', resetAllFilters);
        addFilterBtn.addEventListener('click', addDataFilterRow);
        dataFiltersContainer.addEventListener('click', e => {
            if (e.target.closest('.remove-filter-btn')) {
                dataFilters.splice(e.target.closest('.remove-filter-btn').dataset.index, 1);
                renderDataFilterRows();
            }
        });
        dataFiltersContainer.addEventListener('change', handleDataFilterChange);
        targetProjectSelect.addEventListener('change', () => {
            renderProjectSnapshot(targetProjectSelect.value);
            applyFiltersAndRender();
        });
        executionMonthInput.addEventListener('change', applyFiltersAndRender);
        tablePriceTypeFilter.addEventListener('change', () => {
            selectedPriceType = tablePriceTypeFilter.value;
            renderTable();
        });
        enableScheduleFilter.addEventListener('change', () => {
            const enabled = enableScheduleFilter.checked;
            scheduleFilterInputs.classList.toggle('opacity-50', !enabled);
            Array.from(scheduleFilterInputs.children).forEach(child => child.disabled = !enabled);
        });
        scheduleStartDateInput.addEventListener('change', applyFiltersAndRender);
        scheduleEndDateInput.addEventListener('change', applyFiltersAndRender);
        scheduleLogicSelect.addEventListener('change', applyFiltersAndRender);
        tableContainer.addEventListener('change', handleTableInteraction);
        tableContainer.addEventListener('click', handleSort);
        paginationControls.addEventListener('click', handlePaginationClick);
        paginationControls.addEventListener('change', handleItemsPerPageChange);
        addToProjectBtn.addEventListener('click', openBatchImportModal);
        closeImportModalBtn.addEventListener('click', () => batchImportModal.classList.add('hidden'));
        selectionList.addEventListener('click', handleSelectionListInteraction);
        confirmImportBtn.addEventListener('click', handleConfirmImport);
        closeSuccessModalBtn.addEventListener('click', () => successModal.classList.add('hidden'));
        customizeColsBtn.addEventListener('click', openColumnsModal);
        closeColumnsModalBtn.addEventListener('click', () => columnsModal.classList.add('hidden'));
        saveColumnsBtn.addEventListener('click', handleSaveColumns);

        // [V2.9 新增] 批量录入弹窗的事件委托
        batchImportTableBody.addEventListener('change', handleBatchModalChange);

        columnsModal.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('add-dim-btn')) {
                const id = target.dataset.id;
                const dim = allConfigurations.dimensions.find(d => d.id === id);
                if (dim) {
                    dim.visible = true;
                    openColumnsModal(); // Re-render the modal
                }
            } else if (target.closest('.remove-dim-btn')) {
                const id = target.closest('.remove-dim-btn').dataset.id;
                const dim = allConfigurations.dimensions.find(d => d.id === id);
                if (dim && !dim.required) {
                    dim.visible = false;
                    openColumnsModal(); // Re-render the modal
                }
            }
        });
    }

    // [V2.9 修改] 更新handleConfirmImport以适配新的批量录入UI
    async function handleConfirmImport() {
        const projectId = targetProjectSelect.value;
        const rows = batchImportTableBody.querySelectorAll('tr');
        const orderType = document.querySelector('input[name="batch-order-type"]:checked').value;

        let payloads = [];
        let allValid = true;
        let errorMessages = [];

        for (const row of rows) {
            const tempId = row.dataset.tempId;
            const collab = selectedCollaborations.find(c => c._tempId === tempId);
            if (!collab) continue;

            const priceData = row.querySelector('.price-data');
            const rebateSelect = row.querySelector('.rebate-select');
            const dateInput = row.querySelector('.planned-release-date-input');

            if (!priceData.value || !rebateSelect.value) {
                allValid = false;
                errorMessages.push(`${collab.talent.nickname}: 请选择有效的价格和返点率`);
                continue;
            }

            const priceObj = JSON.parse(priceData.value);

            // [V2.9 新增] 价格类型标签映射
            const priceTypeLabels = {
                '60s_plus': '60s+视频',
                '20_to_60s': '20-60s视频',
                '1_to_20s': '1-20s视频'
            };
            const typeLabel = priceTypeLabels[priceObj.type] || priceObj.type || '未知类型';

            payloads.push({
                projectId,
                talentId: collab.talent.id,
                amount: priceObj.price,
                priceInfo: `${priceObj.year}年${priceObj.month}月 - ${typeLabel}`,
                rebate: rebateSelect.value,
                plannedReleaseDate: dateInput.value || null,
                status: '待提报工作台',
                orderType: orderType
            });
        }

        if (!allValid) {
            showCustomAlert(errorMessages.join('<br>') || '请为所有合作选择有效的价格和返点率。');
            return;
        }

        if (payloads.length > 0) {
            try {
                const promises = payloads.map(payload => apiRequest('/collaborations', 'POST', payload));
                await Promise.all(promises);

                batchImportModal.classList.add('hidden');
                successModalTitle.textContent = "添加成功";
                successModalMessage.textContent = `已成功将 ${payloads.length} 次合作添加至项目。`;
                successModal.classList.remove('hidden');
                goToProjectBtn.href = `order_list.html?projectId=${projectId}`;
                selectedCollaborations = [];
                renderSelectionList();
                await renderProjectSnapshot(projectId);
                renderTable();
            } catch (error) {
                console.error("Failed to add collaborators:", error);
                showCustomAlert(`添加合作时发生错误: ${error.message}`);
            }
        }
    }
    
    function handleTableInteraction(e) {
        if (!e.target.classList.contains('talent-checkbox')) return;
        
        const talentId = e.target.dataset.talentId;
        const talent = richTalentData.find(t => t.id === talentId);
        if (!talent) return;

        if (e.target.checked) {
            addCollaborationToList(talent);
        } else {
            selectedCollaborations = selectedCollaborations.filter(c => c.talent.id !== talentId);
        }
        
        renderSelectionList();
        renderTable();
    }
    
    function handleSelectionListInteraction(e) {
        const removeButton = e.target.closest('.remove-selection-btn');
        const addButton = e.target.closest('.add-another-collab-btn');

        if (removeButton) {
            const tempId = removeButton.dataset.tempId;
            selectedCollaborations = selectedCollaborations.filter(c => c._tempId !== tempId);
            renderSelectionList();
            renderTable();
        }

        if (addButton) {
            const talentId = addButton.dataset.talentId;
            const talent = richTalentData.find(t => t.id === talentId);
            if(talent) {
                addCollaborationToList(talent);
                renderSelectionList();
            }
        }
    }

    function addCollaborationToList(talent) {
        const newCollab = {
            _tempId: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            talent: talent,
        };
        selectedCollaborations.push(newCollab);
    }

    function handlePaginationClick(e) {
        const target = e.target.closest('button');
        if (!target || target.disabled) return;
        if (target.classList.contains('prev-page-btn')) currentPage--;
        else if (target.classList.contains('next-page-btn')) currentPage++;
        else if (target.dataset.page) currentPage = Number(target.dataset.page);
        renderTable();
    }

    function handleItemsPerPageChange(e) {
        if (e.target.id === 'items-per-page') {
            itemsPerPage = parseInt(e.target.value);
            localStorage.setItem(ITEMS_PER_PAGE_KEY, itemsPerPage);
            currentPage = 1;
            renderTable();
        }
    }
    
    // [V2.9 重构] 批量录入弹窗 - 使用类型+时间选择器代替长dropdown
    function openBatchImportModal() {
        const projectId = targetProjectSelect.value;
        const execMonth = executionMonthInput.value;
        if (!projectId || !execMonth) {
            showCustomAlert('请先选择目标项目和预估执行月份。');
            return;
        }

        const [defaultYear, defaultMonth] = execMonth.split('-').map(Number);

        batchImportTableBody.innerHTML = '';
        selectedCollaborations.forEach((collab, index) => {
            const row = document.createElement('tr');
            row.dataset.tempId = collab._tempId;
            row.dataset.talentId = collab.talent.id;

            const rebateOptions = generateRebateOptions(collab.talent);

            // 生成年月选项
            const availableTimes = getAvailablePriceTimes(collab.talent);
            const timeOptions = availableTimes.length > 0
                ? availableTimes.map(t => `<option value="${t.year}-${t.month}" ${t.year === defaultYear && t.month === defaultMonth ? 'selected' : ''}>${t.year}年${t.month}月</option>`).join('')
                : '<option value="">无可用时间</option>';

            row.innerHTML = `
                <td class="p-2">${collab.talent.nickname} (合作 ${index + 1})</td>
                <td class="p-2"><input type="date" class="block w-full text-sm rounded-md border-gray-300 shadow-sm planned-release-date-input"></td>
                <td class="p-2">
                    <select class="block w-full text-sm rounded-md border-gray-300 shadow-sm price-type-select">
                        <option value="60s_plus">60s+视频</option>
                        <option value="20_to_60s">20-60s视频</option>
                        <option value="1_to_20s">1-20s视频</option>
                    </select>
                </td>
                <td class="p-2">
                    <select class="block w-full text-sm rounded-md border-gray-300 shadow-sm price-time-select">
                        ${timeOptions}
                    </select>
                </td>
                <td class="p-2">
                    <div class="price-display-container">
                        <input type="text" class="block w-full text-sm rounded-md border-gray-300 shadow-sm bg-gray-50 price-display" readonly value="请选择类型和时间">
                        <input type="hidden" class="price-data" value="">
                    </div>
                </td>
                <td class="p-2"><select class="block w-full text-sm rounded-md border-gray-300 shadow-sm rebate-select">${rebateOptions}</select></td>
            `;
            batchImportTableBody.appendChild(row);

            // 初始化价格显示
            updatePriceDisplay(row);
        });

        batchImportModal.classList.remove('hidden');
    }

    // [V2.9 新增] 获取达人的所有可用价格时间（去重）
    function getAvailablePriceTimes(talent) {
        if (!talent.prices || talent.prices.length === 0) return [];

        const timesSet = new Set();
        talent.prices.forEach(p => {
            timesSet.add(`${p.year}-${p.month}`);
        });

        return Array.from(timesSet)
            .map(timeStr => {
                const [year, month] = timeStr.split('-').map(Number);
                return { year, month };
            })
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }

    // [V2.9 新增] 处理批量录入弹窗中的选择变化
    function handleBatchModalChange(e) {
        if (e.target.classList.contains('price-type-select') || e.target.classList.contains('price-time-select')) {
            const row = e.target.closest('tr');
            updatePriceDisplay(row);
        }
    }

    // [V2.9 新增] 根据类型+时间选择更新价格显示
    function updatePriceDisplay(row) {
        const talentId = row.dataset.talentId;
        const talent = richTalentData.find(t => t.id === talentId);

        if (!talent) return;

        const typeSelect = row.querySelector('.price-type-select');
        const timeSelect = row.querySelector('.price-time-select');
        const priceDisplay = row.querySelector('.price-display');
        const priceData = row.querySelector('.price-data');

        if (!priceDisplay) return;

        const selectedType = typeSelect.value;
        const selectedTime = timeSelect.value;

        if (!selectedTime) {
            priceDisplay.value = '无可用价格';
            priceDisplay.className = 'price-display block w-full text-sm rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-400';
            priceData.value = '';
            return;
        }

        const [year, month] = selectedTime.split('-').map(Number);

        // 查找匹配的价格
        const matchingPrices = talent.prices.filter(p =>
            p.year === year && p.month === month && p.type === selectedType
        );

        if (matchingPrices.length === 0) {
            priceDisplay.value = '没有此档位价格';
            priceDisplay.className = 'price-display block w-full text-sm rounded-md border-red-300 shadow-sm bg-red-50 text-red-600';
            priceData.value = '';
        } else {
            const confirmedPrice = matchingPrices.find(p => p.status !== 'provisional');
            const selectedPrice = confirmedPrice || matchingPrices[0];
            const statusLabel = selectedPrice.status === 'provisional' ? '(暂定价)' : '(已确认)';

            priceDisplay.value = `¥ ${selectedPrice.price.toLocaleString()} ${statusLabel}`;
            priceDisplay.className = 'price-display block w-full text-sm rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-800 font-medium';
            priceData.value = JSON.stringify(selectedPrice);
        }
    }

    function handleSort(e) {
        const header = e.target.closest('.sortable-header');
        if (!header) return;
        const key = header.dataset.sortKey;
        if (sortConfig.key === key) {
            sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortConfig.key = key;
            sortConfig.direction = 'asc';
        }
        renderTable();
    }

    function openColumnsModal() {
        const availablePool = document.getElementById('ts-available-dimensions-pool');
        const selectedList = document.getElementById('ts-selected-dimensions-list');
        const selectedPlaceholder = document.getElementById('ts-selected-placeholder');
        availablePool.innerHTML = '';
        selectedList.innerHTML = '';

        const selectedDimensions = allConfigurations.dimensions.filter(d => d.visible && !d.required);
        const availableDimensions = allConfigurations.dimensions.filter(d => !d.visible && !d.required);

        // Render Available Pool
        if (availableDimensions.length > 0) {
            availableDimensions.forEach(d => {
                availablePool.innerHTML += `<div class="p-2 rounded-md bg-white border cursor-pointer hover:bg-blue-50 hover:border-blue-300 add-dim-btn text-sm" data-id="${d.id}">${d.name}</div>`;
            });
        } else {
             availablePool.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">无更多可选维度</p>`;
        }


        // Render Selected List
        if (selectedDimensions.length > 0) {
            if(selectedPlaceholder) selectedPlaceholder.classList.add('hidden');
            selectedDimensions.forEach(d => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-2 rounded-md bg-white border dimension-item';
                item.dataset.id = d.id;
                item.innerHTML = `
                    <div class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400 drag-handle" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        <span class="text-sm">${d.name}</span>
                    </div>
                    <button class="remove-dim-btn text-red-500 text-xl font-light leading-none" data-id="${d.id}">&times;</button>
                `;
                selectedList.appendChild(item);
            });
        } else {
             if(selectedPlaceholder) {
                selectedPlaceholder.classList.remove('hidden');
             }
        }

        if (sortableInstance) {
            sortableInstance.destroy();
        }
        sortableInstance = new Sortable(selectedList, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
        });
    
        columnsModal.classList.remove('hidden');
    }

    function handleSaveColumns() {
        const newOrderedIds = [...document.querySelectorAll('#ts-selected-dimensions-list .dimension-item')].map(el => el.dataset.id);
        
        const newDimensions = [];
        const addedIds = new Set();

        // First, add all required columns in their original order
        allConfigurations.dimensions.forEach(dim => {
            if (dim.required) {
                newDimensions.push({ ...dim, visible: true });
                addedIds.add(dim.id);
            }
        });
        
        // Then, add user-selected items in their new order
        newOrderedIds.forEach(id => {
            const dim = allConfigurations.dimensions.find(d => d.id === id);
            if (dim && !addedIds.has(dim.id)) {
                newDimensions.push({ ...dim, visible: true });
                addedIds.add(id);
            }
        });
        
        // Finally, add the rest of the unselected items
        allConfigurations.dimensions.forEach(dim => {
            if (!addedIds.has(dim.id)) {
                newDimensions.push({ ...dim, visible: false });
            }
        });

        allConfigurations.dimensions = newDimensions;
        
        const configToSave = allConfigurations.dimensions.map(({ id, visible }) => ({ id, visible }));
        localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(configToSave));
        
        renderTable();
        columnsModal.classList.add('hidden');
    }

    function renderFilterControls() {
        talentTypeFiltersContainer.innerHTML = allConfigurations.talentTypes.map(type => `<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" value="${type.value}" class="talent-type-checkbox rounded text-blue-600"><span class="text-sm">${type.name}</span></label>`).join('');
        talentTierFiltersContainer.innerHTML = allConfigurations.talentTiers.map(tier => `<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" value="${tier.value}" class="talent-tier-checkbox rounded text-blue-600"><span class="text-sm">${tier.name}</span></label>`).join('');
        renderDataFilterRows();
    }

    function renderDataFilterRows() {
        dataFiltersContainer.innerHTML = '';
        const filterableDimensions = allConfigurations.dimensions.filter(d => !d.required && d.id !== 'nickname');
        
        dataFilters.forEach((filter, index) => {
            const filterRow = document.createElement('div');
            filterRow.className = 'grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 bg-white rounded-md border';
            
            const dimensionOptions = [
                ...filterableDimensions
            ].map(d => `<option value="${d.id}" ${d.id === filter.dimension ? 'selected' : ''}>${d.name}</option>`).join('');

            const selectedDim = allConfigurations.dimensions.find(d => d.id === filter.dimension) || {};
            let operatorOptions = (selectedDim.type === 'number' || selectedDim.type === 'percentage') 
                ? `<option value=">">&gt;</option><option value=">=">&ge;</option><option value="<">&lt;</option><option value="<=">&le;</option><option value="=">=</option><option value="!=">&ne;</option><option value="between">介于</option><option value="isEmpty">为空</option><option value="isNotEmpty">不为空</option>`
                : `<option value="=">等于</option><option value="!=">不等于</option><option value="contains">包含</option><option value="notContains">不包含</option><option value="isEmpty">为空</option><option value="isNotEmpty">不为空</option>`;
            
            const baseInputClasses = "block w-full text-sm rounded-md border-gray-300 shadow-sm";
            let valueInputHtml = `<input type="text" class="${baseInputClasses} filter-value" data-index="${index}" value="${filter.value ?? ''}">`;
            if (filter.operator === 'between') {
                valueInputHtml = `<div class="flex items-center gap-2"><input type="number" class="${baseInputClasses} filter-value-min" data-index="${index}" value="${(filter.value || [])[0] ?? ''}"><span class="text-gray-500">-</span><input type="number" class="${baseInputClasses} filter-value-max" data-index="${index}" value="${(filter.value || [])[1] ?? ''}"></div>`;
            } else if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
                valueInputHtml = `<input type="text" class="${baseInputClasses} filter-value" data-index="${index}" value="" disabled>`;
            }

            filterRow.innerHTML = `<select class="${baseInputClasses} md:col-span-4 filter-dimension" data-index="${index}">${dimensionOptions}</select><select class="${baseInputClasses} md:col-span-3 filter-operator" data-index="${index}">${operatorOptions}</select><div class="md:col-span-4">${valueInputHtml}</div><button class="remove-filter-btn text-red-500 hover:bg-red-100 p-2 rounded-lg flex justify-center items-center" data-index="${index}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`;
            dataFiltersContainer.appendChild(filterRow);
            filterRow.querySelector('.filter-operator').value = filter.operator;
        });
    }
    
    function addDataFilterRow() {
        const defaultDim = allConfigurations.dimensions.find(d => !d.required);
        if (defaultDim) {
            dataFilters.push({ dimension: defaultDim.id, operator: '>', value: '' });
            renderDataFilterRows();
        }
    }

    function handleDataFilterChange(e) {
        const target = e.target;
        const index = target.dataset.index;
        if (!index) return;

        const filter = dataFilters[index];
        if (target.classList.contains('filter-dimension')) {
            filter.dimension = target.value;
            filter.value = '';
            renderDataFilterRows();
        } else if (target.classList.contains('filter-operator')) {
            filter.operator = target.value;
            renderDataFilterRows();
        } else if (target.classList.contains('filter-value')) {
            filter.value = target.value;
        } else if (target.classList.contains('filter-value-min') || target.classList.contains('filter-value-max')) {
            const min = dataFiltersContainer.querySelector(`.filter-value-min[data-index="${index}"]`).value;
            const max = dataFiltersContainer.querySelector(`.filter-value-max[data-index="${index}"]`).value;
            filter.value = [min, max];
        }
    }
    
    function resetAllFilters() {
        dataFilters = [];
        directSearchNickname.value = '';
        directSearchXingtuId.value = '';
        document.querySelectorAll('.talent-type-checkbox, .talent-tier-checkbox').forEach(cb => cb.checked = false);
        renderDataFilterRows();
        applyFiltersAndRender();
    }

    function getDatesBetween(startDate, endDate) {
        const dates = []; let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }

    function formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function calculateScheduleMatch(talent) {
        if (!scheduleStartDateInput.value || !scheduleEndDateInput.value) return '未设置日期';
        const requiredDates = getDatesBetween(new Date(scheduleStartDateInput.value), new Date(scheduleEndDateInput.value));
        if (requiredDates.length === 0) return '日期无效';
        const availableCount = requiredDates.filter(date => talent.schedules.has(formatDate(date))).length;
        if (availableCount === requiredDates.length) return `<span class="text-green-600 font-semibold">档期完全匹配</span>`;
        return `${availableCount} / ${requiredDates.length} 天有档期`;
    }
    
    function generatePriceOptions(talent) {
        let options = '<option value="">-- 请选择 --</option>';
        if (!talent.prices || talent.prices.length === 0) return options;

        const [execYear, execMonth] = executionMonthInput.value.split('-').map(Number);

        // [V2.8 新增] 价格类型标签映射
        const priceTypeLabels = {
            '60s_plus': '60s+视频',
            '20_to_60s': '20-60s视频',
            '1_to_20s': '1-20s视频'
        };

        // [V2.8 修改] 排序时考虑type字段
        const sortedPrices = [...talent.prices].sort((a, b) => {
            const aIsMatch = a.year === execYear && a.month === execMonth;
            const bIsMatch = b.year === execYear && b.month === execMonth;
            if (aIsMatch !== bIsMatch) return aIsMatch ? -1 : 1;

            // type排序：60s_plus > 20_to_60s > 1_to_20s
            if (aIsMatch && bIsMatch) {
                const typeOrder = { '60s_plus': 0, '20_to_60s': 1, '1_to_20s': 2 };
                const aTypeOrder = typeOrder[a.type] ?? 99;
                const bTypeOrder = typeOrder[b.type] ?? 99;
                if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
            }

            if (a.status !== b.status) return a.status === 'provisional' ? 1 : -1;
            return (b.year - a.year) || (b.month - a.month);
        });

        return options + sortedPrices.map(p => {
            const isExecMonthMatch = p.year === execYear && p.month === execMonth;
            const prefix = isExecMonthMatch ? '⭐️ ' : '';
            const statusLabel = p.status === 'provisional' ? '(暂定价)' : '(已确认)';
            const typeLabel = priceTypeLabels[p.type] || p.type || '未知类型';
            const optionText = `${prefix}${p.year}年${p.month}月 - ${typeLabel}: ¥ ${p.price.toLocaleString()} ${statusLabel}`;
            const optionValue = JSON.stringify(p);
            return `<option value='${optionValue}'>${optionText}</option>`;
        }).join('');
    }

    function generateRebateOptions(talent) {
        if (!talent.rebates || talent.rebates.length === 0) return '<option value="">无</option>';
        let options = '<option value="">--</option>';
        options += talent.rebates.map(r => 
            `<option value="${r.rate}">${r.rate}%</option>`
        ).join('');
        return options;
    }

    initializePage();
});

