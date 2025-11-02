# mapping-templates-api 版本更新日志

## v4.0 - Workflow Association Support (2025-11-02)

### 🎯 核心功能
增加了模板与工作流的关联配置功能，允许限制每个模板可用的任务类型。

### ✨ 新增功能
- **新增字段**: `allowedWorkflowIds` (数组类型)
  - 存储允许使用该模板的工作流ID列表
  - 空数组表示不限制，允许所有工作流
  - 向后兼容：旧模板未配置此字段时，前端视为不限制

### 📝 API变更

#### GET /mapping-templates
**变更**: 返回数据中包含 `allowedWorkflowIds` 字段

**返回示例**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "template_id_xxx",
      "name": "报名表",
      "spreadsheetToken": "xxx",
      "mappingRules": {...},
      "allowedWorkflowIds": ["68ee43b8e16e0c2c942b167f"],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-11-02T00:00:00Z"
    }
  ]
}
```

#### POST /mapping-templates
**变更**: 接受 `allowedWorkflowIds` 字段

**请求示例**:
```json
{
  "name": "报名表",
  "spreadsheetToken": "xxx",
  "mappingRules": {...},
  "feishuSheetHeaders": ["姓名", "粉丝数"],
  "allowedWorkflowIds": ["68ee43b8e16e0c2c942b167f"]
}
```

**处理逻辑**:
- 如果未提供 `allowedWorkflowIds`，默认设置为 `[]`（不限制）
- 如果提供但不是数组类型，返回 400 错误
- 如果提供且为数组，直接存储

#### PUT /mapping-templates
**变更**: 接受 `allowedWorkflowIds` 字段

**处理逻辑**:
- 如果请求体中提供了 `allowedWorkflowIds`，则更新该字段
- 如果请求体中未提供该字段，保持原值不变
- 如果提供但不是数组类型，返回 400 错误

### 🔄 数据库Schema变更

```javascript
// 模板文档新增字段
{
  "_id": ObjectId("..."),
  "name": "报名表",
  "description": "达人报名信息表",
  "spreadsheetToken": "xxx",
  "feishuSheetHeaders": [...],
  "mappingRules": {...},

  // ✨ v4.0 新增
  "allowedWorkflowIds": [
    "68ee43b8e16e0c2c942b167f",
    "其他工作流ID..."
  ],

  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

### 📊 数据迁移

**建议执行的迁移脚本**（可选，用于规范化旧数据）:
```javascript
// MongoDB Shell 或 Compass 中执行
db.mapping_templates.updateMany(
  { allowedWorkflowIds: { $exists: false } },
  { $set: { allowedWorkflowIds: [] } }
);
```

**注意**: 不执行迁移脚本也不影响系统运行，前端会自动处理。

### ⚠️ 向后兼容性
- ✅ **完全兼容**: 旧模板不需要强制更新
- ✅ **前端适配**: 前端已完成相应改造
  - `mapping_templates.html/js`: 工作流配置界面
  - `project_automation.js`: 任务筛选逻辑
- ✅ **数据兼容**: 未配置 `allowedWorkflowIds` 的模板自动视为不限制

### 🧪 测试场景

1. **创建带工作流限制的模板**
   ```bash
   POST /mapping-templates
   Body: { "name": "测试模板", "spreadsheetToken": "xxx", "allowedWorkflowIds": ["workflow_id_1"] }
   Expected: 201 Created, 返回数据包含 allowedWorkflowIds 字段
   ```

2. **更新模板的工作流限制**
   ```bash
   PUT /mapping-templates?id=xxx
   Body: { "allowedWorkflowIds": ["workflow_id_2", "workflow_id_3"] }
   Expected: 200 OK, allowedWorkflowIds 更新成功
   ```

3. **获取模板列表**
   ```bash
   GET /mapping-templates
   Expected: 200 OK, 所有模板数据包含 allowedWorkflowIds 字段
   ```

4. **向后兼容测试**
   ```bash
   # 使用 v3.0 创建的旧模板
   GET /mapping-templates?id=old_template_id
   Expected: 200 OK, 旧模板可能没有 allowedWorkflowIds 字段（前端自动处理）
   ```

### 🚀 部署步骤

1. **备份当前版本**
   ```bash
   # 在云函数控制台备份 v3.0 代码
   ```

2. **更新代码**
   - 将 `mapping-templates-api-v4.0.js` 的内容复制到云函数编辑器
   - 或直接上传该文件

3. **测试验证**
   - 使用测试环境验证 GET/POST/PUT 接口
   - 确认新旧模板都能正常工作

4. **发布上线**
   - 发布新版本到生产环境
   - 监控日志确认无异常

5. **数据迁移**（可选）
   - 执行上述迁移脚本规范化数据

### 📦 依赖关系
- **前端依赖**: 需配合前端 v2.0 版本使用
  - `mapping_templates.js`: 支持工作流配置
  - `project_automation.js`: 支持任务筛选
- **后端依赖**: 无额外依赖，使用现有 MongoDB 驱动

---

## v3.0 - Formula Support

### 核心功能
- 公式计算支持
- `mappingRules` 可包含公式对象
- 增强的数据验证

---

**维护者**: Claude
**文档版本**: 1.0
**最后更新**: 2025-11-02
