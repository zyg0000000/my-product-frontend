# 项目分析模块文档

## 概述

项目分析模块采用 ES6 模块化架构，将原始的单体 JavaScript 文件重构为 9 个独立且职责单一的模块。该架构提升了代码的可维护性、可测试性和可复用性。

## 模块结构

### 1. constants.js - 常量配置模块
**职责**: 管理所有应用常量和配置
- API 基础 URL 和端点配置
- 时间维度选项（财务/自然）
- 默认筛选器值
- 图表配置（颜色、样式）

**主要导出**:
- `API_BASE_URL` - API 基础地址
- `API_ENDPOINTS` - API 端点映射
- `TIME_DIMENSIONS` - 时间维度常量
- `DEFAULT_FILTERS` - 默认筛选器配置
- `CHART_CONFIG` - 图表配置常量

### 2. utils.js - 工具函数模块
**职责**: 提供通用的格式化和数据处理函数
- 数字、货币、百分比格式化
- 月度数据排序
- 唯一值提取

**主要导出**:
- `formatNumber(num)` - 格式化数字（千位分隔）
- `formatCurrency(num)` - 格式化货币（人民币）
- `formatPercent(num)` - 格式化百分比
- `sortMonthlyData(data)` - 月度数据排序
- `getUniqueValues(items, field)` - 提取唯一值
- `getUniqueYears(items, field)` - 提取唯一年份

### 3. api.js - API 请求模块
**职责**: 封装 API 请求逻辑和错误处理
- 统一的请求接口
- 错误处理机制
- 响应数据解析

**主要导出**:
- `apiRequest(endpoint, options)` - 异步 API 请求函数

### 4. state-manager.js - 状态管理模块
**职责**: 集中管理应用状态
- 项目数据存储
- 筛选器状态管理
- 筛选后的项目列表

**主要导出**:
- `updateProjects(projects)` - 更新项目数据
- `updateFilters(filters)` - 更新筛选条件
- `resetFilters()` - 重置筛选器
- `getProjects()` - 获取所有项目
- `getFilteredProjects()` - 获取筛选后的项目
- `getFilters()` - 获取当前筛选器
- `getState()` - 获取完整状态

### 5. filter.js - 筛选器模块
**职责**: 管理筛选器 UI 和逻辑
- 动态填充筛选选项
- 应用筛选条件
- 重置筛选器

**主要导出**:
- `populateFilterOptions(projects)` - 填充筛选器选项
- `applyFilters()` - 应用筛选条件
- `resetFilters()` - 重置所有筛选器
- `getCurrentFilterValues()` - 获取当前筛选值

### 6. kpi-calculator.js - KPI 计算模块
**职责**: 计算各项业务指标
- KPI 汇总计算（与 index.js 逻辑一致）
- 月度趋势数据计算
- 利润率等衍生指标计算

**主要导出**:
- `calculateKpiSummary(projects)` - 计算 KPI 汇总
- `calculateMonthlyTrend(projects)` - 计算月度趋势

### 7. chart-renderer.js - 图表渲染模块
**职责**: 渲染和更新图表
- 月度趋势图表渲染（使用 Chart.js）
- KPI 卡片数据更新
- 图表交互和格式化

**主要导出**:
- `renderChart(monthlyData)` - 渲染月度趋势图
- `renderKpiCards(kpiSummary)` - 渲染 KPI 卡片
- `destroyChart()` - 销毁图表实例

### 8. main.js - 主模块
**职责**: 应用初始化和模块协调
- DOM 初始化
- 事件监听器设置
- 数据获取和渲染协调
- 模块间通信协调

**主要导出**:
- `fetchAndRenderData()` - 获取数据并渲染
- `renderAnalysis()` - 渲染分析视图
- `initializePage()` - 页面初始化

### 9. README.md - 文档模块
当前文档，提供模块架构说明和使用指南。

## 依赖关系图

