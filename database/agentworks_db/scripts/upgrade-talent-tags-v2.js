/**
 * 标签配置升级脚本 (upgrade-talent-tags-v2.js)
 *
 * 功能：将 v1 标签配置（使用 color）升级到 v2（使用 bgColor + textColor）
 * 执行方式：
 * mongosh "mongodb://root:64223902Kz@mongoreplica6a8259b198d70.mongodb.cn-shanghai.volces.com:3717,mongoreplica6a8259b198d71.mongodb.cn-shanghai.volces.com:3717/?authSource=admin&replicaSet=rs-mongo-replica-6a8259b198d7&retryWrites=true" --file scripts/upgrade-talent-tags-v2.js
 */

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

// Ant Design 预设颜色到自定义颜色的映射
const COLOR_MAP = {
  red: { bgColor: '#fee2e2', textColor: '#dc2626' },
  volcano: { bgColor: '#fff1e6', textColor: '#d4380d' },
  orange: { bgColor: '#ffedd5', textColor: '#ea580c' },
  gold: { bgColor: '#fef9c3', textColor: '#ca8a04' },
  lime: { bgColor: '#ecfccb', textColor: '#65a30d' },
  green: { bgColor: '#dcfce7', textColor: '#16a34a' },
  cyan: { bgColor: '#cffafe', textColor: '#0891b2' },
  blue: { bgColor: '#dbeafe', textColor: '#2563eb' },
  geekblue: { bgColor: '#e0e7ff', textColor: '#4f46e5' },
  purple: { bgColor: '#f3e8ff', textColor: '#9333ea' },
  magenta: { bgColor: '#fce7f3', textColor: '#db2777' },
  gray: { bgColor: '#f3f4f6', textColor: '#6b7280' },
  default: { bgColor: '#f3f4f6', textColor: '#6b7280' },
};

// 转换单个标签项
function convertTagItem(item) {
  // 如果已经有 bgColor 和 textColor，跳过
  if (item.bgColor && item.textColor) {
    return item;
  }

  const colorMapping = COLOR_MAP[item.color] || COLOR_MAP.default;
  const result = {
    key: item.key,
    name: item.name,
    bgColor: colorMapping.bgColor,
    textColor: colorMapping.textColor,
    sortOrder: item.sortOrder,
  };

  if (item.description) {
    result.description = item.description;
  }

  return result;
}

print('🚀 开始升级标签配置到 v2...\n');

// 获取当前配置
const config = db.system_config.findOne({ configType: 'talent_tags' });

if (!config) {
  print('❌ 未找到标签配置，请先运行 init-talent-tags.js');
  quit(1);
}

// 检查版本
if (config.version === 2) {
  print('✅ 标签配置已是 v2 版本，无需升级');
  quit(0);
}

print('📋 当前版本: v' + (config.version || 1));
print('   重要程度等级: ' + (config.importanceLevels ? config.importanceLevels.length : 0) + ' 个');
print('   业务标签: ' + (config.businessTags ? config.businessTags.length : 0) + ' 个');

// 转换配置 - 使用 for 循环
const updatedImportanceLevels = [];
if (config.importanceLevels) {
  for (let i = 0; i < config.importanceLevels.length; i++) {
    updatedImportanceLevels.push(convertTagItem(config.importanceLevels[i]));
  }
}

const updatedBusinessTags = [];
if (config.businessTags) {
  for (let i = 0; i < config.businessTags.length; i++) {
    updatedBusinessTags.push(convertTagItem(config.businessTags[i]));
  }
}

// 更新数据库
const result = db.system_config.updateOne(
  { configType: 'talent_tags' },
  {
    $set: {
      importanceLevels: updatedImportanceLevels,
      businessTags: updatedBusinessTags,
      version: 2,
      updatedAt: new Date(),
      updatedBy: 'system_upgrade',
    },
  }
);

if (result.modifiedCount === 1) {
  print('\n✅ 标签配置升级成功！');
  print('   版本: v1 → v2');

  print('\n📋 升级后的重要程度等级:');
  for (let i = 0; i < updatedImportanceLevels.length; i++) {
    const level = updatedImportanceLevels[i];
    print('   ' + (i + 1) + '. ' + level.name + ' (' + level.key + ')');
    print('      背景色: ' + level.bgColor + ', 文字色: ' + level.textColor);
  }

  print('\n📋 升级后的业务标签:');
  for (let i = 0; i < updatedBusinessTags.length; i++) {
    const tag = updatedBusinessTags[i];
    print('   ' + (i + 1) + '. ' + tag.name + ' (' + tag.key + ')');
    print('      背景色: ' + tag.bgColor + ', 文字色: ' + tag.textColor);
  }
} else {
  print('\n❌ 标签配置升级失败');
  print('   匹配数: ' + result.matchedCount);
  print('   修改数: ' + result.modifiedCount);
}
