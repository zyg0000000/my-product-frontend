/**
 * @file order_form.js
 * @version 2.0-multi-collab
 * @description [业务升级] 支持达人多次合作模式。
 * * --- 更新日志 (v2.0) ---
 * - [核心改造] 在 `handleFormSubmit` 函数中，增加了对 `plannedReleaseDate` (计划发布日期) 字段的获取和提交。
 * * --- v1.6 ---
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
    const priceSelect = document.getElementById('price-select');
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

    function selectTalent(talentId) {
        selectedTalent = allTalents.find(t => t.id === talentId);
        if (!selectedTalent) return;

        talentSearchInput.value = '';
        searchResultsList.classList.add('hidden');
        
        selectedTalentName.textContent = selectedTalent.nickname;
        selectedTalentDisplay.classList.remove('hidden');

        priceSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        (selectedTalent.prices || []).forEach(p => {
            const priceDescription = `${p.year}年${p.month}月`;
            const option = document.createElement('option');
            option.value = priceDescription;
            option.textContent = `¥ ${Number(p.price).toLocaleString()} (${priceDescription})`;
            option.dataset.amount = p.price;
            priceSelect.appendChild(option);
        });
        priceSelectionContainer.classList.remove('hidden');

        rebateSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        (selectedTalent.rebates || []).forEach(r => {
            const option = document.createElement('option');
            option.value = r.rate;
            option.textContent = `${r.rate}%`;
            rebateSelect.appendChild(option);
        });
        rebateSelectionContainer.classList.remove('hidden');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const selectedPriceInfo = priceSelect.value;
        const selectedPriceOption = priceSelect.querySelector(`option[value="${selectedPriceInfo}"]`);
        const amount = selectedPriceOption ? selectedPriceOption.dataset.amount : null;
        
        // [改造步骤 5] 增加 plannedReleaseDate 字段
        const payload = {
            projectId: currentProjectId,
            talentId: selectedTalent.id,
            amount: Number(amount),
            priceInfo: selectedPriceInfo,
            rebate: Number(rebateSelect.value),
            plannedReleaseDate: document.getElementById('planned-release-date').value || null,
            orderType: document.querySelector('input[name="order-type"]:checked').value,
            status: '待提报工作台'
        };

        if (!payload.talentId || !payload.priceInfo || isNaN(payload.rebate)) {
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
