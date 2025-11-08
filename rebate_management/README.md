# Rebate Management 模块架构

## 概述
本项目将原有的 `rebate_management.js` 单文件（699行）重构为11个ES6模块，实现了关注点分离和更好的代码组织结构。

## 模块结构

### 1. constants.js
- **功能**: 常量定义
- **导出**:
  - `API_BASE_URL`: API基础地址
  - `ITEMS_PER_PAGE_KEY`: localStorage键名
- **依赖**: 无

### 2. utils.js
- **功能**: 通用工具函数
- **导出**:
  - `showCustomAlert()`: 显示提示框
  - `showCustomConfirm()`: 显示确认框
  - `hideModal()`: 隐藏模态框
- **依赖**: 无
- **特点**: 动态创建和管理自定义模态框DOM

### 3. api.js
- **功能**: API请求处理
- **导出**:
  - `apiRequest()`: 通用API请求函数
- **依赖**:
  - `constants.js`: API_BASE_URL
  - `utils.js`: showCustomAlert

### 4. state-manager.js
- **功能**: 全局状态管理
- **导出**:
  - 状态变量: `allProjects`, `allCollaborations`, `rebateTasks`, `displayedTasks`, `currentPage`, `itemsPerPage`, `openRowId`, `currentUploadTaskId`
  - 更新函数: `updateCurrentPage()`, `updateItemsPerPage()`, `updateOpenRowId()`, `updateCurrentUploadTaskId()`, `updateAllProjects()`, `updateAllCollaborations()`, `updateRebateTasks()`, `updateDisplayedTasks()`
  - 辅助函数: `getTaskById()`, `updateTask()`
- **依赖**:
  - `constants.js`: ITEMS_PER_PAGE_KEY
- **特点**: localStorage持久化itemsPerPage

### 5. dashboard.js
- **功能**: 仪表盘统计信息渲染
- **导出**:
  - `renderDashboard()`: 渲染统计卡片
- **依赖**:
  - `state-manager.js`: displayedTasks

### 6. table-renderer.js
- **功能**: 表格渲染
- **导出**:
  - `renderTable()`: 渲染主表格
  - `renderDetailsRowContent()`: 渲染详情行内容
- **依赖**:
  - `state-manager.js`: 状态变量和函数
  - `pagination.js`: renderPagination

### 7. pagination.js
- **功能**: 分页控件渲染
- **导出**:
  - `renderPagination()`: 渲染分页控件
- **依赖**:
  - `state-manager.js`: currentPage, itemsPerPage

### 8. filter-panel.js
- **功能**: 筛选面板
- **导出**:
  - `renderProjectFilter()`: 渲染项目筛选器
  - `applyFilters()`: 应用筛选条件
- **依赖**:
  - `state-manager.js`: rebateTasks, updateDisplayedTasks, allProjects

### 9. details-panel.js
- **功能**: 详情面板操作
- **导出**:
  - `handleSaveRebate()`: 保存返点信息
  - `handleDeleteRecord()`: 删除记录
  - `smartRefreshDetailsView()`: 智能刷新视图
- **依赖**:
  - `api.js`: apiRequest
  - `utils.js`: showCustomAlert, showCustomConfirm, hideModal
  - `state-manager.js`: 状态管理函数
  - `table-renderer.js`: renderTable
- **特点**: 通过自定义事件 `rebate-data-changed` 触发数据重载

### 10. image-handler.js
- **功能**: 图片处理
- **导出**:
  - `handleImageUpload()`: 处理图片上传
  - `handleDeleteScreenshot()`: 删除单个截图
  - `initImageViewer()`: 初始化查看器
  - `showImageViewer()`: 显示图片查看器
- **依赖**:
  - `api.js`: apiRequest
  - `utils.js`: 提示框函数
  - `state-manager.js`: 状态管理
  - `details-panel.js`: smartRefreshDetailsView

### 11. main.js
- **功能**: 主入口，协调所有模块
- **主要功能**:
  - `loadInitialData()`: 加载初始数据
  - `aggregateRebateTasks()`: 聚合任务数据
  - `renderPage()`: 渲染页面
  - `initializePage()`: 初始化页面和事件监听
- **依赖**: 所有其他模块
- **特点**:
  - 统一处理事件委托
  - 监听 `rebate-data-changed` 事件
  - 协调模块间通信

## 依赖关系图

```
constants.js
    ↓
utils.js
    ↓
api.js ← constants.js
    ↓
state-manager.js ← constants.js
    ↓
┌─────────────────────────┐
│   UI Component Layer    │
├─────────────────────────┤
│ • dashboard.js          │
│ • table-renderer.js     │
│ • pagination.js         │
│ • filter-panel.js       │
│ • details-panel.js      │
│ • image-handler.js      │
└─────────────────────────┘
    ↓
main.js (协调所有模块)
```

## 使用方式

在HTML中引入主模块：
```html
<script type="module" src="rebate_management/main.js"></script>
```

## 特点
1. **模块化架构**: 每个模块负责单一职责
2. **ES6语法**: 使用import/export进行模块管理
3. **状态集中管理**: state-manager.js统一管理应用状态
4. **事件驱动**: 通过自定义事件实现模块间通信
5. **保持原有逻辑**: 重构过程中未改变原有业务逻辑

## 版本
- 原始版本: v5.1-data-source-fix
- 模块化版本: v5.1-modularized