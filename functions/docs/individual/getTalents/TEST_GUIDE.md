# getTalents v3.0 测试指南

> 适用于 v1/v2 双版本架构的 getTalents 云函数

---

## 📋 测试清单概览

| 测试类别 | 测试数量 | 重要性 |
|---------|:--------:|:------:|
| v1 兼容性测试 | 4 | ⭐⭐⭐ |
| v2 基础查询 | 5 | ⭐⭐⭐ |
| v2 平台筛选 | 3 | ⭐⭐⭐ |
| v2 分组查询 | 3 | ⭐⭐⭐ |
| 视图模式测试 | 2 | ⭐⭐ |
| 错误处理 | 2 | ⭐⭐ |

**总计**：19 个测试用例

---

## 🔧 测试准备

### 1. 数据库准备

确保已有测试数据：

#### v1 数据库（kol_data）
```javascript
// 需要至少 2 个测试达人
{
  "id": "talent_test_v1_001",
  "nickname": "测试达人001",
  "xingtuId": "xingtu_12345"
}
```

#### v2 数据库（agentworks_db）
```javascript
// 需要以下测试数据
[
  {
    "oneId": "talent_00000001",
    "platform": "douyin",
    "nickname": "张三（抖音）",
    "platformAccountId": "dy_123456"
  },
  {
    "oneId": "talent_00000001",
    "platform": "xiaohongshu",
    "nickname": "张三（小红书）",
    "platformAccountId": "xhs_789012"
  },
  {
    "oneId": "talent_00000002",
    "platform": "douyin",
    "nickname": "李四（抖音）",
    "platformAccountId": "dy_234567"
  }
]
```

### 2. API 端点

- **本地测试**：`http://localhost:8080/getTalents`
- **生产环境**：`https://your-cloud-function-url/getTalents`

---

## 🧪 详细测试用例

### 测试类别 1: v1 兼容性测试

#### 用例 1.1 - v1 查询所有达人（默认行为）

**请求**：
```bash
GET /getTalents
# 或显式指定 v1
GET /getTalents?dbVersion=v1
```

**预期结果**：
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "talent_test_v1_001",
      "nickname": "测试达人001",
      "xingtuId": "xingtu_12345",
      "collaborationCount": 0,
      "inCollaboration": false
    },
    // ...更多达人
  ],
  "view": "full"
}
```

**验证点**：
- ✅ 默认使用 v1（向后兼容）
- ✅ 包含 collaborationCount 和 inCollaboration 字段
- ✅ 返回的是 v1 数据库（kol_data）的数据

---

#### 用例 1.2 - v1 按 talentId 查询单个达人

**请求**：
```bash
GET /getTalents?talentId=talent_test_v1_001
```

**预期结果**：
```json
{
  "success": true,
  "data": {
    "id": "talent_test_v1_001",
    "nickname": "测试达人001",
    "xingtuId": "xingtu_12345",
    "collaborationCount": 0,
    "inCollaboration": false
  }
}
```

**验证点**：
- ✅ 返回单个对象（不是数组）
- ✅ 找不到时返回 404

---

#### 用例 1.3 - v1 简单视图（simple）

**请求**：
```bash
GET /getTalents?view=simple
```

**预期结果**：
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "talent_test_v1_001",
      "nickname": "测试达人001",
      "xingtuId": "xingtu_12345"
    }
  ],
  "view": "simple"
}
```

**验证点**：
- ✅ 只返回基础字段（id, nickname, xingtuId）
- ✅ **不包含** collaborationCount 和 inCollaboration

---

#### 用例 1.4 - v1 查询不存在的达人

**请求**：
```bash
GET /getTalents?talentId=non_existent_id
```

**预期结果**：
```json
{
  "success": false,
  "message": "未找到 ID 为 'non_existent_id' 的达人"
}
```

**HTTP 状态码**：`404`

**验证点**：
- ✅ 返回 404 状态码
- ✅ 提供友好的错误信息

---

### 测试类别 2: v2 基础查询

#### 用例 2.1 - v2 查询所有达人（扁平结构）

