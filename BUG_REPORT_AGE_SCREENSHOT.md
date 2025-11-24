# Bug 报告：年龄分布图无法上传到飞书表格

## 🐛 问题描述

在 `project_automation` 页面生成飞书表格时，"观众画像截图-年龄"这张图无法上传，但其他图片都正常。

## 🔍 问题定位

### 日志分析

云函数日志显示：
```
--> [写入图片] 准备写入 6 张图片...
✅ 达人价格.png (screenshots[0])
✅ 男女比例.png (screenshots[2])
✅ 设备截图.png (screenshots[6])
✅ 城市等级.png (screenshots[4])
✅ 八大人群.png (screenshots[5])
✅ 星图视频.png (screenshots[1])
❌ 年龄分布.png (screenshots[3]) ← 缺失！
```

### 根本原因

**映射模板配置缺失！**

查看模板 ID `68d6bbbabffa4220ddf20928` 的 `mappingRules`：

```javascript
{
  "星图价格截图": "automation-tasks.result.screenshots.0.url",
  "观众画像截图-性别": "automation-tasks.result.screenshots.2.url",
  // ❌ 缺少 "观众画像截图-年龄" 的映射！
  "观众画像截图-设备": "automation-tasks.result.screenshots.6.url",
  "观众画像截图-城市等级": "automation-tasks.result.screenshots.4.url",
  "观众画像截图-人群": "automation-tasks.result.screenshots.5.url",
  "近三十天达人商单vv中位数截图": "automation-tasks.result.screenshots.1.url"
}
```

**模板中有"观众画像截图-年龄"这个表头**，但是**没有对应的映射规则**！

### 代码逻辑

在 `functions/syncFromFeishu/utils.js` 第 414-441 行：

```javascript
for (let j = 0; j < mappingTemplate.feishuSheetHeaders.length; j++) {
    const feishuHeader = mappingTemplate.feishuSheetHeaders[j];
    const rule = mappingTemplate.mappingRules[feishuHeader];  // ← 查找映射规则

    // 如果没有规则，finalValue 为 null
    let finalValue = null;

    if (typeof rule === 'string') {
        // 有规则才会取值
        finalValue = ...
    }

    // 判断是否是图片字段
    const isImageField = (typeof rule === 'string' && rule.includes('screenshots'));

    if (isImageField && finalValue) {
        imageWriteQueue.push({ ... });  // ← 只有有值才加入队列
    } else {
        rowData.push(finalValue);  // ← 没有映射的字段会写入 null
    }
}
```

**因为 `rule` 不存在，所以 `finalValue` 是 null，不会加入 `imageWriteQueue`！**

---

## ✅ 解决方案

### 步骤 1: 确认 screenshots[3] 存在

首先确认自动化任务的结果中是否有 `screenshots[3]`：

```javascript
// 在 MongoDB 中查询
db.automation_tasks.findOne(
  { _id: ObjectId("692490f838a85e81d50e5782") },
  { "result.screenshots": 1 }
);

// 应该能看到：
// screenshots: [
//   { name: "达人价格.png", url: "https://..." },      // [0]
//   { name: "星图视频.png", url: "https://..." },      // [1]
//   { name: "男女比例.png", url: "https://..." },      // [2]
//   { name: "年龄分布.png", url: "https://..." },      // [3] ← 确认这个存在
//   { name: "城市等级.png", url: "https://..." },      // [4]
//   { name: "八大人群.png", url: "https://..." },      // [5]
//   { name: "设备截图.png", url: "https://..." }       // [6]
// ]
```

### 步骤 2: 更新映射模板

在 MongoDB 中执行：

```javascript
db.mapping_templates.updateOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  {
    $set: {
      "mappingRules.观众画像截图-年龄": "automation-tasks.result.screenshots.3.url"
    }
  }
);
```

### 步骤 3: 验证修复

1. 重新生成飞书表格
2. 检查年龄分布图是否成功上传
3. 查看云函数日志应该显示：
   ```
   --> [写入图片] 准备写入 7 张图片...  ← 现在是 7 张了
   ...
   --> [图片] 成功写入图片到 d1f3f7!M2:M2  ← 年龄分布图
   ```

---

## 📊 完整的字段映射

