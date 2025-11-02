# mapping-templates-api v4.0 部署包

## 📦 包含文件

| 文件名 | 用途 | 必需性 |
|--------|------|--------|
| **mapping-templates-api-v4.0.js** | 云函数主代码 | ✅ 必需 |
| **mapping-templates-api-v4.0-CHANGELOG.md** | 完整更新日志 | 📄 参考 |
| **mapping-templates-api-v4.0-DEPLOYMENT.md** | 详细部署指南 | 📖 推荐阅读 |
| **mapping-templates-migration-script.js** | 数据迁移脚本 | ⚙️ 可选 |
| **mapping-templates-api-v4.0-README.md** | 本文件（快速参考） | 📋 概览 |

---

## 🚀 5分钟快速部署

### 1️⃣ 备份当前版本
在云函数控制台创建 v3.0 备份版本

### 2️⃣ 部署新代码
将 `mapping-templates-api-v4.0.js` 的内容复制到云函数的 `index.js`

### 3️⃣ 测试验证
```bash
# 测试 GET
curl "https://your-api-url/mapping-templates"

# 测试 POST（创建带工作流限制的模板）
curl -X POST "https://your-api-url/mapping-templates" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","spreadsheetToken":"xxx","mappingRules":{},"allowedWorkflowIds":["workflow_id"]}'
```

### 4️⃣ 发布上线
点击"发布"，版本号填 v4.0

### 5️⃣ 数据迁移（可选）
在 MongoDB Compass 中执行：
```javascript
db.mapping_templates.updateMany(
  { allowedWorkflowIds: { $exists: false } },
  { $set: { allowedWorkflowIds: [] } }
)
```

---

## ✨ v4.0 新功能

### 核心特性
模板现在可以关联特定工作流，限制可用的任务类型

### 新增字段
```javascript
{
  "allowedWorkflowIds": ["workflowId1", "workflowId2"],  // 新增
  // ... 其他字段保持不变
}
```

### API 变化

**GET** /mapping-templates
- ✅ 返回数据包含 `allowedWorkflowIds`

**POST** /mapping-templates
- ✅ 接受 `allowedWorkflowIds` 参数（可选，默认为 `[]`）

**PUT** /mapping-templates
- ✅ 接受 `allowedWorkflowIds` 参数（可选，不提供则保持原值）

---

## 🔄 向后兼容性

| 场景 | 兼容性 | 说明 |
|------|--------|------|
| v3.0 创建的旧模板 | ✅ 完全兼容 | 前端自动处理为"不限制" |
| v3.0 客户端调用 v4.0 API | ✅ 完全兼容 | 新字段会被忽略 |
| v4.0 客户端调用 v4.0 API | ✅ 完整支持 | 全部新功能可用 |

**结论**: 可以放心部署，不会影响现有功能 ✅

---

## 📋 验证清单

部署后快速验证：

- [ ] GET 请求返回 `allowedWorkflowIds` 字段
- [ ] POST 请求可以创建带工作流限制的模板
- [ ] PUT 请求可以更新工作流限制
- [ ] 旧模板仍可正常读取和编辑
- [ ] 前端 mapping_templates 页面工作流配置功能正常
- [ ] 前端 project_automation 页面任务筛选功能正常

---

## 🆘 问题排查

### 部署后报错？
1. 检查云函数日志
2. 确认 MongoDB 连接正常
3. 验证 JSON 格式正确

### 旧模板不显示？
这是正常的，因为缺少新字段。执行迁移脚本或让前端自动处理。

### 回滚到 v3.0？
在云函数控制台的"版本管理"中找到备份版本，点击"发布此版本"。

---

## 📚 详细文档

- **完整更新日志**: 查看 `mapping-templates-api-v4.0-CHANGELOG.md`
- **详细部署指南**: 查看 `mapping-templates-api-v4.0-DEPLOYMENT.md`
- **数据迁移方案**: 查看 `mapping-templates-migration-script.js`

---

## 🎯 部署优先级

### 必须完成
1. ✅ 部署 v4.0 云函数代码
2. ✅ 基础功能验证

### 建议完成
3. 📊 执行数据迁移（统一数据格式）
4. 🧪 全面功能测试

### 可选任务
5. 📝 更新团队文档
6. 📊 监控性能指标

---

## 版本信息

- **当前版本**: v4.0
- **上一版本**: v3.0 (Formula Support)
- **发布日期**: 2025-11-02
- **兼容性**: 向后兼容 v3.0

---

## 快速链接

- [火山引擎云函数控制台](https://console.volcengine.com/cloud_function)
- GitHub 仓库: https://github.com/zyg0000000/my-cloud-functions

---

**准备好部署了吗？** 🚀

按照上面的步骤操作即可，如有问题请查看详细文档。