**请求**：
```bash
GET /getTalents?dbVersion=v2
```

**预期结果**：
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "oneId": "talent_00000001",
      "platform": "douyin",
      "nickname": "张三（抖音）",
      "platformAccountId": "dy_123456",
      // ...其他字段
    },
    {
      "oneId": "talent_00000001",
      "platform": "xiaohongshu",
      "nickname": "张三（小红书）",
      "platformAccountId": "xhs_789012"
    },
    {
      "oneId": "talent_00000002",
      "platform": "douyin",
      "nickname": "李四（抖音）",
      "platformAccountId": "dy_234567"
    }
  ],
  "view": "full"
}
```

**验证点**：
- ✅ 使用 agentworks_db 数据库
- ✅ 返回扁平结构（每个平台一条记录）
- ✅ count 等于记录总数（3）

---

#### 用例 2.2 - v2 按 oneId 查询单个达人（多平台）

**请求**：
```bash
GET /getTalents?dbVersion=v2&oneId=talent_00000001
```

**预期结果**：
```json
{
  "success": true,
  "data": [
    {
      "oneId": "talent_00000001",
      "platform": "douyin",
      "nickname": "张三（抖音）"
    },
    {
      "oneId": "talent_00000001",
      "platform": "xiaohongshu",
      "nickname": "张三（小红书）"
    }
  ]
}
```

**验证点**：
- ✅ 返回该 oneId 的所有平台数据
- ✅ 如果只有一个平台，返回单个对象
- ✅ 如果有多个平台，返回数组

---

#### 用例 2.3 - v2 按 oneId + platform 查询单个平台

**请求**：
```bash
GET /getTalents?dbVersion=v2&oneId=talent_00000001&platform=douyin
```

**预期结果**：
```json
{
  "success": true,
  "data": {
    "oneId": "talent_00000001",
    "platform": "douyin",
    "nickname": "张三（抖音）",
    "platformAccountId": "dy_123456"
  }
}
```

**验证点**：
- ✅ 返回单个对象（不是数组）
- ✅ 精确匹配 oneId 和 platform

---

#### 用例 2.4 - v2 查询不存在的 oneId

**请求**：
```bash
GET /getTalents?dbVersion=v2&oneId=talent_99999999
```

**预期结果**：
```json
{
  "success": false,
  "message": "未找到 oneId 为 'talent_99999999' 的达人"
}
```

**HTTP 状态码**：`404`

---

#### 用例 2.5 - v2 简单视图

**请求**：
```bash
GET /getTalents?dbVersion=v2&view=simple
```

**预期结果**：
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "oneId": "talent_00000001",
      "platform": "douyin",
      "nickname": "张三（抖音）",
      "platformAccountId": "dy_123456"
    }
    // ...其他达人，只包含基础字段
  ],
  "view": "simple"
}
```

**验证点**：
- ✅ 只返回 oneId, platform, nickname, platformAccountId 字段

---

### 测试类别 3: v2 平台筛选

#### 用例 3.1 - 只查询抖音达人

**请求**：
```bash
GET /getTalents?dbVersion=v2&platform=douyin
```

**预期结果**：
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "oneId": "talent_00000001",
      "platform": "douyin",
      "nickname": "张三（抖音）"
    },
    {
      "oneId": "talent_00000002",
      "platform": "douyin",
      "nickname": "李四（抖音）"
    }
  ]
}
```

**验证点**：
- ✅ 所有记录的 platform 都是 "douyin"
- ✅ 不包含其他平台的数据

---

#### 用例 3.2 - 只查询小红书达人

**请求**：
```bash
GET /getTalents?dbVersion=v2&platform=xiaohongshu
```

**预期结果**：
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "oneId": "talent_00000001",
      "platform": "xiaohongshu",
      "nickname": "张三（小红书）"
    }
  ]
}
```

**验证点**：
- ✅ 所有记录的 platform 都是 "xiaohongshu"

---

#### 用例 3.3 - 查询不存在的平台

**请求**：
```bash
GET /getTalents?dbVersion=v2&platform=bilibili
```

**预期结果**：
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

