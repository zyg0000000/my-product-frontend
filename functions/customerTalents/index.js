/**
 * [生产版 v1.0 - 客户达人池 RESTful API]
 * 云函数：customerTalents
 * 描述：统一的客户达人池 RESTful API，实现客户与达人的多对多关联管理
 *
 * --- v1.0 更新日志 (2025-11-30) ---
 * - [新功能] 完整的 CRUD 操作（增删改查）
 * - [新功能] 批量添加达人到客户池
 * - [新功能] 各平台达人数统计
 * - [新功能] 按客户/达人双向查询
 * - [新功能] 重复校验和去重提示
 * ---------------------
 *
 * API 设计：
 * - GET  /customer-talents?customerId=xxx&platform=douyin  获取客户某平台的达人列表
 * - GET  /customer-talents?talentOneId=xxx                 获取达人所属的客户列表
 * - GET  /customer-talents/stats?customerId=xxx            获取客户各平台达人数统计
 * - POST /customer-talents                                 添加达人到客户池（支持批量）
 * - DELETE /customer-talents?id=xxx                        从客户池移除达人
 * - PATCH /customer-talents?id=xxx                         更新标签/备注
 */

const { MongoClient, ObjectId } = require('mongodb');

// 版本号
const VERSION = '1.0.0';

// 环境变量
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'agentworks_db';

/**
 * RESTful 客户达人池云函数入口
 */
exports.handler = async function (event) {
  console.log(`[v${VERSION}] customerTalents handler called`);

  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  const queryParams = event.queryStringParameters || {};

  // 特殊路由：stats 统计
  const path = event.path || event.requestContext?.http?.path || '';
  if (path.includes('/stats') || queryParams.action === 'stats') {
    return await getStats(queryParams);
  }

  try {
    switch (httpMethod) {
      case 'GET':
        return await getCustomerTalents(queryParams);

      case 'POST':
        return await addCustomerTalents(event.body, event.headers);

      case 'DELETE':
        return await removeCustomerTalent(queryParams.id, queryParams);

      case 'PATCH':
        return await updateCustomerTalent(queryParams.id, event.body);

      case 'OPTIONS':
        return {
          statusCode: 200,
          headers: getCORSHeaders(),
          body: ''
        };

      default:
        return errorResponse(405, `不支持的 HTTP 方法: ${httpMethod}`);
    }
  } catch (error) {
    console.error(`[v${VERSION}] Error in customerTalents handler:`, error);
    return errorResponse(500, error.message || '服务器内部错误');
  }
};

/**
 * 获取客户达人池列表
 * 支持两种查询方式：
 * 1. 按客户查达人：customerId + platform
 * 2. 按达人查客户：talentOneId + platform
 */
