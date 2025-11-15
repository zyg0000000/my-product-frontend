/**
 * [生产版 v2.0 - 多平台架构升级版]
 * 云函数：processTalents
 * 描述：处理新增或批量更新达人信息的请求，支持 v1 和 v2 数据库。
 *
 * --- v2.0 更新日志 ---
 * - [架构升级] 支持 v2 多平台架构（agentworks_db）
 * - [oneId 系统] 实现 oneId 自动生成和管理（8位数字自增）
 * - [多平台支持] 支持 douyin（抖音）和 xiaohongshu（小红书）
 * - [向后兼容] 完全兼容 v1（kol_data）的所有功能
 * - [智能判断] 自动识别创建新达人 vs 更新现有达人
 *
 * --- v1.1 更新日志 ---
 * - [规范统一] 更新了环境变量和配置读取方式，与项目最新标准对齐。
 * - [规范统一] 实现了"双源数据读取"，以兼容在线测试工具。
 * ---------------------
 * 触发器：API 网关, 通过 POST /talents 路径调用。
 */

const { MongoClient } = require('mongodb');

// MongoDB 连接配置
const MONGO_URI = process.env.MONGO_URI;

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
 * 生成下一个 oneId（v2 专用）
 * 格式：talent_00000001（8位数字自增）
 */
async function generateNextOneId(db) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: 'talent_oneId' },
    { $inc: { sequence_value: 1 } },
    {
      upsert: true,
      returnDocument: 'after'
    }
  );

  const seqValue = result.value.sequence_value;
  return `talent_${String(seqValue).padStart(8, '0')}`;
}

/**
 * v1 处理逻辑（保持原有功能不变）
 */
async function handleV1Process(db, talentsToProcess, headers) {
  const collection = db.collection('talents');

  const bulkOperations = talentsToProcess.map(talent => {
    // 数据校验：确保核心字段存在
    if (!talent.xingtuId || !talent.nickname) {
      return null; // 跳过无效数据
    }

    const now = new Date();

    // 准备更新操作
    return {
      updateOne: {
        filter: { xingtuId: talent.xingtuId }, // 以 xingtuId 作为唯一键
        update: {
          $set: {
            ...talent, // 传入的所有字段都会被更新
            updatedAt: now,
          },
          $setOnInsert: { // 仅在插入新文档时应用的字段
            id: `talent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            createdAt: now,
          }
        },
        upsert: true, // 如果找不到匹配的文档，则创建新文档
      }
    };
  }).filter(op => op !== null); // 过滤掉无效操作

  let createdCount = 0;
  let updatedCount = 0;

  if (bulkOperations.length > 0) {
    const result = await collection.bulkWrite(bulkOperations);
    createdCount = result.upsertedCount;
    updatedCount = result.modifiedCount;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: '操作成功！',
      data: {
        created: createdCount,
        updated: updatedCount,
        skipped: talentsToProcess.length - (createdCount + updatedCount),
      }
    }),
  };
}

/**
 * v2 处理逻辑（多平台架构）
 */
async function handleV2Process(db, talentsToProcess, headers) {
  const collection = db.collection('talents');
  const results = { created: 0, updated: 0, skipped: 0 };
  const errors = [];

  for (const talent of talentsToProcess) {
    try {
      // 数据校验
      if (!talent.platform || !talent.platformAccountId || !talent.name) {
        results.skipped++;
        errors.push({
          talent: talent.name || talent.platformAccountId || 'unknown',
          reason: '缺少必需字段：platform, platformAccountId, name'
        });
        continue;
      }

      // 确定 oneId
      let oneId = talent.oneId;

      if (!oneId) {
        // 没有提供 oneId，检查是否已存在
        const existing = await collection.findOne({
          platformAccountId: talent.platformAccountId,
          platform: talent.platform
        });

        if (existing) {
          // 已存在，复用其 oneId
          oneId = existing.oneId;
        } else {
          // 不存在，生成新的 oneId
          oneId = await generateNextOneId(db);
        }
      }

      // 构建 v2 数据结构
      const now = new Date();
      const v2Talent = {
        oneId,
        platform: talent.platform,
        platformAccountId: talent.platformAccountId,
        name: talent.name,
        avatar: talent.avatar,
        fansCount: talent.fansCount,
        talentType: talent.talentType || [],
        talentTier: talent.talentTier,
        prices: talent.prices || {},
        rebate: talent.rebate,
        platformSpecific: talent.platformSpecific || {},
        performanceData: talent.performanceData || {},
        schedules: talent.schedules || [],
        remarks: talent.remarks || {},
        status: talent.status || 'active',
        updatedAt: now
      };

      // Upsert 操作
      const result = await collection.updateOne(
        { oneId, platform: talent.platform },
        {
          $set: v2Talent,
          $setOnInsert: {
            createdAt: now,
            oneIdHistory: []
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        results.created++;
      } else if (result.modifiedCount > 0) {
        results.updated++;
      }

    } catch (error) {
      console.error('处理单个达人时出错:', error);
      results.skipped++;
      errors.push({
        talent: talent.name || talent.platformAccountId,
        reason: error.message
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: '操作成功！',
      data: results,
      errors: errors.length > 0 ? errors : undefined
    })
  };
}

/**
 * 主处理函数
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
    // 解析请求体
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '请求体 JSON 格式错误' })
        };
      }
    }

    // 如果 body 为空，尝试从 queryStringParameters 读取（双源数据读取）
    if (Object.keys(requestBody).length === 0 && event.queryStringParameters) {
      requestBody = event.queryStringParameters;
    }

    // 提取 dbVersion 参数
    const { dbVersion, ...body } = requestBody;

    // 确定是单个对象还是数组，统一处理为数组
    const talentsToProcess = Array.isArray(body) ? body : [body];

    if (talentsToProcess.length === 0 || (talentsToProcess.length === 1 && Object.keys(talentsToProcess[0]).length === 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: '请求体为空或格式不正确。' }),
      };
    }

    // 根据版本选择数据库
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 根据版本调用不同的处理逻辑
    if (dbVersion === 'v2') {
      console.log(`[v2] 处理 ${talentsToProcess.length} 个达人，数据库: ${DB_NAME}`);
      return await handleV2Process(db, talentsToProcess, headers);
    } else {
      console.log(`[v1] 处理 ${talentsToProcess.length} 个达人，数据库: ${DB_NAME}`);
      return await handleV1Process(db, talentsToProcess, headers);
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
      }),
    };
  }
};
