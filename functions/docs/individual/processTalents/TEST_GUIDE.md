# processTalents v2.0 测试指南

> 测试 v1/v2 双版本兼容性的完整测试用例

---

## 🎯 测试目标

1. ✅ v1 兼容性（不影响旧系统）
2. ✅ v2 基础功能（创建、更新、查询）
3. ✅ oneId 自动生成
4. ✅ 多平台支持
5. ✅ 唯一性约束

---

## 📋 前置准备

### 1. 初始化 counters 集合

```bash
# 连接到 MongoDB
mongosh "$MONGO_URI/agentworks_db" \
  --file database/agentworks_db/scripts/init-counters.js
```

**预期输出**：
- ✅ counters 集合创建成功
- ✅ talent_oneId counter 初始值为 0

### 2. 初始化 talents 集合

```bash
mongosh "$MONGO_URI/agentworks_db" \
  --file database/agentworks_db/scripts/init-talents.js
```

---

## 🧪 测试用例

### Test 1: v1 兼容性测试（不传 dbVersion）

**目的**：确保 v1 前端（byteproject）继续正常工作

#### 1.1 创建 v1 达人

```javascript
// POST /talents
{
  "nickname": "测试达人V1-01",
  "xingtuId": "test_v1_001",
  "uid": "123456",
  "talentType": ["测试"],
  "talentTier": "头部",
  "talentSource": "野生达人"
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { created: 1 } }`
- ✅ 数据写入 `kol_data.talents`
- ✅ 生成 `id` 字段（格式：`talent_1234567890_xxxxx`）
- ✅ 有 `createdAt` 和 `updatedAt`

#### 1.2 更新 v1 达人

```javascript
{
  "xingtuId": "test_v1_001",
  "nickname": "测试达人V1-01（已更新）",
  "fansCount": 1000000
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { updated: 1 } }`
- ✅ `nickname` 和 `fansCount` 更新成功
- ✅ `updatedAt` 已更新

---

### Test 2: v2 基础功能测试

**目的**：验证 v2 创建、更新、查询功能

#### 2.1 创建新达人（不传 oneId）

```javascript
// POST /talents
{
  "dbVersion": "v2",
  "platform": "douyin",
  "platformAccountId": "dy_test_001",
  "name": "测试达人V2-01",
  "fansCount": 1000000,
  "talentType": ["美妆", "时尚"],
  "talentTier": "头部",
  "prices": {
    "video_60plus": 5000000,
    "video_20to60": 3000000
  },
  "rebate": 0.05,
  "platformSpecific": {
    "xingtuId": "123456",
    "starLevel": 5
  }
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { created: 1 } }`
- ✅ 数据写入 `agentworks_db.talents`
- ✅ 自动生成 `oneId`（格式：`talent_00000001`）
- ✅ `platform` = "douyin"
- ✅ 有 `createdAt`, `updatedAt`, `oneIdHistory: []`

**验证**：
```javascript
// 在 mongosh 中执行
use agentworks_db
db.talents.findOne({ platformAccountId: "dy_test_001" })

// 检查 counters
db.counters.findOne({ _id: "talent_oneId" })
// 预期：sequence_value = 1
```

#### 2.2 更新达人（传 oneId）

```javascript
{
  "dbVersion": "v2",
  "oneId": "talent_00000001",
  "platform": "douyin",
  "platformAccountId": "dy_test_001",
  "name": "测试达人V2-01（已更新）",
  "fansCount": 1200000
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { updated: 1 } }`
- ✅ `name` 和 `fansCount` 更新成功
- ✅ `oneId` 保持不变

#### 2.3 重复创建（相同 platformAccountId）

```javascript
{
  "dbVersion": "v2",
  "platform": "douyin",
  "platformAccountId": "dy_test_001",  // 相同的账号ID
  "name": "重复达人"
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { updated: 1 } }`
- ✅ 不会创建新记录，而是更新现有记录
- ✅ `oneId` 复用原有的 `talent_00000001`

---

### Test 3: 多平台测试

**目的**：验证同一达人在不同平台的独立记录

#### 3.1 为同一达人添加小红书平台

```javascript
{
  "dbVersion": "v2",
  "oneId": "talent_00000001",           // 相同的 oneId
  "platform": "xiaohongshu",            // 不同的平台
  "platformAccountId": "xhs_test_001",
  "name": "小红书测试达人",
  "fansCount": 500000,
  "prices": {
    "video_60plus": 3000000
  },
  "platformSpecific": {
    "mcnName": "某MCN机构",
    "contentTags": ["美妆", "探店"]
  }
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { created: 1 } }`
- ✅ 创建新记录（不是更新）
- ✅ `oneId` = "talent_00000001"（相同）
- ✅ `platform` = "xiaohongshu"（不同）

**验证**：
```javascript
// 查询某达人的所有平台
db.talents.find({ oneId: "talent_00000001" }).toArray()
// 预期：返回 2 条记录（douyin + xiaohongshu）
```

#### 3.2 尝试重复添加（相同 oneId + platform）

```javascript
{
  "dbVersion": "v2",
  "oneId": "talent_00000001",
  "platform": "douyin",                 // 相同的组合
  "platformAccountId": "dy_test_002",   // 不同的账号ID
  "name": "重复平台"
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { updated: 1 } }`
- ✅ 更新现有的 douyin 记录（不会创建新记录）
- ✅ `platformAccountId` 被更新为 "dy_test_002"

---

### Test 4: oneId 自增测试

**目的**：验证 oneId 正确自增

