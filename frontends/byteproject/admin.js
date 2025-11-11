/**
 * @file admin.js
 * @version 2.6-robust-ui
 * @description [架构重构] 独立管理后台的交互逻辑 (UI最终版)
 * - [核心修正] 为所有“添加”和“删除”按钮绑定了事件监听器，使其能够正确地调用后端API。
 * - [代码优化] 采用了事件委托模式来处理删除操作，提高了性能和代码的可维护性。
 * - [功能增强] 为所有API调用操作（增、删、改）增加了加载状态，防止用户重复点击并提供即时反馈。
 * - [代码健壮性] 优化了API请求载荷(payload)的构建逻辑，避免发送不必要的空值。
 */
document.addEventListener('DOMContentLoaded', function () {
    // --- API Configuration ---
    // !!! 注意：请将此处的占位符替换为真实的API网关地址 !!!
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com/configurations'; 
    const CONFIG_API_ENDPOINT = ''; 

    // --- DOM Elements ---
    const adminTabs = document.getElementById('admin-tabs');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Form elements
    const addAdjustmentTypeForm = document.getElementById('add-adjustment-type-form');
    const newAdjustmentTypeNameInput = document.getElementById('new-adjustment-type-name');
    const adjustmentTypeList = document.getElementById('adjustment-type-list');
    
    const addCapitalRateForm = document.getElementById('add-capital-rate-form');
    const newRateNameInput = document.getElementById('new-rate-name');
    const newRateValueInput = document.getElementById('new-rate-value');
    const capitalRateList = document.getElementById('capital-rate-list');

    const addFrameworkDiscountForm = document.getElementById('add-framework-discount-form');
    const newDiscountNameInput = document.getElementById('new-discount-name');
    const newDiscountValueInput = document.getElementById('new-discount-value');
    const frameworkDiscountList = document.getElementById('framework-discount-list');

    const notificationSettingsContainer = document.getElementById('notification-settings-container');
    const saveNotificationSettingsBtn = document.getElementById('save-notification-settings-btn');

    const NOTIFICATION_TYPES = [
        { key: 'PROJECT_BUDGET_WARNING', label: '项目消耗超80%预警' },
        { key: 'PROJECT_PAYMENT_REMINDER', label: '项目到期自动催款' }
    ];

    // --- API Abstraction ---
    async function apiRequest(method = 'GET', body = null) {
        const url = `${API_BASE_URL}${CONFIG_API_ENDPOINT}`;
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
            console.error(`API request failed: ${method} ${url}`, error);
            alert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    // --- Render Functions ---
    function renderList(element, items, renderItem) {
        element.innerHTML = (items && items.length > 0) 
            ? items.map(renderItem).join('') 
            : `<p class="text-sm text-gray-400 text-center py-4">暂无数据</p>`;
    }

    function renderNotificationSettings(settings) {
        notificationSettingsContainer.innerHTML = NOTIFICATION_TYPES.map(type => {
            const isEnabled = settings[type.key] === true;
            return `
                <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <span class="text-gray-700 font-medium">${type.label}</span>
                    <label for="toggle-${type.key}" class="flex items-center cursor-pointer">
                        <div class="relative">
                            <input type="checkbox" id="toggle-${type.key}" class="sr-only notification-toggle" data-type="${type.key}" ${isEnabled ? 'checked' : ''}>
                            <div class="block bg-gray-200 w-14 h-8 rounded-full"></div>
                            <div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                        </div>
                    </label>
                </div>`;
        }).join('');
    }
    
    // --- Data Loading ---
    async function loadAndRenderAll() {
        if (API_BASE_URL.includes('[YOUR_NEW_ADMIN_GATEWAY_URL]')) {
            alert('请先在 admin.js 文件中配置正确的 API 网关地址！');
            return;
        }
        try {
            const configs = await apiRequest('GET');
            
            const notificationConfig = configs.find(c => c.type === 'FEISHU_NOTIFICATIONS');
            renderNotificationSettings(notificationConfig ? notificationConfig.settings : {});

            const adjustmentTypes = configs.find(c => c.type === 'ADJUSTMENT_TYPES')?.values || [];
            renderList(adjustmentTypeList, adjustmentTypes, item => `
                <div class="flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm">
                    <span>${item}</span><button data-name="${item}" class="delete-btn text-red-500 hover:text-red-700 disabled:opacity-50" data-type="ADJUSTMENT_TYPES">删除</button>
                </div>`);

            const capitalRates = configs.find(c => c.type === 'CAPITAL_RATES')?.values || [];
            renderList(capitalRateList, capitalRates, item => `
                <div class="flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm">
                    <span>${item.name}: ${item.value}%</span><button data-id="${item.id}" class="delete-btn text-red-500 hover:text-red-700 disabled:opacity-50" data-type="CAPITAL_RATES">删除</button>
                </div>`);
            
            const frameworkDiscounts = configs.find(c => c.type === 'FRAMEWORK_DISCOUNTS')?.values || [];
            renderList(frameworkDiscountList, frameworkDiscounts, item => `
                <div class="flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm">
                    <span>${item.name}: ${item.value}</span><button data-id="${item.id}" class="delete-btn text-red-500 hover:text-red-700 disabled:opacity-50" data-type="FRAMEWORK_DISCOUNTS">删除</button>
                </div>`);
        } catch (error) {
            console.error("加载配置失败:", error);
        }
    }
    
    // --- Event Handlers ---
    async function handleAddConfig(e, type, form, input1, input2 = null) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        const name = input1.value.trim();
        // [健壮性] 只有当第二个输入框存在时才校验其值
        if (!name || (input2 && !input2.value.trim())) {
            alert('所有字段均为必填项。');
            return;
        }

        // [健壮性] 动态构建 payload，避免发送不必要的 null 值
        const payload = { type, name };
        if (input2) {
            payload.value = input2.value.trim();
        }
        
        try {
            // [UI/UX] 增加加载状态
            submitBtn.disabled = true;
            submitBtn.textContent = '添加中...';
            
            await apiRequest('POST', payload);
            form.reset();
            await loadAndRenderAll();
        } catch (error) { 
            // 错误已在 apiRequest 中处理
        } finally {
            // [UI/UX] 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

    async function handleDeleteConfig(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        const type = deleteBtn.dataset.type;
        const id = deleteBtn.dataset.id;
        const name = deleteBtn.dataset.name;
        
        // 构建 payload，API 后端会根据 type 选择使用 id 或 name
        const payload = { type, id, name };

        if (confirm('您确定要删除这个配置项吗？')) {
            const originalBtnText = deleteBtn.textContent;
            try {
                // [UI/UX] 增加加载状态
                deleteBtn.disabled = true;
                deleteBtn.textContent = '删除中...';

                await apiRequest('DELETE', payload);
                await loadAndRenderAll(); // 成功后刷新列表，按钮状态会自然恢复
            } catch (error) { 
                // [UI/UX] 如果失败，需要手动恢复按钮状态
                deleteBtn.disabled = false;
                deleteBtn.textContent = originalBtnText;
            }
        }
    }

    async function handleSaveNotificationSettings() {
        const toggles = notificationSettingsContainer.querySelectorAll('.notification-toggle');
        const settings = {};
        toggles.forEach(toggle => { settings[toggle.dataset.type] = toggle.checked; });
        
        const originalBtnText = saveNotificationSettingsBtn.textContent;
        try {
            // [UI/UX] 增加加载状态
            saveNotificationSettingsBtn.disabled = true;
            saveNotificationSettingsBtn.textContent = '保存中...';

            await apiRequest('POST', { type: 'FEISHU_NOTIFICATIONS', settings });
            alert('通知设置已保存！');
        } catch (error) { 
            // 错误已在 apiRequest 中处理
        } finally {
            // [UI/UX] 恢复按钮状态
            saveNotificationSettingsBtn.disabled = false;
            saveNotificationSettingsBtn.textContent = originalBtnText;
        }
    }

    // --- Initialization ---
    function initializePage() {
        // Tab 切换
        adminTabs.addEventListener('click', (e) => {
            const targetButton = e.target.closest('.tab-btn');
            if (!targetButton) return;
            e.preventDefault();
            document.querySelectorAll('#admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            targetButton.classList.add('active');
            const targetPaneId = targetButton.dataset.tabTarget;
            tabPanes.forEach(pane => { pane.classList.toggle('hidden', pane.id !== targetPaneId); });
        });
        
        // 绑定表单提交事件
        addAdjustmentTypeForm.addEventListener('submit', (e) => handleAddConfig(e, 'ADJUSTMENT_TYPES', addAdjustmentTypeForm, newAdjustmentTypeNameInput));
        addCapitalRateForm.addEventListener('submit', (e) => handleAddConfig(e, 'CAPITAL_RATES', addCapitalRateForm, newRateNameInput, newRateValueInput));
        addFrameworkDiscountForm.addEventListener('submit', (e) => handleAddConfig(e, 'FRAMEWORK_DISCOUNTS', addFrameworkDiscountForm, newDiscountNameInput, newDiscountValueInput));
        
        // 使用事件委托来处理所有删除按钮的点击
        document.getElementById('tab-general').addEventListener('click', handleDeleteConfig);
        
        // 保存通知设置
        saveNotificationSettingsBtn.addEventListener('click', handleSaveNotificationSettings);

        // 初始加载
        loadAndRenderAll();
    }

    initializePage();
});
