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

**创建时间**: 2025-11-23
**维护者**: AgentWorks 团队
**状态**: 📋 待实施

🎯 **重要提醒**: 此改造将大幅提升代码质量和维护效率，建议在 UI 升级完成后立即执行！