async function getCustomerTalents(queryParams = {}) {
  let client;

  try {
    const {
      customerId,
      talentOneId,
      platform,
      status = 'active',
      page = 1,
      pageSize = 50,
      sortBy = 'addedAt',
      sortOrder = 'desc',
      includeTalentInfo = 'true' // 是否关联查询达人信息
    } = queryParams;

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customer_talents');

    // 构建查询条件
    const query = {};

    if (customerId) {
      query.customerId = customerId;
    }

    if (talentOneId) {
      query.talentOneId = talentOneId;
    }

    if (platform) {
      query.platform = platform;
    }

    if (status) {
      query.status = status;
    }

    // 分页和排序
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 是否需要关联查询达人信息
    let results;
    let total;

    if (includeTalentInfo === 'true' && customerId) {
      // 使用聚合管道关联查询达人信息
      const pipeline = [
        { $match: query },
        { $sort: sort },
        {
          $lookup: {
            from: 'talents',
            let: { oneId: '$talentOneId', plat: '$platform' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$oneId', '$$oneId'] },
                      { $eq: ['$platform', '$$plat'] }
                    ]
                  }
                }
              }
            ],
            as: 'talentInfo'
          }
        },
        { $unwind: { path: '$talentInfo', preserveNullAndEmptyArrays: true } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit }
            ],
            total: [{ $count: 'count' }]
          }
        }
      ];

      const [result] = await collection.aggregate(pipeline).toArray();
      results = result.data;
      total = result.total[0]?.count || 0;
    } else {
      // 简单查询
      [results, total] = await Promise.all([
        collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
        collection.countDocuments(query)
      ]);
    }

    return successResponse({
      list: results,
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
 * 获取客户各平台达人数统计
 */
async function getStats(queryParams = {}) {
  let client;

  try {
    const { customerId } = queryParams;

    if (!customerId) {
      return errorResponse(400, '缺少必需参数: customerId');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customer_talents');

    // 按平台分组统计
    const stats = await collection.aggregate([
      {
        $match: {
          customerId,
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 转换为对象格式
    const platformStats = {};
    let totalCount = 0;
    stats.forEach(item => {
      platformStats[item._id] = item.count;
      totalCount += item.count;
    });

    return successResponse({
      customerId,
      platformStats,
      totalCount
    });

  } finally {
    if (client) await client.close();
  }
}

/**
 * 添加达人到客户池（支持批量）
 */
async function addCustomerTalents(body, headers = {}) {
  let client;

  try {
    const data = JSON.parse(body || '{}');

    const { customerId, platform, talents } = data;

    // 参数校验
    if (!customerId) {
      return errorResponse(400, '缺少必需参数: customerId');
    }

    if (!platform) {
      return errorResponse(400, '缺少必需参数: platform');
    }

    if (!talents || !Array.isArray(talents) || talents.length === 0) {
      return errorResponse(400, '缺少必需参数: talents (数组)');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customer_talents');

    // 验证客户是否存在
    const customer = await db.collection('customers').findOne({
      $or: [
        { code: customerId },
        { _id: tryObjectId(customerId) }
      ]
    });

    if (!customer) {
      return errorResponse(404, '客户不存在');
    }

    const addedBy = headers['user-id'] || 'system';
    const now = new Date();

    // 准备批量插入的数据
    const docsToInsert = [];
    const duplicates = [];
    const notFound = [];

    for (const talent of talents) {
      const talentOneId = talent.oneId || talent.talentOneId;
      const tags = talent.tags || [];
      const notes = talent.notes || '';

      if (!talentOneId) {
        continue;
      }

      // 验证达人是否存在
      const talentDoc = await db.collection('talents').findOne({
        oneId: talentOneId,
        platform
      });

      if (!talentDoc) {
        notFound.push({ talentOneId, platform, reason: '达人不存在' });
        continue;
      }

      // 检查是否已添加
      const existing = await collection.findOne({
        customerId: customer.code,
        talentOneId,
        platform
      });

      if (existing) {
        if (existing.status === 'removed') {
          // 如果是已移除的，恢复为活跃状态
          await collection.updateOne(
            { _id: existing._id },
            {
              $set: {
                status: 'active',
                tags,
                notes,
                addedAt: now,
                addedBy
              },
              $unset: { removedAt: '' }
            }
          );
          docsToInsert.push({ talentOneId, restored: true });
        } else {
          duplicates.push({ talentOneId, name: talentDoc.name });
        }
        continue;
      }

      // 准备新文档
      docsToInsert.push({
        customerId: customer.code,
        talentOneId,
        platform,
        tags,
        notes,
        status: 'active',
        addedBy,
        addedAt: now,
        cooperationCount: 0
      });
    }

    // 批量插入
    let insertedCount = 0;
    const newDocs = docsToInsert.filter(doc => !doc.restored);
    if (newDocs.length > 0) {
      const result = await collection.insertMany(newDocs, { ordered: false });
      insertedCount = result.insertedCount;
    }

    const restoredCount = docsToInsert.filter(doc => doc.restored).length;

    return successResponse({
      success: true,
      message: `成功添加 ${insertedCount + restoredCount} 个达人`,
      insertedCount,
      restoredCount,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      notFound: notFound.length > 0 ? notFound : undefined
    }, 201);

  } finally {
    if (client) await client.close();
  }
}

/**
 * 从客户池移除达人（软删除）
 */
async function removeCustomerTalent(id, queryParams = {}) {
  let client;

  try {
    if (!id) {
      return errorResponse(400, '缺少必需参数: id');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customer_talents');

    // 永久删除还是软删除
    const isPermanent = queryParams.permanent === 'true';

    if (isPermanent) {
      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return errorResponse(404, '记录不存在');
      }

      return successResponse({ message: '已永久删除' });
    } else {
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: 'removed',
            removedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        return errorResponse(404, '记录不存在');
      }

      return successResponse({ message: '已移除', data: result });
    }

  } finally {
    if (client) await client.close();
  }
}

/**
 * 更新标签/备注
 */
async function updateCustomerTalent(id, body) {
  let client;

  try {
    if (!id) {
      return errorResponse(400, '缺少必需参数: id');
    }

    const updateData = JSON.parse(body || '{}');

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customer_talents');

    // 只允许更新特定字段
    const allowedFields = ['tags', 'notes'];
    const fieldsToUpdate = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fieldsToUpdate[field] = updateData[field];
      }
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
      return errorResponse(400, '没有可更新的字段');
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: fieldsToUpdate },
      { returnDocument: 'after' }
    );

    if (!result) {
      return errorResponse(404, '记录不存在');
    }

    return successResponse(result, 200, '更新成功');

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
 * 尝试转换为 ObjectId
 */
function tryObjectId(id) {
  try {
    return new ObjectId(id);
  } catch (e) {
    return null;
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
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
