# AgentWorks 更新日志 - 2025-12-08

## 概述

完成项目管理模块平台配置动态化改造，将所有硬编码的平台常量替换为系统级 API 配置，并优化搜索模块支持财务周期筛选。

---

## 重构：平台配置动态化

### 背景

项目管理模块原先使用硬编码的平台常量（`PLATFORM_NAMES`、`PLATFORM_COLORS`），导致：
1. 新增平台需要修改多个前端文件
2. 平台配置分散在各处，难以维护
3. 与系统设置中的平台配置不一致

### 解决方案

统一使用 `usePlatformConfig` Hook 从 `system_config` 集合获取平台配置。

### 改动范围

| 文件 | 改动内容 |
|------|----------|
| `usePlatformConfig.ts` | 新增 `getPlatformColors()` 方法 |
| `ProjectList.tsx` | 平台筛选 valueEnum、名称、颜色动态化 |
| `ProjectFormModal.tsx` | 平台选项列表动态化 |
| `ProjectsHome.tsx` | 平台名称、颜色动态化 |
| `ProjectDetail.tsx` | 项目基本信息平台显示动态化 |
| `ExecutionTab.tsx` | 合作记录平台筛选和显示动态化 |
| `CollaborationsTab.tsx` | 合作记录平台显示动态化 |
| `CollaborationFormModal.tsx` | 达人搜索结果平台名称动态化 |
| `EffectTab.tsx` | 效果数据平台显示动态化 |
| `FinancialTab.tsx` | 财务数据平台显示动态化 |

### 代码模式

```typescript
// 导入 Hook
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

// 在组件中使用
const { configs: platformConfigs, getPlatformNames, getPlatformColors } = usePlatformConfig();

// 生成平台选项
const platformOptions = useMemo(() => {
  return platformConfigs.map(c => ({
    label: c.name,
    value: c.platform,
  }));
}, [platformConfigs]);

// 获取映射对象
const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
const platformColors = useMemo(() => getPlatformColors(), [getPlatformColors]);

// 使用（带 fallback）
<Tag color={platformColors[platform] || 'default'}>
  {platformNames[platform] || platform}
</Tag>
```

---

## 功能优化：搜索模块

### 财务周期搜索

项目列表新增财务周期搜索模式：

- 默认按**业务周期**搜索（year + month）
- 勾选「财务周期」后按**财务周期**搜索（financialYear + financialMonth）

**实现细节**：
- 新增 `useFinancialPeriod` state
- 搜索区域添加 Checkbox 控制
- `loadProjects` 根据勾选状态传递不同参数

### UpdateProject 接口补全

修复编辑项目时周期字段无法更新的问题：

```typescript
// types/project.ts
export interface UpdateProjectRequest {
  id: string;
  // ...其他字段

  // 业务周期
  year?: number;
  month?: number;

  // 财务周期
  financialYear?: number;
  financialMonth?: number;
}
```

---

## 文件变更汇总

### 新增文件
```
docs/agentworks/releases/CHANGELOG-2025-12-08.md
```

### 修改文件
```
frontends/agentworks/src/hooks/usePlatformConfig.ts
frontends/agentworks/src/pages/Projects/ProjectList/ProjectList.tsx
frontends/agentworks/src/pages/Projects/ProjectList/ProjectFormModal.tsx
frontends/agentworks/src/pages/Projects/ProjectsHome.tsx
frontends/agentworks/src/pages/Projects/ProjectDetail/ProjectDetail.tsx
frontends/agentworks/src/pages/Projects/ProjectDetail/ExecutionTab.tsx
frontends/agentworks/src/pages/Projects/ProjectDetail/CollaborationsTab.tsx
frontends/agentworks/src/pages/Projects/ProjectDetail/CollaborationFormModal.tsx
frontends/agentworks/src/pages/Projects/ProjectDetail/EffectTab.tsx
frontends/agentworks/src/pages/Projects/ProjectDetail/FinancialTab.tsx
frontends/agentworks/src/types/project.ts
docs/agentworks/features/projects/PROJECT_MANAGEMENT.md
```

---

## 技术改进

### Hook 扩展

`usePlatformConfig` 新增方法：

```typescript
/**
 * 获取平台颜色映射对象
 * @returns { douyin: 'blue', xiaohongshu: 'red', ... }
 */
const getPlatformColors = (): Record<Platform, string> => {
  return configs.reduce(
    (acc, c) => {
      acc[c.platform] = c.color;
      return acc;
    },
    {} as Record<Platform, string>
  );
};
```

### 优势

1. **单一数据源**：平台配置统一来自 `system_config` 集合
2. **热更新**：修改数据库配置后 24 小时内自动生效（或手动刷新缓存）
3. **新平台兼容**：新增平台只需数据库配置，无需修改前端代码
4. **颜色一致性**：全局统一的平台颜色配置

---

## 统计

| 指标 | 数据 |
|------|------|
| 修改文件数 | 12 个 |
| 新增文件数 | 1 个 |
| 移除硬编码常量 | 10 处 |
| 新增 Hook 方法 | 1 个 |

---

**开发者**: Claude Code
**日期**: 2025-12-08
**版本**: v5.2.0 (平台配置动态化)
