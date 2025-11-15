# getTalentStats 云函数

## 功能描述

获取达人统计数据的专用接口，支持 v1/v2 双数据库版本，提供高性能的多维度统计。

## 部署信息

### 火山引擎部署配置

**函数名称**: `getTalentStats`

**触发器配置**:
- 类型: HTTP 触发器
- 路径: `/getTalentStats` 或 `/talent-stats`
- 方法: GET
- 认证方式: 无需认证（公开）

**运行时配置**:
- 运行时: Node.js 18.x 或更高
- 内存: 128 MB（建议）
- 超时: 10 秒

**环境变量**:
```
MONGO_URI=mongodb://your-mongodb-connection-string
```

## API 使用说明

### 请求

**方法**: GET

**路径**: `/getTalentStats`

**查询参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| dbVersion | string | 否 | v2 | 数据库版本，可选 `v1` 或 `v2` |
| debug | boolean | 否 | false | 调试模式，启用后输出详细日志 |

**请求示例**:
```bash
# v1 数据库统计（byteproject）
GET https://your-api-gateway.com/getTalentStats?dbVersion=v1

# v2 数据库统计（agentworks，默认）
GET https://your-api-gateway.com/getTalentStats?dbVersion=v2

# 启用调试模式（排查问题时使用）
GET https://your-api-gateway.com/getTalentStats?dbVersion=v2&debug=true
```

### 响应

**成功响应**:
```json
{
  "success": true,
  "dbVersion": "v2",
  "data": {
    "totalRecords": 280,
    "uniqueTalents": 150,
    "platformStats": {
      "douyin": 80,
      "xiaohongshu": 65,
      "bilibili": 70,
      "kuaishou": 65
    },
    "statusStats": {
      "active": 120,
      "inactive": 20,
      "archived": 10
    },
    "tierStats": {
      "头部": 30,
      "腰部": 80,
      "尾部": 40
    },
    "typeStats": [
      { "type": "美妆", "count": 45 },
      { "type": "时尚", "count": 38 },
      { "type": "美食", "count": 32 }
    ]
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "服务器内部错误",
  "error": "详细错误信息"
}
```

## 数据说明

### v2 统计字段

| 字段 | 类型 | 说明 |
|------|------|------|
| totalRecords | number | 总记录数（包含跨平台重复） |
| uniqueTalents | number | 唯一达人数（按 oneId 去重） |
| platformStats | object | 各平台达人数量统计 |
| statusStats | object | 状态分布统计 |
| tierStats | object | 等级分布统计 |
| typeStats | array | 达人类型分布（Top 10） |

### v1 统计字段

| 字段 | 类型 | 说明 |
|------|------|------|
| totalTalents | number | 总达人数 |
| totalRecords | number | 总记录数 |
| tierStats | object | 等级分布统计 |
| statusStats | object | 状态分布统计 |

## 性能优化

- 使用 MongoDB Aggregation Pipeline `$facet` 实现单次查询获取多维度统计
- 服务端聚合计算，减少数据传输量
- 支持数据库连接池复用

## 前端调用示例

```typescript
// src/api/stats.ts
import { get } from './client';

export async function getTalentStats() {
  return get('/getTalentStats', { dbVersion: 'v2' });
}

// 使用示例
const response = await getTalentStats();
if (response.success) {
  const { platformStats, uniqueTalents } = response.data;
  console.log('平台统计:', platformStats);
  console.log('唯一达人数:', uniqueTalents);
}
```

## 依赖

- mongodb: ^6.5.0

## 日志说明

### 正常模式（默认）
- **最小日志输出**：正常请求不输出日志，减少云函数日志量
- **仅记录错误**：只在发生错误时输出错误信息
- **适用场景**：生产环境，频繁调用的接口

### 调试模式（debug=true）
- **详细日志**：输出完整的数据库查询过程和中间结果
- **原始数据**：返回聚合管道的原始结果
- **适用场景**：开发调试、问题排查

**启用调试模式**：
```bash
GET /getTalentStats?debug=true
```

## 版本历史

### v1.0.2 (2025-11-15)
- 精简日志输出，减少云函数日志量
- 只在 debug 模式下输出详细日志
- 生产环境不返回错误堆栈信息

### v1.0.1 (2025-11-15)
- 增加详细的调试日志
- 添加原始数据返回（debug 模式）
- 优化错误处理

### v1.0.0 (2025-11-15)
- 初始版本
- 支持 v1/v2 双数据库版本
- 实现多维度统计功能
- 使用 $facet 聚合管道优化性能
