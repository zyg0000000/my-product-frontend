# AgentWorks 达人近期表现页面 - 设计方案

> **版本**: v1.0 (最终确认版)
> **创建日期**: 2025-11-18
> **状态**: ✅ 已确认
> **负责人**: Claude Code

---

## 🎯 用户确认结果

| 问题 | 用户反馈 | 方案调整 |
|------|---------|---------|
| **问题1: 数据存储** | ✅ 使用 talents.performanceData（如果不影响效率） | 已验证，不影响 |
| **问题2: syncFromFeishu** | ✅ 升级现有，但必须支持未来剥离 | 设计模块化架构 |
| **问题3: API合并** | ✅ 同意 | 2个RESTful云函数 |

---

## 📊 问题 1: performanceData 存储效率验证

### 数据查询效率分析

#### 场景 1: 列表查询（带 performanceData）

**查询**:
```javascript
// getTalents API
db.talents.find({ platform: 'douyin' })
  .sort({ updatedAt: -1 })
  .limit(15)
  .toArray();

// 返回数据包含 performanceData
[
  {
    oneId: 'talent_00000001',
    platform: 'douyin',
    name: '李佳琦',
    performanceData: {
      cpm: 12000,
      audienceGender: { male: 0.45, female: 0.55 },
      crowdPackage: { ... }
    }
  }
]
```

**性能分析**:
- ✅ 单表查询，无 JOIN
- ✅ 索引支持（platform + updatedAt）
- ✅ 所有数据一次读取，无额外查询
- ✅ 文档大小：约 3-5 KB/条（在合理范围）

**结论**: ✅ **不影响查询效率**

---

#### 场景 2: 仅查询基础信息（不需要 performanceData）

**查询**（使用 projection）:
```javascript
db.talents.find(
  { platform: 'douyin' },
  { projection: { performanceData: 0 } }  // 排除 performanceData
)
```

**性能分析**:
- ✅ 可选择性排除 performanceData
- ✅ 减少网络传输
- ✅ 灵活性高

**结论**: ✅ **按需查询，高效**

---

#### 场景 3: 批量更新 performanceData

**更新**（使用点表示法）:
```javascript
// syncFromFeishu 已验证的高效方式
db.talents.updateOne(
  { oneId: 'talent_00000001', platform: 'douyin' },
  {
    $set: {
      'performanceData.cpm': 12000,
      'performanceData.audienceGender.male': 0.45,
      'performanceData.crowdPackage.z_era': 0.18,
      'performanceData.lastUpdated': new Date()
    }
  }
);
```

**性能分析**:
- ✅ 点表示法精确更新
- ✅ 不影响其他字段
- ✅ 原子操作

**结论**: ✅ **更新高效**

---

### ✅ 最终确认

**数据存储在 talents.performanceData**:
- ✅ 查询效率：不影响
- ✅ 更新效率：高效（点表示法）
- ✅ 数据一致性：强（单表）
- ✅ 架构简洁：无需新建集合

**MongoDB 文档大小限制**: 16 MB
**当前 talents 文档**: ~5 KB（performanceData 约 2 KB）
**安全余量**: 3000 倍 ✅

---

## 🔄 问题 2: syncFromFeishu 可剥离架构设计

### 核心思想

**现在**: 升级 syncFromFeishu（复用基础设施）
**未来**: 如需剥离，可以低成本迁移

---

### 模块化设计（关键）

#### 当前 syncFromFeishu 结构分析

```
syncFromFeishu/
├── index.js（入口，66行）
│   └── 调用 handleFeishuRequest
└── utils.js（核心逻辑，1005行）
    ├── 飞书 API 层（~300行）
    │   ├── getTenantAccessToken()
    │   ├── readFeishuSheet()
    │   ├── writeImageToCell()
    │   └── ...
    ├── 业务处理层（~500行）
    │   ├── handleTalentImport()  ⭐ 性能数据导入
    │   ├── performProjectSync()
    │   └── generateAutomationSheet()
    └── 通用工具层（~200行）
        ├── parseFlexibleNumber()
        ├── evaluateFormula()
        └── ...
```

---

### 🎯 可剥离架构设计

#### 方案：分层解耦 + 独立接口

**重构为清晰的3层**:

