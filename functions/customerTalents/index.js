/**
 * [生产版 v2.14 - 客户达人池 RESTful API]
 * 云函数：customerTalents
 * @version 2.14
 * 描述：统一的客户达人池 RESTful API，实现客户与达人的多对多关联管理
 *
 * --- v2.14 更新日志 (2025-12-17) ---
 * - [修复] panoramaSearch 价格筛选单位转换问题（前端元 -> 数据库分，乘以100）
 * - [修复] panoramaSearch 返点筛选 falsy 问题（rebateMin=0 也是有效值）
 * - [重要] prices数组格式：[{year, month, type, price(分)}]
 *
 * --- v2.12 更新日志 (2025-12-16) ---
 * - [修复] panoramaSearch 百分比字段筛选单位转换问题
 * - [说明] 前端输入百分比（0-100），数据库存储小数（0-1），后端自动转换
 * - [新增] PERCENTAGE_FIELDS 百分比字段集合，自动识别并转换值
 *
 * --- v2.11 更新日志 (2025-12-16) ---
 * - [修复] panoramaSearch 表现数据筛选字段映射错误
 * - [说明] 前端 dimension_configs 字段ID（如 maleRatio）需映射到数据库实际路径（如 audienceGender.male）
 * - [新增] PERFORMANCE_FILTER_FIELD_MAP 字段映射表，支持多维度筛选
 *
 * --- v2.10 更新日志 (2025-12-14) ---
 * - [优化] getCustomerTalents 返回达人信息时包含 agencyName 字段
 * - [说明] 通过嵌套 $lookup 从 agencies 集合获取机构名称
 *
 * --- v2.9 更新日志 (2025-12-14) ---
 * - [新功能] 客户级返点管理 (getCustomerRebate/updateCustomerRebate/batchUpdateCustomerRebate)
 * - [说明] 支持为客户达人池中的达人设置独立返点，优先级高于达人/机构返点
 * - [说明] 返点历史记录自动存储到 rebate_configs 集合
 *
 * --- v2.7 更新日志 (2025-12-04) ---
 * - [修复] followerCount 字段来源从 talents.fansCount 改为 performance.metrics.followers
 * - [说明] talents.fansCount 无实际数据，粉丝数应从 talent_performance 快照获取
 *
 * --- v2.6 更新日志 (2025-12-04) ---
 * - [新功能] panoramaSearch 支持 priceType 参数指定价格档位筛选
 * - [说明] priceType 可选值：video_60plus, video_21_60, video_1_20, video, image
 *
 * --- v2.5 更新日志 (2025-12-04) ---
 * - [移除] 从 FIELD_WHITELIST 和 DEFAULT_FIELDS 中移除 talentTier 字段
 * - [移除] panoramaSearch 不再支持 tiers 筛选参数
 * - [说明] talentTier 应改为客户维度管理，不再是达人平台维度
 *
 * --- v2.4 更新日志 (2025-12-04) ---
 * - [新功能] panoramaSearch 支持 fields 参数动态选择返回字段
 * - [新功能] 支持 60+ 可选字段（基础信息/价格/返点/表现/受众/客户关系）
 * - [优化] 按需返回字段，减少数据传输
 *
 * --- v2.3.1 更新日志 (2025-12-03) ---
 * - [修复] 标签配置查询条件统一为 configType: 'talent_tags'
 *
 * --- v2.3 更新日志 (2025-12-03) ---
 * - [修复] panoramaSearch 多客户查询支持 customerNames 参数
 * - [修复] 标签 key/name 双向映射：筛选时 name→key，返回时 key→name
 * - [优化] 重要程度/业务标签返回中文名称而非英文key
 *
 * --- v2.2 更新日志 (2025-12-03) ---
 * - [新功能] 达人全景搜索 (panoramaSearch) 支持多维度筛选
 * - [说明] 聚合 talents + customer_talents + performance 数据
 *
 * --- v2.1 更新日志 (2025-12-02) ---
 * - [新功能] 批量打标 (batchUpdateTags) 支持 replace/merge 两种模式
 * - [优化] 单次批量最多500条记录
 *
 * --- v2.0 更新日志 (2025-12-02) ---
 * - [新功能] 标签配置管理 (getTagConfigs/updateTagConfigs)
 * - [重构] 标签结构从 string[] 改为 { importance, businessTags }
 * - [新增] 权限预留字段 (organizationId, departmentId)
 * - [兼容] 保持对旧版 string[] 标签的兼容
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
 * - GET  /customer-talents?action=getTagConfigs            获取标签配置
 * - POST /customer-talents                                 添加达人到客户池（支持批量）
 * - POST /customer-talents?action=updateTagConfigs         更新标签配置
 * - DELETE /customer-talents?id=xxx                        从客户池移除达人
 * - PATCH /customer-talents?id=xxx                         更新标签/备注
 */

const { MongoClient, ObjectId } = require('mongodb');

// 版本号
const VERSION = '2.14';

// ========== 字段白名单配置（防止注入攻击） ==========
/**
 * 可选字段定义（v2.5 基于生产数据库实际字段清理）
 * 分类：basic(基础), price(价格), rebate(返点), metrics(表现), audience(受众), customer(客户)
 *
 * 注意：以下字段已移除（生产数据库无数据）：
 * - talents: starLevel, mcnName（无小红书/B站数据）
 * - performance.metrics: fansCount, fansChange, avgPlayCount, engagementRate, cpm（deprecated）
 * - performance.metrics: avgLikeCount, avgCommentCount, avgShareCount, worksCount, newWorksCount（不存在）
 * - performance.audience: 整个对象为空 {}
 * - performance.aiFeatures: 无数据
 * - performance.prediction: 无数据
 */
