# AgentWorks 更新日志 - 2025-12-02

## 📋 概述

完成客户详情页价格策略 Tab 的平台过滤功能，修复数据同步问题，并清理 Ant Design 废弃 API 警告。

---

## ✨ 新增功能

### 1️⃣ 客户详情页平台过滤（单平台模式）

**需求背景**：
- 客户详情页采用两层 Tab 结构：平台 Tab（抖音|小红书）→ 内容 Tab（达人池|价格策略|合作历史）
- 当在"抖音" Tab 下查看"价格策略"时，应只显示抖音的配置，而非所有平台

**实现方案**：
1. `CustomerDetail.tsx` 传递 `activePlatform` 给 `PricingTab`
2. `PricingTab.tsx` 接收 `platform` 参数并传递给子组件
3. `TalentProcurementCard.tsx` 实现单平台模式：
   - `isSinglePlatformMode = !!platform`
   - 过滤只显示当前平台配置
   - 隐藏"添加平台"按钮（不符合单平台业务逻辑）
4. `TalentProcurementForm.tsx` 支持 `singlePlatformMode` 属性

**改动文件**：
- `CustomerDetail.tsx` - 传递平台参数
- `PricingTab.tsx` - 接收平台参数
- `TalentProcurementCard.tsx` - 单平台模式逻辑
- `TalentProcurementForm.tsx` - 单平台模式 UI

---

## 🐛 修复的问题

### 问题 1: 删除平台配置无效

**现象**：点击删除按钮后，配置仍然显示

**根本原因**：使用 JavaScript `delete` 操作符删除对象属性，但 MongoDB `$set` 操作不会删除字段，只会更新

**解决方案**：将平台配置设置为 `null` 而非使用 `delete`
```typescript
// 修复前
delete updatedConfigs[platformKey];

// 修复后
updatedConfigs[platformKey] = null as any;
```

### 问题 2: 切换平台后状态不正确

**现象**：抖音配置正常，切换到小红书仍显示配置卡片

**根本原因**：`isNotConfigured` 判断使用整体 `strategy?.enabled`，而非当前平台配置

**解决方案**：
```typescript
// 单平台模式下使用当前平台配置判断
const currentPlatformConfig = isSinglePlatformMode && platform
  ? platformPricingConfigs[platform]
  : null;
const currentPlatformHasConfig = currentPlatformConfig !== undefined && currentPlatformConfig !== null;

const isNotConfigured = isSinglePlatformMode
  ? !currentPlatformHasConfig
  : !strategy?.enabled;
```

### 问题 3: 空数据库显示默认配置

**现象**：数据库 `platformPricingConfigs: {}` 为空，但前端显示抖音卡片

**根本原因**：初始化代码遍历 `enabledPlatforms` 时，对未保存的平台自动创建默认配置

**解决方案**：只加载数据库中已保存的配置
```typescript
// 修复前：为所有平台创建默认配置
configs[platformKey] = saved ? {...} : getDefaultPlatformConfig();

// 修复后：只加载已保存的配置
if (saved) {
  configs[platformKey] = {...};
}
```

---

## 🔧 代码优化

### Ant Design 废弃 API 清理

| 废弃 API | 新 API | 影响文件 |
|---------|--------|---------|
| `Card.bodyStyle` | `Card.styles.body` | CustomerDetail.tsx |
| `Popover.overlayStyle` + `overlayInnerStyle` | `Popover.styles.root/body` | TalentProcurementCard.tsx, CustomerList.tsx, PricingStrategy.tsx |
| `Spin tip` (无子元素) | `Spin tip` + 子元素 | CustomerDetail.tsx, TalentProcurementCard.tsx, PricingStrategy.tsx |
| `DatePicker disabled` + `undefined value` | `null value` + `allowEmpty` | TalentProcurementForm.tsx |

---

## 📁 文件变更

### 修改文件
```
frontends/agentworks/src/pages/Customers/CustomerDetail/CustomerDetail.tsx
frontends/agentworks/src/pages/Customers/CustomerDetail/PricingTab.tsx
frontends/agentworks/src/pages/Customers/CustomerDetail/TalentProcurementCard.tsx
frontends/agentworks/src/pages/Customers/CustomerList/CustomerList.tsx
frontends/agentworks/src/pages/Customers/PricingStrategy/PricingStrategy.tsx
frontends/agentworks/src/pages/Customers/shared/TalentProcurementForm.tsx
```

---

## 🧪 测试验证

### 功能测试
- [x] 抖音 Tab → 价格策略：只显示抖音配置
- [x] 小红书 Tab → 价格策略：只显示小红书配置
- [x] 未配置平台：显示"未配置"状态 + "配置策略"按钮
- [x] 配置策略：正常保存到数据库
- [x] 删除策略：正确清除数据库数据
- [x] 平台切换：状态正确更新

### 控制台警告测试
- [x] Card bodyStyle 警告已消除
- [x] Popover overlayInnerStyle 警告已消除
- [x] Spin tip 警告已消除
- [x] DatePicker disabled/empty 警告已消除

---

## 🔄 兼容性

- ✅ **多平台模式兼容**：PricingStrategy 页面（客户列表入口）仍使用多平台模式
- ✅ **共享组件兼容**：TalentProcurementForm 同时支持单/多平台模式
- ✅ **数据库兼容**：无 Schema 变更，兼容现有数据

---

## 📊 代码统计

| 指标 | 数据 |
|------|------|
| 修改文件数 | 6 个 |
| 新增代码行 | ~50 行 |
| 删除/替换代码行 | ~30 行 |
| 修复 Bug 数 | 3 个 |
| 清理警告数 | 4 类 |

---

**开发者**: Claude Code
**日期**: 2025-12-02
**版本**: v5.1.0 (价格策略单平台模式)
