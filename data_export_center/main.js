/**
 * @module main
 * @description 主入口模块，负责初始化应用和协调各模块
 * @version 2.0.0
 */

import { API_ENDPOINTS, EXPORT_ENTITIES } from './constants.js';
import { getRequest } from './api.js';
import {
    checkXLSXLibrary,
    getDefaultTimeMonth,
    setLoadingState,
    showToast
} from './utils.js';
import {
    updateSelectedEntity,
    updateInitialConfigs,
    getSelectedEntity,
    clearFilters,
    clearDimensions
} from './state-manager.js';
import { renderFilters } from './filter-renderer.js';
import { renderDimensions } from './dimension-renderer.js';
import { handleExport } from './export-handler.js';
import { initializeDimensionModal, updateDimensionsPreview } from './modal-dimensions.js';

// DOM元素缓存
let DOM_ELEMENTS = {};

/**
 * 应用初始化函数
 */
async function initializeApp() {
    console.log('Initializing Data Export Center v2.0...');

    // 缓存DOM元素
    if (!cacheDOMElements()) {
        console.error('Failed to cache DOM elements');
        return;
    }

    // 检查XLSX库
    if (!checkXLSXLibrary()) {
        return;
    }

    // 设置默认时间月份
    setDefaultTimeMonth();

    // 显示加载状态
    showLoadingState(true, '正在初始化页面配置...');

    try {
        // 加载初始配置
        await loadInitialConfigs();

        // 渲染默认实体的UI（达人）
        renderUIForEntity(EXPORT_ENTITIES.TALENT);

        // 设置事件监听器
        setupEventListeners();

        console.log('Application initialized successfully');

    } catch (error) {
        console.error('Initialization failed:', error);
        showInitializationError();
    } finally {
        showLoadingState(false);
    }
}

/**
 * 缓存DOM元素引用
 * @returns {boolean} 是否成功缓存所有必需元素
 */
function cacheDOMElements() {
    DOM_ELEMENTS = {
        loadingOverlay: document.getElementById('loading-overlay'),
        entitySelection: document.getElementById('entity-selection'),
        filtersContainer: document.getElementById('filters-container'),
        dimensionsContainer: document.getElementById('dimensions-container'),
        exportFilenameInput: document.getElementById('export-filename'),
        exportTimeMonthInput: document.getElementById('export-time-month'),
        generateExportBtn: document.getElementById('generate-export-btn'),
        exportBtnText: document.getElementById('export-btn-text'),
        exportBtnLoader: document.getElementById('export-btn-loader')
    };

    // 验证所有元素是否存在
    const missingElements = Object.entries(DOM_ELEMENTS)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements);
        return false;
    }

    return true;
}

/**
 * 设置默认时间月份
 */
function setDefaultTimeMonth() {
    if (DOM_ELEMENTS.exportTimeMonthInput) {
        DOM_ELEMENTS.exportTimeMonthInput.value = getDefaultTimeMonth();
    }
}

/**
 * 加载初始配置数据
 * @returns {Promise<void>}
 */
async function loadInitialConfigs() {
    try {
        // 并行加载筛选选项和项目列表
        const [filterOptsRes, projectsRes] = await Promise.all([
            getRequest(API_ENDPOINTS.filters),
            getRequest(API_ENDPOINTS.projects)
        ]);

        const configs = {};

        // 处理筛选选项响应
        if (filterOptsRes.success) {
            configs.talentTiers = filterOptsRes.data.tiers || [];
            configs.talentTypes = filterOptsRes.data.types || [];
        }

        // 处理项目列表响应
        if (projectsRes.success) {
            configs.projects = projectsRes.data || [];
        }

        // 更新状态管理器
        updateInitialConfigs(configs);

        console.log('Initial configs loaded:', {
            tiers: configs.talentTiers.length,
            types: configs.talentTypes.length,
            projects: configs.projects.length
        });

    } catch (error) {
        console.error('Failed to load initial configs:', error);
        throw error;
    }
}

/**
 * 渲染指定实体的UI
 * @param {string} entity - 实体类型
 */
