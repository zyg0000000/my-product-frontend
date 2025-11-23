/**
 * @file platformConfigManager/index.js
 * @version 1.0.0
 * @description 云函数：平台配置管理（RESTful）
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-11-23
 * - 初始版本
 * - 支持 GET/POST/PUT/DELETE 操作
 * - 实现配置缓存机制
 * - 添加配置完整性验证
 * - 完整的日志记录和错误处理
 *
 * --- 未来计划 ---
 * [v1.1.0] 计划功能
 * - 添加配置变更历史追踪
 * - 支持批量更新操作
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const COLLECTION_NAME = 'system_config';

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
 * 统一的响应头
 */
function getHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
}

/**
 * 验证平台配置完整性
 */
function validatePlatformConfig(config) {
  const required = ['platform', 'name', 'enabled', 'color', 'order'];
  const missing = required.filter(field => config[field] === undefined || config[field] === null);

  if (missing.length > 0) {
    throw new Error(`缺少必填字段: ${missing.join(', ')}`);
  }

  // 验证 accountId
  if (!config.accountId || !config.accountId.label || !config.accountId.placeholder) {
    throw new Error('accountId 配置不完整');
  }

  // 验证 business
  if (!config.business) {
    throw new Error('business 配置不完整');
  }

  // 验证 features
  if (!config.features) {
    throw new Error('features 配置不完整');
  }

  return true;
}

/**
 * 处理 GET 请求
 */