```
syncFromFeishu/
├── index.js（路由层）
├── feishu-api.js ⭐（飞书API层，独立）
│   ├── getTenantAccessToken()
│   ├── readFeishuSheet()
│   ├── writeToFeishuSheet()
│   └── ... 所有飞书API调用
├── mapping-engine.js ⭐（映射引擎，独立）
│   ├── applyMappingRules()
│   ├── getConfigFromDB()
│   └── validateData()
├── data-processors/（业务处理层）
│   ├── talent-performance.js ⭐（性能数据处理）
│   ├── project-sync.js
│   └── automation-report.js
└── utils.js（通用工具）
```

---

### 分层独立化的好处

#### 1. 飞书 API 层独立

**文件**: `feishu-api.js`

```javascript
/**
 * 飞书 API 封装层
 * 可独立剥离为单独的云函数或 npm 包
 */

module.exports = {
  getTenantAccessToken,
  readFeishuSheet,
  writeFeishuSheet,
  uploadImage,
  // ... 所有飞书API
};
```

**未来剥离**:
```javascript
// 选项A：独立云函数
feishuApiService (新云函数)
└── 提供飞书API服务

// 选项B：npm包
@agentworks/feishu-sdk
└── 所有产品复用
```

**迁移成本**: < 0.5天（复制粘贴即可）

---

#### 2. 映射引擎独立

**文件**: `mapping-engine.js`

```javascript
/**
 * 通用映射引擎
 * 完全独立，可用于任何数据映射场景
 */

/**
 * 从数据库读取映射配置
 */
async function getMappingConfig(db, platform, configName = 'default') {
  return await db.collection('field_mappings').findOne({
    platform,
    configName,
    isActive: true
  });
}

/**
 * 应用映射规则
 * @param {Array} rows - 原始数据行
 * @param {Object} mappingConfig - 映射配置
 * @returns {Object} { validData, invalidRows }
 */
function applyMappingRules(rows, mappingConfig) {
  // 通用映射逻辑
  // 完全不依赖飞书API
}

module.exports = {
  getMappingConfig,
  applyMappingRules,
  setNestedValue,
  validateMappedData
};
```

**未来剥离**:
```javascript
// 独立云函数
performanceImportService (新云函数)
├── 导入 mapping-engine.js
└── 专注处理性能数据导入
```

**迁移成本**: < 0.5天

---

#### 3. 业务处理层独立

**文件**: `data-processors/talent-performance.js`

```javascript
/**
 * 达人性能数据处理器
 * 专注业务逻辑，不依赖飞书API
 */

const { applyMappingRules } = require('../mapping-engine');

async function processTalentPerformance(rawData, platform, dbVersion, db) {
  // 1. 获取映射配置
  const mappingConfig = await getMappingConfig(db, platform);

  // 2. 应用映射
  const { validData, invalidRows } = applyMappingRules(rawData, mappingConfig);

  // 3. 批量更新数据库
  const stats = await bulkUpdateTalents(db, validData, platform, dbVersion);

  return { validData, invalidRows, stats };
}

module.exports = { processTalentPerformance };
```

**未来剥离**: 直接复制到新云函数

---

### 🔌 接口设计（关键：支持剥离）

#### 当前调用方式（统一入口）

```typescript
// 前端调用 syncFromFeishu
await fetch('/sync-from-feishu', {
  method: 'POST',
  body: JSON.stringify({
    platform: 'douyin',
    dbVersion: 'v2',
    feishuUrl: url,
    dataType: 'talentPerformance'  // 路由到 talent-performance 处理器
  })
});
```

---

#### 未来剥离后（独立接口）

**方式 1: 新建独立云函数**

```typescript
// 新云函数：performanceImportService
await fetch('/performance-import', {
  method: 'POST',
  body: JSON.stringify({
    platform: 'douyin',
    dataSource: 'feishu',  // 或 'excel'
    sourceUrl: url,
    mappingConfigId: 'default'
  })
});

// 内部实现
exports.handler = async (event) => {
  const { platform, dataSource, sourceUrl } = JSON.parse(event.body);

  // 1. 读取数据源
  let rawData;
  if (dataSource === 'feishu') {
    // 导入独立的 feishu-api.js
    const { readFeishuSheet } = require('./feishu-api');
    rawData = await readFeishuSheet(sourceUrl);
  } else {
    rawData = parseExcel(file);
  }

  // 2. 应用映射（导入独立的 mapping-engine.js）
  const { applyMappingRules } = require('./mapping-engine');
  const result = applyMappingRules(rawData, mappingConfig);

  return result;
};
```

