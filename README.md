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

### 2. 合作管理
- 达人合作订单管理
- 执行进度跟踪
- 财务信息录入与核算
- 效果数据展示（T+7、T+21）

### 3. 达人管理
- 达人库维护
- 达人档案管理
- 合作历史查询
- 价格与返点追踪

### 4. 返点管理
- 多维度返点配置
- 自动返点计算
- 历史返点记录
- 调价记录追踪

### 5. 自动化能力
- 自动任务调度
- 数据自动同步
- 报表自动生成
- 飞书消息自动推送

### 6. 飞书集成
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
| 达人库 | `talent_pool.html` | 🔄 待升级 | 达人档案管理（1400+行，待模块化） |
| 数据分析 | `analysis.html` | ✅ 运行中 | 数据可视化看板 |

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

代码位置：[my-cloud-functions](https://github.com/zyg0000000/my-cloud-functions)

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

### Phase 2: 功能扩展 🚧 (进行中)

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

**最后更新**：2025-10-25
**当前版本**：v2.0 (模块化架构)
**维护者**：产品经理 + Claude Code
