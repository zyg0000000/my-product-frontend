/**
 * @file getTalentStats.js
 * @version 1.0.0
 * @description 云函数：获取达人统计数据（v1/v2 双版本支持）
 *
 * --- 功能说明 ---
 * - 提供高性能的达人统计数据，一次性返回多维度统计
 * - 使用 MongoDB Aggregation Pipeline ($facet) 进行服务端聚合计算
 * - 支持 v1（kol_data）和 v2（agentworks_db）双数据库版本
 *
 * --- v2 统计维度 ---
 * 1. 唯一达人数（按 oneId 去重）
 * 2. 各平台达人数（douyin、xiaohongshu、bilibili、kuaishou）
 * 3. 状态分布（active、inactive、archived）
 * 4. 等级分布（头部、腰部、尾部）
 * 5. 总记录数
 *
 * --- v1 统计维度 ---
 * 1. 总达人数
 * 2. 等级分布
 * 3. 状态分布
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-15
 * - 初始版本
 * - 支持 v1/v2 双版本架构
 * - 实现多维度统计
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const TALENTS_COLLECTION = 'talents';

let client;

/**
 * 连接数据库
 */
async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

/**
 * ========== v1 统计逻辑 ==========
 * 针对旧版本数据库（kol_data）
 */
async function getV1Stats(db) {
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  const pipeline = [
    {
      $facet: {
        // 总数统计
        totalCount: [
          { $count: 'count' }
        ],

        // 等级分布
        tierDistribution: [
          { $match: { talentTier: { $exists: true, $ne: null, $ne: '' } }},
          { $group: { _id: '$talentTier', count: { $sum: 1 } }},
          { $project: { _id: 0, tier: '$_id', count: 1 }}
        ],

        // 状态分布（v1 可能没有 status 字段，需要容错）
        statusDistribution: [
          { $match: { status: { $exists: true, $ne: null, $ne: '' } }},
          { $group: { _id: '$status', count: { $sum: 1 } }},
          { $project: { _id: 0, status: '$_id', count: 1 }}
        ]
      }
    }
  ];

  const result = await talentsCollection.aggregate(pipeline).toArray();
  const facetResult = result[0] || {};

  // 格式化返回数据
  const totalCount = facetResult.totalCount?.[0]?.count || 0;

  const tierStats = {};
  facetResult.tierDistribution?.forEach(item => {
    tierStats[item.tier] = item.count;
  });

  const statusStats = {};
  facetResult.statusDistribution?.forEach(item => {
    statusStats[item.status] = item.count;
  });

  return {
    totalTalents: totalCount,
    totalRecords: totalCount,
    tierStats,
    statusStats
  };
}

/**
 * ========== v2 统计逻辑 ==========
 * 针对新版本数据库（agentworks_db）
 * 支持多平台架构、oneId 去重统计
 */
async function getV2Stats(db) {
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  const pipeline = [
    {
      $facet: {
        // 总记录数
        totalRecords: [
          { $count: 'count' }
        ],

        // 唯一达人数（按 oneId 去重）
        uniqueTalents: [
          { $group: { _id: '$oneId' }},
          { $count: 'count' }
        ],

        // 平台分布
        platformDistribution: [
          { $group: { _id: '$platform', count: { $sum: 1 } }},
          { $project: { _id: 0, platform: '$_id', count: 1 }}
        ],

        // 状态分布
        statusDistribution: [
          { $match: { status: { $exists: true, $ne: null, $ne: '' } }},
          { $group: { _id: '$status', count: { $sum: 1 } }},
          { $project: { _id: 0, status: '$_id', count: 1 }}
        ],

        // 等级分布
        tierDistribution: [
          { $match: { talentTier: { $exists: true, $ne: null, $ne: '' } }},
          { $group: { _id: '$talentTier', count: { $sum: 1 } }},
          { $project: { _id: 0, tier: '$_id', count: 1 }}
        ],

        // 达人类型分布（可选，用于扩展）
        typeDistribution: [
          { $unwind: '$talentType' },
          { $group: { _id: '$talentType', count: { $sum: 1 } }},
          { $sort: { count: -1 }},
          { $limit: 10 },
          { $project: { _id: 0, type: '$_id', count: 1 }}
        ]
      }
    }
  ];

  const result = await talentsCollection.aggregate(pipeline).toArray();
  const facetResult = result[0] || {};

  // 格式化返回数据
  const totalRecords = facetResult.totalRecords?.[0]?.count || 0;
  const uniqueTalents = facetResult.uniqueTalents?.[0]?.count || 0;

  // 平台统计
  const platformStats = {
    douyin: 0,
    xiaohongshu: 0,
    bilibili: 0,
    kuaishou: 0
  };
  facetResult.platformDistribution?.forEach(item => {
    if (item.platform in platformStats) {
      platformStats[item.platform] = item.count;
    }
  });

  // 状态统计
  const statusStats = {};
  facetResult.statusDistribution?.forEach(item => {
    statusStats[item.status] = item.count;
  });

  // 等级统计
  const tierStats = {};
  facetResult.tierDistribution?.forEach(item => {
    tierStats[item.tier] = item.count;
  });

  // 类型统计（Top 10）
  const typeStats = [];
  facetResult.typeDistribution?.forEach(item => {
    typeStats.push({ type: item.type, count: item.count });
  });

  return {
    totalRecords,
    uniqueTalents,
    platformStats,
    statusStats,
    tierStats,
    typeStats
  };
}

/**
 * ========== 主处理函数 ==========
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 检查环境变量
    if (!MONGO_URI) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: '服务器数据库配置不完整'
        })
      };
    }

    // 获取查询参数
    const queryParams = event.queryStringParameters || {};
    const dbVersion = queryParams.dbVersion || 'v1';

    // 确定数据库名称
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 根据版本调用对应的统计函数
    let stats;
    if (dbVersion === 'v2') {
      stats = await getV2Stats(db);
    } else {
      stats = await getV1Stats(db);
    }

    // 返回统计结果
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dbVersion,
        data: stats,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('统计数据时发生错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: error.message
      })
    };
  }
};
