# Schema 同步完整指南

> 一图看懂：如何在 MongoDB 和 Git 之间同步 Schema

## 🗺️ 文件关系图

```
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB 数据库                          │
│                    (kol_data 数据库)                        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ projects │  │ talents  │  │ collabs  │  ...           │
│  └──────────┘  └──────────┘  └──────────┘                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 🔄 自动导出
                       │ (使用 sync-schema.sh)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  database/schemas/                          │
│                                                             │
│  ┌─────────────────────────┐                               │
│  │ talents.schema.json     │  ← 🔄 从 MongoDB 自动同步     │
│  │ (标准 JSON Schema)      │     覆盖更新                  │
│  └─────────────────────────┘                               │
│                                                             │
│  ┌─────────────────────────┐                               │
│  │ talents.doc.json        │  ← ✍️ 手动维护               │
│  │ (中文文档说明)          │     按需更新                  │
│  └─────────────────────────┘                               │
│                                                             │
│  ┌─────────────────────────┐                               │
│  │ INDEX.md                │  ← ✍️ 手动维护               │
│  │ (Schema 清单)           │     重大变更时更新            │
│  └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ 📋 索引建议
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  database/indexes/                          │
│                                                             │
│  ┌─────────────────────────┐                               │
│  │ talents.indexes.json    │  ← ✍️ 手动维护               │
│  │ (索引定义)              │     需要新索引时更新          │
│  └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 同步流程图

### 流程 1：业务迭代（MongoDB → Git）

```
┌─────────────────┐
│  1. 开发新功能  │
│  修改云函数/前端 │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  2. 部署上线    │
│  MongoDB 有新数据│
└────────┬────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│  3. 运行同步脚本                         │
│  ./database/scripts/sync-schema.sh talents│
└────────┬─────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│  4. 脚本自动    │
│  - 从 MongoDB 导出│
│  - 对比差异      │
│  - 覆盖 .schema.json│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  5. 检查提示    │  ← 脚本会提示需要手动更新的文件
└────────┬────────┘
         │
         ↓
    ┌────┴────┐
    │ 是否有  │
    │ 新字段？│
    └─┬────┬──┘
      │    │
  是 ↓    ↓ 否
┌──────────┐  ┌──────────┐
│ 6a. 更新 │  │ 6b. 直接 │
│ .doc.json│  │ 提交     │
│ (可选)   │  └────┬─────┘
└────┬─────┘       │
     │             │
     ↓             ↓
┌─────────────────────┐
│  7. Git 提交并推送  │
└─────────────────────┘
```

### 流程 2：设计新功能（Git → MongoDB）

```
┌─────────────────┐
│  1. 需求分析    │
│  设计新字段     │
└────────┬────────┘
         │
         ↓
┌──────────────────────┐
│  2. 手动编辑         │  ← ❌ 不要用脚本！
│  .schema.json        │
│  定义新字段          │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  3. 手动编辑         │
│  .doc.json           │
│  添加中文说明        │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  4. 如需索引         │
│  编辑 .indexes.json  │
└────────┬─────────────┘
         │
         ↓
┌─────────────────┐
│  5. 提交到 Git  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  6. 实现云函数  │
│  处理新字段     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  7. 前端使用    │
│  新字段         │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  8. 部署上线    │
│  MongoDB 自然有 │
│  新字段数据     │
└─────────────────┘
```

---

## 📋 决策树：我该用哪个文件？

```
需要做什么？
    │
    ├─ 从 MongoDB 同步实际数据结构
    │  └─→ 使用脚本更新 *.schema.json ✅
    │
    ├─ 添加字段的中文说明
    │  └─→ 手动编辑 *.doc.json ✅
    │
    ├─ 为字段添加索引
    │  └─→ 手动编辑 *.indexes.json ✅
    │
    ├─ 记录重大 Schema 变更
    │  └─→ 手动编辑 INDEX.md ✅
    │
    └─ 设计新功能的数据结构
       └─→ 手动编辑 *.schema.json + *.doc.json ✅
