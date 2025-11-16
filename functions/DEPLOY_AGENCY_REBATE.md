# 部署机构返点配置云函数

## 云函数信息
- **函数名称**: agencyRebateConfig
- **功能描述**: 管理机构返点配置，支持更新机构返点率并可选择同步到达人
- **请求方法**: PUT

## 部署步骤

### 1. 登录火山引擎云函数控制台
访问 [火山引擎云函数控制台](https://console.volcengine.com/faas)

### 2. 创建新函数
- 选择 "创建函数"
- 函数名称: `agencyRebateConfig`
- 运行环境: Node.js 18.x 或 20.x
- 触发器类型: HTTP 触发器

### 3. 上传代码
将以下文件打包成 zip 文件：
- `functions/agencyRebateConfig/index.js`
- `functions/agencyRebateConfig/package.json`

### 4. 配置环境变量
在函数配置中设置环境变量：
```
MONGODB_URI=你的MongoDB连接字符串
```

### 5. 配置 API Gateway

#### 创建 API 路由
- 路径: `/agencyRebateConfig`
- 方法: PUT, OPTIONS
- 后端类型: 云函数
- 后端函数: agencyRebateConfig

#### 配置 CORS
在 API Gateway 设置中启用 CORS：
- 允许的源: `*` 或指定你的前端域名
- 允许的方法: `PUT, OPTIONS`
- 允许的头: `Content-Type, Authorization`

### 6. 测试函数

#### 测试请求示例
```bash
curl -X PUT https://your-api-gateway-url/agencyRebateConfig \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": "agency_001",
    "rebateConfig": {
      "baseRebate": 15.5,
      "effectiveDate": "2024-01-15",
      "updatedBy": "admin"
    },
    "syncToTalents": true
  }'
```

#### 预期响应
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "id": "agency_001",
    "name": "示例机构",
    "rebateConfig": {
      "baseRebate": 15.5,
      "effectiveDate": "2024-01-15",
      "lastUpdatedAt": "2024-01-15T10:30:00.000Z",
      "updatedBy": "admin",
      "tieredRules": [],
      "specialRules": []
    }
  },
  "syncResult": {
    "talentsUpdated": 5,
    "message": "已同步更新 5 个达人的返点率"
  },
  "message": "返点配置已更新并同步到达人"
}
```

## 功能特性

### 1. 更新机构返点配置
- 更新机构的基础返点率
- 记录生效日期和操作人
- 保留阶梯规则和特殊规则字段（Phase 2 使用）

### 2. 同步到达人（可选）
当 `syncToTalents` 为 `true` 时：
- 自动更新该机构下所有同步模式达人的返点率
- 只影响 `rebateMode='sync'` 或未设置模式的达人
- 更新达人的 `currentRebate` 和 `lastRebateSyncAt`

### 3. 数据验证
- 返点率必须在 0-100 之间
- 必须提供 agencyId 和 baseRebate
- 自动记录更新时间戳

## 注意事项

1. **权限控制**: 生产环境应添加身份验证
2. **日志记录**: 建议记录所有返点更新操作
3. **批量同步**: 同步大量达人时可能需要优化性能
4. **事务处理**: 考虑使用 MongoDB 事务确保数据一致性

## 相关文档
- [机构管理 API](./agencyManagement/index.js)
- [达人返点管理](./updateTalentRebate/index.js)
- [返点开发计划](../REBATE_DEVELOPMENT_PLAN.md)