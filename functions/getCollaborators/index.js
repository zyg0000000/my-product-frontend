/**
 * @file getCollaborators.js
 * @version 7.2 - 支持平台和状态筛选
 * @description 获取合作记录列表，支持 v1 (byteproject) 和 v2 (agentworks) 数据库。
 *
 * --- v7.2 更新日志 ---
 * - [筛选功能] v2 模式新增 platform 参数支持按平台筛选
 * - [筛选功能] v2 模式新增 status 参数支持单个状态筛选（兼容已有的 statuses 多状态筛选）
 * - [分页修复] v2 模式支持 pageSize 参数（映射到 limit）
 *
 * --- v7.1 更新日志 ---
 * - [v5.2 定价模式] v2 投影新增 pricingMode, quotationPrice, orderPrice 字段返回
 * - [向后兼容] 旧数据这些字段为 null/undefined，前端需做兼容处理
 *
 * --- v7.0 更新日志 ---
 * - [核心改造] 支持 dbVersion 参数选择数据库：
 *   - v1 (默认): kol_data 数据库 (byteproject) - 使用 talentId 关联
 *   - v2: agentworks_db 数据库 (agentworks) - 使用 talentOneId + talentPlatform 关联
 * - [字段适配] v2 模式返回 talentOneId, talentPlatform, talentName, rebateRate 等字段
 * - [向后兼容] 不传 dbVersion 或传 v1 时，行为与旧版完全一致
 *
 * --- v6.2 更新日志 ---
 * - [Bug修复] 修复分页排序稳定性问题：在排序中添加 id 作为二级排序键
 *
 * --- v6.1 更新日志 ---
 * - [核心功能] 新增了对 `statuses` 查询参数的支持
 *
 * --- v6.0 更新日志 ---
 * - [业务升级] 支持达人多次合作模式，返回 `plannedReleaseDate` 字段
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

// 数据库配置
const DB_CONFIG = {
  v1: {
    dbName: process.env.MONGO_DB_NAME || 'kol_data',
    collections: {
      collaborations: 'collaborations',
      projects: 'projects',
      talents: 'talents',
      capitalRates: 'projectCapitalRates',
    },
  },
  v2: {
    dbName: 'agentworks_db',
    collections: {
      collaborations: 'collaborations',
      projects: 'projects',
      talents: 'talents',
      capitalRates: 'projectCapitalRates',
    },
  },
};

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
 * v1 模式：处理旧版请求 (byteproject)
 * 使用 talentId 关联达人
 */
