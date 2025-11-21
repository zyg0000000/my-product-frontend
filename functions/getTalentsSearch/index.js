/**
 * @file getTalentsSearch.js
 * @version 9.0-dual-db
 * @description
 * 云函数: getTalentsSearch (双数据库统一版)
 *
 * [v9.0] 双数据库支持:
 * 1. [新增] 支持 dbVersion 参数: 'v1' (kol_data/byteproject) 或 'v2' (agentworks_db/agentworks)
 * 2. [新增] 自动字段映射: 根据 dbVersion 自动转换字段名和路径
 * 3. [兼容] 完全向后兼容 v8.x 的所有功能
 *
 * [v8.3] 排序修复:
 * 1. [新增修复] 增加了对内嵌文档字段 (performanceData) 的排序支持。
 * 2. [健壮性] 确保了所有排序请求都能被正确翻译为数据库可识别的 "点符号" 路径。
 *
 * [v8.2] 兼容性升级:
 * 1. [新增功能] 增加了对 `talent_pool.js` 页面特有的筛选条件的支持。
 * 2. [统一接口] 成为一个统一的、向后兼容的接口，能同时满足 `performance.js` 和 `talent_pool.js` 两个页面的所有数据查询需求。
 *
 * [v8.0] 核心能力:
 * - 接收 POST 请求与 JSON 查询体。
 * - 动态构建复杂的 AND/OR 查询。
 * - 支持丰富的比较操作符。
 * - 保留分页、排序和看板统计功能。
 */

const { MongoClient } = require('mongodb');

// --- 数据库连接配置 ---
const MONGO_URI = process.env.MONGO_URI;
const TALENTS_COLLECTION = 'talents';

// --- 双数据库配置 ---
const DB_CONFIGS = {
  v1: {
    dbName: 'kol_data',
    // v1 字段映射 (byteproject)
    fields: {
      name: 'nickname',
      platformAccountId: 'xingtuId',
      oneId: 'uid',
      // performanceData 字段
      'performanceData.cpm': 'performanceData.cpm60s',
      'performanceData.audienceGender.male': 'performanceData.maleAudienceRatio',
      'performanceData.audienceGender.female': 'performanceData.femaleAudienceRatio',
      'performanceData.audienceAge.18_40': 'performanceData.audience_18_40_ratio',
      'performanceData.audienceAge.40_plus': 'performanceData.audience_40_plus_ratio',
    },
    // 搜索字段
    searchFields: ['nickname', 'xingtuId', 'uid'],
    // 内嵌排序字段
    performanceDataSortKeys: new Set([
      'maleAudienceRatio',
      'femaleAudienceRatio',
      'cpm60s',
      'audience_18_40_ratio',
      'audience_40_plus_ratio',
      'lastUpdated'
    ]),
    // Dashboard 统计字段路径
    dashboardFields: {
      cpm: 'performanceData.cpm60s',
      maleRatio: 'performanceData.maleAudienceRatio',
      femaleRatio: 'performanceData.femaleAudienceRatio'
    }
  },
  v2: {
    dbName: 'agentworks_db',
    // v2 字段映射 (agentworks) - 原生字段名
    fields: {
      name: 'name',
      platformAccountId: 'platformAccountId',
      oneId: 'oneId',
      'performanceData.cpm': 'performanceData.cpm',
      'performanceData.audienceGender.male': 'performanceData.audienceGender.male',
      'performanceData.audienceGender.female': 'performanceData.audienceGender.female',
      'performanceData.audienceAge.18_40': 'performanceData.audienceAge.18_40',
      'performanceData.audienceAge.40_plus': 'performanceData.audienceAge.40_plus',
    },
    // 搜索字段
    searchFields: ['name', 'platformAccountId', 'oneId'],
    // 内嵌排序字段
    performanceDataSortKeys: new Set([
      'audienceGender.male',
      'audienceGender.female',
      'cpm',
      'audienceAge.18_40',
      'audienceAge.40_plus',
      'lastUpdated'
    ]),
    // Dashboard 统计字段路径
    dashboardFields: {
      cpm: 'performanceData.cpm',
      maleRatio: 'performanceData.audienceGender.male',
      femaleRatio: 'performanceData.audienceGender.female'
    }
  }
};

// 默认使用 v1 以保持向后兼容
const DEFAULT_DB_VERSION = 'v1';

