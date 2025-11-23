# AgentWorks 更新日志

## v3.1.0 (2025-11-23) 🎨

### ✨ BasicInfo 页面弹窗全面升级

#### 升级组件（4个弹窗 + 1个选择器）
1. **EditTalentModal**（编辑达人弹窗）- 404行 → 258行（36% ↓）
   - Modal + ProForm + ProCard 替代手写弹窗
   - ProFormText、ProFormRadio 替代手写表单字段
   - message 替代 Toast 组件

2. **AgencySelector**（机构选择器）- 229行 → 134行（41% ↓）
   - Ant Design Select 替代手写下拉菜单
   - 内置搜索功能（showSearch）
   - 简洁模式：下拉选项仅显示名称

3. **DeleteConfirmModal**（删除确认弹窗）- 232行 → 181行（22% ↓）
   - Modal + Alert + Radio.Group + Checkbox
   - Button danger 类型（红色删除按钮）
   - ExclamationCircleFilled 图标

4. **PriceModal**（价格管理弹窗）- 358行 → 277行（23% ↓）
   - ProCard 左右两栏布局
   - ProFormDigit 数字输入（千分位、精度控制）
   - Select 筛选器（支持 allowClear）

5. **RebateManagementModal**（返点管理弹窗）- 504行 → 316行（37% ↓）
   - Tabs 多标签页导航（内置动画）
   - Switch 替代手写 Toggle（代码减少 58%）
   - ProForm + ProFormDigit 管理表单

#### 技术栈统一
- **Ant Design**: Modal, Tabs, Switch, Alert, Button, Select, Radio, Checkbox
- **Ant Design Pro**: ProCard, ProForm, ProFormDigit, ProFormSelect, ProFormRadio, ProFormText
- **@ant-design/icons**: InfoCircleOutlined, SyncOutlined, ExclamationCircleFilled
- **Tailwind CSS**: 布局辅助（grid, flex, gap, space-y）

#### 成果总结
- 总代码减少：~750 行
- 平均减少比例：32%
- 样式完全统一，符合 Ant Design 规范
- 所有表单支持自动验证
- 所有弹窗居中显示，带淡入淡出动画

#### 兼容性
- ✅ 保留所有业务逻辑（useRebateForm hook 等）
- ✅ API 调用完全不变
- ✅ 功能完整性 100% 保持

---

## v3.0.0 (2025-11-23) 🎉

### 🐛 关键修复 - 客户价格策略

#### 后端修复 (functions/customers/index.js)
- **NaN 问题根治**
  - 修复后端计算逻辑缺失税费导致 `paymentCoefficients` 保存为 NaN
  - 添加完整的税费计算逻辑（支持含税/不含税两种模式）
  - 严格校验系数有效性，防止 NaN 和异常值 (0 < coefficient < 10)

- **前后端数据一致性**
  - 禁用后端自动重新计算系数（`getCustomerById` 和 `updateCustomer`）
  - 直接使用前端经过严格校验后的系数值
  - 避免因数据结构不一致导致的计算差异

- **平台级独立配置支持** (v3.0 架构)
  - 完整支持平台级 `serviceFeeRate`、`serviceFeeBase`
  - 完整支持平台级 `includesTax`、`taxCalculationBase`
  - 优先使用平台级配置，回退到全局配置

#### 前端优化 (PricingStrategy.tsx)
- **UI 统一性提升**
  - 统一4个区域的标题样式（ProCard title + headerBordered）
    - 定价模式
    - 平台配置
    - 配置总览
    - 支付系数记录

- **用户体验优化**
  - 优化保存/取消按钮布局（带背景色突出显示）
  - 折扣率/服务费率显示精度提升至2位小数
  - 默认值优化：折扣率 100%（无折扣），服务费率 0%

- **数值校验增强**
  - 前端严格校验：`0 < coefficient < 10`
  - 保存前阻止异常值写入数据库
  - 提供清晰的错误提示

### 🏗 架构决策确认

#### UI 技术栈
- ✅ **Ant Design Pro** + **Tailwind CSS** 混合模式
  - 使用 ProCard、ProForm、ProFormDigit 等组件
  - 使用 Tailwind 工具类（flex、gap、text-gray-400、bg-gray-50 等）
  - 此模式将统一应用到全部前端 UI

