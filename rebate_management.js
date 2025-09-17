/**
 * @file rebate_management.js
 * @version 5.1-data-source-fix
 * @description Rebate management page script, sidebar logic is now handled by sidebar.js
 * * --- 更新日志 (v5.1) ---
 * - [根本性修复] 修正了数据拉取逻辑。原逻辑只拉取了第一页（默认10条）的合作数据，导致大量数据无法显示。现已通过增加 limit 参数确保拉取所有合作记录。
 * - [架构优化] 移除了对 /talents 接口的多余调用。现在直接使用 /collaborations 接口返回的、已包含达人信息的 collab.talentInfo 对象，解决了因达人列表不完整导致的数据丢失和显示错误问题。
 * * --- v4.7 ---
 * - [架构优化] 移除了所有侧边栏相关的DOM元素引用、功能函数和事件监听器。
 * - [关注点分离] 此文件现在只负责返点管理页面的核心功能，侧边栏由独立的 `sidebar.js` 组件管理。
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

    // --- DOM Elements ---
    const mainContent = document.getElementById('main-content');
    const statsReceivable = document.getElementById('stats-receivable');
    const statsRecovered = document.getElementById('stats-recovered');
    const statsRecoveryRate = document.getElementById('stats-recovery-rate');
    const statsTodoCount = document.getElementById('stats-todo-count');
    const projectFilter = document.getElementById('project-filter');
    const statusFilter = document.getElementById('status-filter');
    const talentSearchInput = document.getElementById('talent-search');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const rebateListBody = document.getElementById('rebate-list-body');
    const paginationControls = document.getElementById('pagination-controls');
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const modalImage = document.getElementById('modal-image');
    const closeImageViewerBtn = document.getElementById('close-image-viewer-btn');
    const imageUploadInput = document.getElementById('image-upload-input');

    // --- State & Keys ---
    const ITEMS_PER_PAGE_KEY = 'rebateManagementItemsPerPage';
    
    let allProjects = [];
    let allCollaborations = [];
    let rebateTasks = [];
    let displayedTasks = [];
    let currentPage = 1;
    let itemsPerPage = 15;
    let openRowId = null;
    let currentUploadTaskId = null;

    // --- API Request Function ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
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
            showCustomAlert(`操作失败: ${error.message}`);
            throw error;
        }
    }
    
    // --- Custom Modal ---
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full hidden z-50 flex items-center justify-center p-4';
    modal.innerHTML = `<div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"><h3 class="text-lg font-bold text-gray-900" id="modal-title-custom"></h3><div class="mt-2 py-3"><div class="text-sm text-gray-500" id="modal-message-custom"></div></div><div class="mt-4 flex justify-end space-x-2" id="modal-actions-custom"><button id="modal-cancel-custom" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button id="modal-confirm-custom" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">确定</button></div></div>`;
    document.body.appendChild(modal);
    const modalTitleEl = document.getElementById('modal-title-custom');
    const modalMessageEl = document.getElementById('modal-message-custom');
    const modalConfirmBtn = document.getElementById('modal-confirm-custom');
    const modalCancelBtn = document.getElementById('modal-cancel-custom');

    const showCustomAlert = (message, title = '提示', callback) => {
        modalTitleEl.textContent = title;
        modalMessageEl.innerHTML = message;
        modalConfirmBtn.textContent = '确定';
        modalConfirmBtn.onclick = () => { modal.classList.add('hidden'); if (callback) callback(true); };
        modalCancelBtn.classList.add('hidden');
        modal.classList.remove('hidden');
    };
    
    const showCustomConfirm = (message, title = '确认操作', callback) => {
        modalTitleEl.textContent = title;
        modalMessageEl.innerHTML = message;
        modalConfirmBtn.textContent = '确定';
        modalConfirmBtn.onclick = () => { modal.classList.add('hidden'); callback(true); };
        modalCancelBtn.classList.remove('hidden');
        modalCancelBtn.onclick = () => { modal.classList.add('hidden'); callback(false); };
        modal.classList.remove('hidden');
    };


    // --- Core Data Aggregation & Processing ---
    async function loadInitialData() {
        try {
            // [根本性修复] 为 /collaborations 接口增加 limit 参数，确保拉取所有合作数据，而不是默认的第一页（10条）。
            // [架构优化] 移除了对 /talents 的多余调用，因为 /collaborations 已经返回了所需信息。
            const [projectsResponse, collabsResponse] = await Promise.all([
                apiRequest('/projects?view=simple'),
                apiRequest('/collaborations?allowGlobal=true&limit=9999') // 使用一个足够大的 limit 来获取所有数据
            ]);

            allProjects = projectsResponse.data || [];
            allCollaborations = collabsResponse.data || [];
            
            aggregateRebateTasks();
            renderProjectFilter();
            renderPage();

        } catch (error) {
            console.error("Failed to load initial data:", error);
            rebateListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-red-500">数据加载失败，请刷新页面重试。</td></tr>`;
        }
    }
    
    function aggregateRebateTasks() {
        const projectMap = new Map(allProjects.map(p => [p.id, p]));

        rebateTasks = allCollaborations
            .filter(collab => {
                // [BUG修复] 直接使用后端 /collaborations 接口 v5.0 版已提供的 collab.talentSource 字段。
                // 这比依赖独立的 /talents 接口更可靠。
                return (collab.talentSource || '野生达人') === '野生达人' && 
                       collab.status === '视频已发布' && 
                       collab.metrics && 
                       collab.metrics.rebateReceivable > 0;
            })
            .map(collab => {
                const projectInfo = projectMap.get(collab.projectId);
                
                return {
                    id: collab.id,
                    projectId: collab.projectId,
                    projectName: projectInfo ? projectInfo.name : '未知项目',
                    talentId: collab.talentId,
                    // [BUG修复] 直接使用 collab 对象中已包含的 talentInfo.nickname，不再依赖外部的 talentMap。
                    talentName: collab.talentInfo ? collab.talentInfo.nickname : '未知达人',
                    // [BUG修复] 使用 collab 对象中已有的 talentSource，而不是硬编码。
                    talentSource: collab.talentSource || '野生达人',
                    publishDate: collab.publishDate,
                    receivable: collab.metrics.rebateReceivable,
                    recoveredAmount: collab.actualRebate,
                    recoveryDate: collab.recoveryDate,
                    discrepancyReason: collab.discrepancyReason,
                    discrepancyReasonUpdatedAt: collab.discrepancyReasonUpdatedAt,
                    screenshots: collab.rebateScreenshots || []
                };
            });
    }

    // --- Main Render & Filter Logic ---
    function renderPage() {
        applyFilters();
        renderDashboard();
        renderTable();
    }

    function applyFilters() {
        const projectFilterValue = projectFilter.value;
        const statusFilterValue = statusFilter.value;
        const searchQuery = talentSearchInput.value.toLowerCase().trim();

        displayedTasks = rebateTasks.filter(task => {
            const projectMatch = !projectFilterValue || task.projectId === projectFilterValue;
            const searchMatch = !searchQuery || task.talentName.toLowerCase().includes(searchQuery);
            
            let statusMatch = true;
            if (statusFilterValue) {
                const isRecovered = task.recoveredAmount != null; 
                const hasDiscrepancy = isRecovered && Math.abs(task.recoveredAmount - task.receivable) > 0.01;
                switch (statusFilterValue) {
                    case 'pending': statusMatch = !isRecovered; break;
                    case 'recovered': statusMatch = isRecovered && !hasDiscrepancy; break;
                    case 'discrepancy': statusMatch = hasDiscrepancy; break;
                }
            }
            return projectMatch && searchMatch && statusMatch;
        });
    }

    function renderDashboard() {
        const stats = displayedTasks.reduce((acc, task) => {
            acc.totalReceivable += task.receivable || 0;
            const recovered = parseFloat(task.recoveredAmount);
            if (recovered !== null && !isNaN(recovered)) {
                acc.totalRecovered += recovered;
            }
            if (task.recoveredAmount === null || isNaN(parseFloat(task.recoveredAmount))) {
                 acc.todoCount++;
            }
            return acc;
        }, { 
            totalReceivable: 0, 
            totalRecovered: 0, 
            todoCount: 0
        });

        statsReceivable.textContent = `¥ ${stats.totalReceivable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        statsRecovered.textContent = `¥ ${stats.totalRecovered.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        statsRecoveryRate.textContent = stats.totalReceivable > 0 ? `${((stats.totalRecovered / stats.totalReceivable) * 100).toFixed(2)}%` : '0.00%';
        statsTodoCount.textContent = stats.todoCount;
    }

    function renderTable() {
        rebateListBody.innerHTML = '';
        const totalPages = Math.ceil(displayedTasks.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const paginatedTasks = displayedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        if (paginatedTasks.length === 0) {
            rebateListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-gray-500">未找到符合条件的返点任务。</td></tr>`;
        } else {
             paginatedTasks.forEach(task => {
                const isDetailsOpen = openRowId === task.id;
                const row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50';
                row.dataset.taskId = task.id;
                
                const isRecovered = task.recoveredAmount != null;
                const recoveredAmount = parseFloat(task.recoveredAmount);
                const hasDiscrepancy = isRecovered && Math.abs(recoveredAmount - task.receivable) > 0.01;

                let statusHtml;
                if (hasDiscrepancy) {
                    statusHtml = `<span class="status-tag bg-red-100 text-red-800">有差异</span>`;
                } else if (isRecovered) {
                    statusHtml = `<span class="status-tag bg-green-100 text-green-800">已回收</span>`;
                } else {
                    statusHtml = `<span class="status-tag bg-yellow-100 text-yellow-800">待回收</span>`;
                }

                const recoveredAmountDisplay = isRecovered 
                    ? `¥ ${recoveredAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                    : 'N/A';

                row.innerHTML = `
                    <td class="px-6 py-4 font-medium"><a href="order_list.html?projectId=${task.projectId}&from=rebate_management" class="text-blue-600 hover:underline">${task.projectName}</a></td>
                    <td class="px-6 py-4 font-semibold text-gray-900">${task.talentName}</td>
                    <td class="px-6 py-4">${task.talentSource}</td>
                    <td class="px-6 py-4">${task.publishDate || 'N/A'}</td>
                    <td class="px-6 py-4 font-medium text-blue-600">¥ ${task.receivable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td class="px-6 py-4 font-medium ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'}">${recoveredAmountDisplay}</td>
                    <td class="px-6 py-4">${statusHtml}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="font-medium text-blue-600 hover:underline toggle-details-btn">${isDetailsOpen ? '收起' : (isRecovered ? '查看/修改' : '录入信息')}</button>
                    </td>
                `;
                rebateListBody.appendChild(row);

                if (isDetailsOpen) {
                    const detailsRow = document.createElement('tr');
                    detailsRow.className = 'details-row open';
                    detailsRow.innerHTML = renderDetailsRowContent(task);
                    rebateListBody.appendChild(detailsRow);
                }
            });
        }
        renderPagination(totalPages, displayedTasks.length);
    }
    
    function renderDetailsRowContent(task) {
        const isRecovered = task.recoveredAmount != null;
        const recoveredAmountNum = parseFloat(task.recoveredAmount);
        const hasDiscrepancy = !isNaN(recoveredAmountNum) && Math.abs(recoveredAmountNum - task.receivable) > 0.01;
        const screenshots = task.screenshots || [];

        let screenshotHtml = screenshots.map((imgUrl, index) => `
            <div class="relative group w-24 h-24">
                <img src="${imgUrl}" data-url="${imgUrl}" class="rounded-md w-full h-full object-cover border-2 border-gray-300 view-screenshot-btn cursor-pointer">
                <button class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center delete-screenshot-btn opacity-0 group-hover:opacity-100 transition-opacity" data-index="${index}" data-url="${imgUrl}" title="删除此凭证">&times;</button>
            </div>
        `).join('');

        if (screenshots.length === 0) {
            screenshotHtml = `
                <div class="w-full">
                    <label for="image-upload-trigger" class="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div class="text-center">
                            <svg class="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p class="mt-2 text-sm text-gray-500">点击此处，或拖拽图片到这里</p>
                            <p class="mt-1 text-xs text-gray-400">最多上传5张凭证</p>
                        </div>
                    </label>
                    <button id="image-upload-trigger" class="hidden"></button> 
                </div>`;
        } else if (screenshots.length < 5) {
            screenshotHtml += `
                <button id="add-screenshot-btn" class="w-24 h-24 bg-gray-200 text-gray-500 rounded-md flex flex-col items-center justify-center hover:bg-gray-300 transition-colors" title="继续上传凭证">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    <span class="text-xs mt-1">继续上传</span>
                </button>
            `;
        }

        const deleteButtonHtml = isRecovered ? `<button class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold delete-record-btn">删除记录</button>` : '';
        const recoveredValue = task.recoveredAmount ?? '';
        const discrepancyContainerClass = hasDiscrepancy ? 'bg-red-50 border border-red-200 p-3 rounded-lg' : 'hidden';
        
        let timestampHtml = '';
        if (task.discrepancyReasonUpdatedAt) {
            const date = new Date(task.discrepancyReasonUpdatedAt);
            const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            timestampHtml = `<p class="text-xs text-gray-500 mt-1">返点信息更新于: ${formattedDate}</p>`;
        }

        return `
            <td colspan="8" class="p-0">
                <div class="bg-blue-50 p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div class="space-y-4">
                            <div><label class="block text-sm font-medium">实收金额 <span class="text-red-500">*</span></label><input type="number" step="0.01" class="mt-1 w-full rounded-md border-gray-300 shadow-sm" placeholder="0.00" id="recovered-amount-input" value="${recoveredValue}"></div>
                            <div><label class="block text-sm font-medium">回收日期 <span class="text-red-500">*</span></label><input type="date" class="mt-1 w-full rounded-md border-gray-300 shadow-sm" id="recovery-date-input" value="${task.recoveryDate || ''}"></div>
                            <div id="discrepancy-reason-container" class="${discrepancyContainerClass}">
                                <label class="block text-sm font-bold text-red-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-4a1 1 0 011-1h.008a1 1 0 011 1v2a1 1 0 01-1 1h-.008a1 1 0 01-1-1V9z" clip-rule="evenodd" /></svg>
                                    差异原因 (必填)
                                </label>
                                <textarea rows="3" class="mt-1 w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500" id="discrepancy-reason-input" placeholder="请说明实收与应收不一致的原因...">${task.discrepancyReason || ''}</textarea>
                                ${timestampHtml}
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium">上传凭证 (截图)</label>
                            <div class="mt-2 flex flex-wrap gap-3 items-start" id="screenshot-preview-container">
                                ${screenshotHtml}
                            </div>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-between items-center">
                        <div>${deleteButtonHtml}</div>
                        <div class="flex gap-3">
                            <button class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cancel-btn">取消</button>
                            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 save-btn">确认保存</button>
                        </div>
                    </div>
                </div>
            </td>
        `;
    }

    function renderPagination(totalPages, totalItems) {
        paginationControls.innerHTML = '';
        if (totalItems === 0) return;
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"><option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option><option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option><option value="30" ${itemsPerPage === 30 ? 'selected' : ''}>30</option><option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option></select></div>`;
        const pageButtons = [];
        const maxButtons = 7;
        const currentPageNum = currentPage;

        if (totalPages > 1) {
            if (totalPages <= maxButtons) {
                for (let i = 1; i <= totalPages; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`);
            } else {
                pageButtons.push(`<button class="pagination-btn ${1 === currentPageNum ? 'active' : ''}" data-page="1">1</button>`);
                let startPage = Math.max(2, currentPageNum - 2);
                let endPage = Math.min(totalPages - 1, currentPageNum + 2);
                if (currentPageNum - 1 > 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                if (currentPageNum <= 4) endPage = 5;
                if (currentPageNum >= totalPages - 3) startPage = totalPages - 4;
                for (let i = startPage; i <= endPage; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" data-page="${i}">${i}</button>`);
                if (totalPages - currentPageNum > 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                pageButtons.push(`<button class="pagination-btn ${totalPages === currentPageNum ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
            }
        }

        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-2"><button id="prev-page-btn" class="pagination-btn" ${currentPageNum === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons.join('')}<button id="next-page-btn" class="pagination-btn" ${currentPageNum === totalPages ? 'disabled' : ''}>&gt;</button></div>` : '<div></div>';
        paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }

    function renderProjectFilter() {
        const projectsWithTasks = allProjects.map(p => {
            const tasks = rebateTasks.filter(t => t.projectId === p.id);
            if (tasks.length === 0) return null;
            const recoveredCount = tasks.filter(t => t.recoveredAmount !== null && !isNaN(t.recoveredAmount)).length;
            const totalCount = tasks.length;
            const isCompleted = recoveredCount === totalCount;
            return { id: p.id, name: p.name, recoveredCount, totalCount, isCompleted };
        }).filter(Boolean);
        projectFilter.innerHTML = '<option value="">所有项目</option>';
        projectsWithTasks.forEach(p => {
            const statusText = p.isCompleted ? ' (已全部回收)' : ` (${p.recoveredCount}/${p.totalCount} 已回收)`;
            projectFilter.innerHTML += `<option value="${p.id}">${p.name}${statusText}</option>`;
        });
    }
    
    async function handleSaveRebate() {
        const taskId = openRowId;
        const task = rebateTasks.find(t => t.id === taskId);
        if (!task) return;

        const amountInput = document.getElementById('recovered-amount-input');
        const dateInput = document.getElementById('recovery-date-input');
        const reasonInput = document.getElementById('discrepancy-reason-input');
        
        const amountValue = amountInput.value.trim();
        const recoveredAmount = amountValue === '' ? null : parseFloat(amountValue);
        const recoveryDate = dateInput.value;
        const reason = reasonInput.value.trim();

        if (recoveredAmount === null && recoveryDate) { showCustomAlert('录入回收日期时，必须填写实收金额。'); return; }
        if (recoveredAmount !== null && isNaN(recoveredAmount)) { showCustomAlert('实收金额格式无效。'); return; }
        if (recoveredAmount !== null && !recoveryDate) { showCustomAlert('请填写回收日期。'); return; }
        
        const hasDiscrepancy = recoveredAmount !== null && Math.abs(recoveredAmount - task.receivable) > 0.01;
        if (hasDiscrepancy && !reason) {
            showCustomAlert('实收金额与应收金额不一致，请填写差异原因。'); return;
        }

        const finalScreenshots = task.screenshots || [];
        if (hasDiscrepancy && finalScreenshots.length === 0) {
            showCustomAlert('返点金额有差异，必须上传凭证截图才能保存。');
            return;
        }

        try {
            const payload = {
                id: taskId,
                actualRebate: recoveredAmount,
                recoveryDate: recoveryDate,
                discrepancyReason: reason,
                rebateScreenshots: finalScreenshots
            };

            const success = await apiRequest('/update-collaboration', 'PUT', payload);
            if (success) {
                showCustomAlert('保存成功！');
                openRowId = null; 
                await loadInitialData();
            }
        } catch (error) {
            // Error is handled in apiRequest
        }
    }

    async function handleDeleteRecord() {
        const taskId = openRowId;
        const task = rebateTasks.find(t => t.id === taskId);
        if (!task) return;
        
        const performDelete = async () => {
            try {
                // Step 1: Delete all associated screenshots from TOS
                const screenshotsToDelete = task.screenshots || [];
                if (screenshotsToDelete.length > 0) {
                    showCustomAlert(`正在删除 ${screenshotsToDelete.length} 张关联凭证...`, '请稍候');
                    const deletePromises = screenshotsToDelete.map(url =>
                        apiRequest('/delete-file', 'POST', {
                            projectId: task.projectId,
                            fileUrl: url
                        })
                    );
                    await Promise.allSettled(deletePromises);
                }

                // Step 2: Clear the database record
                await apiRequest('/update-collaboration', 'PUT', {
                    id: taskId,
                    actualRebate: null,
                    recoveryDate: null,
                    discrepancyReason: null,
                    rebateScreenshots: [] // Set to empty array
                });
                
                modal.classList.add('hidden'); // Close the "deleting..." alert if it was shown
                showCustomAlert('记录已成功清除');
                openRowId = null;
                await loadInitialData(); // Reload all data to reflect changes
            } catch (error) { 
                /* Error is handled in apiRequest, which shows a modal */ 
                console.error("Failed to delete record:", error);
            }
        };
        
        showCustomConfirm('您确定要删除此条回收记录吗？<br><span class="text-xs text-red-500">将清空所有已填信息并永久删除所有关联的凭证图片。</span>','确认删除', async (confirmed) => {
            if (confirmed) {
                await performDelete();
            }
        });
    }
    
    async function handleImageUpload(files) {
        if (!currentUploadTaskId) return;
        
        const task = rebateTasks.find(t => t.id === currentUploadTaskId);
        if (!task) return;

        if (((task.screenshots || []).length + files.length) > 5) {
            showCustomAlert(`最多上传5张凭证。您还可以上传 ${5 - (task.screenshots || []).length} 张。`);
            imageUploadInput.value = '';
            return;
        }
        
        showCustomAlert('正在上传凭证，请稍候...', '上传中');

        try {
            const uploadPromises = Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const response = await apiRequest('/upload-file', 'POST', {
                                fileName: file.name,
                                fileData: e.target.result
                            });
                            resolve(response.data.url);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            const newUrls = await Promise.all(uploadPromises);
            const updatedScreenshots = [...(task.screenshots || []), ...newUrls];
            
            await apiRequest('/update-collaboration', 'PUT', {
                id: currentUploadTaskId,
                rebateScreenshots: updatedScreenshots
            });
            modal.classList.add('hidden');

            await smartRefreshDetailsView(currentUploadTaskId, {
                screenshots: updatedScreenshots
            });
            showCustomAlert('凭证上传成功!');

        } catch (error) {
             console.error("Image upload process failed:", error);
             modal.classList.add('hidden');
        } finally {
            imageUploadInput.value = '';
        }
    }

    async function smartRefreshDetailsView(taskId, updates) {
        const task = rebateTasks.find(t => t.id === taskId);
        if (!task) return;
    
        const amountInput = document.getElementById('recovered-amount-input');
        const dateInput = document.getElementById('recovery-date-input');
        const reasonInput = document.getElementById('discrepancy-reason-input');
    
        if (updates.screenshots !== undefined) {
            task.screenshots = updates.screenshots;
        }

        const updatedTaskData = await apiRequest(`/collaborations?collaborationId=${taskId}`);
        if (updatedTaskData.data) {
             task.discrepancyReasonUpdatedAt = updatedTaskData.data.discrepancyReasonUpdatedAt;
        }
        
        if (amountInput) {
            task.recoveredAmount = amountInput.value;
        }
        if (dateInput) {
            task.recoveryDate = dateInput.value;
        }
        if (reasonInput) {
            task.discrepancyReason = reasonInput.value;
        }
    
        openRowId = taskId;
        renderTable();
    }
    
    async function initializePage() {
        // Sidebar logic is now in sidebar.js.
        statusFilter.value = 'pending';
        await loadInitialData();
        
        // This listener will be attached by sidebar.js now.
        // sidebarToggleBtn.addEventListener('click', toggleSidebar);

        applyFiltersBtn.addEventListener('click', () => { currentPage = 1; renderPage(); });
        resetFiltersBtn.addEventListener('click', () => {
            projectFilter.value = '';
            statusFilter.value = '';
            talentSearchInput.value = '';
            currentPage = 1;
            renderPage();
        });

        paginationControls.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target || target.disabled) return;
            const totalPages = Math.ceil(displayedTasks.length / itemsPerPage);
            if (target.id === 'prev-page-btn') currentPage--;
            else if (target.id === 'next-page-btn') currentPage++;
            else if (target.dataset.page) currentPage = Number(target.dataset.page);
            renderTable();
        });
        
        paginationControls.addEventListener('change', (e) => {
            if (e.target.id === 'items-per-page') {
                itemsPerPage = parseInt(e.target.value);
                localStorage.setItem(ITEMS_PER_PAGE_KEY, itemsPerPage);
                currentPage = 1;
                renderTable();
            }
        });

        rebateListBody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) {
                 // Check if the click was on an image for viewing
                const img = e.target.closest('.view-screenshot-btn');
                if (img && img.dataset.url) {
                    modalImage.src = img.dataset.url;
                    imageViewerModal.classList.remove('hidden');
                }
                return;
            }
            
            const rowElement = target.closest('tr.details-row') ? rebateListBody.querySelector(`tr[data-task-id="${openRowId}"]`) : target.closest('tr');
            const taskId = openRowId || rowElement?.dataset.taskId;

            if (target.closest('.toggle-details-btn')) {
                openRowId = openRowId === taskId ? null : taskId;
                renderTable();
            } else if (target.closest('.save-btn')) {
                await handleSaveRebate();
            } else if (target.closest('.cancel-btn')) {
                openRowId = null;
                renderTable();
            } else if (target.closest('.delete-record-btn')) {
                await handleDeleteRecord();
            } else if (target.closest('#add-screenshot-btn') || target.closest('label[for="image-upload-trigger"]')) {
                currentUploadTaskId = openRowId;
                imageUploadInput.click();
            } else if (target.closest('.delete-screenshot-btn')) {
                const index = parseInt(target.dataset.index, 10);
                const fileUrlToDelete = target.dataset.url;
                const task = rebateTasks.find(t => t.id === openRowId);
                if (!task || !fileUrlToDelete) return;

                showCustomConfirm('您确定要删除此凭证吗？<br><span class="text-xs text-red-500">文件将从服务器永久删除。</span>', '确认删除', async (confirmed) => {
                    if (confirmed) {
                        try {
                            // Step 1: Delete file from TOS via our backend endpoint
                            await apiRequest('/delete-file', 'POST', {
                                projectId: task.projectId, // Pass projectId for logging and consistency
                                fileUrl: fileUrlToDelete
                            });

                            // Step 2: Update the database record by removing the url
                            const updatedScreenshots = task.screenshots.filter((_, i) => i !== index);
                            await apiRequest('/update-collaboration', 'PUT', { id: openRowId, rebateScreenshots: updatedScreenshots });
                            
                            // Step 3: Refresh the view
                            await smartRefreshDetailsView(openRowId, {
                                screenshots: updatedScreenshots
                            });
                            showCustomAlert('凭证删除成功!');
                        } catch(error) { /* handled by apiRequest */ }
                    }
                });
            }
        });
        
        rebateListBody.addEventListener('input', (e) => {
            if (e.target.id === 'recovered-amount-input') {
                const task = rebateTasks.find(t => t.id === openRowId);
                if (!task) return;
                
                const reasonContainer = document.getElementById('discrepancy-reason-container');
                if (!reasonContainer) return;

                const amountValue = e.target.value.trim();
                const amount = parseFloat(amountValue);

                const hasDiscrepancy = amountValue !== '' && !isNaN(amount) && Math.abs(amount - task.receivable) > 0.01;
                
                if (hasDiscrepancy) {
                    reasonContainer.className = 'bg-red-50 border border-red-200 p-3 rounded-lg';
                } else {
                    reasonContainer.className = 'hidden';
                }
            }
        });

        imageUploadInput.addEventListener('change', (e) => handleImageUpload(e.target.files));
        closeImageViewerBtn.addEventListener('click', () => imageViewerModal.classList.add('hidden'));

        // Menu toggle logic is now handled by sidebar.js
        // document.querySelectorAll('.nav-toggle').forEach(toggle => { ... });
    }
    
    initializePage();
});

