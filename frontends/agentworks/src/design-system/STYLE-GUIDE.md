# AgentWorks 设计系统开发规范

> 版本: 1.1.0 | 更新时间: 2025-12-14
>
> v1.1.0 更新：新增间距使用规范（第九章）

## 一、核心原则

深色模式通过 CSS Variables 实现自动切换，**禁止使用 Tailwind 原生颜色类**（如 `text-blue-500`、`bg-gray-100`）。

## 二、颜色系统

### 2.1 语义化颜色类（推荐）

这些类已配置深色模式自动切换：

```tsx
// ✅ 正确 - 使用语义化类
<div className="bg-surface-base">           // 基础背景
<div className="bg-surface-elevated">       // 卡片/弹窗背景
<div className="bg-surface-sunken">         // 凹陷区域背景
<p className="text-content">                // 主要文字
<p className="text-content-secondary">      // 次要文字
<p className="text-content-muted">          // 辅助文字
<div className="border-stroke">             // 边框
<div className="border-stroke-hover">       // 悬停边框
```

### 2.2 品牌色类

支持深色模式的品牌色：

```tsx
// 主色 (Indigo)
<button className="bg-primary-600 hover:bg-primary-700">
<span className="text-primary-600 dark:text-primary-400">

// 成功色 (Emerald)
<span className="text-success-600 dark:text-success-400">
<div className="bg-success-50 dark:bg-success-900/20">

// 警告色 (Amber)
<span className="text-warning-600 dark:text-warning-400">
<div className="bg-warning-50 dark:bg-warning-900/20">

// 危险色 (Rose)
<span className="text-danger-600 dark:text-danger-400">
<div className="bg-danger-50 dark:bg-danger-900/20">

// 信息色 (Sky)
<span className="text-info-600 dark:text-info-400">
<div className="bg-info-50 dark:bg-info-900/20">
```

### 2.3 Alert 组件类

用于提示框、警告框：

```tsx
// 信息提示（蓝色）
<div className="alert-info">
  <Icon className="alert-info-icon" />
  <h4 className="alert-info-title">标题</h4>
  <p className="alert-info-text">内容</p>
</div>

// 警告提示（黄色）
<div className="alert-warning">
  <Icon className="alert-warning-icon" />
  <span className="alert-warning-text">警告内容</span>
</div>

// 成功提示（绿色）
<div className="alert-success">
  <Icon className="alert-success-icon" />
  <span className="alert-success-text">成功内容</span>
</div>

// 错误提示（红色）
<div className="alert-danger">
  <Icon className="alert-danger-icon" />
  <span className="alert-danger-text">错误内容</span>
</div>
```

## 三、禁止使用的模式

### 3.1 禁止直接使用 Tailwind 原生颜色

```tsx
// ❌ 错误 - 硬编码颜色，深色模式不适配
<div className="bg-blue-50 text-blue-700">
<div className="bg-yellow-100 text-yellow-800">
<div className="bg-gray-100 text-gray-600">
<div className="text-slate-500">

// ✅ 正确 - 使用语义化类或带 dark: 前缀
<div className="alert-info">
<div className="bg-surface-base text-content">
<div className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
```

### 3.2 需要深色变体的情况

当必须使用品牌色背景/文字时，必须添加 `dark:` 变体：

```tsx
// ❌ 错误 - 缺少深色模式变体
<span className="text-primary-600">链接</span>
<div className="bg-success-50">成功</div>

// ✅ 正确 - 带深色模式变体
<span className="text-primary-600 dark:text-primary-400">链接</span>
<div className="bg-success-50 dark:bg-success-900/20">成功</div>
```

## 四、CSS Variables 参考

### 4.1 在自定义 CSS 中使用

```css
.my-component {
  background-color: var(--aw-primary-50);
  border-color: var(--aw-primary-200);
  color: var(--aw-primary-700);
}
```

### 4.2 可用变量列表

| 变量 | 浅色模式 | 深色模式 | 用途 |
|------|---------|---------|------|
| `--aw-primary-50` | #eef2ff | rgba透明 | 背景 |
| `--aw-primary-200` | #c7d2fe | rgba透明 | 边框 |
| `--aw-primary-600` | #4f46e5 | #6366f1 | 图标 |
| `--aw-primary-700` | #4338ca | #a5b4fc | 文字 |
| `--aw-primary-900` | #312e81 | #e0e7ff | 标题 |
| `--aw-success-*` | 同上规则 | 深色调亮 | 成功状态 |
| `--aw-warning-*` | 同上规则 | 深色调亮 | 警告状态 |
| `--aw-danger-*` | 同上规则 | 深色调亮 | 错误状态 |

