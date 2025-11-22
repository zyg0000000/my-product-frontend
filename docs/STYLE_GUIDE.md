# AgentWorks UI 样式规范指南

> 统一的样式规范，确保整个系统视觉一致性

**最后更新**：2024-11-22

---

## 🎨 技术栈

### UI 框架组合（混合方案）

```
Ant Design Pro Components  →  复杂业务组件（表格、表单）
         +
Tailwind CSS              →  布局、间距、颜色微调
```

**分工原则**：
- **Pro Components**：处理表格、表单、模态框等复杂交互
- **Tailwind CSS**：处理布局、间距、颜色、字体等样式

---

## 📏 字体规范

### 标题字号

| 类型 | Class | 字号 | 使用场景 | 示例页面 |
|------|-------|------|---------|---------|
| 一级标题 | `text-3xl font-bold` | 30px | 模块首页 | TalentsHome |
| 二级标题 | `text-2xl font-bold` | 24px | 列表页、详情页主标题 | BasicInfo, CustomerList |
| 三级标题 | `text-xl font-semibold` | 20px | 卡片标题 | - |
| 四级标题 | `text-lg font-semibold` | 18px | 表单页标题、ProCard title | CustomerForm |
| 五级标题 | `text-base font-medium` | 16px | 小标题 | - |

### 正文字号

| 类型 | Class | 字号 | 使用场景 |
|------|-------|------|---------|
| 页面描述 | `text-sm text-gray-600` | 14px | 页面标题下方的说明文字 |
| 正文 | `text-sm` | 14px | 表格内容、表单label |
| 辅助文字 | `text-xs text-gray-500` | 12px | 次要信息、备注 |

### 示例

```tsx
// ✅ 正确：列表页标题
<div>
  <h1 className="text-2xl font-bold text-gray-900">客户列表</h1>
  <p className="mt-2 text-sm text-gray-600">管理客户基础信息、联系人和业务配置</p>
</div>

// ✅ 正确：表单页标题
<h1 className="text-lg font-semibold m-0">新增客户</h1>

// ❌ 错误：字号不统一
<h1 className="text-3xl">客户列表</h1>  // 应该用 text-2xl
<p className="text-lg">说明文字</p>    // 应该用 text-sm
```

---

## 📦 间距规范

### 容器间距

| 间距 | Class | 像素值 | 使用场景 |
|------|-------|--------|---------|
| 页面容器 | `p-6` | 24px | 页面最外层 padding |
| 卡片间距 | `space-y-6` | 24px | 多个卡片之间的垂直间距 |
| 区域间距 | `space-y-4` | 16px | 表单内卡片间距 |
| 字段间距 | `gap-4` | 16px | Grid 布局的字段间距 |
| 小间距 | `gap-2` 或 `space-x-2` | 8px | 按钮、标签之间 |

### 示例

```tsx
// ✅ 正确：页面结构
<div className="space-y-6">                    // 最外层：大间距
  <div>标题</div>
  <ProTable />                                 // 卡片自动有间距
</div>

// ✅ 正确：表单卡片
<div className="space-y-4">                    // 表单内：中间距
  <ProCard title="基础信息">...</ProCard>
  <ProCard title="联系人">...</ProCard>
</div>

// ✅ 正确：字段布局
<div className="grid grid-cols-3 gap-4">       // 字段间：标准间距
  <ProFormText />
  <ProFormSelect />
</div>
```

---

## 🎨 颜色规范

### 主色调

```css
primary-50:  #eff6ff   (浅蓝背景)
primary-600: #2563eb   (主色 - 按钮、链接)
primary-700: #1d4ed8   (深蓝 - hover 状态)
primary-800: #1e40af   (更深 - active 状态)
```

### 中性色

```css
gray-50:  #f9fafb   (页面背景)
gray-100: #f3f4f6   (卡片背景、disabled)
gray-200: #e5e7eb   (边框)
gray-300: #d1d5db   (边框 hover)
gray-500: #6b7280   (辅助文字)
gray-600: #4b5563   (次要文字)
gray-900: #111827   (主要文字)
```

### 状态色

| 状态 | Ant Design Tag | Tailwind 背景 | 使用场景 |
|------|---------------|--------------|---------|
| 成功 | `success` | `bg-green-100 text-green-800` | 活跃、启用 |
| 警告 | `warning` | `bg-yellow-100 text-yellow-800` | 停用、待处理 |
| 错误 | `error` | `bg-red-100 text-red-800` | 删除、错误 |
| 信息 | `default` | `bg-gray-100 text-gray-800` | 暂停、默认 |

### 业务色

```css
达人采买: blue (#3b82f6)
广告投流: orange (#f97316)
内容制作: purple (#a855f7)
运营服务: green (#22c55e)
```

---

## 🔘 按钮规范

