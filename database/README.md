# 数据库 Schema 定义 (Database Schemas)

> 本目录包含 MongoDB 数据库的 Schema 定义和数据迁移脚本

## 🚀 Schema 同步工具

**想要从 MongoDB 同步最新的 Schema？请查看以下教程：**

| 文档 | 适用场景 | 阅读时间 |
|------|---------|---------|
| 📖 [Mac 用户完整设置指南](./MAC_SETUP.md) | 🌟 **首次使用必读**，从零开始设置环境 | 15 分钟 |
| ⚡ [快速开始指南](./QUICKSTART.md) | 已完成环境设置，快速上手 | 5 分钟 |
| 🎓 [实战教程](./TUTORIAL.md) | 详细的使用教程和最佳实践 | 30 分钟 |
| 🎬 [场景演示](./DEMO.md) | 4 个真实场景的完整演示 | 20 分钟 |
| 🗺️ [流程指南](./SCHEMA_SYNC_GUIDE.md) | 可视化流程图和决策树 | 10 分钟 |

**快速命令：**
```bash
# 设置 MongoDB 连接
export MONGO_URI="mongodb://用户名:密码@主机:端口/?authSource=admin&..."

# 同步单个集合
./database/scripts/sync-schema.sh talents

# 同步所有集合
./database/scripts/sync-schema.sh --all
```

---

## 📁 目录说明

```
database/
├── README.md              # 本文件
│
├── schemas/               # 数据库 Schema 定义
│   ├── INDEX.md           # Schema 文件索引（推荐先看）
│   ├── _template.json     # Schema 模板
│   ├── *.schema.json      # 标准 JSON Schema 文件（12个）
│   ├── *.doc.json         # 文档格式 Schema（易读）
│   └── ...
│
├── indexes/               # 索引定义
│   ├── projects.indexes.json
│   ├── talents.indexes.json
│   ├── collaborations.indexes.json
│   └── ...
│
└── migrations/            # 数据迁移脚本
    ├── _template.js       # 迁移脚本模板
    └── ...
```

## 🗄️ 数据库信息

- **数据库名称**: `kol_data`
- **数据库类型**: MongoDB (NoSQL)
- **主要集合**: 14 个（详见下方）

## 📊 集合列表

> 💡 **完整的 Schema 清单和详细说明请查看**: [schemas/INDEX.md](./schemas/INDEX.md)

### ✅ 已迁移的 Schema（12个集合）

**迁移时间**: 2025-11-10
**格式**: JSON Schema Draft 2020-12
**来源**: mongodb-schemas 仓库

### 核心业务集合

| 集合名 | 说明 | Schema 文件 | 版本 |
|--------|------|------------|------|
| `projects` | 项目信息 | [projects.schema.json](./schemas/projects.schema.json) | v2.0 |
| `collaborations` | 合作订单 | [collaborations.schema.json](./schemas/collaborations.schema.json) | v1.0 |
| `talents` | 达人档案 🔥 **支持多价格类型** | [talents.schema.json](./schemas/talents.schema.json) | **v2.9** |

### 自动化相关集合

| 集合名 | 说明 | Schema 文件 | 版本 |
|--------|------|------------|------|
| `automation-workflows` | 自动化工作流 | [automation-workflows.schema.json](./schemas/automation-workflows.schema.json) | v1.0 |
| `automation-jobs` | 任务实例 | [automation-jobs.schema.json](./schemas/automation-jobs.schema.json) | v1.0 |
| `automation-tasks` | 自动化任务 | [automation-tasks.schema.json](./schemas/automation-tasks.schema.json) | v1.0 |
| `task_run_logs` | 任务运行日志 | [task_run_logs.schema.json](./schemas/task_run_logs.schema.json) | v1.0 |
| `tasks` | 任务（旧版） | [tasks.schema.json](./schemas/tasks.schema.json) | v1.0 |

### 配置和元数据集合

| 集合名 | 说明 | Schema 文件 | 版本 |
|--------|------|------------|------|
| `mapping_templates` | 映射模板 🔥 **支持工作流关联** | [mapping_templates.schema.json](./schemas/mapping_templates.schema.json) | **v4.0** |
| `project_configurations` | 项目配置 | [project_configurations.schema.json](./schemas/project_configurations.schema.json) | v1.0 |
| `generated_sheets` | 生成的数据表格 | [generated_sheets.schema.json](./schemas/generated_sheets.schema.json) | v1.0 |

### 其他集合

| 集合名 | 说明 | Schema 文件 | 版本 |
|--------|------|------------|------|
| `works` | 作品信息 | [works.schema.json](./schemas/works.schema.json) | v1.0 |

## 📝 Schema 文件格式

每个 Schema 文件采用 JSON 格式定义，包含以下字段：

```json
{
    "collection": "集合名称",
    "description": "集合说明",
    "database": "kol_data",
    "fields": {
        "_id": {
            "type": "ObjectId",
            "description": "MongoDB 文档 ID",
            "required": true,
            "auto": true
        },
        "id": {
            "type": "String",
            "description": "业务 ID",
            "required": true,
            "unique": true
        },
        "name": {
            "type": "String",
            "description": "名称",
            "required": true
        },
        "createdAt": {
            "type": "Date",
            "description": "创建时间",
            "required": true,
            "default": "now"
        }
    },
    "indexes": [
        {
            "fields": { "id": 1 },
            "unique": true
        }
    ],
    "version": "1.0",
    "lastUpdated": "2025-11-10"
}
```

### 字段类型说明

