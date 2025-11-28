/**
 * 为 field_mappings.mappings 添加 category 字段
 *
 * 分类规则（基于 targetPath）：
 * - 基础信息: platformAccountId, name, platformSpecific.*, talentTier
 * - 核心绩效: prices, metrics.cpm
 * - 受众分析-性别: metrics.audienceGender.*
 * - 受众分析-年龄: metrics.audienceAge.*
 * - 人群包分析: metrics.crowdPackage.*
 *
 * 执行方式：
 * mongosh "mongodb://..." --file add-category-to-field-mappings.js
 */

const db = db.getSiblingDB('agentworks_db');

print('=== 为 field_mappings 添加 category 字段 ===\n');

// 分类规则映射
function getCategory(targetPath) {
  if (!targetPath) return '基础信息';

  // 基础信息
  if (['platformAccountId', 'name', 'talentTier', 'oneId'].includes(targetPath)) {
    return '基础信息';
  }
  if (targetPath.startsWith('platformSpecific.')) {
    return '基础信息';
  }

  // 核心绩效
  if (targetPath === 'prices' || targetPath.includes('cpm') || targetPath === 'metrics.cpm') {
    return '核心绩效';
  }
  if (targetPath.includes('lastUpdated') || targetPath.includes('updateDate')) {
    return '核心绩效';
  }

  // 受众分析-性别
  if (targetPath.includes('audienceGender') || targetPath.includes('Gender')) {
    return '受众分析-性别';
  }

  // 受众分析-年龄
  if (targetPath.includes('audienceAge') || targetPath.includes('Age')) {
    return '受众分析-年龄';
  }

  // 人群包分析
  if (targetPath.includes('crowdPackage') || targetPath.includes('crowd')) {
    return '人群包分析';
  }

  // 默认
  return '基础信息';
}

// 查找所有 field_mappings
const configs = db.field_mappings.find({}).toArray();

let totalUpdated = 0;

configs.forEach(config => {
  print(`处理: ${config.platform} - ${config.configName}`);

  if (!config.mappings || !Array.isArray(config.mappings)) {
    print(`  → 跳过: 无 mappings 数组\n`);
    return;
  }

  let modified = false;
  const updatedMappings = config.mappings.map(rule => {
    // 如果已有 category 则跳过
    if (rule.category) {
      return rule;
    }

    const category = getCategory(rule.targetPath);
    print(`  ✓ ${rule.excelHeader} → ${category}`);
    modified = true;

    return {
      ...rule,
      category: category
    };
  });

  if (modified) {
    // 同时添加 categories 配置（如果没有）
    const categories = config.categories || [
      { name: '基础信息', order: 1, icon: 'user' },
      { name: '核心绩效', order: 2, icon: 'chart' },
      { name: '受众分析-性别', order: 3, icon: 'users' },
      { name: '受众分析-年龄', order: 4, icon: 'calendar' },
      { name: '人群包分析', order: 5, icon: 'group' }
    ];

    db.field_mappings.updateOne(
      { _id: config._id },
      {
        $set: {
          mappings: updatedMappings,
          categories: categories,
          updatedAt: new Date(),
          version: '1.3'
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
