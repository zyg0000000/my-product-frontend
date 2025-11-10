# Schema 同步实践演示

> 📺 通过真实示例学习如何使用脚本

## 📖 演示目录

1. [演示环境](#演示环境)
2. [场景 1: 第一次同步](#场景-1-第一次同步)
3. [场景 2: 发现新字段](#场景-2-发现新字段)
4. [场景 3: 字段被删除](#场景-3-字段被删除)
5. [场景 4: 批量同步](#场景-4-批量同步)

---

## 演示环境

假设你的环境：
- MongoDB: `mongodb://admin:password@mongodb.example.com:27017`
- 数据库: `kol_data`
- 集合: `talents`, `projects`, `collaborations` 等

---

## 场景 1: 第一次同步

### 背景

你刚刚设置好 Monorepo 架构，想要从 MongoDB 同步实际的数据结构。

### 操作步骤

```bash
# 步骤 1: 设置连接
export MONGO_URI="mongodb://admin:password@mongodb.example.com:27017"

# 步骤 2: 先预览（不会实际写入）
cd /home/user/my-product-frontend
./database/scripts/sync-schema.sh --dry-run talents
```

### 预期输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 MongoDB Schema 同步工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据库: kol_data
连接: mongodb://admin:***@mongodb.example.com:27017
目标目录: database/schemas
预览模式: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: talents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
✅ 无变更

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 同步完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
成功: 1
失败: 0
```

### 解读

- ✅ **导出成功** - 成功连接 MongoDB 并导出了 Schema
- ✅ **无变更** - MongoDB 的结构和 Git 中的一致
- **预览模式** - 因为加了 `--dry-run`，所以即使有变更也不会写入

### 后续操作

```bash
# 如果确认连接正常，去掉 --dry-run 实际执行
./database/scripts/sync-schema.sh talents
```

---

## 场景 2: 发现新字段

### 背景

你在云函数中为 `talents` 集合新增了 `socialMedia` 字段并部署上线。现在想同步这个变更到 Git。

### 操作步骤

```bash
# 同步 talents 集合
./database/scripts/sync-schema.sh talents
```

### 预期输出

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
@@ -218,6 +218,16 @@
     "xingtuId": {
       "type": "string"
     }
+  },
+  "socialMedia": {
+    "type": "object",
+    "properties": {
+      "weibo": {
+        "type": "string"
+      },
+      "xiaohongshu": {
+        "type": "string"
+      }
+    }
   }
 },

✅ 已更新: database/schemas/talents.schema.json

⚠️  提醒: 如果有新增或修改字段，请考虑更新:
   1. database/schemas/talents.doc.json (添加中文说明)
   2. database/indexes/talents.indexes.json (如需新索引)
   3. database/schemas/INDEX.md (如是重大变更)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 同步完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
成功: 1
失败: 0

📋 后续步骤:
1. 检查变更: git diff database/schemas/
2. 更新相关文件（如需要）
3. 提交到 Git: git add database/ && git commit
```

### 解读

- 📝 **发现变更** - 检测到新增了 `socialMedia` 字段
- **差异显示** - 用类似 `git diff` 的格式显示具体变化
- ✅ **已更新** - 文件已被更新
- ⚠️ **提醒** - 脚本提示你可能需要更新其他文件

### 后续操作

#### 步骤 1: 检查变更

```bash
git diff database/schemas/talents.schema.json
```

输出：
```diff
+  "socialMedia": {
+    "type": "object",
+    "properties": {
+      "weibo": { "type": "string" },
+      "xiaohongshu": { "type": "string" }
+    }
+  }
```

#### 步骤 2: 更新中文说明（可选但推荐）

```bash
code database/schemas/talents.doc.json
```

添加：
```json
{
  "fields": {
    "socialMedia": {
      "type": "Object",
      "description": "社交媒体账号信息",
      "properties": {
        "weibo": "微博账号",
        "xiaohongshu": "小红书账号ID"
      },
      "example": {
        "weibo": "@达人微博",
        "xiaohongshu": "12345678"
      }
    }
  }
}
```

#### 步骤 3: 添加索引（如需要）

如果你经常需要通过微博账号查询达人：

```bash
code database/indexes/talents.indexes.json
```

添加：
```json
{
  "indexes": [
    {
      "name": "idx_talent_weibo",
      "keys": { "socialMedia.weibo": 1 },
      "sparse": true,
      "comment": "微博账号索引"
    }
  ]
}
```

#### 步骤 4: 提交到 Git

```bash
# 添加所有修改的文件
git add database/schemas/talents.schema.json
git add database/schemas/talents.doc.json      # 如果修改了
git add database/indexes/talents.indexes.json  # 如果修改了

# 提交
git commit -m "feat: talents Schema - 新增社交媒体账号字段

- 添加 socialMedia 对象字段
- 包含 weibo 和 xiaohongshu 子字段
- 更新中文说明和索引定义"

# 推送
git push
```

---

## 场景 3: 字段被删除

### 背景

同步时发现某个字段在 Schema 中消失了。这可能是因为 MongoDB 中没有任何文档包含这个字段。

### 操作步骤

```bash
./database/scripts/sync-schema.sh projects
```

### 预期输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: projects
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
📝 发现以下变更:
--- database/schemas/projects.schema.json
+++ /tmp/schema-sync/projects.schema.json
@@ -110,10 +110,6 @@
     "qianchuanId": {
       "type": "string"
     },
-    "oldField": {
-      "type": "string",
-      "description": "旧字段"
-    },

✅ 已更新: database/schemas/projects.schema.json
```

### ⚠️ 警告！需要仔细检查

字段被删除可能有两个原因：

**原因 1: 该字段确实已废弃** ✅
- 业务逻辑变更，不再使用这个字段
- MongoDB 中所有文档都删除了这个字段
- **处理方式**: 接受变更，提交

**原因 2: MongoDB 采样不足** ❌
- mongodb-schema 工具默认只采样部分文档
- 如果该字段只在少数文档中存在，可能被遗漏
- **处理方式**: 手动恢复或扩大采样

### 处理方式

#### 方式 1: 验证字段是否存在

```bash
# 在 MongoDB 中检查
mongosh "$MONGO_URI/kol_data" --eval "
  db.projects.countDocuments({ oldField: { \$exists: true } })
"
```

如果返回 `0`，说明确实没有这个字段了。
如果返回 `> 0`，说明字段还存在，需要手动恢复。

#### 方式 2: 恢复字段（如果误删）

```bash
# 恢复文件
git checkout database/schemas/projects.schema.json

# 或手动编辑文件，重新添加字段定义
```

#### 方式 3: 接受变更（如果确认废弃）

```bash
git add database/schemas/projects.schema.json
git commit -m "chore: projects Schema - 移除废弃字段 oldField"
git push
```

---

## 场景 4: 批量同步

### 背景

每月 1 号进行一次全量同步，确保所有 Schema 与实际数据一致。

### 操作步骤

```bash
# 同步所有集合
./database/scripts/sync-schema.sh --all
```

### 预期输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 MongoDB Schema 同步工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据库: kol_data
连接: mongodb://...
目标目录: database/schemas
预览模式: false

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: projects
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
✅ 无变更

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: talents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
📝 发现以下变更:
[显示变更...]
✅ 已更新: database/schemas/talents.schema.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: collaborations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
✅ 无变更

... (其他集合)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 同步完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
成功: 11
失败: 1

📋 后续步骤:
1. 检查变更: git diff database/schemas/
2. 更新相关文件（如需要）
3. 提交到 Git: git add database/ && git commit
```

### 后续操作

```bash
# 查看所有变更
git diff database/schemas/

# 如果有多个文件变更，批量添加
git add database/schemas/*.schema.json

# 提交
git commit -m "chore: 月度 Schema 全量同步 (2025-11)

同步集合:
- talents: 新增 socialMedia 字段
- projects: 无变更
- collaborations: 无变更
- ... (其他集合)"

# 推送
git push
```

---

## 💡 实践建议

### 何时使用预览模式？

✅ **推荐使用 --dry-run**：
- 第一次使用脚本
- 长时间未同步（超过 1 个月）
- 进行全量同步（--all）
- 不确定会有什么变更

❌ **可以不用 --dry-run**：
- 定期同步（每周一次）
- 只同步单个集合
- 确认无重大变更

### 如何处理冲突？

如果多人同时修改 Schema 文件：

```bash
# 1. 先拉取最新代码
git pull origin main

# 2. 如果有冲突，解决冲突
git diff database/schemas/talents.schema.json

# 3. 重新同步
./database/scripts/sync-schema.sh talents

# 4. 检查并提交
git add database/schemas/talents.schema.json
git commit -m "chore: 同步 talents Schema（解决冲突）"
git push
```

### 如何避免误删字段？

1. **先预览** - 使用 `--dry-run` 查看变更
2. **验证删除** - 用 mongosh 确认字段是否真的不存在
3. **保留历史** - 在 INDEX.md 中记录字段废弃信息

```markdown
### 已废弃字段

| 字段名 | 集合 | 废弃时间 | 原因 |
|--------|------|----------|------|
| oldField | projects | 2025-11 | 业务逻辑变更，不再使用 |
```

---

## 🎓 学到了什么？

完成这些演示后，你应该掌握：

- ✅ 如何连接 MongoDB
- ✅ 如何使用预览模式
- ✅ 如何解读脚本输出
- ✅ 如何处理新增字段
- ✅ 如何处理字段删除
- ✅ 如何批量同步
- ✅ 如何提交到 Git

---

## 🚀 下一步

现在你可以：

1. **实际操作** - 在你的环境中运行一次
2. **建立习惯** - 每周或每次上线后同步一次
3. **文档维护** - 配合更新 .doc.json 和 INDEX.md

---

**记住**：

> 脚本只更新 .schema.json，其他文件需要手动维护

**有问题？** 查看：
- [快速开始](./QUICKSTART.md)
- [完整教程](./TUTORIAL.md)
- [流程指南](./SCHEMA_SYNC_GUIDE.md)

祝你使用愉快！🎉