## 五、组件开发检查清单

开发新组件时，确保：

- [ ] 背景色使用 `bg-surface-*` 或带 `dark:` 变体
- [ ] 文字色使用 `text-content*` 或带 `dark:` 变体
- [ ] 边框使用 `border-stroke*` 或带 `dark:` 变体
- [ ] 提示框使用 `alert-*` 组件类
- [ ] 不使用任何 `text-blue-*`、`bg-gray-*` 等原生类
- [ ] 在深色模式下测试组件显示效果

## 六、迁移指南

将旧代码迁移到新规范：

```tsx
// 旧代码
<div className="bg-blue-50 border-blue-200">
  <span className="text-blue-800">提示信息</span>
</div>

// 新代码
<div className="alert-info">
  <span className="alert-info-text">提示信息</span>
</div>
```

```tsx
// 旧代码
<p className="text-gray-600">描述文字</p>

// 新代码
<p className="text-content-secondary">描述文字</p>
```

## 七、文件位置

- 颜色变量定义: `src/design-system/tokens/colors.css`
- 组件类定义: `src/index.css`
- Tailwind 配置: `tailwind.config.js`

## 八、待迁移文件

以下文件仍包含硬编码颜色，需要逐步迁移：

### 高优先级（用户可见页面）
- `src/pages/Settings/SettingsHome.tsx`
- `src/pages/Performance/PerformanceHome.tsx`
- `src/pages/Projects/ProjectsHome.tsx`
- `src/pages/Analytics/TalentPanorama/TalentPanorama.tsx`
- `src/pages/Customers/CustomerList/CustomerList.tsx`

### 中优先级（组件）
- `src/components/ImportResultPanel.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/TagInput.tsx`
- `src/components/DeleteConfirmModal.tsx`
- `src/components/ConfigurableItemList.tsx`

### 低优先级（内部组件）
- `src/components/Performance/*.tsx`
- `src/components/FilterPanel/*.tsx`
- `src/components/BatchCreateTalentModal/index.tsx`

---

## 九、间距使用规范

### 9.1 Ant Design 组件间距（全局覆盖）

以下组件间距已在 `/src/index.css` 全局覆盖，开发者无需手动处理：

| 组件 | 间距 | 说明 |
|------|------|------|
| Pagination | 4px | 分页器项之间间距 |
| Input.Search | 8px | 搜索按钮左侧间距 |
| Segmented | 4px | 内部 padding 和 gap |
| Space | 8px | 默认元素间距 |
| ProTable 工具栏 | 8px | 按钮组间距 |

### 9.2 Tailwind 间距类使用指南

| 场景 | 推荐类 | 像素值 | 示例 |
|------|--------|--------|------|
| 紧密元素（图标+文字） | `gap-1` | 4px | `<span class="flex gap-1">` |
| 同组元素（按钮组） | `gap-2` | 8px | `<div class="flex gap-2">` |
| 表单元素 | `gap-3` | 12px | `<form class="flex gap-3">` |
| 区块间距 | `gap-4`, `space-y-4` | 16px | Modal 内容区域 |
| 页面区块 | `gap-6`, `space-y-6` | 24px | 页面主要区块 |

### 9.3 Modal 弹窗规范

- 使用 Ant Design Modal 组件
- 内容区域使用 `space-y-4` 组织垂直布局
- 表单元素使用 `gap-3` 或 `gap-4`

```tsx
<Modal title="标题" open={open}>
  <div className="space-y-4">
    {/* 内容区域 */}
  </div>
</Modal>
```

### 9.4 间距 CSS Variables

在自定义样式中使用间距变量：

```css
.my-component {
  gap: var(--aw-space-gap-sm);      /* 8px - 同组元素 */
  padding: var(--aw-space-inset-lg); /* 16px - 组件内部 */
  margin-bottom: var(--aw-space-4);  /* 16px */
}
```

完整间距变量参见 `/src/design-system/tokens/spacing.css`