const FIELD_WHITELIST = {
  // ========== 基础信息字段（来自 talents 集合）==========
  oneId: { source: 'talents', path: '$oneId', category: 'basic' },
  name: { source: 'talents', path: '$name', category: 'basic' },
  platform: { source: 'talents', path: '$platform', category: 'basic' },
  // followerCount 实际来自 performance.metrics.followers（talents.fansCount 无数据）
  followerCount: { source: 'performance', path: '$performance.metrics.followers', category: 'basic' },
  contentTags: { source: 'talents', path: '$talentType', category: 'basic' },
  platformAccountId: { source: 'talents', path: '$platformAccountId', category: 'basic' },
  platformSpecific: { source: 'talents', path: '$platformSpecific', category: 'basic' },
  agencyId: { source: 'talents', path: '$agencyId', category: 'basic' },
  status: { source: 'talents', path: '$status', category: 'basic' },
  createdAt: { source: 'talents', path: '$createdAt', category: 'basic' },
  updatedAt: { source: 'talents', path: '$updatedAt', category: 'basic' },
  // 平台特有字段（仅抖音有数据，xingtuId 已废弃）
  uid: { source: 'talents', path: '$platformSpecific.uid', category: 'basic' },

  // ========== 返点字段 ==========
  rebate: { source: 'talents', path: 'computed:rebate', category: 'rebate' },
  rebateSource: { source: 'talents', path: '$currentRebate.source', category: 'rebate' },
  rebateEffectiveDate: { source: 'talents', path: '$currentRebate.effectiveDate', category: 'rebate' },

  // ========== 价格字段（需要特殊处理）==========
  prices: { source: 'talents', path: 'computed:prices', category: 'price' },

  // ========== 表现数据字段（来自 talent_performance.metrics，v1.2 字段名）==========
  // 核心指标
  followers: { source: 'performance', path: '$performance.metrics.followers', category: 'metrics' },
  followerGrowth: { source: 'performance', path: '$performance.metrics.follower_growth', category: 'metrics' },
  expectedPlays: { source: 'performance', path: '$performance.metrics.expected_plays', category: 'metrics' },
  connectedUsers: { source: 'performance', path: '$performance.metrics.connected_users', category: 'metrics' },
  interactionRate30d: { source: 'performance', path: '$performance.metrics.interaction_rate_30d', category: 'metrics' },
  completionRate30d: { source: 'performance', path: '$performance.metrics.completion_rate_30d', category: 'metrics' },
  spreadIndex: { source: 'performance', path: '$performance.metrics.spread_index', category: 'metrics' },
  viralRate: { source: 'performance', path: '$performance.metrics.viral_rate', category: 'metrics' },
  cpm60sExpected: { source: 'performance', path: '$performance.metrics.cpm_60s_expected', category: 'metrics' },

  // ========== 受众画像字段（v1.2 嵌套在 metrics 中）==========
  audienceGenderMale: { source: 'performance', path: '$performance.metrics.audienceGender.male', category: 'audience' },
  audienceGenderFemale: { source: 'performance', path: '$performance.metrics.audienceGender.female', category: 'audience' },
  audienceAge18_23: { source: 'performance', path: '$performance.metrics.audienceAge.18_23', category: 'audience' },
  audienceAge24_30: { source: 'performance', path: '$performance.metrics.audienceAge.24_30', category: 'audience' },
  audienceAge31_40: { source: 'performance', path: '$performance.metrics.audienceAge.31_40', category: 'audience' },
  audienceAge41_50: { source: 'performance', path: '$performance.metrics.audienceAge.41_50', category: 'audience' },
  audienceAge50Plus: { source: 'performance', path: '$performance.metrics.audienceAge.50_plus', category: 'audience' },
  // 人群包（抖音八大人群）
  crowdPackageTownMiddleAged: { source: 'performance', path: '$performance.metrics.crowdPackage.town_middle_aged', category: 'audience' },
  crowdPackageSeniorMiddleClass: { source: 'performance', path: '$performance.metrics.crowdPackage.senior_middle_class', category: 'audience' },
  crowdPackageZEra: { source: 'performance', path: '$performance.metrics.crowdPackage.z_era', category: 'audience' },
  crowdPackageUrbanSilver: { source: 'performance', path: '$performance.metrics.crowdPackage.urban_silver', category: 'audience' },
  crowdPackageTownYouth: { source: 'performance', path: '$performance.metrics.crowdPackage.town_youth', category: 'audience' },
  crowdPackageExquisiteMom: { source: 'performance', path: '$performance.metrics.crowdPackage.exquisite_mom', category: 'audience' },
  crowdPackageNewWhiteCollar: { source: 'performance', path: '$performance.metrics.crowdPackage.new_white_collar', category: 'audience' },
  crowdPackageUrbanBlueCollar: { source: 'performance', path: '$performance.metrics.crowdPackage.urban_blue_collar', category: 'audience' },

  // ========== 客户关系字段（特殊处理）==========
  customerRelations: { source: 'customer_talents', path: 'computed:customerRelations', category: 'customer' },
  cooperationCount: { source: 'customer_talents', path: '$customerRelations.cooperationCount', category: 'customer' },
  lastCooperationDate: { source: 'customer_talents', path: '$customerRelations.lastCooperationDate', category: 'customer' },
  addedAt: { source: 'customer_talents', path: '$customerRelations.addedAt', category: 'customer' }
};

// 默认字段列表
const DEFAULT_FIELDS = [
  'oneId', 'name', 'platform', 'platformAccountId', 'platformSpecific',
  'rebate', 'prices', 'contentTags', 'followerCount', 'customerRelations'
];

// 默认表现数据字段（v1.2 实际有数据的字段）
const DEFAULT_PERFORMANCE_FIELDS = [
  'followers', 'followerGrowth', 'expectedPlays', 'connectedUsers',
  'interactionRate30d', 'completionRate30d', 'spreadIndex', 'viralRate', 'cpm60sExpected'
];

/**
 * 百分比字段集合
 * 这些字段在数据库中存储为小数（0-1），但前端输入为百分比（0-100）
 * 查询时需要将前端值除以 100
 */
const PERCENTAGE_FIELDS = new Set([
  // dimension_configs 中的百分比字段
  'maleRatio',
  'femaleRatio',
  // FIELD_WHITELIST 中的百分比字段
  'audienceGenderMale',
  'audienceGenderFemale',
  'audienceAge18_23',
  'audienceAge24_30',
  'audienceAge31_40',
  'audienceAge41_50',
  'audienceAge50Plus',
  'interactionRate30d',
  'completionRate30d',
  'viralRate',
  // 人群包也是百分比
  'crowdPackageTownMiddleAged',
  'crowdPackageSeniorMiddleClass',
  'crowdPackageZEra',
  'crowdPackageUrbanSilver',
  'crowdPackageTownYouth',
  'crowdPackageExquisiteMom',
  'crowdPackageNewWhiteCollar',
  'crowdPackageUrbanBlueCollar',
  // 数据库原始字段名
  'interaction_rate_30d',
  'completion_rate_30d',
  'viral_rate',
]);

/**
 * 表现筛选字段映射表
 * 将前端 dimension_configs 中的字段 ID 映射到数据库实际路径
 * 前端字段ID -> 数据库路径（在 $lookup 后的 performance 对象中）
 *
 * 注意：
 * 1. dimension_configs 中使用的 ID（如 maleRatio, femaleRatio）
 * 2. FIELD_WHITELIST 中使用的 camelCase ID（如 audienceGenderMale）
 * 3. 数据库中的 snake_case 字段名（如 cpm_60s_expected）
 * 都需要映射到正确的查询路径
 */
