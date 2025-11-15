/**
 * @file getTalentRebate.js
 * @version 1.0.0
 * @description 云函数：获取达人返点配置
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-15
 * - 初始版本
 * - 支持获取野生达人返点配置
 * - 返点率精度：小数点后2位
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const TALENTS_COLLECTION = 'talents';

// 默认返点率
const DEFAULT_REBATE_RATE = 10.00;

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
 * 获取达人返点配置
 */
async function getTalentRebate(oneId, platform) {
  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  // 查询达人
  const talent = await talentsCollection.findOne({ oneId, platform });

  if (!talent) {
    throw new Error(`达人不存在: oneId=${oneId}, platform=${platform}`);
  }

  // 返回返点配置
  return {
    oneId: talent.oneId,
    platform: talent.platform,
    name: talent.name,
    belongType: talent.belongType || 'wild',  // 默认为野生达人
    agencyId: talent.agencyId || null,
    currentRebate: talent.currentRebate || {
      rate: DEFAULT_REBATE_RATE,
      source: 'default',
      effectiveDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString()
    }
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

    // 验证参数
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

    // 获取返点配置
    const rebateConfig = await getTalentRebate(oneId, platform);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: rebateConfig,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[ERROR] 获取返点配置失败:', error.message);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: error.message.includes('不存在') ? 404 : 500,
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
