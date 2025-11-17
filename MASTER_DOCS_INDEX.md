# 🗂 主文档索引中心 - Master Documentation Index

> 统一的文档导航系统，支持ByteProject(v1.0)和AgentWorks(v2.0)双产品线开发

## 📊 文档体系概览

```
项目文档体系 (61个MD文件)
├── 📦 产品线文档
│   ├── ByteProject (v1.0) - 生产环境 - 8个文档
│   └── AgentWorks (v2.0) - 开发中 - 3个文档
├── 🗄 数据库文档
│   ├── kol_data (v1.0) - 单平台 - 9个文档
│   └── agentworks_db (v2.0) - 多平台 - 7个文档
├── ⚡ 云函数文档
│   └── 51个函数 - 14个文档
└── 📚 通用文档
    ├── 开发指南 - 3个核心文档
    ├── API文档 - 4个文档
    ├── 架构文档 - 2个文档
    └── 功能文档 - 12个文档
```

---

## 🚀 快速导航

### 开发新手必读（按顺序）
1. [开发者指南](./docs/DEVELOPER_GUIDE.md) - 环境搭建和规范
2. [故障排查手册](./docs/TROUBLESHOOTING.md) - 常见问题解决
3. 选择产品线：
   - **ByteProject**: [前端说明](./frontends/byteproject/README.md) + [数据库v1.0](./database/kol_data/README.md)
   - **AgentWorks**: [本地开发指南](./frontends/agentworks/本地开发指南.md) + [数据库v2.0](./database/agentworks_db/README.md)

---

## 📦 一、产品线文档

### ByteProject (v1.0) - 抖音星图广告管理平台 ✅生产环境

| 文档 | 路径 | 说明 |
|------|------|------|
| **项目总览** | [frontends/byteproject/README.md](./frontends/byteproject/README.md) | 18个功能模块说明 |
| **数据导出中心** | [frontends/byteproject/data_export_center/README.md](./frontends/byteproject/data_export_center/README.md) | 综合数据导出 |
| **返点管理** | [frontends/byteproject/rebate_management/README.md](./frontends/byteproject/rebate_management/README.md) | 返点配置管理 |
| **任务中心** | [frontends/byteproject/task_center/README.md](./frontends/byteproject/task_center/README.md) | 任务调度管理 |
| **项目分析** | [frontends/byteproject/project_analysis/README.md](./frontends/byteproject/project_analysis/README.md) | 项目数据分析 |
| **作品管理** | [frontends/byteproject/works_management/README.md](./frontends/byteproject/works_management/README.md) | 作品数据管理 |
| **性能分析** | [frontends/byteproject/performance/README.md](./frontends/byteproject/performance/README.md) | 性能监控分析 |
| **遗留代码** | [frontends/byteproject/legacy/README.md](./frontends/byteproject/legacy/README.md) | 旧版代码存档 |

**技术栈**: HTML5 + ES6 Modules + Tailwind CSS + 火山引擎云函数

---

### AgentWorks (v2.0) - 多平台达人管理系统 🚧开发中

| 文档 | 路径 | 说明 | 版本 |
|------|------|------|------|
| **项目架构** ⭐ | [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) | 系统架构设计 | 新建 |
| **开发规范** ⭐ | [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) | 代码和开发规范 | 新建 |
| **UI/UX规范** ⭐ | [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md) | 界面设计规范 | v2.5.0 |
| **更新日志** | [frontends/agentworks/CHANGELOG.md](./frontends/agentworks/CHANGELOG.md) | 版本更新记录 | v2.5.0 |
| **本地开发** 🔥 | [frontends/agentworks/本地开发指南.md](./frontends/agentworks/本地开发指南.md) | 完整开发流程 | - |
| **部署指南** | [frontends/agentworks/DEPLOYMENT.md](./frontends/agentworks/DEPLOYMENT.md) | Cloudflare部署 | - |
| **文档索引** | [docs/AGENTWORKS_DOCS_INDEX.md](./docs/AGENTWORKS_DOCS_INDEX.md) | AgentWorks文档导航 | 新建 |

**技术栈**: React 18 + TypeScript + Vite + Tailwind CSS + Node.js + PostgreSQL

**v2.5.0 最新功能**:
- ✨ 综合搜索筛选系统
- 🔧 价格筛选多选优化
- 🎨 下拉菜单定位优化
- 📝 返点率显示修复

---

## 🗄 二、数据库文档

### 数据库对比总览

