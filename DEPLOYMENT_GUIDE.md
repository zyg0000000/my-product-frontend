# 云函数部署指南

## 📋 部署文件

**修改后的云函数文件**：`handleProjectReport_index_modified.js`

**目标位置**：云函数仓库 `my-cloud-functions/handleProjectReport/index.js`

---

## 🔄 版本信息

- **原版本**：v3.6（CPM计算修正版）
- **新版本**：v3.7（投流数据支持版）
- **向后兼容**：✅ 完全兼容，不影响现有功能

---

## ✨ 主要修改

### 1. `getVideosForEntry()` 函数
**修改位置**：约 line 155-182

**新增返回字段**：
```javascript
return {
    collaborationId: collab.id,
    talentName: talentMap.get(collab.talentId) || '未知达人',
    publishDate: collab.publishDate,
    totalViews: dailyStat?.totalViews || null,
    paidAmount: dailyStat?.paidAmount || null,      // [新增]
    paidViews: dailyStat?.paidViews || null,        // [新增]
    taskId: collab.taskId || null,
    videoId: collab.videoId || null
};
```

### 2. `saveDailyStats()` 函数
**修改位置**：约 line 190-265

**核心修改**：
```javascript
// 构建 dailyStats 对象
const dailyStatsEntry = {
    date: dateStr,
    totalViews: item.totalViews,
    cpm,
    cpmChange,
    solution: ''
};

// 添加投流数据字段（如果提供）
if (item.paidAmount !== null && item.paidAmount !== undefined) {
    dailyStatsEntry.paidAmount = item.paidAmount;
}
if (item.paidViews !== null && item.paidViews !== undefined) {
    dailyStatsEntry.paidViews = item.paidViews;
}
```

---

## 🚀 部署步骤

### 方式一：使用火山引擎控制台（推荐）

1. **登录火山引擎控制台**
   - 访问：https://console.volcengine.com/
   - 进入云函数服务

2. **找到函数**
   - 搜索或找到：`handleProjectReport` 函数

3. **更新代码**
   - 点击"编辑代码"或"函数配置"
   - 复制 `handleProjectReport_index_modified.js` 的完整内容
   - 粘贴替换原有的 `index.js` 代码

4. **保存并部署**
   - 点击"保存"按钮
   - 点击"部署"按钮
   - 等待部署完成（通常1-3分钟）

5. **验证部署**
   - 查看部署状态：应该显示"运行中"
   - 查看版本信息：应该是新版本

---

### 方式二：使用 CLI 部署

如果您配置了火山引擎 CLI：

```bash
# 1. 备份原文件
cd ~/my-cloud-functions/handleProjectReport
cp index.js index.js.backup_v3.6

# 2. 替换为新文件
# 将 handleProjectReport_index_modified.js 复制并重命名为 index.js
cp ~/my-product-frontend/handleProjectReport_index_modified.js index.js

# 3. 部署到云端
# 使用您的部署命令（具体命令取决于您的配置）
# 例如：
volcengine function deploy handleProjectReport

# 4. 验证部署
volcengine function get handleProjectReport
```

---

## ✅ 部署验证

### 1. 检查函数状态
在火山引擎控制台查看：
- ✅ 函数状态：运行中
- ✅ 部署时间：最新时间戳
- ✅ 无错误日志

### 2. 前端功能测试

#### 测试1：数据保存
1. 打开前端数据录入Tab
2. 填写测试数据：
   - 当日总曝光：1000000
   - 投流消耗：5000.50
   - 投流播放量：200000
3. 点击保存
4. 查看是否成功提示

#### 测试2：数据回显
1. 保存成功后，刷新页面
2. 重新打开数据录入Tab
3. 选择相同日期
4. 检查输入框是否正确显示：
   - ✅ 当日总曝光：1,000,000
   - ✅ 投流消耗：5000.50
   - ✅ 投流播放量：200,000

#### 测试3：向后兼容
1. 尝试只填写"当日总曝光"（旧功能）
2. 保存，应该成功
3. 尝试只填写投流数据
4. 保存，应该成功