### 按钮尺寸

**Ant Design 按钮**：
```tsx
<Button size="small">小按钮</Button>      // 用于表格操作列
<Button>标准按钮</Button>                  // 默认，主要操作
<Button size="large">大按钮</Button>       // 用于强调
```

**Tailwind 按钮**（用于非 Pro 页面）：
```tsx
// 标准按钮
<button className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
  按钮
</button>

// 次要按钮
<button className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
  取消
</button>
```

### 按钮高度统一

**重要**：所有标准按钮必须使用 `px-4 py-2`，确保高度一致！

```tsx
// ✅ 正确：统一的按钮高度
<button className="px-4 py-2 ...">主操作</button>
<button className="px-4 py-2 ...">次操作</button>

// ❌ 错误：不一致的高度
<button className="px-4 py-2 ...">主操作</button>    // 40px
<button className="px-3 py-1 ...">次操作</button>    // 32px  ← 不一致！
```

---

## 📇 卡片/容器规范

### ProTable 容器

```tsx
// ✅ 推荐：直接使用 ProTable，自带卡片样式
<ProTable
  cardBordered           // 带边框
  size="middle"          // 中等密度
  options={{
    reload: true,        // 显示刷新按钮
    setting: true,       // 显示列设置
    density: false,      // 隐藏密度调整（避免混乱）
  }}
/>
```

### ProCard 容器

```tsx
// ✅ 推荐：用于表单分组
<ProCard
  title="基础信息"
  headerBordered         // 标题带底部边框
  collapsible            // 可折叠
  defaultCollapsed={false}  // 默认展开
>
  内容
</ProCard>
```

### Tailwind 卡片（用于非 Pro 页面）

```tsx
// ✅ 标准卡片
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  内容
</div>

// 或使用全局 class
<div className="card">
  内容
</div>
```

### 阴影统一规范

| 用途 | Class | 阴影值 |
|------|-------|--------|
| 默认卡片/表格 | `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) |
| 悬浮效果 | `shadow` | 0 1px 3px rgba(0,0,0,0.1) |
| 强调卡片 | `shadow-md` | 0 4px 6px rgba(0,0,0,0.1) |
| 模态框 | `shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) |

**重要**：不要混用不同的阴影！同类型元素必须使用相同阴影。

---

## 📋 表格规范

### ProTable 配置标准

```tsx
<ProTable
  columns={columns}
  request={async (params) => {
    // 统一的请求格式
    const response = await api.getData({
      page: params.current,
      pageSize: params.pageSize,
      ...params,  // 搜索和筛选参数
    });

    return {
      data: response.data.list,
      success: response.success,
      total: response.data.total,
    };
  }}
  rowKey="_id"
  pagination={{
    pageSize: 20,              // 统一每页 20 条
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
  search={{
    labelWidth: 80,            // 统一 label 宽度
    span: 6,                   // 每行 4 个搜索字段
  }}
  headerTitle="列表标题"
  toolBarRender={() => [
    <Button key="add" type="primary">新增</Button>,
  ]}
  scroll={{ x: 1300 }}         // 横向滚动阈值
  size="middle"                // 统一使用中等密度
  cardBordered                 // 带边框
/>
```

### 列配置规范

```tsx
const columns: ProColumns[] = [
  {
    title: '编码',
    dataIndex: 'code',
    width: 120,
    fixed: 'left',           // 左侧固定
    copyable: true,          // 可复制
    hideInSearch: true,      // 不在搜索表单中显示
  },
  {
    title: '名称',
    dataIndex: 'name',
    width: 200,
    ellipsis: true,          // 超长省略
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    valueType: 'select',     // 自动生成下拉筛选
    valueEnum: {
      active: { text: '活跃', status: 'Success' },
    },
  },
  {
    title: '操作',
    valueType: 'option',     // 操作列
    width: 120,
    fixed: 'right',          // 右侧固定
  },
];
```

---

## 📝 表单规范

### ProForm 布局标准

```tsx
<ProForm
  initialValues={defaultValues}
  onFinish={handleSubmit}
  submitter={{
    render: (props) => (
      <div className="flex gap-2 pt-4 border-t">  // Tailwind 控制布局
        <Button type="primary" onClick={() => props.form?.submit()}>
          保存
        </Button>
        <Button onClick={onCancel}>取消</Button>
      </div>
    ),
  }}
>
  {/* 分组卡片 */}
  <ProCard title="基础信息" headerBordered>
    {/* 一行多列：使用 grid */}
    <div className="grid grid-cols-3 gap-4">
      <ProFormText name="field1" label="字段1" />
      <ProFormText name="field2" label="字段2" />
      <ProFormText name="field3" label="字段3" />
    </div>

    {/* 单独一行：不用 grid */}
    <ProFormTextArea name="notes" label="备注" />
  </ProCard>
</ProForm>
```

