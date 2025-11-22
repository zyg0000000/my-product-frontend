# 客户管理模块 - 实施方案

## 一、核心概念澄清

### 1.1 业务类型（Business Type）
- **定义**：公司提供的不同服务类型，每种业务有独立的价格体系
- **核心业务类型**：
  - **达人采买**：帮客户采购达人资源，涉及平台费、服务费等
  - **广告投流**：广告投放服务，计费维度可能包括投放金额、优化费等
  - **其他业务**：预留扩展（如内容制作、运营服务等）

### 1.2 支付系数（Payment Coefficient）
- **定义**：客户最终支付金额与基础金额的比率
- **注意**：不同业务类型的"基础金额"含义不同
  - 达人采买：基础金额 = 达人合作金额
  - 广告投流：基础金额 = 广告投放金额
- **示例**：支付系数1.155表示客户需支付基础金额的115.5%

### 1.3 价格策略配置架构
每个客户针对不同业务类型有独立的价格配置：

```javascript
{
  // 按业务类型分别配置
  businessStrategies: {
    // 达人采买业务
    talentProcurement: {
      enabled: true,
      pricingModel: 'framework',  // framework/project/hybrid

      // 基础配置
      discountRate: 0.9,         // 折扣率
      serviceRate: 0.1,           // 服务费率

      // 平台费配置（达人采买特有）
      platformFees: {
        douyin: 0.05,
        xiaohongshu: 0.10
      },

      // 计算选项
      options: {
        discountIncludesPlatformFee: true,
        serviceFeeBase: 'beforeDiscount'
      },

      // 测算维度
      dimensions: ['platform', 'talentLevel', 'contentType']
    },

    // 广告投流业务（预留结构）
    adPlacement: {
      enabled: false,
      pricingModel: 'project',

      // 广告投流特有的配置
      optimizationFeeRate: 0.15,  // 优化费率
      minimumCharge: 5000,        // 最低收费

      // 测算维度完全不同
      dimensions: ['platform', 'adType', 'budget', 'duration']
    },

    // 内容制作业务（示例）
    contentProduction: {
      enabled: false,
      pricingModel: 'project',

      // 按内容类型定价
      priceList: {
        'shortVideo': 5000,
        'liveStream': 10000,
        'graphic': 2000
      },

      dimensions: ['contentType', 'quantity', 'quality']
    }
  }
}
```

### 1.4 业务类型的差异化设计
| 业务类型 | 基础金额定义 | 主要费用构成 | 测算维度 | 价格模式 |
|---------|-------------|-------------|---------|---------|
| 达人采买 | 达人合作金额 | 平台费+服务费+折扣 | 平台、达人等级、内容类型 | 框架/项目 |
| 广告投流 | 广告投放金额 | 优化费+服务费 | 平台、广告类型、预算、周期 | 项目为主 |
| 内容制作 | 制作成本 | 创意费+制作费 | 内容类型、数量、质量要求 | 项目定价 |
| 运营服务 | 人力成本 | 月费+绩效费 | 服务内容、账号数量、KPI | 长期合约 |

## 二、需要开发的页面

### 2.1 客户列表页面
**路径**：`/customers`

**功能**：
- 客户列表展示（表格形式）
- 搜索和筛选（按名称、级别、状态）
- 新增客户入口
- 批量操作

**列表字段**：
- 客户编码
- 客户名称
- 客户级别（手动设置）
- 合作状态
- 创建时间
- 操作（查看/编辑/删除）

### 2.2 客户详情/编辑页面
**路径**：`/customers/:id`

**页面结构**（Tab形式）：
```
Tab 1: 基础信息
  - 客户编码（自动生成）
  - 客户名称
  - 客户级别（下拉选择）
  - 所属行业
  - 联系人信息（支持多个）
  - 备注

Tab 2: 价格策略（核心）
  - 定价模式选择（框架折扣/项目比价）
  - 折扣配置
  - 服务费配置
  - 平台费用配置
  - 计算选项设置
  - 支付系数预览

Tab 3: 项目历史
  - 关联项目列表
  - 总金额统计
  - 项目时间线
```

### 2.3 价格策略配置页面（重点）
**路径**：`/customers/:id/pricing`

