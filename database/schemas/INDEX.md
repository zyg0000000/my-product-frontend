# Schema 文件索引

> 本目录包含 MongoDB 数据库 `kol_data` 的所有集合 Schema 定义

## 📋 Schema 文件说明

本目录包含两种格式的 Schema 文件：

### 1. 标准 JSON Schema 文件（*.schema.json）

使用 [JSON Schema Draft 2020-12](https://json-schema.org/) 标准格式，可用于：
- MongoDB 数据验证
- API 请求/响应验证
- 代码生成工具
- 文档自动生成

**命名规则**: `{collection-name}.schema.json`

### 2. 文档格式 Schema 文件（*.doc.json）

自定义的文档格式，包含更详细的中文说明和示例，便于：
- 快速理解数据结构
- 查看字段说明和用途
- 了解业务逻辑
- 开发参考

**命名规则**: `{collection-name}.doc.json`

---

## 📊 可用 Schema 清单

### 核心业务集合

| 集合名 | Schema 文件 | 文档文件 | 说明 | 版本 |
|--------|------------|----------|------|------|
| **projects** | [projects.schema.json](./projects.schema.json) | [projects.doc.json](./projects.doc.json) | 项目信息 | v2.0 |
| **talents** | [talents.schema.json](./talents.schema.json) | [talents.doc.json](./talents.doc.json) | 达人档案（支持多价格类型 v2.9） | v2.9 |
| **collaborations** | [collaborations.schema.json](./collaborations.schema.json) | - | 合作订单 | v1.0 |

### 自动化相关集合

| 集合名 | Schema 文件 | 文档文件 | 说明 | 版本 |
|--------|------------|----------|------|------|
| **automation-workflows** | [automation-workflows.schema.json](./automation-workflows.schema.json) | - | 自动化工作流 | v1.0 |
| **automation-jobs** | [automation-jobs.schema.json](./automation-jobs.schema.json) | - | 任务实例 | v1.0 |
| **automation-tasks** | [automation-tasks.schema.json](./automation-tasks.schema.json) | - | 自动化任务 | v1.0 |
| **task_run_logs** | [task_run_logs.schema.json](./task_run_logs.schema.json) | - | 任务运行日志 | v1.0 |
| **tasks** | [tasks.schema.json](./tasks.schema.json) | - | 任务（旧版？） | v1.0 |

### 配置和元数据集合

| 集合名 | Schema 文件 | 文档文件 | 说明 | 版本 |
|--------|------------|----------|------|------|
| **mapping_templates** | [mapping_templates.schema.json](./mapping_templates.schema.json) | - | 映射模板（v4.0 支持工作流关联） | v4.0 |
| **project_configurations** | [project_configurations.schema.json](./project_configurations.schema.json) | - | 项目配置 | v1.0 |
| **generated_sheets** | [generated_sheets.schema.json](./generated_sheets.schema.json) | - | 生成的数据表格 | v1.0 |

### 其他集合

| 集合名 | Schema 文件 | 文档文件 | 说明 | 版本 |
|--------|------------|----------|------|------|
| **works** | [works.schema.json](./works.schema.json) | - | 作品信息 | v1.0 |

---

## 🔍 如何使用 Schema

### 1. 查看 Schema 定义

```bash
# 查看标准 JSON Schema
cat database/schemas/projects.schema.json

# 查看文档格式（更易读）
cat database/schemas/projects.doc.json
```

### 2. 使用 JSON Schema 验证数据

```javascript
const Ajv = require('ajv');
const schema = require('./database/schemas/projects.schema.json');

const ajv = new Ajv();
const validate = ajv.compile(schema);

const data = { id: 'proj_123', name: '测试项目', ... };
const valid = validate(data);

if (!valid) {
  console.log(validate.errors);
}
```

### 3. 在 MongoDB 中应用 Schema 验证

```javascript
db.createCollection('projects', {
  validator: {
    $jsonSchema: require('./database/schemas/projects.schema.json')
  }
});
```

---

## 📝 重要 Schema 变更

### v2.9 - 多价格类型系统（talents）

**变更时间**: 2025-10

**变更说明**: talents.prices 数组新增 `type` 字段

**影响的字段**:
```json
{
  "prices": [
    {
      "year": 2025,
      "month": 11,
      "type": "60s_plus",  // 新增字段
      "price": 110000,
      "status": "confirmed"
    }
  ]
}
```

**价格类型枚举**:
- `60s_plus` - 60s+ 长视频
- `20_to_60s` - 20-60s 中等视频
- `1_to_20s` - 1-20s 短视频

**迁移脚本**: [../migrations/001_add_price_type.js](../migrations/001_add_price_type.js)

---

### v4.0 - 模板工作流关联（mapping_templates）

**变更时间**: 2025-11

**变更说明**: mapping_templates 新增 `allowedWorkflowIds` 字段

**影响的字段**:
```json
{
  "allowedWorkflowIds": ["workflow_123", "workflow_456"]  // 新增字段
}
```

---

## 🔗 相关资源

- [Database README](../README.md) - 数据库总体说明
- [Migrations](../migrations/) - 数据迁移脚本
- [Indexes](../indexes/) - 索引定义
- [MongoDB 官方文档](https://docs.mongodb.com/)
- [JSON Schema 官方文档](https://json-schema.org/)

---

## ⚠️ 注意事项

1. **标准 Schema 文件优先** - 如有冲突，以 `*.schema.json` 为准
2. **Schema 仅供参考** - MongoDB 是无 Schema 数据库，这些定义用于验证和文档
3. **修改需谨慎** - Schema 变更可能影响现有数据和应用
4. **同步更新文档** - 修改 Schema 后记得更新对应的 .doc.json 文件
5. **版本控制** - 重大变更需要在迁移脚本中体现

---

**最后更新**: 2025-11-10
**维护者**: 开发团队
