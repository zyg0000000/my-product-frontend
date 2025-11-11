# Database Schema 同步脚本使用指南

> 简化从 MongoDB 导出 Schema 到 Git 仓库的流程

## 📋 快速开始

### 安装依赖

```bash
# 安装 mongodb-schema 工具
npm install -g mongodb-schema
```

### 基本使用

```bash
# 同步单个集合
./database/scripts/sync-schema.sh talents

# 同步所有集合
./database/scripts/sync-schema.sh --all

# 预览变更（不实际写入）
./database/scripts/sync-schema.sh --dry-run talents
```

---

## 🗂️ 文件结构说明

### 你的 database/ 目录结构

```
database/
├── schemas/
│   ├── talents.schema.json    ← 🔄 从 MongoDB 自动同步
│   ├── talents.doc.json       ← ✍️ 手动维护（中文说明）
│   └── INDEX.md               ← ✍️ 手动维护（文档索引）
│
├── indexes/
│   └── talents.indexes.json   ← ✍️ 手动维护（索引定义）
│
└── scripts/
    ├── sync-schema.sh         ← 同步脚本
    └── README.md              ← 本文件
```

### 文件用途对照表

| 文件类型 | 自动/手动 | 何时更新 | 用途 |
|---------|---------|---------|------|
| `*.schema.json` | 🔄 自动 | MongoDB 数据变化后 | 标准 JSON Schema，用于验证 |
| `*.doc.json` | ✍️ 手动 | 需要中文说明时 | 开发参考文档 |
| `*.indexes.json` | ✍️ 手动 | 需要新索引时 | MongoDB 索引建议 |
| `INDEX.md` | ✍️ 手动 | 重大变更时 | Schema 清单和变更历史 |

---

## 🔄 完整工作流程

### 场景 1：业务迭代，MongoDB 数据结构变化

**步骤 1: 同步 Schema**

```bash
# 设置 MongoDB 连接（如果不是本地）
export MONGO_URI="mongodb://user:password@your-host:27017"

# 同步 talents 集合
./database/scripts/sync-schema.sh talents
```

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: talents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
📝 发现以下变更:
--- database/schemas/talents.schema.json
+++ /tmp/schema-sync/talents.schema.json
@@ -120,6 +120,10 @@
     "nickname": {
       "type": "string"
     },
+    "socialMedia": {
+      "type": "object",
+      "description": "社交媒体账号"
+    },
...
✅ 已更新: database/schemas/talents.schema.json

⚠️  提醒: 如果有新增或修改字段，请考虑更新:
   1. database/schemas/talents.doc.json (添加中文说明)
   2. database/indexes/talents.indexes.json (如需新索引)
   3. database/schemas/INDEX.md (如是重大变更)
```

**步骤 2: 检查变更**

```bash
# 查看具体改动
git diff database/schemas/talents.schema.json
```

**步骤 3: 决定是否更新其他文件**

根据脚本提示，判断是否需要：

- ✅ **有新增字段** → 更新 `talents.doc.json` 添加中文说明
- ✅ **需要查询新字段** → 更新 `talents.indexes.json` 添加索引
- ✅ **重大业务变更** → 更新 `INDEX.md` 记录变更历史

**步骤 4: 提交到 Git**

```bash
# 添加修改的文件
git add database/schemas/talents.schema.json

# 如果更新了其他文件
git add database/schemas/talents.doc.json      # 如果修改了
git add database/indexes/talents.indexes.json  # 如果修改了
git add database/schemas/INDEX.md              # 如果修改了

# 提交
git commit -m "feat: 同步 talents Schema - 新增社交媒体字段"
git push
```

---

### 场景 2：定期全量同步（推荐每月一次）

```bash
# 同步所有集合
./database/scripts/sync-schema.sh --all

# 检查所有变更
git diff database/schemas/

