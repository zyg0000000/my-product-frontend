/**
 * @file getTalentFilterOptions.js
 * @version 1.2
 * @description
 * 云函数: getTalentFilterOptions (生产版)
 * 专为"近期表现"和"达人库"等页面的筛选器提供动态选项。
 *
 * 功能特性:
 * - 实时查询数据库中所有不重复的 `talentType` (达人类型)。
 * - 高效轻量，只返回筛选所需的最少数据。
 * - v1.2: v2 分支不再返回 talentTier（返回空数组），v1 保持原样
 * - v1.1: 支持 dbVersion 参数切换数据库 (默认v1=kol_data, v2=agentworks_db)
 *
 * --- v1.2 更新日志 (2025-12-04) ---
 * - [移除] v2 分支 tiers 返回空数组（talentTier 业务逻辑已移除）
 * - [说明] talentTier 应改为客户维度管理，不再是达人平台维度
 *
 * 触发器: API 网关, GET /talents/filter-options
 */

const { MongoClient } = require('mongodb');

// 从环境变量中获取配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME_V1 = process.env.MONGO_DB_NAME || 'kol_data';
const DB_NAME_V2 = 'agentworks_db';
const TALENTS_COLLECTION = 'talents';

let client;

// 数据库连接池
async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
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

  // 检查 MONGO_URI 是否配置
  if (!MONGO_URI) {
      console.error("严重错误: 环境变量 MONGO_URI 未配置。");
      return { 
          statusCode: 500, 
          headers, 
          body: JSON.stringify({ success: false, message: "服务器数据库配置不完整。" }) 
      };
  }

  try {
    // 解析 dbVersion 参数（可选，默认 v1）
    const queryParams = event.queryStringParameters || {};
    const dbVersion = queryParams.dbVersion || 'v1';

    // 根据 dbVersion 选择数据库
    const dbName = dbVersion === 'v2' ? DB_NAME_V2 : DB_NAME_V1;

    console.log(`[getTalentFilterOptions] 使用数据库: ${dbName} (dbVersion=${dbVersion})`);

    const dbClient = await connectToDatabase();
    const db = dbClient.db(dbName);
    const talentsCollection = db.collection(TALENTS_COLLECTION);

    // v2 版本不再返回层级（已移除），v1 版本仍用 distinct
    let tiers;
    if (dbVersion === 'v2') {
      // v2: talentTier 已移除，返回空数组
      tiers = [];
    } else {
      // v1: 使用 distinct 从 talents 集合获取
      tiers = await talentsCollection.distinct('talentTier');
      tiers = tiers.filter(tier => tier).sort();
    }

    // talentType 仍然从 talents 集合获取（因为是动态数据）
    const types = await talentsCollection.distinct('talentType');
    const cleanTypes = types.filter(type => type);

    // 组装并返回响应
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          tiers: tiers,
          types: cleanTypes.sort()
        }
      })
    };

  } catch (error) {
    console.error('获取筛选选项时发生错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message })
    };
  }
};
