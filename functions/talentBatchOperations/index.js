/**
 * @file talentBatchOperations.js
 * @version 2.2.0
 * @description 云函数：达人批量操作统一接口 (agentworks 专用)
 *
 * --- 功能说明 ---
 * 这是 agentworks 产品的达人批量操作标准入口，支持以下操作：
 * - match: 批量匹配达人（预览用，支持机构名称匹配）
 * - bindAgency: 批量绑定机构（单机构模式，按 agencyId）
 * - bindAgencyByName: 批量绑定机构（多机构模式，按机构名称）
 * - unbindAgency: 批量解绑机构（需提供新返点率）
 * - setIndependentRebate: 批量设置独立返点（机构达人切换为独立模式）
 *
 * --- 更新日志 ---
 * [v2.2.0] 2025-12-14
 * - 新增 setIndependentRebate 操作，支持为机构达人设置独立返点
 * - 达人保持在机构内，但 rebateMode 切换为 independent
 *
 * [v2.1.0] 2025-12-14
 * - 解绑机构时必须提供 newRebateRate 参数
 * - 解绑时同步写入新返点到 talents.currentRebate (source='personal')
 * - 解绑时写入 rebate_configs 历史记录 (changeSource='agency_unbind')
 *
 * [v2.0.0] 2025-12-14
 * - 绑定机构时同步写入返点到 talents.currentRebate
 * - 绑定机构时写入 rebate_configs 历史记录
 * - 新增 changeSource 字段标识返点变更来源
 *
 * --- 注意事项 ---
 * - 仅支持 agentworks_db，不兼容 v1/byteproject
 * - 所有操作基于 (oneId, platform) 复合键
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const TALENTS_COLLECTION = 'talents';
const AGENCIES_COLLECTION = 'agencies';
const REBATE_CONFIGS_COLLECTION = 'rebate_configs';

/**
 * 生成配置ID
 */
