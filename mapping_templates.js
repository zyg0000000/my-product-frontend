/**
 * @file mapping_templates.js
 * @version 3.0 - Formula Support
 * @description
 * - [核心升级] 增加了对公式计算的前端支持。
 * - [UI改造] 为每个映射规则增加了“直接映射”与“公式计算”的切换功能。
 * - [逻辑改造] renderMappingRules 和 handleFormSubmit 函数已重构，以支持新版数据结构的渲染和保存。
 */
document.addEventListener('DOMContentLoaded', function () {

    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const MAPPING_TEMPLATES_API = `${API_BASE_URL}/mapping-templates`;
    const FEISHU_API = `${API_BASE_URL}/sync-from-feishu`;
    const AUTOMATION_WORKFLOWS_API = `${API_BASE_URL}/automation-workflows`;

    // --- DOM Elements ---
    const newTemplateBtn = document.getElementById('new-template-btn');
    const templatesListContainer = document.getElementById('templates-list-container');
    const templateModal = document.getElementById('template-modal');
    const modalTitle = document.getElementById('modal-title');
    const templateForm = document.getElementById('template-form');
    const templateIdInput = document.getElementById('template-id-input');
    const templateNameInput = document.getElementById('template-name-input');
    const templateDescriptionInput = document.getElementById('template-description-input');
    const spreadsheetUrlInput = document.getElementById('spreadsheet-url-input');
    const loadHeadersBtn = document.getElementById('load-headers-btn');
    const mappingRulesContainer = document.getElementById('mapping-rules-container');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const workflowsSelectionContainer = document.getElementById('workflows-selection-container');

    // --- State ---
    let templatesCache = [];
    let mappingSchemas = null;
    let allWorkflows = []; // 所有可用的工作流

    // --- Helper Functions ---
    async function apiRequest(url, method = 'GET', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options);
            if (!response.ok && response.status !== 204) {
                 const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                 throw new Error(errorData.message || 'Unknown API error');
            }
            if (response.status === 204) return { success: true, data: null };
            const result = await response.json();
            if (result.success === false) throw new Error(result.message || 'API returned an error');
            return result.data || result;
        } catch (error) {
            console.error(`API request error for ${method} ${url}:`, error);
            throw error;
        }
    }
    
    function constructFeishuUrl(tokenOrUrl) {
        if (!tokenOrUrl) return '#';
        if (tokenOrUrl.startsWith('http')) return tokenOrUrl;
        return `https://feishu.cn/sheets/${tokenOrUrl}`;
    }

    // --- Core Functions ---
    async function loadMappingSchemas() {
        if (mappingSchemas) return;
        try {
            const data = await apiRequest(`${FEISHU_API}?dataType=getMappingSchemas`);
            mappingSchemas = data.schemas;
        } catch (error) {
             alert(`获取数据源菜单失败: ${error.message}`);
        }
    }

    async function loadWorkflows() {
        if (allWorkflows.length > 0) return; // 已加载过
        try {
            const data = await apiRequest(AUTOMATION_WORKFLOWS_API);
            allWorkflows = data || [];
        } catch (error) {
            console.error('加载工作流列表失败:', error);
            allWorkflows = [];
        }
    }

    function renderWorkflowsSelection(selectedWorkflowIds = []) {
        if (allWorkflows.length === 0) {
            workflowsSelectionContainer.innerHTML = '<div class="text-center text-gray-400 py-4">暂无可用的工作流</div>';
            return;
        }

        workflowsSelectionContainer.innerHTML = allWorkflows
            .filter(wf => wf.isActive !== false) // 只显示活跃的工作流
            .map(workflow => {
                const isChecked = selectedWorkflowIds.includes(workflow._id);
                return `
                <label class="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input type="checkbox"
                           class="workflow-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded"
                           value="${workflow._id}"
                           ${isChecked ? 'checked' : ''}>
                    <div class="ml-3 flex-1">
                        <p class="text-sm font-medium text-gray-800">${workflow.name}</p>
                        ${workflow.description ? `<p class="text-xs text-gray-500">${workflow.description}</p>` : ''}
                    </div>
                </label>`;
            }).join('');
    }

    async function loadTemplates() {
        try {
            templatesCache = await apiRequest(MAPPING_TEMPLATES_API) || [];
            renderTemplates();
        } catch (error) {
            templatesListContainer.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500">加载模板列表失败。</td></tr>`;
        }
    }

    function renderTemplates() {
        if (templatesCache.length === 0) {
            templatesListContainer.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-400">暂无模板，请新建。</td></tr>`;
            return;
        }
        templatesListContainer.innerHTML = templatesCache.map(template => `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-medium text-gray-900">${template.name}</td>
                <td class="px-6 py-4"><a href="${constructFeishuUrl(template.spreadsheetToken)}" target="_blank" class="text-blue-600 hover:underline truncate" style="max-width: 200px; display: inline-block;">${template.spreadsheetToken}</a></td>
                <td class="px-6 py-4">${new Date(template.createdAt).toLocaleString()}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button data-id="${template._id}" class="edit-template-btn text-indigo-600 hover:text-indigo-900 font-medium">编辑</button>
                    <button data-id="${template._id}" class="delete-template-btn text-red-600 hover:text-red-900 font-medium">删除</button>
                </td>
            </tr>
        `).join('');
    }

    async function openModal(templateId = null) {
        await Promise.all([loadMappingSchemas(), loadWorkflows()]);
        templateForm.reset();
        templateIdInput.value = '';
        saveTemplateBtn.disabled = false;

        if (templateId) {
            const template = templatesCache.find(t => t._id === templateId);
            if (!template) return alert('找不到要编辑的模板。');
            modalTitle.textContent = `编辑映射模板: ${template.name}`;
            templateIdInput.value = template._id;
            templateNameInput.value = template.name;
            templateDescriptionInput.value = template.description || '';
            spreadsheetUrlInput.value = template.spreadsheetToken;
            renderWorkflowsSelection(template.allowedWorkflowIds || []);
            renderMappingRules(template.feishuSheetHeaders || [], template.mappingRules || {});
        } else {
            modalTitle.textContent = '新建映射模板';
            renderWorkflowsSelection([]);
            mappingRulesContainer.innerHTML = `<div id="mapping-placeholder" class="text-center text-gray-400 p-8 border-2 border-dashed rounded-lg"><p>请先加载飞书表格表头</p></div>`;
        }
        templateModal.classList.remove('hidden');
    }

    function closeModal() {
        templateModal.classList.add('hidden');
    }

    async function handleLoadHeaders() {
        const urlOrToken = spreadsheetUrlInput.value.trim();
        if (!urlOrToken) return alert('请输入飞书表格链接或Token。');
        
        loadHeadersBtn.textContent = '加载中...';
        loadHeadersBtn.disabled = true;

        try {
            const data = await apiRequest(FEISHU_API, 'POST', {
                dataType: 'getSheetHeaders',
                payload: { spreadsheetToken: urlOrToken }
            });
            renderMappingRules(data.headers || []);
        } catch (error) {
            alert(`加载表头失败: ${error.message}`);
        } finally {
            loadHeadersBtn.textContent = '加载表头';
            loadHeadersBtn.disabled = false;
        }
    }

    function renderMappingRules(headers, existingRules = {}) {
        mappingRulesContainer.innerHTML = '';
        if (!mappingSchemas) {
            mappingRulesContainer.innerHTML = `<p class="text-red-500">无法加载数据源菜单。</p>`;
            return;
        }
        if (headers.length === 0) {
            mappingRulesContainer.innerHTML = `<div id="mapping-placeholder" class="text-center text-gray-400 p-8 border-2 border-dashed rounded-lg"><p>请先加载飞书表格表头</p></div>`;
            return;
        }

        headers.forEach(header => {
            const rule = existingRules[header];
            const isFormula = typeof rule === 'object' && rule !== null && 'formula' in rule;
            const initialMode = isFormula ? 'formula' : 'direct';

            const ruleContainer = document.createElement('div');
            ruleContainer.className = 'p-3 border rounded-md bg-gray-50';
            ruleContainer.dataset.headerName = header;

            ruleContainer.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <label class="font-medium text-gray-800">${header}</label>
                    <div class="flex items-center text-xs space-x-2">
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="mode-${header}" value="direct" class="form-radio h-3 w-3 text-indigo-600 mode-toggle" ${initialMode === 'direct' ? 'checked' : ''}>
                            <span class="ml-1 text-gray-600">直接映射</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="mode-${header}" value="formula" class="form-radio h-3 w-3 text-indigo-600 mode-toggle" ${initialMode === 'formula' ? 'checked' : ''}>
                            <span class="ml-1 text-gray-600">公式计算</span>
                        </label>
                    </div>
                </div>
                <div class="content-area space-y-2"></div>
            `;
            
            mappingRulesContainer.appendChild(ruleContainer);
            updateRuleUIMode(ruleContainer, initialMode, rule);
        });
    }
    
    function updateRuleUIMode(ruleContainer, mode, rule) {
        const contentArea = ruleContainer.querySelector('.content-area');
        const directValue = (typeof rule === 'string') ? rule : '';
        const formulaValue = (typeof rule === 'object' && rule !== null) ? rule.formula : '';
        const outputValue = (typeof rule === 'object' && rule !== null) ? rule.output : 'default';

        if (mode === 'direct') {
            const select = document.createElement('select');
            select.className = 'direct-mapping-select mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md';
            
            let optionsHtml = '<option value="">--- 请选择数据源 ---</option>';
            for (const collectionName in mappingSchemas) {
                const schema = mappingSchemas[collectionName];
                optionsHtml += `<optgroup label="${schema.displayName}">`;
                schema.fields.forEach(field => {
                    const value = `${collectionName}.${field.path}`;
                    optionsHtml += `<option value="${value}" ${directValue === value ? 'selected' : ''}>${field.displayName}</option>`;
                });
                optionsHtml += `</optgroup>`;
            }
            select.innerHTML = optionsHtml;
            contentArea.innerHTML = '';
            contentArea.appendChild(select);
        } else { // formula mode
            contentArea.innerHTML = `
                <div>
                    <textarea class="formula-input w-full p-2 border rounded-md font-mono text-sm" rows="2" placeholder="例如: ({talents.latestPrice} / {automation-tasks.result.data.个人视频播放量均值}) * 1000">${formulaValue}</textarea>
                </div>
                <div>
                    <select class="output-format-select mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                        <option value="default" ${outputValue === 'default' ? 'selected' : ''}>默认输出</option>
                        <option value="percentage" ${outputValue === 'percentage' ? 'selected' : ''}>格式化为百分比 (e.g., 58.34%)</option>
                        <option value="number(2)" ${outputValue === 'number(2)' ? 'selected' : ''}>保留两位小数</option>
                    </select>
                </div>
            `;
        }
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        saveTemplateBtn.disabled = true;
        saveTemplateBtn.textContent = '保存中...';

        const mappingRules = {};
        const feishuSheetHeaders = [];
        let hasMapping = false;

        document.querySelectorAll('#mapping-rules-container > div').forEach(ruleContainer => {
            const headerName = ruleContainer.dataset.headerName;
            feishuSheetHeaders.push(headerName);
            const mode = ruleContainer.querySelector('input[type="radio"]:checked').value;

            if (mode === 'direct') {
                const select = ruleContainer.querySelector('.direct-mapping-select');
                if (select.value) {
                    mappingRules[headerName] = select.value;
                    hasMapping = true;
                }
            } else { // formula mode
                const formulaInput = ruleContainer.querySelector('.formula-input');
                if (formulaInput.value.trim()) {
                    mappingRules[headerName] = {
                        formula: formulaInput.value.trim(),
                        output: ruleContainer.querySelector('.output-format-select').value
                    };
                    hasMapping = true;
                }
            }
        });

        // 收集选中的工作流ID
        const allowedWorkflowIds = Array.from(
            workflowsSelectionContainer.querySelectorAll('.workflow-checkbox:checked')
        ).map(checkbox => checkbox.value);

        const payload = {
            name: templateNameInput.value.trim(),
            description: templateDescriptionInput.value.trim(),
            spreadsheetToken: spreadsheetUrlInput.value.trim(),
            feishuSheetHeaders,
            mappingRules,
            allowedWorkflowIds, // 新增字段
        };

        const id = templateIdInput.value;

        try {
            if (id) {
                await apiRequest(`${MAPPING_TEMPLATES_API}?id=${id}`, 'PUT', payload);
            } else {
                await apiRequest(MAPPING_TEMPLATES_API, 'POST', payload);
            }
            closeModal();
            await loadTemplates();
        } catch (error) {
             alert(`保存失败: ${error.message}`);
        } finally {
            saveTemplateBtn.disabled = false;
            saveTemplateBtn.textContent = '保存模板';
        }
    }
    
    // --- Event Listeners ---
    newTemplateBtn.addEventListener('click', () => openModal());
    cancelTemplateBtn.addEventListener('click', closeModal);
    loadHeadersBtn.addEventListener('click', handleLoadHeaders);
    templateForm.addEventListener('submit', handleFormSubmit);

    templatesListContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-template-btn')) openModal(target.dataset.id);
        if (target.classList.contains('delete-template-btn')) handleDeleteTemplate(target.dataset.id);
    });
    
    mappingRulesContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('mode-toggle')) {
            const ruleContainer = event.target.closest('[data-header-name]');
            updateRuleUIMode(ruleContainer, event.target.value, null);
        }
    });
    
    async function handleDeleteTemplate(templateId) {
        if (!confirm(`确定要删除此模板吗？`)) return;
        try {
            await apiRequest(`${MAPPING_TEMPLATES_API}?id=${templateId}`, 'DELETE');
            await loadTemplates();
        } catch (error) {
            alert(`删除失败: ${error.message}`);
        }
    }

    loadTemplates();
});