const PERFORMANCE_FILTER_FIELD_MAP = {
  // ========== dimension_configs 中的字段 ID ==========
  // 受众性别比例
  'maleRatio': 'performance.metrics.audienceGender.male',
  'femaleRatio': 'performance.metrics.audienceGender.female',
  // CPM（snake_case 格式）
  'cpm_60s_expected': 'performance.metrics.cpm_60s_expected',

  // ========== FIELD_WHITELIST 中的 camelCase 字段 ID ==========
  // 核心指标
  'followers': 'performance.metrics.followers',
  'followerGrowth': 'performance.metrics.follower_growth',
  'expectedPlays': 'performance.metrics.expected_plays',
  'connectedUsers': 'performance.metrics.connected_users',
  'interactionRate30d': 'performance.metrics.interaction_rate_30d',
  'completionRate30d': 'performance.metrics.completion_rate_30d',
  'spreadIndex': 'performance.metrics.spread_index',
  'viralRate': 'performance.metrics.viral_rate',
  'cpm60sExpected': 'performance.metrics.cpm_60s_expected',

  // 受众性别（camelCase 格式）
  'audienceGenderMale': 'performance.metrics.audienceGender.male',
  'audienceGenderFemale': 'performance.metrics.audienceGender.female',

  // 受众年龄
  'audienceAge18_23': 'performance.metrics.audienceAge.18_23',
  'audienceAge24_30': 'performance.metrics.audienceAge.24_30',
  'audienceAge31_40': 'performance.metrics.audienceAge.31_40',
  'audienceAge41_50': 'performance.metrics.audienceAge.41_50',
  'audienceAge50Plus': 'performance.metrics.audienceAge.50_plus',

  // 人群包（抖音八大人群）
  'crowdPackageTownMiddleAged': 'performance.metrics.crowdPackage.town_middle_aged',
  'crowdPackageSeniorMiddleClass': 'performance.metrics.crowdPackage.senior_middle_class',
  'crowdPackageZEra': 'performance.metrics.crowdPackage.z_era',
  'crowdPackageUrbanSilver': 'performance.metrics.crowdPackage.urban_silver',
  'crowdPackageTownYouth': 'performance.metrics.crowdPackage.town_youth',
  'crowdPackageExquisiteMom': 'performance.metrics.crowdPackage.exquisite_mom',
  'crowdPackageNewWhiteCollar': 'performance.metrics.crowdPackage.new_white_collar',
  'crowdPackageUrbanBlueCollar': 'performance.metrics.crowdPackage.urban_blue_collar',

  // ========== 数据库原始 snake_case 字段名（直接查询时使用）==========
  'follower_growth': 'performance.metrics.follower_growth',
  'expected_plays': 'performance.metrics.expected_plays',
  'connected_users': 'performance.metrics.connected_users',
  'interaction_rate_30d': 'performance.metrics.interaction_rate_30d',
  'completion_rate_30d': 'performance.metrics.completion_rate_30d',
  'spread_index': 'performance.metrics.spread_index',
  'viral_rate': 'performance.metrics.viral_rate',
};

/**
 * 将前端筛选字段ID映射到数据库查询路径
 * @param {string} fieldId - 前端传入的字段ID
 * @returns {string} 数据库查询路径
 */