| 类型 | MongoDB 类型 | 说明 | 示例 |
|------|--------------|------|------|
| String | String | 字符串 | `"项目名称"` |
| Integer | Number | 整数 | `100000` |
| Double | Number | 浮点数 | `0.15` |
| Boolean | Boolean | 布尔值 | `true` |
| Date | Date | 日期时间 | `"2025-11-10T00:00:00Z"` |
| ObjectId | ObjectId | MongoDB ID | `ObjectId("...")` |
| Array | Array | 数组 | `[1, 2, 3]` |
| Object | Object | 嵌套对象 | `{ "key": "value" }` |

## 🔍 索引定义

索引文件位于 `indexes/` 目录，格式如下：

```json
{
    "collection": "projects",
    "indexes": [
        {
            "name": "idx_project_id",
            "fields": { "id": 1 },
            "unique": true
        },
        {
            "name": "idx_project_status",
            "fields": { "status": 1 }
        },
        {
            "name": "idx_project_time",
            "fields": { "financialYear": 1, "financialMonth": 1 }
        }
    ]
}
```

## 🔄 数据迁移

数据迁移脚本位于 `migrations/` 目录，命名规则：

```
[序号]_[简短描述].js

示例:
001_add_price_type.js
002_update_talent_schema.js
003_add_workflow_field.js
```

### 迁移脚本模板

```javascript
/**
 * 迁移脚本: 001_add_price_type
 * 日期: 2025-11-10
 * 说明: 为达人价格添加 type 字段
 */

async function up(db) {
    console.log('开始迁移: 添加 price type 字段...');

    const talents = db.collection('talents');

    await talents.updateMany(
        { 'prices.type': { $exists: false } },
        { $set: { 'prices.$[].type': '60s_plus' } }
    );

    console.log('迁移完成！');
}

async function down(db) {
    console.log('回滚迁移: 移除 price type 字段...');

    const talents = db.collection('talents');

    await talents.updateMany(
        {},
        { $unset: { 'prices.$[].type': '' } }
    );

    console.log('回滚完成！');
}

module.exports = { up, down };
```

## 📚 Schema 文档详情

### 1. projects（项目信息）

存储项目基本信息、预算、状态等。

**关键字段：**
- `id` - 项目唯一标识
- `name` - 项目名称
- `budget` - 项目预算
- `status` - 项目状态（执行中、已完成等）
- `financialYear` / `financialMonth` - 财务年月
- `benchmarkCPM` - 基准 CPM 值

**关联：**
- 一对多关联 `collaborations`（通过 `projectId`）

### 2. collaborations（合作订单）

存储达人合作订单信息。

**关键字段：**
- `id` - 订单唯一标识
- `projectId` - 所属项目 ID
- `talentId` - 达人 ID
- `amount` - 合作金额
- `rebate` - 返点率
- `status` - 订单状态
- `publishDate` - 视频发布日期
- `taskId` / `videoId` - 星图任务/视频 ID

**关联：**
- 多对一关联 `projects`（通过 `projectId`）
- 多对一关联 `talents`（通过 `talentId`）

### 3. talents（达人档案）

存储达人基本信息、价格、返点等。

**关键字段：**
- `id` - 达人唯一标识
- `nickname` - 达人昵称
- `xingtuId` - 星图 ID
- `talentTier` - 达人等级（头部、腰部、尾部）
- `prices` - 价格数组（支持多价格类型）
  - `year` / `month` - 价格年月
  - `type` - 价格类型（60s_plus / 20_to_60s / 1_to_20s）
  - `price` - 价格金额
  - `status` - 价格状态（confirmed / provisional）
- `rebates` - 返点率数组

**价格类型说明：**
- `60s_plus` - 60s+ 长视频
- `20_to_60s` - 20-60s 中等视频
- `1_to_20s` - 1-20s 短视频

### 4. automation-workflows（自动化工作流）

存储自动化工作流定义。

**关键字段：**
- `id` - 工作流 ID
- `name` - 工作流名称
- `steps` - 步骤数组
- `enabled` - 是否启用

## 🔗 数据关系图

```
projects (项目)
    ├── collaborations (合作订单) [projectId]
    │       └── talents (达人) [talentId]
    └── tasks (任务) [关联项目]
            └── task_run_logs (执行日志)

automation-workflows (工作流)
    └── automation-jobs (任务实例)
            └── task_run_logs (执行日志)
```

## 🛠️ 使用说明

### 1. 查看 Schema

```bash
# 查看特定集合的 Schema
cat database/schemas/projects.json
```

### 2. 应用索引

```javascript
// 在 MongoDB 中应用索引
const indexes = require('./database/indexes/projects.indexes.json');
db.collection('projects').createIndexes(indexes.indexes);
```

### 3. 执行迁移

```javascript
// 执行迁移脚本
const migration = require('./database/migrations/001_add_price_type.js');
migration.up(db);
```

## 📖 参考文档

- [MongoDB 官方文档](https://docs.mongodb.com/)
- [云函数 API 文档](../docs/api/API_REFERENCE.md)
- [原 Schema 仓库](https://github.com/zyg0000000/mongodb-schemas) - 仅供历史参考

## ⚠️ 注意事项

1. **Schema 定义仅供参考** - MongoDB 是无 Schema 数据库，这些定义用于文档和验证
2. **修改 Schema 需谨慎** - 修改字段可能影响现有数据和云函数
3. **迁移脚本需测试** - 在生产环境执行前务必在测试环境验证
4. **保持文档同步** - Schema 变更时及时更新文档

---

**最后更新**: 2025-11-10
**维护者**: 开发团队
