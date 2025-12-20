# updateCollaborator

更新合作记录的云函数，支持单条更新和批量更新。

## 版本

**v5.1** - 支持批量更新模式

## API 端点

### 单条更新
```
PUT /collaborations/:id
POST /collaborations/:id
```

### 批量更新 (v5.1 新增)
```
PUT /collaborations/batch
```

## 请求参数

### 单条更新模式

```json
{
  "id": "collab_xxx",
  "dbVersion": "v1",  // 可选，默认 v1
  "status": "视频已发布",
  "actualReleaseDate": "2025-12-18"
}
```

### 批量更新模式 (仅 v2)

```json
{
  "ids": ["collab_001", "collab_002", "collab_003"],
  "updates": {
    "status": "客户已定档",
    "orderDate": "2025-12-18"
  },
  "dbVersion": "v2"  // 批量模式必须为 v2
}
```

## 数据库版本

| 版本 | 数据库 | 产品 |
|-----|--------|------|
| v1 (默认) | kol_data | ByteProject |
| v2 | agentworks_db | AgentWorks |

## 允许更新的字段

### V1 允许字段

- amount, priceInfo, rebate, orderType, status
- orderDate, publishDate, paymentDate, recoveryDate
- videoId, taskId, plannedReleaseDate
- actualRebate, contentFile, rebateScreenshots
- discrepancyReason, discrepancyReasonUpdatedAt

### V2 允许字段

- amount, priceInfo, rebateRate, orderType, status
- plannedReleaseDate, actualReleaseDate
- taskId, videoId, videoUrl
- orderDate, paymentDate, recoveryDate
- discrepancyReason, rebateScreenshots
- effectData, adjustments

## 返回结果

### 单条更新成功
```json
{
  "success": true,
  "message": "合作记录更新成功。",
  "dbVersion": "v2"
}
```

### 批量更新成功
```json
{
  "success": true,
  "message": "批量更新完成: 5 条记录已更新。",
  "dbVersion": "v2",
  "matchedCount": 5,
  "modifiedCount": 5
}
```

## 火山引擎 API 网关配置

批量更新需要在 API 网关添加新路由：

| 路径 | 方法 | 后端函数 |
|-----|------|---------|
| /collaborations/batch | PUT | updateCollaborator |

### 配置步骤

1. 登录火山引擎控制台
2. 进入 API 网关服务
3. 选择 agentworks 网关
4. 添加新路由：
   - 路径：`/collaborations/batch`
   - 方法：`PUT`
   - 后端类型：云函数
   - 函数名称：`updateCollaborator`

## 版本历史

- **v5.1** (2025-12-18) - 新增批量更新模式，支持 `ids` 数组参数
- **v5.0** (2025-xx-xx) - 支持双数据库 (v1/v2)
- **v4.4** (2025-xx-xx) - 重构 ID 获取方式