function mapPerformanceFilterField(fieldId) {
  // 优先使用映射表
  if (PERFORMANCE_FILTER_FIELD_MAP[fieldId]) {
    return PERFORMANCE_FILTER_FIELD_MAP[fieldId];
  }
  // 回退：直接使用 performance.metrics.${fieldId}（保持向后兼容）
  return `performance.metrics.${fieldId}`;
}

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

  // 标签配置路由
  if (queryParams.action === 'getTagConfigs') {
    return await getTagConfigs();
  }

  if (queryParams.action === 'updateTagConfigs') {
    return await updateTagConfigs(event.body, event.headers);
  }

  // 批量打标路由
  if (queryParams.action === 'batchUpdateTags') {
    return await batchUpdateTags(event.body, event.headers);
  }

  // 达人全景搜索路由
  if (queryParams.action === 'panoramaSearch') {
    return await panoramaSearch(queryParams);
  }

  // ========== 客户返点管理路由 (v2.9 新增) ==========
  if (queryParams.action === 'getCustomerRebate') {
    return await getCustomerRebate(queryParams);
  }

  if (queryParams.action === 'updateCustomerRebate') {
    return await updateCustomerRebate(event.body, event.headers);
  }

  if (queryParams.action === 'batchUpdateCustomerRebate') {
    return await batchUpdateCustomerRebate(event.body, event.headers);
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
        return await updateCustomerTalent(queryParams.id, event.body, event.headers);

      case 'PUT':
        // PUT 方法用于更新记录（action=update）
        if (queryParams.action === 'update' && queryParams.id) {
          return await updateCustomerTalent(queryParams.id, event.body, event.headers);
        }
        return errorResponse(400, 'PUT 请求需要 action=update 和 id 参数');

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
              },
              // 嵌套 lookup 获取机构名称
              {
                $lookup: {
                  from: 'agencies',
                  let: { agencyId: '$agencyId' },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ['$id', '$$agencyId'] }
                      }
                    },
                    { $project: { name: 1 } }
                  ],
                  as: 'agencyInfo'
                }
              },
              {
                $addFields: {
                  agencyName: {
                    $cond: {
                      if: { $gt: [{ $size: '$agencyInfo' }, 0] },
                      then: { $arrayElemAt: ['$agencyInfo.name', 0] },
                      else: null
                    }
                  }
                }
              },
              // 移除中间字段
              { $project: { agencyInfo: 0 } }
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
    const organizationId = headers['organization-id'] || null;
    const departmentId = headers['department-id'] || null;
    const now = new Date();

    // 准备批量插入的数据
    const docsToInsert = [];
    const duplicates = [];
    const notFound = [];

    for (const talent of talents) {
      const talentOneId = talent.oneId || talent.talentOneId;
      // 支持新版结构化标签和旧版 string[] 标签
      const tags = normalizeTags(talent.tags);
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

      // 准备新文档（包含权限预留字段）
      docsToInsert.push({
        customerId: customer.code,
        talentOneId,
        platform,
        tags,
        notes,
        status: 'active',
        addedBy,
        addedAt: now,
        updatedBy: addedBy,
        updatedAt: now,
        cooperationCount: 0,
        // 权限预留字段
        organizationId,
        departmentId
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
async function updateCustomerTalent(id, body, headers = {}) {
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
    const fieldsToUpdate = {
      updatedAt: new Date(),
      updatedBy: headers['user-id'] || 'system'
    };

    // 处理标签字段（支持新版结构化标签）
    if (updateData.tags !== undefined) {
      fieldsToUpdate.tags = normalizeTags(updateData.tags);
    }

    // 处理备注字段
    if (updateData.notes !== undefined) {
      fieldsToUpdate.notes = updateData.notes;
    }

    if (Object.keys(fieldsToUpdate).length <= 2) {
      // 只有 updatedAt 和 updatedBy，没有实际更新内容
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

// ========== 标签配置函数 ==========

/**
 * 获取标签配置
 */
async function getTagConfigs() {
  let client;

  try {
    client = await getMongoClient();
    const db = client.db(getDbName());
    const config = await db.collection('system_config').findOne({
      configType: 'talent_tags'
    });

    return successResponse({
      importanceLevels: config?.importanceLevels || [],
      businessTags: config?.businessTags || []
    });
  } finally {
    if (client) await client.close();
  }
}

/**
 * 更新标签配置
 */
async function updateTagConfigs(body, headers = {}) {
  let client;

  try {
    const data = JSON.parse(body || '{}');
    const { importanceLevels, businessTags } = data;

    if (!importanceLevels && !businessTags) {
      return errorResponse(400, '缺少必需参数: importanceLevels 或 businessTags');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());

    const updateFields = {
      updatedAt: new Date(),
      updatedBy: headers['user-id'] || 'system'
    };

    if (importanceLevels) {
      updateFields.importanceLevels = importanceLevels;
    }

    if (businessTags) {
      updateFields.businessTags = businessTags;
    }

    const result = await db.collection('system_config').updateOne(
      { configType: 'talent_tags' },
      {
        $set: updateFields,
        $inc: { version: 1 },
        $setOnInsert: {
          configType: 'talent_tags',
          createdAt: new Date(),
          createdBy: headers['user-id'] || 'system'
        }
      },
      { upsert: true }
    );

    return successResponse({
      success: true,
      message: '标签配置更新成功',
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });
  } finally {
    if (client) await client.close();
  }
}

/**
 * 批量更新标签
 * POST /customerTalents?action=batchUpdateTags
 * Body: {
 *   ids: ['id1', 'id2', ...],
 *   tags: { importance: 'core', businessTags: ['long_term'] },
 *   mode: 'replace' | 'merge'  // replace=覆盖, merge=合并业务标签
 * }
 */
async function batchUpdateTags(body, headers = {}) {
  let client;

  try {
    const data = JSON.parse(body || '{}');
    const { ids, tags, mode = 'replace' } = data;

    // 参数校验
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(400, '缺少必需参数: ids (数组)');
    }

    if (!tags) {
      return errorResponse(400, '缺少必需参数: tags');
    }

    if (ids.length > 500) {
      return errorResponse(400, '单次最多更新 500 条记录');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());
    const collection = db.collection('customer_talents');

    const updatedBy = headers['user-id'] || 'system';
    const now = new Date();

    // 规范化标签
    const normalizedTags = normalizeTags(tags);

    let updateResult;

    if (mode === 'merge') {
      // 合并模式：重要程度覆盖，业务标签合并（去重）
      // 需要逐条更新以实现合并逻辑
      let modifiedCount = 0;

      for (const id of ids) {
        try {
          const doc = await collection.findOne({ _id: new ObjectId(id) });
          if (!doc) continue;

          const existingTags = normalizeTags(doc.tags);
          const mergedTags = {
            // 重要程度：如果新的有值则覆盖，否则保留原有
            importance: normalizedTags.importance !== null
              ? normalizedTags.importance
              : existingTags.importance,
            // 业务标签：合并去重
            businessTags: [...new Set([
              ...existingTags.businessTags,
              ...normalizedTags.businessTags
            ])]
          };

          const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                tags: mergedTags,
                updatedAt: now,
                updatedBy
              }
            }
          );

          if (result.modifiedCount > 0) {
            modifiedCount++;
          }
        } catch (e) {
          console.error(`Failed to update id ${id}:`, e.message);
        }
      }

      updateResult = { modifiedCount };
    } else {
      // 覆盖模式：直接批量更新
      const objectIds = ids.map(id => {
        try {
          return new ObjectId(id);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      updateResult = await collection.updateMany(
        { _id: { $in: objectIds } },
        {
          $set: {
            tags: normalizedTags,
            updatedAt: now,
            updatedBy
          }
        }
      );
    }

    return successResponse({
      success: true,
      message: `成功更新 ${updateResult.modifiedCount} 条记录`,
      modifiedCount: updateResult.modifiedCount,
      totalRequested: ids.length,
      mode
    });

  } finally {
    if (client) await client.close();
  }
}

// ========== 达人全景搜索 ==========

/**
 * 达人全景搜索
 * GET /customerTalents?action=panoramaSearch&platform=xxx
 *
 * 支持多维度筛选：
 * - 基础筛选：searchTerm, rebateMin/Max, priceMin/Max, priceType, contentTags
 * - 客户筛选：customerName, importance, businessTags（需先选客户）
 * - 表现筛选：performanceFilters (JSON字符串)
 * - 字段选择：fields (逗号分隔的字段ID列表，支持动态返回所需字段)
 * - 排序：sortField, sortOrder (全量排序，在数据库层面执行)
 *
 * v2.8 新增：
 * - sortField: 排序字段（如 cpm60sExpected, audienceGenderMale 等）
 * - sortOrder: 排序方向（asc 升序, desc 降序，默认 asc）
 *
 * v2.6 新增：
 * - priceType: 指定价格档位筛选（如 video_60plus, video_21_60, video_1_20, video, image）
 *   当与 priceMin/priceMax 配合使用时，仅筛选指定档位的价格
 */
async function panoramaSearch(queryParams = {}) {
  let client;

  try {
    const {
      platform,
      // 基础筛选
      searchTerm,
      rebateMin,
      rebateMax,
      priceMin,
      priceMax,
      priceType,        // 新增 v2.6：指定价格档位筛选（如 video_60plus, video_21_60）
      contentTags,
      // 客户筛选（支持单个或多个）
      customerName,      // 单客户（向后兼容）
      customerNames,     // 多客户（新参数，逗号分隔或数组）
      importance,
      businessTags,
      // 表现筛选（JSON字符串）
      performanceFilters: performanceFiltersStr,
      // 字段选择（新增 v2.4）
      fields: fieldsParam,
      // 排序（新增 v2.8）
      sortField,
      sortOrder = 'asc',
      // 分页
      page = 1,
      pageSize = 20
    } = queryParams;

    // 解析请求的字段列表
    const requestedFields = parseRequestedFields(fieldsParam);

    // 平台必填
    if (!platform) {
      return errorResponse(400, '缺少必需参数: platform');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());

    // 构建聚合管道
    const pipeline = [];

    // 1. 基础匹配 talents 集合
    const baseMatch = {
      platform
    };

    // 搜索词（精确匹配：达人昵称、OneID、平台账号ID）
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      baseMatch.$or = [
        { name: term },              // 精确匹配达人昵称
        { oneId: term },             // 精确匹配 OneID
        { platformAccountId: term }  // 精确匹配平台账号ID
      ];
    }

    // 返点范围（数据库存储为百分比数字，如5表示5%，筛选参数为小数如0.05）
    // v2.13: 修复 falsy 问题 - rebateMin=0 也是有效值
    const hasRebateMin = rebateMin !== undefined && rebateMin !== '' && rebateMin !== null;
    const hasRebateMax = rebateMax !== undefined && rebateMax !== '' && rebateMax !== null;
    if (hasRebateMin || hasRebateMax) {
      baseMatch['currentRebate.rate'] = {};
      if (hasRebateMin) baseMatch['currentRebate.rate'].$gte = parseFloat(rebateMin) * 100;
      if (hasRebateMax) baseMatch['currentRebate.rate'].$lte = parseFloat(rebateMax) * 100;
    }

    // 内容标签（数据库字段是 talentType）
    if (contentTags) {
      const tagArray = Array.isArray(contentTags) ? contentTags : contentTags.split(',');
      baseMatch.talentType = { $in: tagArray };
    }

    pipeline.push({ $match: baseMatch });

    // 2. 客户视角筛选（支持单客户或多客户）
    // 解析客户名称列表
    let customerNameList = [];
    if (customerNames) {
      // 多客户模式
      customerNameList = Array.isArray(customerNames)
        ? customerNames
        : customerNames.split(',').map(n => n.trim()).filter(Boolean);
    } else if (customerName) {
      // 单客户模式（向后兼容）
      customerNameList = [customerName];
    }

    // 是否启用客户视角
    const hasCustomerFilter = customerNameList.length > 0;
    let customerIdMap = {}; // { customerId: customerName }
    // 标签 name -> key 映射（用于筛选时转换）
    let tagNameToKeyMap = { importance: {}, businessTags: {} };

    if (hasCustomerFilter) {
      // 查找所有客户
      const customers = await db.collection('customers').find({
        name: { $in: customerNameList },
        isDeleted: { $ne: true }
      }).toArray();

      if (customers.length === 0) {
        // 所有客户都不存在，返回空结果
        return successResponse({
          list: [],
          total: 0,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: 0
        });
      }

      // 构建 customerIdMap
      customers.forEach(c => {
        customerIdMap[c.code] = c.name;
      });
      const customerIds = Object.keys(customerIdMap);

      // 加载标签配置用于 name -> key 映射（筛选时需要）
      try {
        const tagConfig = await db.collection('system_config').findOne({ configType: 'talent_tags' });
        if (tagConfig) {
          if (tagConfig.importanceLevels) {
            tagConfig.importanceLevels.forEach(item => {
              tagNameToKeyMap.importance[item.name] = item.key;
            });
          }
          if (tagConfig.businessTags) {
            tagConfig.businessTags.forEach(item => {
              tagNameToKeyMap.businessTags[item.name] = item.key;
            });
          }
        }
      } catch (e) {
        console.error('Failed to load tag configs for filtering:', e);
      }

      // 关联 customer_talents（多客户用 $in）
      pipeline.push({
        $lookup: {
          from: 'customer_talents',
          let: { oneId: '$oneId', plat: '$platform' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$talentOneId', '$$oneId'] },
                    { $eq: ['$platform', '$$plat'] },
                    { $in: ['$customerId', customerIds] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            }
          ],
          as: 'customerRelations'
        }
      });

      // 必须至少被一个客户关注
      pipeline.push({
        $match: { 'customerRelations.0': { $exists: true } }
      });

      // 重要程度筛选（任意一个客户关系满足即可）
      // 用户传入的是 name，需要转换为 key 进行查询
      if (importance) {
        const impArray = Array.isArray(importance) ? importance : importance.split(',');
        // 将 name 转换为 key（如果映射存在），否则保持原值
        const impKeys = impArray.map(name => tagNameToKeyMap.importance[name] || name);
        pipeline.push({
          $match: { 'customerRelations.tags.importance': { $in: impKeys } }
        });
      }

      // 业务标签筛选（任意一个客户关系满足即可）
      // 用户传入的是 name，需要转换为 key 进行查询
      if (businessTags) {
        const bizArray = Array.isArray(businessTags) ? businessTags : businessTags.split(',');
        // 将 name 转换为 key（如果映射存在），否则保持原值
        const bizKeys = bizArray.map(name => tagNameToKeyMap.businessTags[name] || name);
        pipeline.push({
          $match: { 'customerRelations.tags.businessTags': { $in: bizKeys } }
        });
      }
    }

    // 3. 表现筛选（如果有）或请求了表现字段
    let performanceFilters = null;
    if (performanceFiltersStr) {
      try {
        performanceFilters = typeof performanceFiltersStr === 'string'
          ? JSON.parse(performanceFiltersStr)
          : performanceFiltersStr;
      } catch (e) {
        console.error('Failed to parse performanceFilters:', e);
      }
    }

    // 判断是否需要关联 performance 集合（筛选条件或请求了表现字段）
    const needsPerformance = (performanceFilters && Object.keys(performanceFilters).length > 0) ||
      needsPerformanceLookup(requestedFields);

    if (needsPerformance) {
      // 关联 talent_performance 集合
      pipeline.push({
        $lookup: {
          from: 'talent_performance',
          let: { oneId: '$oneId', plat: '$platform' },
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
            },
            { $sort: { snapshotDate: -1 } },
            { $limit: 1 }
          ],
          as: 'performance'
        }
      });

      pipeline.push({
        $unwind: { path: '$performance', preserveNullAndEmptyArrays: true }
      });

      // 添加表现筛选条件（如果有）
      if (performanceFilters && Object.keys(performanceFilters).length > 0) {
        console.log(`[v${VERSION}] 表现筛选条件:`, JSON.stringify(performanceFilters));
        const perfMatch = {};
        Object.entries(performanceFilters).forEach(([field, range]) => {
          if (range.min !== undefined || range.max !== undefined) {
            // 将前端字段ID映射到数据库实际路径
            const fieldPath = mapPerformanceFilterField(field);
            // 检查是否是百分比字段，需要将前端值（0-100）转换为小数（0-1）
            const isPercentage = PERCENTAGE_FIELDS.has(field);
            console.log(`[v${VERSION}] 字段映射: ${field} -> ${fieldPath}, 百分比: ${isPercentage}`);

            perfMatch[fieldPath] = {};
            if (range.min !== undefined) {
              let minValue = parseFloat(range.min);
              if (isPercentage) minValue = minValue / 100;
              perfMatch[fieldPath].$gte = minValue;
            }
            if (range.max !== undefined) {
              let maxValue = parseFloat(range.max);
              if (isPercentage) maxValue = maxValue / 100;
              perfMatch[fieldPath].$lte = maxValue;
            }
          }
        });

        if (Object.keys(perfMatch).length > 0) {
          console.log(`[v${VERSION}] 最终表现筛选条件:`, JSON.stringify(perfMatch));
          pipeline.push({ $match: perfMatch });
        }
      }
    }

    // 4. 价格筛选（prices 是数组格式 [{year, month, type, price(分)}]）
    // v2.6: 支持 priceType 参数指定档位筛选
    // v2.13: 前端输入元，数据库存储分，需要乘以100转换
    // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
    const hasPriceMin = priceMin !== undefined && priceMin !== '' && priceMin !== null;
    const hasPriceMax = priceMax !== undefined && priceMax !== '' && priceMax !== null;
    if (hasPriceMin || hasPriceMax) {
      const priceMatch = {};

      // 构建 $elemMatch 条件
      const elemMatchCondition = {};

      // 如果指定了价格档位，添加 type 筛选条件
      if (priceType) {
        elemMatchCondition.type = priceType;
      }

      // 添加价格范围条件（元转分，乘以100）
      // v2.13: 前端输入40000元 -> 数据库查询4000000分
      if (hasPriceMin && hasPriceMax) {
        const minCents = parseFloat(priceMin) * 100;
        const maxCents = parseFloat(priceMax) * 100;
        elemMatchCondition.price = { $gte: minCents, $lte: maxCents };
        console.log(`[v${VERSION}] 价格筛选: ${priceMin}元-${priceMax}元 -> ${minCents}分-${maxCents}分`);
      } else if (hasPriceMin) {
        const minCents = parseFloat(priceMin) * 100;
        elemMatchCondition.price = { $gte: minCents };
        console.log(`[v${VERSION}] 价格筛选: >=${priceMin}元 -> >=${minCents}分`);
      } else if (hasPriceMax) {
        const maxCents = parseFloat(priceMax) * 100;
        elemMatchCondition.price = { $lte: maxCents };
        console.log(`[v${VERSION}] 价格筛选: <=${priceMax}元 -> <=${maxCents}分`);
      }

      priceMatch.prices = { $elemMatch: elemMatchCondition };
      pipeline.push({ $match: priceMatch });
    }

    // 5. 计算总数
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await db.collection('talents').aggregate(countPipeline).toArray();
    const total = countResult[0]?.total || 0;

    // 6. 排序和分页
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // 构建排序条件（v2.8 支持动态排序）
    const sortConfig = buildSortConfig(sortField, sortOrder, needsPerformance);
    console.log(`[v${VERSION}] 排序配置: ${JSON.stringify(sortConfig)}`);
    pipeline.push({ $sort: sortConfig });

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(pageSize) });

    // 7. 投影（根据请求的字段动态构建）
    const dynamicProjection = buildDynamicProjection(requestedFields, hasCustomerFilter);
    console.log(`[v${VERSION}] 动态投影字段: ${requestedFields.join(', ')}`);
    pipeline.push({ $project: dynamicProjection });

    // 执行查询
    let results = await db.collection('talents').aggregate(pipeline).toArray();

    // 后处理：为客户关系添加客户名称，并将标签 key 转换为 name
    console.log(`[v${VERSION}] panoramaSearch 后处理开始, hasCustomerFilter=${hasCustomerFilter}, results.length=${results.length}`);

    if (hasCustomerFilter && Object.keys(customerIdMap).length > 0) {
      // 获取标签配置用于 key -> name 映射
      let tagKeyToNameMap = { importance: {}, businessTags: {} };
      try {
        const tagConfig = await db.collection('system_config').findOne({ configType: 'talent_tags' });
        console.log(`[v${VERSION}] 加载标签配置:`, tagConfig ? '成功' : '未找到');

        if (tagConfig) {
          // 构建重要程度映射
          if (tagConfig.importanceLevels) {
            tagConfig.importanceLevels.forEach(item => {
              tagKeyToNameMap.importance[item.key] = item.name;
            });
            console.log(`[v${VERSION}] 重要程度映射:`, JSON.stringify(tagKeyToNameMap.importance));
          }
          // 构建业务标签映射
          if (tagConfig.businessTags) {
            tagConfig.businessTags.forEach(item => {
              tagKeyToNameMap.businessTags[item.key] = item.name;
            });
            console.log(`[v${VERSION}] 业务标签映射:`, JSON.stringify(tagKeyToNameMap.businessTags));
          }
        }
      } catch (e) {
        console.error('Failed to load tag configs for mapping:', e);
      }

      results = results.map(talent => {
        if (talent.customerRelations) {
          const originalRels = JSON.stringify(talent.customerRelations.slice(0, 1));
          talent.customerRelations = talent.customerRelations.map(rel => ({
            ...rel,
            customerName: customerIdMap[rel.customerId] || rel.customerId,
            // 将 importance key 转换为 name（如果映射存在）
            importance: tagKeyToNameMap.importance[rel.importance] || rel.importance,
            // 将 businessTags keys 转换为 names（如果映射存在）
            businessTags: rel.businessTags?.map(tag => tagKeyToNameMap.businessTags[tag] || tag)
          }));
          // 只打印第一条达人的转换结果用于调试
          if (results.indexOf(talent) === 0) {
            console.log(`[v${VERSION}] 第一条达人标签转换: 原始=${originalRels}, 转换后=${JSON.stringify(talent.customerRelations.slice(0, 1))}`);
          }
        }
        return talent;
      });
    }

    return successResponse({
      list: results,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
      // 返回当前查询模式
      viewMode: hasCustomerFilter ? 'customer' : 'all',
      selectedCustomers: hasCustomerFilter ? customerNameList : null,
      // 返回实际使用的字段列表（v2.4新增）
      fields: requestedFields
    });

  } catch (error) {
    console.error('panoramaSearch error:', error);
    return errorResponse(500, error.message || '搜索失败');
  } finally {
    if (client) await client.close();
  }
}

