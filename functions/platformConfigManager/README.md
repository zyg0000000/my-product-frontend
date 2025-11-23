# platformConfigManager

平台配置管理云函数 - RESTful API

## 版本

**当前版本**: v1.0.0

## 功能说明

提供平台配置的增删改查功能，支持从数据库动态管理平台配置，无需修改代码和重新部署。

## API 接口

### GET - 获取平台配置

**获取所有平台配置**
```
GET /platformConfigManager
GET /platformConfigManager?enabled=true  # 仅获取启用的平台
```

**获取单个平台配置**
```
GET /platformConfigManager?platform=douyin
```

**响应示例**
```json
{
  "success": true,
  "data": [
    {
      "configType": "platform",
      "platform": "douyin",
      "name": "抖音",
      "enabled": true,
      "color": "blue",
      "order": 1,
      "accountId": {
        "label": "星图ID",
        "placeholder": "请输入星图ID",
        "helpText": "星图ID是抖音平台的唯一标识"
      },
      "priceTypes": [...],
      "business": {...},
      "features": {...}
    }
  ],
  "count": 4,
  "timestamp": "2025-11-23T..."
}
```

### POST - 创建平台配置

```
POST /platformConfigManager
Content-Type: application/json

{
  "platform": "tiktok",
  "name": "TikTok",
  "enabled": true,
  "color": "blue",
  "order": 5,
  "accountId": {...},
  "priceTypes": [...],
  "business": {...},
  "features": {...}
}
```

**响应示例**
```json
{
  "success": true,
  "message": "平台配置创建成功: TikTok",
  "timestamp": "2025-11-23T..."
}
```

### PUT - 更新平台配置

```
PUT /platformConfigManager
Content-Type: application/json

{
  "platform": "douyin",
  "name": "抖音",
  "business": {
    "fee": 0.06
  }
}
```

**响应示例**
```json
{
  "success": true,
  "message": "平台配置更新成功: 抖音",
  "timestamp": "2025-11-23T..."
}
```

### DELETE - 删除平台配置

软删除，设置 `enabled=false`

```
DELETE /platformConfigManager?platform=douyin
```

**响应示例**
```json
{
  "success": true,
  "message": "平台配置已禁用: 抖音",
  "timestamp": "2025-11-23T..."
}
```

## 错误响应

```json
{
  "success": false,
  "message": "错误描述",
  "timestamp": "2025-11-23T..."
}
```

**常见状态码**:
- 200: 成功
- 201: 创建成功
- 400: 请求参数错误
- 404: 资源不存在
- 409: 资源冲突（已存在）
- 500: 服务器错误

## 环境变量

- `MONGO_URI`: MongoDB 连接字符串（必需）
- `NODE_ENV`: 运行环境（production/development）

## 部署

```bash
# 在 functions/platformConfigManager 目录下
npm install
```

部署到 Cloudflare Pages Functions 会自动处理。

## 相关文档

- 实施方案: `docs/PLATFORM_CONFIG_UNIFICATION_PLAN.md`
- 数据库初始化: `database/agentworks_db/scripts/init-platform-config.js`
