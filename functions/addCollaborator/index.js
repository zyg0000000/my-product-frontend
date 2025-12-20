/**
 * [生产版 v7.1 - 支持 hybrid 定价模式]
 * 云函数：addCollaborator
 * 描述：为指定项目新增一条合作记录。
 *
 * --- v7.1 更新日志 ---
 * - [v5.2 定价模式] 新增 pricingMode, quotationPrice, orderPrice 字段支持
 * - [继承逻辑] pricingMode 从项目 platformPricingModes 继承，hybrid 模式默认 framework
 * - [向后兼容] 旧数据不受影响，前端可按需读取新字段
 *
 * --- v7.0 更新日志 ---
 * - [核心改造] 支持 dbVersion 参数选择数据库：
 *   - v1 (默认): kol_data 数据库 (byteproject)
 *   - v2: agentworks_db 数据库 (agentworks)
 * - [字段适配] v2 模式使用 talentOneId + talentPlatform 代替 talentId
 * - [字段映射] v2 模式字段名映射：rebateRate -> rebate
 * - [向后兼容] 不传 dbVersion 或传 v1 时，行为与旧版完全一致
 *
 * --- v6.0 更新日志 ---
 * - [核心改造] 移除了"一个项目一个达人只能合作一次"的限制，以支持新的业务模式。
 * - [功能增强] 新增接收 `plannedReleaseDate` (计划发布日期) 字段，作为区分多次合作的业务标识。
 *
 * --- v5.0 更新日志 ---
 * - [核心解耦] 在创建合作记录时，会从达人库查询达人当前的来源 (talentSource)，
 *   并将其作为"快照"存入合作记录的同名字段中。
 * - [数据固化] 此修改确保了达人来源在交易创建时被永久固化，与达人库解耦。
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

// 数据库配置
const DB_CONFIG = {
  v1: {
    dbName: process.env.MONGO_DB_NAME || 'kol_data',
    collections: {
      collaborations: 'collaborations',
      projects: 'projects',
      talents: 'talents',
    },
  },
  v2: {
    dbName: 'agentworks_db',
    collections: {
      collaborations: 'collaborations',
      projects: 'projects',
      talents: 'talents',
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
 * v1 模式：计算返点应收（旧版逻辑）
 */
function calculateRebateReceivable(amount, rebate, orderType) {
  const amountNum = Number(amount) || 0;
  const rebateNum = Number(rebate) || 0;

  if (orderType === 'original') {
    return amountNum * (rebateNum / 100);
  } else {
    // modified
    if (rebateNum > 20) {
      return amountNum * (rebateNum / 100 - 0.2);
    } else {
      return 0;
    }
  }
}

/**
 * v1 模式：处理旧版请求 (byteproject)
 * 使用 talentId 查找达人
 */
async function handleV1Request(inputData, db, collections) {
  const {
    projectId,
    talentId,
    amount,
    priceInfo,
    rebate,
    orderType,
    plannedReleaseDate,
  } = inputData;

  // 参数校验
  if (!projectId || !talentId || amount == null || rebate == null) {
    return {
      statusCode: 400,
      body: {
        success: false,
        message: '请求体中缺少必要的字段 (projectId, talentId, amount, rebate)。',
      },
    };
  }

  const projectsCollection = db.collection(collections.projects);
  const talentsCollection = db.collection(collections.talents);
  const collabsCollection = db.collection(collections.collaborations);

  // 验证项目存在
  const project = await projectsCollection.findOne({ id: projectId });
  if (!project) {
    return {
      statusCode: 404,
      body: {
        success: false,
        message: `项目ID '${projectId}' 不存在。`,
      },
    };
  }

  // 验证达人存在
  const talent = await talentsCollection.findOne({ id: talentId });
  if (!talent) {
    return {
      statusCode: 404,
      body: {
        success: false,
        message: `达人ID '${talentId}' 不存在。`,
      },
    };
  }

  // 创建合作记录
  const newCollaborator = {
    _id: new ObjectId(),
    id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    projectId,
    talentId,
    talentSource: talent.talentSource || '野生达人',
    amount: Number(amount),
    priceInfo: priceInfo || '',
    rebate: Number(rebate),
    orderType: orderType || 'modified',
    status: '待提报工作台',
    plannedReleaseDate: plannedReleaseDate || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderDate: null,
    publishDate: null,
    contentFile: null,
    taskId: null,
    videoId: null,
    paymentDate: null,
    actualRebate: null,
    recoveryDate: null,
    discrepancyReason: null,
    rebateScreenshots: [],
  };

  // 机构达人计算返点应收
  if (newCollaborator.talentSource === '机构达人') {
    const rebateReceivable = calculateRebateReceivable(
      newCollaborator.amount,
      newCollaborator.rebate,
      newCollaborator.orderType
    );
    newCollaborator.actualRebate = Number(rebateReceivable.toFixed(2));
  }

  await collabsCollection.insertOne(newCollaborator);

  const { _id, ...returnData } = newCollaborator;

  return {
    statusCode: 201,
    body: {
      success: true,
      message: '合作记录创建成功',
      data: returnData,
    },
  };
}

