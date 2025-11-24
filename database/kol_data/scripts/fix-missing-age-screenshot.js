/**
 * 修复映射模板中缺失的"观众画像截图-年龄"字段
 *
 * 问题：报名表模板中缺少年龄分布图的映射
 * 影响：生成飞书表格时，年龄分布图无法上传
 *
 * 使用方法：
 * 1. 在 MongoDB 中执行此脚本
 * 2. 或者手动在 MongoDB Compass 中执行下面的更新语句
 */

// 方案 1: MongoDB Shell 命令
db.mapping_templates.updateOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  {
    $set: {
      "mappingRules.观众画像截图-年龄": "automation-tasks.result.screenshots.3.url"
    }
  }
);

// 验证更新
db.mapping_templates.findOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  { "mappingRules.观众画像截图-年龄": 1 }
);

/**
 * 预期结果：
 * {
 *   "_id": ObjectId("68d6bbbabffa4220ddf20928"),
 *   "mappingRules": {
 *     "观众画像截图-年龄": "automation-tasks.result.screenshots.3.url"
 *   }
 * }
 */

// ============================================
// 完整的 screenshots 索引参考
// ============================================
/**
 * screenshots 数组索引对应关系：
 *
 * [0] 达人价格.png       → 星图价格截图
 * [1] 星图视频.png       → 近三十天达人商单vv中位数截图
 * [2] 男女比例.png       → 观众画像截图-性别
 * [3] 年龄分布.png       → 观众画像截图-年龄 ← 缺失的映射
 * [4] 城市等级.png       → 观众画像截图-城市等级
 * [5] 八大人群.png       → 观众画像截图-人群
 * [6] 设备截图.png       → 观众画像截图-设备
 */

// ============================================
// 修复后的完整 mappingRules 应该是：
// ============================================
const completeMappingRules = {
  "星图价格截图": "automation-tasks.result.screenshots.0.url",
  "观众画像截图-性别": "automation-tasks.result.screenshots.2.url",
  "观众画像截图-年龄": "automation-tasks.result.screenshots.3.url",  // ← 新增
  "观众画像截图-设备": "automation-tasks.result.screenshots.6.url",
  "观众画像截图-城市等级": "automation-tasks.result.screenshots.4.url",
  "观众画像截图-人群": "automation-tasks.result.screenshots.5.url",
  "近三十天达人商单vv中位数截图": "automation-tasks.result.screenshots.1.url"
};

// 如果你想一次性更新所有图片映射，使用这个命令：
db.mapping_templates.updateOne(
  { _id: ObjectId("68d6bbbabffa4220ddf20928") },
  {
    $set: {
      "mappingRules.星图价格截图": "automation-tasks.result.screenshots.0.url",
      "mappingRules.观众画像截图-性别": "automation-tasks.result.screenshots.2.url",
      "mappingRules.观众画像截图-年龄": "automation-tasks.result.screenshots.3.url",
      "mappingRules.观众画像截图-设备": "automation-tasks.result.screenshots.6.url",
      "mappingRules.观众画像截图-城市等级": "automation-tasks.result.screenshots.4.url",
      "mappingRules.观众画像截图-人群": "automation-tasks.result.screenshots.5.url",
      "mappingRules.近三十天达人商单vv中位数截图": "automation-tasks.result.screenshots.1.url"
    }
  }
);

console.log("✅ 映射模板已更新！");
