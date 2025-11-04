# 页面模块化策略文档

> **目标**：为项目中所有需要模块化的页面提供统一的决策框架和实施指南

---

## 📋 目录

1. [何时进行模块化](#何时进行模块化)
2. [页面分析方法](#页面分析方法)
3. [模块拆分模式](#模块拆分模式)
4. [模块间通信](#模块间通信)
5. [文件组织规范](#文件组织规范)
6. [开发最佳实践](#开发最佳实践)
7. [常见陷阱](#常见陷阱)

---

## 何时进行模块化

### 判断标准

满足以下 **任意 2 条** 即建议进行模块化：

| 标准 | 阈值 | 优先级 |
|------|------|--------|
| 文件行数 | ≥ 800 行 | 🔴 高 |
| UI 操作数量 | ≥ 80 个 Tab/Modal/Drawer 操作 | 🔴 高 |
| 功能模块数量 | ≥ 3 个独立功能区（Tab、表单区、列表区等） | 🟡 中 |
| 维护频率 | 近 3 个月有 ≥ 5 次修改 | 🟡 中 |
| 团队反馈 | 开发者反馈"代码难以理解" | 🟢 低 |

### 示例

**推荐模块化**：
- `project_automation.js` - 1198 行，121+ Tab/Modal 操作，3 个功能 Tab ✅
- `automation_suite.js` - 1216 行，多个自动化配置区域 ✅

**暂不模块化**：
- `dashboard.js` - 450 行，单一仪表盘展示 ❌
- `login.js` - 180 行，简单表单验证 ❌

---

## 页面分析方法

### 步骤 1: 识别功能边界

使用以下问题指导分析：

1. **页面有几个主要功能区？**
   - Tab 切换？
   - 独立的列表区域？
   - 多个并列的表单？

2. **有哪些弹窗/抽屉？**
   - 配置弹窗
   - 详情查看
   - 数据编辑
   - 确认对话框

3. **有哪些独立的业务流程？**
   - 数据加载 → 展示 → 操作
   - 筛选 → 查询 → 结果
   - 配置 → 提交 → 反馈

### 步骤 2: 绘制功能地图

```
示例：project_automation 页面

主控制器 (main.js)
├── Tab 1: 达人选择 (tab-talents.js)
│   ├── 达人列表渲染
│   ├── 选择管理
│   └── 批量操作栏
├── Tab 2: 任务批次 (tab-jobs.js)
│   ├── 工作流筛选卡片
│   ├── 任务列表
│   └── 轮询机制
├── Tab 3: 飞书表格 (tab-sheets.js)
│   ├── 表格历史记录
│   └── 状态管理
├── 弹窗: 自动化配置 (modal-automation.js)
├── 抽屉: 表格生成 (modal-sheet-generator.js)
└── 其他弹窗 (modals.js)
    ├── 任务详情
    ├── 截图查看
    └── 数据查看
```

### 步骤 3: 估算模块大小

| 模块类型 | 预期行数 | 说明 |
|----------|----------|------|
| 主控制器 | 150-300 | 初始化、Tab切换、事件协调 |
| Tab 模块 | 150-250 | 数据加载、渲染、交互 |
| Modal 模块 | 100-200 | 弹窗逻辑、表单处理 |
| Utils 模块 | 50-150 | 通用工具函数 |

---

## 模块拆分模式

### 模式 1: 主控制器 + Tab 模块

**适用场景**：多 Tab 页面（如 `project_automation`）

**结构**：
```
page_name/
├── main.js              # 主控制器
├── tab-xxx.js           # Tab 1
├── tab-yyy.js           # Tab 2
└── tab-zzz.js           # Tab 3
```

**主控制器职责**：
- 初始化全局状态
- Tab 切换管理
- 事件协调
- 渲染页面框架

**Tab 模块职责**：
- 加载数据
- 渲染 UI
- 处理交互
- 管理局部状态

---

### 模式 2: 主控制器 + 功能模块

**适用场景**：单页面多功能区（如列表+表单+统计）

**结构**：
```
page_name/
├── main.js              # 主控制器
├── list.js              # 列表区
├── form.js              # 表单区
└── stats.js             # 统计区
```

---

### 模式 3: 主控制器 + Modal 模块

**适用场景**：页面有多个复杂弹窗

**结构**：
```
page_name/
├── main.js              # 主控制器
├── modal-config.js      # 配置弹窗
├── modal-detail.js      # 详情弹窗
└── modals.js            # 其他简单弹窗（合并）
```

**Modal 模块职责**：
- 弹窗打开/关闭
- 数据加载
- 表单验证
- 提交处理

---

### 模式 4: 完整模块化

**适用场景**：复杂页面（如 `project_automation`）

**结构**：
```
page_name/
├── main.js              # 主控制器
├── tab-*.js             # Tab 模块
├── modal-*.js           # Modal 模块
└── utils.js             # 工具函数（可选）
```

---

## 模块间通信

### 方案 1: CustomEvent（推荐）

**优点**：解耦、原生 API、易于调试

**使用场景**：跨模块通知（如数据刷新）

**示例**：
```javascript
// 触发事件 (modal-xxx.js)
document.dispatchEvent(new CustomEvent('refreshData', {
    detail: { tabName: 'talents' }
}));

// 监听事件 (tab-talents.js)
document.addEventListener('refreshData', (e) => {
    if (e.detail.tabName === 'talents') {
        this.load();
    }
});
```

**事件命名规范**：
- 使用动词 + 名词：`refreshTalents`, `updateJob`, `deleteSheet`
- 全局事件加前缀：`app:tabSwitch`, `app:userLogout`

---

### 方案 2: 回调函数

**优点**：直接、类型安全（TypeScript）

**使用场景**：父子模块直接通信

**示例**：
```javascript
// 主控制器 (main.js)
this.talentsTab = new TalentsTab({
    onSelectionChange: (selectedIds) => {
        this.updateBatchActions(selectedIds);
    }
});

// Tab 模块 (tab-talents.js)
handleSelection(e) {
    // ...
    if (this.options.onSelectionChange) {
        this.options.onSelectionChange(this.selectedTalentIds);
    }
}
```

---

### 方案 3: 共享状态对象（谨慎使用）

**优点**：简单

**缺点**：容易产生意外副作用

**使用场景**：少量全局配置

**示例**：
```javascript
// 主控制器 (main.js)
const sharedState = {
    currentProjectId: null,
    projectData: null
};

this.talentsTab = new TalentsTab(sharedState);
this.jobsTab = new JobsTab(sharedState);
```

⚠️ **注意**：避免直接修改 `sharedState`，优先使用 CustomEvent 通知变更。

---

## 文件组织规范

### 目录命名

```
page_name/                # 页面名称（kebab-case）
├── main.js
├── tab-xxx.js            # tab- 前缀
├── modal-xxx.js          # modal- 前缀
├── drawer-xxx.js         # drawer- 前缀（可选）
└── utils.js              # 工具函数（可选）
```

### 文件命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 主控制器 | `main.js` | `main.js` |
| Tab 模块 | `tab-<名称>.js` | `tab-talents.js` |
| Modal 模块 | `modal-<名称>.js` | `modal-automation.js` |
| Drawer 模块 | `drawer-<名称>.js` | `drawer-filters.js` |
| 工具函数 | `utils.js` | `utils.js` |

### 模块导出规范

**默认导出类**：
```javascript
// tab-talents.js
export default class TalentsTab {
    constructor(options) {
        this.options = options;
    }

    async load() { /* ... */ }
    render() { /* ... */ }
}
```

**命名导出工具**：
```javascript
// utils.js
export function formatDate(date) { /* ... */ }
export function calculateStats(data) { /* ... */ }
```

---

## 开发最佳实践

### 1. 保持原有功能不变

模块化是 **重构**，不是 **重写**：
- ✅ 复制原有逻辑，只改变组织方式
- ❌ 不要趁机"优化"业务逻辑（除非单独计划）

### 2. 复用通用工具

优先使用 `app-core.js` 中的工具：
- `APIService` - API 调用
- `showAlert()` / `showConfirm()` - 通知
- `formatDate()` / `formatCurrency()` - 格式化

### 3. 事件委托

列表中的按钮使用事件委托：
```javascript
// ❌ 不好：为每个按钮绑定事件
buttons.forEach(btn => btn.addEventListener('click', handler));

// ✅ 好：使用事件委托
container.addEventListener('click', (e) => {
    if (e.target.matches('.action-btn')) {
        handler(e);
    }
});
```

### 4. 绑定 this

在 constructor 中绑定事件处理方法：
```javascript
constructor() {
    this.handleClick = this.handleClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
}
```

### 5. 资源管理

Tab 切换时清理资源：
```javascript
class JobsTab {
    unload() {
        this.stopPolling();
        this.selectedIds.clear();
    }
}

// main.js
switchTab(tabName) {
    this.currentTab?.unload(); // 清理旧 Tab
    this.currentTab = this.tabs[tabName];
    this.currentTab.load();
}
```

### 6. 轮询管理

需要轮询的模块提供启动/停止方法：
```javascript
class JobsTab {
    startPolling() {
        this.stopPolling(); // 先停止已有轮询
        this.pollingInterval = setInterval(() => {
            this.load();
        }, 5000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    unload() {
        this.stopPolling(); // Tab 切换时停止
    }
}
```

---

## 常见陷阱

### ❌ 陷阱 1: 模块划分过细

**问题**：
```
page_name/
├── main.js
├── tab-list-header.js       # 过细
├── tab-list-body.js          # 过细
├── tab-list-footer.js        # 过细
└── tab-list-pagination.js    # 过细
```

**解决**：
```
page_name/
├── main.js
└── tab-list.js               # 合并为一个模块
```

**原则**：单个模块 < 100 行时考虑合并。

---

### ❌ 陷阱 2: 循环依赖

**问题**：
```javascript
// tab-talents.js
import { JobsTab } from './tab-jobs.js';

// tab-jobs.js
import { TalentsTab } from './tab-talents.js'; // 循环依赖！
```

**解决**：使用 CustomEvent 或主控制器协调：
```javascript
// tab-talents.js
document.dispatchEvent(new CustomEvent('talentsUpdated'));

// tab-jobs.js
document.addEventListener('talentsUpdated', () => { /* ... */ });
```

---

### ❌ 陷阱 3: 过度使用共享状态

**问题**：
```javascript
// 多个模块直接修改 sharedState
this.sharedState.currentTab = 'talents'; // 难以追踪变更来源
```

**解决**：通过主控制器统一管理：
```javascript
// main.js
switchTab(tabName) {
    this.currentTab = tabName;
    document.dispatchEvent(new CustomEvent('tabChanged', {
        detail: { tabName }
    }));
}
```

---

### ❌ 陷阱 4: 忘记清理事件监听

**问题**：
```javascript
class TalentsTab {
    load() {
        document.addEventListener('click', this.handleClick);
    }
    // 没有提供清理方法！内存泄漏风险
}
```

**解决**：
```javascript
class TalentsTab {
    load() {
        this.handleClick = this.handleClick.bind(this);
        document.addEventListener('click', this.handleClick);
    }

    unload() {
        document.removeEventListener('click', this.handleClick);
    }
}
```

---

## 📝 HTML 修改模板

### 原结构（模块化前）

```html
<script src="page_name.js" defer></script>
```

### 新结构（模块化后）

```html
<!-- 新架构：模块化加载 -->
<script type="module">
    import { PageNameApp } from './page_name/main.js';
    window.addEventListener('DOMContentLoaded', () => {
        const app = new PageNameApp();
        app.init();
    });
</script>

<!-- 备份：回退到旧版本时启用 -->
<!-- <script src="page_name.js" defer></script> -->
```

---

## 📚 参考示例

### 已完成的模块化案例

1. **`order_list` 页面** (参考 `ARCHITECTURE_UPGRADE_GUIDE.md`)
   - 模式：主控制器 + 功能模块
   - 规模：1000+ 行 → 8 个模块

2. **`project_automation` 页面** (参考 `PROJECT_AUTOMATION_UPGRADE_PLAN.md`)
   - 模式：完整模块化（Tab + Modal）
   - 规模：1198 行 → 7 个模块

---

## ✅ 模块化检查清单

### 准备阶段
- [ ] 确认页面满足模块化标准（文件行数、UI 操作数等）
- [ ] 阅读原文件代码，理解功能边界
- [ ] 绘制功能地图，确定模块划分
- [ ] 估算每个模块的行数

### 开发阶段
- [ ] 创建 `page_name/` 目录
- [ ] 创建 `main.js` 主控制器
- [ ] 创建各功能模块（Tab/Modal/等）
- [ ] 实现模块间通信（CustomEvent）
- [ ] 修改 HTML 文件引用
- [ ] 保留原文件作为备份

### 测试阶段
- [ ] 页面初始化正常
- [ ] Tab/功能区切换正常
- [ ] 所有弹窗/抽屉正常
- [ ] 数据加载/提交正常
- [ ] 事件通信正常
- [ ] 轮询机制正常（如有）
- [ ] 资源清理正常（无内存泄漏）

---

**最后更新**: 2025-11-04
**相关文档**:
- [架构升级指南](./ARCHITECTURE_UPGRADE_GUIDE.md)
- [project_automation 模块化方案](./PROJECT_AUTOMATION_UPGRADE_PLAN.md)
