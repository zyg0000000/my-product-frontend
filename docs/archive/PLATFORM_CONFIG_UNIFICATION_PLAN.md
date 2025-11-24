# 平台配置统一改造计划

> **AgentWorks 平台配置中心化方案**
>
> **状态**: 📋 待实施（等待所有页面 UI 升级完成后执行）
>
> **优先级**: ⭐⭐⭐⭐⭐ 高优先级
>
> **创建时间**: 2025-11-23

---

## 📊 现状分析

### 核心问题

#### 1. 重复定义严重
- 平台列表在 **6+ 处**独立定义
- 平台配置散落在不同文件
- 存在不一致风险（顺序、支持列表不同）

#### 2. 维护成本高
- 新增平台需要修改 **15-20 个文件**
- 硬编码散落在 **28 个前端文件 + 14 个云函数**
- switch 语句重复出现 10+ 次

#### 3. 配置分散
```
当前配置分布：
├─ types/talent.ts              (Platform 类型、PLATFORM_NAMES、PLATFORM_PRICE_TYPES)
├─ config/platforms.ts          (TALENT_PLATFORMS、平台费率)
├─ 各页面组件                   (硬编码平台数组)
├─ 各业务组件                   (switch 语句处理平台逻辑)
└─ 云函数                        (各自定义 SUPPORTED_PLATFORMS)
```

### 影响范围统计

| 模块 | 文件数 | 主要问题 |
|------|--------|---------|
| **前端页面** | 11 | 硬编码平台数组 `['douyin', 'xiaohongshu', ...]` |
| **前端组件** | 9 | switch 语句处理平台特定逻辑 |
| **Hooks** | 4 | 依赖分散的平台配置 |
| **API层** | 4 | 平台参数验证不统一 |
| **云函数** | 14 | 各自定义 SUPPORTED_PLATFORMS |

---

## 🎯 统一方案设计

### 方案架构

```
┌─────────────────────────────────────────────────┐
│          统一平台配置中心                          │
│        src/config/platformConfig.ts              │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 平台核心配置对象                           │  │
│  │ PLATFORM_CONFIG = {                       │  │
│  │   douyin: { ... },                        │  │
│  │   xiaohongshu: { ... },                   │  │
│  │   bilibili: { ... },                      │  │
│  │   kuaishou: { ... }                       │  │
│  │ }                                         │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 便捷工具方法                               │  │
│  │ - getPlatformName()                       │  │
│  │ - getPlatformPriceTypes()                 │  │
│  │ - getPlatformLink()                       │  │
│  │ - getAccountIdConfig()                    │  │
│  │ - validatePlatform()                      │  │
│  │ - getAllPlatforms()                       │  │
│  │ - getEnabledPlatforms()                   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
           ↓                ↓                ↓
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ 页面组件 │     │ 业务组件 │     │ 云函数   │
    │  11个    │     │   9个    │     │  14个    │
    └──────────┘     └──────────┘     └──────────┘
```

### 平台配置数据结构

```typescript
每个平台包含：

1. 基础信息
   ├─ key: 'douyin'              // 平台唯一标识
   ├─ name: '抖音'               // 中文显示名称
   ├─ enabled: true              // 是否启用（灰度控制）
   └─ color: 'blue'              // 主题配色

2. 账号ID配置
   ├─ accountId
   │  ├─ label: '星图ID'         // 表单标签文字
   │  ├─ placeholder: '星图ID'   // 输入框占位符
   │  ├─ helpText: '...'         // 帮助说明（可选）
   │  └─ pattern: /regex/        // 验证正则（可选）

3. 价格类型配置
   └─ priceTypes: [
       {
         key: 'video_60plus',
         label: '60s+',
         required: true,
         bgColor: '#dbeafe',
         textColor: '#1e40af'
       },
       // ... 更多价格类型
      ]

4. 平台特有字段
   └─ specificFields: {
       xingtuId: { label: '星图ID', type: 'string' },
       uid: { label: '抖音UID', type: 'string' },
       starLevel: { label: '星图等级', type: 'number' }
      }

5. 外链配置
   ├─ linkTemplate: 'https://www.xingtu.cn/...'
   └─ linkIdField: 'xingtuId'    // 使用哪个字段生成链接

6. 业务配置
   ├─ fee: 0.05                  // 平台费率
   ├─ defaultRebate: 15          // 默认返点率（可选）
   └─ features: {                 // 功能开关
       priceManagement: true,
       performanceTracking: true,
       rebateManagement: true
      }
```

### 工具方法设计

```typescript
配置查询类
├─ getPlatformConfig(key)        // 获取完整配置
├─ getPlatformName(key)          // 获取平台名称
├─ getAllPlatforms()             // 获取所有平台数组
├─ getEnabledPlatforms()         // 获取启用的平台
└─ validatePlatform(key)         // 验证平台是否有效

价格类型类
├─ getPlatformPriceTypes(key)   // 获取价格类型列表
├─ getDefaultPriceType(key)     // 获取默认价格类型
└─ getPriceTypeConfig(key, type) // 获取特定价格类型配置

账号ID类
├─ getAccountIdLabel(key)        // 获取账号ID标签
├─ getAccountIdPlaceholder(key)  // 获取占位符文字
└─ validateAccountId(key, value) // 验证账号ID格式

外链类
├─ getPlatformLink(platform, talent) // 生成平台外链
└─ hasPlatformLink(platform)     // 是否支持外链

特有字段类
├─ getSpecificFields(key)        // 获取平台特有字段配置
└─ hasSpecificField(key, field)  // 是否有特定字段

业务配置类
├─ getPlatformFee(key)           // 获取平台费率
└─ isPlatformFeatureEnabled(key, feature) // 功能是否启用
```

---

## 🔄 改造实施计划

### Phase 1: 创建配置中心 ⏱️ 1-2 小时

**任务**：
1. 创建 `src/config/platformConfig.ts`
2. 定义 `PlatformConfig` TypeScript 接口
3. 整合所有平台配置信息
4. 实现工具方法
5. 导出便捷常量

