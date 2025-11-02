# mapping-templates-api v4.0 部署指南

## 📦 部署包内容

本次更新包含以下文件：

1. **mapping-templates-api-v4.0.js** - 主代码文件（部署到云函数）
2. **mapping-templates-api-v4.0-CHANGELOG.md** - 完整更新日志
3. **mapping-templates-migration-script.js** - 数据迁移脚本（可选）
4. **mapping-templates-api-v4.0-DEPLOYMENT.md** - 本部署指南

---

## 🚀 快速部署（火山引擎云函数）

### 步骤1: 备份当前版本

在云函数控制台：
1. 进入 mapping-templates-api 函数详情页
2. 点击"版本管理" → "创建版本"
3. 备注填写: "v3.0-backup-20251102"
4. 点击"创建"保存备份

### 步骤2: 更新代码

**方式A: 在线编辑器**
1. 点击"代码管理" → "在线编辑"
2. 复制 `mapping-templates-api-v4.0.js` 的完整内容
3. 粘贴替换 `index.js` 的内容
4. 点击"保存"

**方式B: 上传文件**
1. 点击"代码管理" → "上传代码"
2. 将 `mapping-templates-api-v4.0.js` 重命名为 `index.js`
3. 打包为 zip（确保 index.js 在根目录）
4. 上传 zip 文件

### 步骤3: 测试验证

在部署前测试（推荐）：

```bash
# 1. 测试 GET - 获取所有模板
curl -X GET "https://your-api-gateway-url.volceapi.com/mapping-templates"

# 2. 测试 POST - 创建带 allowedWorkflowIds 的模板
curl -X POST "https://your-api-gateway-url.volceapi.com/mapping-templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试模板v4",
    "spreadsheetToken": "test_token_123",
    "mappingRules": {},
    "allowedWorkflowIds": ["68ee43b8e16e0c2c942b167f"]
  }'

# 3. 测试 PUT - 更新模板
curl -X PUT "https://your-api-gateway-url.volceapi.com/mapping-templates?id=TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试模板v4",
    "spreadsheetToken": "test_token_123",
    "mappingRules": {},
    "allowedWorkflowIds": ["workflowId1", "workflowId2"]
  }'

# 4. 验证响应包含 allowedWorkflowIds 字段
```

### 步骤4: 发布上线

1. 确认测试通过后，点击"发布"
2. 选择版本号: v4.0
3. 填写发布说明: "新增工作流关联功能"
4. 点击"确认发布"

### 步骤5: 监控日志

发布后立即查看日志：
1. 点击"日志查询"
2. 观察是否有错误信息
3. 确认新旧请求都能正常处理

---

## 🔄 数据迁移（可选）

### 是否需要迁移？

**不需要迁移的情况：**
- ✅ 前端已做向后兼容处理
- ✅ 旧模板不影响系统运行
- ✅ 用户编辑旧模板时会自动添加字段

**建议迁移的情况：**
- 📊 想统一数据格式
- 🔍 方便数据分析和查询
- 🧹 保持数据库结构整洁

### 迁移方式选择

#### 方式1: MongoDB Compass（推荐）

1. 打开 MongoDB Compass，连接到数据库
2. 选择 `kol_data` 数据库 → `mapping_templates` 集合
3. 点击顶部的 "Aggregations" 或直接进入 Shell
4. 执行以下命令：

```javascript
// 查看需要迁移的数量
db.mapping_templates.countDocuments({ allowedWorkflowIds: { $exists: false } })

// 执行迁移
db.mapping_templates.updateMany(
  { allowedWorkflowIds: { $exists: false } },
  { $set: { allowedWorkflowIds: [] } }
)

// 验证结果
db.mapping_templates.find({}, { name: 1, allowedWorkflowIds: 1 })
```

#### 方式2: Node.js 脚本

1. 修改 `mapping-templates-migration-script.js` 中的 MONGO_URI
2. 安装依赖: `npm install mongodb`
3. 执行脚本: `node mapping-templates-migration-script.js`
4. 查看输出确认迁移成功

#### 方式3: 临时云函数端点

如果无法直接访问数据库，参考 `mapping-templates-migration-script.js` 中的方式3，在云函数中添加临时迁移端点。

