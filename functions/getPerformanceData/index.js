/**
 * @file getPerformanceData.js
 * @version 2.0-multi-collection
 * @description
 * 云函数: getPerformanceData (多集合支持版)
 * 专为"近期表现"页面(performance.html)设计的高性能数据接口。
 *
 * [v2.0] 多集合支持:
 * - 支持 dbVersion 参数 (v1/v2)
 * - v2 版本支持从 talent_performance 集合读取表现数据
 * - 自动关联两个集合的数据
 *
 * [v1.0] 功能特性:
 * - 继承自 getTalentsSearch 的全部功能 (分页, 搜索, 筛选, 排序)。
 * - [增强] 在一次查询中返回 dashboardStats, 用于驱动数据看板。
 * - [增强] 在一次查询中返回 allFilteredIds, 用于支持"全选所有"功能。
 *
 * 触发器: API 网关, GET /performance/search
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const TALENTS_COLLECTION = 'talents';
const PERFORMANCE_COLLECTION = 'talent_performance';
const DIMENSION_CONFIGS_COLLECTION = 'dimension_configs';

// 数据库配置
const DB_CONFIGS = {
  v1: {
    dbName: 'kol_data',
    cpmField: 'performanceData.cpm60s',
    maleRatioField: 'performanceData.maleAudienceRatio',
    femaleRatioField: 'performanceData.femaleAudienceRatio',
    idField: 'id',
    nameField: 'nickname',
    searchFields: ['nickname', 'xingtuId']
  },
  v2: {
    dbName: 'agentworks_db',
    cpmField: 'performanceData.cpm',
    maleRatioField: 'performanceData.audienceGender.male',
    femaleRatioField: 'performanceData.audienceGender.female',
    idField: 'oneId',
    nameField: 'name',
    searchFields: ['name', 'platformAccountId', 'oneId']
  }
};

let clients = {};

async function connectToDatabase(dbVersion = 'v1') {
  const config = DB_CONFIGS[dbVersion] || DB_CONFIGS.v1;
  const dbName = config.dbName;

  if (!clients[dbName]) {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    clients[dbName] = client;
  }

  return clients[dbName].db(dbName);
}

/**
 * 构建 talent_performance 关联查询的 $lookup 管道
 */
