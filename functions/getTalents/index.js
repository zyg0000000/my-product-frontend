/**
 * [生产版 v3.3 - 分页与筛选支持]
 * 云函数：getTalents
 * 描述：获取达人列表，支持分页、多维度筛选、排序。
 *
 * --- v3.3 更新日志 (2025-11-18) ---
 * - [性能优化] 添加分页支持（page, limit），避免大数据量全量加载
 * - [功能增强] 支持多维度筛选：
 *   - searchTerm: 名称/OneID搜索
 *   - tiers: 达人层级筛选
 *   - tags: 内容标签筛选
 *   - rebateMin/rebateMax: 返点率区间筛选
 *   - priceMin/priceMax/priceTiers: 价格筛选
 * - [排序支持] 支持按任意字段排序（sortBy, order）
 * - [向后兼容] 不传分页参数时保持原有行为（全量返回）
 * - [代码规范] 参考 getCollaborators v6.2 成熟实现
 * - [稳定性增强] 排序添加二级键（_id），防止分页重复
 *
 * --- v3.2 更新日志 (2025-11-17) ---
 * - [参数新增] v2 模式支持 agencyId 参数，用于按机构筛选达人
 * - [功能支持] 支持机构管理页面统计各机构的达人数量
 *
 * --- v3.1 更新日志 (2025-11-16) ---
 * - [字段新增] v2 模式下返回 currentRebate 字段（当前返点率）
 *
 * --- v3.0 更新日志 (2025-11-14) ---
 * - [架构升级] 支持 v1/v2 双数据库版本
 * - [多平台支持] v2 支持按 platform 筛选（douyin, xiaohongshu 等）
 * - [分组查询] v2 支持 groupBy=oneId 参数，按 oneId 分组返回多平台数据
 * - [向后兼容] 完全保留 v1 逻辑，确保旧产品正常运行
 *
 * --- v2.1 更新日志 ---
 * - [功能补全] 增加了通过 talentId 查询单个达人详情的功能。
 * - [健壮性提升] 实现了"双源数据读取"，兼容 Postman 和在线测试工具。
 * - [规范统一] 统一了环境变量名 (MONGO_URI) 和配置读取方式，与其他函数保持一致。
 * ---------------------
 */

const { MongoClient } = require('mongodb');

// 统一使用规范的环境变量
const MONGO_URI = process.env.MONGO_URI;
const TALENTS_COLLECTION = 'talents';
const COLLABS_COLLECTION = 'collaborations';

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
 * 获取当前年月（YYYY-MM格式）
 */
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * ========== v1 处理逻辑 ==========
 * 保持原有逻辑不变，确保旧产品（byteproject）正常运行
 */
async function handleV1Query(db, queryParams, headers) {
  const { talentId, view } = queryParams;
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  let talentsData;

  // 构造基础的筛选条件
  const baseMatch = talentId ? { id: talentId } : {};

  if (view === 'simple') {
    // 简单视图：直接查询，只返回基础字段
    talentsData = await talentsCollection.find(baseMatch, {
      projection: { _id: 0, id: 1, nickname: 1, xingtuId: 1 }
    }).toArray();
  } else {
    // 重量级视图：执行聚合计算
    const aggregationPipeline = [
      { $match: baseMatch },
      { $project: { _id: 0 } },
      { $lookup: {
          from: COLLABS_COLLECTION,
          localField: 'id',
          foreignField: 'talentId',
          as: 'collaborations'
        }
      },
      { $addFields: {
          collaborationCount: { $size: '$collaborations' },
          inCollaboration: {
            $anyElementTrue: {
              $map: {
                input: '$collaborations',
                as: 'collab',
                in: { $eq: ['$$collab.status', '客户已定档'] }
              }
            }
          }
        }
      },
      { $project: { collaborations: 0 } }
    ];

    talentsData = await talentsCollection.aggregate(aggregationPipeline).toArray();
  }

  // 如果是按 ID 查询
  if (talentId) {
    if (talentsData.length > 0) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, data: talentsData[0] })
      };
    } else {
      return {
        statusCode: 404, headers,
        body: JSON.stringify({ success: false, message: `未找到 ID 为 '${talentId}' 的达人` })
      };
    }
  }

  // 查询列表
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      count: talentsData.length,
      data: talentsData,
      view: view || 'full'
    }),
  };
}

