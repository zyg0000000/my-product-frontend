/**
 * @file project_analysis.js
 * @version 3.0 - Frontend Calculation Alignment
 * @description [BUG FIX] 修复项目数量计算不一致问题。改为使用与 index.js 相同的前端计算逻辑，
 *              从 /projects API 获取数据并在前端进行筛选和聚合。
 *
 * @changelog
 * - v3.0 (2025-11-01):
 * - [BUG FIX] 不再使用 /getAnalysisData API，改为使用 /projects API
 * - [REFACTOR] 复用 index.js 的筛选和聚合计算逻辑
 * - [FEATURE] 在前端计算月度趋势数据
 * - [CONSISTENCY] 确保与项目列表页面的项目数量计算一致
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const loadingIndicator = document.getElementById('loading-indicator');
    const analysisContent = document.getElementById('analysis-content');
    const filterTimeDimension = document.getElementById('filter-time-dimension');
    const filterYear = document.getElementById('filter-year');
    const filterMonth = document.getElementById('filter-month');
    const filterProjectType = document.getElementById('filter-project-type');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Chart instances
    let monthlyTrendChart = null;

    // Data state
    let allProjects = [];

    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

    // --- Helper Functions ---
    const formatCurrency = (num) => `¥${(Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercent = (num) => `${(Number(num) || 0).toFixed(2)}%`;
    const formatNumber = (num) => (Number(num) || 0).toLocaleString();

    // --- API Request Function (复用 index.js 的逻辑) ---
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
            throw error;
        }
    }

    // --- Core Functions ---
    async function initializePage() {
        populateMonthFilter();
        setupEventListeners();
        await loadProjectsAndRender();
    }

    async function loadProjectsAndRender() {
        loadingIndicator.classList.remove('hidden');
        analysisContent.classList.add('hidden');

        try {
            const response = await apiRequest('/projects');
            allProjects = response.data || [];
            populateFiltersFromData();
            renderAnalysis();
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            analysisContent.innerHTML = `<p class="text-center py-16 text-red-500">数据加载失败，请刷新重试。</p>`;
        } finally {
            loadingIndicator.classList.add('hidden');
            analysisContent.classList.remove('hidden');
        }
    }

    function populateFiltersFromData() {
        // 获取所有唯一的年份
        const years = [...new Set(allProjects.map(p => p.financialYear).filter(Boolean))].sort((a, b) => b - a);
        const currentYear = filterYear.value;
        filterYear.innerHTML = '<option value="">所有年份</option>';
        years.forEach(year => {
            filterYear.innerHTML += `<option value="${year}">${year}年</option>`;
        });
        if (currentYear) filterYear.value = currentYear;

        // 获取所有唯一的项目类型
        const types = [...new Set(allProjects.map(p => p.type).filter(Boolean))].sort();
        const currentType = filterProjectType.value;
        filterProjectType.innerHTML = '<option value="">所有类型</option>';
        types.forEach(type => {
            filterProjectType.innerHTML += `<option value="${type}">${type}</option>`;
        });
        if (currentType) filterProjectType.value = currentType;
    }

    function populateMonthFilter() {
        const currentMonth = filterMonth.value;
        filterMonth.innerHTML = '<option value="">所有月份</option>';
        for (let i = 1; i <= 12; i++) {
            filterMonth.innerHTML += `<option value="M${i}">M${i}</option>`;
        }
        if (currentMonth) filterMonth.value = currentMonth;
    }

    function renderAnalysis() {
        // 使用与 index.js 相同的筛选逻辑
        const filteredProjects = filterProjects();

        // 计算 KPI 汇总数据
        const kpiSummary = calculateKpiSummary(filteredProjects);
        renderKpiCards(kpiSummary);

        // 计算月度趋势数据
        const monthlyData = calculateMonthlyTrends(filteredProjects);
        renderMonthlyTrendChart(monthlyData);
    }

    // 复用 index.js 的筛选逻辑 (index.js 第183-197行)
    function filterProjects() {
        const typeFilter = filterProjectType.value;
        const timeDimension = filterTimeDimension.value;
        const yearFilter = filterYear.value;
        const monthFilter = filterMonth.value;

        return allProjects.filter(project => {
            const typeMatch = !typeFilter || project.type === typeFilter;

            let timeMatch = true;
            if (yearFilter || monthFilter) {
                const yearField = timeDimension === 'financial' ? 'financialYear' : 'year';
                const monthField = timeDimension === 'financial' ? 'financialMonth' : 'month';
                const yearMatch = !yearFilter || project[yearField] === yearFilter;
                const monthMatch = !monthFilter || project[monthField] === monthFilter;
                timeMatch = yearMatch && monthMatch;
            }

            return typeMatch && timeMatch;
        });
    }

    // 复用 index.js 的聚合计算逻辑 (index.js 第336-349行)
    function calculateKpiSummary(projects) {
        const aggregated = projects.reduce((acc, project) => {
            const metrics = project.metrics || {};
            Object.keys(acc).forEach(key => {
                let sourceKey = key;
                if (key === 'totalFundsOccupationCost') {
                    sourceKey = 'fundsOccupationCost';
                }
                if (metrics[sourceKey] && typeof metrics[sourceKey] === 'number') {
                    acc[key] += metrics[sourceKey];
                }
            });
            return acc;
        }, {
            totalProjects: 0,
            totalCollaborators: 0,
            projectBudget: 0,
            totalIncome: 0,
            operationalProfit: 0,
            totalExpense: 0,
            totalOperationalCost: 0,
            preAdjustmentProfit: 0,
            totalFundsOccupationCost: 0,
            totalRebateReceivable: 0,
            incomeAdjustments: 0,
            expenseAdjustments: 0
        });

        // 计算派生指标
        aggregated.totalProjects = projects.length;
        aggregated.operationalMargin = aggregated.totalIncome === 0 ? 0 : (aggregated.operationalProfit / aggregated.totalIncome) * 100;
        aggregated.preAdjustmentMargin = aggregated.totalIncome === 0 ? 0 : (aggregated.preAdjustmentProfit / aggregated.totalIncome) * 100;
        aggregated.budgetUtilization = aggregated.projectBudget === 0 ? 0 : (aggregated.totalIncome / aggregated.projectBudget) * 100;

        return {
            totalProjects: aggregated.totalProjects,
            totalCollaborators: aggregated.totalCollaborators,
            totalIncomeAgg: aggregated.totalIncome,
            incomeAdjustments: aggregated.incomeAdjustments,
            preAdjustmentProfit: aggregated.preAdjustmentProfit,
            preAdjustmentMargin: aggregated.preAdjustmentMargin,
            operationalProfit: aggregated.operationalProfit,
            operationalMargin: aggregated.operationalMargin,
            totalExpense: aggregated.totalExpense,
            fundsOccupationCost: aggregated.totalFundsOccupationCost,
            expenseAdjustments: aggregated.expenseAdjustments,
            totalOperationalCost: aggregated.totalOperationalCost
        };
    }

    // 计算月度趋势数据（按选定的时间维度分组）
    function calculateMonthlyTrends(projects) {
        const timeDimension = filterTimeDimension.value;
        const yearField = timeDimension === 'financial' ? 'financialYear' : 'year';
        const monthField = timeDimension === 'financial' ? 'financialMonth' : 'month';

        // 按年月分组
        const monthlyMap = {};
        projects.forEach(project => {
            const year = project[yearField];
            const month = project[monthField];
            if (!year || !month) return;

            const key = `${year}-${month}`;
            if (!monthlyMap[key]) {
                monthlyMap[key] = {
                    year,
                    month,
                    projects: [],
                    totalIncome: 0,
                    operationalProfit: 0
                };
            }

            monthlyMap[key].projects.push(project);
            const metrics = project.metrics || {};
            if (metrics.totalIncome) monthlyMap[key].totalIncome += metrics.totalIncome;
            if (metrics.operationalProfit) monthlyMap[key].operationalProfit += metrics.operationalProfit;
        });

        // 转换为数组并排序
        const monthlyArray = Object.values(monthlyMap)
            .map(item => {
                const margin = item.totalIncome === 0 ? 0 : (item.operationalProfit / item.totalIncome) * 100;
                return {
                    month: `${item.year}-${item.month}`,
                    totalIncome: item.totalIncome,
                    margin: margin
                };
            })
            .sort((a, b) => {
                const [yearA, monthA] = a.month.split('-');
                const [yearB, monthB] = b.month.split('-');
                const monthNumA = parseInt(monthA.replace('M', ''));
                const monthNumB = parseInt(monthB.replace('M', ''));

                if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
                return monthNumA - monthNumB;
            });

        return monthlyArray;
    }

    function renderKpiCards(kpiSummary) {
        if (!kpiSummary) return;

        document.getElementById('kpi-total-projects').textContent = formatNumber(kpiSummary.totalProjects);
        document.getElementById('kpi-total-collaborators').textContent = formatNumber(kpiSummary.totalCollaborators);
        document.getElementById('kpi-total-income-agg').textContent = formatCurrency(kpiSummary.totalIncomeAgg);
        document.getElementById('kpi-income-adjustments').textContent = formatCurrency(kpiSummary.incomeAdjustments);
        document.getElementById('kpi-pre-adjustment-profit').textContent = formatCurrency(kpiSummary.preAdjustmentProfit);
        document.getElementById('kpi-pre-adjustment-margin').textContent = formatPercent(kpiSummary.preAdjustmentMargin);
        document.getElementById('kpi-operational-profit').textContent = formatCurrency(kpiSummary.operationalProfit);
        document.getElementById('kpi-operational-margin').textContent = formatPercent(kpiSummary.operationalMargin);
        document.getElementById('kpi-total-expense').textContent = formatCurrency(kpiSummary.totalExpense);
        document.getElementById('kpi-funds-occupation-cost').textContent = formatCurrency(kpiSummary.fundsOccupationCost);
        document.getElementById('kpi-expense-adjustments').textContent = formatCurrency(kpiSummary.expenseAdjustments);
        document.getElementById('kpi-total-operational-cost').textContent = formatCurrency(kpiSummary.totalOperationalCost);
    }

    function renderMonthlyTrendChart(monthlyData) {
        const ctx = document.getElementById('monthly-trend-chart')?.getContext('2d');
        if (!ctx) return;

        const canvasParent = ctx.canvas.parentElement;
        if (!monthlyData || monthlyData.length === 0) {
            if (monthlyTrendChart) {
                monthlyTrendChart.destroy();
                monthlyTrendChart = null;
            }
            canvasParent.innerHTML = '<p class="text-center py-16 text-gray-500">暂无月度数据可供分析。</p><canvas id="monthly-trend-chart" class="hidden"></canvas>';
            return;
        }

        const labels = monthlyData.map(d => d.month);
        const incomeData = monthlyData.map(d => d.totalIncome);
        const marginData = monthlyData.map(d => d.margin);

        if (monthlyTrendChart) {
            monthlyTrendChart.data.labels = labels;
            monthlyTrendChart.data.datasets[0].data = incomeData;
            monthlyTrendChart.data.datasets[1].data = marginData;
            monthlyTrendChart.update();
        } else {
            monthlyTrendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '总收入 (元)',
                            data: incomeData,
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1,
                            yAxisID: 'y-axis-income',
                        },
                        {
                            label: '经营毛利率 (%)',
                            data: marginData,
                            type: 'line',
                            borderColor: 'rgba(139, 92, 246, 1)',
                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: false,
                            yAxisID: 'y-axis-margin',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        'y-axis-income': {
                            type: 'linear',
                            position: 'left',
                            title: { display: true, text: '金额 (元)' }
                        },
                        'y-axis-margin': {
                            type: 'linear',
                            position: 'right',
                            title: { display: true, text: '利润率 (%)' },
                            grid: { drawOnChartArea: false },
                        }
                    }
                }
            });
        }
    }

    function setupEventListeners() {
        applyFiltersBtn.addEventListener('click', renderAnalysis);
        resetFiltersBtn.addEventListener('click', () => {
            filterTimeDimension.value = 'financial';
            if (filterYear.options.length > 0) filterYear.selectedIndex = 0;
            if (filterMonth.options.length > 0) filterMonth.selectedIndex = 0;
            if (filterProjectType.options.length > 0) filterProjectType.selectedIndex = 0;
            renderAnalysis();
        });
    }

    initializePage();
});
