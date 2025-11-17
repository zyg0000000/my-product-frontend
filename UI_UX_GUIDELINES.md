# UI/UX 开发规范

## 📋 目录
- [设计原则](#设计原则)
- [组件规范](#组件规范)
- [交互模式](#交互模式)
- [样式指南](#样式指南)
- [最佳实践](#最佳实践)

---

## 🎨 设计原则

### 1. 一致性原则
- 所有用户反馈使用 Toast 组件，禁用 alert()
- 统一的颜色系统和组件样式
- 一致的交互模式和动画效果

### 2. 用户友好
- 清晰的视觉层次
- 友好的错误提示
- 智能的默认值设置

### 3. 响应式设计
- 移动端优先
- 自适应布局
- 触摸友好的交互

---

## 🧩 组件规范

### Toast 通知组件

#### 使用场景
- ✅ 操作成功反馈
- ❌ 错误提示
- ⚠️ 警告信息
- ℹ️ 一般提示

#### 使用示例
```tsx
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const { success, error, warning, info } = useToast();

  // 成功提示
  success('操作成功');

  // 错误提示
  error('请输入正确的信息');

  // 警告提示
  warning('请注意数据变更');

  // 信息提示
  info('数据已更新');
}
```

### 模态框组件

#### 设计规范
- 渐变色头部设计
- 圆角卡片样式
- 明确的操作按钮

#### 标准结构
```tsx
<div className="rounded-xl bg-white overflow-hidden">
  {/* 头部 - 渐变背景 */}
  <div className="bg-gradient-to-r from-primary-600 to-primary-700">
    {/* 标题和描述 */}
  </div>

  {/* 内容区 */}
  <div className="p-5">
    {/* 表单或内容 */}
  </div>

  {/* 操作区 */}
  <div className="flex justify-end gap-3">
    <button>取消</button>
    <button>确认</button>
  </div>
</div>
```

### 下拉菜单组件

#### 定位规范
- 使用 getBoundingClientRect() 获取触发元素位置
- 菜单显示在点击位置附近
- 避免超出视窗边界

#### 实现示例
```tsx
const handleOpenMenu = (event: React.MouseEvent) => {
  const rect = event.currentTarget.getBoundingClientRect();
  setMenuPosition({
    top: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX - 150,
  });
};
```

---

## 🔄 交互模式

### 搜索筛选系统

#### 设计要点
- **基础搜索**：始终可见，支持即时搜索
- **高级筛选**：可折叠面板，避免界面冗余
- **智能渲染**：无数据时显示友好提示
- **结果统计**：实时显示筛选结果数量

#### 筛选面板结构
```tsx
{/* 基础搜索 */}
<input type="search" placeholder="搜索..." />

{/* 高级筛选切换 */}
<button>高级筛选</button>

{/* 筛选面板 */}
{showFilters && (
  <div className="border rounded-md p-4 bg-gray-50">
    {/* 筛选选项 */}
    {hasFilters ? (
      <FilterOptions />
    ) : (
      <EmptyState />
    )}
  </div>
)}
```

### 表单交互

#### 验证反馈
- 实时验证（失焦时）
- 清晰的错误提示
- 成功状态标识

#### 提交处理
- Loading 状态显示
- 防重复提交
- 成功后自动关闭/重置

---

## 🎨 样式指南

### 颜色系统

#### 主色调
- Primary: `#3B82F6` (blue-500)
- Success: `#10B981` (green-500)
- Warning: `#F59E0B` (amber-500)
- Error: `#EF4444` (red-500)

#### 使用规范
```css
/* 主要操作按钮 */
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700;
}

/* 成功状态 */
.status-success {
  @apply bg-green-100 text-green-800;
}

/* 警告状态 */
.status-warning {
  @apply bg-yellow-100 text-yellow-800;
}

/* 错误状态 */
.status-error {
  @apply bg-red-100 text-red-800;
}
```

### 间距系统
- 使用 4px 的倍数（Tailwind 的 spacing scale）
- 组件内部：`p-4` (16px)
- 组件间距：`space-y-4` 或 `gap-4`
- 页面边距：`p-6` (24px)

### 圆角规范
- 小组件：`rounded` (0.25rem)
- 卡片：`rounded-lg` (0.5rem)
- 模态框：`rounded-xl` (0.75rem)

---

## ✅ 最佳实践

### 1. 性能优化
- 使用 React.memo 避免不必要的重渲染
- 列表使用虚拟滚动（大数据量时）
- 图片懒加载
- 防抖/节流处理频繁操作

### 2. 可访问性
- 语义化 HTML
- ARIA 标签
- 键盘导航支持
- 高对比度模式

### 3. 代码规范
```tsx
// ✅ 好的实践
const handleSave = async () => {
  try {
    setLoading(true);
    await saveData();
    success('保存成功');
    onClose();
  } catch (err) {
    error('保存失败');
  } finally {
    setLoading(false);
  }
};

// ❌ 避免
const handleSave = () => {
  saveData();
  alert('保存成功');
};
```

### 4. 状态管理
- 本地状态：useState
- 跨组件状态：Context API
- 服务器状态：React Query（计划引入）
- 表单状态：受控组件

### 5. 错误处理
- 全局错误边界
- 友好的错误提示
- 降级方案
- 重试机制

---

## 📝 更新记录

### v2.5.0 (2025-11-18)
- 新增搜索筛选系统规范
- 优化下拉菜单定位规范
- 完善组件交互模式

### v2.4.2 (2025-11-17)
- 完成 Toast 组件迁移
- 禁用 alert() 弹窗
- 统一用户反馈机制

---

**维护者**: Claude Code
**最后更新**: 2025-11-18

🤖 Generated with [Claude Code](https://claude.com/claude-code)