# 更新日志

所有重要的更改都将记录在此文件中。

## [3.0.2] - 2025-12-31

### 🐛 Bug 修复 (Bug Fixes)

#### 日报分页组件失效
- **问题**：日报分组页面的表格分页下拉框无法切换每页显示条数
- **原因**：Ant Design Table 的 pagination 配置缺少受控状态和回调函数
- **修复**：添加 `pageSize`、`currentPage` 状态管理和 `onChange`、`onShowSizeChange` 回调
- **文件**：`frontends/agentworks/src/pages/Projects/DailyReport/components/TalentDetailTable.tsx`

#### 跨项目追加达人失败
- **问题**：追加"可复用"状态的达人到飞书表格时报错"没有找到匹配的报名结果数据"
- **根因**：查询 talents 集合时使用了错误的字段 `{ id: talentKey }`，实际应为 `{ oneId: talentKey }`
- **修复**：修改 `appendToRegistrationSheet` 函数中的 talents 查询条件
- **文件**：`functions/syncFromFeishu/utils.js:940`

### 📝 受影响的文件

- `frontends/agentworks/src/pages/Projects/DailyReport/components/TalentDetailTable.tsx`
- `functions/syncFromFeishu/utils.js`

## [3.0.1] - 2025-12-25

### 🎨 UI 优化 (UI Improvements)

#### 项目看板页面重构
- **SummaryCards 组件**：重构为精美 StatItem 卡片设计
  - 语义化颜色变量（primary/success/warning/danger/purple/blue/pink）
  - 图标装饰 + 圆角背景
  - 悬停效果（translate-y + shadow）
  - 骨架屏加载状态和空状态优化
- **FilterPanel 组件**：优化筛选面板布局
  - 分组设计（时间范围区域 + 筛选条件区域）
  - 添加 CalendarOutlined 图标装饰
  - 移除冗余的筛选条件数量徽章
- **ProjectDashboard 主页面**：精简布局
  - 移除页面标题图标装饰
  - 移除重复的「刷新」按钮（保留筛选面板中的「查询」）
- **ProjectTable 组件**：细节优化
  - 语义化颜色类（text-success-600、text-danger-600 等）
  - tabular-nums 数字对齐
  - 深色模式支持

#### 侧边栏菜单重命名
- 执行看板 → 项目执行
- 达人效果趋势 → 达人趋势

### ✨ 功能增强 (Features)

#### Excel 导出增强
- **项目明细 Sheet**：新增 3 个字段
  - 资金占用费
  - 净利润
  - 净利润率

#### 汇总卡片顺序调整
- 基础利润 ↔ 资金占用费 位置对调（基础利润在前）

### 📝 受影响的文件

- `frontends/agentworks/src/pages/Projects/Dashboard/ProjectDashboard.tsx`
- `frontends/agentworks/src/pages/Projects/Dashboard/components/SummaryCards.tsx`
- `frontends/agentworks/src/pages/Projects/Dashboard/components/FilterPanel.tsx`
- `frontends/agentworks/src/pages/Projects/Dashboard/components/ProjectTable.tsx`
- `frontends/agentworks/src/utils/dashboardExport.ts`
- `frontends/agentworks/src/components/Sidebar/Sidebar.tsx`

---

## [3.0.0] - 2025-12-25

### ✨ 新功能 (Features)

#### 项目日报追踪系统
- **日报首页**：项目日报列表，支持按追踪状态、CPM 状态筛选
- **项目日报详情**：单项目日报概览，包含汇总仪表板、CPM 分布、达人明细表
- **达人趋势图表**：支持单达人/多达人 CPM 和播放量趋势对比
- **追踪配置管理**：支持启用/归档/停用追踪，配置基准 CPM
- **图片导出**：支持将日报概览导出为 PNG 图片

#### 数据迁移增强
- **日报数据迁移**：支持从 ByteProject 迁移日报数据到 AgentWorks
- **追踪状态选择**：迁移时可选择追踪状态（追踪中/已归档/不启用）
- **迁移验证**：验证结果包含日报数据对比

### 🔧 技术改进 (Technical Improvements)