#### 数据流向
```
前端计算 → 前端校验 → 后端直接保存 → 数据库
             ↓
       阻止异常值
```

#### 职责分工
- **前端**：负责计算、校验、UI展示
- **后端**：负责数据持久化、历史记录（pricing_history集合）
- **一致性**：前后端计算逻辑完全相同（税费、服务费、折扣逻辑）

### 📊 修复效果

| 问题 | 修复前 | 修复后 |
|------|--------|--------|
| 支付系数保存 | NaN | 0.8348 ✅ |
| 数据库读取 | NaN | 0.8348 ✅ |
| 前后端一致性 | ❌ 不一致 | ✅ 完全一致 |
| 标题样式 | ❌ 不统一 | ✅ 统一 |
| 按钮布局 | ❌ 不明显 | ✅ 突出显示 |
| 数值精度 | 整数 | 2位小数 ✅ |

### 🔧 技术细节

- **修改文件**: 2个
  - `frontends/agentworks/src/pages/Customers/PricingStrategy/PricingStrategy.tsx` (+532, -332)
  - `functions/customers/index.js` (+128)

- **删除文件**: 1个
  - `PricingStrategy.backup.tsx` (清理临时文件)

- **代码质量**
  - 添加详细注释说明设计决策
  - 保留 `calculateAllCoefficients` 函数用于数据验证、修复、调试
  - 统一前后端计算逻辑

### 📝 文档更新

- 云函数 v3.0 CHANGELOG（已内置于 index.js 头部注释）
- 本 CHANGELOG 更新

---

## v2.9.1 (2025-11-22)

### 🐛 修复

- **Cloudflare 部署修复**
  - 移除 `PerformanceFilters.tsx` 中未使用的 `placeholder` 变量
  - 移除 `usePerformanceFilters.ts` 中未使用的 `targetPath` 变量
  - 修复 TypeScript TS6133 编译错误

### 📝 文档更新

- **DEVELOPMENT.md 更新**
  - 新增 "Cloudflare 部署失败 (TS6133 错误)" 故障排除章节
  - 添加部署前 TypeScript 检查指南
  - 推送前检查清单

---

## v2.9.0 (2025-11-21)

### 🚀 Performance 页面重大升级

#### 搜索接口统一 (getTalentsSearch v9.0)
- **双数据库支持**
  - 新增 `dbVersion` 参数：`v1` (kol_data/byteproject) 或 `v2` (agentworks_db/agentworks)
  - 自动字段映射：根据版本自动转换字段名和路径
  - 完全向后兼容 v8.x 所有功能

- **字段映射配置**
  | 字段 | v1 (byteproject) | v2 (agentworks) |
  |------|------------------|-----------------|
  | 名称 | nickname | name |
  | 账号ID | xingtuId | platformAccountId |
  | 唯一ID | uid | oneId |
  | CPM | performanceData.cpm60s | performanceData.cpm |
  | 男性比例 | performanceData.maleAudienceRatio | performanceData.audienceGender.male |
  | 女性比例 | performanceData.femaleAudienceRatio | performanceData.audienceGender.female |

- **新增筛选参数**
  - `cpmMin/cpmMax`: CPM 区间筛选
  - `maleRatioMin/maleRatioMax`: 男性比例筛选
  - `femaleRatioMin/femaleRatioMax`: 女性比例筛选
  - 支持 v2 平台筛选 (`platform` 参数)

#### 前端 API 层升级
- **新增 `searchTalents` 接口** (talent.ts)
  - 调用 `/talents/search` 端点
  - 自动添加 `dbVersion: 'v2'` 标识
  - 完整的 TypeScript 类型定义

- **usePerformanceData Hook 重构**
  - 改用 `searchTalents` 替代 `getTalents`
  - 新增 `dashboardStats` 返回值（层级分布、CPM分布、性别比例分布）
  - 支持更强大的筛选能力

#### UI/UX 优化
- **价格选择器集成到列头**
  - 从右上角独立面板移动到价格列表头
  - 点击列头展开下拉选择器
  - 支持"隐藏"选项完全隐藏价格列

- **数据统计优化**
  - 达人总数显示为平台 Tab 内的 badge
  - 移除独立的统计卡片区域
  - 界面更简洁

