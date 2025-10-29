/**
 * @file task_center.js
 * @version 12.1-sidebar-refactor
 * @description [视觉统一重构版] 任务中心前端脚本。
 * - [核心重构] 移除了本地的 initializeSidebar 函数，改为完全依赖外部的 sidebar.js 组件。这确保了所有页面的侧边栏行为都来自单一代码源，实现了真正的视觉与交互统一，并消除了代码冗余。
 */
document.addEventListener('DOMContentLoaded', function () {
    
    // =================================================================
    // --- 任务中心页面核心功能 ---
    // =================================================================
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const TASKS_API_ENDPOINT = '/tasks';
    const SYSTEM_STATUS_API_ENDPOINT = '/system-status';
    const PENDING_PUBLISH_ENDPOINT = '/pending-publish-talents';
    const UPDATE_COLLAB_ENDPOINT = '/update-collaboration';
    const SYNC_FROM_FEISHU_ENDPOINT = '/sync-from-feishu';
    const TASK_SERVICE_ENDPOINT = '/tasks-service'; 

    const layoutContainer = document.getElementById('task-layout-container');
    const dataMaintenanceList = document.getElementById('data-maintenance-list');
    const pendingPublishList = document.getElementById('pending-publish-list');
    const dataOverdueList = document.getElementById('data-overdue-list'); 
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    const taskGroupTemplate = document.getElementById('task-group-template');
    const logsContainer = document.getElementById('logs-container'); 
    const triggerScanBtn = document.getElementById('trigger-scan-btn');
    const performanceCardContainer = document.getElementById('performance-card-container');
    const priceCardContainer = document.getElementById('price-card-container');

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
            return response.json();
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            showToast(`请求失败: ${error.message}`, true);
            throw error;
        }
    }
    
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = `fixed top-5 right-5 z-50 px-4 py-2 rounded-md text-white shadow-lg ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function formatRelativeTime(isoString) {
        if (!isoString) return '未知时间';
        const date = new Date(isoString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toTimeString().substr(0, 5);
        if (date >= today) return `今天 ${time}`;
        if (date >= yesterday) return `昨天 ${time}`;
        return date.toLocaleDateString();
    }

    function getNextDayOfWeek(dayOfWeek) {
        const now = new Date();
        now.setDate(now.getDate() + (dayOfWeek - 1 - now.getDay() + 7) % 7 + 1);
        return now.toISOString().split('T')[0];
    }

    function getNextMonthDay(day) {
        const now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), day);
        if (now.getDate() >= day) {
            d = new Date(now.getFullYear(), now.getMonth() + 1, day);
        }
        return d.toISOString().split('T')[0];
    }

    async function fetchAndRenderSystemStatus() {
        try {
            const response = await apiRequest(SYSTEM_STATUS_API_ENDPOINT);
            if (response.success && response.data) {
                renderPerformanceCard(response.data.performance);
                renderPriceCard(response.data.price);
            }
        } catch (error) {
            performanceCardContainer.innerHTML = `<p class="text-sm text-red-500 p-4">加载全局状态失败。</p>`;
            priceCardContainer.innerHTML = '';
        }
    }

    function renderPerformanceCard(data) {
        const isUpdateNeeded = data.isUpdateNeeded;
        const dotColor = isUpdateNeeded ? 'bg-red-500' : 'bg-green-500';
        const actionButton = isUpdateNeeded 
            ? `<button id="update-performance-btn" class="px-3 py-1 text-sm bg-red-500 text-white font-semibold rounded-md hover:bg-red-600">立即更新</button>`
            : `<span class="px-3 py-1 text-sm bg-green-100 text-green-700 font-semibold rounded-md">✅ 已是最新</span>`;

        performanceCardContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
                <div class="p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold text-gray-800 flex items-center">
                                <span class="w-2.5 h-2.5 ${dotColor} rounded-full mr-2"></span>
                                达人表现数据 (Performance)
                            </h3>
                            <p class="text-xs text-gray-500 mt-2">最近更新: <strong class="font-mono">${data.lastUpdated ? data.lastUpdated.split('T')[0] : '无记录'}</strong></p>
                            <p class="text-xs text-gray-500 mt-1">下次检查: <strong class="font-mono">${getNextDayOfWeek(1)} (每周一)</strong></p>
                        </div>
                        ${actionButton}
                    </div>
                </div>
                <div id="performance-sync-content" class="maintenance-content bg-gray-50 px-4 border-t border-gray-200"></div>
            </div>`;
    }

    function renderPriceCard(data) {
        const isUpdateNeeded = data.isUpdateNeeded;
        const dotColor = isUpdateNeeded ? 'bg-red-500' : 'bg-green-500';
        const statusText = isUpdateNeeded ? `<strong class="text-red-600">${data.unconfirmedCount} 位达人待更新</strong>` : '已全部确认';
        const actionButton = isUpdateNeeded
            ? `<button id="update-price-btn" class="px-3 py-1 text-sm bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">前往更新</button>`
            : `<span class="px-3 py-1 text-sm bg-green-100 text-green-700 font-semibold rounded-md">✅ 已确认</span>`;
        
        priceCardContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200/80">
                <div class="p-4 flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold text-gray-800 flex items-center">
                            <span class="w-2.5 h-2.5 ${dotColor} rounded-full mr-2"></span>
                            达人报价 (Price)
                        </h3>
                        <p class="text-xs text-gray-500 mt-2">本月状态: ${statusText}</p>
                        <p class="text-xs text-gray-500 mt-1">下次检查: <strong class="font-mono">${getNextMonthDay(2)} (每月2号)</strong></p>
                    </div>
                    ${actionButton}
                </div>
            </div>`;
    }

    async function fetchAndRenderTasks() {
        loadingIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');
        layoutContainer.classList.add('hidden');
        try {
            const response = await apiRequest(TASKS_API_ENDPOINT);
            if (response.success && response.data) {
                distributeAndRenderTasks(response.data);
            } else {
                throw new Error(response.message || '返回数据格式不正确');
            }
        } catch (error) {
            // Handled in apiRequest
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    function distributeAndRenderTasks(projectsWithTasks) {
        const dataMaintenanceProjects = {};
        const pendingPublishProjects = {};
        const dataOverdueProjects = {};
        for (const projectId in projectsWithTasks) {
            const project = projectsWithTasks[projectId];
            project.tasks.forEach(task => {
                if (task.type === 'PROJECT_PENDING_PUBLISH') {
                    if (!pendingPublishProjects[projectId]) pendingPublishProjects[projectId] = { projectName: project.projectName, tasks: [] };
                    pendingPublishProjects[projectId].tasks.push(task);
                } else if (task.type.startsWith('PROJECT_DATA_OVERDUE')) {
                    if (!dataOverdueProjects[projectId]) dataOverdueProjects[projectId] = { projectName: project.projectName, tasks: [] };
                    dataOverdueProjects[projectId].tasks.push(task);
                } else {
                    if (!dataMaintenanceProjects[projectId]) dataMaintenanceProjects[projectId] = { projectName: project.projectName, tasks: [] };
                    dataMaintenanceProjects[projectId].tasks.push(task);
                }
            });
        }
        renderTaskList(dataMaintenanceList, dataMaintenanceProjects, '项目流程提醒');
        renderTaskList(pendingPublishList, pendingPublishProjects, '视频未发布');
        renderTaskList(dataOverdueList, dataOverdueProjects, '数据逾期告警');
        if (Object.keys(projectsWithTasks).length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            layoutContainer.classList.remove('hidden');
        }
    }
    
    function renderTaskList(container, projects, emptyText) {
        container.innerHTML = '';
        if (Object.keys(projects).length === 0) {
            container.innerHTML = `<div class="text-center text-sm text-gray-500 py-4 bg-white rounded-lg">暂无${emptyText}任务</div>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const projectId in projects) {
            const project = projects[projectId];
            const groupNode = taskGroupTemplate.content.cloneNode(true);
            const groupElement = groupNode.querySelector('.task-group');
            groupElement.querySelector('.project-name').textContent = project.projectName;
            const taskCountElement = groupElement.querySelector('.task-count');
            const viewLinkElement = groupElement.querySelector('.view-project-link');
            const mainTask = project.tasks[0];
            if (mainTask.type === 'PROJECT_PENDING_PUBLISH') {
                const match = mainTask.description.match(/有 (\d+) 位达人/);
                taskCountElement.textContent = `${match ? match[1] : project.tasks.length} 条视频待发布`;
                viewLinkElement.remove();
            } else if (mainTask.type.startsWith('PROJECT_DATA_OVERDUE')) {
                const hasT7 = project.tasks.some(t => t.type.includes('T7'));
                const hasT21 = project.tasks.some(t => t.type.includes('T21'));
                let typeTexts = [];
                if (hasT7) typeTexts.push('T+7');
                if (hasT21) typeTexts.push('T+21');
                taskCountElement.textContent = `${typeTexts.join(' & ')} 数据逾期`;
                viewLinkElement.textContent = '上传数据';
            } else {
                taskCountElement.textContent = `${project.tasks.length} 项待办`;
                viewLinkElement.textContent = '处理';
            }
            groupElement.dataset.projectId = projectId;
            groupElement.dataset.tasks = JSON.stringify(project.tasks);
            fragment.appendChild(groupNode);
        }
        container.appendChild(fragment);
    }

    async function fetchAndRenderLogs() {
        try {
            const response = await apiRequest(TASK_SERVICE_ENDPOINT, 'POST', { action: 'getLogs', limit: 1 });
            if (response.success && response.data.length > 0) {
                const log = response.data[0];
                const isSuccess = log.status === 'SUCCESS';
                logsContainer.innerHTML = `<div class="flex items-center gap-2"><div class="log-status-dot ${isSuccess ? 'bg-green-500' : 'bg-red-500'}"></div><div><p class="font-semibold text-gray-700">${isSuccess ? '上次运行: 成功' : '上次运行: 失败'}</p><p class="text-gray-500" title="${new Date(log.timestamp).toLocaleString()}">${formatRelativeTime(log.timestamp)} - ${log.summary}</p></div></div>`;
            } else {
                logsContainer.innerHTML = '<p class="text-sm text-gray-500">暂无运行记录。</p>';
            }
        } catch (error) {
            logsContainer.innerHTML = '<p class="text-sm text-red-500">无法加载运行记录。</p>';
        }
    }

    function handleGroupHeaderClick(e) {
        const header = e.target.closest('.task-group-header');
        if (!header) return;
        const groupElement = header.parentElement;
        const contentContainer = groupElement.querySelector('.task-group-content');
        const icon = header.querySelector('.toggle-icon');
        const parentSection = groupElement.closest('section');
        if (parentSection) {
            parentSection.querySelectorAll('.task-group-content.expanded').forEach(el => {
                if (el !== contentContainer) {
                    el.classList.remove('expanded');
                    const prevIcon = el.previousElementSibling.querySelector('.toggle-icon');
                    if(prevIcon) prevIcon.classList.remove('rotated');
                }
            });
        }
        contentContainer.classList.toggle('expanded');
        if (icon) icon.classList.toggle('rotated');
        if (contentContainer.classList.contains('expanded') && !contentContainer.innerHTML.trim()) {
            const tasks = JSON.parse(groupElement.dataset.tasks);
            const mainTaskType = tasks[0].type;
            const projectId = groupElement.dataset.projectId;
            if (mainTaskType === 'PROJECT_PENDING_PUBLISH') {
                renderPendingPublishEditor(contentContainer, projectId);
            } else if (mainTaskType.startsWith('PROJECT_DATA_OVERDUE')) {
                renderDataSyncComponent(contentContainer, mainTaskType);
            } else {
                contentContainer.innerHTML = `<p class="text-sm text-gray-600 py-2 px-4">${tasks[0].description}</p>`;
            }
        }
    }

    async function renderPendingPublishEditor(container, projectId) {
        try {
            const response = await apiRequest(`${PENDING_PUBLISH_ENDPOINT}?projectId=${projectId}`);
            if(!response.success) throw new Error(response.message);
            const talents = response.data;
            if (talents.length === 0) {
                container.innerHTML = `<p class="text-xs text-gray-500 py-2 px-4">所有达人均已处理。</p>`;
                setTimeout(fetchAndRenderTasks, 1500); return;
            }
            container.innerHTML = `<ul class="space-y-3 p-4">${talents.map(talent => `<li class="p-3 bg-gray-100 rounded-md" data-collab-id="${talent.collaborationId}"><p class="font-semibold text-gray-800 text-sm">${talent.talentName}</p><div class="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2 text-sm items-center"><input type="date" class="publish-date-input block w-full text-xs rounded border-gray-300 shadow-sm p-1.5" value="${talent.publishDate || ''}"><input type="text" class="video-id-input block w-full text-xs rounded border-gray-300 shadow-sm p-1.5" placeholder="视频ID" value="${talent.videoId || ''}"><input type="text" class="task-id-input block w-full text-xs rounded border-gray-300 shadow-sm p-1.5" placeholder="星图任务ID" value="${talent.taskId || ''}"><button class="save-collab-btn h-full px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:bg-gray-400"><span>保存</span><div class="loader hidden animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div></button></div></li>`).join('')}</ul>`;
        } catch (error) {
            container.innerHTML = `<p class="text-xs text-red-500 py-2 px-4">加载失败: ${error.message}</p>`;
        }
    }

    async function handleSaveCollaboration(e) {
        const saveBtn = e.target.closest('.save-collab-btn');
        if (!saveBtn) return;
        const item = saveBtn.closest('li');
        const btnSpan = saveBtn.querySelector('span');
        const btnLoader = saveBtn.querySelector('.loader');
        try {
            saveBtn.disabled = true;
            btnSpan.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            const payload = { 
                id: item.dataset.collabId, 
                publishDate: item.querySelector('.publish-date-input').value, 
                videoId: item.querySelector('.video-id-input').value, 
                taskId: item.querySelector('.task-id-input').value, 
                status: '视频已发布' 
            };
            await apiRequest(UPDATE_COLLAB_ENDPOINT, 'PUT', payload);
            showToast('保存成功！');
            item.style.opacity = '0.5';
            btnSpan.textContent = '已保存';
        } catch (error) {
            // apiRequest already shows toast
        } finally {
            saveBtn.disabled = false;
            btnSpan.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    function renderDataSyncComponent(container, taskType) {
        const isT7 = taskType.includes('T7');
        container.innerHTML = `<div class="p-4 space-y-4" data-task-type="${taskType}"><div><label class="block text-sm font-medium text-gray-700 mb-1">飞书电子表格链接</label><input type="url" class="mini-sync-url w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" placeholder="https://xxxx.feishu.cn/sheets/xxxxxx"></div><fieldset><legend class="text-sm font-medium text-gray-700 mb-1">数据类型</legend><div class="flex items-center gap-x-4"><div class="flex items-center"><input id="dtype-t7-${taskType}" name="dataType-${taskType}" type="radio" value="t7" class="h-4 w-4" ${isT7 ? 'checked' : ''}><label for="dtype-t7-${taskType}" class="ml-2 block text-sm">T+7 数据</label></div><div class="flex items-center"><input id="dtype-t21-${taskType}" name="dataType-${taskType}" type="radio" value="t21" class="h-4 w-4" ${!isT7 ? 'checked' : ''}><label for="dtype-t21-${taskType}" class="ml-2 block text-sm">T+21 数据</label></div></div></fieldset><button class="mini-sync-btn w-full h-10 px-5 flex items-center justify-center bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"><span>开始同步</span><div class="loader hidden animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div></button><div class="mini-sync-result mt-2 text-sm"></div></div>`;
    }

    async function handleDataSync(e) {
        const syncBtn = e.target.closest('.mini-sync-btn');
        if (!syncBtn) return;
        const component = syncBtn.closest('.p-4'), urlInput = component.querySelector('.mini-sync-url'), resultDiv = component.querySelector('.mini-sync-result');
        const spreadsheetToken = (urlInput.value.match(/\/(?:sheets|spreadsheet)\/([a-zA-Z0-9]+)/) || [])[1];
        if (!spreadsheetToken) { resultDiv.innerHTML = `<p class="text-red-600">请输入有效的飞书表格链接。</p>`; return; }
        syncBtn.disabled = true; syncBtn.querySelector('span').classList.add('hidden'); syncBtn.querySelector('.loader').classList.remove('hidden');
        resultDiv.innerHTML = `<p class="text-gray-600">正在同步中...</p>`;
        try {
            const payload = { spreadsheetToken, dataType: component.querySelector(`input[name="dataType-${component.dataset.taskType}"]:checked`).value };
            const result = await apiRequest(SYNC_FROM_FEISHU_ENDPOINT, 'POST', payload);
            resultDiv.innerHTML = `<p class="text-green-600">同步成功！处理了 ${result.processedRows} 行。</p>`;
            showToast('同步成功，任务列表将在2秒后刷新。');
            setTimeout(() => { fetchAndRenderTasks(); fetchAndRenderLogs(); }, 2000);
        } catch (error) {
            resultDiv.innerHTML = `<p class="text-red-600">同步失败: ${error.message}</p>`;
        } finally {
            syncBtn.disabled = false; syncBtn.querySelector('span').classList.remove('hidden'); syncBtn.querySelector('.loader').classList.add('hidden');
        }
    }
    
    async function handleTriggerScan() {
        triggerScanBtn.classList.add('trigger-btn-loading'); triggerScanBtn.disabled = true;
        try {
            await apiRequest(TASK_SERVICE_ENDPOINT, 'POST', { action: 'triggerScan' });
            showToast('扫描任务已成功触发，正在后台运行...');
            setTimeout(() => { fetchAndRenderTasks(); fetchAndRenderLogs(); fetchAndRenderSystemStatus(); }, 5000);
        } catch (error) { /* Handled in apiRequest */ } 
        finally { setTimeout(() => { triggerScanBtn.classList.remove('trigger-btn-loading'); triggerScanBtn.disabled = false; }, 5000); }
    }

    function renderPerformanceSyncComponent(container) {
        container.innerHTML = `<div class="p-4 space-y-4"><label class="block text-sm font-medium text-gray-700 mb-1">飞书电子表格链接</label><input type="url" class="performance-sync-url w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" placeholder="https://xxxx.feishu.cn/sheets/xxxxxx"><p class="text-xs text-gray-500 mt-1">表格需包含"达人星图ID"列及各项待更新的数据列。</p><button class="performance-sync-btn w-full h-10 px-5 flex items-center justify-center bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"><span>开始同步</span><div class="loader hidden animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div></button><div class="performance-sync-result mt-2 text-sm"></div></div>`;
    }

    async function handlePerformanceSync(e) {
        const syncBtn = e.target.closest('.performance-sync-btn');
        if (!syncBtn) return;
        const component = syncBtn.closest('.p-4'), urlInput = component.querySelector('.performance-sync-url'), resultDiv = component.querySelector('.performance-sync-result');
        const url = urlInput.value.trim();
        if (!url) { resultDiv.innerHTML = `<p class="text-red-600">请输入有效的飞书表格链接。</p>`; return; }

        // 从URL中提取spreadsheetToken (修复bug: 后端期望spreadsheetToken而不是完整URL)
        const spreadsheetToken = (url.match(/\/(?:sheets|spreadsheet)\/([a-zA-Z0-9]+)/) || [])[1];
        console.log('[DEBUG] 输入的URL:', url);
        console.log('[DEBUG] 提取的spreadsheetToken:', spreadsheetToken);

        if (!spreadsheetToken) {
            resultDiv.innerHTML = `<p class="text-red-600">无法解析飞书表格链接，请检查链接格式。</p>`;
            return;
        }

        syncBtn.disabled = true; syncBtn.querySelector('span').classList.add('hidden'); syncBtn.querySelector('.loader').classList.remove('hidden');
        resultDiv.innerHTML = `<p class="text-gray-600">正在从飞书读取并处理数据，请稍候...</p>`;
        try {
            // 使用嵌套结构，符合后端 utils.js V11.0+ 的期望格式
            const payload = {
                dataType: 'talentPerformance',
                payload: {
                    spreadsheetToken: spreadsheetToken
                }
            };
            console.log('[DEBUG] 发送的payload:', JSON.stringify(payload));
            const result = await apiRequest(SYNC_FROM_FEISHU_ENDPOINT, 'POST', payload);
            resultDiv.innerHTML = `<p class="text-green-600">同步完成！成功更新 ${result.data?.updated || 0} 条，失败 ${result.data?.failed || 0} 条。</p>`;
            showToast('同步成功，状态将在2秒后刷新。');
            setTimeout(() => { fetchAndRenderSystemStatus(); fetchAndRenderLogs(); }, 2000);
        } catch (error) {
            resultDiv.innerHTML = `<p class="text-red-600">同步失败: ${error.message}</p>`;
        } finally {
            syncBtn.disabled = false; syncBtn.querySelector('span').classList.remove('hidden'); syncBtn.querySelector('.loader').classList.add('hidden');
        }
    }

    function handleMaintenanceCardClick(e) {
        if (e.target.id === 'update-performance-btn') {
            const content = document.getElementById('performance-sync-content');
            if (!content.classList.contains('expanded')) {
                renderPerformanceSyncComponent(content);
            }
            content.classList.toggle('expanded');
        }
        if (e.target.id === 'update-price-btn') {
            showToast('价格更新功能正在开发中...', false);
        }
    }

    // --- Initialization ---
    function initializePage() {
        // [核心修正] 不再调用本地的 sidebar 初始化函数，完全依赖 sidebar.js
        fetchAndRenderSystemStatus();
        fetchAndRenderTasks();
        fetchAndRenderLogs();
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.task-group-header')) handleGroupHeaderClick(e);
            if (e.target.closest('.save-collab-btn')) handleSaveCollaboration(e);
            if (e.target.closest('.mini-sync-btn')) handleDataSync(e);
            if (e.target.closest('.performance-sync-btn')) handlePerformanceSync(e);
            if (e.target.closest('#update-performance-btn, #update-price-btn')) handleMaintenanceCardClick(e);
            if (e.target.closest('#trigger-scan-btn')) handleTriggerScan();
        });
    }

    initializePage();
});
