# AgentWorks DB - Schema 索引

> v2.0 多平台数据库 Schema 完整清单

---

## 📊 集合概览

| 集合名 | 说明 | 状态 | Schema 文件 | 版本 |
|--------|------|------|------------|------|
| `talents` | 达人档案（多平台） | ✅ 已完成 | [talents.doc.json](./talents.doc.json) | v2.1 |
| `rebate_configs` | 返点配置历史记录 | ✅ 已完成 | [rebate_configs.doc.json](./rebate_configs.doc.json) | v2.1 |
| `rebate_rules` | 返点跃迁规则 | 📝 Phase 2 | - | - |
| `talent_merges` | 达人合并历史 | 📝 待设计 | - | - |
| `projects` | 项目信息（多平台） | 📝 待设计 | - | - |
| `cooperations` | 合作订单（多平台） | 📝 待设计 | - | - |

---

## 🗄️ talents（达人档案）

### 核心设计

**v2.0 多平台架构**：每个"达人+平台"是一条独立记录

**核心字段**：
- `oneId`: 达人统一ID（跨平台共享）
- `platform`: 平台类型（douyin/xiaohongshu/bilibili/kuaishou）
- `platformAccountId`: 平台账号ID
- `name`: 该平台的昵称
- `prices`: 价格体系（多价格类型）
- `platformSpecific`: 平台特有字段（动态扩展）

**关键特性**：
- ✅ oneId 跨平台关联
- ✅ 支持后期合并达人（oneIdHistory）
- ✅ 平台特有字段动态扩展
- ✅ 独立的价格和返点配置

**索引**：
- `idx_oneId_platform` (unique) - 核心唯一索引
- `idx_oneId` - 查询某达人的所有平台
- `idx_platform` - 查询某平台的所有达人
- 其他 5 个索引

**文件**：
- 详细文档：[talents.doc.json](./talents.doc.json)
- 索引定义：[../indexes/talents.indexes.json](../indexes/talents.indexes.json)

---

## 🗄️ rebate_configs（返点配置历史记录）

### 核心设计

**用途**：独立存储返点配置历史，支持完整的审计追溯

**核心字段**：
- `configId`: 配置唯一标识（全局唯一）
- `targetType`: 目标类型（talent/agency）
- `targetId`: 目标ID（oneId 或 agencyId）
- `platform`: 平台类型
- `rebateRate`: 返点率（百分比，2位小数）
- `effectType`: 生效方式（immediate/next_cooperation）
- `effectiveDate`: 生效日期
- `status`: 配置状态（pending/active/expired）

**关键特性**：
- ✅ 完整的审计追溯（所有记录不可删除）
- ✅ 状态流转：pending → active → expired
- ✅ 支持立即生效和下次合作生效
- ✅ 返点率精度：2位小数（0-100%）
- ✅ 记录调整原因和操作人

**索引**：
- `idx_configId` (unique) - 配置ID唯一索引
- `idx_target_platform_createdAt` - 核心查询索引（历史记录）
- `idx_target_platform_status` - 查找当前生效配置
- 其他 3 个索引

**文件**：
- 详细文档：[rebate_configs.doc.json](./rebate_configs.doc.json)
- 索引定义：[../indexes/rebate_configs.indexes.json](../indexes/rebate_configs.indexes.json)

**版本**: v2.1 (2025-11-15)

---

## 📝 待设计集合

### talent_merges（达人合并历史）

**用途**：记录达人合并操作，支持回滚

**核心字段**（预计）：
- `primaryOneId`: 主ID（保留的）
- `mergedOneId`: 被合并的ID
- `affectedTalents`: 受影响的记录
- `affectedCooperations`: 影响的合作数
- `mergedAt`: 合并时间
- `reason`: 合并原因

**状态**：📝 待设计

---

### cooperations（合作订单）

**用途**：管理达人合作订单（支持多平台）

**核心字段**（预计）：
- `projectId`: 项目ID
- `talentOneId`: 达人统一ID
- `platform`: 合作平台
- `talentId`: 关联到 talents 的 _id
- `priceType`: 价格类型
- `agreedPrice`: 合作价格
- `performance`: 效果数据

**状态**：📝 待设计

---

### projects（项目信息）

**用途**：管理项目（支持多平台）

**核心字段**（预计）：
- `name`: 项目名称
- `platforms`: 涉及的平台数组
- `budget`: 预算
- `status`: 项目状态

**状态**：📝 待设计

---

## 🔄 与 v1 的对比

| 维度 | v1 (kol_data) | v2 (agentworks_db) |
|------|--------------|-------------------|
| **达人数据** | 一个达人一条记录 | 一个"达人+平台"一条记录 |
| **平台支持** | 仅抖音 | 多平台（抖音、小红书、B站等） |
| **达人关联** | 通过 `_id` | 通过 `oneId`（跨平台） |
| **重复处理** | ❌ | ✅ 支持合并 + 历史追溯 |
| **价格结构** | 数组（按年月） | 对象（按类型） |
| **平台字段** | 固定字段 | `platformSpecific` 动态扩展 |

---

## 📚 文档导航

### Schema 文件说明

每个集合有两个 Schema 文件：

1. **`.doc.json`** - 详细文档版本
   - 包含中文注释
   - 字段说明详细
   - 包含示例数据
   - 适合开发者阅读

2. **`.schema.json`** - MongoDB Schema 版本
   - 从 MongoDB 导出
   - 反映实际数据结构
   - 用于验证和同步

### 相关文档

- [数据库总 README](../README.md)
- [索引定义](../indexes/)
- [初始化脚本](../scripts/)
- [设计文档](../docs/DESIGN.md)（待编写）

---

## 🛠️ 开发指南

### 新增集合流程

1. **设计阶段**：编写 `.doc.json`
   ```bash
   # 参考 talents.doc.json 的格式
   vim database/agentworks_db/schemas/your_collection.doc.json
   ```

2. **索引定义**：编写 `.indexes.json`
   ```bash
   vim database/agentworks_db/indexes/your_collection.indexes.json
   ```

3. **初始化脚本**：编写 `init-xxx.js`
   ```bash
   vim database/agentworks_db/scripts/init-your-collection.js
   ```

4. **更新索引**：在本文件添加集合说明

---

## 📝 变更日志

### v2.0 (2025-11-11)

- ✅ 创建 `talents` 集合（多平台架构）
- ✅ 设计 oneId 关联系统
- ✅ 添加平台特有字段支持
- ✅ 创建初始化和同步脚本

---

**最后更新**：2025-11-11
**维护者**：产品团队
