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
 * @version 2.0.0
 * @date 2025-12-13
 *
 * v2.0 更新日志：
 * - [新增] 分页支持（page, limit 参数）
 * - [新增] 排序支持（sortBy, order 参数）
 * - [新增] 高级筛选（statusList, contactPerson, phoneNumber, 时间范围）
 * - [优化] 使用聚合管道提升性能
 * - [安全] 参数验证和白名单校验
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
 * 获取机构列表或单个机构（v2.0 - 支持分页、排序、筛选）
 */
async function getAgencies(db, queryParams) {
  const {
    // 基础参数
    id, type, status, search,

    // 分页参数
    page = '1',
    limit = '20',

    // 排序参数
    sortBy = 'createdAt',
    order = 'desc',

    // 高级筛选参数
    statusList,          // 多状态查询（逗号分隔）
    contactPerson,       // 联系人姓名（模糊搜索）
    phoneNumber,         // 电话号码（精确匹配）
    createdAfter,        // 创建时间起始
    createdBefore        // 创建时间截止
  } = queryParams;

  const collection = db.collection(COLLECTION_NAME);

  // 获取单个机构（保持原有逻辑）
  if (id) {
    const agency = await collection.findOne({ id }, { projection: { _id: 0 } });
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

  // ========== 参数验证 ==========

  // 分页参数验证
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);  // 限制最大100条

  if (isNaN(pageNum) || pageNum < 1) {
    return {
      success: false,
      message: 'page 参数必须是大于 0 的整数'
    };
  }

  if (isNaN(limitNum) || limitNum < 1) {
    return {
      success: false,
      message: 'limit 参数必须是大于 0 的整数'
    };
  }

  // 排序字段白名单
  const ALLOWED_SORT_FIELDS = [
    'createdAt', 'updatedAt', 'name', 'type', 'status'
  ];

  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
    return {
      success: false,
      message: `不支持按 ${sortBy} 字段排序，允许的字段：${ALLOWED_SORT_FIELDS.join(', ')}`
    };
  }

  // ========== 构建筛选条件 ==========

  const matchStage = {};

  // 机构类型
  if (type) {
    matchStage.type = type;
  }

  // 多状态支持
  if (statusList) {
    const statuses = statusList.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      matchStage.status = { $in: statuses };
    }
  } else if (status) {
    matchStage.status = status;
  }

  // 联系人姓名模糊搜索
  if (contactPerson) {
    matchStage['contactInfo.contactPerson'] = {
      $regex: contactPerson,
      $options: 'i'  // 不区分大小写
    };
  }

  // 电话号码精确匹配
  if (phoneNumber) {
    matchStage['contactInfo.phoneNumber'] = phoneNumber;
  }

  // 创建时间范围
  if (createdAfter || createdBefore) {
    matchStage.createdAt = {};
    if (createdAfter) {
      matchStage.createdAt.$gte = new Date(createdAfter);
    }
    if (createdBefore) {
      matchStage.createdAt.$lte = new Date(createdBefore);
    }
  }

  // 全文搜索（需要文本索引）
  if (search) {
    matchStage.$text = { $search: search };
  }

  // ========== 构建排序和分页 ==========

  const skipNum = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  // 排序对象（添加二级排序键确保稳定性）
  const sortObj = { [sortBy]: sortOrder, _id: 1 };

  // ========== 使用聚合管道查询 ==========

  const pipeline = [
    { $match: matchStage },
    {
      $facet: {
        paginatedResults: [
          { $sort: sortObj },
          { $skip: skipNum },
          { $limit: limitNum },
          { $project: { _id: 0 } }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const agencies = results[0].paginatedResults;
  const total = results[0].totalCount[0]?.count || 0;

  return {
    success: true,
    data: agencies,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
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
      // baseRebate 字段已弃用，不再设置默认值
      // 新的返点配置通过 agencyRebateConfig 云函数按平台设置
      tieredRules: [],
      specialRules: [],
      platforms: {}  // v3.0: 按平台的返点配置
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

  // 更新返点配置 - v3.0 后不再支持直接更新 baseRebate
  // 返点配置应通过 agencyRebateConfig 云函数按平台更新
  // if (data.baseRebate !== undefined) {
  //   updateData['rebateConfig.baseRebate'] = data.baseRebate;
  // }

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