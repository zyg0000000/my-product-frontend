# 后端API改造需求文档

## 📋 需求背景

为了让飞书表格模板能够限制可用的任务类型，需要在模板管理中增加"关联工作流"配置功能。前端已完成相关改造，现需要后端支持新字段。

---

## 🎯 核心需求

### 1. 数据库Schema变更

#### mapping_templates 集合新增字段

```javascript
{
  "_id": ObjectId("..."),
  "name": "报名表",
  "description": "达人报名信息表",
  "spreadsheetToken": "xxx",
  "feishuSheetHeaders": [...],
  "mappingRules": {...},

  // ✨ 新增字段
  "allowedWorkflowIds": [
    "68ee43b8e16e0c2c942b167f",
    "其他工作流ID..."
  ],

  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

**字段说明**：
- `allowedWorkflowIds`: 数组类型，存储允许使用此模板的工作流ID列表
- 如果数组为空 `[]`，表示不限制，所有工作流的任务都可使用
- 该字段为可选字段，旧数据兼容

---

### 2. API接口改造

#### ✅ GET /mapping-templates

**现状**：返回模板列表及其配置

**需要改动**：在返回数据中增加 `allowedWorkflowIds` 字段

**返回示例**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "template_id_xxx",
      "name": "报名表",
      "description": "达人报名信息表",
      "spreadsheetToken": "xxx",
      "feishuSheetHeaders": ["姓名", "粉丝数", ...],
      "mappingRules": {...},
      "allowedWorkflowIds": ["68ee43b8e16e0c2c942b167f"],  // ✨ 新增
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### ✅ POST /mapping-templates

**现状**：创建新模板

**需要改动**：接受请求体中的 `allowedWorkflowIds` 字段

**请求示例**：
```json
{
  "name": "报名表",
  "description": "达人报名信息表",
  "spreadsheetToken": "xxx",
  "feishuSheetHeaders": ["姓名", "粉丝数"],
  "mappingRules": {...},
  "allowedWorkflowIds": ["68ee43b8e16e0c2c942b167f"]  // ✨ 新增
}
```

**处理逻辑**：
- 如果未提供 `allowedWorkflowIds`，默认设置为 `[]`（不限制）
- 验证提供的workflowId是否有效（可选，建议实现）

---

#### ✅ PUT /mapping-templates

**现状**：更新现有模板

**需要改动**：接受请求体中的 `allowedWorkflowIds` 字段

**请求示例**：与POST相同

**处理逻辑**：
- 允许更新 `allowedWorkflowIds` 字段
- 如果请求体中未提供该字段，保持原值不变

---

#### 🆕 GET /automation-workflows（可选，但强烈建议）

**用途**：前端需要获取所有可用工作流列表，用于模板配置界面

**请求参数**：无

**返回示例**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "68ee43b8e16e0c2c942b167f",
      "name": "达人主页全面报告最新版",
      "type": "custom",
      "description": "抓取达人主页完整数据",
      "isActive": true
    },
    {
      "_id": "68fdae01656eacf1bfacb66c",
      "name": "超期视频抓取",
      "type": "custom",
      "description": "抓取发布超过14天的视频数据",
      "isActive": true
    }
  ]
}
```

**说明**：
- 如果已有此接口，则无需改动
- 如果没有，建议新增，用于：
  1. 模板配置界面显示工作流列表
  2. 前端验证workflowId有效性

---

### 3. 数据迁移

#### 为现有模板添加默认值

```javascript
// MongoDB迁移脚本示例
db.mapping_templates.updateMany(
  { allowedWorkflowIds: { $exists: false } },
  { $set: { allowedWorkflowIds: [] } }
);
```

**说明**：
- 为所有现有模板添加 `allowedWorkflowIds: []`
- 空数组表示不限制，保持现有行为不变

---

## 🔍 数据验证（可选，但推荐）

### 在生成飞书表格时验证任务匹配

**接口**：POST /generated-sheets

**验证逻辑**：
```javascript
async function validateTasksForTemplate(templateId, taskIds) {
  // 1. 获取模板配置
  const template = await MappingTemplate.findById(templateId);

  // 2. 如果没有限制，直接通过
  if (!template.allowedWorkflowIds || template.allowedWorkflowIds.length === 0) {
    return true;
  }

  // 3. 验证每个任务是否属于允许的工作流
  const tasks = await Task.find({ _id: { $in: taskIds } });

  for (const task of tasks) {
    const job = await Job.findById(task.jobId);

    if (!template.allowedWorkflowIds.includes(job.workflowId)) {
      throw new Error(
        `任务 ${task._id} 所属工作流"${job.workflowName}"不匹配模板"${template.name}"的要求`
      );
    }
  }

  return true;
}
```

**好处**：
- 防止用户通过API绕过前端限制
- 提供更友好的错误提示
- 保证数据一致性

---

## 📊 测试准备

### 测试数据

#### 1. 创建测试模板
```json
{
  "name": "测试报名表",
  "spreadsheetToken": "test_token",
  "allowedWorkflowIds": ["68ee43b8e16e0c2c942b167f"]
}
```

#### 2. 测试场景

**场景1：创建带工作流限制的模板**
- POST /mapping-templates
- 请求体包含 allowedWorkflowIds
- 预期：成功创建，返回数据包含该字段

**场景2：更新模板的工作流限制**
- PUT /mapping-templates?id=xxx
- 请求体修改 allowedWorkflowIds
- 预期：成功更新

**场景3：获取模板列表**
- GET /mapping-templates
- 预期：返回数据包含 allowedWorkflowIds 字段

**场景4：向后兼容测试**
- 使用老模板（没有 allowedWorkflowIds 字段）
- 预期：前端正常工作，显示所有任务

---

## ⚠️ 注意事项

### 1. 向后兼容
- 老模板如果没有 `allowedWorkflowIds` 字段，应视为 `[]`（不限制）
- 不要强制要求该字段必填

### 2. 数据类型
- `allowedWorkflowIds` 必须是数组类型
- 数组元素为字符串（workflowId）

### 3. 性能考虑
- 工作流列表不会频繁变化，可以考虑缓存
- 验证逻辑如果影响性能，可以异步执行

---

## 📅 实施时间表

| 阶段 | 内容 | 负责人 | 预计时间 |
|------|------|--------|---------|
| 1 | 数据库Schema变更 | 后端开发 | 0.5天 |
| 2 | API接口改造 | 后端开发 | 1天 |
| 3 | 数据迁移 | 后端开发 | 0.5天 |
| 4 | 联调测试 | 前后端 | 1天 |
| 5 | 上线部署 | DevOps | 0.5天 |

**总计**：约3-4个工作日

---

## 🤝 前端已完成

✅ mapping_templates页面工作流选择器
✅ project_automation页面任务筛选逻辑
✅ UI优化（显示工作流标签）
✅ 空状态友好提示
✅ 向后兼容处理

**等待后端**：
- allowedWorkflowIds 字段支持
- GET /automation-workflows 接口（可选）

---

## 📞 联系方式

如有疑问，请联系：
- 前端开发：Claude
- 产品经理：[待补充]
- 后端开发：[待补充]

---

**文档版本**：v1.0
**最后更新**：2025-11-02
