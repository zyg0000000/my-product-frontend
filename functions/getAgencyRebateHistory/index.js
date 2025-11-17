/**
 * @file getAgencyRebateHistory.js
 * @version 3.0.0
 * @description 云函数：获取机构返点调整历史记录
 *
 * --- 更新日志 ---
 * [v3.0.0] 2025-11-16
 * - 重大变更：支持按平台查询历史记录
 * - 必需参数：platform（douyin/kuaishou/xiaohongshu/bilibili）
 * - 返回指定平台的历史记录
 *
 * [v2.0.0] 2025-11-16
 * - 从统一的 rebate_configs 集合读取历史（targetType='agency'）
 * - 支持查询所有状态的配置记录（active, expired）
 *
 * [v1.0.0] 2025-11-16
 * - 初始版本
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const REBATE_CONFIGS_COLLECTION = 'rebate_configs';
const AGENCIES_COLLECTION = 'agencies';

// 支持的平台列表
const SUPPORTED_PLATFORMS = ['douyin', 'kuaishou', 'xiaohongshu', 'bilibili'];

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
 * 验证平台
 */
function validatePlatform(platform) {
  if (!platform) {
    throw new Error('平台参数（platform）为必填项');
  }

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`不支持的平台: ${platform}。支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`);
  }

  return platform;
}

/**
 * 获取机构返点历史记录（按平台）
 */
async function getAgencyRebateHistory(params) {
  const { agencyId, platform, limit = 20, offset = 0 } = params;

  if (!agencyId) {
    throw new Error('缺少必要参数: agencyId');
  }

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);

  // 验证平台
  const validatedPlatform = validatePlatform(platform);

  // 获取机构信息
  const agency = await agenciesCollection.findOne({ id: agencyId });
  if (!agency) {
    throw new Error(`机构不存在: agencyId=${agencyId}`);
  }

  // 查询该机构该平台的所有返点配置记录（包括 active 和 expired）
  const configs = await rebateConfigsCollection
    .find({
      targetType: 'agency',
      targetId: agencyId,
      platform: validatedPlatform
    })
    .sort({ createdAt: -1 }) // 按创建时间倒序
    .skip(offset)
    .limit(limit)
    .toArray();

  // 获取总记录数
  const total = await rebateConfigsCollection.countDocuments({
    targetType: 'agency',
    targetId: agencyId,
    platform: validatedPlatform
  });

  // 转换为前端需要的格式
  const records = configs.map(config => ({
    agencyId: config.targetId,
    agencyName: config.metadata?.agencyName || agency.name,
    platform: config.platform,
    previousRate: config.metadata?.previousRate || 0,
    newRate: config.rebateRate,
    effectiveDate: config.effectiveDate
      ? new Date(config.effectiveDate).toISOString().split('T')[0]
      : '-',
    updatedBy: config.createdBy || 'system',
    syncToTalents: config.metadata?.syncToTalents || false,
    createdAt: config.createdAt
      ? new Date(config.createdAt).toISOString()
      : new Date().toISOString()
  }));

  return {
    records,
    total,
    limit,
    offset,
    platform: validatedPlatform
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

    // 解析请求参数（GET 请求使用 queryStringParameters）
    const queryParams = event.queryStringParameters || {};
    const params = {
      agencyId: queryParams.agencyId,
      platform: queryParams.platform,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0
    };

    // 验证必需参数
    if (!params.agencyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '缺少必需参数: agencyId'
        })
      };
    }

    if (!params.platform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '缺少必需参数: platform'
        })
      };
    }

    // 查询历史记录
    const result = await getAgencyRebateHistory(params);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[ERROR] 获取机构返点历史失败:', error.message);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: error.message.includes('不存在') ? 404 : 400,
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
