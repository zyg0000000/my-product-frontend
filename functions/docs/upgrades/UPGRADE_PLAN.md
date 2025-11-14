# 云函数升级方案（v1 → v2 双版本支持）

> 让云函数同时支持 v1（kol_data）和 v2（agentworks_db）数据库

---

## 🎯 升级目标

1. **向后兼容**：v1 前端（byteproject）继续正常工作
2. **支持 v2**：v2 前端（agentworks）可以调用新逻辑
3. **统一标准**：所有函数遵循相同的升级模式
4. **最小改动**：尽量复用现有代码

---

## 📊 函数分类（是否需要升级）

### ✅ 第一优先级：必须升级（8个）

直接操作 talents/projects/collaborations 数据的核心函数：

| 函数名 | 状态 | v2 核心变化 | 版本 |
|--------|:----:|------------|:----:|
| **processTalents** | ✅ | oneId 自动生成、多平台支持 | v2.0 |
| **getTalents** | ✅ | 支持 oneId 分组、platform 筛选 | v3.0 |
| **updateTalent** | ✅ | 按 (oneId, platform) 精确更新 | v3.0 |
| **deleteTalent** | ✅ | 单平台/全平台删除确认机制 | v2.0 |
| **getProjects** | ⏳ | 需支持 platforms 数组筛选 | - |
| **addProject** | ⏳ | 需支持 platforms 字段 | - |
| **getCollaborators** | ⏳ | 需支持 talentOneId + platform | - |
| **addCollaborator** | ⏳ | 需支持 talentOneId、platform | - |

**完成进度**：4/8 (50%) ✅

---

### 🔄 第二优先级：可选升级（12个）

涉及数据查询但不影响核心业务：

| 函数名 | 原因 | 是否急需 |
|--------|------|---------|
| **getTalentsByIds** | 批量查询 | 中 |
| **getTalentsSearch** | 搜索 | 中 |
| **getTalentHistory** | 历史记录 | 低 |
| **batchUpdateTalents** | 批量更新 | 中 |
| **bulkCreateTalents** | 批量创建 | 中 |
| **updateProject** | 更新项目 | 中 |
| **updateCollaborator** | 更新合作 | 中 |
| **deleteProject** | 删除项目 | 低 |
| **deleteCollaborator** | 删除合作 | 低 |
| **getProjectPerformance** | 项目性能 | 低 |
| **exportAllTalents** | 导出达人 | 低 |
| **exportComprehensiveData** | 综合导出 | 低 |

---

### ⏸️ 第三优先级：暂不升级（31个）

不直接操作数据库或纯工具函数：

| 分类 | 函数数量 | 说明 |
|------|---------|------|
| 文件管理 | 3 | uploadFile, previewFile, deleteFile |
| 飞书集成 | 4 | syncToFeishu, syncFromFeishu 等 |
| 自动化 | 6 | automation-workflows, automation-jobs 等 |
| 作品管理 | 5 | getWorks, addWork 等（v2 可能暂不需要） |
| 配置管理 | 3 | getFieldMetadata, processConfigurations 等 |
| 系统工具 | 2 | checkSystemStatus, getMetadata |
| 其他 | 8 | 各种辅助函数 |

---

## 🛠️ 统一升级模式

### 模式 A：通过请求参数识别版本（推荐）

```javascript
/**
 * 云函数：getTalents (v3.0 - 支持双数据库)
 * 描述：获取达人列表，支持 v1 和 v2 数据库
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

let client;

async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // 解析请求参数
    let queryParams = {};
    if (event.queryStringParameters) {
      queryParams = event.queryStringParameters;
    }
    if (event.body) {
      try {
        Object.assign(queryParams, JSON.parse(event.body));
      } catch(e) { /* ignore */ }
    }

    // 【关键】从请求参数中获取版本信息
    const { dbVersion, ...filters } = queryParams;

    // 根据版本选择数据库
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 根据版本执行不同逻辑
    if (dbVersion === 'v2') {
      return await handleV2Logic(db, filters, headers);
    } else {
      return await handleV1Logic(db, filters, headers);
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};

// v1 逻辑（保持原有逻辑）
async function handleV1Logic(db, filters, headers) {
  const talentsCollection = db.collection('talents');

  // ... 原有的 v1 查询逻辑 ...
  const talents = await talentsCollection.find({}).toArray();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: talents })
  };
}

// v2 逻辑（新增逻辑）
async function handleV2Logic(db, filters, headers) {
  const talentsCollection = db.collection('talents');
  const { platform, groupBy, ...otherFilters } = filters;

  // v2 特有逻辑：按 oneId 分组
  if (groupBy === 'oneId') {
    const talents = await talentsCollection.aggregate([
      { $match: platform ? { platform } : {} },
      {
        $group: {
          _id: '$oneId',
          platforms: { $push: '$$ROOT' }
        }
      }
    ]).toArray();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: talents })
    };
  }

  // v2 普通查询
  const matchQuery = {};
  if (platform) matchQuery.platform = platform;

  const talents = await talentsCollection.find(matchQuery).toArray();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: talents })
  };
}
```

