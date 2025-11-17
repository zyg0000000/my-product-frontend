/**
 * @file syncAgencyRebateToTalent.js
 * @version 1.0.0
 * @description 云函数：同步机构返点到指定达人
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-17
 * - 初始版本
 * - 从机构的当前平台配置同步返点率到达人
 * - 支持切换达人的返点模式（sync/independent）
 * - 在 rebate_configs 集合创建新的返点配置记录
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const AGENCIES_COLLECTION = 'agencies';
const TALENTS_COLLECTION = 'talents';
const REBATE_CONFIGS_COLLECTION = 'rebate_configs';

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
 * 生成配置ID
 */
function generateConfigId() {
  return `rebate_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 同步机构返点到达人
 */
async function syncAgencyRebateToTalent(params) {
  const { oneId, platform, changeMode, createdBy } = params;

  if (!oneId || !platform) {
    throw new Error('缺少必要参数: oneId, platform');
  }

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  // 查询达人
  const talent = await talentsCollection.findOne({ oneId, platform });
  if (!talent) {
    throw new Error(`达人不存在: oneId=${oneId}, platform=${platform}`);
  }

  const agencyId = talent.agencyId;
  if (!agencyId || agencyId === 'individual') {
    throw new Error('该达人不属于任何机构，无法同步机构返点');
  }

  // 查询机构
  const agency = await agenciesCollection.findOne({ id: agencyId });
  if (!agency) {
    throw new Error(`机构不存在: agencyId=${agencyId}`);
  }

  // 查询机构在该平台的当前 active 返点配置
  const agencyConfig = await rebateConfigsCollection.findOne({
    targetType: 'agency',
    targetId: agencyId,
    platform: platform,
    status: 'active'
  });

  if (!agencyConfig) {
    throw new Error(`机构在${platform}平台暂未配置返点率`);
  }

  const agencyRebateRate = agencyConfig.rebateRate;
  const now = new Date();

  // 同步时总是将 rebateMode 设置为 'sync'
  await talentsCollection.updateOne(
    { oneId, platform },
    { $set: { rebateMode: 'sync' } }
  );

  // 将达人在该平台的旧 active 配置标记为 expired
  const oldTalentConfig = await rebateConfigsCollection.findOne({
    targetType: 'talent',
    targetId: oneId,
    platform: platform,
    status: 'active'
  });

  if (oldTalentConfig) {
    await rebateConfigsCollection.updateOne(
      { _id: oldTalentConfig._id },
      {
        $set: {
          status: 'expired',
          expiryDate: now,
          updatedAt: now
        }
      }
    );
  }

  // 创建新的达人返点配置记录
  const talentConfigId = generateConfigId();
  const talentConfigData = {
    configId: talentConfigId,
    targetType: 'talent',
    targetId: oneId,
    platform: platform,
    rebateRate: agencyRebateRate,
    effectType: 'immediate',
    effectiveDate: now,
    expiryDate: null,
    status: 'active',
    createdBy: createdBy || 'system',
    createdAt: now,
    metadata: {
      syncedFromAgency: true,
      agencyId: agencyId,
      agencyName: agency.name,
      talentName: talent.name
    }
  };

  await rebateConfigsCollection.insertOne(talentConfigData);

  // 更新达人的 currentRebate
  await talentsCollection.updateOne(
    { oneId, platform },
    {
      $set: {
        'currentRebate.rate': agencyRebateRate,
        'currentRebate.source': 'agency_sync',
        'currentRebate.effectiveDate': now.toISOString().split('T')[0],
        'currentRebate.lastUpdated': now,
        'lastRebateSyncAt': now.toISOString()
      }
    }
  );

  return {
    configId: talentConfigId,
    message: `已成功从机构 "${agency.name}" 同步${platform}平台返点率`,
    syncedRate: agencyRebateRate,
    effectiveDate: now.toISOString(),
    previousRate: oldTalentConfig ? oldTalentConfig.rebateRate : null
  };
}

/**
 * 主处理函数
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // 解析请求体
    let params = {};
    if (event.body) {
      try {
        params = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: '请求体格式错误'
          })
        };
      }
    }

    // 验证必需参数
    const { oneId, platform } = params;
    if (!oneId || !platform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '缺少必需参数: oneId, platform'
        })
      };
    }

    // 同步返点
    const result = await syncAgencyRebateToTalent(params);

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
    console.error('[ERROR] 同步机构返点失败:', error.message);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: error.message.includes('不存在') || error.message.includes('无法同步') ? 404 : 400,
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