**产出**：
- ✅ 单一配置文件（约 300-400 行）
- ✅ 完整的类型定义
- ✅ 20+ 个工具方法
- ✅ 向后兼容的导出

**验收标准**：
- TypeScript 编译通过
- 所有平台配置完整
- 工具方法单元测试通过

---

### Phase 2: 前端代码迁移 ⏱️ 4-6 小时

#### 2.1 核心类型层（最高优先级）

**文件**：
- `types/talent.ts`

**改造内容**：
- 保留 `Platform` 类型定义（兼容性）
- 移除 `PLATFORM_NAMES`（改为从配置导入）
- 移除 `PLATFORM_PRICE_TYPES`（改为从配置导入）
- 添加废弃注释，引导使用新配置

**工作量**: 30 分钟

---

#### 2.2 页面组件层（高优先级）

**改造文件列表** (11 个)：

| 文件 | 改造内容 | 工作量 |
|------|---------|--------|
| AgenciesList.tsx | 替换硬编码平台数组 | 15 分钟 |
| BasicInfo.tsx | 替换硬编码数组 + 外链函数 | 20 分钟 |
| PerformanceHome.tsx | 替换硬编码数组 + 外链函数 | 20 分钟 |
| CreateTalent.tsx | 替换数组 + switch 语句 | 25 分钟 |
| TalentList.tsx | 替换硬编码数组 | 15 分钟 |
| TalentDetail.tsx | 替换价格类型配置 | 15 分钟 |
| PerformanceConfig.tsx | 替换硬编码数组 | 15 分钟 |
| PricingStrategy.tsx | 替换价格类型配置 | 15 分钟 |
| 其他页面 (3个) | 替换相关配置 | 45 分钟 |

**小计**: 约 3 小时

---

#### 2.3 组件层（中优先级）

**改造文件列表** (9 个)：

| 文件 | 改造内容 | 工作量 |
|------|---------|--------|
| EditTalentModal.tsx | 替换 switch 语句 | 20 分钟 |
| AgencyRebateModal_v2.tsx | 替换硬编码数组 | 15 分钟 |
| DeleteConfirmModal.tsx | 使用工具方法 | 10 分钟 |
| PriceModal.tsx | 替换价格类型配置 | 15 分钟 |
| DataImportModal.tsx | 替换平台配置 | 15 分钟 |
| DimensionManager.tsx | 替换价格类型配置 | 15 分钟 |
| FieldMappingManager.tsx | 替换价格类型配置 | 15 分钟 |
| 其他组件 (2个) | 替换相关配置 | 20 分钟 |

**小计**: 约 2 小时

---

#### 2.4 Hooks 和 API 层（低优先级）

**文件** (8 个)：
- Hooks: useDataImport, useFieldMapping, useDimensionConfig, usePerformanceData
- API: talent.ts, agency.ts, rebate.ts, performance.ts

**改造内容**：
- 更新导入路径
- 使用配置验证方法
- 移除硬编码常量

**工作量**: 1 小时

---

### Phase 3: 云函数配置 ⏱️ 2-3 小时

#### 方案选择

**方案A：共享配置模块**（推荐）
```
functions/
├─ shared/
│  └─ platformConfig.js      // 平台配置（与前端保持同步）
└─ agencyRebateConfig/
   └─ index.js               // 导入 shared/platformConfig.js
```

**方案B：环境变量配置**
```
通过环境变量传递平台列表
SUPPORTED_PLATFORMS=douyin,xiaohongshu,bilibili,kuaishou
```

**方案C：数据库配置**（未来扩展）
```
从数据库的 system_config 集合读取平台配置
支持运行时动态调整
```

#### 需要改造的云函数 (14 个)

| 云函数 | 改造内容 | 工作量 |
|--------|---------|--------|
| agencyRebateConfig | 替换 SUPPORTED_PLATFORMS | 10 分钟 |
| getCurrentAgencyRebate | 替换 SUPPORTED_PLATFORMS | 10 分钟 |
| getAgencyRebateHistory | 替换 SUPPORTED_PLATFORMS | 10 分钟 |
| getTalentStats | 移除硬编码对象 | 15 分钟 |
| customers | 移除重复的 TALENT_PLATFORMS | 15 分钟 |
| 其他云函数 (9个) | 更新平台验证逻辑 | 90 分钟 |

**小计**: 约 2.5 小时

---

### Phase 4: 测试验证 ⏱️ 2-3 小时

#### 功能测试清单

**平台切换测试**
- [ ] 所有页面的 Tabs 切换正常
- [ ] 平台筛选器工作正常
- [ ] 平台名称显示正确

**平台特定功能测试**
- [ ] 创建达人时平台选择正常
- [ ] 平台特定字段显示/隐藏正确
- [ ] 账号ID标签和占位符正确
- [ ] 价格类型配置正确加载

**业务功能测试**
- [ ] 价格管理正常
- [ ] 返点管理正常
- [ ] 外链跳转正常
- [ ] 数据导入/导出正常

**云函数测试**
- [ ] 平台参数验证正常
- [ ] 返点配置按平台保存
- [ ] 统计数据按平台聚合

**兼容性测试**
- [ ] 旧数据正常读取
- [ ] 新旧接口兼容
- [ ] 无报错或警告

---

## 📐 配置数据结构详细设计

### 完整的 PlatformConfig 接口