function buildPerformanceLookupPipeline() {
  return [
    {
      $lookup: {
        from: PERFORMANCE_COLLECTION,
        let: { talentOneId: '$oneId', talentPlatform: '$platform' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$oneId', '$$talentOneId'] },
                  { $eq: ['$platform', '$$talentPlatform'] }
                ]
              }
            }
          },
          { $sort: { snapshotDate: -1 } },
          { $limit: 1 },
          { $project: { _id: 0, metrics: 1, snapshotDate: 1, snapshotType: 1 } }
        ],
        as: '_performanceData'
      }
    },
    {
      $addFields: {
        _latestPerformance: { $arrayElemAt: ['$_performanceData', 0] }
      }
    },
    {
      $addFields: {
        performanceData: {
          $mergeObjects: [
            '$performanceData',
            '$_latestPerformance.metrics',
            {
              _snapshotDate: '$_latestPerformance.snapshotDate',
              _snapshotType: '$_latestPerformance.snapshotType'
            }
          ]
        }
      }
    },
    {
      $project: {
        _performanceData: 0,
        _latestPerformance: 0
      }
    }
  ];
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // 1. 解析查询参数
    const queryParams = event.queryStringParameters || {};
    const dbVersion = queryParams.dbVersion || 'v1';
    const dbConfig = DB_CONFIGS[dbVersion] || DB_CONFIGS.v1;

    const db = await connectToDatabase(dbVersion);
    const collection = db.collection(TALENTS_COLLECTION);

    const page = parseInt(queryParams.page) || 1;
    const pageSize = parseInt(queryParams.pageSize) || 10;
    const search = queryParams.search || '';
    const tiers = queryParams.tiers ? queryParams.tiers.split(',') : [];
    const types = queryParams.types ? queryParams.types.split(',') : [];
    const platform = queryParams.platform;
    const sortBy = queryParams.sortBy || 'createdAt';
    const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;

    // 2. 构建基础筛选条件 ($match stage)
    const matchConditions = [];

    // v2 平台筛选
    if (dbVersion === 'v2' && platform) {
      matchConditions.push({ platform });
    }

    if (search) {
      if (dbVersion === 'v1') {
        matchConditions.push({
          $or: [
            { nickname: { $regex: search, $options: 'i' } },
            { xingtuId: { $regex: search, $options: 'i' } }
          ]
        });
      } else {
        matchConditions.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { platformAccountId: { $regex: search, $options: 'i' } },
            { oneId: { $regex: search, $options: 'i' } }
          ]
        });
      }
    }

    if (tiers.length > 0) {
      matchConditions.push({ talentTier: { $in: tiers } });
    }
    if (types.length > 0) {
      matchConditions.push({ talentType: { $in: types } });
    }

    const matchStage = matchConditions.length > 0 ? { $and: matchConditions } : {};

    // 3. 构建聚合管道
    const pipeline = [
      { $match: matchStage }
    ];

    // v2 版本：添加 $lookup 关联 talent_performance
    if (dbVersion === 'v2') {
      pipeline.push(...buildPerformanceLookupPipeline());
    }

    // 添加 $facet 阶段
    pipeline.push({
      $facet: {
        // 分支一: 获取分页后的详细数据
        paginatedResults: [
          { $sort: { [sortBy]: sortOrder } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          { $project: { _id: 0 } }
        ],
        // 分支二: 计算元数据 (总数, ID列表, 看板统计)
        metadata: [
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              allFilteredIds: { $push: `$${dbConfig.idField}` },
              // 看板统计: 层级分布
              tierDistribution: { $push: '$talentTier' },
              // 看板统计: CPM分布
              cpmDistribution: { $push: `$${dbConfig.cpmField}` },
              // 看板统计: 性别占比
              maleAudienceDistribution: { $push: `$${dbConfig.maleRatioField}` },
              femaleAudienceDistribution: { $push: `$${dbConfig.femaleRatioField}` }
            }
          }
        ]
      }
    });

    const results = await collection.aggregate(pipeline).toArray();

    // 4. 解析聚合结果
    const paginatedTalents = results[0].paginatedResults;
    const meta = results[0].metadata[0] || {};
    const totalItems = meta.totalItems || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // 5. 后处理看板数据
    const processDistribution = (arr, groups, key) => {
      (arr || []).forEach(val => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (key === 'cpm') {
            if (num < 15) groups['< 15']++;
            else if (num < 30) groups['15-30']++;
            else groups['>= 30']++;
          } else if (key === 'gender') {
            if (num < 0.4) groups['< 40%']++;
            else if (num < 0.6) groups['40-60%']++;
            else groups['>= 60%']++;
          }
        } else {
          groups['未填写']++;
        }
      });
      return groups;
    };

    const dashboardStats = {
      tierDistribution: (meta.tierDistribution || []).reduce((acc, tier) => {
        const key = tier || '未分类';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      cpmDistribution: processDistribution(meta.cpmDistribution, { '< 15': 0, '15-30': 0, '>= 30': 0, '未填写': 0 }, 'cpm'),
      maleAudienceDistribution: processDistribution(meta.maleAudienceDistribution, { '< 40%': 0, '40-60%': 0, '>= 60%': 0, '未填写': 0 }, 'gender'),
      femaleAudienceDistribution: processDistribution(meta.femaleAudienceDistribution, { '< 40%': 0, '40-60%': 0, '>= 60%': 0, '未填写': 0 }, 'gender'),
    };

    // 6. 组装并返回最终响应
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dbVersion,
        multiCollection: dbVersion === 'v2',
        data: {
          pagination: {
            page,
            pageSize,
            totalItems,
            totalPages
          },
          talents: paginatedTalents,
          metadata: {
            dashboardStats: dashboardStats,
            allFilteredIds: meta.allFilteredIds || []
          }
        }
      })
    };

  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message })
    };
  }
};
