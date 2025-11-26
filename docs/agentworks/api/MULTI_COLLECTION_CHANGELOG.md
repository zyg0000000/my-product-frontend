# 多集合数据架构 - API 更新日志

## 概述

本文档记录了 agentworks 项目从单集合架构升级到多集合架构的 API 变更。

**核心变更**：将达人表现数据（CPM、人群画像等）从 `talents` 集合分离到独立的 `talent_performance` 集合，支持时间序列存储和历史快照查询。

---

## v10.0 - getTalentsSearch 多集合支持 (2025-11-26)

### 🎯 核心功能

支持从 `talents` 和 `talent_performance` 两个集合读取数据，通过 `$lookup` 自动关联，前端无感知。

### ✨ 新增功能

1. **维度配置读取**
   - 从 `dimension_configs` 集合读取 `targetCollection` 配置
   - 自动识别哪些维度来自 `talent_performance`

2. **自动 $lookup 关联**
   - 当存在 `targetCollection: 'talent_performance'` 的维度时，自动构建 `$lookup` 管道
   - 获取每个达人的最新表现数据快照
   - 将 `metrics` 合并到 `performanceData` 字段

3. **5分钟维度配置缓存**
   - 减少对 `dimension_configs` 集合的查询次数
   - 提升 API 响应性能

### 📝 API 变更

#### POST /talents/search

**新增响应字段**：

```json
{
  "success": true,
  "dbVersion": "v2",
  "multiCollection": true,  // ⭐ 新增：是否使用多集合查询
  "data": {
    "pagination": {...},
    "talents": [...],
    "dashboardStats": {...},
    "_meta": {  // ⭐ 新增：多集合模式下返回
      "performanceDimensionsCount": 17,
      "talentDimensionsCount": 7
    }
  }
}
```

**达人数据结构**：

```json
{
  "oneId": "talent_001",
  "platform": "douyin",
  "name": "达人昵称",
  "prices": [...],  // 来自 talents 集合
  "performanceData": {  // 合并数据
    "cpm": 12.5,  // 来自 talent_performance.metrics
    "audienceGender": {...},
    "audienceAge": {...},
    "_snapshotDate": "2025-11-26",  // 快照日期
    "_snapshotType": "daily"  // 快照类型
  }
}
```

### 🔄 数据流

```
请求到达
    ↓
读取 dimension_configs (带缓存)
    ↓
筛选出 targetCollection='talent_performance' 的维度
    ↓
如果有 performance 维度:
    ↓
构建 $lookup 管道:
  1. $lookup: 关联 talent_performance，获取最新 snapshotDate 记录
  2. $addFields: 提取 metrics
  3. $mergeObjects: 合并到 performanceData
  4. $project: 清理临时字段
    ↓
执行聚合查询
    ↓
返回合并后的数据
```

### ⚠️ 向后兼容性

- ✅ **完全兼容**：v1 版本 (kol_data) 逻辑不受影响
- ✅ **v2 无配置时兼容**：如果 `dimension_configs` 无 `targetCollection` 配置，行为与 v9.0 相同
- ✅ **旧数据兼容**：如果 `talents.performanceData` 有旧数据，会被 `talent_performance` 的新数据覆盖

### 🧪 测试场景

1. **验证多集合查询生效**
   ```bash
   POST /talents/search
   Body: { "dbVersion": "v2", "platform": "douyin" }
   Expected: multiCollection: true, _meta 存在
   ```

2. **验证数据合并**
   ```bash
   # 前提：talents 集合有达人基础信息，talent_performance 有表现数据
   POST /talents/search
   Body: { "dbVersion": "v2", "platform": "douyin" }
   Expected: talents[].performanceData 包含 CPM、人群画像等数据
   ```

3. **验证快照日期**
   ```bash
   POST /talents/search
   Body: { "dbVersion": "v2", "platform": "douyin" }
   Expected: talents[].performanceData._snapshotDate 存在
   ```

---

## v2.0 - getPerformanceData 多集合支持 (2025-11-26)

### 🎯 核心功能

为 `getPerformanceData` API 添加 v2 版本支持，自动从 `talent_performance` 集合读取表现数据。

### ✨ 新增功能

1. **dbVersion 参数支持**
   - `v1`: 使用 kol_data 数据库（原有逻辑）
   - `v2`: 使用 agentworks_db 数据库 + 多集合查询

2. **自动 $lookup 关联**
   - v2 版本自动关联 `talent_performance` 集合
   - 与 getTalentsSearch 使用相同的合并逻辑

### 📝 API 变更

