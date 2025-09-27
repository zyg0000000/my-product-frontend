/**
 * @file mapping_templates.js
 * @version 2.7 - Final API Endpoint Fix
 * @description [最终修复版] 修复了在编辑和删除模板时，因 API 请求地址格式不正确而导致的保存失败问题。
 */
document.addEventListener('DOMContentLoaded', function () {

    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const MAPPING_TEMPLATES_API = `${API_BASE_URL}/mapping-templates`;
    const FEISHU_API = `${API_BASE_URL}/sync-from-feishu`;

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
    const primaryCollectionSelect = document.getElementById('primary-collection-select');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');

    // --- State ---
    let templatesCache = [];
    let mappingSchemas = null;

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
        if (tokenOrUrl.startsWith('http')) {
            return tokenOrUrl;
        }
        const match = tokenOrUrl.match(/\/(?:sheets|spreadsheet)\/([a-zA-Z0-9]+)/);
        const token = match ? match[1] : tokenOrUrl;
        return `https://feishu.cn/sheets/${token}`;
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
        templatesListContainer.innerHTML = templatesCache.map(template => {
            const feishuUrl = constructFeishuUrl(template.spreadsheetToken);
            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-900">
                        <p>${template.name}</p>
                        <p class="text-xs text-gray-500">${template.description || ''}</p>
                    </td>
                    <td class="px-6 py-4">
                        <a href="${feishuUrl}" target="_blank" class="text-blue-600 hover:underline truncate" style="max-width: 200px; display: inline-block;">
                            ${template.spreadsheetToken}
                        </a>
                    </td>
                    <td class="px-6 py-4">${new Date(template.createdAt).toLocaleString()}</td>
                    <td class="px-6 py-4 text-right space-x-2">
                        <button data-id="${template._id}" class="edit-template-btn text-indigo-600 hover:text-indigo-900 font-medium">编辑</button>
                        <button data-id="${template._id}" class="delete-template-btn text-red-600 hover:text-red-900 font-medium">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function openModalForCreate() {
        await loadMappingSchemas();
        templateForm.reset();
        templateIdInput.value = '';
        modalTitle.textContent = '新建映射模板';
        mappingRulesContainer.innerHTML = `<div id="mapping-placeholder" class="text-center text-gray-400 p-8 border-2 border-dashed rounded-lg"><p>请先加载飞书表格表头</p></div>`;
        saveTemplateBtn.disabled = false;
        templateModal.classList.remove('hidden');
    }

    async function openModalForEdit(templateId) {
        await loadMappingSchemas();
        const template = templatesCache.find(t => t._id === templateId);
        if (!template) return alert('找不到要编辑的模板。');

        templateForm.reset();
        templateIdInput.value = template._id;
        modalTitle.textContent = `编辑映射模板: ${template.name}`;
        templateNameInput.value = template.name;
        templateDescriptionInput.value = template.description || '';
        spreadsheetUrlInput.value = template.spreadsheetToken;
        primaryCollectionSelect.value = template.primaryCollection || 'collaborations';
        
        renderMappingRules(template.feishuSheetHeaders || [], template.mappingRules || {});
        
        saveTemplateBtn.disabled = false;
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
            if (!data.headers || data.headers.length === 0) {
                 alert('无法获取表头，请检查链接、权限或表格是否为空。');
                 renderMappingRules([]);
                 return;
            }
            renderMappingRules(data.headers);
        } catch (error) {
            alert(`加载表头失败: ${error.message}`);
        }
        finally {
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
            const ruleDiv = document.createElement('div');
            ruleDiv.className = 'grid grid-cols-2 gap-4 items-center';
            
            const headerLabel = document.createElement('label');
            headerLabel.className = 'text-sm font-medium text-gray-700';
            headerLabel.textContent = header;
            ruleDiv.appendChild(headerLabel);
            
            const select = document.createElement('select');
            select.className = 'mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md';
            select.dataset.columnName = header;

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '--- 请选择数据源 ---';
            select.appendChild(defaultOption);

            for (const collectionName in mappingSchemas) {
                const schema = mappingSchemas[collectionName];
                const optgroup = document.createElement('optgroup');
                optgroup.label = schema.displayName;
                
                schema.fields.forEach(field => {
                    const option = document.createElement('option');
                    const value = `${collectionName}.${field.path}`;
                    option.value = value;
                    option.textContent = field.displayName;
                    if (existingRules[header] === value) {
                        option.selected = true;
                    }
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
            ruleDiv.appendChild(select);
            mappingRulesContainer.appendChild(ruleDiv);
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        saveTemplateBtn.disabled = true;
        saveTemplateBtn.textContent = '保存中...';

        const mappingRules = {};
        const feishuSheetHeaders = [];
        let hasMapping = false;
        document.querySelectorAll('#mapping-rules-container select').forEach(select => {
            const columnName = select.dataset.columnName;
            feishuSheetHeaders.push(columnName);
            if (select.value) {
                mappingRules[columnName] = select.value;
                hasMapping = true;
            }
        });

        const name = templateNameInput.value.trim();
        const spreadsheetToken = spreadsheetUrlInput.value.trim();

        if (!name) {
            alert('模板名称不能为空。');
            saveTemplateBtn.disabled = false;
            saveTemplateBtn.textContent = '保存模板';
            return;
        }
        if (!spreadsheetToken) {
            alert('飞书表格链接或Token不能为空。');
            saveTemplateBtn.disabled = false;
            saveTemplateBtn.textContent = '保存模板';
            return;
        }
        if (!hasMapping && feishuSheetHeaders.length > 0) {
            alert('请至少配置一条映射规则。');
            saveTemplateBtn.disabled = false;
            saveTemplateBtn.textContent = '保存模板';
            return;
        }

        const payload = {
            primaryCollection: primaryCollectionSelect.value,
            name: name,
            description: templateDescriptionInput.value.trim(),
            spreadsheetToken: spreadsheetToken,
            feishuSheetHeaders: feishuSheetHeaders,
            mappingRules: mappingRules,
        };
        
        const id = templateIdInput.value;

        try {
            if (id) {
                // [API 地址修复] 将 ID 作为查询参数发送
                await apiRequest(`${MAPPING_TEMPLATES_API}?id=${id}`, 'PUT', payload);
            } else {
                await apiRequest(MAPPING_TEMPLATES_API, 'POST', payload);
            }
            closeModal();
            loadTemplates();
        } catch (error) {
             alert(`保存失败: ${error.message}`);
        }
        finally {
            saveTemplateBtn.disabled = false;
            saveTemplateBtn.textContent = '保存模板';
        }
    }
    
    async function handleDeleteTemplate(templateId) {
        const template = templatesCache.find(t => t._id === templateId);
        if (!template) return;
        if (!confirm(`确定要删除模板 "${template.name}" 吗？此操作不可撤销。`)) {
            return;
        }
        try {
            // [API 地址修复] 将 ID 作为查询参数发送
            await apiRequest(`${MAPPING_TEMPLATES_API}?id=${templateId}`, 'DELETE');
            loadTemplates();
        } catch (error) {
            alert(`删除失败: ${error.message}`);
        }
    }

    // --- Event Listeners Setup ---
    function initializeEventListeners() {
        newTemplateBtn.addEventListener('click', openModalForCreate);
        cancelTemplateBtn.addEventListener('click', closeModal);
        loadHeadersBtn.addEventListener('click', handleLoadHeaders);
        templateForm.addEventListener('submit', handleFormSubmit);

        templatesListContainer.addEventListener('click', (event) => {
            const target = event.target;
            const templateId = target.dataset.id;
            if (target.classList.contains('edit-template-btn')) {
                openModalForEdit(templateId);
            } else if (target.classList.contains('delete-template-btn')) {
                handleDeleteTemplate(templateId);
            }
        });
    }

    // --- Initial Load ---
    loadTemplates();
    initializeEventListeners();
});

