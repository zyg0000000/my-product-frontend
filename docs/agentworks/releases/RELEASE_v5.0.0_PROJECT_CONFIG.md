# Release v5.0.0 - 客户项目配置管理系统

**发布日期**: 2025-12-11
**版本号**: v5.0.0
**类型**: 重大功能更新

---

## 概述

本版本引入**客户项目配置管理系统**，允许为不同客户定制项目详情页的显示内容。这是一个重大的架构升级，为后续的客户个性化功能奠定基础。

---

## 核心功能

### 1. 客户项目配置管理页面

**路径**: `/customers/:id/project-config`

新增独立的配置管理页面，支持：
- **Tab 可见性控制** - 控制项目详情页显示哪些 Tab（合作达人、执行追踪、财务管理、效果验收）
- **效果验收配置** - 配置效果指标（播放、点赞、GMV、ROI等）和数据周期（T+7、T+21、T+30）
- **基准值设置** - 为 CPM、CPE、ROI 等指标设置基准值
- **预留扩展点** - 为执行追踪、财务管理的未来配置预留接口

### 2. 项目详情页动态渲染

项目详情页现在根据所属客户的配置动态渲染：
- 根据 `tabVisibility` 配置过滤显示的 Tab
- 自动切换到第一个可见的 Tab（当当前 Tab 被隐藏时）
- 效果验收 Tab 接收 `effectConfig` 配置（阶段二实现动态指标）

### 3. 客户详情页新增入口

在客户详情页的功能模块区新增「项目配置管理」卡片：
- 显示配置状态（已定制/使用系统默认）
- 紫色渐变主题图标
- 点击进入配置页面

---

## 新增文件

### 类型定义
```
frontends/agentworks/src/types/projectConfig.ts
```
- `CustomerProjectConfig` - 客户项目配置接口
- `TabVisibilityConfig` - Tab 可见性配置
- `EffectTabConfig` - 效果验收配置
- `DEFAULT_PROJECT_CONFIG` - 系统默认配置
- `AVAILABLE_EFFECT_METRICS` - 可用效果指标列表
- `PROJECT_TABS_METADATA` - Tab 元数据

### Hooks
```
frontends/agentworks/src/hooks/useCustomerProjectConfig.ts
```
- 根据 customerId 获取客户项目配置
- 自动合并默认配置
- 处理未配置客户的兼容性

### 页面组件
```
frontends/agentworks/src/pages/Customers/ProjectConfig/
├── ProjectConfigPage.tsx      # 主配置页面
├── TabVisibilityEditor.tsx    # Tab 开关编辑器
└── EffectConfigEditor.tsx     # 效果配置编辑器
```

---

## 修改文件

### 前端

| 文件 | 改动说明 |
|------|---------|
| `types/customer.ts` | 新增 `projectConfig` 字段到 Customer 接口 |
| `App.tsx` | 新增路由 `/customers/:id/project-config` |
| `CustomerDetail.tsx` | 新增「项目配置管理」功能卡片 |
| `ProjectDetail.tsx` | 根据客户配置动态渲染 Tab |
| `EffectTab.tsx` | 新增 `effectConfig` props（预留阶段二） |

### 后端

| 文件 | 改动说明 |
|------|---------|
| `functions/customers/index.js` | `allowedFields` 新增 `'projectConfig'` |

---

## 数据结构

### CustomerProjectConfig

```typescript
interface CustomerProjectConfig {
  enabled: boolean;
  tabVisibility: {
    collaborations: boolean;  // 合作达人
    execution: boolean;       // 执行追踪
    finance: boolean;         // 财务管理
    effect: boolean;          // 效果验收
  };
  effectConfig?: {
    enabledPeriods: ('t7' | 't21' | 't30')[];
    enabledMetrics: string[];
    benchmarks?: { cpm?: number; cpe?: number; roi?: number; };
    customMetrics?: EffectMetricConfig[];
  };
  executionConfig?: ExecutionTabConfig;  // 预留
  financeConfig?: FinanceTabConfig;      // 预留
  updatedAt?: string;
  updatedBy?: string;
}
```

### 默认配置

```typescript
const DEFAULT_PROJECT_CONFIG = {
  enabled: false,
  tabVisibility: {
    collaborations: true,
    execution: true,
    finance: true,
    effect: true,
  },
  effectConfig: {
    enabledPeriods: ['t7', 't21'],
    enabledMetrics: ['plays', 'likes', 'comments', 'shares', 'cpm'],
    benchmarks: {},
  },
};
```

---

## 向后兼容性

- **无数据迁移** - `projectConfig` 是新增字段，现有客户无需迁移
- **自动降级** - 未配置的客户自动使用 `DEFAULT_PROJECT_CONFIG`
- **Hook 兼容** - `useCustomerProjectConfig` 自动处理空值和部分配置

---

## 使用指南

### 为客户配置项目显示

1. 进入客户详情页 `/customers/:id`
2. 点击「项目配置管理」卡片
3. 开启「启用自定义配置」开关
4. 配置 Tab 可见性和效果指标
5. 点击「保存配置」

### 验证配置效果

1. 进入该客户的任意项目详情页
2. 确认 Tab 栏只显示已启用的 Tab
3. 确认效果验收 Tab 显示配置的指标（阶段二）

---

## 后续规划

### 阶段二（计划中）
- EffectTab 动态指标列渲染
- 根据 `enabledMetrics` 动态生成表格列
- 根据 `enabledPeriods` 动态生成数据周期 Tab

### 阶段三（未来）
- 执行追踪配置（延期预警、统计卡片）
- 财务管理配置（字段控制、调整项）

---

## 测试清单

- [x] 配置页面正常加载
- [x] Tab 开关切换正常保存
- [x] 效果指标配置正常保存
- [x] 项目详情页根据配置动态渲染 Tab
- [x] 未配置客户使用默认配置
- [x] TypeScript 类型检查通过
- [x] ESLint 检查通过

---

## 相关 PR

- 本次提交包含完整的客户项目配置管理功能实现

---

**维护者**: Claude Code
**文档版本**: 1.0
**最后更新**: 2025-12-11
