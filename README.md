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

### 6. 自动化能力
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
├── order_list/                        # 订单管理页面模块
│   ├── main.js                       # 主控制器
│   ├── tab-basic.js                  # 基础信息Tab
│   ├── tab-performance.js            # 执行信息Tab
│   ├── tab-financial.js              # 财务信息Tab
│   └── tab-effect.js                 # 效果看板Tab
│
├── talent_pool/                       # 达人库模块（待升级）
│
├── *.html                            # 各个页面的 HTML 文件
├── *.js                              # 页面脚本（部分已模块化，部分待升级）
│
├── docs/                             # 项目文档
│   ├── ARCHITECTURE_UPGRADE_GUIDE.md # 架构升级指南
│   └── API_REFERENCE.md             # API 参考文档
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
| 执行看板 | `execution_board.html` | ✅ 运行中 | 跨项目达人发布日历视图 |
| 达人库 | `talent_pool.html` | 🔄 待升级 | 达人档案管理（1400+行，待模块化） |
| 数据分析 | `analysis.html` | ✅ 运行中 | 数据可视化看板 |

### 项目日报功能详解

`project_report.html` 包含两个核心 Tab：

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

---

## 🎯 多价格类型系统 (v2.9系列)

> **功能分支**: `claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf`
> **实现时间**: 2025-10
> **状态**: Board 1-3 已完成 ✅ | Board 4 待开始 🔜

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
| **Board 4** | 云函数适配 | API接口兼容性适配 | 🔜 待开始 | 云函数接口 |

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

### 🔜 Board 4: 云函数适配（待开始）

**范围**: 需要适配所有访问 `talents.prices` 字段的云函数

**待检查的云函数**：
- `getTalents` / `getTalentsSearch` - 达人查询
- `getTalentsByIds` - 批量查询
- `updateTalent` - 达人更新
- `bulkUpdateTalents` / `batchUpdateTalents` - 批量更新
- `exportAll` - 数据导出
- 其他可能访问 prices 字段的函数

**适配原则**：
1. 读取操作：确保能正确处理带 `type` 字段的价格数据
2. 写入操作：确保不会覆盖或丢失 `type` 字段
3. 查询操作：支持按 `type` 筛选价格
4. 兼容性：确保旧数据（无type字段）也能正常处理

**预计工作量**：
- 代码审查：2-3小时
- 适配修改：4-6小时
- 测试验证：2-3小时

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
- 📖 [架构升级指南](./docs/ARCHITECTURE_UPGRADE_GUIDE.md)

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

- [架构升级指南](./docs/ARCHITECTURE_UPGRADE_GUIDE.md) - 页面模块化重构指南
- [API 参考文档](./docs/API_REFERENCE.md) - 云函数接口规范（15 个详细 API）
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
- [x] **多价格类型系统** ✅ (v2.9系列)
  - Board 1: 数据库结构设计 ✅
  - Board 2: 飞书同步适配 ✅
  - Board 3: 前端页面优化 ✅
  - Board 4: 云函数适配 🔜
- [ ] talent_pool 页面模块化重构
- [ ] 达人筛选和推荐功能增强
- [ ] 批量操作能力提升
- [ ] 数据导出功能优化

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

**最后更新**：2025-10-29
**当前版本**：v2.9 (多价格类型系统 - Board 3完成)
**维护者**：产品经理 + Claude Code
**当前分支**：`claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf`
