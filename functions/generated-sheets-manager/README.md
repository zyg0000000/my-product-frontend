# generated-sheets-manager 云函数

> 飞书表格生成历史记录管理

## 📋 功能概述

管理 `project_automation` 页面中"飞书表格生成记录"的 CRUD 操作。

## 🔧 核心功能

- ✅ **查询记录**: 获取指定项目的所有飞书表格生成记录
- ✅ **创建记录**: 保存新生成的飞书表格信息
- ✅ **删除记录**: 删除历史记录并处理飞书文件
- ✅ **数据迁移**: 批量导入历史记录

## 📖 API 接口

### 1. 查询记录
```http
GET /generated-sheets?projectId={projectId}
```

**响应**:
```json
{
  "data": [
    {
      "_id": "6911afa...",
      "projectId": "proj123",
      "fileName": "达人数据表",
      "sheetUrl": "https://...",
      "sheetToken": "shtcn...",
      "createdBy": "user@company.com",
      "createdAt": "2025-11-24T10:00:00.000Z"
    }
  ]
}
```

### 2. 创建记录
```http
POST /generated-sheets
Content-Type: application/json

{
  "projectId": "proj123",
  "fileName": "达人数据表",
  "sheetUrl": "https://...",
  "sheetToken": "shtcn...",
  "createdBy": "user@company.com"
}
```

### 3. 删除记录（核心功能）
```http
DELETE /generated-sheets?id={recordId}
```

**删除流程**:
1. 从数据库查询记录，获取 `sheetToken`
2. 调用飞书 API 将文件移动到回收站
3. 删除数据库中的记录

**特殊处理**:
- ✅ 文件不存在 (404) → 继续删除数据库记录
- ✅ 权限不足 (1062501) → 跳过飞书删除，直接删除数据库记录
- ❌ 其他错误 → 中断操作，返回错误

---

## 🐛 Bug 修复 (v2.1.0)

### 问题描述
**错误信息**:
```
删除飞书文件失败：operate node no permission. (Code: 1062501)
```

### 问题原因分析

#### 直接原因
原代码使用 `DELETE /drive/v1/files/{file_token}` API，该 API 在某些情况下会报权限错误。

#### 深层原因（多种可能）

虽然表格是通过飞书 API 复制创建（理论上应用有权限），但以下情况会导致删除失败：

1. **文件被移动** - 用户手动移动文件到其他文件夹后，权限继承关系改变
2. **文件被共享** - 文件被共享给其他用户，所有权或权限发生变化
3. **文件夹权限** - 文件所在文件夹的权限被修改
4. **已在回收站** - 文件已被手动删除，在回收站中再次删除会报错
5. **应用权限变更** - 飞书应用的权限配置被管理员修改
6. **API 行为变化** - 飞书 API 的权限检查逻辑可能更新

**关键点**: 即使文件最初由应用创建，后续的用户操作也可能导致权限失效

### 解决方案

#### 方案 1: 移动到回收站 API（已采用）✅
```javascript
// 改用移动到回收站 API
POST /drive/v1/files/{file_token}/trash
{
  "type": "sheet"
}
```

**优点**:
- ✅ 只需 tenant_access_token
- ✅ 文件进入回收站，可恢复
- ✅ 符合安全最佳实践

#### 方案 2: 针对权限错误特殊处理（兜底方案）✅
```javascript
if (feishuCode === 1062501) {
  // 权限不足时，跳过飞书删除，直接删除数据库记录
  console.warn('Permission denied. Proceeding to delete local record.');
}
```

**原因**:
- 文件可能已被手动删除
- 文件所有者改变
- 应用权限配置变化

### 修复内容

#### 变更 1: 更新 API 端点
```javascript
// ❌ 之前（会报权限错误）
axios.delete(`/drive/v1/files/${sheetToken}`, {
  params: { type: 'sheet' }
});

// ✅ 现在（使用移动到回收站）
axios.post(`/drive/v1/files/${sheetToken}/trash`, {
  type: 'sheet'
});
```

#### 变更 2: 增加权限错误处理
```javascript
} else if (feishuCode === 1062501) {
  // 权限不足：可能是文件已被删除或无权访问
  // 这种情况下，我们直接删除数据库记录
  console.warn(`Permission denied (Code: 1062501). Proceeding to delete local record.`);
}
```

#### 变更 3: 优化错误日志
```javascript
console.error('Feishu API Error Details:', {
  status,
  code: feishuCode,
  message: feishuMsg,
  sheetToken
});
```

---

## 🔐 权限配置

### 必需的飞书应用权限
1. **云文档**:
   - `drive:drive:readonly` - 读取云文档
   - `drive:drive:readwrite` - 写入云文档（创建/编辑）

2. **回收站**:
   - `drive:trash:write` - 移动文件到回收站

### 环境变量配置
```env
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=xxxxx
MONGODB_URI=mongodb+srv://...
```

---

## 🧪 测试

### 测试场景

#### 场景 1: 正常删除
```bash
# 文件存在且有权限
DELETE /generated-sheets?id=6911afa...

# 预期结果
✅ 文件移动到回收站
✅ 数据库记录删除
✅ 返回 204 No Content
```

#### 场景 2: 文件不存在
```bash
# 文件已被手动删除
DELETE /generated-sheets?id=6911afa...

# 预期结果
⚠️  飞书返回 404
✅ 数据库记录删除
✅ 返回 204 No Content
```

#### 场景 3: 权限不足（修复后）
```bash
# 权限错误 Code: 1062501
DELETE /generated-sheets?id=6911afa...

# 预期结果（v2.1.0）
⚠️  飞书返回 1062501
✅ 跳过飞书删除
✅ 数据库记录删除
✅ 返回 204 No Content
```

#### 场景 4: 其他飞书错误
```bash
# 网络错误等
DELETE /generated-sheets?id=6911afa...

# 预期结果
❌ 飞书返回错误
❌ 中断操作
❌ 返回 502 错误信息
```

---

## 📊 版本历史

### v2.1.0 (2025-11-24) - 权限修复
- 🐛 修复删除飞书文件权限问题
- 🔄 改用移动到回收站 API
- ⚠️ 针对权限错误特殊处理
- 📝 优化错误日志

### v2.0.0 (之前) - 飞书文件删除
- ✨ 新增飞书文件删除功能
- 🔒 先删云端，再删本地
- 📦 引入 axios 依赖

### v1.0.0 (更早) - 基础功能
- ✨ 历史记录 CRUD
- 📦 MongoDB 集成

---

## 🚀 部署说明

### 部署步骤
1. 提交代码到 GitHub
2. 在 VSCode 中使用火山引擎插件部署
3. 确认环境变量已配置
4. 测试删除功能

### 回滚方案
如果新版本有问题，可以回滚到 v2.0.0：
```bash
git checkout <commit-hash> -- functions/generated-sheets-manager/index.js
# 重新部署
```

---

## 📝 相关文档

- [云函数开发规范](../../docs/agentworks/DEVELOPMENT_GUIDELINES.md#云函数开发规范)
- [飞书开放平台文档](https://open.feishu.cn/document/home/index)
- [飞书云文档 API](https://open.feishu.cn/document/server-docs/docs/drive-v1/file/delete)

---

**当前版本**: v2.1.0
**最后更新**: 2025-11-24
**维护者**: Claude Code

🤖 Generated with [Claude Code](https://claude.com/claude-code)
