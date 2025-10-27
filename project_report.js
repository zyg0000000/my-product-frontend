/**
 * @file project_report.js
 * @version 5.1 - Overdue Video Auto-Scraping Support
 * @description "项目执行报告"页面自动化功能升级版
 * --- 更新日志 (v5.1) ---
 * - [新增功能] 增加了对超过14天视频的自动抓取功能，使用 videoId 代替 taskId。
 * - [新增UI] 添加了"一键抓取 (>14天)"按钮(#auto-scrape-overdue-btn)，使用工作流ID: 68fdae01656eacf1bfacb66c。
 * - [新增函数] 实现了 handleAutoScrapeOverdue() 函数，用于创建超期视频抓取任务。
 * - [状态优化] 实现了方案A的状态显示逻辑：优先显示任务状态，超期无任务时显示"待抓取 (>14d)"。
 * - [UI修改] 视频链接列从"点击查看"改为显示实际 videoId 值（等宽字体）。
 * - [交互优化] 超期视频的输入框不再禁用，允许手动录入作为备用方案。
 * --- 更新日志 (v5.0) ---
 * - [新增功能] 增加了对发布超过14天视频的手动更新流程支持。
 * - [新增UI] 绑定了"待手动更新日报"按钮(#manual-update-btn)的事件。
 * - [新增UI] 实现了超期任务弹窗(#overdue-tasks-modal)的显示和数据填充逻辑。
 * - [新增功能] 实现了"一键复制TaskID"(#copy-task-ids-btn)到剪贴板的功能。
 * - [依赖] 此版本需要配合 local-agent v3.2 或更高版本使用，以完成数据的持久化。
 */
