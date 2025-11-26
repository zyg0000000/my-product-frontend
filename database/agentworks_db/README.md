# AgentWorks Database (v2.1)

> **新一代多平台广告代理项目管理数据库**，对应前端 `frontends/agentworks/`

---

## 📊 数据库信息

- **数据库名称**: `agentworks_db`
- **数据库类型**: MongoDB (NoSQL)
- **关联前端**: `frontends/agentworks/`
- **版本**: v2.1
- **状态**: 生产中 ✅

---

## 🚀 核心特性

### ✨ 多平台架构
- 支持多个平台：抖音、小红书、B站、快手等
- 每个"达人+平台"是独立数据单元
- 通过 `oneId` 实现跨平台关联

### 🔗 达人关联系统
- **oneId**：达人统一标识（跨平台共享）
- **后期合并**：支持后期发现重复达人并合并
- **历史追溯**：完整的合并历史记录

### 📈 扩展性设计
- 灵活的 `platformSpecific` 字段（平台特有数据）
- 易于新增平台（无需修改核心结构）
- 支持未来多租户改造

### 🗂️ 多集合数据分离 (v2.1 新增)
- **talents**: 基础信息 + 价格数据（相对稳定）
- **talent_performance**: 表现数据（时间序列，频繁更新）
- 通过 `$lookup` 自动关联，前端无感知
- 支持历史快照查询

---

## 📁 目录结构

```
agentworks_db/
├── README.md              # 本文件
│
├── schemas/               # Schema 定义（JSON Schema）
│   ├── INDEX.md           # Schema 文件索引
│   ├── _template.json     # Schema 模板
│   ├── talents.schema.json           # ✨ 达人信息（多平台 + oneId）
│   ├── talent_performance.schema.json # ✨ 达人表现数据（时间序列）
│   ├── talent_merges.schema.json     # ✨ 达人合并历史
│   ├── projects.schema.json          # 项目信息（支持多平台）
│   ├── cooperations.schema.json      # 合作订单（支持多平台）
│   └── ...（其他集合）
│
├── indexes/               # 索引定义
│   ├── talents.indexes.json          # oneId + platform 索引
│   └── ...
│
├── migrations/            # 数据迁移脚本
│   ├── 001_create_talents.js         # 初始化脚本
│   └── 002_add_indexes.js
│
├── scripts/               # 数据库管理脚本
│   ├── sync-schema.sh                # Schema 同步工具
│   ├── migrate-from-v1.js            # 从 v1 迁移数据（可选）
│   └── migrate-dimension-configs-v1.2.js  # 多集合配置迁移
│
└── docs/                  # 详细文档
    ├── DESIGN.md                     # 设计文档（oneId 逻辑）
    ├── MIGRATION.md                  # 从 v1 迁移指南
    └── API_GUIDE.md                  # 后端对接指南
```

---

## 🗄️ 核心集合设计

### 1. talents（达人基础信息）

**设计原则**：每个"达人+平台"是一条记录，存储相对稳定的基础信息和价格

