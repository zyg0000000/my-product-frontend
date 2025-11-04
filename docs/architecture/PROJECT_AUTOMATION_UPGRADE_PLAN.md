# project_automation 页面模块化升级方案

> **目标**：将 `project_automation.js` (1198行) 模块化为 7 个职责清晰的文件

---

## 📁 文件结构

```
project_automation/
├── main.js                      (主控制器，约 250行)
├── tab-talents.js               (达人选择Tab，约 200行)
├── tab-jobs.js                  (任务批次Tab，约 280行)
├── tab-sheets.js                (飞书表格Tab，约 180行)
├── modal-automation.js          (自动化配置弹窗，约 150行)
├── modal-sheet-generator.js     (表格生成抽屉，约 220行)
└── modals.js                    (其他弹窗，约 200行)
```

**保留原文件**：`project_automation.js` (作为备份)

---

## 🎯 模块职责说明

### 1. main.js - 主控制器

**职责**：
- 初始化页面，加载项目数据
- Tab 切换管理
- 事件协调（监听 refreshData 等自定义事件）
- 管理全局状态（currentProjectId, projectData）

**核心方法**：
- `constructor()` - 初始化全局状态
- `async init()` - 页面初始化入口
- `async loadProjectData()` - 加载项目信息
- `switchTab(tabName)` - Tab切换逻辑
- `renderProjectDetails()` - 渲染项目基本信息

**导入**：
```javascript
import { APIService } from '../common/app-core.js';
import TalentsTab from './tab-talents.js';
import JobsTab from './tab-jobs.js';
import SheetsTab from './tab-sheets.js';
```

---

### 2. tab-talents.js - 达人选择Tab

**职责**：
- 渲染达人列表（按项目合作订单展示）
- 处理达人选择（单选、全选）
- 批量操作栏管理
- 打开自动化配置弹窗

**核心方法**：
- `async load()` - 加载达人列表数据
- `render()` - 渲染达人卡片
- `handleSelection(e)` - 处理选择事件
- `handleSelectAll(e)` - 全选/取消全选
- `updateBatchActionBar()` - 更新批量操作栏
- `openAutomationConfig()` - 打开配置弹窗

**状态管理**：
- `selectedTalentIds: Set` - 已选择的达人ID集合

---

### 3. tab-jobs.js - 任务批次Tab

**职责**：
- 工作流筛选卡片（统计卡片）
- 任务批次列表（按工作流筛选）
- 任务详情弹窗
- 轮询机制（实时更新任务状态）

**核心方法**：
- `async load()` - 加载所有任务批次
- `renderWorkflowFilterCards()` - 渲染工作流筛选卡片
- `renderFilteredJobsList(workflowId)` - 渲染筛选后的任务列表
- `handleJobClick(jobId)` - 打开任务详情弹窗
- `startPolling()` - 开始轮询
- `stopPolling()` - 停止轮询

**状态管理**：
- `allJobsCache: Array` - 所有任务缓存
- `currentWorkflowFilter: String` - 当前筛选的工作流ID
- `pollingInterval: Number` - 轮询定时器ID

---

### 4. tab-sheets.js - 飞书表格Tab

**职责**：
- 显示已生成的飞书表格历史记录
- 表格记录的状态管理（待审查、已完成）
- 打开表格生成抽屉
- 更新审查状态

**核心方法**：
- `async load()` - 加载表格生成记录
- `render()` - 渲染表格列表
- `handleSheetClick(e)` - 处理表格卡片点击（打开链接、更新状态）
- `updateReviewStatus(sheetId)` - 更新"完成审查"状态

**状态管理**：
- `allSheetsCache: Array` - 所有表格记录缓存

---

### 5. modal-automation.js - 自动化配置弹窗

**职责**：
- 显示自动化任务配置弹窗
- 工作流选择
- 显示已选达人数量
- 提交任务创建请求

**核心方法**：
- `open(selectedTalentIds)` - 打开弹窗
- `close()` - 关闭弹窗
- `loadWorkflows()` - 加载可用工作流列表
- `async handleSubmit(e)` - 提交任务创建

**DOM 元素**：
- `#automation-config-modal`
- `#automation-workflow-select`
- `#automation-config-form`

---

### 6. modal-sheet-generator.js - 表格生成抽屉

**职责**：
- 抽屉式侧边栏UI
- 模板选择（支持工作流关联筛选）
- 任务选择（根据模板的 allowedWorkflowIds 筛选）
- 生成飞书表格
- 显示生成进度

**核心方法**：
- `async open()` - 打开抽屉
- `close()` - 关闭抽屉
- `loadTemplates()` - 加载映射模板列表
- `async loadTasksForTemplate(templateId)` - 根据模板加载可选任务
- `async handleGenerate()` - 生成表格
- `showProgress(steps)` - 显示生成进度

**核心逻辑**：
```javascript
// 任务筛选逻辑（根据模板的 allowedWorkflowIds）
filterTasksByTemplate(tasks, template) {
    if (!template.allowedWorkflowIds || template.allowedWorkflowIds.length === 0) {
        return tasks; // 无限制，返回所有任务
    }
    return tasks.filter(task =>
        template.allowedWorkflowIds.includes(task.workflowId)
    );
}
```

---

### 7. modals.js - 其他弹窗

**职责**：
- 任务详情弹窗（显示单个任务的详细信息和子任务列表）
- 截图查看弹窗（图片轮播）
- 数据查看弹窗（表格数据展示和复制）
- Toast 通知

**核心类/方法**：

#### JobDetailsModal
- `open(jobId)` - 打开任务详情
- `renderStats(job)` - 渲染统计信息
- `renderTasks(tasks)` - 渲染子任务列表
- `handleTaskAction(action, taskId)` - 处理任务操作（查看截图、数据）

