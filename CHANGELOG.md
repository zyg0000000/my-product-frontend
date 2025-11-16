# 更新日志

所有重要的更改都将记录在此文件中。

## [2.3.0] - 2025-11-16

### 🐛 修复 (Bug Fixes)

#### 1. 字段统一优化
- **问题**：达人基础信息页面存在字段不一致问题
  - 新建达人时使用 `agencyId` 字段
  - 编辑弹窗中使用 `belongType` 字段
- **解决方案**：
  - 统一使用 `agencyId` 字段，删除 `belongType` 相关代码
  - 使用 `"individual"` 作为野生达人（独立达人）的特殊ID
  - 所有组件统一从 agencies API 动态获取机构名称

#### 2. 价格系统优化
- **问题**：价格显示不够灵活，无法精确显示如 ¥318,888 这样的金额
- **解决方案**：
  - 重构价格格式化函数，支持智能显示
    - 整万数显示为简洁格式：50000元 → "5万"
    - 非整万数显示精确金额：318888元 → "¥318,888"
  - 价格录入改为元为单位（原为万元）
  - 数据库存储保持分为单位，确保精度

### ✨ 新功能 (Features)

#### 价格格式化工具
- 新增 `formatPrice()` 智能格式化函数
- 新增 `yuanToCents()` 元转分工具函数
- 新增 `formatPriceInYuan()` 带千分位符格式化函数

### 🔧 技术改进 (Technical Improvements)

#### 代码统一性
- 移除过时的类型定义：`BelongType`、`BELONG_TYPE_LABELS`
- 统一所有组件的机构字段使用方式
- 更新数据库文档，明确价格存储格式

### 📝 受影响的文件

#### 前端组件
- `EditTalentModal.tsx` - 使用 agencyId 替代 belongType
- `CreateTalent.tsx` - 保持 agencyId 使用
- `PriceModal.tsx` - 价格输入单位改为元
- `RebateManagementModal.tsx` - 添加机构名称动态获取
- `TalentDetail.tsx` - 添加机构名称动态获取
- `BasicInfo.tsx` - 价格显示优化

#### 工具函数
- `formatters.ts` - 重构价格格式化逻辑

#### 类型定义
- `rebate.ts` - 移除 BelongType 相关定义
- `talent.ts` - 统一使用 agencyId

#### 云函数
- `getTalentRebate/index.js` - 返回 agencyId 而非 belongType

#### 数据库文档
- `talents.doc.json` - 更新价格字段说明

## [2.2.0] - 2025-11-15

### ✨ 新功能
- 返点管理系统 v2.0
- 支持野生达人和机构达人的返点管理
- 支持立即生效和下次合作生效两种模式

## [2.1.0] - 2025-11-14

### ✨ 新功能
- 达人基础信息管理
- 多平台价格管理
- 机构归属管理

---

版本格式遵循 [语义化版本控制](https://semver.org/lang/zh-CN/) 规范。