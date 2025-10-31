/**
 * main.js - Talent Pool 主控制器
 * 基于 talent_pool.js v6.2.1
 */

import { AppCore } from '../common/app-core.js';
import { TableManager } from './table-manager.js';
import { CrudModal } from './modal-crud.js';
import { PriceModal } from './modal-price.js';
import { RebateModal } from './modal-rebate.js';
import { HistoryModal } from './modal-history.js';
import { BatchModal } from './modal-batch.js';

export class TalentPoolApp {
    constructor() {
        // API 配置
        this.API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
        this.API_PATHS = {
            search: '/talents/search',
            delete: '/delete-talent',
            createSingle: '/talents',
            updateSingle: '/update-talent',
            getByIds: '/talents/by-ids',
            bulkCreate: '/talents/bulk-create',
            bulkUpdate: '/talents/bulk-update',
            batchUpdate: '/talents/batch-update',
            exportAll: '/talents/export-all',
            getProjects: '/projects?view=simple',
            getCollaborations: '/collaborations?allowGlobal=true&statuses=' + encodeURIComponent('客户已定档,视频已发布'),
            getFilterOptions: '/talents/filter-options'
        };

        // 状态管理
        this.currentTalentData = [];
        this.allProjects = [];
        this.allCollaborations = new Map();
        this.talentTypes = new Set();
        this.talentTiers = new Set();
        this.selectedTalents = new Set();
        this.totalFilteredItems = 0;
        this.confirmCallback = null;

        // 常量
        this.DEFAULT_TIERS = ['头部达人', '重点达人', '常规达人-机构', '常规达人-野生'];
        this.ITEMS_PER_PAGE_KEY = 'talentPoolItemsPerPage';
        this.TALENT_TYPES_KEY = 'talentTypeDictionary';
        this.TALENT_TIER_KEY = 'talentTierDictionary';
        this.REBATE_DISPLAY_LIMIT = 2;

        // 查询状态（v6.2.1 含 priceType）
        this.queryState = {
            page: 1,
            pageSize: 10,
            search: '',
            tiers: [],
            types: [],
            rebateMin: null,
            rebateMax: null,
            priceYear: null,
            priceMonth: null,
            priceType: null,  // v6.2 新增
            priceMin: null,
            priceMax: null,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };

        // DOM 元素
        this.elements = {
            toast: null,
            confirmModal: null,
            confirmModalText: null,
            confirmModalCancelBtn: null,
            confirmModalConfirmBtn: null,
            settingsBtn: null,
            settingsModal: null,
            closeSettingsModalBtn: null,
            settingsModalTabs: null,
            addTierForm: null,
            newTierNameInput: null,
            tierList: null,
            addTypeForm: null,
            newTypeNameInput: null,
            typeList: null,
            addTalentBtn: null,
            moreActionsBtn: null,
            moreActionsMenu: null,
            batchUpdateBtn: null,
            bulkImportBtn: null,
            importForUpdateBtn: null,
            exportAllBtn: null,
            exportForUpdateBtn: null,
            downloadTemplateBtn: null
        };

        // 子模块
        this.tableManager = null;
        this.crudModal = null;
        this.priceModal = null;
        this.rebateModal = null;
        this.historyModal = null;
        this.batchModal = null;
    }

    async init() {
        console.log('[TalentPoolApp] 初始化...');
        this.cacheElements();
        this.bindEvents();
        this.queryState.pageSize = parseInt(localStorage.getItem(this.ITEMS_PER_PAGE_KEY) || '10');
        await this.loadConfigurations();
        this.initModules();
        await this.fetchTalents();
    }