let clients = {}; // 缓存数据库连接

/**
 * 获取指定版本的数据库连接
 */
async function connectToDatabase(dbVersion = DEFAULT_DB_VERSION) {
  const config = DB_CONFIGS[dbVersion] || DB_CONFIGS[DEFAULT_DB_VERSION];
  const dbName = config.dbName;

  if (!clients[dbName]) {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    clients[dbName] = client;
  }

  return clients[dbName].db(dbName);
}

/**
 * 字段名映射: 将统一字段名转换为特定版本的字段名
 */
function mapFieldName(fieldName, dbVersion) {
  const config = DB_CONFIGS[dbVersion] || DB_CONFIGS[DEFAULT_DB_VERSION];
  return config.fields[fieldName] || fieldName;
}

/**
 * 映射筛选条件中的字段名
 */
function mapFilterDimension(dimension, dbVersion) {
  // 常见字段映射
  const commonMappings = {
    v1: {
      'name': 'nickname',
      'platformAccountId': 'xingtuId',
      'oneId': 'uid',
      'performanceData.cpm': 'performanceData.cpm60s',
      'performanceData.audienceGender.male': 'performanceData.maleAudienceRatio',
      'performanceData.audienceGender.female': 'performanceData.femaleAudienceRatio',
      // 简化映射 (前端可能传这些)
      'cpm': 'performanceData.cpm60s',
      'maleRatio': 'performanceData.maleAudienceRatio',
      'femaleRatio': 'performanceData.femaleAudienceRatio',
    },
    v2: {
      // v2 字段名保持原样，但需要补全路径
      'cpm': 'performanceData.cpm',
      'maleRatio': 'performanceData.audienceGender.male',
      'femaleRatio': 'performanceData.audienceGender.female',
    }
  };

  const mappings = commonMappings[dbVersion] || commonMappings[DEFAULT_DB_VERSION];
  return mappings[dimension] || dimension;
}

// --- 辅助函数，将前端操作符转换为MongoDB查询语法 ---
function buildMongoQuery(filter, dbVersion = DEFAULT_DB_VERSION) {
    let { dimension, operator, value } = filter;

    // 映射字段名到对应版本
    dimension = mapFilterDimension(dimension, dbVersion);

    if (operator === 'isEmpty') {
        return { [dimension]: { $in: [null, "", undefined] } };
    }
    if (operator === 'isNotEmpty') {
        return { [dimension]: { $nin: [null, "", undefined] } };
    }

    const numValue = parseFloat(value);
    const isNumeric = !isNaN(numValue);

    switch(operator) {
        case '>': return isNumeric ? { [dimension]: { $gt: numValue } } : null;
        case '>=': return isNumeric ? { [dimension]: { $gte: numValue } } : null;
        case '<': return isNumeric ? { [dimension]: { $lt: numValue } } : null;
        case '<=': return isNumeric ? { [dimension]: { $lte: numValue } } : null;
        case '!=': return { [dimension]: { $ne: isNumeric ? numValue : value } };
        case '=': return { [dimension]: isNumeric ? numValue : value };
        case 'contains': return { [dimension]: { $regex: String(value), $options: 'i' } };
        case 'notContains': return { [dimension]: { $not: { $regex: String(value), $options: 'i' } } };
        case 'between':
            if (Array.isArray(value) && value.length === 2) {
                const min = parseFloat(value[0]);
                const max = parseFloat(value[1]);
                if (!isNaN(min) && !isNaN(max)) {
                    return { [dimension]: { $gte: min, $lte: max } };
                }
            }
            return null;
        default: return null;
    }
}


exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');

        // --- [v9.0] 获取数据库版本参数 ---
        const dbVersion = body.dbVersion || DEFAULT_DB_VERSION;
        const dbConfig = DB_CONFIGS[dbVersion] || DB_CONFIGS[DEFAULT_DB_VERSION];

        // 连接对应的数据库
        const db = await connectToDatabase(dbVersion);
        const collection = db.collection(TALENTS_COLLECTION);

        // 如果是 v2，还需要按平台筛选
        const platform = body.platform;

        const page = body.page || 1;
        const pageSize = body.pageSize || 10;
        const search = body.search || '';
        const tiers = body.tiers || [];
        const types = body.types || [];

        let sortBy = body.sortBy || 'createdAt';
        const sortOrder = body.sortOrder === 'asc' ? 1 : -1;

        // --- [排序字段映射] ---
        // 根据版本获取对应的 performanceData 排序键
        const performanceDataSortKeys = dbConfig.performanceDataSortKeys;

        // 如果请求的排序键属于 performanceData，则为其添加正确的路径前缀
        if (performanceDataSortKeys.has(sortBy)) {
            sortBy = `performanceData.${sortBy}`;
        }

        // 对于 v2 的简化排序字段名，进行映射
        if (dbVersion === 'v2') {
            const v2SortMappings = {
                'cpm': 'performanceData.cpm',
                'maleRatio': 'performanceData.audienceGender.male',
                'femaleRatio': 'performanceData.audienceGender.female',
            };
            if (v2SortMappings[sortBy]) {
                sortBy = v2SortMappings[sortBy];
            }
        }

        const filterLogic = body.filterLogic === 'OR' ? '$or' : '$and';
        const dataFilters = body.filters || [];

        const matchConditions = [];

        // --- [v9.0] v2 平台筛选 ---
        if (dbVersion === 'v2' && platform) {
            matchConditions.push({ platform: platform });
        }

        // --- 基础筛选 (根据版本使用不同字段名) ---
        if (search) {
            const searchFields = dbConfig.searchFields;
            const isNumericId = /^\d+$/.test(search);

            if (dbVersion === 'v1') {
                // v1: nickname, xingtuId, uid
                if (isNumericId) {
                    matchConditions.push({
                        $or: [
                            { nickname: { $regex: search, $options: 'i' } },
                            { xingtuId: search },
                            { uid: search }
                        ]
                    });
                } else {
                    matchConditions.push({ nickname: { $regex: search, $options: 'i' } });
                }
            } else {
                // v2: name, platformAccountId, oneId
                if (isNumericId) {
                    matchConditions.push({
                        $or: [
                            { name: { $regex: search, $options: 'i' } },
                            { platformAccountId: search },
                            { oneId: search }
                        ]
                    });
                } else {
                    matchConditions.push({ name: { $regex: search, $options: 'i' } });
                }
            }
        }

        if (tiers.length > 0) { matchConditions.push({ talentTier: { $in: tiers } }); }
        if (types.length > 0) { matchConditions.push({ talentType: { $in: types } }); }

        // --- `performance.js` 页面的灵活筛选 (带字段映射) ---
        if (dataFilters.length > 0) {
            const dataFilterConditions = dataFilters
                .map(filter => buildMongoQuery(filter, dbVersion))
                .filter(Boolean);
            if (dataFilterConditions.length > 0) {
                if (filterLogic === '$or' && dataFilterConditions.length > 1) {
                    matchConditions.push({ $or: dataFilterConditions });
                } else {
                    matchConditions.push(...dataFilterConditions);
                }
            }
        }

        // --- `talent_pool.js` 页面的特定筛选 ---
        if (body.rebateMin !== undefined || body.rebateMax !== undefined) {
            const rebateQuery = {};
            if (body.rebateMin !== null && body.rebateMin !== undefined) rebateQuery.$gte = body.rebateMin;
            if (body.rebateMax !== null && body.rebateMax !== undefined) rebateQuery.$lte = body.rebateMax;
            if (Object.keys(rebateQuery).length > 0) matchConditions.push({ 'rebates.rate': rebateQuery });
        }

        if (body.priceYear && body.priceMonth) {
            const priceMatch = { year: body.priceYear, month: body.priceMonth };
            const priceRangeQuery = {};
            if (body.priceMin !== null && body.priceMin !== undefined) priceRangeQuery.$gte = body.priceMin;
            if (body.priceMax !== null && body.priceMax !== undefined) priceRangeQuery.$lte = body.priceMax;
            if (Object.keys(priceRangeQuery).length > 0) priceMatch.price = priceRangeQuery;
            matchConditions.push({ prices: { $elemMatch: priceMatch } });
        }

        // --- [v9.0 新增] agentworks 专用筛选参数 ---
        // CPM 筛选
        if (body.cpmMin !== undefined || body.cpmMax !== undefined) {
            const cpmField = dbConfig.dashboardFields.cpm;
            const cpmQuery = {};
            if (body.cpmMin !== null && body.cpmMin !== undefined) cpmQuery.$gte = parseFloat(body.cpmMin);
            if (body.cpmMax !== null && body.cpmMax !== undefined) cpmQuery.$lte = parseFloat(body.cpmMax);
            if (Object.keys(cpmQuery).length > 0) matchConditions.push({ [cpmField]: cpmQuery });
        }

        // 男性受众比例筛选
        if (body.maleRatioMin !== undefined || body.maleRatioMax !== undefined) {
            const maleField = dbConfig.dashboardFields.maleRatio;
            const maleQuery = {};
            if (body.maleRatioMin !== null && body.maleRatioMin !== undefined) maleQuery.$gte = parseFloat(body.maleRatioMin);
            if (body.maleRatioMax !== null && body.maleRatioMax !== undefined) maleQuery.$lte = parseFloat(body.maleRatioMax);
            if (Object.keys(maleQuery).length > 0) matchConditions.push({ [maleField]: maleQuery });
        }

        // 女性受众比例筛选
        if (body.femaleRatioMin !== undefined || body.femaleRatioMax !== undefined) {
            const femaleField = dbConfig.dashboardFields.femaleRatio;
            const femaleQuery = {};
            if (body.femaleRatioMin !== null && body.femaleRatioMin !== undefined) femaleQuery.$gte = parseFloat(body.femaleRatioMin);
            if (body.femaleRatioMax !== null && body.femaleRatioMax !== undefined) femaleQuery.$lte = parseFloat(body.femaleRatioMax);
            if (Object.keys(femaleQuery).length > 0) matchConditions.push({ [femaleField]: femaleQuery });
        }

        const matchStage = matchConditions.length > 0 ? { $and: matchConditions } : {};

        // --- [v9.0] Dashboard 统计字段根据版本动态配置 ---
        const dashboardFields = dbConfig.dashboardFields;

        const facetPipeline = {
            paginatedResults: [
                { $sort: { [sortBy]: sortOrder, _id: 1 } },
                { $skip: (page - 1) * pageSize },
                { $limit: pageSize },
                { $project: { _id: 0 } }
            ],
            totalCount: [{ $count: 'count' }],
            tierDistribution: [
                { $match: { talentTier: { $exists: true, $ne: null, $ne: "" } } },
                { $group: { _id: "$talentTier", count: { $sum: 1 } } },
                { $project: { _id: 0, tier: "$_id", count: 1 } }
            ],
            cpmDistribution: [
                { $match: { [dashboardFields.cpm]: { $type: "number" } } },
                { $bucket: {
                    groupBy: `$${dashboardFields.cpm}`,
                    boundaries: [0, 10, 15, 20, 30, Infinity],
                    default: "Other",
                    output: { "count": { $sum: 1 } }
                }}
            ],
            maleAudienceDistribution: [
                { $match: { [dashboardFields.maleRatio]: { $type: "number" } } },
                { $bucket: {
                    groupBy: `$${dashboardFields.maleRatio}`,
                    boundaries: [0, 0.4, 0.5, 0.6, 1.01],
                    default: "Other",
                    output: { "count": { $sum: 1 } }
                }}
            ],
            femaleAudienceDistribution: [
                { $match: { [dashboardFields.femaleRatio]: { $type: "number" } } },
                { $bucket: {
                    groupBy: `$${dashboardFields.femaleRatio}`,
                    boundaries: [0, 0.4, 0.5, 0.6, 1.01],
                    default: "Other",
                    output: { "count": { $sum: 1 } }
                }}
            ]
        };

        const pipeline = [ { $match: matchStage }, { $facet: facetPipeline } ];
        const results = await collection.aggregate(pipeline).toArray();

        const facetResult = results[0] || {};
        const talents = facetResult.paginatedResults || [];
        const totalItems = (facetResult.totalCount && facetResult.totalCount[0]) ? facetResult.totalCount[0].count : 0;

        const responseBody = {
            success: true,
            dbVersion: dbVersion,  // 返回使用的数据库版本
            data: {
                pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
                talents: talents,
                dashboardStats: {
                    tierDistribution: facetResult.tierDistribution || [],
                    cpmDistribution: facetResult.cpmDistribution || [],
                    maleAudienceDistribution: facetResult.maleAudienceDistribution || [],
                    femaleAudienceDistribution: facetResult.femaleAudienceDistribution || []
                }
            }
        };

        return { statusCode: 200, headers, body: JSON.stringify(responseBody) };

    } catch (error) {
        console.error('An error occurred:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message })
        };
    }
};

