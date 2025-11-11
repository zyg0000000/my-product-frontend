# 在火山引擎 MongoDB 中初始化 talents 集合

## 🎯 目标

在火山引擎 MongoDB 的 `agentworks_db` 数据库中创建 `talents` 集合并添加索引。

---

## 📋 前置准备

### 1. 获取 MongoDB 连接字符串

从火山引擎控制台获取 MongoDB 连接信息：

```
mongodb://username:password@host:port/agentworks_db?authSource=admin
```

**参数说明**：
- `username`: 数据库用户名
- `password`: 数据库密码
- `host`: MongoDB 主机地址
- `port`: 端口（默认 27017）
- `agentworks_db`: 数据库名称

### 2. 安装 mongosh

如果没有安装 MongoDB Shell，需要先安装：

**Mac**:
```bash
brew install mongosh
```

**Linux**:
```bash
# 下载并安装
wget https://downloads.mongodb.com/compass/mongosh-2.0.0-linux-x64.tgz
tar -zxvf mongosh-2.0.0-linux-x64.tgz
sudo cp mongosh-2.0.0-linux-x64/bin/mongosh /usr/local/bin/
```

**Windows**:
下载安装包：https://www.mongodb.com/try/download/shell

---

## 🚀 初始化步骤

### 方法 1：使用初始化脚本（推荐）

```bash
# 1. 进入项目根目录
cd /path/to/my-product-frontend

# 2. 设置 MongoDB 连接字符串（替换为你的实际连接信息）
MONGO_URI="mongodb://username:password@your-host:port/?authSource=admin"

# 3. 执行初始化脚本
mongosh "$MONGO_URI/agentworks_db" \
  --file database/agentworks_db/scripts/init-talents.js
```

**预期输出**：
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

✅ idx_platform
   查询某平台的所有达人

⭐ idx_oneId_platform
   【核心】联合唯一索引

✅ idx_platformAccountId
   按平台账号ID查询

✅ idx_name_text
   昵称全文搜索

✅ idx_status
   状态索引

✅ idx_createdAt
   按创建时间倒序

✅ idx_platform_status
   平台+状态复合索引

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
成功: 8
失败: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 验证索引
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
当前索引数量: 9

  - _id_
  - idx_oneId
  - idx_platform
  - idx_oneId_platform
    (唯一索引)
  - idx_platformAccountId
  - idx_name_text
  - idx_status
  - idx_createdAt
  - idx_platform_status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 初始化完成！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 方法 2：手动执行（如果脚本执行失败）

如果上述方法失败，可以手动在 mongosh 中执行：

```bash
# 1. 连接到 MongoDB
mongosh "mongodb://username:password@your-host:port/?authSource=admin"

# 2. 在 mongosh 中执行以下命令：
```

```javascript
// 切换到 agentworks_db 数据库
use agentworks_db

// 创建 talents 集合
db.createCollection('talents')

// 创建索引
db.talents.createIndex({ oneId: 1 })
db.talents.createIndex({ platform: 1 })
db.talents.createIndex({ oneId: 1, platform: 1 }, { unique: true })
db.talents.createIndex({ platformAccountId: 1 })
db.talents.createIndex({ name: 'text' })
db.talents.createIndex({ status: 1 })
db.talents.createIndex({ createdAt: -1 })
db.talents.createIndex({ platform: 1, status: 1 })

// 验证索引
db.talents.getIndexes()
```

---

## ✅ 验证初始化成功

### 1. 检查集合是否创建

```javascript
use agentworks_db
db.getCollectionNames()
// 应该能看到 'talents'
```

### 2. 检查索引

```javascript
db.talents.getIndexes()
// 应该能看到 9 个索引（包括默认的 _id_ 索引）
```

### 3. 测试唯一索引

```javascript
// 插入测试数据
db.talents.insertOne({
    oneId: "talent_00000001",
    platform: "douyin",
    platformAccountId: "dy_123456",
    name: "测试达人",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
})

// 尝试插入重复数据（应该失败）
db.talents.insertOne({
    oneId: "talent_00000001",
    platform: "douyin",  // 相同的 oneId + platform
    platformAccountId: "dy_789",
    name: "重复达人",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
})
// 应该报错: E11000 duplicate key error

// 清理测试数据
db.talents.deleteMany({ oneId: "talent_00000001" })
```

---

## 🔧 常见问题

### Q1: 连接 MongoDB 失败

**错误信息**：
```
MongoServerError: Authentication failed
```

**解决方案**：
1. 检查用户名和密码是否正确
2. 检查 `authSource` 参数（通常是 `admin`）
3. 检查防火墙或安全组设置
4. 联系火山引擎支持确认 MongoDB 访问权限

---

### Q2: 数据库不存在

**错误信息**：
```
database agentworks_db does not exist
```

**解决方案**：
MongoDB 会自动创建不存在的数据库。第一次插入数据时数据库会被创建。

---

### Q3: 索引创建失败

**错误信息**：
```
Index with name 'xxx' already exists with different options
```

**解决方案**：
```javascript
// 删除所有索引（除了 _id）
db.talents.dropIndexes()

// 重新创建索引（重新运行初始化脚本）
```

---

## 📝 初始化完成后

### 1. 创建第一个测试达人

```javascript
use agentworks_db

// 插入抖音达人
db.talents.insertOne({
    oneId: "talent_00000001",
    platform: "douyin",
    platformAccountId: "dy_123456",
    name: "张三的美食日记",
    fansCount: 1000000,
    prices: {
        video_60plus: 5000000,
        video_20to60: 3000000,
        video_1to20: 1000000
    },
    platformSpecific: {
        xingtuId: "123456",
        starLevel: 5
    },
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
})

// 插入同一达人的小红书账号
db.talents.insertOne({
    oneId: "talent_00000001",  // 相同的 oneId
    platform: "xiaohongshu",    // 不同的平台
    platformAccountId: "xhs_789012",
    name: "小张爱做菜",
    fansCount: 500000,
    prices: {
        video_60plus: 3000000
    },
    platformSpecific: {
        mcnName: "某MCN机构",
        contentTags: ["美食", "探店"]
    },
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
})

// 查询某达人的所有平台
db.talents.find({ oneId: "talent_00000001" })
```

### 2. 测试查询性能

```javascript
// 查询某平台的所有达人
db.talents.find({ platform: "douyin" }).explain("executionStats")

// 查询某达人在某平台的信息
db.talents.findOne({ oneId: "talent_00000001", platform: "douyin" })
```

---

## 🎯 下一步

初始化完成后，你可以：

1. **开始前端开发**
   - 创建达人列表页面
   - 实现按 oneId 分组展示
   - 开发达人新增/编辑功能

2. **升级云函数**
   - 修改 `getTalents` 支持 v2 数据库
   - 修改 `createTalent` 支持 oneId 逻辑

3. **初始化其他集合**
   - talent_merges（达人合并历史）
   - cooperations（合作订单）
   - projects（项目信息）

---

**文档链接**：
- [talents schema 设计](../schemas/talents.doc.json)
- [索引定义](../indexes/talents.indexes.json)
- [脚本使用指南](../scripts/README.md)

**最后更新**：2025-11-11
