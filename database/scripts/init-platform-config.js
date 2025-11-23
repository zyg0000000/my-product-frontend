/**
 * 平台配置初始化脚本
 *
 * @version 1.0.0
 * @description 在 MongoDB 中创建 system_config 集合并初始化4个平台的配置数据
 *
 * 使用方法：
 * cd database/scripts && npm install && node init-platform-config.js
 *
 * 环境变量：
 * MONGO_URI - MongoDB 连接字符串
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-23
 * - 初始版本
 * - 支持4个平台配置初始化（抖音、小红书、B站、快手）
 * - 自动创建唯一索引和查询索引
 * - 幂等性设计（可安全重复执行）
 * - 完整的日志记录
 */

// 加载环境变量
require('dotenv').config({ path: '../../.env' });

const { MongoClient } = require('mongodb');

// MongoDB 配置
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'agentworks_db';
const COLLECTION_NAME = 'system_config';

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

    specificFields: {
      xingtuId: {
        label: '星图ID',
        type: 'string',
        required: false
      },
      uid: {
        label: '抖音UID',
        type: 'string',
        required: false
      }
    },

    link: {
      template: 'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/{id}',
      idField: 'xingtuId'
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

async function initPlatformConfigs() {
  let client;

  try {
    console.log('[INFO] 开始连接 MongoDB...');
    console.log('[INFO] 数据库:', DB_NAME);
    console.log('[INFO] 集合:', COLLECTION_NAME);

    // 连接数据库
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('[SUCCESS] MongoDB 连接成功');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // 创建索引
    console.log('\n[INFO] 创建索引...');
    await collection.createIndex(
      { configType: 1, platform: 1 },
      { unique: true }
    );
    await collection.createIndex(
      { enabled: 1, order: 1 }
    );
    console.log('[SUCCESS] 索引创建成功');

    // 初始化配置数据
    console.log('\n[INFO] 初始化平台配置数据...');

    for (const config of platformConfigs) {
      const { platform } = config;

      // 检查是否已存在
      const existing = await collection.findOne({
        configType: 'platform',
        platform: platform
      });

      if (existing) {
        console.log(`[INFO] 平台 "${config.name}" (${platform}) 配置已存在，跳过`);
        continue;
      }

      // 插入配置
      await collection.insertOne(config);
      console.log(`[SUCCESS] 平台 "${config.name}" (${platform}) 配置已创建`);
    }

    // 输出统计信息
    console.log('\n[INFO] 初始化完成统计:');
    const totalCount = await collection.countDocuments({ configType: 'platform' });
    const enabledCount = await collection.countDocuments({ configType: 'platform', enabled: true });
    console.log(`- 总平台数: ${totalCount}`);
    console.log(`- 已启用: ${enabledCount}`);
    console.log(`- 未启用: ${totalCount - enabledCount}`);

    // 显示所有配置
    console.log('\n[INFO] 当前平台配置列表:');
    const allConfigs = await collection
      .find({ configType: 'platform' })
      .sort({ order: 1 })
      .toArray();

    allConfigs.forEach(config => {
      const status = config.enabled ? '✓ 启用' : '✗ 禁用';
      const priceTypesCount = config.priceTypes?.length || 0;
      console.log(`  ${config.order}. ${config.name} (${config.platform}) - ${status} - ${priceTypesCount}个价格类型`);
    });

    console.log('\n[SUCCESS] 平台配置初始化全部完成！');

  } catch (error) {
    console.error('\n[ERROR] 初始化失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);

  } finally {
    if (client) {
      await client.close();
      console.log('\n[INFO] MongoDB 连接已关闭');
    }
  }
}

// 执行初始化
if (require.main === module) {
  initPlatformConfigs()
    .then(() => {
      console.log('\n✨ 初始化脚本执行成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 初始化脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initPlatformConfigs };