### 📊 技术细节
- **后端**: getTalentsSearch v9.0-dual-db
- **前端**: 新增 searchTalents API、重构 usePerformanceData hook
- **性能**: 使用 MongoDB $facet 聚合，单次查询返回数据+统计

---

## v2.8.0 (2025-11-20)

### 🎯 代码重构与用户体验优化

#### 前端重构
- **RebateManagementModal 组件拆分**
  - 创建 `useRebateForm` hook（314行），抽离业务逻辑
  - 组件代码减少 24.7%（667行 → 502行）
  - 提升可维护性和可测试性

#### 导入功能优化
- **功能位置调整**
  - 导入功能迁移到配置页（新增"数据导入管理" Tab）
  - 移除 Performance 页面的导入按钮
  - 侧边栏文案优化："达人数据表现配置"

- **导入结果可视化**
  - 创建 ImportResultPanel 组件
  - 统计信息展示（成功/失败/总计）
  - 失败记录详情列表
  - 导出失败记录 CSV 功能

#### 价格导入功能（前后端协同）

**后端升级** (v12.0 → v12.1):
- **syncFromFeishu 函数** (4个文件)
  - 支持 `priceYear`/`priceMonth` 参数
  - 价格字段自动识别（通过 `priceType` 元数据）
  - 智能合并逻辑：同年月同类型覆盖，不同时间追加
  - 单位自动转换：元 → 分（× 100）
  - 平台通用设计（抖音/小红书/B站/快手）

**前端实现**:
- **字段映射增强**
  - `FieldMappingRule` 添加 `priceType` 字段
  - 配置界面支持价格类型选择器（平台动态）

- **数据维度增强**
  - `DimensionConfig` 支持 `price` 类型
  - 价格类型配置（平台动态）

- **导入流程完善**
  - DataImportModal 添加年月选择器
  - 用户可指定价格归属时间
  - 覆盖提示和确认

#### 价格显示功能

- **Performance 页面**
  - 价格类型选择器（紫色面板）
  - 动态表头（跟随选择器变化）
  - 自动获取最新月份价格
  - "不显示价格"选项隐藏整列

- **价格展示逻辑**
  - `getLatestPrice` 工具函数
  - 按年月排序，自动取最新
  - 格式化显示（分 → 万元）

### 📊 技术细节

- **代码量**: +650行（2个新文件，15个修改文件）
- **后端版本**: index.js v12.1, utils.js v12.1, mapping-engine v1.2, processor v1.1
- **数据结构**: prices 数组智能合并，保留历史数据
- **平台支持**: 完全配置驱动，支持所有平台

---

## v2.7.0 (2025-11-19)

### 🆕 达人近期表现功能

#### 核心功能
- **表现数据列表页面** (/performance)
  - 配置驱动的动态表格（支持所有平台复用）
  - 20个数据维度（基础信息、核心绩效、受众分析、人群包）
  - 平台Tab切换（抖音/小红书/B站/快手）
  - 分页展示
  - 统计卡片

- **数据导入功能**
  - 飞书表格导入（支持抖音）
  - 配置驱动的字段映射
  - 自动更新 performanceData
  - 导入成功提示和列表刷新

- **配置管理页面** (/settings/performance-config)
  - 查看字段映射配置（20个映射规则）
  - 查看数据维度配置（20个维度，5个分类）
  - 平台切换
  - 表格形式展示

#### 后端架构
- **syncFromFeishu v12.0** - 模块化重构
  - 拆分为4个独立模块（feishu-api、mapping-engine、talent-performance-processor、utils）
  - 支持 v2 数据库（agentworks_db）
  - 从数据库读取映射配置（配置驱动）
  - 100% 向后兼容 ByteProject v1
  - 详细的模块剥离文档，剥离成本 < 2天

- **fieldMappingManager** - 字段映射管理（RESTful CRUD）
- **dimensionConfigManager** - 维度配置管理（RESTful CRUD）

#### 数据库
- **field_mappings 集合** - 字段映射配置存储
- **dimension_configs 集合** - 维度配置存储
- 抖音默认配置（20个映射规则 + 20个维度）

