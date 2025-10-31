/**
 * @file talent_pool/main.js
 * @description Talent Pool 页面主控制器
 * @version 1.0.0
 *
 * 职责:
 * - 页面初始化和协调
 * - 数据加载与状态管理
 * - API 配置和请求
 * - 模块间通信协调
 * - 全局通用功能（Toast、确认弹窗、设置Modal）
 *
 * 架构说明:
 * - 采用模块化设计，主控制器负责协调各个子模块
 * - 子模块包括：表格管理、CRUD、价格、返点、历史、批量操作
 * - 通过 this 引用传递，让子模块可以访问主控的状态和方法
 */

import { AppCore } from '../common/app-core.js';
import { TableManager } from './table-manager.js';
import { CrudModal } from './modal-crud.js';
import { PriceModal } from './modal-price.js';
import { RebateModal } from './modal-rebate.js';

const { API, Modal, Format, Utils } = AppCore;

export class TalentPoolApp {
    constructor() {
        // ========== API 配置 ==========
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
            getCollaborations: '/collaborations?allowGlobal=true',
            getFilterOptions: '/talents/filter-options'
        };

        // ========== 状态管理 ==========
        this.currentTalentData = [];
        this.allProjects = [];
        this.allCollaborations = new Map();
        this.talentTypes = new Set();
        this.talentTiers = new Set();
        this.selectedTalents = new Set();
        this.totalFilteredItems = 0;

