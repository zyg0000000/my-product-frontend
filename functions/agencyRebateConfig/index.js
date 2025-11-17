/**
 * @file agencyRebateConfig.js
 * @version 3.0.0
 * @description 云函数：更新机构返点配置
 *
 * --- 更新日志 ---
 * [v3.0.0] 2025-11-16
 * - 重大变更：机构返点配置按平台区分存储
 * - 必需参数：platform（douyin/kuaishou/xiaohongshu/bilibili）
 * - rebate_configs 中：platform 不再为 null，必须指定具体平台
 * - 一个机构可以有多个 active 配置（每个平台一个）
 *
 * [v2.0.0] 2025-11-16
 * - 使用统一的 rebate_configs 集合（targetType='agency'）
 * - 自动管理历史记录（旧配置标记为 expired）
 *
 * [v1.0.0] 2025-11-16
 * - 初始版本
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const AGENCIES_COLLECTION = 'agencies';
const TALENTS_COLLECTION = 'talents';
const REBATE_CONFIGS_COLLECTION = 'rebate_configs';

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
 * 生成配置ID
 */
function generateConfigId() {
  return `rebate_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 更新机构返点配置（按平台）
 */
async function updateAgencyRebate(params) {
  const { agencyId, platform, rebateConfig, syncToTalents } = params;

  // 验证必填字段
  if (!agencyId || !rebateConfig || rebateConfig.baseRebate === undefined) {
    throw new Error('缺少必要参数: agencyId, rebateConfig.baseRebate');
  }

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  // 验证平台
  const validatedPlatform = validatePlatform(platform);

  // 验证返点率
  const validatedRate = validateRebateRate(rebateConfig.baseRebate);

  // 查询机构是否存在
  const agency = await agenciesCollection.findOne({ id: agencyId });
  if (!agency) {
    throw new Error(`机构不存在: agencyId=${agencyId}`);
  }

  // 确定生效时间（机构返点始终立即生效）
  const now = new Date();
  const effectiveDate = rebateConfig.effectiveDate
    ? new Date(rebateConfig.effectiveDate)
    : now;

  // 先将该机构该平台的旧 active 配置标记为 expired
  const oldActiveConfig = await rebateConfigsCollection.findOne({
    targetType: 'agency',
    targetId: agencyId,
    platform: validatedPlatform,
    status: 'active'
  });

  if (oldActiveConfig) {
    // 将旧配置标记为 expired，设置失效日期为新配置的生效日期
    await rebateConfigsCollection.updateOne(
      { _id: oldActiveConfig._id },
      {
        $set: {
          status: 'expired',
          expiryDate: now,
          updatedAt: now
        }
      }
    );
  }

  // 创建新的返点配置记录
  const configId = generateConfigId();
  const configData = {
    configId,
    targetType: 'agency',
    targetId: agencyId,
    platform: validatedPlatform,
    rebateRate: validatedRate,
    effectType: 'immediate', // 机构返点始终立即生效
    effectiveDate: now,
    expiryDate: null,
    status: 'active',
    createdBy: rebateConfig.updatedBy || 'system',
    createdAt: now,
    metadata: {
      agencyName: agency.name,
      previousRate: oldActiveConfig ? oldActiveConfig.rebateRate : 0,
      syncToTalents: syncToTalents || false
    }
  };

  await rebateConfigsCollection.insertOne(configData);

  // 更新机构的 rebateConfig（保持向后兼容 - 存储所有平台的配置）
  // 这里我们将每个平台的配置存储在 rebateConfig.platforms 对象中
  const platformConfigKey = `rebateConfig.platforms.${validatedPlatform}`;
  await agenciesCollection.updateOne(
    { id: agencyId },
    {
      $set: {
        [platformConfigKey]: {
          baseRebate: validatedRate,
          effectiveDate: effectiveDate.toISOString().split('T')[0],
          lastUpdatedAt: now.toISOString(),
          updatedBy: rebateConfig.updatedBy || 'system'
        }
      }
    }
  );

  // 如果需要同步到达人
  let syncResult = null;
  if (syncToTalents) {
    // 查找所有属于该机构、在该平台、且使用同步模式的达人
    const talentsToSync = await talentsCollection.find({
      agencyId: agencyId,
      platform: validatedPlatform,
      $or: [
        { rebateMode: 'sync' },
        { rebateMode: { $exists: false } }, // 没有设置模式的默认为同步
      ]
    }).toArray();

    // 为每个达人创建返点配置记录
    const talentConfigsToInsert = [];
    const talentUpdates = [];

    for (const talent of talentsToSync) {
      // 先将该达人在该平台的旧 active 配置标记为 expired
      const oldTalentConfig = await rebateConfigsCollection.findOne({
        targetType: 'talent',
        targetId: talent.oneId,
        platform: validatedPlatform,
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

      // 创建新的达人返点配置
      const talentConfigId = generateConfigId();
      talentConfigsToInsert.push({
        configId: talentConfigId,
        targetType: 'talent',
        targetId: talent.oneId,
        platform: validatedPlatform,
        rebateRate: validatedRate,
        effectType: 'immediate',
        effectiveDate: now,
        expiryDate: null,
        status: 'active',
        createdBy: rebateConfig.updatedBy || 'system',
        createdAt: now,
        metadata: {
          syncedFromAgency: true,
          agencyId: agencyId,
          agencyName: agency.name
        }
      });

      // 准备更新达人的 currentRebate
      talentUpdates.push({
        updateOne: {
          filter: { oneId: talent.oneId, platform: validatedPlatform },
          update: {
            $set: {
              'currentRebate.rate': validatedRate,
              'currentRebate.source': 'agency',
              'currentRebate.effectiveDate': effectiveDate.toISOString().split('T')[0],
              'currentRebate.lastUpdated': now,
              'lastRebateSyncAt': now.toISOString()
            }
          }
        }
      });
    }

    // 批量插入达人返点配置
    if (talentConfigsToInsert.length > 0) {
      await rebateConfigsCollection.insertMany(talentConfigsToInsert);
    }

    // 批量更新达人
    if (talentUpdates.length > 0) {
      await talentsCollection.bulkWrite(talentUpdates);
    }

    syncResult = {
      platform: validatedPlatform,
      talentsUpdated: talentsToSync.length,
      configsCreated: talentConfigsToInsert.length,
      message: `已同步更新 ${talentsToSync.length} 个${validatedPlatform}平台达人的返点率`
    };
  }

  return {
    configId,
    platform: validatedPlatform,
    message: syncToTalents
      ? `${validatedPlatform}平台返点配置已更新并同步到达人`
      : `${validatedPlatform}平台返点配置已更新`,
    newRate: validatedRate,
    effectType: 'immediate',
    effectiveDate: now.toISOString(),
    syncResult
  };
}

/**
 * 主处理函数
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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
    const { agencyId, platform, rebateConfig } = params;
    if (!agencyId || !platform || !rebateConfig || rebateConfig.baseRebate === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '缺少必需参数: agencyId, platform, rebateConfig.baseRebate'
        })
      };
    }

    // 更新返点配置
    const result = await updateAgencyRebate(params);

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
    console.error('[ERROR] 更新机构返点配置失败:', error.message);

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
