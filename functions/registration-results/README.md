# registration-results

报名管理 - 抓取结果 API

## API 端点

```
GET    /registration-results?projectId=xxx                    获取项目的所有抓取结果
GET    /registration-results?collaborationId=xxx              获取单个达人的抓取结果
GET    /registration-results?projectId=xxx&action=list-talents 获取达人列表（合并 collaborations + results）
POST   /registration-results                                  保存抓取结果（upsert by collaborationId）
DELETE /registration-results?collaborationId=xxx              删除抓取结果
```

## 请求参数

### GET 请求

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | string | 是* | 项目 ID |
| collaborationId | string | 是* | 达人合作 ID |
| action | string | 否 | 操作类型：`list-talents` 获取合并的达人列表 |

*注：`projectId` 和 `collaborationId` 二选一

### POST 请求

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collaborationId | string | 是 | 达人合作 ID |
| projectId | string | 是 | 项目 ID |
| talentName | string | 否 | 达人名称 |
| xingtuId | string | 否 | 星图 ID |
| workflowId | string | 否 | 工作流 ID |
| workflowName | string | 否 | 工作流名称 |
| status | string | 否 | 状态：`success` / `failed` |
| screenshots | array | 否 | 截图列表 `[{ name, url }]` |
| extractedData | object | 否 | 抓取的数据 |
| error | string | 否 | 错误信息 |
| fetchedAt | string | 否 | 抓取时间 |

## 返回结果

### 获取项目抓取结果

```json
{
    "success": true,
    "data": [
        {
            "_id": "reg_xxx",
            "collaborationId": "collab_123",
            "projectId": "proj_456",
            "talentName": "达人A",
            "xingtuId": "123456",
            "workflowId": "wf_001",
            "workflowName": "星图报名截图",
            "status": "success",
            "screenshots": [
                { "name": "报名页截图", "url": "https://tos.example.com/xxx.png" }
            ],
            "extractedData": { "报名状态": "已通过" },
            "fetchedAt": "2025-01-01T12:00:00.000Z"
        }
    ]
}
```

### 获取达人列表（合并数据）

```json
{
    "success": true,
    "data": [
        {
            "collaborationId": "collab_123",
            "talentName": "达人A",
            "platform": "douyin",
            "xingtuId": "123456",
            "fetchStatus": "success",
            "fetchedAt": "2025-01-01T12:00:00.000Z",
            "hasResult": true,
            "result": { ... }
        }
    ]
}
```

## 数据库

- **数据库**: agentworks_db
- **集合**: registration_results
- **关联集合**: collaborations, talents

## 版本历史

- v1.0.0 (2025-12-25) - 初始版本
  - GET/POST/DELETE 基础 CRUD
  - 达人列表合并查询 (action=list-talents)
  - 通过 collaborationId 实现 upsert
