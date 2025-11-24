# 飞书表格删除问题诊断指南

> v2.2.0 诊断模式 - 定位权限问题的根本原因

## 🎯 使用本指南

当删除飞书表格历史记录时出现权限错误，请按照以下步骤诊断。

---

## 📊 步骤 1: 收集诊断信息

### 1.1 部署云函数 v2.2.0
确保部署了最新版本的 `generated-sheets-manager` (v2.2.0)，该版本包含详细的诊断日志。

### 1.2 触发错误并查看响应
1. 在 `project_automation` 页面点击删除按钮
2. 打开浏览器控制台（F12）
3. 查看 Network 标签中的 DELETE 请求
4. 查看响应内容

**预期响应格式**:
```json
{
  "error": "FEISHU_PERMISSION_ERROR",
  "message": "飞书 API 权限错误 (Code: 1062501)",
  "details": {
    "sheetToken": "shtcnXXXXXXXXX",
    "httpStatus": 400,
    "feishuCode": 1062501,
    "feishuMessage": "operate node no permission",
    "recordId": "6911afa...",
    "fileName": "项目名称 - 模板名称",
    "sheetUrl": "https://...",
    "createdAt": "2025-11-24T10:00:00.000Z",
    "errorType": "PERMISSION_DENIED"
  },
  "suggestion": "请检查：1. 文件是否被移动 2. 文件是否在回收站 3. 飞书应用权限配置"
}
```

### 1.3 查看云函数日志
在火山引擎控制台查看 `generated-sheets-manager` 云函数日志，应该能看到：

```
[v2.2.0] 云函数开始执行 - Method: DELETE
[v2.2.0] 请求参数: { method: 'DELETE', queryParams: { id: '...' } }
[v2.2.0] 查询到的记录: { ... }
[v2.2.0] 准备删除的 sheetToken: shtcnXXXX
[v2.2.0] ========== 开始飞书 API 调用 ==========
[v2.2.0] SheetToken: shtcnXXXX
[v2.2.0] API URL: https://open.feishu.cn/open-apis/drive/v1/files/shtcnXXXX/trash
[v2.2.0] ========== 飞书 API 调用失败 ==========
[v2.2.0] HTTP Status: 400
[v2.2.0] Feishu Code: 1062501
[v2.2.0] Feishu Message: operate node no permission
```

---

## 🔍 步骤 2: 根据错误类型诊断

### 错误类型 A: PERMISSION_DENIED (Code: 1062501)

**可能原因**:

#### 原因 1: 文件被移动到其他文件夹
**检查方法**:
1. 从诊断信息中获取 `sheetToken`
2. 在飞书云文档中搜索该 Token（URL 地址栏输入）:
   ```
   https://bytedance.feishu.cn/sheets/{sheetToken}
   ```
3. 查看文件当前所在文件夹
4. 检查该文件夹的权限设置

**解决方案**:
- 将文件移回原位置
- 或在新位置的文件夹中给应用添加管理权限

#### 原因 2: 文件已在回收站
**检查方法**:
1. 打开飞书云文档
2. 点击左侧"回收站"
3. 搜索文件名（从诊断信息的 `fileName` 获取）

**解决方案**:
- 在回收站中彻底删除该文件
- 或从回收站恢复文件后再删除

#### 原因 3: 文件权限被修改
**检查方法**:
1. 打开文件
2. 点击右上角"更多" → "权限设置"
3. 查看"谁可以访问"列表
4. 检查应用机器人是否在列表中

**解决方案**:
- 给应用机器人添加"管理员"或"编辑者"权限
- 或将文件所有者改为应用机器人

#### 原因 4: 飞书应用权限配置变化
**检查方法**:
1. 登录飞书管理后台
2. 企业应用 → 找到你的应用
3. 权限管理 → 查看以下权限：
   - `drive:drive:readonly` - 查看云文档
   - `drive:drive:readwrite` - 编辑云文档
   - `drive:trash:write` - 移动到回收站

**解决方案**:
- 添加缺失的权限
- 重新审批权限申请

---

### 错误类型 B: FILE_NOT_FOUND (404 或 Code: 1061045)

**原因**: 文件已被彻底删除或 Token 无效