```typescript
interface PlatformConfig {
  // 基础信息
  key: Platform;                    // 'douyin' | 'xiaohongshu' | 'bilibili' | 'kuaishou'
  name: string;                     // '抖音'
  enabled: boolean;                 // true
  color: string;                    // 'blue' (用于Tag、按钮等)
  icon?: string;                    // 图标名称（可选）

  // 账号ID配置
  accountId: {
    label: string;                  // '星图ID'
    placeholder: string;            // '请输入星图ID'
    helpText?: string;              // 帮助说明
    pattern?: RegExp;               // 验证正则
    errorMessage?: string;          // 验证失败提示
  };

  // 价格类型配置
  priceTypes: Array<{
    key: PriceType;                 // 'video_60plus'
    label: string;                  // '60s+'
    required: boolean;              // 是否必填
    bgColor: string;                // 背景色
    textColor: string;              // 文字色
    order: number;                  // 排序
  }>;

  // 平台特有字段
  specificFields: Record<string, {
    label: string;                  // 字段标签
    type: 'string' | 'number';      // 字段类型
    required?: boolean;             // 是否必填
  }>;

  // 外链配置
  link?: {
    template: string;               // URL 模板（如 'https://.../{id}'）
    idField: string;                // 使用哪个字段作为ID（如 'xingtuId'）
  };

  // 业务配置
  business: {
    fee: number | null;             // 平台费率（0.05 = 5%）
    defaultRebate?: number;         // 默认返点率
    minRebate?: number;             // 最小返点率
    maxRebate?: number;             // 最大返点率
  };

  // 功能开关
  features: {
    priceManagement: boolean;       // 是否支持价格管理
    performanceTracking: boolean;   // 是否支持表现追踪
    rebateManagement: boolean;      // 是否支持返点管理
    dataImport: boolean;            // 是否支持数据导入
  };
}
```

### 示例配置对象

```typescript
抖音平台完整配置：
{
  key: 'douyin',
  name: '抖音',
  enabled: true,
  color: 'blue',

  accountId: {
    label: '星图ID',
    placeholder: '请输入星图ID',
    helpText: '可在星图后台查看',
  },

  priceTypes: [
    { key: 'video_60plus', label: '60s+', required: true, bgColor: '#dbeafe', textColor: '#1e40af', order: 1 },
    { key: 'video_21_60', label: '21-60s', required: true, bgColor: '#e0e7ff', textColor: '#4338ca', order: 2 },
    { key: 'video_1_20', label: '1-20s', required: true, bgColor: '#ddd6fe', textColor: '#6b21a8', order: 3 },
  ],

  specificFields: {
    xingtuId: { label: '星图ID', type: 'string', required: false },
    uid: { label: '抖音UID', type: 'string', required: false },
    starLevel: { label: '星图等级', type: 'number', required: false },
  },

  link: {
    template: 'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/{id}',
    idField: 'xingtuId',
  },

  business: {
    fee: 0.05,
    defaultRebate: 15,
    minRebate: 0,
    maxRebate: 100,
  },

  features: {
    priceManagement: true,
    performanceTracking: true,
    rebateManagement: true,
    dataImport: true,
  },
}
```

---

## 💰 收益量化分析

### 代码减少

| 指标 | 改造前 | 改造后 | 减少量 |
|------|--------|--------|--------|
| 平台数组定义 | 6 处 | 1 处 | -83% |
| switch 语句 | 10+ 个 | 0 个 | -100% |
| 重复工具函数 | 3 对 | 1 套 | -67% |
| 硬编码常量 | 20+ 处 | 0 处 | -100% |

### 维护效率

| 操作 | 改造前耗时 | 改造后耗时 | 效率提升 |
|------|-----------|-----------|---------|
| 新增平台 | 2-3 小时 | 15 分钟 | **90%** ↑ |
| 修改平台名称 | 30 分钟 | 1 分钟 | **97%** ↑ |
| 调整价格类型 | 1 小时 | 5 分钟 | **92%** ↑ |
| 添加平台特性 | 1.5 小时 | 10 分钟 | **89%** ↑ |

### 质量提升

| 指标 | 改造前 | 改造后 |
|------|--------|--------|
| 配置不一致风险 | 高 | **零** |
| 新人上手难度 | 中 | **低** |
| 代码可读性 | 中 | **高** |
| 扩展性 | 低 | **高** |

---

## 📋 改造检查清单

### 开发阶段

**Phase 1: 配置中心**
- [ ] 创建 platformConfig.ts 文件
- [ ] 定义 TypeScript 接口
- [ ] 整合所有平台配置
- [ ] 实现工具方法
- [ ] 编写使用文档

**Phase 2: 前端迁移**
- [ ] 迁移 types/talent.ts
- [ ] 迁移页面组件（11 个）
- [ ] 迁移业务组件（9 个）
- [ ] 迁移 Hooks（4 个）
- [ ] 迁移 API 层（4 个）
- [ ] 标记旧配置为废弃

**Phase 3: 云函数**
- [ ] 创建共享配置模块
- [ ] 迁移云函数（14 个）
- [ ] 统一平台验证逻辑
- [ ] 更新部署脚本

**Phase 4: 测试**
- [ ] 功能测试（所有平台）
- [ ] 兼容性测试
- [ ] 性能测试
- [ ] 回归测试

### 文档更新

- [ ] 更新 DEVELOPMENT_GUIDELINES.md
- [ ] 更新 README.md
- [ ] 创建平台配置使用文档
- [ ] 更新 CHANGELOG.md

---

## ⚠️ 风险评估与应对

### 潜在风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 遗漏文件导致功能异常 | 中 | 高 | 全面代码搜索 + 完整测试 |
| 云函数配置不同步 | 中 | 中 | 创建同步检查脚本 |
| 旧代码依赖未清理 | 低 | 低 | 保留废弃标记，逐步清理 |
| TypeScript 类型报错 | 低 | 低 | 渐进式迁移，逐个修复 |

### 回滚方案

```
每个阶段都有独立回滚能力：

Phase 1 回滚
└─ 删除 platformConfig.ts 即可

Phase 2 回滚
└─ 使用 Git 还原修改的文件

Phase 3 回滚
└─ 重新部署旧版云函数

完整回滚
└─ git revert [commit-hash]
```

---

## 🎯 成功标准

### 功能完整性
- ✅ 所有现有功能 100% 正常工作
- ✅ 无新增 bug
- ✅ 性能无明显下降

### 代码质量
- ✅ TypeScript 零错误
- ✅ ESLint 零警告
- ✅ 所有平台配置集中管理

