/**
 * @module main
 * @description 主入口模块，负责初始化应用和协调各模块
 * @version 2.0.0
 */

import { API_ENDPOINTS, EXPORT_ENTITIES } from './constants.js';
import { getRequest, postRequest } from './api.js';
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
    clearDimensions,
    getSelectedDimensionIds,
    updatePreviewData,
    clearPreviewData as clearStatePreviewData
} from './state-manager.js';
import { renderFilters } from './filter-renderer.js';
import { buildExportPayload, generateExcelFile } from './export-handler.js';
import { initializeDimensionModal, updateDimensionsPreview } from './modal-dimensions.js';
import { renderPreviewTable, initializeTablePreview, clearPreviewData } from './table-preview.js';
import { preloadAllDynamicDimensions } from './dimension-config.js';
import { preloadMetadata } from './field-metadata.js';

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
        // 加载和主体选择
        loadingOverlay: document.getElementById('loading-overlay'),
        entitySelection: document.getElementById('entity-selection'),
        filtersContainer: document.getElementById('filters-container'),

        // 导出设置
        exportFilenameInput: document.getElementById('export-filename'),
        exportTimeMonthInput: document.getElementById('export-time-month'),

        // Tab 元素
        configTab: document.getElementById('config-tab'),
        previewTab: document.getElementById('preview-tab'),

        // 配置 Tab 按钮
        generatePreviewBtn: document.getElementById('generate-preview-btn'),
        previewBtnText: document.getElementById('preview-btn-text'),
        previewBtnLoader: document.getElementById('preview-btn-loader'),

        // 预览 Tab 按钮
        backToConfigBtn: document.getElementById('back-to-config-btn'),
        refreshPreviewBtn: document.getElementById('refresh-preview-btn'),
        exportExcelBtn: document.getElementById('export-excel-btn'),
        exportExcelText: document.getElementById('export-excel-text'),
        exportExcelLoader: document.getElementById('export-excel-loader')
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
        // 启用智能维度管理系统（动态加载+静态降级）
        console.log('[Main] 启用智能维度管理系统');

        // 并行加载筛选选项、项目列表和字段元数据
        const [filterOptsRes, projectsRes] = await Promise.all([
            getRequest(API_ENDPOINTS.filters),
            getRequest(API_ENDPOINTS.projects),
            // 预加载字段元数据（用于智能维度管理）
            preloadMetadata().catch(err => {
                console.warn('[Main] 预加载字段元数据失败，将使用静态配置:', err);
            }),
            // 预加载所有实体的动态维度配置
            preloadAllDynamicDimensions().catch(err => {
                console.warn('[Main] 预加载动态维度失败，将使用静态配置:', err);
            })
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
        console.log('[Main] 智能维度管理系统已初始化（动态优先+完整降级）');

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

    // Tab 切换事件
    setupTabListeners();

    // 配置 Tab：生成预览按钮
    if (DOM_ELEMENTS.generatePreviewBtn) {
        DOM_ELEMENTS.generatePreviewBtn.addEventListener('click', handleGeneratePreview);
    }

    // 预览 Tab：返回配置按钮
    if (DOM_ELEMENTS.backToConfigBtn) {
        DOM_ELEMENTS.backToConfigBtn.addEventListener('click', () => switchTab('config-tab'));
    }

    // 预览 Tab：刷新数据按钮
    if (DOM_ELEMENTS.refreshPreviewBtn) {
        DOM_ELEMENTS.refreshPreviewBtn.addEventListener('click', handleGeneratePreview);
    }

    // 预览 Tab：导出 Excel 按钮
    if (DOM_ELEMENTS.exportExcelBtn) {
        DOM_ELEMENTS.exportExcelBtn.addEventListener('click', handleExportExcel);
    }

    // 初始化维度管理模态框
    initializeDimensionModal();

    // 初始化表格预览模块
    initializeTablePreview();

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

        // 清空预览数据
        clearPreviewData();
        clearStatePreviewData();
    }
}

/**
 * 设置 Tab 切换监听器
 */
function setupTabListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            switchTab(targetTab);
        });
    });
}

/**
 * 切换 Tab
 * @param {string} tabId - Tab ID
 */
