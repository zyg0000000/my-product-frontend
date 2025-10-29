/**
 * @file talent_pool.js
 * @version 6.0-api-upgrade
 * @description
 * - [架构升级] 重写了数据请求逻辑，以适配 getTalentsSearch v8.2 版本的后端接口。
 * - [API调用] `fetchAndRenderTalents` 现在使用 POST 方法，并发送结构化的JSON查询体。
 * - [查询构建] 新增 `buildSearchPayload` 函数，用于将 `queryState` 中的筛选条件转换为符合新版API要求的JSON对象。
 * - [兼容性] 保留了所有原有的前端UI交互和功能逻辑，仅替换了底层的API通信方式。
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const API_PATHS = {
        search: '/talents/search',
        delete: '/delete-talent',
        createSingle: '/talents',
        updateSingle: '/update-talent',
        getByIds: '/talents/by-ids',
        bulkCreate: '/talents/bulk-create',
        bulkUpdate: '/talents/bulk-update',
        batchUpdate: '/talents/batch-update',
        exportAll: '/talents/export-all',
        getProjects: '/projects?view=simple',
        getCollaborations: '/collaborations?allowGlobal=true',
        getFilterOptions: '/talents/filter-options'
    };

    // --- DOM Elements ---
    const tableHeader = document.querySelector('table thead');
    const exportAllBtn = document.getElementById('export-all-btn');
    const moreActionsBtn = document.getElementById('more-actions-btn');
    const moreActionsMenu = document.getElementById('more-actions-menu');
    const bulkImportBtn = document.getElementById('bulk-import-btn');
    const batchUpdateBtn = document.getElementById('batch-update-btn');
    const exportForUpdateBtn = document.getElementById('export-for-update-btn');
    const importForUpdateBtn = document.getElementById('import-for-update-btn');
    const batchUpdateModal = document.getElementById('batch-update-modal');
    const closeBatchUpdateModalBtn = document.getElementById('close-batch-update-modal-btn');
    const batchUpdateForm = document.getElementById('batch-update-form');
    const batchUpdateFieldSelect = document.getElementById('batch-update-field-select');
    const batchUpdateValueContainer = document.getElementById('batch-update-value-container');
    const batchUpdateSummary = document.getElementById('batch-update-summary');
    const importForUpdateModal = document.getElementById('import-for-update-modal');
    const closeImportForUpdateModalBtn = document.getElementById('close-import-for-update-modal-btn');
    const importForUpdateFileInput = document.getElementById('import-for-update-file-input');
    const importForUpdateFileName = document.getElementById('import-for-update-file-name');
    const confirmImportForUpdateBtn = document.getElementById('confirm-import-for-update-btn');
    const talentListBody = document.getElementById('talent-list-body');
    const noTalentsMessage = document.getElementById('no-talents-message');
    const addTalentBtn = document.getElementById('add-talent-btn');
    const talentModal = document.getElementById('talent-modal');
    const talentModalContent = document.getElementById('talent-modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const talentForm = document.getElementById('talent-form');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    const editingTalentIdInput = document.getElementById('editing-talent-id');
    const searchInput = document.getElementById('search-input');
    const paginationControls = document.getElementById('pagination-controls');
    const talentTierSelect = document.getElementById('talent-tier');
    const talentSourceSelect = document.getElementById('talent-source');
    const rebateModal = document.getElementById('rebate-modal');
    const closeRebateModalBtn = document.getElementById('close-rebate-modal-btn');
    const rebateTalentName = document.getElementById('rebate-talent-name');
    const rebateList = document.getElementById('rebate-list');
    const rebateForm = document.getElementById('rebate-form');
    const newRebateRateInput = document.getElementById('new-rebate-rate');
    const priceModal = document.getElementById('price-modal');
    const closePriceModalBtn = document.getElementById('close-price-modal-btn');
    const priceTalentName = document.getElementById('price-talent-name');
    const priceList = document.getElementById('price-list');
    const priceForm = document.getElementById('price-form');
    const priceYearSelect = document.getElementById('price-year');
    const priceMonthSelect = document.getElementById('price-month');
    const priceTypeSelect = document.getElementById('price-type'); // [V6.1 新增]
    const newPriceAmountInput = document.getElementById('new-price-amount');
    const priceStatusSelect = document.getElementById('price-status');
    // [V6.2 新增] 价格筛选器和图表
    const priceListYearFilter = document.getElementById('price-list-year-filter');
    const priceListMonthFilter = document.getElementById('price-list-month-filter');
    const priceChartTypeFilter = document.getElementById('price-chart-type-filter');
    const priceChartYearFilter = document.getElementById('price-chart-year-filter');
    const priceTrendChartCanvas = document.getElementById('price-trend-chart');
    const toast = document.getElementById('toast-notification');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel');
    const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm');
    const actionBar = document.getElementById('action-bar');
    const selectionCounter = document.getElementById('selection-counter');
    const selectAllOnPageCheckbox = document.getElementById('select-all-on-page');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
    const settingsModalTabs = document.getElementById('settings-modal-tabs');
    const addTierForm = document.getElementById('add-tier-form');
    const newTierNameInput = document.getElementById('new-tier-name');
    const tierList = document.getElementById('tier-list');
    const addTypeForm = document.getElementById('add-type-form');
    const newTypeNameInput = document.getElementById('new-type-name');
    const typeList = document.getElementById('type-list');
    const advancedFilterDetails = document.getElementById('advanced-filter-details');
    const filterTierCheckboxes = document.getElementById('filter-tier-checkboxes');
    const filterTypeCheckboxes = document.getElementById('filter-type-checkboxes');
    const filterRebateMin = document.getElementById('filter-rebate-min');
    const filterRebateMax = document.getElementById('filter-rebate-max');
    const filterPriceMonth = document.getElementById('filter-price-month');
    const filterPriceType = document.getElementById('filter-price-type'); // [V6.2 新增]
    const filterPriceMin = document.getElementById('filter-price-min');
    const filterPriceMax = document.getElementById('filter-price-max');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
    const historyTalentName = document.getElementById('history-talent-name');
    const historyTableContainer = document.getElementById('history-table-container');
    const bulkImportModal = document.getElementById('bulk-import-modal');
    const closeBulkImportModalBtn = document.getElementById('close-bulk-import-modal-btn');
    const bulkImportFileInput = document.getElementById('bulk-import-file-input');
    const bulkImportFileName = document.getElementById('bulk-import-file-name');
    const confirmBulkImportBtn = document.getElementById('confirm-bulk-import-btn');
    const downloadTemplateBtn = document.getElementById('download-template-btn');

    // --- State & Keys ---
    const ITEMS_PER_PAGE_KEY = 'talentPoolItemsPerPage';
    const TALENT_TYPES_KEY = 'talentTypeDictionary';
    const TALENT_TIER_KEY = 'talentTierDictionary';
    const REBATE_DISPLAY_LIMIT = 1;
    
    let currentTalentData = [];
    let allProjects = []; 
    let allCollaborations = new Map();
    let talentTypes = new Set();
    let talentTiers = new Set();
    let selectedTalents = new Set();
    let currentTalentIdForRebate = null;
    let currentTalentIdForPrice = null;
    let confirmCallback = null;
    const DEFAULT_TIERS = ['头部达人', '重点达人', '常规达人-机构', '常规达人-野生'];
    let totalFilteredItems = 0;
    let priceTrendChart = null; // [V6.2 新增] 价格趋势图表实例

    let queryState = {
        page: 1,
        pageSize: 10,
        search: '',
        tiers: [],
        types: [],
        rebateMin: null,
        rebateMax: null,
        priceYear: null,
        priceMonth: null,
        priceType: null,      // [V6.2 新增]
        priceMin: null,
        priceMax: null,
        sortBy: 'createdAt',
        sortOrder: 'desc'
    };
    
    // --- Helper & Utility Functions ---
    function showToast(message, isError = false) {
        if (!toast) return;
        toast.textContent = message;
        toast.className = `fixed bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
        toast.style.opacity = 1;
        toast.style.visibility = 'visible';
        setTimeout(() => {
            toast.style.opacity = 0;
            toast.style.visibility = 'hidden';
        }, 3000);
    }
    
    function setLoadingState(isLoading) {
        if (!talentListBody) return;
        if (isLoading) {
            talentListBody.innerHTML = `<tr><td colspan="9" class="text-center py-10"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"><span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span></div></td></tr>`;
        }
    }

    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) { options.body = JSON.stringify(body); }
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            showToast(`操作失败: ${error.message}`, true);
            throw error;
        }
    }

    // --- [架构升级] 新增函数：构建POST请求的JSON体 ---
    function buildSearchPayload() {
        // 直接从 queryState 构造 payload
        const payload = { ...queryState };
        // 删除空的数组，避免发送不必要的参数
        if (payload.tiers && payload.tiers.length === 0) delete payload.tiers;
        if (payload.types && payload.types.length === 0) delete payload.types;
        return payload;
    }

    // --- [架构升级] 修改数据获取函数以使用POST ---
    async function fetchAndRenderTalents() {
        setLoadingState(true);
        
        const payload = buildSearchPayload();

        try {
            // 使用 POST 方法发送 payload
            const response = await apiRequest(API_PATHS.search, 'POST', payload);
            if (response.success && response.data) {
                const { talents, pagination } = response.data;
                currentTalentData = talents;
                totalFilteredItems = pagination.totalItems;
                renderTable(talents);
                renderPagination(pagination.totalPages, pagination.totalItems);
                updateSelectionCounter();
                updateSortIcons();
            } else {
                 throw new Error(response.message || "返回数据格式不正确");
            }
        } catch (error) {
            if (talentListBody) {
                talentListBody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-red-500">获取达人数据失败: ${error.message}</td></tr>`;
            }
        }
    }

    // --- Initial Setup ---
    async function initializePage() {
        setupEventListeners();
        queryState.pageSize = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '10');
        await loadConfigurations();
        populateFilterCheckboxes();
        await fetchAndRenderTalents();
    }
    
    async function loadConfigurations() {
        try {
            const [filterOptionsResponse, projectsResponse, collabsResponse] = await Promise.all([
                apiRequest(API_PATHS.getFilterOptions),
                apiRequest(API_PATHS.getProjects),
                apiRequest(API_PATHS.getCollaborations)
            ]);

            if (filterOptionsResponse.success && filterOptionsResponse.data) {
                talentTiers = new Set(filterOptionsResponse.data.tiers);
                talentTypes = new Set(filterOptionsResponse.data.types);
                localStorage.setItem(TALENT_TIER_KEY, JSON.stringify(Array.from(talentTiers)));
                localStorage.setItem(TALENT_TYPES_KEY, JSON.stringify(Array.from(talentTypes)));
            } else {
                throw new Error('Filter options API did not return success or data.');
            }

            allProjects = projectsResponse.data || [];
            const collaborations = collabsResponse.data || [];
            allCollaborations.clear();
            collaborations.forEach(c => {
                if (!allCollaborations.has(c.talentId)) allCollaborations.set(c.talentId, []);
                allCollaborations.get(c.talentId).push(c);
            });

        } catch (error) {
            console.error("加载配置数据失败，正在尝试使用本地缓存作为备用。", error);
            showToast("加载在线配置失败，尝试使用本地缓存。", true);

            const savedTiers = JSON.parse(localStorage.getItem(TALENT_TIER_KEY)) || DEFAULT_TIERS;
            talentTiers = new Set(savedTiers);
            const savedTypes = JSON.parse(localStorage.getItem(TALENT_TYPES_KEY)) || [];
            talentTypes = new Set(savedTypes);

            try {
                const [projectsResponse, collabsResponse] = await Promise.all([
                    apiRequest(API_PATHS.getProjects),
                    apiRequest(API_PATHS.getCollaborations)
                ]);
                allProjects = projectsResponse.data || [];
                const collaborations = collabsResponse.data || [];
                allCollaborations.clear();
                collaborations.forEach(c => {
                    if (!allCollaborations.has(c.talentId)) allCollaborations.set(c.talentId, []);
                    allCollaborations.get(c.talentId).push(c);
                });
            } catch (fallbackError) {
                console.error("在备用模式下加载项目/合作历史失败。", fallbackError);
                showToast("加载项目与合作历史失败。", true);
            }
        }
    }
    
    // --- The rest of the functions (Modals, UI, Rendering, Event Handlers) remain largely unchanged ---
    // ... (所有其他函数保持不变) ...

    function openConfirmModal(text, onConfirm) {
        if (!confirmModal) return;
        document.getElementById('confirm-modal-text').textContent = text;
        confirmModal.classList.remove('hidden');
        confirmCallback = onConfirm;
    }
    
    function closeConfirmModal() {
        if (confirmModal) confirmModal.classList.add('hidden');
        confirmCallback = null;
    }
    
    function closeAnimatedModal(modal, modalContent) {
        if (!modal || !modalContent) return;
        modalContent.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); 
    }

    function populateTierSelect(selectedTier = '') {
        if (!talentTierSelect) return;
        talentTierSelect.innerHTML = '<option value="">请选择层级</option>';
        talentTiers.forEach(tier => {
            talentTierSelect.innerHTML += `<option value="${tier}" ${tier === selectedTier ? 'selected' : ''}>${tier}</option>`;
        });
    }

    function openModal(talentId = null) {
        if (!talentForm || !talentModal || !talentModalContent) return;
        talentForm.reset();
        editingTalentIdInput.value = '';
        populateTierSelect();

        if (talentId) {
            const talent = currentTalentData.find(t => t.id === talentId);
            if (talent) {
                modalTitle.textContent = '编辑达人';
                modalSubmitBtn.textContent = '保存更改';
                editingTalentIdInput.value = talent.id;
                document.getElementById('talent-nickname').value = talent.nickname;
                document.getElementById('talent-xingtu-id').value = talent.xingtuId;
                document.getElementById('talent-uid').value = talent.uid || '';
                document.getElementById('talent-type').value = (talent.talentType || []).join(', ');
                talentSourceSelect.value = talent.talentSource || '野生达人';
                talentTierSelect.value = talent.talentTier || '';
            }
        } else {
            modalTitle.textContent = '新增达人';
            modalSubmitBtn.textContent = '确认创建';
        }

        talentModal.classList.remove('hidden');
        setTimeout(() => {
            talentModalContent.classList.remove('opacity-0', 'scale-95');
        }, 10);
    }

    function openRebateModal(talentId) {
        currentTalentIdForRebate = talentId;
        const talent = currentTalentData.find(t => t.id === talentId);
        if (talent && rebateTalentName) {
            rebateTalentName.textContent = talent.nickname;
            renderRebateList();
            if (rebateModal) rebateModal.classList.remove('hidden');
        }
    }

    function renderRebateList() {
        if (!rebateList) return;
        rebateList.innerHTML = '';
        const talent = currentTalentData.find(t => t.id === currentTalentIdForRebate);
        if (talent && talent.rebates && talent.rebates.length > 0) {
            talent.rebates.forEach(rebate => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
                li.innerHTML = `<span>${rebate.rate}%</span><button data-rate="${rebate.rate}" class="delete-rebate-btn text-red-500 hover:text-red-700 text-xs">删除</button>`;
                rebateList.appendChild(li);
            });
        } else {
            rebateList.innerHTML = '<li class="text-sm text-gray-500 text-center">暂无返点率</li>';
        }
    }

    function openPriceModal(talentId) {
        currentTalentIdForPrice = talentId;
        const talent = currentTalentData.find(t => t.id === talentId);
        if (talent && priceTalentName) {
            priceTalentName.textContent = talent.nickname;
            populatePriceDateSelects();
            initializePriceFilters(talent); // [V6.2 新增]
            renderPriceList();
            renderPriceTrendChart(talent); // [V6.2 新增]
            if (priceModal) priceModal.classList.remove('hidden');
        }
    }

    function populatePriceDateSelects() {
        if (!priceYearSelect || !priceMonthSelect) return;
        const currentYear = new Date().getFullYear();
        priceYearSelect.innerHTML = '';
        for (let i = currentYear - 1; i <= currentYear + 2; i++) {
            priceYearSelect.innerHTML += `<option value="${i}">${i}年</option>`;
        }
        priceMonthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            priceMonthSelect.innerHTML += `<option value="${i}">${i}月</option>`;
        }
        priceYearSelect.value = currentYear;
        priceMonthSelect.value = new Date().getMonth() + 1;
    }

    function renderPriceList() {
        if (!priceList) return;
        priceList.innerHTML = '';
        const talent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
        if (!talent || !talent.prices || talent.prices.length === 0) {
            priceList.innerHTML = '<li class="text-sm text-gray-500 text-center py-4">暂无一口价记录</li>';
            return;
        }

        // [V6.2 新增] 支持年月筛选
        const yearFilter = priceListYearFilter?.value;
        const monthFilter = priceListMonthFilter?.value;

        let filteredPrices = [...talent.prices];
        if (yearFilter) filteredPrices = filteredPrices.filter(p => p.year === parseInt(yearFilter));
        if (monthFilter) filteredPrices = filteredPrices.filter(p => p.month === parseInt(monthFilter));

        // 排序：year>month>type
        const sortedPrices = filteredPrices.sort((a,b) => {
            if (b.year !== a.year) return b.year - a.year;
            if (b.month !== a.month) return b.month - a.month;
            const typeOrder = { '60s_plus': 0, '20_to_60s': 1, '1_to_20s': 2 };
            return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
        });

        const priceTypeLabels = {
            '60s_plus': '60s+视频',
            '20_to_60s': '20-60s视频',
            '1_to_20s': '1-20s视频'
        };

        if (sortedPrices.length === 0) {
            priceList.innerHTML = '<li class="text-sm text-gray-500 text-center py-4">暂无符合条件的价格记录</li>';
            return;
        }

        sortedPrices.forEach(price => {
            const statusLabel = price.status === 'provisional' ? '(暂定价)' : '(已确认)';
            const statusColor = price.status === 'provisional' ? 'text-yellow-600' : 'text-green-600';
            const typeLabel = priceTypeLabels[price.type] || price.type || '未知类型';
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-2 bg-white border rounded-md text-sm hover:shadow-sm transition-shadow';
            li.innerHTML = `<div><span class="text-gray-700">${price.year}年 ${price.month}月</span> - <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">${typeLabel}</span>: <span class="font-semibold text-gray-900">¥ ${price.price.toLocaleString()}</span><span class="text-xs ml-2 ${statusColor}">${statusLabel}</span></div><button data-year="${price.year}" data-month="${price.month}" data-type="${price.type}" class="delete-price-btn text-red-500 hover:text-red-700 text-xs font-medium">删除</button>`;
            priceList.appendChild(li);
        });
    }

    // [V6.2 新增] 初始化价格筛选器
    function initializePriceFilters(talent) {
        if (!talent || !talent.prices || !priceListYearFilter || !priceListMonthFilter || !priceChartYearFilter) return;

        // 获取所有年份和月份
        const years = [...new Set(talent.prices.map(p => p.year))].sort((a,b) => b-a);
        const months = [...new Set(talent.prices.map(p => p.month))].sort((a,b) => a-b);

        // 填充年份筛选器
        priceListYearFilter.innerHTML = '<option value="">全部年份</option>' + years.map(y => `<option value="${y}">${y}年</option>`).join('');
        priceListMonthFilter.innerHTML = '<option value="">全部月份</option>' + months.map(m => `<option value="${m}">${m}月</option>`).join('');

        // 填充图表年份筛选器
        priceChartYearFilter.innerHTML = years.map(y => `<option value="${y}">${y}年</option>`).join('');
        if (years.length > 0) priceChartYearFilter.value = years[0];
    }

    // [V6.2 新增] 渲染价格趋势图
    function renderPriceTrendChart(talent) {
        if (!talent || !priceTrendChartCanvas) return;

        const selectedType = priceChartTypeFilter?.value || '60s_plus';
        const selectedYear = priceChartYearFilter?.value ? parseInt(priceChartYearFilter.value) : new Date().getFullYear();

        // 获取该年份该类型的所有价格数据（按月）
        const priceData = new Array(12).fill(null);
        (talent.prices || []).forEach(p => {
            if (p.year === selectedYear && p.type === selectedType) {
                priceData[p.month - 1] = p.price;
            }
        });

        // 销毁旧图表
        if (priceTrendChart) {
            priceTrendChart.destroy();
        }

        // 创建新图表
        const ctx = priceTrendChartCanvas.getContext('2d');
        priceTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                datasets: [{
                    label: `${selectedYear}年价格趋势`,
                    data: priceData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return value !== null ? `¥ ${value.toLocaleString()}` : '无数据';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '¥ ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    async function openHistoryModal(talentId) {
        const talent = currentTalentData.find(t => t.id === talentId);
        if (!talent || !historyTalentName || !historyTableContainer) return;
        historyTalentName.textContent = talent.nickname;
        historyTableContainer.innerHTML = `<p class="text-center text-gray-500 py-8">正在加载合作历史...</p>`;
        if (historyModal) historyModal.classList.remove('hidden');
        const historyData = (allCollaborations.get(talentId) || []).map(collab => {
            const project = allProjects.find(p => p.id === collab.projectId);
            return { ...collab, projectName: project ? project.name : '未知项目' };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        renderCooperationHistory(historyData);
    }

    function renderCooperationHistory(historyData) {
        if (!historyTableContainer) return;
        if (historyData.length === 0) {
            historyTableContainer.innerHTML = `<p class="text-center text-gray-500 py-8">暂无合作历史记录。</p>`;
            return;
        }
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        table.innerHTML = `
            <thead class="bg-gray-50"><tr><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合作状态</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">星图一口价</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">返点率</th><th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">视频链接</th></tr></thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${historyData.map(item => `
                    <tr class="bg-white">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline"><a href="order_list.html?projectId=${item.projectId}" target="_blank">${item.projectName}</a></td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.status || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥ ${Number(item.amount || 0).toLocaleString()}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.rebate === null || item.rebate === undefined ? 'N/A' : item.rebate + '%'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline">${item.videoId ? `<a href="https://www.douyin.com/video/${item.videoId}" target="_blank">查看视频</a>` : 'N/A'}</td>
                    </tr>`).join('')}
            </tbody>`;
        historyTableContainer.innerHTML = '';
        historyTableContainer.appendChild(table);
    }
    
    function openSettingsModal() { 
        if (settingsModal) settingsModal.classList.remove('hidden');
        renderTierManager();
        renderTypeManager();
    }
    
    function closeSettingsModal() { 
        if (settingsModal) settingsModal.classList.add('hidden'); 
        populateFilterCheckboxes();
    }

    function renderTierManager() {
        if (!tierList) return;
        tierList.innerHTML = '';
        talentTiers.forEach(tier => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
            item.innerHTML = `<span>${tier}</span><button data-tier="${tier}" class="delete-tier-btn text-red-500 hover:text-red-700 text-xs">删除</button>`;
            tierList.appendChild(item);
        });
    }

    function renderTypeManager() {
        if (!typeList) return;
        typeList.innerHTML = '';
        talentTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
            item.innerHTML = `<span>${type}</span><button data-type="${type}" class="delete-type-btn text-red-500 hover:text-red-700 text-xs">删除</button>`;
            typeList.appendChild(item);
        });
    }

    function openBatchUpdateModal() {
        const radioSelected = document.getElementById('update-scope-selected');
        const radioAll = document.getElementById('update-scope-all');

        if (radioSelected) {
            radioSelected.disabled = selectedTalents.size === 0;
            if (selectedTalents.size === 0) {
                radioAll.checked = true;
            } else {
                radioSelected.checked = true;
            }
        }
        
        updateBatchUpdateSummary();
        renderBatchUpdateValueInput();
        if (batchUpdateModal) batchUpdateModal.classList.remove('hidden');
    }

    function updateBatchUpdateSummary() {
        const scope = document.querySelector('input[name="update-scope"]:checked')?.value;
        if (!batchUpdateSummary) return;

        if (scope === 'selected') {
            batchUpdateSummary.textContent = `您即将对 ${selectedTalents.size} 位已勾选的达人进行批量更新。`;
        } else {
            batchUpdateSummary.textContent = `您即将对筛选出的 ${totalFilteredItems} 位达人进行批量更新。`;
        }
    }

    function renderBatchUpdateValueInput() {
        if (!batchUpdateFieldSelect || !batchUpdateValueContainer) return;
        const field = batchUpdateFieldSelect.value;
        let inputHtml = '';
        switch (field) {
            case 'talentTier':
                const tierOptions = Array.from(talentTiers).map(tier => `<option value="${tier}">${tier}</option>`).join('');
                inputHtml = `<select name="value" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">${tierOptions}</select>`;
                break;
            case 'talentSource':
                inputHtml = `<select name="value" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"><option value="野生达人">野生达人</option><option value="机构达人">机构达人</option></select>`;
                break;
            case 'talentType':
                inputHtml = `<input type="text" name="value" placeholder="输入新标签, 多个用英文逗号隔开" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">`;
                break;
        }
        batchUpdateValueContainer.innerHTML = inputHtml;
    }

    function openBulkImportModal() {
        if (bulkImportModal) bulkImportModal.classList.remove('hidden');
        if (bulkImportFileInput) bulkImportFileInput.value = '';
        if (bulkImportFileName) bulkImportFileName.textContent = '未选择任何文件';
    }

    function openImportForUpdateModal() {
        if (importForUpdateModal) importForUpdateModal.classList.remove('hidden');
        if (importForUpdateFileInput) importForUpdateFileInput.value = '';
        if (importForUpdateFileName) importForUpdateFileName.textContent = '未选择任何文件';
    }

    function renderTable(talentsToRender) {
        if (!talentListBody) return;
        talentListBody.innerHTML = '';
        const tableContainer = talentListBody.closest('.overflow-x-auto')?.parentElement;
        if (!tableContainer) return;

        if (talentsToRender.length === 0) {
            tableContainer.classList.add('hidden');
            if (actionBar) actionBar.classList.add('hidden');
            if (totalFilteredItems === 0) { 
                if (noTalentsMessage) noTalentsMessage.classList.remove('hidden'); 
            } else { 
                if (noTalentsMessage) noTalentsMessage.classList.add('hidden'); 
                talentListBody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-gray-500">未找到匹配的达人。</td></tr>`; 
                tableContainer.classList.remove('hidden'); 
            }
        } else {
            if (noTalentsMessage) noTalentsMessage.classList.add('hidden');
            tableContainer.classList.remove('hidden');
            if (totalFilteredItems > 0 && actionBar) actionBar.classList.remove('hidden');

            talentsToRender.forEach(talent => {
                const isSelected = selectedTalents.has(talent.id);
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();

                // [V6.1 新增] 支持多价格类型显示
                const priceTypes = [
                    { key: '60s_plus', label: '60s+' },
                    { key: '20_to_60s', label: '20-60s' },
                    { key: '1_to_20s', label: '1-20s' }
                ];

                let priceDisplay = '<div class="text-gray-400 text-sm">暂无价格</div>';
                const currentPrices = (talent.prices || []).filter(p => p.year === currentYear && p.month === currentMonth);

                if (currentPrices.length > 0 || true) {
                    // [V6.2 优化] 使用胶囊标签，每个价格一行
                    const priceElements = priceTypes.map(type => {
                        const price = currentPrices.find(p => p.type === type.key);
                        if (!price) {
                            return `<div class="flex items-center gap-2"><span class="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">${type.label}</span><span class="text-gray-400 text-sm">N/A</span></div>`;
                        }
                        const priceText = `¥ ${price.price.toLocaleString()}`;
                        const bgColor = price.status === 'provisional' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';
                        const textColor = price.status === 'provisional' ? 'text-yellow-600' : 'text-gray-900';
                        const statusMark = price.status === 'provisional' ? ' *' : '';
                        return `<div class="flex items-center gap-2"><span class="px-2 py-0.5 ${bgColor} rounded-full text-xs font-medium whitespace-nowrap">${type.label}</span><span class="${textColor} text-sm font-medium">${priceText}${statusMark}</span></div>`;
                    });
                    priceDisplay = priceElements.join('');
                }

                let rebatesHtml = 'N/A';
                if (talent.rebates && talent.rebates.length > 0) {
                    const sortedRebates = [...talent.rebates].sort((a, b) => a.rate - b.rate);
                    const allRebatesString = sortedRebates.map(r => `${r.rate}%`).join(', ');
                    
                    if (sortedRebates.length > REBATE_DISPLAY_LIMIT) {
                        const visibleRebates = sortedRebates.slice(0, REBATE_DISPLAY_LIMIT).map(r => `${r.rate}%`).join(', ');
                        rebatesHtml = `
                            <div class="relative group cursor-pointer">
                                <span>${visibleRebates}...</span>
                                <div class="absolute bottom-full mb-2 w-max hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 shadow-lg">
                                    ${allRebatesString}
                                </div>
                            </div>
                        `;
                    } else {
                        rebatesHtml = allRebatesString;
                    }
                }
                
                let typesCellContent;
                if (talent.talentType && Array.isArray(talent.talentType) && talent.talentType.length > 0) {
                    typesCellContent = talent.talentType.map(type => {
                        const color = stringToColor(type);
                        const textColor = getTextColor(color);
                        return `<span class="talent-type-tag" style="background-color:${color}; color:${textColor};">${type}</span>`;
                    }).join(' ');
                } else {
                    typesCellContent = 'N/A';
                }

                const row = document.createElement('tr');
                row.className = `bg-white ${isSelected ? 'table-row-selected' : ''}`;
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
                talentListBody.appendChild(row);
            });
        }
        updateSelectAllOnPageCheckboxState();
    }
    
    function stringToColor(str) {
        let hash = 0;
        if (!str) return '#e5e7eb';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    function getTextColor(hexColor) {
        if(!hexColor) return '#000000';
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }


    function updateSelectionCounter() {
        if (selectionCounter) selectionCounter.textContent = `已勾选 ${selectedTalents.size} 位达人`;
    }

    function updateSelectAllOnPageCheckboxState() {
        if (!selectAllOnPageCheckbox) return;
        const checkboxesOnPage = document.querySelectorAll('.talent-checkbox');
        if(checkboxesOnPage.length === 0) {
            selectAllOnPageCheckbox.checked = false;
            selectAllOnPageCheckbox.indeterminate = false;
            return;
        }
        const checkedCount = Array.from(checkboxesOnPage).filter(cb => cb.checked).length;
        if (checkedCount === 0) {
            selectAllOnPageCheckbox.checked = false;
            selectAllOnPageCheckbox.indeterminate = false;
        } else if (checkedCount === checkboxesOnPage.length) {
            selectAllOnPageCheckbox.checked = true;
            selectAllOnPageCheckbox.indeterminate = false;
        } else {
            selectAllOnPageCheckbox.checked = false;
            selectAllOnPageCheckbox.indeterminate = true;
        }
    }

    function renderPagination(totalPages, totalItems) {
        if (!paginationControls) return;
        paginationControls.innerHTML = '';
        if (totalItems === 0) return;
        
        const summary = `<div class="text-sm text-gray-700">共 ${totalItems} 条记录</div>`;
        
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">${[10,15,20,30,50].map(v => `<option value="${v}" ${queryState.pageSize === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`;
        
        const pageButtons = [];
        const maxButtons = 7;
        const currentPageNum = queryState.page;
        if (totalPages > 1) {
            if (totalPages <= maxButtons) { for (let i = 1; i <= totalPages; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`); }
            else {
                pageButtons.push(`<button class="pagination-btn ${1 === currentPageNum ? 'active' : ''}" data-page="1">1</button>`);
                let start = Math.max(2, currentPageNum - 2), end = Math.min(totalPages - 1, currentPageNum + 2);
                if (currentPageNum > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                if (currentPageNum <= 4) end = 5;
                if (currentPageNum >= totalPages - 3) start = totalPages - 4;
                for (let i = start; i <= end; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`);
                if (totalPages - currentPageNum > 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                pageButtons.push(`<button class="pagination-btn ${totalPages === currentPageNum ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
            }
        }
        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-1"><button id="prev-page" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons.join('')}<button id="next-page" class="pagination-btn" ${currentPageNum === totalPages ? 'disabled' : ''}>&gt;</button></div>` : '';
        
        paginationControls.innerHTML = `<div class="flex-1">${perPageSelector}</div><div class="flex items-center gap-4">${summary}${pageButtonsContainer}</div>`;
    }

     function populateFilterCheckboxes() {
        if (!filterTierCheckboxes || !filterTypeCheckboxes || !filterPriceMonth) return;
        filterTierCheckboxes.innerHTML = '';
        Array.from(talentTiers).sort().forEach(tier => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = `<input type="checkbox" value="${tier}" class="filter-checkbox rounded text-blue-600 focus:ring-blue-500"><span class="text-sm text-gray-700">${tier}</span>`;
            filterTierCheckboxes.appendChild(label);
        });

        filterTypeCheckboxes.innerHTML = '';
        Array.from(talentTypes).sort().forEach(type => {
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-2 cursor-pointer';
            label.innerHTML = `<input type="checkbox" value="${type}" class="filter-checkbox rounded text-blue-600 focus:ring-blue-500"><span class="text-sm text-gray-700">${type}</span>`;
            filterTypeCheckboxes.appendChild(label);
        });
        
        filterPriceMonth.innerHTML = '<option value="">选择月份</option>';
        const today = new Date();
        for(let i = -3; i < 6; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            filterPriceMonth.innerHTML += `<option value="${year}-${month}">${year}年${month}月</option>`;
        }
    }
    
    function handleSort(e) {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortBy = header.dataset.sort;
        if (!sortBy) return;

        if (queryState.sortBy === sortBy) {
            queryState.sortOrder = queryState.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            queryState.sortBy = sortBy;
            queryState.sortOrder = 'desc';
        }
        
        queryState.page = 1;
        fetchAndRenderTalents();
    }

    function updateSortIcons() {
        if (!tableHeader) return;
        tableHeader.querySelectorAll('.sortable-header').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (header.dataset.sort === queryState.sortBy) {
                    header.setAttribute('data-sort-active', 'true');
                    icon.innerHTML = queryState.sortOrder === 'asc' ? '&#9650;' : '&#9660;';
                } else {
                    header.setAttribute('data-sort-active', 'false');
                    icon.innerHTML = '';
                }
            }
        });
    }

    function setupEventListeners() {
        if (tableHeader) tableHeader.addEventListener('click', handleSort);

        if (exportAllBtn) exportAllBtn.addEventListener('click', handleExportAll);

        if (moreActionsBtn) {
            moreActionsBtn.addEventListener('click', () => {
                if (moreActionsMenu) moreActionsMenu.classList.toggle('hidden');
            });
        }

        document.addEventListener('click', (e) => {
            if (moreActionsBtn && moreActionsMenu && !moreActionsBtn.contains(e.target) && !moreActionsMenu.contains(e.target)) {
                moreActionsMenu.classList.add('hidden');
            }
        });
        
        if (batchUpdateBtn) batchUpdateBtn.addEventListener('click', openBatchUpdateModal);
        if (closeBatchUpdateModalBtn) closeBatchUpdateModalBtn.addEventListener('click', () => batchUpdateModal.classList.add('hidden'));
        if (batchUpdateForm) batchUpdateForm.addEventListener('submit', handleBatchUpdateSubmit);
        if (batchUpdateFieldSelect) batchUpdateFieldSelect.addEventListener('change', renderBatchUpdateValueInput);
        document.querySelectorAll('input[name="update-scope"]').forEach(radio => {
            radio.addEventListener('change', updateBatchUpdateSummary);
        });
        
        if(downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', handleDownloadTemplate);
        if (bulkImportBtn) bulkImportBtn.addEventListener('click', openBulkImportModal);
        if (closeBulkImportModalBtn) closeBulkImportModalBtn.addEventListener('click', () => bulkImportModal.classList.add('hidden'));
        if (bulkImportFileInput) bulkImportFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && bulkImportFileName) bulkImportFileName.textContent = file.name;
        });
        if (confirmBulkImportBtn) confirmBulkImportBtn.addEventListener('click', handleBulkImportSubmit);
        
        if (exportForUpdateBtn) exportForUpdateBtn.addEventListener('click', handleExportForUpdate);
        if (importForUpdateBtn) importForUpdateBtn.addEventListener('click', openImportForUpdateModal);
        if (closeImportForUpdateModalBtn) closeImportForUpdateModalBtn.addEventListener('click', () => importForUpdateModal.classList.add('hidden'));
        if (importForUpdateFileInput) importForUpdateFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file && importForUpdateFileName) importForUpdateFileName.textContent = file.name;
        });
        if (confirmImportForUpdateBtn) confirmImportForUpdateBtn.addEventListener('click', handleImportForUpdateSubmit);
        
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                queryState.search = searchInput.value.trim();
            });
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); 
                    queryState.page = 1; 
                    fetchAndRenderTalents();
                }
            });
        }
        
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => {
            queryState.page = 1;
            if (searchInput) queryState.search = searchInput.value;
            queryState.tiers = Array.from(document.querySelectorAll('#filter-tier-checkboxes input:checked')).map(cb => cb.value);
            queryState.types = Array.from(document.querySelectorAll('#filter-type-checkboxes input:checked')).map(cb => cb.value);
            if (filterRebateMin) queryState.rebateMin = filterRebateMin.value ? parseFloat(filterRebateMin.value) : null;
            if (filterRebateMax) queryState.rebateMax = filterRebateMax.value ? parseFloat(filterRebateMax.value) : null;
            
            const priceMonthVal = filterPriceMonth ? filterPriceMonth.value : null;
            if (priceMonthVal) {
                const [year, month] = priceMonthVal.split('-').map(Number);
                queryState.priceYear = year;
                queryState.priceMonth = month;
            } else {
                queryState.priceYear = null;
                queryState.priceMonth = null;
            }
            // [V6.2 新增] 价格类型筛选
            if (filterPriceType) queryState.priceType = filterPriceType.value || null;
            if (filterPriceMin) queryState.priceMin = filterPriceMin.value ? parseFloat(filterPriceMin.value) : null;
            if (filterPriceMax) queryState.priceMax = filterPriceMax.value ? parseFloat(filterPriceMax.value) : null;
            fetchAndRenderTalents();
        });

        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => {
            if(searchInput) searchInput.value = '';
            document.querySelectorAll('#filter-tier-checkboxes input:checked, #filter-type-checkboxes input:checked').forEach(cb => cb.checked = false);
            if(filterRebateMin) filterRebateMin.value = '';
            if(filterRebateMax) filterRebateMax.value = '';
            if(filterPriceMonth) filterPriceMonth.selectedIndex = 0;
            if(filterPriceType) filterPriceType.selectedIndex = 0; // [V6.2 新增]
            if(filterPriceMin) filterPriceMin.value = '';
            if(filterPriceMax) filterPriceMax.value = '';
            Object.assign(queryState, { page: 1, search: '', tiers: [], types: [], rebateMin: null, rebateMax: null, priceYear: null, priceMonth: null, priceType: null, priceMin: null, priceMax: null });
            queryState.sortBy = 'createdAt';
            queryState.sortOrder = 'desc';
            if (advancedFilterDetails) advancedFilterDetails.open = false;
            fetchAndRenderTalents();
        });
        
        if (paginationControls) {
            paginationControls.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if(!target || target.disabled) return;
                if (target.id === 'prev-page') queryState.page--;
                else if (target.id === 'next-page') queryState.page++;
                else if (target.dataset.page) queryState.page = Number(target.dataset.page);
                fetchAndRenderTalents();
            });
        
            paginationControls.addEventListener('change', (e) => {
                if (e.target.id === 'items-per-page') {
                    queryState.pageSize = parseInt(e.target.value);
                    localStorage.setItem(ITEMS_PER_PAGE_KEY, queryState.pageSize);
                    queryState.page = 1;
                    fetchAndRenderTalents();
                }
            });
        }
        
        if (talentListBody) talentListBody.addEventListener('click', (e) => {
            const target = e.target;
            const talentId = target.closest('[data-id]')?.dataset.id;
            
            if (!talentId) return;

            if (target.classList.contains('talent-checkbox')) {
                const checkbox = target;
                if (checkbox.checked) {
                    selectedTalents.add(talentId);
                } else {
                    selectedTalents.delete(talentId);
                }
                updateSelectionCounter();
                updateSelectAllOnPageCheckboxState();
            } else if (target.classList.contains('edit-btn')) openModal(talentId);
            else if (target.classList.contains('delete-btn')) {
                openConfirmModal(`确定要删除该达人吗？此操作将删除其所有关联的合作历史，且不可撤销。`, async () => {
                    try {
                        await apiRequest(API_PATHS.delete, 'DELETE', { talentId });
                        showToast("达人已成功删除。");
                        fetchAndRenderTalents();
                    } finally { closeConfirmModal(); }
                });
            } else if (target.classList.contains('price-btn')) openPriceModal(talentId);
            else if (target.classList.contains('rebate-btn')) openRebateModal(talentId);
            else if (target.classList.contains('history-btn')) openHistoryModal(talentId);
        });
        
        if (selectAllOnPageCheckbox) selectAllOnPageCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.talent-checkbox').forEach(cb => {
                const talentId = cb.dataset.id;
                cb.checked = isChecked;
                 if (isChecked) {
                    selectedTalents.add(talentId);
                } else {
                    selectedTalents.delete(talentId);
                }
            });
            updateSelectionCounter();
        });

        if (addTalentBtn) addTalentBtn.addEventListener('click', () => openModal());
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeAnimatedModal(talentModal, talentModalContent));
        if (talentModal) talentModal.addEventListener('click', (e) => { if (e.target === talentModal) closeAnimatedModal(talentModal, talentModalContent); });
        if (talentForm) talentForm.addEventListener('submit', handleFormSubmit);

        if (confirmModalCancelBtn) confirmModalCancelBtn.addEventListener('click', closeConfirmModal);
        if (confirmModalConfirmBtn) confirmModalConfirmBtn.addEventListener('click', () => {
            if (typeof confirmCallback === 'function') confirmCallback();
        });

        if (closeRebateModalBtn) closeRebateModalBtn.addEventListener('click', () => rebateModal.classList.add('hidden'));
        if (rebateForm) rebateForm.addEventListener('submit', handleRebateSubmit);
        if (rebateList) rebateList.addEventListener('click', handleDeleteRebate);

        if (closePriceModalBtn) closePriceModalBtn.addEventListener('click', () => {
            priceModal.classList.add('hidden');
            if (priceTrendChart) priceTrendChart.destroy(); // [V6.2 新增] 清理图表
        });
        if (priceForm) priceForm.addEventListener('submit', handlePriceSubmit);
        if (priceList) priceList.addEventListener('click', handleDeletePrice);

        // [V6.2 新增] 价格筛选器事件监听
        if (priceListYearFilter) priceListYearFilter.addEventListener('change', renderPriceList);
        if (priceListMonthFilter) priceListMonthFilter.addEventListener('change', renderPriceList);
        if (priceChartTypeFilter) priceChartTypeFilter.addEventListener('change', () => {
            const talent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
            if (talent) renderPriceTrendChart(talent);
        });
        if (priceChartYearFilter) priceChartYearFilter.addEventListener('change', () => {
            const talent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
            if (talent) renderPriceTrendChart(talent);
        });

        if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', () => historyModal.classList.add('hidden'));
        
        if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
        if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettingsModal);

        if (settingsModalTabs) settingsModalTabs.addEventListener('click', (e) => {
            if(e.target.classList.contains('modal-tab-btn')) {
                document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.modal-tab-pane').forEach(pane => pane.classList.add('hidden'));
                const targetPane = document.getElementById(e.target.dataset.tabTarget);
                if (targetPane) targetPane.classList.remove('hidden');
            }
        });
        if (addTierForm) addTierForm.addEventListener('submit', handleAddTier);
        if (tierList) tierList.addEventListener('click', handleDeleteTier);
        
        if (addTypeForm) addTypeForm.addEventListener('submit', handleAddType);
        if (typeList) typeList.addEventListener('click', handleDeleteType);
    }
    
    async function handleBatchUpdateSubmit(e) {
        e.preventDefault();
        const scope = document.querySelector('input[name="update-scope"]:checked')?.value;
        const formData = new FormData(batchUpdateForm);
        const field = formData.get('field');
        let value = formData.get('value');

        if (!value && field !== 'talentType') {
            showToast('更新值不能为空。', true);
            return;
        }

        if (scope === 'selected') {
            await handleBatchUpdateForSelected(field, value);
        } else {
            await handleBatchUpdateForFiltered(field, value);
        }
    }

    async function handleBatchUpdateForFiltered(field, value) {
        const confirmText = `您确定要将 ${totalFilteredItems} 位筛选出的达人 "${field}" 字段更新为 "${value}" 吗？`;
        openConfirmModal(confirmText, async () => {
            try {
                let updateValue = value;
                 if (field === 'talentType') {
                    updateValue = value.split(/,|，/).map(t => t.trim()).filter(Boolean);
                }
                const payload = {
                    filters: queryState,
                    updateData: { [field]: updateValue }
                };
                const result = await apiRequest(API_PATHS.batchUpdate, 'POST', payload);
                showToast(`批量更新成功！共更新 ${result.data.updated} 条记录。`);
                if (batchUpdateModal) batchUpdateModal.classList.add('hidden');
                fetchAndRenderTalents();
            } finally {
                closeConfirmModal();
            }
        });
    }

    async function handleBatchUpdateForSelected(field, value) {
        if (selectedTalents.size === 0) {
            showToast('没有勾选任何达人。', true);
            return;
        }
        
        const confirmText = `您确定要将 ${selectedTalents.size} 位勾选的达人 "${field}" 更新为 "${value}" 吗？`;
        openConfirmModal(confirmText, async () => {
            try {
                const response = await apiRequest(API_PATHS.getByIds, 'POST', { ids: Array.from(selectedTalents) });
                const talentsToUpdate = response.data;
                if (!talentsToUpdate || talentsToUpdate.length === 0) throw new Error("无法获取勾选达人的详细信息。");
                
                const payload = {
                    updates: talentsToUpdate.map(talent => {
                        const updateData = { xingtuId: talent.xingtuId };
                        if (field === 'talentType') {
                            updateData[field] = value.split(/,|，/).map(t => t.trim()).filter(Boolean);
                        } else {
                            updateData[field] = value;
                        }
                        return updateData;
                    })
                };
                
                const result = await apiRequest(API_PATHS.bulkUpdate, 'PUT', payload);
                showToast(`批量修改操作完成！成功: ${result.data.updated}, 失败: ${result.data.failed}。`);
                if (batchUpdateModal) batchUpdateModal.classList.add('hidden');
                fetchAndRenderTalents();
            } finally {
                closeConfirmModal();
            }
        });
    }
    
    function handleDownloadTemplate() {
        const sampleData = [{
            nickname: '示例达人',
            xingtuId: '1234567890 (必填)',
            uid: '0987654321',
            talentType: '美妆,剧情',
            talentSource: '机构达人',
            talentTier: '头部达人',
        }];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "新达人导入模板");
        XLSX.writeFile(workbook, "新达人导入模板.xlsx");
        showToast('模板已开始下载。');
    }
    
    async function handleExportAll(e) {
        e.preventDefault();
        showToast('正在准备导出全量达人基础模板...');
        try {
            const response = await apiRequest(API_PATHS.exportAll, 'GET');
            const talentsToExport = response.data;
            if (!talentsToExport || talentsToExport.length === 0) {
                showToast('没有可导出的达人数据。', true);
                return;
            }
            const dataForSheet = talentsToExport.map(t => ({
                '程序ID (id)': t.id,
                '星图ID (xingtuId)': t.xingtuId,
                '达人昵称 (nickname)': t.nickname,
                '达人层级 (talentTier)': t.talentTier,
                '达人来源 (talentSource)': t.talentSource
            }));
            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "全量达人基础模板");
            XLSX.writeFile(workbook, `全量达人基础模板-${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast(`成功导出 ${talentsToExport.length} 位达人的基础模板。`);
        } catch (error) {
            showToast('导出全量模板失败，请稍后重试。', true);
        }
    }
    
    async function handleBulkImportSubmit() {
        if (!bulkImportFileInput) return;
        const file = bulkImportFileInput.files[0];
        if (!file) {
            showToast('请选择要导入的Excel文件。', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array'
                });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    defval: ""
                });
                if (jsonData.length === 0) {
                    showToast("Excel文件为空或格式不正确。", true);
                    return;
                }
                showToast(`正在导入 ${jsonData.length} 条新达人数据...`);
                const result = await apiRequest(API_PATHS.bulkCreate, 'POST', jsonData);
                let message = `导入操作完成。\n成功创建: ${result.data.created} 条。`;
                if (result.data.failed > 0) {
                    message += `\n失败: ${result.data.failed} 条（星图ID可能已存在）。`;
                }
                showToast(message, result.data.failed > 0);
                if (bulkImportModal) bulkImportModal.classList.add('hidden');
                await loadConfigurations();
                fetchAndRenderTalents();
            } catch (error) {
                showToast("文件处理或导入失败，请检查文件格式和内容。", true);
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    async function handleExportForUpdate() {
        if (selectedTalents.size === 0) {
            showToast("请先勾选需要导出的达人。", true);
            return;
        }
        showToast(`正在准备导出 ${selectedTalents.size} 位达人的数据...`);
        try {
            const response = await apiRequest(API_PATHS.getByIds, 'POST', {
                ids: Array.from(selectedTalents)
            });
            const talentsToExport = response.data;
            const dataForSheet = talentsToExport.map(t => ({
                xingtuId: t.xingtuId,
                nickname: t.nickname,
                uid: t.uid || '',
                talentType: (t.talentType || []).join(','),
                talentSource: t.talentSource || '',
                talentTier: t.talentTier || '',
                rebates: JSON.stringify(t.rebates || []),
                prices: JSON.stringify(t.prices || [])
            }));
            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "达人更新模板");
            XLSX.writeFile(workbook, `达人差异化更新模板-${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast(`已成功导出 ${talentsToExport.length} 位达人的更新模板。`);
        } catch (error) {
            showToast('导出失败，无法获取最新的达人数据。', true);
        }
    }
    
    async function handleImportForUpdateSubmit() {
        if (!importForUpdateFileInput) return;
        const file = importForUpdateFileInput.files[0];
        if (!file) {
            showToast('请选择要导入的Excel更新文件。', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array'
                });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    defval: null
                });
                if (jsonData.length === 0) {
                    showToast("Excel文件为空或格式不正确。", true);
                    return;
                }
                const payload = jsonData.map(row => {
                    if (!row.xingtuId) return null;
                    try {
                        if (row.rebates) row.rebates = JSON.parse(row.rebates);
                        if (row.prices) row.prices = JSON.parse(row.prices);
                        if (row.talentType && typeof row.talentType === 'string') {
                            row.talentType = row.talentType.split(',').map(t => t.trim()).filter(Boolean);
                        }
                    } catch (jsonError) {
                        console.error('Failed to parse JSON fields for row:', row, jsonError);
                    }
                    return row;
                }).filter(Boolean);
                showToast(`正在提交 ${payload.length} 条达人更新数据...`);
                const result = await apiRequest(API_PATHS.bulkUpdate, 'PUT', {
                    updates: payload
                });
                let message = `差异化更新操作完成。\n成功更新: ${result.data.updated} 条。`;
                if (result.data.failed > 0) {
                    message += `\n失败: ${result.data.failed} 条（星图ID可能不存在）。`;
                }
                showToast(message, result.data.failed > 0);
                if (importForUpdateModal) importForUpdateModal.classList.add('hidden');
                fetchAndRenderTalents();
            } catch (error) {
                showToast("文件处理或更新失败，请检查文件格式和内容。", true);
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        const nickname = document.getElementById('talent-nickname').value.trim();
        const xingtuId = document.getElementById('talent-xingtu-id').value.trim();
        const uid = document.getElementById('talent-uid').value.trim();
        const typeString = document.getElementById('talent-type').value.trim();
        const talentSource = document.getElementById('talent-source').value;
        const editingId = document.getElementById('editing-talent-id').value;
        if (!nickname || !xingtuId) {
            showToast('达人昵称和达人星图ID为必填项。', true);
            return;
        }
        const talentType = typeString ? typeString.split(/,|，/).map(t => t.trim()).filter(Boolean) : [];
        let talentTier = document.getElementById('talent-tier').value;
        const payload = {
            nickname,
            xingtuId,
            uid,
            talentType,
            talentTier,
            talentSource
        };
        try {
            if (editingId) {
                await apiRequest(API_PATHS.updateSingle, 'PUT', {
                    id: editingId,
                    ...payload
                });
                showToast('达人信息更新成功！');
            } else {
                await apiRequest(API_PATHS.createSingle, 'POST', payload);
                showToast('达人创建成功！');
                queryState.page = 1;
            }
            closeAnimatedModal(talentModal, talentModalContent);
            await loadConfigurations();
            populateFilterCheckboxes();
            fetchAndRenderTalents();
        } catch (err) {
            /* error is handled in apiRequest */
        }
    }
    
    async function handleRebateSubmit(e) {
        e.preventDefault();
        const rateValue = parseFloat(newRebateRateInput.value);
        if (isNaN(rateValue) || rateValue < 0) {
            showToast('请输入有效的返点率。', true);
            return;
        }
        const talent = currentTalentData.find(t => t.id === currentTalentIdForRebate);
        if (!talent) return;
        const newRebates = [...(talent.rebates || []), {
            rate: rateValue
        }];
        try {
            await apiRequest(API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                rebates: newRebates
            });
            showToast('返点率添加成功');
            if (rebateForm) rebateForm.reset();
            await fetchAndRenderTalents();
            const updatedTalent = currentTalentData.find(t => t.id === currentTalentIdForRebate);
            if (updatedTalent) renderRebateList();
            else if (rebateModal) rebateModal.classList.add('hidden');
        } catch (error) {
            /* error handled in apiRequest */
        }
    }
    
    async function handleDeleteRebate(e) {
        if (!e.target.classList.contains('delete-rebate-btn')) return;
        const rateToDelete = parseFloat(e.target.dataset.rate);
        const talent = currentTalentData.find(t => t.id === currentTalentIdForRebate);
        if (!talent) return;
        const newRebates = talent.rebates.filter(r => r.rate !== rateToDelete);
        try {
            await apiRequest(API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                rebates: newRebates
            });
            showToast('返点率删除成功');
            await fetchAndRenderTalents();
            const updatedTalent = currentTalentData.find(t => t.id === currentTalentIdForRebate);
            if (updatedTalent) renderRebateList();
            else if (rebateModal) rebateModal.classList.add('hidden');
        } catch (error) {
            /* error handled in apiRequest */
        }
    }
    
    async function handlePriceSubmit(e) {
        e.preventDefault();
        const year = parseInt(priceYearSelect.value);
        const month = parseInt(priceMonthSelect.value);
        const type = priceTypeSelect.value; // [V6.1 新增]
        const amount = parseFloat(newPriceAmountInput.value);
        const status = priceStatusSelect.value;

        if (isNaN(amount) || amount < 0) {
            showToast('请输入有效的金额。', true);
            return;
        }
        if (!type) {
            showToast('请选择视频类型。', true);
            return;
        }

        const talent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
        if (!talent) return;

        // [V6.1 修改] 过滤时使用 year + month + type 作为唯一键
        const newPrices = (talent.prices || []).filter(p => !(p.year === year && p.month === month && p.type === type));
        newPrices.push({
            year,
            month,
            type,     // [V6.1 新增]
            price: amount,
            status
        });

        try {
            await apiRequest(API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                prices: newPrices
            });
            showToast('一口价添加/更新成功');
            if (priceForm) priceForm.reset();
            populatePriceDateSelects();
            await fetchAndRenderTalents();
            const updatedTalent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
            if (updatedTalent) renderPriceList();
            else if (priceModal) priceModal.classList.add('hidden');
        } catch (error) {
            /* error handled in apiRequest */
        }
    }
    
    async function handleDeletePrice(e) {
        if (!e.target.classList.contains('delete-price-btn')) return;
        const year = parseInt(e.target.dataset.year);
        const month = parseInt(e.target.dataset.month);
        const type = e.target.dataset.type; // [V6.1 新增]

        const talent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
        if (!talent) return;

        // [V6.1 修改] 删除时使用 year + month + type 作为唯一键
        const newPrices = talent.prices.filter(p => !(p.year === year && p.month === month && p.type === type));

        try {
            await apiRequest(API_PATHS.updateSingle, 'PUT', {
                id: talent.id,
                prices: newPrices
            });
            showToast('一口价删除成功');
            await fetchAndRenderTalents();
            const updatedTalent = currentTalentData.find(t => t.id === currentTalentIdForPrice);
            if (updatedTalent) renderPriceList();
            else if (priceModal) priceModal.classList.add('hidden');
        } catch (error) {
            /* error handled in apiRequest */
        }
    }
    
    function handleAddTier(e) {
        e.preventDefault();
        if (!newTierNameInput) return;
        const newTier = newTierNameInput.value.trim();
        if (newTier && !talentTiers.has(newTier)) {
            talentTiers.add(newTier);
            localStorage.setItem(TALENT_TIER_KEY, JSON.stringify(Array.from(talentTiers)));
            renderTierManager();
            newTierNameInput.value = '';
        }
    }
    
    function handleDeleteTier(e) {
        if (!e.target.classList.contains('delete-tier-btn')) return;
        const tierToDelete = e.target.dataset.tier;
        openConfirmModal(`确定要删除层级 "${tierToDelete}" 吗？`, () => {
            talentTiers.delete(tierToDelete);
            localStorage.setItem(TALENT_TIER_KEY, JSON.stringify(Array.from(talentTiers)));
            renderTierManager();
            closeConfirmModal();
        });
    }
    
    function handleAddType(e) {
        e.preventDefault();
        if (!newTypeNameInput) return;
        const newType = newTypeNameInput.value.trim();
        if (newType && !talentTypes.has(newType)) {
            talentTypes.add(newType);
            localStorage.setItem(TALENT_TYPES_KEY, JSON.stringify(Array.from(talentTypes)));
            renderTypeManager();
            newTypeNameInput.value = '';
        }
    }
    
    function handleDeleteType(e) {
        if (!e.target.classList.contains('delete-type-btn')) return;
        const typeToDelete = e.target.dataset.type;
        openConfirmModal(`确定要删除标签 "${typeToDelete}" 吗？`, () => {
            talentTypes.delete(typeToDelete);
            localStorage.setItem(TALENT_TYPES_KEY, JSON.stringify(Array.from(talentTypes)));
            renderTypeManager();
            closeConfirmModal();
        });
    }
    
    initializePage();
});
