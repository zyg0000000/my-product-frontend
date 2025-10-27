# 数据录入Tab优化方案

## 一、现状分析

### 当前实现
```
数据录入Tab
├── 隐藏的日期选择器 (entry-date-picker)
├── 视频列表表格
│   ├── 达人名称
│   ├── 任务ID
│   ├── 发布时间
│   ├── 视频链接
│   ├── 当日总曝光 (可输入)
│   └── 状态 (待抓取>14d / 自动抓取中 / 已完成 / 失败)
└── 操作按钮
    ├── 一键抓取(≤14天)
    ├── 一键抓取(>14天)
    ├── 待手动更新
    ├── 取消
    └── 保存当日数据
```

### 存在的问题
1. ❌ 日期选择器隐藏，无法切换日期查看/编辑其他日期的数据
2. ❌ "待抓取(>14d)"状态表述不够清晰
3. ❌ 直接批量保存，缺乏输入验证和变更提示
4. ❌ 只能录入播放量，缺少投流消耗、投流流量等字段
5. ❌ 视觉样式较为朴素，信息层次不够清晰

---

## 二、优化方案（推荐：渐进式改进）

### 2.1 添加日期选择器 ⭐⭐⭐⭐⭐

**设计方案：**
```
┌─────────────────────────────────────────────────────────┐
│  📅 数据录入日期: [2024-01-15 ▼]   [今天] [昨天]      │
│  💡 提示: 共12条视频，已录入8条，待录入4条              │
└─────────────────────────────────────────────────────────┘
```

**实现要点：**
- 在表格上方添加显眼的日期选择器（类似日报Tab的设计）
- 快捷按钮："今天"、"昨天"、"前天"
- 显示录入统计：已录入数量 / 总数量
- 日期改变时自动重新加载数据
- 如果选择的日期已有数据，显示在输入框中（支持修改）

**数据获取逻辑：**
```javascript
// API: /videos-for-entry?projectId=xxx&date=2024-01-15
// 返回: {
//   data: [
//     {
//       collaborationId,
//       talentName,
//       publishDate,
//       taskId,
//       videoId,
//       totalViews: 1234567, // 如果当日已录入，显示历史数据
//       isPrevious: true // 标记是否为历史数据
//     }
//   ]
// }
```

---

### 2.2 优化状态显示 ⭐⭐⭐⭐

**当前问题：**
"待抓取(>14d)" 表述模糊，容易混淆

**优化方案A - 详细状态文案：**
| 原状态 | 优化后 | 说明 |
|--------|--------|------|
| 待抓取(>14d) | 🟡 超期待抓取 | 明确表示超过14天 |
| 未开始 | ⚪ 未抓取 | 默认状态 |
| 排队中 | 🟠 排队中 | 任务pending |
| 自动抓取中 | 🔵 抓取中... | 任务processing |
| 已完成 | ✅ 已自动获取 | 任务completed |
| 失败 | ❌ 抓取失败 [重试] | 任务failed + 重试按钮 |

**优化方案B - 分组 + Tooltip（推荐）：**
```html
<span class="status-badge status-overdue"
      title="视频已发布14天以上，需使用'超期抓取'功能">
  🟡 超期
</span>
```

**CSS样式：**
```css
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.status-overdue {
  background: #FEF3C7; /* amber-100 */
  color: #92400E; /* amber-800 */
}
.status-pending { background: #DBEAFE; color: #1E40AF; }
.status-completed { background: #D1FAE5; color: #065F46; }
.status-failed { background: #FEE2E2; color: #991B1B; }
```

**对其他功能的影响：**
- ✅ 不影响自动化逻辑（状态判断基于 `isOverdue` 和 `task.status`）
- ✅ 只是文案和样式的优化
- ⚠️ 需要更新弹窗标题："待手动更新日报（>14天）" → "超期视频处理"

---

### 2.3 改进保存机制 ⭐⭐⭐⭐⭐

**当前问题：**
- 直接在输入框输入，批量保存
- 没有输入验证
- 没有变更提示
- 保存失败没有明确反馈

**优化方案：实时验证 + 变更标记**

