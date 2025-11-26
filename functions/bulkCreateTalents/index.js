/**
 * @file bulkCreateTalents.js
 * @description
 * 云函数: bulkCreateTalents (v6 - 野生达人返点修复)
 * 负责处理批量创建新达人的请求。
 *
 * --- v6 更新日志 (2025-11-26) ---
 * - [BUG修复] 野生达人的默认返点率改为从 agencies 集合读取，不再硬编码为 0
 * - [新增] getWildTalentRebateRate() 函数用于获取野生达人机构的默认返点率
 *
 * --- v5 更新日志 (2025-11-26) ---
 * - [并发安全] oneId 生成改用 counters 集合 + findOneAndUpdate 原子操作
 * - [性能优化] 批量创建时一次性获取所需的 oneId 区间，避免多次查询
 *
 * --- v4 更新日志 (2025-11-26) ---
 * - [架构升级] 支持 v1/v2 双数据库版本（参考 getTalents 模式）
 * - [v2 新增] 支持多平台（douyin, xiaohongshu, bilibili, kuaishou）
 * - [v2 新增] 支持 oneId 跨平台关联
 * - [v2 新增] 支持 platformAccountId + platform 唯一性校验
 * - [向后兼容] v1 逻辑完全保留，确保旧产品正常运行
 *
 * --- v3 更新日志 ---
 * - 【兼容性】同时兼容【中文表头】和【英文表头】的键名。
 * - 【安全性】检查 `xingtuId` 是否已存在，防止重复创建。
 * - 【规范性】为每条新记录自动生成唯一的 `id` 和标准的时间戳。
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const TALENTS_COLLECTION = 'talents';
const COUNTERS_COLLECTION = 'counters';
const AGENCIES_COLLECTION = 'agencies';
const WILD_TALENT_AGENCY_ID = 'individual';

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
 * 获取下一批 oneId（v2 专用，并发安全）
 * 使用 counters 集合 + findOneAndUpdate 原子操作
 *
 * @param {Db} db - MongoDB 数据库实例
 * @param {number} count - 需要获取的 oneId 数量
 * @returns {Promise<string[]>} oneId 数组
 */
/**
 * 获取野生达人机构的默认返点率（按平台）
 *
 * @param {Db} db - MongoDB 数据库实例
 * @param {string} platform - 平台标识
 * @returns {Promise<number>} 返点率（百分比，如 15 表示 15%）
 */
async function getWildTalentRebateRate(db, platform) {
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);

  const wildAgency = await agenciesCollection.findOne({ id: WILD_TALENT_AGENCY_ID });

  if (!wildAgency || !wildAgency.rebateConfig) {
    console.log('[bulkCreateTalents] 野生达人机构未配置返点，使用默认值 0');
    return 0;
  }

  // 优先读取平台特定的返点率
  if (wildAgency.rebateConfig.platforms && wildAgency.rebateConfig.platforms[platform]) {
    const platformRebate = wildAgency.rebateConfig.platforms[platform].baseRebate;
    console.log(`[bulkCreateTalents] 野生达人 ${platform} 平台返点率: ${platformRebate}%`);
    return platformRebate;
  }

  // 回退到基础返点率
  const baseRebate = wildAgency.rebateConfig.baseRebate || 0;
  console.log(`[bulkCreateTalents] 野生达人基础返点率: ${baseRebate}%`);
  return baseRebate;
}

async function getNextOneIds(db, count) {
  const countersCollection = db.collection(COUNTERS_COLLECTION);

  // 原子操作：递增 sequence_value 并返回更新后的值
  const result = await countersCollection.findOneAndUpdate(
    { _id: 'talent_oneId' },
    { $inc: { sequence_value: count } },
    {
      returnDocument: 'after',
      upsert: true // 如果不存在则创建
    }
  );

  // 计算起始值（更新后的值 - count + 1 = 起始值）
  const endValue = result.sequence_value;
  const startValue = endValue - count + 1;

  // 生成 oneId 数组
  const oneIds = [];
  for (let i = 0; i < count; i++) {
    oneIds.push(`talent_${String(startValue + i).padStart(8, '0')}`);
  }

  return oneIds;
}

/**
 * ========== v1 处理逻辑 ==========
 * 保持原有逻辑不变，确保旧产品（byteproject）正常运行
 */