**迁移步骤**:
1. 复制 `feishu-api.js` 到新云函数
2. 复制 `mapping-engine.js` 到新云函数
3. 复制 `talent-performance.js` 业务逻辑
4. 前端修改调用地址

**迁移时间**: < 1 天

---

**方式 2: npm 包抽取**

```javascript
// @agentworks/feishu-sdk (npm包)
const { readFeishuSheet, getTenantAccessToken } = require('@agentworks/feishu-sdk');

// @agentworks/data-mapping (npm包)
const { applyMappingRules } = require('@agentworks/data-mapping');

// 新云函数只需要很少的代码
exports.handler = async (event) => {
  const rawData = await readFeishuSheet(url);  // 来自 npm 包
  const result = applyMappingRules(rawData, config);  // 来自 npm 包
  return result;
};
```

**优势**: 多个云函数/产品复用

---

### 📋 剥离准备清单（在 MD 文档中记录）

#### 1. 代码模块化清单

在 `syncFromFeishu/README.md` 中记录：

```markdown
## 模块依赖关系

### 独立模块（可剥离）

1. **feishu-api.js** - 飞书 API 层
   - 函数列表：getTenantAccessToken, readFeishuSheet, writeImageToCell, ...
   - 依赖：axios
   - 可剥离为：独立云函数 或 npm包
   - 剥离成本：0.5天

2. **mapping-engine.js** - 映射引擎
   - 函数列表：applyMappingRules, setNestedValue, ...
   - 依赖：无
   - 可剥离为：独立云函数 或 npm包
   - 剥离成本：0.5天

3. **data-processors/talent-performance.js** - 业务处理
   - 函数列表：processTalentPerformance, bulkUpdateTalents, ...
   - 依赖：mapping-engine.js
   - 可剥离为：独立云函数
   - 剥离成本：0.5天

### 剥离路线图

#### 阶段 1: 代码重构（本次升级同步完成）
- 将 utils.js 拆分为 4 个独立模块
- 清晰的模块边界
- 最小化模块间耦合

#### 阶段 2: 接口标准化（未来）
- 定义标准的数据导入接口
- 支持多种数据源（飞书/Excel/API）

#### 阶段 3: 服务剥离（按需）
- 独立飞书服务（如飞书调用量大）
- 独立映射服务（如多产品需要）
- 独立性能数据服务

### 剥离决策标准

触发以下任一条件时，建议剥离：

1. **调用量**: syncFromFeishu 调用量 > 1000次/天
2. **复杂度**: 代码超过 2000 行
3. **多产品**: 3+ 个产品需要飞书同步
4. **性能**: 响应时间 > 5 秒

### 剥离成本估算

| 剥离场景 | 工作量 | 说明 |
|---------|--------|------|
| 剥离飞书API | 0.5天 | 复制 feishu-api.js |
| 剥离映射引擎 | 0.5天 | 复制 mapping-engine.js |
| 剥离性能导入 | 1天 | 创建独立云函数 + 测试 |
| **总计** | **2天** | 模块化设计使剥离成本极低 |
```

---

## 🏗 最终技术架构

### 云函数架构（3个）

```
1. syncFromFeishu v12.0（升级，模块化）
   ├── index.js（入口路由）
   ├── feishu-api.js ⭐（飞书API层，可剥离）
   ├── mapping-engine.js ⭐（映射引擎，可剥离）
   ├── data-processors/
   │   ├── talent-performance.js ⭐（性能数据，可剥离）
   │   ├── project-sync.js
   │   └── automation-report.js
   └── utils.js（通用工具）

2. fieldMappingManager（新建，RESTful）
   └── GET/POST/PUT/DELETE → field_mappings 集合

3. dimensionConfigManager（新建，RESTful）
   └── GET/POST/PUT/DELETE → dimension_configs 集合
```

**关键设计**:
- ✅ 清晰的模块边界
- ✅ 最小化耦合
- ✅ 每个模块可独立剥离
- ✅ 剥离成本 < 2 天

---

### 数据库架构（2 新建 + 1 扩展）

