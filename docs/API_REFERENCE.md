# 云函数 API 参考文档

> 完整云函数代码仓库：[my-cloud-functions](https://github.com/zyg0000000/my-cloud-functions)

---

## 📖 文档说明

本文档记录了火山引擎云函数的接口规范，便于前端开发时快速查阅。

### 当前状态

- ✅ **已详细记录**：15 个常用 API（涵盖 80% 的开发场景）
- 📋 **简要列表**：其他 36+ 个 API（按需扩展）

### 补全说明

**何时补全**：
- 当你开始使用某个未详细记录的 API 时
- 当 Claude Code 检测到你调用了未详细记录的 API 时

**如何补全**：
1. 告诉 Claude Code：`请补全 [API名称] 的详细文档`
2. Claude Code 会：
   - 读取云函数仓库的代码
   - 分析接口规范
   - 更新本文档
   - 提交到 Git

**AI 主动提醒**：
- ⚠️ 当 Claude Code 发现你在使用未详细记录的 API 时，会**主动提醒**你是否需要补全文档
- 这样可以逐步完善文档，避免一次性工作量过大

---

## 🔑 通用规范

### API 调用方式

所有 API 通过前端的 `APIService` 类调用：

```javascript
import { APIService as API } from '../common/app-core.js';

// GET 请求
const response = await API.request('/getProjects', 'GET', { view: 'simple' });

// POST 请求
const response = await API.request('/addProject', 'POST', {
    name: '项目名称',
    budget: '100000'
});
```

### 通用响应格式

所有 API 返回统一的 JSON 格式：

```json
{
  "success": true,          // 是否成功
  "data": [...],            // 返回数据
  "message": "操作成功"     // 提示信息（可选）
}
```

失败时：
```json
{
  "success": false,
  "message": "错误原因",
  "error": "详细错误信息"
}
```

---

## 📚 API 详细列表

### 项目管理

#### getProjects

**功能**：获取项目列表，支持简单视图和完整视图（含财务计算）

**请求**：
- 方法：`GET`
- 端点：`/getProjects`
- 参数：
  - `view` (String, 可选) - "simple" 返回基础信息，不传则返回完整信息（含财务数据）

**响应示例**：

简单视图：
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_xxx",
      "name": "项目名称",
      "status": "执行中"
    }
  ]
}
```

完整视图（包含财务计算）：
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_xxx",
      "name": "项目名称",
      "status": "执行中",
      "totalIncome": 150000,
      "totalExpense": 100000,
      "grossProfit": 50000,
      "grossProfitMargin": 33.33
    }
  ]
}
```

**使用示例**：
```javascript
// 获取简单列表
const response = await API.request('/getProjects', 'GET', { view: 'simple' });

// 获取完整信息（含财务）
const response = await API.request('/getProjects', 'GET');
```

**完整代码**：[getProjects/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/getProjects/index.js)

---

#### addProject

**功能**：创建新项目

**请求**：
- 方法：`POST`
- 端点：`/addProject`
- 参数（body）：
  - `name` (String, 必需) - 项目名称
  - `budget` (String, 必需) - 项目预算
  - `status` (String, 必需) - 项目状态
  - `type` (String, 必需) - 项目类型
  - `financialYear` (String, 必需) - 财务年份
  - `financialMonth` (String, 必需) - 财务月份（格式：M1-M12）
  - `discount` (String, 必需) - 折扣配置
  - `capitalRateId` (String, 可选) - 资金利率 ID
  - `benchmarkCPM` (Number, 可选) - 基准 CPM

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "proj_1234567890_xxxxx",
    "name": "新项目"
  },
  "message": "项目创建成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/addProject', 'POST', {
    name: '2024年10月营销项目',
    budget: '500000',
    status: '执行中',
    type: '抖音星图',
    financialYear: '2024',
    financialMonth: 'M10',
    discount: 'discount_id_xxx'
});
```

**完整代码**：[addProject/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/addProject/index.js)

---

#### updateProject

**功能**：更新项目信息

**请求**：
- 方法：`POST`
- 端点：`/updateProject`
- 参数（body）：
  - `id` (String, 必需) - 项目 ID
  - 其他字段同 `addProject`（只传需要更新的字段）

**响应示例**：
```json
{
  "success": true,
  "message": "项目更新成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/updateProject', 'POST', {
    id: 'proj_1234567890_xxxxx',
    status: '已完成',
    budget: '600000'
});
```

**完整代码**：[updateProject/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/updateProject/index.js)

---

#### deleteProject

**功能**：删除项目

**请求**：
- 方法：`POST`
- 端点：`/deleteProject`
- 参数（body）：
  - `id` (String, 必需) - 项目 ID

**响应示例**：
```json
{
  "success": true,
  "message": "项目删除成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/deleteProject', 'POST', {
    id: 'proj_1234567890_xxxxx'
});
```

**完整代码**：[deleteProject/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/deleteProject/index.js)

---

### 达人管理

#### getTalents

**功能**：获取达人列表，支持多种筛选条件

**请求**：
- 方法：`GET`
- 端点：`/getTalents`
- 参数：
  - `talentType` (String, 可选) - 达人类型筛选
  - `talentTier` (String, 可选) - 达人等级筛选（头部、腰部、尾部）
  - `talentSource` (String, 可选) - 达人来源筛选

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "talent_xxx",
      "nickname": "达人昵称",
      "xingtuId": "123456",
      "talentTier": "头部",
      "prices": [...],
      "performanceData": {...}
    }
  ]
}
```

