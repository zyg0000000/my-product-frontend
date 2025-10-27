# 云函数修改方案：支持投流数据字段

## 📋 修改文件
`handleProjectReport/index.js` - `saveDailyStats()` 函数

---

## 🔧 修改代码

### 1. 找到 saveDailyStats 函数

在 `handleProjectReport/index.js` 中找到这个函数（大约在文件中部）。

### 2. 修改数据处理逻辑

**原代码**（大约第XX行）：
```javascript
const pushOp = {
    $push: {
        dailyStats: {
            $each: [{
                date: dateStr,
                totalViews: item.totalViews,
                cpm: cpm,
                cpmChange: cpmChange,
                solution: ''
            }],
            $sort: { date: 1 }
        }
    }
};
```

**修改为**：
```javascript
// [Phase 2 新增] 构建dailyStats对象，支持投流数据字段
const dailyStatsEntry = {
    date: dateStr,
    totalViews: item.totalViews,
    cpm: cpm,
    cpmChange: cpmChange,
    solution: ''
};

// [Phase 2 新增] 添加投流数据字段（如果提供）
if (item.paidAmount !== null && item.paidAmount !== undefined) {
    dailyStatsEntry.paidAmount = item.paidAmount;
}
if (item.paidViews !== null && item.paidViews !== undefined) {
    dailyStatsEntry.paidViews = item.paidViews;
}

const pushOp = {
    $push: {
        dailyStats: {
            $each: [dailyStatsEntry],
            $sort: { date: 1 }
        }
    }
};
```

---

## 📊 修改后的数据结构

### 请求格式（前端发送）：
```json
{
  "projectId": "xxx",
  "date": "2024-01-15",
  "data": [
    {
      "collaborationId": "collaboration_123",
      "totalViews": 1000000,
      "paidAmount": 5000.50,
      "paidViews": 200000
    },
    {
      "collaborationId": "collaboration_456",
      "totalViews": 800000
      // paidAmount 和 paidViews 可选
    }
  ]
}
```

### 存储格式（MongoDB）：
```javascript
// collaborations 集合中的某个文档
{
  _id: ObjectId("..."),
  projectId: "xxx",
  talentName: "张三",
  // ... 其他字段

  dailyStats: [
    {
      date: "2024-01-15",
      totalViews: 1000000,
      cpm: 12.5,
      cpmChange: 0.5,
      solution: "",
      paidAmount: 5000.50,    // [新增] 可选
      paidViews: 200000       // [新增] 可选
    },
    {
      date: "2024-01-14",
      totalViews: 950000,
      cpm: 12.3,
      cpmChange: 0.2,
      solution: ""
      // 旧数据没有投流字段也能正常工作
    }
  ]
}
```

---

## ✅ 向后兼容性

### 兼容要点：
1. ✅ **字段可选**：paidAmount 和 paidViews 不是必填
2. ✅ **旧数据不受影响**：现有的 dailyStats 记录保持不变
3. ✅ **渐进增强**：只在提供新字段时才存储
4. ✅ **MongoDB 动态 Schema**：支持文档结构灵活扩展

### 测试场景：
- ✅ 只提供 totalViews（旧逻辑）→ 正常工作
- ✅ 只提供投流数据 → 正常工作
- ✅ 同时提供所有数据 → 正常工作
- ✅ 部分视频有投流数据 → 正常工作

---

## 🔄 配套修改：数据读取

### 可能需要检查的地方

如果前端需要显示历史投流数据，需要确保数据读取接口也返回这些字段。

**需要检查的API**：
- `/videos-for-entry` - 获取视频列表用于数据录入

**检查方法**：
该接口应该从 `collaborations` 集合中读取 `dailyStats` 数组，并返回指定日期的数据。

**可能的修改位置**（如果需要）：
在 `handleProjectReport/index.js` 或相应的查询函数中，确保返回时包含 `paidAmount` 和 `paidViews`。

由于 MongoDB 的动态 schema 特性，通常不需要修改读取代码，这些字段会自动返回（如果存在）。

---

