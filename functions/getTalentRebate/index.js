/**
 * @file getTalentRebate.js
 * @version 2.1.0
 * @description 云函数：获取达人返点配置
 *
 * --- 更新日志 ---
 * [v2.1.0] 2025-12-14
 * - 新增 customerId 可选参数，支持获取客户级返点
 * - 新增 effectiveRebate 字段，返回综合优先级后的最终返点
 * - 优先级：客户返点 > 达人/机构返点 > 默认返点
 *
 * [v2.0.0] 2025-11-17
 * - 新增返回 rebateMode 字段（sync/independent）
 * - 新增返回 agencyName 字段
 * - 机构达人默认使用 sync 模式
 *
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
const AGENCIES_COLLECTION = 'agencies';
const CUSTOMER_TALENTS_COLLECTION = 'customer_talents';

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
 * @param {string} oneId - 达人统一ID
 * @param {string} platform - 平台
 * @param {string|undefined} customerId - 可选，客户编码（传入时会考虑客户级返点）
 */
async function getTalentRebate(oneId, platform, customerId = null) {
  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const customerTalentsCollection = db.collection(CUSTOMER_TALENTS_COLLECTION);

  // 查询达人
  const talent = await talentsCollection.findOne({ oneId, platform });

  if (!talent) {
    throw new Error(`达人不存在: oneId=${oneId}, platform=${platform}`);
  }

  const agencyId = talent.agencyId || 'individual';
  const isAgencyTalent = agencyId !== 'individual';

  // 获取机构信息
  let agencyName = '野生达人';
  let agencyRebateRate = null;
  if (isAgencyTalent) {
    const agency = await agenciesCollection.findOne({ id: agencyId });
    agencyName = agency ? agency.name : agencyId;
    // 获取机构返点（如果达人是 sync 模式）
    if (agency?.rebateConfig?.platforms?.[platform]?.baseRebate !== undefined) {
      agencyRebateRate = agency.rebateConfig.platforms[platform].baseRebate;
    }
  }

  // 确定返点模式：野生达人永远是 independent，机构达人默认是 sync
  const rebateMode = isAgencyTalent
    ? (talent.rebateMode || 'sync')
    : 'independent';

  // 构建基础返点配置
  let currentRebate = talent.currentRebate || {
    rate: DEFAULT_REBATE_RATE,
    source: 'default',
    effectiveDate: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString()
  };

  // 如果是机构达人且模式为 sync，使用机构返点
  if (isAgencyTalent && rebateMode === 'sync' && agencyRebateRate !== null) {
    currentRebate = {
      ...currentRebate,
      rate: agencyRebateRate,
      source: 'agency'
    };
  }

  // 基础返回结构
  const result = {
    oneId: talent.oneId,
    platform: talent.platform,
    name: talent.name,
    agencyId: agencyId,
    agencyName: agencyName,
    rebateMode: rebateMode,
    currentRebate: currentRebate
  };

  // 如果传入了 customerId，查询客户级返点
  if (customerId) {
    const customerTalent = await customerTalentsCollection.findOne({
      customerId,
      talentOneId: oneId,
      platform,
      status: 'active'
    });

    const customerRebate = customerTalent?.customerRebate ?? null;

    // 添加客户返点信息到返回结果
    result.customerRebate = customerRebate;

    // 计算生效返点（优先级：客户 > 达人/机构 > 默认）
    if (customerRebate?.enabled && customerRebate?.rate !== undefined) {
      result.effectiveRebate = {
        rate: customerRebate.rate,
        source: 'customer'
      };
    } else {
      result.effectiveRebate = {
        rate: currentRebate.rate,
        source: currentRebate.source
      };
    }
  } else {
    // 没有 customerId 时，effectiveRebate 就是 currentRebate
    result.effectiveRebate = {
      rate: currentRebate.rate,
      source: currentRebate.source
    };
  }

  return result;
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
    const { oneId, platform, customerId } = params;

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

    // 获取返点配置（customerId 为可选参数）
    const rebateConfig = await getTalentRebate(oneId, platform, customerId || null);

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