**使用示例**：
```javascript
// 获取所有达人
const response = await API.request('/getTalents', 'GET');

// 筛选头部达人
const response = await API.request('/getTalents', 'GET', {
    talentTier: '头部'
});
```

**完整代码**：[getTalents/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/getTalents/index.js)

---

#### getTalentHistory

**功能**：查询达人的合作历史记录

**请求**：
- 方法：`GET`
- 端点：`/getTalentHistory`
- 参数：
  - `talentId` (String, 必需) - 达人 ID
  - `excludeProjectId` (String, 可选) - 排除的项目 ID（通常是当前项目）

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "projectId": "proj_xxx",
      "projectName": "某某项目",
      "projectYear": "2024",
      "projectMonth": "M9",
      "amount": 50000,
      "rebate": 15,
      "status": "视频已发布"
    }
  ],
  "message": "找到 5 条历史记录"
}
```

**使用示例**：
```javascript
const response = await API.request('/getTalentHistory', 'GET', {
    talentId: 'talent_1757345209659_xxxxx',
    excludeProjectId: 'proj_current_id'
});
```

**业务规则**：
- 只返回"视频已发布"和"客户已定档"状态的记录
- 按项目年月降序排序（最新的在前）
- 自动处理月份格式（M8 → 8）

**完整代码**：[getTalentHistory/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/getTalentHistory/index.js)

---

#### updateTalent

**功能**：更新达人信息

**请求**：
- 方法：`POST`
- 端点：`/updateTalent`
- 参数（body）：
  - `id` (String, 必需) - 达人 ID
  - 其他字段（只传需要更新的字段）：
    - `nickname` (String) - 昵称
    - `talentType` (Array) - 达人类型
    - `talentTier` (String) - 达人等级
    - `prices` (Array) - 价格信息
    - `rebates` (Array) - 返点配置
    - `performanceData` (Object) - 性能数据
    - `remarks` (Object) - 备注

**响应示例**：
```json
{
  "success": true,
  "message": "达人信息更新成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/updateTalent', 'POST', {
    id: 'talent_xxx',
    talentTier: '腰部',
    prices: [
        { year: '2024', month: 'M10', price: 30000, status: '有效' }
    ]
});
```

**完整代码**：[updateTalent/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/updateTalent/index.js)

---

#### deleteTalent

**功能**：删除达人档案

**请求**：
- 方法：`POST`
- 端点：`/deleteTalent`
- 参数（body）：
  - `id` (String, 必需) - 达人 ID

**响应示例**：
```json
{
  "success": true,
  "message": "达人删除成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/deleteTalent', 'POST', {
    id: 'talent_xxx'
});
```

**完整代码**：[deleteTalent/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/deleteTalent/index.js)

---

### 合作订单管理

#### getCollaborators

**功能**：获取项目的合作订单列表

**请求**：
- 方法：`GET`
- 端点：`/getCollaborators`
- 参数：
  - `projectId` (String, 必需) - 项目 ID
  - `statuses` (String, 可选) - 状态筛选（多个状态用逗号分隔）

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "collab_xxx",
      "projectId": "proj_xxx",
      "talentId": "talent_xxx",
      "talentNickname": "达人昵称",
      "amount": 50000,
      "rebate": 15,
      "status": "已下单",
      "orderDate": "2024-10-01",
      "paymentDate": null
    }
  ]
}
```

