/**
 * [生产版 v2.0 - v1/v2 双版本架构支持]
 * 云函数：deleteTalent
 * 描述：删除一个指定的达人，并级联删除所有相关的合作记录。
 *
 * --- v2.0 更新日志 (2025-11-14) ---
 * - [架构升级] 支持 v1/v2 双数据库版本
 * - [安全增强] v2 删除单平台需提供 (oneId, platform)
 * - [安全增强] v2 删除所有平台需明确传递 deleteAll: true
 * - [多平台支持] v2 可精确删除某个平台的达人记录
 * - [向后兼容] 完全保留 v1 逻辑，确保旧产品正常运行
 * ---------------------
 * 触发器：API 网关, 通过 DELETE /delete-talent 调用。
 */

const { MongoClient } = require('mongodb');

// 从环境变量中获取数据库连接字符串
const MONGO_URI = process.env.MONGO_URI;
const COLLABS_COLLECTION = 'collaborations';
const TALENTS_COLLECTION = 'talents';

let client;

async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

/**
 * ========== v1 处理逻辑 ==========
 * 保持原有逻辑不变，确保旧产品（byteproject）正常运行
 */
async function handleV1Delete(db, inputData, headers) {
  const { talentId } = inputData;

  if (!talentId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '请求体中缺少必要的字段 (talentId)。' })
    };
  }

  const collabsCollection = db.collection(COLLABS_COLLECTION);
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  // 1. 先删除所有相关的合作记录
  const collabDeletionResult = await collabsCollection.deleteMany({ talentId: talentId });

  // 2. 再删除达人本身
  const talentDeletionResult = await talentsCollection.deleteOne({ id: talentId });

  if (talentDeletionResult.deletedCount === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        message: `达人ID '${talentId}' 未找到，无法删除。`
      })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: `达人删除成功，同时清理了 ${collabDeletionResult.deletedCount} 条关联的合作记录。`
    }),
  };
}

/**
 * ========== v2 处理逻辑 ==========
 * 支持多平台架构，可删除单个平台或所有平台
 */
async function handleV2Delete(db, inputData, headers) {
  const { oneId, platform, deleteAll } = inputData;

  // [安全增强] 必须提供 oneId
  if (!oneId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'v2 版本必须提供 oneId 参数。'
      })
    };
  }

  const talentsCollection = db.collection(TALENTS_COLLECTION);

  // 场景 1: 删除单个平台
  if (platform) {
    const result = await talentsCollection.deleteOne({
      oneId: oneId,
      platform: platform
    });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `未找到 oneId='${oneId}' 且 platform='${platform}' 的达人记录。`
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `成功删除 oneId='${oneId}' 在 ${platform} 平台的达人记录。`,
        deleted: { oneId, platform }
      }),
    };
  }

  // 场景 2: 删除所有平台（需要明确确认）
  if (deleteAll === true || deleteAll === 'true') {
    const result = await talentsCollection.deleteMany({ oneId: oneId });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `未找到 oneId='${oneId}' 的任何达人记录。`
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `成功删除 oneId='${oneId}' 在所有平台的达人记录（共 ${result.deletedCount} 条）。`,
        deleted: { oneId, platformCount: result.deletedCount }
      }),
    };
  }

  // 场景 3: 参数不完整（既没有 platform 也没有 deleteAll）
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      success: false,
      message: 'v2 版本删除操作需要指定：',
      options: [
        '1. 删除单个平台：提供 { oneId, platform }',
        '2. 删除所有平台：提供 { oneId, deleteAll: true }'
      ]
    })
  };
}

/**
 * ========== 主处理函数 ==========
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    let inputData = {};
    if (event.body) {
      try {
        inputData = JSON.parse(event.body);
      } catch(e) {
        /* ignore */
      }
    }
    if (Object.keys(inputData).length === 0 && event.queryStringParameters) {
      inputData = event.queryStringParameters;
    }

    // [架构升级] 根据 dbVersion 参数确定使用哪个数据库
    const dbVersion = inputData.dbVersion || 'v1';
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 路由到对应的版本处理函数
    if (dbVersion === 'v2') {
      return await handleV2Delete(db, inputData, headers);
    } else {
      return await handleV1Delete(db, inputData, headers);
    }

  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: error.message
      })
    };
  }
};
