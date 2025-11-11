# KOL 营销管理平台

> 基于抖音星图的智能化达人营销管理系统，致力于通过自动化提升广告营销团队的工作效率

[![部署状态](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange)](https://cloudflare.com)
[![数据库](https://img.shields.io/badge/database-MongoDB-green)](https://www.mongodb.com/)
[![云函数](https://img.shields.io/badge/serverless-火山引擎-blue)](https://www.volcengine.com/)

> **🎉 Monorepo 架构 v3.0**: 前端、云函数、数据库 Schema 已完成统一管理！

---

## 📖 项目概述

本系统是为公司特定客户定制的营销管理平台，专注于**抖音星图广告**场景下的达人合作管理。

### 核心价值

- 🚀 提高员工工作效率
- 🤖 实现业务流程自动化
- 📊 集中管理项目、合作、达人和财务数据
- 🔗 与飞书深度集成，实现信息实时同步

### 未来愿景

升级为**多租户 SaaS 平台**，支持多客户、多平台（抖音/快手/小红书/B站）、多合作模式的全流程营销管理。

---

## 🚀 快速开始

### 前置要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 支持 ES6 模块
- （开发）Python 3 或 Node.js

### 5 分钟启动

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

### 部署说明

- **Cloudflare Pages** 自动部署
- **主分支** → 生产环境
- **功能分支** → 预览环境
- **部署时间** 2-3 分钟

---

## 🏗️ Monorepo 架构 (v3.0)

### 项目结构

```
my-product-frontend/  (Monorepo v3.0)
├── frontends/                      # 前端项目
│   └── byteproject/                # 当前产品
│       ├── *.html                  # 页面文件
│       ├── common/app-core.js      # 核心 API
│       ├── automation_suite/       # 自动化套件
│       ├── data_export_center/     # 数据导出
│       ├── order_list/             # 订单列表
│       ├── performance/            # 性能分析
│       ├── project_automation/     # 项目自动化
│       ├── project_report/         # 项目日报
│       ├── talent_pool/            # 达人池
│       ├── talent_selection/       # 达人选择
│       └── [14+ 其他功能模块]/
│
├── functions/                      # 云函数源码 (51+)
│   ├── INDEX.md                    # 完整索引
│   ├── DEPLOYMENT_GUIDE.md         # 部署指南
│   ├── getTalents/
│   ├── getProjects/
│   ├── handleProjectReport/
│   └── [48+ 其他云函数]/
│
├── database/                       # 数据库 Schema (12个集合)
│   ├── INDEX.md                    # Schema 索引
│   ├── schemas/                    # Schema 定义
│   ├── scripts/                    # 同步工具
│   └── [完整文档体系]/
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

- ✅ **阶段 1.5** (2025-11-11): 数据库 Schema 迁移
- ✅ **阶段 2** (2025-11-11): 云函数代码迁移
- ✅ **阶段 3** (2025-11-11): 前端重组 (Monorepo v3.0 完成)

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

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | HTML5 + ES6 Modules + Tailwind CSS | 纯前端，模块化架构 |
| **后端** | 火山引擎云函数 (Serverless) | 51+ 云函数 API |
| **数据库** | MongoDB | NoSQL 数据库，12 个集合 |
| **存储** | TOS 对象存储 | 文件/截图存储 |
| **集成** | 飞书 Open API | 数据同步与通知 |
| **部署** | Cloudflare Pages | 静态站点托管 |

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
| [开发者指南](./docs/DEVELOPER_GUIDE.md) | 环境搭建、开发流程、代码规范 ⭐ |
| [故障排查手册](./docs/TROUBLESHOOTING.md) | 常见问题快速解决 ⭐ |
| [FAQ](./docs/FAQ.md) | 常见问题汇总 |

### 🎯 功能详解

| 文档 | 说明 |
|------|------|
| [多价格类型系统](./docs/features/MULTI_PRICE_SYSTEM.md) | v2.9 多价格类型完整实现 |
| [项目日报功能](./docs/features/PROJECT_REPORT.md) | 3-Tab 架构：日报、录入、效果监测 |
| [自动化功能](./docs/features/AUTOMATION.md) | 工作流引擎、模板关联、本地代理 |

### 🔧 技术文档

| 文档 | 说明 |
|------|------|
| [云函数索引](./functions/INDEX.md) | 51+ 云函数完整列表 |
| [云函数部署指南](./functions/DEPLOYMENT_GUIDE.md) | 详细部署步骤 |
| [数据库 Schema 索引](./database/INDEX.md) | 12 个集合定义 |
| [Schema 同步指南](./database/SCHEMA_SYNC_GUIDE.md) | 自动同步工具使用 |

### 📖 API 文档

| 文档 | 说明 |
|------|------|
| [API 参考](./docs/api/API_REFERENCE.md) | 云函数接口完整文档 |
| [后端 API v4.0](./docs/api/backend-api-v4.0-README.md) | 5 分钟快速部署指南 |

### 🏛️ 架构文档

| 文档 | 说明 |
|------|------|
| [架构升级指南](./docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md) | 页面模块化重构指南 |
| [页面模块化策略](./docs/architecture/PAGE_MODULARIZATION_STRATEGY.md) | 模块化设计模式 |

### 🔗 外部仓库

| 仓库 | 说明 |
|------|------|
| [my-cloud-functions](https://github.com/zyg0000000/my-cloud-functions) | 云函数源码仓库 |
| [my-local-agent](https://github.com/zyg0000000/my-local-agent) | 本地爬虫代理（Puppeteer） |

---

## 🛠️ 开发指南

### 本地开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并测试
cd frontends/byteproject
python -m http.server 8000
# 在浏览器中测试功能

# 3. 提交代码
git add .
git commit -m "feat: 添加新功能"
git push origin feature/your-feature-name

# 4. 创建 Pull Request
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

**最后更新**：2025-11-11
**当前版本**：v3.0 (Monorepo 架构完成)
**维护者**：产品经理 + Claude Code

**📖 立即开始**：阅读 [开发者指南](./docs/DEVELOPER_GUIDE.md) 或 [快速开始](#快速开始)