### 字段宽度

**ProForm 组件宽度**（不在 grid 中时）：
```tsx
width="xs"   // 104px   - 短字段（性别）
width="sm"   // 216px   - 小字段（姓名、职位）
width="md"   // 328px   // 中等字段（手机、邮箱）
width="lg"   // 440px   // 长字段（客户名称、行业）
width="xl"   // 552px   // 超长字段（地址）
```

**在 grid 中时**：不设置 width，让 grid 自动分配

```tsx
// ✅ 正确
<div className="grid grid-cols-4 gap-4">
  <ProFormText name="name" />        // 不设置 width
  <ProFormText name="phone" />
</div>

// ❌ 错误
<div className="grid grid-cols-4 gap-4">
  <ProFormText name="name" width="md" />  // 会破坏 grid 布局
</div>
```

---

## 🏷️ Tag 标签规范

### 颜色使用

```tsx
// 状态类
success  - 成功、活跃、启用
warning  - 警告、停用、待处理
error    - 错误、删除、失败
default  - 默认、暂停、其他

// 业务类
blue     - 达人采买
orange   - 广告投流
purple   - 内容制作
green    - 运营服务
gold     - VIP、特殊标识
```

### 示例

```tsx
// ✅ 正确：客户状态
<Tag color="success">活跃</Tag>
<Tag color="warning">停用</Tag>

// ✅ 正确：业务类型
<Tag color="blue">达人采买</Tag>
<Tag color="orange">广告投流</Tag>
```

---

## 🎯 布局模式

### 页面结构标准

```tsx
// 所有列表页必须遵循此结构：
export default function PageList() {
  return (
    <div className="space-y-6">
      {/* 1. 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">页面标题</h1>
        <p className="mt-2 text-sm text-gray-600">页面描述</p>
      </div>

      {/* 2. ProTable 表格 */}
      <ProTable {...config} />
    </div>
  );
}
```

```tsx
// 所有表单页必须遵循此结构：
export default function PageForm() {
  return (
    <div className="space-y-4">
      {/* 1. 页面头部 */}
      <ProCard>
        <Space>
          <Button icon={<ArrowLeftOutlined />}>返回</Button>
          <h1 className="text-lg font-semibold m-0">表单标题</h1>
        </Space>
      </ProCard>

      {/* 2. 表单主体 */}
      <ProCard>
        <ProForm>
          <ProCard title="分组1">...</ProCard>
          <ProCard title="分组2">...</ProCard>
        </ProForm>
      </ProCard>
    </div>
  );
}
```

### Grid 布局规范

**常用网格**：
```tsx
grid-cols-2  // 2列（大字段）
grid-cols-3  // 3列（标准，如：客户名称、级别、状态）
grid-cols-4  // 4列（小字段，如：联系人信息）
grid-cols-6  // 6列（很小的字段）
```

**响应式**：
```tsx
// 需要响应式时
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

---

## 🚫 禁止事项

### 1. 不要混用字号

```tsx
// ❌ 错误：同一页面用不同字号
<h1 className="text-3xl">客户列表</h1>
<h1 className="text-2xl">客户详情</h1>

// ✅ 正确：统一用 text-2xl
<h1 className="text-2xl font-bold">客户列表</h1>
<h1 className="text-2xl font-bold">客户详情</h1>
```

### 2. 不要混用阴影

```tsx
// ❌ 错误：同一页面卡片用不同阴影
<div className="shadow-sm">卡片1</div>
<div className="shadow-md">卡片2</div>

// ✅ 正确：统一用 shadow-sm 或 ProTable 自带阴影
<ProTable />
```

### 3. 不要混用间距

```tsx
// ❌ 错误：字段间距不一致
<div className="gap-4">
  <input />
  <input />
</div>
<div className="gap-2">  ← 不一致！
  <input />
</div>

// ✅ 正确：统一用 gap-4
<div className="grid grid-cols-3 gap-4">
  <input />
  <input />
  <input />
</div>
```

### 4. 不要写内联样式

```tsx
// ❌ 错误：使用内联样式
<div style={{ marginTop: 20, padding: 16 }}>...</div>

// ✅ 正确：使用 Tailwind
<div className="mt-5 p-4">...</div>
```

### 5. 不要写 CSS 文件

```tsx
// ❌ 错误：创建独立 CSS 文件
import './CustomerList.css';

// ✅ 正确：使用 Tailwind 或 Pro 内置样式
<div className="bg-white p-6">...</div>
```

---

## 📐 组件使用规范

### ProTable 使用规范

**必须配置的属性**：
```tsx
<ProTable
  columns={columns}          // 必需
  request={async () => {}}   // 必需
  rowKey="_id"               // 必需
  cardBordered               // 推荐
  size="middle"              // 推荐
  pagination={{ pageSize: 20 }}  // 推荐
