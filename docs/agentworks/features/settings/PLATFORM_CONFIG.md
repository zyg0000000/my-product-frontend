# 平台配置管理

> 版本: v1.0.0 | 更新时间: 2025-12-05 | 对应版本: AgentWorks v3.9.0

## 概述

平台配置管理是系统设置模块的核心功能，用于管理 AgentWorks 支持的各个平台（抖音、小红书、快手等）及其相关配置。配置修改后立即生效，无需重新部署。

**页面路径**: `/settings/platform-config`

**组件位置**: `src/pages/Settings/PlatformConfig.tsx`

---

## 核心功能

### 1. 平台列表展示

使用 ProTable 展示所有平台配置：

| 字段 | 说明 |
|------|------|
| 平台名称 | 如：抖音、小红书、快手 |
| 平台标识 | 如：douyin、xiaohongshu、kuaishou |
| 启用状态 | 是否在系统中启用 |
| 达人层级 | 该平台支持的达人层级列表 |
| 价格档位 | 该平台支持的价格类型列表 |
| 内容标签 | 该平台的内容分类标签 |

### 2. 平台配置编辑

通过 Modal 弹窗编辑平台配置：

#### 2.1 基础信息
- 平台名称
- 平台标识（key）
- 启用/禁用状态

#### 2.2 达人层级配置
```typescript
interface TalentTier {
  key: string;        // 如：'head', 'waist', 'tail'
  name: string;       // 如：'头部', '腰部', '尾部'
  sortOrder: number;  // 排序权重
}
```

#### 2.3 价格档位配置
```typescript
interface PriceTier {
  key: string;        // 如：'video_60plus', 'video_20_60'
  name: string;       // 如：'60S+', '20-60S'
  sortOrder: number;
}
```

**平台差异化**:
| 平台 | 价格档位 |
|------|---------|
| 抖音 | 60S+、20-60S、1-20S、直播 |
| 小红书 | 视频、图文 |
| 快手 | 60S+、20-60S、1-20S、直播 |

#### 2.4 内容标签配置
```typescript
interface ContentTag {
  key: string;        // 如：'food', 'beauty'
  name: string;       // 如：'美食', '美妆'
  sortOrder: number;
}
```

### 3. 功能开关

每个平台可独立配置功能开关：

```typescript
interface PlatformFeatures {
  priceManagement: boolean;    // 价格管理
  performanceTracking: boolean; // 表现数据追踪
  rebateManagement: boolean;   // 返点管理
}
```

---

## 数据模型

### platform_configs 集合

```javascript
{
  _id: ObjectId("..."),
  platform: "douyin",              // 平台标识
  displayName: "抖音",             // 显示名称
  enabled: true,                   // 是否启用
  sortOrder: 1,                    // 排序

  // 达人层级
  talentTiers: [
    { key: "head", name: "头部", sortOrder: 1 },
    { key: "waist", name: "腰部", sortOrder: 2 },
    { key: "tail", name: "尾部", sortOrder: 3 }
  ],

  // 价格档位
  priceTiers: [
    { key: "video_60plus", name: "60S+", sortOrder: 1 },
    { key: "video_20_60", name: "20-60S", sortOrder: 2 },
    { key: "video_1_20", name: "1-20S", sortOrder: 3 },
    { key: "live", name: "直播", sortOrder: 4 }
  ],

  // 内容标签
  contentTags: [
    { key: "food", name: "美食", sortOrder: 1 },
    { key: "beauty", name: "美妆", sortOrder: 2 }
  ],

  // 功能开关
  features: {
    priceManagement: true,
    performanceTracking: true,
    rebateManagement: true
  },

  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## API 接口

### 获取平台配置列表

```
GET /platformConfigs
Response: {
  success: true,
  data: PlatformConfig[]
}
```

### 获取单个平台配置

```
GET /platformConfigs?platform=douyin
Response: {
  success: true,
  data: PlatformConfig
}
```

### 更新平台配置

```
PUT /platformConfigs?platform=douyin
Body: Partial<PlatformConfig>
Response: {
  success: true,
  data: PlatformConfig
}
```

---

## 前端实现

### 核心 Hook

```typescript
// usePlatformConfig Hook
import { usePlatformConfig } from '../../hooks/usePlatformConfig';

function MyComponent() {
  const {
    configs,              // 所有平台配置
    loading,              // 加载状态
    error,                // 错误信息
    refreshConfigs,       // 刷新配置
    getPlatformsByFeature, // 按功能获取平台
    getPlatformConfigByKey // 按 key 获取配置
  } = usePlatformConfig();

  // 获取启用了价格管理的平台
  const priceEnabledPlatforms = getPlatformsByFeature('priceManagement');
}
```

### 缓存策略

- **LocalStorage 缓存**: 配置数据缓存到本地
- **缓存时间**: 24 小时
- **手动刷新**: 支持手动刷新重新加载

---

## 使用场景

### 1. 达人列表平台切换

达人管理页面的平台 Tab 选项从配置中动态获取：

```tsx
const { configs } = usePlatformConfig();
const enabledPlatforms = configs.filter(c => c.enabled);

<Tabs items={enabledPlatforms.map(p => ({
  key: p.platform,
  label: p.displayName
}))} />
```

### 2. 价格输入表单

根据平台配置动态生成价格输入字段：

```tsx
const config = getPlatformConfigByKey('douyin');
const priceTiers = config?.priceTiers || [];

{priceTiers.map(tier => (
  <Form.Item key={tier.key} label={tier.name}>
    <InputNumber />
  </Form.Item>
))}
```

### 3. 筛选条件

筛选面板中的达人层级、内容标签等选项从配置获取：

```tsx
const config = getPlatformConfigByKey(currentPlatform);

<Select options={config?.talentTiers.map(t => ({
  value: t.key,
  label: t.name
}))} />
```

---

## 权限控制

| 操作 | 所需权限 |
|------|---------|
| 查看平台配置 | `settings:read` |
| 编辑平台配置 | `settings:write` |
| 启用/禁用平台 | `settings:admin` |

---

## 相关文档

- [系统设置首页](../../../frontends/agentworks/src/pages/Settings/)
- [达人管理](./TALENT_MANAGEMENT.md)
- [数据库设计](../../../database/agentworks_db/README.md)

---

**文档版本**: v1.0.0
**创建时间**: 2025-12-05
**维护者**: AgentWorks Team
