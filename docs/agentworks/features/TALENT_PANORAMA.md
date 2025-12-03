# 达人全景功能设计文档

> 版本: v1.0.0 | 发布日期: 2025-12-03 | 对应版本: AgentWorks v3.9.0

## 概述

达人全景是一个全方位的达人资源检索与分析模块，支持多维度筛选、多视角查看，帮助商务人员快速定位和分析达人资源。

## 核心功能

### 1. 视角模式切换

支持两种视角模式查看达人数据：

| 模式 | 说明 | 数据范围 |
|------|------|----------|
| 全量达人库 | 展示所有入库达人 | talents 集合全部数据 |
| 客户视角 | 展示选中客户关注的达人 | customer_talents 关联数据 |

**组件位置：** `src/components/ViewModeSelector.tsx`

### 2. 模块化筛选面板

采用模块化架构设计，支持灵活扩展的筛选能力：

#### 2.1 基础信息筛选 (BasicInfoModule)
- 达人搜索（名称/OneID）
- 达人层级（多选）
- 返点范围（区间）
- 价格范围（区间）
- 内容标签（多选）

#### 2.2 客户标签筛选 (CustomerTagModule)
仅在客户视角模式下显示：
- 重要程度（多选）
- 业务标签（多选）

#### 2.3 表现数据筛选 (PerformanceModule)
从 `dimension_config` 动态加载可筛选的表现维度：
- CPM 范围
- 播放量范围
- 互动数据等

### 3. 动态表格列

根据视角模式自动调整表格列：

**全量视角列：**
- 达人名称、平台、层级、返点、价格

**客户视角额外列：**
- 重要程度（带颜色标签）
- 业务标签（带颜色标签）
- 所属客户

### 4. 标签配置与颜色

标签颜色从 API 动态加载，支持自定义配置：

```typescript
// useTagConfigs Hook
const { configs } = useTagConfigs();
// configs.importanceLevels: [{key, name, bgColor, textColor}]
// configs.businessTags: [{key, name, bgColor, textColor}]
```

**缓存策略：**
- LocalStorage 缓存，24小时过期
- 自动刷新机制

---

## 技术架构

### 模块化筛选架构

```
FilterModule Interface
    ├── id: string           # 模块唯一标识
    ├── name: string         # 模块名称
    ├── order: number        # 排序权重
    ├── enabled: boolean     # 是否启用
    ├── icon: ReactNode      # 图标
    ├── getFilterConfigs()   # 获取筛选配置（异步）
    └── buildQueryParams()   # 构建查询参数
```

**模块注册：**
```typescript
// modules/filters/index.ts
export { BasicInfoModule } from './BasicInfoModule';
export { CustomerTagModule } from './CustomerTagModule';
export { PerformanceModule } from './PerformanceModule';
```

### 数据流架构

```
ViewModeSelector (视角选择)
       ↓
ModularFilterPanel (筛选面板)
       ↓
usePanoramaFilters (筛选状态管理)
       ↓
usePanoramaData (数据获取)
       ↓
panoramaSearch API → 后端聚合查询
       ↓
ProTable (表格展示)
```

### 后端 API 设计

#### panoramaSearch 接口

```typescript
GET /customerTalents?action=panoramaSearch

// 请求参数
interface PanoramaSearchParams {
  platform: Platform;           // 必填：平台
  page?: number;
  pageSize?: number;

  // 基础筛选
  searchTerm?: string;
  tiers?: string[];             // 达人层级
  rebateMin?: number;
  rebateMax?: number;
  priceMin?: number;
  priceMax?: number;
  contentTags?: string[];

  // 客户视角筛选
  customerNames?: string[];     // 多选客户
  importance?: string[];        // 重要程度
  businessTags?: string[];      // 业务标签

  // 表现筛选
  performanceFilters?: Record<string, {min?: number, max?: number}>;
}

// 响应数据
interface PanoramaSearchResponse {
  list: PanoramaTalentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  viewMode: 'all' | 'customer';
  selectedCustomers?: string[];
}
```