// ========== 动态字段处理函数 ==========

/**
 * 构建排序配置（v2.8）
 * @param {string|undefined} sortField - 排序字段ID
 * @param {string} sortOrder - 排序方向 (asc/desc)
 * @param {boolean} needsPerformance - 是否已关联 performance 集合
 * @returns {Object} MongoDB $sort 对象
 */
function buildSortConfig(sortField, sortOrder, needsPerformance) {
  const order = sortOrder === 'desc' ? -1 : 1;

  // 默认排序：按名称
  if (!sortField) {
    return { name: order };
  }

  // 检查是否是有效的排序字段
  const fieldConfig = FIELD_WHITELIST[sortField];
  if (!fieldConfig) {
    console.log(`[v${VERSION}] 无效的排序字段: ${sortField}, 使用默认排序`);
    return { name: order };
  }

  // 根据字段来源构建排序路径
  const { source, path } = fieldConfig;

  // 计算字段不支持直接排序，使用默认排序
  if (path.startsWith('computed:')) {
    console.log(`[v${VERSION}] 计算字段不支持排序: ${sortField}, 使用默认排序`);
    return { name: order };
  }

  // 根据数据源构建排序路径
  let sortPath;
  if (source === 'performance') {
    // performance 字段需要去掉开头的 $ 符号
    sortPath = path.replace(/^\$/, '');
  } else if (source === 'talents') {
    // talents 字段直接使用，去掉开头的 $
    sortPath = path.replace(/^\$/, '');
  } else {
    // 其他来源使用字段ID
    sortPath = sortField;
  }

  console.log(`[v${VERSION}] 排序字段: ${sortField} -> 路径: ${sortPath}, 方向: ${order === 1 ? 'asc' : 'desc'}`);
  return { [sortPath]: order };
}