**使用示例**：
```javascript
// 获取项目所有合作
const response = await API.request('/getCollaborators', 'GET', {
    projectId: 'proj_xxx'
});

// 筛选特定状态
const response = await API.request('/getCollaborators', 'GET', {
    projectId: 'proj_xxx',
    statuses: '已下单,视频已发布'
});
```

**完整代码**：[getCollaborators/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/getCollaborators/index.js)

---

#### addCollaborator

**功能**：创建新的合作订单

**请求**：
- 方法：`POST`
- 端点：`/addCollaborator`
- 参数（body）：
  - `projectId` (String, 必需) - 项目 ID
  - `talentId` (String, 必需) - 达人 ID
  - `amount` (Number, 必需) - 合作金额
  - `rebate` (Number, 必需) - 返点率
  - `status` (String, 必需) - 订单状态
  - `orderType` (String, 必需) - 订单类型
  - `talentSource` (String, 必需) - 达人来源
  - `priceInfo` (String, 必需) - 价格信息

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "collab_1234567890_xxxxx"
  },
  "message": "合作订单创建成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/addCollaborator', 'POST', {
    projectId: 'proj_xxx',
    talentId: 'talent_xxx',
    amount: 50000,
    rebate: 15,
    status: '待对接',
    orderType: '星图',
    talentSource: '自有资源',
    priceInfo: '10-20w粉丝价格'
});
```

**完整代码**：[addCollaborator/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/addCollaborator/index.js)

---

#### updateCollaborator

**功能**：更新合作订单信息

**请求**：
- 方法：`POST`
- 端点：`/updateCollaborator`
- 参数（body）：
  - `id` (String, 必需) - 订单 ID
  - 其他字段（只传需要更新的字段）：
    - `status` (String) - 状态
    - `amount` (Number) - 金额
    - `rebate` (Number) - 返点率
    - `orderDate` (String) - 下单日期
    - `paymentDate` (String) - 回款日期
    - `publishDate` (String) - 发布日期
    - `videoId` (String) - 视频 ID
    - `taskId` (String) - 任务 ID
    - `contentFile` (String) - 内容文件

**响应示例**：
```json
{
  "success": true,
  "message": "订单更新成功"
}
```

**使用示例**：
```javascript
// 更新状态
const response = await API.request('/updateCollaborator', 'POST', {
    id: 'collab_xxx',
    status: '已下单',
    orderDate: '2024-10-15'
});

// 更新发布信息（自动变更状态为"视频已发布"）
const response = await API.request('/updateCollaborator', 'POST', {
    id: 'collab_xxx',
    publishDate: '2024-10-20',
    videoId: 'v_xxx'
});
```

**业务规则**：
- 当录入 `publishDate` 时，如果当前状态不是"视频已发布"，会自动更新为"视频已发布"

**完整代码**：[updateCollaborator/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/updateCollaborator/index.js)

---

#### deleteCollaborator

**功能**：删除合作订单

**请求**：
- 方法：`POST`
- 端点：`/deleteCollaborator`
- 参数（body）：
  - `id` (String, 必需) - 订单 ID

**响应示例**：
```json
{
  "success": true,
  "message": "订单删除成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/deleteCollaborator', 'POST', {
    id: 'collab_xxx'
});
```

**完整代码**：[deleteCollaborator/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/deleteCollaborator/index.js)

---

### 文件管理

#### uploadFile

**功能**：上传文件到 TOS 对象存储

**请求**：
- 方法：`POST`
- 端点：`/uploadFile`
- 参数（body）：
  - `file` (File/Blob, 必需) - 文件对象
  - `fileName` (String, 必需) - 文件名
  - `folder` (String, 可选) - 存储文件夹路径

**响应示例**：
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://tos.xxx.com/path/to/file.jpg",
    "fileName": "file.jpg"
  },
  "message": "文件上传成功"
}
```

**使用示例**：
```javascript
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

const response = await API.request('/uploadFile', 'POST', {
    file: file,
    fileName: file.name,
    folder: 'screenshots'
});
```

**完整代码**：[uploadFile/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/uploadFile/index.js)

---

### 数据导出

#### exportComprehensiveData

**功能**：导出项目的综合数据报表