        // 查询状态
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
            priceType: null,
            priceMin: null,
            priceMax: null,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };

        // ========== 常量配置 ==========
        this.ITEMS_PER_PAGE_KEY = 'talentPoolItemsPerPage';
        this.TALENT_TYPES_KEY = 'talentTypeDictionary';
        this.TALENT_TIER_KEY = 'talentTierDictionary';
        this.DEFAULT_TIERS = ['头部达人', '重点达人', '常规达人-机构', '常规达人-野生'];

        // ========== DOM 元素引用 ==========
        this.elements = {
            // 通用
            toast: null,

            // 确认弹窗
            confirmModal: null,
            confirmModalText: null,
            confirmModalCancelBtn: null,
            confirmModalConfirmBtn: null,

            // 设置 Modal
            settingsBtn: null,
            settingsModal: null,
            closeSettingsModalBtn: null,
            settingsModalTabs: null,

            // 层级管理
            addTierForm: null,
            newTierNameInput: null,
            tierList: null,

            // 标签管理
            addTypeForm: null,
            newTypeNameInput: null,
            typeList: null,

            // 顶部操作栏
            addTalentBtn: null,
            moreActionsBtn: null,
            moreActionsMenu: null
        };

        // ========== 子模块实例（待初始化） ==========
        this.tableManager = null;      // 表格管理模块
        this.crudModal = null;          // 新增/编辑 Modal
        this.priceModal = null;         // 价格管理 Modal
        this.rebateModal = null;        // 返点管理 Modal
        this.historyModal = null;       // 合作历史 Modal
        this.batchOperations = null;    // 批量操作模块

        // 确认弹窗回调
        this.confirmCallback = null;

        // 绑定方法的 this
        this.handleAddTier = this.handleAddTier.bind(this);
        this.handleDeleteTier = this.handleDeleteTier.bind(this);
        this.handleAddType = this.handleAddType.bind(this);
        this.handleDeleteType = this.handleDeleteType.bind(this);
    }

    // ========== 初始化方法 ==========
    async init() {
        console.log('[TalentPoolApp] 初始化开始...');

        // 1. 缓存 DOM 元素
        this.cacheElements();

        // 2. 绑定全局事件
        this.bindEvents();

        // 3. 加载配置（从 localStorage 或 API）
        this.queryState.pageSize = parseInt(localStorage.getItem(this.ITEMS_PER_PAGE_KEY) || '10');

        // 4. 加载配置数据
        await this.loadConfigurations();

        // 5. 初始化子模块
        this.initModules();

        // 6. 首次加载数据
        await this.fetchTalents();

        console.log('[TalentPoolApp] 初始化完成');
    }

    cacheElements() {
        // 通用
        this.elements.toast = document.getElementById('toast-notification');

        // 确认弹窗
        this.elements.confirmModal = document.getElementById('confirm-modal');
        this.elements.confirmModalText = document.getElementById('confirm-modal-text');
        this.elements.confirmModalCancelBtn = document.getElementById('confirm-modal-cancel');
        this.elements.confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm');

        // 设置
        this.elements.settingsBtn = document.getElementById('settings-btn');
        this.elements.settingsModal = document.getElementById('settings-modal');
        this.elements.closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
        this.elements.settingsModalTabs = document.getElementById('settings-modal-tabs');

        // 层级管理
        this.elements.addTierForm = document.getElementById('add-tier-form');
        this.elements.newTierNameInput = document.getElementById('new-tier-name');
        this.elements.tierList = document.getElementById('tier-list');

        // 标签管理
        this.elements.addTypeForm = document.getElementById('add-type-form');
        this.elements.newTypeNameInput = document.getElementById('new-type-name');
        this.elements.typeList = document.getElementById('type-list');

        // 顶部操作栏
        this.elements.addTalentBtn = document.getElementById('add-talent-btn');
        this.elements.moreActionsBtn = document.getElementById('more-actions-btn');
        this.elements.moreActionsMenu = document.getElementById('more-actions-menu');
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

        // 设置 Modal Tab 切换
        this.elements.settingsModalTabs?.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab-target]')) {
                this.switchSettingsTab(e.target.dataset.tabTarget);
            }
        });

        // 层级管理
        this.elements.addTierForm?.addEventListener('submit', this.handleAddTier);
        this.elements.tierList?.addEventListener('click', this.handleDeleteTier);

        // 标签管理
        this.elements.addTypeForm?.addEventListener('submit', this.handleAddType);
        this.elements.typeList?.addEventListener('click', this.handleDeleteType);

        // 更多操作菜单切换
        this.elements.moreActionsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.moreActionsMenu?.classList.toggle('hidden');
        });

        // 点击页面其他地方关闭菜单
        document.addEventListener('click', () => {
            if (!this.elements.moreActionsMenu?.classList.contains('hidden')) {
                this.elements.moreActionsMenu?.classList.add('hidden');
            }
        });

        // 新增达人按钮
        this.elements.addTalentBtn?.addEventListener('click', () => {
            console.log('[TalentPoolApp] 新增达人按钮点击');
            this.crudModal?.open();
        });
    }

    // ========== 初始化子模块 ==========
    initModules() {
        console.log('[TalentPoolApp] 初始化子模块...');

        // 初始化表格管理器
        this.tableManager = new TableManager(this);
        this.tableManager.init();

        // 初始化 CRUD Modal
        this.crudModal = new CrudModal(this);
        this.crudModal.init();

        // 初始化 Price Modal
        this.priceModal = new PriceModal(this);
        this.priceModal.init();

        // 初始化 Rebate Modal
        this.rebateModal = new RebateModal(this);
        this.rebateModal.init();

        // 其他模块（待后续添加）
        // this.historyModal = new HistoryModal(this);
        // this.batchOperations = new BatchOperations(this);
    }

    // ========== 数据加载 ==========
    async loadConfigurations() {
        try {
            const [filterOptionsResponse, projectsResponse, collabsResponse] = await Promise.all([
                this.apiRequest(this.API_PATHS.getFilterOptions),
                this.apiRequest(this.API_PATHS.getProjects),
                this.apiRequest(this.API_PATHS.getCollaborations)
            ]);

            // 处理筛选选项
            if (filterOptionsResponse.success && filterOptionsResponse.data) {
                this.talentTiers = new Set(filterOptionsResponse.data.tiers);
                this.talentTypes = new Set(filterOptionsResponse.data.types);
                localStorage.setItem(this.TALENT_TIER_KEY, JSON.stringify(Array.from(this.talentTiers)));
                localStorage.setItem(this.TALENT_TYPES_KEY, JSON.stringify(Array.from(this.talentTypes)));
            } else {
                throw new Error('Filter options API did not return success or data.');
            }

            // 处理项目数据
            this.allProjects = projectsResponse.data || [];

            // 处理合作历史数据
            const collaborations = collabsResponse.data || [];
            this.allCollaborations.clear();
            collaborations.forEach(c => {
                if (!this.allCollaborations.has(c.talentId)) {
                    this.allCollaborations.set(c.talentId, []);
                }
                this.allCollaborations.get(c.talentId).push(c);
            });

            console.log('[TalentPoolApp] 配置加载成功', {
                tiers: this.talentTiers.size,
                types: this.talentTypes.size,
                projects: this.allProjects.length,
                collaborations: collaborations.length
            });

        } catch (error) {
            console.error('[TalentPoolApp] 加载配置数据失败，尝试使用本地缓存', error);
            this.showToast('加载在线配置失败，尝试使用本地缓存。', true);

            // 使用本地缓存作为备用
            const savedTiers = JSON.parse(localStorage.getItem(this.TALENT_TIER_KEY)) || this.DEFAULT_TIERS;
            this.talentTiers = new Set(savedTiers);
            const savedTypes = JSON.parse(localStorage.getItem(this.TALENT_TYPES_KEY)) || [];
            this.talentTypes = new Set(savedTypes);

            // 仍然尝试加载项目和合作历史
            try {
                const [projectsResponse, collabsResponse] = await Promise.all([
                    this.apiRequest(this.API_PATHS.getProjects),
                    this.apiRequest(this.API_PATHS.getCollaborations)
                ]);
                this.allProjects = projectsResponse.data || [];
                const collaborations = collabsResponse.data || [];
                this.allCollaborations.clear();
                collaborations.forEach(c => {
                    if (!this.allCollaborations.has(c.talentId)) {
                        this.allCollaborations.set(c.talentId, []);
                    }
                    this.allCollaborations.get(c.talentId).push(c);
                });
            } catch (fallbackError) {
                console.error('[TalentPoolApp] 备用模式下加载项目/合作历史失败', fallbackError);
                this.showToast('加载项目与合作历史失败。', true);
            }
        }
    }

    async fetchTalents() {
        console.log('[TalentPoolApp] 开始获取达人数据...', this.queryState);

        // 显示加载状态
        if (this.tableManager) {
            this.tableManager.setLoadingState(true);
        }

        const payload = this.buildSearchPayload();

        try {
            const response = await this.apiRequest(this.API_PATHS.search, 'POST', payload);

            if (response.success && response.data) {
                const { talents, pagination } = response.data;
                this.currentTalentData = talents;
                this.totalFilteredItems = pagination.totalItems;

                console.log('[TalentPoolApp] 数据获取成功', {
                    count: talents.length,
                    total: pagination.totalItems,
                    page: pagination.currentPage
                });

                // 使用 tableManager 渲染表格
                if (this.tableManager) {
                    this.tableManager.render(talents, pagination);
                }

            } else {
                throw new Error(response.message || '返回数据格式不正确');
            }
        } catch (error) {
            console.error('[TalentPoolApp] 获取达人数据失败:', error);
            this.showToast(`获取达人数据失败: ${error.message}`, true);
        }
    }

    buildSearchPayload() {
        const payload = { ...this.queryState };

        // 删除空的数组，避免发送不必要的参数
        if (payload.tiers && payload.tiers.length === 0) delete payload.tiers;
        if (payload.types && payload.types.length === 0) delete payload.types;

        return payload;
    }

    // ========== 刷新数据（供子模块调用） ==========
    async refreshData() {
        await this.fetchTalents();
    }

    // ========== API 请求方法 ==========
    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: response.statusText
                }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            return text ? JSON.parse(text) : {};

        } catch (error) {
            console.error(`[TalentPoolApp] API 请求失败: ${method} ${endpoint}`, error);
            this.showToast(`操作失败: ${error.message}`, true);
            throw error;
        }
    }

    // ========== 通用工具方法 ==========
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

    openConfirmModal(text, onConfirm) {
        if (!this.elements.confirmModal) return;

        this.elements.confirmModalText.textContent = text;
        this.elements.confirmModal.classList.remove('hidden');
        this.confirmCallback = onConfirm;
    }

    closeConfirmModal() {
        if (this.elements.confirmModal) {
            this.elements.confirmModal.classList.add('hidden');
        }
        this.confirmCallback = null;
    }

    // ========== 设置 Modal 管理 ==========
    openSettingsModal() {
        if (!this.elements.settingsModal) return;

        this.elements.settingsModal.classList.remove('hidden');
        this.renderTierManager();
        this.renderTypeManager();
    }

    closeSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('hidden');
        }
    }

    switchSettingsTab(tabName) {
        // 切换 Tab 按钮状态
        const tabButtons = this.elements.settingsModalTabs?.querySelectorAll('.modal-tab-btn');
        tabButtons?.forEach(btn => {
            if (btn.dataset.tabTarget === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 切换 Tab 内容
        const tabPanes = document.querySelectorAll('.modal-tab-pane');
        tabPanes.forEach(pane => {
            if (pane.id === tabName) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });
    }

    renderTierManager() {
        if (!this.elements.tierList) return;

        const tiers = Array.from(this.talentTiers);
        this.elements.tierList.innerHTML = tiers.map(tier => `
            <div class="flex items-center justify-between p-3 border rounded-md bg-white hover:bg-gray-50">
                <span class="text-sm font-medium text-gray-700">${tier}</span>
                <button type="button" class="delete-tier-btn text-red-600 hover:text-red-800 text-sm" data-tier="${tier}">删除</button>
            </div>
        `).join('');
    }

    renderTypeManager() {
        if (!this.elements.typeList) return;

        const types = Array.from(this.talentTypes);
        this.elements.typeList.innerHTML = types.map(type => `
            <div class="flex items-center justify-between p-3 border rounded-md bg-white hover:bg-gray-50">
                <span class="text-sm font-medium text-gray-700">${type}</span>
                <button type="button" class="delete-type-btn text-red-600 hover:text-red-800 text-sm" data-type="${type}">删除</button>
            </div>
        `).join('');
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
            this.showToast('层级添加成功');
        }
    }

    handleDeleteTier(e) {
        if (!e.target.classList.contains('delete-tier-btn')) return;

        const tierToDelete = e.target.dataset.tier;
        this.openConfirmModal(`确定要删除层级 "${tierToDelete}" 吗？`, () => {
            this.talentTiers.delete(tierToDelete);
            localStorage.setItem(this.TALENT_TIER_KEY, JSON.stringify(Array.from(this.talentTiers)));
            this.renderTierManager();
            this.closeConfirmModal();
            this.showToast('层级删除成功');
        });
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
            this.showToast('标签添加成功');
        }
    }

    handleDeleteType(e) {
        if (!e.target.classList.contains('delete-type-btn')) return;

        const typeToDelete = e.target.dataset.type;
        this.openConfirmModal(`确定要删除标签 "${typeToDelete}" 吗？`, () => {
            this.talentTypes.delete(typeToDelete);
            localStorage.setItem(this.TALENT_TYPES_KEY, JSON.stringify(Array.from(this.talentTypes)));
            this.renderTypeManager();
            this.closeConfirmModal();
            this.showToast('标签删除成功');
        });
    }
}

// ========== 页面入口 ==========
// 注意：暂时保留传统的 DOMContentLoaded 方式启动
// 后续会改为 HTML 中的 type="module" 方式
document.addEventListener('DOMContentLoaded', async () => {
    const app = new TalentPoolApp();
    await app.init();

    // 将实例挂载到 window 上，方便调试
    window.talentPoolApp = app;
});

export default TalentPoolApp;
