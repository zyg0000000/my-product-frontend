# processTalents 云函数升级方案（v2.0）

> 升级 processTalents 支持 v2（agentworks_db）多平台架构

---

## 🎯 升级目标

1. **向后兼容**：v1（kol_data）继续正常工作
2. **支持 v2**：支持 agentworks_db 多平台架构
3. **oneId 管理**：自动生成和分配 oneId
4. **合并准备**：为后期达人合并做好数据结构准备

---

## 📊 数据结构对比

### v1 数据结构（保持不变）

```javascript
{
  id: "talent_1234567890_abc123",  // 程序生成的ID
  nickname: "张三的美食日记",
  xingtuId: "123456",               // 抖音星图ID（唯一键）
  uid: "67890",
  talentType: ["美妆", "时尚"],
  talentSource: "野生达人",
  talentTier: "头部",
  prices: [],                       // 数组形式
  rebates: [],                      // 数组形式
  createdAt: Date,
  updatedAt: Date
}
```

### v2 数据结构（新增）

```javascript
{
  _id: ObjectId("..."),
  oneId: "talent_00000001",         // 统一ID（跨平台）
  platform: "douyin",                // 平台标识
  platformAccountId: "123456",       // 平台账号ID（如抖音UID）
  name: "张三的美食日记",
  fansCount: 1000000,
  talentType: ["美妆", "时尚"],
  talentTier: "头部",
  prices: {                         // 对象形式（按类型）
    video_60plus: 5000000,          // 单位：分
    video_20to60: 3000000,
    video_1to20: 1000000,
    live: 8000000
  },
  rebate: 0.05,                     // 单个值（0-1）
  platformSpecific: {               // 平台特有字段
    xingtuId: "123456",             // 抖音特有
    starLevel: 5
  },
  oneIdHistory: [],                 // 合并历史
  status: "active",
  createdAt: Date,
  updatedAt: Date
}
```

**联合唯一索引**：`(oneId, platform)` - 确保一个达人在一个平台只有一条记录

---

## 🔑 核心升级点

### 1. oneId 生成策略

**需求**：自动生成 8 位数字的 oneId（如 `talent_00000001`）

**实现方案**：使用 MongoDB 自增序列

```javascript
// 创建 counters 集合（如果不存在）
db.counters.insertOne({
  _id: "talent_oneId",
  sequence_value: 0
})

// 生成下一个 oneId 的函数
async function generateNextOneId(db) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: 'talent_oneId' },
    { $inc: { sequence_value: 1 } },
    {
      upsert: true,
      returnDocument: 'after'
    }
  );

  const seqValue = result.value.sequence_value;
  return `talent_${String(seqValue).padStart(8, '0')}`;
}
```

### 2. 平台字段映射

**v1 → v2 字段映射**：

| v1 字段 | v2 字段 | 说明 |
|---------|---------|------|
| `xingtuId` | `platformAccountId` | 平台账号ID |
| `nickname` | `name` | 昵称 |
| `prices[]` | `prices{}` | 需转换结构 |
| `rebates[]` | `rebate` | 取最新一个返点 |
| - | `platform` | 新增（v1默认为 douyin） |
| - | `oneId` | 新增（自动生成） |

### 3. Upsert 逻辑调整

**v1 逻辑**：
```javascript
filter: { xingtuId: talent.xingtuId }  // 按 xingtuId 查找
```

**v2 逻辑**：
```javascript
filter: {
  oneId: talent.oneId,                 // 如果前端提供了 oneId
  platform: talent.platform
}

// 或者按 platformAccountId 查找（创建新达人时）
filter: {
  platformAccountId: talent.platformAccountId,
  platform: talent.platform
}
```

### 4. 创建新达人时的 oneId 分配

**场景 1**：前端明确指定 oneId（编辑或合并场景）
```javascript
if (talent.oneId) {
  // 使用提供的 oneId
  filter = { oneId: talent.oneId, platform: talent.platform };
}
```

**场景 2**：创建全新达人（不知道 oneId）
```javascript
if (!talent.oneId) {
  // 先检查 platformAccountId 是否已存在
  const existing = await collection.findOne({
    platformAccountId: talent.platformAccountId,
    platform: talent.platform
  });

  if (existing) {
    // 已存在，使用现有 oneId
    talent.oneId = existing.oneId;
  } else {
    // 生成新的 oneId
    talent.oneId = await generateNextOneId(db);
  }
}
```

---

## 🛠️ 实现方案

### 总体架构

```javascript
exports.handler = async (event, context) => {
  // 1. 解析请求参数
  const { dbVersion, ...body } = JSON.parse(event.body);

  // 2. 选择数据库
  const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';
  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);

  // 3. 统一处理为数组
  const talentsToProcess = Array.isArray(body) ? body : [body];

  // 4. 根据版本执行不同逻辑
  if (dbVersion === 'v2') {
    return await handleV2Process(db, talentsToProcess, headers);
  } else {
    return await handleV1Process(db, talentsToProcess, headers);
  }
};
```