## 🚀 部署步骤

1. **备份原文件**
   ```bash
   cd my-cloud-functions/handleProjectReport
   cp index.js index.js.backup
   ```

2. **修改代码**
   - 按照上述方案修改 `saveDailyStats` 函数
   - 保存文件

3. **本地测试**（如果有测试环境）
   ```bash
   # 测试投流数据保存
   curl -X POST https://your-api.com/daily-stats \
     -H "Content-Type: application/json" \
     -d '{
       "projectId": "test_project",
       "date": "2024-01-15",
       "data": [{
         "collaborationId": "test_collab",
         "totalViews": 1000000,
         "paidAmount": 5000.50,
         "paidViews": 200000
       }]
     }'
   ```

4. **部署到火山引擎**
   - 使用火山引擎控制台或 CLI 部署更新后的云函数
   - 等待部署完成（通常几分钟）

5. **验证部署**
   - 在前端进行测试录入
   - 检查 MongoDB 数据是否正确保存
   - 检查数据回显是否正常

---

## 📝 额外建议

### 1. 添加字段验证（可选）
```javascript
// 在函数开始处添加验证
if (item.paidAmount !== undefined && typeof item.paidAmount !== 'number') {
    throw new Error('paidAmount must be a number');
}
if (item.paidViews !== undefined && typeof item.paidViews !== 'number') {
    throw new Error('paidViews must be an integer');
}
```

### 2. 添加日志记录（推荐）
```javascript
// 记录投流数据保存
if (item.paidAmount || item.paidViews) {
    console.log(`Saving paid promotion data for ${item.collaborationId}:
                 amount=${item.paidAmount}, views=${item.paidViews}`);
}
```

### 3. 版本标记（可选）
在 `package.json` 中更新版本号：
```json
{
  "version": "1.3.0",
  "description": "支持投流数据录入"
}
```

---

## 🎯 预期效果

修改完成后：

### 前端操作
1. 在数据录入Tab填写投流数据
2. 点击保存
3. 数据成功保存到MongoDB

### 数据库存储
```javascript
// 查询MongoDB验证
db.collaborations.findOne({_id: ObjectId("xxx")}, {dailyStats: 1})

// 应该看到类似输出：
{
  dailyStats: [
    {
      date: "2024-01-15",
      totalViews: 1000000,
      paidAmount: 5000.50,    // ✅ 新字段
      paidViews: 200000,      // ✅ 新字段
      cpm: 12.5,
      cpmChange: 0.5,
      solution: ""
    }
  ]
}
```

### 数据回显
再次打开数据录入Tab，选择相同日期，应该看到：
- 当日总曝光：1,000,000 ✅
- 投流消耗(元)：5000.50 ✅
- 投流播放量：200,000 ✅

---

## ❓ 常见问题

### Q1: MongoDB需要修改Schema吗？
**A**: 不需要。MongoDB的动态schema特性允许在文档中添加新字段，无需预先定义。

### Q2: 会影响现有功能吗？
**A**: 不会。新字段是可选的，旧代码路径不受影响。

### Q3: 如果只填写投流数据不填播放量会怎样？
**A**: 可以保存。两个字段完全独立，可以单独存在。

### Q4: 如何验证修改是否成功？
**A**:
1. 前端录入测试数据
2. 去MongoDB查看对应的collaboration文档
3. 检查dailyStats数组中是否包含新字段

---

## 📌 总结

### 需要修改的文件：
- ✅ `handleProjectReport/index.js` (云函数)

### 需要修改的函数：
- ✅ `saveDailyStats()`

### 修改内容：
- ✅ 接受 `paidAmount` 和 `paidViews` 字段
- ✅ 存储到 `dailyStats` 数组
- ✅ 保持向后兼容

### 预计工作量：
- ⏱️ 代码修改：5-10分钟
- ⏱️ 测试验证：10-15分钟
- ⏱️ 部署上线：5-10分钟
- **总计**：约 20-35 分钟

---

完成云函数修改后，前端的Phase 2功能就可以完整使用了！ 🚀
