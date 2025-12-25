/**
 * @file updateProject.js
 * @version 2.5-tracking-version
 * @description 更新指定项目的基础信息或状态。
 *
 * --- 更新日志 (v2.5) ---
 * - [日报版本] trackingConfig 新增 version 字段（'standard' | 'joint'）
 *
 * --- 更新日志 (v2.4) ---
 * - [日报功能] 新增 trackingConfig 对象字段支持
 * - [结构验证] trackingConfig 支持 status, enableAutoFetch, fetchTime, startDate, endDate, benchmarkCPM
 *
 * --- 更新日志 (v2.3) ---
 * - [v5.2 多业务类型] businessType 支持数组格式（多选）
 * - [v5.2 向后兼容] 自动将字符串格式转换为数组格式
 *
 * --- 更新日志 (v2.2) ---
 * - [兼容性修复] 状态转换只对 dbVersion=v2 (AgentWorks) 生效
 * - [向后兼容] byteproject (v1) 保持使用中文状态格式
 * - [审计日志] 改进审计日志显示可读的中文状态名称
 *
 * --- 更新日志 (v2.1) ---
 * - [字段新增] 白名单新增 projectCode（项目编号）
 *
 * --- 更新日志 (v2.0) ---
 * - [架构升级] 新增 dbVersion 参数支持，v2 使用 agentworks_db 数据库
 * - [AgentWorks] 前端通过 dbVersion=v2 参数访问 AgentWorks 专用数据库
 *
 * --- 更新日志 (v1.7) ---
 * - [v4.5 定价模式] 白名单新增 platformPricingModes（定价模式快照）
 * - [v4.5 KPI 配置] 白名单新增 kpiConfig（项目 KPI 考核配置）
 * - [v4.5 状态改进] status 字段支持 key 格式，兼容中文转换
 *
 * --- 更新日志 (v1.6) ---
 * - [v4.4 业务类型] 白名单新增 businessType, businessTag, platformDiscounts, platforms
 * - [v4.4 平台折扣] 支持按平台折扣率更新
 *
 * --- 更新日志 (v1.5) ---
 * - [字段升级] 支持新的 `trackingStatus` 字段 (null/'active'/'archived')，替代 `trackingEnabled`
 * - [向后兼容] 仍然支持旧的 `trackingEnabled` 布尔字段
 * --- 更新日志 (v1.4) ---
 * - [新增字段] 在允许更新的字段白名单中增加了 `trackingEnabled` 字段。
 * - 支持通过此接口开启或关闭项目的"效果追踪"功能。
 * --- 更新日志 (v1.3) ---
 * - [核心功能] 在允许更新的字段白名单中增加了 `benchmarkCPM` 字段。
 * - 现在可以通过此接口创建或更新项目的"目标CPM"考核指标。
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
// [v2.0] 支持 dbVersion 参数切换数据库
const DB_NAME_V1 = process.env.MONGO_DB_NAME || 'kol_data';
const DB_NAME_V2 = 'agentworks_db';
const PROJECTS_COLLECTION = process.env.MONGO_PROJECTS_COLLECTION || 'projects';

// [v2.2] Add settlementFiles to allowed fields
const ALLOWED_UPDATE_FIELDS = [
    'name', 'type', 'budget', 'benchmarkCPM', 'year', 'month',
    'financialYear', 'financialMonth', 'discount', 'capitalRateId',
    'status', 'adjustments', 'projectFiles', 'trackingStatus', 'trackingEnabled',
    // v1.6: v4.4 业务类型改造新增字段
    'businessType', 'businessTag', 'platformDiscounts', 'platforms',
    // v1.7: v4.5 KPI 配置改造新增字段
    'platformPricingModes', 'kpiConfig',
    // v1.8: 按平台 KPI 配置
    'platformKPIConfigs',
    // v1.9: 平台报价系数快照
    'platformQuotationCoefficients',
    // v2.1: 项目编号
    'projectCode',
    // v2.2: 结算文件（agentworks 财务管理）
    'settlementFiles',
    // v2.4: 追踪配置（日报功能）
    'trackingConfig'
];

// [v1.7] 状态映射（中文到 key）
const STATUS_MAPPING = {
    '执行中': 'executing',
    '待结算': 'pending_settlement',
    '已结算': 'settled',
    '已完结': 'closed',
};
const VALID_STATUS_KEYS = ['executing', 'pending_settlement', 'settled', 'closed'];


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
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

    const { id, dbVersion, ...updateFields } = inputData;

    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '请求体中缺少项目ID (id)。' }) };
    }

    // [v2.0] 根据 dbVersion 参数选择数据库
    const DB_NAME = dbVersion === 'v2' ? DB_NAME_V2 : DB_NAME_V1;
    console.log(`[updateProject] 使用数据库: ${DB_NAME} (dbVersion=${dbVersion || 'v1'})`)
    
    const updatePayload = { $set: {}, $unset: {} };
    let hasValidFields = false;

    // [v1.5] Handle trackingStatus and trackingEnabled conversion
    let finalTrackingStatus = undefined;
    if (Object.prototype.hasOwnProperty.call(updateFields, 'trackingStatus')) {
        hasValidFields = true;
        // Validate trackingStatus value
        if (['active', 'archived'].includes(updateFields.trackingStatus)) {
            finalTrackingStatus = updateFields.trackingStatus;
        } else if (updateFields.trackingStatus === null || updateFields.trackingStatus === '') {
            finalTrackingStatus = null;
        }
    } else if (Object.prototype.hasOwnProperty.call(updateFields, 'trackingEnabled')) {
        hasValidFields = true;
        // Convert legacy trackingEnabled to trackingStatus
        if (updateFields.trackingEnabled === true || updateFields.trackingEnabled === 'true') {
            finalTrackingStatus = 'active';
        } else {
            finalTrackingStatus = null;
        }
    }

    // Apply trackingStatus if it was determined
    if (finalTrackingStatus !== undefined) {
        if (finalTrackingStatus === null) {
            updatePayload.$unset.trackingStatus = "";
            updatePayload.$unset.trackingEnabled = ""; // Also remove legacy field
        } else {
            updatePayload.$set.trackingStatus = finalTrackingStatus;
            updatePayload.$unset.trackingEnabled = ""; // Remove legacy field
        }
    }

    for (const field of ALLOWED_UPDATE_FIELDS) {
        // Skip trackingStatus and trackingEnabled as they're handled above
        if (field === 'trackingStatus' || field === 'trackingEnabled') {
            continue;
        }

        if (Object.prototype.hasOwnProperty.call(updateFields, field)) {
            hasValidFields = true;
            // [v1.3] Ensure benchmarkCPM is stored as a number
            if (field === 'benchmarkCPM') {
                const value = parseFloat(updateFields[field]);
                if (!isNaN(value)) {
                    updatePayload.$set[field] = value;
                } else {
                    updatePayload.$unset[field] = ""; // Unset if empty or invalid
                }
            }
            // [v2.2 修复] Handle status field - 只对 dbVersion=v2 (AgentWorks) 做状态转换
            else if (field === 'status') {
                let statusValue = updateFields[field];

                // [v2.2 修复] 只有 dbVersion=v2 (AgentWorks) 时才转换中文状态为英文 key
                // byteproject (v1) 保持使用中文状态
                if (dbVersion === 'v2') {
                    // Convert Chinese status to key for AgentWorks
                    if (STATUS_MAPPING[statusValue]) {
                        statusValue = STATUS_MAPPING[statusValue];
                    }
                    // Validate status key
                    if (VALID_STATUS_KEYS.includes(statusValue)) {
                        updatePayload.$set[field] = statusValue;
                    } else if (statusValue === null || statusValue === '') {
                        updatePayload.$unset[field] = "";
                    }
                } else {
                    // byteproject (v1): 直接存储原始值（中文状态）
                    if (statusValue === null || statusValue === '') {
                        updatePayload.$unset[field] = "";
                    } else {
                        updatePayload.$set[field] = statusValue;
                    }
                }
            }
            // [v1.8] Handle platformKPIConfigs - validate structure (per-platform)
            else if (field === 'platformKPIConfigs') {
                const kpiValue = updateFields[field];
                if (kpiValue && typeof kpiValue === 'object') {
                    const validConfigs = {};
                    Object.entries(kpiValue).forEach(([platform, config]) => {
                        if (config && typeof config === 'object') {
                            validConfigs[platform] = {
                                enabled: !!config.enabled,
                                enabledKPIs: Array.isArray(config.enabledKPIs)
                                    ? config.enabledKPIs.filter(k => typeof k === 'string')
                                    : [],
                                targets: config.targets || {},
                                actuals: config.actuals || {},
                            };
                        }
                    });
                    updatePayload.$set[field] = validConfigs;
                } else if (kpiValue === null) {
                    updatePayload.$unset[field] = "";
                }
            }
            // [v1.7 deprecated] Handle kpiConfig - validate structure
            else if (field === 'kpiConfig') {
                const kpiValue = updateFields[field];
                if (kpiValue && typeof kpiValue === 'object') {
                    updatePayload.$set[field] = {
                        enabled: !!kpiValue.enabled,
                        enabledKPIs: Array.isArray(kpiValue.enabledKPIs)
                            ? kpiValue.enabledKPIs.filter(k => typeof k === 'string')
                            : [],
                        targets: kpiValue.targets || {},
                        actuals: kpiValue.actuals || {},
                    };
                } else if (kpiValue === null) {
                    updatePayload.$unset[field] = "";
                }
            }
            // [v1.7] Handle platformPricingModes - validate values
            else if (field === 'platformPricingModes') {
                const modesValue = updateFields[field];
                if (modesValue && typeof modesValue === 'object') {
                    const validModes = {};
                    Object.entries(modesValue).forEach(([platform, mode]) => {
                        if (mode && ['framework', 'project', 'hybrid'].includes(mode)) {
                            validModes[platform] = mode;
                        }
                    });
                    updatePayload.$set[field] = validModes;
                } else if (modesValue === null) {
                    updatePayload.$unset[field] = "";
                }
            }
            // [v1.9] Handle platformQuotationCoefficients - validate numeric values
            else if (field === 'platformQuotationCoefficients') {
                const coefsValue = updateFields[field];
                if (coefsValue && typeof coefsValue === 'object') {
                    const validCoefs = {};
                    Object.entries(coefsValue).forEach(([platform, coef]) => {
                        if (typeof coef === 'number' && !isNaN(coef)) {
                            validCoefs[platform] = coef;
                        }
                    });
                    updatePayload.$set[field] = validCoefs;
                } else if (coefsValue === null) {
                    updatePayload.$unset[field] = "";
                }
            }
            // [v2.3] Handle businessType - v5.2 支持数组格式（多选）
            else if (field === 'businessType') {
                let businessTypeValue = updateFields[field];
                if (businessTypeValue === null || businessTypeValue === '') {
                    updatePayload.$unset[field] = "";
                } else {
                    // 兼容字符串和数组格式，统一存储为数组
                    if (!Array.isArray(businessTypeValue)) {
                        businessTypeValue = businessTypeValue ? [businessTypeValue] : [];
                    }
                    // 验证业务类型值
                    const validTypes = ['talentProcurement', 'adPlacement', 'contentProduction'];
                    const validBusinessTypes = businessTypeValue.filter(t => validTypes.includes(t));
                    if (validBusinessTypes.length > 0) {
                        updatePayload.$set[field] = validBusinessTypes;
                    }
                }
            }
            // [v2.4] Handle trackingConfig - 日报追踪配置对象
            // [v2.5] 新增 version 字段支持（'standard' | 'joint'）
            // [v2.6] 移除 enableAutoFetch/fetchTime（改为全局调度配置）
            else if (field === 'trackingConfig') {
                const configValue = updateFields[field];
                if (configValue === null) {
                    updatePayload.$unset[field] = "";
                } else if (configValue && typeof configValue === 'object') {
                    // 验证并清理 trackingConfig 对象
                    const validConfig = {};
                    // status: 'active' | 'archived' | 'disabled'
                    if (['active', 'archived', 'disabled'].includes(configValue.status)) {
                        validConfig.status = configValue.status;
                    }
                    // version: 'standard' | 'joint' (日报版本，选择后不可更改)
                    if (['standard', 'joint'].includes(configValue.version)) {
                        validConfig.version = configValue.version;
                    }
                    // startDate: string (e.g., "2025-01-01")
                    if (typeof configValue.startDate === 'string') {
                        validConfig.startDate = configValue.startDate;
                    }
                    // endDate: string
                    if (typeof configValue.endDate === 'string') {
                        validConfig.endDate = configValue.endDate;
                    }
                    // benchmarkCPM: number
                    if (typeof configValue.benchmarkCPM === 'number' && !isNaN(configValue.benchmarkCPM)) {
                        validConfig.benchmarkCPM = configValue.benchmarkCPM;
                    }
                    // lastFetchAt: Date
                    if (configValue.lastFetchAt) {
                        validConfig.lastFetchAt = new Date(configValue.lastFetchAt);
                    }
                    // lastFetchStatus: 'success' | 'partial' | 'failed'
                    if (['success', 'partial', 'failed'].includes(configValue.lastFetchStatus)) {
                        validConfig.lastFetchStatus = configValue.lastFetchStatus;
                    }
                    updatePayload.$set[field] = validConfig;
                }
            }
            else if (updateFields[field] === null || updateFields[field] === '') {
                updatePayload.$unset[field] = "";
            } else {
                updatePayload.$set[field] = updateFields[field];
            }
        }
    }

    if (!hasValidFields) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: '请求体中没有需要更新的有效字段。' }) };
    }
    
    if (Object.keys(updatePayload.$set).length > 0) {
      updatePayload.$set.updatedAt = new Date();
    }
    
    // If status is updated, add an audit log
    if (updatePayload.$set.status) {
        // [v2.2 修复] 审计日志显示可读的状态名称
        const statusValue = updatePayload.$set.status;
        // 如果是英文 key，转换为中文显示；否则直接使用
        const REVERSE_STATUS_MAPPING = {
            'executing': '执行中',
            'pending_settlement': '待结算',
            'settled': '已收款',
            'closed': '已终结',
        };
        const displayStatus = REVERSE_STATUS_MAPPING[statusValue] || statusValue;
        const auditLogEntry = {
            timestamp: new Date(),
            user: "System",
            action: `项目状态由人工变更为: ${displayStatus}`
        };
        updatePayload.$push = {
            auditLog: {
                $each: [auditLogEntry],
                $position: 0
            }
        };
    }
    
    const finalUpdate = {};
    if (Object.keys(updatePayload.$set).length > 0) finalUpdate.$set = updatePayload.$set;
    if (Object.keys(updatePayload.$unset).length > 0) finalUpdate.$unset = updatePayload.$unset;
    if (updatePayload.$push) finalUpdate.$push = updatePayload.$push;


    if (Object.keys(finalUpdate).length === 0) {
       return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '没有字段需要更新。' }) };
    }

    const dbClient = await connectToDatabase();
    const collection = dbClient.db(DB_NAME).collection(PROJECTS_COLLECTION);

    const result = await collection.updateOne({ id: id }, finalUpdate);

    if (result.matchedCount === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: `ID为 '${id}' 的项目不存在。` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '项目信息更新成功。' }),
    };

  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: '服务器内部错误', error: error.message }) };
  }
};
