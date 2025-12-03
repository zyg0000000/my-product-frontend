/**
 * [生产版 v2.3 - 客户达人池 RESTful API]
 * 云函数：customerTalents
 * 描述：统一的客户达人池 RESTful API，实现客户与达人的多对多关联管理
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
 * - [优化] 单次批量最多100条记录
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
const VERSION = '2.3.1';

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

    if (ids.length > 100) {
      return errorResponse(400, '单次最多更新 100 条记录');
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
 * - 基础筛选：searchTerm, tiers, rebateMin/Max, priceMin/Max, contentTags
 * - 客户筛选：customerName, importance, businessTags（需先选客户）
 * - 表现筛选：performanceFilters (JSON字符串)
 */
async function panoramaSearch(queryParams = {}) {
  let client;

  try {
    const {
      platform,
      // 基础筛选
      searchTerm,
      tiers,
      rebateMin,
      rebateMax,
      priceMin,
      priceMax,
      contentTags,
      // 客户筛选（支持单个或多个）
      customerName,      // 单客户（向后兼容）
      customerNames,     // 多客户（新参数，逗号分隔或数组）
      importance,
      businessTags,
      // 表现筛选（JSON字符串）
      performanceFilters: performanceFiltersStr,
      // 分页
      page = 1,
      pageSize = 20
    } = queryParams;

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

    // 搜索词
    if (searchTerm && searchTerm.trim()) {
      baseMatch.$or = [
        { name: { $regex: searchTerm.trim(), $options: 'i' } },
        { oneId: { $regex: searchTerm.trim(), $options: 'i' } }
      ];
    }

    // 达人层级
    if (tiers) {
      const tierArray = Array.isArray(tiers) ? tiers : tiers.split(',');
      baseMatch.talentTier = { $in: tierArray };
    }

    // 返点范围（数据库存储为百分比数字，如5表示5%，筛选参数为小数如0.05）
    if (rebateMin || rebateMax) {
      baseMatch['currentRebate.rate'] = {};
      if (rebateMin) baseMatch['currentRebate.rate'].$gte = parseFloat(rebateMin) * 100;
      if (rebateMax) baseMatch['currentRebate.rate'].$lte = parseFloat(rebateMax) * 100;
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

    // 3. 表现筛选（如果有）
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

    if (performanceFilters && Object.keys(performanceFilters).length > 0) {
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

      // 添加表现筛选条件
      const perfMatch = {};
      Object.entries(performanceFilters).forEach(([field, range]) => {
        if (range.min !== undefined || range.max !== undefined) {
          perfMatch[`performance.metrics.${field}`] = {};
          if (range.min !== undefined) {
            perfMatch[`performance.metrics.${field}`].$gte = parseFloat(range.min);
          }
          if (range.max !== undefined) {
            perfMatch[`performance.metrics.${field}`].$lte = parseFloat(range.max);
          }
        }
      });

      if (Object.keys(perfMatch).length > 0) {
        pipeline.push({ $match: perfMatch });
      }
    }

    // 4. 价格筛选（prices 是数组格式 [{year, month, type, price}]）
    // 筛选任意价格类型在范围内的达人
    if (priceMin || priceMax) {
      const priceMatch = {};

      if (priceMin && priceMax) {
        // 同时指定 min 和 max：至少有一个价格在范围内
        priceMatch.prices = {
          $elemMatch: {
            price: { $gte: parseFloat(priceMin), $lte: parseFloat(priceMax) }
          }
        };
      } else if (priceMin) {
        // 只指定 min：至少有一个价格 >= min
        priceMatch.prices = {
          $elemMatch: {
            price: { $gte: parseFloat(priceMin) }
          }
        };
      } else if (priceMax) {
        // 只指定 max：至少有一个价格 <= max
        priceMatch.prices = {
          $elemMatch: {
            price: { $lte: parseFloat(priceMax) }
          }
        };
      }

      if (Object.keys(priceMatch).length > 0) {
        pipeline.push({ $match: priceMatch });
      }
    }

    // 5. 计算总数
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await db.collection('talents').aggregate(countPipeline).toArray();
    const total = countResult[0]?.total || 0;

    // 6. 分页
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    pipeline.push({ $sort: { name: 1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(pageSize) });

    // 7. 投影（选择返回字段，映射数据库字段到API字段）
    pipeline.push({
      $project: {
        oneId: 1,
        name: 1,
        platform: 1,
        talentTier: 1,
        // rebate: 从 currentRebate.rate 映射
        rebate: {
          $cond: {
            if: '$currentRebate.rate',
            then: { $divide: ['$currentRebate.rate', 100] }, // 转换为小数
            else: null
          }
        },
        // prices: 从数组格式转换为对象格式（取最新月份）
        prices: {
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
              video_under_20: {
                $let: {
                  vars: {
                    found: { $arrayElemAt: [{ $filter: { input: '$$latestPrices', as: 'x', cond: { $eq: ['$$x.type', 'video_1_20'] } } }, 0] }
                  },
                  in: '$$found.price'
                }
              }
            }
          }
        },
        // contentTags: 映射自 talentType
        contentTags: '$talentType',
        followerCount: '$fansCount',
        // 客户关系数据（多客户模式返回数组，全量模式不返回）
        customerRelations: {
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
                  notes: '$$rel.notes'
                }
              }
            },
            else: null
          }
        },
        performance: {
          $cond: {
            if: '$performance',
            then: '$performance.metrics',
            else: null
          }
        }
      }
    });

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
      selectedCustomers: hasCustomerFilter ? customerNameList : null
    });

  } catch (error) {
    console.error('panoramaSearch error:', error);
    return errorResponse(500, error.message || '搜索失败');
  } finally {
    if (client) await client.close();
  }
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