```

---

## 🎯 快速参考卡

### 命令速查表

| 场景 | 命令 |
|------|------|
| 同步单个集合 | `./database/scripts/sync-schema.sh talents` |
| 同步所有集合 | `./database/scripts/sync-schema.sh --all` |
| 预览变更 | `./database/scripts/sync-schema.sh --dry-run talents` |
| 设置连接 | `export MONGO_URI="mongodb://..."` |
| 查看变更 | `git diff database/schemas/talents.schema.json` |

### 文件操作速查表

| 操作 | 文件 | 方式 |
|------|------|------|
| 导出实际结构 | `*.schema.json` | 🔄 脚本自动 |
| 添加中文说明 | `*.doc.json` | ✍️ 手动编辑 |
| 定义索引 | `*.indexes.json` | ✍️ 手动编辑 |
| 记录变更 | `INDEX.md` | ✍️ 手动编辑 |

### 提交模板

```bash
# 纯 Schema 同步
git commit -m "chore: 同步 talents Schema 实际结构"

# Schema + 说明
git commit -m "feat: talents Schema - 新增社交媒体字段
- 添加 socialMedia 对象
- 更新中文说明和索引定义"

# 设计新功能
git commit -m "feat: 设计 talents 新字段 - vipLevel
- Schema 定义
- 中文说明
- 索引配置"
```

---

## ⚠️ 常见错误和解决方法

### 错误 1: 脚本覆盖了我手动添加的字段

**原因**: `.schema.json` 会被脚本覆盖

**解决方法**:
1. 手动添加的字段应该先在云函数中实现
2. 部署后 MongoDB 就会有该字段
3. 然后用脚本同步，字段自然会出现

### 错误 2: 中文说明丢失了

**原因**: 错误地覆盖了 `.doc.json` 文件

**解决方法**:
- `.doc.json` 文件永远不要用脚本覆盖
- 只手动编辑
- 使用 Git 恢复：`git checkout database/schemas/talents.doc.json`

### 错误 3: 索引定义被删除了

**原因**: 错误地覆盖了 `.indexes.json` 文件

**解决方法**:
- `.indexes.json` 永远不要用脚本覆盖
- 只手动编辑
- 使用 Git 恢复：`git checkout database/indexes/talents.indexes.json`

---

## 🔒 文件保护建议

### 创建 .gitattributes

在 `database/.gitattributes` 中添加：

```
# 标记文档和索引文件为手动维护
*.doc.json diff
*.indexes.json diff
INDEX.md diff

# Schema 文件可以被覆盖
*.schema.json merge=ours
```

### 添加 Git Hook（可选）

在 `.git/hooks/pre-commit` 中添加检查：

```bash
#!/bin/bash
# 检查是否意外修改了手动维护的文件

if git diff --cached --name-only | grep -E "\.doc\.json|\.indexes\.json|INDEX\.md"; then
  echo "⚠️  检测到手动维护文件的修改，请确认是有意修改"
  read -p "继续提交？(y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

---

## 📚 实战示例

### 示例 1: 定期维护

```bash
# 每月 1 号执行

# 1. 同步所有 Schema
./database/scripts/sync-schema.sh --all

# 2. 查看变更
git diff database/schemas/

# 3. 如果有重大变更，更新 INDEX.md
code database/schemas/INDEX.md

# 4. 提交
git add database/
git commit -m "chore: 定期同步所有 Schema (2025-12)"
git push
```

### 示例 2: 新功能开发

```bash
# 需求：为达人添加认证信息

# 1. 设计 Schema
code database/schemas/talents.schema.json
# 添加 verified: { type: "boolean" }

# 2. 添加说明
code database/schemas/talents.doc.json
# 添加字段中文说明

# 3. 如需索引
code database/indexes/talents.indexes.json
# 添加 verified 索引

# 4. 提交
git add database/
git commit -m "feat: talents Schema - 添加认证信息字段"
git push

# 5. 实现云函数
code functions/updateTalent/index.js

# 6. 实现前端
code talent_pool/modal-crud.js

# 7. 部署上线后，自动会有 verified 字段
```

---

## 🎓 总结

### 核心原则

1. **`.schema.json`** = MongoDB 的镜像，用脚本同步
2. **`.doc.json`** = 人类的文档，手动维护
3. **`.indexes.json`** = 索引建议，手动维护
4. **`INDEX.md`** = 总览文档，手动维护

### 记住这句话

> **自动同步数据结构，手动维护业务说明**

---

**最后更新**: 2025-11-10
**下一步**: [使用 sync-schema.sh 脚本](./scripts/README.md)
