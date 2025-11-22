/**
 * [生产版 v1.0 - 客户管理 RESTful API]
 * 云函数：customers
 * 描述：统一的客户管理 RESTful API，支持客户信息的增删改查和价格策略配置
 *
 * --- v1.0 更新日志 (2024-11-22) ---
 * - [新功能] 实现完整的 RESTful API 设计
 * - [支持操作] GET（列表/详情）、POST（创建）、PUT（更新）、DELETE（软删除）
 * - [双ID支持] 支持 MongoDB ObjectId 和业务编码（CUS20240001）查询
 * - [自动编码] 创建客户时自动生成唯一编码
 * - [支付系数] 自动计算各平台的支付系数
 * - [价格历史] 记录所有价格策略变更历史
 * - [软删除] 删除操作仅更新状态，不物理删除数据
 * - [CORS支持] 完整的跨域请求支持
 * ---------------------
 */

const { MongoClient, ObjectId } = require('mongodb');

// 环境变量
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'agentworks_db';

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
        return await deleteCustomer(customerId);

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
    if (status) query.status = status;

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

    // 重新计算支付系数
    if (customer.businessStrategies?.talentProcurement?.enabled) {
      customer.businessStrategies.talentProcurement.paymentCoefficients =
        calculateAllCoefficients(customer.businessStrategies.talentProcurement);
    }

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

    // 如果更新了业务策略，重新计算支付系数
    if (fieldsToUpdate.businessStrategies?.talentProcurement?.enabled) {
      fieldsToUpdate.businessStrategies.talentProcurement.paymentCoefficients =
        calculateAllCoefficients(fieldsToUpdate.businessStrategies.talentProcurement);
    }

    // 添加更新时间和更新人
    fieldsToUpdate.updatedAt = new Date();
    fieldsToUpdate.updatedBy = headers['user-id'] || 'system';

    // 执行更新
    const result = await collection.findOneAndUpdate(
      query,
      { $set: fieldsToUpdate },
      { returnDocument: 'after' }
    );

    if (!result.value) {
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

    return successResponse(result.value, 200, '客户信息更新成功');

  } finally {
    if (client) await client.close();
  }
}

/**
 * 删除客户（可选功能）
 */
async function deleteCustomer(id) {
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

    if (!result.value) {
      return errorResponse(404, '客户不存在');
    }

    return successResponse({ message: '客户已删除' });

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
 * 获取默认业务策略
 */
function getDefaultBusinessStrategies() {
  return {
    talentProcurement: {
      enabled: false,
      pricingModel: 'framework',
      discount: {
        rate: 1.0,
        includesPlatformFee: false
      },
      serviceFee: {
        rate: 0,
        calculationBase: 'beforeDiscount'
      },
      platformFees: {
        douyin: { enabled: false, rate: 0.05 },
        xiaohongshu: { enabled: false, rate: 0.10 }
      },
      dimensions: {
        byPlatform: true,
        byTalentLevel: false,
        byContentType: false
      }
    }
  };
}

/**
 * 计算所有平台的支付系数
 */
function calculateAllCoefficients(strategy) {
  const coefficients = {};
  const platforms = ['douyin', 'xiaohongshu'];

  for (const platform of platforms) {
    const platformFee = strategy.platformFees?.[platform];
    if (platformFee?.enabled && platformFee.rate !== null) {
      coefficients[platform] = calculateCoefficient(
        strategy.discount,
        strategy.serviceFee,
        platformFee.rate
      );
    }
  }

  return coefficients;
}

/**
 * 计算单个支付系数
 */
function calculateCoefficient(discount, serviceFee, platformFeeRate) {
  const baseAmount = 1000;
  let finalAmount = baseAmount;

  const platformFeeAmount = baseAmount * platformFeeRate;

  if (discount.includesPlatformFee) {
    finalAmount = (baseAmount + platformFeeAmount) * discount.rate;
  } else {
    finalAmount = baseAmount * discount.rate + platformFeeAmount;
  }

  if (serviceFee.calculationBase === 'beforeDiscount') {
    finalAmount = finalAmount + (baseAmount + platformFeeAmount) * serviceFee.rate;
  } else {
    finalAmount = finalAmount * (1 + serviceFee.rate);
  }

  return Number((finalAmount / baseAmount).toFixed(4));
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