function generateConfigId() {
  return `rebate_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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
 * CORS 响应头
 */
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

/**
 * 创建错误响应
 */
function errorResponse(statusCode, message, details = null) {
  const body = { success: false, message };
  if (details) body.details = details;
  return { statusCode, headers, body: JSON.stringify(body) };
}

/**
 * 创建成功响应
 */
function successResponse(data) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() })
  };
}

// ==================== match 操作 ====================

/**
 * 批量匹配达人
 * 根据 platformAccountId 或 name 查找达人，并关联查询机构名称
 *
 * @param {Object} db - 数据库实例
 * @param {string} platform - 平台
 * @param {Object} data - 匹配数据
 * @param {Array} data.talents - 待匹配的达人列表 [{ platformAccountId?, name? }]
 */
async function handleMatch(db, platform, data) {
  const { talents } = data;

  if (!Array.isArray(talents) || talents.length === 0) {
    return errorResponse(400, 'talents 数组不能为空');
  }

  if (talents.length > 500) {
    return errorResponse(400, '单次匹配数量不能超过 500 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);

  // 预先获取所有机构信息，用于关联显示
  const allAgencies = await agenciesCollection.find({}, { projection: { id: 1, name: 1 } }).toArray();
  const agencyMap = new Map(allAgencies.map(a => [a.id, a.name]));

  const matched = [];
  let foundCount = 0;
  let notFoundCount = 0;
  let multipleFoundCount = 0;

  for (const input of talents) {
    const { platformAccountId, name } = input;

    if (!platformAccountId && !name) {
      matched.push({
        input,
        talent: null,
        status: 'not_found',
        message: '缺少 platformAccountId 或 name'
      });
      notFoundCount++;
      continue;
    }

    let query = { platform };
    let matchResults = [];

    // 优先按 platformAccountId 精确匹配
    if (platformAccountId) {
      query.platformAccountId = platformAccountId;
      matchResults = await talentsCollection.find(query, {
        projection: { oneId: 1, name: 1, platformAccountId: 1, agencyId: 1, platform: 1 }
      }).toArray();
    }

    // 如果 platformAccountId 未找到，尝试按 name 模糊匹配
    if (matchResults.length === 0 && name) {
      delete query.platformAccountId;
      query.name = { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' };
      matchResults = await talentsCollection.find(query, {
        projection: { oneId: 1, name: 1, platformAccountId: 1, agencyId: 1, platform: 1 }
      }).toArray();
    }

    if (matchResults.length === 0) {
      matched.push({
        input,
        talent: null,
        status: 'not_found',
        message: '未找到匹配的达人'
      });
      notFoundCount++;
    } else if (matchResults.length === 1) {
      const talent = matchResults[0];
      matched.push({
        input,
        talent: {
          oneId: talent.oneId,
          name: talent.name,
          platformAccountId: talent.platformAccountId,
          platform: talent.platform,
          agencyId: talent.agencyId || 'individual',
          agencyName: talent.agencyId && talent.agencyId !== 'individual'
            ? (agencyMap.get(talent.agencyId) || '未知机构')
            : '野生达人'
        },
        status: 'found'
      });
      foundCount++;
    } else {
      // 多个匹配
      const candidates = matchResults.map(t => ({
        oneId: t.oneId,
        name: t.name,
        platformAccountId: t.platformAccountId,
        platform: t.platform,
        agencyId: t.agencyId || 'individual',
        agencyName: t.agencyId && t.agencyId !== 'individual'
          ? (agencyMap.get(t.agencyId) || '未知机构')
          : '野生达人'
      }));
      matched.push({
        input,
        talent: null,
        status: 'multiple_found',
        message: `找到 ${matchResults.length} 个同名达人，请选择`,
        candidates
      });
      multipleFoundCount++;
    }
  }

  return successResponse({
    matched,
    summary: {
      total: talents.length,
      found: foundCount,
      notFound: notFoundCount,
      multipleFound: multipleFoundCount
    }
  });
}

// ==================== bindAgency 操作 ====================

/**
 * 批量绑定机构
 * v2.0: 绑定时同步写入机构返点到达人，并记录返点历史
 *
 * @param {Object} db - 数据库实例
 * @param {string} platform - 平台
 * @param {Object} data - 绑定数据
 * @param {string} data.agencyId - 目标机构ID
 * @param {Array} data.talents - 待绑定的达人列表 [{ oneId }]
 * @param {boolean} [data.overwriteExisting=false] - 是否覆盖已绑定其他机构的达人
 */
async function handleBindAgency(db, platform, data) {
  const { agencyId, talents, overwriteExisting = false } = data;

  if (!agencyId) {
    return errorResponse(400, '缺少目标机构ID (agencyId)');
  }

  if (!Array.isArray(talents) || talents.length === 0) {
    return errorResponse(400, 'talents 数组不能为空');
  }

  if (talents.length > 500) {
    return errorResponse(400, '单次绑定数量不能超过 500 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  // 验证目标机构是否存在
  const targetAgency = await agenciesCollection.findOne({ id: agencyId });
  if (!targetAgency) {
    return errorResponse(404, `机构不存在: ${agencyId}`);
  }

  // 获取机构在该平台的返点率
  const agencyRebateRate = targetAgency.rebateConfig?.platforms?.[platform]?.baseRebate;

  // 获取所有机构信息用于错误提示
  const allAgencies = await agenciesCollection.find({}, { projection: { id: 1, name: 1 } }).toArray();
  const agencyMap = new Map(allAgencies.map(a => [a.id, a.name]));

  const oneIds = talents.map(t => t.oneId).filter(Boolean);
  if (oneIds.length === 0) {
    return errorResponse(400, 'talents 数组中缺少有效的 oneId');
  }

  // 批量查询达人（包含当前返点信息）
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, name: 1, agencyId: 1, currentRebate: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  const talentBulkOps = [];
  const rebateConfigsToInsert = [];
  const oldConfigsToExpire = [];
  const errors = [];
  let boundCount = 0;
  let skippedCount = 0;
  const now = new Date();

  for (const { oneId } of talents) {
    if (!oneId) {
      errors.push({ oneId: 'N/A', reason: '缺少 oneId' });
      continue;
    }

    const existing = existingMap.get(oneId);
    if (!existing) {
      errors.push({ oneId, reason: '达人不存在' });
      continue;
    }

    const currentAgencyId = existing.agencyId || 'individual';
    const previousRate = existing.currentRebate?.rate;

    // 如果已经绑定到目标机构，跳过
    if (currentAgencyId === agencyId) {
      skippedCount++;
      continue;
    }

    // 如果已绑定其他机构且不允许覆盖，跳过
    if (currentAgencyId !== 'individual' && !overwriteExisting) {
      skippedCount++;
      errors.push({
        oneId,
        reason: '已绑定其他机构',
        currentAgencyId,
        currentAgencyName: agencyMap.get(currentAgencyId) || '未知机构',
        talentName: existing.name
      });
      continue;
    }

    // 构建达人更新操作
    const updatePayload = {
      agencyId,
      rebateMode: 'sync',
      updatedAt: now
    };

    // 如果机构有配置返点，同步写入达人的 currentRebate
    if (agencyRebateRate !== undefined && agencyRebateRate !== null) {
      updatePayload.currentRebate = {
        rate: agencyRebateRate,
        source: 'agency',
        effectiveDate: now.toISOString().split('T')[0],
        lastUpdated: now
      };
      updatePayload.lastRebateSyncAt = now.toISOString();

      // 记录需要过期的旧配置
      oldConfigsToExpire.push({
        targetType: 'talent',
        targetId: oneId,
        platform
      });

      // 创建新的返点历史记录
      rebateConfigsToInsert.push({
        configId: generateConfigId(),
        targetType: 'talent',
        targetId: oneId,
        platform,
        rebateRate: agencyRebateRate,
        previousRate: previousRate ?? null,
        effectType: 'immediate',
        effectiveDate: now,
        expiryDate: null,
        status: 'active',
        createdBy: 'system',
        createdAt: now,
        changeSource: 'agency_bind',
        sourceAgencyId: agencyId,
        sourceAgencyName: targetAgency.name,
        metadata: {
          talentName: existing.name,
          bindOperation: true
        }
      });
    }

    talentBulkOps.push({
      updateOne: {
        filter: { oneId, platform },
        update: { $set: updatePayload }
      }
    });
    boundCount++;
  }

  // 执行批量更新
  if (talentBulkOps.length > 0) {
    await talentsCollection.bulkWrite(talentBulkOps, { ordered: false });
  }

  // 将旧的 active 返点配置标记为 expired
  if (oldConfigsToExpire.length > 0) {
    for (const { targetType, targetId, platform: plat } of oldConfigsToExpire) {
      await rebateConfigsCollection.updateMany(
        {
          targetType,
          targetId,
          platform: plat,
          status: 'active'
        },
        {
          $set: {
            status: 'expired',
            expiryDate: now,
            updatedAt: now
          }
        }
      );
    }
  }

  // 批量插入新的返点历史记录
  if (rebateConfigsToInsert.length > 0) {
    await rebateConfigsCollection.insertMany(rebateConfigsToInsert);
  }

  return successResponse({
    bound: boundCount,
    skipped: skippedCount,
    failed: errors.filter(e => e.reason !== '已绑定其他机构').length,
    targetAgency: {
      id: targetAgency.id,
      name: targetAgency.name
    },
    rebateSynced: rebateConfigsToInsert.length,
    agencyRebateRate: agencyRebateRate ?? null,
    errors
  });
}

// ==================== bindAgencyByName 操作 ====================

/**
 * 批量绑定机构（多机构模式，按机构名称）
 * 支持一次请求将不同达人绑定到不同机构
 * v2.0: 绑定时同步写入机构返点到达人，并记录返点历史
 *
 * @param {Object} db - 数据库实例
 * @param {string} platform - 平台
 * @param {Object} data - 绑定数据
 * @param {Array} data.talents - 待绑定的达人列表 [{ oneId, agencyName }]
 * @param {boolean} [data.overwriteExisting=false] - 是否覆盖已绑定其他机构的达人
 */
async function handleBindAgencyByName(db, platform, data) {
  const { talents, overwriteExisting = false } = data;

  if (!Array.isArray(talents) || talents.length === 0) {
    return errorResponse(400, 'talents 数组不能为空');
  }

  if (talents.length > 500) {
    return errorResponse(400, '单次绑定数量不能超过 500 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  // 获取所有机构信息（包含返点配置），建立名称到机构的映射
  const allAgencies = await agenciesCollection.find({}, {
    projection: { id: 1, name: 1, rebateConfig: 1 }
  }).toArray();
  const agencyIdMap = new Map(allAgencies.map(a => [a.id, a.name]));
  const agencyNameMap = new Map(allAgencies.map(a => [a.name.toLowerCase(), a]));

  // 收集所有 oneId
  const oneIds = talents.map(t => t.oneId).filter(Boolean);
  if (oneIds.length === 0) {
    return errorResponse(400, 'talents 数组中缺少有效的 oneId');
  }

  // 批量查询达人（包含当前返点信息）
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, name: 1, agencyId: 1, currentRebate: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  const talentBulkOps = [];
  const rebateConfigsToInsert = [];
  const oldConfigsToExpire = [];
  const errors = [];
  const results = [];
  let boundCount = 0;
  let skippedCount = 0;
  const now = new Date();

  for (const { oneId, agencyName } of talents) {
    if (!oneId) {
      errors.push({ oneId: 'N/A', agencyName, reason: '缺少 oneId' });
      continue;
    }

    if (!agencyName) {
      errors.push({ oneId, agencyName: 'N/A', reason: '缺少机构名称' });
      continue;
    }

    // 查找机构（按名称精确匹配，忽略大小写）
    const targetAgency = agencyNameMap.get(agencyName.toLowerCase());
    if (!targetAgency) {
      errors.push({ oneId, agencyName, reason: `机构不存在: ${agencyName}` });
      continue;
    }

    const existing = existingMap.get(oneId);
    if (!existing) {
      errors.push({ oneId, agencyName, reason: '达人不存在' });
      continue;
    }

    const currentAgencyId = existing.agencyId || 'individual';
    const previousRate = existing.currentRebate?.rate;

    // 如果已经绑定到目标机构，跳过
    if (currentAgencyId === targetAgency.id) {
      skippedCount++;
      results.push({
        oneId,
        agencyName,
        status: 'skipped',
        reason: '已绑定到该机构'
      });
      continue;
    }

    // 如果已绑定其他机构且不允许覆盖，跳过
    if (currentAgencyId !== 'individual' && !overwriteExisting) {
      skippedCount++;
      errors.push({
        oneId,
        agencyName,
        reason: '已绑定其他机构',
        currentAgencyId,
        currentAgencyName: agencyIdMap.get(currentAgencyId) || '未知机构',
        talentName: existing.name
      });
      continue;
    }

    // 获取目标机构在该平台的返点率
    const agencyRebateRate = targetAgency.rebateConfig?.platforms?.[platform]?.baseRebate;

    // 构建达人更新操作
    const updatePayload = {
      agencyId: targetAgency.id,
      rebateMode: 'sync',
      updatedAt: now
    };

    // 如果机构有配置返点，同步写入达人的 currentRebate
    if (agencyRebateRate !== undefined && agencyRebateRate !== null) {
      updatePayload.currentRebate = {
        rate: agencyRebateRate,
        source: 'agency',
        effectiveDate: now.toISOString().split('T')[0],
        lastUpdated: now
      };
      updatePayload.lastRebateSyncAt = now.toISOString();

      // 记录需要过期的旧配置
      oldConfigsToExpire.push({
        targetType: 'talent',
        targetId: oneId,
        platform
      });

      // 创建新的返点历史记录
      rebateConfigsToInsert.push({
        configId: generateConfigId(),
        targetType: 'talent',
        targetId: oneId,
        platform,
        rebateRate: agencyRebateRate,
        previousRate: previousRate ?? null,
        effectType: 'immediate',
        effectiveDate: now,
        expiryDate: null,
        status: 'active',
        createdBy: 'system',
        createdAt: now,
        changeSource: 'agency_bind',
        sourceAgencyId: targetAgency.id,
        sourceAgencyName: targetAgency.name,
        metadata: {
          talentName: existing.name,
          bindOperation: true
        }
      });
    }

    talentBulkOps.push({
      updateOne: {
        filter: { oneId, platform },
        update: { $set: updatePayload }
      }
    });

    results.push({
      oneId,
      agencyName,
      agencyId: targetAgency.id,
      status: 'bound',
      talentName: existing.name,
      rebateSynced: agencyRebateRate !== undefined && agencyRebateRate !== null,
      rebateRate: agencyRebateRate ?? null
    });
    boundCount++;
  }

  // 执行批量更新
  if (talentBulkOps.length > 0) {
    await talentsCollection.bulkWrite(talentBulkOps, { ordered: false });
  }

  // 将旧的 active 返点配置标记为 expired
  if (oldConfigsToExpire.length > 0) {
    for (const { targetType, targetId, platform: plat } of oldConfigsToExpire) {
      await rebateConfigsCollection.updateMany(
        {
          targetType,
          targetId,
          platform: plat,
          status: 'active'
        },
        {
          $set: {
            status: 'expired',
            expiryDate: now,
            updatedAt: now
          }
        }
      );
    }
  }

  // 批量插入新的返点历史记录
  if (rebateConfigsToInsert.length > 0) {
    await rebateConfigsCollection.insertMany(rebateConfigsToInsert);
  }

  return successResponse({
    bound: boundCount,
    skipped: skippedCount,
    failed: errors.length,
    rebateSynced: rebateConfigsToInsert.length,
    results,
    errors
  });
}

// ==================== unbindAgency 操作 ====================

/**
 * 批量解绑机构
 * v2.0: 解绑时必须指定新返点率，同步写入达人 currentRebate，并记录返点历史
 *
 * @param {Object} db - 数据库实例
 * @param {string} platform - 平台
 * @param {Object} data - 解绑数据
 * @param {Array} data.talents - 待解绑的达人列表 [{ oneId }]
 * @param {number} data.newRebateRate - 解绑后的新返点率 (必填，0-100)
 * @param {string} [data.updatedBy='system'] - 操作人
 */
async function handleUnbindAgency(db, platform, data) {
  const { talents, newRebateRate, updatedBy = 'system' } = data;

  // 验证 newRebateRate 参数
  if (newRebateRate === undefined || newRebateRate === null) {
    return errorResponse(400, '缺少新返点率参数 (newRebateRate)，解绑后达人需要设置独立返点');
  }

  const rate = parseFloat(newRebateRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return errorResponse(400, '返点率必须在 0-100 之间');
  }

  // 检查小数位数
  const decimalPart = (newRebateRate.toString().split('.')[1] || '');
  if (decimalPart.length > 2) {
    return errorResponse(400, '返点率最多支持小数点后2位');
  }

  const validatedRate = parseFloat(rate.toFixed(2));

  if (!Array.isArray(talents) || talents.length === 0) {
    return errorResponse(400, 'talents 数组不能为空');
  }

  if (talents.length > 500) {
    return errorResponse(400, '单次解绑数量不能超过 500 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  const oneIds = talents.map(t => t.oneId).filter(Boolean);
  if (oneIds.length === 0) {
    return errorResponse(400, 'talents 数组中缺少有效的 oneId');
  }

  // 获取所有机构信息用于记录
  const allAgencies = await agenciesCollection.find({}, { projection: { id: 1, name: 1 } }).toArray();
  const agencyMap = new Map(allAgencies.map(a => [a.id, a.name]));

  // 批量查询达人（包含当前返点和机构信息）
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, name: 1, agencyId: 1, currentRebate: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  const talentBulkOps = [];
  const rebateConfigsToInsert = [];
  const oldConfigsToExpire = [];
  const errors = [];
  let unboundCount = 0;
  let skippedCount = 0;
  const now = new Date();

  for (const { oneId } of talents) {
    if (!oneId) {
      errors.push({ oneId: 'N/A', reason: '缺少 oneId' });
      continue;
    }

    const existing = existingMap.get(oneId);
    if (!existing) {
      errors.push({ oneId, reason: '达人不存在' });
      continue;
    }

    // 如果已经是野生达人，跳过
    if (!existing.agencyId || existing.agencyId === 'individual') {
      skippedCount++;
      continue; // 静默跳过，不计入错误
    }

    const previousAgencyId = existing.agencyId;
    const previousAgencyName = agencyMap.get(previousAgencyId) || '未知机构';
    const previousRate = existing.currentRebate?.rate;

    // 构建更新操作
    const updatePayload = {
      agencyId: 'individual',
      rebateMode: 'independent', // 解绑后切换为独立返点模式
      currentRebate: {
        rate: validatedRate,
        source: 'personal',
        effectiveDate: now.toISOString().split('T')[0],
        lastUpdated: now
      },
      updatedAt: now
    };

    // 记录需要过期的旧配置
    oldConfigsToExpire.push({
      targetType: 'talent',
      targetId: oneId,
      platform
    });

    // 创建新的返点历史记录
    rebateConfigsToInsert.push({
      configId: generateConfigId(),
      targetType: 'talent',
      targetId: oneId,
      platform,
      rebateRate: validatedRate,
      previousRate: previousRate ?? null,
      effectType: 'immediate',
      effectiveDate: now,
      expiryDate: null,
      status: 'active',
      createdBy: updatedBy,
      createdAt: now,
      changeSource: 'agency_unbind',
      sourceAgencyId: previousAgencyId,
      sourceAgencyName: previousAgencyName,
      metadata: {
        talentName: existing.name,
        unbindOperation: true,
        previousAgencyId,
        previousAgencyName
      }
    });

    talentBulkOps.push({
      updateOne: {
        filter: { oneId, platform },
        update: { $set: updatePayload }
      }
    });
    unboundCount++;
  }

  // 执行批量更新
  if (talentBulkOps.length > 0) {
    await talentsCollection.bulkWrite(talentBulkOps, { ordered: false });
  }

  // 将旧的 active 返点配置标记为 expired
  if (oldConfigsToExpire.length > 0) {
    for (const { targetType, targetId, platform: plat } of oldConfigsToExpire) {
      await rebateConfigsCollection.updateMany(
        {
          targetType,
          targetId,
          platform: plat,
          status: 'active'
        },
        {
          $set: {
            status: 'expired',
            expiryDate: now,
            updatedAt: now
          }
        }
      );
    }
  }

  // 批量插入新的返点历史记录
  if (rebateConfigsToInsert.length > 0) {
    await rebateConfigsCollection.insertMany(rebateConfigsToInsert);
  }

  return successResponse({
    unbound: unboundCount,
    skipped: skippedCount,
    failed: errors.length,
    newRebateRate: validatedRate,
    rebateRecordsCreated: rebateConfigsToInsert.length,
    errors
  });
}

// ==================== setIndependentRebate 操作 ====================

/**
 * 批量设置独立返点
 * 为机构达人设置独立返点率，达人保持在机构内但 rebateMode 切换为 independent
 *
 * @param {Object} db - 数据库实例
 * @param {string} platform - 平台
 * @param {Object} data - 设置数据
 * @param {Array} data.talents - 待设置的达人列表 [{ oneId, rebateRate }]
 * @param {string} [data.updatedBy='system'] - 操作人
 */
async function handleSetIndependentRebate(db, platform, data) {
  const { talents, updatedBy = 'system' } = data;

  if (!Array.isArray(talents) || talents.length === 0) {
    return errorResponse(400, 'talents 数组不能为空');
  }

  if (talents.length > 500) {
    return errorResponse(400, '单次设置数量不能超过 500 条');
  }

  // 验证每个达人的返点率
  for (const item of talents) {
    if (!item.oneId) {
      return errorResponse(400, 'talents 数组中存在缺少 oneId 的项');
    }
    if (item.rebateRate === undefined || item.rebateRate === null) {
      return errorResponse(400, `达人 ${item.oneId} 缺少返点率 (rebateRate)`);
    }
    const rate = parseFloat(item.rebateRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return errorResponse(400, `达人 ${item.oneId} 的返点率必须在 0-100 之间`);
    }
    const decimalPart = (item.rebateRate.toString().split('.')[1] || '');
    if (decimalPart.length > 2) {
      return errorResponse(400, `达人 ${item.oneId} 的返点率最多支持小数点后2位`);
    }
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);
  const rebateConfigsCollection = db.collection(REBATE_CONFIGS_COLLECTION);

  const oneIds = talents.map(t => t.oneId);

  // 获取所有机构信息用于记录
  const allAgencies = await agenciesCollection.find({}, { projection: { id: 1, name: 1 } }).toArray();
  const agencyMap = new Map(allAgencies.map(a => [a.id, a.name]));

  // 批量查询达人
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, name: 1, agencyId: 1, currentRebate: 1, rebateMode: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  // 构建 oneId -> rebateRate 映射
  const rebateMap = new Map(talents.map(t => [t.oneId, parseFloat(parseFloat(t.rebateRate).toFixed(2))]));

  const talentBulkOps = [];
  const rebateConfigsToInsert = [];
  const oldConfigsToExpire = [];
  const errors = [];
  const results = [];
  let updatedCount = 0;
  let skippedCount = 0;
  const now = new Date();

  for (const { oneId } of talents) {
    const existing = existingMap.get(oneId);
    if (!existing) {
      errors.push({ oneId, reason: '达人不存在' });
      continue;
    }

    const newRate = rebateMap.get(oneId);
    const previousRate = existing.currentRebate?.rate;
    const agencyId = existing.agencyId || 'individual';
    const agencyName = agencyId !== 'individual' ? (agencyMap.get(agencyId) || '未知机构') : '野生达人';

    // 如果返点率没有变化且已经是 independent 模式，跳过
    if (existing.rebateMode === 'independent' && previousRate === newRate) {
      skippedCount++;
      results.push({
        oneId,
        status: 'skipped',
        reason: '返点率未变化',
        currentRate: previousRate
      });
      continue;
    }

    // 构建更新操作
    const updatePayload = {
      rebateMode: 'independent',
      currentRebate: {
        rate: newRate,
        source: 'personal',
        effectiveDate: now.toISOString().split('T')[0],
        lastUpdated: now
      },
      updatedAt: now
    };

    // 记录需要过期的旧配置
    oldConfigsToExpire.push({
      targetType: 'talent',
      targetId: oneId,
      platform
    });

    // 创建新的返点历史记录
    rebateConfigsToInsert.push({
      configId: generateConfigId(),
      targetType: 'talent',
      targetId: oneId,
      platform,
      rebateRate: newRate,
      previousRate: previousRate ?? null,
      effectType: 'immediate',
      effectiveDate: now,
      expiryDate: null,
      status: 'active',
      createdBy: updatedBy,
      createdAt: now,
      changeSource: 'set_independent',
      sourceAgencyId: agencyId,
      sourceAgencyName: agencyName,
      metadata: {
        talentName: existing.name,
        previousRebateMode: existing.rebateMode || 'sync'
      }
    });

    talentBulkOps.push({
      updateOne: {
        filter: { oneId, platform },
        update: { $set: updatePayload }
      }
    });

    results.push({
      oneId,
      talentName: existing.name,
      status: 'updated',
      previousRate: previousRate ?? null,
      newRate,
      agencyId,
      agencyName
    });
    updatedCount++;
  }

  // 执行批量更新
  if (talentBulkOps.length > 0) {
    await talentsCollection.bulkWrite(talentBulkOps, { ordered: false });
  }

  // 将旧的 active 返点配置标记为 expired
  if (oldConfigsToExpire.length > 0) {
    for (const { targetType, targetId, platform: plat } of oldConfigsToExpire) {
      await rebateConfigsCollection.updateMany(
        {
          targetType,
          targetId,
          platform: plat,
          status: 'active'
        },
        {
          $set: {
            status: 'expired',
            expiryDate: now,
            updatedAt: now
          }
        }
      );
    }
  }

  // 批量插入新的返点历史记录
  if (rebateConfigsToInsert.length > 0) {
    await rebateConfigsCollection.insertMany(rebateConfigsToInsert);
  }

  return successResponse({
    updated: updatedCount,
    skipped: skippedCount,
    failed: errors.length,
    rebateRecordsCreated: rebateConfigsToInsert.length,
    results,
    errors
  });
}

// ==================== 工具函数 ====================

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== 主处理函数 ====================

exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 仅支持 POST 方法
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    // 检查环境变量
    if (!MONGO_URI) {
      console.error('[ERROR] MONGO_URI 环境变量未设置');
      return errorResponse(500, '服务器数据库配置不完整');
    }

    // 解析请求体
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return errorResponse(400, '请求体格式错误');
    }

    const { operation, platform, data } = body;

    // 验证必需参数
    if (!operation) {
      return errorResponse(400, '缺少 operation 参数');
    }

    if (!platform) {
      return errorResponse(400, '缺少 platform 参数');
    }

    const validPlatforms = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];
    if (!validPlatforms.includes(platform)) {
      return errorResponse(400, `不支持的平台: ${platform}，支持: ${validPlatforms.join(', ')}`);
    }

    if (!data || typeof data !== 'object') {
      return errorResponse(400, '缺少 data 参数');
    }

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 路由到对应的操作处理函数
    switch (operation) {
      case 'match':
        return await handleMatch(db, platform, data);

      case 'bindAgency':
        return await handleBindAgency(db, platform, data);

      case 'unbindAgency':
        return await handleUnbindAgency(db, platform, data);

      case 'bindAgencyByName':
        return await handleBindAgencyByName(db, platform, data);

      case 'setIndependentRebate':
        return await handleSetIndependentRebate(db, platform, data);

      default:
        return errorResponse(400, `不支持的操作类型: ${operation}，支持: match, bindAgency, bindAgencyByName, unbindAgency, setIndependentRebate`);
    }

  } catch (error) {
    console.error('[ERROR] talentBatchOperations 处理失败:', error);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        ...(isProduction ? {} : { error: error.message, stack: error.stack })
      })
    };
  }
};