function switchTab(tabId) {
    // 更新 Tab 按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 更新 Tab 内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

/**
 * 处理生成预览按钮点击
 */
async function handleGeneratePreview() {
    console.log('Generate preview button clicked');

    // 验证是否选择了维度
    const selectedFields = getSelectedDimensionIds();
    if (selectedFields.length === 0) {
        showToast('请至少选择一个要导出的数据维度', false);
        return;
    }

    // 设置加载状态
    setButtonLoading(DOM_ELEMENTS.generatePreviewBtn, DOM_ELEMENTS.previewBtnText, DOM_ELEMENTS.previewBtnLoader, true, '生成中...');

    try {
        // 构建请求 payload
        const payload = buildExportPayload(DOM_ELEMENTS.exportTimeMonthInput.value);

        // 发送请求获取数据
        const response = await postRequest(API_ENDPOINTS.export, payload);

        // 验证响应
        if (!response.success || !response.data) {
            throw new Error(response.message || '后端返回数据为空');
        }

        if (response.data.length === 0) {
            showToast('没有找到符合筛选条件的数据', false);
            clearPreviewData();
            clearStatePreviewData();
            return;
        }

        // 保存预览数据到状态
        updatePreviewData(response.data);

        // 渲染预览表格（异步，支持动态字段映射）
        await renderPreviewTable(response.data, selectedFields);

        // 切换到预览 Tab
        switchTab('preview-tab');

        showToast(`成功加载 ${response.data.length} 条数据`, true);

    } catch (error) {
        console.error('Generate preview failed:', error);
        showToast(`生成预览失败: ${error.message}`, false);
    } finally {
        setButtonLoading(DOM_ELEMENTS.generatePreviewBtn, DOM_ELEMENTS.previewBtnText, DOM_ELEMENTS.previewBtnLoader, false);
    }
}

/**
 * 处理导出 Excel 按钮点击
 */
async function handleExportExcel() {
    console.log('Export Excel button clicked');

    // 验证是否有预览数据
    const selectedFields = getSelectedDimensionIds();
    if (selectedFields.length === 0) {
        showToast('请先选择要导出的数据维度', false);
        return;
    }

    // 设置加载状态
    setButtonLoading(DOM_ELEMENTS.exportExcelBtn, DOM_ELEMENTS.exportExcelText, DOM_ELEMENTS.exportExcelLoader, true, '导出中...');

    try {
        // 构建请求 payload
        const payload = buildExportPayload(DOM_ELEMENTS.exportTimeMonthInput.value);

        // 发送请求获取完整数据
        const response = await postRequest(API_ENDPOINTS.export, payload);

        // 验证响应
        if (!response.success || !response.data) {
            throw new Error(response.message || '后端返回数据为空');
        }

        if (response.data.length === 0) {
            showToast('没有可导出的数据', false);
            return;
        }

        // 生成文件名
        const filename = DOM_ELEMENTS.exportFilenameInput.value || '数据导出报表';
        const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

        // 生成并下载 Excel
        await generateExcelFile(response.data, selectedFields, fullFilename);

        showToast(`导出成功！文件已保存为: ${fullFilename}`, true);

    } catch (error) {
        console.error('Export Excel failed:', error);
        showToast(`导出失败: ${error.message}`, false);
    } finally {
        setButtonLoading(DOM_ELEMENTS.exportExcelBtn, DOM_ELEMENTS.exportExcelText, DOM_ELEMENTS.exportExcelLoader, false);
    }
}

/**
 * 设置按钮加载状态
 * @param {HTMLButtonElement} button - 按钮元素
 * @param {HTMLElement} textElement - 文本元素
 * @param {HTMLElement} loaderElement - 加载器元素
 * @param {boolean} isLoading - 是否加载中
 * @param {string} loadingText - 加载中显示的文本
 */
function setButtonLoading(button, textElement, loaderElement, isLoading, loadingText = '') {
    if (!button) return;

    button.disabled = isLoading;

    if (textElement) {
        if (isLoading && loadingText) {
            textElement.textContent = loadingText;
        } else if (!isLoading) {
            // 恢复原始文本
            if (button.id === 'generate-preview-btn') {
                textElement.textContent = '生成数据预览';
            } else if (button.id === 'export-excel-btn') {
                textElement.textContent = '导出 Excel';
            }
        }
    }

    if (loaderElement) {
        if (isLoading) {
            loaderElement.classList.remove('hidden');
        } else {
            loaderElement.classList.add('hidden');
        }
    }
}

/**
 * 处理键盘快捷键
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + P: 生成预览
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        handleGeneratePreview();
    }

    // Ctrl/Cmd + E: 触发导出（在预览 Tab 中）
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        const previewTab = document.getElementById('preview-tab');
        if (previewTab && previewTab.classList.contains('active')) {
            handleExportExcel();
        }
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
    clearPreviewData();
    clearStatePreviewData();

    // 重新渲染当前实体的UI
    const currentEntity = getSelectedEntity();
    renderUIForEntity(currentEntity);

    // 切换回配置 Tab
    switchTab('config-tab');

    showToast('已清空所有选择', true);
}

/**
 * 显示/隐藏加载状态（用于初始化）
 * @param {boolean} isLoading - 是否显示加载状态
 * @param {string} message - 加载消息
 */
function showLoadingState(isLoading, message = '') {
    if (DOM_ELEMENTS.loadingOverlay) {
        if (isLoading) {
            DOM_ELEMENTS.loadingOverlay.classList.remove('hidden');
        } else {
            DOM_ELEMENTS.loadingOverlay.classList.add('hidden');
        }
    }
}

/**
 * 显示初始化错误
 */
function showInitializationError() {
    if (DOM_ELEMENTS.filtersContainer) {
        DOM_ELEMENTS.filtersContainer.innerHTML =
            '<p class="text-red-500 text-center p-4">页面初始化失败，请刷新重试。</p>';
    }
    showToast('页面初始化失败，请刷新重试', false);
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