# 任务中心模块架构

## 概述

任务中心已从单一的 `task_center.js` 文件（437行）重构为模块化的 ES6 架构，包含11个专注的模块。这种架构提高了代码的可维护性、可测试性和可扩展性。

## 模块结构

### 1. **constants.js** - 常量配置
- API 端点定义
- 系统配置常量
- 无外部依赖

### 2. **utils.js** - 工具函数
- `showToast()` - 显示提示消息
- `formatRelativeTime()` - 格式化相对时间
- `getNextDayOfWeek()` - 获取下一个指定星期几的日期
- `getNextMonthDay()` - 获取下一个指定月份日期

### 3. **api.js** - API请求封装
- `apiRequest()` - 统一的API请求处理
- 自动错误处理和提示
- 依赖：`utils.js`（showToast）

### 4. **state-manager.js** - 状态管理
- 全局状态存储
- 状态更新方法
- 状态获取方法

### 5. **system-status.js** - 系统状态卡片
- 性能数据卡片渲染
- 价格状态卡片渲染
- 卡片交互处理
- 依赖：`api.js`、`utils.js`、`performance-sync.js`

### 6. **task-list.js** - 任务列表渲染
- 任务分类分发
- 列表渲染逻辑
- 空状态处理

### 7. **task-details.js** - 任务详情管理
- 手风琴展开/收起
- 待发布编辑器
- 协作信息保存
- 依赖：`api.js`、`utils.js`、`data-sync.js`

### 8. **data-sync.js** - 数据同步（T+7/T+21）
- 飞书表格同步组件
- T+7/T+21数据处理
- 依赖：`api.js`、`utils.js`

### 9. **performance-sync.js** - 性能数据同步
- 性能数据同步组件
- 飞书表格数据导入
- 依赖：`api.js`、`utils.js`

### 10. **logs.js** - 日志管理
- 运行日志获取
- 日志状态显示
- 依赖：`api.js`、`utils.js`

### 11. **main.js** - 主控制器
- 页面初始化
- 事件委托设置
- 模块协调
- 自定义事件处理

## 依赖关系链

```
constants.js (无依赖)
     ↓
utils.js (无依赖)
     ↓
api.js (依赖 constants, utils)
     ↓
state-manager.js (独立)
     ↓
UI 模块 (system-status, task-list, task-details, data-sync, performance-sync, logs)
     ↓
main.js (协调所有模块)
```

## 重构优势

### 1. **代码组织**
- 每个模块职责单一，易于理解和维护
- 清晰的依赖关系，避免循环依赖
- 模块化结构便于团队协作

### 2. **可维护性**
- 模块独立更新，减少影响范围
- 易于定位和修复问题
- 代码复用性提高

### 3. **可测试性**
- 每个模块可独立测试
- 依赖注入更容易模拟
- 单元测试覆盖率提升

### 4. **性能优化**
- 按需加载模块
- 减少全局作用域污染
- 更好的代码分割支持

## 使用方式

在 HTML 文件中，需要将原来的引用：

```html
<script src="task_center.js"></script>
```

更改为：

```html
<script type="module" src="task_center/main.js"></script>
```

## 事件通信

模块之间通过自定义事件进行通信：

- `refreshTasks` - 刷新任务列表
- `refreshLogs` - 刷新日志
- `refreshSystemStatus` - 刷新系统状态

## 注意事项

1. **侧边栏依赖**：主模块不再包含侧边栏初始化，完全依赖外部的 `sidebar.js`
2. **DOM结构**：所有CSS类名和DOM结构保持不变，确保向后兼容
3. **API格式**：所有API请求和响应格式保持原样
4. **事件委托**：使用单一的全局事件监听器提高性能

## 版本历史

- **v12.1-modular** - 模块化重构版本
- **v12.1-sidebar-refactor** - 原始单文件版本