**检查方法**:
1. 尝试访问文件 URL（从 `sheetUrl` 获取）
2. 查看是否提示"文件不存在"

**解决方案**:
- 这种情况下删除数据库记录即可（v2.2.0 会自动处理）

---

## 🛠 步骤 3: 临时解决方案

如果需要立即清理数据库记录，可以使用以下方法：

### 方法 1: 手动删除数据库记录
```javascript
// 在 MongoDB 中直接删除
db.generated_sheets.deleteOne({ _id: ObjectId("6911afa...") })
```

### 方法 2: 修改云函数为宽容模式
如果确定文件无法删除，可以临时修改云函数：

```javascript
// 在权限错误处理中
} else if (feishuCode === 1062501 || feishuCode === 1061045) {
    // 临时方案：跳过飞书删除，直接删除数据库记录
    console.warn(`[v${VERSION}] 权限错误，跳过飞书删除`);
    await collection.deleteOne({ _id: new ObjectId(id) });
    return createResponse(204, {});
}
```

---

## 🔬 步骤 4: 深度诊断

### 4.1 测试飞书 API 权限

创建一个测试脚本验证应用权限：

```javascript
// test-feishu-permission.js
const axios = require('axios');

async function testPermission(sheetToken) {
    // 1. 获取 token
    const tokenResponse = await axios.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        {
            app_id: 'YOUR_APP_ID',
            app_secret: 'YOUR_APP_SECRET'
        }
    );
    const token = tokenResponse.data.tenant_access_token;

    console.log('✅ Token 获取成功');

    // 2. 测试文件信息获取
    try {
        const fileInfo = await axios.get(
            `https://open.feishu.cn/open-apis/drive/v1/files/${sheetToken}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ 文件信息获取成功:', fileInfo.data);
    } catch (err) {
        console.error('❌ 文件信息获取失败:', err.response?.data);
    }

    // 3. 测试移动到回收站
    try {
        const trashResponse = await axios.post(
            `https://open.feishu.cn/open-apis/drive/v1/files/${sheetToken}/trash`,
            { type: 'sheet' },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ 移动到回收站成功:', trashResponse.data);
    } catch (err) {
        console.error('❌ 移动到回收站失败:', err.response?.data);
    }
}

// 使用从诊断信息中获取的 sheetToken
testPermission('shtcnXXXXXXXX');
```

### 4.2 对比文件权限

检查两个文件的权限差异：
- 一个能成功删除的文件
- 一个报权限错误的文件

对比它们的：
- 创建时间
- 所在文件夹
- 权限设置
- 共享状态

---

## 📋 步骤 5: 诊断清单

部署 v2.2.0 后，请收集以下信息：

### 必需信息
- [ ] 诊断响应中的 `details` 对象（完整 JSON）
- [ ] 云函数日志（完整输出）
- [ ] sheetToken（用于手动检查）
- [ ] 文件 URL（尝试访问）

### 飞书端检查
- [ ] 文件是否存在？
- [ ] 文件在哪个文件夹？
- [ ] 文件当前的权限设置是什么？
- [ ] 文件是否在回收站？
- [ ] 文件的创建者是谁？

### 应用端检查
- [ ] 飞书应用的权限列表（截图）
- [ ] 应用是否能访问该文件夹？
- [ ] 应用在文件的"可访问成员"列表中吗？

---

## 💡 预期的诊断结果

根据诊断信息，我们应该能确定以下之一：

1. **文件被移动** → 移回原位置或修改文件夹权限
2. **文件已删除** → 直接删除数据库记录（修改云函数）
3. **应用权限不足** → 在飞书后台添加权限
4. **文件权限被改** → 修改文件的访问权限
5. **API 使用错误** → 更换 API 端点或方法

---

## 🚀 下一步行动

部署 v2.2.0 后：

1. **触发错误**，获取完整的诊断信息
2. **提供给我诊断信息**，我会帮你分析
3. **根据诊断结果**，制定精确的修复方案
4. **验证修复**，确保真正解决问题

---

**当前版本**: v2.2.0 (诊断模式)
**目标**: 定位权限问题的根本原因
**下一版**: v2.3.0 (根据诊断结果修复)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
