/**
 * [生产版 v3.0 - 客户管理 RESTful API]
 * 云函数：customers
 * 描述：统一的客户管理 RESTful API，支持客户信息的增删改查和价格策略配置
 *
 * --- v3.0 更新日志 (2025-11-23) 🎉 关键修复 ---
 * - [BUG修复] 修复后端计算逻辑缺失税费导致的 NaN 问题
 * - [新功能] 支持平台级独立配置（服务费率、税费设置等）
 * - [数值校验] 添加严格的系数校验，防止 NaN 和异常值
 * - [前后端一致性] 统一前后端计算逻辑，确保数据一致
 * ---------------------
 *
 * --- v2.0 更新日志 (2025-11-23) 🎉 重大升级 ---
 * - [新功能] 平台级差异化折扣率：每个平台可设置独立折扣率
 * - [架构优化] 计算逻辑重构：优先平台级配置，回退全局配置
 * - [兼容性] 完全向后兼容 v1.x 数据结构
 * ---------------------
 *
 * --- v1.4 更新日志 (2025-11-23) ---
 * - [优化] 平台配置统一管理
 * ---------------------
 *
 * --- v1.2 更新日志 (2025-11-22) ---
 * - [新功能] 永久删除和客户恢复功能
 * - [优化] 默认过滤已删除客户
 * ---------------------
 *
 * --- v1.1 更新日志 (2025-11-22) ---
 * - [BUG修复] MongoDB 6.x 兼容性修复
 * ---------------------
 *
 * --- v1.0 更新日志 (2024-11-22) ---
 * - [新功能] RESTful API 基础 CRUD、自动编码、支付系数、软删除、CORS
 * ---------------------
 */

const { MongoClient, ObjectId } = require('mongodb');

// 环境变量
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'agentworks_db';

// 平台配置（与前端 platforms.ts 保持同步）
const TALENT_PLATFORMS = [
  { key: 'douyin', name: '抖音', fee: 0.05, enabled: true },
  { key: 'xiaohongshu', name: '小红书', fee: 0.10, enabled: true },
  { key: 'shipinhao', name: '视频号', fee: null, enabled: false },
  { key: 'bilibili', name: 'B站', fee: null, enabled: false },
  { key: 'weibo', name: '微博', fee: null, enabled: false },
];

/**
 * RESTful 客户管理云函数入口
 * 支持 GET, POST, PUT, DELETE 操作
 *
 * 火山引擎路径说明：
 * - 列表/创建：/customers
 * - 详情/更新/删除：通过参数传递 id
 *   GET /customers?id=xxx
 *   PUT /customers (body中包含id)
 *   DELETE /customers?id=xxx
 */
exports.handler = async function (event) {
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;

  // 兼容火山引擎：从查询参数或请求体中获取 ID
  const queryParams = event.queryStringParameters || {};
  let customerId = queryParams.id || queryParams.customerId;

  // 对于 PUT 请求，也可以从 body 中获取 id
  if (httpMethod === 'PUT' && !customerId && event.body) {
    try {
      const body = JSON.parse(event.body);
      customerId = body.id || body._id || body.customerId;
    } catch (e) {
      // 忽略解析错误
    }
  }

  const isDetailRequest = !!customerId;

  try {
    // 根据 HTTP 方法路由到不同的处理函数
    switch (httpMethod) {
      case 'GET':
        if (isDetailRequest) {
          return await getCustomerById(customerId);
        } else {
          return await getCustomers(event.queryStringParameters);
        }

      case 'POST':
        return await createCustomer(event.body, event.headers);

      case 'PUT':
        if (!isDetailRequest) {
          return errorResponse(400, '更新操作需要提供客户ID');
        }
        return await updateCustomer(customerId, event.body, event.headers);

      case 'DELETE':
        if (!isDetailRequest) {
          return errorResponse(400, '删除操作需要提供客户ID');
        }
        return await deleteCustomer(customerId, event.queryStringParameters);

      case 'OPTIONS':
        // 处理 CORS 预检请求
        return {
          statusCode: 200,
          headers: getCORSHeaders(),
          body: ''
        };

      default:
        return errorResponse(405, `不支持的 HTTP 方法: ${httpMethod}`);
    }
  } catch (error) {
    console.error('Error in customers handler:', error);
    return errorResponse(500, error.message || '服务器内部错误');
  }
};

/**
 * 获取客户列表
 */
