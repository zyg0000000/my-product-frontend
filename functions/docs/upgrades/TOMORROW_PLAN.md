# 云函数 v2 升级 - 明日工作计划

> 基于第一优先级函数列表，规划明天的升级任务

---

## ✅ 今日完成

- ✅ **processTalents**（达人创建/更新）- v2.0 升级完成
  - oneId 自动生成
  - 多平台支持（douyin, xiaohongshu）
  - v1/v2 双版本兼容
  - 文档和测试指南完善

---

## 🎯 明日重点：Talent 查询和操作函数

根据升级方案，**第一优先级**需要升级的核心函数有 8 个，其中专注 Talent 相关的有：

### 1. ⭐ getTalents（高优先级）

**当前状态**：仅支持 v1（kol_data）

**v2 需求**：
- 支持 `platform` 筛选（如：只查询抖音达人）
- 支持 `oneId` 分组（将同一达人的多个平台合并展示）
- 支持 `groupBy=oneId` 参数

**升级关键点**：
```javascript
// v2 查询逻辑
if (groupBy === 'oneId') {
  // 按 oneId 分组，返回格式：
  // { oneId: "talent_00000001", platforms: [douyin数据, xiaohongshu数据] }
} else {
  // 普通查询，支持 platform 筛选
}
```

**预计时间**：2-3 小时

---

### 2. ⭐ updateTalent（高优先级）

**当前状态**：仅支持 v1，按 `id` 更新

**v2 需求**：
- 支持按 `(oneId, platform)` 更新
- 识别是更新某平台还是全局更新

**升级关键点**：
```javascript
// v2 更新逻辑
filter: { oneId: talent.oneId, platform: talent.platform }

// 如果只传 oneId 不传 platform，需要明确处理：
// 选项1：报错（推荐）
// 选项2：更新所有平台
```

**预计时间**：1-2 小时

---

### 3. ⭐ deleteTalent（高优先级）

**当前状态**：仅支持 v1，按 `id` 删除

**v2 需求**：
- 支持删除某平台的达人记录
- 需确认是删除某平台还是所有平台

**升级关键点**：
```javascript
// v2 删除逻辑
if (platform) {
  // 删除特定平台：{ oneId, platform }
  await collection.deleteOne({ oneId, platform });
} else {
  // 删除所有平台（需要二次确认）
  await collection.deleteMany({ oneId });
}
```

**预计时间**：1 小时

---

### 4. 🔄 getTalentsSearch（中优先级）

**当前状态**：v1 搜索功能（支持复杂筛选）

**v2 需求**：
- 支持 `platform` 筛选
- 支持 `oneId` 搜索
- 保持原有的高级筛选功能

**升级关键点**：
- 复用现有的查询构建逻辑
- 添加 v2 特有的筛选条件

**预计时间**：2 小时

---

### 5. 🔄 getTalentsByIds（中优先级）

**当前状态**：批量查询达人（按 `id[]`）

**v2 需求**：
- 支持按 `oneId[]` 批量查询
- 返回包含多平台信息

**升级关键点**：
```javascript
// v2 查询
if (dbVersion === 'v2') {
  const talents = await collection.find({
    oneId: { $in: oneIds }
  }).toArray();

  // 可选：按 oneId 分组
  groupByOneId(talents);
}
```

**预计时间**：1 小时

---

## 📋 明日任务优先级

### Phase 1: 核心 CRUD（必须完成）

1. ✅ **getTalents** - 达人查询（含分组）
2. ✅ **updateTalent** - 达人更新
3. ✅ **deleteTalent** - 达人删除

**预计完成时间**：上午 + 中午

---

### Phase 2: 查询增强（尽量完成）

4. 🔄 **getTalentsSearch** - 高级搜索
5. 🔄 **getTalentsByIds** - 批量查询

**预计完成时间**：下午

---

### Phase 3: 测试和验证（必须完成）

- 为每个函数编写测试用例
- 验证 v1/v2 兼容性
- 更新文档

**预计完成时间**：下午晚些时候

---

## ⚠️ 注意事项

### 1. oneId 分组查询的设计

**问题**：前端是否需要"按 oneId 分组"的查询结果？

**选项 A**：返回分组结构
```javascript
{
  oneId: "talent_00000001",
  platforms: [
    { platform: "douyin", name: "张三", ... },
    { platform: "xiaohongshu", name: "小张", ... }
  ]
}
```

**选项 B**：返回扁平结构（前端自行分组）
```javascript
[
  { oneId: "talent_00000001", platform: "douyin", ... },
  { oneId: "talent_00000001", platform: "xiaohongshu", ... }
]
```

**建议**：提供 `groupBy` 参数，让前端选择

---

### 2. updateTalent 的更新范围

**问题**：如果只传 `oneId` 不传 `platform`，如何处理？

**建议**：v2 必须同时提供 `oneId` 和 `platform`，否则报错

**理由**：
- 明确更新哪个平台
- 避免误操作更新所有平台
- 如需批量更新，使用 `batchUpdateTalents`

---

### 3. deleteTalent 的安全性

**问题**：删除所有平台是否需要特殊权限？

**建议**：
- 删除单个平台：正常操作
- 删除所有平台：需要传递 `deleteAll: true` 参数

```javascript
// 删除抖音平台
{ oneId, platform: "douyin" }

// 删除所有平台（需明确确认）
{ oneId, deleteAll: true }
```

---

## 📁 文档规范

每个升级的函数需要：

1. **代码升级**
   - `functions/<function-name>/index.js`

2. **测试用例**（如果复杂）
   - `functions/docs/individual/<function-name>/TEST_GUIDE.md`

3. **更新总体文档**
   - `functions/docs/upgrades/UPGRADE_PLAN.md` - 标记完成状态

---

## 🔗 相关文档

- [整体升级方案](../upgrades/UPGRADE_PLAN.md)
- [processTalents 升级案例](../upgrades/UPGRADE_PLAN_V2.md)
- [v2 Schema 设计](../../../database/agentworks_db/schemas/talents.doc.json)

---

## 📅 本周目标

**Day 1**（今日）：
- ✅ processTalents v2 升级
- ✅ 文档整理

**Day 2**（明日）：
- ✅ getTalents v2 升级
- ✅ updateTalent v2 升级
- ✅ deleteTalent v2 升级
- 🔄 getTalentsSearch v2 升级（尽量）

**Day 3**（后天）：
- 剩余 Talent 相关函数
- Projects 和 Collaborations 相关函数

---

**创建时间**：2025-11-11
**维护者**：产品团队
