# updateTalentRebate 云函数

## 功能描述

手动更新达人的返点配置，支持立即生效和下次合作生效两种模式。

## 部署信息

### 火山引擎部署配置

**函数名称**: `updateTalentRebate`

**触发器配置**:
- 类型: HTTP 触发器
- 路径: `/updateTalentRebate`
- 方法: POST, OPTIONS
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

**方法**: POST

**路径**: `/updateTalentRebate`

**请求体参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| oneId | string | 是 | 达人唯一标识 |
| platform | string | 是 | 平台名称 |
| rebateRate | number | 是 | 新返点率（0-100，最多2位小数） |
| effectType | string | 是 | 生效方式（immediate/next_cooperation） |
| effectiveDate | string | 否 | 生效日期（YYYY-MM-DD，默认当天） |
| reason | string | 否 | 调整原因 |
| createdBy | string | 否 | 操作人（默认 system） |

**请求示例**:

立即生效：
```bash
POST https://your-api-gateway.com/updateTalentRebate
Content-Type: application/json

{
  "oneId": "talent_00000005",
  "platform": "douyin",
  "rebateRate": 22.50,
  "effectType": "immediate",
  "reason": "合作表现优秀，提升返点"
}
```

下次合作生效：
```bash
POST https://your-api-gateway.com/updateTalentRebate
Content-Type: application/json

{
  "oneId": "talent_00000005",
  "platform": "douyin",
  "rebateRate": 25.00,
  "effectType": "next_cooperation",
  "effectiveDate": "2025-02-01",
  "reason": "长期合作奖励"
}
```

### 响应

**成功响应（立即生效）**:
```json
{
  "success": true,
  "data": {
    "configId": "rebate_config_1737024000000_abc123",
    "message": "返点率已立即更新",
    "newRate": 22.50,
    "effectType": "immediate",
    "effectiveDate": "2025-01-15"
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**成功响应（下次合作生效）**:
```json
{
  "success": true,
  "data": {
    "configId": "rebate_config_1737024000000_xyz789",
    "message": "返点率将在下次合作时生效",
    "newRate": 25.00,
    "effectType": "next_cooperation",
    "effectiveDate": "2025-02-01",
    "status": "pending"
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**错误响应**:

参数错误（400）:
```json
{
  "success": false,
  "message": "缺少必需参数: oneId, platform, rebateRate, effectType"
}
```

返点率格式错误（400）:
```json
{
  "success": false,
  "message": "返点率最多支持小数点后2位"
}
```

返点率范围错误（400）:
```json
{
  "success": false,
  "message": "返点率必须在 0-100 之间"
}
```

达人不存在（404）:
```json
{
  "success": false,
  "message": "达人不存在: oneId=xxx, platform=xxx"
}
```

## 业务逻辑

### 立即生效（immediate）

1. 创建 `rebate_configs` 历史记录（status: active）
2. 更新 `talents` 表的 `currentRebate` 字段
3. 新返点率立即在下次合作时使用

### 下次合作生效（next_cooperation）

1. 创建 `rebate_configs` 历史记录（status: pending）
2. **不**更新 `talents` 表的 `currentRebate` 字段
3. 等待下次合作时激活配置

## 数据模型

### rebate_configs 集合（新建）

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

## 验证规则

### 返点率验证

- ✅ 必须是数字
- ✅ 范围：0 - 100
- ✅ 精度：最多小数点后2位
- ✅ 示例：22, 22.5, 22.50（都合法）
- ❌ 示例：22.555（非法，超过2位小数）

### 生效方式验证

- ✅ immediate - 立即生效
- ✅ next_cooperation - 下次合作生效
- ❌ 其他值 - 非法

## 依赖

- mongodb: ^6.5.0

## 版本历史

### v1.0.0 (2025-11-15)
- 初始版本
- 支持手动调整野生达人返点
- 支持立即生效和下次合作生效
- 返点率精度：小数点后2位
- 自动创建历史记录
