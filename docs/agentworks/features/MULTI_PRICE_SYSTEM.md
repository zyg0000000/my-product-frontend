# 多价格类型系统 (v2.9)

> **功能分支**: `claude/optimize-influencer-sync-011CUb4bk9SzP5Pwosz5ozuf`
> **实现时间**: 2025-10
> **状态**: 全部完成 ✅ (Board 1-4)

---

## 📋 背景

原系统仅支持单一价格类型（60s+视频），无法满足业务需求。为支持多种视频时长的差异化定价，实施了**多价格类型系统**改造。

## 🎯 业务目标

支持达人提供3种视频时长的独立报价：
- **60s+视频** (`60s_plus`) - 长视频，价格最高
- **20-60s视频** (`20_to_60s`) - 中等视频
- **1-20s视频** (`1_to_20s`) - 短视频，价格最低

## 📊 实施路线图

| Board | 阶段 | 内容 | 状态 | 负责模块 |
|-------|------|------|------|----------|
| **Board 1** | 数据库设计 | MongoDB Schema 扩展 | ✅ 完成 | 后端数据层 |
| **Board 2** | 飞书同步 | 飞书多维表格同步逻辑 | ✅ 完成 | 云函数 utils.js |
| **Board 3** | 前端优化 | 3个核心页面UI/UX改造 | ✅ 完成 | 前端页面 |
| **Board 4** | 云函数适配 | API接口兼容性适配 | ✅ 完成 | 云函数接口 |

---

## ✅ Board 1: 数据库结构设计

### MongoDB Schema 扩展

**talents.prices 数组结构**：
```javascript
{
  year: 2025,           // 价格年份
  month: 11,            // 价格月份
  type: "60s_plus",     // 新增：价格类型
  price: 110000,        // 价格金额
  status: "confirmed"   // 价格状态: confirmed | provisional
}
```

**关键字段**：
- `type`: 价格类型标识符
  - `60s_plus` - 60s+视频
  - `20_to_60s` - 20-60s视频
  - `1_to_20s` - 1-20s视频

**数据迁移**：
- ✅ 为所有现有价格记录添加 `type: "60s_plus"` 默认值
- ✅ 去重处理：相同 year + month + type 的记录

---

## ✅ Board 2: 飞书同步适配

### 云函数修改

**文件**: `my-cloud-functions/utils.js`
**版本**: v11.4.2

**核心改造**：
```javascript
// 解析3种价格类型
const priceTypes = [
  { fieldPrefix: '抖音60+s短视频报价', type: '60s_plus' },
  { fieldPrefix: '抖音20-60s短视频报价', type: '20_to_60s' },
  { fieldPrefix: '抖音1-20s短视频报价', type: '1_to_20s' }
];

priceTypes.forEach(({ fieldPrefix, type }) => {
  for (let month = 1; month <= 12; month++) {
    const fieldName = `${fieldPrefix}-M${month}`;
    const priceValue = feishuRecord[fieldName];
    if (priceValue) {
      prices.push({
        year: financialYear,
        month: month,
        type: type,  // 新增类型标识
        price: parseInt(priceValue),
        status: 'confirmed'
      });
    }
  }
});
```

**飞书字段映射**：
- `抖音60+s短视频报价-M1` → `{type: "60s_plus", month: 1}`
- `抖音20-60s短视频报价-M1` → `{type: "20_to_60s", month: 1}`
- `抖音1-20s短视频报价-M1` → `{type: "1_to_20s", month: 1}`

---

## ✅ Board 3: 前端页面优化

### 优化的页面清单

| # | 页面 | 文件 | 版本 | 优化内容 |
|---|------|------|------|----------|
| 1 | **达人池** | `talent_pool.js/html` | v2.9 | 价格趋势图、胶囊标签、类型筛选 |
| 2 | **选人页面** | `talent_selection.js/html` | v2.9.4 | 表格类型筛选、批量录入联动 |
| 3 | **录入表单** | `order_form.js/html` | v2.2 | 三步式价格选择器 |

### 页面 1: talent_pool（达人池）

**核心功能**：

1. **表格价格显示**
```javascript
// 3行胶囊标签，每种类型一行
60s+:     ¥ 110,000  [蓝色胶囊]
20-60s:   ¥ 100,000  [绿色胶囊]
1-20s:    ¥ 90,000   [紫色胶囊]
```

2. **价格弹窗**
- 左侧：价格列表 + 年月筛选
- 右侧：价格趋势图（Chart.js）
- 支持按类型切换趋势图