```
agentworks_db
├── talents（已存在）✅ 扩展字段
│   ├── ... 现有字段 ...
│   └── performanceData（已预留）✅ 扩展
│       ├── cpm, avgPlayCount（已有）
│       ├── audienceAge（已有 + 扩展）
│       │   ├── 18_23, 24_30, 31_40, 40_plus（已有）
│       │   └── 41_50, 50_plus 🆕（新增）
│       ├── audienceGender.male, female（已有）
│       ├── crowdPackage 🆕（新增，抖音特有）
│       │   ├── town_middle_aged
│       │   ├── senior_middle_class
│       │   ├── z_era, urban_silver
│       │   ├── town_youth, exquisite_mom
│       │   └── new_white_collar, urban_blue_collar
│       └── lastUpdated 🆕（新增）
│
├── field_mappings 🆕（新建）
│   └── 字段映射配置
│
└── dimension_configs 🆕（新建）
    └── 维度显示配置
```

**说明**:
- ✅ MongoDB 动态 Schema，无需修改集合结构
- ✅ 直接添加字段即可
- ✅ 向后兼容（旧数据无新字段也不影响）

---

## 🔧 API 合并设计（RESTful）

### API 1: fieldMappingManager

**端点**: `/field-mapping-manager`

| HTTP方法 | 功能 | 参数 | 返回 |
|---------|------|------|------|
| GET | 查询映射配置 | platform, configName | 映射配置列表 |
| POST | 创建映射配置 | 完整配置对象 | 创建成功 + ID |
| PUT | 更新映射配置 | _id + 更新字段 | 更新成功 |
| DELETE | 删除映射配置 | _id | 删除成功 |

**前端调用**:
```typescript
// 查询
GET /field-mapping-manager?platform=douyin&dbVersion=v2

// 创建
POST /field-mapping-manager
Body: { platform: 'douyin', configName: 'custom_v1', mappings: [...] }

// 更新
PUT /field-mapping-manager
Body: { _id: '...', mappings: [...更新的映射...] }

// 删除
DELETE /field-mapping-manager
Body: { _id: '...' }
```

---

### API 2: dimensionConfigManager

**端点**: `/dimension-config-manager`

| HTTP方法 | 功能 | 参数 | 返回 |
|---------|------|------|------|
| GET | 查询维度配置 | platform, configName | 维度配置列表 |
| POST | 创建维度配置 | 完整配置对象 | 创建成功 + ID |
| PUT | 更新维度配置 | _id + 更新字段 | 更新成功 |
| DELETE | 删除维度配置 | _id | 删除成功 |

**结构与 fieldMappingManager 完全一致**

---

### 优势总结

| 优化点 | 原方案 | 修订方案 | 改进 |
|--------|--------|---------|------|
| 云函数数量 | 6个 | 3个 | 50% ↓ |
| HTTP方法 | 仅GET/POST | RESTful完整 | 规范性 ↑ |
| 代码重复 | 4个CRUD重复 | 统一模式 | 复用性 ↑ |
| 管理成本 | 6个部署 | 3个部署 | 50% ↓ |

---

## 🎯 修订后的实施路线

### 阶段 0: 数据库准备（0.5天）

**任务**:
- [ ] 0.1 创建 field_mappings 集合 Schema
- [ ] 0.2 创建 dimension_configs 集合 Schema
- [ ] 0.3 创建索引
- [ ] 0.4 初始化抖音配置（20维度 + 20映射）
- [ ] 0.5 验证 performanceData 扩展字段

**产出**:
- 数据库初始化脚本
- 抖音默认配置数据

---

### 阶段 1: 云函数开发（2天）

**任务**:
- [ ] 1.1 **重构 syncFromFeishu v11.4.3** (1.5天) ⭐ 关键
  - 📁 拆分 utils.js 为 4 个模块
    - feishu-api.js（飞书API层，~300行）
    - mapping-engine.js（映射引擎，~200行）
    - data-processors/talent-performance.js（业务处理，~150行）
    - utils.js（通用工具，~200行）
  - 🔧 talent-performance.js 升级
    - 从数据库读取映射配置
    - 应用通用映射引擎
    - 支持 v2 数据库（agentworks_db）
    - 支持 performanceData.crowdPackage 写入
  - 📝 添加模块剥离文档（README.md）
  - 🧪 测试 v1 兼容性（ByteProject）
  - 🧪 测试 v2 新功能（AgentWorks）

