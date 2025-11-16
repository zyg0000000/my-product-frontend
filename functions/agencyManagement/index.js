/**
 * 云函数：agencyManagement
 * 描述：机构管理CRUD操作
 *
 * 支持的操作：
 * - GET: 获取机构列表或单个机构
 * - POST: 创建新机构
 * - PUT: 更新机构信息
 * - DELETE: 删除机构
 *
 * @version 1.0.0
 * @date 2025-11-16
 */

const { MongoClient, ObjectId } = require('mongodb');

// 环境变量
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const COLLECTION_NAME = 'agencies';

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
 * 获取机构列表或单个机构
 */
async function getAgencies(db, queryParams) {
  const { id, type, status, search } = queryParams;
  const collection = db.collection(COLLECTION_NAME);

  // 获取单个机构
  if (id) {
    const agency = await collection.findOne({ id });
    if (!agency) {
      return {
        success: false,
        message: `未找到ID为 ${id} 的机构`
      };
    }
    return {
      success: true,
      data: agency
    };
  }

  // 构建查询条件
  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (search) {
    query.$text = { $search: search };
  }

  // 查询列表
  const agencies = await collection.find(query, {
    projection: { _id: 0 }
  }).sort({ createdAt: -1 }).toArray();

  return {
    success: true,
    count: agencies.length,
    data: agencies
  };
}

/**
 * 创建新机构
 */
async function createAgency(db, data) {
  const collection = db.collection(COLLECTION_NAME);

  // 验证必填字段
  if (!data.name || !data.type) {
    return {
      success: false,
      message: '机构名称和类型为必填项'
    };
  }

  // 生成机构ID
  const agencyId = `agency_${Date.now()}`;

  // 构建机构数据
  const agency = {
    id: agencyId,
    name: data.name,
    type: data.type,
    contactInfo: {
      contactPerson: data.contactPerson,
      wechatId: data.wechatId,
      phoneNumber: data.phoneNumber,
      email: data.email
    },
    rebateConfig: {
      baseRebate: data.baseRebate || 10.0,
      tieredRules: [],
      specialRules: []
    },
    description: data.description,
    status: data.status || 'active',
    statistics: {
      talentCount: 0,
      totalRevenue: 0,
      lastUpdated: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 移除空字段
  Object.keys(agency.contactInfo).forEach(key => {
    if (!agency.contactInfo[key]) {
      delete agency.contactInfo[key];
    }
  });

  if (Object.keys(agency.contactInfo).length === 0) {
    delete agency.contactInfo;
  }

  try {
    await collection.insertOne(agency);
    return {
      success: true,
      data: agency
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        message: '机构ID已存在'
      };
    }
    throw error;
  }
}

/**
 * 更新机构信息
 */
async function updateAgency(db, data) {
  const collection = db.collection(COLLECTION_NAME);

  if (!data.id) {
    return {
      success: false,
      message: '机构ID为必填项'
    };
  }

  // 不允许修改系统预设机构
  if (data.id === 'individual') {
    return {
      success: false,
      message: '系统预设机构不可修改'
    };
  }

  // 构建更新数据
  const updateData = {
    updatedAt: new Date()
  };

  if (data.name) updateData.name = data.name;
  if (data.type) updateData.type = data.type;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status) updateData.status = data.status;

  // 更新联系信息
  if (data.contactPerson !== undefined || data.wechatId !== undefined ||
      data.phoneNumber !== undefined || data.email !== undefined) {
    updateData.contactInfo = {};
    if (data.contactPerson !== undefined) updateData.contactInfo.contactPerson = data.contactPerson;
    if (data.wechatId !== undefined) updateData.contactInfo.wechatId = data.wechatId;
    if (data.phoneNumber !== undefined) updateData.contactInfo.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) updateData.contactInfo.email = data.email;
  }

  // 更新返点配置
  if (data.baseRebate !== undefined) {
    updateData['rebateConfig.baseRebate'] = data.baseRebate;
  }

  const result = await collection.findOneAndUpdate(
    { id: data.id },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return {
      success: false,
      message: `未找到ID为 ${data.id} 的机构`
    };
  }

  return {
    success: true,
    data: result.value
  };
}

/**
 * 删除机构
 */
async function deleteAgency(db, id) {
  const collection = db.collection(COLLECTION_NAME);

  if (!id) {
    return {
      success: false,
      message: '机构ID为必填项'
    };
  }

  // 不允许删除系统预设机构
  if (id === 'individual') {
    return {
      success: false,
      message: '系统预设机构不可删除'
    };
  }

  // TODO: 检查是否有达人归属于该机构
  // const talentsCollection = db.collection('talents');
  // const talentCount = await talentsCollection.countDocuments({ agencyId: id });
  // if (talentCount > 0) {
  //   return {
  //     success: false,
  //     message: `该机构下还有 ${talentCount} 个达人，无法删除`
  //   };
  // }

  const result = await collection.deleteOne({ id });

  if (result.deletedCount === 0) {
    return {
      success: false,
      message: `未找到ID为 ${id} 的机构`
    };
  }

  return {
    success: true,
    message: '机构删除成功'
  };
}

/**
 * 主处理函数
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 解析请求参数
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    let result;

    // 根据请求方法处理
    switch (event.httpMethod) {
      case 'GET':
        result = await getAgencies(db, queryParams);
        break;

      case 'POST':
        result = await createAgency(db, body);
        break;

      case 'PUT':
        result = await updateAgency(db, body);
        break;

      case 'DELETE':
        const id = queryParams.id || body.id;
        result = await deleteAgency(db, id);
        break;

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            success: false,
            message: '不支持的请求方法'
          })
        };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result)
    };

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