/**
 * ========== v2 处理逻辑（传统模式）==========
 * 保持原有逻辑，用于向后兼容
 */
async function handleV2QueryLegacy(db, queryParams, headers) {
  const { oneId, platform, agencyId, groupBy, view } = queryParams;
  const talentsCollection = db.collection(TALENTS_COLLECTION);

  // 构造基础筛选条件
  const baseMatch = {};
  if (oneId) baseMatch.oneId = oneId;
  if (platform) baseMatch.platform = platform;
  if (agencyId) baseMatch.agencyId = agencyId;

  let talentsData;

  if (view === 'simple') {
    // 简单视图：直接查询基础字段
    talentsData = await talentsCollection.find(baseMatch, {
      projection: { _id: 0, oneId: 1, platform: 1, name: 1, platformAccountId: 1 }
    }).toArray();
  } else {
    // 完整视图：查询所有字段，包括 currentRebate 对象
    talentsData = await talentsCollection.find(baseMatch, {
      projection: { _id: 0 }
    }).toArray();
  }

  // 如果是按 oneId 查询单个达人
  if (oneId && !groupBy) {
    if (talentsData.length > 0) {
      // 如果指定了 platform，返回单个记录
      if (platform) {
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ success: true, data: talentsData[0] })
        };
      }
      // 如果没有指定 platform，返回该 oneId 下所有平台的数据
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          success: true,
          data: talentsData.length === 1 ? talentsData[0] : talentsData
        })
      };
    } else {
      return {
        statusCode: 404, headers,
        body: JSON.stringify({ success: false, message: `未找到 oneId 为 '${oneId}' 的达人` })
      };
    }
  }

  // 如果需要按 oneId 分组
  if (groupBy === 'oneId') {
    const grouped = talentsData.reduce((acc, talent) => {
      const existingGroup = acc.find(g => g.oneId === talent.oneId);
      if (existingGroup) {
        existingGroup.platforms.push(talent);
      } else {
        acc.push({
          oneId: talent.oneId,
          platforms: [talent]
        });
      }
      return acc;
    }, []);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: grouped.length,
        data: grouped,
        view: view || 'full',
        groupBy: 'oneId'
      }),
    };
  }

  // 默认：返回扁平结构的列表
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      count: talentsData.length,
      data: talentsData,
      view: view || 'full'
    }),
  };
}

/**
 * ========== v2 分页查询逻辑（v3.3 新增）==========
 * 支持分页、筛选、排序
 */