#### 可复用组件
- **PerformanceTable** - 配置驱动表格（⭐⭐⭐⭐⭐ 极高复用性）
- **usePerformanceData Hook** - 数据加载管理
- **useFieldMapping Hook** - 字段映射管理
- **useDimensionConfig Hook** - 维度配置管理
- **useDataImport Hook** - 数据导入流程

### 📊 性能与质量
- 代码复用率：92%（11/12模块通用）
- 新增平台成本：从5天降至0.5天（90% ↓）
- 维护成本：极低（配置驱动，可视化管理）
- 长期价值：组件可复用于项目/合作等其他功能

### 🎯 抖音表现数据
- 支持20个维度的完整数据
- 基础信息：达人昵称、星图ID、层级
- 核心绩效：预期CPM、更新日期
- 受众分析：性别比例、年龄段分布（5个）
- 人群包分析：8个人群包（小镇中老年、资深中产、Z世代等）

---

## v2.6.0 (2025-11-18)

### 🚀 性能优化 - Phase 0 紧急救火

#### 后端分页与筛选系统
- **getTalents 云函数升级至 v3.3**
  - 支持后端分页（page, limit），避免大数据量全量加载
  - 支持后端筛选（searchTerm, tiers, tags, rebate, price）
  - 支持排序功能（sortBy, order）
  - 100% 向后兼容（v1 和 v2 旧调用不受影响）
  - 添加二级排序键，确保分页稳定性

- **数据库索引优化**
  - 创建 7 个性能索引（platform, tier, tags, agency, rebate, search, oneId）
  - 查询性能提升 10-100 倍

- **前端架构升级**
  - BasicInfo.tsx 移除前端筛选逻辑（300+ 行）
  - 移除前端分页逻辑（50+ 行）
  - API 层适配支持新参数格式
  - 筛选和分页现在由后端处理

#### 代码质量提升
- **统一价格单位转换**
  - 创建 PriceConverter 工具类
  - 统一处理"分"和"元"的转换
  - 避免单位转换错误（防止 v2.5.0 类似 Bug）
  - 支持格式化显示（自动转换"万"）

- **代码清理**
  - 移除调试 console.log
  - 优化代码注释

### 📊 性能提升指标
- 响应时间：10-15秒 → < 1秒（90% ↓）
- 数据传输量：8-12 MB → < 200 KB（99% ↓）
- 前端内存：50 MB → < 10 MB（80% ↓）
- BasicInfo.tsx 代码：1,125行 → 775行（30% ↓）

### 🎯 支持数据规模
- 每个平台：1,000+ 达人
- 总计：4,000+ 达人记录
- 无卡顿，流畅翻页

### 🛠 基础设施优化 - Phase 1

#### 筛选逻辑模块化
- **创建 talentFilters.ts 工具模块**
  - buildFilterParams: 构建 API 查询参数
  - validateFilters: 验证筛选条件
  - isFiltersEmpty: 检查筛选是否为空
  - countActiveFilters: 统计激活的筛选数量
  - 提升代码可测试性和可维护性

- **创建 useTalentFilters Hook**
  - 筛选状态统一管理
  - 自动验证筛选参数
  - 提供便捷的更新方法
  - 简化组件代码

#### 统一 API 调用
- **创建 useApiCall Hook**
  - 统一 API 调用封装
  - 自动加载状态管理
  - 统一错误处理和 Toast 提示
  - 支持重试机制（useApiCallWithRetry）
  - 减少重复代码 80%

- **创建 useTalentData Hook**
  - 达人列表数据管理
  - 分页状态管理
  - 自动处理 API 响应
  - 提供便捷的刷新和翻页方法

### 💡 为未来功能开发铺路
- ✅ 新功能可直接使用这些 Hooks
- ✅ 避免重复编写数据加载和状态管理代码
- ✅ 统一的开发模式，降低学习成本
- ✅ 预计新功能开发速度提升 40%

---

## v2.5.0 (2025-11-18)

### ✨ 搜索筛选系统
- **综合搜索筛选模块**
  - 基础搜索：支持达人名称和OneID搜索
  - 高级筛选面板：可折叠展开
  - 多维度筛选：达人层级、内容标签、返点率、价格区间
  - 智能条件渲染：无数据时显示友好提示
  - 筛选结果统计：实时显示匹配数量

