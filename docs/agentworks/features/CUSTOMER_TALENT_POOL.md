# 客户达人池功能设计文档

> 版本: v1.0.0 | 发布日期: 2025-11-30 | 对应版本: AgentWorks v3.8.0

## 概述

客户达人池是一个将达人与客户进行关联管理的功能模块，支持为每个客户维护专属的达人资源池，便于商务人员快速查看和管理客户关注的达人资源。

## 核心功能

### 1. 达人选择器 (TalentSelectorModal)

多选模态框组件，支持从达人库中选择达人添加到客户池。

**功能特性：**
- 表格展示达人列表（oneId、昵称、平台、粉丝数）
- 支持搜索过滤
- 多选模式，支持批量选择
- 分页加载

**组件位置：** `src/components/TalentSelectorModal.tsx`

### 2. 添加到客户 (AddToCustomerModal)

支持将选中的达人批量添加到指定客户的达人池。

**功能特性：**
- 下拉选择目标客户
- 显示已选达人数量
- 批量添加操作

**组件位置：** `src/components/AddToCustomerModal.tsx`

### 3. 客户达人池管理

在客户详情页展示和管理该客户关联的达人。

**功能特性：**
- ProTable 展示客户关联的达人
- 支持移除达人
- 支持添加新达人

## 数据模型

### customer_talents 集合

多对多关联表，存储客户与达人的关联关系。

```typescript
interface CustomerTalent {
  customerId: string;      // 客户 ID
  oneId: string;           // 达人 oneId
  platform: Platform;      // 平台
  addedAt: Date;           // 添加时间
  addedBy?: string;        // 添加人
  notes?: string;          // 备注
}
```

**索引设计：**
- 复合唯一索引: `{ customerId, oneId, platform }`
- 查询索引: `{ customerId }`

## API 接口

### 获取客户达人池

```
GET /api/customer-talents/:customerId
Response: {
  success: true,
  data: CustomerTalent[]
}
```

### 添加达人到客户池

```
POST /api/customer-talents
Body: {
  customerId: string,
  talents: Array<{ oneId: string, platform: Platform }>
}
Response: {
  success: true,
  data: {
    added: number,
    skipped: number  // 已存在的跳过
  }
}
```

### 从客户池移除达人

```
DELETE /api/customer-talents/:customerId/:oneId/:platform
Response: {
  success: true
}
```

## 前端文件结构

```
src/
├── components/
│   ├── TalentSelectorModal.tsx    # 达人选择器组件
│   └── AddToCustomerModal.tsx     # 添加到客户弹窗
├── pages/
│   └── Customers/
│       └── CustomerDetail.tsx     # 客户详情（含达人池）
├── services/
│   └── customerTalentApi.ts       # 客户达人池 API
└── types/
    └── customerTalent.ts          # 类型定义
```

## 使用示例

### 在达人列表页添加到客户

```tsx
import { AddToCustomerModal } from '../components/AddToCustomerModal';

function TalentList() {
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <ProTable
        rowSelection={{
          onChange: (_, rows) => setSelectedTalents(rows)
        }}
        toolBarRender={() => [
          <Button
            disabled={selectedTalents.length === 0}
            onClick={() => setShowAddModal(true)}
          >
            添加到客户
          </Button>
        ]}
      />

      <AddToCustomerModal
        open={showAddModal}
        talents={selectedTalents}
        onCancel={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          setSelectedTalents([]);
        }}
      />
    </>
  );
}
```

### 在客户详情页管理达人池

```tsx
import { TalentSelectorModal } from '../components/TalentSelectorModal';

function CustomerDetail({ customerId }) {
  const [talents, setTalents] = useState<CustomerTalent[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const loadTalents = async () => {
    const response = await customerTalentApi.getByCustomer(customerId);
    if (response.success) {
      setTalents(response.data);
    }
  };

  const handleAddTalents = async (selected: Talent[]) => {
    await customerTalentApi.addToCustomer(customerId, selected);
    loadTalents();
    setShowSelector(false);
  };

  return (
    <>
      <ProTable
        dataSource={talents}
        toolBarRender={() => [
          <Button onClick={() => setShowSelector(true)}>
            添加达人
          </Button>
        ]}
      />

      <TalentSelectorModal
        open={showSelector}
        onCancel={() => setShowSelector(false)}
        onConfirm={handleAddTalents}
        excludeIds={talents.map(t => t.oneId)}  // 排除已添加的
      />
    </>
  );
}
```

## 权限控制

| 操作 | 所需权限 |
|------|---------|
| 查看客户达人池 | `customer:read` |
| 添加达人到客户 | `customer:write` |
| 从客户池移除达人 | `customer:write` |

## 相关文档

- [CHANGELOG v3.8.0](../../../frontends/agentworks/CHANGELOG.md)
- [客户管理功能](./BACKEND_API_REQUIREMENTS.md)
- [组件库参考](../COMPONENT_LIBRARY.md)
