# 云函数 v2 升级 - 明日工作计划

> 基于第一优先级函数列表，规划明天的升级任务

---

## ✅ 已完成（2025-11-14）

### Day 1（11-11）
- ✅ **processTalents v2.0**（达人创建/更新）
  - oneId 自动生成
  - 多平台支持（douyin, xiaohongshu）
  - v1/v2 双版本兼容
  - 文档和测试指南完善

### Day 2（11-14）
- ✅ **getTalents v3.0**（达人查询）
  - 支持 platform 筛选
  - 支持 oneId 分组查询（groupBy=oneId）
  - 保留 simple/full 视图模式
  - 19 个测试用例文档

- ✅ **updateTalent v3.0**（达人更新）
  - 按 (oneId, platform) 精确更新
  - 安全增强：v2 必须同时提供 oneId 和 platform
  - 防止误操作批量更新

- ✅ **deleteTalent v2.0**（达人删除）
  - 支持单平台删除：{ oneId, platform }
  - 支持全平台删除：{ oneId, deleteAll: true }
  - 明确的删除确认机制

**进度**：第一优先级 4/8 (50%)

---

## 🎯 下一步工作计划

### 第一优先级剩余函数（4 个）

| 函数 | 状态 | v2 需求 | 预计工作量 |
|------|:----:|---------|----------:|
| **getProjects** | ⏳ 待升级 | 支持 platforms 数组筛选 | 2 小时 |
| **addProject** | ⏳ 待升级 | 支持 platforms 字段 | 1 小时 |
| **getCollaborators** | ⏳ 待升级 | 支持 talentOneId + platform | 2 小时 |
| **addCollaborator** | ⏳ 待升级 | 支持 talentOneId、platform | 1 小时 |

**预计总工作量**：6 小时

---

### 第二优先级函数（可选）

| 函数 | 优先级 | 预计工作量 |
|------|:-----:|----------:|
| **getTalentsSearch** | 中 | 2 小时 |
| **getTalentsByIds** | 中 | 1 小时 |
| **batchUpdateTalents** | 中 | 2 小时 |
| **bulkCreateTalents** | 中 | 1 小时 |
| **updateProject** | 中 | 1 小时 |
| **updateCollaborator** | 中 | 1 小时 |
| **deleteProject** | 低 | 0.5 小时 |
| **deleteCollaborator** | 低 | 0.5 小时 |
| **getProjectPerformance** | 低 | 1 小时 |
| **exportAllTalents** | 低 | 1 小时 |
| **exportComprehensiveData** | 低 | 1 小时 |
| **getTalentHistory** | 低 | 1 小时 |

---

### 建议的实施路径

**路径 A**（推荐）：完成第一优先级
- 先完成剩余 4 个第一优先级函数（Projects + Collaborators）
- 确保核心业务功能完整

**路径 B**：Talent 功能增强
- 升级 getTalentsSearch、getTalentsByIds
- 完善 Talent 模块的查询能力

**路径 C**：批量操作增强
- 升级 batchUpdateTalents、bulkCreateTalents
- 提升数据导入效率

## 💡 设计决策记录

### 1. oneId 分组查询的设计（已实施）

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

**Day 1**（2025-11-11）：
- ✅ processTalents v2.0 升级
- ✅ 文档整理

**Day 2**（2025-11-14）：
- ✅ getTalents v3.0 升级
- ✅ updateTalent v3.0 升级
- ✅ deleteTalent v2.0 升级
- ✅ 创建 getTalents 测试指南（19 个测试用例）

**Day 3**（下一步）：
- ⏳ 完成第一优先级剩余函数（Projects + Collaborators）
- 或升级第二优先级函数（getTalentsSearch、getTalentsByIds 等）

---

**创建时间**：2025-11-11
**最后更新**：2025-11-14
**维护者**：产品团队
