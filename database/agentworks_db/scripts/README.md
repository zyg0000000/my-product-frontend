# AgentWorks DB 脚本工具

> 数据库管理和 Schema 同步工具

---

## 📁 脚本列表

| 脚本 | 用途 | 状态 |
|------|------|------|
| `init-talents.js` | 初始化 talents 集合和索引 | ✅ 可用 |
| `sync-schema.sh` | 从 MongoDB 同步 Schema | ✅ 可用 |

---

## 🚀 使用指南

### 1. 初始化 talents 集合

在 MongoDB 中创建 talents 集合并添加索引。

**前置要求**：
- 已安装 `mongosh`（MongoDB Shell）
- 有访问火山引擎 MongoDB 的权限

**使用方法**：

```bash
# 方法 1：直接执行脚本
mongosh "mongodb://your-connection-string/agentworks_db" --file database/agentworks_db/scripts/init-talents.js

# 方法 2：在 mongosh 中加载
mongosh "mongodb://your-connection-string"
use agentworks_db
load('database/agentworks_db/scripts/init-talents.js')
```

**脚本会做什么**：
1. 检查 `talents` 集合是否存在
2. 创建集合（如果不存在）
3. 删除旧索引
4. 创建 8 个索引（包括核心的唯一索引）
5. 验证索引创建成功

**输出示例**：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 初始化 talents 集合 (v2.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 创建集合 talents...
✅ 集合创建成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 创建索引
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ idx_oneId
   查询某达人的所有平台账号

⭐ idx_oneId_platform
   【核心】联合唯一索引

...

成功: 8
失败: 0

✨ 初始化完成！
```

---

### 2. 从 MongoDB 同步 Schema

当 MongoDB 中有实际数据后，使用此脚本同步 Schema 定义。

**前置要求**：
- 已安装 `mongodb-schema`：`npm install -g mongodb-schema`
- 设置环境变量 `MONGO_URI`

**使用方法**：

```bash
# 设置 MongoDB 连接字符串
export MONGO_URI="mongodb://username:password@host:port/?authSource=admin"

# 同步单个集合
./database/agentworks_db/scripts/sync-schema.sh talents

# 同步所有集合
./database/agentworks_db/scripts/sync-schema.sh --all

# 预览模式（不写入文件）
./database/agentworks_db/scripts/sync-schema.sh --dry-run talents
```

**脚本会做什么**：
1. 连接到 MongoDB `agentworks_db` 数据库
2. 使用 `mongodb-schema` 分析集合结构
3. 导出 Schema 到临时文件
4. 对比现有 Schema 文件的差异
5. 更新 `.schema.json` 文件

**输出示例**：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 MongoDB Schema 同步工具 (v2.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据库: agentworks_db
连接: mongodb://...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 同步集合: talents (agentworks_db)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ 从 MongoDB 导出...
✅ 导出成功

🔍 检查变更...
✅ 无变更
```

---

## 📖 开发流程建议

### 新集合创建流程

1. **设计阶段**：手动编写 Schema
   ```bash
   # 编写 talents.doc.json（带详细注释）
   # 编写 talents.indexes.json（索引定义）
   ```

2. **初始化阶段**：在 MongoDB 创建集合
   ```bash
   # 运行初始化脚本
   mongosh "mongodb://..." --file database/agentworks_db/scripts/init-talents.js
   ```

3. **开发阶段**：前端/后端写入数据
   ```bash
   # 通过 API 或前端界面创建达人记录
   ```

4. **同步阶段**：从实际数据同步 Schema
   ```bash
   # 定期同步 Schema（验证字段变化）
   ./database/agentworks_db/scripts/sync-schema.sh talents
   ```

---

## 🔧 故障排查

### Q1: mongodb-schema 命令不存在

**错误**：
```
❌ 错误: 未安装 mongodb-schema
```

**解决方案**：
```bash
npm install -g mongodb-schema
```

---

### Q2: MongoDB 连接失败

**错误**：
```
❌ 导出失败（集合可能不存在或无数据）
```

**原因**：
- MongoDB 连接字符串错误
- 数据库或集合不存在
- 网络问题

**解决方案**：
```bash
# 1. 检查连接字符串
echo $MONGO_URI

# 2. 测试连接
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"

# 3. 检查数据库是否存在
mongosh "$MONGO_URI" --eval "db.getSiblingDB('agentworks_db').getCollectionNames()"
```

---

### Q3: 索引创建失败

**错误**：
```
❌ idx_oneId_platform
   错误: Index with name 'idx_oneId_platform' already exists with different options
```

**原因**：
- 索引已存在但配置不同

**解决方案**：
```javascript
// 在 mongosh 中手动删除索引
use agentworks_db
db.talents.dropIndex('idx_oneId_platform')

// 然后重新运行初始化脚本
```

---

## 📚 相关文档

- [Schema 定义目录](../schemas/)
- [索引定义目录](../indexes/)
- [数据库设计文档](../docs/DESIGN.md)（待编写）

---

**维护者**：产品团队
**最后更新**：2025-11-11
