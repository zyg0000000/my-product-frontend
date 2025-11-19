/**
 * fieldMappingManager - 字段映射配置管理云函数
 * 版本: v1.0
 * 描述: RESTful API，支持字段映射配置的 CRUD 操作
 *
 * 支持的HTTP方法:
 * - GET: 查询映射配置
 * - POST: 创建新配置
 * - PUT: 更新配置
 * - DELETE: 删除配置
 */

const { MongoClient, ObjectId } = require('mongodb');

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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const dbVersion = event.queryStringParameters?.dbVersion || 'v2';
    const DB_NAME = dbVersion === 'v2' ? 'agentworks_db' : 'kol_data';

    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);
    const collection = db.collection('field_mappings');

    switch (event.httpMethod) {
      case 'GET': {
        // 查询配置
        const { platform, configName } = event.queryStringParameters || {};
        const query = {};
        if (platform) query.platform = platform;
        if (configName) query.configName = configName;

        const configs = await collection.find(query).toArray();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: configs })
        };
      }

      case 'POST': {
        // 创建新配置
        const createData = JSON.parse(event.body);
        const result = await collection.insertOne({
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ success: true, data: { _id: result.insertedId } })
        };
      }

      case 'PUT': {
        // 更新配置
        const updateData = JSON.parse(event.body);
        const { _id, ...updates } = updateData;

        await collection.updateOne(
          { _id: new ObjectId(_id) },
          { $set: { ...updates, updatedAt: new Date() } }
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: '更新成功' })
        };
      }

      case 'DELETE': {
        // 删除配置
        const { _id } = JSON.parse(event.body);
        await collection.deleteOne({ _id: new ObjectId(_id) });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: '删除成功' })
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error in fieldMappingManager:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
