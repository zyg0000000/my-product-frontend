# AgentWorks Database (v2.0)

> **新一代多平台广告代理项目管理数据库**，对应前端 `frontends/agentworks/`

---

## 📊 数据库信息

- **数据库名称**: `agentworks_db`
- **数据库类型**: MongoDB (NoSQL)
- **关联前端**: `frontends/agentworks/`
- **版本**: v2.0
- **状态**: 开发中 🚧

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
│   └── migrate-from-v1.js            # 从 v1 迁移数据（可选）
│
└── docs/                  # 详细文档
    ├── DESIGN.md                     # 设计文档（oneId 逻辑）
    ├── MIGRATION.md                  # 从 v1 迁移指南
    └── API_GUIDE.md                  # 后端对接指南
```

---

## 🗄️ 核心集合设计

### 1. talents（达人信息）

**设计原则**：每个"达人+平台"是一条记录

```javascript
{
  _id: ObjectId("..."),
  oneId: "talent_00000001",           // 达人统一ID（跨平台）
  platform: "douyin",                  // 平台
  platformAccountId: "dy_123456",      // 平台账号ID
  name: "张三的美食日记",               // 昵称
  fansCount: 1000000,                  // 粉丝数
  prices: {                            // 多价格类型
    video_60plus: 50000,
    video_20to60: 30000,
    video_1to20: 10000,
    live: 80000
  },
  platformSpecific: {                  // 平台特有字段
    starLevel: 5                       // 抖音特有
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

### 2. talent_merges（达人合并历史）

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

### 3. cooperations（合作订单）

支持多平台的合作管理

```javascript
{
  _id: ObjectId("..."),
  projectId: "project_001",
  talentOneId: "talent_00000001",      // 达人统一ID
  platform: "douyin",                  // 合作平台
  talentId: "...",                     // 关联到 talents 的 _id
  priceType: "video_60plus",           // 价格类型
  agreedPrice: 50000,
  performance: {                       // 效果数据
    playCount: 1200000,
    likeCount: 50000
  }
}
```

---

### 4. projects（项目信息）

支持多平台的项目管理

```javascript
{
  _id: ObjectId("..."),
  name: "某品牌双11推广",
  platforms: ["douyin", "xiaohongshu"], // 涉及的平台
  budget: 1000000,
  status: "active"
}
```

---

## 🔄 与 v1 的主要区别

| 维度 | v1 (kol_data) | v2 (agentworks_db) |
|------|--------------|-------------------|
| **平台支持** | 仅抖音 | 多平台（抖音、小红书、B站等） |
| **达人结构** | 一个达人一条记录 | 一个"达人+平台"一条记录 |
| **达人关联** | 通过 _id | 通过 oneId（跨平台） |
| **合并支持** | ❌ | ✅ 支持后期合并 + 历史追溯 |
| **扩展性** | 有限 | 易于新增平台和字段 |

---

## 📖 详细文档

| 文档 | 说明 | 状态 |
|------|------|------|
| [设计文档](./docs/DESIGN.md) | oneId 逻辑、多平台架构设计 | 🚧 开发中 |
| [迁移指南](./docs/MIGRATION.md) | 从 v1 迁移数据的步骤 | 📝 待编写 |
| [API 对接指南](./docs/API_GUIDE.md) | 后端云函数对接说明 | 📝 待编写 |

---

## 🔗 相关链接

- **v1.0 数据库**：`../kol_data/`（单平台架构）
- **云函数代码**：`../../functions/`（需升级支持 v2）
- **前端代码**：`../../frontends/agentworks/`（新产品）

---

## 🚧 开发计划

### Phase 1: Schema 设计（当前阶段）
- [x] 创建目录结构
- [ ] 设计 talents.schema.json
- [ ] 设计 talent_merges.schema.json
- [ ] 设计 cooperations.schema.json
- [ ] 设计 projects.schema.json

### Phase 2: 数据库初始化
- [ ] 创建 MongoDB 数据库 `agentworks_db`
- [ ] 创建集合并添加索引
- [ ] 编写初始化脚本

### Phase 3: 后端对接
- [ ] 升级核心云函数（支持 v2）
- [ ] 测试 API 接口

### Phase 4: 前端开发
- [ ] 开发 v2 前端页面

---

## ⚠️ 重要提示

1. **v2 和 v1 数据库完全独立**，互不影响
2. **所有变更请在测试环境验证后再上生产**
3. **保持 Schema 定义和实际数据库同步**
4. **使用 migrations/ 脚本管理数据变更**

---

**维护者**：产品团队
**最后更新**：2025-11-11
**版本**：v2.0 (In Development 🚧)
