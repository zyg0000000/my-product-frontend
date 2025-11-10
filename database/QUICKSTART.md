# Schema 同步快速开始指南

> ⚡ 5分钟快速上手

## 📍 在哪里执行这些操作？

**在你的本地 Mac 电脑的「终端」应用中执行**

如果你是第一次使用，或者不确定如何准备环境，请先阅读：
👉 **[Mac 用户完整设置指南](./MAC_SETUP.md)** - 从零开始的详细教程

---

## 🎯 快速检查清单

在开始之前，确保：

```bash
# 1. 检查是否安装 mongodb-schema
mongodb-schema --version
# 如果提示 "command not found"，运行: npm install -g mongodb-schema

# 2. 准备 MongoDB 连接字符串
# 格式: mongodb://username:password@host:port
# 或: mongodb+srv://username:password@cluster.mongodb.net

# 3. 测试连接（确保能连上）
mongosh "your-mongodb-connection-string"
```

---

## 🚀 三步上手

### 第 1 步：设置连接

```bash
# 临时设置（本次会话有效）
export MONGO_URI="mongodb://your-connection-string"

# 验证设置
echo $MONGO_URI
```

### 第 2 步：预览变更（安全）

```bash
# 进入项目目录（替换成你的实际路径）
cd ~/Documents/my-product-frontend

# 预览单个集合的变更（不会实际写入）
./database/scripts/sync-schema.sh --dry-run talents
```

**看到什么？**
- ✅ 绿色 = 成功
- 📝 黄色 = 有变更
- ❌ 红色 = 错误

### 第 3 步：实际同步

确认预览结果没问题后：

```bash
# 去掉 --dry-run，实际同步
./database/scripts/sync-schema.sh talents

# 查看变更
git diff database/schemas/talents.schema.json

# 提交
git add database/schemas/talents.schema.json
git commit -m "chore: 同步 talents Schema"
git push
```

---

## 📋 常用命令速查

| 命令 | 说明 |
|------|------|
| `./sync-schema.sh talents` | 同步单个集合 |
| `./sync-schema.sh --all` | 同步所有集合 |
| `./sync-schema.sh --dry-run talents` | 预览模式（推荐先用这个）|
| `./sync-schema.sh --help` | 查看帮助 |

---

## 🎯 你只需要记住

### 哪些文件会被更新？

```
✅ 会被更新（脚本自动）:
   database/schemas/*.schema.json

❌ 不会被更新（手动维护）:
   database/schemas/*.doc.json
   database/indexes/*.indexes.json
   database/schemas/INDEX.md
```

### 基本流程

```
同步 → 检查 → 更新相关文件(可选) → 提交
```

---

## ⚠️ 第一次使用注意

1. **先用预览模式** - 加上 `--dry-run` 看看会发生什么
2. **小范围测试** - 先同步一个小集合，比如 `projects`
3. **检查变更** - 用 `git diff` 查看具体改动
4. **理解提示** - 脚本会告诉你还需要更新哪些文件

---

## 🆘 遇到问题？

### 错误：连接失败

```bash
# 检查连接字符串
echo $MONGO_URI

# 测试连接
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"
```

### 错误：mongodb-schema: command not found

```bash
# 安装工具
npm install -g mongodb-schema

# 如果 npm 没有权限，用 sudo
sudo npm install -g mongodb-schema
```

### 看不懂输出？

查看详细教程：
```bash
cat database/TUTORIAL.md
# 或在编辑器中打开
code database/TUTORIAL.md
```

---

## 🎓 下一步

- 📖 [完整教程](./TUTORIAL.md) - 详细的实战演练
- 🗺️ [流程指南](./SCHEMA_SYNC_GUIDE.md) - 可视化流程图
- 📚 [使用说明](./scripts/README.md) - 完整文档

---

**现在就试试吧！** 🚀

```bash
# 从一个简单的集合开始
./database/scripts/sync-schema.sh --dry-run projects
```