**验证点**：
- ✅ 返回空数组（不报错）
- ✅ count 为 0

---

### 测试类别 4: v2 分组查询（按 oneId）

#### 用例 4.1 - 按 oneId 分组查询所有达人

**请求**：
```bash
GET /getTalents?dbVersion=v2&groupBy=oneId
```

**预期结果**：
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "oneId": "talent_00000001",
      "platforms": [
        {
          "oneId": "talent_00000001",
          "platform": "douyin",
          "nickname": "张三（抖音）"
        },
        {
          "oneId": "talent_00000001",
          "platform": "xiaohongshu",
          "nickname": "张三（小红书）"
        }
      ]
    },
    {
      "oneId": "talent_00000002",
      "platforms": [
        {
          "oneId": "talent_00000002",
          "platform": "douyin",
          "nickname": "李四（抖音）"
        }
      ]
    }
  ],
  "view": "full",
  "groupBy": "oneId"
}
```

**验证点**：
- ✅ count 表示不同 oneId 的数量（2）
- ✅ 每个分组包含 oneId 和 platforms 数组
- ✅ talent_00000001 有 2 个平台
- ✅ talent_00000002 只有 1 个平台

---

#### 用例 4.2 - 按 oneId 分组 + 平台筛选

**请求**：
```bash
GET /getTalents?dbVersion=v2&groupBy=oneId&platform=douyin
```

**预期结果**：
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "oneId": "talent_00000001",
      "platforms": [
        {
          "platform": "douyin",
          "nickname": "张三（抖音）"
        }
      ]
    },
    {
      "oneId": "talent_00000002",
      "platforms": [
        {
          "platform": "douyin",
          "nickname": "李四（抖音）"
        }
      ]
    }
  ],
  "groupBy": "oneId"
}
```

**验证点**：
- ✅ 所有 platforms 数组中只包含 douyin 平台
- ✅ count 仍然表示 oneId 数量

---

#### 用例 4.3 - 按 oneId 分组 + 简单视图

**请求**：
```bash
GET /getTalents?dbVersion=v2&groupBy=oneId&view=simple
```

