/**
 * @file project_report.js
 * @description [V3.2-功能增强] 增加数据录入提醒功能。
 * - [功能增强] 页面会显示一个醒目的提示，列出当天缺少播放数据的已发布视频。
 * - [修复] 删除了在 loadProjectDetails 函数中对已不存在的 'project-qianchuan-id' 元素的DOM操作。
 */
document.addEventListener('DOMContentLoaded', function () {
    
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const PROJECTS_API = `${API_BASE_URL}/projects`;
    const REPORT_API = `${API_BASE_URL}/project-report`;
    const VIDEOS_FOR_ENTRY_API = `${API_BASE_URL}/videos-for-entry`;
    const DAILY_STATS_API = `${API_BASE_URL}/daily-stats`;
    const REPORT_SOLUTION_API = `${API_BASE_URL}/report-solution`;

    // --- DOM Elements ---
    const body = document.body;
    const breadcrumbProjectName = document.getElementById('breadcrumb-project-name');
    const projectMainTitle = document.getElementById('project-main-title');
    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    const entryDatePicker = document.getElementById('entry-date-picker');
    const videoEntryList = document.getElementById('video-entry-list');
    const saveEntryBtn = document.getElementById('save-entry-btn');
    const cancelEntryBtn = document.getElementById('cancel-entry-btn');
    const overviewKPIs = document.getElementById('overview-kpis');
    const detailsContainer = document.getElementById('details-container');
    const dataEntryView = document.getElementById('data-entry-view');
    const reportDatePicker = document.getElementById('report-date-picker');
    const missingDataAlertContainer = document.getElementById('missing-data-alert-container');

    // --- Global State ---
    let currentProjectId = null;
    let projectData = {};
    let currentMode = 'display';
    let allVideosForEntry = [];
    let entryCurrentPage = 1;
    let entryItemsPerPage = 10;
    const ITEMS_PER_PAGE_KEY = 'reportEntryItemsPerPage';
    let solutionSaveTimer = null;

    // --- Helper Functions ---
    async function apiRequest(url, method = 'GET', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            if (response.status === 204) return null;
            return await response.json();
        } catch (error) {
            console.error(`API request error for ${method} ${url}:`, error);
            alert(`操作失败: ${error.message}`);
            throw error;
        }
    }

    function formatDate(isoString) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date)) return '无效日期';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- Initialization ---
    async function initializePage() {
        currentProjectId = new URLSearchParams(window.location.search).get('projectId');
        if (!currentProjectId) {
            document.body.innerHTML = '<div class="p-8 text-center text-red-500">错误：URL中缺少项目ID。</div>';
            return;
        }
        entryItemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '10');
        setupEventListeners();
        const today = formatDate(new Date().toISOString());
        entryDatePicker.value = today;
        reportDatePicker.value = today;
        try {
            await loadProjectDetails();
            await loadReportData();
        } catch (error) {
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">无法加载页面数据: ${error.message}</div>`;
        }
    }
    
    async function loadProjectDetails() {
        const response = await apiRequest(`${PROJECTS_API}?projectId=${currentProjectId}`);
        projectData = response.data;
        document.title = `${projectData.name} - 项目执行报告`;
        breadcrumbProjectName.textContent = projectData.name;
    }

    // --- Mode Switching ---
    function setMode(mode) {
        currentMode = mode;
        if (mode === 'entry') {
            body.classList.remove('display-mode');
            body.classList.add('entry-mode');
            loadVideosForEntry();
        } else {
            body.classList.remove('entry-mode');
            body.classList.add('display-mode');
            loadReportData();
        }
    }

    // --- API Functions ---
    async function loadReportData() {
        overviewKPIs.innerHTML = '<div class="text-center py-8 text-gray-500 col-span-5">加载中...</div>';
        detailsContainer.innerHTML = `<div class="text-center py-16 text-gray-500">正在加载报告详情...</div>`;
        missingDataAlertContainer.innerHTML = ''; // 清空提醒
        try {
            const apiUrl = `${REPORT_API}?projectId=${currentProjectId}&date=${reportDatePicker.value}`;
            const response = await apiRequest(apiUrl);
            renderReport(response.data);
        } catch(e) {
            overviewKPIs.innerHTML = `<div class="text-center py-8 text-red-500 col-span-5">加载总览失败: ${e.message}</div>`;
            detailsContainer.innerHTML = `<div class="text-center py-16 text-red-500">加载详情失败: ${e.message}</div>`;
        }
    }

    async function loadVideosForEntry() {
        videoEntryList.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-gray-500">正在加载视频列表...</td></tr>`;
        try {
            const response = await apiRequest(`${VIDEOS_FOR_ENTRY_API}?projectId=${currentProjectId}&date=${entryDatePicker.value}`);
            allVideosForEntry = response.data || [];
            entryCurrentPage = 1;
            renderEntryPage();
        } catch (error) {
            videoEntryList.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500">加载失败: ${error.message}</td></tr>`;
        }
    }
    
    async function saveDailyData() {
        const dataToSave = allVideosForEntry
            .filter(video => video.totalViews !== null && video.totalViews !== undefined && String(video.totalViews).trim() !== '')
            .map(video => ({
                collaborationId: video.collaborationId,
                totalViews: parseInt(video.totalViews, 10)
            }));
        if (dataToSave.length === 0) {
            alert('您没有输入任何数据。');
            return;
        }
        saveEntryBtn.disabled = true;
        saveEntryBtn.textContent = '保存中...';
        try {
            const payload = { projectId: currentProjectId, date: entryDatePicker.value, data: dataToSave };
            await apiRequest(DAILY_STATS_API, 'POST', payload);
            alert('数据保存成功！');
            reportDatePicker.value = entryDatePicker.value;
            setMode('display');
        } catch (error) {
            // Error is handled in apiRequest
        } finally {
            saveEntryBtn.disabled = false;
            saveEntryBtn.textContent = '保存当日数据';
        }
    }
    
    async function saveSolution(textarea) {
        clearTimeout(solutionSaveTimer);
        const collabId = textarea.dataset.collaborationId;
        const solution = textarea.value;
        const feedbackEl = textarea.nextElementSibling;
        
        feedbackEl.innerHTML = `<span>保存中...</span>`;
        feedbackEl.classList.remove('hidden');

        solutionSaveTimer = setTimeout(async () => {
            try {
                const payload = { collaborationId: collabId, date: reportDatePicker.value, solution: solution };
                await apiRequest(REPORT_SOLUTION_API, 'POST', payload);
                feedbackEl.innerHTML = `<span class="text-green-600">✓ 已保存</span>`;
                setTimeout(() => feedbackEl.classList.add('hidden'), 2000);
            } catch (e) {
                feedbackEl.innerHTML = `<span class="text-red-600">保存失败</span>`;
            }
        }, 1000);
    }

    // --- Rendering Functions ---
    function renderEntryPage() {
        renderVideoEntryList();
        renderEntryPagination();
    }

    function renderReport(data) {
        if (!data) {
            overviewKPIs.innerHTML = '<div class="text-center py-8 text-gray-500 col-span-5">暂无数据</div>';
            detailsContainer.innerHTML = '<div class="text-center py-16 text-gray-500">暂无报告详情</div>';
            return;
        }
        const overview = data.overview || {};
        const kpis = [
            { label: '定档达人数量', value: overview.totalTalents || 0, color: 'text-gray-900' },
            { label: '已发布视频数量', value: overview.publishedVideos || 0, color: 'text-gray-900' },
            { label: '总计金额', value: `¥${(overview.totalAmount || 0).toLocaleString()}`, color: 'text-green-600' },
            { label: '视频总曝光', value: (overview.totalViews || 0).toLocaleString(), color: 'text-blue-600' },
            { label: '当前CPM', value: (overview.averageCPM || 0).toFixed(1), color: 'text-purple-600' }
        ];
        overviewKPIs.innerHTML = kpis.map(kpi => `
            <div class="bg-gray-50 p-5 rounded-lg text-center kpi-card border border-gray-200">
                <dt class="text-sm font-medium text-gray-500">${kpi.label}</dt>
                <dd class="mt-2 text-3xl font-bold ${kpi.color}">${kpi.value}</dd>
            </div>
        `).join('');

        // [新增] 渲染数据录入提醒
        if (data.missingDataVideos && data.missingDataVideos.length > 0) {
            const missingVideosList = data.missingDataVideos.map(v => `<span class="font-semibold">${v.talentName}</span>`).join('、');
            missingDataAlertContainer.innerHTML = `
                <div class="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg mb-8 shadow">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <svg class="h-6 w-6 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M8.257 3.099c.636-1.026 2.252-1.026 2.888 0l6.252 10.086c.636 1.026-.174 2.315-1.444 2.315H3.449c-1.27 0-2.08-1.289-1.444-2.315L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3 flex-1 md:flex md:justify-between">
                            <p class="text-sm text-orange-700">
                                <strong>数据录入提醒：</strong> 共 ${data.missingDataVideos.length} 条已发布视频缺少当日数据 (${missingVideosList})。
                            </p>
                            <p class="mt-3 text-sm md:mt-0 md:ml-6">
                                <button id="go-to-entry-btn" class="whitespace-nowrap font-medium text-orange-700 hover:text-orange-600 bg-orange-200 hover:bg-orange-300 px-3 py-1.5 rounded-md transition-colors">
                                    立即录入 &rarr;
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('go-to-entry-btn').addEventListener('click', () => setMode('entry'));
        } else {
            missingDataAlertContainer.innerHTML = '';
        }

        const details = data.details || {};
        const sectionConfig = {
            hotVideos: { title: '视频播放量大于1000万的达人', icon: '<svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-1.44m0 0a8.25 8.25 0 00-3.362-1.44m3.362 1.44a8.983 8.983 0 013.362 1.44m-3.362-1.44a8.25 8.25 0 00-3.362 1.44" /></svg>' },
            goodVideos: { title: '符合预期CPM小于20', icon: '<svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' },
            normalVideos: { title: '暂不符合预期 CPM 大于20，小于40', icon: '<svg class="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>' },
            badVideos: { title: '不符合预期CPM大于40小于100', icon: '<svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>' },
            worstVideos: { title: '极度不符合预期CPM大于100', icon: '<svg class="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>' }
        };
        
        detailsContainer.innerHTML = Object.keys(sectionConfig).filter(key => details[key] && details[key].length > 0)
        .map(key => {
            const videos = details[key];
            const sectionInfo = sectionConfig[key];
            const hasSolutionColumn = ['normalVideos', 'badVideos', 'worstVideos'].includes(key);
            const cpmChangeHtml = (change) => {
                if (change === null) return 'N/A';
                const color = change < 0 ? 'text-green-600' : 'text-red-600';
                const icon = change < 0 
                    ? '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" /></svg>'
                    : '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" /></svg>';
                return `<span class="${color} flex items-center gap-1">${icon} ${change.toFixed(1)}</span>`;
            };
            
            return `
                <div class="mb-8">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">${sectionInfo.icon} ${sectionInfo.title}，共 ${videos.length} 条</h3>
                    <div class="border rounded-lg overflow-hidden shadow-md">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 text-left">
                                <tr>
                                    <th class="px-6 py-3 font-semibold text-gray-600">达人名称</th><th class="px-6 py-3 font-semibold text-gray-600">发布时间</th>
                                    <th class="px-6 py-3 font-semibold text-gray-600">CPM</th><th class="px-6 py-3 font-semibold text-gray-600">CPM环比前日</th>
                                    ${hasSolutionColumn ? `<th class="px-6 py-3 font-semibold text-gray-600 w-1/3">后续解决方案</th>` : ''}
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${videos.map(video => `
                                    <tr class="hover:bg-indigo-50 transition-colors">
                                        <td class="px-6 py-4 font-medium text-gray-900">${video.talentName}</td>
                                        <td class="px-6 py-4 text-gray-500">${formatDate(video.publishDate)}</td>
                                        <td class="px-6 py-4 font-semibold text-gray-800">${video.cpm.toFixed(1)}</td>
                                        <td class="px-6 py-4">${cpmChangeHtml(video.cpmChange)}</td>
                                        ${hasSolutionColumn ? `<td class="px-6 py-4 relative"><textarea class="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 solution-textarea" rows="1" placeholder="输入解决方案..." data-collaboration-id="${video.collaborationId}">${video.solution || ''}</textarea><div class="absolute right-8 top-5 text-xs text-gray-400 hidden solution-feedback"></div></td>` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }).join('');

        if(detailsContainer.innerHTML.trim() === '') {
            detailsContainer.innerHTML = '<div class="text-center py-16 text-gray-500">暂无报告详情</div>';
        }
    }
    
    function renderVideoEntryList() {
        if (!allVideosForEntry || allVideosForEntry.length === 0) {
            videoEntryList.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-gray-500">此项目暂无可录入数据的视频。</td></tr>`;
            return;
        }
        const startIndex = (entryCurrentPage - 1) * entryItemsPerPage;
        const paginatedVideos = allVideosForEntry.slice(startIndex, startIndex + entryItemsPerPage);
        videoEntryList.innerHTML = paginatedVideos.map(video => `
            <tr class="hover:bg-indigo-50 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900">${video.talentName}</td>
                <td class="px-6 py-4 text-gray-500">${formatDate(video.publishDate)}</td>
                <td class="px-6 py-4">
                    <input type="number" class="view-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="请输入总曝光/播放量" value="${video.totalViews || ''}" data-collaboration-id="${video.collaborationId}">
                </td>
            </tr>
        `).join('');
        videoEntryList.querySelectorAll('input.view-input').forEach(input => {
            input.addEventListener('input', e => {
                const videoToUpdate = allVideosForEntry.find(v => v.collaborationId === e.target.dataset.collaborationId);
                if (videoToUpdate) videoToUpdate.totalViews = e.target.value;
            });
        });
    }

    function renderEntryPagination() {
        const paginationContainer = document.getElementById('video-entry-pagination-controls');
        if (!paginationContainer) return; 

        if (!allVideosForEntry || allVideosForEntry.length === 0) {
            paginationContainer.innerHTML = ''; 
            return;
        }
        const totalPages = Math.ceil(allVideosForEntry.length / entryItemsPerPage);
        const perPageOptions = [5, 10, 20, 50];
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="entry-items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500">${perPageOptions.map(opt => `<option value="${opt}" ${entryItemsPerPage===opt ? 'selected' : ''}>${opt}</option>`).join('')}</select></div>`;
        let pageButtons = totalPages > 1 ? Array.from({length: totalPages}, (_, i) => `<button class="pagination-btn ${i+1===entryCurrentPage ? 'active' : ''}" data-page="${i+1}">${i+1}</button>`).join('') : '';
        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-2"><button id="entry-prev-page" class="pagination-btn" ${entryCurrentPage===1?'disabled':''}>&lt;</button>${pageButtons}<button id="entry-next-page" class="pagination-btn" ${entryCurrentPage===totalPages?'disabled':''}>&gt;</button></div>` : '<div></div>';
        paginationContainer.innerHTML = `${perPageSelector}${pageButtonsContainer}`;
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        toggleModeBtn.addEventListener('click', () => setMode(currentMode === 'display' ? 'entry' : 'display'));
        cancelEntryBtn.addEventListener('click', () => setMode('display'));
        saveEntryBtn.addEventListener('click', saveDailyData);
        entryDatePicker.addEventListener('change', loadVideosForEntry);

        if (reportDatePicker) {
            reportDatePicker.addEventListener('change', loadReportData);
        }
        
        detailsContainer.addEventListener('input', e => {
            if (e.target.classList.contains('solution-textarea')) {
                saveSolution(e.target);
            }
        });

        dataEntryView.addEventListener('click', e => {
            const target = e.target.closest('button.pagination-btn');
            if (!target) return;
            if (target.id === 'entry-prev-page') entryCurrentPage--;
            else if (target.id === 'entry-next-page') entryCurrentPage++;
            else if (target.dataset.page) entryCurrentPage = parseInt(target.dataset.page, 10);
            renderEntryPage();
        });

        dataEntryView.addEventListener('change', e => {
            if (e.target.id === 'entry-items-per-page') {
                entryItemsPerPage = parseInt(e.target.value, 10);
                localStorage.setItem(ITEMS_PER_PAGE_KEY, entryItemsPerPage);
                entryCurrentPage = 1;
                renderEntryPage();
            }
        });
    }

    // --- Start the application ---
    initializePage();
});