### v1 逻辑（保持不变）

```javascript
async function handleV1Process(db, talentsToProcess, headers) {
  const collection = db.collection('talents');

  const bulkOperations = talentsToProcess.map(talent => {
    if (!talent.xingtuId || !talent.nickname) {
      return null;
    }

    return {
      updateOne: {
        filter: { xingtuId: talent.xingtuId },
        update: {
          $set: {
            ...talent,
            updatedAt: new Date()
          },
          $setOnInsert: {
            id: `talent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            createdAt: new Date()
          }
        },
        upsert: true
      }
    };
  }).filter(op => op !== null);

  const result = await collection.bulkWrite(bulkOperations);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        created: result.upsertedCount,
        updated: result.modifiedCount
      }
    })
  };
}
```

### v2 逻辑（新增）

```javascript
async function handleV2Process(db, talentsToProcess, headers) {
  const collection = db.collection('talents');
  const results = { created: 0, updated: 0, skipped: 0 };

  for (const talent of talentsToProcess) {
    // 数据校验
    if (!talent.platform || !talent.platformAccountId || !talent.name) {
      results.skipped++;
      continue;
    }

    // 确定 oneId
    let oneId = talent.oneId;
    if (!oneId) {
      // 检查是否已存在
      const existing = await collection.findOne({
        platformAccountId: talent.platformAccountId,
        platform: talent.platform
      });

      if (existing) {
        oneId = existing.oneId;
      } else {
        oneId = await generateNextOneId(db);
      }
    }

    // 数据转换（v2 结构）
    const v2Talent = {
      oneId,
      platform: talent.platform,
      platformAccountId: talent.platformAccountId,
      name: talent.name,
      avatar: talent.avatar,
      fansCount: talent.fansCount,
      talentType: talent.talentType || [],
      talentTier: talent.talentTier,
      prices: talent.prices || {},
      rebate: talent.rebate,
      platformSpecific: talent.platformSpecific || {},
      performanceData: talent.performanceData || {},
      schedules: talent.schedules || [],
      remarks: talent.remarks || {},
      status: talent.status || 'active',
      updatedAt: new Date()
    };

    // Upsert 操作
    const result = await collection.updateOne(
      { oneId, platform: talent.platform },
      {
        $set: v2Talent,
        $setOnInsert: {
          createdAt: new Date(),
          oneIdHistory: []
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      results.created++;
    } else if (result.modifiedCount > 0) {
      results.updated++;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: results
    })
  };
}

// oneId 生成函数
async function generateNextOneId(db) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: 'talent_oneId' },
    { $inc: { sequence_value: 1 } },
    {
      upsert: true,
      returnDocument: 'after'
    }
  );

  const seqValue = result.value.sequence_value;
  return `talent_${String(seqValue).padStart(8, '0')}`;
}
```

---

## 📝 前端调用方式

### v1 前端（byteproject）- 无需改动

```javascript
// 继续原有调用方式
await API.request('/talents', 'POST', {
  nickname: "张三的美食日记",
  xingtuId: "123456",
  uid: "67890",
  talentType: ["美妆"],
  talentTier: "头部"
});
```

### v2 前端（agentworks）- 新增 dbVersion 参数

#### 创建新达人（不知道 oneId）

```javascript
await API.request('/talents', 'POST', {
  dbVersion: 'v2',                   // 指定 v2 数据库
  platform: 'douyin',                 // 平台
  platformAccountId: '123456',        // 平台账号ID
  name: '张三的美食日记',
  fansCount: 1000000,
  talentType: ['美妆', '时尚'],
  talentTier: '头部',
  prices: {
    video_60plus: 5000000,
    video_20to60: 3000000
  },
  rebate: 0.05,
  platformSpecific: {
    xingtuId: '123456',
    starLevel: 5
  }
});
```

#### 更新达人（已知 oneId）

```javascript
await API.request('/talents', 'POST', {
  dbVersion: 'v2',
  oneId: 'talent_00000001',          // 指定 oneId
  platform: 'douyin',
  platformAccountId: '123456',
  name: '张三的美食日记（更新）',
  fansCount: 1200000                  // 只更新需要改的字段
});
```

#### 为已有达人添加新平台

```javascript
await API.request('/talents', 'POST', {
  dbVersion: 'v2',
  oneId: 'talent_00000001',          // 相同的 oneId
  platform: 'xiaohongshu',            // 不同的平台
  platformAccountId: 'xhs_789012',
  name: '小张爱做菜',
  fansCount: 500000,
  prices: {
    video_60plus: 3000000
  }
});
```

---

## 🧪 测试计划

### 1. v1 兼容性测试

```javascript
// 测试 v1 创建达人（不传 dbVersion，默认 v1）
const response1 = await API.request('/talents', 'POST', {
  nickname: "测试达人v1",
  xingtuId: "test001",
  talentType: ["测试"]
});
// 预期：在 kol_data 数据库创建成功