document.addEventListener('DOMContentLoaded', function () {
    
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const PROJECTS_API = `${API_BASE_URL}/projects`;
    const REPORT_API = `${API_BASE_URL}/project-report`;
    const VIDEOS_FOR_ENTRY_API = `${API_BASE_URL}/videos-for-entry`;
    const DAILY_STATS_API = `${API_BASE_URL}/daily-stats`;
    const REPORT_SOLUTION_API = `${API_BASE_URL}/report-solution`;
    const AUTOMATION_JOBS_CREATE_API = `${API_BASE_URL}/automation-jobs-create`;
    const AUTOMATION_JOBS_GET_API = `${API_BASE_URL}/automation-jobs-get`;
    const AUTOMATION_TASKS_API = `${API_BASE_URL}/automation-tasks`;

    // --- DOM Elements ---
    const body = document.body;
    const breadcrumbProjectName = document.getElementById('breadcrumb-project-name');
    const projectMainTitle = document.getElementById('project-main-title');
    const toggleModeBtn = document.getElementById('toggle-mode-btn'); // 保留但不再使用
    const entryDatePicker = document.getElementById('entry-date-picker');
    const videoEntryList = document.getElementById('video-entry-list');
    const saveEntryBtn = document.getElementById('save-entry-btn');
    const cancelEntryBtn = document.getElementById('cancel-entry-btn');
    const overviewKPIs = document.getElementById('overview-kpis');
    const detailsContainer = document.getElementById('details-container');
    const dataEntryView = document.getElementById('data-entry-view');
    const reportDatePicker = document.getElementById('report-date-picker');
    const missingDataAlertContainer = document.getElementById('missing-data-alert-container');
    const autoScrapeBtn = document.getElementById('auto-scrape-btn');
    const autoScrapeOverdueBtn = document.getElementById('auto-scrape-overdue-btn');

    // [V6.0 新增] Tab 相关元素
    const globalDatePicker = document.getElementById('global-date-picker');
    const trackingTabBtns = document.querySelectorAll('.tracking-tab-btn');
    const dailyReportTab = document.getElementById('daily-report-tab');
    const dataEntryTab = document.getElementById('data-entry-tab');
    const effectMonitorTab = document.getElementById('effect-monitor-tab');

    // [V5.0 新增] 手动更新弹窗相关元素
    const manualUpdateBtn = document.getElementById('manual-update-btn');
    const overdueTasksModal = document.getElementById('overdue-tasks-modal');
    const closeOverdueModalBtn = document.getElementById('close-overdue-modal-btn');
    const overdueTasksList = document.getElementById('overdue-tasks-list');
    const noOverdueTasksMessage = document.getElementById('no-overdue-tasks-message');
    const copyTaskIdsBtn = document.getElementById('copy-task-ids-btn');
    const clipboardToast = document.getElementById('clipboard-toast');


    // --- Global State ---
    let currentProjectId = null;
    let projectData = {};
    let currentMode = 'display'; // 保留但不再使用
    let currentTab = 'daily-report'; // [V6.0 新增] 当前激活的Tab
    let allVideosForEntry = [];
    let overdueVideos = []; // [V5.0 新增] 存储超期视频
    let entryCurrentPage = 1;
    let entryItemsPerPage = 10;
    const ITEMS_PER_PAGE_KEY = 'reportEntryItemsPerPage';
    let solutionSaveTimer = null;
    let entryTasksStatus = {};
    let entryTasksPoller = null;

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
        // 修复：确保日期解析正确，不因时区偏移一天
        const [year, month, day] = isoString.split('T')[0].split('-');
        return `${year}-${month}-${day}`;
    }

    /**
     * [V5.1 新增] 解析播放量字符串（支持 "220.58w" 格式）
     * @param {string} viewString - 播放量字符串（例如 "220.58w" 或 "1,818.39w"）
     * @returns {number|null} 转换后的整数播放量（例如 2205800），失败返回 null
     */
    function parseViewCount(viewString) {
        if (!viewString || typeof viewString !== 'string') return null;

        try {
            // 去掉逗号
            let cleaned = viewString.replace(/,/g, '').trim();

            // 检查是否有 "w" 或 "W" 后缀（表示万）
            const hasWanSuffix = /w$/i.test(cleaned);

            if (hasWanSuffix) {
                // 去掉 "w" 后缀
                cleaned = cleaned.replace(/w$/i, '');
                // 解析数字并乘以 10000
                const numValue = parseFloat(cleaned);
                if (isNaN(numValue)) return null;
                return Math.round(numValue * 10000);
            } else {
                // 没有 "w" 后缀，直接解析数字
                const numValue = parseFloat(cleaned);
                if (isNaN(numValue)) return null;
                return Math.round(numValue);
            }
        } catch (e) {
            console.warn(`Failed to parse view count: ${viewString}`, e);
            return null;
        }
    }

    /**
     * [V5.0 新增] 检查视频是否发布超过 N 天
     * @param {string} publishDate - 视频发布日期 (YYYY-MM-DD)
     * @param {number} days - 天数阈值 (例如 14)
     * @param {Date} today - (可选) 用于比较的“今天”的日期对象
     * @returns {object} { isOverdue: boolean, overdueDays: number }
     */
    function getOverdueInfo(publishDate, days = 14, today = new Date()) {
        if (!publishDate) return { isOverdue: false, overdueDays: 0 };
        
        try {
            const pubDate = new Date(publishDate);
            // 确保比较的是日期而不是时间
            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            const diffTime = todayDateOnly.getTime() - pubDate.getTime();
            if (diffTime < 0) return { isOverdue: false, overdueDays: 0 }; // 还没发布
            
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            return {
                isOverdue: diffDays > days,
                overdueDays: diffDays
            };
        } catch(e) {
            console.warn(`Invalid date format for publishDate: ${publishDate}`);
            return { isOverdue: false, overdueDays: 0 };
        }
    }

    /**
     * [V5.0 新增] 复制文本到剪贴板 (兼容 iFrame)
     * @param {string} text - 要复制的文本
     */
    function copyToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showClipboardToast();
        } catch (err) {
            alert('复制失败，请手动复制。');
        }
        document.body.removeChild(textArea);
    }
    
    /**
     * [V5.0 新增] 显示“已复制”提示
     */
    function showClipboardToast() {
        if (!clipboardToast) return;
        clipboardToast.classList.remove('opacity-0');
        setTimeout(() => {
            clipboardToast.classList.add('opacity-0');
        }, 1500);
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

        // [V6.0 新增] 初始化日期选择器
        const today = new Date().toISOString().split('T')[0];
        if (globalDatePicker) globalDatePicker.value = today;
        if (entryDatePicker) entryDatePicker.value = today;
        if (reportDatePicker) reportDatePicker.value = today;

        // [V6.0 新增] 初始化默认显示日报Tab
        switchTab('daily-report');

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
            if (entryTasksPoller) clearInterval(entryTasksPoller); // 切换模式时停止轮询
            loadReportData();
        }
    }
    
    // --- Automation Functions (v4.4) ---
    async function handleAutoScrape() {
        if(!autoScrapeBtn) return;
        
        // [V4.4 UX优化] 增加加载状态
        autoScrapeBtn.disabled = true;
        const originalContent = autoScrapeBtn.innerHTML;
        autoScrapeBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            创建任务中...
        `;

        const reportDate = entryDatePicker.value;
        const today = new Date(); // 用于检查是否超期

        const targets = allVideosForEntry
            // [V5.0 修改] 只抓取未超期、未完成的任务
            .filter(video => {
                const { isOverdue } = getOverdueInfo(video.publishDate, 14, today);
                return video.taskId && 
                       !isOverdue &&
                       entryTasksStatus[video.collaborationId]?.status !== 'completed';
            })
            .map(video => ({
                taskId: video.taskId,
                collaborationId: video.collaborationId,
                nickname: video.talentName,
                reportDate: reportDate
            }));

        if (targets.length === 0) {
            alert('没有需要自动抓取(<=14天)的视频任务。');
            autoScrapeBtn.disabled = false;
            autoScrapeBtn.innerHTML = originalContent;
            return;
        }

        try {
            const response = await apiRequest(AUTOMATION_JOBS_CREATE_API, 'POST', {
                projectId: currentProjectId,
                // [工作流ID确认] "68ee679ef3daa8fdc9ea730f" 是 local-agent v3.2 中用于抓取播放量的工作流ID
                workflowId: "68ee679ef3daa8fdc9ea730f", 
                targets: targets
            });
            
            if (response.data && response.data.jobId) {
                startPollingTasks(response.data.jobId);
                alert(`${targets.length} 个视频的抓取任务已创建！页面将自动刷新状态。`);
            } else {
                throw new Error("创建任务失败，未返回 Job ID。");
            }

        } catch (error) {
            // Error is handled in apiRequest
        } finally {
            autoScrapeBtn.disabled = false;
            autoScrapeBtn.innerHTML = originalContent;
        }
    }

    /**
     * [V5.1 新增] 一键抓取超过14天的视频数据（使用 videoId）
     */
    async function handleAutoScrapeOverdue() {
        if(!autoScrapeOverdueBtn) return;

        // [V5.1 UX优化] 增加加载状态
        autoScrapeOverdueBtn.disabled = true;
        const originalContent = autoScrapeOverdueBtn.innerHTML;
        autoScrapeOverdueBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            创建任务中...
        `;

        const reportDate = entryDatePicker.value;
        const today = new Date(); // 用于检查是否超期

        const targets = allVideosForEntry
            // [V5.1] 只抓取超期、有videoId、未完成的任务
            .filter(video => {
                const { isOverdue } = getOverdueInfo(video.publishDate, 14, today);
                return video.videoId &&
                       isOverdue &&
                       entryTasksStatus[video.collaborationId]?.status !== 'completed';
            })
            .map(video => ({
                videoId: video.videoId,
                collaborationId: video.collaborationId,
                nickname: video.talentName,
                reportDate: reportDate
            }));

        if (targets.length === 0) {
            alert('没有需要自动抓取(>14天)的视频任务。');
            autoScrapeOverdueBtn.disabled = false;
            autoScrapeOverdueBtn.innerHTML = originalContent;
            return;
        }

        try {
            const response = await apiRequest(AUTOMATION_JOBS_CREATE_API, 'POST', {
                projectId: currentProjectId,
                // [工作流ID确认] "68fdae01656eacf1bfacb66c" 是用于抓取超期视频的工作流ID (使用videoId)
                workflowId: "68fdae01656eacf1bfacb66c",
                targets: targets
            });

            if (response.data && response.data.jobId) {
                startPollingTasks(response.data.jobId);
                alert(`${targets.length} 个超期视频的抓取任务已创建！页面将自动刷新状态。`);
            } else {
                throw new Error("创建任务失败，未返回 Job ID。");
            }

        } catch (error) {
            // Error is handled in apiRequest
        } finally {
            autoScrapeOverdueBtn.disabled = false;
            autoScrapeOverdueBtn.innerHTML = originalContent;
        }
    }

    function startPollingTasks(jobId) {
        if (entryTasksPoller) clearInterval(entryTasksPoller);

        const poll = async () => {
            try {
                const response = await apiRequest(`${AUTOMATION_JOBS_GET_API}?jobId=${jobId}`);
                const job = response.data;
                let allDone = true;

                (job.tasks || []).forEach(task => {
                    const collabId = task.metadata?.collaborationId;
                    if (collabId) {
                        entryTasksStatus[collabId] = task;
                    }
                    if (task.status === 'pending' || task.status === 'processing') {
                        allDone = false;
                    }
                });
                
                renderVideoEntryList();

                if (allDone) {
                    clearInterval(entryTasksPoller);
                    entryTasksPoller = null;
                    console.log('所有日报抓取任务已完成，轮询停止。');
                }
            } catch (error) {
                console.error("轮询任务状态失败:", error);
                clearInterval(entryTasksPoller);
                entryTasksPoller = null;
            }
        };

        poll();
        entryTasksPoller = setInterval(poll, 5000);
    }

    async function handleRetryScrape(taskId) {
        if (!taskId) return;
    
        const statusCell = document.querySelector(`button[data-task-id="${taskId}"]`)?.closest('td');
        if (statusCell) {
            statusCell.innerHTML = '<span class="text-xs font-semibold text-blue-600">请求重试...</span>';
        }
        
        try {
            // [V4.4 修正] 确保使用正确的API端点
            await apiRequest(`${AUTOMATION_TASKS_API}?id=${taskId}`, 'PUT', { action: 'rerun' });
            
            let parentJobId = null;
            for (const collabId in entryTasksStatus) {
                if (entryTasksStatus[collabId]._id === taskId) {
                    parentJobId = entryTasksStatus[collabId].jobId;
                    break;
                }
            }
            if (parentJobId) {
                startPollingTasks(parentJobId);
            }
        } catch (error) {
            renderVideoEntryList();
        }
    }


    // --- API Functions (保持不变) ---
    async function loadReportData() {
        overviewKPIs.innerHTML = '<div class="text-center py-8 text-gray-500 col-span-5">加载中...</div>';
        detailsContainer.innerHTML = `<div class="text-center py-16 text-gray-500">正在加载报告详情...</div>`;
        missingDataAlertContainer.innerHTML = '';
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
        videoEntryList.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">正在加载视频列表...</td></tr>`;
        try {
            const response = await apiRequest(`${VIDEOS_FOR_ENTRY_API}?projectId=${currentProjectId}&date=${entryDatePicker.value}`);
            allVideosForEntry = response.data || [];
            
            // [V5.0 新增] 过滤超期视频
            const today = new Date();
            overdueVideos = allVideosForEntry
                .map(video => ({
                    ...video,
                    overdueInfo: getOverdueInfo(video.publishDate, 14, today)
                }))
                .filter(video => video.overdueInfo.isOverdue);
            
            entryCurrentPage = 1;
            entryTasksStatus = {};
            if(entryTasksPoller) clearInterval(entryTasksPoller);
            
            // 自动禁用"一键抓取"按钮（如果全都是超期视频）
            const uncompletedNonOverdue = allVideosForEntry.filter(v => {
                const info = getOverdueInfo(v.publishDate, 14, today);
                return !info.isOverdue && v.taskId;
            }).length;
            if (autoScrapeBtn) autoScrapeBtn.disabled = (uncompletedNonOverdue === 0);

            // [V5.1 新增] 禁用"一键抓取(>14天)"按钮（如果没有超期视频或没有videoId）
            const uncompletedOverdue = allVideosForEntry.filter(v => {
                const info = getOverdueInfo(v.publishDate, 14, today);
                return info.isOverdue && v.videoId;
            }).length;
            if (autoScrapeOverdueBtn) autoScrapeOverdueBtn.disabled = (uncompletedOverdue === 0);

            // [V5.0 新增] 禁用"手动更新"按钮（如果没有超期视频）
            if (manualUpdateBtn) manualUpdateBtn.disabled = (overdueVideos.length === 0);

            renderEntryPage();
        } catch (error) {
            videoEntryList.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">加载失败: ${error.message}</td></tr>`;
        }
    }
    
    async function saveDailyData() {
        const dataToSave = allVideosForEntry
            .filter(video => video.totalViews !== null && video.totalViews !== undefined && String(video.totalViews).trim() !== '')
            .map(video => ({
                collaborationId: video.collaborationId,
                totalViews: parseInt(String(video.totalViews).replace(/,/g, ''), 10)
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
            // [V4.4 修改] 调整指标名称
            { label: '定档内容数量', value: overview.totalTalents || 0, color: 'text-gray-900' },
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
            videoEntryList.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">此项目暂无可录入数据的视频。</td></tr>`;
            return;
        }
        const startIndex = (entryCurrentPage - 1) * entryItemsPerPage;
        const paginatedVideos = allVideosForEntry.slice(startIndex, startIndex + entryItemsPerPage);
        
        // [V5.0 新增] 获取“今天”的日期用于比较
        const today = new Date();

        videoEntryList.innerHTML = paginatedVideos.map(video => {
            const videoToRender = allVideosForEntry.find(v => v.collaborationId === video.collaborationId) || video;
            const task = entryTasksStatus[videoToRender.collaborationId];

            // [V5.1 核心修改] 检查是否超期
            const { isOverdue } = getOverdueInfo(videoToRender.publishDate, 14, today);

            let statusHtml = '<span class="text-xs text-gray-400">未开始</span>';
            let isInputDisabled = false;

            // [V5.1 方案A] 优先显示任务状态，其次才显示是否超期
            if (task) {
                // 1. 如果有自动化任务，优先显示任务状态（无论是否超期）
                switch (task.status) {
                    case 'pending':
                        statusHtml = '<span class="text-xs font-semibold text-yellow-600">排队中...</span>';
                        isInputDisabled = true; // 排队中也禁止手动输入
                        break;
                    case 'processing':
                        statusHtml = '<span class="text-xs font-semibold text-blue-600">自动抓取中...</span>';
                        isInputDisabled = true; // 抓取中也禁止手动输入
                        break;
                    case 'completed':
                        statusHtml = '<span class="text-xs font-semibold text-green-600">✓ 已完成</span>';
                        isInputDisabled = true; // 成功后禁止手动输入
                        // [V5.1 修复] 使用 parseViewCount 解析播放量（支持 "220.58w" 格式）
                        const viewsRaw = task.result?.data?.['播放量'];
                        if (viewsRaw) {
                            const viewsParsed = parseViewCount(viewsRaw);
                            if (viewsParsed !== null) {
                                const videoInMemory = allVideosForEntry.find(v => v.collaborationId === videoToRender.collaborationId);
                                if(videoInMemory) videoInMemory.totalViews = viewsParsed;
                            }
                        }
                        break;
                    case 'failed':
                        statusHtml = `<div class="flex items-center justify-center gap-2">
                                          <span class="text-xs font-semibold text-red-600 cursor-pointer" title="${task.errorMessage || '未知错误'}">✗ 失败</span>
                                          <button data-task-id="${task._id}" class="retry-scrape-btn text-xs text-blue-600 hover:underline">重试</button>
                                      </div>`;
                        // 失败时允许手动输入，所以 isInputDisabled 保持 false
                        break;
                }
            } else if (isOverdue) {
                // 2. 如果没有任务且超期，显示"待抓取 (>14d)"，允许手动输入作为备用
                statusHtml = '<span class="text-xs font-semibold text-amber-600" title="视频已超14天，可使用超期抓取功能">待抓取 (>14d)</span>';
                isInputDisabled = false; // [V5.1 方案A] 不禁用输入框，允许手动录入作为备用
            }
            // 3. 如果既未超期也无任务状态，则显示"未开始"，isInputDisabled 保持 false

            // [V5.1 修改] 显示实际 videoId 值而不是"点击查看"
            const videoLink = videoToRender.videoId
                ? `<a href="https://www.douyin.com/video/${videoToRender.videoId}" target="_blank" class="text-blue-600 hover:underline font-mono text-xs">${videoToRender.videoId}</a>`
                : 'N/A';
            
            return `
                <tr class="hover:bg-indigo-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-900">${videoToRender.talentName}</td>
                    <td class="px-6 py-4 font-mono text-xs text-gray-600">${videoToRender.taskId || 'N/A'}</td>
                    <td class="px-6 py-4 text-gray-500">${formatDate(videoToRender.publishDate)}</td>
                    <td class="px-6 py-4 text-center">${videoLink}</td>
                    <td class="px-6 py-4">
                        <input type="number" class="view-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500" 
                               placeholder="请输入总曝光/播放量" 
                               value="${videoToRender.totalViews || ''}" 
                               data-collaboration-id="${videoToRender.collaborationId}"
                               ${isInputDisabled ? 'disabled bg-gray-100' : ''}>
                    </td>
                    <td class="px-6 py-4 text-center">${statusHtml}</td>
                </tr>
            `;
        }).join('');

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

    // --- [V5.0 新增] 弹窗处理函数 ---
    function openOverdueModal() {
        if (!overdueTasksModal) return;
        
        const listHtml = overdueVideos.map(video => `
            <tr class="bg-white">
                <td class="px-6 py-4 font-medium text-gray-900">${video.talentName}</td>
                <td class="px-6 py-4 font-mono text-gray-600">${video.taskId || 'N/A'}</td>
                <td class="px-6 py-4 text-gray-500">${formatDate(video.publishDate)}</td>
                <td class="px-6 py-4 text-red-600 font-medium">${video.overdueInfo.overdueDays} 天</td>
            </tr>
        `).join('');

        if (overdueVideos.length > 0) {
            overdueTasksList.innerHTML = listHtml;
            overdueTasksList.closest('table').classList.remove('hidden');
            noOverdueTasksMessage.classList.add('hidden');
            copyTaskIdsBtn.disabled = false;
        } else {
            overdueTasksList.innerHTML = '';
            overdueTasksList.closest('table').classList.add('hidden');
            noOverdueTasksMessage.classList.remove('hidden');
            copyTaskIdsBtn.disabled = true;
        }
        
        overdueTasksModal.classList.remove('hidden');
    }

    function closeOverdueModal() {
        if (overdueTasksModal) overdueTasksModal.classList.add('hidden');
    }

    function copyOverdueTaskIds() {
        const taskIds = overdueVideos
            .map(v => v.taskId)
            .filter(Boolean) // 过滤掉null或undefined
            .join('\n');
            
        if (!taskIds) {
            alert('没有可复制的任务ID。');
            return;
        }
        
        copyToClipboard(taskIds);
    }

    // --- [V6.0 新增] Tab 切换函数 ---
    /**
     * 切换Tab
     * @param {string} tabName - Tab名称 ('daily-report', 'data-entry', 'effect-monitor')
     */
    function switchTab(tabName) {
        console.log(`[Tab切换] 切换到: ${tabName}`);

        // 隐藏所有Tab面板
        if (dailyReportTab) dailyReportTab.classList.add('hidden');
        if (dataEntryTab) dataEntryTab.classList.add('hidden');
        if (effectMonitorTab) effectMonitorTab.classList.add('hidden');

        // 移除所有Tab按钮的active状态
        trackingTabBtns.forEach(btn => btn.classList.remove('active'));

        // 显示目标Tab并激活按钮
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        if (tabName === 'daily-report' && dailyReportTab) {
            dailyReportTab.classList.remove('hidden');
            // 日报Tab加载逻辑已在setMode中处理
        } else if (tabName === 'data-entry' && dataEntryTab) {
            dataEntryTab.classList.remove('hidden');
            // 数据录入Tab加载逻辑已在setMode中处理
        } else if (tabName === 'effect-monitor' && effectMonitorTab) {
            effectMonitorTab.classList.remove('hidden');
            // 效果监测Tab暂无逻辑
        }

        currentTab = tabName;
    }

    /**
     * [V6.0 修改] 日报日期选择器变化处理（仅用于日报Tab）
     */
    function onGlobalDateChange() {
        const selectedDate = globalDatePicker.value;
        console.log(`[日期变化] 日报日期: ${selectedDate}`);

        // 同步到隐藏的reportDatePicker（兼容现有逻辑）
        if (reportDatePicker) reportDatePicker.value = selectedDate;

        // 重新加载日报数据
        loadReportData();
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // [V6.0 新增] Tab切换事件
        trackingTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                switchTab(tabName);
            });
        });

        // [V6.0 新增] 全局日期选择器事件
        if (globalDatePicker) {
            globalDatePicker.addEventListener('change', onGlobalDateChange);
        }

        // 保留原有事件监听（部分已弃用但保留兼容）
        if (toggleModeBtn) {
            toggleModeBtn.addEventListener('click', () => setMode(currentMode === 'display' ? 'entry' : 'display'));
        }
        if (cancelEntryBtn) {
            cancelEntryBtn.addEventListener('click', () => setMode('display'));
        }
        saveEntryBtn.addEventListener('click', saveDailyData);
        entryDatePicker.addEventListener('change', loadVideosForEntry);
        if(autoScrapeBtn) {
            autoScrapeBtn.addEventListener('click', handleAutoScrape);
        }
        // [V5.1 新增] 绑定超期视频抓取按钮
        if(autoScrapeOverdueBtn) {
            autoScrapeOverdueBtn.addEventListener('click', handleAutoScrapeOverdue);
        }

        // [V5.0 新增] 绑定新按钮和弹窗事件
        if (manualUpdateBtn) {
            manualUpdateBtn.addEventListener('click', openOverdueModal);
        }
        if (closeOverdueModalBtn) {
            closeOverdueModalBtn.addEventListener('click', closeOverdueModal);
        }
        if (overdueTasksModal) {
            overdueTasksModal.addEventListener('click', (e) => {
                if (e.target === overdueTasksModal) closeOverdueModal();
            });
        }
        if (copyTaskIdsBtn) {
            copyTaskIdsBtn.addEventListener('click', copyOverdueTaskIds);
        }
        // [V5.0 结束]

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
        
        videoEntryList.addEventListener('click', (e) => {
            const retryBtn = e.target.closest('.retry-scrape-btn');
            if (retryBtn) {
                const taskId = retryBtn.dataset.taskId;
                handleRetryScrape(taskId);
            }
        });
    }

    // --- Start the application ---
    initializePage();
});