**界面设计（支持多业务类型）**：
```
┌─────────────────────────────────────────────┐
│ 客户：XXX公司                                │
├─────────────────────────────────────────────┤
│                                             │
│ 【业务类型选择】                             │
│ ◉ 达人采买  ○ 广告投流  ○ 内容制作  ○ 其他   │
│                                             │
├─────────────────────────────────────────────┤
│ 业务类型：达人采买                           │
│                                             │
│ 【基础配置】                                │
│ 定价模式：[框架折扣 ▼]                      │
│ 折扣率：  [90]%                             │
│ 服务费率：[10]%                             │
│                                             │
│ 【平台费用设置】（达人采买特有）              │
│ ☑ 抖音 (5%)                                │
│ ☑ 小红书 (10%)                             │
│ ☐ 快手 (预留)                               │
│                                             │
│ 【计算选项】                                 │
│ 折扣应用范围：                               │
│ ○ 包含平台费  ● 不包含平台费                  │
│                                             │
│ 服务费计算基准：                             │
│ ● 折扣前      ○ 折扣后                      │
│                                             │
│ 【测算维度设置】                             │
│ ☑ 按平台区分  ☑ 按达人等级  ☐ 按内容类型     │
│                                             │
│ 【支付系数预览】                             │
│ ┌─────────────────────────────────┐        │
│ │ 平台    基础金额  最终系数       │        │
│ │ 抖音    1000元    1155元 (1.155) │        │
│ │ 小红书  1000元    1210元 (1.21)  │        │
│ └─────────────────────────────────┘        │
│                                             │
│ [保存达人采买配置] [配置其他业务]            │
└─────────────────────────────────────────────┘
```

**不同业务类型的配置界面差异**：
- **达人采买**：平台费、折扣、服务费配置
- **广告投流**：优化费率、最低收费、ROI目标配置
- **内容制作**：内容类型定价表、质量等级系数
- **运营服务**：月费标准、绩效提成配置

### 2.4 支付系数计算器（独立工具页）
**路径**：`/tools/payment-calculator`

**功能**：
- 快速测算不同配置下的支付系数
- 对比不同客户的价格差异
- 导出计算结果

## 三、数据模型设计

### 3.1 MongoDB Collections

#### customers 集合
```javascript
{
  _id: ObjectId,
  code: "CUS2024001",           // 客户编码
  name: "某某公司",               // 客户名称
  level: "大客户",               // 客户级别（手动设置）
  status: "active",             // 状态：active/inactive/suspended
  industry: "互联网",            // 所属行业

  // 联系人信息
  contacts: [{
    name: "张三",
    position: "采购经理",
    phone: "13800138000",
    email: "zhang@company.com",
    isPrimary: true
  }],

  // 业务策略配置（按业务类型分开）
  businessStrategies: {
    // 达人采买业务
    talentProcurement: {
      enabled: true,
      pricingModel: "framework",  // framework/project/hybrid

      // 折扣配置
      discount: {
        rate: 0.9,              // 折扣率
        includesPlatformFee: false,  // 是否包含平台费
        validFrom: ISODate(),
        validTo: ISODate()
      },

      // 服务费配置
      serviceFee: {
        rate: 0.1,              // 服务费率
        calculationBase: "beforeDiscount"  // beforeDiscount/afterDiscount
      },

      // 平台费配置（达人采买特有）
      platformFees: {
        douyin: {
          enabled: true,
          rate: 0.05
        },
        xiaohongshu: {
          enabled: true,
          rate: 0.10
        },
        kuaishou: {
          enabled: false,
          rate: null            // 预留
        }
      },

      // 测算维度配置
      dimensions: {
        byPlatform: true,       // 按平台区分价格
        byTalentLevel: false,   // 按达人等级区分
        byContentType: false    // 按内容类型区分
      },

      // 预计算的支付系数（缓存）
      paymentCoefficients: {
        douyin: 1.155,
        xiaohongshu: 1.21
      }
    },

    // 广告投流业务（预留结构）
    adPlacement: {
      enabled: false,
      pricingModel: "project",

      // 广告投流特有配置
      optimizationFee: {
        rate: 0.15,             // 优化费率
        minimumCharge: 5000     // 最低收费
      },

      // 测算维度（与达人采买完全不同）
      dimensions: {
        byPlatform: true,
        byAdType: true,         // 按广告类型
        byBudgetRange: true,    // 按预算区间
        byCampaignDuration: true // 按投放周期
      }
    },

    // 内容制作业务（预留结构）
    contentProduction: {
      enabled: false,
      pricingModel: "project",

      // 价格表配置
      priceList: {
        shortVideo: { base: 5000, premium: 10000 },
        liveStream: { base: 10000, premium: 20000 },
        graphic: { base: 2000, premium: 5000 }
      },

      dimensions: {
        byContentType: true,
        byQualityLevel: true,
        byQuantity: true
      }
    }
  },

  // 元数据
  createdAt: ISODate(),
  updatedAt: ISODate(),
  createdBy: "userId",
  updatedBy: "userId"
}
```

#### pricing_history 集合（价格策略变更历史）
```javascript
{
  _id: ObjectId,
  customerId: ObjectId,
  changeType: "discount_update",  // 变更类型
  beforeValue: {},                // 变更前的值
  afterValue: {},                 // 变更后的值
  reason: "年度续约调整",          // 变更原因
  effectiveDate: ISODate(),       // 生效日期
  operatedBy: "userId",
  operatedAt: ISODate()
}
```

## 四、云函数设计

### 4.1 客户管理云函数

