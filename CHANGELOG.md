# 更新日志

所有重要的更改都将记录在此文件中。

## [2.5.0] - 2025-12-09

### ✨ 新功能 (Features)

#### 项目分析看板 - 效果达成优化
- **实际 CPM 卡片**：将"T+21 总互动量"卡片替换为"实际 CPM"卡片，更直观展示成本效益
- **目标对比显示**：实际 CPM 与目标 CPM 对比，颜色标识达成状态（绿色=达标，黄色=未达标）
- **中文数字格式化**：大数值使用中文单位（亿/万）代替 M/K，更符合中文用户习惯

#### 客户视角术语统一
- **代理消耗**：将"客户收入"统一改为"代理消耗"，术语更精准

### 🐛 修复 (Bug Fixes)

#### 效果达成统计逻辑
- **状态过滤修复**：效果达成统计只计算"视频已发布"状态的合作
- **数据准确性**：确保 KPI 汇总与效果数据一致性

### 🔧 技术改进 (Technical Improvements)

#### 前端优化
- **formatLargeNumber 函数**：重构大数值格式化，支持亿/万单位
- **图表 Y 轴优化**：图表坐标轴数值同步使用中文单位
- **KPI 卡片渲染**：优化效果达成 KPI 卡片显示逻辑

#### 后端云函数
- **getBatchProjectPerformance v1.1**：添加 `isEffectValid` 标志位，仅"视频已发布"状态纳入效果统计

### 📝 受影响的文件

#### 前端组件
- `project_analysis.html` - KPI 卡片结构更新
- `project_analysis/chart-renderer.js` - 数字格式化和渲染逻辑
- `project_analysis/constants.js` - 字段标签更新

#### 云函数
- `getBatchProjectPerformance/index.js` (v1.0 → v1.1)

#### 文档
- `project_analysis/README.md` - 添加 v3.1 版本历史

## [2.4.0] - 2025-11-17

### ✨ 新功能 (Features)

#### 机构管理增强
- **达人数量统计**：机构管理页面现在可以显示每个机构的实际达人数量
- **实时数据加载**：使用并行 API 调用动态获取各机构的达人统计

#### 返点系统完善
- **机构返点绑定**：机构达人支持绑定/解绑机构返点模式
- **返点模式切换**：支持在"绑定机构返点"和"独立设置返点"之间切换
- **机构同步功能**：新增"机构同步" Tab，支持从机构同步返点配置
- **动态 Tab 显示**：根据返点模式动态显示不同的功能 Tab

### 🔧 技术改进 (Technical Improvements)

#### 后端云函数
- **getTalents v3.2**：新增 `agencyId` 参数支持，用于按机构筛选达人
- **getTalentRebate v2.0**：新增返回 `rebateMode` 和 `agencyName` 字段
- **syncAgencyRebateToTalent v1.0**：新增机构返点同步云函数
- **updateTalentRebate v1.1**：手动调整时自动切换到独立模式

#### 前端优化
- **返点模式管理**：完整的返点模式状态管理和 UI 反馈
- **成功提示优化**：使用内联绿色横幅替代 alert() 弹窗
- **Tab 动态管理**：基于 rebateMode 状态动态渲染 Tab 列表

### 🐛 修复 (Bug Fixes)
- 修复返点模式切换后状态不持久的问题
- 修复手动调整后模式未切换到 independent 的问题
- 修复 Tab 显示不随模式更新的问题
- 修复返点来源显示逻辑错误

### 📝 受影响的文件

#### 云函数
- `getTalents/index.js` (v3.1 → v3.2)
- `getTalentRebate/index.js` (v1.0 → v2.0)
- `syncAgencyRebateToTalent/index.js` (新增 v1.0)
- `updateTalentRebate/index.js` (v1.0 → v1.1)

#### 前端组件
- `AgenciesList.tsx` - 添加达人数量统计功能
- `RebateManagementModal.tsx` - 重构返点模式管理
- `rebate.ts` (utils) - 优化 Tab 显示逻辑
- `rebate.ts` (api) - 添加机构同步 API
- `talent.ts` (api) - 添加 agencyId 筛选参数

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