# talent_selection 页面模块化升级方案

> **页面名称**：达人筛选页面（talent_selection.js）
> **当前版本**：V2.9.4
> **文件规模**：1170 行
> **复杂度**：116+ DOM/事件/Modal 操作
> **升级目标**：拆分为 8 个职责清晰的模块

---

## 📋 目录

1. [页面功能分析](#页面功能分析)
2. [模块划分方案](#模块划分方案)
3. [文件结构设计](#文件结构设计)
4. [模块详细说明](#模块详细说明)
5. [模块间通信](#模块间通信)
6. [实施步骤](#实施步骤)
7. [技术要点](#技术要点)

---

## 页面功能分析

### 核心功能区域

```
talent_selection 页面
├── 筛选控制区
│   ├── 项目选择 & 执行月份
│   ├── 档期筛选（日期范围 + AND/OR 逻辑）
│   ├── 直接搜索（昵称、星图ID）
│   ├── 达人类型筛选（复选框组）
│   ├── 达人等级筛选（复选框组）
│   └── 数据维度筛选（动态添加，支持多种运算符）
│
├── 表格展示区
│   ├── 达人列表渲染
│   ├── 价格类型切换（60s+、20-60s、1-20s）
│   ├── 自定义显示列
│   ├── 排序功能
│   └── 分页控制
│
├── 选择列表区
│   ├── 已选达人展示
│   ├── 批量操作（添加到项目）
│   └── 项目快照（预算统计）
│
└── Modal弹窗区
    ├── 批量录入弹窗（价格 + 返点选择）
    ├── 成功提示弹窗
    └── 自定义列弹窗
```

### 数据流向

```
初始化
  ↓
加载项目 + 达人数据
  ↓
应用筛选条件
  ↓
渲染表格（分页 + 排序）
  ↓
用户交互（选择达人）
  ↓
更新选择列表 + 项目快照
  ↓
批量录入 → 提交到项目
```

---

## 模块划分方案

### 推荐结构：主控制器 + 3个功能区 + 3个Modal + 1个工具模块

| 模块 | 文件名 | 职责 | 预估行数 |
|------|--------|------|----------|
| 主控制器 | `main.js` | 页面初始化、模块协调、全局状态管理 | ~200 |
| 筛选控制器 | `filter-panel.js` | 所有筛选条件管理、筛选逻辑执行 | ~300 |
| 表格模块 | `talent-table.js` | 表格渲染、排序、分页、价格类型切换 | ~250 |
| 选择列表模块 | `selection-panel.js` | 已选达人展示、项目快照统计 | ~150 |
| 批量录入弹窗 | `modal-batch-import.js` | 批量录入逻辑、价格返点选择 | ~200 |
| 自定义列弹窗 | `modal-columns.js` | 列配置管理、拖拽排序 | ~100 |
| 通用弹窗 | `modals.js` | 成功提示、自定义提示 | ~80 |
| 工具函数 | `utils.js` | 价格计算、日期处理、数据格式化 | ~100 |

**总计**：~1380 行（模块化后，便于维护扩展）

---

## 文件结构设计

```
talent_selection/
├── main.js                        # 主控制器
├── filter-panel.js                # 筛选控制器
├── talent-table.js                # 表格模块
├── selection-panel.js             # 选择列表模块
├── modal-batch-import.js          # 批量录入弹窗
├── modal-columns.js               # 自定义列弹窗
├── modals.js                      # 通用弹窗（成功提示、自定义提示）
└── utils.js                       # 工具函数
```

---

## 模块详细说明

### 1️⃣ main.js - 主控制器（~200行）

**职责**：
- 页面初始化
- 加载项目和达人数据
- 模块实例化与协调
- 全局状态管理
- 事件总线（CustomEvent）

**核心方法**：
```javascript
class TalentSelectionApp {
    constructor()
    async init()
    async loadProjectsAndTalents()
    initializeModules()
    setupEventListeners()
    handleRefreshData(e)
}
```

**全局状态**：
```javascript
{
    allProjects: [],           // 所有项目
    allTalents: [],            // 所有达人
    richTalentData: [],        // 增强后的达人数据（含档期Set等）
    displayedTalents: [],      // 当前显示的达人（筛选后）
    selectedCollaborations: [] // 已选择的合作
}
```

**导出**：
```javascript
export default TalentSelectionApp;
```

---

### 2️⃣ filter-panel.js - 筛选控制器（~300行）

**职责**：
- 渲染筛选UI（项目、月份、档期、类型、等级、数据维度）
- 管理筛选条件状态
- 执行筛选逻辑
- 触发数据更新事件

**核心方法**：
```javascript
class FilterPanel {
    constructor(options)

    // 渲染
    render()
    renderFilterControls()
    renderDataFilterRows()

    // 筛选逻辑
    applyFiltersAndRender()
    addDataFilterRow()
    resetAllFilters()

    // 工具方法
    getDatesBetween(startDate, endDate)
    calculateScheduleMatch(talent)
}
```

**状态管理**：
```javascript
{
    dataFilters: [],           // 数据维度筛选条件
    selectedTypes: [],         // 已选择的达人类型
    selectedTiers: [],         // 已选择的达人等级
    scheduleFilter: {          // 档期筛选
        enabled: false,
        startDate: null,
        endDate: null,
        logic: 'ANY'
    }
}
```

**触发事件**：
- `filtersApplied` - 筛选条件应用后触发，携带 `{ filteredTalents }`

**导出**：
```javascript
export default FilterPanel;
```

---

### 3️⃣ talent-table.js - 表格模块（~250行）

**职责**：
- 渲染达人表格
- 处理排序逻辑
- 分页控制
- 价格类型切换（60s+、20-60s、1-20s）
- 自定义列显示

**核心方法**：
```javascript
class TalentTable {
    constructor(options)

    // 渲染
    render()
    renderTable()
    renderPagination(totalPages)

    // 交互
    handleSort(e)
    handlePaginationClick(e)
    handleItemsPerPageChange(e)
    handlePriceTypeChange(e)
    handleRowSelection(e)

    // 工具
    openColumnsModal()
}
```

**状态管理**：
```javascript
{
    displayedTalents: [],      // 要显示的达人列表
    currentPage: 1,
    itemsPerPage: 15,
    sortConfig: {
        key: 'cpm60s',
        direction: 'desc'
    },
    selectedPriceType: '60s_plus',
    visibleColumns: []         // 可见列配置
}
```

**触发事件**：
- `talentSelected` - 达人被选中，携带 `{ talent }`
- `talentDeselected` - 达人被取消选中，携带 `{ talentId }`
- `openColumnsModal` - 打开自定义列弹窗

**导出**：
```javascript
export default TalentTable;
```

---

### 4️⃣ selection-panel.js - 选择列表模块（~150行）

**职责**：
- 渲染已选择达人列表
- 渲染项目快照（预算统计）
- 提供批量操作入口
- 管理选择状态

**核心方法**：
```javascript
class SelectionPanel {
    constructor(options)

    // 渲染
    renderSelectionList()
    renderProjectSnapshot(projectId)
    resetProjectSnapshot()

    // 交互
    handleRemoveTalent(e)
    handleOpenBatchImport()

    // 工具
    addCollaborationToList(talent)
    removeCollaborationFromList(talentId)
}
```

**状态管理**：
```javascript
{
    selectedCollaborations: [], // 已选择的合作列表
    projectSnapshot: {          // 项目快照
        totalBudget: 0,
        usedBudget: 0,
        budgetRate: 0,
        talentCount: 0
    }
}
```

**触发事件**：
- `openBatchImportModal` - 打开批量录入弹窗，携带 `{ selectedCollaborations }`

**导出**：
```javascript
export default SelectionPanel;
```

---

### 5️⃣ modal-batch-import.js - 批量录入弹窗（~200行）

**职责**：
- 批量录入UI渲染
- 价格类型 + 时间档位联动选择
- 返点选择
- 数据验证与提交

**核心方法**：
```javascript
class BatchImportModal {
    constructor(options)

    // 弹窗控制
    open(selectedCollaborations)
    close()

    // 渲染
    renderImportTable(collaborations)
    generatePriceOptions(talent)
    generateRebateOptions(talent)

    // 交互
    handleBatchModalChange(e)
    updatePriceDisplay(row)
    handleConfirmImport()

    // 工具
    getAvailablePriceTimes(talent)
}
```

**状态管理**：
```javascript
{
    selectedCollaborations: [], // 当前批量录入的达人列表
    formData: {}                // 表单数据（价格、返点选择）
}
```

**触发事件**：
- `importSuccess` - 批量录入成功，携带 `{ count, projectId }`

**导出**：
```javascript
export default BatchImportModal;
```

---

### 6️⃣ modal-columns.js - 自定义列弹窗（~100行）

**职责**：
- 自定义列配置UI
- 拖拽排序（使用 Sortable.js）
- 列显示/隐藏切换
- 保存配置到 localStorage

**核心方法**：
```javascript
class ColumnsModal {
    constructor(options)

    // 弹窗控制
    open()
    close()

    // 渲染
    renderColumnsConfig()

    // 交互
    handleSaveColumns()
    handleToggleColumn(e)

    // 工具
    initializeSortable()
    getVisibleColumns()
}
```

**状态管理**：
```javascript
{
    allConfigurations: {       // 所有可配置列
        talentTypes: [],
        talentTiers: [],
        dimensions: []
    },
    visibleColumns: [],        // 当前可见列
    sortableInstance: null     // Sortable.js 实例
}
```

**触发事件**：
- `columnsUpdated` - 列配置更新，携带 `{ visibleColumns }`

**导出**：
```javascript
export default ColumnsModal;
```

---

### 7️⃣ modals.js - 通用弹窗（~80行）

**职责**：
- 成功提示弹窗（SuccessModal）
- 自定义提示弹窗（CustomAlertModal）

**核心方法**：
```javascript
export class SuccessModal {
    constructor()
    show(title, message, projectId)
    close()
}

export class CustomAlertModal {
    constructor()
    show(message, title = '提示', callback)
    close()
}
```

**导出**：
```javascript
export { SuccessModal, CustomAlertModal };
```

---

### 8️⃣ utils.js - 工具函数（~100行）

**职责**：
- 价格计算逻辑（getBestPrice）
- 日期处理工具
- 数据格式化工具
- 配置生成工具

**核心方法**：
```javascript
// 价格计算
export function getBestPrice(talent, requiredType, executionMonth)
export function getBestPriceForSort(talent, priceType)

// 日期处理
export function formatDate(date)
export function getDatesBetween(startDate, endDate)

// 配置生成
export function generateConfigurationsFromData(talents)

// 数据处理
export function setDefaultExecutionMonth()
```

**导出**：
```javascript
export {
    getBestPrice,
    getBestPriceForSort,
    formatDate,
    getDatesBetween,
    generateConfigurationsFromData,
    setDefaultExecutionMonth
};
```

---

## 模块间通信

### 通信方式：CustomEvent（推荐）

| 事件名 | 触发者 | 监听者 | 数据 | 说明 |
|--------|--------|--------|------|------|
| `filtersApplied` | FilterPanel | TalentTable | `{ filteredTalents }` | 筛选条件应用后 |
| `talentSelected` | TalentTable | SelectionPanel | `{ talent }` | 达人被选中 |
| `talentDeselected` | TalentTable | SelectionPanel | `{ talentId }` | 达人被取消选中 |
| `openBatchImportModal` | SelectionPanel | BatchImportModal | `{ selectedCollaborations }` | 打开批量录入 |
| `openColumnsModal` | TalentTable | ColumnsModal | - | 打开自定义列 |
| `columnsUpdated` | ColumnsModal | TalentTable | `{ visibleColumns }` | 列配置更新 |
| `importSuccess` | BatchImportModal | Main | `{ count, projectId }` | 批量录入成功 |
| `refreshData` | Main | FilterPanel | - | 刷新数据 |

### 通信示例

```javascript
// FilterPanel 触发筛选完成事件
document.dispatchEvent(new CustomEvent('filtersApplied', {
    detail: { filteredTalents: this.displayedTalents }
}));

// TalentTable 监听筛选完成事件
document.addEventListener('filtersApplied', (e) => {
    this.displayedTalents = e.detail.filteredTalents;
    this.currentPage = 1;
    this.render();
});
```

---

## 实施步骤

### Phase 1: 准备工作
1. 创建 `talent_selection/` 目录
2. 创建所有模块文件（空壳）
3. 定义模块接口（构造函数、核心方法）

### Phase 2: 核心模块开发
4. 实现 `utils.js`（无依赖，优先完成）
5. 实现 `main.js`（主控制器）
6. 实现 `filter-panel.js`（筛选逻辑）
7. 实现 `talent-table.js`（表格渲染）

### Phase 3: 辅助模块开发
8. 实现 `selection-panel.js`（选择列表）
9. 实现 `modals.js`（通用弹窗）
10. 实现 `modal-columns.js`（自定义列）
11. 实现 `modal-batch-import.js`（批量录入）

### Phase 4: 集成与测试
12. 修改 `talent_selection.html`，使用模块化加载
13. 测试所有功能点（筛选、排序、选择、批量录入）
14. 验证事件通信正确性

### Phase 5: 优化与上线
15. 性能优化（按需加载、事件节流）
16. 代码审查与重构
17. 提交 PR 并合并到 main

---

## 技术要点

### 1. 价格计算逻辑保持

**核心函数**：`getBestPrice(talent, requiredType, executionMonth)`

```javascript
// [V2.9 重构] 严格按照指定类型显示价格，不fallback到其他类型
export function getBestPrice(talent, requiredType = '60s_plus', executionMonth) {
    if (!talent.prices || talent.prices.length === 0 || !executionMonth) {
        return { value: '没有', isFallback: false, sortValue: -1 };
    }
    const [execYear, execMonth] = executionMonth.split('-').map(Number);

    // 严格筛选：仅查找指定类型的价格
    const typedPrices = talent.prices.filter(p => p.type === requiredType);

    if (typedPrices.length === 0) {
        return { value: '没有', isFallback: false, sortValue: -1 };
    }

    // 优先1: 当前月份 + 指定类型
    const currentMonthPrices = typedPrices.filter(p => p.year === execYear && p.month === execMonth);
    if (currentMonthPrices.length > 0) {
        const confirmedPrice = currentMonthPrices.find(p => p.status !== 'provisional');
        const selectedPrice = confirmedPrice || currentMonthPrices[0];
        return { value: selectedPrice.price, isFallback: false, sortValue: selectedPrice.price };
    }

    // 优先2: 最近月份 + 指定类型
    const sortedTypedPrices = typedPrices.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const latestPrice = sortedTypedPrices[0];
    const priceText = `¥ ${latestPrice.price.toLocaleString()} (${latestPrice.month}月)`;
    return { value: priceText, isFallback: true, sortValue: latestPrice.price };
}
```

**要点**：
- ✅ 保留严格的价格类型筛选逻辑（V2.9 核心特性）
- ✅ 支持 60s_plus、20-60s、1-20s 三种档位
- ✅ 不存在时返回"没有"，不 fallback

---

### 2. 筛选逻辑保持复杂度

**多维度筛选**：
- 项目选择
- 执行月份
- 档期筛选（日期范围 + AND/OR 逻辑）
- 直接搜索（昵称、星图ID）
- 达人类型（支持多选）
- 达人等级（支持多选）
- 数据维度（支持动态添加、多种运算符：>、>=、<、<=、=、!=、contains、between等）

**筛选器逻辑组合**：
- 支持 AND/OR 逻辑切换
- 空值判断（isEmpty、isNotEmpty）

---

### 3. 自定义列配置

**使用 Sortable.js 实现拖拽排序**：

```javascript
import Sortable from 'sortablejs';

class ColumnsModal {
    initializeSortable() {
        const el = document.getElementById('columns-list');
        this.sortableInstance = Sortable.create(el, {
            animation: 150,
            handle: '.handle',
            ghostClass: 'sortable-ghost'
        });
    }
}
```

**localStorage 持久化**：
```javascript
const VISIBLE_COLUMNS_KEY = 'talentSelectionVisibleColumns';

// 保存
localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumns));

// 读取
const visibleColumns = JSON.parse(localStorage.getItem(VISIBLE_COLUMNS_KEY) || '[]');
```

---

### 4. 批量录入联动逻辑

**V2.9.4 修复重点**：

```javascript
// [V2.9.4 修复] 更新价格显示时保留 price-display 类名
function updatePriceDisplay(row) {
    const videoType = row.querySelector('.video-type-select').value;
    const priceTime = row.querySelector('.price-time-select').value;
    const priceDisplay = row.querySelector('.price-display'); // ✅ 确保能找到元素

    if (!videoType || !priceTime) {
        priceDisplay.textContent = '请先选择类型和时间';
        priceDisplay.className = 'price-display text-gray-500'; // ✅ 保留类名
        return;
    }

    // ... 查找价格逻辑

    priceDisplay.textContent = `¥ ${price.toLocaleString()}`;
    priceDisplay.className = 'price-display font-semibold text-green-600'; // ✅ 保留类名
}
```

**要点**：
- ✅ 保留 `price-display` 类名，确保后续 `querySelector` 能正确找到元素
- ✅ 视频类型 + 价格时间 两步选择器联动

---

### 5. 事件委托优化

**表格行交互**：

```javascript
// ❌ 不好：为每行绑定事件
tableRows.forEach(row => {
    row.addEventListener('click', handler);
});

// ✅ 好：使用事件委托
tableContainer.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (row) {
        handler(row);
    }
});
```

---

### 6. 档期筛选时区修复

**修复时区问题**：

```javascript
// [修复] 使用本地时区解析日期，避免时区偏移
const [y1, m1, d1] = scheduleStartDateInput.value.split('-').map(Number);
const start = new Date(y1, m1 - 1, d1); // ✅ 本地时区

// ❌ 错误：会产生时区偏移
// const start = new Date(scheduleStartDateInput.value);
```

---

## ✅ 模块化检查清单

### 准备阶段
- [ ] 确认页面满足模块化标准（1170行，116+操作）
- [ ] 阅读原文件代码，理解功能边界
- [ ] 绘制功能地图（筛选、表格、选择列表、Modal）
- [ ] 确定模块划分（8个模块）

### 开发阶段
- [ ] 创建 `talent_selection/` 目录
- [ ] 创建 `utils.js`（工具函数）
- [ ] 创建 `main.js`（主控制器）
- [ ] 创建 `filter-panel.js`（筛选控制器）
- [ ] 创建 `talent-table.js`（表格模块）
- [ ] 创建 `selection-panel.js`（选择列表）
- [ ] 创建 `modal-batch-import.js`（批量录入）
- [ ] 创建 `modal-columns.js`（自定义列）
- [ ] 创建 `modals.js`（通用弹窗）
- [ ] 修改 `talent_selection.html`
- [ ] 保留原 `talent_selection.js` 作为备份

### 测试阶段
- [ ] 页面初始化正常
- [ ] 项目选择 + 执行月份生效
- [ ] 档期筛选（AND/OR逻辑）正常
- [ ] 直接搜索（昵称、星图ID）正常
- [ ] 达人类型/等级筛选正常
- [ ] 数据维度筛选（多种运算符）正常
- [ ] 表格渲染正常
- [ ] 价格类型切换（60s+、20-60s、1-20s）正常
- [ ] 排序功能正常
- [ ] 分页控制正常
- [ ] 自定义列拖拽排序正常
- [ ] 达人选择/取消选择正常
- [ ] 选择列表展示正常
- [ ] 项目快照统计正常
- [ ] 批量录入弹窗（价格+返点联动）正常
- [ ] 批量提交到项目正常
- [ ] 成功提示弹窗正常

---

**最后更新**: 2025-11-04
**相关文档**:
- [通用策略](./PAGE_MODULARIZATION_STRATEGY.md)
- [project_automation 案例](./PROJECT_AUTOMATION_UPGRADE_PLAN.md)
- [架构升级指南](./ARCHITECTURE_UPGRADE_GUIDE.md)