#### 前端架构
- **财务计算统一**：日报金额计算复用 `financeCalculator.ts`，与财务管理 Tab 保持一致
- **React Fast Refresh 兼容**：将工具函数从组件文件分离到 `utils.ts`
- **TypeScript 严格模式**：修复所有 TypeScript 编译错误，支持 Cloudflare 构建

#### 后端云函数
- **dailyReportApi v1.0**：新增日报数据云函数
  - `getDailyReport`：获取项目日报数据
  - `saveDailyStats`：批量写入日报数据
  - `saveReportSolution`：保存日报备注
  - `getTalentTrend`：获取达人趋势数据
- **dataMigration v1.1**：新增 `migrateDailyStats` 操作

#### 数据库
- **dailyStats 字段**：Collaboration 新增每日播放量统计数组
- **trackingConfig 字段**：Project 新增追踪配置

### 📝 受影响的文件

#### 新增文件
- `frontends/agentworks/src/pages/Projects/DailyReport/` - 日报模块页面
- `frontends/agentworks/src/api/dailyReport.ts` - 日报 API
- `frontends/agentworks/src/hooks/useDailyReportData.ts` - 日报数据 Hook
- `frontends/agentworks/src/hooks/useExportImage.ts` - 图片导出 Hook
- `frontends/agentworks/src/types/dailyReport.ts` - 日报类型定义
- `functions/dailyReportApi/` - 日报云函数

#### 修改文件
- `frontends/agentworks/src/App.tsx` - 添加日报路由
- `frontends/agentworks/src/components/Sidebar/Sidebar.tsx` - 添加日报菜单
- `frontends/agentworks/src/types/project.ts` - 添加 dailyStats 字段
- `functions/dataMigration/index.js` - 添加日报迁移支持

---

## [2.6.0] - 2025-12-22

### ✨ 新功能 (Features)

#### 返点对比看板
- **公司返点库管理**：支持导入公司返点 Excel 文件，多版本管理
- **智能对比功能**：自动匹配 AgentWorks 达人与公司返点库记录
- **同机构识别**：区分同机构可同步和跨机构仅参考的返点
- **批量同步**：支持一键批量同步返点到 AgentWorks

#### 返点导入配置
- **灵活的列映射**：支持配置星图ID、昵称、MCN、返点列名
- **多格式解析**：支持 `0.26`、`30%`、`返点25`、`返点:30%` 等多种返点格式
- **正则表达式配置**：可自定义返点解析规则
- **文件测试功能**：导入前可测试解析效果，显示成功/失败/跳过统计

### 🔧 技术改进 (Technical Improvements)

#### 前端优化
- **深色模式兼容**：返点对比看板全面支持深色模式，使用语义化颜色变量
- **平台配置联动**：平台选择器从系统配置动态加载，与产品其他页面保持一致
- **Excel 解析优化**：使用 xlsx 库在前端解析，支持大文件处理

#### 后端云函数
- **companyRebateLibrary v1.0**：新增公司返点库云函数
  - `import`：导入新版本
  - `listVersions`：获取版本列表
  - `compare`：执行对比
  - `deleteVersion`：删除版本
  - `setDefaultVersion`：设置默认版本
- **同机构判断逻辑**：野生达人只匹配明确的野生关键词（野生、个人、无），避免误判

#### 数据库
- **company_rebate_library**：公司返点记录表，按版本存储
- **company_rebate_imports**：版本元信息表

### 📝 受影响的文件

#### 新增文件
- `frontends/agentworks/src/pages/Talents/RebateComparison/` - 返点对比看板页面
- `frontends/agentworks/src/pages/Settings/CompanyRebateImportConfig.tsx` - 导入配置页
- `frontends/agentworks/src/api/companyRebateLibrary.ts` - API 封装
- `functions/companyRebateLibrary/` - 云函数
- `database/agentworks_db/schemas/company_rebate_*.json` - 数据库 Schema

#### 修改文件
- `frontends/agentworks/src/App.tsx` - 添加路由
- `frontends/agentworks/src/components/Sidebar/Sidebar.tsx` - 添加侧边栏菜单
- `functions/platformConfigManager/index.js` - 支持导入配置类型

---

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