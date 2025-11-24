/**
 * 修复映射模板中图片字段的索引错误
 *
 * 问题：screenshots 数组的索引映射不正确
 * - 年龄映射到了 [4]，实际应该是 [3]
 * - 设备映射到了 [7]（可能不存在），实际应该是 [6]
 * - 城市等级映射到了 [5]，实际应该是 [4]
 * - 人群映射到了 [6]，实际应该是 [5]
 *
 * 实际的 screenshots 数组顺序：
 * [0] 达人价格.png
 * [1] 星图视频.png
 * [2] 男女比例.png
 * [3] 年龄分布.png ← 当前映射错误导致缺失
 * [4] 城市等级.png
 * [5] 八大人群.png
 * [6] 设备截图.png
 */

// MongoDB 更新命令
db.mapping_templates.updateOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  {
    $set: {
      // 修正所有观众画像相关的图片映射
      "mappingRules.观众画像截图-年龄": "automation-tasks.result.screenshots.3.url",
      "mappingRules.观众画像截图-城市等级": "automation-tasks.result.screenshots.4.url",
      "mappingRules.观众画像截图-人群": "automation-tasks.result.screenshots.5.url",
      "mappingRules.观众画像截图-设备": "automation-tasks.result.screenshots.6.url"
    }
  }
);

console.log("✅ 图片映射已修正！");

// 验证更新结果
const result = db.mapping_templates.findOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  {
    "mappingRules.星图价格截图": 1,
    "mappingRules.观众画像截图-性别": 1,
    "mappingRules.观众画像截图-年龄": 1,
    "mappingRules.观众画像截图-设备": 1,
    "mappingRules.观众画像截图-城市等级": 1,
    "mappingRules.观众画像截图-人群": 1,
    "mappingRules.近三十天达人商单vv中位数截图": 1
  }
);

console.log("修正后的映射：", result.mappingRules);

/**
 * 预期结果：
 * {
 *   "星图价格截图": "automation-tasks.result.screenshots.0.url",
 *   "观众画像截图-性别": "automation-tasks.result.screenshots.2.url",
 *   "观众画像截图-年龄": "automation-tasks.result.screenshots.3.url",      ← 修正
 *   "观众画像截图-设备": "automation-tasks.result.screenshots.6.url",      ← 修正
 *   "观众画像截图-城市等级": "automation-tasks.result.screenshots.4.url",  ← 修正
 *   "观众画像截图-人群": "automation-tasks.result.screenshots.5.url",      ← 修正
 *   "近三十天达人商单vv中位数截图": "automation-tasks.result.screenshots.1.url"
 * }
 */
