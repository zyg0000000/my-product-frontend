/**
 * [生产版 v3.2 - v1/v2 双版本架构支持]
 * 云函数：getTalents
 * 描述：获取达人列表，并在后端完成"合作次数"和"是否合作中"状态的聚合计算。
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
 * ========== v2 处理逻辑 ==========
 * 支持多平台架构、oneId 分组查询
 */
async function handleV2Query(db, queryParams, headers) {
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
      projection: { _id: 0, oneId: 1, platform: 1, nickname: 1, platformAccountId: 1 }
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