#### 2.3.1 输入验证
```javascript
// 实时验证规则
const validateInput = (value) => {
  const num = parseInt(value);
  return {
    valid: !isNaN(num) && num >= 0 && num <= 999999999,
    error: isNaN(num) ? '请输入数字' :
           num < 0 ? '不能为负数' :
           num > 999999999 ? '数值过大' : null
  };
};
```

#### 2.3.2 变更标记
```html
<!-- 修改后的行添加标记 -->
<tr class="modified-row">
  <td>...</td>
  <td>
    <input value="1234567" class="modified-input" />
    <span class="modified-badge">✎ 已修改</span>
  </td>
</tr>
```

#### 2.3.3 保存前确认
```javascript
// 保存前统计
const modifiedCount = allVideosForEntry.filter(v => v.isModified).length;
if (modifiedCount > 0) {
  Modal.showConfirm(
    `即将保存 ${modifiedCount} 条记录，确认提交吗？`,
    '确认保存',
    async (confirmed) => {
      if (confirmed) await saveDailyData();
    }
  );
}
```

#### 2.3.4 保存后反馈
```javascript
// 成功后显示详细信息
alert(`✅ 保存成功！\n- 更新了 ${savedCount} 条记录\n- 日期: ${entryDate}`);

// 并自动切换到日报Tab查看效果
setTimeout(() => {
  reportDatePicker.value = entryDate;
  switchTab('daily-report');
}, 1500);
```

**方案对比：**

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| A. 当前批量保存 | 简单快速 | 无验证、易误操作 | ⭐⭐ |
| B. 实时验证+批量保存 | 避免错误、保持效率 | 需要额外UI | ⭐⭐⭐⭐⭐ |
| C. 逐行保存 | 即时反馈 | 频繁请求、慢 | ⭐⭐⭐ |
| D. 自动保存草稿 | 防数据丢失 | 实现复杂 | ⭐⭐⭐⭐ |

**推荐：方案B（实时验证+批量保存）**

---

### 2.4 扩展字段支持投流数据 ⭐⭐⭐⭐⭐

**需求分析：**
需要录入每日的：
1. 自然播放量（已有）
2. 投流消耗金额
3. 投流带来的播放量

**数据结构设计：**

#### Option 1: 在 daily-stats 集合扩展
```javascript
{
  projectId: "xxx",
  date: "2024-01-15",
  stats: [
    {
      collaborationId: "xxx",
      naturalViews: 1000000,      // 自然播放量
      paidAmount: 5000,            // 投流消耗（元）
      paidViews: 200000,           // 投流播放量
      totalViews: 1200000,         // 总播放量（计算字段）
      updatedAt: "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Option 2: 独立集合 paid-promotion
```javascript
// paid-promotion 集合
{
  projectId: "xxx",
  collaborationId: "xxx",
  date: "2024-01-15",
  amount: 5000,           // 投流金额
  views: 200000,          // 投流带来的播放量
  source: "feishu",       // 数据来源: manual / feishu
  syncedAt: "2024-01-15T10:30:00Z"
}
```

**推荐：Option 1（统一存储）**
- ✅ 查询简单（一次查询获取所有数据）
- ✅ 事务性好（一起保存）
- ✅ 便于计算总播放量
- ❌ 字段较多

**UI设计方案：**

#### 方案A：展开行（推荐）
```
┌─────────────────────────────────────────────────────────────────┐
│ 张三  │ 123456  │ 2024-01-10 │ [▶ 展开详情] │ ✅ 已完成        │
└─────────────────────────────────────────────────────────────────┘

点击"展开详情"后：

┌─────────────────────────────────────────────────────────────────┐
│ 张三  │ 123456  │ 2024-01-10 │ [▼ 收起详情] │ ✅ 已完成        │
├─────────────────────────────────────────────────────────────────┤
│  📊 自然播放量   │ [1,000,000 ..................] 已自动获取   │
│  💰 投流消耗     │ [¥ 5,000 .....................] 手动输入    │
│  📈 投流播放量   │ [200,000 .....................] 手动输入    │
│  📍 总播放量     │ 1,200,000 (自动计算)                         │
└─────────────────────────────────────────────────────────────────┘
```

#### 方案B：分Tab
```
[基础数据] [投流数据]

基础数据Tab：
- 达人名称、播放量等（当前内容）

