# AgentWorks DB - Schema 索引

> v2.4 多平台数据库 Schema 完整清单（更新于 2025-12-04）

---

## 📊 集合概览

| 集合名 | 说明 | 文档数 | 状态 | Schema 文件 | 版本 |
|--------|------|--------|------|------------|------|
| `talents` | 达人档案（多平台） | 2 | ✅ 已完成 | [talents.doc.json](./talents.doc.json) | v2.2 |
| `talent_performance` | 达人表现数据时序 | 10 | ✅ 已完成 | [talent_performance.doc.json](./talent_performance.doc.json) | v1.2 |
| `customer_talents` | 客户达人池关联 | 3 | ✅ 已完成 | [customer_talents.doc.json](./customer_talents.doc.json) | v2.0 |
| `customers` | 客户管理 | 2 | ✅ 已完成 | [customers.doc.json](./customers.doc.json) | v1.0 |
| `agencies` | 机构管理 | 2 | ✅ 已完成 | [agencies.doc.json](./agencies.doc.json) | v1.0 |
| `system_config` | 系统配置（平台+标签） | 5 | ✅ 已完成 | [system_config.doc.json](./system_config.doc.json) | v1.0 |
| `rebate_configs` | 返点配置历史 | 0 | ✅ 已完成 | [rebate_configs.doc.json](./rebate_configs.doc.json) | v2.1 |
| `field_mappings` | 字段映射配置 | 1 | ✅ 已完成 | [field_mappings.doc.json](./field_mappings.doc.json) | v1.3 |
| `dimension_configs` | 维度展示配置 | 1 | ✅ 已完成 | [dimension_configs.doc.json](./dimension_configs.doc.json) | v1.1 |
| `counters` | 计数器（ID生成） | 1 | ✅ 已完成 | [counters.doc.json](./counters.doc.json) | v1.0 |
| `pricing_history` | 价格策略变更历史 | 72 | ✅ 已完成 | [pricing_history.doc.json](./pricing_history.doc.json) | v1.0 |

---

## 🗄️ 核心集合详解

### talents（达人档案）

**v2.2 多平台架构**：每个"达人+平台"是一条独立记录

**核心字段**：
- `oneId`: 达人统一ID（跨平台共享）
- `platform`: 平台类型（douyin/xiaohongshu/bilibili/kuaishou）
- `platformAccountId`: 平台账号ID
- `name`: 该平台的昵称
- `prices`: 价格体系（多价格类型）
- `currentRebate`: 当前返点配置
- `rebateMode`: 返点模式（independent/agency）
- `platformSpecific`: 平台特有字段（动态扩展）

**v2.2 新增字段**：
- `rebateMode` - 返点模式
- `dbVersion` - 数据库版本标记
- `platformSpecific.uid` - 抖音 UID

**索引**：8 个（含 idx_oneId_platform 唯一索引）

---

### talent_performance（达人表现数据时序）

**v1.2 飞书字段对齐版**：独立存储达人表现数据，支持飞书同步和 AI 训练

**核心字段**：
- `snapshotId`: 快照唯一标识
- `oneId`: 达人统一ID
- `platform`: 平台类型
- `platformAccountId`: 平台账号ID（v1.2 新增）
- `snapshotDate`: 快照日期
- `metrics`: 核心表现指标（飞书字段对齐）
  - `followers`, `expected_plays`, `interaction_rate_30d`, `completion_rate_30d`
  - `spread_index`, `connected_users`, `viral_rate`, `follower_growth`
  - `cpm_60s_expected`（计算字段）
  - `audienceGender`, `audienceAge`, `crowdPackage`（嵌套在 metrics 中）

**v1.2 变更**：
- metrics 字段结构对齐飞书表格
- 受众数据嵌套在 metrics 中
- 新增 platformAccountId 字段

**索引**：7 个（含 idx_oneId_platform_type_date 唯一索引）

---

### customer_talents（客户达人池关联）

**v2.0 结构化标签版**：实现客户与达人的多对多关联

**核心字段**：
- `customerId`: 客户编码
- `talentOneId`: 达人统一ID
- `platform`: 平台类型
- `tags`: 结构化标签
  - `importance`: 重要程度（core/key/normal/backup/observe）
  - `businessTags`: 业务标签数组
