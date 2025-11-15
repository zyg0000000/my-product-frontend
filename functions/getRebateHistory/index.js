/**
 * @file getRebateHistory.js
 * @version 1.0.0
 * @description 云函数：获取返点配置历史记录
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-15
 * - 初始版本
 * - 支持分页查询返点历史
 * - 按时间倒序排列（最新的在前）
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const REBATE_CONFIGS_COLLECTION = 'rebate_configs';

// 默认分页参数
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
 * 获取返点历史记录
 */
async function getRebateHistory(oneId, platform, limit, offset) {
  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  // 构建查询条件
  const query = {
    targetType: 'talent',
    targetId: oneId,
    platform: platform
  };

  // 获取总数
  const total = await rebateConfigsCollection.countDocuments(query);

  // 获取历史记录（按创建时间倒序）
  const records = await rebateConfigsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  return {
    total,
    limit,
    offset,
    records: records.map(record => ({
      configId: record.configId,
      rebateRate: record.rebateRate,
      effectType: record.effectType,
      effectiveDate: record.effectiveDate,
      expiryDate: record.expiryDate,
      status: record.status,
      reason: record.reason,
      createdBy: record.createdBy,
      createdAt: record.createdAt
    }))
  };
}

/**
 * 主处理函数
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

    // 获取参数
    const params = event.queryStringParameters || {};
    const { oneId, platform } = params;

    // 分页参数
    let limit = parseInt(params.limit) || DEFAULT_LIMIT;
    let offset = parseInt(params.offset) || 0;

    // 验证必需参数
    if (!oneId || !platform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '缺少必需参数: oneId 和 platform'
        })
      };
    }

    // 验证分页参数
    if (limit < 1 || limit > MAX_LIMIT) {
      limit = DEFAULT_LIMIT;
    }
    if (offset < 0) {
      offset = 0;
    }

    // 获取历史记录
    const historyData = await getRebateHistory(oneId, platform, limit, offset);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: historyData,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[ERROR] 获取返点历史失败:', error.message);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message,
        ...(isProduction ? {} : {
          stack: error.stack
        })
      })
    };
  }
};
