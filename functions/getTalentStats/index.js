/**
 * @file getTalentStats.js
 * @version 1.0.1
 * @description 云函数：获取达人统计数据（v1/v2 双版本支持）
 *
 * --- 更新日志 ---
 * [v1.0.1] 2025-11-15
 * - 增加详细的调试日志
 * - 添加原始数据返回（debug 模式）
 * - 优化错误处理
 *
 * [v1.0.0] 2025-11-15
 * - 初始版本
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
 */
async function getV1Stats(db) {
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  const pipeline = [
    {
      $facet: {
        totalCount: [
          { $count: 'count' }
        ],
        tierDistribution: [
          { $match: { talentTier: { $exists: true, $ne: null, $ne: '' } }},
          { $group: { _id: '$talentTier', count: { $sum: 1 } }},
          { $project: { _id: 0, tier: '$_id', count: 1 }}
        ],
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
 */
async function getV2Stats(db, debug = false) {
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  // 【调试】先查询总数
  const totalCount = await talentsCollection.countDocuments();
  console.log(`[DEBUG] 数据库中总记录数: ${totalCount}`);

  // 【调试】查询前 3 条记录
  if (debug) {
    const sampleDocs = await talentsCollection.find().limit(3).toArray();
    console.log('[DEBUG] 示例文档:', JSON.stringify(sampleDocs, null, 2));
  }

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

        // 达人类型分布
        typeDistribution: [
          { $match: { talentType: { $exists: true, $ne: null } }},
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

  console.log('[DEBUG] Facet 原始结果:', JSON.stringify(facetResult, null, 2));

  // 格式化返回数据
  const totalRecords = facetResult.totalRecords?.[0]?.count || 0;
  const uniqueTalents = facetResult.uniqueTalents?.[0]?.count || 0;

  console.log(`[DEBUG] 格式化后 - totalRecords: ${totalRecords}, uniqueTalents: ${uniqueTalents}`);

  // 平台统计
  const platformStats = {
    douyin: 0,
    xiaohongshu: 0,
    bilibili: 0,
    kuaishou: 0
  };

  console.log('[DEBUG] platformDistribution:', facetResult.platformDistribution);

  facetResult.platformDistribution?.forEach(item => {
    console.log(`[DEBUG] 处理平台: ${item.platform}, 数量: ${item.count}`);
    if (item.platform in platformStats) {
      platformStats[item.platform] = item.count;
    }
  });

  console.log('[DEBUG] 最终 platformStats:', platformStats);

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

  const stats = {
    totalRecords,
    uniqueTalents,
    platformStats,
    statusStats,
    tierStats,
    typeStats
  };

  // 【调试模式】返回原始数据
  if (debug) {
    stats._debug = {
      rawFacetResult: facetResult,
      totalCountFromDB: totalCount
    };
  }

  return stats;
}

/**
 * ========== 主处理函数 ==========
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      console.error('[ERROR] MONGO_URI 环境变量未设置');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: '服务器数据库配置不完整'
        })
      };
    }

    // 【兼容性】从多个来源读取参数
    let params = {};

    // 1. 从查询参数读取（GET 请求）
    if (event.queryStringParameters) {
      params = { ...params, ...event.queryStringParameters };
    }

    // 2. 从请求体读取（POST 请求）
    if (event.body) {
      try {
        const bodyParams = JSON.parse(event.body);
        params = { ...params, ...bodyParams };
      } catch (e) {
        console.log('[WARN] 解析 body 失败:', e.message);
      }
    }

    const dbVersion = params.dbVersion || 'v2'; // 默认使用 v2
    const debug = params.debug === 'true' || params.debug === true;

    console.log(`[INFO] 请求参数 - dbVersion: ${dbVersion}, debug: ${debug}`);

    // 确定数据库名称
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';
    console.log(`[INFO] 使用数据库: ${DB_NAME}`);

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 【调试】列出所有集合
    if (debug) {
      const collections = await db.listCollections().toArray();
      console.log('[DEBUG] 数据库中的集合:', collections.map(c => c.name));
    }

    // 根据版本调用对应的统计函数
    let stats;
    if (dbVersion === 'v2') {
      stats = await getV2Stats(db, debug);
    } else {
      stats = await getV1Stats(db);
    }

    console.log('[INFO] 统计完成，返回结果');

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
    console.error('[ERROR] 统计数据时发生错误:', error);
    console.error('[ERROR] 错误堆栈:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: error.message,
        stack: error.stack
      })
    };
  }
};
