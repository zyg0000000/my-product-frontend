# 达人表现数据迁移实施方案

> 版本：v1.0
> 日期：2025-11-26
> 状态：待实施

---

## 一、背景与目标

### 1.1 当前问题

- 表现数据嵌入在 `talents.performanceData` 中，无法做时序分析
- 每次飞书同步覆盖旧数据，历史数据丢失
- 不支持 AI 训练所需的时序特征

### 1.2 目标

- 将表现数据迁移到独立的 `talent_performance` 集合
- 支持时序数据存储和历史追溯
- 配置系统支持多集合映射，前端可自助管理字段
- 为 AI 训练和数据预测提供数据基础

---

## 二、架构对比

### 2.1 当前架构

```
┌─────────────────────────────────────────────────────────────┐
│  飞书表格 ──→ sync-from-feishu API ──→ talents 集合         │
│                                          │                  │
│                                          ├─ name            │
│                                          ├─ platformAccountId │
│                                          ├─ talentTier      │
│                                          ├─ prices[]        │
│                                          └─ performanceData │ ← 嵌入式存储
│                                               ├─ cpm        │
│                                               ├─ audienceGender │
│                                               ├─ audienceAge │
│                                               └─ crowdPackage │
│                                                              │
│  前端页面 ←── searchTalents API ←── talents 集合            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│  飞书表格 ──→ sync-from-feishu API (改造)                   │
│                     │                                       │
│                     ├──→ talents 集合 (基础信息)            │
│                     │      ├─ name                          │
│                     │      ├─ platformAccountId             │
│                     │      ├─ talentTier                    │
│                     │      └─ prices[]                      │
│                     │                                       │
│                     └──→ talent_performance 集合 (表现数据)  │
│                            ├─ oneId + platform (关联)       │
│                            ├─ snapshotDate (时序)           │
│                            ├─ metrics.cpm                   │
│                            ├─ audience.gender               │
│                            ├─ audience.age                  │
│                            └─ audience.crowdPackage         │
│                                                             │
│  前端页面 ←── 联表查询或分次请求 ←── 两个集合               │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、实施步骤

### Phase 1：数据库准备

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1.1 | 创建 `talent_performance` 集合 | ✅ Schema 已设计 |
| 1.2 | 创建索引 | ✅ 索引已定义 |
| 1.3 | 验证集合和索引正常工作 | 待执行 |

**执行命令**（MongoDB Shell）：
```javascript
// 创建集合
db.createCollection("talent_performance");

// 创建索引
db.talent_performance.createIndex({ snapshotId: 1 }, { unique: true });
db.talent_performance.createIndex({ oneId: 1, platform: 1, snapshotDate: -1 });
db.talent_performance.createIndex({ oneId: 1, platform: 1, snapshotType: 1, snapshotDate: -1 }, { unique: true });
db.talent_performance.createIndex({ snapshotDate: -1 });
db.talent_performance.createIndex({ dataSource: 1 });
db.talent_performance.createIndex({ platform: 1, snapshotDate: -1 });
db.talent_performance.createIndex({ platform: 1, snapshotType: 1, snapshotDate: -1 });
db.talent_performance.createIndex({ createdAt: -1 });
```

---

### Phase 2：后端 API 改造

#### 2.1 配置管理 API 改造

**文件**：`backend/routes/dimensionConfigManager.js`、`backend/routes/fieldMappingManager.js`

**改造内容**：支持 `targetCollection` 字段

```javascript
// dimension_configs 新结构
{
  "id": "cpm",
  "name": "60s+预期CPM",
  "targetCollection": "talent_performance",  // 新增
  "targetPath": "metrics.cpm",               // 调整
  "type": "number",
  "category": "核心绩效",
  // ... 其他字段不变
}