    cacheElements() {
        this.elements.toast = document.getElementById('toast-notification');
        this.elements.confirmModal = document.getElementById('confirm-modal');
        this.elements.confirmModalText = document.getElementById('confirm-modal-text');
        this.elements.confirmModalCancelBtn = document.getElementById('confirm-modal-cancel');
        this.elements.confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm');
        this.elements.settingsBtn = document.getElementById('settings-btn');
        this.elements.settingsModal = document.getElementById('settings-modal');
        this.elements.closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
        this.elements.settingsModalTabs = document.getElementById('settings-modal-tabs');
        this.elements.addTierForm = document.getElementById('add-tier-form');
        this.elements.newTierNameInput = document.getElementById('new-tier-name');
        this.elements.tierList = document.getElementById('tier-list');
        this.elements.addTypeForm = document.getElementById('add-type-form');
        this.elements.newTypeNameInput = document.getElementById('new-type-name');
        this.elements.typeList = document.getElementById('type-list');
        this.elements.addTalentBtn = document.getElementById('add-talent-btn');
        this.elements.moreActionsBtn = document.getElementById('more-actions-btn');
        this.elements.moreActionsMenu = document.getElementById('more-actions-menu');
        this.elements.batchUpdateBtn = document.getElementById('batch-update-btn');
        this.elements.bulkImportBtn = document.getElementById('bulk-import-btn');
        this.elements.importForUpdateBtn = document.getElementById('import-for-update-btn');
        this.elements.exportAllBtn = document.getElementById('export-all-btn');
        this.elements.exportForUpdateBtn = document.getElementById('export-for-update-btn');
        this.elements.downloadTemplateBtn = document.getElementById('download-template-btn');
    }