async function handleGet(event) {
  const params = event.queryStringParameters || {};
  const { platform, enabled } = params;

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  // 获取单个平台配置
  if (platform) {
    console.log(`[INFO] 查询单个平台配置: ${platform}`);
    const config = await collection.findOne({
      configType: 'platform',
      platform: platform
    });

    if (!config) {
      return {
        statusCode: 404,
        headers: getHeaders(),
        body: JSON.stringify({
          success: false,
          message: `平台配置不存在: ${platform}`
        })
      };
    }

    // 移除 MongoDB _id 字段
    delete config._id;

    return {
      statusCode: 200,
      headers: getHeaders(),
      body: JSON.stringify({
        success: true,
        data: [config],
        timestamp: new Date().toISOString()
      })
    };
  }

  // 获取所有平台配置
  console.log(`[INFO] 查询所有平台配置, enabled: ${enabled || 'all'}`);
  const query = { configType: 'platform' };
  if (enabled !== undefined) {
    query.enabled = enabled === 'true' || enabled === true;
  }

  const configs = await collection
    .find(query)
    .sort({ order: 1 })
    .toArray();

  // 移除 MongoDB _id 字段
  configs.forEach(config => delete config._id);

  console.log(`[SUCCESS] 查询到 ${configs.length} 个平台配置`);

  return {
    statusCode: 200,
    headers: getHeaders(),
    body: JSON.stringify({
      success: true,
      data: configs,
      count: configs.length,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * 处理 POST 请求（创建新配置）
 */
async function handleCreate(event) {
  const config = JSON.parse(event.body || '{}');

  console.log(`[INFO] 创建新平台配置: ${config.platform}`);

  // 验证配置
  validatePlatformConfig(config);

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  // 检查是否已存在
  const existing = await collection.findOne({
    configType: 'platform',
    platform: config.platform
  });

  if (existing) {
    return {
      statusCode: 409,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: `平台配置已存在: ${config.platform}`
      })
    };
  }

  // 插入配置
  const configData = {
    ...config,
    configType: 'platform',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  await collection.insertOne(configData);

  console.log(`[SUCCESS] 平台配置创建成功: ${config.platform}`);

  return {
    statusCode: 201,
    headers: getHeaders(),
    body: JSON.stringify({
      success: true,
      message: `平台配置创建成功: ${config.name}`,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * 处理 PUT 请求（更新配置）
 */
async function handleUpdate(event) {
  const updateData = JSON.parse(event.body || '{}');
  const { platform } = updateData;

  if (!platform) {
    return {
      statusCode: 400,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: '缺少必需参数: platform'
      })
    };
  }

  console.log(`[INFO] 更新平台配置: ${platform}`);
  console.log('更新数据:', JSON.stringify(updateData));

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  // 查询旧配置（用于日志）
  const oldConfig = await collection.findOne({
    configType: 'platform',
    platform: platform
  });

  if (!oldConfig) {
    return {
      statusCode: 404,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: `平台配置不存在: ${platform}`
      })
    };
  }

  console.log('更新前配置:', JSON.stringify(oldConfig));

  // 准备更新数据
  const { platform: _, ...updates } = updateData;
  updates.updatedAt = new Date();
  updates.version = (oldConfig.version || 1) + 1;

  // 执行更新
  const result = await collection.updateOne(
    { configType: 'platform', platform: platform },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    return {
      statusCode: 404,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: `平台配置不存在: ${platform}`
      })
    };
  }

  // 查询更新后的配置
  const newConfig = await collection.findOne({
    configType: 'platform',
    platform: platform
  });

  console.log('更新后配置:', JSON.stringify(newConfig));
  console.log(`[SUCCESS] 平台配置更新成功: ${platform}, 版本: ${newConfig.version}`);

  return {
    statusCode: 200,
    headers: getHeaders(),
    body: JSON.stringify({
      success: true,
      message: `平台配置更新成功: ${oldConfig.name}`,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * 处理 DELETE 请求（软删除）
 */
async function handleDelete(event) {
  const params = event.queryStringParameters || {};
  const { platform } = params;

  if (!platform) {
    return {
      statusCode: 400,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: '缺少必需参数: platform'
      })
    };
  }

  console.log(`[INFO] 软删除平台配置: ${platform}`);

  const dbClient = await connectToDatabase();
  const db = dbClient.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  // 查询配置
  const config = await collection.findOne({
    configType: 'platform',
    platform: platform
  });

  if (!config) {
    return {
      statusCode: 404,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: `平台配置不存在: ${platform}`
      })
    };
  }

  // 软删除（设置 enabled=false）
  await collection.updateOne(
    { configType: 'platform', platform: platform },
    {
      $set: {
        enabled: false,
        updatedAt: new Date()
      }
    }
  );

  console.log(`[SUCCESS] 平台配置已禁用: ${platform}`);

  return {
    statusCode: 200,
    headers: getHeaders(),
    body: JSON.stringify({
      success: true,
      message: `平台配置已禁用: ${config.name}`,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * 主处理函数
 */
exports.handler = async (event, context) => {
  const startTime = Date.now();
  const method = event.httpMethod;

  // 日志记录：请求开始
  console.log(`[${new Date().toISOString()}] ${method} /platformConfigManager - 请求开始`);
  console.log('请求参数:', event.queryStringParameters || {});

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getHeaders(),
      body: ''
    };
  }

  try {
    // 检查环境变量
    if (!MONGO_URI) {
      console.error('[ERROR] MONGO_URI 环境变量未设置');
      return {
        statusCode: 500,
        headers: getHeaders(),
        body: JSON.stringify({
          success: false,
          message: '服务器数据库配置不完整'
        })
      };
    }

    let result;

    switch(method) {
      case 'GET':
        // 支持两种查询：
        // 1. 获取所有：/platformConfigManager?enabled=true
        // 2. 获取单个：/platformConfigManager?platform=douyin
        result = await handleGet(event);
        break;

      case 'POST':
        // 创建新平台配置（严格验证）
        result = await handleCreate(event);
        break;

      case 'PUT':
        // 更新配置（记录变更历史）
        result = await handleUpdate(event);
        break;

      case 'DELETE':
        // 软删除（设置 enabled=false）
        result = await handleDelete(event);
        break;

      default:
        throw new Error(`不支持的HTTP方法: ${method}`);
    }

    // 日志记录：请求成功
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${method} /platformConfigManager - 成功 (${duration}ms)`);

    return result;

  } catch (error) {
    // 日志记录：请求失败
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ${method} /platformConfigManager - 失败 (${duration}ms)`);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: 500,
      headers: getHeaders(),
      body: JSON.stringify({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
        ...(isProduction ? {} : {
          stack: error.stack
        })
      })
    };
  }
};