3. **高级筛选**
- 新增"价格类型"下拉框
- 筛选指定类型的价格区间

4. **颜色方案**
```javascript
60s_plus:   蓝色  #dbeafe / #1e40af
20_to_60s:  绿色  #d1fae5 / #065f46
1_to_20s:   紫色  #e9d5ff / #6b21a8
```

### 页面 2: talent_selection（选人页面）

**核心功能**：

1. **表格价格类型筛选**
```html
<select id="table-price-type-filter">
  <option value="60s_plus">60s+视频</option>
  <option value="20_to_60s">20-60s视频</option>
  <option value="1_to_20s">1-20s视频</option>
</select>
```

2. **严格类型匹配**
```javascript
function getBestPrice(talent, requiredType = '60s_plus') {
  // 严格筛选：仅查找指定类型的价格
  const typedPrices = talent.prices.filter(p => p.type === requiredType);

  if (typedPrices.length === 0) {
    return { value: '没有', isFallback: false, sortValue: -1 };
  }
}
```

3. **批量录入弹窗**
- 视频类型下拉（60s+/20-60s/1-20s）
- 价格时间下拉（年-月）
- 一口价只读输入框（自动联动）

### 页面 3: order_form（录入合作达人）

**核心功能**：

1. **三步式选择器**
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
  <select id="price-time-select">价格时间</select>
  <select id="price-type-select">视频类型</select>
  <input id="price-display" readonly>一口价</input>
</div>
```

2. **智能默认值**
- 默认选择当月（如果存在）
- 默认选择60s+类型（最常用）
- 自动初始化价格显示

3. **无价格提示**
- 红色边框 + 红色文字："没有此档位价格"
- 防止误操作

---

## ✅ Board 4: 云函数适配

**修改云函数**: 1个
**无需修改**: 5个

### 已修复的云函数

**bulkUpdateTalents/index.js** (v2.3 → v2.4)

- **问题**: 价格合并使用 `year-month` 作为唯一键，导致不同价格类型互相覆盖
- **影响**: talent_pool 页面"导出-修改-导入"工作流
- **修复**: 改用 `year-month-type` 作为唯一键

```javascript
// ❌ 旧版本 v2.3（有BUG）
currentArray.forEach(p => priceMap.set(`${p.year}-${p.month}`, p));

// ✅ 新版本 v2.4（已修复）
currentArray.forEach(p => {
    const uniqueKey = `${p.year}-${p.month}-${p.type || ''}`;
    priceMap.set(uniqueKey, p);
});
```

---

## 🎓 技术要点

### 1. 数据一致性

**价格数据流**：
```
飞书多维表格
  ↓ (Board 2: utils.js)
talents.prices (MongoDB)
  ↓ (Board 3: 前端页面)
用户选择价格
  ↓ (talent_selection / order_form)
collaborations 集合
  ├─ amount: 价格金额
  └─ priceInfo: "2025年11月 - 60s+视频"
```

### 2. UI/UX 设计原则

**颜色编码**：
- 固定颜色方案，便于快速识别
- 统一使用 `talent-type-tag` 样式类

**默认行为**：
- 优先当前月份，无则选最新
- 优先60s+类型（最常用）
- 自动初始化显示

**错误提示**：
- 无价格时明确提示"没有此档位价格"
- 红色边框 + 红色文字，视觉清晰

### 3. 性能优化

**避免重复查询**：
- 一次性生成选项，避免循环调用

**DOM操作优化**：
- 保留关键类名（如 `price-display`）
- 使用事件委托，减少监听器数量

---

## ⚠️ 重要注意事项

1. **字段名称规范**
   - 严格使用 `60s_plus` / `20_to_60s` / `1_to_20s`
   - 避免使用其他变体

2. **类名不要丢失**
   - 设置 `className` 时必须包含原有选择器类名

3. **数据验证**
   - 提交前验证 priceData 是否有值
   - 检查 type 字段是否存在

---

## 📦 修改文件清单

**前端文件（6个）**：
- talent_pool.js (v2.9)
- talent_pool.html (v2.9)
- talent_selection.js (v2.9.4)
- talent_selection.html (v2.9.4)
- order_form.js (v2.2)
- order_form.html (v2.2)

**后端文件（1个）**：
- my-cloud-functions/utils.js (v11.4.2)

**总计**: 7个文件修改

---

**最后更新**: 2025-11-11
**文档版本**: v1.0
