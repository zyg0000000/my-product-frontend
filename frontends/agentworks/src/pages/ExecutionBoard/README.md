# 执行看板 (ExecutionBoard)

执行看板是一个独立页面，用于管理和追踪「达人采买」业务的内容发布执行情况。

## 功能概述

| 功能 | 说明 |
|------|------|
| 日历周视图 | 以周为单位展示合作发布计划，支持拖拽改期 |
| 全周期概览 | 显示项目所有周的发布进度，快速跳转 |
| KPI 统计 | 统计发布率、延期数等关键指标 |
| 多维度筛选 | 支持按客户、项目、平台、周期筛选 |
| 编辑弹窗 | 编辑发布日期、星图任务ID、视频ID |

## 文件结构

```
src/pages/ExecutionBoard/
├── ExecutionBoard.tsx              # 主页面
├── index.ts                        # 导出入口
├── types.ts                        # 类型定义
├── utils.ts                        # 工具函数（日期处理、颜色分配）
├── README.md                       # 本文档
├── components/
│   ├── FilterBar.tsx               # 筛选栏（客户、项目、平台、周期）
│   ├── KPIPanel.tsx                # KPI 统计面板
│   ├── WeekOverview.tsx            # 全周期概览（周卡片导航）
│   ├── CalendarView.tsx            # 日历周视图（7天网格）
│   ├── TalentCard.tsx              # 达人卡片（可拖拽）
│   ├── EditModal.tsx               # 编辑弹窗
│   └── ViewModal.tsx               # 查看弹窗（只读）
└── hooks/
    ├── useExecutionData.ts         # 数据加载 Hook
    └── useCalendarNavigation.ts    # 日历导航 Hook
```

## 核心组件

### ExecutionBoard.tsx
主页面容器，负责：
- 管理筛选状态
- 协调子组件通信
- 处理合作记录的增删改查

### FilterBar.tsx
筛选栏组件，支持：
- **客户筛选**: 单选，选择后加载对应项目
- **项目筛选**: 多选，支持全选/取消
- **平台筛选**: 多选，根据项目动态获取
- **周期筛选**:
  - 业务周期 (year/month)
  - 财务周期 (financialYear/financialMonth)

级联逻辑：
```
客户变更 → 重新加载项目列表 → 清空已选项目
周期变更 → 重新加载项目列表 → 清空已选项目
项目变更 → 前端筛选合作记录
```

### KPIPanel.tsx
统计面板，显示：
- 全周期：总计划数、已发布数、发布率、延期数
- 当周：本周计划数、已发布数、发布率、今日到期、本周到期、延期数

### WeekOverview.tsx
全周期概览，功能：
- 显示项目周期内所有周的卡片
- 每周显示发布进度条和数量
- 点击跳转到对应周
- 当前周高亮显示

### CalendarView.tsx
日历周视图，功能：
- 7天网格布局（周一到周日）
- 支持 HTML5 Drag & Drop 拖拽改期
- 周导航（上一周/下一周/回到今天）
- 今日列高亮

### TalentCard.tsx
达人卡片，显示：
- 项目名称（带颜色标识）
- 达人昵称
- 平台图标
- 状态标签（已发布/待发布/延期）
- 日期信息

### EditModal.tsx / ViewModal.tsx
编辑/查看弹窗：
- 项目状态 = `executing` → 打开编辑弹窗
- 其他状态 → 打开只读查看弹窗

可编辑字段：
- 计划发布日期
- 实际发布日期
- 星图任务ID（带外链）
- 视频ID（带外链）

## Hooks

### useExecutionData
数据加载逻辑：
```typescript
const {
  customers,        // 客户列表
  projectMap,       // 项目Map (id -> Project)
  collaborations,   // 合作记录列表
  loading,          // 加载状态
  updateCollaboration,  // 更新合作记录
  refreshData,      // 刷新数据
} = useExecutionData(filters);
```

### useCalendarNavigation
日历导航逻辑：
```typescript
const {
  currentWeekStart,  // 当前周起始日期
  projectCycle,      // 项目周期信息
  navigateWeek,      // 导航到上/下一周
  jumpToWeek,        // 跳转到指定周
  goToToday,         // 回到今天所在周
} = useCalendarNavigation(collaborations);
```

## 业务规则

### 数据筛选
- 仅显示 `businessType = 'talentProcurement'` 的项目
- 仅显示 `status = 'customerScheduled' | 'videoPublished'` 的合作记录

### 权限控制
- 项目状态 = `executing` 时允许编辑和拖拽
- 其他状态只能查看

### 延期判断
```typescript
function isDelayed(collab: Collaboration): boolean {
  // 已发布：实际日期 > 计划日期 = 延期
  // 未发布：今天 > 计划日期 = 延期
}
```

## 设计系统

### 颜色规范
使用 AgentWorks 语义化 CSS 变量：
- 背景: `bg-surface`, `bg-surface-secondary`
- 文字: `text-content`, `text-content-secondary`
- 边框: `border-stroke`, `bg-stroke`
- 状态: `bg-success-*`, `bg-warning-*`, `bg-danger-*`

### 深色模式
通过 CSS 变量自动适配，无需 `dark:` 前缀：
```css
/* 亮色模式 */
:root {
  --aw-bg-surface: #ffffff;
}

/* 深色模式 */
.dark {
  --aw-bg-surface: #1f2937;
}
```

### 项目颜色
使用 8 色循环分配项目边框颜色：
```typescript
const PROJECT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];
```

## API 依赖

| API | 用途 |
|-----|------|
| `GET /customers` | 获取客户列表 |
| `GET /projects` | 获取项目列表（支持 customerId, businessType, year, month 等参数） |
| `GET /projects/:id/collaborations` | 获取项目合作记录 |
| `PUT /collaborations/:id` | 更新合作记录 |

## 路由配置

```typescript
// App.tsx
<Route path="execution-board" element={<ExecutionBoard />} />
```

## 侧边栏入口

```typescript
// Sidebar.tsx - 项目管理子菜单
{ name: '执行看板', path: '/execution-board' }
```

## 开发注意事项

1. **类型安全**: 使用 `ProjectListItem` 而非 `Project`（API 返回的是列表项类型）
2. **日期处理**: 使用 `parseLocalDate()` 避免时区问题
3. **外链生成**: 使用 `useTalentLinks` hook 的 `getCollaborationLinks()` 和 `getVideoLink()` 方法
4. **性能**: 大量卡片时考虑虚拟滚动优化