async function handleV1Request(queryParams, db, collections) {
  const {
    projectId,
    collaborationId,
    view,
    allowGlobal,
    page = '1',
    limit = '10',
    sortBy = 'createdAt',
    order = 'desc',
    statuses,
  } = queryParams;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const isGlobalQueryAllowed = allowGlobal === 'true';
  const hasRequiredFilter = projectId || collaborationId;

  if (view !== 'simple' && !hasRequiredFilter && !isGlobalQueryAllowed) {
    return {
      statusCode: 400,
      body: {
        success: false,
        message:
          '这是一个重量级查询，请求参数中必须包含 projectId 或 collaborationId，或明确设置 allowGlobal=true。',
      },
    };
  }

  const collabsCollection = db.collection(collections.collaborations);

  // Simple view 模式
  if (view === 'simple') {
    let simpleQuery = {};
    if (projectId) simpleQuery.projectId = projectId;
    if (collaborationId) simpleQuery.id = collaborationId;
    const simpleProjection = {
      _id: 0,
      id: 1,
      talentId: 1,
      status: 1,
      projectId: 1,
    };
    const simpleData = await collabsCollection
      .find(simpleQuery, { projection: simpleProjection })
      .toArray();
    return {
      statusCode: 200,
      body: { success: true, data: simpleData },
    };
  }

  // 构建 match 阶段
  const matchStage = {};
  if (projectId) matchStage.projectId = projectId;
  if (collaborationId) matchStage.id = collaborationId;
  if (statuses) {
    const statusArray = statuses
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    if (statusArray.length > 0) {
      matchStage.status = { $in: statusArray };
    }
  }

  const aggregationPipeline = [];
  if (Object.keys(matchStage).length > 0) {
    aggregationPipeline.push({ $match: matchStage });
  }

  // v1: 使用 talentId 关联
  aggregationPipeline.push(
    {
      $lookup: {
        from: collections.projects,
        localField: 'projectId',
        foreignField: 'id',
        as: 'projectInfo',
      },
    },
    {
      $lookup: {
        from: collections.talents,
        localField: 'talentId',
        foreignField: 'id',
        as: 'talentInfo',
      },
    },
    { $unwind: { path: '$projectInfo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$talentInfo', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: collections.capitalRates,
        localField: 'projectInfo.capitalRateId',
        foreignField: 'id',
        as: 'capitalRateInfo',
      },
    },
    { $unwind: { path: '$capitalRateInfo', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        amountNum: {
          $cond: {
            if: { $in: ['$amount', [null, '']] },
            then: 0,
            else: { $toDouble: '$amount' },
          },
        },
        rebateNum: {
          $cond: {
            if: { $in: ['$rebate', [null, '']] },
            then: 0,
            else: { $toDouble: '$rebate' },
          },
        },
        projectDiscountNum: {
          $cond: {
            if: { $in: ['$projectInfo.discount', [null, '']] },
            then: 1,
            else: { $toDouble: '$projectInfo.discount' },
          },
        },
        actualRebateNum: {
          $cond: {
            if: { $in: ['$actualRebate', [null, '']] },
            then: null,
            else: { $toDouble: '$actualRebate' },
          },
        },
        monthlyRatePercent: {
          $let: {
            vars: { rateValue: { $ifNull: ['$capitalRateInfo.value', 0.7] } },
            in: {
              $cond: {
                if: { $eq: ['$$rateValue', ''] },
                then: 0.7,
                else: { $toDouble: '$$rateValue' },
              },
            },
          },
        },
        orderDateObj: {
          $cond: {
            if: {
              $and: [{ $ne: ['$orderDate', null] }, { $ne: ['$orderDate', ''] }],
            },
            then: { $toDate: '$orderDate' },
            else: null,
          },
        },
        paymentDateObj: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$paymentDate', null] },
                { $ne: ['$paymentDate', ''] },
              ],
            },
            then: { $toDate: '$paymentDate' },
            else: '$$NOW',
          },
        },
      },
    },
    {
      $addFields: {
        income: { $multiply: ['$amountNum', '$projectDiscountNum', 1.05] },
        expense: {
          $cond: {
            if: { $eq: ['$orderType', 'original'] },
            then: { $multiply: ['$amountNum', 1.05] },
            else: {
              $cond: {
                if: { $gt: ['$rebateNum', 20] },
                then: { $multiply: ['$amountNum', 0.8, 1.05] },
                else: {
                  $multiply: [
                    '$amountNum',
                    { $subtract: [1, { $divide: ['$rebateNum', 100] }] },
                    1.05,
                  ],
                },
              },
            },
          },
        },
        rebateReceivable: {
          $cond: {
            if: { $eq: ['$orderType', 'original'] },
            then: { $multiply: ['$amountNum', { $divide: ['$rebateNum', 100] }] },
            else: {
              $cond: {
                if: { $gt: ['$rebateNum', 20] },
                then: {
                  $multiply: [
                    '$amountNum',
                    { $subtract: [{ $divide: ['$rebateNum', 100] }, 0.2] },
                  ],
                },
                else: 0,
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        occupationDays: {
          $ifNull: [
            {
              $cond: {
                if: '$orderDateObj',
                then: {
                  $max: [
                    0,
                    {
                      $divide: [
                        { $subtract: ['$paymentDateObj', '$orderDateObj'] },
                        1000 * 60 * 60 * 24,
                      ],
                    },
                  ],
                },
                else: 0,
              },
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        fundsOccupationCost: {
          $multiply: [
            '$expense',
            { $divide: [{ $divide: ['$monthlyRatePercent', 100] }, 30] },
            '$occupationDays',
          ],
        },
        rebateForProfitCalc: {
          $cond: {
            if: { $eq: ['$projectInfo.status', '已终结'] },
            then: { $ifNull: ['$actualRebateNum', 0] },
            else: { $ifNull: ['$actualRebateNum', '$rebateReceivable'] },
          },
        },
      },
    },
    {
      $addFields: {
        grossProfit: {
          $add: [
            '$income',
            '$rebateForProfitCalc',
            { $multiply: ['$expense', -1] },
          ],
        },
      },
    },
    {
      $addFields: {
        grossProfitMargin: {
          $cond: {
            if: { $eq: ['$income', 0] },
            then: 0,
            else: { $multiply: [{ $divide: ['$grossProfit', '$income'] }, 100] },
          },
        },
      },
    }
  );

  const finalProjection = {
    _id: 0,
    id: 1,
    projectId: 1,
    talentId: 1,
    talentSource: 1,
    amount: 1,
    priceInfo: 1,
    rebate: 1,
    orderType: 1,
    status: 1,
    orderDate: 1,
    publishDate: 1,
    videoId: 1,
    paymentDate: 1,
    plannedReleaseDate: 1,
    actualRebate: 1,
    recoveryDate: 1,
    createdAt: 1,
    updatedAt: 1,
    contentFile: 1,
    taskId: 1,
    rebateScreenshots: 1,
    discrepancyReason: 1,
    discrepancyReasonUpdatedAt: 1,
    talentInfo: {
      nickname: '$talentInfo.nickname',
      xingtuId: '$talentInfo.xingtuId',
      uid: '$talentInfo.uid',
      level: '$talentInfo.talentTier',
      tags: '$talentInfo.talentType',
    },
    metrics: {
      income: { $round: ['$income', 2] },
      expense: { $round: ['$expense', 2] },
      rebateReceivable: { $round: ['$rebateReceivable', 2] },
      fundsOccupationCost: { $round: ['$fundsOccupationCost', 2] },
      grossProfit: { $round: ['$grossProfit', 2] },
      grossProfitMargin: { $round: ['$grossProfitMargin', 2] },
    },
  };

  const facetStage = {
    $facet: {
      paginatedResults: [
        { $sort: { [sortBy]: sortOrder, id: 1 } },
        { $skip: skipNum },
        { $limit: limitNum },
        { $project: finalProjection },
      ],
      totalCount: [{ $count: 'count' }],
    },
  };
  aggregationPipeline.push(facetStage);

  const results = await collabsCollection
    .aggregate(aggregationPipeline)
    .toArray();
  const collaborators = results[0].paginatedResults;
  const totalCount =
    results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

  if (collaborationId) {
    if (collaborators.length === 0) {
      return {
        statusCode: 404,
        body: { success: false, message: '未找到指定的合作记录' },
      };
    }
    return {
      statusCode: 200,
      body: { success: true, data: collaborators[0] },
    };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      data: collaborators,
    },
  };
}

/**
 * v2 模式：处理新版请求 (agentworks)
 * 使用 talentOneId + talentPlatform 关联达人
 */
async function handleV2Request(queryParams, db, collections) {
  const {
    projectId,
    collaborationId,
    view,
    allowGlobal,
    page = '1',
    limit = '10',
    pageSize, // 前端使用 pageSize，映射到 limit
    sortBy = 'createdAt',
    order = 'desc',
    statuses,
    status, // 单个状态筛选（前端发送）
    platform, // 平台筛选（前端发送）
  } = queryParams;

  const pageNum = parseInt(page, 10);
  // 优先使用 pageSize，回退到 limit
  const limitNum = parseInt(pageSize || limit, 10);
  const skipNum = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const isGlobalQueryAllowed = allowGlobal === 'true';
  const hasRequiredFilter = projectId || collaborationId;

  if (view !== 'simple' && !hasRequiredFilter && !isGlobalQueryAllowed) {
    return {
      statusCode: 400,
      body: {
        success: false,
        message:
          '这是一个重量级查询，请求参数中必须包含 projectId 或 collaborationId，或明确设置 allowGlobal=true。',
      },
    };
  }

  const collabsCollection = db.collection(collections.collaborations);

  // Simple view 模式
  if (view === 'simple') {
    let simpleQuery = {};
    if (projectId) simpleQuery.projectId = projectId;
    if (collaborationId) simpleQuery.id = collaborationId;
    const simpleProjection = {
      _id: 0,
      id: 1,
      talentOneId: 1,
      talentPlatform: 1,
      talentName: 1,
      status: 1,
      projectId: 1,
    };
    const simpleData = await collabsCollection
      .find(simpleQuery, { projection: simpleProjection })
      .toArray();
    return {
      statusCode: 200,
      body: { success: true, dbVersion: 'v2', data: simpleData },
    };
  }

  // 构建 match 阶段
  const matchStage = {};
  if (projectId) matchStage.projectId = projectId;
  if (collaborationId) matchStage.id = collaborationId;

  // 平台筛选（v7.2 新增）
  if (platform) {
    matchStage.talentPlatform = platform;
  }

  // 状态筛选：支持 statuses（逗号分隔多个）或 status（单个）
  if (statuses) {
    const statusArray = statuses
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    if (statusArray.length > 0) {
      matchStage.status = { $in: statusArray };
    }
  } else if (status) {
    // 单个状态筛选
    matchStage.status = status;
  }

  const aggregationPipeline = [];
  if (Object.keys(matchStage).length > 0) {
    aggregationPipeline.push({ $match: matchStage });
  }

  // v2: 使用 talentOneId + talentPlatform 联合关联
  // 使用 pipeline 形式的 $lookup 进行多字段关联
  aggregationPipeline.push(
    {
      $lookup: {
        from: collections.projects,
        localField: 'projectId',
        foreignField: 'id',
        as: 'projectInfo',
      },
    },
    {
      $lookup: {
        from: collections.talents,
        let: { oneId: '$talentOneId', platform: '$talentPlatform' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$oneId', '$$oneId'] },
                  { $eq: ['$platform', '$$platform'] },
                ],
              },
            },
          },
        ],
        as: 'talentInfo',
      },
    },
    { $unwind: { path: '$projectInfo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$talentInfo', preserveNullAndEmptyArrays: true } }
  );

  // v2 简化版投影：不需要复杂的财务计算（agentworks 有不同的业务逻辑）
  const finalProjection = {
    _id: 0,
    id: 1,
    projectId: 1,
    // v2 字段
    talentOneId: 1,
    talentPlatform: 1,
    talentName: 1,
    talentSource: 1,
    // 财务信息
    amount: 1,
    rebateRate: 1,
    orderMode: 1, // 下单方式：'adjusted'(改价) | 'original'(原价)
    // v7.1: 定价模式支持
    pricingMode: 1, // 计价方式：'framework' | 'project'
    quotationPrice: 1, // 对客报价（分）
    orderPrice: 1, // 下单价（分）
    // 状态
    status: 1,
    // 执行追踪
    plannedReleaseDate: 1,
    actualReleaseDate: 1,
    taskId: 1,
    videoId: 1,
    videoUrl: 1,
    // 财务管理
    orderDate: 1,
    recoveryDate: 1,
    // 差异处理
    discrepancyReason: 1,
    rebateScreenshots: 1,
    // 效果数据
    effectData: 1,
    // 调整项
    adjustments: 1,
    // 元数据
    createdAt: 1,
    updatedAt: 1,
    // 关联的达人信息
    talentInfo: {
      name: '$talentInfo.name',
      platformAccountId: '$talentInfo.platformAccountId',
      fansCount: '$talentInfo.fansCount',
      talentType: '$talentInfo.talentType',
      agencyId: '$talentInfo.agencyId',
      platformSpecific: '$talentInfo.platformSpecific',
    },
    // 关联的项目信息
    projectInfo: {
      name: '$projectInfo.name',
      status: '$projectInfo.status',
      year: '$projectInfo.year',
      month: '$projectInfo.month',
    },
  };

  const facetStage = {
    $facet: {
      paginatedResults: [
        { $sort: { [sortBy]: sortOrder, id: 1 } },
        { $skip: skipNum },
        { $limit: limitNum },
        { $project: finalProjection },
      ],
      totalCount: [{ $count: 'count' }],
    },
  };
  aggregationPipeline.push(facetStage);

  const results = await collabsCollection
    .aggregate(aggregationPipeline)
    .toArray();
  const collaborations = results[0].paginatedResults;
  const totalCount =
    results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

  if (collaborationId) {
    if (collaborations.length === 0) {
      return {
        statusCode: 404,
        body: { success: false, message: '未找到指定的合作记录' },
      };
    }
    return {
      statusCode: 200,
      body: { success: true, dbVersion: 'v2', data: collaborations[0] },
    };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      dbVersion: 'v2',
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      data: collaborations,
    },
  };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const queryParams = event.queryStringParameters || {};

    // 确定数据库版本
    const dbVersion = queryParams.dbVersion || 'v1';
    const config = DB_CONFIG[dbVersion] || DB_CONFIG.v1;

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(config.dbName);

    // 根据版本调用不同处理逻辑
    let result;
    if (dbVersion === 'v2') {
      result = await handleV2Request(queryParams, db, config.collections);
    } else {
      result = await handleV1Request(queryParams, db, config.collections);
    }

    return {
      statusCode: result.statusCode,
      headers,
      body: JSON.stringify(result.body),
    };
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: error.message,
      }),
    };
  }
};
