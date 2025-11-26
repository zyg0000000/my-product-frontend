/**
 * talentPerformance - 达人表现数据 API
 * @version 1.0
 * @date 2025-11-26
 *
 * 说明: 提供 talent_performance 集合的查询接口
 *
 * 支持的 HTTP 方法:
 * - GET: 查询表现数据
 *   - /talent-performance?oneId=xxx&platform=douyin  单个达人最新数据
 *   - /talent-performance?oneIds=a,b,c&platform=douyin  批量查询最新数据
 *   - /talent-performance/history?oneId=xxx&platform=douyin&limit=30  历史数据
 * - POST: 写入表现数据（预留，主要通过飞书同步写入）
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const COLLECTION_NAME = 'talent_performance';

let client;

async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const { path } = event;
    const params = event.queryStringParameters || {};

    // 路由处理
    if (event.httpMethod === 'GET') {
      // 历史数据查询
      if (path && path.includes('/history')) {
        return await handleHistoryQuery(collection, params, headers);
      }

      // 批量查询最新数据
      if (params.oneIds) {
        return await handleBatchLatestQuery(collection, params, headers);
      }

      // 单个达人查询
      if (params.oneId) {
        return await handleSingleQuery(collection, params, headers);
      }

      // 列表查询（分页）
      return await handleListQuery(collection, params, headers);
    }

    if (event.httpMethod === 'POST') {
      return await handleCreate(collection, event.body, headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error in talentPerformance:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

/**
 * 查询单个达人的最新表现数据
 */
async function handleSingleQuery(collection, params, headers) {
  const { oneId, platform, snapshotType = 'daily' } = params;

  if (!oneId || !platform) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '缺少 oneId 或 platform 参数' })
    };
  }

  const data = await collection.findOne(
    { oneId, platform, snapshotType },
    { sort: { snapshotDate: -1 } }
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data })
  };
}

/**
 * 批量查询多个达人的最新表现数据
 */
async function handleBatchLatestQuery(collection, params, headers) {
  const { oneIds, platform, snapshotType = 'daily' } = params;

  if (!oneIds || !platform) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '缺少 oneIds 或 platform 参数' })
    };
  }

  const oneIdArray = oneIds.split(',').map(id => id.trim()).filter(Boolean);

  if (oneIdArray.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'oneIds 为空' })
    };
  }

  // 使用聚合查询获取每个达人的最新记录
  const pipeline = [
    {
      $match: {
        oneId: { $in: oneIdArray },
        platform,
        snapshotType
      }
    },
    {
      $sort: { snapshotDate: -1 }
    },
    {
      $group: {
        _id: '$oneId',
        latestRecord: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestRecord' }
    }
  ];

  const data = await collection.aggregate(pipeline).toArray();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data,
      count: data.length,
      requested: oneIdArray.length
    })
  };
}

/**
 * 查询达人的历史表现数据
 */
async function handleHistoryQuery(collection, params, headers) {
  const { oneId, platform, snapshotType = 'daily', limit = 30 } = params;

  if (!oneId || !platform) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '缺少 oneId 或 platform 参数' })
    };
  }

  const data = await collection
    .find({ oneId, platform, snapshotType })
    .sort({ snapshotDate: -1 })
    .limit(parseInt(limit, 10))
    .toArray();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data,
      count: data.length
    })
  };
}

/**
 * 列表查询（分页）
 */
async function handleListQuery(collection, params, headers) {
  const {
    platform,
    snapshotType = 'daily',
    snapshotDate,
    dateFrom,
    dateTo,
    dataSource,
    page = 1,
    pageSize = 20
  } = params;

  const query = {};

  if (platform) query.platform = platform;
  if (snapshotType) query.snapshotType = snapshotType;
  if (snapshotDate) query.snapshotDate = snapshotDate;
  if (dataSource) query.dataSource = dataSource;

  // 日期范围
  if (dateFrom || dateTo) {
    query.snapshotDate = {};
    if (dateFrom) query.snapshotDate.$gte = dateFrom;
    if (dateTo) query.snapshotDate.$lte = dateTo;
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
  const limit = parseInt(pageSize, 10);

  const [data, total] = await Promise.all([
    collection.find(query).sort({ snapshotDate: -1, oneId: 1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(query)
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data,
      pagination: {
        page: parseInt(page, 10),
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  };
}

/**
 * 创建表现数据记录（预留）
 */
async function handleCreate(collection, body, headers) {
  const data = JSON.parse(body || '{}');

  // 验证必需字段
  if (!data.oneId || !data.platform || !data.snapshotDate) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '缺少必需字段: oneId, platform, snapshotDate' })
    };
  }

  // 生成 snapshotId
  const dateStr = data.snapshotDate.replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  data.snapshotId = `perf_${data.oneId}_${data.platform}_${dateStr}_${random}`;

  // 设置默认值
  data.snapshotType = data.snapshotType || 'daily';
  data.dataSource = data.dataSource || 'manual';
  data.createdAt = new Date();
  data.updatedAt = new Date();

  // 使用 upsert 避免重复
  const result = await collection.updateOne(
    {
      oneId: data.oneId,
      platform: data.platform,
      snapshotType: data.snapshotType,
      snapshotDate: data.snapshotDate
    },
    {
      $set: data,
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        snapshotId: data.snapshotId,
        upsertedId: result.upsertedId,
        modifiedCount: result.modifiedCount
      }
    })
  };
}
