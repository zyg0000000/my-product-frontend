# Schema 同步脚本 - 实战教程

> 🎓 手把手教你如何从 MongoDB 同步 Schema 到 Git 仓库

## 📋 教程大纲

1. [环境准备](#环境准备) - 5分钟
2. [第一次使用](#第一次使用) - 10分钟
3. [实际场景演练](#实际场景演练) - 15分钟
4. [常见问题](#常见问题) - 参考

---

## 环境准备

### 步骤 1: 安装 mongodb-schema 工具

这个工具用于从 MongoDB 导出 JSON Schema 格式的数据结构。

```bash
# 使用 npm 全局安装
npm install -g mongodb-schema

# 验证安装
mongodb-schema --version
```

**预期输出**：
```
6.x.x  (版本号可能不同)
```

### 步骤 2: 准备 MongoDB 连接信息

你需要知道你的 MongoDB 连接字符串。格式如下：

```bash
# 本地 MongoDB（无密码）
mongodb://localhost:27017

# 远程 MongoDB（有密码）
mongodb://username:password@host:port

# MongoDB Atlas（云数据库）
mongodb+srv://username:password@cluster.mongodb.net

# 火山引擎 MongoDB
mongodb://username:password@your-volcengine-host:port
```

**测试连接**：
```bash
# 使用 mongosh 测试连接
mongosh "your-mongodb-uri"

# 如果能连接成功，说明连接字符串正确
```

### 步骤 3: 设置环境变量（推荐）

```bash
# 临时设置（当前终端会话有效）
export MONGO_URI="mongodb://your-connection-string"

# 或者永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export MONGO_URI="mongodb://your-connection-string"' >> ~/.bashrc
source ~/.bashrc
```

**✅ 检查点**：
- ✅ mongodb-schema 工具已安装
- ✅ MongoDB 连接字符串已准备
- ✅ 能成功连接到 MongoDB

---

## 第一次使用

### 演示 1: 查看帮助信息

```bash
cd /home/user/my-product-frontend
./database/scripts/sync-schema.sh --help
```

**输出示例**：
```
用法: ./sync-schema.sh [选项] [集合名称]

从 MongoDB 导出 Schema 并同步到 Git 仓库

选项:
  --all              同步所有集合
  --dry-run          预览变更但不写入文件
  -h, --help         显示此帮助信息

示例:
  ./sync-schema.sh talents          # 同步单个集合
  ./sync-schema.sh --all            # 同步所有集合
  ./sync-schema.sh --dry-run talents # 预览变更
```

### 演示 2: 预览模式（不会实际写入）

预览模式用于查看变更，但不会实际修改文件，非常适合第一次尝试。

```bash
# 预览 talents 集合的变更
./database/scripts/sync-schema.sh --dry-run talents
```

**预期输出**：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 MongoDB Schema 同步工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据库: kol_data
连接: mongodb://...
目标目录: database/schemas
预览模式: true

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
+    "newField": {
+      "type": "string",
+      "description": "新增字段示例"
+    },

🔍 [预览模式] 不会写入文件

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 同步完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
成功: 1
失败: 0
```

**理解输出**：
- 🔍 **检查变更** - 对比当前文件和 MongoDB 的差异
- 📝 **发现变更** - 显示具体的差异（类似 git diff）
- 🔍 **预览模式** - 不会实际写入文件

### 演示 3: 实际同步单个集合

确认预览结果后，去掉 `--dry-run` 进行实际同步：

```bash
# 实际同步 talents 集合
./database/scripts/sync-schema.sh talents
```

**预期输出**：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: talents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ 从 MongoDB 导出...
✅ 导出成功
🔍 检查变更...
📝 发现以下变更:
[显示差异...]

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

**✅ 检查点**：
- ✅ 脚本成功运行
- ✅ talents.schema.json 已更新
- ✅ 理解了脚本的输出含义

---

## 实际场景演练

### 场景 1: 业务迭代后同步 Schema

**背景**：你在云函数中新增了一个字段 `socialMedia`，部署上线后 MongoDB 已经有了这个字段的数据。

#### 步骤 1: 同步 Schema

```bash
# 同步 talents 集合
./database/scripts/sync-schema.sh talents
```

#### 步骤 2: 检查变更

```bash
# 查看具体改动
git diff database/schemas/talents.schema.json
```

**输出示例**：
```diff
   "nickname": {
     "type": "string"
   },
+  "socialMedia": {
+    "type": "object",
+    "properties": {
+      "weibo": { "type": "string" },
+      "xiaohongshu": { "type": "string" }
+    }
+  },
```

#### 步骤 3: 决定是否更新其他文件

根据脚本提示和实际情况：

**3a. 如果新字段需要中文说明** → 更新 `.doc.json`

```bash
code database/schemas/talents.doc.json
```

在文件中添加：
```json
{
  "collection": "talents",
  "fields": {
    // ... 现有字段 ...
    "socialMedia": {
      "type": "Object",
      "description": "社交媒体账号信息",
      "example": {
        "weibo": "@达人微博",
        "xiaohongshu": "达人小红书ID"
      }
    }
  }
}
```

**3b. 如果需要为新字段创建索引** → 更新 `.indexes.json`

```bash
code database/indexes/talents.indexes.json
```

添加索引定义：
```json
{
  "indexes": [
    // ... 现有索引 ...
    {
      "name": "idx_talent_weibo",
      "keys": { "socialMedia.weibo": 1 },
      "sparse": true,
      "comment": "微博账号索引（稀疏索引）"
    }
  ]
}
```

**3c. 如果是重大变更** → 更新 `INDEX.md`

```bash
code database/schemas/INDEX.md
```

在变更历史中添加：
```markdown
### v2.10 - 社交媒体账号（talents）

**变更时间**: 2025-11-15
**变更说明**: talents 新增 socialMedia 对象字段

**影响的字段**:
- `socialMedia.weibo` - 微博账号
- `socialMedia.xiaohongshu` - 小红书账号
- `socialMedia.bilibili` - B站账号
```

#### 步骤 4: 提交到 Git

```bash
# 添加修改的文件
git add database/schemas/talents.schema.json

# 如果更新了其他文件也一起添加
git add database/schemas/talents.doc.json      # 如果修改了
git add database/indexes/talents.indexes.json  # 如果修改了
git add database/schemas/INDEX.md              # 如果修改了

# 提交
git commit -m "feat: 同步 talents Schema - 新增社交媒体账号字段"

# 推送
git push
```

---

### 场景 2: 定期全量同步（月度维护）

**背景**：每月 1 号进行一次全量同步，确保所有 Schema 与实际数据一致。

```bash
# 1. 同步所有集合
./database/scripts/sync-schema.sh --all

# 2. 查看所有变更
git diff database/schemas/

# 3. 如果有变更，批量提交
git add database/schemas/*.schema.json
git commit -m "chore: 定期同步所有 Schema (2025-11)"
git push
```

**⏱️ 预计耗时**：约 2-3 分钟（取决于集合数量）

---

### 场景 3: 仅预览不写入（安全检查）

**背景**：在正式同步前，先看看有哪些变更。

```bash
# 预览所有集合的变更
./database/scripts/sync-schema.sh --dry-run --all

# 或预览单个集合
./database/scripts/sync-schema.sh --dry-run talents
```

**用途**：
- ✅ 在执行前确认变更内容
- ✅ 检查是否有意外的字段删除
- ✅ 评估变更影响

---

## 常见问题

### Q1: 如何连接到远程 MongoDB？

**答**: 设置环境变量

```bash
# 方式 1: 临时设置（推荐用于测试）
export MONGO_URI="mongodb://username:password@host:port"
./database/scripts/sync-schema.sh talents

# 方式 2: 在命令中直接设置
MONGO_URI="mongodb://..." ./database/scripts/sync-schema.sh talents
```

### Q2: 脚本提示 "集合可能不存在或无数据"

**可能原因**：
1. 集合名称拼写错误
2. 数据库连接失败
3. 集合确实为空

**解决方法**：

```bash
# 检查连接
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"

# 列出所有集合
mongosh "$MONGO_URI/kol_data" --eval "db.getCollectionNames()"

# 检查集合是否有数据
mongosh "$MONGO_URI/kol_data" --eval "db.talents.countDocuments()"
```

### Q3: 我手动编辑了 .schema.json，再运行脚本会被覆盖吗？

**答**: **会被覆盖！**

`.schema.json` 文件应该始终与 MongoDB 保持一致。如果你需要：

- **设计新字段** → 先在云函数中实现，部署后自然会有数据
- **添加说明** → 编辑 `.doc.json` 文件

### Q4: 如何只同步特定的几个集合？

**答**: 多次运行脚本

```bash
./database/scripts/sync-schema.sh talents
./database/scripts/sync-schema.sh projects
./database/scripts/sync-schema.sh collaborations
```

或者创建一个批处理脚本：

```bash
#!/bin/bash
collections=("talents" "projects" "collaborations")
for col in "${collections[@]}"; do
  ./database/scripts/sync-schema.sh "$col"
done
```

### Q5: 同步后发现字段缺少了，怎么办？

**可能原因**：
- MongoDB 中确实没有这个字段的数据（所有文档都没有）
- mongodb-schema 工具采样不足

**解决方法**：

```bash
# 1. 检查 MongoDB 中是否有该字段
mongosh "$MONGO_URI/kol_data" --eval "
  db.talents.findOne({ 'fieldName': { \$exists: true } })
"

# 2. 如果确实有数据，手动恢复字段定义
git diff database/schemas/talents.schema.json
git checkout database/schemas/talents.schema.json  # 恢复旧版本
```

### Q6: 能否自动更新 .doc.json 和 .indexes.json？

**答**: **不能，也不应该。**

这些文件包含人工编写的说明和设计决策，应该手动维护。脚本只负责同步实际的数据结构（.schema.json）。

### Q7: 多人协作时如何避免冲突？

**建议流程**：

1. **约定同步时间** - 例如每周一早上由一个人统一同步
2. **先拉取再同步** - 确保基于最新代码
3. **及时提交** - 同步后立即提交，避免积累

```bash
# 标准流程
git pull origin main
./database/scripts/sync-schema.sh --all
git add database/schemas/*.schema.json
git commit -m "chore: 周度 Schema 同步 (2025-11-15)"
git push
```

---

## 💡 最佳实践

### ✅ 推荐做法

1. **定期同步** - 每周或每次重大功能上线后同步
2. **先预览再写入** - 使用 `--dry-run` 先看看变化
3. **增量提交** - 一个集合一个 commit，方便追溯
4. **配合文档** - Schema 变更时记得更新相关文档

### ❌ 不推荐做法

1. ❌ 手动编辑 `.schema.json` 文件
2. ❌ 忘记更新 `.doc.json` 中文说明
3. ❌ 批量提交所有变更（难以追溯）
4. ❌ 长期不同步（Schema 与实际数据不一致）

---

## 🎓 进阶技巧

### 技巧 1: 创建快捷命令

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# Schema 同步快捷命令
alias schema-sync='cd /path/to/my-product-frontend && ./database/scripts/sync-schema.sh'
alias schema-sync-all='cd /path/to/my-product-frontend && ./database/scripts/sync-schema.sh --all'
```

使用：
```bash
schema-sync talents
schema-sync-all
```

### 技巧 2: 创建 Git 钩子自动检查

在 `.git/hooks/pre-commit` 中添加：

```bash
#!/bin/bash
# 检查 Schema 文件是否同步

if [ -f "database/schemas/talents.schema.json" ]; then
  # 检查是否有超过 7 天未更新的 Schema
  last_modified=$(git log -1 --format=%ct database/schemas/talents.schema.json)
  current_time=$(date +%s)
  days_diff=$(( ($current_time - $last_modified) / 86400 ))

  if [ $days_diff -gt 7 ]; then
    echo "⚠️  提醒: talents.schema.json 已超过 7 天未同步"
    echo "建议运行: ./database/scripts/sync-schema.sh talents"
  fi
fi
```

### 技巧 3: 监控 Schema 变更

创建一个监控脚本 `database/scripts/check-schema-drift.sh`：

```bash
#!/bin/bash
# 检查 Schema 是否与 MongoDB 一致

./database/scripts/sync-schema.sh --dry-run --all | grep "发现以下变更"
if [ $? -eq 0 ]; then
  echo "⚠️  检测到 Schema 不一致，建议同步"
  exit 1
else
  echo "✅ Schema 与 MongoDB 一致"
  exit 0
fi
```

---

## 📚 相关资源

- [使用说明](./scripts/README.md) - 脚本详细文档
- [流程指南](./SCHEMA_SYNC_GUIDE.md) - 可视化流程
- [Schema 清单](./schemas/INDEX.md) - 所有 Schema 列表

---

## 🎯 总结

### 记住这个流程

```
1. 运行脚本 → ./database/scripts/sync-schema.sh talents
2. 检查变更 → git diff database/schemas/talents.schema.json
3. 更新相关 → talents.doc.json (可选), talents.indexes.json (可选)
4. 提交代码 → git add && git commit && git push
```

### 核心原则

> **只用脚本更新 .schema.json，其他文件手动维护**

---

**准备好了吗？** 现在你可以开始第一次实战同步了！

建议从一个小的集合开始，比如 `projects` 或 `talents`。

```bash
# 第一次尝试（预览模式）
./database/scripts/sync-schema.sh --dry-run talents

# 确认无误后实际执行
./database/scripts/sync-schema.sh talents
```

有任何问题随时查看本教程或相关文档！🚀

---

**最后更新**: 2025-11-10
**下一步**: [开始你的第一次同步](#第一次使用)
