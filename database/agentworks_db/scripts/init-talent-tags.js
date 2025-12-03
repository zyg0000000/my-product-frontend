/**
 * 标签配置初始化脚本 (init-talent-tags.js)
 *
 * 版本: v2.0
 * 更新: 支持自定义颜色 (bgColor + textColor)
 *
 * 功能：初始化达人标签配置到 system_config 集合
 * 执行方式：
 * mongosh "mongodb://root:64223902Kz@mongoreplica6a8259b198d70.mongodb.cn-shanghai.volces.com:3717,mongoreplica6a8259b198d71.mongodb.cn-shanghai.volces.com:3717/?authSource=admin&replicaSet=rs-mongo-replica-6a8259b198d7&retryWrites=true" --file scripts/init-talent-tags.js
 */

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

// 标签配置数据 (v2.0: 使用 bgColor + textColor)
const talentTagsConfig = {
  configType: 'talent_tags',

  // 重要程度配置（5级，单选）
  importanceLevels: [
    {
      key: 'core',
      name: '核心',
      bgColor: '#fee2e2',
      textColor: '#dc2626',
      sortOrder: 1,
      description: '必须维护的核心达人，不可替代',
    },
    {
      key: 'key',
      name: '重点',
      bgColor: '#ffedd5',
      textColor: '#ea580c',
      sortOrder: 2,
      description: '重点关注的优质达人',
    },
    {
      key: 'normal',
      name: '常规',
      bgColor: '#dbeafe',
      textColor: '#2563eb',
      sortOrder: 3,
      description: '正常合作的达人',
    },
    {
      key: 'backup',
      name: '备选',
      bgColor: '#cffafe',
      textColor: '#0891b2',
      sortOrder: 4,
      description: '可替代的备选达人',
    },
    {
      key: 'observe',
      name: '观察',
      bgColor: '#f3f4f6',
      textColor: '#6b7280',
      sortOrder: 5,
      description: '观察期/待评估达人',
    },
  ],

  // 业务标签配置（多选）
  businessTags: [
    { key: 'long_term', name: '长期合作', bgColor: '#dcfce7', textColor: '#16a34a', sortOrder: 1 },
    { key: 'new_talent', name: '新晋达人', bgColor: '#f3e8ff', textColor: '#9333ea', sortOrder: 2 },
    { key: 'testing', name: '测试中', bgColor: '#ffedd5', textColor: '#ea580c', sortOrder: 3 },
    { key: 'paused', name: '暂停合作', bgColor: '#fee2e2', textColor: '#dc2626', sortOrder: 4 },
    { key: 'price_sensitive', name: '价格敏感', bgColor: '#fef3c7', textColor: '#d97706', sortOrder: 5 },
    { key: 'fast_response', name: '响应快', bgColor: '#ecfccb', textColor: '#65a30d', sortOrder: 6 },
    { key: 'high_quality', name: '内容质量高', bgColor: '#fef9c3', textColor: '#ca8a04', sortOrder: 7 },
    { key: 'cooperative', name: '配合度高', bgColor: '#cffafe', textColor: '#0891b2', sortOrder: 8 },
    { key: 'busy_schedule', name: '档期紧张', bgColor: '#fce7f3', textColor: '#db2777', sortOrder: 9 },
  ],

  version: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  updatedBy: 'system',
};

// 检查是否已存在配置
const existing = db.system_config.findOne({ configType: 'talent_tags' });

if (existing) {
  print('⚠️  标签配置已存在，跳过初始化');
  print('   如需重新初始化，请先删除现有配置：');
  print(
    "   db.system_config.deleteOne({ configType: 'talent_tags' })"
  );
} else {
  // 插入配置
  const result = db.system_config.insertOne(talentTagsConfig);

  if (result.acknowledged) {
    print('✅ 标签配置初始化成功！');
    print(`   插入 ID: ${result.insertedId}`);
    print(
      `   重要程度等级: ${talentTagsConfig.importanceLevels.length} 个`
    );
    print(`   业务标签: ${talentTagsConfig.businessTags.length} 个`);
  } else {
    print('❌ 标签配置初始化失败');
  }
}

// 创建索引
print('\n📊 检查索引...');
db.system_config.createIndex(
  { configType: 1 },
  { unique: true, name: 'idx_configType_unique' }
);
print('✅ 索引创建/更新完成');

// 验证结果
print('\n📋 当前标签配置:');
const config = db.system_config.findOne({ configType: 'talent_tags' });
if (config) {
  print(`   版本: v${config.version || 1}`);
  print(`   重要程度等级: ${config.importanceLevels?.length || 0} 个`);
  config.importanceLevels?.forEach((level, i) => {
    print(`     ${i + 1}. ${level.name} (${level.key}) - bg:${level.bgColor} text:${level.textColor}`);
  });
  print(`   业务标签: ${config.businessTags?.length || 0} 个`);
  config.businessTags?.forEach((tag, i) => {
    print(`     ${i + 1}. ${tag.name} (${tag.key}) - bg:${tag.bgColor} text:${tag.textColor}`);
  });
}
