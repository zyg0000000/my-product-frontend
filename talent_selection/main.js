/**
 * @file talent_selection/main.js
 * @description 主控制器 - 页面初始化、模块协调、全局状态管理
 */

import { generateConfigurationsFromData, initializeVisibleColumns, setDefaultExecutionMonth } from './utils.js';
import { SuccessModal, CustomAlertModal } from './modals.js';
import FilterPanel from './filter-panel.js';
import TalentTable from './talent-table.js';
import SelectionPanel from './selection-panel.js';
import BatchImportModal from './modal-batch-import.js';
import ColumnsModal from './modal-columns.js';

export default class TalentSelectionApp {
    constructor() {
        // --- API Configuration ---
        this.API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

        // --- Global State ---
        this.allProjects = [];
        this.allTalents = [];
        this.richTalentData = [];
        this.displayedTalents = [];
        this.selectedCollaborations = [];
        this.allConfigurations = { talentTypes: [], talentTiers: [], dimensions: [] };
        this.visibleColumns = [];

        // --- Constants ---
        this.ITEMS_PER_PAGE_KEY = 'talentSelectionItemsPerPage';
        this.VISIBLE_COLUMNS_KEY = 'talentSelectionVisibleColumns';

        // --- Modules ---
        this.modules = {};
        this.modals = {};

        // --- DOM Elements ---
        this.targetProjectSelect = document.getElementById('target-project');
        this.executionMonthInput = document.getElementById('execution-month');

        // --- Bind Methods ---
        this.handleRefreshData = this.handleRefreshData.bind(this);
        this.handleFiltersApplied = this.handleFiltersApplied.bind(this);
        this.handleTalentSelected = this.handleTalentSelected.bind(this);
        this.handleTalentDeselected = this.handleTalentDeselected.bind(this);
    }

    async init() {
        console.log('[TalentSelectionApp] 初始化开始');

        try {
            // 加载数据
            await this.loadData();

            // 初始化模块
            this.initializeModules();

            // 设置事件监听
            this.setupEventListeners();

            // 初始化 UI
            this.populateProjectSelect();
            this.executionMonthInput.value = setDefaultExecutionMonth();

            // 初始化筛选和渲染
            this.modules.filterPanel.render();
            this.modules.selectionPanel.resetProjectSnapshot();

            console.log('[TalentSelectionApp] 初始化完成');

        } catch (error) {
            console.error('[TalentSelectionApp] 初始化失败:', error);
            document.body.innerHTML = `<div class="p-8 text-center text-red-500">页面初始化失败: ${error.message}</div>`;
        }
    }

    async loadData() {
        const itemsPerPage = parseInt(localStorage.getItem(this.ITEMS_PER_PAGE_KEY) || '15');

        const [projectsRes, talentsRes] = await Promise.all([
            this.apiRequest('/projects?view=simple'),
            this.apiRequest('/talents'),
        ]);

        this.allProjects = projectsRes.data || [];
        this.allTalents = talentsRes.data || [];

        // 生成配置
        this.allConfigurations = generateConfigurationsFromData(this.allTalents);

        // 初始化可见列
        this.visibleColumns = initializeVisibleColumns(this.VISIBLE_COLUMNS_KEY, this.allConfigurations);
        console.log('[TalentSelectionApp] visibleColumns initialized:', this.visibleColumns.length);
        console.log('[TalentSelectionApp] visibleColumns sample:', this.visibleColumns.slice(0, 3));

        // 增强达人数据
        this.richTalentData = this.allTalents.map(talent => {
            const highestRebate = talent.rebates && talent.rebates.length > 0
                ? Math.max(...talent.rebates.map(r => r.rate))
                : 0;
            return {
                ...talent,
                highestRebate,
                schedules: new Set(talent.schedules || [])
            };
        });

        console.log(`[TalentSelectionApp] 数据加载完成: ${this.allProjects.length} 个项目, ${this.allTalents.length} 位达人`);
    }

    initializeModules() {
        // 初始化模态框
        this.modals.success = new SuccessModal();
        this.modals.alert = new CustomAlertModal();

        // 初始化筛选面板
        this.modules.filterPanel = new FilterPanel({
            richTalentData: this.richTalentData,
            allConfigurations: this.allConfigurations,
            executionMonthInput: this.executionMonthInput,
            apiRequest: this.apiRequest.bind(this),
            showAlert: (msg) => this.modals.alert.show(msg)
        });

        // 初始化表格模块
        this.modules.talentTable = new TalentTable({
            displayedTalents: this.displayedTalents,
            visibleColumns: this.visibleColumns,
            executionMonthInput: this.executionMonthInput,
            ITEMS_PER_PAGE_KEY: this.ITEMS_PER_PAGE_KEY,
            apiRequest: this.apiRequest.bind(this),
            showAlert: (msg) => this.modals.alert.show(msg)
        });

        // 初始化选择列表模块
        this.modules.selectionPanel = new SelectionPanel({
            selectedCollaborations: this.selectedCollaborations,
            targetProjectSelect: this.targetProjectSelect,
            allProjects: this.allProjects,
            apiRequest: this.apiRequest.bind(this),
            showAlert: (msg) => this.modals.alert.show(msg)
        });
        this.modules.selectionPanel.init();

        // 初始化批量录入弹窗
        this.modals.batchImport = new BatchImportModal({
            executionMonthInput: this.executionMonthInput,
            targetProjectSelect: this.targetProjectSelect,
            apiRequest: this.apiRequest.bind(this),
            showSuccess: (title, msg, projectId) => this.modals.success.show(title, msg, projectId),
            showAlert: (msg) => this.modals.alert.show(msg)
        });
        this.modals.batchImport.init(this.richTalentData);

        // 初始化自定义列弹窗
        this.modals.columns = new ColumnsModal({
            allConfigurations: this.allConfigurations,
            visibleColumns: this.visibleColumns,
            VISIBLE_COLUMNS_KEY: this.VISIBLE_COLUMNS_KEY
        });
        this.modals.columns.init();

        console.log('[TalentSelectionApp] 模块初始化完成');
    }