/**
 * 解析请求的字段列表
 * @param {string|string[]|undefined} fieldsParam - 字段参数（逗号分隔或数组）
 * @returns {string[]} 字段ID列表
 */
function parseRequestedFields(fieldsParam) {
  if (!fieldsParam) {
    return DEFAULT_FIELDS;
  }

  let fieldList;
  if (Array.isArray(fieldsParam)) {
    fieldList = fieldsParam;
  } else if (typeof fieldsParam === 'string') {
    fieldList = fieldsParam.split(',').map(f => f.trim()).filter(Boolean);
  } else {
    return DEFAULT_FIELDS;
  }

  // 过滤有效字段（只允许白名单内的字段）
  const validFields = fieldList.filter(f => FIELD_WHITELIST[f]);

  // 如果没有有效字段，返回默认字段
  return validFields.length > 0 ? validFields : DEFAULT_FIELDS;
}

/**
 * 检查是否需要关联 performance 集合
 * @param {string[]} fields - 请求的字段列表
 * @returns {boolean}
 */
function needsPerformanceLookup(fields) {
  return fields.some(f => {
    const config = FIELD_WHITELIST[f];
    return config && config.source === 'performance';
  });
}

/**
 * 构建动态投影对象
 * @param {string[]} fields - 请求的字段列表
 * @param {boolean} hasCustomerFilter - 是否有客户筛选
 * @returns {Object} MongoDB $project 对象
 */
function buildDynamicProjection(fields, hasCustomerFilter) {
  const projection = { _id: 0 };

  for (const fieldId of fields) {
    const config = FIELD_WHITELIST[fieldId];
    if (!config) continue;

    // 处理特殊计算字段
    if (config.path.startsWith('computed:')) {
      const computedType = config.path.replace('computed:', '');
      switch (computedType) {
        case 'rebate':
          projection.rebate = {
            $cond: {
              if: '$currentRebate.rate',
              then: { $divide: ['$currentRebate.rate', 100] },
              else: null
            }
          };
          break;
        case 'prices':
          projection.prices = buildPricesProjection();
          break;
        case 'customerRelations':
          projection.customerRelations = buildCustomerRelationsProjection(hasCustomerFilter);
          break;
        default:
          break;
      }
    } else {
      // 普通字段直接映射
      projection[fieldId] = config.path;
    }
  }

  return projection;
}

/**
 * 构建价格投影（从数组格式转换为对象格式）
 */