```javascript
{
  _id: ObjectId("..."),
  oneId: "talent_00000001",           // 达人统一ID（跨平台）
  platform: "douyin",                  // 平台
  platformAccountId: "dy_123456",      // 平台账号ID
  name: "张三的美食日记",               // 昵称
  fansCount: 1000000,                  // 粉丝数
  talentTier: "头部",                  // 达人层级
  talentType: ["美食", "生活"],        // 内容标签
  agencyId: "agency_001",              // 机构ID
  currentRebate: {                     // 当前返点配置
    rate: 15,
    effectiveDate: "2025-01-01",
    source: "agency_sync"
  },
  prices: [                            // 价格历史（时间序列）
    {
      year: 2025,
      month: 11,
      type: "video_60plus",
      price: 5000000,                  // 单位：分
      status: "confirmed"
    }
  ],
  platformSpecific: {                  // 平台特有字段
    xingtuId: "12345678",
    starLevel: 5
  },
  oneIdHistory: [],                    // 合并历史
  status: "active",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**索引**：
- `oneId` - 查询某达人的所有平台
- `platform` - 查询某平台的所有达人
- `oneId + platform` (unique) - 联合唯一索引

---

### 2. talent_performance（达人表现数据）⭐ v2.1 新增

**设计原则**：存储频繁变化的表现数据，支持时间序列和历史快照

```javascript
{
  _id: ObjectId("..."),
  snapshotId: "perf_talent001_douyin_20251126_abc123",  // 快照唯一ID
  oneId: "talent_00000001",            // 关联达人
  platform: "douyin",                   // 平台
  snapshotDate: "2025-11-26",          // 快照日期
  snapshotType: "daily",               // 快照类型: daily/weekly/monthly
  dataSource: "feishu_sync",           // 数据来源
  metrics: {                           // 表现指标
    cpm: 12.5,                         // CPM
    audienceGender: {
      male: 0.45,
      female: 0.55
    },
    audienceAge: {
      "18_23": 0.15,
      "24_30": 0.35,
      "31_40": 0.30,
      "40_plus": 0.20
    },
    crowdPackage: "A3 人群",
    lastUpdated: "2025-11-26"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**索引**：
- `oneId + platform + snapshotType` - 查询达人最新表现
- `snapshotDate` - 按日期查询
- `snapshotId` (unique) - 快照唯一标识

**Upsert 规则**：同一达人+平台+类型+日期 = 一条记录（覆盖更新）

---

### 3. talent_merges（达人合并历史）

记录达人合并操作，支持回滚

```javascript
{
  _id: ObjectId("..."),
  primaryOneId: "talent_00000001",     // 主ID（保留）
  mergedOneId: "talent_00000003",      // 被合并的ID
  affectedTalents: [...],              // 受影响的记录
  affectedCooperations: 15,            // 影响的合作数
  mergedAt: ISODate("..."),
  mergedBy: "user_001",
  reason: "经确认是同一达人",
  canRollback: true
}
```

---

### 4. field_mappings（字段映射配置）

定义飞书表格导入时的字段映射规则

```javascript
{
  _id: ObjectId("..."),
  platform: "douyin",
  configName: "default",
  version: "1.1",
  isActive: true,
  mappings: [
    {
      excelHeader: "达人昵称",
      targetPath: "name",
      format: "text",
      required: true,
      targetCollection: "talents"      // ⭐ 写入目标集合
    },
    {
      excelHeader: "CPM",
      targetPath: "performanceData.cpm",
      format: "number",
      targetCollection: "talent_performance"  // ⭐ 写入 performance 集合
    }
  ]
}
```

---

### 5. dimension_configs（维度配置）

定义前端展示的维度及其数据来源

```javascript
{
  _id: ObjectId("..."),
  platform: "douyin",
  configName: "default",
  version: "1.2",
  isActive: true,
  dimensions: [
    {
      id: "name",
      name: "达人昵称",
      type: "text",
      targetPath: "name",
      targetCollection: "talents"      // ⭐ 从 talents 集合读取
    },
    {
      id: "cpm",
      name: "CPM",
      type: "number",
      targetPath: "performanceData.cpm",
      targetCollection: "talent_performance"  // ⭐ 从 performance 集合读取
    }
  ],
  defaultVisibleIds: ["name", "cpm", ...]
}
```

---

## 🔄 多集合数据流

### 写入流程（导入数据）

```
飞书表格数据
     ↓
mapping-engine.js 解析
     ↓
根据 field_mappings.targetCollection 分流
     ↓
┌────────────────────┬────────────────────────┐
│  talents 集合       │  talent_performance 集合 │
├────────────────────┼────────────────────────┤
│ - 基础信息 (name)   │ - CPM                   │
│ - 粉丝数            │ - 人群画像              │
│ - 价格数据          │ - 受众分布              │
│ - 机构/返点         │ - 快照时间戳            │
└────────────────────┴────────────────────────┘
```

### 读取流程（API 查询）

```
前端请求 (getTalentsSearch)
     ↓
读取 dimension_configs 获取 targetCollection 配置
     ↓
构建聚合管道
     ↓
talents 集合 ──$lookup──→ talent_performance 集合
     ↓
$mergeObjects 合并 performanceData
     ↓
返回合并后的数据给前端
```

---

## 🔄 与 v1 的主要区别

| 维度 | v1 (kol_data) | v2.1 (agentworks_db) |
|------|--------------|-------------------|
| **平台支持** | 仅抖音 | 多平台（抖音、小红书、B站等） |
| **达人结构** | 一个达人一条记录 | 一个"达人+平台"一条记录 |
| **达人关联** | 通过 _id | 通过 oneId（跨平台） |
| **合并支持** | ❌ | ✅ 支持后期合并 + 历史追溯 |
| **数据分离** | 单集合存储 | 多集合分离（talents + talent_performance） |
| **历史快照** | ❌ | ✅ 支持表现数据历史查询 |
| **扩展性** | 有限 | 易于新增平台和字段 |

---

## 📖 详细文档

| 文档 | 说明 | 状态 |
|------|------|------|
| [设计文档](./docs/DESIGN.md) | oneId 逻辑、多平台架构设计 | ✅ |
| [迁移指南](./docs/MIGRATION.md) | 从 v1 迁移数据的步骤 | 📝 待编写 |
| [API 对接指南](./docs/API_GUIDE.md) | 后端云函数对接说明 | 📝 待编写 |
| [返点系统部署](./REBATE_DEPLOYMENT.md) | 返点功能部署文档 | ✅ |

---

## 🔗 相关链接

- **v1.0 数据库**：`../kol_data/`（单平台架构）
- **云函数代码**：`../../functions/`
  - `getTalentsSearch` - v10.0 多集合支持
  - `getPerformanceData` - v2.0 多集合支持
  - `syncFromFeishu/mapping-engine.js` - v1.3 分流写入
- **前端代码**：`../../frontends/agentworks/`

---

## 🚧 迁移脚本

### 多集合配置迁移

将 `field_mappings` 和 `dimension_configs` 中的 `performanceData.*` 字段标记为写入/读取 `talent_performance` 集合：

```bash
# 在 MongoDB Shell 中执行
mongosh "mongodb+srv://..." --file scripts/migrate-dimension-configs-v1.2.js
```

迁移结果：
- `field_mappings`: 17 条映射规则 → `talent_performance`
- `dimension_configs`: 17 个维度 → `talent_performance`
- 7 条映射规则保留在 `talents`（基础信息 + 价格）

---

## ⚠️ 重要提示

1. **v2 和 v1 数据库完全独立**，互不影响
2. **所有变更请在测试环境验证后再上生产**
3. **保持 Schema 定义和实际数据库同步**
4. **使用 migrations/ 脚本管理数据变更**
5. **清理旧数据时注意清空 talents.performanceData 字段**

---

**维护者**：产品团队
**最后更新**：2025-11-26
**版本**：v2.1
