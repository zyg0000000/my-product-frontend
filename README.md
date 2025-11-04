# KOL 营销管理平台

> 基于抖音星图的智能化达人营销管理系统，致力于通过自动化提升广告营销团队的工作效率

[![部署状态](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange)](https://cloudflare.com)
[![数据库](https://img.shields.io/badge/database-MongoDB-green)](https://www.mongodb.com/)
[![云函数](https://img.shields.io/badge/serverless-火山引擎-blue)](https://www.volcengine.com/)

---

## 📖 项目概述

### 当前状态

本系统是为公司特定客户定制的营销管理平台，专注于**抖音星图广告**场景下的达人合作管理。

**核心价值**：
- 🚀 提高员工工作效率
- 🤖 实现业务流程自动化
- 📊 集中管理项目、合作、达人和财务数据
- 🔗 与飞书深度集成，实现信息实时同步

### 未来愿景

计划升级为**多租户 SaaS 平台**，支持：
- 🏢 **多客户**：服务公司各个广告事业部
- 📱 **多平台**：扩展到抖音、快手、小红书、B站等平台
- 🎯 **多模式**：支持星图、直投、私域等多种合作模式
- 🌐 **全流程覆盖**：从达人筛选到效果追踪的完整闭环

---

## ✨ 核心功能

### 1. 项目管理
- 项目创建与配置
- 项目财务预算管理
- 项目状态追踪
- 多维度数据看板

### 2. 项目日报与数据录入 🆕
- **项目日报 Tab**：查看项目视频的播放量数据日报
- **数据录入 Tab**：手动录入或自动抓取视频播放量
  - ✅ 智能日期选择器（今天/昨天/前天快捷按钮）
  - ✅ 实时统计信息（已发布/待发布视频统计）
  - ✅ 自动化数据抓取（≤14天 / >14天视频）
  - ✅ 视频发布状态追踪（已发布X天 / 超14天 / 自动抓取状态）
  - ✅ 智能输入控制（仅已发布视频可录入数据）
  - ✅ 数据自动保存到 MongoDB

### 3. 合作管理
- 达人合作订单管理
- 执行进度跟踪
- 财务信息录入与核算
- 效果数据展示（T+7、T+21）

### 4. 达人管理
- 达人库维护
- 达人档案管理
- 合作历史查询
- 价格与返点追踪

### 5. 返点管理
- 多维度返点配置
- 自动返点计算
- 历史返点记录
- 调价记录追踪

### 6. 自动化能力 🆕
- **自动化页面** (Tab设计，2025-11优化)
  - 3-Tab布局：发起任务、任务批次、飞书表格生成记录
  - 工作流筛选卡片，提升页面性能
  - 模板-工作流关联配置，精准控制任务选择
- 自动任务调度
- 数据自动同步
- 报表自动生成
- 飞书消息自动推送

### 7. 飞书集成
- 项目数据同步到飞书多维表格
- 关键事件飞书通知
- 飞书审批流集成

---

## 🏗️ 技术架构

### 前端技术栈

| 技术 | 说明 | 版本 |
|------|------|------|
| HTML5 | 页面结构 | - |
| JavaScript (ES6+) | 业务逻辑，使用 ES6 模块化 | - |
| Tailwind CSS | UI 样式框架 | - |
| 模块化架构 | 单页面拆分为多个职责模块 | 自研 |

### 后端技术栈

| 技术 | 说明 | 用途 |
|------|------|------|
| 火山引擎云函数 | Serverless 函数计算 | API 接口 |
| MongoDB | NoSQL 数据库 | 数据存储 |
| TOS 对象存储 | 火山引擎对象存储服务 | 文件存储 |
| 飞书 Open API | 企业协作平台 | 数据同步与通知 |

### 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                     │
│                  (静态站点托管)                         │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  项目管理   │  │  达人库     │  │  数据分析   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS API 调用
                 ▼
┌─────────────────────────────────────────────────────────┐
│              火山引擎云函数 (51+ 函数)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Projects │ │ Talents  │ │ Tasks    │ │ Feishu   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└───────┬─────────────────────────────┬───────────────────┘
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌────────────────────┐
│   MongoDB        │         │  TOS 对象存储      │
│  (kol_data)      │         │  (文件/截图)       │
└──────────────────┘         └────────────────────┘
        ▲
        │ 数据同步
        │
┌──────────────────┐
│   飞书多维表格   │
│   飞书机器人     │
└──────────────────┘
```

---

## 📁 项目结构

```
my-product-frontend/
├── README.md                          # 项目总览（本文件）
│
├── common/                            # 通用库（跨页面复用）
│   └── app-core.js                   # 核心工具类（API、Modal、格式化等）
│
├── order_list/                        # 订单管理页面模块（已模块化）
│   ├── main.js                       # 主控制器
│   ├── tab-basic.js                  # 基础信息Tab
│   ├── tab-performance.js            # 执行信息Tab
│   ├── tab-financial.js              # 财务信息Tab
│   └── tab-effect.js                 # 效果看板Tab
│
├── talent_pool/                       # 达人库模块（✅ 已模块化）
│   ├── main.js                       # 主控制器（430行）
│   ├── utils.js                      # 工具函数与常量（50行）
│   ├── table-manager.js              # 表格渲染与筛选（441行）
│   ├── modal-crud.js                 # 新增/编辑模块（146行）
│   ├── modal-price.js                # 价格管理模块（338行）
│   ├── modal-rebate.js               # 返点管理模块（236行）
│   ├── modal-history.js              # 合作历史模块（468行）
│   └── modal-batch.js                # 批量操作模块（468行）
│
├── project_report/                    # 项目日报模块（✅ 已模块化）
│   ├── main.js                       # 主控制器（478行）
│   ├── constants.js                  # API 端点和业务常量（46行）
│   ├── utils.js                      # 工具函数（140行）
│   ├── automation-manager.js         # 自动化抓取管理（180行）
│   ├── tab-daily-report.js           # 日报 Tab（336行）
│   ├── tab-data-entry.js             # 数据录入 Tab（555行）
│   └── tab-effect-monitor.js         # 效果监测 Tab（834行）🆕
│
├── *.html                            # 各个页面的 HTML 文件
├── *.js                              # 页面脚本（部分已模块化，部分待升级）
│
├── docs/                             # 📁 项目文档
│   ├── architecture/                         # 架构文档
│   │   └── ARCHITECTURE_UPGRADE_GUIDE.md    # 架构升级指南
│   ├── api/                                  # API文档
│   │   ├── API_REFERENCE.md                 # 云函数API参考文档
│   │   ├── backend-api-v4.0-README.md       # 后端API v4.0快速参考
│   │   ├── backend-api-v4.0-DEPLOYMENT.md   # 后端API v4.0部署指南
│   │   └── backend-api-v4.0-CHANGELOG.md    # 后端API v4.0更新日志
│   ├── features/                             # 功能文档
│   │   ├── data-entry-optimization-plan.md  # 数据录入优化方案
│   │   └── BACKEND_API_REQUIREMENTS.md      # 后端API改造需求文档
│   └── releases/                             # 发布文档
│       └── PR_INFO.md                        # PR提交记录
│
└── assets/                           # 静态资源
    ├── images/
    └── styles/
```

### 主要页面

| 页面 | 文件 | 状态 | 说明 |
|------|------|------|------|
| 项目列表 | `index.html` | ✅ 运行中 | 项目总览和管理入口 |
| 订单详情 | `order_list.html` | ✅ 已升级 | 项目内达人合作管理（模块化架构） |
| 项目日报 | `project_report.html` | ✅ 最新优化 | 视频播放量数据录入与日报查看 |
| 自动化页面 | `project_automation.html` | ✅ 2025-11优化 | 3-Tab设计：任务发起、批次管理、表格生成 |
| 模板管理 | `mapping_templates.html` | ✅ 2025-11升级 | 飞书表格模板配置与工作流关联 |
| 执行看板 | `execution_board.html` | ✅ 运行中 | 跨项目达人发布日历视图 |
| 达人库 | `talent_pool.html` | ✅ 已升级 | 达人档案管理（8个模块，2577行） |
| 数据分析 | `analysis.html` | ✅ 运行中 | 数据可视化看板 |

### 达人库功能详解 🆕

`talent_pool.html` 采用模块化架构，包含以下核心功能：

#### 📊 达人列表管理
- **3档价格展示**：60s+视频 / 20-60s视频 / 1-20s视频
- **多维度筛选**：层级、标签、返点率范围、价格范围、年月
- **批量操作**：批量导入、批量更新、导出Excel
- **快速操作**：编辑、删除、价格管理、返点管理、历史查询

#### 💰 价格管理模块（紫色主题）
- **3档价格类型**：根据视频时长区分定价
- **价格历史记录**：按年月追踪价格变化
- **状态标识**：正式价格 vs 临时价格（带 * 标识）
- **趋势分析**：Chart.js 折线图展示价格走势
- **筛选功能**：按年份、月份、价格类型筛选

#### 📈 返点管理模块（绿色主题）
- **返点率配置**：支持多返点率记录
- **变化追踪**：按时间顺序展示返点率变化
- **趋势可视化**：Chart.js 折线图展示返点率走势
- **实时新增**：快速添加新的返点率配置

#### 📅 合作历史模块（橙色主题）
- **统计面板**：总合作次数、总金额、平均返点率、筛选结果
- **时间筛选**：年份/月份筛选 + 重置功能
- **时间轴视图**（左侧 500px）：
  - 卡片式展示合作记录
  - 日期类型徽章（🟢发布 / 🔵下单 / ⚪创建）
  - 项目名称可跳转到订单详情
  - 状态颜色标识
  - 视频链接跳转
- **双图表可视化**（右侧 500px）：
  - 返点率变化趋势（橙色折线图）
  - 每月合作次数统计（蓝色柱状图）

#### 🛠️ 批量操作模块
- **Excel 导入**：批量导入达人数据
- **批量更新**：基于 Excel 批量更新
- **数据导出**：导出达人库为 Excel
- **模板下载**：提供标准 Excel 模板

### 项目日报功能详解

`project_report.html` 采用模块化架构，包含三个核心 Tab：

#### 📊 Tab 1: 项目日报
- 查看项目内所有视频的播放量数据
- 按日期筛选和展示数据
- 数据图表化展示
- 导出功能支持

#### ✍️ Tab 2: 数据录入（最新优化）

**智能日期选择**
- 可视化日期选择器
- 快捷按钮：今天 / 昨天 / 前天
- 自动加载对应日期的视频列表

**实时统计面板**
- 📄 共 X 条视频（当前项目视频总数）
- ✅ 已发布 X（有发布日期的视频数）
- ⏳ 待发布 X（无发布日期的视频数）

**视频列表展示**

| 列名 | 宽度 | 说明 |
|------|------|------|
| 达人名称 | 15% | 合作达人昵称 |
| 任务 ID | 15% | 星图任务编号 |
| 发布时间 | 12% | 视频发布日期 |
| 视频链接 | 20% | 抖音视频 ID（可点击跳转） |
| 当日累计总播放 | 25% | 播放量输入框 |
| 状态 | 13% | 视频状态（动态显示） |

**智能状态显示**
- ⏰ **已发布X天**：视频已发布且未超14天
- ⚠️ **超14天**：视频发布超过14天
- 🟡 **排队中...**：自动抓取任务在队列中
- 🔵 **自动抓取中...**：正在执行自动抓取
- ✅ **已完成**：自动抓取成功
- ❌ **失败**：自动抓取失败（可重试）
- `-`：未发布视频

**智能输入控制**
- ✅ **已发布视频**：输入框可用，可手动录入或自动抓取
- 🚫 **未发布视频**：输入框禁用（灰色背景），placeholder 显示"未发布，不可录入"

**自动化数据抓取**
- 🔵 **一键抓取 (≤14天)**：批量抓取14天内发布的视频数据
- 🟡 **一键抓取 (>14天)**：批量抓取超过14天的视频数据（需特殊权限）
- 🔄 **待手动更新**：标记为待手动更新的视频

**数据保存**
- 仅保存已发布视频的数据
- 保存后自动切换到"项目日报" Tab
- 数据实时同步到 MongoDB
- 支持批量保存

#### 📈 Tab 3: 效果监测 🆕 (v2.0)

**模块化升级**
- 完全重写 `tab-effect-monitor.js`（40行 → 834行）
- 前端聚合多日数据，无需新增后端 API
- Chart.js 可视化达人效果趋势
- 预留历史对比功能接口

**日期范围选择**（默认14天）
- 🔵 **快捷选项**：最近7天 / 最近14天 / 最近30天 / 全部
- 📅 **自定义日期**：从项目第一个发布日到今天
- ⚡ **智能起始日期**：自动查找项目内最早的视频发布日期

**左侧达人列表**（1/3宽度）
- 🔍 **实时搜索**：按达人名称过滤
- 📊 **6种排序方式**：
  - 总播放量 ↓ / ↑
  - 平均CPM ↓ / ↑
  - 最新播放 ↓
  - 增长率 ↓
- 💳 **达人卡片**：显示播放量、CPM、增长率、合作天数
- ✨ **选中高亮**：蓝色边框标识当前选中

**右侧达人详情**（2/3宽度）
- 📋 **关键指标卡片**（4个）
  - 总播放量（蓝色）
  - 平均CPM（紫色）
  - 合作天数（绿色）
  - 视频数量（橙色）
- 📈 **双趋势图可视化**（Chart.js）
  - 累积播放量趋势图（蓝色折线，填充渐变）
  - CPM 趋势图（紫色折线，填充渐变）
  - 支持悬停查看详细数据
  - 响应式设计，自适应容器大小
- 📅 **每日数据明细表**
  - 完整的日期 - 播放量 - CPM 列表
  - 支持滚动查看全部数据
- 🔄 **历史对比占位**
  - 虚线边框提示区域
  - 预留接口 `fetchTalentHistory()`、`renderHistoryComparison()`
  - 未来支持与历史项目对比

**技术亮点**
- ✅ **前端数据聚合**：调用现有 `/project-report` 接口，按日期范围批量获取
- ✅ **按达人分组**：自动聚合同一达人在不同日期的数据
- ✅ **性能优化**：Chart.js 图表自动销毁，避免内存泄漏
- ✅ **状态管理**：独立的搜索、排序、日期范围状态
- ✅ **无外部依赖**：复用 `AppCore`（API、Format）和 `ReportUtils`

### 自动化页面功能详解 🆕

`project_automation.html` 优化升级（2025-11），采用3-Tab设计提升性能和用户体验：

#### 📋 Tab 1: 发起任务
- 选择达人发起自动化任务
- 工作流类型选择
- 任务配置与提交
- 移至左侧显示区域

#### 📊 Tab 2: 任务批次
**筛选卡片设计**（性能优化）
- 统计卡片展示：全部任务、各工作流任务数量
- 点击卡片筛选：快速切换显示不同工作流的任务
- 单表分页显示：避免全展开导致的性能问题

**任务列表**
- 批次信息：ID、创建时间
- 工作流类型：动态加载，带类型标签
- 状态追踪：进行中、已完成、失败
- 进度统计：成功/失败任务数、完成率

#### 📑 Tab 3: 飞书表格生成记录
**模板-工作流关联**（核心特性）
- 选择报告模板
- 根据模板配置的 `allowedWorkflowIds` 自动筛选任务
- 仅显示允许的工作流类型的已完成任务
- 精准控制表格生成的数据源

**功能操作**
- 选择任务记录
- 一键生成飞书表格
- 历史生成记录查看
- 表格链接快速跳转

**技术亮点**
- ✅ **Tab样式统一**：参考 `project_report` 的Tab设计，包含图标和动效
- ✅ **性能优化**：工作流筛选卡片替代全展开设计
- ✅ **配置化控制**：模板-工作流关联实现业务逻辑配置化
- ✅ **向后兼容**：未配置关联的旧模板仍可正常使用

### 模板管理功能详解 🆕

`mapping_templates.html` 升级（2025-11），新增工作流关联配置：

#### 🔧 模板配置
1. **基础信息**：名称、描述、飞书表格Token
2. **字段映射**：飞书表格列与数据字段的映射规则
3. **工作流关联**（新增）：
   - 动态加载可用工作流列表
   - 多选checkbox配置允许的工作流
   - 未选择表示允许所有工作流
   - 保存到数据库 `allowedWorkflowIds` 字段

#### 📊 后端支持
**云函数 v4.0**（mapping-templates-api）
- 支持 `allowedWorkflowIds` 字段的存储和查询
- GET 接口返回工作流关联配置
- POST/PUT 接口支持更新工作流关联
- 完整的部署文档和迁移脚本

**相关文档**
- 📖 快速参考：`doc/mapping-templates-api-v4.0-README.md`
- 📝 更新日志：`doc/mapping-templates-api-v4.0-CHANGELOG.md`
- 🚀 部署指南：`doc/mapping-templates-api-v4.0-DEPLOYMENT.md`

---

## 🎯 多价格类型系统 (v2.9系列)

> **功能分支**: `claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf`
> **实现时间**: 2025-10
> **状态**: 全部完成 ✅ (Board 1-4)

### 📋 背景

原系统仅支持单一价格类型（60s+视频），无法满足业务需求。为支持多种视频时长的差异化定价，实施了**多价格类型系统**改造。

### 🎯 业务目标

支持达人提供3种视频时长的独立报价：
- **60s+视频** (`60s_plus`) - 长视频，价格最高
- **20-60s视频** (`20_to_60s`) - 中等视频
- **1-20s视频** (`1_to_20s`) - 短视频，价格最低

### 📊 实施路线图

| Board | 阶段 | 内容 | 状态 | 负责模块 |
|-------|------|------|------|----------|
| **Board 1** | 数据库设计 | MongoDB Schema 扩展 | ✅ 完成 | 后端数据层 |
| **Board 2** | 飞书同步 | 飞书多维表格同步逻辑 | ✅ 完成 | 云函数 utils.js |
| **Board 3** | 前端优化 | 3个核心页面UI/UX改造 | ✅ 完成 | 前端页面 |
| **Board 4** | 云函数适配 | API接口兼容性适配 | ✅ 完成 | 云函数接口 |

---

### ✅ Board 1: 数据库结构设计（已完成）

#### MongoDB Schema 扩展

**talents.prices 数组结构**：
```javascript
{
  year: 2025,           // 价格年份
  month: 11,            // 价格月份
  type: "60s_plus",     // 新增：价格类型
  price: 110000,        // 价格金额
  status: "confirmed"   // 价格状态: confirmed | provisional
}
```

**关键字段**：
- `type`: 价格类型标识符
  - `60s_plus` - 60s+视频
  - `20_to_60s` - 20-60s视频
  - `1_to_20s` - 1-20s视频

**数据迁移**：
- ✅ 为所有现有价格记录添加 `type: "60s_plus"` 默认值
- ✅ 去重处理：相同 year + month + type 的记录

---

### ✅ Board 2: 飞书同步适配（已完成）

#### 云函数修改

**文件**: `my-cloud-functions/utils.js`
**版本**: v11.4.2

**核心改造**：
```javascript
// 解析3种价格类型
const priceTypes = [
  { fieldPrefix: '抖音60+s短视频报价', type: '60s_plus' },
  { fieldPrefix: '抖音20-60s短视频报价', type: '20_to_60s' },
  { fieldPrefix: '抖音1-20s短视频报价', type: '1_to_20s' }
];

priceTypes.forEach(({ fieldPrefix, type }) => {
  for (let month = 1; month <= 12; month++) {
    const fieldName = `${fieldPrefix}-M${month}`;
    const priceValue = feishuRecord[fieldName];
    if (priceValue) {
      prices.push({
        year: financialYear,
        month: month,
        type: type,  // 新增类型标识
        price: parseInt(priceValue),
        status: 'confirmed'
      });
    }
  }
});
```

**飞书字段映射**：
- `抖音60+s短视频报价-M1` → `{type: "60s_plus", month: 1}`
- `抖音20-60s短视频报价-M1` → `{type: "20_to_60s", month: 1}`
- `抖音1-20s短视频报价-M1` → `{type: "1_to_20s", month: 1}`

---

### ✅ Board 3: 前端页面优化（已完成）

#### 优化的页面清单

| # | 页面 | 文件 | 版本 | 优化内容 |
|---|------|------|------|----------|
| 1 | **达人池** | `talent_pool.js/html` | v2.9 | 价格趋势图、胶囊标签、类型筛选 |
| 2 | **选人页面** | `talent_selection.js/html` | v2.9.4 | 表格类型筛选、批量录入联动 |
| 3 | **录入表单** | `order_form.js/html` | v2.2 | 三步式价格选择器 |

---

#### 页面 1: talent_pool（达人池）

**提交历史**：
- `2869268` - 基础多价格类型支持
- `1805f80` - 价格趋势图 + 筛选器
- `ad2b636` - UI/UX深度优化（颜色、默认值）
- `0a1923b` - 返点图排序修复

**核心功能**：

1. **表格价格显示** (talent_pool.js:703-760)
```javascript
// 3行胶囊标签，每种类型一行
60s+:     ¥ 110,000  [蓝色胶囊]
20-60s:   ¥ 100,000  [绿色胶囊]
1-20s:    ¥ 90,000   [紫色胶囊]
```

2. **价格弹窗** (talent_pool.html:228-279)
- 左侧：价格列表 + 年月筛选
- 右侧：价格趋势图（Chart.js）
- 支持按类型切换趋势图

3. **高级筛选** (talent_pool.html:124-129)
- 新增"价格类型"下拉框
- 筛选指定类型的价格区间

4. **颜色方案**
```javascript
60s_plus:   蓝色  #dbeafe / #1e40af
20_to_60s:  绿色  #d1fae5 / #065f46
1_to_20s:   紫色  #e9d5ff / #6b21a8
```

---

#### 页面 2: talent_selection（选人页面）

**提交历史**：
- `2919f03` - v2.9 基础优化
- `8d02a10` - 事件委托修复
- `5ca5c74` → `e35bf74` - 调试版本
- `72464ba` - v2.9.4 联动修复（最终版）

**核心功能**：

1. **表格价格类型筛选** (talent_selection.html:202-211)
```html
<div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <label>表格一口价显示档位:</label>
  <select id="table-price-type-filter">
    <option value="60s_plus">60s+视频</option>
    <option value="20_to_60s">20-60s视频</option>
    <option value="1_to_20s">1-20s视频</option>
  </select>
</div>
```

2. **严格类型匹配** (talent_selection.js:108-134)
```javascript
function getBestPrice(talent, requiredType = '60s_plus') {
  // 严格筛选：仅查找指定类型的价格
  const typedPrices = talent.prices.filter(p => p.type === requiredType);

  if (typedPrices.length === 0) {
    return { value: '没有', isFallback: false, sortValue: -1 };
  }
  // 不会fallback到其他类型！
}
```

3. **批量录入弹窗** (talent_selection.html:246-252)
```html
<th>视频类型</th>   <!-- 下拉：60s+/20-60s/1-20s -->
<th>价格时间</th>   <!-- 下拉：年-月 -->
<th>一口价</th>     <!-- 只读输入框，自动联动 -->
```

4. **实时价格联动** (talent_selection.js:859-902)
```javascript
function updatePriceDisplay(row) {
  const selectedType = typeSelect.value;
  const selectedTime = timeSelect.value;

  // 查找匹配价格
  const matchingPrices = talent.prices.filter(p =>
    p.year === year && p.month === month && p.type === selectedType
  );

  if (matchingPrices.length === 0) {
    // 红色提示："没有此档位价格"
    priceDisplay.className = 'price-display ... bg-red-50 text-red-600';
  } else {
    // 显示价格："¥ XX,XXX (已确认)"
  }
}
```

**关键修复**：
- 问题：切换类型/时间时价格不更新
- 原因：`className` 赋值丢失了 `price-display` 类名
- 解决：在所有 `className` 赋值时保留 `price-display` 类

---

#### 页面 3: order_form（录入合作达人）

**提交**: `365ea49` - v2.2

**核心功能**：

1. **三步式选择器** (order_form.html:67-90)
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
  <select id="price-time-select">价格时间</select>
  <select id="price-type-select">视频类型</select>
  <input id="price-display" readonly>一口价</input>
</div>
```

2. **智能默认值** (order_form.js:201-215)
```javascript
// 默认选择当月（如果存在）
const defaultTime = availableTimes.find(t =>
  t.year === currentYear && t.month === currentMonth
);

// 默认选择60s+
priceTypeSelect.value = '60s_plus';

// 自动初始化价格显示
updatePriceDisplay();
```

3. **无价格提示**
```javascript
if (matchingPrices.length === 0) {
  priceDisplay.value = '没有此档位价格';
  priceDisplay.className = '... border-red-300 text-red-600';
}
```

---

### 📦 修改文件清单

**前端文件（6个）**：
```
✅ talent_pool.js         (v2.9)
✅ talent_pool.html       (v2.9)
✅ talent_selection.js    (v2.9.4)
✅ talent_selection.html  (v2.9.4)
✅ order_form.js          (v2.2)
✅ order_form.html        (v2.2)
```

**后端文件（1个）**：
```
✅ my-cloud-functions/utils.js  (v11.4.2)
```

**总计**: 7个文件修改

---

### ✅ Board 4: 云函数适配（已完成）

**完成时间**: 2025-10-29
**修改云函数**: 1个
**无需修改**: 5个

#### 分析结果

经过全面代码审查，发现大部分云函数无需修改，仅需修复 1 个关键 BUG：

**✅ 无需修改的云函数（5个）**：

1. **getTalentsSearch** - 使用 `$elemMatch` 查询 year/month/price，与 type 字段兼容
2. **batchUpdateTalents** - 同上，查询条件兼容
3. **TaskGeneratorCron** - 仅检查是否存在确认价格，不关心 type
4. **updateTalent** - 前端不使用此接口修改 prices
5. **syncFromFeishu/utils.js** - Board 2 已完成 (v11.4.2)

**🔧 已修复的云函数（1个）**：

**bulkUpdateTalents/index.js** (v2.3 → v2.4)

- **问题**: 价格合并使用 `year-month` 作为唯一键，导致不同价格类型互相覆盖
- **影响**: talent_pool 页面"导出-修改-导入"工作流
- **修复**: 改用 `year-month-type` 作为唯一键
- **向后兼容**: 兼容旧数据（无 type 字段）

```javascript
// ❌ 旧版本 v2.3（有BUG）
currentArray.forEach(p => priceMap.set(`${p.year}-${p.month}`, p));

// ✅ 新版本 v2.4（已修复）
currentArray.forEach(p => {
    const uniqueKey = `${p.year}-${p.month}-${p.type || ''}`;
    priceMap.set(uniqueKey, p);
});
```

**部署说明**：
1. 云函数代码已提交到 `/home/user/my-cloud-functions/` 本地仓库
2. 提交信息: `fix(bulkUpdateTalents): 支持多价格类型系统 - v2.4`
3. 需要手动推送到远程并部署到火山引擎云函数平台

---

### 🎓 技术要点

#### 1. 数据一致性

**价格数据流**：
```
飞书多维表格
  ↓ (Board 2: utils.js)
talents.prices (MongoDB)
  ↓ (Board 3: 前端页面)
用户选择价格
  ↓ (talent_selection / order_form)
collaborations 集合
  ├─ amount: 价格金额
  └─ priceInfo: "2025年11月 - 60s+视频"
```

**关键点**：
- `talents.prices` 存储完整价格对象（含type）
- `collaborations` 存储快照（amount + priceInfo文本）
- order_list 页面仅显示快照，无需修改

#### 2. UI/UX 设计原则

**颜色编码**：
- 固定颜色方案，便于快速识别
- 统一使用 `talent-type-tag` 样式类

**默认行为**：
- 优先当前月份，无则选最新
- 优先60s+类型（最常用）
- 自动初始化显示

**错误提示**：
- 无价格时明确提示"没有此档位价格"
- 红色边框 + 红色文字，视觉清晰
- 防止误操作

#### 3. 性能优化

**避免重复查询**：
- `getAvailablePriceTimes`: 提取时间去重
- 一次性生成选项，避免循环调用

**DOM操作优化**：
- 保留关键类名（如 `price-display`）
- 使用事件委托，减少监听器数量

---

### ⚠️ 重要注意事项

1. **不要擅自猜测字段名称**
   - 严格使用 `60s_plus` / `20_to_60s` / `1_to_20s`
   - 避免使用其他变体

2. **类名不要丢失**
   - 设置 `className` 时必须包含原有选择器类名
   - 示例：`className = 'price-display ...'`（不能漏掉price-display）

3. **数据验证**
   - 提交前验证 priceData 是否有值
   - 检查 type 字段是否存在

4. **Git分支管理**
   - 功能分支：`claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf`
   - Board 4 继续在此分支开发
   - 完成后合并到 main

---

### 📝 对话恢复指南

如果对话中断，新对话应：

1. **读取本章节**，了解已完成的工作
2. **检查分支**：`claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf`
3. **查看提交历史**：确认最新进度
4. **继续 Board 4**：从云函数适配开始

**快速恢复命令**：
```bash
git checkout claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf
git log --oneline -10  # 查看最近10次提交
```

**当前状态验证**：
```bash
# 检查是否有Board 3的所有提交
git log --grep="v2.9" --oneline
git log --grep="order_form" --oneline
```

---

## 🚀 快速开始

### 前置要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 支持 ES6 模块的浏览器环境
- （开发）本地 HTTP 服务器（如 `python -m http.server`）

### 本地开发

1. **克隆仓库**
   ```bash
   git clone https://github.com/zyg0000000/my-product-frontend.git
   cd my-product-frontend
   ```

2. **启动本地服务器**
   ```bash
   # Python 3
   python -m http.server 8000

   # 或使用 Node.js 的 http-server
   npx http-server -p 8000
   ```

3. **访问页面**
   ```
   http://localhost:8000/index.html
   ```

### 部署

项目使用 Cloudflare Pages 自动部署：

- **主分支**：自动部署到生产环境
- **功能分支**：自动创建预览环境
- **部署时间**：通常 2-3 分钟

**部署 URL**：
- 生产环境：`https://[your-domain].pages.dev`
- 预览环境：`https://[branch].[your-project].pages.dev`

---

## 🔧 云函数配置

### 云函数仓库

**代码位置**：[my-cloud-functions](https://github.com/zyg0000000/my-cloud-functions)

**查看云函数代码**：
- 所有云函数位于仓库根目录，按功能命名（如 `handleProjectReport`、`getCollaborators` 等）
- 每个文件夹包含 `index.js`（主要代码）和 `package.json`（依赖配置）
- 例如：项目日报API → [handleProjectReport/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/handleProjectReport/index.js)

**常用云函数路径**：
- 项目日报：`handleProjectReport` - 提供项目总进展、详细分类、数据录入提醒
- 数据录入：`handleProjectReport` 中的 `getVideosForEntry` 和 `saveDailyStats` 接口
- 合作管理：`getCollaborators`、`addCollaborator`、`updateCollaborator`、`deleteCollaborator`

### 本地爬虫代理

代码位置：[my-local-agent](https://github.com/zyg0000000/my-local-agent)

本地部署的 Puppeteer 自动化代理，负责执行工作流中定义的截图和数据抓取任务。

**核心功能**：
- 执行工作流步骤（导航、点击、等待、截图、提取数据）
- URL 占位符替换（`{{xingtuId}}`、`{{taskId}}`、`{{videoId}}` 等）
- 截图上传到 TOS 对象存储
- 任务状态实时同步

### 已部署云函数（51+）

**项目相关**
- `getProjects` - 获取项目列表
- `addProject` / `updateProject` / `deleteProject` - 项目 CRUD
- `getProjectPerformance` - 项目执行数据

**达人相关**
- `getTalents` / `getTalentsByIds` / `getTalentsSearch` - 达人查询
- `getTalentHistory` - 达人合作历史
- `updateTalent` / `deleteTalent` - 达人管理
- `bulkCreateTalents` / `bulkUpdateTalents` - 批量操作

**合作订单**
- `getCollaborators` - 获取合作列表
- `addCollaborator` / `updateCollaborator` / `deleteCollaborator` - 订单 CRUD

**自动化任务**
- `automation-tasks` / `automation-jobs-creat` - 任务管理
- `automation-workflows` - 工作流引擎
- `TaskGeneratorCron` - 定时任务

**飞书集成**
- `syncFromFeishu` - 从飞书同步数据
- `feishu-callback-handler` - 飞书回调处理
- `feishu-notifier` - 飞书消息推送

**其他**
- `uploadFile` / `deleteFile` / `previewFile` - 文件管理
- `exportComprehensiveData` - 数据导出

### 环境变量配置

云函数需要配置以下环境变量：

```bash
MONGODB_URI=mongodb://...          # MongoDB 连接字符串
DB_NAME=kol_data                   # 数据库名称
TOS_ACCESS_KEY=...                 # 对象存储访问密钥
TOS_SECRET_KEY=...                 # 对象存储密钥
FEISHU_APP_ID=...                  # 飞书应用 ID
FEISHU_APP_SECRET=...              # 飞书应用密钥
```

---

## 📊 数据库架构

### MongoDB Schema

> 完整 Schema 定义：[mongodb-schemas 仓库](https://github.com/zyg0000000/mongodb-schemas)

**数据库名称**：`kol_data`

#### 1. projects（项目信息）

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|:----:|------|
| `_id` | ObjectId | ✅ | MongoDB 文档 ID |
| `id` | String | ✅ | 项目唯一标识 |
| `name` | String | ✅ | 项目名称 |
| `budget` | String | ✅ | 项目预算 |
| `status` | String | ✅ | 项目状态（执行中、已完成等） |
| `type` | String | ✅ | 项目类型 |
| `financialYear` | String | ✅ | 财务年份 |
| `financialMonth` | String | ✅ | 财务月份（格式：M1-M12） |
| `discount` | String | ✅ | 折扣配置 |
| `capitalRateId` | String | ✅ | 资金利率 ID |
| `benchmarkCPM` | Integer | ✅ | 基准 CPM 值 |
| `adjustments` | Array | ✅ | 调价记录 |
| `auditLog` | Array | ✅ | 审计日志 |
| `qianchuanId` | String | - | 千川 ID |
| `createdAt` | Date | ✅ | 创建时间 |
| `updatedAt` | Date | ✅ | 更新时间 |

#### 2. collaborations（合作订单）

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|:----:|------|
| `_id` | ObjectId | ✅ | MongoDB 文档 ID |
| `id` | String | ✅ | 订单唯一标识 |
| `projectId` | String | ✅ | 所属项目 ID |
| `talentId` | String | ✅ | 达人 ID |
| `amount` | Integer | ✅ | 合作金额 |
| `rebate` | Double | ✅ | 返点率（%） |
| `actualRebate` | Double | ✅ | 实际返点率 |
| `status` | String | ✅ | 订单状态（待对接、已下单、视频已发布等） |
| `orderType` | String | ✅ | 订单类型 |
| `talentSource` | String | ✅ | 达人来源 |
| `priceInfo` | String | ✅ | 价格信息 |
| `orderDate` | String | ✅ | 下单日期 |
| `paymentDate` | String | ✅ | 回款日期 |
| `recoveryDate` | String | ✅ | 收回日期 |
| `publishDate` | String | - | 视频发布日期 |
| `plannedReleaseDate` | String | - | 计划发布日期 |
| `taskId` | String | - | 关联任务 ID |
| `videoId` | String | - | 视频 ID |
| `contentFile` | String | - | 内容文件路径 |
| `rebateScreenshots` | Array | - | 返点截图 |
| `discrepancyReason` | String | - | 差异原因 |
| `createdAt` | Date | ✅ | 创建时间 |
| `updatedAt` | Date | ✅ | 更新时间 |

#### 3. talents（达人档案）

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|:----:|------|
| `_id` | ObjectId | ✅ | MongoDB 文档 ID |
| `id` | String | ✅ | 达人唯一标识 |
| `uid` | String | ✅ | 用户 ID |
| `xingtuId` | String | ✅ | 星图 ID |
| `nickname` | String | ✅ | 达人昵称 |
| `talentType` | Array | ✅ | 达人类型分类 |
| `talentTier` | String | ✅ | 达人等级（头部、腰部、尾部） |
| `talentSource` | String | ✅ | 达人来源渠道 |
| `prices` | Array | ✅ | 价格体系（年月、价格、状态） |
| `rebates` | Array | - | 返点率配置 |
| `performanceData` | Object | - | 性能数据（受众年龄、性别、CPM、人群标签） |
| `schedules` | Array | - | 档期安排 |
| `remarks` | Object | - | 备注信息（按月份） |
| `createdAt` | Date | ✅ | 创建时间 |
| `updatedAt` | Date | ✅ | 更新时间 |

**performanceData 结构**：
- 受众年龄分布（18-23岁、24-30岁、31-40岁、40岁以上）
- 性别比例（男性、女性观众占比）
- CPM 费率（60秒广告成本）
- 社会阶层（白领、中产、新锐白领、资深中产、都市蓝领等）

#### 4. tasks（自动化任务）

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|:----:|------|
| `id` | String | ✅ | 任务 ID |
| `type` | String | ✅ | 任务类型 |
| `status` | String | ✅ | 任务状态 |
| `schedule` | String | ✅ | 调度配置 |
| `config` | Object | ✅ | 任务配置 |
| `createdAt` | Date | ✅ | 创建时间 |

#### 5. automation-workflows（自动化工作流）

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|:----:|------|
| `id` | String | ✅ | 工作流 ID |
| `name` | String | ✅ | 工作流名称 |
| `triggers` | Array | ✅ | 触发器配置 |
| `actions` | Array | ✅ | 动作配置 |
| `enabled` | Boolean | ✅ | 是否启用 |
| `createdAt` | Date | ✅ | 创建时间 |

#### 其他集合

- `generated_sheets` - 生成的数据表格
- `mapping_templates` - 映射模板
- `project_configurations` - 项目配置
- `task_run_logs` - 任务运行日志
- `works` - 作品信息

### 数据关系

```
projects (项目)
    ├── collaborations (合作订单) [projectId]
    │       └── talents (达人) [talentId]
    └── tasks (任务) [关联项目]
            └── task_run_logs (执行日志)

automation-workflows (工作流)
    └── automation-jobs (任务实例)
```

---

## 🛠️ 开发指南

### 代码规范

- **命名规范**：小驼峰（变量/函数），大驼峰（类名）
- **模块化**：使用 ES6 `import/export`
- **注释**：关键逻辑必须添加注释
- **格式化**：保持代码缩进和空格一致

### 架构升级

如需对现有页面进行模块化重构，请参考：
- 📖 [架构升级指南](./docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md)

该指南包含：
- 完整的升级步骤
- 代码示例和最佳实践
- 常见问题解决方案
- 测试清单

### Git 工作流

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送到远程
git push origin feature/your-feature-name

# 4. 在 GitHub 创建 Pull Request

# 5. 测试通过后合并到 main
```

### 提交消息规范

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具链相关
```

---

## 🤖 AI 协作开发

本项目采用 **人机协作** 开发模式：

### 使用的 AI 工具

| AI 工具 | 用途 | 使用场景 |
|---------|------|----------|
| **Claude Code** | 编码实现 | 前端开发、架构升级、Bug 修复 |
| **Gemini** | 产品设计 | 需求分析、原型设计、方案对比 |
| 其他 AI | 辅助决策 | 技术选型、性能优化建议 |

### 与 Claude Code 协作的最佳实践

1. **明确任务边界**
   ```
   ✅ 好的指令："请按照 docs/ARCHITECTURE_UPGRADE_GUIDE.md 的步骤升级 talent_pool.js"
   ❌ 模糊指令："帮我优化一下代码"
   ```

2. **引用项目文档**
   ```
   "请先读取 docs/ARCHITECTURE_UPGRADE_GUIDE.md，然后..."
   "参考 order_list/main.js 的结构，创建..."
   ```

3. **分阶段推进**
   - 第一步：规划设计
   - 第二步：核心功能
   - 第三步：测试修复
   - 第四步：部署上线

4. **保持代码审查**
   - AI 生成的代码需要人工 review
   - 关键业务逻辑需要验证
   - 测试覆盖必不可少

---

## 📚 相关文档

### 架构文档
- [架构升级指南](./docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md) - 页面模块化重构指南

### API文档
- [云函数API参考](./docs/api/API_REFERENCE.md) - 完整的云函数接口文档
- [后端API v4.0快速参考](./docs/api/backend-api-v4.0-README.md) - 5分钟快速部署指南
- [后端API v4.0部署指南](./docs/api/backend-api-v4.0-DEPLOYMENT.md) - 详细部署步骤
- [后端API v4.0更新日志](./docs/api/backend-api-v4.0-CHANGELOG.md) - 完整版本变更说明

### 功能文档
- [数据录入优化方案](./docs/features/data-entry-optimization-plan.md) - 数据录入功能优化方案
- [后端API改造需求](./docs/features/BACKEND_API_REQUIREMENTS.md) - 后端API升级需求文档

### 发布文档
- [PR提交记录](./docs/releases/PR_INFO.md) - Pull Request历史记录

### 外部仓库
- [云函数仓库](https://github.com/zyg0000000/my-cloud-functions) - 后端 API 实现
- [本地爬虫代理](https://github.com/zyg0000000/my-local-agent) - Puppeteer 自动化执行器
- [数据库 Schema](https://github.com/zyg0000000/mongodb-schemas) - MongoDB 数据模型

---

## 🗓️ 开发路线图

### Phase 1: 架构优化 ✅ (已完成)

- [x] order_list 页面模块化重构（1455行 → 6个模块）
- [x] 创建通用工具库 app-core.js
- [x] 完善合作历史功能
- [x] 建立架构升级指南文档

### Phase 2: 功能扩展 ✅ (已完成)

- [x] **项目日报与数据录入功能** ✅
  - 项目日报 Tab 实现
  - 数据录入 Tab 实现与优化
  - 自动化数据抓取集成
  - 智能表单控制与验证
  - 视频发布状态追踪
- [x] **多价格类型系统** ✅ (v2.9系列 - 全部完成)
  - Board 1: 数据库结构设计 ✅
  - Board 2: 飞书同步适配 ✅
  - Board 3: 前端页面优化 ✅
  - Board 4: 云函数适配 ✅
- [x] **talent_pool 页面模块化重构** ✅
  - 1700行 → 8个模块（2577行）
  - 价格管理模块（3档价格体系）
  - 返点管理模块（返点率追踪）
  - 合作历史模块（统计 + 时间轴 + 双图表）
  - 批量操作模块（导入/导出/批量更新）
  - 统一视觉系统（蓝/紫/绿/橙渐变主题）
- [x] **自动化页面优化** ✅ (2025-11)
  - 3-Tab设计：发起任务、任务批次、飞书表格生成
  - 工作流筛选卡片，提升页面性能
  - Tab样式统一，参考 project_report
- [x] **模板工作流关联系统** ✅ (2025-11)
  - 模板管理页面新增工作流关联配置
  - 云函数 v4.0 支持 allowedWorkflowIds 字段
  - 任务选择精准控制
  - 完整部署文档和迁移脚本
- [x] 达人筛选和推荐功能增强
- [x] 批量操作能力提升
- [x] 数据导出功能优化

### Phase 3: 多租户改造 🔜 (计划中)

- [ ] 用户权限系统
- [ ] 租户隔离架构
- [ ] 多客户数据管理
- [ ] 统一身份认证

### Phase 4: 平台扩展 📅 (未来)

- [ ] 快手平台集成
- [ ] 小红书平台集成
- [ ] B站平台集成
- [ ] 统一的多平台数据模型

### Phase 5: 智能化能力 🌟 (愿景)

- [ ] AI 达人推荐
- [ ] 智能定价建议
- [ ] 效果预测模型
- [ ] 自动化报表生成

---

## 🐛 问题反馈

如遇到问题或有改进建议：

1. **Bug 报告**：在 GitHub Issues 中提交
2. **功能建议**：通过 Issues 讨论
3. **紧急问题**：联系项目负责人

---

## 📄 许可证

本项目为公司内部使用，未经授权不得外传。

---

## 🙏 致谢

感谢以下技术和服务商：

- [Cloudflare Pages](https://pages.cloudflare.com/) - 提供快速可靠的静态站点托管
- [火山引擎](https://www.volcengine.com/) - 提供云函数和对象存储服务
- [MongoDB](https://www.mongodb.com/) - 提供灵活的 NoSQL 数据库
- [飞书](https://www.feishu.cn/) - 提供企业协作能力
- [Claude (Anthropic)](https://claude.ai/) - AI 编码助手

---

**最后更新**：2025-11-02
**当前版本**：v2.11 (自动化页面优化 + 模板工作流关联系统)
**维护者**：产品经理 + Claude Code