function buildPricesProjection() {
  return {
    $let: {
      vars: {
        latestPrices: {
          $filter: {
            input: { $ifNull: ['$prices', []] },
            as: 'p',
            cond: {
              $eq: [
                { $concat: [{ $toString: '$$p.year' }, '-', { $toString: '$$p.month' }] },
                {
                  $max: {
                    $map: {
                      input: { $ifNull: ['$prices', []] },
                      as: 'item',
                      in: { $concat: [{ $toString: '$$item.year' }, '-', { $toString: '$$item.month' }] }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      in: {
        // 抖音价格档位
        video_60plus: {
          $let: {
            vars: {
              found: { $arrayElemAt: [{ $filter: { input: '$$latestPrices', as: 'x', cond: { $eq: ['$$x.type', 'video_60plus'] } } }, 0] }
            },
            in: '$$found.price'
          }
        },
        video_21_60: {
          $let: {
            vars: {
              found: { $arrayElemAt: [{ $filter: { input: '$$latestPrices', as: 'x', cond: { $eq: ['$$x.type', 'video_21_60'] } } }, 0] }
            },
            in: '$$found.price'
          }
        },
        video_1_20: {
          $let: {
            vars: {
              found: { $arrayElemAt: [{ $filter: { input: '$$latestPrices', as: 'x', cond: { $eq: ['$$x.type', 'video_1_20'] } } }, 0] }
            },
            in: '$$found.price'
          }
        },
        // 小红书价格档位
        video: {
          $let: {
            vars: {
              found: { $arrayElemAt: [{ $filter: { input: '$$latestPrices', as: 'x', cond: { $eq: ['$$x.type', 'video'] } } }, 0] }
            },
            in: '$$found.price'
          }
        },
        image: {
          $let: {
            vars: {
              found: { $arrayElemAt: [{ $filter: { input: '$$latestPrices', as: 'x', cond: { $eq: ['$$x.type', 'image'] } } }, 0] }
            },
            in: '$$found.price'
          }
        }
      }
    }
  };
}

/**
 * 构建客户关系投影
 * @param {boolean} hasCustomerFilter - 是否有客户筛选
 */
function buildCustomerRelationsProjection(hasCustomerFilter) {
  return {
    $cond: {
      if: { $gt: [{ $size: { $ifNull: ['$customerRelations', []] } }, 0] },
      then: {
        $map: {
          input: '$customerRelations',
          as: 'rel',
          in: {
            customerId: '$$rel.customerId',
            importance: '$$rel.tags.importance',
            businessTags: '$$rel.tags.businessTags',
            notes: '$$rel.notes',
            cooperationCount: '$$rel.cooperationCount',
            lastCooperationDate: '$$rel.lastCooperationDate',
            addedAt: '$$rel.addedAt'
          }
        }
      },
      else: null
    }
  };
}

/**
 * 规范化标签数据
 * 支持旧版 string[] 和新版 { importance, businessTags } 格式
 */
function normalizeTags(tags) {
  // 如果为空，返回默认结构
  if (!tags) {
    return { importance: null, businessTags: [] };
  }

  // 如果已经是新版结构，直接返回
  if (tags && typeof tags === 'object' && !Array.isArray(tags) && 'importance' in tags) {
    return {
      importance: tags.importance || null,
      businessTags: Array.isArray(tags.businessTags) ? tags.businessTags : []
    };
  }

  // 如果是旧版 string[] 格式，转换为新版
  if (Array.isArray(tags)) {
    const importanceMap = {
      '核心': 'core',
      '重点': 'key',
      '重点关注': 'key',
      '常规': 'normal',
      '备选': 'backup',
      '观察': 'observe',
      '测试': 'observe'
    };

    let importance = null;
    const businessTags = [];

    for (const tag of tags) {
      if (importanceMap[tag] && !importance) {
        importance = importanceMap[tag];
      }
      // 其他标签暂时丢弃（迁移后不再支持旧格式）
    }

    return { importance, businessTags };
  }

  // 其他情况返回默认结构
  return { importance: null, businessTags: [] };
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

// ========== 客户返点管理函数 (v2.9 新增) ==========

/**
 * 获取客户达人返点详情
 * GET /customerTalents?action=getCustomerRebate&customerId=xxx&talentOneId=xxx&platform=xxx
 *
 * 返回：
 * - customerRebate: 客户级返点配置（如果有）
 * - talentRebate: 达人/机构默认返点
 * - effectiveRebate: 实际生效的返点（综合优先级）
 * - history: 最近的返点变更记录
 */
async function getCustomerRebate(queryParams = {}) {
  let client;

  try {
    const { customerId, talentOneId, platform } = queryParams;

    // 参数校验
    if (!customerId || !talentOneId || !platform) {
      return errorResponse(400, '缺少必需参数: customerId, talentOneId, platform');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());

    // 1. 查询 customer_talents 中的客户级返点
    const customerTalent = await db.collection('customer_talents').findOne({
      customerId,
      talentOneId,
      platform,
      status: 'active'
    });

    // 2. 查询达人信息和默认返点
    const talent = await db.collection('talents').findOne({
      oneId: talentOneId,
      platform
    });

    if (!talent) {
      return errorResponse(404, '达人不存在');
    }

    // 3. 如果是机构达人且返点模式为 sync，查询机构返点
    let agencyRebate = null;
    if (talent.agencyId && talent.agencyId !== 'individual' && talent.rebateMode === 'sync') {
      const agency = await db.collection('agencies').findOne({ id: talent.agencyId });
      if (agency?.rebateConfig?.platforms?.[platform]?.baseRebate !== undefined) {
        agencyRebate = {
          rate: agency.rebateConfig.platforms[platform].baseRebate,
          source: 'agency',
          agencyId: talent.agencyId,
          agencyName: agency.name
        };
      }
    }

    // 4. 构建达人默认返点
    const talentRebate = {
      rate: talent.currentRebate?.rate ?? null,
      source: talent.currentRebate?.source ?? 'default',
      effectiveDate: talent.currentRebate?.effectiveDate ?? null
    };

    // 如果是机构达人且有机构返点，使用机构返点
    if (agencyRebate) {
      talentRebate.rate = agencyRebate.rate;
      talentRebate.source = 'agency';
      talentRebate.agencyId = agencyRebate.agencyId;
      talentRebate.agencyName = agencyRebate.agencyName;
    }

    // 5. 构建客户级返点
    const customerRebate = customerTalent?.customerRebate ?? null;

    // 6. 计算生效返点（优先级：客户 > 达人/机构 > 默认）
    let effectiveRebate;
    if (customerRebate?.enabled && customerRebate?.rate !== undefined) {
      effectiveRebate = {
        rate: customerRebate.rate,
        source: 'customer'
      };
    } else if (talentRebate.rate !== null) {
      effectiveRebate = {
        rate: talentRebate.rate,
        source: talentRebate.source
      };
    } else {
      effectiveRebate = {
        rate: 0,
        source: 'default'
      };
    }

    // 7. 查询返点历史记录
    const history = await db.collection('rebate_configs').find({
      targetType: 'customer_talent',
      customerId,
      talentOneId,
      platform
    }).sort({ createdAt: -1 }).limit(10).toArray();

    return successResponse({
      customerRebate,
      talentRebate,
      effectiveRebate,
      history,
      talent: {
        oneId: talent.oneId,
        name: talent.name,
        platform: talent.platform,
        agencyId: talent.agencyId,
        rebateMode: talent.rebateMode
      }
    });

  } finally {
    if (client) await client.close();
  }
}

/**
 * 更新单个客户达人返点
 * POST /customerTalents?action=updateCustomerRebate
 * Body: {
 *   customerId,
 *   talentOneId,
 *   platform,
 *   enabled: boolean,
 *   rate?: number,      // enabled=true 时必填，0-100，精度2位
 *   notes?: string,
 *   updatedBy: string
 * }
 */
async function updateCustomerRebate(body, headers = {}) {
  let client;

  try {
    const data = JSON.parse(body || '{}');
    const { customerId, talentOneId, platform, enabled, rate, notes } = data;
    const updatedBy = data.updatedBy || headers['user-id'] || 'system';

    // 参数校验
    if (!customerId || !talentOneId || !platform) {
      return errorResponse(400, '缺少必需参数: customerId, talentOneId, platform');
    }

    if (typeof enabled !== 'boolean') {
      return errorResponse(400, '缺少必需参数: enabled (boolean)');
    }

    if (enabled && (rate === undefined || rate === null)) {
      return errorResponse(400, '启用客户返点时必须提供 rate');
    }

    if (enabled && (rate < 0 || rate > 100)) {
      return errorResponse(400, 'rate 必须在 0-100 之间');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());

    // 1. 查询现有记录
    const customerTalent = await db.collection('customer_talents').findOne({
      customerId,
      talentOneId,
      platform,
      status: 'active'
    });

    if (!customerTalent) {
      return errorResponse(404, '该达人不在客户池中');
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 2. 获取旧的返点率（用于历史记录）
    const previousRate = customerTalent.customerRebate?.rate ?? null;

    // 3. 构建新的 customerRebate 对象
    const newCustomerRebate = enabled ? {
      enabled: true,
      rate: Math.round(rate * 100) / 100, // 保留2位小数
      effectiveDate: today,
      lastUpdatedAt: now.toISOString(),
      updatedBy,
      notes: notes || ''
    } : {
      enabled: false,
      rate: null,
      effectiveDate: null,
      lastUpdatedAt: now.toISOString(),
      updatedBy,
      notes: notes || ''
    };

    // 4. 更新 customer_talents
    await db.collection('customer_talents').updateOne(
      { _id: customerTalent._id },
      {
        $set: {
          customerRebate: newCustomerRebate,
          updatedAt: now,
          updatedBy
        }
      }
    );

    // 5. 记录到 rebate_configs（仅当启用且返点率有变化时）
    if (enabled && (previousRate === null || previousRate !== rate)) {
      const configId = `rebate_config_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await db.collection('rebate_configs').insertOne({
        configId,
        targetType: 'customer_talent',
        targetId: `${customerId}_${talentOneId}_${platform}`,
        customerId,
        talentOneId,
        platform,
        rebateRate: newCustomerRebate.rate,
        previousRate,
        effectType: 'immediate',
        effectiveDate: now,
        expiryDate: null,
        status: 'active',
        reason: notes || '客户返点设置',
        createdBy: updatedBy,
        createdAt: now,
        updatedAt: null
      });

      // 将之前的 active 记录标记为 expired
      if (previousRate !== null) {
        await db.collection('rebate_configs').updateMany(
          {
            targetType: 'customer_talent',
            customerId,
            talentOneId,
            platform,
            status: 'active',
            configId: { $ne: configId }
          },
          {
            $set: {
              status: 'expired',
              expiryDate: now,
              updatedAt: now
            }
          }
        );
      }
    }

    return successResponse({
      success: true,
      customerRebate: newCustomerRebate,
      message: enabled ? `客户返点已设置为 ${newCustomerRebate.rate}%` : '客户返点已禁用'
    });

  } finally {
    if (client) await client.close();
  }
}

/**
 * 批量更新客户达人返点
 * POST /customerTalents?action=batchUpdateCustomerRebate
 * Body: {
 *   customerId,
 *   platform,
 *   talents: [{ talentOneId, rate, notes? }],
 *   updatedBy: string
 * }
 */
async function batchUpdateCustomerRebate(body, headers = {}) {
  let client;

  try {
    const data = JSON.parse(body || '{}');
    const { customerId, platform, talents } = data;
    const updatedBy = data.updatedBy || headers['user-id'] || 'system';

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

    if (talents.length > 100) {
      return errorResponse(400, '单次最多更新 100 个达人');
    }

    client = await getMongoClient();
    const db = client.db(getDbName());

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const results = {
      updated: 0,
      failed: []
    };

    for (const item of talents) {
      const { talentOneId, rate, notes } = item;

      if (!talentOneId) {
        results.failed.push({ talentOneId: null, reason: '缺少 talentOneId' });
        continue;
      }

      if (rate === undefined || rate === null || rate < 0 || rate > 100) {
        results.failed.push({ talentOneId, reason: 'rate 必须在 0-100 之间' });
        continue;
      }

      try {
        // 查询 customer_talents 记录
        const customerTalent = await db.collection('customer_talents').findOne({
          customerId,
          talentOneId,
          platform,
          status: 'active'
        });

        if (!customerTalent) {
          results.failed.push({ talentOneId, reason: '达人不在客户池中' });
          continue;
        }

        const previousRate = customerTalent.customerRebate?.rate ?? null;
        const normalizedRate = Math.round(rate * 100) / 100;

        // 构建新的 customerRebate
        const newCustomerRebate = {
          enabled: true,
          rate: normalizedRate,
          effectiveDate: today,
          lastUpdatedAt: now.toISOString(),
          updatedBy,
          notes: notes || ''
        };

        // 更新 customer_talents
        await db.collection('customer_talents').updateOne(
          { _id: customerTalent._id },
          {
            $set: {
              customerRebate: newCustomerRebate,
              updatedAt: now,
              updatedBy
            }
          }
        );

        // 记录到 rebate_configs（如果返点率有变化）
        if (previousRate === null || previousRate !== normalizedRate) {
          const configId = `rebate_config_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          await db.collection('rebate_configs').insertOne({
            configId,
            targetType: 'customer_talent',
            targetId: `${customerId}_${talentOneId}_${platform}`,
            customerId,
            talentOneId,
            platform,
            rebateRate: normalizedRate,
            previousRate,
            effectType: 'immediate',
            effectiveDate: now,
            expiryDate: null,
            status: 'active',
            reason: notes || '批量设置客户返点',
            createdBy: updatedBy,
            createdAt: now,
            updatedAt: null
          });

          // 将之前的记录标记为 expired
          if (previousRate !== null) {
            await db.collection('rebate_configs').updateMany(
              {
                targetType: 'customer_talent',
                customerId,
                talentOneId,
                platform,
                status: 'active',
                configId: { $ne: configId }
              },
              {
                $set: {
                  status: 'expired',
                  expiryDate: now,
                  updatedAt: now
                }
              }
            );
          }
        }

        results.updated++;
      } catch (e) {
        console.error(`Failed to update rebate for ${talentOneId}:`, e.message);
        results.failed.push({ talentOneId, reason: e.message });
      }
    }

    return successResponse({
      success: true,
      data: results,
      message: `成功更新 ${results.updated} 个达人的客户返点`
    });

  } finally {
    if (client) await client.close();
  }
}