/**
 * v2 模式：处理新版请求 (agentworks)
 * 使用 talentOneId + talentPlatform 查找达人
 *
 * v5.2 更新：支持 pricingMode, quotationPrice, orderPrice 字段
 */
async function handleV2Request(inputData, db, collections) {
  const {
    projectId,
    talentOneId,
    talentPlatform,
    amount,
    rebateRate, // v2 使用 rebateRate
    plannedReleaseDate,
    talentSource: inputTalentSource, // 前端可传，也可不传让后端从达人库获取
    // v5.2: 定价模式支持
    pricingMode: inputPricingMode, // 前端可传，不传则从项目继承
    quotationPrice, // 对客报价（分），比价模式手动填写
    orderPrice, // 下单价（分），比价模式手动填写
  } = inputData;

  // 参数校验
  if (!projectId || !talentOneId || !talentPlatform || amount == null) {
    return {
      statusCode: 400,
      body: {
        success: false,
        message:
          '请求体中缺少必要的字段 (projectId, talentOneId, talentPlatform, amount)。',
      },
    };
  }

  const projectsCollection = db.collection(collections.projects);
  const talentsCollection = db.collection(collections.talents);
  const collabsCollection = db.collection(collections.collaborations);

  // 验证项目存在
  const project = await projectsCollection.findOne({ id: projectId });
  if (!project) {
    return {
      statusCode: 404,
      body: {
        success: false,
        message: `项目ID '${projectId}' 不存在。`,
      },
    };
  }

  // 验证达人存在 (v2 使用 oneId + platform 联合查询)
  const talent = await talentsCollection.findOne({
    oneId: talentOneId,
    platform: talentPlatform,
  });
  if (!talent) {
    return {
      statusCode: 404,
      body: {
        success: false,
        message: `达人 '${talentOneId}' (平台: ${talentPlatform}) 不存在。`,
      },
    };
  }

  // 确定达人来源
  // 优先使用前端传入的值，否则从达人库获取
  let talentSource = inputTalentSource;
  if (!talentSource) {
    // 根据 agencyId 判断：individual 或空 = 独立达人，其他 = 机构达人
    const agencyId = talent.agencyId;
    if (!agencyId || agencyId === 'individual') {
      talentSource = '独立达人';
    } else {
      talentSource = '机构达人';
    }
  }

  // v5.2: 确定定价模式
  // 优先使用前端传入的值，否则从项目配置继承
  let pricingMode = inputPricingMode;
  if (!pricingMode) {
    // 从项目的 platformPricingModes 获取当前平台的定价模式
    const projectPricingMode =
      project.platformPricingModes?.[talentPlatform] || 'framework';
    // hybrid 模式下默认使用 framework，用户可后续修改
    pricingMode =
      projectPricingMode === 'hybrid' ? 'framework' : projectPricingMode;
  }

  // 创建合作记录 (v2 结构)
  const newCollaboration = {
    _id: new ObjectId(),
    id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    projectId,
    // v2 使用 talentOneId + talentPlatform
    talentOneId,
    talentPlatform,
    talentName: talent.name || '', // 冗余字段，方便查询展示
    talentSource,
    // 财务信息
    amount: Number(amount), // 金额（分）
    rebateRate: rebateRate != null ? Number(rebateRate) : null, // 返点率 (%)
    // 状态
    status: '待提报工作台',
    orderMode: 'adjusted', // 下单方式：'adjusted'(改价) | 'original'(原价)
    // v5.2: 定价模式支持
    pricingMode, // 计价方式：'framework' | 'project'
    quotationPrice: quotationPrice != null ? Number(quotationPrice) : null, // 对客报价（分）
    orderPrice: orderPrice != null ? Number(orderPrice) : null, // 下单价（分）
    // 执行追踪
    plannedReleaseDate: plannedReleaseDate || null,
    actualReleaseDate: null,
    taskId: null,
    videoId: null,
    videoUrl: null,
    // 财务管理
    orderDate: null,
    recoveryDate: null,
    // 差异处理
    discrepancyReason: null,
    rebateScreenshots: [],
    // 效果数据
    effectData: null,
    // 调整项
    adjustments: [],
    // 元数据
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collabsCollection.insertOne(newCollaboration);

  const { _id, ...returnData } = newCollaboration;

  return {
    statusCode: 201,
    body: {
      success: true,
      message: '合作记录创建成功',
      dbVersion: 'v2',
      data: returnData,
    },
  };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // 解析请求体
    let inputData = {};
    if (event.body) {
      try {
        inputData = JSON.parse(event.body);
      } catch (e) {
        /* ignore parse error */
      }
    }
    if (Object.keys(inputData).length === 0 && event.queryStringParameters) {
      inputData = event.queryStringParameters;
    }

    // 确定数据库版本
    const dbVersion = inputData.dbVersion || 'v1';
    const config = DB_CONFIG[dbVersion] || DB_CONFIG.v1;

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(config.dbName);

    // 根据版本调用不同处理逻辑
    let result;
    if (dbVersion === 'v2') {
      result = await handleV2Request(inputData, db, config.collections);
    } else {
      result = await handleV1Request(inputData, db, config.collections);
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