**请求**：
- 方法：`GET`
- 端点：`/exportComprehensiveData`
- 参数：
  - `projectId` (String, 必需) - 项目 ID
  - `format` (String, 可选) - 导出格式（excel/csv，默认 excel）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://tos.xxx.com/exports/project_xxx.xlsx",
    "expiresIn": 3600
  },
  "message": "数据导出成功"
}
```

**使用示例**：
```javascript
const response = await API.request('/exportComprehensiveData', 'GET', {
    projectId: 'proj_xxx',
    format: 'excel'
});

// 下载文件
window.open(response.data.downloadUrl);
```

**完整代码**：[exportComprehensiveData/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/exportComprehensiveData/index.js)

---

### 飞书集成

#### syncFromFeishu

**功能**：从飞书多维表格同步数据到系统

**请求**：
- 方法：`POST`
- 端点：`/syncFromFeishu`
- 参数（body）：
  - `tableId` (String, 必需) - 飞书表格 ID
  - `syncType` (String, 必需) - 同步类型（projects/talents/collaborations）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "synced": 15,
    "failed": 0
  },
  "message": "同步完成：成功 15 条，失败 0 条"
}
```

**使用示例**：
```javascript
const response = await API.request('/syncFromFeishu', 'POST', {
    tableId: 'tbl_xxx',
    syncType: 'projects'
});
```

**完整代码**：[syncFromFeishu/index.js](https://github.com/zyg0000000/my-cloud-functions/blob/main/syncFromFeishu/index.js)

---

## 📝 其他 API 简要列表

以下 API 已部署但未详细记录，使用时请告知 Claude Code 补全文档。

### 达人相关
- `getTalentsByIds` - 批量获取达人信息
- `getTalentsSearch` - 达人搜索
- `getTalentFilterOptions` - 获取达人筛选选项
- `bulkCreateTalents` - 批量创建达人
- `bulkUpdateTalents` - 批量更新达人
- `batchUpdateTalents` - 批量修改达人
- `checkTalentData` - 检查达人数据
- `processTalents` - 处理达人数据
- `getPendingPublishTalents` - 获取待发布达人
- `exportAllTalents` - 导出所有达人

### 项目相关
- `getProjectPerformance` - 获取项目执行数据
- `handleProjectReport` - 项目报表处理

### 作品管理
- `getWorks` - 获取作品列表
- `addWork` - 添加作品
- `updateWork` - 更新作品
- `deleteWork` - 删除作品
- `getWorkStats` - 作品统计

### 自动化任务
- `automation-tasks` - 任务管理
- `automation-jobs-creat` - 创建任务实例
- `automation-jobs-get` - 获取任务实例
- `automation-jobs-update` - 更新任务实例
- `automation-workflows` - 工作流管理
- `TaskGeneratorCron` - 定时任务生成器
- `getTasks` - 获取任务列表

### 飞书集成
- `feishu-callback-handler` - 飞书回调处理
- `feishu-notifier` - 飞书消息推送
- `test_feishu_create` - 飞书测试

### 文件管理
- `deleteFile` - 删除文件
- `previewFile` - 文件预览

### 数据分析
- `getAnalysisData` - 获取分析数据
- `getPerformanceData` - 获取性能数据

### 系统功能
- `mapping-templates-api` - 映射模板 API
- `generated-sheets-manager` - 生成表格管理
- `processConfigurations` - 配置处理
- `system-status` - 系统状态

---

## 🔄 文档更新日志

| 日期 | 版本 | 更新内容 | 更新者 |
|------|------|----------|--------|
| 2025-10-25 | v1.0 | 初始版本，包含 15 个详细 API | Claude Code |

---

## 💡 使用建议

### 开发时查询 API

```
你："我需要调用获取达人列表的接口"
Claude Code：读取本文档 → 找到 getTalents → 告诉你参数和用法
```

### 补全未记录的 API

```
你："我要使用 getTalentsByIds，请补全文档"
Claude Code：
  1. 读取云函数代码
  2. 分析接口规范
  3. 更新本文档
  4. 提交到 Git
```

### AI 主动提醒

当 Claude Code 检测到你使用了未详细记录的 API 时，会主动提醒：

```
⚠️ 检测到你正在使用 `getTalentsByIds` API，
   该 API 尚未详细记录在文档中。

   是否需要我补全该 API 的文档？
   - 是：我会读取代码并更新文档
   - 否：继续使用，后续再补全
```

---

**最后更新**：2025-10-25
**维护者**：产品经理 + Claude Code
