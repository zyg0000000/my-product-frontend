# 前端页面架构升级指南

> 本文档记录了 order_list 页面架构升级的完整流程、经验和最佳实践，用于指导后续其他页面的升级工作。

## 📋 目录

- [升级背景](#升级背景)
- [升级目标](#升级目标)
- [架构设计原则](#架构设计原则)
- [文件组织结构](#文件组织结构)
- [升级步骤](#升级步骤)
- [代码风格规范](#代码风格规范)
- [常见问题和解决方案](#常见问题和解决方案)
- [测试清单](#测试清单)
- [回退方案](#回退方案)

---

## 升级背景

### 问题现状

- **代码体积过大**：order_list.js 文件达到 1455 行，维护困难
- **职责不清晰**：所有功能混在一个文件中
- **难以扩展**：添加新功能需要修改大量代码
- **复用性差**：工具函数无法在其他页面使用

### 类似页面

其他需要升级的页面（也是 1400+ 行）：
- `talent_pool.js` - 达人库页面
- 其他大型单文件页面...

---

## 升级目标

### 核心目标

1. **模块化**：将大文件拆分为多个职责单一的模块
2. **可复用**：提取通用工具到共享库
3. **可维护**：清晰的代码组织和注释
4. **向后兼容**：保留原文件，支持快速回退
5. **最小文件数**：控制文件数量，避免过度复杂

### 非目标

- ❌ 不引入新的框架（Vue/React等）
- ❌ 不改变现有的 API 调用方式
- ❌ 不修改 HTML 结构（除必要的 script 引入）

---

## 架构设计原则

### 1. 文件组织原则

```
项目根目录/
├── common/                    # 通用库（跨页面复用）
│   └── app-core.js           # 核心工具类
├── [page_name]/              # 页面专属目录
│   ├── main.js               # 主控制器
│   ├── tab-[name].js         # Tab 模块（如果有多个Tab）
│   └── [other-modules].js    # 其他模块
├── [page_name].html          # HTML 文件
└── [page_name].js            # 原始文件（保留作为备份）
```

### 2. 模块职责划分

| 模块类型 | 职责 | 示例 |
|---------|------|------|
| **common/app-core.js** | 跨页面通用工具 | API调用、Modal管理、格式化工具 |
| **main.js** | 页面主控制器 | 初始化、数据加载、Tab切换、事件协调 |
| **tab-[name].js** | Tab 功能模块 | 单个Tab的完整逻辑 |

### 3. 类设计规范

每个模块导出一个类，类的结构应该统一：

```javascript
export class ModuleName {
    // 1. 构造函数：接收必要的初始化参数
    constructor(param1, param2) {
        this.param1 = param1;
        this.elements = {};  // DOM 元素缓存
        // 绑定方法的 this
        this.methodName = this.methodName.bind(this);
    }

    // 2. 初始化方法
    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.load();
    }

    // 3. DOM 元素缓存
    cacheElements() {
        this.elements = {
            container: document.getElementById('xxx'),
            button: document.getElementById('yyy'),
        };
    }

    // 4. 事件绑定
    bindEvents() {
        // 使用事件委托
        this.elements.container.addEventListener('click', this.handleClick);
    }

    // 5. 数据加载
    async load() {
        // 加载数据并渲染
    }

    // 6. 渲染方法
    render() {
        // 渲染 UI
    }

    // 7. 事件处理方法
    handleClick(event) {
        // 事件处理逻辑
    }

    // 8. 其他业务方法
    // ...
}
```

### 4. 事件通信机制

使用浏览器原生的 CustomEvent 进行模块间通信：

```javascript
// 发送事件
document.dispatchEvent(new CustomEvent('eventName', {
    detail: { data: 'value' }
}));

// 监听事件
document.addEventListener('eventName', (e) => {
    console.log(e.detail.data);
});
```

---

## 文件组织结构

### order_list 页面示例

```
my-product-frontend/
├── common/
│   └── app-core.js              (552 lines)  ← 通用工具库
│       ├── APIService           - API 请求封装
│       ├── ModalManager         - 弹窗管理
│       ├── Formatters           - 数据格式化
│       ├── PaginationComponent  - 分页组件
│       └── Utils                - 其他工具
│
├── order_list/
│   ├── main.js                  (626 lines)  ← 主控制器
│   ├── tab-basic.js             (602 lines)  ← 基础信息Tab
│   ├── tab-performance.js       (370 lines)  ← 执行信息Tab
│   ├── tab-financial.js         (730 lines)  ← 财务信息Tab
│   └── tab-effect.js            (380 lines)  ← 效果看板Tab
│
├── order_list.html              (修改 script 引入)
└── order_list.js                (1455 lines) ← 保留作为备份
```

**文件数量控制**：
- 总共 **6 个新文件**（1个通用 + 1个主控 + 4个Tab）
- 原则：每个文件 300-800 行为宜
- 避免过度拆分导致文件碎片化

---

## 升级步骤

### Phase 1: 准备工作

#### Step 1: 创建通用工具库 (common/app-core.js)

**目的**：提取所有页面都会用到的工具函数

**包含内容**：
- ✅ API 请求封装（APIService）
- ✅ Modal 管理（Alert/Confirm/Loading）
- ✅ 数据格式化工具（货币、百分比、日期）
- ✅ 分页组件
- ✅ 其他通用工具

**示例代码**：

```javascript
// common/app-core.js
export class APIService {
    static async request(endpoint, method = 'GET', body = null) {
        const url = new URL(endpoint, window.location.origin);

        if (method === 'GET' && body) {
            Object.keys(body).forEach(key => {
                if (body[key] !== null && body[key] !== undefined) {
                    url.searchParams.append(key, body[key]);
                }
            });
        }

        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (method !== 'GET' && body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        return await response.json();
    }
}

export class ModalManager {
    static showAlert(message, title = '提示', callback) {
        // 使用现有的 showAlert 函数
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, title, callback);
        }
    }

    static showConfirm(message, title = '确认操作', callback) {
        if (typeof window.showConfirm === 'function') {
            window.showConfirm(message, title, callback);
        }
    }

    static showLoading(message, title = '请稍候') {
        if (typeof window.showLoadingMessage === 'function') {
            window.showLoadingMessage(message, title);
        }
    }

    static hideLoading() {
        if (typeof window.hideLoadingMessage === 'function') {
            window.hideLoadingMessage();
        }
    }
}

export class Formatters {
    static currency(num) {
        const n = Number(num);
        return isNaN(n) ? '¥0.00' : `¥${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    static percent(num, decimals = 2) {
        const n = Number(num);
        return isNaN(n) ? '0%' : `${n.toFixed(decimals)}%`;
    }

    static date(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    }
}
```

**验证**：
- [ ] 所有工具类都能正常导入
- [ ] API 请求能正常工作
- [ ] Modal 弹窗能正常显示

---

#### Step 2: 创建主控制器 (main.js)

**目的**：协调整个页面的初始化和各模块间的通信

**职责**：
- 页面初始化
- 加载项目数据
- Tab 切换管理
- 状态筛选
- 事件协调

**关键代码结构**：

```javascript
// order_list/main.js
import { APIService, ModalManager } from '../common/app-core.js';
import BasicInfoTab from './tab-basic.js';
import PerformanceTab from './tab-performance.js';
// ... 其他 Tab 导入

export class OrderListApp {
    constructor() {
        this.projectId = this.getProjectIdFromUrl();
        this.project = null;
        this.currentTab = 'basic';
        this.tabs = {};

        // 绑定方法
        this.switchTab = this.switchTab.bind(this);
        this.refreshProject = this.refreshProject.bind(this);
    }

    async init() {
        await this.loadInitialData();
        this.initTabs();
        this.initStatusFilter();

        // 重要：监听刷新事件
        document.addEventListener('refreshProject', () => {
            this.refreshProject();
        });

        // 加载默认 Tab 数据
        await this.switchTab();
    }

    async loadInitialData() {
        // 加载项目数据
        const response = await APIService.request('/getProjects', 'GET', { view: 'simple' });
        // ...
    }

    initTabs() {
        const tabButtons = document.querySelectorAll('[data-tab]');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    async switchTab(tabName) {
        if (!tabName) tabName = this.currentTab;
        this.currentTab = tabName;

        // 更新 Tab 按钮样式
        this.updateTabButtons(tabName);

        // 显示/隐藏 Tab 内容
        this.updateTabContent(tabName);

        // 加载 Tab 数据
        if (!this.tabs[tabName]) {
            this.tabs[tabName] = this.createTabInstance(tabName);
        }

        await this.tabs[tabName].load();
    }

    createTabInstance(tabName) {
        switch (tabName) {
            case 'basic':
                return new BasicInfoTab(this.projectId, this.project, this.allDiscounts);
            case 'performance':
                return new PerformanceTab(this.projectId, this.project);
            // ... 其他 Tab
        }
    }

    async refreshProject() {
        await this.loadInitialData();
        await this.switchTab(this.currentTab);
    }
}
```

**重要注意事项**：
- ⚠️ **必须在 init() 结尾调用 `await this.switchTab()`**，否则初始 Tab 不会加载数据
- ⚠️ 使用事件委托处理 Tab 切换，避免内存泄漏
- ⚠️ 缓存 Tab 实例，避免重复创建

---

#### Step 3: 创建各个 Tab 模块

**以 tab-basic.js 为例**：

```javascript
// order_list/tab-basic.js
import { APIService, ModalManager, Formatters, PaginationComponent as Pagination } from '../common/app-core.js';

export class BasicInfoTab {
    constructor(projectId, project, allDiscounts) {
        this.projectId = projectId;
        this.project = project;
        this.allDiscounts = allDiscounts;

        this.collaborators = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;

        // 绑定事件处理方法的 this
        this.handleClick = this.handleClick.bind(this);
        this.handleChange = this.handleChange.bind(this);

        // 缓存 DOM 元素
        this.elements = {};
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.load();
    }

    cacheElements() {
        this.elements = {
            listBody: document.getElementById('collaborator-list-body'),
            noDataMessage: document.getElementById('no-data-message-basic'),
            paginationControls: document.getElementById('pagination-controls-basic'),
        };
    }

    bindEvents() {
        const { listBody } = this.elements;

        if (listBody) {
            // 使用事件委托
            listBody.addEventListener('click', this.handleClick);
            listBody.addEventListener('change', this.handleChange);
        }
    }

    async load(statuses = '') {
        try {
            const response = await APIService.request('/getCollaborators', 'GET', {
                projectId: this.projectId,
                statuses: statuses
            });

            if (response.success) {
                this.collaborators = response.data;
                this.totalItems = this.collaborators.length;
                this.render();
            }
        } catch (error) {
            console.error('加载基础信息失败:', error);
            ModalManager.showAlert('加载数据失败，请刷新页面重试');
        }
    }

    render() {
        const { listBody, noDataMessage, paginationControls } = this.elements;

        if (!listBody) return;

        listBody.innerHTML = '';

        if (this.collaborators.length === 0) {
            if (noDataMessage) noDataMessage.classList.remove('hidden');
            if (paginationControls) paginationControls.innerHTML = '';
            return;
        }

        if (noDataMessage) noDataMessage.classList.add('hidden');

        // 分页逻辑
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageCollaborators = this.collaborators.slice(start, end);

        // 渲染每一行
        const fragment = document.createDocumentFragment();
        pageCollaborators.forEach(collab => {
            const row = this.renderRow(collab);
            fragment.appendChild(row);
        });
        listBody.appendChild(fragment);

        // 渲染分页
        Pagination.render(
            paginationControls,
            this.currentPage,
            this.totalItems,
            this.itemsPerPage,
            (page) => {
                this.currentPage = page;
                this.render();
            }
        );
    }

    renderRow(collab) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${collab.talentNickname}</td>
            <td>${collab.amount}</td>
            <!-- 更多列 -->
        `;
        return tr;
    }

    handleClick(event) {
        const target = event.target;

        if (target.classList.contains('edit-btn')) {
            const collabId = target.dataset.id;
            this.handleEdit(collabId);
        } else if (target.classList.contains('delete-btn')) {
            const collabId = target.dataset.id;
            this.handleDelete(collabId);
        }
        // ... 其他按钮处理
    }

    handleChange(event) {
        const target = event.target;

        if (target.classList.contains('status-select')) {
            const collabId = target.dataset.id;
            const newStatus = target.value;
            this.handleStatusChange(collabId, newStatus);
        }
        // ... 其他 change 事件处理
    }

    async handleStatusChange(collabId, newStatus) {
        try {
            const response = await APIService.request('/updateCollaborator', 'POST', {
                id: collabId,
                status: newStatus
            });

            if (response.success) {
                ModalManager.showAlert('状态更新成功');
                // 触发刷新事件
                document.dispatchEvent(new CustomEvent('refreshProject'));
            }
        } catch (error) {
            console.error('更新状态失败:', error);
            ModalManager.showAlert('更新失败，请重试');
        }
    }

    // ... 其他业务方法
}

export default BasicInfoTab;
```

**Tab 模块开发要点**：

1. **完整性**：每个 Tab 必须包含原文件中该 Tab 的所有功能
2. **事件委托**：使用事件委托处理列表中的按钮点击
3. **绑定 this**：在 constructor 中绑定方法的 this
4. **DOM 缓存**：在 cacheElements() 中缓存常用的 DOM 元素
5. **触发刷新**：修改数据后使用 CustomEvent 触发 'refreshProject' 事件

---

#### Step 4: 修改 HTML 文件

**修改前**：
```html
<script src="order_list.js" defer></script>
```

**修改后**：
```html
<!-- 新架构：模块化加载 -->
<script type="module">
    import { OrderListApp } from './order_list/main.js';
    window.addEventListener('DOMContentLoaded', () => {
        const app = new OrderListApp();
        app.init();
    });
</script>

<!-- 备份：需要回退到旧版本时，注释掉上面的模块化代码，启用下面这行 -->
<!-- <script src="order_list.js" defer></script> -->
```

**关键点**：
- ✅ 使用 `type="module"` 启用 ES6 模块
- ✅ 保留原始 script 标签作为注释，方便回退
- ✅ 使用 `DOMContentLoaded` 确保 DOM 加载完成

---

### Phase 2: 测试与修复

#### 测试清单

##### 基础功能测试

- [ ] **页面加载**
  - [ ] 页面能正常打开
  - [ ] 初始 Tab 能加载数据（重要！）
  - [ ] 控制台无报错

- [ ] **Tab 切换**
  - [ ] 所有 Tab 都能正常切换
  - [ ] 切换后数据能正常加载
  - [ ] Tab 按钮高亮状态正确

- [ ] **数据显示**
  - [ ] 列表数据正确显示
  - [ ] 格式化（货币、百分比）正确
  - [ ] 分页功能正常

##### 交互功能测试

- [ ] **编辑功能**
  - [ ] 点击编辑按钮能进入编辑模式
  - [ ] 修改后能保存
  - [ ] 保存后数据刷新正确

- [ ] **删除功能**
  - [ ] 删除确认弹窗正常
  - [ ] 删除后列表更新

- [ ] **状态筛选**
  - [ ] 筛选功能正常工作
  - [ ] 筛选后数据正确

- [ ] **批量操作**（如果有）
  - [ ] 全选/取消全选
  - [ ] 批量操作执行正常

##### 边界情况测试

- [ ] **空数据**
  - [ ] 无数据时显示正确的提示信息

- [ ] **错误处理**
  - [ ] API 失败时有友好的错误提示

- [ ] **并发操作**
  - [ ] 快速切换 Tab 不会出错
  - [ ] 连续点击按钮不会重复提交

---

### Phase 3: 部署与监控

#### 部署流程

1. **推送到功能分支**
   ```bash
   git add .
   git commit -m "feat: 完成 XXX 页面架构升级"
   git push origin feature-branch
   ```

2. **在 Cloudflare Pages 预览环境测试**
   - 找到分支预览 URL
   - 完整测试所有功能

3. **创建 Pull Request**
   - 详细描述改动
   - 列出测试情况

4. **合并到 main 分支**
   - Review 代码
   - 合并并部署

5. **生产环境验证**
   - 验证主要功能
   - 监控错误日志

---

## 代码风格规范

### 命名规范

```javascript
// 类名：大驼峰
class OrderListApp { }
class BasicInfoTab { }

// 方法名：小驼峰
async loadInitialData() { }
handleStatusChange() { }

// 变量名：小驼峰
const projectId = '...';
const currentTab = 'basic';

// 常量：大写下划线
const API_ENDPOINT = '/api/xxx';
const MAX_ITEMS_PER_PAGE = 10;

// 私有属性（约定）：下划线开头
this._internalState = null;

// DOM 元素：语义化命名
const listBody = document.getElementById('...');
const submitButton = document.querySelector('...');
```

### 注释规范

```javascript
/**
 * 类或方法的文档注释
 *
 * @param {string} projectId - 项目ID
 * @param {Object} project - 项目对象
 * @returns {Promise<void>}
 */
async loadData(projectId, project) {
    // 单行注释：解释为什么这样做
    // 而不是解释做了什么（代码本身应该是自解释的）
}

// 重要的业务逻辑或复杂算法：多行注释
/*
 * 这里使用事件委托而不是直接绑定的原因：
 * 1. 列表内容是动态生成的
 * 2. 避免为每个按钮都绑定事件监听器
 * 3. 更好的性能表现
 */
```

### 代码组织

```javascript
export class ModuleName {
    // 1. 构造函数
    constructor() { }

    // 2. 初始化方法
    async init() { }

    // 3. DOM 相关方法
    cacheElements() { }
    bindEvents() { }

    // 4. 数据加载方法
    async load() { }

    // 5. 渲染方法
    render() { }
    renderRow() { }

    // 6. 事件处理方法
    handleClick() { }
    handleChange() { }

    // 7. 业务逻辑方法
    async saveData() { }
    async deleteItem() { }

    // 8. 工具方法
    formatDate() { }
    validateInput() { }
}
```

---

## 常见问题和解决方案

### 问题 1: 初始 Tab 不加载数据

**症状**：页面打开后，基础信息 Tab 是空的，需要点击其他 Tab 再点回来才有数据。

**原因**：main.js 的 `init()` 方法中忘记调用 `switchTab()`

**解决方案**：
```javascript
async init() {
    await this.loadInitialData();
    this.initTabs();
    this.initStatusFilter();

    // ⚠️ 重要：加载默认 Tab 的数据
    await this.switchTab();  // ← 必须添加这一行
}
```

---

### 问题 2: 事件监听器中 this 指向错误

**症状**：在事件处理方法中访问 `this.xxx` 报错 undefined

**原因**：事件监听器的回调函数中，this 指向了 DOM 元素而不是类实例

**解决方案**：
```javascript
constructor() {
    // 在构造函数中绑定 this
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
}

bindEvents() {
    // 直接使用已绑定的方法
    listBody.addEventListener('click', this.handleClick);
}
```

---

### 问题 3: 批量操作的 DOM 元素未定义

**症状**：控制台报错 `batchActionSelect is not defined`

**原因**：在 `bindEvents()` 方法中使用了变量，但忘记从 `this.elements` 中解构

**解决方案**：
```javascript
bindEvents() {
    // ⚠️ 必须解构出所有要使用的元素
    const { listBody, batchActionSelect, batchDateInput, executeBatchBtn } = this.elements;

    if (batchActionSelect) {
        batchActionSelect.addEventListener('change', () => {
            // 现在可以安全使用
        });
    }
}
```

---

### 问题 4: API 返回数据格式问题

**症状**：数据能返回但显示不正常，例如月份显示 "M8" 而不是 "8"

**原因**：数据库字段格式与预期不符

**解决方案**：
```javascript
// 在云函数中处理字段格式
sortMonth: {
    $convert: {
        input: {
            $cond: {
                if: { $eq: [{ $substr: ['$financialMonth', 0, 1] }, 'M'] },
                then: { $substr: ['$financialMonth', 1, -1] },  // 去掉 'M' 前缀
                else: '$financialMonth'
            }
        },
        to: 'int',
        onError: 0
    }
}
```

---

### 问题 5: 模块间通信不生效

**症状**：修改数据后，其他模块没有更新

**原因**：忘记触发刷新事件

**解决方案**：
```javascript
async handleSave() {
    const response = await APIService.request('/updateData', 'POST', data);

    if (response.success) {
        // ⚠️ 触发刷新事件，让主控制器重新加载数据
        document.dispatchEvent(new CustomEvent('refreshProject'));
    }
}
```

并确保 main.js 中监听了这个事件：
```javascript
async init() {
    // ...
    document.addEventListener('refreshProject', () => {
        this.refreshProject();
    });
}
```

---

## 回退方案

### 快速回退（推荐）

如果新架构出现严重问题，可以立即回退到原版本：

**修改 HTML 文件**：
```html
<!-- 新架构：模块化加载 -->
<!-- 注释掉新架构代码 -->
<!--
<script type="module">
    import { OrderListApp } from './order_list/main.js';
    window.addEventListener('DOMContentLoaded', () => {
        const app = new OrderListApp();
        app.init();
    });
</script>
-->

<!-- 备份：启用原版本 -->
<script src="order_list.js" defer></script>
```

**提交并部署**：
```bash
git add order_list.html
git commit -m "revert: 临时回退到原架构"
git push origin main
```

Cloudflare Pages 会在几分钟内完成部署，网站会恢复到原来的版本。

### 完全回退（彻底移除）

如果确定要放弃新架构：

```bash
git revert <commit-hash>  # 撤销架构升级的提交
git push origin main
```

---

## 升级检查清单

在开始新页面的架构升级前，使用这个清单确保准备就绪：

### 准备阶段
- [ ] 已阅读本指南
- [ ] 确认页面现有功能清单
- [ ] 确认 Tab 数量和职责
- [ ] 评估是否需要新增通用工具
- [ ] 创建功能分支

### 开发阶段
- [ ] 创建或更新 common/app-core.js
- [ ] 创建 main.js 主控制器
- [ ] 创建各个模块文件
- [ ] 修改 HTML 引入方式
- [ ] 保留原始文件作为备份

### 测试阶段
- [ ] 本地测试基础功能
- [ ] 测试所有交互功能
- [ ] 测试边界情况
- [ ] Cloudflare 预览环境测试
- [ ] 检查控制台错误

### 部署阶段
- [ ] 提交代码到功能分支
- [ ] 创建 Pull Request
- [ ] Code Review
- [ ] 合并到 main
- [ ] 生产环境验证
- [ ] 监控错误日志

---

## 附录

### 相关文件清单

**order_list 页面架构升级涉及的文件**：

```
新增/修改文件：
✅ common/app-core.js           (新增，552行)
✅ order_list/main.js           (新增，626行)
✅ order_list/tab-basic.js      (新增，602行)
✅ order_list/tab-performance.js(新增，370行)
✅ order_list/tab-financial.js  (新增，730行)
✅ order_list/tab-effect.js     (新增，380行)
✅ order_list.html              (修改，script引入)

保留文件：
✅ order_list.js                (保留，1455行，作为备份)
```

### 关键提交记录

```
3dbd6f9 feat: 创建通用核心库 app-core.js
3f210ad feat: 创建 order_list 主控制器
34b3632 feat: 创建基础信息Tab模块
400977c feat: 创建其他3个Tab模块完整功能
594c247 feat: 修改 HTML 启用新架构
d7eb8b9 fix: 修复页面初始化时基础信息Tab数据未加载的问题
8e91671 fix: 修复财务Tab批量操作日期输入框不显示的问题
cd0f0f7 fix: 修复 bindEvents 方法中 batchActionSelect 未定义的错误
0eaf154 feat: 优化合作历史弹窗显示
4cfb24d fix: 修正合作历史返点率字段名称
```

### 性能指标

**原架构**：
- 单文件大小：1455 行
- 首次加载：立即执行

**新架构**：
- 总代码量：3279 行（分布在 6 个文件）
- 通用库：552 行（可复用）
- 页面专属：2727 行
- 首次加载：ES6 模块按需加载
- 维护性：显著提升

---

## 更新日志

| 日期 | 版本 | 更新内容 | 作者 |
|------|------|----------|------|
| 2025-10-25 | v1.0 | 初始版本，基于 order_list 升级经验 | Claude + User |

---

## 联系方式

如有疑问，请通过以下方式联系：
- GitHub Issues: [项目仓库]/issues
- 项目文档：本文件

---

**最后更新**：2025-10-25
**基于项目**：order_list 页面架构升级
**下一个目标**：talent_pool.js 页面升级
