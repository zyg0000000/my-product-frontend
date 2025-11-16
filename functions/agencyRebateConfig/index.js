/**
 * 机构返点配置管理云函数
 * 用于更新机构的返点配置
 */

const { MongoClient } = require('mongodb');

// MongoDB 连接配置
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'agentworks';

exports.handler = async function (event, context) {
  const { httpMethod, body, headers } = event;

  // 设置 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // 处理 OPTIONS 请求（预检请求）
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  // 只处理 PUT 请求
  if (httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
      }),
    };
  }

  let client;

  try {
    // 解析请求体
    const requestData = typeof body === 'string' ? JSON.parse(body) : body;
    const { agencyId, rebateConfig, syncToTalents } = requestData;

    if (!agencyId || !rebateConfig || rebateConfig.baseRebate === undefined) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: '缺少必要参数: agencyId 和 rebateConfig.baseRebate',
        }),
      };
    }

    // 验证返点率范围
    if (rebateConfig.baseRebate < 0 || rebateConfig.baseRebate > 100) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: '返点率必须在 0-100 之间',
        }),
      };
    }

    // 连接 MongoDB
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const agenciesCollection = db.collection('agencies');
    const talentsCollection = db.collection('talents');

    // 构建更新对象
    const now = new Date();
    const updateData = {
      'rebateConfig.baseRebate': rebateConfig.baseRebate,
      'rebateConfig.lastUpdatedAt': now.toISOString(),
      'rebateConfig.updatedBy': rebateConfig.updatedBy || 'system',
    };

    // 如果提供了生效日期，添加到更新数据中
    if (rebateConfig.effectiveDate) {
      updateData['rebateConfig.effectiveDate'] = rebateConfig.effectiveDate;
    } else {
      // 默认为今天
      updateData['rebateConfig.effectiveDate'] = now.toISOString().split('T')[0];
    }

    // 更新机构的返点配置
    const updateResult = await agenciesCollection.updateOne(
      { id: agencyId },
      {
        $set: updateData,
        $setOnInsert: {
          'rebateConfig.tieredRules': [],
          'rebateConfig.specialRules': [],
        },
      },
      { upsert: false }
    );

    if (updateResult.matchedCount === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: '机构不存在',
        }),
      };
    }

    // 如果需要同步到达人
    let syncResult = null;
    if (syncToTalents) {
      // 更新所有属于该机构且使用同步模式的达人
      const talentUpdateResult = await talentsCollection.updateMany(
        {
          agencyId: agencyId,
          $or: [
            { rebateMode: 'sync' },
            { rebateMode: { $exists: false } }, // 没有设置模式的默认为同步
          ],
        },
        {
          $set: {
            'currentRebate.rate': rebateConfig.baseRebate,
            'currentRebate.effectiveDate': updateData['rebateConfig.effectiveDate'],
            'currentRebate.source': 'agency_sync',
            'lastRebateSyncAt': now.toISOString(),
          },
        }
      );

      syncResult = {
        talentsUpdated: talentUpdateResult.modifiedCount,
        message: `已同步更新 ${talentUpdateResult.modifiedCount} 个达人的返点率`,
      };

      console.log(`Synced rebate to ${talentUpdateResult.modifiedCount} talents`);
    }

    // 获取更新后的机构信息
    const updatedAgency = await agenciesCollection.findOne({ id: agencyId });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: updatedAgency,
        syncResult,
        message: syncToTalents
          ? `返点配置已更新并同步到达人`
          : '返点配置已更新',
      }),
    };
  } catch (error) {
    console.error('Error updating agency rebate config:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message || '更新返点配置失败',
      }),
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};