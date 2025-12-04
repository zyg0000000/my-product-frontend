# 客户达人池功能设计文档

> 版本: v2.0.0 | 发布日期: 2025-12-03 | 对应版本: AgentWorks v3.9.0

## 概述

客户达人池是一个将达人与客户进行关联管理的功能模块，支持为每个客户维护专属的达人资源池，便于商务人员快速查看和管理客户关注的达人资源。

**v2.0 新增功能：**
- 标签管理（重要程度、业务标签）
- 标签配置动态化（颜色、选项可配置）
- 多客户视角查询
- 达人全景页面集成

---

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
- **v2.0** 支持设置重要程度和业务标签

**组件位置：** `src/pages/Customers/CustomerDetail/TalentPoolTab.tsx`

### 4. 标签管理 ⭐ v2.0 新增

#### 4.1 标签编辑器 (TalentTagEditor)

内联编辑达人标签的组件。

**功能特性：**
- 重要程度单选
- 业务标签多选
- 备注编辑
- 自动保存

**组件位置：** `src/pages/Customers/shared/TalentTagEditor.tsx`

#### 4.2 标签配置管理 (TagManagement)

设置页面中的标签配置入口。

**功能特性：**
- 重要程度配置（名称、颜色、排序）
- 业务标签配置（名称、颜色、排序）
- 配置版本控制

**组件位置：** `src/pages/Settings/TagManagement.tsx`

---

## 数据模型

### customer_talents 集合

多对多关联表，存储客户与达人的关联关系。

```typescript
interface CustomerTalent {
  _id: string;
  customerId: string;        // 客户 ID
  talentOneId: string;       // 达人 oneId
  platform: Platform;        // 平台

  // v2.0 标签数据
  tags: {
    importance?: string;       // 重要程度 key
    businessTags?: string[];   // 业务标签 key 数组
  };
  notes?: string;              // 备注

  // 权限预留字段
  organizationId?: string;
  departmentId?: string;

  // 审计字段
  addedBy?: string;
  addedAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}
```

**索引设计：**
- 复合唯一索引: `{ customerId, talentOneId, platform }`
- 查询索引: `{ customerId, platform }`
- 查询索引: `{ talentOneId, platform }`

### system_config - talent_tags 配置

```typescript
interface TalentTagConfigs {
  importanceLevels: TagOption[];
  businessTags: TagOption[];
  version?: number;
}

interface TagOption {
  key: string;        // 存储 key
  name: string;       // 显示名称
  order: number;      // 排序
  bgColor?: string;   // 背景色
  textColor?: string; // 文字色
}
```

---

## API 接口

### 基础 CRUD

#### 获取客户达人池
```
GET /customerTalents?customerId=xxx&platform=douyin&includeTalentInfo=true
Response: {
  success: true,
  data: {
    list: CustomerTalentWithInfo[],
    total: number,
    page: number,
    pageSize: number
  }
}
```

#### 添加达人到客户池
```
POST /customerTalents
Body: {
  customerId: string,
  platform: Platform,
  talents: Array<{ oneId: string }>
}
Response: {
  success: true,
  data: {
    added: number,
    skipped: number
  }
}
```

#### 更新达人标签
```
PUT /customerTalents?id=xxx&action=update
Body: {
  tags?: { importance?: string, businessTags?: string[] },
  notes?: string
}
Response: {
  success: true,
  data: CustomerTalentWithInfo
}
```

#### 从客户池移除达人
```
DELETE /customerTalents?id=xxx
Response: {
  success: true,
  data: { message: string }
}
```

### 标签配置 API

#### 获取标签配置
```
GET /customerTalents?action=getTagConfigs
Response: {
  success: true,
  data: TalentTagConfigs
}
```

#### 更新标签配置
```
POST /customerTalents?action=updateTagConfigs
Body: TalentTagConfigs
Response: {
  success: true,
  data: { success: true, version: number }
}
```

### 全景搜索 API ⭐ v2.0

```
GET /customerTalents?action=panoramaSearch&platform=douyin&customerNames=客户A,客户B
Response: {
  success: true,
  data: {
    list: PanoramaTalentItem[],
    total: number,
    viewMode: 'all' | 'customer',
    selectedCustomers: string[]
  }
}
```

---

## 前端文件结构

```
src/
├── components/
│   ├── TalentSelectorModal.tsx      # 达人选择器组件
│   ├── AddToCustomerModal.tsx       # 添加到客户弹窗
│   └── ViewModeSelector.tsx         # 视角选择器（全景页）
│
├── pages/
│   ├── Customers/
│   │   ├── CustomerDetail/
│   │   │   └── TalentPoolTab.tsx    # 客户详情-达人池Tab
│   │   └── shared/
│   │       └── TalentTagEditor.tsx  # 标签编辑器
│   ├── Settings/
│   │   └── TagManagement.tsx        # 标签配置页
│   └── Analytics/
│       └── TalentPanorama/          # 达人全景页（v2.0）
│
├── api/
│   └── customerTalents.ts           # 客户达人池 API
│
├── hooks/
│   └── useTagConfigs.ts             # 标签配置 Hook（含缓存）
│
└── types/
    └── customerTalent.ts            # 类型定义
```

---

## 标签 Key/Name 映射

### 设计原则

- **数据库存储**：使用 key（如 `core`、`long_term`）
- **前端显示**：使用 name（如 `核心`、`长期合作`）
- **API 筛选**：前端传 name，后端自动转 key
- **API 返回**：后端返回 name，前端直接显示

### 映射流程

```
筛选时：
用户选择"核心" → API 参数 importance=核心 → 后端转换为 key=core → 查询数据库

返回时：
数据库 key=core → 后端转换为 name=核心 → 前端显示"核心"
```

---

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

### 使用标签配置 Hook

```tsx
import { useTagConfigs } from '../hooks/useTagConfigs';

function TagDisplay({ importance }: { importance: string }) {
  const { configs } = useTagConfigs();

  const config = configs.importanceLevels.find(
    item => item.name === importance
  );

  if (config?.bgColor && config?.textColor) {
    return (
      <Tag style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: 'none'
      }}>
        {importance}
      </Tag>
    );
  }

  return <Tag>{importance}</Tag>;
}
```

---

## 权限控制

| 操作 | 所需权限 |
|------|---------|
| 查看客户达人池 | `customer:read` |
| 添加达人到客户 | `customer:write` |
| 从客户池移除达人 | `customer:write` |
| 编辑达人标签 | `customer:write` |
| 管理标签配置 | `settings:write` |

---

## 相关文档

- [达人全景功能](./TALENT_PANORAMA.md)
- [权限预留规范](../PERMISSION_RESERVATION_SPEC.md)
- [数据库设计](../../../database/agentworks_db/README.md)
- [云函数文档 - customerTalents v2.3.1](../../../functions/customerTalents/)

---

**文档版本**: v2.0.0
**创建时间**: 2025-11-30
**更新时间**: 2025-12-03
**维护者**: AgentWorks Team
