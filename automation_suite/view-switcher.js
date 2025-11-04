/**
 * @file view-switcher.js
 * @description 视图切换和筛选模块
 */

import { VIEW_MODES } from './constants.js';

export default class ViewSwitcher {
    constructor(app) {
        this.app = app;

        // DOM 元素
        this.toggleViewWorkflowBtn = document.getElementById('toggle-view-workflow');
        this.toggleViewProjectBtn = document.getElementById('toggle-view-project');
        this.toggleViewTestBtn = document.getElementById('toggle-view-test');
        this.projectFilterContainer = document.getElementById('project-filter-container');
        this.projectSearchInput = document.getElementById('project-search-input');
        this.projectSearchResults = document.getElementById('project-search-results');
        this.statisticCardsContainer = document.getElementById('statistic-cards-container');

        // 绑定事件处理器
        this.handleWorkflowView = this.handleWorkflowView.bind(this);
        this.handleProjectView = this.handleProjectView.bind(this);
        this.handleTestView = this.handleTestView.bind(this);
        this.handleProjectSearch = this.handleProjectSearch.bind(this);
        this.handleSearchResultClick = this.handleSearchResultClick.bind(this);
        this.handleStatCardClick = this.handleStatCardClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        // 视图切换按钮
        if (this.toggleViewWorkflowBtn) {
            this.toggleViewWorkflowBtn.addEventListener('click', this.handleWorkflowView);
        }
        if (this.toggleViewProjectBtn) {
            this.toggleViewProjectBtn.addEventListener('click', this.handleProjectView);
        }
        if (this.toggleViewTestBtn) {
            this.toggleViewTestBtn.addEventListener('click', this.handleTestView);
        }

        // 项目搜索
        if (this.projectSearchInput) {
            this.projectSearchInput.addEventListener('input', this.handleProjectSearch);
        }
        if (this.projectSearchResults) {
            this.projectSearchResults.addEventListener('click', this.handleSearchResultClick);
        }

        // 统计卡片点击
        if (this.statisticCardsContainer) {
            this.statisticCardsContainer.addEventListener('click', this.handleStatCardClick);
        }

        // 全局点击（关闭搜索结果）
        document.addEventListener('click', this.handleDocumentClick);
    }

    handleWorkflowView() {
        this.app.viewMode = VIEW_MODES.WORKFLOW;
        this.app.activeFilter = { type: 'all', value: 'all' };
        this.app.currentPage = 1;
        this.app.projectSearchTerm = '';

        if (this.projectSearchInput) {
            this.projectSearchInput.value = '';
        }

        this.toggleViewWorkflowBtn.classList.add('active');
        this.toggleViewProjectBtn.classList.remove('active');
        this.toggleViewTestBtn.classList.remove('active');
        this.projectFilterContainer.classList.add('hidden');

        // 触发视图变更事件
        document.dispatchEvent(new CustomEvent('viewChanged', {
            detail: { viewMode: VIEW_MODES.WORKFLOW }
        }));
    }

    handleProjectView() {
        this.app.viewMode = VIEW_MODES.PROJECT;
        this.app.activeFilter = { type: 'none', value: null };
        this.app.currentPage = 1;

        this.toggleViewProjectBtn.classList.add('active');
        this.toggleViewWorkflowBtn.classList.remove('active');
        this.toggleViewTestBtn.classList.remove('active');
        this.projectFilterContainer.classList.remove('hidden');

        // 触发视图变更事件
        document.dispatchEvent(new CustomEvent('viewChanged', {
            detail: { viewMode: VIEW_MODES.PROJECT }
        }));
    }

    handleTestView() {
        this.app.viewMode = VIEW_MODES.TEST;
        this.app.activeFilter = { type: 'all', value: 'all' };
        this.app.currentPage = 1;
        this.app.projectSearchTerm = '';

        if (this.projectSearchInput) {
            this.projectSearchInput.value = '';
        }

        this.toggleViewTestBtn.classList.add('active');
        this.toggleViewWorkflowBtn.classList.remove('active');
        this.toggleViewProjectBtn.classList.remove('active');
        this.projectFilterContainer.classList.add('hidden');

        // 触发视图变更事件
        document.dispatchEvent(new CustomEvent('viewChanged', {
            detail: { viewMode: VIEW_MODES.TEST }
        }));
    }

    handleProjectSearch() {
        const searchTerm = this.projectSearchInput.value.toLowerCase();
        this.projectSearchResults.innerHTML = '';

        if (!searchTerm) {
            this.projectSearchResults.classList.add('hidden');
            return;
        }

        const matchedProjects = this.app.allProjects.filter(p =>
            p.name.toLowerCase().includes(searchTerm)
        );

        if (matchedProjects.length > 0) {
            matchedProjects.forEach(p => {
                const item = document.createElement('div');
                item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
                item.textContent = p.name;
                item.dataset.projectId = p.id;
                this.projectSearchResults.appendChild(item);
            });
            this.projectSearchResults.classList.remove('hidden');
        } else {
            this.projectSearchResults.classList.add('hidden');
        }
    }

    handleSearchResultClick(e) {
        const item = e.target.closest('[data-project-id]');
        if (item) {
            const projectId = item.dataset.projectId;
            this.projectSearchInput.value = item.textContent;
            this.projectSearchResults.classList.add('hidden');

            this.app.activeFilter = { type: 'project', value: projectId };
            this.app.currentPage = 1;

            // 触发筛选变更事件
            document.dispatchEvent(new CustomEvent('filterChanged', {
                detail: { type: 'project', value: projectId }
            }));
        }
    }

    handleStatCardClick(e) {
        const card = e.target.closest('.stat-card');
        if (!card) return;

        const clickedFilterValue = card.dataset.filterValue;

        if (card.classList.contains('active') && clickedFilterValue !== 'all') {
            card.classList.remove('active');
            this.app.activeFilter = { type: 'all', value: 'all' };
            this.statisticCardsContainer.querySelector('[data-filter-value="all"]')?.classList.add('active');
        } else {
            this.statisticCardsContainer.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            this.app.activeFilter = { type: card.dataset.filterType, value: clickedFilterValue };
        }

        this.app.currentPage = 1;

        // 触发筛选变更事件
        document.dispatchEvent(new CustomEvent('filterChanged', {
            detail: { type: this.app.activeFilter.type, value: this.app.activeFilter.value }
        }));
    }

    handleDocumentClick(e) {
        if (this.projectFilterContainer && !this.projectFilterContainer.contains(e.target)) {
            this.projectSearchResults?.classList.add('hidden');
        }
    }

    // 资源清理
    unload() {
        if (this.toggleViewWorkflowBtn) {
            this.toggleViewWorkflowBtn.removeEventListener('click', this.handleWorkflowView);
        }
        if (this.toggleViewProjectBtn) {
            this.toggleViewProjectBtn.removeEventListener('click', this.handleProjectView);
        }
        if (this.toggleViewTestBtn) {
            this.toggleViewTestBtn.removeEventListener('click', this.handleTestView);
        }
        if (this.projectSearchInput) {
            this.projectSearchInput.removeEventListener('input', this.handleProjectSearch);
        }
        if (this.projectSearchResults) {
            this.projectSearchResults.removeEventListener('click', this.handleSearchResultClick);
        }
        if (this.statisticCardsContainer) {
            this.statisticCardsContainer.removeEventListener('click', this.handleStatCardClick);
        }
        document.removeEventListener('click', this.handleDocumentClick);
    }
}