投流数据Tab：
- 投流消耗、投流播放量等
```

#### 方案C：弹窗编辑
```
点击"编辑" → 弹出详细编辑框
```

**推荐：方案A（展开行）**
- ✅ 一屏内完成所有操作
- ✅ 视觉层次清晰
- ✅ 适合数据录入场景
- ❌ 表格高度会变化（可通过动画优化）

---

### 2.5 飞书同步方案 ⭐⭐⭐⭐

**背景：**
投流数据通常记录在飞书表格中，需要支持批量同步。

**方案设计：**

#### 数据流程
```
飞书表格 → 云函数获取 → 解析匹配 → 写入数据库 → 前端刷新
```

#### 飞书表格格式（示例）
```
| 日期       | 达人名称 | 任务ID  | 投流金额 | 投流播放量 |
|-----------|---------|---------|----------|-----------|
| 2024-01-15| 张三    | 123456  | 5000     | 200000    |
| 2024-01-15| 李四    | 123457  | 3000     | 150000    |
```

#### 云函数实现
```javascript
// /sync-paid-promotion-from-feishu
export async function main(ctx) {
  const { projectId, date, feishuTableId } = ctx.body;

  // 1. 调用飞书API获取表格数据
  const feishuData = await fetchFeishuTable(feishuTableId);

  // 2. 解析并匹配项目的合作达人
  const collaborations = await db.collection('collaborations')
    .find({ projectId })
    .toArray();

  const matchedData = feishuData.map(row => {
    const collab = collaborations.find(c =>
      c.taskId === row.taskId || c.talentName === row.talentName
    );
    return {
      collaborationId: collab._id,
      date: row.date,
      paidAmount: row.amount,
      paidViews: row.views
    };
  });

  // 3. 批量更新 daily-stats
  await updateDailyStats(projectId, date, matchedData);

  return { success: true, syncedCount: matchedData.length };
}
```

#### 前端UI
```html
<button id="sync-feishu-btn" class="...">
  <svg>...</svg>
  飞书数据同步
</button>

<!-- 弹窗 -->
<div id="feishu-sync-modal">
  <h2>从飞书同步投流数据</h2>
  <label>飞书表格ID</label>
  <input id="feishu-table-id" placeholder="输入表格ID或链接" />
  <label>同步日期</label>
  <input type="date" id="sync-date" />
  <button>开始同步</button>
