/**
 * @file addProject.js
 * @version 2.1-status-fix
 * @description 接收前端发送的项目数据，创建一个新的项目文档。
 *
 * --- 更新日志 (v2.1) ---
 * - [兼容性修复] 状态转换只对 dbVersion=v2 (AgentWorks) 生效
 * - [向后兼容] byteproject (v1) 保持使用中文状态格式（默认"执行中"）
 *
 * --- 更新日志 (v2.0) ---
 * - [架构升级] 新增 dbVersion 参数支持，v2 使用 agentworks_db 数据库
 * - [AgentWorks] 前端通过 dbVersion=v2 参数访问 AgentWorks 专用数据库
 *
 * --- 更新日志 (v1.6) ---
 * - [v4.5 定价模式快照] 新增 platformPricingModes（定价模式快照）字段支持
 * - [v4.5 KPI 配置] 新增 kpiConfig（项目 KPI 考核配置）字段支持
 * - [v4.5 状态改进] status 字段改用 key（如 'executing'），不再存储中文（仅 v2）
 * - [v4.5 废弃字段] benchmarkCPM 和 qianchuanId 标记为废弃
 *
 * --- 更新日志 (v1.5) ---
 * - [v4.4 业务类型] 新增 businessType（一级业务类型）字段支持
 * - [v4.4 业务标签] 新增 businessTag（二级业务标签）字段支持
 * - [v4.4 平台折扣] 新增 platformDiscounts（按平台折扣率）字段支持
 * - [v4.4 平台] 新增 platforms（投放平台列表）字段支持
 * - [必填调整] businessType 替代 type 成为必填字段
 *
 * --- 更新日志 (v1.4) ---
 * - [字段升级] 支持新的 `trackingStatus` 字段 (null/'active'/'archived')，替代 `trackingEnabled`
 * - [向后兼容] 仍然支持旧的 `trackingEnabled` 布尔字段
 * --- 更新日志 (v1.3) ---
 * - [新增字段] 新增了对 `trackingEnabled` (效果追踪开关) 字段的支持。
 * - 在创建新项目时，会接收并存储这个配置项，默认值为 false。
 * --- 更新日志 (v1.2) ---
 * - [核心功能] 新增了对 `benchmarkCPM` (目标CPM) 字段的支持。
 * - 在创建新项目时，会接收并存储这个关键的考核指标。
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
// [v2.0] 支持 dbVersion 参数切换数据库
const DB_NAME_V1 = process.env.MONGO_DB_NAME || 'kol_data';
const DB_NAME_V2 = 'agentworks_db';
const PROJECTS_COLLECTION = process.env.MONGO_PROJECTS_COLLECTION || 'projects';

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  try {
    let inputData = {};
    if (event.body) {
        try { inputData = JSON.parse(event.body); } catch(e) { /* ignore */ }
    }
    if (Object.keys(inputData).length === 0 && event.queryStringParameters) {
        inputData = event.queryStringParameters;
    }

    // [v2.0] 根据 dbVersion 参数选择数据库
    const dbVersion = inputData.dbVersion || 'v1';
    const DB_NAME = dbVersion === 'v2' ? DB_NAME_V2 : DB_NAME_V1;
    console.log(`[addProject] 使用数据库: ${DB_NAME} (dbVersion=${dbVersion})`);

    const dbClient = await connectToDatabase();
    const collection = dbClient.db(DB_NAME).collection(PROJECTS_COLLECTION);
    
    // v1.5: 调整必填校验，支持新旧字段兼容
    // - businessType 是新的一级业务类型（必填）
    // - type 保留用于兼容旧数据（可选，作为 businessTag 别名）
    const hasBusinessType = inputData.businessType || inputData.type;
    if (!inputData.name || !hasBusinessType || !inputData.financialYear || !inputData.financialMonth) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
            success: false,
            message: '请求无效，项目名称、业务类型和财务归属月份为必填项。'
        }),
      };
    }

    const now = new Date();
    
    // [v1.4] Handle tracking status (new field) or trackingEnabled (legacy field)
    let trackingStatus = null;
    if (inputData.trackingStatus) {
      // Use new trackingStatus field if provided
      trackingStatus = ['active', 'archived'].includes(inputData.trackingStatus) ? inputData.trackingStatus : null;
    } else if (inputData.trackingEnabled === true || inputData.trackingEnabled === 'true') {
      // Convert legacy trackingEnabled to new format
      trackingStatus = 'active';
    }

    // [v1.5] 处理业务类型字段
    // businessType: 一级业务类型 (talentProcurement | adPlacement | contentProduction)
    // businessTag: 二级业务标签（可选，如 '常规秒杀'）
    // type: 兼容旧字段，如果没有 businessTag 则使用 type
    const businessType = inputData.businessType || 'talentProcurement'; // 默认达人采买
    const businessTag = inputData.businessTag || inputData.type || null;

    // [v1.5] 处理平台折扣率
    // platformDiscounts: { douyin: 0.795, xiaohongshu: 0.9 }
    let platformDiscounts = null;
    if (inputData.platformDiscounts && typeof inputData.platformDiscounts === 'object') {
      platformDiscounts = {};
      Object.entries(inputData.platformDiscounts).forEach(([platform, rate]) => {
        if (rate !== undefined && rate !== null) {
          platformDiscounts[platform] = parseFloat(rate);
        }
      });
    }

    // [v1.6] 处理平台定价模式快照
    // platformPricingModes: { douyin: 'framework', xiaohongshu: 'project' }
    let platformPricingModes = null;
    if (inputData.platformPricingModes && typeof inputData.platformPricingModes === 'object') {
      platformPricingModes = {};
      Object.entries(inputData.platformPricingModes).forEach(([platform, mode]) => {
        if (mode && ['framework', 'project', 'hybrid'].includes(mode)) {
          platformPricingModes[platform] = mode;
        }
      });
    }

    // [v1.8] 处理平台报价系数快照
    // platformQuotationCoefficients: { douyin: 0.8347, xiaohongshu: 0.9 }
    let platformQuotationCoefficients = null;
    if (inputData.platformQuotationCoefficients && typeof inputData.platformQuotationCoefficients === 'object') {
      platformQuotationCoefficients = {};
      Object.entries(inputData.platformQuotationCoefficients).forEach(([platform, coef]) => {
        if (typeof coef === 'number' && !isNaN(coef)) {
          platformQuotationCoefficients[platform] = coef;
        }
      });
    }

    // [v1.7] 处理按平台的 KPI 配置
    // platformKPIConfigs: { douyin: { enabled: true, enabledKPIs: ['cpm'], targets: { cpm: 50 } } }
    let platformKPIConfigs = null;
    if (inputData.platformKPIConfigs && typeof inputData.platformKPIConfigs === 'object') {
      platformKPIConfigs = {};
      Object.entries(inputData.platformKPIConfigs).forEach(([platform, config]) => {
        if (config && typeof config === 'object') {
          platformKPIConfigs[platform] = {
            enabled: !!config.enabled,
            enabledKPIs: Array.isArray(config.enabledKPIs)
              ? config.enabledKPIs.filter(k => typeof k === 'string')
              : [],
            targets: config.targets || {},
            actuals: {}, // 实际值在交付后填充
          };
        }
      });
    }

    // [v1.6 deprecated] 处理旧版 KPI 配置（兼容）
    let kpiConfig = null;
    if (!platformKPIConfigs && inputData.kpiConfig && typeof inputData.kpiConfig === 'object') {
      kpiConfig = {
        enabled: !!inputData.kpiConfig.enabled,
        enabledKPIs: Array.isArray(inputData.kpiConfig.enabledKPIs)
          ? inputData.kpiConfig.enabledKPIs.filter(k => typeof k === 'string')
          : [],
        targets: inputData.kpiConfig.targets || {},
        actuals: {}, // 实际值在交付后填充
      };
    }

    // [v2.1 修复] 处理状态字段 - 只对 dbVersion=v2 (AgentWorks) 做状态转换
    // byteproject (v1) 保持使用中文状态
    const validStatusKeys = ['executing', 'pending_settlement', 'settled', 'closed'];
    const statusMapping = {
      '执行中': 'executing',
      '待结算': 'pending_settlement',
      '已结算': 'settled',
      '已完结': 'closed',
    };

    let projectStatus;
    if (dbVersion === 'v2') {
      // AgentWorks: 使用英文 key
      projectStatus = inputData.status || 'executing';
      // 如果传入的是中文状态，转换为英文 key
      if (statusMapping[projectStatus]) {
        projectStatus = statusMapping[projectStatus];
      }
      // 验证状态 key
      if (!validStatusKeys.includes(projectStatus)) {
        projectStatus = 'executing'; // 默认状态
      }
    } else {
      // byteproject (v1): 直接使用原始值（中文状态），默认"执行中"
      projectStatus = inputData.status || '执行中';
    }

    const newProjectDocument = {
      _id: new ObjectId(),
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...inputData,
      // [v1.5] 业务类型字段
      businessType: businessType,
      businessTag: businessTag,
      type: businessTag, // 兼容旧字段
      // [v1.5] 平台折扣率
      platformDiscounts: platformDiscounts,
      // [v1.6] 平台定价模式快照
      platformPricingModes: platformPricingModes,
      // [v1.8] 平台报价系数快照
      platformQuotationCoefficients: platformQuotationCoefficients,
      // [v1.7] 按平台 KPI 配置
      platformKPIConfigs: platformKPIConfigs,
      // [v1.6 deprecated] 旧版 KPI 配置
      kpiConfig: kpiConfig,
      // [v1.2] Safely parse benchmarkCPM to a number (deprecated in v4.5, use kpiConfig instead)
      benchmarkCPM: inputData.benchmarkCPM ? parseFloat(inputData.benchmarkCPM) : null,
      // [v1.4] Store trackingStatus (null, 'active', or 'archived')
      trackingStatus: trackingStatus,
      // [v1.6] 使用状态 key（不再存储中文）
      status: projectStatus,
      adjustments: [],
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };

    // Remove legacy field if present
    delete newProjectDocument.trackingEnabled;
    
    delete newProjectDocument._id;
    newProjectDocument._id = new ObjectId();

    await collection.insertOne(newProjectDocument);
    
    const { _id, ...returnData } = newProjectDocument;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: '项目创建成功！',
        data: returnData
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
        error: error.message 
      }),
    };
  }
};