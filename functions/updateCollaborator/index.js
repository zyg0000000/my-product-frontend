/**
 * @file updateCollaborator/index.js
 * @version 5.0 - 支持双数据库
 * @description 更新合作记录，支持 v1 (byteproject) 和 v2 (agentworks) 数据库。
 *
 * --- v5.0 更新日志 ---
 * - [核心改造] 支持 dbVersion 参数选择数据库：
 *   - v1 (默认): kol_data 数据库 (byteproject)
 *   - v2: agentworks_db 数据库 (agentworks)
 * - [字段适配] v2 模式支持更多字段如 actualReleaseDate, videoUrl, effectData, adjustments
 * - [向后兼容] 不传 dbVersion 或传 v1 时，行为与旧版完全一致
 *
 * --- v4.4 更新日志 ---
 * - [核心修复] 重构了ID的获取方式，从 body 中同时解析 id 和其他更新字段
 */

const { MongoClient, ObjectId } = require('mongodb');

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

// v1 允许更新的字段
const V1_ALLOWED_UPDATE_FIELDS = [
  'amount',
  'priceInfo',
  'rebate',
  'orderType',
  'status',
  'orderDate',
  'publishDate',
  'videoId',
  'paymentDate',
  'actualRebate',
  'recoveryDate',
  'contentFile',
  'taskId',
  'rebateScreenshots',
  'discrepancyReason',
  'discrepancyReasonUpdatedAt',
  'plannedReleaseDate',
];

// v2 允许更新的字段
const V2_ALLOWED_UPDATE_FIELDS = [
  // 财务信息
  'amount',
  'priceInfo',
  'rebateRate',
  'orderType',
  // 状态
  'status',
  // 执行追踪
  'plannedReleaseDate',
  'actualReleaseDate',
  'taskId',
  'videoId',
  'videoUrl',
  // 财务管理
  'orderDate',
  'paymentDate',
  'recoveryDate',
  // 差异处理
  'discrepancyReason',
  'rebateScreenshots',
  // 效果数据
  'effectData',
  // 调整项
  'adjustments',
];

const REBATE_RELATED_FIELDS = [
  'actualRebate',
  'recoveryDate',
  'rebateScreenshots',
  'discrepancyReason',
];

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
 * v1 模式：处理旧版请求 (byteproject)
 */