#### getCustomers
- 功能：获取客户列表
- 参数：分页、搜索、筛选条件
- 返回：客户列表及统计信息

#### getCustomerById
- 功能：获取单个客户详情
- 参数：customerId
- 返回：完整客户信息

#### createCustomer
- 功能：创建新客户
- 参数：客户信息
- 返回：创建结果

#### updateCustomer
- 功能：更新客户信息
- 参数：customerId, 更新内容
- 返回：更新结果

### 4.2 价格策略云函数

#### calculatePaymentCoefficient
- 功能：计算支付系数（支持多业务类型）
- 输入参数：
```javascript
{
  businessType: "talentProcurement",  // 业务类型
  baseAmount: 1000,                   // 基础金额

  // 达人采买特有参数
  platform: "douyin",                 // 平台
  talentLevel: "S",                   // 达人等级（可选）

  // 价格配置
  discount: {
    rate: 0.9,
    includesPlatformFee: false
  },
  serviceFee: {
    rate: 0.1,
    calculationBase: "beforeDiscount"
  },
  platformFee: 0.05,

  // 其他业务类型参数（预留）
  adType: null,                       // 广告类型（广告投流用）
  contentType: null                   // 内容类型（内容制作用）
}
```
- 返回结果：
```javascript
{
  businessType: "talentProcurement",
  coefficient: 1.155,            // 支付系数
  finalAmount: 1155,            // 最终金额
  breakdown: {                  // 计算明细
    base: 1000,
    discountAmount: 900,
    platformFeeAmount: 50,
    serviceFeeAmount: 95,
    total: 1155
  },
  formula: "展示的计算公式",
  dimensions: {                 // 影响价格的维度
    platform: "douyin",
    talentLevel: "S"
  }
}
```

#### batchCalculateCoefficients
- 功能：批量计算多平台支付系数
- 参数：客户价格策略配置
- 返回：各平台支付系数

#### updatePricingStrategy
- 功能：更新客户价格策略
- 参数：customerId, 策略配置
- 特性：
  - 记录变更历史
  - 重新计算支付系数
  - 支持生效日期设置

## 五、开发优先级和时间估算

### Phase 1：基础框架（3-4天）
1. **Day 1-2：数据模型和云函数**
   - 创建 customers 集合
   - 开发基础CRUD云函数
   - 支付系数计算云函数

2. **Day 3-4：基础页面**
   - 客户列表页面
   - 客户新增/编辑页面（基础信息）

### Phase 2：价格策略核心（3-4天）
1. **Day 5-6：价格策略配置**
   - 价格策略配置界面
   - 支付系数实时预览
   - 计算明细展示

2. **Day 7-8：计算引擎完善**
   - 多场景计算支持
   - 批量计算优化
   - 历史记录功能

### Phase 3：集成与优化（2-3天）
1. **Day 9-10：系统集成**
   - 与项目管理集成
   - 权限管理
   - 数据导入导出

## 六、技术要点

### 6.1 前端技术要点
- 使用 React Hook 管理复杂表单状态
- 实时计算展示（使用 useMemo 优化）
- 表格组件复用现有 TalentTable 的模式

### 6.2 后端技术要点
- 支付系数缓存策略（减少重复计算）
- 价格策略版本管理
- 批量操作优化

### 6.3 用户体验优化
- 配置变更实时预览效果
- 计算过程透明化展示
- 快速复制其他客户配置

## 七、测试场景

### 7.1 计算准确性测试
- 各种配置组合下的计算结果验证
- 边界值测试（0折扣、100%服务费等）

### 7.2 业务场景测试
- 新客户配置流程
- 价格策略调整流程
- 批量客户导入

## 八、后续扩展考虑

### 8.1 业务类型扩展路径
1. **短期（已预留结构）**
   - 广告投流业务配置界面
   - 内容制作价格表管理
   - 运营服务合约管理

2. **中期（3-6个月）**
   - 跨业务类型打包定价
   - 组合优惠策略
   - 客户价值评分模型

3. **长期（6个月+）**
   - AI智能定价建议
   - 市场行情自动跟踪
   - 动态定价策略

### 8.2 测算维度扩展
不同业务类型可能需要的测算维度：

| 业务类型 | 可扩展的测算维度 |
|---------|----------------|
| 达人采买 | 达人等级、内容类型、合作深度、独家/非独家 |
| 广告投流 | ROI目标、行业类别、季节性因素、竞价强度 |
| 内容制作 | 创意复杂度、交付周期、修改次数、版权归属 |
| 运营服务 | SLA级别、响应时间、专属团队规模 |

### 8.3 平台扩展计划
- **第一批**：抖音、小红书（已实施）
- **第二批**：快手、B站、视频号
- **第三批**：微博、知乎、今日头条
- **国际化**：TikTok、Instagram、YouTube

---

**文档版本**: v1.0
**创建日期**: 2024-11-22
**状态**: 待确认