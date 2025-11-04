# performance 页面模块化升级方案

> **页面名称**：达人数据看板（performance.js）
> **当前版本**：v12.10-style-centering
> **文件规模**：950 行
> **复杂度**：高 - 涉及数据看板、筛选器、导入导出、维度管理
> **升级目标**：拆分为 9 个职责清晰的模块

---

## 📋 目录

1. [页面功能分析](#页面功能分析)
2. [模块划分方案](#模块划分方案)
3. [文件结构设计](#文件结构设计)
4. [模块详细说明](#模块详细说明)
5. [模块间通信](#模块间通信)
6. [实施步骤](#实施步骤)
7. [技术要点](#技术要点)
8. [验收标准](#验收标准)

---

## 页面功能分析

### 核心功能区域

```
performance 页面（达人数据看板）
├── 顶部统计看板
│   ├── 总达人数统计
│   ├── 层级分布统计
│   ├── 60s+CPM 分布
│   ├── 男性观众占比分布
│   └── 女性观众占比分布
│
├── 筛选控制区
│   ├── 直接搜索（昵称、星图ID、UID）
│   ├── 达人类型筛选（复选框）
│   ├── 达人等级筛选（复选框）
│   └── 高级数据筛选（动态添加，多运算符）
│
├── 数据表格区
│   ├── 动态列配置（可自定义显示维度）
│   ├── 排序功能（多列排序）
│   ├── 分页控制
│   └── 数据展示（达人基础信息 + performanceData）
│
├── 导入导出功能
│   ├── Excel 导入（批量更新达人数据）
│   ├── 飞书导入（从飞书表格同步）
│   └── 导出全部数据（生成 Excel）
│
└── 维度管理弹窗
    ├── 维度配置（显示/隐藏、拖拽排序）
    ├── 中文名称映射
    └── LocalStorage 持久化
```

### 数据流向

```
初始化
  ↓
加载筛选器选项（类型、层级）
  ↓
加载维度配置（LocalStorage）
  ↓
获取达人数据（分页、排序、筛选）
  ↓
渲染统计看板
  ↓
渲染数据表格
  ↓
用户交互
  ├─ 筛选 → 重新获取数据
  ├─ 排序 → 重新获取数据
  ├─ 导入 → 批量更新 → 刷新数据
  └─ 导出 → 生成 Excel 文件
```

---

## 模块划分方案

### 推荐结构：主控制器 + 5个功能模块 + 3个工具模块

| 模块 | 文件名 | 职责 | 预估行数 |
|------|--------|------|----------|
| 📦 主控制器 | `main.js` | 页面初始化、模块协调、全局状态管理 | ~120 |
| 📊 统计看板模块 | `dashboard.js` | 统计数据计算与渲染 | ~100 |
| 🎛️ 筛选器模块 | `filter-panel.js` | 所有筛选条件管理、筛选逻辑 | ~180 |
| 📋 表格模块 | `table-renderer.js` | 表格渲染、排序、分页 | ~150 |
| 📥 导入导出模块 | `import-export.js` | Excel/飞书导入、数据导出 | ~200 |
| 🎨 维度管理弹窗 | `modal-dimensions.js` | 列配置、拖拽排序 | ~120 |
| 🔧 常量配置 | `constants.js` | API 端点、本地存储键、默认配置 | ~50 |
| 🛠️ 工具函数 | `utils.js` | 数据格式化、日期处理、通用函数 | ~80 |
| 🔗 API 处理 | `api-client.js` | API 请求封装、错误处理 | ~80 |

**总计**：~1080 行（模块化后代码量略增，但结构清晰）

---

## 文件结构设计

```
performance/
├── main.js                        # 主控制器（120行）
├── constants.js                   # 常量配置（50行）
├── utils.js                       # 工具函数（80行）
├── api-client.js                  # API客户端（80行）
├── dashboard.js                   # 统计看板模块（100行）
├── filter-panel.js                # 筛选器模块（180行）
├── table-renderer.js              # 表格渲染模块（150行）
├── import-export.js               # 导入导出模块（200行）
└── modal-dimensions.js            # 维度管理弹窗（120行）
```

### 文件命名规范
- ✅ 使用 kebab-case 命名
- ✅ 模块名称语义化，清晰表达职责
- ✅ 弹窗类模块以 `modal-` 前缀

---

## 模块详细说明

### 1️⃣ main.js（主控制器）

**职责**：
- 页面初始化入口
- 协调各模块生命周期
- 全局状态管理（currentPage、itemsPerPage、sortConfig、dataFilters）
- 模块间事件订阅与分发

**核心代码结构**：
```javascript
import { API_BASE_URL, ITEMS_PER_PAGE_KEY } from './constants.js';
import ApiClient from './api-client.js';
import Dashboard from './dashboard.js';
import FilterPanel from './filter-panel.js';
import TableRenderer from './table-renderer.js';
import ImportExportManager from './import-export.js';
import DimensionsModal from './modal-dimensions.js';

export class PerformanceApp {
    constructor() {
        this.state = {
            displayedTalents: [],
            totalTalents: 0,
            currentPage: 1,
            itemsPerPage: 20,
            sortConfig: { key: 'lastUpdated', direction: 'desc' },
            dataFilters: []
        };

        this.apiClient = new ApiClient(API_BASE_URL);
        this.dashboard = new Dashboard(this);
        this.filterPanel = new FilterPanel(this);
        this.tableRenderer = new TableRenderer(this);
        this.importExport = new ImportExportManager(this);
        this.dimensionsModal = new DimensionsModal(this);
    }

    async init() {
        this.loadUserPreferences();
        await this.filterPanel.loadFilterOptions();
        await this.fetchAndRenderTalents();
        this.setupEventListeners();
    }

    async fetchAndRenderTalents() {
        const payload = this.filterPanel.buildSearchPayload();
        const response = await this.apiClient.searchTalents(payload);

        this.state.displayedTalents = response.data.talents || [];
        this.state.totalTalents = response.data.total || 0;

        this.dashboard.render(response.data.dashboardStats);
        this.tableRenderer.render(this.state.displayedTalents);
        this.tableRenderer.renderPagination(
            Math.ceil(this.state.totalTalents / this.state.itemsPerPage),
            this.state.totalTalents
        );
    }

    setupEventListeners() {
        document.addEventListener('filtersChanged', () => this.fetchAndRenderTalents());
        document.addEventListener('pageChanged', (e) => {
            this.state.currentPage = e.detail.page;
            this.fetchAndRenderTalents();
        });
        document.addEventListener('sortChanged', (e) => {
            this.state.sortConfig = e.detail.sortConfig;
            this.fetchAndRenderTalents();
        });
    }

    unload() {
        this.dashboard.unload();
        this.filterPanel.unload();
        this.tableRenderer.unload();
        this.importExport.unload();
        this.dimensionsModal.unload();
    }
}
```

**对外接口**：
- `init()` - 初始化页面
- `fetchAndRenderTalents()` - 刷新数据
- `unload()` - 资源清理

---

### 2️⃣ constants.js（常量配置）

**职责**：
- 集中管理 API 端点
- 定义 LocalStorage 键名
- 配置默认参数

**代码结构**：
```javascript
// API Configuration
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

export const API_ENDPOINTS = {
    talentSearch: '/talents/search',
    talentFilterOptions: '/talents/filter-options',
    talentBulkUpdate: '/talents/bulk-update',
    feishuSync: '/sync-from-feishu'
};

// LocalStorage Keys
export const STORAGE_KEYS = {
    itemsPerPage: 'performanceItemsPerPage',
    dimensionsConfig: 'performanceDimensionsConfig'
};

// Default Configurations
export const DEFAULT_CONFIG = {
    itemsPerPage: 20,
    sortKey: 'lastUpdated',
    sortDirection: 'desc'
};

// Dimension Definitions (维度定义)
export const DIMENSION_DEFINITIONS = {
    // 基础信息
    nickname: { label: '达人昵称', category: 'basic' },
    xingtuId: { label: '星图ID', category: 'basic' },
    uid: { label: 'UID', category: 'basic' },
    talentTier: { label: '达人层级', category: 'basic' },
    talentType: { label: '达人类型', category: 'basic' },

    // 性能数据
    cpm60s: { label: '60s+CPM', category: 'performance' },
    audienceAge_18_23: { label: '18-23岁观众占比', category: 'performance' },
    audienceAge_24_30: { label: '24-30岁观众占比', category: 'performance' },
    audienceGender_male: { label: '男性观众占比', category: 'performance' },
    audienceGender_female: { label: '女性观众占比', category: 'performance' },
    // ... 更多维度定义
};

// Filter Operators (筛选运算符)
export const FILTER_OPERATORS = [
    { value: '>', label: '大于 >' },
    { value: '>=', label: '大于等于 >=' },
    { value: '<', label: '小于 <' },
    { value: '<=', label: '小于等于 <=' },
    { value: '==', label: '等于 ==' },
    { value: 'contains', label: '包含' },
    { value: 'isEmpty', label: '为空' },
    { value: 'isNotEmpty', label: '不为空' }
];
```

---

### 3️⃣ utils.js（工具函数）

**职责**：
- 数据格式化（百分比、数字、日期）
- 通用工具函数

**代码结构**：
```javascript
// 格式化百分比
export function formatPercentage(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    return isNaN(num) ? '-' : `${num.toFixed(1)}%`;
}

// 格式化数字（千分位）
export function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    return isNaN(num) ? '-' : num.toLocaleString('zh-CN');
}

// 格式化日期
export function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取嵌套对象属性值
export function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// 深度克隆对象
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 防抖函数
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

---

### 4️⃣ api-client.js（API 客户端）

**职责**：
- 封装所有 API 请求
- 统一错误处理
- 提供友好的错误提示

**代码结构**：
```javascript
import { API_ENDPOINTS } from './constants.js';

export default class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, method = 'GET', body = null) {
        const url = `${this.baseURL}${endpoint}`;
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
                throw new Error(errorData.error || errorData.message ||
                    `HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            this.showError(`操作失败: ${error.message}`);
            throw error;
        }
    }

    // API 方法
    async searchTalents(payload) {
        return this.request(API_ENDPOINTS.talentSearch, 'POST', payload);
    }

    async getFilterOptions() {
        return this.request(API_ENDPOINTS.talentFilterOptions);
    }

    async bulkUpdateTalents(data) {
        return this.request(API_ENDPOINTS.talentBulkUpdate, 'POST', data);
    }

    async syncFromFeishu(url) {
        return this.request(API_ENDPOINTS.feishuSync, 'POST', { url });
    }

    showError(message) {
        // 调用全局错误提示
        document.dispatchEvent(new CustomEvent('showAlert', {
            detail: { message, type: 'error' }
        }));
    }
}
```

---

### 5️⃣ dashboard.js（统计看板模块）

**职责**：
- 渲染顶部统计卡片
- 数据分布计算与展示

**代码结构**：
```javascript
import { formatNumber, formatPercentage } from './utils.js';

export default class Dashboard {
    constructor(app) {
        this.app = app;

        // DOM 元素
        this.totalTalentsEl = document.getElementById('stat-total-talents');
        this.tierDistributionEl = document.getElementById('stat-tier-distribution');
        this.cpmDistributionEl = document.getElementById('stat-cpm-distribution');
        this.maleAudienceEl = document.getElementById('stat-male-audience-distribution');
        this.femaleAudienceEl = document.getElementById('stat-female-audience-distribution');
    }

    render(dashboardStats) {
        if (!dashboardStats) return;

        // 总达人数
        this.totalTalentsEl.textContent = formatNumber(dashboardStats.totalTalents || 0);

        // 层级分布
        this.renderDistribution(
            this.tierDistributionEl,
            dashboardStats.tierDistribution || {},
            { '头部': 'text-red-600', '腰部': 'text-yellow-600', '尾部': 'text-green-600' }
        );

        // CPM 分布
        this.renderDistribution(
            this.cpmDistributionEl,
            dashboardStats.cpmDistribution || {},
            { '<50': 'text-green-600', '50-100': 'text-yellow-600', '>100': 'text-red-600' }
        );

        // 男性观众分布
        this.renderDistribution(
            this.maleAudienceEl,
            dashboardStats.maleAudienceDistribution || {},
            { '<30%': 'text-pink-600', '30%-50%': 'text-purple-600', '>50%': 'text-blue-600' }
        );

        // 女性观众分布
        this.renderDistribution(
            this.femaleAudienceEl,
            dashboardStats.femaleAudienceDistribution || {},
            { '<30%': 'text-blue-600', '30%-50%': 'text-purple-600', '>50%': 'text-pink-600' }
        );
    }

    renderDistribution(container, distribution, colorMap) {
        container.innerHTML = '';

        Object.entries(distribution).forEach(([label, count]) => {
            const color = colorMap[label] || 'text-gray-600';
            const item = document.createElement('div');
            item.className = 'flex justify-between text-xs';
            item.innerHTML = `
                <span class="${color}">${label}</span>
                <span class="font-semibold">${count}</span>
            `;
            container.appendChild(item);
        });
    }

    unload() {
        // 清理资源
    }
}
```

---

### 6️⃣ filter-panel.js（筛选器模块）

**职责**：
- 管理所有筛选条件（直接搜索、类型、层级、数据维度）
- 构建搜索 payload
- 处理筛选器交互

**代码结构**：
```javascript
import { FILTER_OPERATORS } from './constants.js';

export default class FilterPanel {
    constructor(app) {
        this.app = app;

        // DOM 元素
        this.directSearchNickname = document.getElementById('direct-search-nickname');
        this.directSearchXingtuId = document.getElementById('direct-search-xingtu-id');
        this.directSearchUid = document.getElementById('direct-search-uid');
        this.talentTypeFiltersContainer = document.getElementById('talent-type-filters-container');
        this.talentTierFiltersContainer = document.getElementById('talent-tier-filters-container');
        this.dataFiltersContainer = document.getElementById('data-filters-container');
        this.addFilterBtn = document.getElementById('add-filter-btn');
        this.resetFiltersBtn = document.getElementById('reset-filters-btn');
        this.applyFiltersBtn = document.getElementById('apply-filters-btn');

        // 状态
        this.talentTypes = [];
        this.talentTiers = [];

        this.bindEvents();
    }

    async loadFilterOptions() {
        try {
            const response = await this.app.apiClient.getFilterOptions();
            if (response.success && response.data) {
                this.talentTiers = response.data.tiers || [];
                this.talentTypes = response.data.types || [];
            }
        } catch (error) {
            console.error('加载筛选器选项失败:', error);
            this.talentTiers = [];
            this.talentTypes = [];
        } finally {
            this.renderFilterCheckboxes();
        }
    }

    renderFilterCheckboxes() {
        // 渲染达人类型复选框
        this.talentTypeFiltersContainer.innerHTML = this.talentTypes.map(type => `
            <label class="inline-flex items-center">
                <input type="checkbox" value="${type}" class="rounded text-blue-600">
                <span class="ml-2 text-sm">${type}</span>
            </label>
        `).join('');

        // 渲染达人层级复选框
        this.talentTierFiltersContainer.innerHTML = this.talentTiers.map(tier => `
            <label class="inline-flex items-center">
                <input type="checkbox" value="${tier}" class="rounded text-blue-600">
                <span class="ml-2 text-sm">${tier}</span>
            </label>
        `).join('');

        this.renderDataFilterRows();
    }

    renderDataFilterRows() {
        // 渲染动态数据筛选行
        const filters = this.app.state.dataFilters;

        this.dataFiltersContainer.innerHTML = filters.map((filter, index) => `
            <div class="grid grid-cols-12 gap-2 items-center" data-filter-index="${index}">
                <select class="col-span-4 filter-dimension" data-index="${index}">
                    <option value="">选择维度</option>
                    ${this.renderDimensionOptions(filter.dimension)}
                </select>
                <select class="col-span-3 filter-operator" data-index="${index}">
                    ${FILTER_OPERATORS.map(op =>
                        `<option value="${op.value}" ${filter.operator === op.value ? 'selected' : ''}>${op.label}</option>`
                    ).join('')}
                </select>
                <input type="text" class="col-span-4 filter-value" data-index="${index}"
                    value="${filter.value || ''}"
                    placeholder="输入值"
                    ${filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty' ? 'disabled' : ''}>
                <button class="col-span-1 remove-filter-btn" data-index="${index}">
                    <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    renderDimensionOptions(selectedDimension) {
        const dimensions = this.app.dimensionsModal.getDimensions();
        return dimensions.map(dim =>
            `<option value="${dim.key}" ${dim.key === selectedDimension ? 'selected' : ''}>${dim.label}</option>`
        ).join('');
    }

    buildSearchPayload() {
        const topLevelFields = new Set(['nickname', 'xingtuId', 'uid', 'talentTier', 'talentType']);

        const validDataFilters = this.app.state.dataFilters.filter(f =>
            f.dimension &&
            (f.operator === 'isEmpty' || f.operator === 'isNotEmpty' ||
             (f.value !== '' && f.value !== undefined && f.value !== null))
        );

        const filters = validDataFilters.map(f => ({
            ...f,
            dimension: topLevelFields.has(f.dimension)
                ? f.dimension
                : `performanceData.${f.dimension}`
        }));

        return {
            page: this.app.state.currentPage,
            pageSize: this.app.state.itemsPerPage,
            search: this.directSearchNickname.value.trim() ||
                   this.directSearchXingtuId.value.trim() ||
                   this.directSearchUid.value.trim(),
            tiers: Array.from(this.talentTierFiltersContainer.querySelectorAll('input:checked'))
                .map(cb => cb.value),
            types: Array.from(this.talentTypeFiltersContainer.querySelectorAll('input:checked'))
                .map(cb => cb.value),
            filters,
            sortBy: this.app.state.sortConfig.key,
            sortOrder: this.app.state.sortConfig.direction
        };
    }

    bindEvents() {
        // 应用筛选
        this.applyFiltersBtn.addEventListener('click', () => {
            this.app.state.currentPage = 1;
            document.dispatchEvent(new CustomEvent('filtersChanged'));
        });

        // 重置筛选
        this.resetFiltersBtn.addEventListener('click', () => {
            this.resetAllFilters();
        });

        // 添加筛选行
        this.addFilterBtn.addEventListener('click', () => {
            this.addDataFilterRow();
        });

        // 数据筛选变化
        this.dataFiltersContainer.addEventListener('change', (e) => {
            this.handleDataFilterChange(e);
        });

        // 删除筛选行
        this.dataFiltersContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-filter-btn')) {
                const index = parseInt(e.target.closest('.remove-filter-btn').dataset.index);
                this.app.state.dataFilters.splice(index, 1);
                this.renderDataFilterRows();
            }
        });
    }

    addDataFilterRow() {
        this.app.state.dataFilters.push({
            dimension: '',
            operator: '>',
            value: ''
        });
        this.renderDataFilterRows();
    }

    handleDataFilterChange(e) {
        const index = parseInt(e.target.dataset.index);
        const filter = this.app.state.dataFilters[index];

        if (e.target.classList.contains('filter-dimension')) {
            filter.dimension = e.target.value;
        } else if (e.target.classList.contains('filter-operator')) {
            filter.operator = e.target.value;
            // 如果是 isEmpty/isNotEmpty，清空值
            if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
                filter.value = '';
            }
            this.renderDataFilterRows();
        } else if (e.target.classList.contains('filter-value')) {
            filter.value = e.target.value;
        }
    }

    resetAllFilters() {
        this.directSearchNickname.value = '';
        this.directSearchXingtuId.value = '';
        this.directSearchUid.value = '';
        this.talentTypeFiltersContainer.querySelectorAll('input:checked')
            .forEach(cb => cb.checked = false);
        this.talentTierFiltersContainer.querySelectorAll('input:checked')
            .forEach(cb => cb.checked = false);
        this.app.state.dataFilters = [];
        this.renderDataFilterRows();
        this.app.state.currentPage = 1;
        document.dispatchEvent(new CustomEvent('filtersChanged'));
    }

    unload() {
        // 移除事件监听器
    }
}
```

---

### 7️⃣ table-renderer.js（表格渲染模块）

**职责**：
- 渲染达人数据表格
- 处理排序交互
- 分页控制

**代码结构**：
```javascript
import { formatNumber, formatPercentage, formatDate, getNestedValue } from './utils.js';

export default class TableRenderer {
    constructor(app) {
        this.app = app;

        this.tableContainer = document.getElementById('performance-table-container');
        this.paginationControls = document.getElementById('pagination-controls');

        this.bindEvents();
    }

    render(talents) {
        const dimensions = this.app.dimensionsModal.getVisibleDimensions();

        let html = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            ${dimensions.map(dim => `
                                <th scope="col"
                                    class="sortable-header px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    data-sort-key="${dim.key}">
                                    ${dim.label}
                                    ${this.renderSortIcon(dim.key)}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        talents.forEach(talent => {
            html += '<tr>';
            dimensions.forEach(dim => {
                const value = this.getCellValue(talent, dim);
                const align = dim.key === 'nickname' ? 'text-left' : 'text-center';
                html += `<td class="px-6 py-4 whitespace-nowrap text-sm ${align}">${value}</td>`;
            });
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        this.tableContainer.innerHTML = html;
    }

    getCellValue(talent, dimension) {
        let rawValue = getNestedValue(talent, dimension.key);

        // 基础字段处理
        if (dimension.key === 'nickname') {
            return rawValue || '-';
        }

        if (dimension.key === 'talentType') {
            return Array.isArray(rawValue) ? rawValue.join(', ') : (rawValue || '-');
        }

        if (dimension.key === 'lastUpdated') {
            return formatDate(rawValue);
        }

        // performanceData 字段处理
        if (dimension.key.startsWith('performanceData.')) {
            const fieldName = dimension.key.split('.')[1];

            // 百分比字段
            if (fieldName.includes('audience') || fieldName.includes('Percent')) {
                return formatPercentage(rawValue);
            }

            // 数字字段
            return formatNumber(rawValue);
        }

        return rawValue || '-';
    }

    renderSortIcon(key) {
        const { key: sortKey, direction } = this.app.state.sortConfig;

        if (sortKey !== key) {
            return `
                <span class="sort-icon inline-flex ml-1">
                    <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 10l5-5 5 5H5z"/>
                    </svg>
                </span>
            `;
        }

        const arrow = direction === 'asc'
            ? '<path d="M5 10l5-5 5 5H5z"/>'
            : '<path d="M15 10l-5 5-5-5h10z"/>';

        return `
            <span class="sort-icon inline-flex ml-1">
                <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    ${arrow}
                </svg>
            </span>
        `;
    }

    renderPagination(totalPages, totalItems) {
        if (totalPages <= 1) {
            this.paginationControls.innerHTML = '';
            return;
        }

        const { currentPage } = this.app.state;
        let html = '<div class="flex items-center space-x-2 justify-center">';

        // 上一页按钮
        html += `
            <button class="pagination-btn" data-page="${currentPage - 1}"
                ${currentPage === 1 ? 'disabled' : ''}>
                &lt;
            </button>
        `;

        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                        data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }

        // 下一页按钮
        html += `
            <button class="pagination-btn" data-page="${currentPage + 1}"
                ${currentPage === totalPages ? 'disabled' : ''}>
                &gt;
            </button>
        `;

        html += '</div>';
        this.paginationControls.innerHTML = html;
    }

    bindEvents() {
        // 排序
        this.tableContainer.addEventListener('click', (e) => {
            const header = e.target.closest('.sortable-header');
            if (header) {
                this.handleSort(header);
            }
        });

        // 分页
        this.paginationControls.addEventListener('click', (e) => {
            const btn = e.target.closest('.pagination-btn');
            if (btn && !btn.disabled) {
                const page = parseInt(btn.dataset.page);
                document.dispatchEvent(new CustomEvent('pageChanged', {
                    detail: { page }
                }));
            }
        });
    }

    handleSort(headerElement) {
        const sortKey = headerElement.dataset.sortKey;
        const { key, direction } = this.app.state.sortConfig;

        let newDirection = 'desc';
        if (key === sortKey) {
            newDirection = direction === 'asc' ? 'desc' : 'asc';
        }

        document.dispatchEvent(new CustomEvent('sortChanged', {
            detail: {
                sortConfig: { key: sortKey, direction: newDirection }
            }
        }));
    }

    unload() {
        // 清理事件监听器
    }
}
```

---

### 8️⃣ import-export.js（导入导出模块）

**职责**：
- Excel 文件导入与数据解析
- 飞书表格同步
- 数据导出为 Excel

**代码结构**：
```javascript
export default class ImportExportManager {
    constructor(app) {
        this.app = app;

        // DOM 元素
        this.importExportBtn = document.getElementById('import-export-btn');
        this.importExportDropdown = document.getElementById('import-export-dropdown');
        this.dropdownImportExcelBtn = document.getElementById('dropdown-import-excel-btn');
        this.dropdownFeishuImportBtn = document.getElementById('dropdown-feishu-import-btn');
        this.dropdownExportAllBtn = document.getElementById('dropdown-export-all-btn');
        this.importExcelInput = document.getElementById('import-excel-input');
        this.importConfirmModal = document.getElementById('import-confirm-modal');
        this.feishuImportModal = document.getElementById('feishu-import-modal');

        this.importDataCache = null;

        this.bindEvents();
    }

    bindEvents() {
        // 显示/隐藏下拉菜单
        this.importExportBtn.addEventListener('click', () => {
            this.importExportDropdown.classList.toggle('hidden');
        });

        // Excel 导入
        this.dropdownImportExcelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.importExcelInput.click();
            this.importExportDropdown.classList.add('hidden');
        });

        this.importExcelInput.addEventListener('change', (e) => {
            this.handleExcelImport(e);
        });

        // 飞书导入
        this.dropdownFeishuImportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openFeishuImportModal();
            this.importExportDropdown.classList.add('hidden');
        });

        // 导出全部
        this.dropdownExportAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleExportAll();
            this.importExportDropdown.classList.add('hidden');
        });

        // 确认导入按钮
        document.getElementById('confirm-import-btn')?.addEventListener('click', () => {
            this.handleConfirmImport();
        });

        // 确认飞书导入
        document.getElementById('confirm-feishu-import-btn')?.addEventListener('click', () => {
            this.handleFeishuUrlSubmit();
        });
    }

    async handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await this.readExcelFile(file);
            const processedData = this.processExcelData(data);
            this.prepareAndShowConfirmationModal(processedData.valid, processedData.invalid);
        } catch (error) {
            console.error('Excel 导入失败:', error);
            alert('Excel 文件解析失败，请检查文件格式');
        } finally {
            event.target.value = '';
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    processExcelData(rows) {
        const validData = [];
        const invalidRows = [];

        if (rows.length < 2) {
            return { valid: validData, invalid: invalidRows };
        }

        const headers = rows[0];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const talent = {};
            let isValid = false;

            headers.forEach((header, index) => {
                talent[header] = row[index];
            });

            // 验证必需字段
            if (talent['星图ID'] || talent['UID'] || talent['昵称']) {
                isValid = true;
                validData.push(talent);
            } else {
                invalidRows.push({ row: i + 1, reason: '缺少关键标识（星图ID、UID或昵称）' });
            }
        }

        return { valid: validData, invalid: invalidRows };
    }

    prepareAndShowConfirmationModal(validData, invalidRows) {
        this.importDataCache = validData;

        const summaryEl = document.getElementById('import-summary');
        summaryEl.innerHTML = `
            <p class="text-green-600">✓ 有效数据: ${validData.length} 条</p>
            ${invalidRows.length > 0 ? `
                <p class="text-red-600 mt-2">✗ 无效数据: ${invalidRows.length} 条</p>
                <ul class="mt-2 text-xs text-gray-600 max-h-32 overflow-y-auto">
                    ${invalidRows.map(r => `<li>第 ${r.row} 行: ${r.reason}</li>`).join('')}
                </ul>
            ` : ''}
        `;

        this.importConfirmModal.classList.remove('hidden');
    }

    async handleConfirmImport() {
        if (!this.importDataCache || this.importDataCache.length === 0) {
            alert('没有可导入的数据');
            return;
        }

        try {
            const response = await this.app.apiClient.bulkUpdateTalents({
                talents: this.importDataCache
            });

            if (response.success) {
                alert(`成功更新 ${response.data.modified || 0} 条达人数据！`);
                this.importConfirmModal.classList.add('hidden');
                this.importDataCache = null;
                await this.app.fetchAndRenderTalents();
            }
        } catch (error) {
            console.error('批量更新失败:', error);
        }
    }

    openFeishuImportModal() {
        this.feishuImportModal.classList.remove('hidden');
    }

    async handleFeishuUrlSubmit() {
        const feishuUrl = document.getElementById('feishu-url-input').value.trim();

        if (!feishuUrl) {
            alert('请输入飞书表格分享链接');
            return;
        }

        try {
            const response = await this.app.apiClient.syncFromFeishu(feishuUrl);

            if (response.success) {
                alert(`飞书同步成功！更新了 ${response.data.modified || 0} 条数据`);
                this.feishuImportModal.classList.add('hidden');
                await this.app.fetchAndRenderTalents();
            }
        } catch (error) {
            console.error('飞书同步失败:', error);
        }
    }

    async handleExportAll() {
        try {
            // 获取全部数据（无分页限制）
            const payload = this.app.filterPanel.buildSearchPayload();
            payload.pageSize = 999999;

            const response = await this.app.apiClient.searchTalents(payload);
            const talents = response.data.talents || [];

            if (talents.length === 0) {
                alert('没有数据可导出');
                return;
            }

            this.exportToExcel(talents);
        } catch (error) {
            console.error('导出失败:', error);
        }
    }

    exportToExcel(talents) {
        const dimensions = this.app.dimensionsModal.getVisibleDimensions();

        // 构建表头
        const headers = dimensions.map(dim => dim.label);

        // 构建数据行
        const rows = talents.map(talent => {
            return dimensions.map(dim => {
                return getNestedValue(talent, dim.key) || '';
            });
        });

        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '达人数据');

        // 下载文件
        const fileName = `达人数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    unload() {
        // 清理资源
    }
}
```

---

### 9️⃣ modal-dimensions.js（维度管理弹窗）

**职责**：
- 维度配置管理（显示/隐藏）
- 拖拽排序（Sortable.js）
- LocalStorage 持久化

**代码结构**：
```javascript
import { DIMENSION_DEFINITIONS, STORAGE_KEYS } from './constants.js';
import { deepClone } from './utils.js';

export default class DimensionsModal {
    constructor(app) {
        this.app = app;

        this.modal = document.getElementById('dimensions-modal');
        this.manageDimensionsBtn = document.getElementById('manage-dimensions-btn');
        this.saveDimensionsBtn = document.getElementById('save-dimensions-btn');
        this.closeDimensionsBtn = document.getElementById('close-dimensions-modal-btn');

        this.dimensions = [];
        this.sortableInstance = null;

        this.loadDimensions();
        this.bindEvents();
    }

    loadDimensions() {
        const saved = localStorage.getItem(STORAGE_KEYS.dimensionsConfig);

        if (saved) {
            try {
                this.dimensions = JSON.parse(saved);
            } catch (error) {
                console.error('加载维度配置失败:', error);
                this.dimensions = this.getDefaultDimensions();
            }
        } else {
            this.dimensions = this.getDefaultDimensions();
        }
    }

    getDefaultDimensions() {
        return Object.entries(DIMENSION_DEFINITIONS).map(([key, config]) => ({
            key,
            label: config.label,
            category: config.category,
            visible: true
        }));
    }

    saveDimensionsConfig() {
        localStorage.setItem(
            STORAGE_KEYS.dimensionsConfig,
            JSON.stringify(this.dimensions)
        );
    }

    getVisibleDimensions() {
        return this.dimensions.filter(dim => dim.visible);
    }

    getDimensions() {
        return deepClone(this.dimensions);
    }

    bindEvents() {
        this.manageDimensionsBtn.addEventListener('click', () => {
            this.openModal();
        });

        this.saveDimensionsBtn.addEventListener('click', () => {
            this.handleSave();
        });

        this.closeDimensionsBtn.addEventListener('click', () => {
            this.closeModal();
        });
    }

    openModal() {
        this.renderModal();
        this.initializeSortable();
        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }
    }

    renderModal() {
        const container = document.getElementById('dimensions-list');

        // 按分类分组
        const grouped = {
            basic: [],
            performance: []
        };

        this.dimensions.forEach(dim => {
            grouped[dim.category]?.push(dim);
        });

        let html = '';

        // 渲染基础信息
        html += '<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">基础信息</h4>';
        html += this.renderDimensionGroup(grouped.basic);
        html += '</div>';

        // 渲染性能数据
        html += '<div><h4 class="font-semibold text-gray-700 mb-2">性能数据</h4>';
        html += this.renderDimensionGroup(grouped.performance);
        html += '</div>';

        container.innerHTML = html;
    }

    renderDimensionGroup(dimensions) {
        return dimensions.map((dim, index) => `
            <div class="flex items-center p-2 bg-white rounded border mb-2" data-dimension-key="${dim.key}">
                <span class="drag-handle mr-3 text-gray-400 cursor-move">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </span>
                <label class="flex items-center flex-1 cursor-pointer">
                    <input type="checkbox"
                        data-dimension-key="${dim.key}"
                        ${dim.visible ? 'checked' : ''}
                        class="rounded text-blue-600 mr-2">
                    <span>${dim.label}</span>
                </label>
            </div>
        `).join('');
    }

    initializeSortable() {
        const container = document.getElementById('dimensions-list');

        this.sortableInstance = new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                this.updateDimensionsOrder();
            }
        });
    }

    updateDimensionsOrder() {
        const container = document.getElementById('dimensions-list');
        const elements = Array.from(container.querySelectorAll('[data-dimension-key]'));

        const newOrder = elements.map(el => el.dataset.dimensionKey);

        this.dimensions.sort((a, b) => {
            return newOrder.indexOf(a.key) - newOrder.indexOf(b.key);
        });
    }

    handleSave() {
        // 更新可见性
        const checkboxes = document.querySelectorAll('#dimensions-list input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const dimension = this.dimensions.find(d => d.key === cb.dataset.dimensionKey);
            if (dimension) {
                dimension.visible = cb.checked;
            }
        });

        // 更新排序
        this.updateDimensionsOrder();

        // 保存到 LocalStorage
        this.saveDimensionsConfig();

        // 关闭弹窗并刷新表格
        this.closeModal();
        this.app.fetchAndRenderTalents();
    }

    unload() {
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }
    }
}
```

---

## 模块间通信

### CustomEvent 事件系统

| 事件名 | 触发者 | 监听者 | 数据 | 说明 |
|--------|--------|--------|------|------|
| `filtersChanged` | FilterPanel | Main | - | 筛选条件变化，需要重新获取数据 |
| `pageChanged` | TableRenderer | Main | `{ page }` | 分页变化 |
| `sortChanged` | TableRenderer | Main | `{ sortConfig }` | 排序变化 |
| `showAlert` | ApiClient | Main | `{ message, type }` | 显示全局提示 |

### 数据流示例

```
用户点击"应用筛选"
  ↓
FilterPanel.bindEvents() 触发 'filtersChanged' 事件
  ↓
Main.setupEventListeners() 监听到事件
  ↓
Main.fetchAndRenderTalents() 执行
  ↓
ApiClient.searchTalents() 发起请求
  ↓
更新 state.displayedTalents
  ↓
Dashboard.render() 渲染统计
  ↓
TableRenderer.render() 渲染表格
  ↓
TableRenderer.renderPagination() 渲染分页
```

---

## 实施步骤

### Phase 1：准备与规划（5 分钟）

1. ✅ 创建 `performance/` 目录
2. ✅ 创建 9 个模块文件（空文件）
3. ✅ 备份原 `performance.js` 文件

### Phase 2：基础模块实施（15 分钟）

**优先级顺序：**
1. `constants.js` - 最简单，定义配置
2. `utils.js` - 工具函数，无依赖
3. `api-client.js` - API 封装
4. `main.js` - 主控制器框架

### Phase 3：功能模块实施（30 分钟）

**实施顺序：**
1. `dashboard.js` - 统计看板（依赖 utils）
2. `modal-dimensions.js` - 维度管理（独立功能）
3. `filter-panel.js` - 筛选器（依赖 constants、modal-dimensions）
4. `table-renderer.js` - 表格渲染（依赖 utils、modal-dimensions）
5. `import-export.js` - 导入导出（依赖 api-client）

### Phase 4：集成与测试（10 分钟）

1. 修改 `performance.html`，引入 ES6 模块
2. 初始化 PerformanceApp
3. 功能测试（筛选、排序、分页、导入导出）

### Phase 5：提交与部署（5 分钟）

1. Git 提交所有变更
2. 推送到远程分支
3. 创建 Pull Request

**总计：约 65 分钟**

---

## 技术要点

### 1️⃣ ES6 Module 导入

```javascript
// performance.html
<script type="module">
    import { PerformanceApp } from './performance/main.js';

    window.addEventListener('DOMContentLoaded', () => {
        const app = new PerformanceApp();
        app.init();
    });
</script>
```

### 2️⃣ LocalStorage 持久化

```javascript
// 保存用户配置
localStorage.setItem('performanceDimensionsConfig', JSON.stringify(dimensions));

// 读取用户配置
const saved = localStorage.getItem('performanceDimensionsConfig');
const dimensions = saved ? JSON.parse(saved) : defaultDimensions;
```

### 3️⃣ Sortable.js 集成

```javascript
import Sortable from 'sortablejs'; // 或使用全局 Sortable

this.sortableInstance = new Sortable(container, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: () => {
        this.updateDimensionsOrder();
    }
});
```

### 4️⃣ XLSX 库使用

```javascript
// 读取 Excel
const workbook = XLSX.read(data, { type: 'array' });
const jsonData = XLSX.utils.sheet_to_json(worksheet);

// 写入 Excel
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'export.xlsx');
```

### 5️⃣ 资源清理

```javascript
unload() {
    // 移除事件监听器
    this.applyFiltersBtn.removeEventListener('click', this.handleApply);

    // 销毁第三方库实例
    if (this.sortableInstance) {
        this.sortableInstance.destroy();
        this.sortableInstance = null;
    }
}
```

---

## 验收标准

### ✅ 功能完整性

- [ ] 统计看板正确显示（5个统计卡片）
- [ ] 直接搜索功能正常（昵称、星图ID、UID）
- [ ] 类型和层级筛选正常
- [ ] 高级数据筛选（添加、删除、修改）
- [ ] 表格渲染正确（动态列）
- [ ] 排序功能正常（所有列）
- [ ] 分页控制正常
- [ ] Excel 导入功能正常
- [ ] 飞书同步功能正常
- [ ] 数据导出功能正常
- [ ] 维度管理弹窗（显示/隐藏、拖拽排序）

### ✅ 代码质量

- [ ] 所有模块使用 ES6 Class 语法
- [ ] 使用 CustomEvent 进行模块间通信
- [ ] 每个模块都有 unload() 方法
- [ ] 代码注释清晰
- [ ] 无 console.error（除了预期的错误处理）

### ✅ 性能与体验

- [ ] 页面加载速度不变
- [ ] 筛选和排序响应及时
- [ ] 大数据量导出不卡顿
- [ ] LocalStorage 配置持久化生效

### ✅ 兼容性

- [ ] 原有功能 100% 保留
- [ ] 用户配置（itemsPerPage、dimensions）保留
- [ ] 与后端 API 完全兼容

---

## 📋 模块依赖关系图

```
main.js
  ├── constants.js
  ├── utils.js
  ├── api-client.js
  │     └── constants.js
  ├── dashboard.js
  │     └── utils.js
  ├── filter-panel.js
  │     ├── constants.js
  │     └── modal-dimensions.js
  ├── table-renderer.js
  │     ├── utils.js
  │     └── modal-dimensions.js
  ├── import-export.js
  │     ├── api-client.js
  │     └── utils.js
  └── modal-dimensions.js
        ├── constants.js
        └── utils.js
```

---

## 🎯 预期收益

1. **可维护性提升** - 950行 → 9个模块，每个 <200 行
2. **团队协作** - 多人可并行开发不同模块
3. **扩展性增强** - 新增维度、筛选器更容易
4. **测试友好** - 每个模块可独立测试
5. **代码复用** - utils、api-client 可供其他页面使用

---

## 📝 备注

- 本方案参考了 `automation_suite`、`talent_pool` 等已模块化页面的成功经验
- 遵循项目 `PAGE_MODULARIZATION_STRATEGY.md` 规范
- 保持原有功能 100% 兼容
- 优先保证功能完整性，再优化代码结构

---

**最后更新**：2025-11-04
**方案版本**：v1.0
**预估工时**：65 分钟
