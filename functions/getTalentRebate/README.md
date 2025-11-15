# getTalentRebate 云函数

## 功能描述

获取达人的返点配置信息，包括当前返点率、归属类型、生效日期等。

## 部署信息

### 火山引擎部署配置

**函数名称**: `getTalentRebate`

**触发器配置**:
- 类型: HTTP 触发器
- 路径: `/getTalentRebate`
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

**路径**: `/getTalentRebate`

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| oneId | string | 是 | 达人唯一标识 |
| platform | string | 是 | 平台名称（douyin/xiaohongshu/bilibili/kuaishou） |

**请求示例**:
```bash
GET https://your-api-gateway.com/getTalentRebate?oneId=talent_00000005&platform=douyin
```

### 响应

**成功响应**:
```json
{
  "success": true,
  "data": {
    "oneId": "talent_00000005",
    "platform": "douyin",
    "name": "张三",
    "belongType": "wild",
    "agencyId": null,
    "currentRebate": {
      "rate": 20.00,
      "source": "personal",
      "effectiveDate": "2025-01-15",
      "lastUpdated": "2025-01-10T10:30:00.000Z"
    }
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**字段说明**:
- `belongType`: 归属类型
  - `wild` - 野生达人
  - `agency` - 机构达人
- `currentRebate.rate`: 当前返点率（百分比，精度2位小数）
- `currentRebate.source`: 返点来源
  - `default` - 系统默认
  - `personal` - 个人配置
  - `rule` - 规则触发
  - `agency` - 机构统一
- `currentRebate.effectiveDate`: 生效日期
- `currentRebate.lastUpdated`: 最后更新时间

**错误响应**:

参数错误（400）:
```json
{
  "success": false,
  "message": "缺少必需参数: oneId 和 platform"
}
```

达人不存在（404）:
```json
{
  "success": false,
  "message": "达人不存在: oneId=xxx, platform=xxx"
}
```

服务器错误（500）:
```json
{
  "success": false,
  "message": "服务器内部错误"
}
```

## 数据模型

### Talent 表扩展字段

```javascript
{
  // 原有字段...

  // 归属类型（新增）
  belongType: "wild" | "agency",

  // 机构ID（新增，野生达人为 null）
  agencyId: String | null,

  // 当前返点配置（新增）
  currentRebate: {
    rate: 20.00,              // 返点率（百分比，2位小数）
    source: "personal",       // 来源
    effectiveDate: "2025-01-15",  // 生效日期
    lastUpdated: "2025-01-10T10:30:00.000Z"  // 最后更新时间
  }
}
```

## 默认值

- 如果达人没有 `currentRebate` 字段，返回默认值：
  - rate: 10.00%
  - source: "default"
  - effectiveDate: 当前日期

## 依赖

- mongodb: ^6.5.0

## 版本历史

### v1.0.0 (2025-11-15)
- 初始版本
- 支持获取野生达人返点配置
- 返点率精度：小数点后2位
