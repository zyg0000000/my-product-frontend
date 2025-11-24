# UI/UX 开发规范 v3.0

## 📋 目录
- [设计原则](#设计原则)
- [UI 技术栈](#ui-技术栈)
- [组件规范](#组件规范)
- [弹窗规范](#弹窗规范)
- [表格规范](#表格规范)
- [通知反馈](#通知反馈)
- [样式指南](#样式指南)
- [最佳实践](#最佳实践)

---

## 🎨 设计原则

### 1. 混合 UI 模式（v3.0 决策）
**AgentWorks 采用 Ant Design Pro + Tailwind CSS 混合开发模式**

- **Ant Design Pro**: 用于复杂组件（表格、表单、弹窗、导航）
- **Tailwind CSS**: 用于布局、间距、文字样式、自定义样式
- **组合使用**: 发挥两者优势，提升开发效率和用户体验

### 2. 一致性原则
- 所有用户反馈使用 **Ant Design message API**，禁用 `alert()`
- 统一的弹窗宽度规范（900px / 560px）
- 一致的组件样式和交互模式
- 统一的颜色系统和间距规范

### 3. 用户友好
- 清晰的视觉层次
- 友好的错误提示
- 智能的默认值设置
- 加载状态和空状态提示

### 4. 响应式设计
- 自适应布局（Tailwind grid 系统）
- 移动端友好的交互
- 表格横向滚动支持

---

## 🛠 UI 技术栈

### 核心库
```json
{
  "ant-design/pro-components": "^2.x",  // ProTable, ProForm, ProCard
  "antd": "^5.x",                       // Modal, Button, Tabs, Tag, Message
  "tailwindcss": "^3.x",                // 样式工具类
  "react-router-dom": "^6.x",           // 路由
  "@heroicons/react": "^2.x"            // 图标（部分保留）
}
```

### 组件使用原则
| 场景 | 使用组件 | 来源 |
|------|---------|------|
| 数据表格 | `ProTable` | Ant Design Pro |
| 复杂表单 | `ProForm`, `ProFormText`, `ProFormSelect` | Ant Design Pro |
| 内容卡片 | `ProCard` | Ant Design Pro |
| 弹窗 | `Modal` | Ant Design |
| 标签页 | `Tabs` | Ant Design |
| 按钮 | `Button` | Ant Design |
| 标签 | `Tag` | Ant Design |
| 通知 | `message` | Ant Design |
| 布局 | Tailwind utilities (`flex`, `grid`, `space-y-*`) | Tailwind |
| 间距 | Tailwind spacing (`p-*`, `m-*`, `gap-*`) | Tailwind |
| 文字样式 | Tailwind typography (`text-sm`, `font-bold`) | Tailwind |

---

## 🧩 组件规范

### ProTable 数据表格

#### 标准实现
```tsx
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';

const columns: ProColumns<DataType>[] = [
  {
    title: '名称',
    dataIndex: 'name',
    width: 200,
    fixed: 'left',
    ellipsis: true,
  },
  // ... 更多列
];

<ProTable
  columns={columns}
  dataSource={data}
  rowKey="id"
  loading={loading}
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
  search={false}  // 使用独立的筛选器
  cardBordered
  headerTitle="数据列表"
  toolbar={{
    actions: [
      <Button key="add" type="primary" icon={<PlusOutlined />}>
        新增
      </Button>
    ],
  }}
  options={{
    reload: true,   // 刷新按钮
    density: false, // 关闭密度调整
    setting: true,  // 列设置
  }}
  scroll={{ x: 1200 }}
  size="middle"
/>
```

#### 设计要点
- ✅ 使用 `ProColumns` 定义列配置
- ✅ 固定列：左侧固定主要信息，右侧固定操作
- ✅ 分页器：显示总数、快速跳转、每页数量
- ✅ 工具栏：新增按钮、自定义操作
- ✅ 刷新功能：options.reload
- ✅ 列设置：options.setting

### ProForm 表单组件

#### 标准实现
```tsx
import { ProForm, ProFormText, ProFormSelect, ProCard } from '@ant-design/pro-components';
import { Form } from 'antd';

const [form] = Form.useForm();

<ProForm
  form={form}
  onFinish={handleSubmit}
  submitter={{
    render: (_, dom) => (
      <div className="flex justify-end gap-2 pt-3 mt-3 border-t">
        {dom}
      </div>
    ),
    submitButtonProps: {
      type: 'primary',
      size: 'middle',
    },
    resetButtonProps: {
      onClick: onClose,
      children: '取消',
      size: 'middle',
    },
  }}
  layout="vertical"
>
  <ProCard title="基础信息" headerBordered>
    <div className="grid grid-cols-2 gap-3">
      <ProFormText
        name="name"
        label="名称"
        placeholder="请输入名称"
        rules={[{ required: true, message: '请输入名称' }]}
        fieldProps={{ size: 'middle' }}
      />

      <ProFormSelect
        name="type"
        label="类型"
        options={[
          { label: '类型A', value: 'a' },
          { label: '类型B', value: 'b' },
        ]}
        fieldProps={{ size: 'middle' }}
      />
    </div>
  </ProCard>
</ProForm>
```

#### 设计要点
- ✅ 使用 `Form.useForm()` 管理表单状态
- ✅ ProCard 分组组织表单字段
- ✅ Tailwind grid 布局（`grid grid-cols-2 gap-3`）
- ✅ 统一 fieldProps.size = 'middle'
- ✅ 自定义 submitter 按钮布局

---

## 🪟 弹窗规范

### 弹窗宽度标准

| 类型 | 宽度 | 使用场景 |
|------|------|---------|
| **大型弹窗** | 900px | 复杂表单、多卡片、Tab 导航 |
| **超大弹窗** | 1000px | 复杂数据表格（如价格管理） |
| **小型弹窗** | 560px | 删除确认、简单操作 |

### 标准弹窗结构

#### 1. 表单弹窗（900px）
```tsx
import { Modal, Form } from 'antd';
import { ProForm, ProCard } from '@ant-design/pro-components';

<Modal
  title={
    <div>
      <div className="text-base font-semibold">弹窗标题</div>
      <div className="text-xs font-normal text-gray-500 mt-0.5">
        副标题描述
      </div>
    </div>
  }
  open={isOpen}
  onCancel={onClose}
  footer={null}
  width={900}
  destroyOnClose
  centered
>
  <ProForm>
    <ProCard title="卡片标题" headerBordered bodyStyle={{ padding: '12px 16px' }}>
      {/* 表单内容 */}
    </ProCard>
  </ProForm>
</Modal>
```

#### 2. 删除确认弹窗（560px）
```tsx
import { Modal, Alert, Checkbox, Button } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

<Modal
  title={
    <div className="flex items-center gap-2">
      <ExclamationCircleFilled className="text-xl text-red-600" />
      <div>
        <div className="text-base font-semibold">删除确认</div>
        <div className="text-xs font-normal text-gray-500 mt-0.5">
          此操作不可逆，请谨慎确认
        </div>
      </div>
    </div>
  }
  open={isOpen}
  onCancel={onClose}
  footer={null}
  width={560}
  destroyOnClose
  centered
>
  <div className="space-y-3">
    {/* 信息展示 */}
    <Alert type="error" message="警告信息" />

    {/* 确认勾选 */}
    <Checkbox>我已了解...</Checkbox>

    {/* 操作按钮 */}
    <div className="flex justify-end gap-2">
      <Button onClick={onClose}>取消</Button>
      <Button type="primary" danger>确认删除</Button>
    </div>
  </div>
</Modal>
```

### 紧凑样式优化

为了减少弹窗高度，添加紧凑样式：
```tsx
<ProForm className="compact-form">
  {/* 表单内容 */}
</ProForm>

<style>{`
  .compact-form .ant-form-item {
    margin-bottom: 12px;
  }
  .compact-form .ant-form-item-label {
    padding-bottom: 4px;
  }
  .compact-form .ant-form-item-label > label {
    font-size: 13px;
  }
  .compact-form .ant-pro-card-header {
    padding: 10px 16px;
    min-height: auto;
  }
  .compact-form .ant-pro-card-header-title {
    font-size: 14px;
  }
`}</style>
```

---

## 📊 表格规范

### 列配置标准

```tsx
const columns: ProColumns<DataType>[] = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,           // 固定宽度
    fixed: 'left',        // 固定在左侧
    ellipsis: true,       // 超出省略
    render: (_, record) => (
      <span className="font-medium text-gray-900">{record.name}</span>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (status: string) => (
      <Tag color={status === 'active' ? 'success' : 'default'}>
        {statusMap[status]}
      </Tag>
    ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',       // 固定在右侧
    render: (_, record) => (
      <Space size="small">
        <Button type="link" size="small" icon={<EditOutlined />}>
          编辑
        </Button>
        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
          删除
        </Button>
      </Space>
    ),
  },
];
```

### 表格特性
- ✅ 固定列：主要信息左侧，操作右侧
- ✅ Tag 组件：状态、类型、标签显示
- ✅ Space 组件：操作按钮布局
- ✅ 链接按钮：表格内操作使用 `type="link"`
- ✅ 图标按钮：添加对应图标增强识别

---

## 🔔 通知反馈

### Ant Design Message（推荐）

v3.0 开始，所有通知统一使用 **Ant Design message API**：

```tsx
import { message } from 'antd';

// ✅ 成功提示
message.success('操作成功');

// ❌ 错误提示
message.error('操作失败，请重试');

// ⚠️ 警告提示
message.warning('请先勾选确认框');

// ℹ️ 信息提示
message.info('数据已更新');

// ⏳ 加载提示
const hide = message.loading('处理中...', 0);
// 完成后调用 hide()
```

### Toast 组件（兼容保留）

旧页面仍可使用 Toast，但**新功能必须使用 message**：

```tsx
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const { success, error, warning, info } = useToast();

  success('操作成功');
  error('请输入正确的信息');
}
```

### 使用规范
- ⛔ **禁止使用** `alert()`, `confirm()`, `prompt()`
- ✅ **新代码使用** `message` API
- ✅ **旧代码兼容** `useToast` hook
- ✅ **弹窗内使用** `message` 而非 props 回调

---

## 🎨 样式指南

### Tailwind 常用工具类

#### 布局
```tsx
<div className="flex items-center justify-between gap-4">
  {/* Flexbox 布局 */}
</div>

<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {/* Grid 布局 */}
</div>

<div className="space-y-4">
  {/* 垂直间距 */}
</div>
```

#### 文字样式
```tsx
<h1 className="text-2xl font-bold text-gray-900">标题</h1>
<p className="text-sm text-gray-600">描述文本</p>
<span className="text-xs text-gray-500">辅助信息</span>
```

#### 颜色系统
```tsx
// 主色调（蓝色系）
className="bg-blue-600 text-white hover:bg-blue-700"

// 成功（绿色系）
className="bg-green-100 text-green-800"

// 警告（黄色系）
className="bg-yellow-100 text-yellow-800"

// 错误（红色系）
className="bg-red-100 text-red-800"

// 灰度（中性色）
className="bg-gray-50 text-gray-900 border-gray-200"
```

### 间距系统
- 组件内部：`p-3` 或 `p-4` (12px / 16px)
- 组件间距：`space-y-3` 或 `gap-3` (12px)
- 卡片间距：`mb-3` 或 `mb-4` (12px / 16px)
- 按钮间距：`gap-2` (8px)

### 圆角规范
- 小组件：`rounded` (4px)
- 按钮/输入框：`rounded-md` (6px)
- 卡片：`rounded-lg` (8px)
- 弹窗：由 Modal 组件自动处理

---

## 🎯 Tabs 导航规范

### 平台切换 Tabs
```tsx
import { Tabs } from 'antd';
import type { Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';

const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

<Tabs
  activeKey={selectedPlatform}
  onChange={(key) => setSelectedPlatform(key as Platform)}
  items={platforms.map(platform => ({
    key: platform,
    label: PLATFORM_NAMES[platform],
  }))}
/>
```

### Tab 标记（Phase 功能）
```tsx
// 禁用的 Tab 添加 Phase 标记
{
  key: 'stepRule',
  label: (
    <span className="flex items-center gap-2">
      阶梯规则
      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
        Phase 2
      </span>
    </span>
  ),
  disabled: true,
}
```

---

## ✅ 最佳实践

### 1. 页面结构模板
```tsx
export function PageComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<DataType>[] = useMemo(() => [
    // 列定义
  ], [dependencies]);

  return (
    <div className="space-y-4">
      {/* 页面标题 - Tailwind */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">页面标题</h1>
        <p className="text-gray-600 mt-1 text-sm">页面描述</p>
      </div>

      {/* 平台 Tabs - Ant Design */}
      <Tabs activeKey={selectedPlatform} onChange={handlePlatformChange}>
        {/* Tab items */}
      </Tabs>

      {/* 数据表格 - ProTable */}
      <ProTable
        columns={columns}
        dataSource={data}
        loading={loading}
        // ... 配置
      />
    </div>
  );
}
```

### 2. 错误处理模式
```tsx
// ✅ 推荐：使用 message + throw
const handleSubmit = async (values) => {
  try {
    const response = await api.save(values);
    if (!response.success) {
      throw new Error(response.message || '保存失败');
    }
    message.success('保存成功');
    onClose();
  } catch (err) {
    message.error(err.message || '操作失败，请重试');
    throw err; // ProForm 需要抛出错误来停止提交
  }
};

// ❌ 避免：使用 alert
const handleSubmit = async () => {
  const result = await api.save();
  alert(result.success ? '成功' : '失败');
};
```

### 3. 状态标签规范
```tsx
// ✅ 使用 Tag 组件
<Tag color="success">正常</Tag>
<Tag color="warning">暂停</Tag>
<Tag color="default">停用</Tag>

// ❌ 避免：手写 badge
<span className="bg-green-100 text-green-800 px-2 py-1 rounded">
  正常
</span>
```

### 4. 操作按钮规范
```tsx
// ✅ 表格内操作：链接按钮
<Space size="small">
  <Button type="link" size="small" icon={<EditOutlined />}>
    编辑
  </Button>
  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
    删除
  </Button>
</Space>

// ✅ 工具栏操作：主要按钮
<Button type="primary" icon={<PlusOutlined />}>
  新增
</Button>

// ✅ 弹窗操作：标准按钮
<div className="flex justify-end gap-2">
  <Button onClick={onClose}>取消</Button>
  <Button type="primary" loading={loading}>确认</Button>
</div>
```

### 5. 加载和空状态
```tsx
// ✅ 加载状态
<ProTable loading={loading} />

// ✅ 空状态（ProTable 自动处理）
<ProTable
  locale={{
    emptyText: (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无数据</p>
      </div>
    ),
  }}
/>
```

---

## 📐 响应式设计

### Grid 布局
```tsx
// 移动端 1 列，桌面端 2 列
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 内容 */}
</div>

// 移动端 1 列，平板 2 列，桌面端 3 列
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 内容 */}
</div>
```

### 表格滚动
```tsx
<ProTable scroll={{ x: 1200 }} />  // 小屏幕横向滚动
```

---

## 🚫 禁止使用

### ❌ 不符合规范的代码
```tsx
// ❌ 使用 alert/confirm
alert('操作成功');
if (confirm('确认删除?')) { /* ... */ }

// ❌ 手写表格
<table>
  <thead>...</thead>
  <tbody>...</tbody>
</table>

// ❌ 手写弹窗容器
<div className="fixed inset-0 bg-gray-600 bg-opacity-50">
  <div className="relative mx-auto bg-white">
    {/* 内容 */}
  </div>
</div>

// ❌ 内联样式
<div style={{ padding: '10px', color: 'red' }}>
  {/* 使用 Tailwind 或 Ant Design 组件代替 */}
</div>
```

### ✅ 符合规范的替代
```tsx
// ✅ 使用 message
message.success('操作成功');

// ✅ 使用 ProTable
<ProTable columns={columns} dataSource={data} />

// ✅ 使用 Modal
<Modal open={isOpen} onCancel={onClose}>
  {/* 内容 */}
</Modal>

// ✅ 使用 Tailwind
<div className="p-4 text-red-600">
  {/* 内容 */}
</div>
```

---

## 📝 更新记录

### v3.1.0 (2025-11-23) - BasicInfo 页面升级
- ✅ 完成 **BasicInfo** 页面完全重构
- ✅ ProTable 替代手写表格（代码减少 54%）
- ✅ Dropdown 替代手写操作菜单
- ✅ 移除所有 alert() 使用
- ✅ 统一使用 message API

### v3.0.0 (2025-11-23) - 重大升级
- ✅ 采用 **Ant Design Pro + Tailwind** 混合开发模式
- ✅ 引入 ProTable 替代手写表格
- ✅ 引入 ProForm 和 ProCard 组织表单
- ✅ 统一弹窗宽度规范（900px / 560px）
- ✅ 使用 Ant Design message 替代 Toast（新功能）
- ✅ 完成 Performance 页面 UI 迁移
- ✅ 完成 Agencies 页面 UI 迁移
- ✅ 完成 EditTalentModal 等弹窗组件升级

### v2.5.0 (2025-11-18)
- 新增搜索筛选系统规范
- 优化下拉菜单定位规范
- 完善组件交互模式

### v2.4.2 (2025-11-17)
- 完成 Toast 组件迁移
- 禁用 alert() 弹窗
- 统一用户反馈机制

---

## 🎯 迁移检查清单

升级现有页面到 v3.0 规范时，请确认：

- [ ] 使用 ProTable 替代手写 `<table>`
- [ ] 使用 Modal 替代手写弹窗容器
- [ ] 使用 ProForm + ProCard 组织表单
- [ ] 使用 Tabs 替代手写 Tab 导航
- [ ] 使用 Tag 替代手写 badge
- [ ] 使用 Button 和 Space 组织操作
- [ ] 使用 message 替代 alert() 和 Toast
- [ ] 弹窗宽度符合规范（900px / 560px）
- [ ] Tailwind 用于布局和间距
- [ ] 移除内联样式和手写 CSS

---

**维护者**: AgentWorks 团队
**最后更新**: 2025-11-23
**版本**: v3.0.0

🤖 本规范遵循 Ant Design Pro + Tailwind CSS 混合开发模式