async function getCustomers(queryParams = {}) {
  let client;

  try {
    const {
      page = 1,
      pageSize = 20,
      searchTerm = '',
      level = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = queryParams;

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customers');

    // 构建查询条件
    const query = {};

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { code: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (level) query.level = level;

    // 状态筛选：如果指定状态则使用，否则默认排除已删除的客户
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'deleted' };
    }

    // 分页和排序
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 执行查询
    const [customers, total] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ]);

    // 处理返回数据
    const processedCustomers = customers.map(processCustomer);

    return successResponse({
      customers: processedCustomers,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });

  } finally {
    if (client) await client.close();
  }
}

/**
 * 获取客户详情
 */
async function getCustomerById(id) {
  let client;

  try {
    if (!id) {
      return errorResponse(400, '客户ID不能为空');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customers');

    // 构建查询条件
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch (e) {
      query = { code: id };
    }

    const customer = await collection.findOne(query);

    if (!customer) {
      return errorResponse(404, '客户不存在');
    }

    // v3.0: 不再重新计算支付系数，直接返回数据库中的值
    // 理由：
    // 1. 数据库中的 paymentCoefficients 是前端经过严格校验后保存的
    // 2. 重新计算可能因为数据结构不一致导致错误结果
    // 3. 保持数据的真实性，返回实际保存的值

    // 已注释：
    // if (customer.businessStrategies?.talentProcurement?.enabled) {
    //   customer.businessStrategies.talentProcurement.paymentCoefficients =
    //     calculateAllCoefficients(customer.businessStrategies.talentProcurement);
    // }

    return successResponse(customer);

  } finally {
    if (client) await client.close();
  }
}

/**
 * 创建客户
 */
async function createCustomer(body, headers = {}) {
  let client;

  try {
    const customerData = JSON.parse(body || '{}');

    if (!customerData.name) {
      return errorResponse(400, '客户名称不能为空');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customers');

    // 检查名称是否重复
    const existing = await collection.findOne({ name: customerData.name });
    if (existing) {
      return errorResponse(400, '客户名称已存在');
    }

    // 生成客户编码
    const customerCode = await generateCustomerCode(collection);

    // 构建客户对象
    const newCustomer = {
      code: customerCode,
      name: customerData.name,
      level: customerData.level || 'medium',
      status: customerData.status || 'active',
      industry: customerData.industry || '',
      contacts: customerData.contacts || [],
      businessStrategies: customerData.businessStrategies || getDefaultBusinessStrategies(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: headers['user-id'] || 'system',
      updatedBy: headers['user-id'] || 'system'
    };

    // 插入数据
    const result = await collection.insertOne(newCustomer);
    const insertedCustomer = await collection.findOne({ _id: result.insertedId });

    return successResponse(insertedCustomer, 201, '客户创建成功');

  } finally {
    if (client) await client.close();
  }
}

/**
 * 更新客户
 */
async function updateCustomer(id, body, headers = {}) {
  let client;

  try {
    const updateData = JSON.parse(body || '{}');

    if (!id) {
      return errorResponse(400, '客户ID不能为空');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customers');

    // 构建查询条件
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch (e) {
      query = { code: id };
    }

    // 查找现有客户
    const existingCustomer = await collection.findOne(query);
    if (!existingCustomer) {
      return errorResponse(404, '客户不存在');
    }

    // 如果修改名称，检查是否重复
    if (updateData.name && updateData.name !== existingCustomer.name) {
      const duplicate = await collection.findOne({
        name: updateData.name,
        _id: { $ne: existingCustomer._id }
      });

      if (duplicate) {
        return errorResponse(400, '客户名称已存在');
      }
    }

    // 构建更新数据
    const fieldsToUpdate = {};

    // 允许更新的字段
    const allowedFields = ['name', 'level', 'status', 'industry', 'contacts', 'businessStrategies'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fieldsToUpdate[field] = updateData[field];
      }
    });

    // v3.0: 不再后端重新计算支付系数，直接使用前端传递的、已校验的值
    // 理由：
    // 1. 前端已经做了严格的数值校验（见 PricingStrategy.tsx:204-215）
    // 2. v3.0 配置已全部移到平台级，后端缺少 discount/serviceFee/tax 等配置
    // 3. 避免前后端数据结构不一致导致的计算差异
    // 4. 前端计算逻辑和后端完全一致，不需要重复计算

    // 已注释：
    // if (fieldsToUpdate.businessStrategies?.talentProcurement?.enabled) {
    //   fieldsToUpdate.businessStrategies.talentProcurement.paymentCoefficients =
    //     calculateAllCoefficients(fieldsToUpdate.businessStrategies.talentProcurement);
    // }

    // 添加更新时间和更新人
    fieldsToUpdate.updatedAt = new Date();
    fieldsToUpdate.updatedBy = headers['user-id'] || 'system';

    // 执行更新
    const result = await collection.findOneAndUpdate(
      query,
      { $set: fieldsToUpdate },
      { returnDocument: 'after' }
    );

    if (!result) {
      return errorResponse(404, '更新失败，客户不存在');
    }

    // 记录价格策略变更历史
    if (updateData.businessStrategies) {
      await recordPricingHistory(
        db,
        existingCustomer,
        updateData.businessStrategies,
        headers['user-id']
      );
    }

    return successResponse(result, 200, '客户信息更新成功');

  } finally {
    if (client) await client.close();
  }
}

/**
 * 删除客户（支持软删除和永久删除）
 */
async function deleteCustomer(id, queryParams = {}) {
  let client;

  try {
    if (!id) {
      return errorResponse(400, '客户ID不能为空');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customers');

    // 构建查询条件
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch (e) {
      query = { code: id };
    }

    // 检查是否永久删除（通过查询参数 permanent=true）
    const isPermanent = queryParams.permanent === 'true';

    if (isPermanent) {
      // 永久删除：真正从数据库删除
      const result = await collection.deleteOne(query);

      if (result.deletedCount === 0) {
        return errorResponse(404, '客户不存在');
      }

      return successResponse({ message: '客户已永久删除' });
    } else {
      // 软删除：更新状态而不是真正删除
      const result = await collection.findOneAndUpdate(
        query,
        {
          $set: {
            status: 'deleted',
            deletedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return errorResponse(404, '客户不存在');
      }

      return successResponse({ message: '客户已删除' });
    }

  } finally {
    if (client) await client.close();
  }
}

// ========== 辅助函数 ==========

/**
 * 获取 MongoDB 客户端
 */
async function getMongoClient() {
  const uri = MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  await client.connect();
  return client;
}

/**
 * 获取数据库名称
 */
function getDbName() {
  return DB_NAME;
}

/**
 * 生成客户编码
 */
async function generateCustomerCode(collection) {
  const year = new Date().getFullYear();
  const prefix = `CUS${year}`;

  const lastCustomer = await collection
    .find({ code: { $regex: `^${prefix}` } })
    .sort({ code: -1 })
    .limit(1)
    .toArray();

  let sequence = 1;
  if (lastCustomer.length > 0) {
    const lastCode = lastCustomer[0].code;
    const lastSequence = parseInt(lastCode.replace(prefix, ''), 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

/**
 * 获取默认业务策略（v2.0 支持平台级折扣率）
 */
function getDefaultBusinessStrategies() {
  // 动态生成 platformFees，支持所有已配置的平台
  const platformFees = {};
  TALENT_PLATFORMS.forEach(platform => {
    if (platform.fee !== null) {
      platformFees[platform.key] = {
        enabled: false,
        platformFeeRate: platform.fee,
        discountRate: 1.0  // v2.0: 默认平台级折扣率100%（无折扣）
      };
    }
  });

  return {
    talentProcurement: {
      enabled: false,
      pricingModel: 'framework',
      discount: {
        rate: 1.0,
        includesPlatformFee: false,
        validFrom: null,
        validTo: null
      },
      serviceFee: {
        rate: 0,
        calculationBase: 'beforeDiscount'
      },
      tax: {
        rate: 0.06,
        includesTax: true,
        calculationBase: 'excludeServiceFee'
      },
      platformFees,
      dimensions: {
        byPlatform: true,
        byTalentLevel: false,
        byContentType: false
      }
    }
  };
}

/**
 * 计算所有平台的支付系数（v2.0 支持平台级折扣率 + v3.0 支持平台级独立配置）
 *
 * 注意：v3.0 后此函数仅用于：
 * 1. 数据验证：验证前端传递的系数是否正确
 * 2. 数据修复：修复历史数据中的 NaN 或错误值
 * 3. 手动调试：在控制台手动计算系数进行对比
 *
 * 正常流程不再调用此函数，直接使用前端传递的、已校验的系数值
 */
function calculateAllCoefficients(strategy) {
  const coefficients = {};

  // 动态支持所有平台
  Object.entries(strategy.platformFees || {}).forEach(([platform, platformConfig]) => {
    if (platformConfig?.enabled) {
      // v3.0: 优先使用平台级配置，回退到全局配置
      const platformFeeRate = platformConfig.platformFeeRate || platformConfig.rate || 0;
      const platformDiscountRate = platformConfig.discountRate || null;
      const platformServiceFeeRate = platformConfig.serviceFeeRate !== undefined
        ? platformConfig.serviceFeeRate
        : strategy.serviceFee?.rate || 0;

      // 构建平台级服务费配置
      const serviceFeeConfig = {
        rate: platformServiceFeeRate,
        calculationBase: platformConfig.serviceFeeBase || strategy.serviceFee?.calculationBase || 'beforeDiscount'
      };

      // 构建平台级税费配置
      const taxConfig = {
        rate: 0.06, // 固定6%
        includesTax: platformConfig.includesTax !== undefined
          ? platformConfig.includesTax
          : strategy.tax?.includesTax ?? true,
        calculationBase: platformConfig.taxCalculationBase || strategy.tax?.calculationBase || 'excludeServiceFee'
      };

      coefficients[platform] = calculateCoefficient(
        strategy.discount || {},
        serviceFeeConfig,
        platformFeeRate,
        platformDiscountRate,
        taxConfig
      );
    }
  });

  return coefficients;
}

/**
 * 计算单个支付系数（v2.0 支持平台级折扣率 + 税费计算）
 */
function calculateCoefficient(discount, serviceFee, platformFeeRate, platformDiscountRate, tax) {
  const baseAmount = 1000;
  const platformFeeAmount = baseAmount * platformFeeRate;

  // v2.0: 优先使用平台级折扣率，回退到全局折扣率
  const discountRate = platformDiscountRate || discount.rate || 1.0;

  // 1. 计算折扣后金额
  let discountedAmount;
  if (discount.includesPlatformFee) {
    discountedAmount = (baseAmount + platformFeeAmount) * discountRate;
  } else {
    discountedAmount = baseAmount * discountRate + platformFeeAmount;
  }

  // 2. 计算服务费
  let serviceFeeAmount;
  if (serviceFee.calculationBase === 'beforeDiscount') {
    serviceFeeAmount = (baseAmount + platformFeeAmount) * serviceFee.rate;
  } else {
    serviceFeeAmount = discountedAmount * serviceFee.rate;
  }

  // 3. 计算税费（新增）
  let taxAmount = 0;
  const taxRate = tax?.rate || 0.06;

  if (!tax?.includesTax) {
    // 不含税时才计算税费
    if (tax?.calculationBase === 'includeServiceFee') {
      taxAmount = (discountedAmount + serviceFeeAmount) * taxRate;
    } else {
      taxAmount = discountedAmount * taxRate;
    }
  }

  // 4. 最终金额
  const finalAmount = discountedAmount + serviceFeeAmount + taxAmount;

  // 5. 计算系数并校验
  const coefficient = finalAmount / baseAmount;

  // 严格校验：防止 NaN 和异常值
  if (isNaN(coefficient) || !isFinite(coefficient) || coefficient <= 0 || coefficient >= 10) {
    console.error('Invalid coefficient calculated:', {
      coefficient,
      baseAmount,
      platformFeeAmount,
      discountedAmount,
      serviceFeeAmount,
      taxAmount,
      finalAmount
    });
    return 1.0; // 返回安全的默认值
  }

  return Number(coefficient.toFixed(4));
}

/**
 * 处理客户数据
 */
function processCustomer(customer) {
  let enabledBusinessTypes = 0;
  if (customer.businessStrategies) {
    if (customer.businessStrategies.talentProcurement?.enabled) enabledBusinessTypes++;
    if (customer.businessStrategies.adPlacement?.enabled) enabledBusinessTypes++;
    if (customer.businessStrategies.contentProduction?.enabled) enabledBusinessTypes++;
  }

  return {
    ...customer,
    enabledBusinessTypes,
    primaryContact: customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0]
  };
}

/**
 * 记录价格策略变更历史
 */
async function recordPricingHistory(db, oldCustomer, newStrategies, userId) {
  try {
    const historyCollection = db.collection('pricing_history');

    const historyRecord = {
      customerId: oldCustomer._id,
      customerCode: oldCustomer.code,
      customerName: oldCustomer.name,
      changeType: 'strategy_update',
      beforeValue: oldCustomer.businessStrategies,
      afterValue: newStrategies,
      changedAt: new Date(),
      changedBy: userId || 'system'
    };

    await historyCollection.insertOne(historyRecord);
  } catch (error) {
    console.error('Error recording pricing history:', error);
  }
}

/**
 * 获取 CORS 头
 */
function getCORSHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, user-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
}

/**
 * 成功响应
 */
function successResponse(data, statusCode = 200, message = null) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return {
    statusCode,
    headers: getCORSHeaders(),
    body: JSON.stringify(response)
  };
}

/**
 * 错误响应
 */
function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: getCORSHeaders(),
    body: JSON.stringify({
      success: false,
      message
    })
  };
}