async function handleV2QueryWithPagination(db, queryParams, headers) {
  const {
    oneId, platform, agencyId,
    page = '1',
    limit = '15',
    sortBy = 'updatedAt',
    order = 'desc',
    searchTerm,
    tiers,
    tags,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
    priceTiers,
    priceMonth
  } = queryParams;

  // 参数验证和解析
  const pageNum = parseInt(page, 10);
  let limitNum = parseInt(limit, 10);

  // 参数验证
  if (isNaN(pageNum) || pageNum < 1) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'page 参数必须是大于 0 的整数'
      })
    };
  }

  if (isNaN(limitNum) || limitNum < 1) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'limit 参数必须是大于 0 的整数'
      })
    };
  }

  // 限制每页最大数量为 100
  limitNum = Math.min(limitNum, 100);

  const skipNum = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  // 构建基础筛选条件
  const matchStage = {};
  if (platform) matchStage.platform = platform;
  if (agencyId) matchStage.agencyId = agencyId;
  if (oneId) matchStage.oneId = oneId;

  // 搜索词筛选（名称或 OneID）
  if (searchTerm) {
    matchStage.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { oneId: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  // 层级筛选
  if (tiers) {
    const tierArray = tiers.split(',').map(s => s.trim()).filter(Boolean);
    if (tierArray.length > 0) {
      matchStage.talentTier = { $in: tierArray };
    }
  }

  // 标签筛选
  if (tags) {
    const tagArray = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagArray.length > 0) {
      matchStage.talentType = { $in: tagArray };
    }
  }

  // 返点率筛选
  if (rebateMin || rebateMax) {
    matchStage['currentRebate.rate'] = {};
    if (rebateMin) {
      matchStage['currentRebate.rate'].$gte = parseFloat(rebateMin);
    }
    if (rebateMax) {
      matchStage['currentRebate.rate'].$lte = parseFloat(rebateMax);
    }
  }

  // 构建聚合管道
  const pipeline = [];

  // 添加基础匹配条件
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // 价格筛选（需要特殊处理）
  // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
  const hasPriceMin = priceMin !== undefined && priceMin !== '' && priceMin !== null;
  const hasPriceMax = priceMax !== undefined && priceMax !== '' && priceMax !== null;
  if (hasPriceMin || hasPriceMax || priceTiers) {
    const targetMonth = priceMonth || getCurrentMonth();
    const [year, month] = targetMonth.split('-').map(Number);

    // 添加最新价格字段
    pipeline.push({
      $addFields: {
        latestPrices: {
          $filter: {
            input: '$prices',
            as: 'price',
            cond: {
              $and: [
                { $eq: ['$$price.year', year] },
                { $eq: ['$$price.month', month] }
              ]
            }
          }
        }
      }
    });

    // 价格档位筛选
    if (priceTiers) {
      const tierArray = priceTiers.split(',').map(s => s.trim()).filter(Boolean);
      if (tierArray.length > 0) {
        pipeline.push({
          $match: {
            'latestPrices.type': { $in: tierArray }
          }
        });
      }
    }

    // 价格区间筛选（单位：元 → 分）
    if (hasPriceMin || hasPriceMax) {
      const minCents = hasPriceMin ? parseFloat(priceMin) * 100 : 0;
      const maxCents = hasPriceMax ? parseFloat(priceMax) * 100 : Number.MAX_SAFE_INTEGER;

      pipeline.push({
        $match: {
          'latestPrices.price': {
            $gte: minCents,
            $lte: maxCents
          }
        }
      });
    }
  }

  // 分页和排序（参考 getCollaborators v6.2）
  const facetStage = {
    $facet: {
      paginatedResults: [
        // 添加二级排序键确保稳定性
        { $sort: { [sortBy]: sortOrder, _id: 1 } },
        { $skip: skipNum },
        { $limit: limitNum },
        { $project: { _id: 0 } } // 移除 _id 字段
      ],
      totalCount: [
        { $count: 'count' }
      ]
    }
  };

  pipeline.push(facetStage);

  // 执行聚合查询
  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const results = await talentsCollection.aggregate(pipeline).toArray();

  const talents = results[0].paginatedResults;
  const total = results[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: talents,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    })
  };
}

/**
 * ========== v2 处理逻辑主入口 ==========
 * 根据参数判断使用分页模式还是传统模式
 */
async function handleV2Query(db, queryParams, headers) {
  const { page, limit } = queryParams;

  // 向后兼容：如果提供了分页参数，使用新的分页逻辑
  if (page || limit) {
    return await handleV2QueryWithPagination(db, queryParams, headers);
  }

  // 否则使用传统逻辑（完全兼容原有功能）
  return await handleV2QueryLegacy(db, queryParams, headers);
}

/**
 * ========== 主处理函数 ==========
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // [健壮性提升] 实现"双源数据读取"
    let queryParams = {};
    if (event.queryStringParameters) {
      queryParams = event.queryStringParameters;
    }
    // 后备方案，兼容在线测试工具可能将参数放在 body 的情况
    if (event.body) {
      try {
        Object.assign(queryParams, JSON.parse(event.body));
      } catch(e) {
        /* ignore */
      }
    }

    // [架构升级] 根据 dbVersion 参数确定使用哪个数据库
    const dbVersion = queryParams.dbVersion || 'v1';
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 路由到对应的版本处理函数
    if (dbVersion === 'v2') {
      return await handleV2Query(db, queryParams, headers);
    } else {
      return await handleV1Query(db, queryParams, headers);
    }

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
