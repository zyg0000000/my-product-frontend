/**
 * @file index.js
 * @version 4.2-config-fix
 * @description [配置加载修正版] 项目库脚本。
 * - [核心修正] 重构了 loadAllConfigurations 函数，使其通过一次API调用获取所有配置，与后端逻辑保持一致。
 * - [BUG修复] 修正了填充下拉框的函数，确保能从新的配置数据结构中正确解析并显示资金费率和框架折扣。
 * - [性能优化] 将3次配置加载请求合并为1次。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

    // --- DOM Elements ---
    const projectList = document.getElementById('project-list');
    const noProjectsMessage = document.getElementById('no-projects-message');
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectModal = document.getElementById('project-modal');
    const projectModalContent = document.getElementById('project-modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const projectForm = document.getElementById('project-form');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    const editingProjectIdInput = document.getElementById('editing-project-id');
    const projectNameInput = document.getElementById('project-name');
    const projectQianchuanIdInput = document.getElementById('project-qianchuan-id');
    const projectTypeSelect = document.getElementById('project-type');
    const newTypeContainer = document.getElementById('new-type-container');
    const newProjectTypeInput = document.getElementById('new-project-type');
    const projectBudgetInput = document.getElementById('project-budget');
    const projectBenchmarkCpmInput = document.getElementById('project-benchmark-cpm');
    const projectYearSelect = document.getElementById('project-year');
    const projectMonthSelect = document.getElementById('project-month');
    const projectFinancialYearSelect = document.getElementById('project-financial-year');
    const projectFinancialMonthSelect = document.getElementById('project-financial-month');
    const financialMonthWarning = document.getElementById('financial-month-warning');
    const projectDiscountSelect = document.getElementById('project-discount');
    const projectCapitalRateSelect = document.getElementById('project-capital-rate');
    const filterNameInput = document.getElementById('filter-name');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterTimeDimensionSelect = document.getElementById('filter-time-dimension');
    const filterYearSelect = document.getElementById('filter-year');
    const filterMonthSelect = document.getElementById('filter-month');
    const filterStatusSelect = document.getElementById('filter-status');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const paginationControls = document.getElementById('pagination-controls');
    const statsDashboard = document.getElementById('stats-dashboard');
    
    const displaySettingsBtn = document.getElementById('display-settings-btn');
    const displaySettingsModal = document.getElementById('display-settings-modal');
    const closeDisplaySettingsModalBtn = document.getElementById('close-display-settings-modal-btn');
    const displaySettingsModalTabs = document.getElementById('display-settings-modal-tabs');
    const metricSettingsTab = document.getElementById('metric-settings-tab');
    const saveDashboardSettingsBtn = document.getElementById('save-dashboard-settings-btn');

    // --- State & Keys ---
    let allProjects = []; 
    let allConfigurations = []; // [新增] 用于存储所有配置的全局变量
    let currentPage = 1;
    let itemsPerPage = 5;
    let selectedOperationalMetrics = [];
    let selectedFinancialMetrics = [];
    let selectedDashboardMetrics = [];
    
    const ITEMS_PER_PAGE_KEY = 'projectListItemsPerPage';
    const OP_METRICS_KEY = 'projectListOpMetrics';
    const FIN_METRICS_KEY = 'projectListFinMetrics';
    const DASHBOARD_METRICS_KEY = 'projectDashboardMetrics';
    
    // --- Metadata for Metrics ---
    const ALL_LIST_METRICS = {
        projectBudget: { label: '项目预算', type: 'currency' },
        totalCollaborators: { label: '合作达人总数', type: 'number' },
        budgetUtilization: { label: '预算使用率', type: 'percent' },
        totalIncome: { label: '客户收入总计', type: 'currency' },
        totalRebateReceivable: { label: '应收返点', type: 'currency' },
        incomeAdjustments: { label: '收入调整', type: 'currency' },
        totalExpense: { label: '星图下单支出', type: 'currency' },
        totalFundsOccupationCost: { label: '资金占用费用', type: 'currency' },
        expenseAdjustments: { label: '支出调整', type: 'currency' },
        totalOperationalCost: { label: '总运营成本', type: 'currency' },
        preAdjustmentProfit: { label: '下单毛利润', type: 'currency' },
        preAdjustmentMargin: { label: '下单毛利率', type: 'percent' },
        operationalProfit: { label: '经营毛利润', type: 'currency' },
        operationalMargin: { label: '经营毛利率', type: 'percent' }
    };
    const ALL_STATS_METRICS = {
        projectCount: { label: '项目数量', type: 'number', color: 'text-gray-800' },
        totalCollaborators: { label: '合作达人', type: 'number', color: 'text-gray-800' },
        projectBudget: { label: '客户预算', type: 'currency', color: 'text-gray-800' },
        totalIncome: { label: '收入汇总', type: 'currency', color: 'text-green-600' },
        operationalProfit: { label: '经营毛利润', type: 'currency', color: 'text-blue-600' },
        operationalMargin: { label: '经营毛利率', type: 'percent', color: 'text-purple-600' },
        budgetUtilization: { label: '预算使用率', type: 'percent', color: 'text-orange-500' },
        totalExpense: { label: '星图总支出', type: 'currency', color: 'text-red-500' },
        totalOperationalCost: { label: '总运营成本', type: 'currency', color: 'text-red-600' },
        preAdjustmentProfit: { label: '下单毛利润', type: 'currency', color: 'text-indigo-600' },
        preAdjustmentMargin: { label: '下单毛利率', type: 'percent', color: 'text-pink-500' },
        totalFundsOccupationCost: { label: '资金占用费', type: 'currency', color: 'text-amber-600' },
        totalRebateReceivable: { label: '应收返点', type: 'currency', color: 'text-cyan-600' },
        incomeAdjustments: { label: '收入调整', type: 'currency', color: 'text-lime-600' },
        expenseAdjustments: { label: '支出调整', type: 'currency', color: 'text-rose-600' }
    };

    // --- API Request Function ---
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
            alert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    // --- Color Generation ---
    function generatePastelColorFromString(str) {
        if (!str) str = 'default';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; 
        }
        const h = Math.abs(hash % 360);
        const s = 75; 
        const l = 85; 
        const bg = `hsl(${h}, ${s}%, ${l}%)`;
        const text = `hsl(${h}, ${s}%, 30%)`;
        return { bg, text };
    }

    /**
     * [核心修正] 重构配置加载逻辑，一次性获取所有配置
     */
    async function loadAllConfigurations() {
        try {
            // 只发送一个请求来获取所有配置
            allConfigurations = await apiRequest('/configurations');
        } catch (error) {
            console.error("加载全局配置失败:", error);
            alert('加载项目所需配置失败，请刷新页面重试。');
        }
    }

    // --- Main Render Functions (No changes needed) ---
    function renderPage() {
        const nameFilter = filterNameInput.value.toLowerCase();
        const typeFilter = filterTypeSelect.value;
        const timeDimension = filterTimeDimensionSelect.value;
        const yearFilter = filterYearSelect.value;
        const monthFilter = filterMonthSelect.value;
        const statusFilter = filterStatusSelect.value;

        const filteredProjects = allProjects.filter(project => {
            const nameMatch = project.name.toLowerCase().includes(nameFilter) || (project.qianchuanId || '').toLowerCase().includes(nameFilter);
            const typeMatch = !typeFilter || project.type === typeFilter;
            const statusMatch = !statusFilter || project.status === statusFilter;
            
            let timeMatch = true;
            if (yearFilter || monthFilter) {
                 const yearField = timeDimension === 'financial' ? 'financialYear' : 'year';
                 const monthField = timeDimension === 'financial' ? 'financialMonth' : 'month';
                 const yearMatch = !yearFilter || project[yearField] === yearFilter;
                 const monthMatch = !monthFilter || project[monthField] === monthFilter;
                 timeMatch = yearMatch && monthMatch;
            }
            return nameMatch && typeMatch && statusMatch && timeMatch;
        });

        renderStats(filteredProjects);
        const sortedProjects = filteredProjects.sort((a, b) => {
            const yearA = parseInt(a.financialYear) || 0, monthA = parseInt((a.financialMonth || 'M0').replace('M', '')) || 0;
            const yearB = parseInt(b.financialYear) || 0, monthB = parseInt((b.financialMonth || 'M0').replace('M', '')) || 0;
            if (yearB !== yearA) return yearB - yearA;
            if (monthB !== monthA) return monthB - monthA;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const paginatedProjects = sortedProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        renderProjectList(paginatedProjects);
        renderPagination(totalPages, sortedProjects.length);
    }
    
    function getStatusTagHtml(status) {
        const statusMap = { '执行中': 'bg-blue-100 text-blue-800', '待结算': 'bg-orange-100 text-orange-800', '已收款': 'bg-green-100 text-green-800', '已终结': 'bg-gray-200 text-gray-800' };
        return `<span class="text-xs font-medium px-2 py-0.5 rounded-md ${statusMap[status] || 'bg-gray-100 text-gray-800'}">${status}</span>`;
    }

    function renderProjectList(projectsToRender) {
        projectList.innerHTML = '';
        noProjectsMessage.classList.toggle('hidden', allProjects.length > 0);
        projectList.parentElement.classList.toggle('hidden', allProjects.length === 0);

        if (projectsToRender.length === 0 && allProjects.length > 0) {
            projectList.innerHTML = `<div class="text-center py-16 px-6"><p class="text-gray-500">未找到匹配的项目。</p></div>`;
        } else {
            projectsToRender.forEach(project => {
                const metrics = project.metrics || {};
                
                const formatMetric = (value, type) => {
                    if (value === null || typeof value === 'undefined') return 'N/A';
                    if (value === 0 && type !== 'percent') return '¥ 0.00';
                    switch(type) {
                        case 'currency': return `¥ ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                        case 'percent': return `${value.toFixed(2)}%`;
                        default: return value.toLocaleString();
                    }
                };
                
                const adaptedOperationalMetrics = selectedOperationalMetrics.map(key => ({
                    key: key, 
                    label: ALL_LIST_METRICS[key].label, 
                    type: ALL_LIST_METRICS[key].type 
                }));

                const adaptedFinancialMetrics = selectedFinancialMetrics.map(key => {
                    if (key === 'totalFundsOccupationCost') {
                        return { key: 'fundsOccupationCost', label: ALL_LIST_METRICS['totalFundsOccupationCost'].label, type: ALL_LIST_METRICS['totalFundsOccupationCost'].type };
                    }
                    return { key: key, label: ALL_LIST_METRICS[key].label, type: ALL_LIST_METRICS[key].type };
                });

                const createMetricsHtml = (metricObjects) => metricObjects.map(metric => `<div class="grid grid-cols-[auto,1fr] gap-x-4"><span class="text-gray-500 whitespace-nowrap">${metric.label}:</span><span class="font-semibold text-gray-900 text-right">${formatMetric(metrics[metric.key], metric.type)}</span></div>`).join('');
                
                const isFinalState = project.status === '已终结';
                const nextStatusMap = { '执行中': '待结算', '待结算': '已收款', '已收款': '已终结' };
                const prevStatusMap = { '待结算': '执行中', '已收款': '待结算' };
                const nextStatus = nextStatusMap[project.status];
                const prevStatus = prevStatusMap[project.status];

                let statusBtnClass = 'bg-blue-600 hover:bg-blue-700';
                if (nextStatus === '已收款') { statusBtnClass = 'bg-green-600 hover:bg-green-700'; } 
                else if (nextStatus === '已终结') { statusBtnClass = 'bg-gray-500 hover:bg-gray-600'; }

                const statusChangeBtnHtml = nextStatus 
                    ? `<button data-project-id="${project.id}" data-next-status="${nextStatus}" class="px-3 py-1 text-sm font-semibold rounded-md text-white transition-all change-status-btn ${statusBtnClass}">推进至 &lt;${nextStatus}&gt;</button>` 
                    : '';
                
                const rollbackLink = prevStatus ? `<a href="#" class="rollback-status-btn" data-project-id="${project.id}" data-prev-status="${prevStatus}">回滚至上一状态</a>` : '';
                
                const typeColor = generatePastelColorFromString(project.type);
                const typeTagHtml = project.type ? `<span class="text-xs font-medium px-2 py-0.5 rounded-md" style="background-color:${typeColor.bg}; color:${typeColor.text};">${project.type}</span>` : '';

                const row = document.createElement('div');
                row.className = "px-6 py-4 grid grid-cols-10 gap-4 items-center hover:bg-gray-50 transition-colors";
                
                row.innerHTML = `
                    <div class="col-span-12 md:col-span-2 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">${getStatusTagHtml(project.status)}${typeTagHtml}${!project.financialMonth ? '<span class="text-xs font-medium px-2 py-0.5 rounded-md bg-red-100 text-red-800">待补全财务月份</span>' : ''}</div>
                        <p class="text-base font-semibold text-gray-800 truncate mt-2" title="${project.name}">${project.name}</p>
                        <p class="text-xs text-gray-500 mt-1">仟传编号: ${project.qianchuanId || 'N/A'}</p>
                        <p class="text-xs text-gray-500">客户月份: ${project.year || 'N/A'}-${project.month || 'N/A'}</p>
                        <p class="text-xs text-gray-500">财务月份: ${project.financialYear || 'N/A'}-${project.financialMonth || 'N/A'}</p>
                    </div>
                    <div class="col-span-5 md:col-span-3 text-sm space-y-1.5">${createMetricsHtml(adaptedOperationalMetrics)}</div>
                    <div class="col-span-5 md:col-span-3 text-sm space-y-1.5">${createMetricsHtml(adaptedFinancialMetrics)}</div>
                    <div class="col-span-12 md:col-span-2">
                        <div class="flex flex-col items-center justify-center gap-2">
                            ${statusChangeBtnHtml}
                            <div class="flex items-center gap-2 mt-1">
                                <a href="order_list.html?projectId=${project.id}" class="px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">进展</a>
                                <div class="dropdown">
                                    <button class="px-2 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>
                                    <div class="dropdown-content">
                                        <a href="#" class="edit-project-btn ${isFinalState ? 'disabled' : ''}" data-project-id="${project.id}">编辑基础信息</a>
                                        ${rollbackLink}
                                        <a href="#" class="delete-project-btn" data-project-id="${project.id}">删除项目</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                projectList.appendChild(row);
            });
        }
    }

    function renderPagination(totalPages, totalItems) {
        paginationControls.innerHTML = '';
        if (totalItems === 0) return;
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"><option value="5" ${itemsPerPage === 5 ? 'selected' : ''}>5</option><option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option><option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option></select></div>`;
        const pageButtons = [];
        if (totalPages > 1) { for (let i = 1; i <= totalPages; i++) { pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`); } }
        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-2"><button id="prev-page-btn" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons.join('')}<button id="next-page-btn" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button></div>` : '<div></div>';
        paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }

    function renderStats(projectsToStat) {
        statsDashboard.innerHTML = '';
        if (projectsToStat.length === 0 && selectedDashboardMetrics.length > 0) {
             statsDashboard.innerHTML = selectedDashboardMetrics.map(key => {
                const metricInfo = ALL_STATS_METRICS[key];
                return `<div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-sm text-gray-500">${metricInfo.label}</p><p class="text-2xl font-bold ${metricInfo.color} mt-1">N/A</p></div>`;
            }).join('');
            return;
        }

        const aggregatedMetrics = projectsToStat.reduce((acc, project) => {
            const metrics = project.metrics || {};
            Object.keys(acc).forEach(key => {
                let sourceKey = key;
                if (key === 'totalFundsOccupationCost') { sourceKey = 'fundsOccupationCost'; }
                if (metrics[sourceKey] && typeof metrics[sourceKey] === 'number') { acc[key] += metrics[sourceKey]; }
            });
            return acc;
        }, { projectCount: 0, totalCollaborators: 0, projectBudget: 0, totalIncome: 0, operationalProfit: 0, totalExpense: 0, totalOperationalCost: 0, preAdjustmentProfit: 0, totalFundsOccupationCost: 0, totalRebateReceivable: 0, incomeAdjustments: 0, expenseAdjustments: 0 });

        aggregatedMetrics.projectCount = projectsToStat.length;
        aggregatedMetrics.operationalMargin = aggregatedMetrics.totalIncome === 0 ? 0 : (aggregatedMetrics.operationalProfit / aggregatedMetrics.totalIncome) * 100;
        aggregatedMetrics.budgetUtilization = aggregatedMetrics.projectBudget === 0 ? 0 : (aggregatedMetrics.totalIncome / aggregatedMetrics.projectBudget) * 100;
        aggregatedMetrics.preAdjustmentMargin = aggregatedMetrics.totalIncome === 0 ? 0 : (aggregatedMetrics.preAdjustmentProfit / aggregatedMetrics.totalIncome) * 100;

        statsDashboard.innerHTML = selectedDashboardMetrics.map(key => {
            const metricInfo = ALL_STATS_METRICS[key];
            const value = aggregatedMetrics[key];
            let formattedValue;
            if (metricInfo.type === 'currency') formattedValue = `¥ ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            else if (metricInfo.type === 'percent') formattedValue = `${value.toFixed(2)}%`;
            else formattedValue = value.toLocaleString();
            return `<div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-sm text-gray-500">${metricInfo.label}</p><p class="text-2xl font-bold ${metricInfo.color} mt-1">${formattedValue}</p></div>`;
        }).join('');
    }

    /**
     * [核心修正] 修正 populateFilters，使其从 allConfigurations 中获取数据
     */
    function populateFilters() {
        const projectTypes = (allConfigurations.find(c => c.type === 'PROJECT_TYPES') || {}).values || [];
        filterTypeSelect.innerHTML = '<option value="">所有类型</option>';
        projectTypes.forEach(type => {
            const typeName = typeof type === 'object' && type.name ? type.name : type;
            filterTypeSelect.innerHTML += `<option value="${typeName}">${typeName}</option>`;
        });
        const currentYear = new Date().getFullYear();
        filterYearSelect.innerHTML = '<option value="">所有年份</option>';
        for (let i = currentYear - 2; i <= currentYear + 5; i++) filterYearSelect.innerHTML += `<option value="${i}">${i}年</option>`;
        filterMonthSelect.innerHTML = '<option value="">所有月份</option>';
        for (let i = 1; i <= 12; i++) filterMonthSelect.innerHTML += `<option value="M${i}">M${i}</option>`;
        filterStatusSelect.innerHTML = '<option value="">所有状态</option>';
        ['执行中', '待结算', '已收款', '已终结'].forEach(status => filterStatusSelect.innerHTML += `<option value="${status}">${status}</option>`);
    }

    function openModal(projectId = null) {
        projectForm.reset();
        editingProjectIdInput.value = '';
        financialMonthWarning.classList.add('hidden');
        populateTimeSelects();
        populateCapitalRateSelect(); 
        populateDiscountSelect();
        populateTypeSelect(); 

        if (projectId) {
            const projectToEdit = allProjects.find(p => p.id === projectId);
            if (projectToEdit) {
                modalTitle.textContent = '编辑项目';
                modalSubmitBtn.textContent = '保存更改';
                editingProjectIdInput.value = projectId;
                projectNameInput.value = projectToEdit.name;
                projectQianchuanIdInput.value = projectToEdit.qianchuanId || '';
                projectBudgetInput.value = projectToEdit.budget || ''; // 使用原始 budget 字段
                projectBenchmarkCpmInput.value = projectToEdit.benchmarkCPM || '';
                projectYearSelect.value = projectToEdit.year || '';
                projectMonthSelect.value = projectToEdit.month || '';
                projectFinancialYearSelect.value = projectToEdit.financialYear || '';
                projectFinancialMonthSelect.value = projectToEdit.financialMonth || '';
                projectDiscountSelect.value = projectToEdit.discount || ''; // 对应 value
                projectCapitalRateSelect.value = projectToEdit.capitalRateId || ''; // 对应 id
                projectTypeSelect.value = projectToEdit.type || '';
                if (!projectToEdit.financialMonth) financialMonthWarning.classList.remove('hidden');
            }
        } else {
            modalTitle.textContent = '创建新项目';
            modalSubmitBtn.textContent = '确认创建';
        }
        projectModal.classList.remove('hidden');
        setTimeout(() => projectModalContent.classList.remove('scale-95', 'opacity-0'), 10);
    }
    
    function closeModal() {
        projectModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { projectModal.classList.add('hidden'); newTypeContainer.classList.add('hidden'); }, 300);
    }

    function populateTimeSelects() {
        const currentYear = new Date().getFullYear();
        projectYearSelect.innerHTML = '<option value="">选择年份</option>';
        projectFinancialYearSelect.innerHTML = '<option value="">选择年份</option>';
        for (let i = currentYear - 2; i <= currentYear + 5; i++) {
            projectYearSelect.innerHTML += `<option value="${i}">${i}年</option>`;
            projectFinancialYearSelect.innerHTML += `<option value="${i}">${i}年</option>`;
        }
        projectMonthSelect.innerHTML = '<option value="">选择月份</option>';
        projectFinancialMonthSelect.innerHTML = '<option value="">选择月份</option>';
        for (let i = 1; i <= 12; i++) {
            projectMonthSelect.innerHTML += `<option value="M${i}">M${i}</option>`;
            projectFinancialMonthSelect.innerHTML += `<option value="M${i}">M${i}</option>`;
        }
    }

    /**
     * [核心修正] 修正 populateTypeSelect，使其从 allConfigurations 中获取数据
     */
    function populateTypeSelect() {
        const projectTypes = (allConfigurations.find(c => c.type === 'PROJECT_TYPES') || {}).values || [];
        const currentVal = projectTypeSelect.value;
        projectTypeSelect.innerHTML = '<option value="">请选择项目类型</option>';
        projectTypes.forEach(type => {
            const typeName = typeof type === 'object' && type.name ? type.name : type;
            projectTypeSelect.innerHTML += `<option value="${typeName}">${typeName}</option>`;
        });
        projectTypeSelect.innerHTML += '<option value="add_new">-- 添加新类型 --</option>';
        projectTypeSelect.value = currentVal;
    }
    
    /**
     * [核心修正] 修正 populateCapitalRateSelect，使其从 allConfigurations 中获取数据
     */
    function populateCapitalRateSelect(selectedId = '') {
        const capitalRates = (allConfigurations.find(c => c.type === 'CAPITAL_RATES') || {}).values || [];
        projectCapitalRateSelect.innerHTML = '<option value="">-- 选择费率标准 --</option>';
        capitalRates.forEach(rate => projectCapitalRateSelect.innerHTML += `<option value="${rate.id}" ${rate.id === selectedId ? 'selected' : ''}>${rate.name} (${rate.value}%)</option>`);
    }

    /**
     * [核心修正] 修正 populateDiscountSelect，使其从 allConfigurations 中获取数据
     */
    function populateDiscountSelect(selectedValue = '') {
        const frameworkDiscounts = (allConfigurations.find(c => c.type === 'FRAMEWORK_DISCOUNTS') || {}).values || [];
        projectDiscountSelect.innerHTML = '<option value="">-- 无框架折扣 --</option>';
        frameworkDiscounts.forEach(discount => projectDiscountSelect.innerHTML += `<option value="${discount.value}" ${discount.value === selectedValue ? 'selected' : ''}>${discount.name} (${discount.value})</option>`);
    }

    // --- Display Settings Functions (No changes needed) ---
    function openDisplaySettingsModal() { /* ... */ }
    function closeDisplaySettingsModal() { /* ... */ }
    function renderMetricSelectionUI() { /* ... */ }
    function renderDashboardSettings() { /* ... */ }
    function handleDashboardSettingsSave() { /* ... */ }
    function handleMetricSelectionChange(event) { /* ... */ }
    
    let draggedItem = null;

    async function initializePage() {
        selectedOperationalMetrics = JSON.parse(localStorage.getItem(OP_METRICS_KEY)) || ['totalCollaborators', 'budgetUtilization'];
        selectedFinancialMetrics = JSON.parse(localStorage.getItem(FIN_METRICS_KEY)) || ['totalIncome', 'operationalMargin'];
        selectedDashboardMetrics = JSON.parse(localStorage.getItem(DASHBOARD_METRICS_KEY)) || ['projectCount', 'totalCollaborators', 'projectBudget', 'totalIncome', 'operationalProfit', 'operationalMargin'];
        itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '5');
        
        // 先加载全局配置
        await loadAllConfigurations();
        
        try {
            const response = await apiRequest('/projects');
            allProjects = response.data;
            populateFilters(); // 用加载好的配置填充过滤器
            renderPage();
        } catch (error) {
            console.error("加载项目数据失败", error);
            noProjectsMessage.classList.remove('hidden');
            projectList.parentElement.classList.add('hidden');
        }

        // --- Event Listeners ---
        addProjectBtn.addEventListener('click', () => openModal());
        closeModalBtn.addEventListener('click', closeModal);
        projectModal.addEventListener('click', e => { if (e.target === projectModal) closeModal(); });
        
        if (displaySettingsBtn) displaySettingsBtn.addEventListener('click', openDisplaySettingsModal);
        if (closeDisplaySettingsModalBtn) closeDisplaySettingsModalBtn.addEventListener('click', closeDisplaySettingsModal);
        if (saveDashboardSettingsBtn) saveDashboardSettingsBtn.addEventListener('click', handleDashboardSettingsSave);
        if (displaySettingsModalTabs) {
             displaySettingsModalTabs.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-tab-btn')) {
                    document.querySelectorAll('#display-settings-modal-tabs .modal-tab-btn').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    document.querySelectorAll('.modal-tab-pane').forEach(pane => pane.classList.add('hidden'));
                    document.getElementById(e.target.dataset.tabTarget).classList.remove('hidden');
                }
            });
        }
        
        projectTypeSelect.addEventListener('change', () => newTypeContainer.classList.toggle('hidden', projectTypeSelect.value !== 'add_new'));
        [filterNameInput, filterTypeSelect, filterTimeDimensionSelect, filterYearSelect, filterMonthSelect, filterStatusSelect].forEach(el => el.addEventListener('input', () => { currentPage = 1; renderPage(); }));
        resetFiltersBtn.addEventListener('click', () => {
             filterNameInput.value = '';
             filterTypeSelect.value = '';
             filterTimeDimensionSelect.value = 'financial';
             filterYearSelect.value = '';
             filterMonthSelect.value = '';
             filterStatusSelect.value = '';
             currentPage = 1;
             renderPage();
        });
        
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = editingProjectIdInput.value;
            let projectType = projectTypeSelect.value;
            if (projectType === 'add_new') {
                const newType = newProjectTypeInput.value.trim();
                if (newType) {
                    try {
                        // 注意：这里需要调用 /configurations 接口
                        await apiRequest('/configurations', 'POST', { type: 'PROJECT_TYPES', name: newType });
                        await loadAllConfigurations();
                        populateTypeSelect();
                        projectTypeSelect.value = newType;
                        newTypeContainer.classList.add('hidden');
                        newProjectTypeInput.value = '';
                        projectType = newType;
                    } catch(err) { alert('添加新项目类型失败，请前往管理后台操作'); return; }
                } else { alert('新类型名称不能为空'); return; }
            }
            const financialYear = projectFinancialYearSelect.value;
            const financialMonth = projectFinancialMonthSelect.value;
            if (!projectNameInput.value.trim() || !projectType || !financialYear || !financialMonth) { alert('项目名称、类型和财务归属月份为必填项'); return; }
            const projectData = { name: projectNameInput.value.trim(), qianchuanId: projectQianchuanIdInput.value.trim(), type: projectType, budget: projectBudgetInput.value, benchmarkCPM: projectBenchmarkCpmInput.value, year: projectYearSelect.value, month: projectMonthSelect.value, financialYear, financialMonth, discount: projectDiscountSelect.value, capitalRateId: projectCapitalRateSelect.value };
            if (editingId) { await apiRequest('/update-project', 'PUT', { id: editingId, ...projectData }); } 
            else { await apiRequest('/projects', 'POST', projectData); }
            try {
                const response = await apiRequest('/projects');
                allProjects = response.data;
                populateFilters();
                renderPage();
                closeModal();
            } catch (error) { /* Handled in apiRequest */ }
        });
        
        projectList.addEventListener('click', async e => {
            const target = e.target.closest('a, button');
            if (!target) return;
            const projectId = target.dataset.projectId;
            const project = allProjects.find(p => p.id === projectId);
            if (!project) return;
            if (target.classList.contains('edit-project-btn')) { e.preventDefault(); if (!target.classList.contains('disabled')) openModal(projectId); }
            if (target.classList.contains('delete-project-btn')) {
                e.preventDefault();
                if (confirm(`您确定要删除项目 "${project.name}" 吗？\n\n此操作将同时删除该项目下的所有合作达人信息，且不可撤销！`)) {
                    try { await apiRequest('/delete-project', 'DELETE', { projectId }); const response = await apiRequest('/projects'); allProjects = response.data; renderPage(); } 
                    catch(error) {/* handled in apiRequest */}
                }
            }
            if (target.classList.contains('change-status-btn')) {
                e.preventDefault();
                const nextStatus = target.dataset.nextStatus;
                if (confirm(`您确定要将项目 "${project.name}" 的状态推进至 "${nextStatus}" 吗？`)) {
                    try { await apiRequest('/update-project', 'PUT', { id: projectId, status: nextStatus }); project.status = nextStatus; renderPage(); } 
                    catch(error) {/* handled in apiRequest */}
                }
            }
            if (target.classList.contains('rollback-status-btn')) {
                e.preventDefault();
                const prevStatus = target.dataset.prevStatus;
                if (confirm(`您确定要将项目 "${project.name}" 的状态回滚至 "${prevStatus}" 吗？`)) {
                     try { await apiRequest('/update-project', 'PUT', { id: projectId, status: prevStatus }); project.status = prevStatus; renderPage(); } 
                     catch(error) {/* handled in apiRequest */}
                }
            }
        });

        if (metricSettingsTab) {
            metricSettingsTab.addEventListener('change', handleMetricSelectionChange);
        }
        
        if (displaySettingsModal) {
            displaySettingsModal.addEventListener('dragstart', e => { if (e.target.classList.contains('draggable-metric')) { draggedItem = e.target; setTimeout(() => e.target.style.opacity = '0.5', 0); } });
            displaySettingsModal.addEventListener('dragend', e => { if (draggedItem) { setTimeout(() => { draggedItem.style.opacity = '1'; draggedItem = null; }, 0); } });
            displaySettingsModal.addEventListener('dragover', e => { e.preventDefault(); const dropZone = e.target.closest('.drop-zone'); if (dropZone) dropZone.classList.add('drag-over'); });
            displaySettingsModal.addEventListener('dragleave', e => { const dropZone = e.target.closest('.drop-zone'); if (dropZone) dropZone.classList.remove('drag-over'); });
            displaySettingsModal.addEventListener('drop', e => {
                e.preventDefault();
                const dropZone = e.target.closest('.drop-zone');
                if (dropZone && draggedItem) {
                    dropZone.classList.remove('drag-over');
                    const existingItem = dropZone.querySelector('.draggable-metric');
                    const sourceContainer = draggedItem.parentElement;
                    if (existingItem) sourceContainer.appendChild(existingItem);
                    dropZone.innerHTML = '';
                    dropZone.appendChild(draggedItem);
                    dropZone.classList.remove('bg-gray-200');
                }
            });
        }
        
        paginationControls.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (!target || target.disabled) return;
            const totalPages = Math.ceil(allProjects.filter(p => p.name.toLowerCase().includes(filterNameInput.value.toLowerCase())).length / itemsPerPage);
            if (target.id === 'prev-page-btn' && currentPage > 1) currentPage--;
            else if (target.id === 'next-page-btn' && currentPage < totalPages) currentPage++;
            else if (target.dataset.page) currentPage = Number(target.dataset.page);
            renderPage();
        });
        paginationControls.addEventListener('change', e => { if (e.target.id === 'items-per-page') { itemsPerPage = parseInt(e.target.value); currentPage = 1; localStorage.setItem(ITEMS_PER_PAGE_KEY, itemsPerPage); renderPage(); } });
    }
    
    // 省略部分未改动的函数以保持简洁
    function openDisplaySettingsModal() {
        if (displaySettingsModal) {
            renderMetricSelectionUI();
            renderDashboardSettings();
            displaySettingsModal.classList.remove('hidden');
        }
    }
    function closeDisplaySettingsModal() {
        if (displaySettingsModal) {
            displaySettingsModal.classList.add('hidden');
        }
    }
    function renderMetricSelectionUI() {
        const opContainer = document.getElementById('operational-metric-selection');
        const finContainer = document.getElementById('financial-metric-selection');
        if (!opContainer || !finContainer) return;
        opContainer.innerHTML = '';
        finContainer.innerHTML = '';
        for (const key in ALL_LIST_METRICS) {
            const metric = ALL_LIST_METRICS[key];
            const isSelectedInOp = selectedOperationalMetrics.includes(key);
            const isSelectedInFin = selectedFinancialMetrics.includes(key);
            opContainer.innerHTML += `<label class="flex items-center p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-blue-50"><input type="checkbox" value="${key}" data-group="op" class="metric-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${isSelectedInOp ? 'checked' : ''} ${isSelectedInFin ? 'disabled' : ''}><span class="ml-3 text-sm font-medium text-gray-700 ${isSelectedInFin ? 'text-gray-400' : ''}">${metric.label}</span></label>`;
            finContainer.innerHTML += `<label class="flex items-center p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-blue-50"><input type="checkbox" value="${key}" data-group="fin" class="metric-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${isSelectedInFin ? 'checked' : ''} ${isSelectedInOp ? 'disabled' : ''}><span class="ml-3 text-sm font-medium text-gray-700 ${isSelectedInOp ? 'text-gray-400' : ''}">${metric.label}</span></label>`;
        }
    }
    function renderDashboardSettings() {
        const metricPool = document.getElementById('metric-pool');
        const dashboardSlots = document.getElementById('dashboard-slots');
        if (!metricPool || !dashboardSlots) return;
        metricPool.innerHTML = '';
        dashboardSlots.innerHTML = '';
        const availableMetrics = Object.keys(ALL_STATS_METRICS).filter(key => !selectedDashboardMetrics.includes(key));
        availableMetrics.forEach(key => {
            const metric = ALL_STATS_METRICS[key];
            metricPool.innerHTML += `<div class="p-2 bg-white rounded shadow-sm border draggable-metric" draggable="true" data-metric-key="${key}">${metric.label}</div>`;
        });
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'p-4 bg-gray-200 rounded-lg border-2 border-gray-300 drop-zone flex items-center justify-center text-sm text-gray-500';
            slot.dataset.slotIndex = i;
            const metricKey = selectedDashboardMetrics[i];
            if (metricKey) {
                slot.innerHTML = `<div class="p-2 bg-white rounded shadow-sm border draggable-metric" draggable="true" data-metric-key="${metricKey}">${ALL_STATS_METRICS[metricKey].label}</div>`;
                slot.classList.remove('bg-gray-200');
            } else {
                slot.textContent = `卡槽 ${i + 1}`;
            }
            dashboardSlots.appendChild(slot);
        }
    }
    function handleDashboardSettingsSave() {
        const slots = document.querySelectorAll('#dashboard-slots .drop-zone');
        const newConfig = Array.from(slots).map(slot => slot.querySelector('.draggable-metric')?.dataset.metricKey).filter(Boolean);
        if (newConfig.length < 6) { alert('请填满所有6个看板卡槽。'); return; }
        selectedDashboardMetrics = newConfig;
        localStorage.setItem(DASHBOARD_METRICS_KEY, JSON.stringify(selectedDashboardMetrics));
        closeDisplaySettingsModal();
        renderPage();
    }
    function handleMetricSelectionChange(event) {
        const checkbox = event.target;
        if (!checkbox.matches('.metric-checkbox')) return;
        const group = checkbox.dataset.group;
        const checkedCount = document.querySelectorAll(`.metric-checkbox[data-group="${group}"]:checked`).length;
        const limit = 3;
        if (checkedCount > limit) {
            alert(`该类别最多只能选择 ${limit} 项。`);
            checkbox.checked = false;
            return;
        }
        selectedOperationalMetrics = Array.from(document.querySelectorAll('.metric-checkbox[data-group="op"]:checked')).map(cb => cb.value);
        selectedFinancialMetrics = Array.from(document.querySelectorAll('.metric-checkbox[data-group="fin"]:checked')).map(cb => cb.value);
        localStorage.setItem(OP_METRICS_KEY, JSON.stringify(selectedOperationalMetrics));
        localStorage.setItem(FIN_METRICS_KEY, JSON.stringify(selectedFinancialMetrics));
        renderMetricSelectionUI();
        renderPage();
    }

    initializePage();
});