function renderUIForEntity(entity) {
    console.log(`Rendering UI for entity: ${entity}`);

    // 更新状态
    updateSelectedEntity(entity);

    // 清空之前的选择
    clearFilters();
    clearDimensions();

    // 渲染筛选器
    renderFilters(entity, DOM_ELEMENTS.filtersContainer);

    // 渲染维度（已废弃，现在使用模态框）
    // renderDimensions(entity, DOM_ELEMENTS.dimensionsContainer);

    // 更新维度预览区域
    updateDimensionsPreview();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 实体选择变更事件
    if (DOM_ELEMENTS.entitySelection) {
        DOM_ELEMENTS.entitySelection.addEventListener('change', handleEntityChange);
    }

    // 导出按钮点击事件
    if (DOM_ELEMENTS.generateExportBtn) {
        DOM_ELEMENTS.generateExportBtn.addEventListener('click', handleExportClick);
    }

    // 文件名输入框回车事件（可选）
    if (DOM_ELEMENTS.exportFilenameInput) {
        DOM_ELEMENTS.exportFilenameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleExportClick();
            }
        });
    }

    // 初始化维度管理模态框
    initializeDimensionModal();

    // 监听键盘快捷键（可选）
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * 处理实体选择变更
 * @param {Event} event - 变更事件
 */
function handleEntityChange(event) {
    if (event.target.name === 'export-entity' && event.target.checked) {
        const newEntity = event.target.value;
        console.log(`Entity changed to: ${newEntity}`);
        renderUIForEntity(newEntity);
    }
}

/**
 * 处理导出按钮点击
 */
async function handleExportClick() {
    console.log('Export button clicked');

    // 收集UI元素用于导出处理
    const uiElements = {
        loadingOverlay: DOM_ELEMENTS.loadingOverlay,
        exportButton: DOM_ELEMENTS.generateExportBtn,
        buttonText: DOM_ELEMENTS.exportBtnText,
        buttonLoader: DOM_ELEMENTS.exportBtnLoader,
        filenameInput: DOM_ELEMENTS.exportFilenameInput,
        timeMonthInput: DOM_ELEMENTS.exportTimeMonthInput
    };

    // 调用导出处理函数
    await handleExport(uiElements);
}

/**
 * 处理键盘快捷键
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + E: 触发导出
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        handleExportClick();
    }

    // Ctrl/Cmd + Shift + C: 清空所有选择
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        clearAllSelections();
    }
}

/**
 * 清空所有选择
 */
function clearAllSelections() {
    clearFilters();
    clearDimensions();

    // 重新渲染当前实体的UI
    const currentEntity = getSelectedEntity();
    renderUIForEntity(currentEntity);

    showToast('已清空所有选择', true);
}

/**
 * 显示/隐藏加载状态
 * @param {boolean} isLoading - 是否显示加载状态
 * @param {string} message - 加载消息
 */
function showLoadingState(isLoading, message = '') {
    setLoadingState(
        DOM_ELEMENTS.loadingOverlay,
        DOM_ELEMENTS.generateExportBtn,
        DOM_ELEMENTS.exportBtnText,
        DOM_ELEMENTS.exportBtnLoader,
        isLoading,
        message
    );
}

/**
 * 显示初始化错误
 */
function showInitializationError() {
    if (DOM_ELEMENTS.filtersContainer) {
        DOM_ELEMENTS.filtersContainer.innerHTML =
            '<p class="text-red-500 text-center p-4">页面初始化失败，请刷新重试。</p>';
    }
    if (DOM_ELEMENTS.dimensionsContainer) {
        DOM_ELEMENTS.dimensionsContainer.innerHTML = '';
    }
}

/**
 * 调试函数：获取当前应用状态（开发环境使用）
 * @returns {Object} 应用状态对象
 */
export function getAppState() {
    return {
        domElements: DOM_ELEMENTS,
        currentEntity: getSelectedEntity(),
        initialized: Boolean(DOM_ELEMENTS.loadingOverlay)
    };
}

/**
 * 重新初始化应用（用于热重载或错误恢复）
 */
export function reinitialize() {
    console.log('Reinitializing application...');

    // 清空状态
    clearFilters();
    clearDimensions();

    // 重新初始化
    initializeApp();
}

// 页面加载完成后初始化应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM已加载完成
    initializeApp();
}

// 导出函数供调试使用（可选）
if (typeof window !== 'undefined') {
    window.DataExportCenter = {
        getAppState,
        reinitialize,
        version: '2.0.0'
    };
}