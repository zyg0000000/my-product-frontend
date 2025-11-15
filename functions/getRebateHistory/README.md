# getRebateHistory 云函数

## 功能描述

获取达人的返点配置历史记录，支持分页查询，按时间倒序排列。

## 部署信息

### 火山引擎部署配置

**函数名称**: `getRebateHistory`

**触发器配置**:
- 类型: HTTP 触发器
- 路径: `/getRebateHistory`
- 方法: GET, OPTIONS
- 认证方式: 无需认证（公开）

**运行时配置**:
- 运行时: Node.js 18.x 或更高
- 内存: 128 MB
- 超时: 10 秒

**环境变量**:
```
MONGO_URI=mongodb://your-mongodb-connection-string
```

## API 使用说明

### 请求

**方法**: GET

**路径**: `/getRebateHistory`

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| oneId | string | 是 | 达人唯一标识 |
| platform | string | 是 | 平台名称 |
| limit | number | 否 | 每页记录数（默认 20，最大 100） |
| offset | number | 否 | 偏移量（默认 0） |

**请求示例**:

基础查询：
```bash
GET https://your-api-gateway.com/getRebateHistory?oneId=talent_00000005&platform=douyin
```

分页查询：
```bash
GET https://your-api-gateway.com/getRebateHistory?oneId=talent_00000005&platform=douyin&limit=10&offset=0
```

### 响应

**成功响应**:
```json
{
  "success": true,
  "data": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "records": [
      {
        "configId": "rebate_config_1737024000000_xyz789",
        "rebateRate": 25.00,
        "effectType": "next_cooperation",
        "effectiveDate": "2025-02-01",
        "expiryDate": null,
        "status": "pending",
        "reason": "长期合作奖励",
        "createdBy": "admin_user_id",
        "createdAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "configId": "rebate_config_1737024000000_abc123",
        "rebateRate": 22.50,
        "effectType": "immediate",
        "effectiveDate": "2025-01-15",
        "expiryDate": null,
        "status": "active",
        "reason": "合作表现优秀，提升返点",
        "createdBy": "admin_user_id",
        "createdAt": "2025-01-15T08:20:00.000Z"
      },
      {
        "configId": "rebate_config_1736928000000_def456",
        "rebateRate": 20.00,
        "effectType": "immediate",
        "effectiveDate": "2025-01-01",
        "expiryDate": "2025-01-15",
        "status": "expired",
        "reason": "初始配置",
        "createdBy": "system",
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**空结果响应**:
```json
{
  "success": true,
  "data": {
    "total": 0,
    "limit": 20,
    "offset": 0,
    "records": []
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**错误响应**:

参数错误（400）:
```json
{
  "success": false,
  "message": "缺少必需参数: oneId 和 platform"
}
```

服务器错误（500）:
```json
{
  "success": false,
  "message": "服务器内部错误"
}
```

## 业务逻辑

### 查询规则

1. 查询条件：
   - targetType = "talent"（固定值）
   - targetId = oneId
   - platform = platform

2. 排序规则：
   - 按 createdAt 倒序（最新的在前）

3. 分页规则：
   - 默认每页 20 条
   - 最大每页 100 条
   - 支持 offset 偏移

### 状态说明

- **pending**: 待生效（下次合作生效）
- **active**: 已生效（当前正在使用）
- **expired**: 已失效（被新配置替代）

### 时间线展示

历史记录按时间倒序排列，适合用于前端时间线展示：
- 最新的调整在最上方
- 每条记录显示：返点率、生效方式、生效日期、调整原因、操作人

## 数据模型

### rebate_configs 集合

```javascript
{
  configId: "rebate_config_1737024000000_abc123",
  targetType: "talent",           // 固定值
  targetId: "talent_00000005",    // oneId
  platform: "douyin",
  rebateRate: 22.50,              // 返点率（2位小数）
  effectType: "immediate",        // 生效方式
  effectiveDate: "2025-01-15",    // 生效日期
  expiryDate: null,               // 失效日期（null = 永久）
  status: "active",               // 状态：pending/active/expired
  reason: "合作表现优秀，提升返点",  // 调整原因
  createdBy: "admin_user_id",     // 操作人
  createdAt: ISODate("2025-01-15T10:30:00Z")
}
```

## 分页示例

获取第 1 页（前 20 条）:
```bash
GET /getRebateHistory?oneId=talent_00000005&platform=douyin&limit=20&offset=0
```

获取第 2 页（第 21-40 条）:
```bash
GET /getRebateHistory?oneId=talent_00000005&platform=douyin&limit=20&offset=20
```

获取第 3 页（第 41-60 条）:
```bash
GET /getRebateHistory?oneId=talent_00000005&platform=douyin&limit=20&offset=40
```

## 前端使用建议

### 时间线组件

```typescript
interface RebateHistoryRecord {
  configId: string;
  rebateRate: number;
  effectType: 'immediate' | 'next_cooperation';
  effectiveDate: string;
  expiryDate: string | null;
  status: 'pending' | 'active' | 'expired';
  reason: string;
  createdBy: string;
  createdAt: string;
}

// 渲染时间线
records.map(record => ({
  date: record.createdAt,
  title: `返点调整至 ${record.rebateRate}%`,
  description: record.reason,
  status: record.status,
  effectType: record.effectType === 'immediate' ? '立即生效' : '下次合作生效'
}))
```

### 无限滚动加载

```javascript
const [offset, setOffset] = useState(0);
const limit = 20;

async function loadMore() {
  const response = await fetch(
    `/getRebateHistory?oneId=${oneId}&platform=${platform}&limit=${limit}&offset=${offset}`
  );
  const data = await response.json();

  // 追加记录
  setRecords(prev => [...prev, ...data.data.records]);
  setOffset(prev => prev + limit);

  // 检查是否还有更多
  setHasMore(data.data.records.length === limit);
}
```

## 依赖

- mongodb: ^6.5.0

## 版本历史

### v1.0.0 (2025-11-15)
- 初始版本
- 支持分页查询返点历史
- 按时间倒序排列
- 返回完整配置信息
