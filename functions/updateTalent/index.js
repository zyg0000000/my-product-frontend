/**
 * [生产版 v3.0 - v1/v2 双版本架构支持]
 * 云函数：updateTalent
 * 描述：更新指定达人的基础信息。
 *
 * --- v3.0 更新日志 (2025-11-14) ---
 * - [架构升级] 支持 v1/v2 双数据库版本
 * - [安全增强] v2 必须同时提供 oneId 和 platform，防止误操作
 * - [多平台支持] v2 按 (oneId, platform) 精确更新单个平台数据
 * - [向后兼容] 完全保留 v1 逻辑，确保旧产品正常运行
 *
 * --- v2.2 更新日志 ---
 * - [BUG修复] 移除了对 xingtuId 字段的更新限制，允许前端修改达人星图ID。
 *
 * --- v2.1 更新日志 ---
 * - [规范统一] 更新了环境变量和配置读取方式，与项目最新标准对齐。
 * - [规范统一] 将接收的ID字段从 "talentId" 统一为 "id"，与其他update接口保持一致。
 * ---------------------
 * 触发器：API 网关, 通过 PUT /update-talent 路径调用。
 * 遵循《KOL项目后端开发核心原则与避坑指南 v3.0》。
 */

const { MongoClient } = require('mongodb');

// [规范统一] 从环境变量中获取配置，并提供默认值
const MONGO_URI = process.env.MONGO_URI;
const TALENTS_COLLECTION = process.env.MONGO_TALENTS_COLLECTION || 'talents';

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
async function handleV1Update(db, inputData, headers) {
  const { id, ...updateFields } = inputData;

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '请求体中缺少达人ID (id)。' })
    };
  }

  // [安全设计] 不允许通过此接口修改程序内部ID和数据库主键
  delete updateFields.id;
  delete updateFields._id;

  if (Object.keys(updateFields).length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '请求体中缺少需要更新的字段。' })
    };
  }

  const collection = db.collection(TALENTS_COLLECTION);

  const updatePayload = {
    $set: {
      ...updateFields,
      updatedAt: new Date()
    }
  };

  const result = await collection.updateOne(
    { id: id },
    updatePayload
  );

  if (result.matchedCount === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, message: `ID为 '${id}' 的达人不存在。` })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: '达人信息更新成功。' }),
  };
}

/**
 * ========== v2 处理逻辑 ==========
 * 支持多平台架构，按 (oneId, platform) 精确更新
 */
async function handleV2Update(db, inputData, headers) {
  const { oneId, platform, ...updateFields } = inputData;

  // [安全增强] v2 必须同时提供 oneId 和 platform
  if (!oneId || !platform) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'v2 版本必须同时提供 oneId 和 platform 参数。',
        hint: '如需批量更新多个平台，请使用 batchUpdateTalents 函数。'
      })
    };
  }

  // [安全设计] 不允许修改标识字段
  delete updateFields.oneId;
  delete updateFields.platform;
  delete updateFields._id;

  if (Object.keys(updateFields).length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '请求体中缺少需要更新的字段。' })
    };
  }

  const collection = db.collection(TALENTS_COLLECTION);

  const updatePayload = {
    $set: {
      ...updateFields,
      updatedAt: new Date()
    }
  };

  // [多平台支持] 按 (oneId, platform) 精确匹配
  const result = await collection.updateOne(
    { oneId: oneId, platform: platform },
    updatePayload
  );

  if (result.matchedCount === 0) {
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
      message: '达人信息更新成功。',
      updated: { oneId, platform }
    }),
  };
}

/**
 * ========== 主处理函数 ==========
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // --- [原则 2.1] 双源数据读取 ---
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
      return await handleV2Update(db, inputData, headers);
    } else {
      return await handleV1Update(db, inputData, headers);
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