// field_mappings 新结构
{
  "excelHeader": "60s+预期CPM",
  "targetCollection": "talent_performance",  // 新增
  "targetPath": "metrics.cpm",               // 调整
  "format": "number"
}
```

#### 2.2 数据同步 API 改造

**文件**：`backend/routes/sync-from-feishu.js`

**改造内容**：
1. 读取 `field_mappings` 中的 `targetCollection` 字段
2. 根据 `targetCollection` 分流写入
3. 写入 `talent_performance` 时自动添加 `snapshotDate`、`snapshotType`、`dataSource`

```javascript
// 伪代码
for (const mapping of mappings) {
  if (mapping.targetCollection === 'talent_performance') {
    // 写入 talent_performance 集合
    await db.talent_performance.updateOne(
      { oneId, platform, snapshotType: 'daily', snapshotDate: today },
      { $set: { [mapping.targetPath]: value } },
      { upsert: true }
    );
  } else {
    // 写入 talents 集合（默认行为）
    await db.talents.updateOne(
      { oneId, platform },
      { $set: { [mapping.targetPath]: value } }
    );
  }
}
```

#### 2.3 新增 talent-performance API

**文件**：`backend/routes/talent-performance.js`（新建）

| 接口 | 方法 | 用途 |
|------|------|------|
| `/talent-performance` | GET | 查询表现数据（支持分页、筛选） |
| `/talent-performance/latest` | GET | 批量获取最新快照 |
| `/talent-performance` | POST | 写入表现数据 |
| `/talent-performance/history` | GET | 获取历史序列（用于趋势分析） |

#### 2.4 searchTalents API 改造（可选）

**方案 A**：前端分两次请求（推荐，解耦清晰）
- 先查 talents 获取基础信息
- 再查 talent_performance 获取表现数据
- 前端合并展示

**方案 B**：后端联表查询
```javascript
db.talents.aggregate([
  { $match: { platform: 'douyin' } },
  { $lookup: {
      from: 'talent_performance',
      let: { oneId: '$oneId', platform: '$platform' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$oneId', '$$oneId'] },
          { $eq: ['$platform', '$$platform'] },
          { $eq: ['$snapshotType', 'daily'] }
        ]}}},
        { $sort: { snapshotDate: -1 } },
        { $limit: 1 }
      ],
      as: 'latestPerformance'
    }
  },
  { $unwind: { path: '$latestPerformance', preserveNullAndEmptyArrays: true } }
]);
```

---

### Phase 3：前端改造

#### 3.1 配置页面改造

**文件**：`frontends/agentworks/src/pages/Settings/PerformanceConfig.tsx`

**改造内容**：
1. `DimensionManager` 组件增加 `targetCollection` 选择器
2. `FieldMappingManager` 组件增加 `targetCollection` 选择器
3. 新增维度时可选择目标集合

```tsx
// DimensionManager 新增字段
<Select
  label="目标集合"
  value={dimension.targetCollection || 'talents'}
  options={[
    { value: 'talents', label: '达人档案 (talents)' },
    { value: 'talent_performance', label: '表现数据 (talent_performance)' }
  ]}
  onChange={(value) => updateDimension({ targetCollection: value })}
/>
```

#### 3.2 数据读取改造

**文件**：`frontends/agentworks/src/hooks/usePerformanceData.ts`

**改造内容**：
1. 根据 `dimension_configs` 中的 `targetCollection` 判断数据来源
2. 如果有来自 `talent_performance` 的维度，额外调用 `/talent-performance/latest`
3. 前端合并两个数据源

```typescript
// 伪代码
const { talents } = await searchTalents(params);
const oneIds = talents.map(t => t.oneId);

// 检查是否需要从 talent_performance 读取
const perfDimensions = dimensions.filter(d => d.targetCollection === 'talent_performance');
if (perfDimensions.length > 0) {
  const performances = await getLatestPerformance({ oneIds, platform });
  // 合并数据
  return talents.map(t => ({
    ...t,
    ...performances.find(p => p.oneId === t.oneId)
  }));
}

