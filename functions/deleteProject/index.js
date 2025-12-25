/**
 * [生产版 v3.0-cascade-delete]
 * 云函数：deleteProject
 * 描述：删除一个指定的项目，并级联删除所有相关数据。
 * 触发器：API 网关, 通过 DELETE /delete-project 调用。
 *
 * --- 更新日志 (v3.0) ---
 * - [级联删除] 支持删除所有关联数据：collaborations, registration_results, daily_report_cache, daily_report_executions
 * - [项目组处理] 自动从 project_groups 中移除项目引用
 * - [预检查模式] 新增 preCheck=true 参数，返回将被删除的数据统计
 *
 * --- 更新日志 (v2.0) ---
 * - [架构升级] 新增 dbVersion 参数支持，v2 使用 agentworks_db 数据库
 * - [AgentWorks] 前端通过 dbVersion=v2 参数访问 AgentWorks 专用数据库
 */

const { MongoClient } = require('mongodb');

// 从环境变量中获取数据库连接字符串
const MONGO_URI = process.env.MONGO_URI;
// [v2.0] 支持 dbVersion 参数切换数据库
const DB_NAME_V1 = process.env.MONGO_DB_NAME || 'kol_data';
const DB_NAME_V2 = 'agentworks_db';

// 关联的集合列表
const COLLECTIONS = {
  projects: 'projects',
  collaborations: 'collaborations',
  registrationResults: 'registration_results',
  dailyReportCache: 'daily_report_cache',
  dailyReportExecutions: 'daily_report_executions',
  projectGroups: 'project_groups',
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

/**
 * 预检查：统计将被删除的关联数据
 */
async function preCheckDeletion(db, projectId) {
  const stats = {
    collaborations: 0,
    registrationResults: 0,
    dailyReportCache: 0,
    dailyReportExecutions: 0,
    projectGroups: 0, // 受影响的项目组数量
  };

  // 统计各集合的关联数据
  stats.collaborations = await db.collection(COLLECTIONS.collaborations).countDocuments({ projectId });
  stats.registrationResults = await db.collection(COLLECTIONS.registrationResults).countDocuments({ projectId });
  stats.dailyReportCache = await db.collection(COLLECTIONS.dailyReportCache).countDocuments({ projectId });
  stats.dailyReportExecutions = await db.collection(COLLECTIONS.dailyReportExecutions).countDocuments({ projectId });

  // 检查项目组引用
  stats.projectGroups = await db.collection(COLLECTIONS.projectGroups).countDocuments({ projectIds: projectId });

  return stats;
}

/**
 * 执行级联删除
 */
async function executeCascadeDelete(db, projectId) {
  const results = {
    collaborations: 0,
    registrationResults: 0,
    dailyReportCache: 0,
    dailyReportExecutions: 0,
    projectGroupsUpdated: 0,
  };

  // 1. 删除合作记录
  const collabResult = await db.collection(COLLECTIONS.collaborations).deleteMany({ projectId });
  results.collaborations = collabResult.deletedCount;

  // 2. 删除抓取结果
  const regResult = await db.collection(COLLECTIONS.registrationResults).deleteMany({ projectId });
  results.registrationResults = regResult.deletedCount;

  // 3. 删除日报缓存
  const cacheResult = await db.collection(COLLECTIONS.dailyReportCache).deleteMany({ projectId });
  results.dailyReportCache = cacheResult.deletedCount;

  // 4. 删除日报执行记录
  const execResult = await db.collection(COLLECTIONS.dailyReportExecutions).deleteMany({ projectId });
  results.dailyReportExecutions = execResult.deletedCount;

  // 5. 从项目组中移除引用（不删除项目组，只移除引用）
  const groupUpdateResult = await db.collection(COLLECTIONS.projectGroups).updateMany(
    { projectIds: projectId },
    { $pull: { projectIds: projectId } }
  );
  results.projectGroupsUpdated = groupUpdateResult.modifiedCount;

  // 6. 如果项目是某个组的 primaryProjectId，需要更新
  await db.collection(COLLECTIONS.projectGroups).updateMany(
    { primaryProjectId: projectId },
    [{ $set: { primaryProjectId: { $arrayElemAt: ['$projectIds', 0] } } }]
  );

  // 7. 删除空的项目组（没有项目的组）
  await db.collection(COLLECTIONS.projectGroups).deleteMany({ projectIds: { $size: 0 } });

  // 8. 最后删除项目本身
  const projectResult = await db.collection(COLLECTIONS.projects).deleteOne({ id: projectId });

  return {
    ...results,
    projectDeleted: projectResult.deletedCount > 0,
  };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    let inputData = {};
    if (event.body) {
        try {
            inputData = JSON.parse(event.body);
        } catch(e) { /* ignore */ }
    }
    if (Object.keys(inputData).length === 0 && event.queryStringParameters) {
        inputData = event.queryStringParameters;
    }

    const { projectId, dbVersion, preCheck } = inputData;

    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '请求体中缺少必要的字段 (projectId)。' }) };
    }

    // [v2.0] 根据 dbVersion 参数选择数据库
    const DB_NAME = dbVersion === 'v2' ? DB_NAME_V2 : DB_NAME_V1;
    console.log(`[deleteProject] 使用数据库: ${DB_NAME} (dbVersion=${dbVersion || 'v1'})`);

    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 检查项目是否存在
    const project = await db.collection(COLLECTIONS.projects).findOne({ id: projectId });
    if (!project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `项目ID '${projectId}' 未找到。`
        })
      };
    }

    // [v3.0] 预检查模式：只返回统计信息，不执行删除
    if (preCheck === 'true' || preCheck === true) {
      const stats = await preCheckDeletion(db, projectId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          preCheck: true,
          project: {
            id: project.id,
            name: project.name,
            projectCode: project.projectCode,
          },
          affectedData: stats,
          message: '预检查完成，以上数据将在删除时被清理。',
        }),
      };
    }

    // [v3.0] 执行级联删除
    const results = await executeCascadeDelete(db, projectId);

    if (!results.projectDeleted) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: '项目删除失败，请重试。'
        })
      };
    }

    // 构建删除摘要
    const deletedItems = [];
    if (results.collaborations > 0) deletedItems.push(`${results.collaborations} 条合作记录`);
    if (results.registrationResults > 0) deletedItems.push(`${results.registrationResults} 条抓取结果`);
    if (results.dailyReportCache > 0) deletedItems.push(`${results.dailyReportCache} 条日报缓存`);
    if (results.dailyReportExecutions > 0) deletedItems.push(`${results.dailyReportExecutions} 条执行记录`);
    if (results.projectGroupsUpdated > 0) deletedItems.push(`${results.projectGroupsUpdated} 个项目组引用`);

    const summary = deletedItems.length > 0
      ? `同时清理了 ${deletedItems.join('、')}`
      : '无关联数据需要清理';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `项目「${project.name}」删除成功，${summary}。`,
        deletedData: results,
      }),
    };

  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message }) };
  }
};


