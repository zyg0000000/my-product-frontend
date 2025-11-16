# 机构管理模块部署指南

## 📋 部署清单

### 1. 数据库创建（MongoDB）

在 MongoDB Shell (mongosh) 中执行：

```bash
# 方法一：在 mongosh 中加载脚本
mongosh "mongodb://your-connection-string"
use agentworks_db
load("scripts/init-agencies.js")
```

或者直接执行：

```bash
# 方法二：命令行直接执行
mongosh "mongodb://your-connection-string/agentworks_db" --file database/agentworks_db/scripts/init-agencies.js
```

### 2. 云函数部署

**函数名称**: `agencyManagement`

**部署步骤**:
1. 登录火山引擎控制台
2. 进入云函数服务
3. 创建新函数或更新已有函数
4. 上传 `functions/agencyManagement/` 目录
5. 设置环境变量：
   - `MONGO_URI`: MongoDB 连接字符串
6. 测试函数

### 3. 前端更新

前端代码已更新，推送到 GitHub 后会自动部署。

## 📊 数据库结构

### agencies 集合

```javascript
{
  id: "agency_1234567890",      // 机构唯一ID
  name: "无忧传媒",               // 机构名称
  type: "agency",                // 类型: agency/individual

  // 联系信息
  contactInfo: {
    contactPerson: "张经理",      // 联系人
    wechatId: "zhangsan123",     // 微信号
    phoneNumber: "13800138000",  // 手机号
    email: "contact@agency.com"  // 邮箱
  },

  // 返点配置
  rebateConfig: {
    baseRebate: 12.0,           // 基础返点率(%)
    tieredRules: [],            // 阶梯规则（预留）
    specialRules: []            // 特殊规则（预留）
  },

  // 业务信息（可选）
  businessInfo: {
    registrationNumber: "",     // 工商注册号
    legalRepresentative: "",    // 法人代表
    address: "",               // 办公地址
    bankAccount: {}            // 银行账户
  },

  // 统计信息
  statistics: {
    talentCount: 0,            // 达人数量
    totalRevenue: 0,           // 总营收
    lastUpdated: Date
  },

  description: "",             // 备注
  status: "active",           // 状态: active/inactive/suspended
  createdAt: Date,
  updatedAt: Date
}
```

### 索引

- `id`: 唯一索引
- `name`: 普通索引
- `type`: 普通索引
- `status`: 普通索引
- `type + status`: 复合索引
- 文本索引：name, contactPerson, description

## 🔧 功能特性

### 已实现

✅ 机构 CRUD 操作
✅ 联系信息管理（微信号、手机号）
✅ 基础返点配置
✅ 系统预设机构（野生达人）保护
✅ 前端界面完整

### 预留扩展

📋 阶梯返点规则
📋 特殊条件返点
📋 业务信息管理
📋 统计信息自动更新
📋 达人归属关联

## 🚀 API 接口

### 基础 URL
```
https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com/agencyManagement
```

### 接口列表

| 方法 | 参数 | 说明 |
|-----|------|------|
| GET | ?id=xxx | 获取单个机构 |
| GET | ?type=agency&status=active | 获取机构列表 |
| POST | Body: { name, type, ... } | 创建机构 |
| PUT | Body: { id, name, ... } | 更新机构 |
| DELETE | ?id=xxx | 删除机构 |

## 📝 测试数据

创建测试机构：

```javascript
POST /agencyManagement
{
  "name": "测试机构",
  "type": "agency",
  "baseRebate": 10,
  "contactPerson": "测试联系人",
  "wechatId": "test_wechat",
  "phoneNumber": "13800138000",
  "description": "这是一个测试机构"
}
```

## ⚠️ 注意事项

1. **野生达人机构**（id: "individual"）是系统预设，不可编辑或删除
2. 手机号需符合格式：`/^1[3-9]\d{9}$/`
3. 返点率范围：0-100%
4. 删除机构前需确认无关联达人

## 📅 更新记录

- **2025-11-16**: 初始版本
  - 创建数据库集合
  - 实现基础 CRUD
  - 添加联系信息字段
  - 预留返点规则扩展

---

*部署完成后，请在前端测试机构管理功能是否正常工作。*