/**
 * @file works_management.js
 * @version 3.6-final-fix
 * @description “作品库管理”页面的前端主逻辑。实现了服务端分页、动态筛选、二级表格展示和删除功能。
 * * --- 更新日志 ---
 * - [v3.4] BUG修复: 修复了分页时未清空展开状态集合，导致折叠功能在切换页面后表现异常的问题。
 * - [v3.5] FIX: 修复了折叠/展开动画。将动画目标从 <tr> 更改为单元格内的 <div>，以解决表格元素的动画兼容性问题。
 * - [v3.6] FIX: 修复了折叠后仍显示子表头的问题。通过将垂直 padding 的控制移至 CSS 并添加过渡效果实现。
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
    const API_PATHS = {
        getWorks: '/works',
        getProjects: '/projects?view=simple',
        deleteWork: '/delete-work',
        getStats: '/works/stats'
    };
    const DOUYIN_VIDEO_PREFIX = 'https://www.douyin.com/video/';

    // --- DOM Elements ---
    const statsTotalWorks = document.getElementById('stats-total-works');
    const statsCollabWorks = document.getElementById('stats-collab-works');
    const statsOrganicWorks = document.getElementById('stats-organic-works');
    const statsTotalViews = document.getElementById('stats-total-views');
    const projectFilter = document.getElementById('project-filter');
    const sourceFilter = document.getElementById('source-filter');
    const talentSearchInput = document.getElementById('talent-search');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const worksListBody = document.getElementById('works-list-body');
    const paginationControls = document.getElementById('pagination-controls');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalTitle = document.getElementById('confirm-modal-title');
    const confirmModalMessage = document.getElementById('confirm-modal-message');
    const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');
    const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');

    // --- State Management ---
    let queryState = {
        page: 1,
        pageSize: 15,
        projectId: '',
        sourceType: '',
        search: '',
        sortBy: 't7_publishedAt',
        sortOrder: 'desc'
    };
    let openWorkDetails = new Set();
    let confirmCallback = null;

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
            showConfirmModal(`操作失败: ${error.message}`, '错误', true);
            throw error;
        }
    }

    // --- Core Data Loading ---
    async function initializePage() {
        setupEventListeners();
        await loadProjectFilter();
        await fetchAndRenderAll();
    }

    async function loadProjectFilter() {
        try {
            const response = await apiRequest(API_PATHS.getProjects);
            const projects = response.data || [];
            projectFilter.innerHTML = '<option value="">所有项目</option>';
            projects.forEach(p => {
                projectFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        } catch (error) {
            console.error("Failed to load project filter:", error);
            projectFilter.innerHTML = '<option value="">加载项目失败</option>';
        }
    }

    async function fetchAndRenderAll() {
        await Promise.all([
            fetchAndRenderWorks(),
            fetchAndRenderDashboard()
        ]);
    }

    function buildQueryString(state) {
        const params = new URLSearchParams();
        Object.entries(state).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                params.append(key, value);
            }
        });
        return params.toString();
    }
    
    async function fetchAndRenderWorks() {
        setLoadingState(true);
        try {
            const queryString = buildQueryString(queryState);
            const response = await apiRequest(`${API_PATHS.getWorks}?${queryString}`);
            const { works, pagination } = response.data;
            renderTable(works);
            renderPagination(pagination);
        } catch (error) {
            worksListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-red-500">获取作品列表失败，请稍后重试。</td></tr>`;
        } finally {
            setLoadingState(false);
        }
    }

    async function fetchAndRenderDashboard() {
        try {
            const queryString = buildQueryString({
                projectId: queryState.projectId,
                sourceType: queryState.sourceType,
                search: queryState.search
            });
            const response = await apiRequest(`${API_PATHS.getStats}?${queryString}`);
            const stats = response.data;
            statsTotalWorks.textContent = (stats.totalWorks || 0).toLocaleString();
            statsCollabWorks.textContent = (stats.collabWorks || 0).toLocaleString();
            statsOrganicWorks.textContent = (stats.organicWorks || 0).toLocaleString();
            statsTotalViews.textContent = (stats.totalViews || 0).toLocaleString();
        } catch (error) {
            console.error("Failed to load dashboard stats:", error);
        }
    }

    // --- Render Functions ---
    function renderTable(works) {
        worksListBody.innerHTML = '';
        if (works.length === 0) {
            worksListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-gray-500">未找到符合条件的作品。</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        works.forEach(work => {
            const isCollaboration = work.sourceType === 'COLLABORATION';
            const isExpanded = openWorkDetails.has(work.id);

            const mainRow = document.createElement('tr');
            mainRow.className = 'border-b hover:bg-gray-50';
            const sourceTypeTag = isCollaboration
                ? `<span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">合作作品</span>`
                : `<span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">非合作作品</span>`;
            
            const videoIdCell = work.t7_platformWorkId
                ? `<a href="${DOUYIN_VIDEO_PREFIX}${work.t7_platformWorkId}" target="_blank" class="text-blue-600 hover:underline font-mono" title="点击打开抖音视频">${work.t7_platformWorkId}</a>`
                : (work.platformWorkId || 'N/A');

            mainRow.innerHTML = `
                <td class="px-2 py-4 w-12 text-center">
                    <button class="toggle-details-btn p-2 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" data-id="${work.id}" ${!isCollaboration ? 'disabled' : ''}>
                        <svg class="w-4 h-4 rotate-icon ${isExpanded ? 'rotated' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </td>
                <td class="px-6 py-4 font-medium">${videoIdCell}</td>
                <td class="px-6 py-4">${work.projectName}</td>
                <td class="px-6 py-4 font-semibold text-gray-900">${work.talentName}</td>
                <td class="px-6 py-4">${sourceTypeTag}</td>
                <td class="px-6 py-4">${work.t7_publishedAt ? new Date(work.t7_publishedAt).toLocaleDateString() : 'N/A'}</td>
                <td class="px-6 py-4 font-medium text-gray-800">${(work.t7_totalViews || 0).toLocaleString()}</td>
                <td class="px-6 py-4 text-center">
                    <button class="delete-btn font-medium text-red-500 hover:text-red-700 hover:underline" data-id="${work.id}" data-title="${work.t7_platformWorkId || '该作品'}">删除</button>
                </td>
            `;

            fragment.appendChild(mainRow);
            
            if (isCollaboration) {
                const subRow = document.createElement('tr');
                // 添加 collapsible-row 类到 tr，用于 JS 选择和 CSS 状态控制
                subRow.classList.add('collapsible-row');
                if (isExpanded) {
                    subRow.classList.add('expanded');
                }

                const subRowCell = document.createElement('td');
                subRowCell.colSpan = 8;
                subRowCell.className = `bg-gray-50`;

                const formatNum = (num) => (num === null || num === undefined) ? 'N/A' : num.toLocaleString();

                // [v3.6 FIX] 将 p-4 替换为 px-4，垂直 padding 由 CSS 控制，以修复折叠动画
                subRowCell.innerHTML = `
                    <div class="collapsible-content px-4 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                        <div class="space-y-2">
                            <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">核心效果数据 (T+7)</h4>
                            <p class="flex justify-between"><span>总播放:</span> <strong class="font-mono">${formatNum(work.t7_totalViews)}</strong></p>
                            <p class="flex justify-between"><span>点赞量:</span> <strong class="font-mono">${formatNum(work.t7_likeCount)}</strong></p>
                            <p class="flex justify-between"><span>评论量:</span> <strong class="font-mono">${formatNum(work.t7_commentCount)}</strong></p>
                            <p class="flex justify-between"><span>分享量:</span> <strong class="font-mono">${formatNum(work.t7_shareCount)}</strong></p>
                        </div>
                        <div class="space-y-2">
                            <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">核心效果数据 (T+21)</h4>
                            <p class="flex justify-between"><span>总播放:</span> <strong class="font-mono">${formatNum(work.t21_totalViews)}</strong></p>
                            <p class="flex justify-between"><span>点赞量:</span> <strong class="font-mono">${formatNum(work.t21_likeCount)}</strong></p>
                            <p class="flex justify-between"><span>评论量:</span> <strong class="font-mono">${formatNum(work.t21_commentCount)}</strong></p>
                            <p class="flex justify-between"><span>分享量:</span> <strong class="font-mono">${formatNum(work.t21_shareCount)}</strong></p>
                        </div>
                        <div class="space-y-2">
                             <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">组件转化数据</h4>
                            <p class="flex justify-between"><span>T+7 曝光/点击:</span> <strong class="font-mono">${formatNum(work.t7_componentImpressionCount)} / ${formatNum(work.t7_componentClickCount)}</strong></p>
                             <p class="flex justify-between"><span>T+21 曝光/点击:</span> <strong class="font-mono">${formatNum(work.t21_componentImpressionCount)} / ${formatNum(work.t21_componentClickCount)}</strong></p>
                        </div>
                        <div class="space-y-2">
                            <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">关联信息</h4>
                            <p class="flex justify-between"><span>星图任务ID:</span> <strong>${work.taskId || 'N/A'}</strong></p>
                            <p class="flex justify-between"><span>内部合作ID:</span> <strong>${work.collaborationId || 'N/A'}</strong></p>
                        </div>
                    </div>
                `;
                subRow.appendChild(subRowCell);
                fragment.appendChild(subRow);
            }
        });
        worksListBody.appendChild(fragment);
    }

    function renderPagination({ page, pageSize, totalItems, totalPages }) {
        paginationControls.innerHTML = '';
        if (totalItems === 0) return;

        const summary = `<div class="text-sm text-gray-700">共 ${totalItems} 条记录</div>`;
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500">${[15, 30, 50].map(v => `<option value="${v}" ${pageSize === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`;
        
        let pageButtons = '';
        if (totalPages > 1) {
            if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                    pageButtons += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
            } else {
                 pageButtons += `<button class="pagination-btn ${1 === page ? 'active' : ''}" data-page="1">1</button>`;
                 if (page > 4) pageButtons += `<span class="pagination-ellipsis">...</span>`;
                 let start = Math.max(2, page - 2);
                 let end = Math.min(totalPages - 1, page + 2);
                 for (let i = start; i <= end; i++) {
                     pageButtons += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
                 }
                 if (page < totalPages - 3) pageButtons += `<span class="pagination-ellipsis">...</span>`;
                 pageButtons += `<button class="pagination-btn ${totalPages === page ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
            }
        }
        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-1"><button id="prev-page-btn" class="pagination-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons}<button id="next-page-btn" class="pagination-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>&gt;</button></div>` : '';
        
        paginationControls.innerHTML = `<div class="flex-1">${perPageSelector}</div><div class="flex items-center gap-4">${summary}${pageButtonsContainer}</div>`;
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            worksListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div></td></tr>`;
        }
    }
    
    function showConfirmModal(message, title = '请确认', isError = false, onConfirm) {
        confirmModalTitle.textContent = title;
        confirmModalMessage.innerHTML = message;
        confirmModalConfirmBtn.className = `px-4 py-2 text-white rounded-md ${isError ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`;
        confirmModalConfirmBtn.textContent = isError ? '好的' : '确定';
        confirmModalCancelBtn.style.display = isError ? 'none' : 'inline-block';
        confirmModal.classList.remove('hidden');
        confirmCallback = onConfirm;
    }
    
    function closeConfirmModal() {
        confirmModal.classList.add('hidden');
        confirmCallback = null;
    }

    function setupEventListeners() {
        applyFiltersBtn.addEventListener('click', () => {
            queryState.page = 1;
            queryState.projectId = projectFilter.value;
            queryState.sourceType = sourceFilter.value;
            queryState.search = talentSearchInput.value.trim();
            openWorkDetails.clear();
            fetchAndRenderAll();
        });

        resetFiltersBtn.addEventListener('click', () => {
            projectFilter.value = '';
            sourceFilter.value = '';
            talentSearchInput.value = '';
            queryState = { ...queryState, page: 1, projectId: '', sourceType: '', search: '' };
            openWorkDetails.clear();
            fetchAndRenderAll();
        });

        paginationControls.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target || target.disabled) return;
            const newPage = Number(target.dataset.page);
            if (newPage && newPage !== queryState.page) {
                queryState.page = newPage;
                openWorkDetails.clear(); // [v3.4 BUG修复] 切换页面时清空展开状态
                fetchAndRenderWorks();
            }
        });
        
        paginationControls.addEventListener('change', (e) => {
            if (e.target.id === 'items-per-page') {
                queryState.pageSize = parseInt(e.target.value, 10);
                queryState.page = 1;
                openWorkDetails.clear(); // [v3.4 BUG修复] 切换每页大小时清空展开状态
                fetchAndRenderWorks();
            }
        });

        worksListBody.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            const workId = target.dataset.id;
            
            if (target.classList.contains('toggle-details-btn')) {
                const mainRow = target.closest('tr');
                const subRow = mainRow.nextElementSibling;

                if (subRow && subRow.classList.contains('collapsible-row')) {
                    const shouldBeExpanded = !openWorkDetails.has(workId);
                    
                    if (shouldBeExpanded) {
                        openWorkDetails.add(workId);
                    } else {
                        openWorkDetails.delete(workId);
                    }
                    
                    subRow.classList.toggle('expanded', shouldBeExpanded);
                    target.querySelector('.rotate-icon').classList.toggle('rotated', shouldBeExpanded);
                }
            } else if (target.classList.contains('delete-btn')) {
                const workTitle = target.dataset.title;
                showConfirmModal(`您确定要删除视频 “<strong>${workTitle}</strong>” 吗？此操作不可撤销。`, '删除确认', false, async () => {
                    try {
                        await apiRequest(API_PATHS.deleteWork, 'DELETE', { id: workId });
                        closeConfirmModal();
                        fetchAndRenderAll();
                    } catch (error) {
                       // Handled in apiRequest
                    }
                });
            }
        });

        confirmModalCancelBtn.addEventListener('click', closeConfirmModal);
        confirmModalConfirmBtn.addEventListener('click', () => {
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            } else {
                closeConfirmModal();
            }
        });
    }
    
    initializePage();
});