</div>
```

**实现优先级：**
1. ⭐⭐⭐⭐⭐ 先实现手动录入投流数据
2. ⭐⭐⭐⭐ 再实现飞书同步功能
3. ⭐⭐⭐ 最后优化自动同步

---

### 2.6 视觉样式优化 ⭐⭐⭐⭐

#### 优化点1: 状态颜色编码
```css
/* 不同状态不同背景色 */
tr.status-completed { background: #F0FDF4; } /* green-50 */
tr.status-pending { background: #EFF6FF; }   /* blue-50 */
tr.status-overdue { background: #FEF3C7; }   /* amber-50 */
tr.status-failed { background: #FEE2E2; }     /* red-50 */
tr.modified { border-left: 4px solid #6366F1; } /* indigo-500 */
```

#### 优化点2: 输入框样式增强
```css
input.view-input {
  border: 2px solid #E5E7EB;
  transition: all 0.2s;
}
input.view-input:focus {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
input.view-input.modified {
  border-color: #10B981; /* green-500 */
  background: #F0FDF4;
}
input.view-input.error {
  border-color: #EF4444; /* red-500 */
  background: #FEE2E2;
}
```

#### 优化点3: 添加加载骨架屏
```html
<!-- 加载中显示骨架屏而不是文字 -->
<tr class="skeleton-row">
  <td><div class="skeleton-box w-20"></div></td>
  <td><div class="skeleton-box w-24"></div></td>
  <td><div class="skeleton-box w-32"></div></td>
  <td><div class="skeleton-box w-16"></div></td>
  <td><div class="skeleton-box w-full"></div></td>
  <td><div class="skeleton-box w-20"></div></td>
</tr>
```

#### 优化点4: 响应式设计
```css
/* 移动端隐藏部分列 */
@media (max-width: 768px) {
  th:nth-child(2), td:nth-child(2) { display: none; } /* 任务ID */
  th:nth-child(4), td:nth-child(4) { display: none; } /* 视频链接 */
}
```

#### 优化点5: 统计卡片
```html
<div class="stats-cards">
  <div class="stat-card">
    <span class="stat-label">已录入</span>
    <span class="stat-value text-green-600">8</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">待录入</span>
    <span class="stat-value text-amber-600">4</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">超期视频</span>
    <span class="stat-value text-red-600">2</span>
  </div>
</div>
```

---

## 三、实施建议

### Phase 1: 基础优化（1-2天）
- [x] 2.1 添加日期选择器 + 录入统计
- [x] 2.2 优化状态显示文案和样式
- [x] 2.3 添加输入验证和变更标记
- [x] 2.6 基础视觉优化

**优先级：⭐⭐⭐⭐⭐（必须做）**

### Phase 2: 功能扩展（2-3天）
- [x] 2.4 扩展投流数据字段
- [x] 实现展开行UI
- [x] 修改保存API支持新字段
- [x] 2.5 飞书同步（手动版）

**优先级：⭐⭐⭐⭐（重要）**

### Phase 3: 高级功能（3-5天）
- [ ] 自动保存草稿
- [ ] 飞书自动同步
- [ ] 批量导入/导出
- [ ] 数据校验规则引擎

**优先级：⭐⭐⭐（可选）**

---

## 四、技术要点

### 4.1 API调整

#### 修改 /daily-stats POST接口
```javascript
// 请求体
{
  projectId: "xxx",
  date: "2024-01-15",
  data: [
    {
      collaborationId: "xxx",
      naturalViews: 1000000,
      paidAmount: 5000,      // 新增
      paidViews: 200000      // 新增
    }
  ]
}
```

#### 新增 /sync-feishu-data 接口
```javascript
{
  projectId: "xxx",
  feishuTableId: "xxx",
  dateRange: ["2024-01-01", "2024-01-15"]
}
```

### 4.2 前端状态管理
```javascript
// 增强allVideosForEntry的数据结构
allVideosForEntry = [
  {
    collaborationId: "xxx",
    talentName: "张三",
    // ... 原有字段

    // 新增字段
    naturalViews: 1000000,    // 自然播放量
    paidAmount: 5000,          // 投流金额
    paidViews: 200000,         // 投流播放量
    totalViews: 1200000,       // 总计（计算）

    // UI状态
    isExpanded: false,         // 是否展开详情
    isModified: false,         // 是否被修改
    isPrevious: false,         // 是否为历史数据
    validationError: null      // 验证错误信息
  }
];
```

---

## 五、效果预期

### 改进前
- ❌ 无法选择日期
- ❌ 状态表述模糊
- ❌ 无输入验证
- ❌ 只能录入播放量
- ❌ 视觉较朴素

### 改进后
- ✅ 灵活的日期选择
- ✅ 清晰的状态展示
- ✅ 实时输入验证
- ✅ 支持投流数据录入
- ✅ 现代化的视觉设计
- ✅ 支持飞书批量同步

### 用户体验提升
| 指标 | 改进前 | 改进后 | 提升 |
|------|--------|--------|------|
| 录入效率 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |
| 错误率 | ⭐⭐ | ⭐⭐⭐⭐ | +100% |
| 功能完整性 | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |
| 视觉美观度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | +67% |

---

## 六、风险评估

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| API变更影响现有功能 | 高 | 低 | 保持向后兼容，新增字段可选 |
| 飞书API限流 | 中 | 中 | 实现限流和重试机制 |
| 数据量大导致性能问题 | 中 | 低 | 分页加载，虚拟滚动 |
| 用户不习惯新UI | 低 | 中 | 保留旧版切换选项 |

---

## 七、总结

**推荐实施顺序：**
1. ⭐⭐⭐⭐⭐ 日期选择器 + 状态优化 + 输入验证（Phase 1）
2. ⭐⭐⭐⭐⭐ 投流数据字段扩展（Phase 2）
3. ⭐⭐⭐⭐ 飞书手动同步（Phase 2）
4. ⭐⭐⭐ 飞书自动同步（Phase 3）

**预计工作量：**
- Phase 1: 1-2天（前端为主）
- Phase 2: 2-3天（前后端协作）
- Phase 3: 3-5天（复杂功能）

**立即可开始：**
建议先完成 Phase 1，验证用户反馈后再进行 Phase 2 和 Phase 3。