#### GET /performance/search

**新增参数**：
- `dbVersion`: `v1` | `v2` (默认 `v1`)
- `platform`: 平台筛选（v2 必需）

**响应示例**：

```json
{
  "success": true,
  "dbVersion": "v2",
  "multiCollection": true,
  "data": {
    "pagination": {...},
    "talents": [...],
    "metadata": {
      "dashboardStats": {...},
      "allFilteredIds": [...]
    }
  }
}
```

---

## 数据库配置迁移

### 迁移脚本 1 - 添加 targetCollection

位置：`database/agentworks_db/scripts/migrate-dimension-configs-v1.2.js`

**功能**：
- 为 `field_mappings` 中的 `performanceData.*` 映射添加 `targetCollection: 'talent_performance'`
- 为 `dimension_configs` 中的 `performanceData.*` 维度添加 `targetCollection: 'talent_performance'`

**执行方式**：
```bash
mongosh "mongodb+srv://..." --file migrate-dimension-configs-v1.2.js
```

**执行结果**：
- `field_mappings`: 17 条映射 → `talent_performance`，7 条保留 → `talents`
- `dimension_configs`: 17 个维度 → `talent_performance`，7 个保留 → `talents`

### 迁移脚本 2 - 修正 targetPath

位置：`database/agentworks_db/scripts/fix-targetpath-v1.3.js`

**功能**：
- 将 `field_mappings` 中 `talent_performance` 规则的 `targetPath` 从 `performanceData.xxx` 修正为 `metrics.xxx`
- 确保数据写入到 `talent_performance.metrics` 而不是 `talent_performance.performanceData`

**执行方式**：
```bash
mongosh "mongodb+srv://..." --file fix-targetpath-v1.3.js
```

**执行结果**：
- 17 条规则的 `targetPath` 从 `performanceData.*` → `metrics.*`
- 配置版本升级到 v1.2

---

## 部署步骤

### 1. 数据库迁移

```bash
# 1. 备份数据库
mongodump --uri="mongodb+srv://..." --db=agentworks_db

# 2. 执行配置迁移
mongosh "mongodb+srv://..." --file migrate-dimension-configs-v1.2.js

# 3. 验证迁移结果
mongosh "mongodb+srv://..." --eval "
  db.field_mappings.findOne({platform:'douyin'}).mappings.filter(m=>m.targetCollection==='talent_performance').length
"
# 预期输出: 17
```

### 2. 部署云函数

需要部署的函数：
- `getTalentsSearch` - v10.0
- `getPerformanceData` - v2.0

### 3. 清理旧数据（可选）

如果 `talents` 集合中有旧的 `performanceData` 字段，建议清理：

```javascript
db.talents.updateMany(
  { performanceData: { $exists: true } },
  { $unset: { performanceData: "" } }
)
```

### 4. 验证

1. 访问前端 Performance 页面
2. 检查 API 响应中 `multiCollection: true`
3. 验证达人表现数据正常显示

---

## 相关文件

### 云函数
- `functions/getTalentsSearch/index.js` - v10.0
- `functions/getPerformanceData/index.js` - v2.0
- `functions/syncFromFeishu/mapping-engine.js` - v1.4 (写入分流 + 空行过滤 + createdAt 冲突修复)
- `functions/talentPerformance/index.js` - v1.0 (独立查询接口)

### 数据库配置
- `database/agentworks_db/scripts/migrate-dimension-configs-v1.2.js` - 添加 targetCollection
- `database/agentworks_db/scripts/fix-targetpath-v1.3.js` - 修正 targetPath

---

## Bug 修复记录

### mapping-engine.js v1.4 修复 (2025-11-26)

**问题 1：空行导致大量导入失败**
- 原因：飞书 API 默认读取 2000 行，但实际数据可能只有几行，导致 1998 行空行被标记为"缺少必需字段"
- 修复：在处理前过滤空行（至少有一个非空单元格才保留）
- 日志：`原始数据行: 1999, 有效数据行: 5 (过滤空行: 1994)`

**问题 2：createdAt 字段冲突**
- 原因：MongoDB upsert 时 `$set` 展开的对象包含 `createdAt`，与 `$setOnInsert` 的 `createdAt` 冲突
- 错误：`Updating the path 'createdAt' would create a conflict at 'createdAt'`
- 修复：写入前从 `perf` 对象中移除 `createdAt` 字段

---

### 文档
- `database/agentworks_db/README.md` - v2.1

---

**维护者**: Claude
**文档版本**: 1.1
**最后更新**: 2025-11-26