| 对比项 | kol_data (v1.0) | agentworks_db (v2.0) |
|--------|-----------------|----------------------|
| **状态** | ✅ 生产稳定 | 🚧 开发中 |
| **架构** | 单平台（抖音） | 多平台（抖音/小红书/B站/快手） |
| **核心特性** | 12个成熟集合 | oneId跨平台关联 |
| **文档入口** | [kol_data/README.md](./database/kol_data/README.md) | [agentworks_db/README.md](./database/agentworks_db/README.md) |

### v1.0 数据库文档 - kol_data

| 文档类型 | 文件 | 说明 |
|---------|------|------|
| **总览** | [database/README.md](./database/README.md) | 数据库架构对比 |
| **快速开始** | [kol_data/QUICKSTART.md](./database/kol_data/QUICKSTART.md) | 5分钟入门 |
| **Schema索引** | [kol_data/schemas/INDEX.md](./database/kol_data/schemas/INDEX.md) | 12个集合Schema |
| **同步指南** | [kol_data/SCHEMA_SYNC_GUIDE.md](./database/kol_data/SCHEMA_SYNC_GUIDE.md) | MongoDB同步 |
| **Mac配置** | [kol_data/MAC_SETUP.md](./database/kol_data/MAC_SETUP.md) | Mac环境设置 |
| **实战教程** | [kol_data/TUTORIAL.md](./database/kol_data/TUTORIAL.md) | 使用教程 |
| **场景演示** | [kol_data/DEMO.md](./database/kol_data/DEMO.md) | 4个真实场景 |
| **脚本说明** | [kol_data/scripts/README.md](./database/kol_data/scripts/README.md) | 管理脚本 |

### v2.0 数据库文档 - agentworks_db

| 文档类型 | 文件 | 说明 | 重要度 |
|---------|------|------|--------|
| **快速开始** | [agentworks_db/QUICKSTART.md](./database/agentworks_db/QUICKSTART.md) | talents集合初始化 | ⭐⭐⭐ |
| **返点系统部署** | [agentworks_db/REBATE_DEPLOYMENT.md](./database/agentworks_db/REBATE_DEPLOYMENT.md) | v2.1返点管理 | ⭐⭐⭐ |
| **机构管理部署** | [agentworks_db/AGENCY_DEPLOYMENT.md](./database/agentworks_db/AGENCY_DEPLOYMENT.md) | 机构模块部署 | ⭐⭐⭐ |
| **达人机构关系** | [agentworks_db/TALENT_AGENCY_RELATION.md](./database/agentworks_db/TALENT_AGENCY_RELATION.md) | 关系管理 | ⭐⭐ |
| **Schema索引** | [agentworks_db/schemas/INDEX.md](./database/agentworks_db/schemas/INDEX.md) | Schema文件 | ⭐⭐ |
| **脚本说明** | [agentworks_db/scripts/README.md](./database/agentworks_db/scripts/README.md) | 管理脚本 | ⭐ |

---

## ⚡ 三、云函数文档（51个函数）

### 核心文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **总览说明** 🔥 | [functions/README.md](./functions/README.md) | 部署流程、代码规范 |
| **函数索引** 🔥 | [functions/docs/INDEX.md](./functions/docs/INDEX.md) | 51个函数完整列表 |
| **部署指南** 🔥 | [functions/docs/DEPLOYMENT_GUIDE.md](./functions/docs/DEPLOYMENT_GUIDE.md) | 详细部署教程 |
| **文档导航** | [functions/docs/INDEX_DOCS.md](./functions/docs/INDEX_DOCS.md) | 函数文档入口 |

### 升级计划文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **v1→v2升级** | [functions/docs/upgrades/UPGRADE_PLAN.md](./functions/docs/upgrades/UPGRADE_PLAN.md) | 升级总览 |
| **升级方案v2** | [functions/docs/upgrades/UPGRADE_PLAN_V2.md](./functions/docs/upgrades/UPGRADE_PLAN_V2.md) | 方案版本2 |
| **近期计划** | [functions/docs/upgrades/TOMORROW_PLAN.md](./functions/docs/upgrades/TOMORROW_PLAN.md) | 后续计划 |

### 重点函数文档

