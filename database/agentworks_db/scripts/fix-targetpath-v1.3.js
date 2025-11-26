/**
 * 修复 field_mappings 中 talent_performance 规则的 targetPath
 *
 * 问题：targetPath 写的是 performanceData.xxx，但 talent_performance 集合应该用 metrics.xxx
 *
 * 修复映射：
 * - performanceData.cpm → metrics.cpm
 * - performanceData.audienceGender.male → metrics.audienceGender.male
 * - performanceData.audienceGender.female → metrics.audienceGender.female
 * - performanceData.audienceAge.* → metrics.audienceAge.*
 * - performanceData.crowdPackage.* → metrics.crowdPackage.*
 *
 * 执行方式：
 * mongosh "mongodb+srv://..." --file fix-targetpath-v1.3.js
 */

const db = db.getSiblingDB('agentworks_db');

print('=== 修复 field_mappings targetPath ===\n');

// 查找所有平台的 field_mappings
const mappings = db.field_mappings.find({}).toArray();

let totalUpdated = 0;

mappings.forEach(mapping => {
  print(`处理: ${mapping.platform} - ${mapping.configName}`);

  // 检查 mappings 是否存在
  if (!mapping.mappings || !Array.isArray(mapping.mappings)) {
    print(`  → 跳过: 无 mappings 数组\n`);
    return;
  }

  let modified = false;
  const updatedMappings = mapping.mappings.map(rule => {
    // 只处理 talent_performance 集合的规则
    if (rule.targetCollection === 'talent_performance' && rule.targetPath) {
      const oldPath = rule.targetPath;

      // 替换 performanceData. 为 metrics.
      if (oldPath.startsWith('performanceData.')) {
        rule.targetPath = oldPath.replace('performanceData.', 'metrics.');
        print(`  ✓ ${rule.excelHeader}: ${oldPath} → ${rule.targetPath}`);
        modified = true;
      }
    }
    return rule;
  });

  if (modified) {
    // 更新数据库
    db.field_mappings.updateOne(
      { _id: mapping._id },
      {
        $set: {
          mappings: updatedMappings,
          updatedAt: new Date(),
          version: '1.2'
        }
      }
    );
    totalUpdated++;
    print(`  → 已更新\n`);
  } else {
    print(`  → 无需更新\n`);
  }
});

print(`\n=== 完成: 更新了 ${totalUpdated} 个配置 ===`);
