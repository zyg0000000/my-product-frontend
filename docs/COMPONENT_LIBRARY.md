# AgentWorks 组件库使用手册

> **Ant Design Pro Components + Tailwind CSS** 混合方案完整指南

**最后更新**：2025-11-23
**适用版本**：AgentWorks v3.0+
**UI 模式**：Ant Design Pro + Tailwind 混合开发（官方决策）

---

## 📚 目录

- [快速开始](#快速开始)
- [ProTable 完整指南](#protable-完整指南)
- [ProForm 完整指南](#proform-完整指南)
- [ModalForm 使用指南](#modalform-使用指南)
- [常见问题 FAQ](#常见问题-faq)
- [最佳实践](#最佳实践)

---

## 快速开始

### 安装依赖

```bash
npm install antd@5.21.6 @ant-design/pro-components@2.8.10
```

### 基础导入

```tsx
// 表格
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';

// 表单
import {
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
  ProFormList,
  ProCard,
} from '@ant-design/pro-components';

// Ant Design 基础组件
import { Button, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
```

---

## ProTable 完整指南

### 基础用法

```tsx
<ProTable<DataType>
  columns={columns}
  request={async (params) => {
    const response = await api.getData(params);
    return {
      data: response.data.list,
      success: true,
      total: response.data.total,
    };
  }}
  rowKey="_id"
/>
```

### 完整配置示例

```tsx
import { useRef } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';

export default function MyList() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Customer>[] = [
    // 1. 基础文本列
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 200,
      ellipsis: true,              // 超长省略
      copyable: true,              // 可复制
    },

    // 2. 下拉筛选列
    {
      title: '客户级别',
      dataIndex: 'level',
      width: 120,
      valueType: 'select',
      valueEnum: {
        VIP: { text: 'VIP', status: 'Warning' },
        large: { text: '大型', status: 'Processing' },
      },
      render: (_, record) => (
        <Tag color="blue">{record.level}</Tag>
      ),
    },

    // 3. 日期列
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 150,
      valueType: 'dateTime',       // 自动格式化
      hideInSearch: true,          // 不在搜索表单显示
      sorter: true,                // 可排序
    },

    // 4. 自定义渲染列
    {
      title: '联系人',
      dataIndex: 'contacts',
      hideInSearch: true,
      render: (_, record) => {
        const contact = record.contacts?.[0];
        return contact ? (
          <div>
            <div className="font-medium">{contact.name}</div>
            <div className="text-xs text-gray-500">{contact.phone}</div>
          </div>
        ) : '-';
      },
    },

    // 5. 操作列
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => [
        <Button key="edit" type="link" size="small">编辑</Button>,
        <Button key="delete" type="link" size="small" danger>删除</Button>,
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">客户列表</h1>
        <p className="mt-2 text-sm text-gray-600">管理客户信息</p>
      </div>

      <ProTable
        columns={columns}
        actionRef={actionRef}
        cardBordered
        request={async (params) => {
          const response = await api.getCustomers({
            page: params.current,
            pageSize: params.pageSize,
            searchTerm: params.name,
            level: params.level,
          });

          return {
            data: response.data.customers,
            success: response.success,
            total: response.data.total,
          };
        }}
        rowKey="_id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        search={{
          labelWidth: 80,
          span: 6,
        }}
        headerTitle="客户列表"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />}>
            新增客户
          </Button>,
        ]}
        scroll={{ x: 1300 }}
        options={{
          reload: true,
          density: false,
          setting: true,
        }}
        size="middle"
      />
    </div>
  );
}
```

### ProTable 常用配置

#### 列配置 (ProColumns)

| 属性 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `title` | string | 列标题 | `'客户名称'` |
| `dataIndex` | string | 数据字段 | `'name'` |
| `width` | number | 列宽度 | `200` |
| `valueType` | string | 值类型 | `'text'`, `'select'`, `'dateTime'` |
| `valueEnum` | object | 枚举值 | `{ VIP: { text: 'VIP' }}` |
| `ellipsis` | boolean | 超长省略 | `true` |
| `copyable` | boolean | 可复制 | `true` |
| `hideInSearch` | boolean | 搜索表单中隐藏 | `true` |
| `hideInTable` | boolean | 表格中隐藏 | `false` |
| `fixed` | string | 固定列 | `'left'`, `'right'` |
| `sorter` | boolean | 可排序 | `true` |
| `render` | function | 自定义渲染 | `(_, record) => <Tag />` |

#### 表格配置

```tsx
<ProTable
  // 基础配置
  columns={columns}                    // 列配置
  request={fetchData}                  // 数据请求函数
  rowKey="_id"                         // 行唯一键

  // 分页配置
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  }}

  // 搜索配置
  search={{
    labelWidth: 80,                    // label 宽度
    span: 6,                           // 每行字段数 (24/6=4个)
    defaultCollapsed: false,           // 默认展开
  }}

  // 工具栏
  headerTitle="列表标题"
  toolBarRender={() => [
    <Button type="primary">新增</Button>,
  ]}

  // 表格选项
  options={{
    reload: true,                      // 刷新按钮
    density: false,                    // 密度调整
    setting: true,                     // 列设置
  }}

  // 样式
  cardBordered                         // 带边框
  size="middle"                        // 中等密度
  scroll={{ x: 1300 }}                 // 横向滚动
/>
```

### 高级功能

#### 1. 批量操作

```tsx
<ProTable
  rowSelection={{
    onChange: (selectedRowKeys) => {
      console.log('选中行：', selectedRowKeys);
    },
  }}
  tableAlertRender={({ selectedRowKeys }) => (
    <div className="flex items-center gap-4">
      <span>已选择 {selectedRowKeys.length} 项</span>
      <Button size="small" danger>批量删除</Button>
    </div>
  )}
/>
```

#### 2. 工具栏扩展

```tsx
toolBarRender={() => [
  <Button key="export" icon={<DownloadOutlined />}>导出</Button>,
  <Button key="import" icon={<UploadOutlined />}>导入</Button>,
  <Button key="add" type="primary" icon={<PlusOutlined />}>新增</Button>,
]}
```

#### 3. 手动刷新

```tsx
const actionRef = useRef<ActionType>();

// 触发刷新
actionRef.current?.reload();

// 重置到第一页并刷新
actionRef.current?.reloadAndRest();
```

---

## ProForm 完整指南

### 基础用法

```tsx
<ProForm
  initialValues={{ level: 'medium' }}
  onFinish={async (values) => {
    await api.submit(values);
    message.success('保存成功');
    return true;
  }}
>
  <ProFormText name="name" label="名称" rules={[{ required: true }]} />
  <ProFormSelect name="level" label="级别" valueEnum={{ VIP: 'VIP' }} />
</ProForm>
```

### 完整配置示例

```tsx
export default function MyForm() {
  const navigate = useNavigate();

  return (
    <ProCard>
      <ProForm
        // 初始值
        initialValues={{
          level: 'medium',
          status: 'active',
        }}

        // 提交处理
        onFinish={async (values) => {
          try {
            await api.createData(values);
            message.success('创建成功');
            navigate('/list');
            return true;
          } catch (error) {
            message.error('创建失败');
            return false;
          }
        }}

        // 自定义提交按钮
        submitter={{
          render: (props) => (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => props.form?.submit()}
              >
                保存
              </Button>
              <Button onClick={() => navigate('/list')}>取消</Button>
            </div>
          ),
        }}
      >
        {/* 分组1 */}
        <ProCard title="基础信息" headerBordered>
          <div className="grid grid-cols-3 gap-4">
            <ProFormText name="name" label="名称" />
            <ProFormSelect name="level" label="级别" />
            <ProFormSelect name="status" label="状态" />
          </div>
        </ProCard>

        {/* 分组2 */}
        <ProCard title="详细信息" headerBordered className="mt-4">
          <ProFormTextArea name="notes" label="备注" />
        </ProCard>
      </ProForm>
    </ProCard>
  );
}
```

### 常用表单组件

#### ProFormText（文本输入）

```tsx
<ProFormText
  name="name"                          // 字段名（必需）
  label="客户名称"                     // 标签（必需）
  placeholder="请输入客户名称"          // 占位符
  rules={[
    { required: true, message: '请输入客户名称' },
    { max: 50, message: '最多50个字符' },
  ]}
  fieldProps={{
    maxLength: 50,
    showCount: true,
  }}
/>
```

#### ProFormSelect（下拉选择）

```tsx
<ProFormSelect
  name="level"
  label="客户级别"
  placeholder="选择客户级别"
  valueEnum={{
    VIP: 'VIP客户',
    large: '大型客户',
    medium: '中型客户',
    small: '小型客户',
  }}
  rules={[{ required: true }]}
/>

// 或使用 options
<ProFormSelect
  name="city"
  label="城市"
  options={[
    { label: '北京', value: 'beijing' },
    { label: '上海', value: 'shanghai' },
  ]}
/>
```

#### ProFormTextArea（文本域）

```tsx
<ProFormTextArea
  name="notes"
  label="备注"
  placeholder="请输入备注信息"
  fieldProps={{
    rows: 4,
    maxLength: 500,
    showCount: true,
  }}
/>
```

#### ProFormList（动态列表）

```tsx
<ProFormList
  name="contacts"
  label="联系人"
  creatorButtonProps={{
    creatorButtonText: '+ 添加联系人',
    type: 'dashed',
    style: { width: '100%' },
  }}
  min={1}
  max={5}
  copyIconProps={false}
  deleteIconProps={{ tooltipText: '删除' }}
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
    <ProFormText name="phone" label="电话" />
    <ProFormText name="email" label="邮箱" />
    <ProFormText name="position" label="职位" />
  </div>
</ProFormList>
```

### 表单验证规则

```tsx
rules={[
  // 必填
  { required: true, message: '此字段必填' },

  // 长度限制
  { min: 2, max: 50, message: '长度在 2-50 个字符' },

  // 正则验证
  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },

  // 邮箱验证
  { type: 'email', message: '请输入正确的邮箱' },

  // 自定义验证
  {
    validator: async (_, value) => {
      if (value && value.length < 6) {
        throw new Error('密码至少6位');
      }
    },
  },
]}
```

---

## ModalForm 使用指南

### 基础用法

```tsx
import { ModalForm, ProFormText } from '@ant-design/pro-components';

<ModalForm
  title="新增客户"
  trigger={
    <Button type="primary" icon={<PlusOutlined />}>
      新增客户
    </Button>
  }
  onFinish={async (values) => {
    await api.create(values);
    message.success('创建成功');
    return true;  // 返回 true 关闭弹窗
  }}
>
  <ProFormText name="name" label="客户名称" rules={[{ required: true }]} />
  <ProFormSelect name="level" label="客户级别" valueEnum={{...}} />
</ModalForm>
```

### 编辑模式

```tsx
const [editData, setEditData] = useState(null);

<ModalForm
  title={editData ? '编辑' : '新增'}
  open={editData !== null}
  onOpenChange={(visible) => {
    if (!visible) setEditData(null);
  }}
  initialValues={editData}
  onFinish={async (values) => {
    if (editData) {
      await api.update(editData.id, values);
    } else {
      await api.create(values);
    }
    message.success('保存成功');
    setEditData(null);
    return true;
  }}
>
  <ProFormText name="name" label="名称" />
</ModalForm>

// 触发编辑
<Button onClick={() => setEditData(record)}>编辑</Button>
```

### DrawerForm（抽屉表单）

```tsx
import { DrawerForm } from '@ant-design/pro-components';

<DrawerForm
  title="配置详情"
  trigger={<Button>查看详情</Button>}
  width={600}
  onFinish={async (values) => {
    await api.update(values);
    return true;
  }}
>
  <ProFormText name="field1" label="字段1" />
  <ProFormTextArea name="field2" label="字段2" />
</DrawerForm>
```

---

## 常见问题 FAQ

### Q1: ProTable 如何实现搜索？

**A**: ProTable 会自动根据 columns 配置生成搜索表单。

```tsx
columns: [
  {
    title: '客户名称',
    dataIndex: 'name',
    // 默认会在搜索表单中显示
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    hideInSearch: true,  // 不在搜索表单中显示
  },
]
```

搜索参数会自动传递给 `request` 函数的 `params` 参数。

### Q2: 如何自定义搜索表单？

**A**: 使用 `search` 配置：

```tsx
<ProTable
  search={{
    labelWidth: 80,              // label 宽度
    span: 6,                     // 每行 4 个字段 (24/6)
    defaultCollapsed: false,     // 默认展开
    optionRender: (searchConfig, formProps, dom) => [
      ...dom.reverse(),          // 调换搜索和重置按钮顺序
    ],
  }}
/>
```

### Q3: ProForm 如何获取表单值？

**A**: 多种方式：

```tsx
// 方式1：onFinish 自动获取
<ProForm
  onFinish={async (values) => {
    console.log(values);  // 所有字段值
  }}
/>

// 方式2：通过 formRef
const formRef = useRef();

<ProForm formRef={formRef} />

// 获取值
const values = formRef.current?.getFieldsValue();

// 设置值
formRef.current?.setFieldsValue({ name: '新值' });
```

### Q4: 如何在 grid 布局中使用 ProForm？

**A**: 用 div 包裹，不要设置 width：

```tsx
<div className="grid grid-cols-4 gap-4">
  <ProFormText name="field1" />  // ✅ 不设置 width
  <ProFormText name="field2" />
  <ProFormText name="field3" />
  <ProFormText name="field4" />
</div>

// ❌ 错误
<div className="grid grid-cols-4 gap-4">
  <ProFormText name="field1" width="md" />  // 会破坏 grid
</div>
```

### Q5: 如何自定义 ProTable 的空状态？

```tsx
<ProTable
  locale={{
    emptyText: (
      <div className="text-center py-8">
        <p className="text-gray-500">暂无数据</p>
        <Button type="link" onClick={handleAdd}>
          点击添加
        </Button>
      </div>
    ),
  }}
/>
```

### Q6: ProForm 如何实现依赖字段？

**A**: 使用 `dependencies`：

```tsx
<ProFormSelect
  name="country"
  label="国家"
  valueEnum={{ cn: '中国', us: '美国' }}
/>

<ProFormSelect
  name="city"
  label="城市"
  dependencies={['country']}
  request={async ({ country }) => {
    // 根据国家获取城市列表
    const cities = await getCities(country);
    return cities;
  }}
/>
```

---

## 最佳实践

### 1. ProTable + Tailwind 混合布局

```tsx
// ✅ 推荐：外层用 Tailwind 控制布局
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-bold">标题</h1>
  </div>

  <ProTable  // Pro 组件处理业务
    columns={columns}
    request={fetchData}
  />
</div>

// ❌ 不推荐：混乱的嵌套
<ProCard>
  <div className="p-6">
    <ProTable />
  </div>
</ProCard>
```

### 2. 自定义渲染使用 Tailwind

```tsx
columns: [
  {
    title: '联系人',
    render: (_, record) => (
      <div>
        <div className="font-medium">{record.name}</div>
        <div className="text-xs text-gray-500">{record.phone}</div>
      </div>
    ),
  },
]
```

### 3. ProCard 分组表单

```tsx
<ProForm>
  <ProCard title="基础信息" headerBordered>
    <div className="grid grid-cols-3 gap-4 mb-4">
      <ProFormText name="field1" />
      <ProFormText name="field2" />
      <ProFormText name="field3" />
    </div>
    <ProFormTextArea name="field4" />
  </ProCard>

  <ProCard title="联系信息" headerBordered className="mt-4">
    <ProFormList name="contacts">...</ProFormList>
  </ProCard>
</ProForm>
```

### 4. 错误处理

```tsx
<ProTable
  request={async (params) => {
    try {
      const response = await api.getData(params);
      return {
        data: response.data.list,
        success: true,
        total: response.data.total,
      };
    } catch (error) {
      message.error('加载失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  }}
/>
```

---

## 性能优化建议

### 1. 按需导入

```tsx
// ✅ 推荐：按需导入
import { ProTable } from '@ant-design/pro-components';

// ❌ 不推荐：全量导入
import ProComponents from '@ant-design/pro-components';
```

### 2. 虚拟滚动

```tsx
<ProTable
  virtual          // 开启虚拟滚动（大数据量）
  scroll={{ y: 600 }}
/>
```

### 3. 懒加载

```tsx
const ProTable = lazy(() =>
  import('@ant-design/pro-components').then(m => ({ default: m.ProTable }))
);
```

---

## 快速参考

### ProTable valueType 类型

| valueType | 说明 | 渲染效果 |
|-----------|------|---------|
| `text` | 文本 | 纯文本 |
| `textarea` | 文本域 | 多行文本 |
| `date` | 日期 | 日期选择器 |
| `dateTime` | 日期时间 | 日期时间选择器 |
| `dateRange` | 日期范围 | 日期范围选择器 |
| `time` | 时间 | 时间选择器 |
| `select` | 下拉选择 | Select组件 |
| `checkbox` | 复选框 | Checkbox组件 |
| `radio` | 单选框 | Radio组件 |
| `money` | 金额 | 格式化金额 |
| `percent` | 百分比 | 格式化百分比 |
| `option` | 操作 | 操作列 |

### ProForm width 尺寸

| width | 宽度 | 适用场景 |
|-------|------|---------|
| `xs` | 104px | 性别、数字 |
| `sm` | 216px | 姓名、职位 |
| `md` | 328px | 手机、邮箱 |
| `lg` | 440px | 客户名称、地址 |
| `xl` | 552px | 详细描述 |

---

## 示例代码库

### 完整示例（可直接复制）

参考项目中的标准实现：

| 示例 | 文件路径 | 说明 |
|------|---------|------|
| **列表页** | `src/pages/Customers/CustomerList/CustomerList.tsx` | ProTable 完整示例 |
| **表单页** | `src/pages/Customers/CustomerForm.tsx` | ProForm + grid 布局 |
| **首页** | `src/pages/Customers/CustomersHome.tsx` | Tailwind 卡片布局 |

---

**文档状态**: ✅ 完成
**维护者**: 开发团队
