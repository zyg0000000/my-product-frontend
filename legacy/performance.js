/**
 * @version 12.10-style-centering
 * @description
 * - [UI/UX优化] 在`renderTable`函数中增加了单元格对齐逻辑，除“达人昵称”列保持左对齐外，所有其他数据列均实现居中显示，提升了表格的可读性和美观度。
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const TALENT_SEARCH_ENDPOINT = '/talents/search';
    const TALENT_FILTER_OPTIONS_ENDPOINT = '/talents/filter-options';
    const TALENT_BULK_UPDATE_ENDPOINT = '/talents/bulk-update';
    const FEISHU_SYNC_ENDPOINT = '/sync-from-feishu';


    // --- DOM Elements ---
    const manageDimensionsBtn = document.getElementById('manage-dimensions-btn');
    const importExportBtn = document.getElementById('import-export-btn');
    const importExportDropdown = document.getElementById('import-export-dropdown');
    const dropdownImportExcelBtn = document.getElementById('dropdown-import-excel-btn');
    const dropdownFeishuImportBtn = document.getElementById('dropdown-feishu-import-btn');
    const dropdownExportAllBtn = document.getElementById('dropdown-export-all-btn');
    const importExcelInput = document.getElementById('import-excel-input');
    const performanceTableContainer = document.getElementById('performance-table-container');
    const paginationControls = document.getElementById('pagination-controls');
    const dimensionsModal = document.getElementById('dimensions-modal');
    const importConfirmModal = document.getElementById('import-confirm-modal');
    const importSummaryEl = document.getElementById('import-summary');
    const feishuImportModal = document.getElementById('feishu-import-modal');
    const closeFeishuModalBtn = document.getElementById('close-feishu-modal-btn');
    const confirmFeishuImportBtn = document.getElementById('confirm-feishu-import-btn');
    const feishuUrlInput = document.getElementById('feishu-url-input');
    const directSearchNickname = document.getElementById('direct-search-nickname');
    const directSearchXingtuId = document.getElementById('direct-search-xingtu-id');
    const directSearchUid = document.getElementById('direct-search-uid');
    const talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');
    const talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');
    const dataFiltersContainer = document.getElementById('data-filters-container');
    const addFilterBtn = document.getElementById('add-filter-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const advancedFiltersDetails = document.getElementById('advanced-filters-details');


    // --- State ---
    const ITEMS_PER_PAGE_KEY = 'performanceItemsPerPage';
    const DIMENSIONS_CONFIG_KEY = 'performanceDimensionsConfig';

    let dimensions = [];
    let displayedTalents = [];
    let totalTalents = 0;
    let talentTypes = [];
    let talentTiers = [];
    let dataFilters = [];
    let importDataCache = null;
    let currentPage = 1;
    let itemsPerPage = 20;
    let sortConfig = { key: 'lastUpdated', direction: 'desc' };
    let sortableInstance = null;

    // --- API Request & Utility ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
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

    const showCustomAlert = (message, title = '提示') => {
        modalTitleEl.textContent = title;
        modalMessageEl.innerHTML = message;
        modalConfirmBtn.textContent = '确定';
        modalConfirmBtn.onclick = () => { modal.classList.add('hidden'); };
        modalCancelBtn.style.display = 'none';
        modal.classList.remove('hidden');
    };

    // --- Initialization & Data Handling ---
    async function initializePage() {
        setupEventListeners();
        itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '20');
        loadDimensions();

        try {
            await loadAndRenderFilterOptions();
            await fetchAndRenderTalents();
        } catch (error) {
            console.error("Page initialization failed due to API error:", error);
        }
    }

    async function loadAndRenderFilterOptions() {
        try {
            const response = await apiRequest(TALENT_FILTER_OPTIONS_ENDPOINT);
            if (response.success && response.data) {
                talentTiers = response.data.tiers || [];
                talentTypes = response.data.types || [];
            }
        } catch (error) {
            console.error("加载筛选器选项失败:", error);
            talentTiers = [];
            talentTypes = [];
        } finally {
            renderFilterCheckboxes();
        }
    }

    function buildSearchPayload() {
        const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);

        const validDataFilters = dataFilters.filter(f =>
            f.dimension &&
            (f.operator === 'isEmpty' || f.operator === 'isNotEmpty' || (f.value !== '' && f.value !== undefined && f.value !== null))
        );

        const filters = validDataFilters.map(f => ({
            ...f,
            dimension: topLevelFields.has(f.dimension) ? f.dimension : `performanceData.${f.dimension}`
        }));

        return {
            page: currentPage,
            pageSize: itemsPerPage,
            search: directSearchNickname.value.trim() || directSearchXingtuId.value.trim() || directSearchUid.value.trim(),
            tiers: Array.from(talentTierFiltersContainer.querySelectorAll('input:checked')).map(cb => cb.value),
            types: Array.from(talentTypeFiltersContainer.querySelectorAll('input:checked')).map(cb => cb.value),
            sortBy: sortConfig.key,
            sortOrder: sortConfig.direction,
            filterLogic: document.querySelector('input[name="filter-logic"]:checked').value,
            filters: filters
        };
    }

    async function fetchAndRenderTalents() {
        const loadingIndicator = document.createElement('p');
        loadingIndicator.className = 'p-8 text-center text-gray-500';
        loadingIndicator.textContent = '正在加载数据...';
        performanceTableContainer.innerHTML = '';
        performanceTableContainer.appendChild(loadingIndicator);

        const payload = buildSearchPayload();

        try {
            const response = await apiRequest(TALENT_SEARCH_ENDPOINT, 'POST', payload);

            if (response.success && response.data) {
                if (!response.data.pagination) {
                    throw new Error("后端返回数据格式不兼容。请确认 getTalentsSearch 云函数已更新至 v8.2 或更高版本。");
                }

                displayedTalents = response.data.talents || [];
                totalTalents = response.data.pagination.totalItems || 0;
                renderTable(displayedTalents);
                renderDashboard(response.data.dashboardStats);

            } else {
                throw new Error(response.message || '返回数据格式不正确');
            }
        } catch (error) {
            performanceTableContainer.innerHTML = `<p class="p-8 text-center text-red-500">数据加载失败: ${error.message}</p>`;
            renderPagination(0, 0);
            renderDashboard(null);
        }
    }

    function loadDimensions() {
        const PRESET_DIMENSIONS = [
            // 基础信息
            { id: 'nickname', name: '达人昵称', type: 'text', required: true, visible: true, sortable: true, category: '基础信息' },
            { id: 'xingtuId', name: '达人星图ID', type: 'text', required: false, visible: false, sortable: false, category: '基础信息' },
            { id: 'uid', name: '达人UID', type: 'text', required: false, visible: false, sortable: false, category: '基础信息' },
            { id: 'talentTier', name: '达人层级', type: 'text', required: false, visible: true, sortable: true, category: '基础信息' },
            { id: 'talentType', name: '达人类型', type: 'text', required: false, visible: true, sortable: true, category: '基础信息' },
            
            // 核心绩效
            { id: 'cpm60s', name: '60s+预期CPM', type: 'number', visible: true, sortable: true, category: '核心绩效' },
            { id: 'lastUpdated', name: '更新日期', type: 'date', visible: true, sortable: true, category: '核心绩效' },
            
            // 核心受众
            { id: 'maleAudienceRatio', name: '男性观众比例', type: 'percentage', visible: true, sortable: true, category: '核心受众' },
            { id: 'femaleAudienceRatio', name: '女性观众比例', type: 'percentage', visible: true, sortable: true, category: '核心受众' },
            { id: 'audience_18_40_ratio', name: '18-40岁观众占比', type: 'percentage', visible: true, sortable: true, category: '核心受众' },
            { id: 'audience_40_plus_ratio', name: '40岁以上观众占比', type: 'percentage', visible: true, sortable: true, category: '核心受众' },

            // 年龄段粉丝比例
            { id: 'ratio_18_23', name: '18-23岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
            { id: 'ratio_24_30', name: '24-30岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
            { id: 'ratio_31_40', name: '31-40岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
            { id: 'ratio_41_50', name: '41-50岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
            { id: 'ratio_50_plus', name: '50岁以上', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
            
            // 人群包粉丝比例
            { id: 'ratio_town_middle_aged', name: '小镇中老年', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_senior_middle_class', name: '资深中产', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_z_era', name: 'Z世代', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_urban_silver', name: '都市银发', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_town_youth', name: '小镇青年', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_exquisite_mom', name: '精致妈妈', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_new_white_collar', name: '新锐白领', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
            { id: 'ratio_urban_blue_collar', name: '都市蓝领', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
        ];
        
        const savedConfig = JSON.parse(localStorage.getItem(DIMENSIONS_CONFIG_KEY));
        if (savedConfig) {
            const savedMap = new Map(savedConfig.map(d => [d.id, d]));
            const orderedDimensions = savedConfig.map(savedDim => {
                const presetDim = PRESET_DIMENSIONS.find(pd => pd.id === savedDim.id);
                return presetDim ? { ...presetDim, ...savedDim } : null;
            }).filter(Boolean);

            PRESET_DIMENSIONS.forEach(presetDim => {
                if (!savedMap.has(presetDim.id)) {
                    orderedDimensions.push(presetDim);
                }
            });
            dimensions = orderedDimensions;
        } else {
            dimensions = PRESET_DIMENSIONS;
        }
    }

    function saveDimensionsConfig() {
        const configToSave = dimensions.map(({ id, visible }) => ({ id, visible }));
        localStorage.setItem(DIMENSIONS_CONFIG_KEY, JSON.stringify(configToSave));
    }

    function renderTable(talentsToRender) {
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
            table.className = 'w-full text-sm text-gray-500'; // Removed text-left for global control
            const thead = document.createElement('thead');
            thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';
            
            let headerHtml = '<tr>';
            const visibleCols = dimensions.filter(d => d.visible);

            visibleCols.forEach(col => {
                const sortableClass = col.sortable ? 'sortable-header' : '';
                const headerAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
                const sortKey = col.id;
                let sortIcon = col.sortable ? `<span class="inline-flex flex-col ml-1"><svg class="w-3 h-3 ${sortConfig.key === sortKey && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l3 3-1.414 1.414L10 5.414 7.707 7.707 6.293 6.293 10 3z"/></svg><svg class="w-3 h-3 ${sortConfig.key === sortKey && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-3-3 1.414-1.414L10 14.586l2.293-2.293 1.414 1.414L10 17z"/></svg></span>` : '';
                headerHtml += `<th scope="col" class="px-6 py-3 ${sortableClass} ${headerAlign}" data-sort-key="${sortKey}"><div class="flex items-center ${col.id === 'nickname' ? '' : 'justify-center'}">${col.name} ${sortIcon}</div></th>`;
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);
            
            talentsToRender.forEach(talent => {
                const row = document.createElement('tr');
                row.className = 'border-b bg-white';
                
                visibleCols.forEach(col => {
                    const cell = document.createElement('td');
                    const cellAlign = col.id === 'nickname' ? 'text-left' : 'text-center';
                    cell.className = `px-6 py-4 ${cellAlign}`;

                    let cellValue = topLevelFields.has(col.id) ? talent[col.id] : (talent.performanceData ? talent.performanceData[col.id] : undefined);
                    let displayValue = (cellValue !== undefined && cellValue !== null) ? cellValue : 'N/A';

                    if (Array.isArray(displayValue)) displayValue = displayValue.join(', ');
                     else if (col.id === 'lastUpdated' && displayValue !== 'N/A') {
                        try {
                            displayValue = String(displayValue).split('T')[0];
                        } catch (e) { console.error("Could not parse date:", displayValue); }
                    } 
                    if (col.type === 'percentage' && !isNaN(parseFloat(displayValue))) {
                        displayValue = `${(parseFloat(displayValue) * 100).toFixed(2)}%`;
                    }
                    
                    if (col.id === 'nickname' && talent.xingtuId && talent.xingtuId !== 'N/A') {
                        cell.innerHTML = `<a href="https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.xingtuId}" target="_blank" class="text-blue-600 hover:underline">${displayValue}</a>`;
                    } else {
                        cell.textContent = displayValue;
                    }
                    row.appendChild(cell);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            performanceTableContainer.appendChild(table);
        }
        
        const totalPages = Math.ceil(totalTalents / itemsPerPage);
        renderPagination(totalPages, totalTalents);
    }
    
    function renderFilterCheckboxes() {
        talentTypeFiltersContainer.innerHTML = talentTypes.map(type => `<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" value="${type}" class="talent-type-checkbox rounded text-blue-600"><span class="text-sm text-gray-700">${type}</span></label>`).join('');
        talentTierFiltersContainer.innerHTML = talentTiers.map(tier => `<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" value="${tier}" class="talent-tier-checkbox rounded text-blue-600"><span class="text-sm text-gray-700">${tier}</span></label>`).join('');
        renderDataFilterRows();
    }

    function renderDataFilterRows() {
        dataFiltersContainer.innerHTML = '';
        const excludedIds = ['talentTier', 'talentType', 'lastUpdated', 'nickname', 'xingtuId', 'uid'];
        dataFilters.forEach((filter, index) => {
            const filterRow = document.createElement('div');
            filterRow.className = 'grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 bg-white rounded-md border';
            
            const dimensionOptions = dimensions
                .filter(d => !excludedIds.includes(d.id))
                .map(d => `<option value="${d.id}" ${d.id === filter.dimension ? 'selected' : ''}>${d.name}</option>`)
                .join('');
            
            const selectedDim = dimensions.find(d => d.id === filter.dimension) || {};
            let operatorOptions = (selectedDim.type === 'number' || selectedDim.type === 'percentage') 
                ? `<option value=">">&gt;</option><option value=">=">&ge;</option><option value="<">&lt;</option><option value="<=">&le;</option><option value="=">=</option><option value="!=">&ne;</option><option value="between">介于</option><option value="isEmpty">为空</option><option value="isNotEmpty">不为空</option>`
                : `<option value="=">等于</option><option value="!=">不等于</option><option value="contains">包含</option><option value="notContains">不包含</option><option value="isEmpty">为空</option><option value="isNotEmpty">不为空</option>`;
            
            const baseInputClasses = "block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 transition";

            let valueInputHtml = `<input type="text" class="${baseInputClasses} filter-value" data-index="${index}" value="${filter.value ?? ''}">`;
            if (filter.operator === 'between') {
                valueInputHtml = `<div class="flex items-center gap-2"><input type="number" class="${baseInputClasses} filter-value-min" data-index="${index}" value="${(filter.value || [])[0] ?? ''}"><span class="text-gray-500">-</span><input type="number" class="${baseInputClasses} filter-value-max" data-index="${index}" value="${(filter.value || [])[1] ?? ''}"></div>`;
            } else if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
                valueInputHtml = `<input type="text" class="${baseInputClasses} filter-value" data-index="${index}" value="" disabled>`;
            }

            filterRow.innerHTML = `<select class="${baseInputClasses} md:col-span-4 filter-dimension" data-index="${index}">${dimensionOptions}</select><select class="${baseInputClasses} md:col-span-3 filter-operator" data-index="${index}">${operatorOptions}</select><div class="md:col-span-4">${valueInputHtml}</div><button class="remove-filter-btn text-red-500 hover:bg-red-100 p-2 rounded-lg flex justify-center items-center md:col-span-1" data-index="${index}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`;
            dataFiltersContainer.appendChild(filterRow);
            filterRow.querySelector('.filter-operator').value = filter.operator;
        });
    }

    function renderPagination(totalPages, totalItems) {
        paginationControls.innerHTML = '';
        if (totalItems === 0) return;
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页:</span><select id="items-per-page" class="rounded-md border-gray-300 text-sm"><option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option><option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option><option value="30" ${itemsPerPage === 30 ? 'selected' : ''}>30</option><option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option></select><span class="ml-4 text-gray-600">共 ${totalItems} 条</span></div>`;
        const pageButtons = [];
        const maxButtons = 7;
        if (totalPages > 1) {
            if (totalPages <= maxButtons) { for (let i = 1; i <= totalPages; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`); } 
            else {
                pageButtons.push(`<button class="pagination-btn ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>`);
                let start = Math.max(2, currentPage - 2), end = Math.min(totalPages - 1, currentPage + 2);
                if (currentPage > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                for (let i = start; i <= end; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
                if (currentPage < totalPages - 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                pageButtons.push(`<button class="pagination-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
            }
        }
        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-2"><button id="prev-page-btn" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons.join('')}<button id="next-page-btn" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button></div>` : '<div></div>';
        paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }

    function renderDashboard(dashboardStats) {
        const elements = {
            total: document.getElementById('stat-total-talents'),
            tier: document.getElementById('stat-tier-distribution'),
            cpm: document.getElementById('stat-cpm-distribution'),
            male: document.getElementById('stat-male-audience-distribution'),
            female: document.getElementById('stat-female-audience-distribution')
        };
        const noDataHtml = '<p class="text-gray-400">暂无数据</p>';

        if(!elements.total) return; 
        elements.total.textContent = totalTalents;

        elements.tier.innerHTML = noDataHtml;
        elements.cpm.innerHTML = noDataHtml;
        elements.male.innerHTML = noDataHtml;
        elements.female.innerHTML = noDataHtml;
        
        if (!dashboardStats) return;

        if (dashboardStats.tierDistribution && dashboardStats.tierDistribution.length > 0) {
            elements.tier.innerHTML = dashboardStats.tierDistribution
                .map(item => `<div class="flex justify-between items-center text-sm"><span class="text-gray-600">${item.tier}</span><span class="font-semibold text-gray-800">${item.count}</span></div>`)
                .join('');
        }
        
        if (dashboardStats.cpmDistribution && dashboardStats.cpmDistribution.length > 0) {
            const cpmBoundaries = [0, 10, 15, 20, 30, Infinity];
            const cpmDataMap = new Map(dashboardStats.cpmDistribution.map(item => [item._id, item.count]));
            let cpmHtml = '';
            for (let i = 0; i < cpmBoundaries.length - 1; i++) {
                const lower = cpmBoundaries[i];
                const upper = cpmBoundaries[i+1];
                let label = (upper === Infinity) ? `${lower} 以上` : `${lower} - ${upper}`;
                if (i === 0) label = `${upper} 以下`;
                
                const count = cpmDataMap.get(lower) || 0;
                cpmHtml += `<div class="flex justify-between items-center text-sm"><span class="text-gray-600">${label}</span><span class="font-semibold text-gray-800">${count}</span></div>`;
            }
            elements.cpm.innerHTML = cpmHtml;
        }

        const renderAudienceDistribution = (container, data, boundaries) => {
            if(data && data.length > 0) {
                const dataMap = new Map(data.map(item => [item._id, item.count]));
                let html = '';
                 for (let i = boundaries.length - 2; i >= 0; i--) {
                    const lower = boundaries[i];
                    const upper = boundaries[i+1];
                     let label = `${Math.round(lower * 100)}% - ${Math.round(upper * 100)}%`;
                    if (i === boundaries.length - 2) label = `${Math.round(lower * 100)}% 以上`;
                    else if (i === 0) label = `${Math.round(upper * 100)}% 以下`;

                    const count = dataMap.get(lower) || 0;
                    html += `<div class="flex justify-between items-center text-sm"><span class="text-gray-600">${label}</span><span class="font-semibold text-gray-800">${count}</span></div>`;
                }
                container.innerHTML = html;
            }
        };
        
        const audienceBoundaries = [0, 0.4, 0.5, 0.6, 1.01];
        renderAudienceDistribution(elements.male, dashboardStats.maleAudienceDistribution, audienceBoundaries);
        renderAudienceDistribution(elements.female, dashboardStats.femaleAudienceDistribution, audienceBoundaries);
    }
    
    // --- Event Handlers ---
    function setupEventListeners() {
        if (manageDimensionsBtn) manageDimensionsBtn.addEventListener('click', renderDimensionsModal);
        if (importExportBtn) importExportBtn.addEventListener('click', () => importExportDropdown.classList.toggle('hidden'));
        if (dropdownImportExcelBtn) dropdownImportExcelBtn.addEventListener('click', (e) => { e.preventDefault(); importExcelInput.click(); importExportDropdown.classList.add('hidden'); });
        if (dropdownFeishuImportBtn) dropdownFeishuImportBtn.addEventListener('click', (e) => { e.preventDefault(); feishuImportModal.classList.remove('hidden'); importExportDropdown.classList.add('hidden'); });
        if (dropdownExportAllBtn) dropdownExportAllBtn.addEventListener('click', (e) => { e.preventDefault(); handleExportAll(); importExportDropdown.classList.add('hidden'); });
        
        document.addEventListener('click', (e) => {
            if (importExportBtn && !importExportBtn.contains(e.target) && importExportDropdown && !importExportDropdown.contains(e.target)) {
                importExportDropdown.classList.add('hidden');
            }
        });

        const setupSearchOnEnter = (element) => {
            if (element) {
                element.addEventListener('keyup', function(event) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        currentPage = 1;
                        fetchAndRenderTalents();
                    }
                });
            }
        };
        setupSearchOnEnter(directSearchNickname);
        setupSearchOnEnter(directSearchXingtuId);
        setupSearchOnEnter(directSearchUid);

        if (importExcelInput) importExcelInput.addEventListener('change', handleExcelImport);
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => { 
                currentPage = 1; 
                fetchAndRenderTalents();
                if (advancedFiltersDetails) advancedFiltersDetails.open = false;
            });
        }
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                resetAllFilters();
                if (advancedFiltersDetails) advancedFiltersDetails.open = false;
            });
        }
        if (addFilterBtn) addFilterBtn.addEventListener('click', addDataFilterRow);
        
        const saveDimBtn = document.getElementById('save-dimensions-settings-btn');
        if (saveDimBtn) saveDimBtn.addEventListener('click', handleSaveDimensions);
        
        const closeDimBtn = document.getElementById('close-dimensions-modal-btn');
        if (closeDimBtn) closeDimBtn.addEventListener('click', () => dimensionsModal.classList.add('hidden'));

        const confirmImportBtn = document.getElementById('confirm-import-btn');
        if (confirmImportBtn) confirmImportBtn.addEventListener('click', handleConfirmImport);

        const cancelImportBtn = document.getElementById('cancel-import-btn');
        if (cancelImportBtn) cancelImportBtn.addEventListener('click', () => importConfirmModal.classList.add('hidden'));
        
        if(closeFeishuModalBtn) closeFeishuModalBtn.addEventListener('click', () => feishuImportModal.classList.add('hidden'));
        if(confirmFeishuImportBtn) confirmFeishuImportBtn.addEventListener('click', handleFeishuUrlSubmit);

        if (dimensionsModal) {
             dimensionsModal.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('add-dim-btn')) {
                    const id = target.dataset.id;
                    const dim = dimensions.find(d => d.id === id);
                    if (dim) {
                        dim.visible = true;
                        renderDimensionsModal();
                    }
                } else if (target.classList.contains('remove-dim-btn')) {
                    const id = target.dataset.id;
                    const dim = dimensions.find(d => d.id === id);
                    if (dim && !dim.required) {
                        dim.visible = false;
                        renderDimensionsModal();
                    }
                }
            });
        }

        if (dataFiltersContainer) {
            dataFiltersContainer.addEventListener('change', handleDataFilterChange);
            dataFiltersContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-filter-btn');
                if (removeBtn) {
                    dataFilters.splice(removeBtn.dataset.index, 1);
                    renderDataFilterRows();
                }
            });
        }

        if (performanceTableContainer) {
            performanceTableContainer.addEventListener('click', (e) => {
                if (e.target.closest('.sortable-header')) handleSort(e.target.closest('.sortable-header'));
            });
        }
        
        if (paginationControls) {
            paginationControls.addEventListener('click', handlePaginationClick);
            paginationControls.addEventListener('change', (e) => {
                if (e.target.id === 'items-per-page') {
                    itemsPerPage = parseInt(e.target.value);
                    localStorage.setItem(ITEMS_PER_PAGE_KEY, itemsPerPage);
                    currentPage = 1;
                    fetchAndRenderTalents();
                }
            });
        }
    }

    // --- Excel & Feishu 导入功能模块 ---
    async function handleFeishuUrlSubmit() {
        const url = feishuUrlInput.value.trim();
        if (!url) {
            showCustomAlert('请输入飞书表格链接。');
            return;
        }

        feishuImportModal.classList.add('hidden');
        showCustomAlert('正在从飞书读取并处理数据，请稍候...', '处理中');

        try {
            const payload = {
                feishuUrl: url,
                dataType: 'talentPerformance'
            };
            
            const response = await apiRequest(FEISHU_SYNC_ENDPOINT, 'POST', payload);

            if (response.success && response.data && Array.isArray(response.data.data)) {
                 prepareAndShowConfirmationModal(response.data.data);
            } else {
                throw new Error(response.error || (response.data && response.data.message) || '从飞书获取或处理数据失败。');
            }

        } catch (error) {
            showCustomAlert(`飞书导入失败: ${error.message}`);
        }
    }

    async function handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        showCustomAlert('正在解析Excel文件，请稍候...', '文件处理中');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });

                const processedData = processExcelData(jsonData);
                prepareAndShowConfirmationModal(processedData.validData, processedData.invalidRows);

            } catch (error) {
                showCustomAlert(`文件解析失败: ${error.message}`);
            } finally {
                event.target.value = null;
            }
        };
        reader.onerror = () => {
             showCustomAlert('读取文件时发生错误。');
        };
        reader.readAsArrayBuffer(file);
    }
    
    function processExcelData(rows) {
        const validData = [];
        const invalidRows = [];

        rows.forEach(row => {
            const processedRow = { performanceData: {} };

            for (const excelHeader in row) {
                const mapping = COLUMN_MAP[excelHeader.trim()];
                let value = row[excelHeader];

                if (value === null || value === undefined || String(value).trim() === '') continue;
                
                if (mapping) {
                    try {
                        if (mapping.format === 'percentage') {
                            let numValue = parseFloat(String(value).replace('%',''));
                            if (!isNaN(numValue)) {
                                if (numValue > 1) {
                                    value = numValue / 100;
                                } else {
                                    value = numValue;
                                }
                            } else {
                                continue;
                            }
                        } else if (mapping.format === 'number') {
                            value = parseFloat(value);
                        }
                        
                        if (isNaN(value)) continue;
                        
                        if (mapping.type === 'top') {
                            processedRow[mapping.key] = String(value).trim();
                        } else if (mapping.type === 'performance') {
                            processedRow.performanceData[mapping.key] = value;
                        }
                    } catch { continue; }
                }
            }

            if (processedRow.xingtuId) {
                validData.push(processedRow);
            } else {
                invalidRows.push(row);
            }
        });
        return { validData, invalidRows };
    }

    function prepareAndShowConfirmationModal(validData, invalidRows = []) {
        const today = new Date().toISOString().split('T')[0];
        validData.forEach(row => {
            if (!row.performanceData) row.performanceData = {};
            row.performanceData.lastUpdated = today;
        });

        importDataCache = validData;
        modal.classList.add('hidden');
        
        if (validData.length === 0) {
            showCustomAlert('未找到任何包含有效“达人星图ID”的可更新数据。');
            return;
        }
        
        importSummaryEl.innerHTML = `
            <p>共解析到 <strong>${validData.length}</strong> 条可用于更新的数据。</p>
            <p class="text-sm mt-2">所有记录的“更新日期”都将设置为 <strong class="text-blue-600">${today}</strong>。</p>
            ${invalidRows.length > 0 ? `<p class="mt-2 text-yellow-600"><strong>${invalidRows.length}</strong> 条数据因缺少“达人星图ID”或有效更新内容而被忽略。</p>` : ''}
        `;
        importConfirmModal.classList.remove('hidden');
    }


    async function handleConfirmImport() {
        if (!importDataCache || importDataCache.length === 0) {
            showCustomAlert('没有可导入的数据。');
            return;
        }

        importConfirmModal.classList.add('hidden');
        showCustomAlert('正在上传并更新数据，请稍候...', '导入中');

        try {
            const response = await apiRequest(TALENT_BULK_UPDATE_ENDPOINT, 'PUT', { updates: importDataCache });
            
            if (response.success) {
                const { updated, failed, errors } = response.data;
                let resultMessage = `导入操作完成！<br>
                    <strong class="text-green-600">成功更新: ${updated} 条</strong><br>
                    <strong class="text-red-500">失败: ${failed} 条</strong>`;
                
                if (failed > 0 && errors && errors.length > 0) {
                    resultMessage += '<br><br>失败详情 (前5条):<ul>';
                    errors.slice(0, 5).forEach(err => {
                        resultMessage += `<li class="text-xs list-disc ml-4">ID: ${err.xingtuId} - ${err.reason}</li>`;
                    });
                    resultMessage += '</ul>';
                }

                showCustomAlert(resultMessage, '导入结果');
                await fetchAndRenderTalents();
            } else {
                 showCustomAlert(`导入失败: ${response.message}`);
            }

        } catch (error) {
            console.error('导入请求失败:', error);
        } finally {
            importDataCache = null;
        }
    }

    function renderDimensionsModal() {
        const availablePool = document.getElementById('available-dimensions-pool');
        const selectedList = document.getElementById('selected-dimensions-list');
        const selectedPlaceholder = document.getElementById('selected-placeholder');
        availablePool.innerHTML = '';
        selectedList.innerHTML = '';
    
        const selectedDimensions = dimensions.filter(d => d.visible);
        const availableDimensions = dimensions.filter(d => !d.visible);
    
        // Render Available Pool
        const groupedAvailable = availableDimensions.reduce((acc, dim) => {
            const category = dim.category || '其他';
            if (!acc[category]) acc[category] = [];
            acc[category].push(dim);
            return acc;
        }, {});

        for (const category in groupedAvailable) {
            const details = document.createElement('details');
            details.className = 'dimension-group border-b last:border-b-0';
            details.open = true;
    
            const summary = document.createElement('summary');
            summary.className = 'font-semibold text-gray-800 cursor-pointer p-2 hover:bg-gray-100 list-none flex justify-between items-center text-sm';
            summary.innerHTML = `<span>${category}</span><svg class="w-4 h-4 transform transition-transform details-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
            
            const content = document.createElement('div');
            content.className = 'p-2 grid grid-cols-1 gap-2';
            groupedAvailable[category].forEach(d => {
                content.innerHTML += `<div class="p-2 rounded-md bg-white border cursor-pointer hover:bg-blue-50 hover:border-blue-300 add-dim-btn text-sm" data-id="${d.id}">${d.name}</div>`;
            });

            details.appendChild(summary);
            details.appendChild(content);
            availablePool.appendChild(details);
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
                    ${d.required ? '' : `<button class="remove-dim-btn text-red-500 text-xl font-light leading-none" data-id="${d.id}">&times;</button>`}
                `;
                selectedList.appendChild(item);
            });
        } else {
             if(selectedPlaceholder) {
                selectedList.appendChild(selectedPlaceholder);
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
    
        dimensionsModal.classList.remove('hidden');
    }

    function handleSaveDimensions() {
        const newOrderedIds = [...document.querySelectorAll('#selected-dimensions-list .dimension-item')].map(el => el.dataset.id);
        
        const newDimensions = [];
        const addedIds = new Set();

        // Add selected items in their new order
        newOrderedIds.forEach(id => {
            const dim = dimensions.find(d => d.id === id);
            if (dim) {
                newDimensions.push({ ...dim, visible: true });
                addedIds.add(id);
            }
        });
        
        // Add unselected items, preserving their relative order
        dimensions.forEach(dim => {
            if (!addedIds.has(dim.id)) {
                newDimensions.push({ ...dim, visible: false });
            }
        });

        dimensions = newDimensions;
        saveDimensionsConfig();
        renderTable(displayedTalents);
        dimensionsModal.classList.add('hidden');
    }


    async function handleExportAll() {
        showCustomAlert('正在准备全量数据，请稍候...', '导出提示');

        const payload = { ...buildSearchPayload(), page: 1, pageSize: totalTalents || 9999 };

        try {
            const response = await apiRequest(TALENT_SEARCH_ENDPOINT, 'POST', payload);

            if (response.success && Array.isArray(response.data.talents)) {
                const talentsToExport = response.data.talents;
                const allDimensionsForExport = dimensions;

                const dataForSheet = talentsToExport.map(talent => {
                    const row = {};
                    const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);
                    allDimensionsForExport.forEach(dim => {
                        let value = topLevelFields.has(dim.id) ? talent[dim.id] : (talent.performanceData ? talent.performanceData[dim.id] : undefined);
                        
                        if (value === null || value === undefined) { value = ''; }
                        else if (dim.type === 'percentage' && !isNaN(parseFloat(value))) {
                            value = `${(parseFloat(value) * 100).toFixed(2)}%`;
                        } else if (dim.id === 'lastUpdated' && value) {
                            value = String(value).split('T')[0];
                        }
                        row[dim.name] = value;
                    });
                    return row;
                });

                const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, '达人数据');
                XLSX.writeFile(workbook, `达人库数据导出_${new Date().toISOString().slice(0,10)}.xlsx`);
                 modal.classList.add('hidden');
            } else {
                throw new Error('未能获取全部达人数据用于导出。');
            }
        } catch (error) {
            showCustomAlert(`导出失败: ${error.message}`);
        }
    }
    
    function handleSort(headerElement) {
        const key = headerElement.dataset.sortKey;
        if (sortConfig.key === key) {
            sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortConfig.key = key;
            sortConfig.direction = 'desc';
        }
        currentPage = 1;
        fetchAndRenderTalents();
    }

    function handlePaginationClick(e) {
        const target = e.target.closest('button');
        if (!target || target.disabled) return;
        const totalPages = Math.ceil(totalTalents / itemsPerPage);
        let newPage = currentPage;
        if (target.id === 'prev-page-btn') newPage--;
        else if (target.id === 'next-page-btn') newPage++;
        else if (target.dataset.page) newPage = Number(target.dataset.page);

        newPage = Math.max(1, Math.min(newPage, totalPages || 1));
        if (newPage !== currentPage) {
            currentPage = newPage;
            fetchAndRenderTalents();
        }
    }

    function handleDataFilterChange(e) {
        const target = e.target;
        const index = target.dataset.index;
        if (!index || !dataFilters[index]) return;
        const filter = dataFilters[index];

        if (target.classList.contains('filter-dimension')) {
            filter.dimension = target.value;
            filter.operator = '>';
            filter.value = '';
        } else if (target.classList.contains('filter-operator')) {
            filter.operator = target.value;
        } else if (target.classList.contains('filter-value')) {
            filter.value = target.value;
        } else if (target.classList.contains('filter-value-min') || target.classList.contains('filter-value-max')) {
            const min = target.parentElement.querySelector('.filter-value-min').value;
            const max = target.parentElement.querySelector('.filter-value-max').value;
            filter.value = [min, max];
        }
        renderDataFilterRows();
    }

    function addDataFilterRow() {
        const excludedIds = ['talentTier', 'talentType', 'lastUpdated', 'nickname', 'xingtuId', 'uid'];
        const defaultDim = dimensions.find(d => !excludedIds.includes(d.id));
        if (defaultDim) {
            dataFilters.push({ dimension: defaultDim.id, operator: '>', value: '' });
            renderDataFilterRows();
        } else {
            showCustomAlert('没有可供筛选的数据维度。');
        }
    }

    function resetAllFilters() {
        directSearchNickname.value = '';
        directSearchXingtuId.value = '';
        directSearchUid.value = '';
        if (talentTypeFiltersContainer) talentTypeFiltersContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
        if (talentTierFiltersContainer) talentTierFiltersContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
        dataFilters = [];
        currentPage = 1;
        renderDataFilterRows();
        fetchAndRenderTalents();
    }
    
    initializePage();
});

