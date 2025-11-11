# 云函数文档导航

> 所有云函数相关文档的统一入口

---

## 📚 文档分类

### 📖 核心文档

| 文档 | 说明 | 路径 |
|------|------|------|
| **函数索引** | 所有 51 个云函数的完整清单 | [INDEX.md](./INDEX.md) |
| **部署指南** | 云函数部署完整教程 | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| **开发规范** | 云函数开发和代码规范 | [../README.md](../README.md) |

---

### 🔄 升级方案

| 文档 | 说明 | 状态 | 路径 |
|------|------|:----:|------|
| **整体升级方案** | v1 → v2 双版本支持总体规划 | 📋 规划中 | [upgrades/UPGRADE_PLAN.md](./upgrades/UPGRADE_PLAN.md) |
| **processTalents v2 升级** | processTalents 云函数 v2 详细方案 | ✅ 已完成 | [upgrades/UPGRADE_PLAN_V2.md](./upgrades/UPGRADE_PLAN_V2.md) |

---

### 🔧 单个函数文档

#### processTalents（达人管理）

| 文档 | 说明 | 路径 |
|------|------|------|
| **v2 升级方案** | 详细的升级设计和实现 | [individual/processTalents/UPGRADE_PLAN_V2.md](./individual/processTalents/UPGRADE_PLAN_V2.md) |
| **测试指南** | 完整的测试用例和验证步骤 | [individual/processTalents/TEST_GUIDE.md](./individual/processTalents/TEST_GUIDE.md) |

---

## 📁 目录结构

```
functions/
├── README.md                              # 云函数开发指南
│
├── docs/                                  # 📚 统一文档目录
│   ├── INDEX_DOCS.md                      # 本文件（文档导航）
│   ├── INDEX.md                           # 函数清单索引
│   ├── DEPLOYMENT_GUIDE.md                # 部署指南
│   │
│   ├── upgrades/                          # 🔄 升级方案
│   │   ├── UPGRADE_PLAN.md                # 整体升级方案
│   │   └── UPGRADE_PLAN_V2.md             # processTalents v2 方案
│   │
│   └── individual/                        # 🔧 单个函数文档
│       └── processTalents/
│           ├── UPGRADE_PLAN_V2.md         # v2 升级方案
│           └── TEST_GUIDE.md              # 测试指南
│
├── _template/                             # 函数模板
│   └── README.md
│
├── processTalents/                        # 达人管理函数
│   ├── index.js                           # 函数代码
│   └── package.json
│
└── ...（其他函数）
```

---

## 🚀 快速导航

### 我想查看...

- **所有云函数列表** → [INDEX.md](./INDEX.md)
- **如何部署云函数** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **v2 升级总览** → [upgrades/UPGRADE_PLAN.md](./upgrades/UPGRADE_PLAN.md)
- **processTalents 升级详情** → [upgrades/UPGRADE_PLAN_V2.md](./upgrades/UPGRADE_PLAN_V2.md)
- **测试 processTalents** → [individual/processTalents/TEST_GUIDE.md](./individual/processTalents/TEST_GUIDE.md)

---

## 📝 文档编写规范

### 新增单个函数文档

如果需要为某个函数编写详细文档（升级方案、测试指南等），请按以下结构组织：

```
functions/docs/individual/<function_name>/
├── UPGRADE_PLAN_V2.md      # v2 升级方案（如有）
├── TEST_GUIDE.md            # 测试指南（如有）
└── API_REFERENCE.md         # API 参考（如有）
```

### 新增升级方案文档

所有升级相关的文档统一放在 `functions/docs/upgrades/` 目录：

```
functions/docs/upgrades/
├── UPGRADE_PLAN.md          # 整体升级方案
├── UPGRADE_PLAN_V2.md       # processTalents v2
└── <FUNCTION_NAME>_V2.md    # 其他函数的 v2 方案
```

---

## ⚠️ 重要说明

1. **不要在函数目录下随意创建 .md 文件**
   - 所有文档统一放在 `functions/docs/` 目录
   - 函数目录只保留代码文件（index.js, package.json 等）

2. **文档命名规范**
   - 使用大写加下划线：`UPGRADE_PLAN.md`, `TEST_GUIDE.md`
   - 清晰描述文档内容
   - 避免使用中文文件名

3. **更新文档索引**
   - 新增文档后，记得更新本文件（INDEX_DOCS.md）
   - 在相关文档中添加交叉引用链接

---

## 🔗 相关链接

- **数据库 Schema**：[../../database/agentworks_db/README.md](../../database/agentworks_db/README.md)
- **前端代码**：[../../frontends/README.md](../../frontends/README.md)
- **API 参考**：[../../docs/api/API_REFERENCE.md](../../docs/api/API_REFERENCE.md)

---

**维护者**：产品团队
**最后更新**：2025-11-11
