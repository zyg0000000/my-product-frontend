/**
 * 平台配置初始化脚本 - MongoDB Shell 版本
 *
 * @version 1.0.0
 * @description 在 MongoDB 中创建 system_config 集合并初始化4个平台的配置数据
 *
 * 使用方法（在 MongoDB Shell 中）：
 * use agentworks_db
 * load('/path/to/database/agentworks_db/scripts/init-platform-config.js')
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-23
 * - 初始版本
 * - 支持4个平台配置初始化（抖音、小红书、B站、快手）
 * - 自动创建唯一索引和查询索引
 * - 幂等性设计（可安全重复执行）
 * - 完整的日志记录
 */

// 使用当前数据库
const db = db.getSiblingDB('agentworks_db');
const collection = db.getCollection('system_config');

print('[INFO] 开始初始化平台配置...');
print('[INFO] 数据库: agentworks_db');
print('[INFO] 集合: system_config');
print('');

// 平台配置数据
const platformConfigs = [
  {
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

    // specificFields: 平台特定字段（不含主账号ID，主账号ID由 accountId 配置）
    specificFields: {
      uid: {
        label: '抖音UID',
        type: 'string',
        required: false
      }
    },

    // links: 外链配置列表（支持多个外链）
    links: [
      {
        name: '星图主页',
        label: '星图',
        template: 'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/{id}',
        idField: 'platformAccountId'  // 使用 platformAccountId（即星图ID）
      }
    ],
    // link: 已废弃，保留用于向后兼容
    link: null,

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

    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
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

    // links: 外链配置列表
    links: [],
    link: null,

    business: {
      fee: 0.10,
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

    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    configType: 'platform',
    platform: 'bilibili',
    name: 'B站',
    enabled: true,
    color: 'pink',
    order: 3,

    accountId: {
      label: 'B站UID',
      placeholder: '请输入B站UID',
      helpText: 'B站用户的唯一标识'
    },

    priceTypes: [],

    specificFields: {},

    // links: 外链配置列表
    links: [],
    link: null,

    business: {
      fee: null,
      defaultRebate: 15,
      minRebate: 0,
      maxRebate: 100
    },

    features: {
      priceManagement: false,
      performanceTracking: false,
      rebateManagement: true,
      dataImport: true
    },

    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  },
  {
    configType: 'platform',
    platform: 'kuaishou',
    name: '快手',
    enabled: true,
    color: 'orange',
    order: 4,

    accountId: {
      label: '快手ID',
      placeholder: '请输入快手ID',
      helpText: '快手平台的用户标识'
    },

    priceTypes: [],

    specificFields: {},

    // links: 外链配置列表
    links: [],
    link: null,

    business: {
      fee: null,
      defaultRebate: 15,
      minRebate: 0,
      maxRebate: 100
    },

    features: {
      priceManagement: false,
      performanceTracking: false,
      rebateManagement: true,
      dataImport: true
    },

    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    version: 1
  }
];

// 创建索引
print('[INFO] 创建索引...');
try {
  collection.createIndex(
    { configType: 1, platform: 1 },
    { unique: true, name: 'config_platform_unique' }
  );
  collection.createIndex(
    { enabled: 1, order: 1 },
    { name: 'enabled_order_idx' }
  );
  print('[SUCCESS] 索引创建成功');
  print('');
} catch (e) {
  if (e.codeName === 'IndexOptionsConflict' || e.code === 85) {
    print('[INFO] 索引已存在，跳过创建');
    print('');
  } else {
    print('[ERROR] 索引创建失败:', e.message);
    throw e;
  }
}

// 初始化配置数据
print('[INFO] 初始化平台配置数据...');
let createdCount = 0;
let skippedCount = 0;

platformConfigs.forEach(function(config) {
  const existing = collection.findOne({
    configType: 'platform',
    platform: config.platform
  });

  if (existing) {
    print(`[INFO] 平台 "${config.name}" (${config.platform}) 配置已存在，跳过`);
    skippedCount++;
  } else {
    collection.insertOne(config);
    print(`[SUCCESS] 平台 "${config.name}" (${config.platform}) 配置已创建`);
    createdCount++;
  }
});

print('');
print('[INFO] 初始化完成统计:');
const totalCount = collection.countDocuments({ configType: 'platform' });
const enabledCount = collection.countDocuments({ configType: 'platform', enabled: true });
print(`- 总平台数: ${totalCount}`);
print(`- 已启用: ${enabledCount}`);
print(`- 未启用: ${totalCount - enabledCount}`);
print(`- 本次创建: ${createdCount}`);
print(`- 跳过已存在: ${skippedCount}`);

print('');
print('[INFO] 当前平台配置列表:');
const allConfigs = collection.find({ configType: 'platform' }).sort({ order: 1 }).toArray();

allConfigs.forEach(function(config) {
  const status = config.enabled ? '✓ 启用' : '✗ 禁用';
  const priceTypesCount = config.priceTypes ? config.priceTypes.length : 0;
  print(`  ${config.order}. ${config.name} (${config.platform}) - ${status} - ${priceTypesCount}个价格类型`);
});

print('');
print('[SUCCESS] 平台配置初始化全部完成！');