### 可维护性
- ✅ 新增平台只需修改 1 个文件
- ✅ 配置清晰，文档完善
- ✅ 工具方法易用

---

## 📅 建议执行时间

**前置条件**：
- ✅ 所有页面 UI 升级为 Ant Design Pro + Tailwind
- ✅ 弹窗组件统一完成
- ✅ 主要功能稳定运行

**最佳执行时机**：
- UI 升级全部完成后
- 新功能开发前
- 有 1-2 天完整开发时间

**预计总工时**：
- 开发：8-12 小时
- 测试：2-3 小时
- 文档：1 小时
- **总计**: 1.5-2 个工作日

---

## 📚 相关文档

### 改造后需要更新的文档
- [ ] `DEVELOPMENT_GUIDELINES.md` - 添加平台配置使用指南
- [ ] `COMPONENT_LIBRARY.md` - 更新平台相关组件示例
- [ ] `README.md` - 更新技术栈说明
- [ ] 新建 `PLATFORM_CONFIG_GUIDE.md` - 平台配置详细文档

### 改造参考文档
- 当前文档：`docs/PLATFORM_CONFIG_UNIFICATION_PLAN.md`（本文档）
- UI 规范：`UI_UX_GUIDELINES.md`
- 代码质量报告：`docs/CODE_QUALITY_REPORT.md`

---

## 🚀 后续扩展可能

### 未来可实现的高级特性

1. **动态平台配置**
   - 从数据库读取配置
   - 支持运行时修改
   - 无需重新部署

2. **平台能力分级**
   - 核心平台（抖音、小红书）
   - 扩展平台（B站、快手）
   - 实验平台（视频号、微博）

3. **配置可视化管理**
   - 管理后台配置平台
   - 图形化界面编辑
   - 版本历史追踪

4. **国际化支持**
   - 多语言平台名称
   - 地域化配置
   - 币种和时区支持

---

## 💡 关键决策点

### 决策1: 配置存储位置
- ✅ **前端代码配置**（推荐）：简单、类型安全、易维护
- ⚪ 数据库配置：灵活但增加复杂度
- ⚪ 环境变量：适合简单场景

### 决策2: 迁移策略
- ✅ **渐进式迁移**（推荐）：风险可控、易回滚
- ⚪ 一次性迁移：速度快但风险高

### 决策3: 云函数配置方式
- ✅ **共享配置模块**（推荐）：前后端一致
- ⚪ 环境变量：简单但功能受限
- ⚪ 独立配置：灵活但易不同步

---

## 📌 立即行动建议

### 等待 UI 升级完成后

**第一步**（30 分钟）：
- 创建 `platformConfig.ts`
- 整合所有配置数据
- 实现基础工具方法

**第二步**（1 小时）：
- 迁移 2-3 个页面作为试点
- 验证功能正常
- 调整配置结构

**第三步**（4-6 小时）：
- 批量迁移剩余文件
- 运行完整测试
- 修复发现的问题

**第四步**（2-3 小时）：
- 云函数配置统一
- 部署和验证
- 更新文档

---

## 🎯 最终选定方案：方案C（数据库配置）

> **决策时间**: 2025-11-23
>
> **决策理由**:
> - 虽然初期工作量多 8 小时，但避免每次修改都需要改代码+部署的麻烦
> - 修改频率虽低，但需要快速响应，界面操作体验更好
> - 一次性投入，长期受益，避免二次迁移
> - RESTful 设计使云函数只需 1 个，降低了复杂度

---

## 📅 详细实施计划（方案C优化版）

### Phase 1: 数据库基础设施（1小时）

#### 1.1 创建 system_config 集合

**MongoDB 数据结构：**
```javascript
{
  _id: ObjectId,
  configType: 'platform',           // 配置类型
  platform: 'douyin',               // 平台唯一标识

  // 基础信息
  name: '抖音',
  enabled: true,
  color: 'blue',
  order: 1,                         // 显示排序

  // 账号ID配置
  accountId: {
    label: '星图ID',
    placeholder: '请输入星图ID',
    helpText: '可在星图后台查看'
  },

  // 价格类型配置
  priceTypes: [
    {
      key: 'video_60plus',
      label: '60s+',
      required: true,
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      order: 1
    }
    // ... 更多
  ],

  // 平台特有字段
  specificFields: {
    xingtuId: { label: '星图ID', type: 'string' },
    uid: { label: '抖音UID', type: 'string' }
  },

  // 外链配置
  link: {
    template: 'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/{id}',
    idField: 'xingtuId'
  },

  // 业务配置
  business: {
    fee: 0.05,
    defaultRebate: 15
  },

  // 功能开关
  features: {
    priceManagement: true,
    performanceTracking: true,
    rebateManagement: true,
    dataImport: true
  },

  // 元数据
  createdAt: ISODate,
  updatedAt: ISODate,
  createdBy: 'system',
  version: 1
}
```

**需要创建的索引：**
```javascript
db.system_config.createIndex({ configType: 1, platform: 1 }, { unique: true });
db.system_config.createIndex({ enabled: 1, order: 1 });
```

**初始化数据：**
- [ ] 抖音 (douyin) 配置
- [ ] 小红书 (xiaohongshu) 配置
- [ ] B站 (bilibili) 配置
- [ ] 快手 (kuaishou) 配置

---

### Phase 2: 云函数开发（4小时）

#### 2.1 创建 platformConfigManager 云函数（RESTful）

**文件结构：**
```
functions/
└─ platformConfigManager/
   ├─ index.js           // 主处理函数（RESTful 路由）
   ├─ package.json       // 依赖配置
   ├─ README.md          // API 文档
   └─ CHANGELOG.md       // 版本更新日志
```