#### 4.1 连续创建 3 个新达人

```javascript
// 第 1 个
{
  "dbVersion": "v2",
  "platform": "douyin",
  "platformAccountId": "dy_auto_001",
  "name": "自动生成测试01"
}

// 第 2 个
{
  "dbVersion": "v2",
  "platform": "douyin",
  "platformAccountId": "dy_auto_002",
  "name": "自动生成测试02"
}

// 第 3 个
{
  "dbVersion": "v2",
  "platform": "xiaohongshu",
  "platformAccountId": "xhs_auto_001",
  "name": "自动生成测试03"
}
```

**预期结果**：
- ✅ 3 个达人的 `oneId` 分别为：
  - `talent_00000002`
  - `talent_00000003`
  - `talent_00000004`

**验证**：
```javascript
db.counters.findOne({ _id: "talent_oneId" })
// 预期：sequence_value = 4
```

---

### Test 5: 数据校验测试

**目的**：验证必需字段校验

#### 5.1 缺少必需字段（v2）

```javascript
{
  "dbVersion": "v2",
  "platform": "douyin",
  // 缺少 platformAccountId 和 name
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { skipped: 1 }, errors: [...] }`
- ✅ `errors` 中包含原因："缺少必需字段"

#### 5.2 缺少必需字段（v1）

```javascript
{
  "nickname": "测试",
  // 缺少 xingtuId
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { skipped: 1 } }`
- ✅ 不会创建记录

---

### Test 6: 批量操作测试

**目的**：验证批量创建功能

#### 6.1 批量创建（v2）

```javascript
{
  "dbVersion": "v2",
  "talents": [
    {
      "platform": "douyin",
      "platformAccountId": "dy_batch_001",
      "name": "批量测试01"
    },
    {
      "platform": "douyin",
      "platformAccountId": "dy_batch_002",
      "name": "批量测试02"
    },
    {
      "platform": "xiaohongshu",
      "platformAccountId": "xhs_batch_001",
      "name": "批量测试03"
    }
  ]
}
```

**预期结果**：
- ✅ 返回 `{ success: true, data: { created: 3 } }`
- ✅ 3 个达人的 oneId 自增

---

## ✅ 测试检查清单

### v1 兼容性
- [ ] 不传 dbVersion，数据写入 kol_data
- [ ] 创建达人成功（按 xingtuId 查找）
- [ ] 更新达人成功
- [ ] 返回格式正确

### v2 基础功能
- [ ] 传 dbVersion=v2，数据写入 agentworks_db
- [ ] oneId 自动生成（格式正确）
- [ ] 创建新达人成功
- [ ] 更新达人成功（oneId 不变）
- [ ] platformAccountId 重复时复用 oneId

### 多平台支持
- [ ] 同一 oneId 可以有多个 platform
- [ ] (oneId, platform) 唯一性保证
- [ ] 不同平台数据独立

### oneId 自增
- [ ] counters 集合正确初始化
- [ ] 每次创建新达人，sequence_value 增加
- [ ] oneId 格式正确（8位数字）

### 数据校验
- [ ] v2 缺少必需字段时跳过
- [ ] v1 缺少必需字段时跳过
- [ ] 错误信息清晰

---

## 🐛 常见问题

### Q1: oneId 生成失败

**错误信息**：
```
Cannot read property 'sequence_value' of null
```

**原因**：counters 集合未初始化

**解决方案**：
```bash
mongosh "$MONGO_URI/agentworks_db" \
  --file database/agentworks_db/scripts/init-counters.js
```

---

### Q2: 唯一索引冲突

**错误信息**：
```
E11000 duplicate key error collection: agentworks_db.talents index: idx_oneId_platform
```

**原因**：尝试插入重复的 (oneId, platform) 组合

**解决方案**：
- 这是正常的，代码会自动处理为 update 操作
- 如果出现异常，检查索引是否正确创建

---

### Q3: v1 数据无法创建

**原因**：可能是 kol_data 数据库不存在

**解决方案**：
```javascript
// 在 mongosh 中执行
use kol_data
db.createCollection('talents')
```

---

## 📝 测试报告模板

```markdown
## processTalents v2.0 测试报告

**测试日期**：2025-11-XX
**测试人员**：XXX
**环境**：测试环境

### 测试结果概览

| 测试项 | 通过 | 失败 | 备注 |
|--------|:----:|:----:|------|
| v1 兼容性 | ✅ | - | 所有用例通过 |
| v2 基础功能 | ✅ | - | 所有用例通过 |
| 多平台支持 | ✅ | - | 所有用例通过 |
| oneId 自增 | ✅ | - | 所有用例通过 |
| 数据校验 | ✅ | - | 所有用例通过 |

### 详细测试结果

#### Test 1: v1 兼容性
- [x] 1.1 创建 v1 达人 - ✅ 通过
- [x] 1.2 更新 v1 达人 - ✅ 通过

#### Test 2: v2 基础功能
- [x] 2.1 创建新达人 - ✅ 通过
- [x] 2.2 更新达人 - ✅ 通过
- [x] 2.3 重复创建 - ✅ 通过

（以下省略）

### 结论

✅ 所有测试用例通过，可以部署到生产环境。
```

---

**相关文档**：
- [升级方案](./UPGRADE_PLAN_V2.md)
- [v2 schema 设计](../../database/agentworks_db/schemas/talents.doc.json)
- [counters 初始化](../../database/agentworks_db/scripts/init-counters.js)

**最后更新**：2025-11-11
