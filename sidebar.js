/**
 * @file sidebar.js
 * @version 2.4 - Add Execution Board
 * @description 一个独立的、可重用的侧边栏组件。
 *
 * @changelog
 * - v2.4 (2025-10-26): 在 "项目管理" 菜单下增加了 "执行看板" 的导航入口。
 * - v2.3 (2025-10-22): 根据要求，将 "数据导出中心" 的导航入口从 "达人管理" 移动到 "自动套件" 菜单下。
 * - v2.2 (2025-10-22): 在 "达人管理" 菜单下增加了 "数据导出中心" 的导航入口。
 * - v2.1.1 (2025-10-19): 修正了 'project_analysis.html' 的文件命名并更新了变更日志。
 * - v2.1 (2025-10-19): 在 "项目管理" 下为 "项目分析" 添加了新的链接。
 * - v2.0 (2025-10-18): 添加了注释以说明在何处手动更改侧边栏宽度。
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 定义侧边栏的 HTML 结构 ---
    const sidebarHTML = `
    <aside id="sidebar" class="bg-white flex-shrink-0 flex flex-col sidebar fixed top-0 left-0 h-screen z-40">
        <!-- 应用标题 -->
        <div class="p-4 border-b border-gray-200 flex items-center app-title">
            <svg class="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
            <h2 class="text-lg font-semibold text-gray-800 ml-3 app-title-text">字节专项</h2>
        </div>

        <!-- 导航菜单 -->
        <nav class="px-4 py-4 flex-grow">
            <div class="space-y-4">
                <!-- 项目管理 -->
                <div>
                    <button class="nav-toggle" data-toggle="project-menu">
                        <div class="flex items-center">
                            <div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center">
                                <svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                <svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
                            </div>
                            <span class="nav-text">项目管理</span>
                        </div>
                    </button>
                    <div id="project-menu" class="mt-1 space-y-1 flex flex-col submenu">
                        <a href="project_analysis.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">分析看板</span></a>
                        <a href="index.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">项目列表</span></a>
                        <a href="task_center.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">任务中心</span></a>
                        <a href="execution_board.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">执行看板</span></a>
                        <a href="talent_selection.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">达人挑选</span></a>
                    </div>
                </div>

                <!-- 达人管理 -->
                <div>
                    <button class="nav-toggle" data-toggle="talent-menu">
                        <div class="flex items-center">
                            <div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center">
                                <svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                <svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
                            </div>
                            <span class="nav-text">达人管理</span>
                        </div>
                    </button>
                    <div id="talent-menu" class="mt-1 space-y-1 hidden flex flex-col submenu">
                        <a href="talent_pool.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">基础信息</span></a>
                        <a href="talent_schedule.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">档期管理</span></a>
                        <a href="performance.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">近期表现</span></a>
                        <a href="rebate_management.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">返点回收</span></a>
                    </div>
                </div>

                <!-- 内容管理 -->
                <div>
                    <button class="nav-toggle" data-toggle="content-menu">
                        <div class="flex items-center">
                            <div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center">
                                <svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                <svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
                            </div>
                            <span class="nav-text">内容管理</span>
                        </div>
                    </button>
                    <div id="content-menu" class="mt-1 space-y-1 hidden flex flex-col submenu">
                        <a href="works_management.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">作品管理</span></a>
                    </div>
                </div>

                <!-- 自动套件 -->
                <div>
                    <button class="nav-toggle" data-toggle="automation-menu">
                        <div class="flex items-center">
                            <div class="w-5 h-5 mr-3 flex-shrink-0 flex items-center justify-center">
                                <svg class="w-4 h-4 toggle-icon-plus" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                <svg class="w-4 h-4 toggle-icon-minus hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>
                            </div>
                            <span class="nav-text">自动套件</span>
                        </div>
                    </button>
                    <div id="automation-menu" class="mt-1 space-y-1 hidden flex flex-col submenu">
                        <a href="automation_suite.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">爬虫套件</span></a>
                        <a href="mapping_templates.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">模版管理</span></a>
                        <a href="feishu_sync.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">飞书同步</span></a>
                        <a href="data_export_center.html" class="nav-link pl-7"><span class="w-5 mr-3 flex-shrink-0 text-center nav-text">·</span><span class="nav-text">数据导出</span></a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 侧边栏折叠/展开按钮 -->
        <div class="p-4 border-t border-gray-200">
            <button id="sidebar-toggle" class="w-full flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <svg id="toggle-icon-collapse" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                <svg id="toggle-icon-expand" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
            </button>
        </div>
    </aside>
    `;

    // --- 2. 初始化与 DOM 元素获取 ---
    const containerId = 'sidebar-container';
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`[Sidebar] 错误: 未找到 ID 为 #${containerId} 的容器。`);
        return;
    }

    container.innerHTML = sidebarHTML;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const SIDEBAR_STATE_KEY = 'sidebarCollapsed';

    // --- 3. 根据当前页面路径高亮活动链接 ---
    const currentPageFile = window.location.pathname.split('/').pop() || 'index.html';
    const activeLink = sidebar.querySelector(`a[href$="${currentPageFile}"]`);

    if (activeLink) {
        activeLink.classList.add('active');
        const parentMenu = activeLink.closest('.submenu');
        if (parentMenu) {
            parentMenu.classList.remove('hidden');
            const toggleButton = document.querySelector(`button[data-toggle="${parentMenu.id}"]`);
            if (toggleButton) {
                const plusIcon = toggleButton.querySelector('.toggle-icon-plus');
                const minusIcon = toggleButton.querySelector('.toggle-icon-minus');
                if (plusIcon) plusIcon.classList.add('hidden');
                if (minusIcon) minusIcon.classList.remove('hidden');
            }
        }
    }

    // --- 4. 侧边栏状态管理函数 ---
    /**
     * 设置侧边栏的折叠或展开状态。
     * @param {boolean} isCollapsed - 是否应折叠侧边栏。
     */
    function setSidebarState(isCollapsed) {
        if (!sidebar || !mainContent) return;

        const toggleIconCollapse = document.getElementById('toggle-icon-collapse');
        const toggleIconExpand = document.getElementById('toggle-icon-expand');
        
        // 手动修改此处以调整展开宽度
        const expandedWidthClass = 'w-44'; 
        const expandedMargin = '11rem'; 

        if (isCollapsed) {
            sidebar.classList.add('sidebar-collapsed');
            sidebar.classList.remove(expandedWidthClass);
            mainContent.style.marginLeft = '5rem';
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.classList.add(expandedWidthClass);
            mainContent.style.marginLeft = expandedMargin;
        }

        if (toggleIconCollapse) toggleIconCollapse.classList.toggle('hidden', isCollapsed);
        if (toggleIconExpand) toggleIconExpand.classList.toggle('hidden', !isCollapsed);
    }

    /**
     * 切换侧边栏的显示状态。
     */
    function toggleSidebar() {
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
        const newState = !isCollapsed;
        setSidebarState(newState);
        localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(newState));
    }

    // --- 5. 事件监听器 ---
    // 监听侧边栏折叠按钮的点击事件
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }

    // 为所有导航菜单切换按钮添加点击事件
    sidebar.querySelectorAll('.nav-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            // 如果侧边栏已折叠，则不展开子菜单
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

    // --- 6. 从 localStorage 初始化侧边栏状态 ---
    const isCollapsed = JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY));
    setSidebarState(isCollapsed);
});

