# 数据库定义 (Database Schemas)

> 本目录包含两个数据库的 Schema 定义：v1.0（单平台）和 v2.0（多平台）

---

## 📊 数据库概览

| 数据库 | 版本 | 状态 | 关联前端 | 平台支持 | 说明 |
|--------|------|------|---------|---------|------|
| **kol_data** | v1.0 | ✅ 稳定运行 | `frontends/byteproject/` | 仅抖音 | 旧产品数据库 |
| **agentworks_db** | v2.0 | 🚧 开发中 | `frontends/agentworks/` | 多平台 | 新产品数据库 |

---

## 📁 目录结构

```
database/
├── README.md              # 本文件（总说明）
│
├── kol_data/              # v1.0 数据库（单平台）
│   ├── README.md          # v1 数据库说明 ⭐
│   ├── schemas/           # 12 个集合的 Schema 定义
│   ├── indexes/           # 索引定义
│   ├── migrations/        # 数据迁移脚本
│   ├── scripts/           # 管理脚本
│   └── ...（完整文档）
│
└── agentworks_db/         # v2.0 数据库（多平台）✨ 新增
    ├── README.md          # v2 数据库说明 ⭐
    ├── schemas/           # Schema 定义（支持多平台）
    ├── indexes/           # 索引定义
    ├── migrations/        # 数据迁移脚本
    ├── scripts/           # 管理脚本
    └── docs/              # 详细设计文档
```

---

## 🔍 快速导航

### v1.0 数据库（kol_data）

**📖 阅读**: [`kol_data/README.md`](./kol_data/README.md)

**核心特点**：
- ✅ 成熟稳定，已上线运行
- ✅ 单平台设计（仅支持抖音）
- ✅ 12 个集合，完整的 Schema 定义
- ✅ 持续维护，支持 1.0 产品

**主要集合**：
- `talents` - 达人信息（单平台）
- `projects` - 项目信息
- `collaborations` - 合作订单
- `automation-workflows` - 自动化工作流
- ...（其他 8 个集合）

---

### v2.0 数据库（agentworks_db）

**📖 阅读**: [`agentworks_db/README.md`](./agentworks_db/README.md)

**核心特点**：
- 🚀 多平台架构（抖音、小红书、B站等）
- 🔗 oneId 关联系统（跨平台达人统一）
- 🔄 支持后期合并达人
- 📈 高扩展性设计

**主要集合**：
- `talents` - 达人信息（多平台 + oneId）✨
- `talent_merges` - 达人合并历史 ✨ 新增
- `projects` - 项目信息（支持多平台）
- `cooperations` - 合作订单（支持多平台）
- ...（其他集合）

---

## 🆚 v1 vs v2 核心区别

| 维度 | v1 (kol_data) | v2 (agentworks_db) |
|------|--------------|-------------------|
| **平台支持** | 仅抖音 | 抖音、小红书、B站、快手等 |
| **达人数据结构** | 一个达人一条记录 | 一个"达人+平台"一条记录 |
| **达人关联** | 通过 `_id` | 通过 `oneId`（跨平台统一） |
| **重复达人处理** | ❌ 不支持 | ✅ 支持后期合并 + 历史追溯 |
| **平台特有字段** | 固定字段 | `platformSpecific` 动态扩展 |
| **扩展性** | 有限 | 易于新增平台 |
| **数据隔离** | - | 与 v1 完全独立 |

---

## 🚀 快速开始

### 使用 v1 数据库（现有产品）

```bash
# 查看 v1 数据库文档
cd database/kol_data/
cat README.md

# 同步 Schema
./scripts/sync-schema.sh talents
```

### 使用 v2 数据库（新产品）

```bash
# 查看 v2 数据库文档
cd database/agentworks_db/
cat README.md

# 查看设计文档
cat docs/DESIGN.md
```

---

## 🔧 数据库管理工具

每个数据库目录都包含以下工具：

- **Schema 同步工具** (`scripts/sync-schema.sh`)：从 MongoDB 同步最新 Schema
- **迁移脚本** (`migrations/`)：管理数据库结构变更
- **索引管理** (`indexes/`)：索引定义和优化

---

## 📚 详细文档

### v1.0 数据库文档

| 文档 | 说明 | 路径 |
|------|------|------|
| Schema 同步指南 | 如何从 MongoDB 同步 Schema | `kol_data/SCHEMA_SYNC_GUIDE.md` |
| 快速开始 | 5 分钟快速上手 | `kol_data/QUICKSTART.md` |
| 实战教程 | 详细使用教程 | `kol_data/TUTORIAL.md` |
| Mac 设置指南 | Mac 环境配置 | `kol_data/MAC_SETUP.md` |

### v2.0 数据库文档

| 文档 | 说明 | 状态 | 路径 |
|------|------|------|------|
| 设计文档 | oneId 逻辑、多平台架构 | 🚧 开发中 | `agentworks_db/docs/DESIGN.md` |
| 迁移指南 | 从 v1 迁移数据 | 📝 待编写 | `agentworks_db/docs/MIGRATION.md` |
| API 对接指南 | 后端对接说明 | 📝 待编写 | `agentworks_db/docs/API_GUIDE.md` |

---

## 🔗 相关链接

- **云函数代码**：`../functions/`（需升级支持双数据库）
- **v1.0 前端**：`../frontends/byteproject/`
- **v2.0 前端**：`../frontends/agentworks/`（开发中）
- **项目文档**：`../docs/`

---

## ⚠️ 重要提示

1. **v1 和 v2 数据库完全独立**，互不影响
2. **v1 继续稳定运行**，不受 v2 开发影响
3. **所有变更请先在测试环境验证**
4. **定期备份数据库**
5. **使用 migrations/ 脚本管理结构变更**

---

## 🛠️ 开发计划

### ✅ Phase 1: 目录重组（已完成）
- [x] 创建 `kol_data/` 目录
- [x] 迁移 v1 相关文件
- [x] 创建 `agentworks_db/` 目录
- [x] 编写说明文档

### 🚧 Phase 2: v2 Schema 设计（进行中）
- [ ] 设计核心 Schema（talents、cooperations、projects）
- [ ] 创建索引定义
- [ ] 编写设计文档

### 📅 Phase 3: 数据库初始化（待开始）
- [ ] 创建 MongoDB 数据库
- [ ] 初始化集合和索引
- [ ] 编写初始化脚本

### 📅 Phase 4: 后端升级（待开始）
- [ ] 升级云函数支持双数据库
- [ ] 实现 v2 API 逻辑
- [ ] 测试接口

---

**维护者**：产品团队
**最后更新**：2025-11-11
**架构版本**：v4.0 (Dual Database Architecture)