```
                    main.js
                       |
        +--------------+--------------+
        |              |              |
    filter.js   kpi-calculator.js  chart-renderer.js
        |              |              |
        +--------------+--------------+
                       |
                state-manager.js
                       |
                    api.js
                       |
                  constants.js
                       |
                   utils.js
```

## 使用示例

### 在 HTML 中引入模块

```html
<!-- 在 HTML 文件底部引入主模块 -->
<script type="module" src="/project_analysis/main.js"></script>
```

### 手动触发数据刷新

```javascript
import { fetchAndRenderData } from './main.js';

// 刷新数据和视图
await fetchAndRenderData();
```

### 获取当前筛选状态

```javascript
import { getState } from './state-manager.js';

const currentState = getState();
console.log('当前筛选的项目数:', currentState.filteredProjects.length);
console.log('当前筛选条件:', currentState.filters);
```

### 自定义 KPI 计算

```javascript
import { calculateKpiSummary } from './kpi-calculator.js';
import { getFilteredProjects } from './state-manager.js';

const projects = getFilteredProjects();
const customKpi = calculateKpiSummary(projects);
console.log('总收入:', customKpi.totalIncomeAgg);
```

## 模块特性

### 前端计算对齐
- 所有 KPI 计算逻辑与 `index.js` 保持一致
- 使用相同的筛选和聚合逻辑
- 确保项目数量计算的一致性

### ES6 模块化
- 使用 `import/export` 语法
- 清晰的依赖关系
- 每个模块职责单一

### 错误处理
- API 请求包含完整的错误处理
- 用户友好的错误提示
- 控制台详细的错误日志

### 性能优化
- 图表实例复用（更新而非重建）
- 状态缓存避免重复计算
- DOM 操作最小化

## 维护指南

### 添加新的筛选条件
1. 在 `constants.js` 中添加默认值
2. 在 `state-manager.js` 的筛选逻辑中添加条件
3. 在 `filter.js` 中添加 UI 填充逻辑

### 添加新的 KPI 指标
1. 在 `kpi-calculator.js` 中添加计算逻辑
2. 在 `chart-renderer.js` 中添加渲染逻辑
3. 确保 HTML 中有对应的 DOM 元素

### 修改 API 端点
1. 在 `constants.js` 中更新 `API_ENDPOINTS`
2. 在 `main.js` 中更新相应的 API 调用

## 版本历史

- **v3.2** (2025-12) - T+7/T+21 数据周期与 CPM 一致性修复
  - 新增数据周期切换功能：
    - T+7（项目交付）：视频发布后 7 天的效果数据
    - T+21（财务交付）：视频发布后 21 天的效果数据
    - 支持在看板顶部切换数据周期
  - 交付日期过滤逻辑：
    - 只统计已到交付日期的项目（lastPublishDate + periodDays <= today）
    - 客户视角和达人视角使用相同的过滤逻辑
  - CPM 一致性修复：
    - 后端 API 新增 `totalExecutionAmount` 字段
    - 客户视角使用 API 返回的执行金额（与达人视角一致）
    - 达人视角效果统计只计算"视频已发布"状态（与后端 API 一致）
    - 两个视角的 CPM 计算公式统一：`执行金额 / 播放量 × 1000`

- **v3.1** (2025-12) - 效果达成与UI优化
  - 效果达成KPI卡片优化：
    - 将"T+21 总互动量"改为"实际 CPM"卡片
    - 数字格式化使用中文单位（亿/万）代替M/K
    - 优化目标/实际展示格式，更清晰直观
  - 客户视角术语统一：
    - "客户收入"改为"代理消耗"
  - 效果达成统计逻辑修复：
    - 只统计"视频已发布"状态的合作

- **v3.0** (2025-11) - 模块化重构
  - 将单体文件拆分为 9 个 ES6 模块
  - 保持所有原有功能
  - 提升代码可维护性和可测试性