/>
```

**可选但推荐的属性**：
```tsx
headerTitle="列表标题"       // 表格标题
toolBarRender={() => [...]}  // 工具栏按钮
search={{ labelWidth: 80 }}  // 搜索表单配置
options={{                   // 工具栏选项
  reload: true,
  setting: true,
}}
```

### ProForm 使用规范

**必须配置的属性**：
```tsx
<ProForm
  initialValues={values}     // 必需（编辑模式）
  onFinish={handleSubmit}    // 必需
  submitter={{...}}          // 推荐自定义
/>
```

**表单字段规范**：
```tsx
// 文本输入
<ProFormText
  name="field"               // 必需
  label="标签"               // 必需
  placeholder="提示文字"      // 推荐
  rules={[{ required: true }]}  // 必填项
/>

// 下拉选择
<ProFormSelect
  name="field"
  label="标签"
  valueEnum={{ key: '值' }}  // 选项配置
/>

// 文本域
<ProFormTextArea
  name="field"
  label="标签"
  fieldProps={{
    rows: 4,                 // 行数
    showCount: true,         // 显示字数
    maxLength: 500,          // 最大长度
  }}
/>
```

---

## 🎨 特殊场景规范

### 联系人动态列表

```tsx
<ProFormList
  name="contacts"
  creatorButtonProps={{
    creatorButtonText: '+ 添加联系人',
    type: 'dashed',
    style: { width: '100%' },
  }}
  min={1}
  itemRender={({ listDom, action }, { index }) => (
    <div className="border rounded-lg p-4 mb-3 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium">联系人 {index + 1}</span>
        {action}
      </div>
      {listDom}
    </div>
  )}
>
  <div className="grid grid-cols-4 gap-4">
    <ProFormText name="name" label="姓名" />
    <ProFormText name="position" label="职位" />
    <ProFormText name="phone" label="手机" />
    <ProFormText name="email" label="邮箱" />
  </div>
</ProFormList>
```

**关键点**：
- 使用 `itemRender` 自定义每个列表项的外观
- 内部用 Tailwind `grid` 控制字段布局
- 灰色背景 `bg-gray-50` 区分列表项

---

## ✅ 检查清单

开发新页面时，请检查以下项：

### 列表页检查清单
- [ ] 页面标题使用 `text-2xl font-bold`
- [ ] 描述文字使用 `text-sm text-gray-600`
- [ ] 使用 ProTable 而不是手写表格
- [ ] 配置 `cardBordered` 和 `size="middle"`
- [ ] 分页设置为 20 条/页
- [ ] 操作列使用 `Button size="small" type="link"`
- [ ] 外层容器使用 `space-y-6`

### 表单页检查清单
- [ ] 页面头部有返回按钮 + 标题
- [ ] 使用 ProForm 而不是原生 form
- [ ] 字段使用 grid 布局（3列或4列）
- [ ] 分组使用 ProCard
- [ ] 提交按钮使用 `type="primary"`
- [ ] 验证规则配置完整
- [ ] 外层容器使用 `space-y-4`

### 样式检查清单
- [ ] 所有按钮高度一致（`px-4 py-2`）
- [ ] 卡片阴影统一（`shadow-sm` 或 Pro 默认）
- [ ] 间距统一（`gap-4`, `space-y-4/6`）
- [ ] 颜色符合规范（gray, primary, success 等）
- [ ] 无内联样式（`style={{...}}`）
- [ ] 无独立 CSS 文件

---

## 📖 参考页面

### 最佳实践示例

| 页面 | 文件路径 | 亮点 |
|------|---------|------|
| **客户列表** | `src/pages/Customers/CustomerList/CustomerList.tsx` | ProTable 完整示例 |
| **客户表单** | `src/pages/Customers/CustomerForm.tsx` | ProForm + grid 布局 |
| 达人管理首页 | `src/pages/Talents/TalentsHome.tsx` | Tailwind 卡片布局 |
| 机构列表 | `src/pages/Talents/Agencies/AgenciesList.tsx` | 手写模态框示例 |

### 代码模板

**新建列表页模板**：参考 [CustomerList.tsx](../frontends/agentworks/src/pages/Customers/CustomerList/CustomerList.tsx)

**新建表单页模板**：参考 [CustomerForm.tsx](../frontends/agentworks/src/pages/Customers/CustomerForm.tsx)

---

## 🔄 版本历史

### v1.0 (2024-11-22)
- 初始版本
- 定义 Pro + Tailwind 混合方案规范
- 统一字体、间距、颜色规范
- 客户管理模块作为标准示例

---

**文档状态**: ✅ 生效中
**适用范围**: AgentWorks 全部前端页面
**维护者**: 开发团队