async function handleV1Create(collection, talentsData, headers) {
  // 1. 提取所有传入的 xingtuId (兼容中文和英文)
  const incomingXingtuIds = talentsData.map(t => t.xingtuId || t['星图ID']).filter(id => id);
  if (incomingXingtuIds.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: '提交的数据中缺少有效的 xingtuId。' })
    };
  }

  // 2. 一次性查询数据库，找出所有已存在的 xingtuId
  const existingTalents = await collection.find({ xingtuId: { $in: incomingXingtuIds } }).project({ xingtuId: 1 }).toArray();
  const existingXingtuIdSet = new Set(existingTalents.map(t => t.xingtuId));

  // 3. 分离出真正需要创建的新达人和已存在的达人
  const talentsToInsert = [];
  const errors = [];
  let failedCount = 0;

  for (const row of talentsData) {
    const nickname = row.nickname || row['达人昵称'];
    const xingtuId = row.xingtuId || row['星图ID'];
    const uid = row.uid || row['UID'];
    const talentType = row.talentType || row['内容标签'];
    const talentSource = row.talentSource || row['达人来源'];
    const talentTier = row.talentTier || row['达人层级'];

    if (!xingtuId) {
      failedCount++;
      errors.push({ nickname: nickname || '未知昵称', reason: '缺少 xingtuId' });
      continue;
    }
    if (existingXingtuIdSet.has(xingtuId.toString())) {
      failedCount++;
      errors.push({ xingtuId: xingtuId, nickname: nickname, reason: '该星图ID已存在，创建被拒绝。' });
    } else {
      talentsToInsert.push({
        id: `talent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nickname: nickname || '未命名',
        xingtuId: xingtuId.toString(),
        uid: uid ? uid.toString() : null,
        talentType: talentType ? String(talentType).split(',').map(t => t.trim()) : [],
        talentSource: talentSource || '野生达人',
        talentTier: talentTier || null,
        prices: [],
        rebates: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // 4. 一次性批量插入所有新达人
  let createdCount = 0;
  if (talentsToInsert.length > 0) {
    const insertResult = await collection.insertMany(talentsToInsert, { ordered: false });
    createdCount = insertResult.insertedCount;
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      message: '批量创建操作完成。',
      data: {
        created: createdCount,
        failed: failedCount,
        errors: errors
      }
    }),
  };
}

/**
 * ========== v2 处理逻辑 ==========
 * 支持多平台、oneId 跨平台关联
 */
async function handleV2Create(collection, talentsData, platform, headers) {
  // 验证平台参数
  const validPlatforms = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];
  if (!platform || !validPlatforms.includes(platform)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: `无效的平台参数。支持的平台: ${validPlatforms.join(', ')}`
      })
    };
  }

  // 验证数据条数限制
  if (talentsData.length > 100) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: '单次批量创建上限为 100 条'
      })
    };
  }

  // 根据平台确定唯一标识字段
  const getPlatformAccountId = (row) => {
    if (platform === 'douyin') {
      return row.platformAccountId || row.xingtuId || row['星图ID'];
    } else if (platform === 'xiaohongshu') {
      return row.platformAccountId || row['蒲公英ID'] || row['小红书ID'];
    } else if (platform === 'bilibili') {
      return row.platformAccountId || row['B站UID'] || row.biliUid;
    } else if (platform === 'kuaishou') {
      return row.platformAccountId || row['快手ID'] || row.kuaishouId;
    }
    return row.platformAccountId;
  };

  // 1. 提取所有传入的 platformAccountId
  const incomingAccountIds = talentsData
    .map(t => getPlatformAccountId(t))
    .filter(id => id)
    .map(id => id.toString());

  if (incomingAccountIds.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: '提交的数据中缺少有效的平台账号ID'
      })
    };
  }

  // 2. 一次性查询数据库，找出该平台下所有已存在的 platformAccountId
  const existingTalents = await collection
    .find({
      platform: platform,
      platformAccountId: { $in: incomingAccountIds }
    })
    .project({ platformAccountId: 1 })
    .toArray();
  const existingAccountIdSet = new Set(existingTalents.map(t => t.platformAccountId));

  // 2.5 获取野生达人的默认返点率（从 agencies 集合读取）
  const wildTalentRebateRate = await getWildTalentRebateRate(collection.s.db, platform);

  // 3. 检查批次内重复
  const batchAccountIds = new Set();
  const talentsToInsert = [];
  const errors = [];
  let failedCount = 0;

  for (const row of talentsData) {
    // 解析字段（兼容中英文）
    const name = row.name || row.nickname || row['达人昵称'] || row['昵称'] || row['名称'];
    const platformAccountId = getPlatformAccountId(row);
    const uid = row.uid || row['UID'] || row['抖音UID'];
    const talentTier = row.talentTier || row['达人层级'] || null; // 由前端传入，无默认值
    const agencyId = row.agencyId || 'individual'; // 默认野生达人

    // 校验必填字段
    if (!name) {
      failedCount++;
      errors.push({
        platformAccountId: platformAccountId || '未知',
        name: '未知',
        reason: '缺少达人昵称'
      });
      continue;
    }

    if (!platformAccountId) {
      failedCount++;
      errors.push({
        platformAccountId: '未知',
        name: name,
        reason: '缺少平台账号ID'
      });
      continue;
    }

    const accountIdStr = platformAccountId.toString();

    // 校验格式（抖音星图ID和UID应为数字）
    if (platform === 'douyin') {
      if (!/^\d+$/.test(accountIdStr)) {
        failedCount++;
        errors.push({
          platformAccountId: accountIdStr,
          name: name,
          reason: '星图ID必须为纯数字'
        });
        continue;
      }
      if (uid && !/^\d+$/.test(uid.toString())) {
        failedCount++;
        errors.push({
          platformAccountId: accountIdStr,
          name: name,
          reason: 'UID必须为纯数字'
        });
        continue;
      }
    }

    // 检查数据库中是否已存在
    if (existingAccountIdSet.has(accountIdStr)) {
      failedCount++;
      errors.push({
        platformAccountId: accountIdStr,
        name: name,
        reason: '该平台账号ID已存在'
      });
      continue;
    }

    // 检查批次内是否重复
    if (batchAccountIds.has(accountIdStr)) {
      failedCount++;
      errors.push({
        platformAccountId: accountIdStr,
        name: name,
        reason: '批次内重复'
      });
      continue;
    }

    batchAccountIds.add(accountIdStr);

    // 构建 v2 数据结构
    // 判断是否为野生达人，决定默认返点率
    const isWildTalent = agencyId === WILD_TALENT_AGENCY_ID;
    const defaultRebateRate = isWildTalent ? wildTalentRebateRate : 0; // 机构达人的返点率后续由机构同步

    const talentDoc = {
      oneId: null, // 稍后批量生成
      platform: platform,
      platformAccountId: accountIdStr,
      name: name,
      fansCount: row.fansCount ? parseInt(row.fansCount, 10) : null,
      talentType: [], // 不录入，后期更新
      talentTier: talentTier,
      agencyId: agencyId, // 'individual' = 野生达人
      rebateMode: isWildTalent ? 'independent' : 'sync', // 野生达人固定独立模式，机构达人默认同步
      currentRebate: {
        rate: defaultRebateRate,
        source: isWildTalent ? 'agency' : 'default', // 野生达人从机构配置读取
        effectiveDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date()
      },
      prices: [],
      platformSpecific: {},
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 添加平台特有字段
    if (platform === 'douyin') {
      talentDoc.platformSpecific.xingtuId = accountIdStr;
      if (uid) {
        talentDoc.platformSpecific.uid = uid.toString();
      }
    }

    talentsToInsert.push(talentDoc);
  }

  // 4. 为每个新达人生成 oneId（使用原子操作，并发安全）
  if (talentsToInsert.length > 0) {
    const oneIds = await getNextOneIds(collection.s.db, talentsToInsert.length);
    talentsToInsert.forEach((doc, index) => {
      doc.oneId = oneIds[index];
    });
  }

  // 5. 一次性批量插入
  let createdCount = 0;
  if (talentsToInsert.length > 0) {
    const insertResult = await collection.insertMany(talentsToInsert, { ordered: false });
    createdCount = insertResult.insertedCount;
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      message: '批量创建操作完成。',
      dbVersion: 'v2',
      data: {
        created: createdCount,
        failed: failedCount,
        total: talentsData.length,
        errors: errors
      }
    }),
  };
}

/**
 * ========== 主处理函数 ==========
 */
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  try {
    const requestBody = JSON.parse(event.body || '{}');

    // 判断数据库版本
    const dbVersion = requestBody.dbVersion || 'v1';
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    // 获取达人数据数组
    const talentsData = requestBody.talents || requestBody;
    if (!Array.isArray(talentsData) || talentsData.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '请求体必须包含非空的 talents 数组'
        })
      };
    }

    const dbClient = await connectToDatabase();
    const collection = dbClient.db(DB_NAME).collection(TALENTS_COLLECTION);

    // 根据版本路由到对应处理函数
    if (dbVersion === 'v2') {
      const platform = requestBody.platform;
      return await handleV2Create(collection, talentsData, platform, headers);
    } else {
      return await handleV1Create(collection, talentsData, headers);
    }

  } catch (error) {
    console.error('[bulkCreateTalents v4] 错误:', error);
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