    bindEvents() {
        // 确认弹窗
        this.elements.confirmModalCancelBtn?.addEventListener('click', () => this.closeConfirmModal());
        this.elements.confirmModalConfirmBtn?.addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
        });

        // 设置 Modal
        this.elements.settingsBtn?.addEventListener('click', () => this.openSettingsModal());
        this.elements.closeSettingsModalBtn?.addEventListener('click', () => this.closeSettingsModal());
        this.elements.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) this.closeSettingsModal();
        });

        // 设置 Tab 切换
        this.elements.settingsModalTabs?.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab-target]')) {
                this.switchSettingsTab(e.target.dataset.tabTarget);
            }
        });

        // 层级管理
        this.elements.addTierForm?.addEventListener('submit', (e) => this.handleAddTier(e));
        this.elements.tierList?.addEventListener('click', (e) => this.handleDeleteTier(e));

        // 标签管理
        this.elements.addTypeForm?.addEventListener('submit', (e) => this.handleAddType(e));
        this.elements.typeList?.addEventListener('click', (e) => this.handleDeleteType(e));

        // 更多操作菜单
        this.elements.moreActionsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.moreActionsMenu?.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
            if (!this.elements.moreActionsMenu?.classList.contains('hidden')) {
                this.elements.moreActionsMenu?.classList.add('hidden');
            }
        });

        // 新增达人按钮
        this.elements.addTalentBtn?.addEventListener('click', () => {
            this.crudModal?.open();
        });

        // 批量操作按钮
        this.elements.batchUpdateBtn?.addEventListener('click', () => {
            this.batchModal?.openBatchUpdate();
        });
        this.elements.bulkImportBtn?.addEventListener('click', () => {
            this.batchModal?.openBulkImport();
        });
        this.elements.importForUpdateBtn?.addEventListener('click', () => {
            this.batchModal?.openImportForUpdate();
        });
        this.elements.exportAllBtn?.addEventListener('click', (e) => {
            this.batchModal?.handleExportAll(e);
        });
        this.elements.exportForUpdateBtn?.addEventListener('click', () => {
            this.batchModal?.handleExportForUpdate();
        });
        this.elements.downloadTemplateBtn?.addEventListener('click', () => {
            this.batchModal?.handleDownloadTemplate();
        });
    }

    initModules() {
        this.tableManager = new TableManager(this);
        this.tableManager.init();

        this.crudModal = new CrudModal(this);
        this.crudModal.init();

        this.priceModal = new PriceModal(this);
        this.priceModal.init();

        this.rebateModal = new RebateModal(this);
        this.rebateModal.init();

        this.historyModal = new HistoryModal(this);
        this.historyModal.init();

        this.batchModal = new BatchModal(this);
        this.batchModal.init();
    }

    async loadConfigurations() {
        try {
            const [filterOptionsResponse, projectsResponse, collabsResponse] = await Promise.all([
                this.apiRequest(this.API_PATHS.getFilterOptions),
                this.apiRequest(this.API_PATHS.getProjects),
                this.apiRequest(this.API_PATHS.getCollaborations)
            ]);

            if (filterOptionsResponse.success && filterOptionsResponse.data) {
                this.talentTiers = new Set(filterOptionsResponse.data.tiers);
                this.talentTypes = new Set(filterOptionsResponse.data.types);
                localStorage.setItem(this.TALENT_TIER_KEY, JSON.stringify(Array.from(this.talentTiers)));
                localStorage.setItem(this.TALENT_TYPES_KEY, JSON.stringify(Array.from(this.talentTypes)));
            } else {
                throw new Error('Filter options API did not return success or data.');
            }

            this.allProjects = projectsResponse.data || [];
            const collaborations = collabsResponse.data || [];
            this.allCollaborations.clear();

            console.log('[TalentPool Debug] API 返回的合作记录总数:', collaborations.length);
            console.log('[TalentPool Debug] API 返回的第一条合作记录:', collaborations[0]);
            if (collaborations[0]) {
                console.log('[TalentPool Debug] 第一条记录的所有字段:', Object.keys(collaborations[0]));
            }

            collaborations.forEach(c => {
                // 尝试多种可能的字段名
                const talentIdValue = c.talentId || c.talent_id || c.talentID;

                if (!this.allCollaborations.has(talentIdValue)) {
                    this.allCollaborations.set(talentIdValue, []);
                }
                this.allCollaborations.get(talentIdValue).push(c);
            });

            console.log('[TalentPool Debug] allCollaborations Map 大小:', this.allCollaborations.size);
            console.log('[TalentPool Debug] allCollaborations 所有 keys:', Array.from(this.allCollaborations.keys()));

        } catch (error) {
            console.error('加载配置数据失败', error);
            this.showToast('加载在线配置失败，尝试使用本地缓存。', true);
            const savedTiers = JSON.parse(localStorage.getItem(this.TALENT_TIER_KEY)) || this.DEFAULT_TIERS;
            this.talentTiers = new Set(savedTiers);
            const savedTypes = JSON.parse(localStorage.getItem(this.TALENT_TYPES_KEY)) || [];
            this.talentTypes = new Set(savedTypes);
        }
    }

    buildSearchPayload() {
        const payload = { ...this.queryState };
        if (payload.tiers && payload.tiers.length === 0) delete payload.tiers;
        if (payload.types && payload.types.length === 0) delete payload.types;
        return payload;
    }

    async fetchTalents() {
        this.tableManager?.setLoadingState(true);
        const payload = this.buildSearchPayload();

        try {
            const response = await this.apiRequest(this.API_PATHS.search, 'POST', payload);
            if (response.success && response.data) {
                const { talents, pagination } = response.data;
                this.currentTalentData = talents;
                this.totalFilteredItems = pagination.totalItems;
                this.tableManager?.render(talents, pagination);
            } else {
                throw new Error(response.message || '返回数据格式不正确');
            }
        } catch (error) {
            this.tableManager?.showError(`获取达人数据失败: ${error.message}`);
        }
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.API_BASE_URL}${endpoint}`;
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
            console.error(`API request failed: ${method} ${endpoint}`, error);
            this.showToast(`操作失败: ${error.message}`, true);
            throw error;
        }
    }

    showToast(message, isError = false) {
        if (!this.elements.toast) return;
        this.elements.toast.textContent = message;
        this.elements.toast.className = `fixed bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
        this.elements.toast.style.opacity = 1;
        this.elements.toast.style.visibility = 'visible';
        setTimeout(() => {
            this.elements.toast.style.opacity = 0;
            this.elements.toast.style.visibility = 'hidden';
        }, 3000);
    }

    openConfirmModal(text, callback) {
        if (!this.elements.confirmModal) return;
        if (this.elements.confirmModalText) this.elements.confirmModalText.textContent = text;
        this.confirmCallback = callback;
        this.elements.confirmModal.classList.remove('hidden');
    }

    closeConfirmModal() {
        if (this.elements.confirmModal) {
            this.elements.confirmModal.classList.add('hidden');
        }
        this.confirmCallback = null;
    }

    openSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.remove('hidden');
        }
        this.renderTierManager();
        this.renderTypeManager();
    }

    closeSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('hidden');
        }
        this.tableManager?.populateFilterCheckboxes();
    }

    switchSettingsTab(tabName) {
        document.querySelectorAll('[data-tab-target]').forEach(tab => tab.classList.remove('active-tab'));
        document.querySelectorAll('[data-tab-content]').forEach(content => content.classList.add('hidden'));
        document.querySelector(`[data-tab-target="${tabName}"]`)?.classList.add('active-tab');
        document.querySelector(`[data-tab-content="${tabName}"]`)?.classList.remove('hidden');
    }

    renderTierManager() {
        if (!this.elements.tierList) return;
        this.elements.tierList.innerHTML = '';
        Array.from(this.talentTiers).forEach(tier => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
            item.innerHTML = `<span>${tier}</span><button data-tier="${tier}" class="delete-tier-btn text-red-500 hover:text-red-700 text-xs">删除</button>`;
            this.elements.tierList.appendChild(item);
        });
    }

    renderTypeManager() {
        if (!this.elements.typeList) return;
        this.elements.typeList.innerHTML = '';
        Array.from(this.talentTypes).forEach(type => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm';
            item.innerHTML = `<span>${type}</span><button data-type="${type}" class="delete-type-btn text-red-500 hover:text-red-700 text-xs">删除</button>`;
            this.elements.typeList.appendChild(item);
        });
    }

    handleAddTier(e) {
        e.preventDefault();
        if (!this.elements.newTierNameInput) return;
        const newTier = this.elements.newTierNameInput.value.trim();
        if (newTier && !this.talentTiers.has(newTier)) {
            this.talentTiers.add(newTier);
            localStorage.setItem(this.TALENT_TIER_KEY, JSON.stringify(Array.from(this.talentTiers)));
            this.renderTierManager();
            this.elements.newTierNameInput.value = '';
            this.showToast('层级已添加');
        }
    }

    handleDeleteTier(e) {
        if (!e.target.classList.contains('delete-tier-btn')) return;
        const tier = e.target.dataset.tier;
        this.talentTiers.delete(tier);
        localStorage.setItem(this.TALENT_TIER_KEY, JSON.stringify(Array.from(this.talentTiers)));
        this.renderTierManager();
        this.showToast('层级已删除');
    }

    handleAddType(e) {
        e.preventDefault();
        if (!this.elements.newTypeNameInput) return;
        const newType = this.elements.newTypeNameInput.value.trim();
        if (newType && !this.talentTypes.has(newType)) {
            this.talentTypes.add(newType);
            localStorage.setItem(this.TALENT_TYPES_KEY, JSON.stringify(Array.from(this.talentTypes)));
            this.renderTypeManager();
            this.elements.newTypeNameInput.value = '';
            this.showToast('标签已添加');
        }
    }

    handleDeleteType(e) {
        if (!e.target.classList.contains('delete-type-btn')) return;
        const type = e.target.dataset.type;
        this.talentTypes.delete(type);
        localStorage.setItem(this.TALENT_TYPES_KEY, JSON.stringify(Array.from(this.talentTypes)));
        this.renderTypeManager();
        this.showToast('标签已删除');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new TalentPoolApp();
    app.init();
});
