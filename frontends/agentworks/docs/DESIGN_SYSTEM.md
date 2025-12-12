# AgentWorks 设计系统规范

> 版本: 1.0.0 | 最后更新: 2024-12

## 目录

1. [设计理念](#1-设计理念)
2. [颜色系统](#2-颜色系统)
3. [深色模式](#3-深色模式) ⭐ **新增**
4. [字体系统](#4-字体系统)
5. [间距系统](#5-间距系统)
6. [圆角系统](#6-圆角系统)
7. [阴影系统](#7-阴影系统)
8. [动画系统](#8-动画系统)
9. [组件规范](#9-组件规范)
10. [布局规范](#10-布局规范)
11. [开发指南](#11-开发指南)

---

## 1. 设计理念

### 1.1 "Precision Craft" (精工细作)

AgentWorks 采用 **现代商务精致风** 设计理念：

- **专业信任感**：适合 B2B 达人营销管理场景
- **信息密度优化**：高效展示大量数据表格和指标
- **细节打磨**：微妙的渐变、精致的阴影、流畅的动画
- **克制的装饰**：功能优先，但不失设计感

### 1.2 设计原则

| 原则 | 说明 |
|-----|------|
| **一致性** | 所有组件使用统一的设计令牌 |
| **层次感** | 通过阴影、颜色深浅建立视觉层次 |
| **可访问性** | 颜色对比度符合 WCAG 2.1 AA 标准 |
| **响应式** | 适配桌面端到移动端各种屏幕 |

---

## 2. 颜色系统

### 2.1 主色调 - Deep Indigo

品牌主色，用于按钮、链接、选中状态等交互元素。

```css
--aw-primary-50:  #eef2ff  /* 极浅背景 */
--aw-primary-100: #e0e7ff  /* 浅背景、选中态 */
--aw-primary-200: #c7d2fe  /* 边框悬停 */
--aw-primary-300: #a5b4fc  /* 禁用态 */
--aw-primary-400: #818cf8  /* 次要元素 */
--aw-primary-500: #6366f1  /* 图标、次要按钮 */
--aw-primary-600: #4f46e5  /* 主按钮 ★ */
--aw-primary-700: #4338ca  /* 按钮悬停 */
--aw-primary-800: #3730a3  /* 按钮按下 */
--aw-primary-900: #312e81  /* 深色文字 */
--aw-primary-950: #1e1b4b  /* 最深 */
```

**使用场景：**
- `primary-600`: 主按钮背景、链接文字
- `primary-700`: 按钮悬停状态
- `primary-100`: 选中行背景、标签背景
- `primary-50`: 卡片悬停背景

### 2.2 功能色

#### 成功色 - Emerald
```css
--aw-success-50:  #ecfdf5
--aw-success-500: #10b981  /* 成功状态 */
--aw-success-600: #059669
--aw-success-700: #047857
```

#### 警告色 - Amber
```css
--aw-warning-50:  #fffbeb
--aw-warning-500: #f59e0b  /* 警告状态 */
--aw-warning-600: #d97706
--aw-warning-700: #b45309
```

#### 危险色 - Rose
```css
--aw-danger-50:  #fff1f2
--aw-danger-500: #f43f5e  /* 错误/危险 */
--aw-danger-600: #e11d48
--aw-danger-700: #be123c
```

#### 信息色 - Sky
```css
--aw-info-50:  #f0f9ff
--aw-info-500: #0ea5e9  /* 提示信息 */
--aw-info-600: #0284c7
--aw-info-700: #0369a1
```

### 2.3 中性色 - Slate

用于文字、背景、边框等。

```css
--aw-gray-50:  #f8fafc  /* 页面背景 */
--aw-gray-100: #f1f5f9  /* 卡片背景 alt */
--aw-gray-200: #e2e8f0  /* 边框 */
--aw-gray-300: #cbd5e1  /* 禁用边框 */
--aw-gray-400: #94a3b8  /* 占位符文字 */
--aw-gray-500: #64748b  /* 次要文字 */
--aw-gray-600: #475569  /* 正文 */
--aw-gray-700: #334155  /* 标题 */
--aw-gray-800: #1e293b  /* 主标题 */
--aw-gray-900: #0f172a  /* 最深文字 */
```

### 2.4 指标专用色

用于数据可视化和指标卡片。

```css
--aw-metric-blue:   #3b82f6  /* 播放量、曝光 */
--aw-metric-green:  #22c55e  /* 收入、增长 */
--aw-metric-red:    #ef4444  /* 支出、下降 */
--aw-metric-orange: #f97316  /* 互动、评论 */
--aw-metric-purple: #a855f7  /* ROI、转化 */
--aw-metric-cyan:   #06b6d4  /* 点赞、收藏 */
--aw-metric-pink:   #ec4899  /* 分享 */
```

---

## 3. 深色模式

AgentWorks 支持自动深色模式切换。通过 CSS Variables 和语义化 Tailwind 类实现，开发时无需手动添加 `dark:` 前缀。

### 3.1 实现原理

```
┌─────────────────────────────────────────────────────────┐
│  CSS Variables (colors.css)                             │
│  └─ 定义 :root 浅色 + [data-theme="dark"] 深色变量       │
├─────────────────────────────────────────────────────────┤
│  Tailwind 语义化颜色 (tailwind.config.js)               │
│  └─ 引用 CSS Variables，如 surface, content, stroke     │
├─────────────────────────────────────────────────────────┤
│  Ant Design 覆盖 (index.css)                            │
│  └─ 使用 [data-theme="dark"] 选择器覆盖组件样式          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 语义化 Tailwind 类（推荐使用）

使用以下语义化类，深色模式会 **自动适配**，无需添加 `dark:` 前缀：

#### 背景色

| 类名 | 用途 | 浅色模式 | 深色模式 |
|------|------|---------|---------|
| `bg-surface` | 卡片、容器、弹窗 | `#ffffff` | `#1e293b` |
| `bg-surface-base` | 页面背景 | `#f8fafc` | `#0f172a` |
| `bg-surface-sunken` | 输入框、表格头 | `#f1f5f9` | `#334155` |
| `bg-surface-subtle` | 轻微高亮 | `#f1f5f9` | `#334155` |

#### 文字色

| 类名 | 用途 | 浅色模式 | 深色模式 |
|------|------|---------|---------|
| `text-content` | 标题、正文 | `#0f172a` | `#f8fafc` |
| `text-content-secondary` | 次要信息、描述 | `#475569` | `#cbd5e1` |
| `text-content-muted` | 占位符、禁用文字 | `#94a3b8` | `#64748b` |

#### 边框色

| 类名 | 用途 | 浅色模式 | 深色模式 |
|------|------|---------|---------|
| `border-stroke` | 默认边框 | `#e2e8f0` | `#475569` |
| `border-stroke-hover` | 悬停边框 | `#cbd5e1` | `#64748b` |

### 3.3 开发规范

#### ✅ 正确写法

```tsx
// 使用语义化类 - 自动适配深色模式
<div className="bg-surface text-content border border-stroke rounded-lg p-4">
  <h2 className="text-lg font-semibold">标题</h2>
  <p className="text-content-secondary">描述文字</p>
</div>

// 使用 Tailwind gray-* 类 - 已配置引用 CSS Variables
<div className="bg-gray-100 text-gray-900">
  内容
</div>

// Ant Design 组件 - 已添加 CSS 覆盖，自动适配
<Table />, <Modal />, <Card />, <Select />
```

#### ❌ 错误写法

```tsx
// 避免：硬编码 bg-white（不会自动切换）
<div className="bg-white">

// 避免：内联样式硬编码颜色
<div style={{ backgroundColor: '#ffffff', color: '#333333' }}>

// 避免：使用十六进制颜色值
<div className="bg-[#ffffff]">
```

#### 🔄 迁移写法

```tsx
// 旧写法 → 新写法
bg-white        → bg-surface
bg-gray-50      → bg-surface-base
bg-gray-100     → bg-surface-sunken
text-gray-900   → text-content
text-gray-600   → text-content-secondary
text-gray-400   → text-content-muted
border-gray-200 → border-stroke
```

### 3.4 特殊场景处理

#### 需要固定颜色的场景

某些场景（如 Popover 内容）需要固定深色背景，不随主题切换：

```tsx
// 使用内联样式固定深色
const darkStyles = {
  backgroundColor: '#334155',
  color: '#f8fafc',
  borderColor: '#475569',
};

<Popover content={<div style={darkStyles}>...</div>} />
```

#### 透明度颜色

```tsx
// 透明度颜色保持原样
<div className="bg-white/10">  // 允许
<div className="bg-black/50">  // 允许
```

#### 状态色

状态色（primary, success, warning, danger）在深色模式下会自动调亮：

```tsx
// 状态色自动适配
<Button type="primary">主按钮</Button>
<Tag color="success">成功</Tag>
<Alert type="warning" message="警告" />
```

### 3.5 深色模式颜色值参考

```css
/* 深色模式下的灰度色阶（已反转） */
--aw-gray-50:  #0f172a;  /* 页面背景 */
--aw-gray-100: #1e293b;  /* 卡片背景 */
--aw-gray-200: #334155;  /* 输入框背景 */
--aw-gray-300: #475569;  /* 边框 */
--aw-gray-400: #64748b;  /* 禁用文字 */
--aw-gray-500: #94a3b8;  /* 占位符 */
--aw-gray-600: #cbd5e1;  /* 次要文字 */
--aw-gray-700: #e2e8f0;  /* 强调文字 */
--aw-gray-800: #f1f5f9;  /* 正文 */
--aw-gray-900: #f8fafc;  /* 标题、主要文字 */
```

### 3.6 主题切换

主题通过 `ThemeContext` 管理：

```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      当前: {isDark ? '深色' : '浅色'}
    </button>
  );
}
```

---

## 4. 字体系统

### 4.1 字体家族

```css
/* 标题字体 - 几何感、现代、专业 */
--aw-font-display: 'Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;

/* 正文字体 - 清晰、可读性强 */
--aw-font-body: 'DM Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;

/* 数字/代码字体 - 等宽、表格友好 */
--aw-font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
```

### 4.2 字号规范

| Token | 大小 | 用途 |
|-------|------|------|
| `--aw-text-xs` | 12px | 辅助说明、标签 |
| `--aw-text-sm` | 13px | 次要文字、表格 |
| `--aw-text-base` | 14px | 正文（默认） |
| `--aw-text-md` | 15px | 强调正文 |
| `--aw-text-lg` | 16px | 小标题 |
| `--aw-text-xl` | 18px | 二级标题 |
| `--aw-text-2xl` | 20px | 页面标题 |
| `--aw-text-3xl` | 24px | 大标题 |
| `--aw-text-4xl` | 30px | 超大标题 |

### 4.3 行高

```css
--aw-leading-none:   1.0   /* 数字展示 */
--aw-leading-tight:  1.25  /* 标题 */
--aw-leading-snug:   1.375 /* 副标题 */
--aw-leading-normal: 1.5   /* 正文（默认） */
--aw-leading-relaxed: 1.625 /* 长文本 */
--aw-leading-loose:  2.0   /* 特殊场景 */
```

### 4.4 字重

```css
--aw-font-normal:   400  /* 正文 */
--aw-font-medium:   500  /* 按钮、标签 */
--aw-font-semibold: 600  /* 标题 */
--aw-font-bold:     700  /* 强调 */
```

---

## 5. 间距系统

基于 **4px 网格** 的间距系统。

### 5.1 间距比例

| Token | 值 | 像素 |
|-------|-----|------|
| `--aw-space-px` | 1px | 1px |
| `--aw-space-0-5` | 0.125rem | 2px |
| `--aw-space-1` | 0.25rem | 4px |
| `--aw-space-2` | 0.5rem | 8px |
| `--aw-space-3` | 0.75rem | 12px |
| `--aw-space-4` | 1rem | 16px |
| `--aw-space-5` | 1.25rem | 20px |
| `--aw-space-6` | 1.5rem | 24px |
| `--aw-space-8` | 2rem | 32px |
| `--aw-space-10` | 2.5rem | 40px |
| `--aw-space-12` | 3rem | 48px |
| `--aw-space-16` | 4rem | 64px |

### 5.2 语义化间距

```css
/* 内边距 */
--aw-inset-xs:   4px   /* 紧凑元素 */
--aw-inset-sm:   8px   /* 小按钮 */
--aw-inset-md:   12px  /* 常规按钮 */
--aw-inset-lg:   16px  /* 卡片 */
--aw-inset-xl:   24px  /* 大卡片 */

/* 元素间距 */
--aw-gap-xs:     4px
--aw-gap-sm:     8px
--aw-gap-md:     12px
--aw-gap-lg:     16px
--aw-gap-xl:     24px

/* 区块间距 */
--aw-section-sm: 24px
--aw-section-md: 32px
--aw-section-lg: 48px

/* 页面边距 */
--aw-page-x:     24px
--aw-page-y:     24px
```

---

## 6. 圆角系统

```css
--aw-radius-none: 0       /* 无圆角 */
--aw-radius-sm:   6px     /* 小按钮、标签 */
--aw-radius-md:   8px     /* 按钮、输入框（默认） */
--aw-radius-lg:   12px    /* 卡片、下拉菜单 */
--aw-radius-xl:   16px    /* 模态框 */
--aw-radius-2xl:  20px    /* 大模态框 */
--aw-radius-3xl:  24px    /* 特殊组件 */
--aw-radius-full: 9999px  /* 圆形、胶囊按钮 */
```

### 使用指南

| 组件 | 圆角 |
|-----|------|
| 按钮 | `radius-md` (8px) |
| 输入框 | `radius-md` (8px) |
| 卡片 | `radius-lg` (12px) |
| 模态框 | `radius-xl` (16px) |
| 标签 | `radius-sm` (6px) |
| 头像 | `radius-full` |
| 下拉菜单 | `radius-lg` (12px) |

---

## 7. 阴影系统

### 7.1 层级阴影

```css
/* 无阴影 */
--aw-shadow-none: none;

/* 微阴影 - 按钮、输入框 */
--aw-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);

/* 小阴影 - 悬停态 */
--aw-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);

/* 中阴影 - 卡片 */
--aw-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);

/* 大阴影 - 下拉菜单 */
--aw-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);

/* 超大阴影 - 模态框 */
--aw-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);

/* 最大阴影 - 悬浮面板 */
--aw-shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
```

### 7.2 语义阴影

```css
/* 卡片阴影 */
--aw-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
--aw-shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);

/* 焦点环 */
--aw-shadow-focus: 0 0 0 3px rgba(99, 102, 241, 0.15);

/* 主色发光 */
--aw-shadow-primary: 0 2px 4px rgba(79, 70, 229, 0.15);
--aw-shadow-success: 0 2px 4px rgba(16, 185, 129, 0.2);
--aw-shadow-danger: 0 2px 4px rgba(244, 63, 94, 0.2);
```

---

## 8. 动画系统

### 8.1 缓动函数

```css
--aw-ease-default: cubic-bezier(0.4, 0, 0.2, 1);  /* 通用 */
--aw-ease-in:      cubic-bezier(0.4, 0, 1, 1);    /* 加速 */
--aw-ease-out:     cubic-bezier(0, 0, 0.2, 1);    /* 减速 */
--aw-ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);  /* 先加后减 */
--aw-ease-bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 弹性 */
--aw-ease-spring:  cubic-bezier(0.175, 0.885, 0.32, 1.275); /* 弹簧 */
```

### 8.2 持续时间

```css
--aw-duration-instant: 0ms    /* 即时 */
--aw-duration-fast:    150ms  /* 快速（悬停） */
--aw-duration-normal:  200ms  /* 常规（默认） */
--aw-duration-medium:  300ms  /* 中等（展开） */
--aw-duration-slow:    400ms  /* 慢速（弹出） */
--aw-duration-slower:  500ms  /* 更慢（页面切换） */
```

### 8.3 预设动画

```css
/* 淡入 */
.animate-fade-in { animation: aw-fade-in 200ms ease-out; }

/* 滑入 */
.animate-slide-in-top { animation: aw-slide-in-top 300ms ease-out; }
.animate-slide-in-bottom { animation: aw-slide-in-bottom 300ms ease-out; }

/* 缩放 */
.animate-scale-in { animation: aw-scale-in 200ms ease-out; }

/* 弹性 */
.animate-bounce-in { animation: aw-bounce-in 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55); }

/* 循环 */
.animate-pulse { animation: aw-pulse 2s ease-in-out infinite; }
.animate-spin { animation: aw-spin 1s linear infinite; }
```

---

## 9. 组件规范

### 9.1 按钮

#### 尺寸

| 尺寸 | 高度 | 内边距 | 字号 |
|-----|------|-------|------|
| xs | 28px | 8px 12px | 12px |
| sm | 32px | 8px 12px | 13px |
| md | 36px | 8px 16px | 14px |
| lg | 40px | 8px 20px | 14px |
| xl | 44px | 12px 24px | 16px |

#### 变体

```tsx
// 主要按钮 - 主要操作
<Button type="primary">保存</Button>

// 默认按钮 - 次要操作
<Button>取消</Button>

// 文本按钮 - 弱化操作
<Button type="text">了解更多</Button>

// 链接按钮 - 导航
<Button type="link">查看详情</Button>

// 危险按钮 - 破坏性操作
<Button danger>删除</Button>
```

### 9.2 卡片

```tsx
// 基础卡片
<div className="card">
  <h3>标题</h3>
  <p>内容</p>
</div>

// 可点击卡片
<div className="card-hover">
  <h3>标题</h3>
  <p>内容</p>
</div>
```

卡片规范：
- 圆角: 12px
- 内边距: 24px
- 阴影: `shadow-card`
- 边框: 1px solid gray-200
- 悬停: 边框变深 + 阴影增强 + 轻微上浮

### 9.3 表格

表格样式统一使用 Ant Design ProTable，已通过主题配置统一样式。

关键规范：
- 表头背景: `gray-50`
- 表头文字: `gray-700`, 600 字重
- 行悬停: `gray-50`
- 边框: `gray-200` (表头), `gray-100` (行)
- 单元格内边距: 12px 16px

### 9.4 表单

输入框规范：
- 高度: 36px (默认)
- 圆角: 8px
- 边框: `gray-200`
- 焦点: `primary-500` 边框 + focus 阴影

```tsx
// 基础输入
<Input placeholder="请输入" />

// 带图标
<Input prefix={<SearchOutlined />} placeholder="搜索" />

// 密码输入
<Input.Password placeholder="请输入密码" />
```

### 9.5 标签

```tsx
// 颜色标签
<Tag color="blue">蓝色</Tag>
<Tag color="green">绿色</Tag>
<Tag color="orange">橙色</Tag>
<Tag color="red">红色</Tag>
<Tag color="purple">紫色</Tag>

// 状态标签
<Tag className="tag-success">成功</Tag>
<Tag className="tag-warning">警告</Tag>
<Tag className="tag-danger">错误</Tag>
```

---

## 10. 布局规范

### 10.1 页面布局

```
┌─────────────────────────────────────────────────┐
│ Sidebar (240px)    │  Main Content              │
│                    │  ┌──────────────────────┐  │
│ Logo               │  │ Page Header          │  │
│                    │  └──────────────────────┘  │
│ Navigation         │  ┌──────────────────────┐  │
│ - 首页             │  │ Page Content         │  │
│ - 达人管理         │  │                      │  │
│ - 项目管理         │  │                      │  │
│ - ...              │  │                      │  │
│                    │  └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 10.2 内容区域

```css
/* 页面容器 */
.page-container {
  max-width: 1280px;  /* 7xl */
  margin: 0 auto;
  padding: 24px;
}

/* 内容最大宽度 */
--aw-max-width-sm:   640px
--aw-max-width-md:   768px
--aw-max-width-lg:   1024px
--aw-max-width-xl:   1280px
--aw-max-width-2xl:  1536px
```

### 10.3 栅格系统

使用 Tailwind 的 Flexbox/Grid 工具类：

```tsx
// 两栏布局
<div className="grid grid-cols-2 gap-6">
  <Card>左侧</Card>
  <Card>右侧</Card>
</div>

// 响应式三栏
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</div>
```

---

## 11. 开发指南

### 11.1 样式分层策略

```
┌────────────────────────────────────┐
│ 1. CSS Variables (设计令牌层)      │ ← 单一真相来源
│    src/design-system/tokens/       │
├────────────────────────────────────┤
│ 2. Tailwind CSS (工具类层)         │ ← 引用 CSS Variables
│    tailwind.config.js              │
├────────────────────────────────────┤
│ 3. CSS Modules / BEM (组件样式层)  │ ← 复杂组件专属样式
│    ComponentName.css               │
└────────────────────────────────────┘
```

### 11.2 何时使用 Tailwind

**推荐使用 Tailwind：**
- 简单布局 (flex, grid)
- 间距调整 (padding, margin)
- 文字样式 (color, size, weight)
- 简单状态 (hover, focus)

```tsx
// Good
<div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
  <span className="text-sm text-gray-600">标签</span>
</div>
```

### 11.3 何时使用 CSS Modules

**推荐使用 CSS Modules：**
- 复杂动画
- 伪元素 (::before, ::after)
- 复杂选择器组合
- 需要 CSS 变量计算

```css
/* ComponentName.module.css */
.card {
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  /* 复杂样式... */
}
```

### 11.4 命名约定

**CSS 类名：**
- 组件: `kebab-case` (如 `card-hover`)
- BEM: `block__element--modifier`
- 状态: `is-*`, `has-*` (如 `is-active`)

**CSS 变量：**
- 前缀: `--aw-` (AgentWorks)
- 格式: `--aw-{category}-{property}-{variant}`
- 示例: `--aw-color-primary-600`

### 11.5 文件结构

```
src/
├── design-system/
│   └── tokens/
│       ├── colors.css       # 颜色令牌
│       ├── typography.css   # 字体令牌
│       ├── spacing.css      # 间距令牌
│       ├── shadows.css      # 阴影令牌
│       ├── animations.css   # 动画令牌
│       └── index.css        # 汇总导出
├── config/
│   └── antTheme.ts          # Ant Design 主题
├── index.css                # 全局样式入口
└── components/
    └── ComponentName/
        ├── ComponentName.tsx
        └── ComponentName.module.css  # 组件专属样式
```

### 11.6 最佳实践

1. **优先使用设计令牌**
   ```css
   /* Good */
   color: var(--aw-primary-600);

   /* Avoid */
   color: #4f46e5;
   ```

2. **避免 inline styles**
   ```tsx
   /* Good */
   <div className="p-4 bg-gray-50">

   /* Avoid */
   <div style={{ padding: '16px', background: '#f8fafc' }}>
   ```

3. **响应式设计优先**
   ```tsx
   /* Good - Mobile First */
   <div className="p-4 md:p-6 lg:p-8">
   ```

4. **语义化颜色使用**
   ```tsx
   /* Good */
   <Tag color="success">成功</Tag>

   /* Avoid */
   <Tag color="#10b981">成功</Tag>
   ```

5. **保持组件一致性**
   ```tsx
   /* 统一使用 Ant Design 组件 */
   import { Button, Input, Select } from 'antd';
   ```

---

## 附录

### A. 设计令牌文件位置

| 文件 | 内容 |
|-----|------|
| `src/design-system/tokens/colors.css` | 颜色系统 |
| `src/design-system/tokens/typography.css` | 字体系统 |
| `src/design-system/tokens/spacing.css` | 间距系统 |
| `src/design-system/tokens/shadows.css` | 阴影系统 |
| `src/design-system/tokens/animations.css` | 动画系统 |
| `src/config/antTheme.ts` | Ant Design 主题 |

### B. 相关资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Ant Design 文档](https://ant.design/docs/react/introduce-cn)
- [CSS Variables (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

### C. 浏览器支持

- Chrome 105+
- Firefox 121+
- Safari 16+
- Edge 105+

---

*本文档由 AgentWorks 设计团队维护，如有问题请联系前端团队。*