    setupEventListeners() {
        // 监听筛选应用事件
        document.addEventListener('filtersApplied', this.handleFiltersApplied);

        // 监听达人选择/取消选择事件
        document.addEventListener('talentSelected', this.handleTalentSelected);
        document.addEventListener('talentDeselected', this.handleTalentDeselected);

        // 监听添加多次合作事件
        document.addEventListener('addAnotherCollaboration', (e) => {
            const talentId = e.detail.talentId;
            const talent = this.richTalentData.find(t => t.id === talentId);
            if (talent) {
                this.addCollaborationToList(talent);
                this.modules.selectionPanel.updateCollaborations(this.selectedCollaborations);
                this.modules.selectionPanel.renderSelectionList();
            }
        });

        // 监听打开批量录入弹窗事件
        document.addEventListener('openBatchImportModal', (e) => {
            this.modals.batchImport.open(this.selectedCollaborations);
        });

        // 监听打开自定义列弹窗事件
        document.addEventListener('openColumnsModal', () => {
            this.modals.columns.open();
        });

        // 监听列配置更新事件
        document.addEventListener('columnsUpdated', (e) => {
            this.visibleColumns = e.detail.visibleColumns;
            this.modules.talentTable.updateVisibleColumns(this.visibleColumns);
            this.modules.talentTable.render();
        });

        // 监听批量录入成功事件
        document.addEventListener('importSuccess', (e) => {
            // 清空选择列表
            this.selectedCollaborations = [];
            this.modules.selectionPanel.updateCollaborations([]);
            this.modules.selectionPanel.renderSelectionList();
            this.modules.talentTable.clearAllSelections();

            // 更新项目快照
            if (e.detail.projectId) {
                this.modules.selectionPanel.renderProjectSnapshot(e.detail.projectId);
            }
        });

        // 监听数据刷新事件
        document.addEventListener('refreshData', this.handleRefreshData);

        console.log('[TalentSelectionApp] 事件监听设置完成');
    }

    handleFiltersApplied(e) {
        this.displayedTalents = e.detail.filteredTalents;
        this.modules.talentTable.updateDisplayedTalents(this.displayedTalents);
        this.modules.talentTable.render();
        console.log(`[TalentSelectionApp] 筛选应用完成: ${this.displayedTalents.length} 位达人`);
    }

    handleTalentSelected(e) {
        const talent = e.detail.talent;
        const exists = this.selectedCollaborations.find(c => {
            const cTalentId = c.talent?.id;
            return cTalentId === talent.id;
        });
        if (!exists) {
            this.addCollaborationToList(talent);
            this.modules.selectionPanel.updateCollaborations(this.selectedCollaborations);
            this.modules.selectionPanel.renderSelectionList();
        }
    }

    handleTalentDeselected(e) {
        const { talentId, tempId } = e.detail;

        if (tempId) {
            // Remove specific collaboration by tempId
            this.selectedCollaborations = this.selectedCollaborations.filter(c => c._tempId !== tempId);
        } else {
            // Remove all collaborations for this talent
            this.selectedCollaborations = this.selectedCollaborations.filter(c => {
                const cTalentId = c.talent?.id;
                return cTalentId !== talentId;
            });
        }

        this.modules.selectionPanel.updateCollaborations(this.selectedCollaborations);
        this.modules.selectionPanel.renderSelectionList();
    }

    addCollaborationToList(talent) {
        const newCollab = {
            _tempId: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            talent: talent
        };
        this.selectedCollaborations.push(newCollab);
    }

    async handleRefreshData() {
        console.log('[TalentSelectionApp] 刷新数据');
        await this.loadData();
        this.modules.filterPanel.updateData(this.richTalentData);
        this.modals.batchImport.updateRichTalentData(this.richTalentData);
        this.modules.filterPanel.applyFiltersAndRender();
    }

    populateProjectSelect() {
        if (!this.targetProjectSelect) return;

        this.targetProjectSelect.innerHTML = '<option value="">-- 请选择一个项目 --</option>';
        const activeProjects = this.allProjects.filter(p => p.status === '执行中' || !p.status);
        activeProjects.forEach(p => {
            this.targetProjectSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
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
            this.modals.alert.show(`操作失败: ${error.message}`);
            throw error;
        }
    }
}
