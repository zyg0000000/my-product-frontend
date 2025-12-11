/**
 * @file deleteCollaborator/index.js
 * @version 3.0 - 支持双数据库
 * @description 删除合作记录，支持 v1 (byteproject) 和 v2 (agentworks) 数据库。
 *
 * --- v3.0 更新日志 ---
 * - [核心改造] 支持 dbVersion 参数选择数据库：
 *   - v1 (默认): kol_data 数据库 (byteproject)
 *   - v2: agentworks_db 数据库 (agentworks)
 * - [向后兼容] 不传 dbVersion 或传 v1 时，行为与旧版完全一致
 *
 * --- v2.0 更新日志 ---
 * - [核心功能增强] 删除合作记录时，同步删除关联的作品数据
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

// 数据库配置
const DB_CONFIG = {
  v1: {
    dbName: process.env.MONGO_DB_NAME || 'kol_data',
    collections: {
      collaborations: 'collaborations',
      works: 'works',
    },
  },
  v2: {
    dbName: 'agentworks_db',
    collections: {
      collaborations: 'collaborations',
      works: 'works',
    },
  },
};

let client;

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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    let inputData = {};
    if (event.body) {
      try {
        inputData = JSON.parse(event.body);
      } catch (e) {
        /* ignore */
      }
    }
    if (Object.keys(inputData).length === 0 && event.queryStringParameters) {
      inputData = event.queryStringParameters;
    }

    const { collaborationId, dbVersion = 'v1' } = inputData;

    if (!collaborationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '请求体中缺少必要的字段 (collaborationId)。',
        }),
      };
    }

    // 确定数据库配置
    const config = DB_CONFIG[dbVersion] || DB_CONFIG.v1;

    const dbClient = await connectToDatabase();
    const db = dbClient.db(config.dbName);
    const collabsCollection = db.collection(config.collections.collaborations);
    const worksCollection = db.collection(config.collections.works);

    // 第一步：删除合作记录
    const deletionResult = await collabsCollection.deleteOne({
      id: collaborationId,
    });

    if (deletionResult.deletedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `合作记录ID '${collaborationId}' 未找到，无法删除。`,
        }),
      };
    }

    // 第二步：同步删除所有关联的作品数据
    const worksDeletionResult = await worksCollection.deleteMany({
      collaborationId: collaborationId,
    });
    const deletedWorksCount = worksDeletionResult.deletedCount || 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dbVersion,
        message: `合作记录及关联的 ${deletedWorksCount} 条作品数据删除成功。`,
      }),
    };
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        error: error.message,
      }),
    };
  }
};
