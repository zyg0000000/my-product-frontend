/**
 * @file data_export_center.js
 * @version 1.2.1
 * @description “数据导出中心”页面的核心交互逻辑 (修正版)。
 * - 修正了 `apiRequest` 函数缺失和 `XLSX` 库未引用的问题。
 * - 支持按“达人”、“合作”、“项目”三种主体进行导出。
 * - 动态根据所选主体，渲染不同的筛选条件和可导出维度。
 * - 调用 /export-comprehensive-data API 获取数据。
 * - 在前端使用 xlsx.js 生成并下载 Excel 文件。
 */
document.addEventListener('DOMContentLoaded', function () {

    // --- 依赖库检查 ---
    if (typeof XLSX === 'undefined') {
        console.error("XLSX library is not loaded. Please include it in your HTML.");
        alert("导出功能所需的核心库加载失败，请刷新页面或联系管理员。");
    }

    // --- API & 配置 ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const API_PATHS = {
        export: `${API_BASE_URL}/export-comprehensive-data`,
        filterOptions: `${API_BASE_URL}/talents/filter-options`,
        projects: `${API_BASE_URL}/projects?view=simple`
    };

    // --- 核心配置对象 ---
    const DIMENSION_CONFIG = {
        talent: {
            filters: [
                { id: 'search', label: '达人昵称/ID', type: 'text', placeholder: '搜索昵称或星图ID...' },
                { id: 'tiers', label: '达人层级', type: 'checkbox', optionsKey: 'talentTiers' },
                { id: 'types', label: '内容标签', type: 'checkbox', optionsKey: 'talentTypes' }
            ],
            dimensions: {
                '基础信息': [
                    { id: 'nickname', label: '达人昵称' },
                    { id: 'xingtuId', label: '星图ID' },
                    { id: 'uid', label: 'UID' },
                    { id: 'talentTier', label: '达人层级' },
                    { id: 'talentSource', label: '达人来源' },
                    { id: 'talentType', label: '内容标签' },
                ],
                '商务信息': [
                    { id: 'price', label: '一口价 (指定月份)' },
                    { id: 'highestRebate', label: '最高返点率' },
                ],
                '合作数据': [
                    { id: 'collaboration_count', label: '历史合作总次数' },
                ],
                '作品表现 (T+7)': [
                    { id: 'work_total_t7_views', label: 'T+7 总播放量' }
                ],
                '粉丝画像': [
                    { id: 'cpm60s', label: '60s+预期CPM' },
                    { id: 'maleAudienceRatio', label: '男性观众比例' },
                    { id: 'femaleAudienceRatio', label: '女性观众比例' },
                    { id: 'audience_18_40_ratio', label: '18-40岁观众占比' },
                ]
            }
        },
        collaboration: {
            filters: [
                { id: 'status', label: '合作状态', type: 'checkbox', options: ['待提报工作台', '工作台已提交', '客户已定档', '视频已发布'] },
                { id: 'orderType', label: '下单方式', type: 'select', options: ['改价下单', '原价下单'] },
                { id: 'publishDateRange', label: '发布日期范围', type: 'daterange' }
            ],
            dimensions: {
                '合作信息': [
                    { id: 'collaboration_status', label: '合作状态' },
                    { id: 'collaboration_amount', label: '合作金额' },
                    { id: 'collaboration_orderType', label: '下单方式' },
                    { id: 'collaboration_plannedReleaseDate', label: '计划发布日期' },
                    { id: 'collaboration_publishDate', label: '实际发布日期' },
                ],
                '项目信息': [
                    { id: 'project_name', label: '所属项目' },
                    { id: 'project_type', label: '项目类型' },
                ],
                '达人信息': [
                    { id: 'nickname', label: '达人昵称' },
                    { id: 'talentTier', label: '达人层级' },
                ],
                '作品表现 (T+7)': [
                    { id: 'work_t7_totalViews', label: 'T+7 播放量' },
                    { id: 'work_t7_likeCount', label: 'T+7 点赞数' },
                ]
            }
        },
        project: { // 与 collaboration 类似，但筛选器不同
            filters: [
                { id: 'projectIds', label: '选择项目', type: 'multiselect', optionsKey: 'projects' },
                { id: 'status', label: '合作状态', type: 'checkbox', options: ['待提报工作台', '工作台已提交', '客户已定档', '视频已发布'] }
            ],
            dimensions: {} // Placeholder
        }
    };
    DIMENSION_CONFIG.project.dimensions = DIMENSION_CONFIG.collaboration.dimensions;

    // --- DOM Elements ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const entitySelection = document.getElementById('entity-selection');
    const filtersContainer = document.getElementById('filters-container');
    const dimensionsContainer = document.getElementById('dimensions-container');
    const exportFilenameInput = document.getElementById('export-filename');
    const exportTimeMonthInput = document.getElementById('export-time-month');
    const generateExportBtn = document.getElementById('generate-export-btn');
    const exportBtnText = document.getElementById('export-btn-text');
    const exportBtnLoader = document.getElementById('export-btn-loader');

    // --- State ---
    let initialConfigs = {
        talentTiers: [],
        talentTypes: [],
        projects: []
    };

    // --- [修正] 补全 apiRequest 函数 ---
    async function apiRequest(url, method = 'POST', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || 'Unknown API error');
            }
            if (response.status === 204) return { success: true, data: null };
            const result = await response.json();
            if (result.success === false) throw new Error(result.message || 'API returned an error');
            return result;
        } catch (error) {
            console.error(`API request error for ${method} ${url}:`, error);
            alert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    // --- Main Logic ---
    async function initializePage() {
        setDefaultTimeMonth();
        setLoadingState(true, '正在初始化页面配置...');
        try {
            await loadInitialConfigs();
            renderUIForEntity('talent');
        } catch (error) {
            console.error("Initialization failed:", error);
            filtersContainer.innerHTML = '<p class="text-red-500 text-center">页面初始化失败，请刷新。</p>';
            dimensionsContainer.innerHTML = '';
        } finally {
            setLoadingState(false);
        }
        setupEventListeners();
    }

    async function loadInitialConfigs() {
        const [filterOptsRes, projectsRes] = await Promise.all([
            apiRequest(API_PATHS.filterOptions, 'GET'),
            apiRequest(API_PATHS.projects, 'GET')
        ]);
        if (filterOptsRes.success) {
            initialConfigs.talentTiers = filterOptsRes.data.tiers || [];
            initialConfigs.talentTypes = filterOptsRes.data.types || [];
        }
        if (projectsRes.success) {
            initialConfigs.projects = projectsRes.data || [];
        }
    }

    function renderUIForEntity(entity) {
        const config = DIMENSION_CONFIG[entity];
        if (!config) return;

        renderFilters(config.filters);
        renderDimensions(config.dimensions);
    }

    function renderFilters(filterDefs) {
        filtersContainer.innerHTML = '';
        if (!filterDefs || filterDefs.length === 0) {
            filtersContainer.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center">此导出主体暂无可用筛选条件。</p>';
            return;
        }

        const container = document.createElement('div');
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

        filterDefs.forEach(filter => {
            const filterEl = document.createElement('div');
            let inputHtml = '';
            const options = filter.options || initialConfigs[filter.optionsKey] || [];

            switch (filter.type) {
                case 'text':
                    inputHtml = `<input type="text" id="filter-${filter.id}" class="mt-1 w-full rounded-md border-gray-300 shadow-sm" placeholder="${filter.placeholder}">`;
                    break;
                case 'select':
                    inputHtml = `<select id="filter-${filter.id}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"><option value="">所有</option>${options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
                    break;
                case 'multiselect':
                     inputHtml = `<select id="filter-${filter.id}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" multiple size="4">${options.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}</select>`;
                    break;
                case 'checkbox':
                    inputHtml = `<div class="mt-2 space-y-2 border p-2 rounded-md max-h-32 overflow-y-auto custom-scrollbar">${options.map(o => `<label class="flex items-center"><input type="checkbox" value="${o}" class="filter-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded" data-filter-id="${filter.id}"><span class="ml-2 text-sm">${o}</span></label>`).join('')}</div>`;
                    break;
                case 'daterange':
                    inputHtml = `<div class="mt-1 flex items-center gap-2"><input type="date" id="filter-${filter.id}-start" class="w-full rounded-md border-gray-300 shadow-sm"><span class="text-gray-500">-</span><input type="date" id="filter-${filter.id}-end" class="w-full rounded-md border-gray-300 shadow-sm"></div>`;
                    break;
            }

            filterEl.innerHTML = `<label for="filter-${filter.id}" class="block text-sm font-medium text-gray-700">${filter.label}</label>${inputHtml}`;
            container.appendChild(filterEl);
        });
        filtersContainer.appendChild(container);
    }

    function renderDimensions(dimensionGroups) {
        dimensionsContainer.innerHTML = '';
        if (!dimensionGroups || Object.keys(dimensionGroups).length === 0) {
            dimensionsContainer.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center col-span-full">无可用维度。</p>';
            return;
        }

        for (const groupName in dimensionGroups) {
            const dimensions = dimensionGroups[groupName];
            const groupEl = document.createElement('div');
            groupEl.className = 'dimension-group';
            groupEl.innerHTML = `
                <details open>
                    <summary class="flex justify-between items-center cursor-pointer p-2 rounded-md hover:bg-gray-100">
                        <span class="font-semibold text-sm text-gray-700">${groupName}</span>
                        <svg class="w-4 h-4 arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </summary>
                    <div class="pl-4 pt-2 space-y-2">
                        ${dimensions.map(dim => `
                            <label class="flex items-center">
                                <input type="checkbox" value="${dim.id}" class="dimension-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded">
                                <span class="ml-2 text-sm text-gray-600">${dim.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </details>`;
            dimensionsContainer.appendChild(groupEl);
        }
    }

    async function handleExport() {
        setLoadingState(true, '正在生成报表...');

        try {
            const payload = buildPayload();
            if (payload.fields.length === 0) {
                throw new Error("请至少选择一个要导出的数据维度。");
            }
            
            const response = await apiRequest(API_PATHS.export, 'POST', payload);
            if (!response.success || !response.data) {
                throw new Error(response.message || "后端返回数据为空。");
            }

            if (response.data.length === 0) {
                alert("没有找到符合筛选条件的数据。");
                return;
            }

            // Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(response.data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "导出数据");
            
            let filename = exportFilenameInput.value.trim() || '数据导出报表';
            if (!filename.endsWith('.xlsx')) {
                filename += '.xlsx';
            }
            XLSX.writeFile(workbook, filename);

        } catch (error) {
            alert(`导出失败: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    }

    function buildPayload() {
        const entity = entitySelection.querySelector('input:checked').value;
        const fields = Array.from(dimensionsContainer.querySelectorAll('.dimension-checkbox:checked')).map(cb => cb.value);
        const filters = {};
        
        const filterDefs = DIMENSION_CONFIG[entity].filters;
        filterDefs.forEach(filter => {
            switch(filter.type) {
                case 'text':
                    const textInput = document.getElementById(`filter-${filter.id}`);
                    if (textInput) filters[filter.id] = textInput.value.trim();
                    break;
                case 'select':
                    const selectInput = document.getElementById(`filter-${filter.id}`);
                    if (selectInput) filters[filter.id] = selectInput.value;
                    break;
                case 'multiselect':
                     const multiSelect = document.getElementById(`filter-${filter.id}`);
                     if (multiSelect) filters[filter.id] = Array.from(multiSelect.selectedOptions).map(opt => opt.value);
                    break;
                case 'checkbox':
                    filters[filter.id] = Array.from(document.querySelectorAll(`.filter-checkbox[data-filter-id="${filter.id}"]:checked`)).map(cb => cb.value);
                    break;
                case 'daterange':
                    const startDate = document.getElementById(`filter-${filter.id}-start`);
                    const endDate = document.getElementById(`filter-${filter.id}-end`);
                    if(startDate && endDate) {
                        filters[filter.id] = {
                            start: startDate.value,
                            end: endDate.value
                        };
                    }
                    break;
            }
        });
        
        return {
            entity,
            fields,
            filters,
            timeMonth: exportTimeMonthInput.value
        };
    }

    // --- UI Helpers & Event Listeners ---

    function setupEventListeners() {
        entitySelection.addEventListener('change', (e) => {
            if (e.target.name === 'export-entity') {
                renderUIForEntity(e.target.value);
            }
        });
        generateExportBtn.addEventListener('click', handleExport);
    }

    function setDefaultTimeMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        exportTimeMonthInput.value = `${year}-${month}`;
    }

    function setLoadingState(isLoading, message = '') {
        if (isLoading) {
            loadingOverlay.classList.remove('hidden');
            if (message) {
                loadingOverlay.querySelector('span').textContent = message;
            }
        } else {
            loadingOverlay.classList.add('hidden');
        }
        generateExportBtn.disabled = isLoading;
        exportBtnText.classList.toggle('hidden', isLoading);
        exportBtnLoader.classList.toggle('hidden', !isLoading);
    }
    
    initializePage();
});