---

### 模式 B：通过 HTTP Header 识别（备选）

```javascript
// 从 Header 获取版本
const dbVersion = event.headers['X-App-Version'] || event.headers['x-app-version'] || 'v1';
const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';
```

---

## 📋 前端调用方式

### v1 前端（byteproject）- 无需改动

```javascript
// 继续原有调用方式，默认使用 v1
const response = await fetch(`${API_BASE}/getTalents?view=simple`);
```

### v2 前端（agentworks）- 新增 dbVersion 参数

```javascript
// 方式 1：URL 参数
const response = await fetch(`${API_BASE}/getTalents?dbVersion=v2&platform=douyin&groupBy=oneId`);

// 方式 2：POST body
const response = await fetch(`${API_BASE}/getTalents`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dbVersion: 'v2',
    platform: 'douyin',
    groupBy: 'oneId'
  })
});

// 方式 3：HTTP Header（备选）
const response = await fetch(`${API_BASE}/getTalents`, {
  headers: {
    'X-App-Version': 'v2'
  }
});
```

---

## 🎯 v2 特有的请求参数

### talents 相关函数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `dbVersion` | string | 数据库版本 | `"v2"` |
| `platform` | string | 平台筛选 | `"douyin"`, `"xiaohongshu"` |
| `groupBy` | string | 分组方式 | `"oneId"` |
| `oneId` | string | 达人统一ID | `"talent_00000001"` |

### cooperations 相关函数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `dbVersion` | string | 数据库版本 | `"v2"` |
| `talentOneId` | string | 达人统一ID | `"talent_00000001"` |
| `platform` | string | 合作平台 | `"douyin"` |

---

## 🔄 升级步骤（每个函数）

### Step 1: 备份原函数

```bash
# 复制原函数代码到 legacy 文件
cp functions/getTalents/index.js functions/getTalents/index.v1.js
```

### Step 2: 修改函数

1. 在顶部增加版本号注释：`v3.0 - 支持双数据库`
2. 解析 `dbVersion` 参数
3. 根据版本选择数据库名称
4. 将原有逻辑封装到 `handleV1Logic`
5. 新增 `handleV2Logic` 函数
6. 在主 handler 中根据版本调用对应函数

### Step 3: 测试

1. 测试 v1 调用（不带 dbVersion 参数）
2. 测试 v2 调用（带 dbVersion=v2 参数）
3. 验证两者互不影响

### Step 4: 部署

```bash
# 部署到火山引擎云函数
```

---

## ⚠️ 注意事项

### 1. 数据库连接复用

**问题**：MongoDB 连接是全局的，切换数据库需要注意

**解决**：
```javascript
const dbClient = await connectToDatabase();
const db = dbClient.db(DB_NAME);  // 每次请求动态选择数据库
```

### 2. 环境变量

**保持不变**：
- `MONGO_URI` - MongoDB 连接字符串
- `MONGO_DB_NAME` - 默认数据库（废弃，改用动态判断）

### 3. 错误处理

**统一格式**：
```javascript
{
  "success": false,
  "message": "错误信息",
  "dbVersion": "v2"  // 便于调试
}
```

### 4. 性能考虑

- v2 的 oneId 分组查询可能较慢，考虑添加索引
- 对于高频查询，可以添加缓存

---

## 📝 升级优先级建议

### 第一批（最急需）

1. **getTalents** - 达人列表查询
2. **createTalent** - 创建达人（需支持 oneId）
3. **addCollaborator** - 创建合作（需支持 talentOneId + platform）

### 第二批

4. **updateTalent** - 更新达人
5. **getCollaborators** - 查询合作
6. **getProjects** - 查询项目
7. **addProject** - 创建项目

### 第三批

8. 其他查询和修改类函数

---

## 🎯 新增 v2 特有函数（可选）

如果某些 v2 特有逻辑太复杂，可以新建独立函数：

| 函数名 | 用途 |
|--------|------|
| **mergeTalents** | 合并达人（v2 特有） |
| **getTalentAllPlatforms** | 查询某达人的所有平台（v2 特有） |
| **findDuplicateTalents** | 查找可能重复的达人（v2 特有） |

---

## 📖 总结

### 核心原则

1. ✅ **参数化版本控制**：通过 `dbVersion` 参数识别
2. ✅ **逻辑分离**：v1 和 v2 逻辑独立，互不影响
3. ✅ **向后兼容**：v1 前端无需任何改动
4. ✅ **渐进式升级**：按优先级逐步升级，不影响线上

### 升级检查清单

- [ ] 解析 `dbVersion` 参数
- [ ] 根据版本选择数据库
- [ ] 封装 v1 逻辑到独立函数
- [ ] 实现 v2 逻辑
- [ ] 添加版本信息到错误响应
- [ ] 测试 v1 调用
- [ ] 测试 v2 调用
- [ ] 更新函数文档

---

**下一步**：选择第一个函数开始升级（建议从 `getTalents` 开始）

**维护者**：产品团队
**最后更新**：2025-11-11
**方案版本**：v1.0
