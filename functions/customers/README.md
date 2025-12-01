# customers - RESTful 客户管理 API

## 概述

统一的客户管理 RESTful API，支持客户信息的增删改查和价格策略配置。

## API 端点（火山引擎兼容版）

### 基础 URL
```
https://your-domain.com/customers
```

## 支持的操作

### 1. 获取客户列表
```http
GET /customers
```

**查询参数**：
- `page` (number): 页码，默认 1
- `pageSize` (number): 每页数量，默认 20
- `searchTerm` (string): 搜索关键词（名称或编码）
- `level` (string): 客户级别筛选
- `status` (string): 客户状态筛选
- `sortBy` (string): 排序字段，默认 'createdAt'
- `sortOrder` (string): 排序顺序 'asc' 或 'desc'，默认 'desc'

**响应示例**：
```json
{
  "success": true,
  "data": {
    "customers": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 2. 获取客户详情
```http
GET /customers?id=:id
```

**查询参数**：
- `id`: 客户ID或客户编码（支持 MongoDB ObjectId 或业务编码）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "CUS20240001",
    "name": "某某公司",
    "level": "large",
    "status": "active",
    "businessStrategies": {
      "talentProcurement": {
        "enabled": true,
        "pricingModel": "framework",
        "discount": {
          "rate": 0.9,
          "includesPlatformFee": false
        },
        "serviceFee": {
          "rate": 0.1,
          "calculationBase": "beforeDiscount"
        },
        "platformFees": {
          "douyin": { "enabled": true, "rate": 0.05 },
          "xiaohongshu": { "enabled": true, "rate": 0.10 }
        },
        "quotationCoefficients": {
          "douyin": 1.155,
          "xiaohongshu": 1.21
        }
      }
    }
  }
}
```

### 3. 创建客户
```http
POST /customers
```

**请求体**：
```json
{
  "name": "新客户公司",
  "level": "medium",
  "status": "active",
  "industry": "互联网",
  "contacts": [
    {
      "name": "张三",
      "position": "采购经理",
      "phone": "13800138000",
      "email": "zhang@company.com",
      "isPrimary": true
    }
  ],
  "businessStrategies": {
    "talentProcurement": {
      "enabled": true,
      "pricingModel": "framework",
      "discount": {
        "rate": 0.9,
        "includesPlatformFee": false
      },
      "serviceFee": {
        "rate": 0.1,
        "calculationBase": "beforeDiscount"
      },
      "platformFees": {
        "douyin": { "enabled": true, "rate": 0.05 },
        "xiaohongshu": { "enabled": true, "rate": 0.10 }
      }
    }
  }
}
```

### 4. 更新客户
```http
PUT /customers
```

**请求体**（必须包含 id）：
```json
{
  "id": "CUS20240001",  // 或 MongoDB ObjectId
  "name": "更新后的名称",
  "level": "large",
  "businessStrategies": {
    ...
  }
}
```

注：也可以通过查询参数传递 id：`PUT /customers?id=CUS20240001`

### 5. 删除客户（软删除）
```http
DELETE /customers?id=:id
```

**查询参数**：
- `id`: 客户ID或客户编码

## 特性

1. **RESTful 设计**：完全遵循 RESTful API 设计规范
2. **自动编码生成**：创建客户时自动生成唯一编码（格式：CUS20240001）
3. **支付系数计算**：自动计算并缓存各平台的支付系数
4. **价格策略历史**：记录所有价格策略变更历史
5. **软删除**：删除操作仅更新状态，不物理删除数据
6. **CORS 支持**：完整的跨域请求支持

## 错误处理

所有错误响应格式：
```json
{
  "success": false,
  "message": "错误描述"
}
```

常见错误码：
- `400` - 请求参数错误
- `404` - 客户不存在
- `405` - 不支持的 HTTP 方法
- `500` - 服务器内部错误

## 环境变量

- `MONGODB_URI`: MongoDB 连接字符串
- `DB_NAME`: 数据库名称（默认：agentworks_db）

## 版本历史

### v2.0 (2025-11-23) 🎉 重大升级
**核心功能**
- 平台级差异化折扣率：每个平台可独立设置折扣率（如抖音80%，小红书90%）
- 向后兼容：自动兼容 v1.x 数据结构，优先使用平台级配置

**数据结构变更**
```javascript
platformFees: {
  douyin: {
    enabled: true,
    platformFeeRate: 0.05,    // 平台费率
    discountRate: 0.80,       // ← 新增：平台级折扣率
  },
  xiaohongshu: {
    enabled: true,
    platformFeeRate: 0.10,
    discountRate: 0.90,       // ← 可以不同
  }
}
```

**兼容性策略**
- 平台级 `discountRate` 存在 → 使用平台级
- 平台级不存在 → 回退到全局 `discount.rate`

### v1.4 (2025-11-23)
**架构优化**
- 平台配置统一管理

### v1.3 (2025-11-23)
**新功能**
- 框架折扣有效期、税费配置、平台扩展（视频号、B站、微博）

**数据结构优化**
- `discount` 新增 `validFrom`、`validTo` 字段
- `tax` 新增配置：`rate`、`includesTax`、`calculationBase`

### v1.2 (2025-11-22)
**新功能**
- 永久删除和客户恢复功能
- 默认过滤已删除客户

### v1.1 (2025-11-22)
**Bug 修复**
- MongoDB 6.x 兼容性修复

### v1.0 (2024-11-22)
**初始发布**
- RESTful API 基础功能