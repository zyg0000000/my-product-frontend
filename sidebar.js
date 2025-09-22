/**
 * @file sidebar.js
 * @version 1.3 - Automation Suite Added
 * @description An independent, reusable sidebar component.
 * - [FEATURE] Added a new top-level menu "自动化工具" with a link to the "星图截图套件".
 * - Automatically renders the sidebar HTML.
 * - Highlights the current page link based on the URL.
 * - Manages all collapse/expand interactions and state persistence.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Sidebar HTML template (compact format to avoid whitespace issues)
    const sidebarHTML = `<aside id="sidebar" class="w-38 bg-white flex-shrink-0 flex flex-col sidebar fixed top-0 left-0 h-screen z-40"><div class="p-4 border-b border-gray-200 flex items-center app-title"><svg class="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg><h2 class="text-lg font-semibold text-gray-800 ml-3 app-title-text">字节专项</h2></div><nav class="px-4 py-4 flex-grow"><div class="space-y-4"><div><button class="nav-toggle" data-toggle="project-menu"><div class="flex items-center"><div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg></div><span class="nav-text">项目管理</span></div></button><div id="project-menu" class="mt-1 space-y-1 flex flex-col submenu"><a href="index.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">项目列表</span></a><a href="task_center.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">任务中心</span></a><a href="talent_selection.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">达人挑选</span></a></div></div><div><button class="nav-toggle" data-toggle="talent-menu"><div class="flex items-center"><div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg></div><span class="nav-text">达人管理</span></div></button><div id="talent-menu" class="mt-1 space-y-1 hidden flex flex-col submenu"><a href="talent_pool.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">基础信息</span></a><a href="talent_schedule.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">档期管理</span></a><a href="performance.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">近期表现</span></a><a href="rebate_management.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">返点回收</span></a></div></div><div><button class="nav-toggle" data-toggle="content-menu"><div class="flex items-center"><div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg></div><span class="nav-text">内容管理</span></div></button><div id="content-menu" class="mt-1 space-y-1 hidden flex flex-col submenu"><a href="works_management.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">作品管理</span></a></div></div><div><button class="nav-toggle" data-toggle="automation-menu"><div class="flex items-center"><div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg></div><span class="nav-text">自动化工具</span></div></button><div id="automation-menu" class="mt-1 space-y-1 hidden flex flex-col submenu"><a href="automation_suite/screenshot_suite.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">星图截图套件</span></a></div></div><div><button class="nav-toggle" data-toggle="sync-menu"><div class="flex items-center"><div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg><svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg></div><span class="nav-text">数据同步</span></div></button><div id="sync-menu" class="mt-1 space-y-1 hidden flex flex-col submenu"><a href="feishu_sync.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">飞书同步</span></a></div></div></div></nav><div class="p-4 border-t border-gray-200"><button id="sidebar-toggle" class="w-full flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100"><svg id="toggle-icon-collapse" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg><svg id="toggle-icon-expand" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg></button></div></aside>`;

    // Default container ID
    const containerId = 'sidebar-container';
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`[Sidebar] Error: Container with id #${containerId} not found.`);
        return;
    }

    // 1. Render HTML
    container.innerHTML = sidebarHTML;

    // 2. Initialize Logic
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const SIDEBAR_STATE_KEY = 'sidebarCollapsed';

    // 2.1 Highlight the current page link
    const currentPath = window.location.pathname;
    const activeLink = sidebar.querySelector(`a[href$="${currentPath.split('/').pop()}"]`) || sidebar.querySelector(`a[href$="${currentPath.split('/')[currentPath.split('/').length - 2] + '/' + currentPath.split('/').pop()}"]`);
    
    if (activeLink) {
        activeLink.classList.add('active');
        // Expand its parent menu
        const parentMenu = activeLink.closest('.submenu');
        if (parentMenu) {
            parentMenu.classList.remove('hidden');
            // Update the parent toggle icon accordingly
            const toggleButton = document.querySelector(`button[data-toggle="${parentMenu.id}"]`);
            if (toggleButton) {
                const plusIcon = toggleButton.querySelector('.toggle-icon-plus');
                const minusIcon = toggleButton.querySelector('.toggle-icon-minus');
                if (plusIcon) plusIcon.classList.add('hidden');
                if (minusIcon) minusIcon.classList.remove('hidden');
            }
        }
    }

    // 2.2 Define sidebar control functions
    function setSidebarState(isCollapsed) {
        if (!sidebar || !mainContent) return;

        const toggleIconCollapse = document.getElementById('toggle-icon-collapse');
        const toggleIconExpand = document.getElementById('toggle-icon-expand');

        if (isCollapsed) {
            sidebar.classList.add('sidebar-collapsed');
            mainContent.style.marginLeft = '5rem';
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            mainContent.style.marginLeft = '9.5rem';
        }

        if (toggleIconCollapse) toggleIconCollapse.classList.toggle('hidden', isCollapsed);
        if (toggleIconExpand) toggleIconExpand.classList.toggle('hidden', !isCollapsed);
    }

    function toggleSidebar() {
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
        setSidebarState(!isCollapsed);
        localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(!isCollapsed));
    }

    // 2.3 Add event listeners
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }

    sidebar.querySelectorAll('.nav-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            if (sidebar.classList.contains('sidebar-collapsed')) return;
            const submenuId = toggle.getAttribute('data-toggle');
            const submenu = document.getElementById(submenuId);
            if (submenu) {
                submenu.classList.toggle('hidden');
                const plusIcon = toggle.querySelector('.toggle-icon-plus');
                const minusIcon = toggle.querySelector('.toggle-icon-minus');
                if (plusIcon && minusIcon) {
                    plusIcon.classList.toggle('hidden');
                    minusIcon.classList.toggle('hidden');
                }
            }
        });
    });

    // 2.4 Restore state from localStorage
    const isCollapsed = JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY));
    setSidebarState(isCollapsed);
});