**版本管理规范：**
```javascript
/**
 * @file platformConfigManager/index.js
 * @version 1.0.0
 * @description 云函数：平台配置管理（RESTful）
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-23
 * - 初始版本
 * - 支持 GET/POST/PUT/DELETE 操作
 * - 实现配置缓存机制
 * - 添加配置完整性验证
 *
 * --- 未来计划 ---
 * [v1.1.0] 计划功能
 * - 添加配置变更历史追踪
 * - 支持批量更新操作
 */
```

**RESTful API 设计：**

| Method | Endpoint | 功能 | 参数 |
|--------|----------|------|------|
| GET | /platformConfigManager | 获取所有平台配置 | `?enabled=true` (可选) |
| GET | /platformConfigManager | 获取单个平台配置 | `?platform=douyin` |
| POST | /platformConfigManager | 创建新平台配置 | body: PlatformConfig |
| PUT | /platformConfigManager | 更新平台配置 | body: PlatformConfig |
| DELETE | /platformConfigManager | 删除平台配置 | `?platform=xx` |

**核心功能：**
```javascript
exports.handler = async (event, context) => {
  const startTime = Date.now();
  const method = event.httpMethod;

  // 日志记录：请求开始
  console.log(`[${new Date().toISOString()}] ${method} /platformConfigManager - 请求开始`);
  console.log('请求参数:', event.queryStringParameters || {});

  try {
    let result;

    switch(method) {
      case 'GET':
        // 支持两种查询：
        // 1. 获取所有：/platformConfigManager?enabled=true
        // 2. 获取单个：/platformConfigManager?platform=douyin
        result = await handleGet(event);
        break;

      case 'POST':
        // 创建新平台配置（严格验证）
        result = await handleCreate(event);
        break;

      case 'PUT':
        // 更新配置（记录变更历史）
        result = await handleUpdate(event);
        break;

      case 'DELETE':
        // 软删除（设置 enabled=false）
        result = await handleDelete(event);
        break;

      default:
        throw new Error(`不支持的HTTP方法: ${method}`);
    }

    // 日志记录：请求成功
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${method} /platformConfigManager - 成功 (${duration}ms)`);

    return result;

  } catch (error) {
    // 日志记录：请求失败
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ${method} /platformConfigManager - 失败 (${duration}ms)`);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);

    return {
      statusCode: 500,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
```

**日志规范：**
- ✅ 每个请求记录：时间戳、方法、端点、参数
- ✅ 每个操作记录：执行时间、成功/失败状态
- ✅ 错误记录：完整的错误消息和堆栈
- ✅ 关键操作记录：配置变更前后对比

**安全特性：**
- [ ] 参数验证（必填字段检查）
- [ ] 平台 key 唯一性检查
- [ ] 配置完整性验证
- [ ] 变更日志记录

#### 2.2 创建共享工具模块

**文件：** `functions/shared/platformUtils.js`

```javascript
/**
 * 平台配置工具方法（云函数共享）
 */

// 缓存平台配置（避免每次都查数据库）
let platformConfigCache = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

async function getPlatformConfigs(db, forceRefresh = false) {
  // 检查缓存
  if (!forceRefresh && platformConfigCache && Date.now() - cacheTime < CACHE_TTL) {
    return platformConfigCache;
  }

  // 从数据库加载
  const configs = await db.collection('system_config')
    .find({ configType: 'platform', enabled: true })
    .sort({ order: 1 })
    .toArray();

  platformConfigCache = configs;
  cacheTime = Date.now();

  return configs;
}

async function getPlatformList(db) {
  const configs = await getPlatformConfigs(db);
  return configs.map(c => c.platform);
}

module.exports = {
  getPlatformConfigs,
  getPlatformList,
};
```

#### 2.3 修改现有14个云函数

**改造模式（统一）：**

```javascript
// 原来：
const SUPPORTED_PLATFORMS = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

if (!SUPPORTED_PLATFORMS.includes(platform)) {
  throw new Error('不支持的平台');
}

// 改为：
const { getPlatformList } = require('../shared/platformUtils');

const supportedPlatforms = await getPlatformList(db);
if (!supportedPlatforms.includes(platform)) {
  throw new Error('不支持的平台');
}
```

**需要修改的云函数列表：**
- [ ] agencyRebateConfig
- [ ] getCurrentAgencyRebate
- [ ] getAgencyRebateHistory
- [ ] getTalentStats
- [ ] customers
- [ ] getTalents
- [ ] updateTalent
- [ ] createTalent
- [ ] 其余 6 个云函数

---

### Phase 3: 前端 API 层（1.5小时）

#### 3.1 创建 src/api/platformConfig.ts

**文件结构：**
```typescript
/**
 * 平台配置 API
 */

import { get, post, put, del } from './client';
import type { Platform } from '../types/talent';

// ==================== 类型定义 ====================

export interface PlatformConfig {
  platform: Platform;
  name: string;
  enabled: boolean;
  color: string;
  order: number;
  accountId: {
    label: string;
    placeholder: string;
    helpText?: string;
  };
  priceTypes: PriceTypeConfig[];
  specificFields: Record<string, FieldConfig>;
  link?: {
    template: string;
    idField: string;
  };
  business: {
    fee: number | null;
    defaultRebate?: number;
  };
  features: {
    priceManagement: boolean;
    performanceTracking: boolean;
    rebateManagement: boolean;
    dataImport: boolean;
  };
}

export interface PlatformConfigsResponse {
  success: boolean;
  data?: PlatformConfig[];
  message?: string;
}

// ==================== API 方法 ====================

/**
 * 获取所有平台配置
 */
export async function getPlatformConfigs(
  enabled?: boolean
): Promise<PlatformConfigsResponse> {
  return get('/platformConfigManager', { enabled });
}

/**
 * 获取单个平台配置
 */
export async function getPlatformConfig(
  platform: Platform
): Promise<PlatformConfigsResponse> {
  return get('/platformConfigManager', { platform });
}

/**
 * 创建平台配置
 */
export async function createPlatformConfig(
  data: PlatformConfig
): Promise<ApiResponse> {
  return post('/platformConfigManager', data);
}

/**
 * 更新平台配置
 */
export async function updatePlatformConfig(
  data: Partial<PlatformConfig> & { platform: Platform }
): Promise<ApiResponse> {
  return put('/platformConfigManager', data);
}

/**
 * 删除平台配置（软删除）
 */
export async function deletePlatformConfig(
  platform: Platform
): Promise<ApiResponse> {
  return del('/platformConfigManager', { platform });
}
```

#### 3.2 创建配置缓存 Hook

**文件：** `src/hooks/usePlatformConfig.ts`

```typescript
/**
 * 平台配置管理 Hook
 *
 * 功能：
 * - 从服务器加载平台配置
 * - LocalStorage 缓存（24小时）
 * - 提供配置查询方法
 */

import { useState, useEffect } from 'react';
import { getPlatformConfigs } from '../api/platformConfig';
import type { PlatformConfig } from '../api/platformConfig';
import type { Platform } from '../types/talent';

const CACHE_KEY = 'platform_configs';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

export function usePlatformConfig() {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    // 尝试从缓存加载
    const cached = loadFromCache();
    if (cached) {
      setConfigs(cached);
      setLoading(false);
      return;
    }

    // 从服务器加载
    try {
      const response = await getPlatformConfigs(true);
      if (response.success && response.data) {
        setConfigs(response.data);
        saveToCache(response.data);
      }
    } catch (error) {
      console.error('加载平台配置失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 工具方法
  const getPlatformNames = () => {
    return configs.reduce((acc, c) => {
      acc[c.platform] = c.name;
      return acc;
    }, {} as Record<Platform, string>);
  };

  const getPlatformList = () => {
    return configs.map(c => c.platform);
  };

  return {
    configs,
    loading,
    refreshConfigs: loadConfigs,
    getPlatformNames,
    getPlatformList,
  };
}
```

---

### Phase 4: 管理界面开发（4小时）

#### 4.1 创建平台配置管理页面

**文件：** `src/pages/Settings/PlatformConfig.tsx`

**页面路由：** `/settings/platform-config`

**界面设计：**
```
┌──────────────────────────────────────────────────┐
│  平台配置管理                                      │
│  管理系统支持的平台及其相关配置                      │
├──────────────────────────────────────────────────┤
│  [+ 新增平台]  [🔄 刷新配置]  [📖 配置文档]         │
├──────────────────────────────────────────────────┤
│  ProTable 列表                                    │
│  ┌────┬────────┬────┬──────┬────────┬──────┐   │
│  │序号│平台名称│状态│价格类型│更新时间│ 操作 │   │
│  ├────┼────────┼────┼──────┼────────┼──────┤   │
│  │ 1  │ 抖音   │✓启用│  3个  │2025-11-23│[编辑]│   │
│  │ 2  │小红书  │✓启用│  3个  │2025-11-23│[编辑]│   │
│  │ 3  │ B站    │✓启用│  3个  │2025-11-23│[编辑]│   │
│  │ 4  │ 快手   │✓启用│  3个  │2025-11-23│[编辑]│   │
│  └────┴────────┴────┴──────┴────────┴──────┘   │
└──────────────────────────────────────────────────┘
```

#### 4.2 编辑弹窗设计

**使用 ProForm + Tabs 组织：**

**Tab 1: 基础信息**
- 平台标识（key）
- 平台名称
- 启用状态
- 主题配色
- 显示排序

**Tab 2: 账号ID配置**
- 标签文字
- 占位符
- 帮助说明

**Tab 3: 价格类型配置**
- 价格类型列表（可添加/删除/排序）
- 每个类型：key, label, required, 颜色配置

**Tab 4: 平台特有字段**
- 字段列表（可添加/删除）
- 每个字段：名称、标签、类型

**Tab 5: 业务配置**
- 平台费率
- 默认返点率
- 功能开关

**Tab 6: 外链配置**
- URL 模板
- ID 字段选择

---

### Phase 5: 业务代码迁移（7小时）

#### 5.1 第一批迁移（高优先级 - 2小时）

**文件列表：**
1. `src/pages/Talents/BasicInfo/BasicInfo.tsx`
2. `src/pages/Talents/CreateTalent/CreateTalent.tsx`
3. `src/pages/Talents/Agencies/AgenciesList.tsx`

**迁移内容：**
```typescript
// 原来：
const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

// 改为：
const { getPlatformList } = usePlatformConfig();
const platforms = getPlatformList();
```

```typescript
// 原来：
switch (platform) {
  case 'douyin':
    return '请输入星图ID';
  case 'xiaohongshu':
    return '请输入蒲公英ID';
  // ...
}

// 改为：
const { configs } = usePlatformConfig();
const config = configs.find(c => c.platform === platform);
return config?.accountId.placeholder || '';
```

#### 5.2 第二批迁移（中优先级 - 2.5小时）

**文件列表：**
1. PerformanceHome.tsx
2. EditTalentModal.tsx
3. PriceModal.tsx
4. AgencyRebateModal_v2.tsx
5. DataImportModal_v2.tsx

#### 5.3 第三批迁移（低优先级 - 2.5小时）

**文件列表：**
1. DimensionManager.tsx
2. FieldMappingManager.tsx
3. 剩余页面和组件
4. Hooks 层（useDataImport, useFieldMapping 等）
5. utils/formatters.ts 中的工具方法

---

### Phase 6: 测试验证（3.5小时）

#### 6.1 功能测试（2小时）

**平台配置管理：**
- [ ] 创建新平台配置
- [ ] 编辑现有平台配置
- [ ] 启用/禁用平台
- [ ] 删除平台配置
- [ ] 配置排序调整

**业务功能：**
- [ ] 所有页面的平台 Tabs 切换正常
- [ ] 平台名称显示正确
- [ ] 创建达人时平台选择正常
- [ ] 平台特定字段显示/隐藏正确
- [ ] 价格类型配置正确加载
- [ ] 外链跳转正常

**云函数验证：**
- [ ] 平台参数验证正常
- [ ] 配置读取性能可接受
- [ ] 缓存机制工作正常

#### 6.2 边缘场景测试（1小时）

- [ ] 配置加载失败降级处理
- [ ] 缓存失效自动重新加载
- [ ] 配置更新后页面自动刷新
- [ ] 网络异常处理
- [ ] 并发更新处理

#### 6.3 性能测试（30分钟）

- [ ] 首次加载时间
- [ ] 缓存命中率
- [ ] 配置更新响应时间

---

## 📊 工作量汇总（优化版）

| Phase | 主要任务 | 预计工时 | 产出 |
|-------|---------|---------|------|
| **Phase 1** | 数据库集合 + 初始化数据 | 1h | system_config 集合 |
| **Phase 2** | 1个RESTful云函数 + 14个云函数改造 | 4h | platformConfigManager |
| **Phase 3** | 前端API + 缓存Hook | 1.5h | api/platformConfig.ts |
| **Phase 4** | 管理界面（ProTable+ProForm） | 4h | PlatformConfig 页面 |
| **Phase 5** | 迁移28个前端文件 | 7h | 统一配置引用 |
| **Phase 6** | 完整测试 | 3.5h | 测试报告 |
| **总计** | | **21h** | 完整方案 |

---

## 📅 建议的执行计划

### 方案A：集中两天完成

**第1天（10.5小时）**
- 上午 9:00-12:00 (3h)：Phase 1-2（数据库+云函数核心）
- 下午 13:00-17:00 (4h)：Phase 2 完成（云函数改造）
- 下午 17:00-20:30 (3.5h)：Phase 3-4（API+管理界面）

**第2天（10.5小时）**
- 上午 9:00-16:00 (7h)：Phase 5（业务代码迁移）
- 下午 16:00-19:30 (3.5h)：Phase 6（测试验证）

### 方案B：分散三天完成

**第1天（6.5小时）**
- Phase 1-3（基础设施完成）

**第2天（4小时）**
- Phase 4（管理界面）

**第3天（10.5小时）**
- Phase 5-6（迁移+测试）

---

## ✅ 验收标准

### 功能完整性
- ✅ 平台配置可通过界面管理（增删改查）
- ✅ 所有现有功能 100% 正常工作
- ✅ 配置修改后立即生效，无需重新部署
- ✅ 无新增 bug

### 代码质量
- ✅ TypeScript 零错误
- ✅ ESLint 零警告
- ✅ 所有硬编码平台配置已移除

### 性能要求
- ✅ 配置加载时间 < 500ms
- ✅ 缓存命中率 > 90%
- ✅ 页面无明显性能下降

---

## 🎯 关键优化点

相比原方案的优化：

1. **云函数数量优化**
   - 原方案：3个独立云函数
   - 优化后：1个RESTful云函数
   - 节省：2个云函数开发（约30分钟）

2. **实施顺序优化**
   - 先做基础设施和管理界面
   - 再批量迁移业务代码
   - 降低风险，易于回滚

3. **工具方法优化**
   - 云函数共享工具模块
   - 前端 Hook 统一管理
   - 避免重复开发

---

## 🚀 下一步行动

**立即开始：**
1. 确认开始执行
2. 从 Phase 1 开始（创建数据库集合）
3. 整理4个平台的完整配置数据

**或者先准备：**
1. 梳理现有平台配置信息
2. 制定更详细的数据初始化脚本
3. 评估技术风险

---

---

## 📐 工程规范要求

### 云函数开发规范

#### 版本号管理（必须）
```javascript
/**
 * @file functionName/index.js
 * @version X.Y.Z
 * @description 简短描述
 *
 * 版本号规则：
 * - X (主版本号): 重大架构变更、不兼容的API修改
 * - Y (次版本号): 新增功能、向后兼容的修改
 * - Z (修订号): Bug修复、小优化
 */
```

#### 更新日志规范（必须）
```javascript
/**
 * --- 更新日志 ---
 * [v1.2.1] 2025-11-25
 * - 修复：配置缓存失效问题
 * - 优化：查询性能提升 30%
 *
 * [v1.2.0] 2025-11-24
 * - 新增：支持批量更新配置
 * - 新增：配置变更历史记录
 *
 * [v1.1.0] 2025-11-23
 * - 新增：配置验证功能
 * - 改进：错误提示更友好
 *
 * [v1.0.0] 2025-11-23
 * - 初始版本
 */
```

#### 日志记录规范（必须）
```javascript
// ✅ 必须记录的日志
console.log(`[INFO] ${timestamp} 操作类型 - 操作说明`);
console.log(`[SUCCESS] ${timestamp} 操作成功 (耗时: ${duration}ms)`);
console.error(`[ERROR] ${timestamp} 操作失败 - ${error.message}`);

// ✅ 关键操作额外记录
console.log('操作前数据:', JSON.stringify(beforeData));
console.log('操作后数据:', JSON.stringify(afterData));

// ✅ 性能监控
const startTime = Date.now();
// ... 操作
const duration = Date.now() - startTime;
console.log(`执行耗时: ${duration}ms`);
```

#### 必须包含的文件
- ✅ `index.js` - 主处理函数
- ✅ `package.json` - 依赖配置（含版本号）
- ✅ `README.md` - API 文档和使用说明
- ✅ `CHANGELOG.md` - 详细的版本更新记录

---

### 前端开发规范

#### 组件文件头注释（必须）
```typescript
/**
 * 组件名称 - Ant Design Pro 升级版
 *
 * 版本: v2.0.0
 * 更新时间: 2025-11-23
 *
 * 升级要点：
 * 1. 使用 ProTable/ProForm 组件
 * 2. 使用 Tailwind CSS 样式
 * 3. 使用 message API 替代 Toast
 * 4. 遵循 UI_UX_GUIDELINES.md 规范
 *
 * 功能说明：
 * - 主要功能描述
 * - 特殊处理逻辑说明
 */
```

#### 代码注释规范
```typescript
// ✅ 业务逻辑必须注释
// 计算达人的返点率，如果是机构达人则从机构继承
const rebateRate = calculateRebate(talent);

// ✅ 复杂判断必须注释
// 只有机构达人且返点模式为 sync 时才显示同步按钮
if (!isWildTalent(talent) && rebateMode === 'sync') {
  // ...
}

// ✅ 工具方法必须有 JSDoc
/**
 * 格式化返点率
 * @param rate - 返点率（0-100）
 * @returns 格式化后的字符串，如 "15.50%"
 */
function formatRebate(rate: number): string {
  // ...
}
```

#### TypeScript 类型规范
```typescript
// ✅ 所有接口必须定义类型
interface ComponentProps {
  // ...
}

// ✅ 所有API响应必须定义类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// ✅ 避免使用 any，使用 unknown 或具体类型
// ❌ 错误
const data: any = response.data;

// ✅ 正确
const data: unknown = response.data;
if (isValidData(data)) {
  // 类型收窄后使用
}
```

---

## ⚡ Token 使用管理规范

### 大型功能开发前必须检查

**在开始 Phase 4-6 之前，必须检查 Token 用量：**

```
执行检查命令：
"这个对话的 token 还有多少"

判断标准：
- 剩余 > 500k tokens：可以继续完整开发
- 剩余 300k-500k tokens：可以完成当前 Phase
- 剩余 < 300k tokens：建议开启新对话
```

### Phase 执行策略

**Phase 1-3（基础设施）：**
- Token 消耗预估：150k-200k
- 建议：在当前对话完成

**Phase 4（管理界面）：**
- Token 消耗预估：100k-150k
- 检查点：开始前检查剩余 token
- 如果 < 400k，建议新对话

**Phase 5（代码迁移）：**
- Token 消耗预估：200k-300k
- 检查点：开始前必须检查
- 如果 < 500k，强烈建议新对话

**Phase 6（测试）：**
- Token 消耗预估：100k-150k
- 可以单独对话执行

### 对话延续策略

**如何在新对话中继续：**
1. 在当前对话结束前，生成"进度总结"
2. 记录已完成的 Phase 和产出
3. 新对话开始时，提供：
   - 项目背景
   - 已完成内容
   - 当前要执行的 Phase
   - 相关文档链接

**进度总结模板：**
```markdown
## 平台配置统一改造 - 进度总结

已完成：
- [x] Phase 1: 数据库基础设施
- [x] Phase 2: 云函数开发
- [x] Phase 3: 前端 API 层

待执行：
- [ ] Phase 4: 管理界面开发
- [ ] Phase 5: 业务代码迁移
- [ ] Phase 6: 测试验证

关键产出：
- system_config 集合已创建
- platformConfigManager 云函数已部署
- api/platformConfig.ts 已完成
- usePlatformConfig Hook 已实现

下一步：开始 Phase 4 管理界面开发
参考文档：docs/PLATFORM_CONFIG_UNIFICATION_PLAN.md
```

---

## 🔒 代码质量要求

### 前端代码
- ✅ **TypeScript 严格模式**：无 any 类型滥用
- ✅ **组件注释**：每个组件有文件头说明
- ✅ **业务逻辑注释**：复杂逻辑必须注释
- ✅ **错误处理**：所有异步操作必须有 try-catch
- ✅ **用户提示**：操作成功/失败必须有 message 提示

### 后端云函数
- ✅ **版本号**：必须在文件头声明
- ✅ **更新日志**：每次修改必须记录
- ✅ **日志记录**：请求、成功、失败、耗时全记录
- ✅ **错误处理**：统一的错误响应格式
- ✅ **参数验证**：严格验证所有输入参数

### 数据库操作
- ✅ **索引创建**：必须为查询字段创建索引
- ✅ **数据验证**：插入前验证数据完整性
- ✅ **事务处理**：多步操作使用事务（如适用）
- ✅ **软删除**：重要数据使用软删除而非硬删除

---

## 📋 开发检查清单

### 每个 Phase 开始前
- [ ] 检查 Token 剩余量
- [ ] 确认前置 Phase 已完成
- [ ] 准备好必要的配置数据
- [ ] 阅读相关技术文档

### 每个 Phase 完成后
- [ ] 运行 TypeScript 编译检查
- [ ] 运行 ESLint 检查
- [ ] 手动测试核心功能
- [ ] 更新进度文档
- [ ] 提交 Git commit

### 云函数开发完成后
- [ ] 更新版本号
- [ ] 记录更新日志
- [ ] 编写/更新 README
- [ ] 本地测试通过
- [ ] 部署到 Cloudflare
- [ ] 在线测试验证

### 前端开发完成后
- [ ] TypeScript 零错误
- [ ] ESLint 零警告
- [ ] 界面功能正常
- [ ] 响应式设计验证
- [ ] 浏览器兼容性检查

---

## 🎯 执行原则

### Token 管理原则
1. **大型功能开发前必检查** - Phase 4-6 之前必须确认
2. **预留安全余量** - 每个 Phase 预留 20% 余量
3. **及时切换对话** - 低于安全线立即切换
4. **完整的交接文档** - 确保上下文无缝衔接

### 代码质量原则
1. **零容忍政策** - TypeScript 错误、ESLint 警告必须修复
2. **严格注释** - 版本号、日志、复杂逻辑必须注释
3. **完整测试** - 每个 Phase 完成后立即测试
4. **渐进式迁移** - 分批迁移，降低风险

### 文档维护原则
1. **实时更新** - 每个 Phase 完成后更新文档
2. **清晰记录** - 变更原因、影响范围、注意事项
3. **版本追溯** - 保留历史决策和实施过程

---

**更新时间**: 2025-11-23
**维护者**: AgentWorks 团队
**状态**: 📋 方案确定，待执行
**选定方案**: 方案C（数据库配置）- RESTful 优化版

🎯 **下一步**:
1. 检查当前 Token 用量
2. 开始执行 Phase 1 - 创建数据库基础设施
3. 严格遵守工程规范