#### ScreenshotModal
- `open(screenshots, initialIndex)` - 打开截图轮播
- `showImage(index)` - 显示指定图片
- `next()` / `prev()` - 切换图片

#### DataModal
- `open(data, title)` - 打开数据查看弹窗
- `render(data)` - 渲染表格数据
- `copyToClipboard()` - 复制数据到剪贴板

#### ToastManager
- `show(message, type)` - 显示通知

---

## 🔄 模块间通信

使用浏览器原生的 **CustomEvent** 进行通信：

### 事件列表

| 事件名 | 触发时机 | 携带数据 | 监听者 |
|--------|---------|---------|--------|
| `refreshTalents` | 任务创建成功后 | - | TalentsTab |
| `refreshJobs` | 任务创建/删除后 | - | JobsTab |
| `refreshSheets` | 表格生成成功后 | - | SheetsTab |
| `talentsSelected` | 达人选择变化 | `{ count, ids }` | main.js |

### 示例

```javascript
// 触发事件 (modal-automation.js)
document.dispatchEvent(new CustomEvent('refreshJobs'));

// 监听事件 (tab-jobs.js)
document.addEventListener('refreshJobs', () => {
    this.load();
});
```

---

## 📝 HTML 修改

修改 `project_automation.html` 的 script 引入：

```html
<!-- 新架构：模块化加载 -->
<script type="module">
    import { ProjectAutomationApp } from './project_automation/main.js';
    window.addEventListener('DOMContentLoaded', () => {
        const app = new ProjectAutomationApp();
        app.init();
    });
</script>

<!-- 备份：回退到旧版本时启用 -->
<!-- <script src="project_automation.js" defer></script> -->
```

---

## 🎨 关键技术要点

### 1. 工作流筛选卡片（Tab 2）

```javascript
// tab-jobs.js
renderWorkflowFilterCards() {
    const stats = this.calculateWorkflowStats();

    const html = `
        <div class="stat-card" data-workflow="all">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">全部任务</div>
        </div>
        ${stats.workflows.map(wf => `
            <div class="stat-card" data-workflow="${wf.id}">
                <div class="stat-value">${wf.count}</div>
                <div class="stat-label">${wf.name}</div>
            </div>
        `).join('')}
    `;

    // 点击卡片切换筛选
    container.addEventListener('click', (e) => {
        const card = e.target.closest('.stat-card');
        if (card) {
            this.currentWorkflowFilter = card.dataset.workflow;
            this.renderFilteredJobsList();
        }
    });
}
```

### 2. 模板-工作流关联筛选（Tab 3）

```javascript
// modal-sheet-generator.js
async loadTasksForTemplate(templateId) {
    const template = this.templates.find(t => t._id === templateId);
    const allTasks = await this.loadAllCompletedTasks();

    // 根据模板配置筛选任务
    const filteredTasks = this.filterTasksByTemplate(allTasks, template);

    if (filteredTasks.length === 0) {
        this.showEmptyState(template);
    } else {
        this.renderTasksList(filteredTasks);
    }
}
```

### 3. 轮询机制

```javascript
// tab-jobs.js
startPolling() {
    this.stopPolling(); // 先停止已有轮询

    this.pollingInterval = setInterval(async () => {
        await this.load(); // 重新加载任务
        this.renderFilteredJobsList(); // 刷新UI
    }, 5000); // 每5秒轮询一次
}

stopPolling() {
    if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
    }
}
```

---

## ✅ 升级检查清单

### 准备阶段
- [ ] 阅读本方案文档
- [ ] 阅读原 `project_automation.js` 代码
- [ ] 确认 3 个 Tab 的功能边界
- [ ] 确认所有 Modal/Drawer 的功能

### 开发阶段
- [ ] 创建 `project_automation/` 目录
- [ ] 创建 `main.js` - 主控制器
- [ ] 创建 `tab-talents.js` - 达人选择Tab
- [ ] 创建 `tab-jobs.js` - 任务批次Tab
- [ ] 创建 `tab-sheets.js` - 飞书表格Tab
- [ ] 创建 `modal-automation.js` - 自动化配置弹窗
- [ ] 创建 `modal-sheet-generator.js` - 表格生成抽屉
- [ ] 创建 `modals.js` - 其他弹窗
- [ ] 修改 `project_automation.html`

### 测试阶段
- [ ] Tab 切换正常
- [ ] 达人选择/批量操作正常
- [ ] 工作流筛选卡片正常
- [ ] 任务批次列表正常
- [ ] 任务详情弹窗正常
- [ ] 表格生成功能正常（模板-工作流关联筛选）
- [ ] 轮询机制正常（任务状态实时更新）
- [ ] 所有弹窗/抽屉正常
- [ ] 截图查看/数据查看正常

---

## 📊 预期成果

| 指标 | 升级前 | 升级后 |
|------|--------|--------|
| 文件数量 | 1 个 | 8 个（7个模块 + 1个备份） |
| 单文件行数 | 1198 行 | 150-280 行/文件 |
| 职责划分 | ❌ 混乱 | ✅ 清晰 |
| 可维护性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可扩展性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🔧 开发注意事项

1. **保持原有功能不变**：模块化是重构，不是重写
2. **复用 app-core.js**：API调用、格式化等通用工具
3. **事件委托**：列表中的按钮使用事件委托处理
4. **绑定 this**：在 constructor 中绑定事件处理方法
5. **轮询管理**：Tab切换时注意启动/停止轮询
6. **内存管理**：切换Tab时销毁不需要的资源

---

**最后更新**: 2025-11-04
**适用版本**: project_automation.js v6.5+
