# 达人-机构关系改造文档

## 📋 改造概述

将达人和机构的关系从枚举类型改为直接关联，实现更灵活的管理。

## ✅ 已完成的改动

### 1. 数据库层面

#### 迁移脚本 (`migrate-talent-agency-relation.js`)
- **功能**：将 talents 集合中的 belongType 从 "wild" 迁移为 "individual"
- **位置**：`database/agentworks_db/scripts/migrate-talent-agency-relation.js`
- **执行方法**：
  ```bash
  mongosh "mongodb://your-connection-string/agentworks_db" --file migrate-talent-agency-relation.js
  ```

#### 字段变更
- **belongType 字段**：
  - 原来：枚举值 ("wild" | "agency")
  - 现在：机构ID字符串
  - 特殊值："individual" 表示野生达人

### 2. 前端类型定义

#### 类型更新 (`src/types/rebate.ts`)
```typescript
// 原来
export type BelongType = 'wild' | 'agency';

// 现在
export type BelongType = string; // 机构ID，"individual" 表示野生达人
```

#### 标签映射更新
```typescript
export const BELONG_TYPE_LABELS: Record<string, string> = {
  individual: '野生达人',  // 特殊ID
  // 其他机构ID会动态获取机构名称
};
```

### 3. 机构管理页面优化

#### 文案更新 (`src/pages/Talents/Agencies/AgenciesList.tsx`)
- 列表头部："基础返点" → "当前返点"
- 弹窗标题：相应更新
- 输入框标签：相应更新

### 4. 达人编辑弹窗改进

#### 机构选择功能 (`src/components/EditTalentModal.tsx`)
- 添加了动态加载机构列表
- 将固定的"野生/机构"选项改为动态机构选择
- 支持选择具体机构或"野生达人"

```typescript
// 新增的功能
- 加载活跃机构列表
- 机构下拉选择器
- 默认选择"individual"（野生达人）
```

## 📊 数据关系图

```
达人 (talents)                机构 (agencies)
┌─────────────┐              ┌──────────────┐
│ oneId       │              │ id           │
│ name        │  ┌──────────▶│ name         │
│ belongType  ├──┘           │ currentRebate│
│ ...         │              │ ...          │
└─────────────┘              └──────────────┘
     ↓                              ↑
     │                              │
     └── "individual" ──────────────┘
         (特殊机构：野生达人)
```

## 🚀 后续待完成工作

### 1. 达人列表显示优化
- [ ] 在达人列表中显示机构名称而不是ID
- [ ] 添加机构筛选功能
- [ ] 显示每个机构的达人数量

### 2. 云函数更新
- [ ] 更新查询逻辑支持新的字段结构
- [ ] 添加达人数量统计接口
- [ ] 支持按机构筛选达人

### 3. 数据完善
- [ ] 批量更新现有达人的机构关联
- [ ] 数据验证和清理

## 💡 使用说明

### 运行数据迁移
1. 确保已连接到 MongoDB
2. 执行迁移脚本：
   ```bash
   mongosh "mongodb://your-connection-string/agentworks_db" --file database/agentworks_db/scripts/migrate-talent-agency-relation.js
   ```

### 测试功能
1. 访问机构管理页面：http://localhost:5173/talents/agencies
2. 创建/编辑机构，查看"当前返点"字段
3. 编辑达人时，可以选择归属机构

## 📝 注意事项

1. **野生达人机构**（ID: "individual"）是系统预设，不可删除或编辑
2. 迁移后所有原"wild"类型达人会自动关联到"individual"机构
3. 机构删除前需确保没有关联的达人

## 🔄 版本信息

- **创建日期**：2025-11-16
- **版本**：v1.0
- **作者**：产品团队

---

*本文档记录了达人-机构关系的改造过程和当前状态*