#### 标签 Key/Name 双向映射

后端自动处理标签的 key/name 映射：
- **筛选时**：前端传 name（用户可读），后端转 key（数据库存储）
- **返回时**：后端将 key 转回 name（用户可读）

```javascript
// 后端示例：name → key 映射
const tagConfig = await db.collection('system_config')
  .findOne({ configType: 'talent_tags' });

const importance = tagNameToKeyMap.importance[filterImportance] || filterImportance;
```

---

## 数据模型

### PanoramaTalentItem

```typescript
interface PanoramaTalentItem {
  oneId: string;
  name: string;
  platform: Platform;
  talentTier?: string;
  rebate?: number;
  prices?: Record<string, number>;
  contentTags?: string[];
  followerCount?: number;

  // 客户视角专用
  customerRelations?: CustomerRelation[] | null;

  // 表现数据
  performance?: Record<string, number> | null;
}

interface CustomerRelation {
  customerId: string;
  customerName: string;
  importance?: string;      // 已转换为 name
  businessTags?: string[];  // 已转换为 name
  notes?: string;
}
```

---

## 前端文件结构

```
src/
├── pages/Analytics/TalentPanorama/
│   ├── TalentPanorama.tsx       # 主页面
│   └── index.ts
│
├── components/
│   ├── ViewModeSelector.tsx     # 视角选择器
│   └── FilterPanel/
│       ├── ModularFilterPanel.tsx   # 模块化筛选面板
│       └── FilterRenderer.tsx       # 筛选项渲染器
│
├── modules/filters/
│   ├── index.ts                 # 模块导出
│   ├── BasicInfoModule.ts       # 基础信息模块
│   ├── CustomerTagModule.ts     # 客户标签模块
│   └── PerformanceModule.ts     # 表现数据模块
│
├── hooks/
│   ├── usePanoramaData.ts       # 数据获取 Hook
│   ├── usePanoramaFilters.ts    # 筛选状态 Hook
│   └── useTagConfigs.ts         # 标签配置 Hook
│
├── api/
│   └── customerTalents.ts       # API 方法（含 panoramaSearch）
│
└── types/
    └── filterModule.ts          # FilterModule 类型定义
```

---

## 使用示例

### 页面级集成

```tsx
import { TalentPanorama } from './pages/Analytics/TalentPanorama';

function App() {
  return (
    <Route path="/analytics/talent-panorama" element={<TalentPanorama />} />
  );
}
```

### 自定义筛选模块

```typescript
import type { FilterModule } from '../types/filterModule';

export const CustomModule: FilterModule = {
  id: 'custom',
  name: '自定义筛选',
  order: 99,
  enabled: true,
  icon: createElement(SettingOutlined),

  getFilterConfigs: async () => {
    return [
      {
        id: 'customField',
        name: '自定义字段',
        type: 'enum',
        enumOptions: ['选项1', '选项2'],
        multiple: true,
      }
    ];
  },

  buildQueryParams: (filters) => {
    return {
      customField: filters.customField?.selected
    };
  }
};
```

---

## 权限控制

| 操作 | 所需权限 |
|------|---------|
| 查看达人全景 | `analytics:read` |
| 使用客户视角 | `customer:read` |
| 查看表现数据 | `performance:read` |

---

## 相关文档

- [客户达人池功能](./CUSTOMER_TALENT_POOL.md)
- [权限预留规范](../PERMISSION_RESERVATION_SPEC.md)
- [筛选模块类型定义](../../../frontends/agentworks/src/types/filterModule.ts)
- [云函数文档 - customerTalents v2.3.1](../../../functions/customerTalents/)

---

**文档版本**: v1.0.0
**创建时间**: 2025-12-03
**维护者**: AgentWorks Team