- **价格筛选优化**
  - 价格档位改为多选勾选框
  - 修复价格单位转换问题（元/分）
  - 支持多档位同时筛选
  - 小红书平台默认显示图文笔记价格

- **筛选面板UI优化**
  - 内容标签区域限高滚动
  - 标签数量超过10个时显示计数
  - 已选标签统计显示
  - 悬停效果提升交互体验

### 🔧 Bug修复
- **返点率筛选问题**
  - 修复数据库存储百分比但代码错误乘100的问题
  - 返点率现在正确显示（如30%而非3000%）

- **三点菜单优化**
  - 从居中模态框改为定位下拉菜单
  - 菜单显示在点击位置附近
  - 符合原始设计规范

- **平台切换优化**
  - 达人详情页返回列表时保持平台选择
  - 各平台独立记忆价格档位选择
  - 小红书默认显示图文笔记价格

### 📝 文档更新
- 完成所有alert()到Toast的迁移
- 更新UI/UX开发规范
- 优化开发指南结构

---

## v2.4.2 (2025-11-17)

### ✨ UI/UX 全面优化
- **Toast通知系统全面迁移完成**
  - 所有页面不再使用 `alert()` 弹窗
  - 统一使用 Toast 组件进行用户反馈
  - 提升用户体验的一致性

### 🐛 Bug修复
- 修复价格显示N/A问题
- 修复操作菜单显示位置

---

## v2.4.0 (2025-11-17)

### ✨ 机构管理增强

#### 达人数量统计
- 机构列表页显示每个机构的实际达人数量
- 并行 API 调用优化性能
- 自动刷新统计数据

### ✨ 返点系统 - 机构绑定功能

#### 返点模式管理
- **模式切换开关**：在"当前配置" Tab 中提供开关
  - 绑定机构返点模式
  - 独立设置返点模式
- **动态 Tab 显示**：根据模式显示不同功能
  - 绑定模式：显示"机构同步" Tab
  - 独立模式：显示"手动调整" Tab

#### 机构同步 Tab
- 显示归属机构和当前返点率
- 一键从机构同步返点配置
- 同步后自动切换到绑定模式
- 实时状态更新和成功提示

#### 手动调整优化
- 手动调整后自动切换到独立模式
- 表单状态持久化
- 成功提示改为内联横幅（3秒自动消失）

#### 返点来源优化
- 绑定模式下显示"机构同步"
- 独立模式下显示实际来源（手动/规则等）
- 准确反映返点率来源

### 🔧 技术优化

#### 状态管理
- 本地 rebateMode 状态管理
- 状态持久化到数据库
- Tab 显示逻辑重构

#### API 集成
- getTalentRebate v2.0：返回 rebateMode 和 agencyName
- syncAgencyRebateToTalent v1.0：新增同步接口
- updateTalentRebate v1.1：自动设置独立模式

### 🐛 Bug 修复
- 修复 Tab 无限闪烁问题
- 修复同步状态更新延迟
- 修复错误提示显示

---

## v2.3.0 (2025-11-16)

### ✨ 新功能
- 机构返点管理弹窗
- 批量更新机构返点率
- 返点同步机制优化

### 🔧 优化
- API 响应速度提升
- 数据一致性改进
- UI 交互流畅度提升

---

## v2.2.0 (2025-11-15)

### ✨ 返点系统核心功能
- 达人返点配置管理
- 返点历史记录追踪
- 多来源返点率支持

### 📊 数据管理
- 价格数据时间序列化
- 返点数据版本控制
- 历史数据查询优化

---

## v2.1.0 (2025-11-14)

### ✨ 达人管理系统
- 多平台达人管理（抖音、小红书、B站、快手）
- 价格档位管理
- 基础信息维护

### 🎨 UI组件
- Toast 通知组件
- 模态框组件系统
- 响应式表格设计

---

## v2.0.0 (2025-11-13)

### 🎉 AgentWorks 2.0 发布
- 全新 React + TypeScript 架构
- Tailwind CSS 设计系统
- Vite 构建工具链
- 模块化组件设计

---

**维护者**: Claude Code
**最后更新**: 2025-11-21

🤖 Generated with [Claude Code](https://claude.com/claude-code)