async function handleV1Request(id, updateFields, db, collections) {
  const collaborationsCollection = db.collection(collections.collaborations);
  const worksCollection = db.collection(collections.works);

  const updatePayload = { $set: {}, $unset: {} };
  let hasValidFields = false;
  let hasRebateRelatedUpdate = false;

  for (const field of V1_ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updateFields, field)) {
      hasValidFields = true;
      if (REBATE_RELATED_FIELDS.includes(field)) {
        hasRebateRelatedUpdate = true;
      }
      if (
        updateFields[field] === null ||
        updateFields[field] === '' ||
        (Array.isArray(updateFields[field]) && updateFields[field].length === 0)
      ) {
        updatePayload.$unset[field] = '';
      } else {
        updatePayload.$set[field] = updateFields[field];
      }
    }
  }

  if (!hasValidFields) {
    return {
      statusCode: 400,
      body: { success: false, message: '请求体中没有需要更新的有效字段。' },
    };
  }

  if (hasRebateRelatedUpdate) {
    if (updateFields.actualRebate === null) {
      updatePayload.$unset.discrepancyReasonUpdatedAt = '';
    } else {
      updatePayload.$set.discrepancyReasonUpdatedAt = new Date();
    }
  }

  if (updateFields.publishDate && updateFields.status !== '视频已发布') {
    if (!updatePayload.$set.status) {
      updatePayload.$set.status = '视频已发布';
    }
  }

  if (Object.keys(updatePayload.$set).length > 0) {
    updatePayload.$set.updatedAt = new Date();
  }

  const finalUpdate = {};
  if (Object.keys(updatePayload.$set).length > 0)
    finalUpdate.$set = updatePayload.$set;
  if (Object.keys(updatePayload.$unset).length > 0)
    finalUpdate.$unset = updatePayload.$unset;

  if (Object.keys(finalUpdate).length === 0) {
    return {
      statusCode: 200,
      body: { success: true, message: '没有字段需要更新。' },
    };
  }

  const updatedCollaboration = await collaborationsCollection.findOneAndUpdate(
    { id: id },
    finalUpdate,
    { returnDocument: 'after' }
  );

  if (!updatedCollaboration) {
    return {
      statusCode: 404,
      body: { success: false, message: `ID为 '${id}' 的合作记录不存在。` },
    };
  }

  // v1: 处理 works 同步
  const isVideoPublished =
    updatedCollaboration.publishDate || updatedCollaboration.videoId;

  if (isVideoPublished) {
    const workExists = await worksCollection.findOne({ collaborationId: id });

    if (!workExists) {
      console.log(
        `[Work Upsert] Work for collaboration ${id} does not exist. Creating now.`
      );
      const newWork = {
        _id: new ObjectId(),
        id: `work_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        collaborationId: updatedCollaboration.id,
        projectId: updatedCollaboration.projectId,
        talentId: updatedCollaboration.talentId,
        taskId: updatedCollaboration.taskId || null,
        platformWorkId: updatedCollaboration.videoId || null,
        publishedAt: updatedCollaboration.publishDate
          ? new Date(updatedCollaboration.publishDate)
          : null,
        sourceType: 'COLLABORATION',
        dailyStats: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await worksCollection.insertOne(newWork);
      console.log(
        `[Work Upsert] Successfully CREATED new work record ${newWork.id}`
      );
    } else {
      console.log(
        `[Work Upsert] Work for collaboration ${id} already exists. Updating now.`
      );
      const workUpdatePayload = {
        $set: {
          platformWorkId: updatedCollaboration.videoId || null,
          publishedAt: updatedCollaboration.publishDate
            ? new Date(updatedCollaboration.publishDate)
            : null,
          taskId: updatedCollaboration.taskId || null,
          updatedAt: new Date(),
        },
      };
      await worksCollection.updateOne(
        { collaborationId: id },
        workUpdatePayload
      );
      console.log(
        `[Work Upsert] Successfully UPDATED existing work record for collaboration ${id}.`
      );
    }
  }

  return {
    statusCode: 200,
    body: { success: true, message: '合作记录更新成功。' },
  };
}

/**
 * v2 模式：处理新版请求 (agentworks)
 */
async function handleV2Request(id, updateFields, db, collections) {
  const collaborationsCollection = db.collection(collections.collaborations);

  const updatePayload = { $set: {}, $unset: {} };
  let hasValidFields = false;

  for (const field of V2_ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updateFields, field)) {
      hasValidFields = true;
      if (
        updateFields[field] === null ||
        updateFields[field] === '' ||
        (Array.isArray(updateFields[field]) && updateFields[field].length === 0)
      ) {
        updatePayload.$unset[field] = '';
      } else {
        updatePayload.$set[field] = updateFields[field];
      }
    }
  }

  if (!hasValidFields) {
    return {
      statusCode: 400,
      body: { success: false, message: '请求体中没有需要更新的有效字段。' },
    };
  }

  // v2: 自动设置状态
  if (
    updateFields.actualReleaseDate &&
    updateFields.status !== '视频已发布'
  ) {
    if (!updatePayload.$set.status) {
      updatePayload.$set.status = '视频已发布';
    }
  }

  if (Object.keys(updatePayload.$set).length > 0) {
    updatePayload.$set.updatedAt = new Date();
  }

  const finalUpdate = {};
  if (Object.keys(updatePayload.$set).length > 0)
    finalUpdate.$set = updatePayload.$set;
  if (Object.keys(updatePayload.$unset).length > 0)
    finalUpdate.$unset = updatePayload.$unset;

  if (Object.keys(finalUpdate).length === 0) {
    return {
      statusCode: 200,
      body: { success: true, dbVersion: 'v2', message: '没有字段需要更新。' },
    };
  }

  const updatedCollaboration = await collaborationsCollection.findOneAndUpdate(
    { id: id },
    finalUpdate,
    { returnDocument: 'after' }
  );

  if (!updatedCollaboration) {
    return {
      statusCode: 404,
      body: { success: false, message: `ID为 '${id}' 的合作记录不存在。` },
    };
  }

  return {
    statusCode: 200,
    body: { success: true, dbVersion: 'v2', message: '合作记录更新成功。' },
  };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // 保持对 PUT 和 POST 的兼容
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }),
    };
  }

  try {
    // 从 body 中同时解构 id、dbVersion 和其他更新字段
    const { id, dbVersion = 'v1', ...updateFields } = JSON.parse(
      event.body || '{}'
    );

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '请求体中缺少合作记录ID (id)。',
        }),
      };
    }

    // 确定数据库配置
    const config = DB_CONFIG[dbVersion] || DB_CONFIG.v1;

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(config.dbName);

    // 根据版本调用不同处理逻辑
    let result;
    if (dbVersion === 'v2') {
      result = await handleV2Request(id, updateFields, db, config.collections);
    } else {
      result = await handleV1Request(id, updateFields, db, config.collections);
    }

    return {
      statusCode: result.statusCode,
      headers,
      body: JSON.stringify(result.body),
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