⚠️ **注意：迁移完成后立即删除临时端点！**

---

## ✅ 验证清单

部署完成后，逐项验证：

- [ ] **GET /mapping-templates** - 返回数据包含 allowedWorkflowIds 字段
- [ ] **POST /mapping-templates** - 可以创建带 allowedWorkflowIds 的模板
- [ ] **PUT /mapping-templates** - 可以更新 allowedWorkflowIds 字段
- [ ] **向后兼容** - v3.0 创建的旧模板仍可正常获取和编辑
- [ ] **前端集成** - mapping_templates 页面工作流配置功能正常
- [ ] **前端集成** - project_automation 页面任务筛选功能正常
- [ ] **错误处理** - allowedWorkflowIds 不是数组时返回 400 错误
- [ ] **日志无异常** - 云函数日志无错误信息

---

## 🔙 回滚方案

如果发现问题需要回滚：

### 快速回滚到 v3.0

1. 进入云函数控制台
2. 点击"版本管理"
3. 找到 "v3.0-backup-20251102"
4. 点击"发布此版本"
5. 确认发布

### 数据回滚（如果执行了迁移）

```javascript
// 删除 v4.0 添加的 allowedWorkflowIds 字段
db.mapping_templates.updateMany(
  {},
  { $unset: { allowedWorkflowIds: "" } }
)
```

⚠️ **注意：只在确实需要时执行数据回滚**

---

## 📊 预期影响分析

### 对现有功能的影响

| 功能 | 影响 | 说明 |
|------|------|------|
| 模板列表获取 | ✅ 无影响 | 新增字段自动返回 |
| 模板创建 | ✅ 无影响 | 支持新字段，旧方式仍可用 |
| 模板编辑 | ✅ 无影响 | 支持新字段，旧方式仍可用 |
| 模板删除 | ✅ 无影响 | 无任何变化 |
| v3.0 客户端 | ✅ 兼容 | 新字段会被忽略，不影响功能 |
| v4.0 客户端 | ✅ 正常 | 完整支持新功能 |

### 性能影响

- **查询性能**: ✅ 无影响（字段很小，为数组类型）
- **存储空间**: ✅ 几乎无影响（每个模板增加 < 1KB）
- **网络传输**: ✅ 无明显影响

---

## 🆘 常见问题

### Q1: 部署后旧模板不显示怎么办？

**A**: 这是正常的，因为旧模板没有 `allowedWorkflowIds` 字段。前端会自动处理为"允许所有工作流"。如果想统一显示，执行数据迁移脚本。

### Q2: 能否只部署前端，暂不部署后端？

**A**: 不建议。前端 v2.0 会发送 `allowedWorkflowIds` 字段，但 v3.0 后端会忽略该字段。建议同步部署。

### Q3: 如果我已经有其他字段的自定义，会冲突吗？

**A**: 不会。v4.0 只新增了 `allowedWorkflowIds` 字段，不影响其他自定义字段。

### Q4: 迁移脚本执行失败怎么办？

**A**:
1. 检查 MongoDB 连接字符串是否正确
2. 确认有足够的权限执行 updateMany
3. 查看错误日志定位问题
4. 也可以不执行迁移，系统仍能正常工作

### Q5: v4.0 和 v3.0 能否同时运行？

**A**: 技术上可以（例如蓝绿部署），但不推荐。建议直接替换，因为向后兼容性已确保。

---

## 📞 技术支持

如遇到问题，请检查：

1. **日志查询**: 云函数控制台 → 日志查询
2. **网络请求**: 浏览器开发者工具 → Network
3. **数据库状态**: MongoDB Compass 或 Shell

联系方式：
- 开发者: Claude (AI Assistant)
- 文档版本: v1.0
- 更新日期: 2025-11-02

---

## 📝 部署记录

请在部署完成后填写：

```
部署时间: _______________
部署人员: _______________
环境: [ ] 测试环境  [ ] 生产环境
版本: v4.0
是否执行迁移: [ ] 是  [ ] 否
验证结果: [ ] 通过  [ ] 未通过
备注: _________________________________
```

---

**祝部署顺利！** 🎉
