# AgentWorks 更新日志 - 2025-12-25

## 概述

完成项目日报首页（DailyReportHome）的统计数据计算优化，改为在前端使用财务计算模块计算金额，与财务管理 Tab 的计算逻辑保持一致。

---

## 重点修复：金额计算逻辑

### 背景

项目日报首页的金额进度显示始终为 0，原因是：
1. 原先尝试在云函数中计算金额，但计算逻辑复杂且与前端财务模块不一致
2. 金额计算涉及多种定价模式（框架模式/比价模式）和平台报价系数
3. 前端已有完善的财务计算模块（`financeCalculator.ts`）

### 解决方案

将 trackingStats 的计算从后端移至前端，复用现有的财务计算模块：

1. **回滚云函数修改**：保持 `getProjects` 云函数简洁
2. **使用完整视图 API**：改用 `projectApi.getProjects` 获取包含 collaborations 的完整数据
3. **前端计算 trackingStats**：使用 `calculateCollaborationFinance` 函数计算金额

### 计算逻辑

```typescript
// 使用财务计算模块
const financeContext = createFinanceContextFromProject(project, platformConfigs);

// 计算总金额（所有已定档+已发布的合作）
scheduledCollabs.forEach(collab => {
  const finance = collab.finance || calculateCollaborationFinance(collab, financeContext);
  totalAmount += finance.revenue;
});
```

**金额计算规则**（与财务管理 Tab 一致）：
- **框架模式** (`pricingMode === 'framework'`): `revenue = amount × coefficient`
- **比价模式** (`pricingMode === 'project'`): `revenue = quotationPrice`
- 如果合作记录已有 `finance.revenue`，直接使用

---

## 文件变更

### 修改文件

| 文件 | 改动内容 |
|------|----------|
| `DailyReportHome.tsx` | 重写数据加载和统计计算逻辑 |
| `TrackingConfigModal.tsx` | 修复 antd 警告：`destroyOnClose` → `destroyOnHidden` |
| `functions/getProjects/index.js` | 回滚之前的金额计算修改 |

### DailyReportHome.tsx 主要改动

1. **新增导入**：
   ```typescript
   import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
   import {
     calculateCollaborationFinance,
     createFinanceContextFromProject,
     FINANCE_VALID_STATUSES,
   } from '../../../utils/financeCalculator';
   ```

2. **新增 Hook 调用**：
   ```typescript
   const { configs: platformConfigs, loading: configLoading } = usePlatformConfig();
   ```

3. **新增 `calculateTrackingStats` 函数**：
   - 筛选已定档+已发布的合作记录（达人进度分母）
   - 找出最新数据日期 `latestDataDate`
   - 使用财务模块计算 `totalAmount` 和 `enteredAmount`
   - 计算 `avgCPM = (enteredAmount / totalViews) * 1000`

4. **修改 `loadProjects` 函数**：
   - 改用 `projectApi.getProjects` 获取完整数据
   - 等待平台配置加载完成后再请求数据
   - 前端计算并附加 `trackingStats`

---

## 技术说明

### trackingStats 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `collaborationCount` | number | 已定档+已发布的合作数（达人进度分母） |
| `dataEnteredCount` | number | 在 latestDataDate 有数据的合作数（达人进度分子） |
| `totalAmount` | number | 总金额（分），已定档+已发布合作的收入之和 |
| `enteredAmount` | number | 已录入金额（分），有数据合作的收入之和 |
| `totalViews` | number | 总播放量（latestDataDate 当天） |
| `avgCPM` | number | 平均 CPM = (enteredAmount/100) / totalViews * 1000 |
| `latestDataDate` | string | 最新数据日期，格式 YYYY-MM-DD |

### 状态筛选规则

- **达人进度分母**：状态为「客户已定档」或「视频已发布」的合作
- **达人进度分子**：分母中在 `latestDataDate` 有日报数据的合作
- **金额进度**：同样的筛选逻辑，分别计算 `totalAmount` 和 `enteredAmount`

---

## Bug 修复

### 1. antd Modal 警告

**问题**：控制台警告 `destroyOnClose is deprecated`

**修复**：
```diff
- destroyOnClose
+ destroyOnHidden
```

### 2. usePlatformConfig 返回值

**问题**：`Cannot read properties of undefined (reading 'length')`

**原因**：Hook 返回的字段名是 `configs`，不是 `platformConfigs`

**修复**：
```typescript
const { configs: platformConfigs, loading: configLoading } = usePlatformConfig();
```

---

## 测试要点

1. **金额显示正确**：与项目详情页的财务管理 Tab 中的「收入」数值一致
2. **达人进度正确**：分母为已定档+已发布数，分子为有数据的合作数
3. **CPM 计算正确**：avgCPM = (金额元 / 播放量) * 1000
4. **平台配置加载**：等待平台配置加载完成后再显示数据

---

## 相关文档

- [财务计算模块](../../../frontends/agentworks/src/utils/financeCalculator.ts)
- [平台配置 Hook](../../../frontends/agentworks/src/hooks/usePlatformConfig.ts)
- [项目日报功能](../features/PROJECT_REPORT.md)

---

**开发者**: Claude Code
**日期**: 2025-12-25
**版本**: v3.6.1 (日报金额计算优化)