- [ ] 1.2 **创建 fieldMappingManager** (0.25天)
  - RESTful CRUD API
  - 操作 field_mappings 集合

- [ ] 1.3 **创建 dimensionConfigManager** (0.25天)
  - RESTful CRUD API
  - 操作 dimension_configs 集合

**产出**:
- syncFromFeishu v12.0（模块化，可剥离）
- fieldMappingManager
- dimensionConfigManager
- 模块剥离文档

---

### 阶段 2: 配置管理界面（2天）

（不变）

---

### 阶段 3: 达人表现页面（2天）

（不变）

---

### 阶段 4: 数据导入功能（1.5天）

（不变）

---

### 阶段 5: 完善测试（1天）

（不变）

---

## 📊 最终方案对比

### 架构优化

| 维度 | v3.0方案 | v5.0修订方案 | 改进 |
|------|----------|-------------|------|
| **数据存储** | 3个新集合 | 2新建+1扩展 | 简化 ✅ |
| **云函数数量** | 6个 | 3个 | 50%↓ ✅ |
| **查询效率** | JOIN查询 | 单表查询 | 更快 ✅ |
| **可剥离性** | 无设计 | 模块化设计 | 易剥离 ✅ |
| **工作量** | 10.5天 | 9天 | 14%↓ ✅ |

---

### 关键改进

1. ✅ **数据存储**：使用已有 performanceData（你的建议）
2. ✅ **API 合并**：4个→2个（你的建议）
3. ✅ **syncFromFeishu**：升级（我的建议）+ 模块化（你的要求）

---

## 📝 文档记录规范

### 在 syncFromFeishu/README.md 中必须包含

**章节 1: 模块架构**
- 模块列表和职责
- 模块依赖关系图
- 每个模块的行数和复杂度

**章节 2: 可剥离性设计**
- 哪些模块可以剥离
- 剥离后的架构方案
- 剥离成本估算（< 2天）

**章节 3: 剥离决策标准**
- 触发条件（调用量、复杂度等）
- 剥离优先级（先剥离哪个）

**章节 4: 剥离实施指南**
- 剥离步骤（Step by step）
- 测试清单
- 回滚方案

**章节 5: 接口兼容性**
- 当前接口设计
- 未来接口设计（剥离后）
- 迁移成本（前端调用修改）

---

## ✅ 最终确认方案

### 核心决策

- [x] ✅ 数据存储：talents.performanceData（扩展字段）
- [x] ✅ 云函数：3个（syncFromFeishu升级 + 2个RESTful管理API）
- [x] ✅ 架构：模块化设计，支持未来剥离
- [x] ✅ 文档：详细记录剥离路线和成本

### 技术保障

- [x] ✅ 查询效率：不影响（单表查询）
- [x] ✅ 可剥离性：< 2天成本
- [x] ✅ 代码复用：复用300+行飞书代码
- [x] ✅ 资源优化：云函数减少50%

---

## 🎯 待你最终确认

### 请确认以下设计：

#### 1. 数据架构
- [ ] talents.performanceData 存储（扩展字段）
- [ ] 新增 crowdPackage（8个人群包）
- [ ] 新增 audienceAge.41_50, 50_plus

#### 2. 云函数架构
- [ ] 升级 syncFromFeishu（模块化设计）
- [ ] fieldMappingManager（RESTful CRUD）
- [ ] dimensionConfigManager（RESTful CRUD）

#### 3. 可剥离性设计
- [ ] 模块清晰分层（4个独立模块）
- [ ] 详细的剥离文档
- [ ] 剥离成本 < 2天

#### 4. 实施工作量
- [ ] 总计 9 天
- [ ] 5个阶段

---

## 📋 你需要看的文档

**只看这 1 份**:
👉 本文档 (TALENT_PERFORMANCE_CONFIRMED_PLAN.md)

**重点章节**:
- 📍 问题 1: performanceData 效率验证
- 📍 问题 2: syncFromFeishu 可剥离架构设计
- 📍 问题 3: API 合并设计
- 📍 最终确认清单

**确认后我会**:
1. 创建详细实施文档（100+任务）
2. 本地保存，不推送
3. 等你审核后再推送

**现在等待你的最终确认！** 🎯

---

**文档版本**: v5.0 (确认版)
**状态**: ⏳ 等待用户最终确认

🤖 Generated with [Claude Code](https://claude.com/claude-code)