### 3. MongoDB 数据验证

连接到 MongoDB，查询数据：

```javascript
// 查询某个collaboration的dailyStats
db.collaborations.findOne(
  { id: "collaboration_xxx" },
  { dailyStats: 1 }
)

// 或者查询works集合
db.works.findOne(
  { collaborationId: "collaboration_xxx" },
  { dailyStats: 1 }
)

// 期望看到的数据结构：
{
  dailyStats: [
    {
      date: "2024-01-15",
      totalViews: 1000000,
      cpm: 12.5,
      cpmChange: 0.5,
      solution: "",
      paidAmount: 5000.50,    // [新增字段]
      paidViews: 200000       // [新增字段]
    }
  ]
}
```

---

## 🐛 故障排查

### 问题1：部署后前端报错

**可能原因**：代码语法错误

**解决方案**：
1. 检查云函数日志
2. 确认代码复制完整
3. 检查是否有多余的字符或格式问题

### 问题2：数据保存失败

**可能原因**：权限或数据库连接问题

**解决方案**：
1. 检查云函数环境变量（MONGO_URI）
2. 检查MongoDB连接状态
3. 查看云函数日志获取详细错误

### 问题3：投流数据保存了但不显示

**可能原因**：数据读取路径问题

**解决方案**：
1. 检查MongoDB中数据是否真的保存了
2. 确认 `getVideosForEntry` 函数是否正确返回
3. 检查前端控制台网络请求响应

### 问题4：旧数据无法访问

**可能原因**：兼容性问题

**解决方案**：
1. 回滚到备份版本：`index.js.backup_v3.6`
2. 检查修改代码是否影响了原有逻辑
3. 联系开发者排查

---

## 📊 监控建议

部署后建议监控以下指标（前几天）：

1. **云函数调用次数**
   - 是否正常增长
   - 是否有异常峰值

2. **错误率**
   - 应该维持在低水平
   - 如果突然升高需要排查

3. **响应时间**
   - 应该在正常范围内
   - 新字段不应显著影响性能

4. **用户反馈**
   - 数据录入是否正常
   - 是否有数据丢失

---

## 🔄 回滚计划

如果出现严重问题，可以快速回滚：

### 方式一：使用备份文件
```bash
# 恢复备份
cp index.js.backup_v3.6 index.js

# 重新部署
volcengine function deploy handleProjectReport
```

### 方式二：使用控制台
1. 进入云函数控制台
2. 找到"版本管理"
3. 选择 v3.6 版本
4. 点击"回滚到此版本"

---

## 📞 技术支持

如遇到问题：

1. **查看日志**
   - 火山引擎控制台 > 云函数 > handleProjectReport > 日志
   - 前端浏览器控制台（Network、Console）

2. **检查文档**
   - `cloud-function-modification.md` - 详细修改说明
   - `data-entry-optimization-plan.md` - 前端优化方案

3. **数据备份**
   - 建议在大量录入数据前，先进行小规模测试
   - 重要数据建议先在测试环境验证

---

## ✨ 部署后的功能

部署成功后，用户可以：

1. ✅ **录入投流数据**
   - 在数据录入Tab填写投流消耗和播放量
   - 数据保存到MongoDB

2. ✅ **查看历史数据**
   - 切换日期后自动回显投流数据
   - 支持修改已录入的数据

3. ✅ **灵活组合**
   - 只录入播放量（旧功能）
   - 只录入投流数据
   - 同时录入所有数据

4. ✅ **数据分析**（未来扩展）
   - 可基于投流数据计算ROI
   - 可分析自然流量 vs 投流效果

---

## 📝 修改日志

### v3.7 (2025-01-XX)
- ✅ 新增 `paidAmount` 字段支持
- ✅ 新增 `paidViews` 字段支持
- ✅ 修改 `getVideosForEntry` 返回投流数据
- ✅ 修改 `saveDailyStats` 保存投流数据
- ✅ 保持向后兼容

### v3.6 (之前)
- CPM计算公式修正
- 定档内容数量正确计算

---

部署愉快！如有问题随时反馈。🚀