return talents;
```

#### 3.3 表格渲染改造

**文件**：`frontends/agentworks/src/pages/Performance/PerformanceHome.tsx`

**改造内容**：
1. `getNestedValue` 函数支持从合并后的数据中读取
2. 列定义根据 `targetCollection` 调整 `dataIndex`

---

## 四、配置映射对照表

### 4.1 基础信息（保持在 talents）

| 维度 ID | targetCollection | targetPath |
|---------|------------------|------------|
| name | talents | name |
| xingtuId | talents | platformAccountId |
| platformAccountId | talents | platformSpecific.uid |
| talentTier | talents | talentTier |
| price | talents | prices |

### 4.2 表现数据（迁移到 talent_performance）

| 维度 ID | 旧 targetPath | 新 targetCollection | 新 targetPath |
|---------|---------------|---------------------|---------------|
| cpm | performanceData.cpm | talent_performance | metrics.cpm |
| maleRatio | performanceData.audienceGender.male | talent_performance | audience.gender.male |
| femaleRatio | performanceData.audienceGender.female | talent_performance | audience.gender.female |
| age_18_23 | performanceData.audienceAge.18_23 | talent_performance | audience.age.18_23 |
| age_24_30 | performanceData.audienceAge.24_30 | talent_performance | audience.age.24_30 |
| age_31_40 | performanceData.audienceAge.31_40 | talent_performance | audience.age.31_40 |
| age_41_50 | performanceData.audienceAge.41_50 | talent_performance | audience.age.41_50 |
| age_50_plus | performanceData.audienceAge.50_plus | talent_performance | audience.age.50_plus |
| crowd_town_middle_aged | performanceData.crowdPackage.town_middle_aged | talent_performance | audience.crowdPackage.town_middle_aged |
| crowd_senior_middle_class | performanceData.crowdPackage.senior_middle_class | talent_performance | audience.crowdPackage.senior_middle_class |
| crowd_z_era | performanceData.crowdPackage.z_era | talent_performance | audience.crowdPackage.z_era |
| crowd_urban_silver | performanceData.crowdPackage.urban_silver | talent_performance | audience.crowdPackage.urban_silver |
| crowd_town_youth | performanceData.crowdPackage.town_youth | talent_performance | audience.crowdPackage.town_youth |
| crowd_exquisite_mom | performanceData.crowdPackage.exquisite_mom | talent_performance | audience.crowdPackage.exquisite_mom |
| crowd_new_white_collar | performanceData.crowdPackage.new_white_collar | talent_performance | audience.crowdPackage.new_white_collar |
| crowd_urban_blue_collar | performanceData.crowdPackage.urban_blue_collar | talent_performance | audience.crowdPackage.urban_blue_collar |
| lastUpdated | performanceData.lastUpdated | talent_performance | lastUpdated |

---

## 五、API 清单

### 5.1 需要改造的 API

| API | 文件 | 改造内容 |
|-----|------|----------|
| `GET /dimensionConfigManager` | dimensionConfigManager.js | 返回 targetCollection 字段 |
| `PUT /dimensionConfigManager` | dimensionConfigManager.js | 保存 targetCollection 字段 |
| `GET /fieldMappingManager` | fieldMappingManager.js | 返回 targetCollection 字段 |
| `PUT /fieldMappingManager` | fieldMappingManager.js | 保存 targetCollection 字段 |
| `POST /sync-from-feishu` | sync-from-feishu.js | 根据 targetCollection 分流写入 |

### 5.2 需要新增的 API

| API | 方法 | 用途 | 参数 |
|-----|------|------|------|
| `/talent-performance` | GET | 查询表现数据 | platform, oneId, snapshotType, dateFrom, dateTo, page, pageSize |
| `/talent-performance/latest` | GET | 批量获取最新快照 | platform, oneIds[] |
| `/talent-performance` | POST | 写入表现数据 | oneId, platform, snapshotDate, metrics, audience |
| `/talent-performance/history` | GET | 获取历史序列 | oneId, platform, snapshotType, limit |

---

## 六、前端文件清单

| 文件 | 改造内容 |
|------|----------|
| `src/pages/Settings/PerformanceConfig.tsx` | 增加 targetCollection 选择器 |
| `src/components/Performance/DimensionManager.tsx` | 维度编辑增加目标集合选择 |
| `src/components/Performance/FieldMappingManager.tsx` | 映射编辑增加目标集合选择 |
| `src/hooks/usePerformanceData.ts` | 支持从 talent_performance 读取 |
| `src/hooks/useDimensionConfig.ts` | 解析 targetCollection 字段 |
| `src/pages/Performance/PerformanceHome.tsx` | 适配合并后的数据结构 |
| `src/api/performance.ts` | 新增 talent-performance 相关 API |
| `src/api/talent-performance.ts` | 新建文件，封装新 API |

---

## 七、回滚策略

1. **保留 talents.performanceData**：迁移期间不删除旧字段
2. **双写模式**：sync-from-feishu 同时写入两处，观察一段时间
3. **配置开关**：`dimension_configs` 中 `targetCollection` 为空时默认从 talents 读取

---

## 八、测试要点

- [ ] 飞书同步正确分流写入两个集合
- [ ] 前端配置页面可以选择目标集合
- [ ] 前端配置页面可以新增/编辑/删除维度
- [ ] 表现数据页面正确展示合并后的数据
- [ ] 历史数据查询正常（时序功能）
- [ ] 筛选功能正常工作

---

## 九、相关文档

- [talent_performance Schema](../schemas/talent_performance.doc.json)
- [talent_performance 索引](../indexes/talent_performance.indexes.json)
- [Schema 索引](../schemas/INDEX.md)

---

**最后更新**：2025-11-26
**维护者**：产品团队
