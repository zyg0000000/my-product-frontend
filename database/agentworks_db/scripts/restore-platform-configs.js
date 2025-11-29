/**
 * @file restore-platform-configs.js
 * @description 恢复平台配置数据（抖音、小红书）
 * @database agentworks_db
 * @collection system_config (NOT platform_configs!)
 *
 * @version 1.1.0
 * @date 2025-11-26
 *
 * 重要说明:
 * - 平台配置存储在 system_config 集合中（不是 platform_configs）
 * - 文档通过 configType: 'platform' 标识为平台配置
 *
 * 运行方式:
 * mongosh "mongodb://localhost:27017/agentworks_db" restore-platform-configs.js
 */

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🔄 恢复平台配置数据');
print('📦 目标集合: system_config');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

// 抖音平台完整配置
const douyinConfig = {
  configType: 'platform',
  platform: 'douyin',
  name: '抖音',
  enabled: true,
  color: 'blue',
  order: 1,
  accountId: {
    label: '星图ID',
    placeholder: '请输入星图ID',
    helpText: '星图ID是抖音平台的唯一标识，可在星图后台查看'
  },
  priceTypes: [
    {
      key: 'video_60plus',
      label: '60s+',
      required: true,
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      order: 1
    },
    {
      key: 'video_21_60',
      label: '21-60s',
      required: true,
      bgColor: '#e0e7ff',
      textColor: '#4338ca',
      order: 2
    },
    {
      key: 'video_1_20',
      label: '1-20s',
      required: true,
      bgColor: '#ddd6fe',
      textColor: '#6b21a8',
      order: 3
    }
  ],
  // specificFields: 平台特定字段（不含主账号ID）
  specificFields: {
    uid: {
      label: '抖音UID',
      type: 'string',
      required: false
    }
  },
  link: {
    template: 'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/{id}',
    idField: 'platformAccountId'  // 使用 platformAccountId（即星图ID）
  },
  business: {
    fee: 0.05,
    defaultRebate: 15,
    minRebate: 0,
    maxRebate: 100
  },
  features: {
    priceManagement: true,
    performanceTracking: true,
    rebateManagement: true,
    dataImport: true
  },
  talentTiers: [
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
  createdBy: 'system',
  version: 2,
  updatedAt: new Date()
};

// 小红书平台完整配置
const xiaohongshuConfig = {
  configType: 'platform',
  platform: 'xiaohongshu',
  name: '小红书',
  enabled: true,
  color: 'red',
  order: 2,
  accountId: {
    label: '主要ID',
    placeholder: '请输入蒲公英ID 或 小红书ID',
    helpText: '可以是蒲公英ID或小红书ID'
  },
  priceTypes: [
    {
      key: 'video',
      label: '视频笔记',
      required: true,
      bgColor: '#fce7f3',
      textColor: '#9f1239',
      order: 1
    },
    {
      key: 'image',
      label: '图文笔记',
      required: true,
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      order: 2
    }
  ],
  specificFields: {},
  link: null,
  business: {
    fee: 0.1,
    defaultRebate: 15,
    minRebate: 0,
    maxRebate: 100
  },
  features: {
    priceManagement: true,
    performanceTracking: true,
    rebateManagement: true,
    dataImport: true
  },
  talentTiers: [],
  createdBy: 'system',
  version: 2,
  updatedAt: new Date()
};

// 恢复抖音配置到 system_config 集合
print('📦 恢复抖音平台配置到 system_config...');
const douyinResult = db.system_config.updateOne(
  { configType: 'platform', platform: 'douyin' },
  { $set: douyinConfig },
  { upsert: true }
);
print(`   匹配: ${douyinResult.matchedCount}, 更新: ${douyinResult.modifiedCount}, 新增: ${douyinResult.upsertedCount}`);

// 恢复小红书配置到 system_config 集合
print('📦 恢复小红书平台配置到 system_config...');
const xhsResult = db.system_config.updateOne(
  { configType: 'platform', platform: 'xiaohongshu' },
  { $set: xiaohongshuConfig },
  { upsert: true }
);
print(`   匹配: ${xhsResult.matchedCount}, 更新: ${xhsResult.modifiedCount}, 新增: ${xhsResult.upsertedCount}`);

// 验证
print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🔍 验证恢复结果 (system_config 集合)');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const configs = db.system_config.find({ configType: 'platform' }).toArray();
configs.forEach(config => {
  print(`📌 ${config.name} (${config.platform})`);
  print(`   - 价格类型: ${config.priceTypes?.length || 0} 个`);
  print(`   - 达人等级: ${config.talentTiers?.length || 0} 个`);
  print(`   - specificFields: ${Object.keys(config.specificFields || {}).length} 个`);
  print(`   - 外链配置: ${config.link ? '已配置' : '未配置'}`);
  print('');
});

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('✅ 平台配置恢复完成！');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

print('📖 下一步：');
print('  1. 清除前端缓存：localStorage.removeItem("agentworks_platform_configs")');
print('  2. 刷新页面重新加载配置');
