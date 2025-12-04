# 达人标签配置管理

> 版本: v2.0.0 | 更新时间: 2025-12-05 | 对应版本: AgentWorks v3.9.0

## 概述

达人标签配置管理用于维护客户达人池中使用的标签系统，包括重要程度等级和业务标签。支持自定义名称、颜色、排序，配置修改后立即生效。

**页面路径**: `/settings/tag-management`

**组件位置**: `src/pages/Settings/TagManagement.tsx`

---

## 核心功能

### 1. 重要程度配置

用于标记客户对达人的重视程度：

| 等级 | 默认名称 | 默认颜色 | 说明 |
|------|---------|---------|------|
| core | 核心 | 红底红字 | 最高优先级达人 |
| important | 重点 | 橙底橙字 | 高优先级达人 |
| normal | 常规 | 蓝底蓝字 | 普通关注达人 |
| potential | 潜力 | 绿底绿字 | 有发展潜力的达人 |
| watch | 观望 | 灰底灰字 | 观察中的达人 |

### 2. 业务标签配置

用于标记达人的业务属性：

| 标签 | 默认名称 | 说明 |
|------|---------|------|
| long_term | 长期合作 | 已建立长期合作关系 |
| new | 新开发 | 新发现/开发的达人 |
| exclusive | 独家 | 独家合作达人 |
| high_roi | 高ROI | 投入产出比高 |
| brand_fit | 品牌契合 | 与客户品牌调性匹配 |

### 3. 自定义配置

每个标签支持自定义：
- **Key**: 存储标识（英文，不可重复）
- **Name**: 显示名称（中文）
- **背景色**: 标签背景颜色
- **文字色**: 标签文字颜色
- **排序**: 显示顺序

---

## 数据模型

### system_config - talent_tags

```javascript
{
  _id: ObjectId("..."),
  configType: "talent_tags",
  version: 2,

  importanceLevels: [
    {
      key: "core",
      name: "核心",
      sortOrder: 1,
      bgColor: "#fef2f2",
      textColor: "#dc2626"
    },
    {
      key: "important",
      name: "重点",
      sortOrder: 2,
      bgColor: "#fff7ed",
      textColor: "#ea580c"
    },
    {
      key: "normal",
      name: "常规",
      sortOrder: 3,
      bgColor: "#dbeafe",
      textColor: "#1e40af"
    }
  ],

  businessTags: [
    {
      key: "long_term",
      name: "长期合作",
      sortOrder: 1,
      bgColor: "#dcfce7",
      textColor: "#16a34a"
    },
    {
      key: "new",
      name: "新开发",
      sortOrder: 2,
      bgColor: "#fef3c7",
      textColor: "#d97706"
    }
  ],

  updatedAt: ISODate("..."),
  updatedBy: "user_001"
}
```

---

## 页面布局

```
┌─────────────────────────────────────────────┐
│  达人标签配置                    [刷新] [保存] │
├─────────────────────────────────────────────┤
│                                             │
│  [重要程度]  [业务标签]                       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [核心]  key: core                    │   │
│  │ 背景色: [#fef2f2]  文字色: [#dc2626] │   │
│  │ 排序: [1]                    [删除]  │   │
│  ├─────────────────────────────────────┤   │
│  │ [重点]  key: important               │   │
│  │ 背景色: [#fff7ed]  文字色: [#ea580c] │   │
│  │ 排序: [2]                    [删除]  │   │
│  ├─────────────────────────────────────┤   │
│  │           [+ 添加标签]               │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## API 接口

### 获取标签配置

```
GET /customerTalents?action=getTagConfigs
Response: {
  success: true,
  data: {
    importanceLevels: TagConfigItem[],
    businessTags: TagConfigItem[],
    version: number
  }
}
```

### 更新标签配置

```
POST /customerTalents?action=updateTagConfigs
Body: {
  importanceLevels: TagConfigItem[],
  businessTags: TagConfigItem[]
}
Response: {
  success: true,
  data: { success: true, version: number }
}
```

---

## 前端实现

### useTagConfigs Hook

```typescript
import { useTagConfigs } from '../../hooks/useTagConfigs';

function MyComponent() {
  const {
    configs,        // 标签配置
    loading,        // 加载状态
    saving,         // 保存状态
    error,          // 错误信息
    saveConfigs,    // 保存配置方法
    refreshConfigs, // 刷新配置方法
  } = useTagConfigs();

  // 查找重要程度配置
  const coreConfig = configs.importanceLevels.find(
    item => item.name === '核心'
  );
}
```

### ConfigurableItemList 组件

通用的可配置项列表组件，复用于：
- 标签管理页面
- 平台配置页面（达人层级、价格档位）

```tsx
import { ConfigurableItemList } from '../../components/ConfigurableItemList';

<ConfigurableItemList
  items={importanceLevels}
  onChange={setImportanceLevels}
  showColor={true}          // 显示颜色配置
  showDescription={false}   // 不显示描述
/>
```

### 缓存策略

- **LocalStorage 缓存**: 标签配置缓存到本地
- **缓存 Key**: `agentworks_tag_configs`
- **缓存时间**: 24 小时
- **自动刷新**: 保存后自动更新缓存

---

## 使用场景

### 1. 客户达人池

在 TalentPoolTab 中使用标签编辑器：

```tsx
import { TalentTagEditor } from '../shared/TalentTagEditor';

<TalentTagEditor
  record={talent}
  tagConfigs={configs}
  onSave={handleSave}
/>
```

### 2. 达人全景页

在 TalentPanorama 中显示标签颜色：

```tsx
const { configs } = useTagConfigs();

const config = configs.importanceLevels.find(
  item => item.name === importance
);

<Tag style={{
  backgroundColor: config?.bgColor,
  color: config?.textColor
}}>
  {importance}
</Tag>
```

### 3. 筛选面板

在 CustomerTagModule 中加载筛选选项：

```tsx
const { configs } = useTagConfigs();

const filterOptions = configs.importanceLevels.map(item => ({
  value: item.name,
  label: item.name
}));
```

---

## 权限控制

| 操作 | 所需权限 |
|------|---------|
| 查看标签配置 | `settings:read` |
| 编辑标签配置 | `settings:write` |
| 删除标签 | `settings:write` |

---

## 注意事项

1. **Key 不可修改**: 已使用的标签 key 不应修改，否则会导致历史数据无法匹配
2. **删除限制**: 已被使用的标签不建议删除，建议改为隐藏或重命名
3. **颜色对比度**: 设置颜色时注意背景色和文字色的对比度，确保可读性

---

## 相关文档

- [客户达人池](../customers/CUSTOMER_TALENT_POOL.md)
- [达人全景](../analytics/TALENT_PANORAMA.md)
- [权限预留规范](../../PERMISSION_RESERVATION_SPEC.md)

---

**文档版本**: v2.0.0
**创建时间**: 2025-12-05
**维护者**: AgentWorks Team