修复后，完整的图片映射应该是：

| 表头 | 映射规则 | screenshots 索引 |
|------|---------|-----------------|
| 星图价格截图 | screenshots.0.url | [0] 达人价格.png |
| 观众画像截图-性别 | screenshots.2.url | [2] 男女比例.png |
| **观众画像截图-年龄** | **screenshots.3.url** | **[3] 年龄分布.png** ← 修复 |
| 观众画像截图-设备 | screenshots.6.url | [6] 设备截图.png |
| 观众画像截图-城市等级 | screenshots.4.url | [4] 城市等级.png |
| 观众画像截图-人群 | screenshots.5.url | [5] 八大人群.png |
| 近三十天达人商单vv中位数截图 | screenshots.1.url | [1] 星图视频.png |

---

## 🎯 为什么其他图片正常？

因为其他图片字段在 `mappingRules` 中**都有定义**：
- ✅ 性别 → `screenshots.2.url`
- ✅ 设备 → `screenshots.6.url`
- ✅ 城市等级 → `screenshots.4.url`
- ✅ 人群 → `screenshots.5.url`
- ✅ 商单vv → `screenshots.1.url`
- ✅ 价格 → `screenshots.0.url`

只有年龄 ❌ 没有定义！

---

## 🚀 修复步骤

### 选项 1: 通过 MongoDB Compass（推荐）

1. 打开 MongoDB Compass
2. 连接到 `kol_data` 数据库
3. 打开 `mapping_templates` 集合
4. 找到 `_id: 68d6bbbabffa4220ddf20928` 的文档
5. 编辑 `mappingRules` 字段
6. 添加：
   ```
   "观众画像截图-年龄": "automation-tasks.result.screenshots.3.url"
   ```
7. 保存

### 选项 2: 通过 MongoDB Shell

```bash
mongosh "your-mongodb-connection-string"
```

```javascript
use kol_data

db.mapping_templates.updateOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  {
    $set: {
      "mappingRules.观众画像截图-年龄": "automation-tasks.result.screenshots.3.url"
    }
  }
)

// 应该返回：
// { acknowledged: true, matchedCount: 1, modifiedCount: 1 }
```

### 选项 3: 使用提供的脚本

```bash
mongosh "your-mongodb-connection-string" < database/kol_data/scripts/fix-missing-age-screenshot.js
```

---

## 🧪 测试验证

修复后：

1. 在 `project_automation` 页面
2. 重新生成飞书表格
3. 检查"观众画像截图-年龄"列
4. 应该能看到年龄分布图

---

## 📝 预防措施

### 建议 1: 添加模板验证

在创建/更新映射模板时，验证所有表头都有对应的映射规则：

```javascript
// 伪代码
const headers = template.feishuSheetHeaders;
const rules = template.mappingRules;

for (const header of headers) {
  if (!rules[header]) {
    console.warn(`⚠️  表头 "${header}" 缺少映射规则`);
  }
}
```

### 建议 2: 云函数添加警告日志

在 `utils.js` 中添加检查：

```javascript
for (let j = 0; j < mappingTemplate.feishuSheetHeaders.length; j++) {
    const feishuHeader = mappingTemplate.feishuSheetHeaders[j];
    const rule = mappingTemplate.mappingRules[feishuHeader];

    if (!rule && feishuHeader.includes('截图')) {
        console.warn(`⚠️  图片字段 "${feishuHeader}" 没有映射规则，将跳过`);
    }

    // ... 后续逻辑
}
```

---

## 📊 问题总结

| 项目 | 说明 |
|------|------|
| **问题类型** | 配置错误（非代码 Bug） |
| **影响范围** | 只影响"观众画像截图-年龄"字段 |
| **根本原因** | 映射模板缺少该字段的映射规则 |
| **是否云函数问题** | ❌ 否，云函数逻辑正常 |
| **是否图片问题** | ❌ 否，图片本身正常（在 TOS 中存在） |
| **修复难度** | ⭐ 简单，只需更新数据库配置 |

---

**修复脚本已生成**: [database/kol_data/scripts/fix-missing-age-screenshot.js](database/kol_data/scripts/fix-missing-age-screenshot.js)

**请在 MongoDB 中执行更新语句，然后重新测试！** 🚀
