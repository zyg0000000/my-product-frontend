# 客户定价策略

> 版本: v1.0.0 | 更新时间: 2025-12-05 | 对应版本: AgentWorks v3.9.0

## 概述

客户定价策略是客户管理模块的核心功能，用于配置客户的达人采买业务定价模式。支持框架合作、单项目合作和混合模式，可按平台独立配置折扣、服务费、有效期等参数。

**页面路径**: `/customers/:id/business-strategies`

**组件位置**: `src/pages/Customers/PricingStrategy/PricingStrategy.tsx`

---

## 核心功能

### 1. 业务策略类型

系统支持三种业务策略：

| 策略 | 说明 | 状态 |
|------|------|------|
| 达人采买 | 达人合作定价配置 | ✅ 已实现 |
| 广告投放 | 广告投放业务配置 | 🔜 预留 |
| 内容制作 | 内容制作业务配置 | 🔜 预留 |

### 2. 定价模式

#### 2.1 框架合作模式 (framework)
- 长期合作客户
- 统一折扣率
- 自动计算报价系数

#### 2.2 单项目模式 (project)
- 按项目议价
- 无固定折扣
- 手动报价

#### 2.3 混合模式 (hybrid)
- 部分平台框架合作
- 部分平台单项目

### 3. 平台级配置

每个平台可独立配置：

```typescript
interface PlatformPricingConfig {
  enabled: boolean;              // 是否启用
  pricingModel: PricingModel;    // 定价模式
  platformFeeRate?: number;      // 平台费率（如抖音 5%）
  discountRate?: number;         // 折扣率（如 79.5%）
  serviceFeeRate?: number;       // 服务费率
  includesPlatformFee?: boolean; // 折扣是否包含平台费
  validFrom?: string;            // 有效期开始
  validTo?: string;              // 有效期结束
  isPermanent?: boolean;         // 是否长期有效
}
```

### 4. 报价系数自动计算

框架/混合模式下自动计算报价系数：

```
报价系数 = 1 / (折扣率 × (1 - 服务费率))

示例：
折扣率 = 79.5%，服务费率 = 5%
报价系数 = 1 / (0.795 × 0.95) ≈ 1.324
```

---

## 数据模型

### customers.businessStrategies

```typescript
interface BusinessStrategies {
  talentProcurement?: TalentProcurementStrategy;
  adPlacement?: AdPlacementStrategy;       // 预留
  contentProduction?: ContentProductionStrategy; // 预留
}

interface TalentProcurementStrategy {
  enabled: boolean;

  // 平台定价配置
  platformPricingConfigs?: {
    douyin?: PlatformPricingConfig;
    xiaohongshu?: PlatformPricingConfig;
    kuaishou?: PlatformPricingConfig;
  };

  // 报价系数（自动计算）
  quotationCoefficients?: {
    douyin?: number;
    xiaohongshu?: number;
    kuaishou?: number;
  };
}
```

---

## 页面布局

### 1. 客户信息头

```
┌─────────────────────────────────────────┐
│  ← 返回        客户名称 - 业务策略中心   │
│                                         │
│  [达人采买] [广告投放] [内容制作]        │
└─────────────────────────────────────────┘
```

### 2. 达人采买配置

```
┌─────────────────────────────────────────┐
│  达人采买策略                    [编辑]  │
├─────────────────────────────────────────┤
│                                         │
│  [抖音] [小红书] [快手]                  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 定价模式: 框架合作               │   │
│  │ 折扣率: 79.5%                   │   │
│  │ 服务费率: 5%                    │   │
│  │ 有效期: 2025-01-01 ~ 2025-12-31 │   │
│  │ 报价系数: 1.324                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## API 接口

### 获取客户详情

```
GET /customers/:id
Response: {
  success: true,
  data: {
    _id: string,
    name: string,
    businessStrategies: BusinessStrategies
  }
}
```

### 更新业务策略

```
PUT /customers/:id
Body: {
  businessStrategies: BusinessStrategies
}
Response: {
  success: true,
  data: Customer
}
```

---

## 前端实现

### 共用组件

#### TalentProcurementForm

表单组件，在以下两处复用：
1. 业务策略中心页面（独立页面）
2. 客户详情页的 PricingTab（卡片内嵌）

```tsx
import { TalentProcurementForm } from '../shared/TalentProcurementForm';

<TalentProcurementForm
  strategy={customer.businessStrategies?.talentProcurement}
  enabledPlatforms={enabledPlatforms}
  isEditing={isEditing}
  onSave={handleSave}
/>
```

### 系数计算工具

```typescript
import {
  calculateCoefficient,
  calculateAllCoefficients,
  validateAllPlatformsValidity
} from '../shared/talentProcurement';

// 计算单个平台系数
const result = calculateCoefficient(platformConfig);
// result: { coefficient: 1.324, formula: '1 / (0.795 × 0.95)' }

// 计算所有平台系数
const allCoefficients = calculateAllCoefficients(platformPricingConfigs);

// 验证有效期
const validityStatus = validateAllPlatformsValidity(platformPricingConfigs);
```

---

## 交互流程

### 编辑流程

```
1. 点击 [编辑] 按钮
2. 进入编辑模式（表单可编辑）
3. 切换平台 Tab 配置各平台参数
4. 系数实时计算显示
5. 点击 [保存] 提交
6. 返回只读模式
```

### 有效期验证

- **即将过期**（30天内）：黄色警告
- **已过期**：红色提示
- **长期有效**：绿色标记

---

## 权限控制

| 操作 | 所需权限 |
|------|---------|
| 查看定价策略 | `customer:read` |
| 编辑定价策略 | `customer:write` |
| 启用/禁用策略 | `customer:write` |

---

## 相关文档

- [客户管理](./CUSTOMER_TALENT_POOL.md)
- [客户详情页](../../../frontends/agentworks/src/pages/Customers/CustomerDetail/)
- [平台配置](../settings/PLATFORM_CONFIG.md)

---

**文档版本**: v1.0.0
**创建时间**: 2025-12-05
**维护者**: AgentWorks Team
