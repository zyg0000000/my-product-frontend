/**
 * @file bulkCreateAgencies.js
 * @version 1.0
 * @description
 * 云函数: bulkCreateAgencies
 * 负责处理批量创建机构的请求。
 *
 * --- v1 更新日志 (2025-12-13) ---
 * - [新增] 批量创建机构功能
 * - [校验] 机构名称必填、数据库去重、批次内去重
 * - [默认值] type = 'agency', status = 'active'
 * - [限制] 单次批量最多 500 条
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const AGENCIES_COLLECTION = 'agencies';

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
 * 生成机构唯一 ID
 * 格式：agency_timestamp_randomString
 */
function generateAgencyId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `agency_${timestamp}_${random}`;
}

/**
 * 批量创建机构
 */
async function handleBulkCreate(collection, agenciesData, headers) {
  // 1. 验证数据条数限制
  if (agenciesData.length > 500) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: '单次批量创建上限为 500 条'
      })
    };
  }

  if (agenciesData.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: '请求体必须包含非空的 agencies 数组'
      })
    };
  }

  // 2. 提取所有传入的机构名称
  const incomingNames = agenciesData
    .map(a => a.name)
    .filter(name => name && name.trim())
    .map(name => name.trim());

  if (incomingNames.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: '提交的数据中缺少有效的机构名称'
      })
    };
  }

  // 3. 一次性查询数据库，找出所有已存在的机构名称
  const existingAgencies = await collection
    .find({
      name: { $in: incomingNames }
    })
    .project({ name: 1 })
    .toArray();
  const existingNameSet = new Set(existingAgencies.map(a => a.name));

  // 4. 检查批次内重复
  const batchNames = new Set();
  const agenciesToInsert = [];
  const errors = [];
  let failedCount = 0;

  for (const row of agenciesData) {
    const name = row.name ? row.name.trim() : '';

    // 校验必填字段
    if (!name) {
      failedCount++;
      errors.push({
        name: '未知',
        reason: '缺少机构名称'
      });
      continue;
    }

    // 检查数据库中是否已存在
    if (existingNameSet.has(name)) {
      failedCount++;
      errors.push({
        name: name,
        reason: '该机构名称已存在'
      });
      continue;
    }

    // 检查批次内是否重复
    if (batchNames.has(name)) {
      failedCount++;
      errors.push({
        name: name,
        reason: '批次内重复'
      });
      continue;
    }

    batchNames.add(name);

    // 构建机构文档
    const agencyDoc = {
      id: generateAgencyId(),
      name: name,
      type: 'agency', // 默认类型：机构
      status: 'active', // 默认状态：正常
      contactInfo: {}, // 空联系信息
      rebateConfig: {}, // 批量录入时不设置返点
      description: '', // 空备注
      createdAt: new Date(),
      updatedAt: new Date()
    };

    agenciesToInsert.push(agencyDoc);
  }

  // 5. 一次性批量插入
  let createdCount = 0;
  if (agenciesToInsert.length > 0) {
    const insertResult = await collection.insertMany(agenciesToInsert, {
      ordered: false
    });
    createdCount = insertResult.insertedCount;
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      message: '批量创建操作完成。',
      data: {
        created: createdCount,
        failed: failedCount,
        total: agenciesData.length,
        errors: errors
      }
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method Not Allowed'
      })
    };
  }

  try {
    const requestBody = JSON.parse(event.body || '{}');

    // 获取机构数据数组
    const agenciesData = requestBody.agencies || requestBody;
    if (!Array.isArray(agenciesData)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '请求体必须包含 agencies 数组'
        })
      };
    }

    const dbClient = await connectToDatabase();
    const collection = dbClient.db(DB_NAME).collection(AGENCIES_COLLECTION);

    return await handleBulkCreate(collection, agenciesData, headers);
  } catch (error) {
    console.error('[bulkCreateAgencies v1] 错误:', error);
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