# 批量提交
git add database/schemas/*.schema.json
git commit -m "chore: 定期同步所有 Schema (2025-11)"
git push
```

---

### 场景 3：开发新功能，先定义 Schema

这种情况**不需要用脚本**，直接手动编辑：

```bash
# 1. 直接编辑 Schema 文件
code database/schemas/talents.schema.json

# 2. 添加新字段定义
# {
#   "properties": {
#     "newField": { ... }
#   }
# }

# 3. 提交到 Git
git add database/schemas/talents.schema.json
git commit -m "feat: talents Schema - 设计新字段 newField"

# 4. 在云函数和前端中实现
# 5. 部署后，新字段自然会出现在 MongoDB 中
```

---

## 🛠️ 脚本选项说明

### 基本语法

```bash
./database/scripts/sync-schema.sh [选项] [集合名称]
```

### 选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `集合名称` | 同步单个集合 | `./sync-schema.sh talents` |
| `--all` | 同步所有集合 | `./sync-schema.sh --all` |
| `--dry-run` | 预览模式（不写入） | `./sync-schema.sh --dry-run talents` |
| `-h, --help` | 显示帮助 | `./sync-schema.sh --help` |

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB 连接字符串 |

---

## 📚 常见问题

### Q1: 脚本提示 "mongodb-schema: command not found"

**答**: 需要安装 mongodb-schema 工具

```bash
npm install -g mongodb-schema
```

### Q2: 连接 MongoDB 失败

**答**: 检查并设置正确的连接字符串

```bash
# 检查连接
mongosh "mongodb://your-connection-string"

# 设置环境变量
export MONGO_URI="mongodb://user:password@host:port"

# 然后运行脚本
./database/scripts/sync-schema.sh talents
```

### Q3: *.doc.json 和 *.schema.json 有什么区别？

**答**:
- **`.schema.json`** - 标准 JSON Schema 格式，从 MongoDB 导出，用于数据验证
- **`.doc.json`** - 自定义文档格式，手动维护，包含详细的中文说明，更易读

推荐：
- 定期从 MongoDB 同步 `.schema.json`
- 按需手动更新 `.doc.json` 添加中文说明

### Q4: 什么时候需要更新 INDEX.md？

**答**: 以下情况需要更新：
- ✅ 新增集合
- ✅ 重大字段变更（如 talents v2.9 多价格类型）
- ✅ 废弃旧字段
- ✅ Schema 版本升级

普通的字段新增无需更新 INDEX.md。

### Q5: 我改了 *.schema.json，下次同步会被覆盖吗？

**答**: **会被覆盖！**

`.schema.json` 文件应该始终与 MongoDB 实际数据保持一致。如果你需要：
- **定义新字段** → 在云函数中先实现，数据自然会包含新字段
- **添加说明** → 编辑 `.doc.json` 文件，不会被覆盖

---

## 📋 最佳实践

### ✅ 推荐做法

1. **定期同步** - 每次重大功能上线后同步一次
2. **先预览再写入** - 使用 `--dry-run` 先看看变化
3. **增量提交** - 一个集合一个 commit，方便追溯
4. **配合文档** - Schema 变更时记得更新 INDEX.md

### ❌ 不推荐做法

1. ❌ 手动编辑 `.schema.json` 文件（应该从 MongoDB 导出）
2. ❌ 忘记更新 `.doc.json`（新字段没有中文说明）
3. ❌ 批量提交所有变更（难以追溯）
4. ❌ 从不同步（Schema 与实际数据不一致）

---

## 🔗 相关资源

- [database/README.md](../README.md) - 数据库总体说明
- [database/schemas/INDEX.md](../schemas/INDEX.md) - Schema 清单
- [JSON Schema 官方文档](https://json-schema.org/)
- [mongodb-schema 工具](https://github.com/mongodb-js/mongodb-schema)

---

## 📝 总结

### 文件同步策略速查表

```
从 MongoDB 导出 → *.schema.json         ← 使用脚本自动同步
需要中文说明   → *.doc.json            ← 手动编辑
需要添加索引   → *.indexes.json        ← 手动编辑
重大变更记录   → INDEX.md              ← 手动编辑
```

### 工作流程一句话总结

> **定期运行脚本同步 `.schema.json`，根据提示决定是否手动更新其他文件。**

---

**最后更新**: 2025-11-10
**维护者**: 开发团队