| 函数分类 | 文档路径 | 用途 |
|---------|----------|------|
| **返点管理** | | |
| getTalentRebate | [functions/getTalentRebate/README.md](./functions/getTalentRebate/README.md) | 查询返点 |
| updateTalentRebate | [functions/updateTalentRebate/README.md](./functions/updateTalentRebate/README.md) | 更新返点 |
| getRebateHistory | [functions/getRebateHistory/README.md](./functions/getRebateHistory/README.md) | 返点历史 |
| **达人管理** | | |
| getTalentStats | [functions/getTalentStats/README.md](./functions/getTalentStats/README.md) | 达人统计 |
| getTalents测试 | [functions/docs/individual/getTalents/TEST_GUIDE.md](./functions/docs/individual/getTalents/TEST_GUIDE.md) | 测试指南 |
| processTalents测试 | [functions/docs/individual/processTalents/TEST_GUIDE.md](./functions/docs/individual/processTalents/TEST_GUIDE.md) | 测试指南 |
| **开发模板** | | |
| 函数模板 | [functions/_template/README.md](./functions/_template/README.md) | 开发模板 |

---

## 📚 四、通用开发文档

### 开发指南（必读）

| 文档 | 路径 | 内容 | 适用 |
|------|------|------|------|
| **开发者指南** ⭐ | [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) | 环境搭建、Git工作流、AI协作、代码规范 | 所有 |
| **故障排查** ⭐ | [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | 前端/云函数/数据库/部署问题解决 | 所有 |
| **FAQ** | [docs/FAQ.md](./docs/FAQ.md) | 常见问题汇总 | 所有 |

### API文档

| 文档 | 路径 | 说明 | 版本 |
|------|------|------|------|
| **API参考** | [docs/api/API_REFERENCE.md](./docs/api/API_REFERENCE.md) | 云函数API接口 | - |
| **后端API v4.0** | [docs/api/backend-api-v4.0-README.md](./docs/api/backend-api-v4.0-README.md) | v4.0总体说明 | v4.0 |
| **API变更日志** | [docs/api/backend-api-v4.0-CHANGELOG.md](./docs/api/backend-api-v4.0-CHANGELOG.md) | 版本更新 | v4.0 |
| **API部署** | [docs/api/backend-api-v4.0-DEPLOYMENT.md](./docs/api/backend-api-v4.0-DEPLOYMENT.md) | 部署指南 | v4.0 |

### 架构文档

| 文档 | 路径 | 说明 | 重要度 |
|------|------|------|--------|
| **架构升级指南** | [docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md](./docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md) | 页面模块化重构 | ⭐⭐⭐ |
| **模块化策略** | [docs/architecture/PAGE_MODULARIZATION_STRATEGY.md](./docs/architecture/PAGE_MODULARIZATION_STRATEGY.md) | 模块化设计 | ⭐⭐ |

### 功能文档

| 功能模块 | 文档路径 | 说明 | 版本 |
|---------|----------|------|------|
| **多价格系统** | [docs/features/MULTI_PRICE_SYSTEM.md](./docs/features/MULTI_PRICE_SYSTEM.md) | 3档视频定价 | v2.9 |
| **自动化功能** | [docs/features/AUTOMATION.md](./docs/features/AUTOMATION.md) | 工作流引擎 | - |
| **项目日报** | [docs/features/PROJECT_REPORT.md](./docs/features/PROJECT_REPORT.md) | 日报数据功能 | - |
| **后端需求** | [docs/features/BACKEND_API_REQUIREMENTS.md](./docs/features/BACKEND_API_REQUIREMENTS.md) | API对接需求 | - |
| **数据优化** | [docs/features/data-entry-optimization-plan.md](./docs/features/data-entry-optimization-plan.md) | 输入优化 | - |

### 版本发布文档

| 版本 | 文档路径 | 说明 |
|------|----------|------|
| **PR信息** | [docs/releases/PR_INFO.md](./docs/releases/PR_INFO.md) | PR规范 |
| **v2.2.0** | [docs/releases/PR_v2.2.0_REBATE_MANAGEMENT.md](./docs/releases/PR_v2.2.0_REBATE_MANAGEMENT.md) | 返点管理 |
| **v2.4.0** | [docs/releases/PR_v2.4.0_AGENCY_REBATE_BINDING.md](./docs/releases/PR_v2.4.0_AGENCY_REBATE_BINDING.md) | 机构返点绑定 |

### 归档文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **归档说明** | [docs/archive/README.md](./docs/archive/README.md) | 旧版文档 |
| **达人选择升级** | [docs/archive/TALENT_SELECTION_UPGRADE_PLAN.md](./docs/archive/TALENT_SELECTION_UPGRADE_PLAN.md) | 历史计划 |
| **性能升级** | [docs/archive/PERFORMANCE_UPGRADE_PLAN.md](./docs/archive/PERFORMANCE_UPGRADE_PLAN.md) | 历史计划 |
| **自动化升级** | [docs/archive/PROJECT_AUTOMATION_UPGRADE_PLAN.md](./docs/archive/PROJECT_AUTOMATION_UPGRADE_PLAN.md) | 历史计划 |

---

## 🎯 五、开发场景快速索引

### 场景1：开始开发ByteProject (v1.0)
1. 阅读 [frontends/byteproject/README.md](./frontends/byteproject/README.md)
2. 查看 [database/kol_data/QUICKSTART.md](./database/kol_data/QUICKSTART.md)
3. 了解 [functions/docs/INDEX.md](./functions/docs/INDEX.md)
4. 参考 [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)

### 场景2：开始开发AgentWorks (v2.0)
1. **必读** [frontends/agentworks/本地开发指南.md](./frontends/agentworks/本地开发指南.md)
2. 理解 [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)
3. 查看 [database/agentworks_db/QUICKSTART.md](./database/agentworks_db/QUICKSTART.md)
4. 遵循 [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)

### 场景3：部署云函数
1. 阅读 [functions/README.md](./functions/README.md)
2. 按照 [functions/docs/DEPLOYMENT_GUIDE.md](./functions/docs/DEPLOYMENT_GUIDE.md)
3. 查看 [functions/docs/INDEX.md](./functions/docs/INDEX.md) 找到目标函数

### 场景4：实现返点功能
1. 数据库：[database/agentworks_db/REBATE_DEPLOYMENT.md](./database/agentworks_db/REBATE_DEPLOYMENT.md)
2. 云函数：
   - [functions/getTalentRebate/README.md](./functions/getTalentRebate/README.md)
   - [functions/updateTalentRebate/README.md](./functions/updateTalentRebate/README.md)
3. 前端：查看 [frontends/agentworks/CHANGELOG.md](./frontends/agentworks/CHANGELOG.md) v2.2.0-v2.4.0

### 场景5：调试问题
1. 查看 [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
2. 检查 [docs/FAQ.md](./docs/FAQ.md)
3. 查看相关模块的README

### 场景6：了解架构设计
1. AgentWorks架构：[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)
2. 页面模块化：[docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md](./docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md)
3. 数据库设计：[database/README.md](./database/README.md)

### 场景7：API开发对接
1. 查看 [docs/api/API_REFERENCE.md](./docs/api/API_REFERENCE.md)
2. 了解 [docs/api/backend-api-v4.0-README.md](./docs/api/backend-api-v4.0-README.md)
3. 参考云函数：[functions/docs/INDEX.md](./functions/docs/INDEX.md)

---

## 📈 六、文档统计与分布

### 按目录统计
```
database/        16个文档 (26%)
functions/       14个文档 (23%)
docs/            21个文档 (34%)
frontends/       10个文档 (16%)
根目录/           4个文档 (新增)
总计：           65个文档
```

### 按产品线统计
```
ByteProject (v1.0)：
- 前端文档：8个
- 数据库文档：9个
- 适用云函数：51个

AgentWorks (v2.0)：
- 前端文档：7个（含新增4个）
- 数据库文档：7个
- 适用云函数：开发中
```

### 按类型统计
```
开发指南类：    8个文档
API文档类：     4个文档
部署指南类：    6个文档
功能说明类：   12个文档
架构设计类：    4个文档
测试指南类：    3个文档
其他：         28个文档
```

---

## 🔄 七、文档维护建议

### 高优先级维护
1. **AgentWorks文档**：随v2.0开发持续更新
2. **云函数文档**：升级到支持v2.0
3. **API文档**：完善接口说明

### 待创建文档
- [ ] AgentWorks API文档
- [ ] 测试指南 (TESTING_GUIDE.md)
- [ ] 性能优化指南
- [ ] 安全规范文档

### 定期更新
- 每周更新：CHANGELOG.md
- 每版本更新：API文档、部署指南
- 按需更新：故障排查、FAQ

---

## 🚦 八、快速决策树

```
需要做什么？
├── 了解项目？→ 看 README.md 文件
├── 开始开发？
│   ├── ByteProject → frontends/byteproject/README.md
│   └── AgentWorks → frontends/agentworks/本地开发指南.md
├── 查数据库？
│   ├── v1.0 → database/kol_data/
│   └── v2.0 → database/agentworks_db/
├── 部署函数？→ functions/docs/DEPLOYMENT_GUIDE.md
├── 遇到问题？→ docs/TROUBLESHOOTING.md
└── 看API？→ docs/api/API_REFERENCE.md
```

---

## 📞 九、获取帮助

1. **文档问题**：在对应文档的GitHub Issue提交
2. **技术问题**：查看 [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
3. **功能需求**：查看相关功能文档或创建新Issue
4. **紧急支持**：联系项目维护者

---

**文档索引版本**: v1.0.0
**创建日期**: 2025-11-18
**最后更新**: 2025-11-18
**维护者**: Claude Code
**文档总数**: 65个MD文件

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

## 附录：文档路径速查表

<details>
<summary>展开查看所有文档路径</summary>

```
/database/README.md
/database/kol_data/README.md
/database/kol_data/QUICKSTART.md
/database/kol_data/SCHEMA_SYNC_GUIDE.md
/database/kol_data/TUTORIAL.md
/database/kol_data/MAC_SETUP.md
/database/kol_data/DEMO.md
/database/kol_data/schemas/INDEX.md
/database/kol_data/scripts/README.md
/database/agentworks_db/README.md
/database/agentworks_db/QUICKSTART.md
/database/agentworks_db/REBATE_DEPLOYMENT.md
/database/agentworks_db/AGENCY_DEPLOYMENT.md
/database/agentworks_db/TALENT_AGENCY_RELATION.md
/database/agentworks_db/schemas/INDEX.md
/database/agentworks_db/scripts/README.md

/functions/README.md
/functions/docs/INDEX.md
/functions/docs/INDEX_DOCS.md
/functions/docs/DEPLOYMENT_GUIDE.md
/functions/docs/upgrades/UPGRADE_PLAN.md
/functions/docs/upgrades/UPGRADE_PLAN_V2.md
/functions/docs/upgrades/TOMORROW_PLAN.md
/functions/docs/individual/processTalents/TEST_GUIDE.md
/functions/docs/individual/getTalents/TEST_GUIDE.md
/functions/_template/README.md
/functions/getTalentStats/README.md
/functions/getRebateHistory/README.md
/functions/updateTalentRebate/README.md
/functions/getTalentRebate/README.md

/docs/DEVELOPER_GUIDE.md
/docs/TROUBLESHOOTING.md
/docs/FAQ.md
/docs/AGENTWORKS_DOCS_INDEX.md
/docs/api/API_REFERENCE.md
/docs/api/backend-api-v4.0-README.md
/docs/api/backend-api-v4.0-CHANGELOG.md
/docs/api/backend-api-v4.0-DEPLOYMENT.md
/docs/architecture/ARCHITECTURE_UPGRADE_GUIDE.md
/docs/architecture/PAGE_MODULARIZATION_STRATEGY.md
/docs/features/MULTI_PRICE_SYSTEM.md
/docs/features/PROJECT_REPORT.md
/docs/features/AUTOMATION.md
/docs/features/BACKEND_API_REQUIREMENTS.md
/docs/features/data-entry-optimization-plan.md
/docs/archive/README.md
/docs/archive/TALENT_SELECTION_UPGRADE_PLAN.md
/docs/archive/PERFORMANCE_UPGRADE_PLAN.md
/docs/archive/PROJECT_AUTOMATION_UPGRADE_PLAN.md
/docs/releases/PR_INFO.md
/docs/releases/PR_v2.2.0_REBATE_MANAGEMENT.md
/docs/releases/PR_v2.4.0_AGENCY_REBATE_BINDING.md

/frontends/byteproject/README.md
/frontends/byteproject/data_export_center/README.md
/frontends/byteproject/legacy/README.md
/frontends/byteproject/performance/README.md
/frontends/byteproject/project_analysis/README.md
/frontends/byteproject/rebate_management/README.md
/frontends/byteproject/task_center/README.md
/frontends/byteproject/works_management/README.md

/frontends/agentworks/README.md
/frontends/agentworks/本地开发指南.md
/frontends/agentworks/DEPLOYMENT.md
/frontends/agentworks/CHANGELOG.md

/PROJECT_ARCHITECTURE.md (AgentWorks)
/DEVELOPMENT_GUIDELINES.md (AgentWorks)
/UI_UX_GUIDELINES.md (AgentWorks)
/README.md (主项目)
```

</details>