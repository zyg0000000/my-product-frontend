# 广告代理营销管理平台 Monorepo

> 智能化达人营销管理系统，从单平台到多平台的全面升级

[![部署状态](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange)](https://cloudflare.com)
[![数据库](https://img.shields.io/badge/database-MongoDB-green)](https://www.mongodb.com/)
[![云函数](https://img.shields.io/badge/serverless-火山引擎-blue)](https://www.volcengine.com/)

> **🎉 Monorepo 架构 v4.0**: 双产品并行开发，v1.0 稳定运行，v2.0 全新起航！

---

## 📖 项目概述

本仓库包含两个产品：

### 📦 产品 1.0（已上线）
- **名称**: byteproject
- **定位**: 抖音星图广告达人合作管理平台
- **状态**: ✅ 稳定运行中
- **数据库**: `kol_data`

### 📦 产品 2.0（开发中）
- **名称**: AgentWorks（广告代理项目管理平台）
- **定位**: 多平台达人营销管理系统
- **状态**: 🚧 开发中 - v4.1.0 (2025-12-14)
- **数据库**: `agentworks_db`
- **核心特性**:
  - 🚀 支持抖音、小红书、B站、快手等多平台
  - 🔗 oneId 跨平台达人关联系统
  - 🔄 智能达人合并和去重
  - 📈 跨平台数据对比分析
  - 🔍 综合搜索筛选系统
  - 💰 时间序列化价格管理
  - 🎯 返点系统（机构/独立模式）
  - 🏢 机构达人批量绑定
  - 🌙 深色模式全面支持
- **v4.1.0 更新** (2025-12-14):
  - 🏢 机构达人绑定功能（Excel 批量导入）
  - 🎨 UI 间距规范化（设计系统 v1.1.0）
  - 🐛 修复"未知机构"显示 Bug

### 核心价值

- 🚀 提高员工工作效率
- 🤖 实现业务流程自动化
- 📊 集中管理项目、合作、达人和财务数据
- 🔗 与飞书深度集成，实现信息实时同步
- 🌐 多平台统一管理（v2.0 新增）

---

## 🚀 快速开始

### 前置要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 支持 ES6 模块
- （开发）Python 3 或 Node.js

### 5 分钟启动

#### 产品 1.0 (byteproject)
```bash
# 1. 克隆仓库
git clone https://github.com/zyg0000000/my-product-frontend.git
cd my-product-frontend

# 2. 进入前端目录
cd frontends/byteproject

# 3. 启动本地服务器
python -m http.server 8000
# 或使用 Node.js
npx http-server -p 8000

# 4. 打开浏览器
# http://localhost:8000/index.html
```

#### 产品 2.0 (AgentWorks) - React + Vite
```bash
# 1. 进入 AgentWorks 目录
cd frontends/agentworks

# 2. 安装依赖（首次运行）
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器
# http://localhost:5173/
# 支持热更新（HMR），代码更改自动刷新
```

### Git 工作流程

#### 本地开发到 GitHub
```bash
# 1. 查看更改状态
git status

# 2. 添加更改
git add .

# 3. 提交更改（使用语义化提交信息）
git commit -m "feat: 添加新功能"
# 提交类型：feat(新功能)、fix(修复)、docs(文档)、style(样式)、refactor(重构)

# 4. 推送到 GitHub
git push origin main
```

#### VS Code 集成（推荐）
1. 打开源代码管理面板（`Ctrl+Shift+G` / `Cmd+Shift+G`）
2. 查看文件更改
3. 输入提交信息
4. 点击提交并同步

### 部署说明

- **Cloudflare Pages** 自动部署
- **主分支** → 生产环境（推送后 1-2 分钟自动部署）
- **功能分支** → 预览环境
- **云函数部署** → 需要单独在火山引擎控制台部署

---

## 🏗️ Monorepo 架构 (v4.0)

### 项目结构

```
my-product-frontend/  (Monorepo v4.0)
├── frontends/                      # 前端项目（双产品）
│   ├── byteproject/                # 产品 1.0（已上线）
│   │   ├── *.html                  # 页面文件
│   │   ├── common/app-core.js      # 核心 API
│   │   ├── automation_suite/       # 自动化套件
│   │   ├── order_list/             # 订单列表
│   │   ├── talent_pool/            # 达人池
│   │   └── [14+ 其他功能模块]/
│   │
│   └── agentworks/                 # 产品 2.0（开发中）✨ 新增
│       ├── public/                 # 静态资源
│       ├── src/                    # 源代码
│       │   ├── pages/              # 页面组件
│       │   ├── components/         # 通用组件
│       │   ├── api/                # API 调用
│       │   └── utils/              # 工具函数
│       └── docs/                   # 产品文档
│
├── functions/                      # 云函数源码 (51+，需升级支持双库)
│   ├── INDEX.md                    # 完整索引
│   ├── DEPLOYMENT_GUIDE.md         # 部署指南
│   ├── getTalents/                 # 需升级：支持 v1/v2
│   ├── getProjects/                # 需升级：支持 v1/v2
│   └── [48+ 其他云函数]/
│
├── database/                       # 数据库定义（双数据库）
│   ├── README.md                   # 总说明
│   ├── kol_data/                   # v1 数据库（单平台）
│   │   ├── schemas/                # 12 个集合
│   │   ├── indexes/                # 索引定义
│   │   └── scripts/                # 管理脚本
│   │
│   └── agentworks_db/              # v2 数据库（多平台）✨ 新增
│       ├── schemas/                # Schema 定义
│       ├── indexes/                # 索引定义
│       ├── migrations/             # 迁移脚本
│       └── docs/                   # 设计文档
│
└── docs/                           # 项目文档
    ├── DEVELOPER_GUIDE.md          # 开发者指南 ⭐
    ├── TROUBLESHOOTING.md          # 故障排查 ⭐
    ├── FAQ.md                      # 常见问题
    ├── features/                   # 功能详解
    ├── api/                        # API 文档
    ├── architecture/               # 架构文档
    └── archive/                    # 历史文档
```

### 架构升级历程

- ✅ **v1.0 → v3.0** (2025-11-11): 数据库 Schema 迁移、云函数代码迁移、前端重组
- ✅ **v3.0 → v4.0** (2025-11-11): 双产品架构、双数据库设计
  - 创建 `frontends/agentworks/`（产品 2.0）
  - 数据库目录重组：`kol_data/` + `agentworks_db/`
  - 多平台架构设计（oneId 关联系统）

---

## ✨ 核心功能

### 1. 项目管理
- 项目创建、配置、预算管理
- 项目状态追踪
- 多维度数据看板

### 2. 项目日报与数据录入 🆕
- **日报查看**：视频播放量数据可视化
- **智能录入**：自动/手动数据录入，智能表单控制
- **效果监测**：达人效果趋势分析，CPM 对比
- 📖 [详细说明](./docs/features/PROJECT_REPORT.md)

### 3. 合作管理
- 达人合作订单管理
- 执行进度跟踪
- 财务信息录入与核算
- 效果数据展示（T+7、T+21）

### 4. 达人管理
- 达人库维护与档案管理
- 合作历史查询
- **多价格类型系统** (v2.9)：支持 60s+/20-60s/1-20s 三档价格
- **智能价格格式化** (v2.3)：自动识别整万/精确金额显示
- 📖 [多价格系统详解](./docs/features/MULTI_PRICE_SYSTEM.md)

### 5. 返点管理
- 多维度返点配置
- 自动返点计算
- 历史返点记录

### 6. 自动化能力 🆕
- **3-Tab 设计**：发起任务、任务批次、飞书表格生成
- **工作流引擎**：可配置的自动化工作流
- **模板关联**：模板-工作流精准控制
- **本地代理**：Puppeteer 自动化执行器
- 📖 [自动化功能详解](./docs/features/AUTOMATION.md)

### 7. 飞书集成
- 数据同步到飞书多维表格
- 关键事件通知
- 审批流集成

---

## 🏗️ 技术架构

### 技术栈

| 层级 | 产品 1.0 (byteproject) | 产品 2.0 (AgentWorks) | 说明 |
|------|----------------------|---------------------|------|
| **前端框架** | HTML5 + ES6 Modules | React 19 + Vite 7 | v2.0 现代化框架 |
| **UI 组件** | 原生 HTML + Tailwind | **Ant Design Pro + Tailwind** 🆕 | **混合方案** |
| **状态管理** | 原生 JS | Zustand | 轻量级状态管理 |
| **路由** | 原生 | React Router 7 | SPA 路由 |
| **后端** | 火山引擎云函数 (Serverless) | 火山引擎云函数 | 52+ 云函数 API |
| **数据库** | MongoDB (kol_data) | MongoDB (agentworks_db) | 双数据库独立 |
| **存储** | TOS 对象存储 | TOS 对象存储 | 文件/截图存储 |
| **集成** | 飞书 Open API | 飞书 Open API | 数据同步与通知 |
| **部署** | Cloudflare Pages | Cloudflare Pages | 静态站点托管 |

#### 🎨 AgentWorks UI 方案详解 (v2.0)

**技术决策**: **Ant Design Pro Components + Tailwind CSS 混合方案**

**组件分工**：
```
Ant Design Pro Components  →  复杂业务组件
  ├─ ProTable              →  企业级表格（搜索、筛选、分页、导出）
  ├─ ProForm               →  高级表单（验证、布局、动态字段）
  ├─ ModalForm/DrawerForm  →  模态框表单
  └─ ProCard               →  卡片容器

Tailwind CSS              →  布局和样式
  ├─ 布局控制              →  flex, grid, space-y
  ├─ 间距管理              →  p-, m-, gap-
  ├─ 颜色系统              →  bg-, text-, border-
  └─ 字体样式              →  text-xl, font-bold
```

**核心优势**：
- ✅ 开发效率提升 400%（代码量减少 50-80%）
- ✅ 功能更强大（自动搜索、筛选、导出等）
- ✅ 样式统一（统一的设计规范）
- ✅ 易维护（减少重复代码）

**详细文档**：
- [UI 迁移计划](docs/UI_MIGRATION_PLAN.md) - 迁移路线图和时间表
- [样式规范指南](docs/STYLE_GUIDE.md) - 字体、间距、颜色规范
- [组件库手册](docs/COMPONENT_LIBRARY.md) - ProTable/ProForm 完整使用指南
- [测试清单](docs/UI_TESTING_CHECKLIST.md) - 质量保证标准

### 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                     │
│                  (静态站点托管)                         │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS API 调用
                 ▼
┌─────────────────────────────────────────────────────────┐
│              火山引擎云函数 (51+ 函数)                  │
└───────┬─────────────────────────────┬───────────────────┘
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌────────────────────┐
│   MongoDB        │         │  TOS 对象存储      │
│  (kol_data)      │◄────────┤  飞书多维表格      │
└──────────────────┘         └────────────────────┘
```

---

## 📚 完整文档导航

### 🚀 快速入门

| 文档 | 说明 |
|------|------|
| **[📖 文档中心](./docs/README.md)** | **统一文档导航系统 - 快速找到你需要的文档 🔥** |
| **[AgentWorks 产品总览](./docs/agentworks/README.md)** | **AgentWorks 完整产品介绍 🆕** |
| [开发者指南](./docs/general/DEVELOPER_GUIDE.md) | 环境搭建、开发流程、代码规范 ⭐ |
| [故障排查手册](./docs/general/TROUBLESHOOTING.md) | 常见问题快速解决 ⭐ |

### 🎯 功能详解

| 文档 | 说明 |
|------|------|
| [多价格类型系统](./docs/agentworks/features/MULTI_PRICE_SYSTEM.md) | v2.9 多价格类型完整实现 |
| [项目日报功能](./docs/agentworks/features/PROJECT_REPORT.md) | 3-Tab 架构：日报、录入、效果监测 |
| [自动化功能](./docs/agentworks/features/AUTOMATION.md) | 工作流引擎、模板关联、本地代理 |
| [平台配置系统](./docs/agentworks/features/PLATFORM_CONFIG_FEATURE_GUIDE.md) | 平台动态配置管理 |

### 🔧 技术文档

| 文档 | 说明 |
|------|------|
| [云函数索引](./functions/INDEX.md) | 51+ 云函数完整列表 |
| [云函数部署指南](./functions/DEPLOYMENT_GUIDE.md) | 详细部署步骤 |
| [数据库 Schema 索引](./database/INDEX.md) | 12 个集合定义 |
| [Schema 同步指南](./database/SCHEMA_SYNC_GUIDE.md) | 自动同步工具使用 |

### 📖 架构与 API 文档

| 文档 | 说明 |
|------|------|
| [系统架构](./docs/agentworks/ARCHITECTURE.md) | AgentWorks 技术架构详解 |
| [API 文档](./docs/agentworks/api/) | 后端 API 接口文档 |
| [开发规范](./docs/agentworks/DEVELOPMENT_GUIDELINES.md) | 代码规范和最佳实践 |
| [UI/UX 规范](./docs/agentworks/UI_UX_GUIDELINES.md) | 界面设计规范 |

### 🔗 外部仓库

| 仓库 | 说明 |
|------|------|
| [my-cloud-functions](https://github.com/zyg0000000/my-cloud-functions) | 云函数源码仓库 |
| [my-local-agent](https://github.com/zyg0000000/my-local-agent) | 本地爬虫代理（Puppeteer） |

---

## 🛠️ 开发指南

### ⚠️ 关键开发要求（必读）

#### 1. 云函数开发规范
- ✅ **必须更新版本号** - 每次修改云函数必须更新 `@version` 和 `CHANGELOG`
- ✅ **必须添加日志** - 使用 `[v${VERSION}]` 标识版本
- 📚 [完整规范](./docs/agentworks/DEVELOPMENT_GUIDELINES.md#云函数开发规范)

#### 2. Token 用量控制
- ⚠️ **Token > 50,000** - 需要提醒并评估
- 🚨 **Token > 100,000** - 分阶段执行
- 📚 [详细说明](./docs/agentworks/DEVELOPMENT_GUIDELINES.md#token-用量控制)

#### 3. Cloudflare Pages 部署
- ✅ **部署前必须检查** - 运行 `./scripts/pre-deploy-check.sh`
- ✅ **TypeScript 检查** - `npm run type-check` 必须通过
- ✅ **ESLint 检查** - `npm run lint` 必须通过
- ✅ **构建测试** - `npm run build` 必须成功
- 📚 [部署检查清单](./docs/agentworks/DEVELOPMENT_GUIDELINES.md#cloudflare-pages-部署要求)

### 本地开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并测试
cd frontends/agentworks
npm run dev

# 3. 部署前检查（重要！）
../../scripts/pre-deploy-check.sh

# 4. 提交代码
git add .
git commit -m "feat: 添加新功能"
git push origin feature/your-feature-name

# 5. 创建 Pull Request（使用 PR 模板）
```

### AI 协作开发 🤖

本项目采用 **Claude Code** 进行编码实现：

- ✅ AI 在功能分支开发（`claude/xxx` 格式）
- ✅ 持续推送更新到远程
- ⚠️ **未经确认不会自动合并到 main**
- ✅ 产品经理最终审核后手动合并

详细说明：[开发者指南 - AI 协作开发](./docs/DEVELOPER_GUIDE.md#ai-协作开发)

### 代码规范

- **命名**: 小驼峰（变量/函数），大驼峰（类名）
- **模块化**: ES6 `import/export`
- **注释**: 关键逻辑必须注释
- **提交消息**: `feat/fix/docs/refactor/test/chore`

完整规范：[开发者指南 - 代码规范](./docs/DEVELOPER_GUIDE.md#代码规范)

---

## 📝 常用开发任务

### 添加数据导出字段

**仅需 2 步**：

1. 更新 `my-cloud-functions/getFieldMetadata/index.js`
2. 更新 `my-cloud-functions/exportComprehensiveData/index.js`
3. 部署云函数

详细流程：[开发者指南 - 数据导出字段添加](./docs/DEVELOPER_GUIDE.md#数据导出字段添加)

### 页面模块化重构

参考指南：[架构升级指南](./docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md)

包含：
- 完整升级步骤
- 代码示例和最佳实践
- 测试清单

### 部署云函数

```bash
# 1. 提交代码到 GitHub
cd /path/to/my-cloud-functions
git add .
git commit -m "feat: 添加新云函数"
git push

# 2. VSCode 拉取代码
# 3. 使用火山引擎插件部署
```

详细说明：[云函数部署指南](./functions/DEPLOYMENT_GUIDE.md)

---

## 🐛 问题排查

### 常见问题快速解决

| 问题 | 文档链接 |
|------|----------|
| 页面加载白屏 | [故障排查 - 前端问题 Q1](./docs/TROUBLESHOOTING.md#q1-页面加载白屏) |
| API 请求失败 | [故障排查 - 前端问题 Q2](./docs/TROUBLESHOOTING.md#q2-api-请求失败) |
| 云函数部署失败 | [故障排查 - 云函数问题 Q1](./docs/TROUBLESHOOTING.md#q1-云函数部署失败) |
| MongoDB 连接失败 | [故障排查 - 数据库问题 Q1](./docs/TROUBLESHOOTING.md#q1-mongodb-连接失败) |
| 自动化任务卡住 | [故障排查 - 自动化问题 Q1](./docs/TROUBLESHOOTING.md#q1-自动化任务一直进行中) |

完整故障排查：[故障排查手册](./docs/TROUBLESHOOTING.md)

### 获取帮助

1. **查看文档**：先阅读相关功能文档
2. **搜索 FAQ**：[常见问题](./docs/FAQ.md)
3. **提交 Issue**：在 GitHub Issues 中描述问题
4. **联系开发者**：紧急问题联系项目维护者

---

## 🗓️ 开发路线图

### ✅ Phase 1: 架构优化（已完成）

- [x] Monorepo v3.0 架构升级
- [x] order_list / talent_pool 页面模块化重构
- [x] 通用工具库 app-core.js
- [x] 架构升级指南文档

### ✅ Phase 2: 功能扩展（已完成）

- [x] 项目日报与数据录入功能
- [x] 多价格类型系统 (v2.9)
- [x] 自动化页面优化（3-Tab 设计）
- [x] 模板工作流关联系统
- [x] 数据导出功能优化

### 🔜 Phase 3: 多租户改造（计划中）

- [ ] 用户权限系统
- [ ] 租户隔离架构
- [ ] 多客户数据管理
- [ ] 统一身份认证

### 📅 Phase 4: 平台扩展（未来）

- [ ] 快手/小红书/B站 平台集成
- [ ] 统一多平台数据模型

### 🌟 Phase 5: 智能化能力（愿景）

- [ ] AI 达人推荐
- [ ] 智能定价建议
- [ ] 效果预测模型

---

## 🙏 致谢

感谢以下技术和服务商：

- [Cloudflare Pages](https://pages.cloudflare.com/) - 静态站点托管
- [火山引擎](https://www.volcengine.com/) - 云函数和对象存储
- [MongoDB](https://www.mongodb.com/) - NoSQL 数据库
- [飞书](https://www.feishu.cn/) - 企业协作平台
- [Claude (Anthropic)](https://claude.ai/) - AI 编码助手

---

## 📄 许可证

本项目为公司内部使用，未经授权不得外传。

---

**最后更新**：2025-12-14
**当前版本**：
- ByteProject v1.0 (稳定运行)
- AgentWorks v4.1.0 (开发中 - 机构达人绑定 + UI规范化)
**维护者**：产品经理 + Claude Code

**📖 立即开始**：
- **📚 文档中心**: 查看 [文档导航系统](./docs/README.md) - 快速找到你需要的文档
- **产品 1.0 (ByteProject)**:
  - [前端说明](./frontends/byteproject/README.md) - 18个功能模块
  - [数据库v1.0](./database/kol_data/README.md) - 单平台架构
- **产品 2.0 (AgentWorks)**:
  - [产品总览](./docs/agentworks/README.md) - 完整产品介绍
  - [前端快速开始](./frontends/agentworks/README.md) - 5分钟启动
  - [项目架构](./docs/agentworks/ARCHITECTURE.md) - 系统架构详解
  - [开发规范](./docs/agentworks/DEVELOPMENT_GUIDELINES.md) - 代码规范
  - [UI/UX规范](./docs/agentworks/UI_UX_GUIDELINES.md) - 界面设计
  - [数据库v2.0](./database/agentworks_db/README.md) - 多平台架构
- **云函数**: 查看 [函数索引](./functions/docs/INDEX.md) - 51个云函数