- `status`: 状态（active/removed）

**v2.0 新增字段**：
- `tags` 重构为结构化对象
- `updatedBy`, `updatedAt` - 更新追踪
- `organizationId`, `departmentId` - 权限预留
- `_tagsMigratedAt`, `_tagsOldFormat` - 迁移追踪

**索引**：4 个（含三元组唯一索引）

---

### customers（客户管理）

**核心字段**：
- `code`: 客户编码（唯一，CUS + 8位数字）
- `name`: 客户名称
- `level`: 客户级别（VIP/A/B/C/普通）
- `contacts`: 联系人列表
- `businessStrategies`: 业务策略配置
  - `talentProcurement`: 达人采购策略
    - `platformPricingConfigs`: 各平台定价配置
    - `quotationCoefficients`: 报价系数

**索引**：5 个

---

### agencies（机构管理）

**核心字段**：
- `id`: 机构ID（唯一，individual 为系统预设）
- `name`: 机构名称
- `type`: 类型（individual/agency/mcn）
- `rebateConfig`: 返点配置
- `statistics`: 统计数据缓存

**索引**：4 个

---

### system_config（系统配置）

**支持两种配置类型**：

1. **platform（平台配置）**
   - `platform`, `name`, `enabled`, `color`, `order`
   - `accountId`, `priceTypes`, `specificFields`
   - `business`, `features`, `talentTiers`

2. **talent_tags（达人标签配置）**
   - `importanceLevels`: 重要程度配置（5级）
   - `businessTags`: 业务标签配置（9种）

**索引**：2 个

---

### counters（计数器）

用于生成自增序列（如 oneId）

**核心字段**：
- `_id`: 计数器名称（字符串主键）
- `sequence_value`: 当前序列值

---

### pricing_history（价格策略变更历史）

记录客户价格策略的所有变更，支持审计追溯

**核心字段**：
- `customerId`: 客户 ObjectId
- `customerCode`, `customerName`: 冗余存储
- `changeType`: 变更类型
- `beforeValue`, `afterValue`: 变更前后值

**索引**：5 个

---

## 🔄 与 v1 的对比

| 维度 | v1 (kol_data) | v2 (agentworks_db) |
|------|--------------|-------------------|
| **达人数据** | 一个达人一条记录 | 一个"达人+平台"一条记录 |
| **平台支持** | 仅抖音 | 多平台（抖音、小红书、B站等） |
| **达人关联** | 通过 `_id` | 通过 `oneId`（跨平台） |
| **重复处理** | ❌ | ✅ 支持合并 + 历史追溯 |
| **表现数据** | 嵌入达人记录 | 独立 `talent_performance` 集合 |
| **标签管理** | ❌ | ✅ 结构化标签 + 配置管理 |
| **审计追溯** | ❌ | ✅ 价格历史 + 返点历史 |

---

## 📝 变更日志

### v2.4 (2025-12-04)

- ✅ 从生产数据库同步 Schema 文档
- ✅ `talents` 升级到 v2.2：新增 rebateMode、dbVersion 字段
- ✅ `talent_performance` 升级到 v1.2：metrics 字段对齐飞书表格
- ✅ `customer_talents` 升级到 v2.0：结构化标签
- ✅ 新增 `customers` 集合文档
- ✅ 新增 `agencies` 集合文档
- ✅ 新增 `system_config` 集合文档
- ✅ 新增 `counters` 集合文档
- ✅ 新增 `pricing_history` 集合文档

### v2.3 (2025-11-26)

- ✅ `talent_performance` 升级到 v1.1
- ✅ 新增飞书同步支持（dataSource: feishu）
- ✅ 添加抖音八大人群包（crowdPackage）

### v2.0 (2025-11-11)

- ✅ 创建 `talents` 集合（多平台架构）
- ✅ 设计 oneId 关联系统
- ✅ 添加平台特有字段支持

---

## 📚 文档导航

### Schema 文件说明

每个集合的 Schema 文件：

- **`.doc.json`** - 详细文档版本
  - 包含中文注释和字段说明
  - 包含示例数据
  - 适合开发者阅读

### 相关文档

- [数据库总 README](../README.md)
- [索引定义](../indexes/)
- [初始化脚本](../scripts/)

---

**最后更新**：2025-12-04
**维护者**：产品团队
