# 云函数完整索引

> 所有 51 个云函数的完整列表和快速查找

## 📊 函数分类统计

| 分类 | 数量 | 说明 |
|------|:----:|------|
| [达人管理](#达人管理-talents) | 15 | 达人档案的增删改查、批量操作、数据导出 |
| [项目管理](#项目管理-projects) | 6 | 项目管理、性能分析、报表生成 |
| [合作订单](#合作订单-collaborations) | 4 | 合作订单的增删改查 |
| [作品管理](#作品管理-works) | 5 | 作品管理和统计 |
| [自动化](#自动化-automation) | 6 | 自动化工作流、任务调度 |
| [第三方集成](#第三方集成-integrations) | 4 | 飞书集成、数据同步 |
| [文件管理](#文件管理-files) | 3 | 文件上传、预览、删除 |
| [数据分析](#数据分析-analytics) | 3 | 数据分析和可视化 |
| [配置管理](#配置管理-configurations) | 3 | 配置管理、模板管理 |
| [任务管理](#任务管理-tasks) | 1 | 任务列表查询 |
| [系统工具](#系统工具-system) | 2 | 系统状态、元数据查询 |
| **总计** | **51** | |

---

## 达人管理 (talents)

### 查询类（7个）

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **getTalents** | 获取达人列表，支持分页、筛选、排序 | GET | v2.1 |
| **getTalentsByIds** | 批量查询达人（通过 ID 数组） | POST | v1.0 |
| **getTalentsSearch** | 达人搜索（支持模糊搜索） | GET | v1.0 |
| **getTalentHistory** | 查询达人合作历史记录 | GET | v1.0 |
| **getTalentFilterOptions** | 获取达人筛选选项（等级、分类等） | GET | v1.0 |
| **getPendingPublishTalents** | 获取待发布的达人列表 | GET | v1.0 |
| **checkTalentData** | 校验达人数据完整性 | POST | v1.0 |

### 修改类（5个）

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **updateTalent** | 更新单个达人信息 | POST | v1.0 |
| **deleteTalent** | 删除单个达人 | POST | v1.0 |
| **batchUpdateTalents** | 批量更新达人（部分字段） | POST | v1.0 |
| **bulkCreateTalents** | 批量创建达人 | POST | v1.0 |
| **bulkUpdateTalents** | 批量更新达人（完整替换） | POST | v1.0 |

### 数据处理类（3个）

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **processTalents** | 处理达人数据（清洗、转换） | POST | v1.0 |
| **exportAllTalents** | 导出所有达人数据 | GET | v1.0 |
| **syncFromFeishu** | 从飞书同步达人数据 | POST | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

---

## 项目管理 (projects)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **getProjects** | 获取项目列表 | GET | v1.0 |
| **addProject** | 新增项目 | POST | v1.0 |
| **updateProject** | 更新项目信息 | POST | v1.0 |
| **deleteProject** | 删除项目 | POST | v1.0 |
| **getProjectPerformance** | 获取项目执行数据和性能指标 | GET | v1.0 |
| **handleProjectReport** | 处理项目日报数据 | POST | v2.0 |

**目录位置**：尚未迁移（原仓库根目录）

---

## 合作订单 (collaborations)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **getCollaborators** | 获取合作订单列表 | GET | v1.0 |
| **addCollaborator** | 新增合作订单 | POST | v1.0 |
| **updateCollaborator** | 更新合作订单 | POST | v1.0 |
| **deleteCollaborator** | 删除合作订单 | POST | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

---

## 作品管理 (works)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **getWorks** | 获取作品列表 | GET | v1.0 |
| **addWork** | 新增作品 | POST | v1.0 |
| **updateWork** | 更新作品信息 | POST | v1.0 |
| **deleteWork** | 删除作品 | POST | v1.0 |
| **getWorkStats** | 获取作品统计数据 | GET | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

---

## 自动化 (automation)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **automation-workflows** | 工作流管理（CRUD） | POST | v4.0 |
| **automation-tasks** | 自动化任务管理 | POST | v1.0 |
| **automation-jobs-creat** | 创建自动化任务实例 | POST | v1.0 |
| **automation-jobs-get** | 获取任务实例列表 | GET | v1.0 |
| **automation-jobs-update** | 更新任务实例状态 | POST | v1.0 |
| **TaskGeneratorCron** | 定时任务生成器（Cron Job） | - | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

**关联 Schema**：
- `automation-workflows` → database/schemas/automation-workflows.schema.json
- `automation-tasks` → database/schemas/automation-tasks.schema.json
- `automation-jobs` → database/schemas/automation-jobs.schema.json

---

## 第三方集成 (integrations)

### 飞书集成（4个）

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **feishu-notifier** | 飞书消息推送 | POST | v1.0 |
| **feishu-callback-handler** | 飞书回调处理 | POST | v1.0 |
| **syncFromFeishu** | 从飞书同步数据 | POST | v1.0 |
| **test_feishu_create** | 飞书集成测试函数 | POST | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

**环境变量**：
- `FEISHU_APP_ID` - 飞书应用 ID
- `FEISHU_APP_SECRET` - 飞书应用密钥

---

## 文件管理 (files)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **uploadFile** | 上传文件到对象存储 | POST | v1.0 |
| **deleteFile** | 删除文件 | POST | v1.0 |
| **previewFile** | 获取文件预览 URL | GET | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

**依赖服务**：火山引擎对象存储（TOS）

---

## 数据分析 (analytics)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **getAnalysisData** | 获取综合分析数据 | GET | v1.0 |
| **getPerformanceData** | 获取性能数据 | GET | v1.0 |
| **exportComprehensiveData** | 导出综合数据报表 | POST | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

---

## 配置管理 (configurations)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **processConfigurations** | 处理项目配置 | POST | v1.0 |
| **mapping-templates-api** | 映射模板管理 | POST | v4.0 |
| **generated-sheets-manager** | 生成表格管理 | POST | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

**关联 Schema**：
- `mapping_templates` → database/schemas/mapping_templates.schema.json
- `project_configurations` → database/schemas/project_configurations.schema.json
- `generated_sheets` → database/schemas/generated_sheets.schema.json

---

## 任务管理 (tasks)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **getTasks** | 获取任务列表 | GET | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

**关联 Schema**：`tasks` → database/schemas/tasks.schema.json

---

## 系统工具 (system)

| 函数名 | 功能 | 请求方式 | 版本 |
|--------|------|---------|------|
| **system-status** | 获取系统运行状态 | GET | v1.0 |
| **getFieldMetadata** | 获取字段元数据 | GET | v1.0 |

**目录位置**：尚未迁移（原仓库根目录）

---

## 🔍 快速查找

### 按功能查找

**CRUD 操作**
- 查询列表：`get*` 系列（如 getTalents, getProjects）
- 新增数据：`add*` 系列（如 addProject, addCollaborator）
- 更新数据：`update*` 系列（如 updateTalent, updateProject）
- 删除数据：`delete*` 系列（如 deleteTalent, deleteProject）

**批量操作**
- `bulkCreateTalents` - 批量创建达人
- `bulkUpdateTalents` - 批量更新达人
- `batchUpdateTalents` - 批量部分更新

**数据导出**
- `exportAllTalents` - 导出所有达人
- `exportComprehensiveData` - 导出综合数据

**数据同步**
- `syncFromFeishu` - 从飞书同步

### 按数据库集合查找

| 集合 | 相关函数 |
|------|---------|
| **talents** | getTalents, updateTalent, bulkCreateTalents, 等15个 |
| **projects** | getProjects, addProject, updateProject, 等6个 |
| **collaborations** | getCollaborators, addCollaborator, 等4个 |
| **works** | getWorks, addWork, updateWork, 等5个 |
| **automation-workflows** | automation-workflows |
| **automation-tasks** | automation-tasks, TaskGeneratorCron |
| **automation-jobs** | automation-jobs-* (3个) |
| **mapping_templates** | mapping-templates-api |
| **generated_sheets** | generated-sheets-manager |
| **project_configurations** | processConfigurations |
| **tasks** | getTasks |

---

## 📋 迁移状态

| 状态 | 函数数量 | 说明 |
|------|:--------:|------|
| ⏳ 待迁移 | 51 | 所有函数尚未迁移到 monorepo |
| ✅ 已迁移 | 0 | - |
| 🔄 迁移中 | 0 | - |

**原仓库**：https://github.com/zyg0000000/my-cloud-functions

---

## 📖 相关文档

- [functions/README.md](./README.md) - 云函数开发指南
- [database/schemas/INDEX.md](../database/schemas/INDEX.md) - 数据库 Schema 索引
- 分类文档（待创建）：
  - talents/README.md
  - projects/README.md
  - collaborations/README.md
  - 等等...

---

**最后更新**：2025-11-11
**总函数数**：51 个
**维护者**：开发团队
