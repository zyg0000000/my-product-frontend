/**
 * @file project_analysis.js
 * @version 2.2 - Time Dimension Filtering
 * @description Adds support for filtering by financial or customer month.
 *
 * @changelog
 * - v2.2 (2025-10-20):
 * - [FEATURE] Added logic to handle new timeDimension and month filters.
 * - [REFACTOR] `fetchDataAndRender` now sends the complete filter state to the backend.
 * - [UI] Populates and resets the new month filter dropdown.
 * - v2.1 (2025-10-20): Implemented chart performance optimization.
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

    // --- API Configuration ---
    const API_ENDPOINT = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com/getAnalysisData';

    // --- Helper Functions ---
    const formatCurrency = (num) => `¥${(Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercent = (num) => `${(Number(num) || 0).toFixed(2)}%`;
    const formatNumber = (num) => (Number(num) || 0).toLocaleString();

    // --- Core Functions ---
    async function initializePage() {
        populateMonthFilter();
        setupEventListeners();
        await fetchDataAndRender();
    }

    async function fetchDataAndRender() {
        loadingIndicator.classList.remove('hidden');
        analysisContent.classList.add('hidden');

        const filters = {
            timeDimension: filterTimeDimension.value || 'financial',
            year: filterYear.value || null,
            month: filterMonth.value || null,
            projectType: filterProjectType.value || null,
        };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters }),
            });
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            const apiData = await response.json();

            if (apiData.success && apiData.data) {
                const data = apiData.data;
                populateFilters(data.availableFilters);
                renderKpiCards(data.kpiSummary);
                renderMonthlyTrendChart(data.monthlyFinancials);
            } else {
                throw new Error('API response format is incorrect or indicates failure.');
            }

        } catch (error) {
            console.error('Failed to fetch or render analysis data:', error);
            analysisContent.innerHTML = `<p class="text-center py-16 text-red-500">数据加载失败，请刷新重试。</p>`;
        } finally {
            loadingIndicator.classList.add('hidden');
            analysisContent.classList.remove('hidden');
        }
    }

    function populateFilters(availableFilters) {
        const currentYear = filterYear.value;
        filterYear.innerHTML = '<option value="">所有年份</option>';
        (availableFilters.years || []).forEach(year => {
            filterYear.innerHTML += `<option value="${year}">${year}年</option>`;
        });
        filterYear.value = currentYear;

        const currentType = filterProjectType.value;
        filterProjectType.innerHTML = '<option value="">所有类型</option>';
        (availableFilters.projectTypes || []).forEach(type => {
            filterProjectType.innerHTML += `<option value="${type}">${type}</option>`;
        });
        filterProjectType.value = currentType;
    }

    function populateMonthFilter() {
        const currentMonth = filterMonth.value;
        filterMonth.innerHTML = '<option value="">所有月份</option>';
        for (let i = 1; i <= 12; i++) {
            filterMonth.innerHTML += `<option value="M${i}">M${i}</option>`;
        }
        filterMonth.value = currentMonth;
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
        applyFiltersBtn.addEventListener('click', fetchDataAndRender);
        resetFiltersBtn.addEventListener('click', () => {
            filterTimeDimension.value = 'financial';
            if (filterYear.options.length > 0) filterYear.selectedIndex = 0;
            if (filterMonth.options.length > 0) filterMonth.selectedIndex = 0;
            if (filterProjectType.options.length > 0) filterProjectType.selectedIndex = 0;
            fetchDataAndRender();
        });
    }

    initializePage();
});

