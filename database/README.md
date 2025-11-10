# 数据库 Schema 定义 (Database Schemas)

> 本目录包含 MongoDB 数据库的 Schema 定义和数据迁移脚本

## 📁 目录说明

```
database/
├── README.md              # 本文件
│
├── schemas/               # 数据库 Schema 定义
│   ├── projects.json      # projects 集合
│   ├── collaborations.json# collaborations 集合
│   ├── talents.json       # talents 集合
│   ├── tasks.json         # tasks 集合
│   └── ...                # 其他集合
│
├── indexes/               # 索引定义
│   ├── projects.indexes.json
│   └── ...
│
└── migrations/            # 数据迁移脚本
    ├── 001_add_price_type.js
    └── ...
```

## 🗄️ 数据库信息

- **数据库名称**: `kol_data`
- **数据库类型**: MongoDB (NoSQL)
- **主要集合**: 14 个（详见下方）

## 📊 集合列表

### 核心业务集合

| 集合名 | 说明 | Schema 文件 |
|--------|------|------------|
| `projects` | 项目信息 | [schemas/projects.json](./schemas/projects.json) |
| `collaborations` | 合作订单 | [schemas/collaborations.json](./schemas/collaborations.json) |
| `talents` | 达人档案 | [schemas/talents.json](./schemas/talents.json) |

### 自动化相关集合

| 集合名 | 说明 | Schema 文件 |
|--------|------|------------|
| `tasks` | 自动化任务 | [schemas/tasks.json](./schemas/tasks.json) |
| `automation-workflows` | 自动化工作流 | [schemas/automation-workflows.json](./schemas/automation-workflows.json) |
| `automation-jobs` | 任务实例 | [schemas/automation-jobs.json](./schemas/automation-jobs.json) |
| `task_run_logs` | 任务运行日志 | [schemas/task_run_logs.json](./schemas/task_run_logs.json) |

### 配置和元数据集合

| 集合名 | 说明 | Schema 文件 |
|--------|------|------------|
| `mapping_templates` | 映射模板 | [schemas/mapping_templates.json](./schemas/mapping_templates.json) |
| `project_configurations` | 项目配置 | [schemas/project_configurations.json](./schemas/project_configurations.json) |
| `generated_sheets` | 生成的数据表格 | [schemas/generated_sheets.json](./schemas/generated_sheets.json) |

### 其他集合

| 集合名 | 说明 | Schema 文件 |
|--------|------|------------|
| `works` | 作品信息 | [schemas/works.json](./schemas/works.json) |
| `daily_stats` | 每日数据统计 | [schemas/daily_stats.json](./schemas/daily_stats.json) |
| `feishu_sync_logs` | 飞书同步日志 | [schemas/feishu_sync_logs.json](./schemas/feishu_sync_logs.json) |

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
