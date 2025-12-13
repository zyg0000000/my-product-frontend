/**
 * @file talentBatchOperations.js
 * @version 1.1.0
 * @description 云函数：达人批量操作统一接口 (agentworks 专用)
 *
 * --- 功能说明 ---
 * 这是 agentworks 产品的达人批量操作标准入口，支持以下操作：
 * - match: 批量匹配达人（预览用，支持机构名称匹配）
 * - bindAgency: 批量绑定机构（单机构模式，按 agencyId）
 * - bindAgencyByName: 批量绑定机构（多机构模式，按机构名称）
 * - unbindAgency: 批量解绑机构
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

  if (talents.length > 200) {
    return errorResponse(400, '单次绑定数量不能超过 200 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);

  // 验证目标机构是否存在
  const targetAgency = await agenciesCollection.findOne({ id: agencyId });
  if (!targetAgency) {
    return errorResponse(404, `机构不存在: ${agencyId}`);
  }

  // 获取所有机构信息用于错误提示
  const allAgencies = await agenciesCollection.find({}, { projection: { id: 1, name: 1 } }).toArray();
  const agencyMap = new Map(allAgencies.map(a => [a.id, a.name]));

  const oneIds = talents.map(t => t.oneId).filter(Boolean);
  if (oneIds.length === 0) {
    return errorResponse(400, 'talents 数组中缺少有效的 oneId');
  }

  // 批量查询达人
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, name: 1, agencyId: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  const bulkOps = [];
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

    // 构建更新操作
    const updatePayload = {
      agencyId,
      rebateMode: 'sync', // 绑定机构时默认同步机构返点
      updatedAt: now
    };

    bulkOps.push({
      updateOne: {
        filter: { oneId, platform },
        update: { $set: updatePayload }
      }
    });
    boundCount++;
  }

  // 执行批量更新
  if (bulkOps.length > 0) {
    await talentsCollection.bulkWrite(bulkOps, { ordered: false });
  }

  return successResponse({
    bound: boundCount,
    skipped: skippedCount,
    failed: errors.filter(e => e.reason !== '已绑定其他机构').length,
    targetAgency: {
      id: targetAgency.id,
      name: targetAgency.name
    },
    errors
  });
}

// ==================== bindAgencyByName 操作 ====================

/**
 * 批量绑定机构（多机构模式，按机构名称）
 * 支持一次请求将不同达人绑定到不同机构
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

  if (talents.length > 200) {
    return errorResponse(400, '单次绑定数量不能超过 200 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);

  // 获取所有机构信息，建立名称到ID的映射
  const allAgencies = await agenciesCollection.find({}, { projection: { id: 1, name: 1 } }).toArray();
  const agencyIdMap = new Map(allAgencies.map(a => [a.id, a.name]));
  const agencyNameMap = new Map(allAgencies.map(a => [a.name.toLowerCase(), a]));

  // 收集所有 oneId
  const oneIds = talents.map(t => t.oneId).filter(Boolean);
  if (oneIds.length === 0) {
    return errorResponse(400, 'talents 数组中缺少有效的 oneId');
  }

  // 批量查询达人
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, name: 1, agencyId: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  const bulkOps = [];
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

    // 构建更新操作
    const updatePayload = {
      agencyId: targetAgency.id,
      rebateMode: 'sync', // 绑定机构时默认同步机构返点
      updatedAt: now
    };

    bulkOps.push({
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
      talentName: existing.name
    });
    boundCount++;
  }

  // 执行批量更新
  if (bulkOps.length > 0) {
    await talentsCollection.bulkWrite(bulkOps, { ordered: false });
  }

  return successResponse({
    bound: boundCount,
    skipped: skippedCount,
    failed: errors.length,
    results,
    errors
  });
}

// ==================== unbindAgency 操作 ====================

/**
 * 批量解绑机构
 *
 * @param {Object} db - 数据库实例
 * @param {string} platform - 平台
 * @param {Object} data - 解绑数据
 * @param {Array} data.talents - 待解绑的达人列表 [{ oneId }]
 */
async function handleUnbindAgency(db, platform, data) {
  const { talents } = data;

  if (!Array.isArray(talents) || talents.length === 0) {
    return errorResponse(400, 'talents 数组不能为空');
  }

  if (talents.length > 200) {
    return errorResponse(400, '单次解绑数量不能超过 200 条');
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);

  const oneIds = talents.map(t => t.oneId).filter(Boolean);
  if (oneIds.length === 0) {
    return errorResponse(400, 'talents 数组中缺少有效的 oneId');
  }

  // 批量查询达人
  const existingTalents = await talentsCollection.find(
    { oneId: { $in: oneIds }, platform },
    { projection: { oneId: 1, agencyId: 1 } }
  ).toArray();

  const existingMap = new Map(existingTalents.map(t => [t.oneId, t]));

  const bulkOps = [];
  const errors = [];
  let unboundCount = 0;
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
      continue; // 静默跳过，不计入错误
    }

    // 构建更新操作
    const updatePayload = {
      agencyId: 'individual',
      rebateMode: 'independent', // 解绑后切换为独立返点模式
      updatedAt: now
    };

    bulkOps.push({
      updateOne: {
        filter: { oneId, platform },
        update: { $set: updatePayload }
      }
    });
    unboundCount++;
  }

  // 执行批量更新
  if (bulkOps.length > 0) {
    await talentsCollection.bulkWrite(bulkOps, { ordered: false });
  }

  return successResponse({
    unbound: unboundCount,
    failed: errors.length,
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

      default:
        return errorResponse(400, `不支持的操作类型: ${operation}，支持: match, bindAgency, bindAgencyByName, unbindAgency`);
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