// 测试 v1 更新达人
const response2 = await API.request('/talents', 'POST', {
  xingtuId: "test001",
  nickname: "测试达人v1（更新）"
});
// 预期：更新成功
```

### 2. v2 基础功能测试

```javascript
// 测试 v2 创建新达人（不传 oneId）
const response3 = await API.request('/talents', 'POST', {
  dbVersion: 'v2',
  platform: 'douyin',
  platformAccountId: 'dy_test001',
  name: '测试达人v2'
});
// 预期：自动生成 oneId，如 talent_00000001

// 测试 v2 更新达人（传 oneId）
const response4 = await API.request('/talents', 'POST', {
  dbVersion: 'v2',
  oneId: 'talent_00000001',
  platform: 'douyin',
  platformAccountId: 'dy_test001',
  name: '测试达人v2（更新）'
});
// 预期：更新成功，oneId 不变
```

### 3. v2 多平台测试

```javascript
// 为同一达人添加小红书平台
const response5 = await API.request('/talents', 'POST', {
  dbVersion: 'v2',
  oneId: 'talent_00000001',           // 相同 oneId
  platform: 'xiaohongshu',             // 不同平台
  platformAccountId: 'xhs_test001',
  name: '测试达人小红书'
});
// 预期：创建成功，(oneId, platform) 联合唯一

// 查询某达人的所有平台
db.talents.find({ oneId: 'talent_00000001' });
// 预期：返回 2 条记录（douyin + xiaohongshu）
```

### 4. v2 唯一性约束测试

```javascript
// 尝试重复创建相同的 (oneId, platform)
const response6 = await API.request('/talents', 'POST', {
  dbVersion: 'v2',
  oneId: 'talent_00000001',
  platform: 'douyin',                  // 相同的组合
  platformAccountId: 'dy_test002',     // 不同的账号ID
  name: '重复达人'
});
// 预期：更新现有记录，不会创建新记录
```

### 5. oneId 自增测试

```javascript
// 创建多个新达人，验证 oneId 自增
for (let i = 0; i < 3; i++) {
  await API.request('/talents', 'POST', {
    dbVersion: 'v2',
    platform: 'douyin',
    platformAccountId: `dy_auto_${i}`,
    name: `自动生成测试${i}`
  });
}

// 查询 counters 集合
db.counters.findOne({ _id: 'talent_oneId' });
// 预期：sequence_value 增加了 3
```

---

## ⚠️ 注意事项

### 1. 初始化 counters 集合

在首次使用 v2 前，需要初始化 counters 集合：

```javascript
// 在 agentworks_db 中执行
db.counters.insertOne({
  _id: 'talent_oneId',
  sequence_value: 0
});
```

### 2. platformAccountId 的唯一性

- v2 中 `platformAccountId` 在同一 `platform` 下应该是唯一的
- 但数据库没有强制这个约束，因为可能同一账号在不同时期有不同 oneId
- 创建时通过代码逻辑保证

### 3. 数据转换

- **价格转换**：v1 的 `prices[]` 需要手动转换为 v2 的 `prices{}`
- **返点转换**：v1 的 `rebates[]` 取最新一个，转换为 v2 的 `rebate`

### 4. 错误处理

```javascript
try {
  // v2 逻辑
} catch (error) {
  if (error.code === 11000) {
    // 唯一索引冲突
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        success: false,
        message: '该达人在该平台已存在',
        error: 'duplicate_key'
      })
    };
  }
  throw error;
}
```

---

## 📅 升级计划

### Phase 1: 准备阶段（Day 1）

- [x] 阅读 v2 schema 设计
- [x] 理解 oneId 生成机制
- [x] 制定升级方案

### Phase 2: 开发阶段（Day 2-3）

- [ ] 实现 `generateNextOneId` 函数
- [ ] 实现 `handleV2Process` 函数
- [ ] 修改主 handler 支持版本判断
- [ ] 添加数据转换逻辑

### Phase 3: 测试阶段（Day 4）

- [ ] v1 兼容性测试
- [ ] v2 基础功能测试
- [ ] v2 多平台测试
- [ ] 唯一性约束测试
- [ ] oneId 自增测试

### Phase 4: 部署阶段（Day 5）

- [ ] 初始化 counters 集合
- [ ] 部署到火山引擎
- [ ] 线上验证
- [ ] 更新 API 文档

---

## 🔗 相关文档

- [v2 talents schema](../../database/agentworks_db/schemas/talents.doc.json)
- [v2 数据库 README](../../database/agentworks_db/README.md)
- [云函数升级总方案](../UPGRADE_PLAN.md)

---

**维护者**：产品团队
**最后更新**：2025-11-11
**版本**：v2.0 升级方案
