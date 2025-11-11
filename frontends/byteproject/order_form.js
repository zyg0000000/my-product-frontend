/**
 * @file order_form.js
 * @version 2.2-price-selector-ui-enhancement
 * @description
 * - [V2.2 重构] 价格选择UI重新设计：将长下拉菜单改为"价格时间"+"视频类型"两步选择器，选择后自动显示对应价格。
 * - [V2.2 增强] 默认选择当月和60s+档位，提升用户体验。
 * - [V2.2 增强] 如果所选类型+时间没有价格，显示红色"没有此档位价格"提示，防止误操作。
 * - [V2.2 新增] 实时价格联动功能，切换类型或时间时立即更新价格显示。
 * --- v2.0 ---
 * - [业务升级] 支持达人多次合作模式。
 * - [核心改造] 在 `handleFormSubmit` 函数中，增加了对 `plannedReleaseDate` (计划发布日期) 字段的获取和提交。
 * --- v1.6 ---
 * - [权威数据修复] 严格按照真实数据结构重写了下拉菜单的生成逻辑。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- API Configuration & DOM Elements ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const backLink = document.getElementById('back-link');
    const projectNameDisplay = document.getElementById('project-name-display');
    const loadingIndicator = document.getElementById('loading-indicator');
    const collaboratorForm = document.getElementById('collaborator-form');
    const talentSearchInput = document.getElementById('talent-search');
    const searchResultsList = document.getElementById('search-results');
    const selectedTalentDisplay = document.getElementById('selected-talent-display');
    const selectedTalentName = document.getElementById('selected-talent-name');
    const priceSelectionContainer = document.getElementById('price-selection-container');
    const priceTimeSelect = document.getElementById('price-time-select');
    const priceTypeSelect = document.getElementById('price-type-select');
    const priceDisplay = document.getElementById('price-display');
    const priceData = document.getElementById('price-data');
    const rebateSelectionContainer = document.getElementById('rebate-selection-container');
    const rebateSelect = document.getElementById('rebate-select');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const continueAddingBtn = document.getElementById('continue-adding-btn');

    // --- State ---
    let currentProjectId = null;
    let project = {};
    let allTalents = [];
    let selectedTalent = null;
    let searchDebounceTimer;

    // --- API Request Utility ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) { options.body = JSON.stringify(body); }
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            alert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    // --- Initialization ---
    async function initializePage() {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId');
        if (!currentProjectId) {
            document.body.innerHTML = '<h1>错误：缺少项目ID</h1>';
            return;
        }

        if (backLink) {
            backLink.href = `order_list.html?projectId=${currentProjectId}`;
        }
        if (continueAddingBtn) {
            continueAddingBtn.href = `order_form.html?projectId=${currentProjectId}`;
        }

        try {
            loadingIndicator.classList.remove('hidden');
            collaboratorForm.classList.add('hidden');

            const [projectResponse, talentsResponse] = await Promise.all([
                apiRequest(`/projects?projectId=${currentProjectId}`),
                apiRequest('/talents')
            ]);
            
            project = projectResponse.data;
            allTalents = talentsResponse.data || [];
            
            projectNameDisplay.textContent = `为项目: ${project.name}`;
            
            loadingIndicator.classList.add('hidden');
            collaboratorForm.classList.remove('hidden');
            
        } catch (error) {
            loadingIndicator.innerHTML = '<p class="text-red-500">数据加载失败，请刷新页面重试。</p>';
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        talentSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(handleTalentSearch, 300);
        });

        searchResultsList.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li && li.dataset.talentId) {
                selectTalent(li.dataset.talentId);
            }
        });

        document.addEventListener('click', (e) => {
            if (!document.getElementById('talent-search-container').contains(e.target)) {
                searchResultsList.classList.add('hidden');
            }
        });

        collaboratorForm.addEventListener('submit', handleFormSubmit);

        // [V2.2 新增] 价格联动事件监听器
        priceTimeSelect.addEventListener('change', updatePriceDisplay);
        priceTypeSelect.addEventListener('change', updatePriceDisplay);

        closeModalBtn.addEventListener('click', () => {
            window.location.href = `order_list.html?projectId=${currentProjectId}`;
        });
    }

    // --- Core Logic ---
    function handleTalentSearch() {
        const query = talentSearchInput.value.toLowerCase().trim();
        searchResultsList.innerHTML = '';
        if (query.length < 1) {
            searchResultsList.classList.add('hidden');
            return;
        }

        const filteredTalents = allTalents.filter(t => 
            t.nickname.toLowerCase().includes(query) || 
            (t.xingtuId && t.xingtuId.includes(query))
        );

        if (filteredTalents.length > 0) {
            filteredTalents.forEach(t => {
                const li = document.createElement('li');
                li.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
                li.dataset.talentId = t.id;
                li.innerHTML = `
                    <p class="font-medium text-gray-800">${t.nickname}</p>
                    <p class="text-sm text-gray-500">星图ID: ${t.xingtuId || 'N/A'}</p>
                `;
                searchResultsList.appendChild(li);
            });
            searchResultsList.classList.remove('hidden');
        } else {
            searchResultsList.classList.add('hidden');
        }
    }

    // [V2.2 新增] 获取达人的所有可用价格时间（去重）
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

    // [V2.2 重构] 选择达人后，生成价格时间选项并默认选择当月和60s+
    function selectTalent(talentId) {
        selectedTalent = allTalents.find(t => t.id === talentId);
        if (!selectedTalent) return;

        talentSearchInput.value = '';
        searchResultsList.classList.add('hidden');

        selectedTalentName.textContent = selectedTalent.nickname;
        selectedTalentDisplay.classList.remove('hidden');

        // 生成价格时间选项
        priceTimeSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        const availableTimes = getAvailablePriceTimes(selectedTalent);

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        availableTimes.forEach(t => {
            const option = document.createElement('option');
            option.value = `${t.year}-${t.month}`;
            option.textContent = `${t.year}年${t.month}月`;
            priceTimeSelect.appendChild(option);
        });

        // 默认选择当月（如果存在）
        const defaultTime = availableTimes.find(t => t.year === currentYear && t.month === currentMonth);
        if (defaultTime) {
            priceTimeSelect.value = `${defaultTime.year}-${defaultTime.month}`;
        } else if (availableTimes.length > 0) {
            priceTimeSelect.value = `${availableTimes[0].year}-${availableTimes[0].month}`;
        }

        // 默认选择60s+
        priceTypeSelect.value = '60s_plus';

        priceSelectionContainer.classList.remove('hidden');

        // 初始化价格显示
        updatePriceDisplay();

        // 生成返点率选项
        rebateSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        (selectedTalent.rebates || []).forEach(r => {
            const option = document.createElement('option');
            option.value = r.rate;
            option.textContent = `${r.rate}%`;
            rebateSelect.appendChild(option);
        });
        rebateSelectionContainer.classList.remove('hidden');
    }

    // [V2.2 新增] 根据类型+时间选择更新价格显示
    function updatePriceDisplay() {
        if (!selectedTalent) return;

        const selectedType = priceTypeSelect.value;
        const selectedTime = priceTimeSelect.value;

        if (!selectedTime) {
            priceDisplay.value = '请选择价格时间';
            priceDisplay.className = 'price-display w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-400';
            priceData.value = '';
            return;
        }

        const [year, month] = selectedTime.split('-').map(Number);

        // 查找匹配的价格
        const matchingPrices = selectedTalent.prices.filter(p =>
            p.year === year && p.month === month && p.type === selectedType
        );

        if (matchingPrices.length === 0) {
            priceDisplay.value = '没有此档位价格';
            priceDisplay.className = 'price-display w-full px-4 py-2 bg-gray-50 border border-red-300 rounded-lg text-red-600 font-medium';
            priceData.value = '';
        } else {
            const confirmedPrice = matchingPrices.find(p => p.status !== 'provisional');
            const selectedPrice = confirmedPrice || matchingPrices[0];
            const statusLabel = selectedPrice.status === 'provisional' ? '(暂定价)' : '(已确认)';

            priceDisplay.value = `¥ ${selectedPrice.price.toLocaleString()} ${statusLabel}`;
            priceDisplay.className = 'price-display w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-medium';
            priceData.value = JSON.stringify(selectedPrice);
        }
    }

    // [V2.2 重构] 从priceData获取价格信息
    async function handleFormSubmit(e) {
        e.preventDefault();

        const priceDataValue = priceData.value;
        if (!priceDataValue) {
            alert('请选择一口价。');
            return;
        }

        const priceObj = JSON.parse(priceDataValue);

        // [V2.2 新增] 价格类型标签映射
        const priceTypeLabels = {
            '60s_plus': '60s+视频',
            '20_to_60s': '20-60s视频',
            '1_to_20s': '1-20s视频'
        };
        const typeLabel = priceTypeLabels[priceObj.type] || priceObj.type || '未知类型';

        const payload = {
            projectId: currentProjectId,
            talentId: selectedTalent.id,
            amount: Number(priceObj.price),
            priceInfo: `${priceObj.year}年${priceObj.month}月 - ${typeLabel}`,
            rebate: Number(rebateSelect.value),
            plannedReleaseDate: document.getElementById('planned-release-date').value || null,
            orderType: document.querySelector('input[name="order-type"]:checked').value,
            status: '待提报工作台'
        };

        if (!payload.talentId || !payload.amount || isNaN(payload.rebate)) {
            alert('请完整填写达人、一口价和返点率。');
            return;
        }

        try {
            await apiRequest('/collaborations', 'POST', payload);
            successModal.classList.remove('hidden');
        } catch(error) {
            // Error is already alerted in apiRequest
        }
    }

    // --- Run ---
    initializePage();
    setupEventListeners();
});
