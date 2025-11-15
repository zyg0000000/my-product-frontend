/**
 * @file updateTalentRebate.js
 * @version 1.0.0
 * @description 云函数：更新达人返点配置
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-15
 * - 初始版本
 * - 支持手动调整野生达人返点
 * - 支持立即生效和下次合作生效两种模式
 * - 返点率精度：小数点后2位
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
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
 * 验证返点率
 */
function validateRebateRate(rate) {
  const num = parseFloat(rate);

  if (isNaN(num)) {
    throw new Error('返点率必须是数字');
  }

  if (num < 0 || num > 100) {
    throw new Error('返点率必须在 0-100 之间');
  }

  // 检查小数位数
  const decimalPart = (rate.toString().split('.')[1] || '');
  if (decimalPart.length > 2) {
    throw new Error('返点率最多支持小数点后2位');
  }

  return parseFloat(num.toFixed(2));
}

/**
 * 生成配置ID
 */
function generateConfigId() {
  return `rebate_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 更新达人返点配置
 */
async function updateTalentRebate(params) {
  const { oneId, platform, rebateRate, effectType, effectiveDate, createdBy } = params;

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  // 验证返点率
  const validatedRate = validateRebateRate(rebateRate);

  // 查询达人是否存在
  const talent = await talentsCollection.findOne({ oneId, platform });
  if (!talent) {
    throw new Error(`达人不存在: oneId=${oneId}, platform=${platform}`);
  }

  // 确定生效日期
  const now = new Date();
  const finalEffectiveDate = effectiveDate || now.toISOString().split('T')[0];

  // 根据生效类型处理
  if (effectType === 'immediate') {
    // 立即生效：先将旧的 active 配置标记为 expired
    const oldActiveConfig = await rebateConfigsCollection.findOne({
      targetType: 'talent',
      targetId: oneId,
      platform,
      status: 'active'
    });

    if (oldActiveConfig) {
      // 将旧配置标记为 expired，设置失效日期为新配置的生效日期
      await rebateConfigsCollection.updateOne(
        { _id: oldActiveConfig._id },
        {
          $set: {
            status: 'expired',
            expiryDate: finalEffectiveDate,
            updatedAt: now
          }
        }
      );
    }

    // 创建新的返点配置记录
    const configId = generateConfigId();
    const configData = {
      configId,
      targetType: 'talent',
      targetId: oneId,
      platform,
      rebateRate: validatedRate,
      effectType,
      effectiveDate: finalEffectiveDate,
      expiryDate: null,
      status: 'active',
      createdBy: createdBy || 'system',
      createdAt: now
    };

    await rebateConfigsCollection.insertOne(configData);

    // 更新达人的当前返点
    await talentsCollection.updateOne(
      { oneId, platform },
      {
        $set: {
          'currentRebate.rate': validatedRate,
          'currentRebate.source': 'personal',
          'currentRebate.effectiveDate': finalEffectiveDate,
          'currentRebate.lastUpdated': now
        }
      }
    );

    return {
      configId,
      message: '返点率已立即更新',
      newRate: validatedRate,
      effectType: 'immediate',
      effectiveDate: finalEffectiveDate
    };
  } else {
    // 下次合作生效：创建待生效配置
    const configId = generateConfigId();
    const configData = {
      configId,
      targetType: 'talent',
      targetId: oneId,
      platform,
      rebateRate: validatedRate,
      effectType,
      effectiveDate: finalEffectiveDate,
      expiryDate: null,
      status: 'pending',
      createdBy: createdBy || 'system',
      createdAt: now
    };

    await rebateConfigsCollection.insertOne(configData);
    // 下次合作生效：创建待生效配置
    return {
      configId,
      message: '返点率将在下次合作时生效',
      newRate: validatedRate,
      effectType: 'next_cooperation',
      effectiveDate: finalEffectiveDate,
      status: 'pending'
    };
  }
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
    const { oneId, platform, rebateRate, effectType } = params;
    if (!oneId || !platform || rebateRate === undefined || !effectType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '缺少必需参数: oneId, platform, rebateRate, effectType'
        })
      };
    }

    // 验证 effectType
    if (!['immediate', 'next_cooperation'].includes(effectType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'effectType 必须是 immediate 或 next_cooperation'
        })
      };
    }

    // 更新返点配置
    const result = await updateTalentRebate(params);

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
    console.error('[ERROR] 更新返点配置失败:', error.message);

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
