/**
 * 达人等级配置迁移脚本 - MongoDB Shell 版本
 *
 * @version 1.0.0
 * @description 为现有平台配置添加 talentTiers 字段
 *
 * 使用方法（在 MongoDB Shell 中）：
 * use agentworks_db
 * load('/path/to/database/agentworks_db/scripts/migrate-talent-tiers.js')
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-26
 * - 初始版本
 * - 为所有平台添加统一的达人等级配置
 * - 幂等性设计（已有 talentTiers 的平台会跳过）
 */

// 使用当前数据库
const db = db.getSiblingDB('agentworks_db');
const collection = db.getCollection('system_config');

print('[INFO] 开始迁移达人等级配置...');
print('[INFO] 数据库: agentworks_db');
print('[INFO] 集合: system_config');
print('');

// 各平台的达人等级配置（不同平台可能有不同的命名）
const platformTalentTiers = {
  // 抖音：头部、腰部、尾部
  douyin: [
    {
      key: 'top',
      label: '头部',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      order: 1,
      isDefault: false
    },
    {
      key: 'middle',
      label: '腰部',
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      order: 2,
      isDefault: false
    },
    {
      key: 'tail',
      label: '尾部',
      bgColor: '#dcfce7',
      textColor: '#166534',
      order: 3,
      isDefault: true
    }
  ],
  // 小红书：暂时使用空数组，后续可单独配置
  xiaohongshu: [],
  // B站：暂时使用空数组，后续可单独配置
  bilibili: [],
  // 快手：暂时使用空数组，后续可单独配置
  kuaishou: []
};

// 查找所有平台配置
const platformConfigs = collection.find({ configType: 'platform' }).toArray();

print(`[INFO] 找到 ${platformConfigs.length} 个平台配置`);
print('');

let updatedCount = 0;
let skippedCount = 0;

platformConfigs.forEach(function(config) {
  // 检查是否已有 talentTiers
  if (config.talentTiers && config.talentTiers.length > 0) {
    print(`[INFO] 平台 "${config.name}" (${config.platform}) 已有达人等级配置，跳过`);
    skippedCount++;
  } else {
    // 获取该平台对应的达人等级配置
    const tiers = platformTalentTiers[config.platform] || [];

    // 添加 talentTiers 字段
    collection.updateOne(
      { _id: config._id },
      {
        $set: {
          talentTiers: tiers,
          updatedAt: new Date()
        },
        $inc: { version: 1 }
      }
    );
    print(`[SUCCESS] 平台 "${config.name}" (${config.platform}) 达人等级配置已添加 (${tiers.length}个等级)`);
    updatedCount++;
  }
});

print('');
print('[INFO] 迁移完成统计:');
print(`- 总平台数: ${platformConfigs.length}`);
print(`- 本次更新: ${updatedCount}`);
print(`- 跳过已存在: ${skippedCount}`);

print('');
print('[INFO] 当前平台达人等级配置:');
const allConfigs = collection.find({ configType: 'platform' }).sort({ order: 1 }).toArray();

allConfigs.forEach(function(config) {
  const tiersCount = config.talentTiers ? config.talentTiers.length : 0;
  const tiersLabels = config.talentTiers
    ? config.talentTiers.map(t => t.label).join(', ')
    : '无';
  print(`  ${config.order}. ${config.name} (${config.platform}) - ${tiersCount}个等级: ${tiersLabels}`);
});

print('');
print('[SUCCESS] 达人等级配置迁移全部完成！');
