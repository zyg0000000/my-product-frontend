document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

    // --- DOM Elements ---
    const talentSearchInput = document.getElementById('talent-search');
    const talentListContainer = document.getElementById('talent-list-container');
    const noTalentsPrompt = document.getElementById('no-talents-prompt');
    const paginationControls = document.getElementById('pagination-controls');
    const calendarModal = document.getElementById('calendar-modal');
    const calendarModalContent = document.getElementById('calendar-modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTalentName = document.getElementById('modal-talent-name').querySelector('b');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const currentDateRange = document.getElementById('current-date-range');
    const calendarGrid = document.getElementById('calendar-grid');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const backToTodayBtn = document.getElementById('back-to-today-btn');
    const remarksSection = document.getElementById('remarks-section');
    const singleMonthRemark = document.getElementById('single-month-remark');
    const singleMonthLabel = document.getElementById('single-month-label');
    const singleMonthTextarea = document.getElementById('single-month-textarea');
    const multiMonthRemark = document.getElementById('multi-month-remark');
    const remarkTabs = document.getElementById('remark-tabs');
    const remarkTabPanels = document.getElementById('remark-tab-panels');

    // --- State ---
    const ITEMS_PER_PAGE_KEY = 'scheduleItemsPerPage';
    let allTalents = [];
    let talentCollaborationStats = {};
    let currentPage = 1;
    let itemsPerPage = 10;
    
    // --- Calendar Modal State ---
    let currentEditingTalentId = null;
    let viewStartDate = new Date(); 
    let modalSelectedDates = new Set();
    let monthlyRemarks = {}; 
    let isDragging = false;
    let dragStartDate = null;
    let wasSelectedOnDragStart = false;
    const WEEKS_TO_SHOW = 5; 

    // --- API Request & Utility Functions ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            showCustomAlert(`操作失败: ${error.message}`);
            throw error;
        }
    }

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

    // --- Initialization & Data Handling ---
    async function initializePage() {
        try {
            itemsPerPage = parseInt(localStorage.getItem(ITEMS_PER_PAGE_KEY) || '10');

            await loadData();
            renderPage();
            setupEventListeners();
        } catch (error) {
            console.error("Page initialization failed:", error);
            document.body.innerHTML = '<div class="p-8 text-center text-red-500">页面加载失败，请刷新重试。</div>';
        }
    }

    async function loadData() {
        try {
            const [talentsRes, collabsRes] = await Promise.all([
                apiRequest('/talents'),
                apiRequest('/collaborations?view=simple&allowGlobal=true')
            ]);
            allTalents = talentsRes.data || [];
            preprocessCollaborationData(collabsRes.data || []);
        } catch (error) {
            allTalents = [];
            console.error("Failed to load initial data:", error);
        }
    }

    async function handleSaveChanges() {
        const talentToSave = allTalents.find(t => t.id === currentEditingTalentId);
        if (!talentToSave) return;
        
        const payload = {
            id: talentToSave.id,
            schedules: Array.from(modalSelectedDates),
            remarks: monthlyRemarks
        };

        try {
            await apiRequest('/update-talent', 'PUT', payload);
            closeCalendarModal();
            // Refresh data from server to ensure consistency
            await loadData();
            renderPage();
            showCustomAlert('档期保存成功！', '操作成功');
        } catch (error) {
            // Error is handled in apiRequest
        }
    }

    function preprocessCollaborationData(collaborations) {
        const stats = {};
        allTalents.forEach(t => { stats[t.id] = { inCollaboration: false, collaborationCount: 0 }; });
        
        collaborations.forEach(collab => {
            if (collab && collab.talentId && stats[collab.talentId]) {
                stats[collab.talentId].collaborationCount++;
                if (collab.status === '客户已定档') {
                    stats[collab.talentId].inCollaboration = true;
                }
            }
        });
        talentCollaborationStats = stats;
    }

    // --- Main List Rendering ---
    function renderPage() {
        const searchQuery = talentSearchInput.value.toLowerCase().trim();
        const filteredTalents = allTalents.filter(t => (t.nickname || '').toLowerCase().includes(searchQuery));

        if (filteredTalents.length === 0) {
            talentListContainer.innerHTML = '';
            talentListContainer.classList.add('hidden');
            noTalentsPrompt.classList.remove('hidden');
            paginationControls.innerHTML = '';
            return;
        }

        talentListContainer.classList.remove('hidden');
        noTalentsPrompt.classList.add('hidden');
        const totalPages = Math.ceil(filteredTalents.length / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages || 1);
        const paginatedTalents = filteredTalents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        
        renderTalentList(paginatedTalents);
        renderPagination(totalPages, filteredTalents.length);
    }

    function renderTalentList(talentsToRender) {
        talentListContainer.innerHTML = '';
        talentsToRender.forEach(talent => {
            const stats = talentCollaborationStats[talent.id] || { inCollaboration: false, collaborationCount: 0 };
            const tierColor = generatePastelColorFromString(talent.talentTier || '默认');
            const talentCard = document.createElement('div');
            talentCard.className = 'bg-white rounded-xl shadow-sm p-4 flex justify-between items-center gap-4';
            talentCard.innerHTML = `
                <div class="w-1/4">
                    <p class="font-bold text-lg text-gray-800 truncate">${talent.nickname || '未知昵称'}</p>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background-color:${tierColor.bg}; color:${tierColor.text};">${talent.talentTier || '未分类'}</span>
                        ${stats.inCollaboration ? '<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">合作中</span>' : ''}
                        ${stats.collaborationCount > 0 ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">合作过 ${stats.collaborationCount} 次</span>` : ''}
                    </div>
                </div>
                <div class="flex-grow flex justify-center items-center gap-2">
                    <div class="flex-shrink-0 text-sm font-semibold text-gray-600">近30天档期:</div>
                    <div class="flex items-center gap-1" id="schedule-preview-${talent.id}">${renderSchedulePreview(talent, 30)}</div>
                </div>
                <div class="w-1/4 flex justify-end">
                    <button class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 manage-schedule-btn" data-talent-id="${talent.id}">管理档期</button>
                </div>`;
            talentListContainer.appendChild(talentCard);
        });
    }

    function renderSchedulePreview(talent, days) {
        const scheduleSet = new Set(talent.schedules || []);
        const today = new Date();
        let previewHtml = '';
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateString = formatDate(date);
            const isAvailable = scheduleSet.has(dateString);
            const bgColor = isAvailable ? 'bg-green-400' : 'bg-gray-300';
            const tooltipText = `${dateString} (${isAvailable ? '有空' : '没空'})`;
            previewHtml += `<div class="schedule-block w-4 h-4 rounded-sm ${bgColor}"><span class="schedule-tooltip">${tooltipText}</span></div>`;
        }
        return previewHtml;
    }

    function renderPagination(totalPages, totalItems) {
        paginationControls.innerHTML = '';
        if (totalItems === 0) return;
        const perPageSelector = `<div class="flex items-center text-sm"><span class="mr-2 text-gray-600">每页显示:</span><select id="items-per-page" class="rounded-md border-gray-300 shadow-sm text-sm"><option value="5" ${itemsPerPage === 5 ? 'selected' : ''}>5</option><option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15</option><option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option></select></div>`;
        const pageButtons = [];
        const maxButtons = 7;
        if (totalPages > 1) {
            if (totalPages <= maxButtons) {
                for (let i = 1; i <= totalPages; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
            } else {
                pageButtons.push(`<button class="pagination-btn ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>`);
                let start = Math.max(2, currentPage - 2), end = Math.min(totalPages - 1, currentPage + 2);
                if (currentPage > 4) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                for (let i = start; i <= end; i++) pageButtons.push(`<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
                if (currentPage < totalPages - 3) pageButtons.push('<span class="pagination-ellipsis">...</span>');
                pageButtons.push(`<button class="pagination-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`);
            }
        }
        const pageButtonsContainer = totalPages > 1 ? `<div class="flex items-center gap-2"><button id="prev-page-btn" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>${pageButtons.join('')}<button id="next-page-btn" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button></div>` : '<div></div>';
        paginationControls.innerHTML = perPageSelector + pageButtonsContainer;
    }

    // --- Calendar Modal Logic ---
    function openCalendarModal(talentId) {
        currentEditingTalentId = talentId;
        const talent = allTalents.find(t => t.id === talentId);
        if (!talent) return;

        modalTalentName.textContent = talent.nickname;
        modalSelectedDates = new Set(talent.schedules || []);
        monthlyRemarks = JSON.parse(JSON.stringify(talent.remarks || {}));
        
        const today = new Date();
        viewStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());

        renderCalendar();
        calendarModal.classList.remove('hidden');
        setTimeout(() => calendarModalContent.classList.remove('scale-95', 'opacity-0'), 10);
    }

    function closeCalendarModal() {
        calendarModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            calendarModal.classList.add('hidden');
            currentEditingTalentId = null;
        }, 300);
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const startDate = new Date(viewStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + WEEKS_TO_SHOW * 7 - 1);
        currentDateRange.textContent = `${formatDate(startDate, 'YYYY-MM-DD')} ~ ${formatDate(endDate, 'YYYY-MM-DD')}`;
        
        const todayString = formatDate(new Date());
        const visibleMonths = new Set();

        for (let i = 0; i < WEEKS_TO_SHOW * 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = formatDate(date);
            visibleMonths.add(formatDate(date, 'YYYY-MM'));

            const day = document.createElement('div');
            day.className = 'calendar-day';
            day.dataset.date = dateString;
            day.innerHTML = `<span class="date-number">${date.getDate()}</span>`;
            if (modalSelectedDates.has(dateString)) day.classList.add('selected');
            if (dateString === todayString) day.classList.add('today');
            if (date.getDate() === 1) day.innerHTML = `<span class="date-number font-bold text-blue-600">${date.getMonth() + 1}月${date.getDate()}</span>`;
            
            calendarGrid.appendChild(day);
        }
        renderRemarks(Array.from(visibleMonths));
    }

    function renderRemarks(months) {
        singleMonthRemark.classList.add('hidden');
        multiMonthRemark.classList.add('hidden');
        remarkTabs.innerHTML = '';
        remarkTabPanels.innerHTML = '';

        if (months.length === 1) {
            const month = months[0];
            singleMonthRemark.classList.remove('hidden');
            singleMonthLabel.textContent = `${month.replace('-', '年 ')}月 备注`;
            singleMonthTextarea.value = monthlyRemarks[month] || '';
            singleMonthTextarea.dataset.month = month;
        } else if (months.length > 1) {
            multiMonthRemark.classList.remove('hidden');
            months.sort().forEach((month, index) => {
                const tab = document.createElement('button');
                tab.className = `remark-tab ${index === 0 ? 'active' : ''}`;
                tab.textContent = `${month.replace('-', '年 ')}月`;
                tab.dataset.targetPanel = `panel-${month}`;
                remarkTabs.appendChild(tab);

                const panel = document.createElement('div');
                panel.id = `panel-${month}`;
                panel.className = `remark-tab-panel ${index > 0 ? 'hidden' : ''}`;
                panel.innerHTML = `<textarea rows="4" class="w-full p-2 border border-gray-300 rounded-md" data-month="${month}">${monthlyRemarks[month] || ''}</textarea>`;
                remarkTabPanels.appendChild(panel);
            });
        }
    }
    
    // --- Event Listeners ---
    function setupEventListeners() {
        talentSearchInput.addEventListener('input', () => { currentPage = 1; renderPage(); });

        talentListContainer.addEventListener('click', (e) => {
            const manageBtn = e.target.closest('.manage-schedule-btn');
            if (manageBtn) openCalendarModal(manageBtn.dataset.talentId);
        });

        paginationControls.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target || target.disabled) return;
            const totalPages = Math.ceil(allTalents.filter(t => (t.nickname || '').toLowerCase().includes(talentSearchInput.value.toLowerCase().trim())).length / itemsPerPage);
            if (target.id === 'prev-page-btn' && currentPage > 1) currentPage--;
            else if (target.id === 'next-page-btn' && currentPage < totalPages) currentPage++;
            else if (target.dataset.page) currentPage = Number(target.dataset.page);
            renderPage();
        });

        paginationControls.addEventListener('change', (e) => {
            if (e.target.id === 'items-per-page') {
                itemsPerPage = parseInt(e.target.value);
                currentPage = 1;
                localStorage.setItem(ITEMS_PER_PAGE_KEY, itemsPerPage);
                renderPage();
            }
        });

        closeModalBtn.addEventListener('click', closeCalendarModal);
        calendarModal.addEventListener('click', (e) => { if (e.target === calendarModal) closeCalendarModal(); });
        prevWeekBtn.addEventListener('click', () => { viewStartDate.setDate(viewStartDate.getDate() - 7); renderCalendar(); });
        nextWeekBtn.addEventListener('click', () => { viewStartDate.setDate(viewStartDate.getDate() + 7); renderCalendar(); });
        backToTodayBtn.addEventListener('click', () => {
            const today = new Date();
            viewStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
            renderCalendar();
        });
        saveScheduleBtn.addEventListener('click', handleSaveChanges);

        // Calendar Drag Logic
        calendarGrid.addEventListener('mousedown', (e) => {
            const day = e.target.closest('.calendar-day');
            if (!day || day.classList.contains('other-month')) return;
            e.preventDefault();
            isDragging = true;
            const dateStr = day.dataset.date;
            dragStartDate = new Date(dateStr);
            wasSelectedOnDragStart = modalSelectedDates.has(dateStr);
            
            if (e.detail === 1) { // Single click
                if (wasSelectedOnDragStart) modalSelectedDates.delete(dateStr);
                else modalSelectedDates.add(dateStr);
                day.classList.toggle('selected');
            }
        });

        calendarGrid.addEventListener('mouseover', (e) => {
            if (!isDragging) return;
            const day = e.target.closest('.calendar-day');
            if (!day || day.classList.contains('other-month')) return;
            
            const dragEndDate = new Date(day.dataset.date);
            const start = new Date(Math.min(dragStartDate, dragEndDate));
            const end = new Date(Math.max(dragStartDate, dragEndDate));

            document.querySelectorAll('.calendar-day[data-date]').forEach(d => {
                const currentDate = new Date(d.dataset.date);
                if (currentDate >= start && currentDate <= end) {
                    d.classList.toggle('selected', !wasSelectedOnDragStart);
                }
            });
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            
            // Finalize selection state after dragging
            document.querySelectorAll('.calendar-day.selected[data-date]').forEach(d => modalSelectedDates.add(d.dataset.date));
            document.querySelectorAll('.calendar-day:not(.selected)[data-date]').forEach(d => modalSelectedDates.delete(d.dataset.date));
        });

        remarksSection.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                monthlyRemarks[e.target.dataset.month] = e.target.value;
            }
        });

        remarkTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.remark-tab');
            if (!tab) return;
            remarkTabs.querySelectorAll('.remark-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            remarkTabPanels.querySelectorAll('.remark-tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== tab.dataset.targetPanel));
        });
    }

    // --- Helper Functions ---
    function formatDate(date, format = 'YYYY-MM-DD') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return format === 'YYYY-MM' ? `${year}-${month}` : `${year}-${month}-${day}`;
    }

    function generatePastelColorFromString(str) {
        let hash = 0;
        str = str || 'default';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return { bg: `hsl(${h}, 70%, 85%)`, text: `hsl(${h}, 70%, 30%)` };
    }

    // --- Start the application ---
    initializePage();
});