**预期结果**：
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "oneId": "talent_00000001",
      "platforms": [
        {
          "oneId": "talent_00000001",
          "platform": "douyin",
          "nickname": "张三（抖音）",
          "platformAccountId": "dy_123456"
        },
        {
          "oneId": "talent_00000001",
          "platform": "xiaohongshu",
          "nickname": "张三（小红书）",
          "platformAccountId": "xhs_789012"
        }
      ]
    }
  ],
  "view": "simple",
  "groupBy": "oneId"
}
```

**验证点**：
- ✅ platforms 数组中只包含基础字段
- ✅ 分组结构正确

---

### 测试类别 5: 视图模式测试

#### 用例 5.1 - 对比 v1 的 simple 和 full 视图

**simple 请求**：
```bash
GET /getTalents?dbVersion=v1&view=simple
```

**full 请求**：
```bash
GET /getTalents?dbVersion=v1&view=full
# 或省略 view 参数（默认 full）
GET /getTalents?dbVersion=v1
```

**验证点**：
- ✅ simple 视图**不包含** collaborationCount 和 inCollaboration
- ✅ full 视图**包含** collaborationCount 和 inCollaboration

---

#### 用例 5.2 - v2 视图字段差异

**simple 请求**：
```bash
GET /getTalents?dbVersion=v2&view=simple
```

**full 请求**：
```bash
GET /getTalents?dbVersion=v2&view=full
```

**验证点**：
- ✅ simple 返回：oneId, platform, nickname, platformAccountId
- ✅ full 返回：所有字段（包括粉丝数、评级等）

---

### 测试类别 6: 错误处理

#### 用例 6.1 - 数据库连接失败（模拟）

**模拟场景**：关闭 MongoDB 或使用错误的连接字符串

**预期结果**：
```json
{
  "success": false,
  "message": "服务器内部错误",
  "error": "MongoClient connect error: ..."
}
```

**HTTP 状态码**：`500`

---

#### 用例 6.2 - 无效的查询参数

**请求**：
```bash
GET /getTalents?dbVersion=v2&groupBy=invalid
```

**预期结果**：
```json
{
  "success": true,
  "count": 3,
  "data": [
    // 返回扁平结构（忽略无效的 groupBy 参数）
  ]
}
```

**验证点**：
- ✅ 不报错，按默认逻辑处理
- ✅ 无效的 groupBy 值被忽略

---

## 📊 测试结果记录表

### v1 兼容性测试

| 用例 | 状态 | 备注 |
|------|:----:|------|
| 1.1 查询所有达人 | ⬜ | |
| 1.2 按 talentId 查询 | ⬜ | |
| 1.3 简单视图 | ⬜ | |
| 1.4 查询不存在的达人 | ⬜ | |

### v2 基础查询

| 用例 | 状态 | 备注 |
|------|:----:|------|
| 2.1 查询所有达人 | ⬜ | |
| 2.2 按 oneId 查询 | ⬜ | |
| 2.3 按 oneId + platform 查询 | ⬜ | |
| 2.4 查询不存在的 oneId | ⬜ | |
| 2.5 简单视图 | ⬜ | |

### v2 平台筛选

| 用例 | 状态 | 备注 |
|------|:----:|------|
| 3.1 只查询抖音达人 | ⬜ | |
| 3.2 只查询小红书达人 | ⬜ | |
| 3.3 查询不存在的平台 | ⬜ | |

### v2 分组查询

| 用例 | 状态 | 备注 |
|------|:----:|------|
| 4.1 按 oneId 分组 | ⬜ | |
| 4.2 分组 + 平台筛选 | ⬜ | |
| 4.3 分组 + 简单视图 | ⬜ | |

### 视图模式

| 用例 | 状态 | 备注 |
|------|:----:|------|
| 5.1 v1 视图对比 | ⬜ | |
| 5.2 v2 视图字段差异 | ⬜ | |

### 错误处理

| 用例 | 状态 | 备注 |
|------|:----:|------|
| 6.1 数据库连接失败 | ⬜ | |
| 6.2 无效查询参数 | ⬜ | |

**说明**：⬜ 未测试 | ✅ 通过 | ❌ 失败

---

## 🎯 关键验证点总结

### 1. v1/v2 隔离验证

- ✅ v1 查询只访问 kol_data 数据库
- ✅ v2 查询只访问 agentworks_db 数据库
- ✅ 默认（无 dbVersion）使用 v1

### 2. 查询参数验证

| 参数 | v1 | v2 | 说明 |
|------|:--:|:--:|------|
| `dbVersion` | ✅ | ✅ | 版本控制 |
| `talentId` | ✅ | ❌ | v1 达人 ID |
| `oneId` | ❌ | ✅ | v2 达人 oneId |
| `platform` | ❌ | ✅ | v2 平台筛选 |
| `groupBy` | ❌ | ✅ | v2 分组模式 |
| `view` | ✅ | ✅ | simple/full 视图 |

### 3. 返回格式验证

**v1 格式**：
```javascript
{
  success: true,
  count: Number,
  data: Array | Object,  // 单个查询时返回对象
  view: 'simple' | 'full'
}
```

**v2 格式（扁平）**：
```javascript
{
  success: true,
  count: Number,
  data: Array | Object,  // 单个查询时返回对象
  view: 'simple' | 'full'
}
```

**v2 格式（分组）**：
```javascript
{
  success: true,
  count: Number,  // oneId 数量
  data: [
    {
      oneId: String,
      platforms: Array
    }
  ],
  view: 'simple' | 'full',
  groupBy: 'oneId'
}
```

---

## 🔗 相关文档

- [getTalents 函数代码](../../getTalents/index.js)
- [整体升级方案](../upgrades/UPGRADE_PLAN.md)
- [v2 Schema 设计](../../../database/agentworks_db/schemas/talents.doc.json)
- [processTalents 测试指南](./processTalents/TEST_GUIDE.md)

---

**创建时间**：2025-11-14
**适用版本**：getTalents v3.0+
**维护者**：产品团队
