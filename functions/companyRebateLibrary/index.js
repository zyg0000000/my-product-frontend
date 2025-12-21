/**
 * @file companyRebateLibrary.js
 * @version 1.0.0
 * @description 云函数：公司返点库管理接口
 *
 * --- 功能说明 ---
 * 管理公司返点 Excel 数据的导入、版本管理和对比功能：
 * - import: 导入新版本（解析后的数据）
 * - listVersions: 获取版本列表
 * - deleteVersion: 删除指定版本
 * - setDefaultVersion: 设置默认版本
 * - compare: 与 agentworks 达人对比
 *
 * --- 更新日志 ---
 * [v1.0.0] 2025-12-21
 * - 初始版本：支持导入、版本管理、对比功能
 */

const { MongoClient } = require('mongodb');

// 环境变量配置
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'agentworks_db';
const LIBRARY_COLLECTION = 'company_rebate_library';
const IMPORTS_COLLECTION = 'company_rebate_imports';
const TALENTS_COLLECTION = 'talents';
const AGENCIES_COLLECTION = 'agencies';

let client;

/**
 * 连接数据库
 */
async function connectToDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

/**
 * CORS 响应头
 */
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

/**
 * 创建错误响应
 */
function errorResponse(statusCode, message, details = null) {
  const body = { success: false, message };
  if (details) body.details = details;
  return { statusCode, headers, body: JSON.stringify(body) };
}

/**
 * 创建成功响应
 */
function successResponse(data) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() })
  };
}

/**
 * 生成版本ID
 * 格式：import_YYYYMM 或 import_YYYYMM_序号
 */
function generateImportId(existingIds = []) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const baseId = `import_${yearMonth}`;

  // 检查是否已存在同月的版本
  const sameMonthIds = existingIds.filter(id => id.startsWith(baseId));

  if (sameMonthIds.length === 0) {
    return baseId;
  }

  // 找到最大序号
  let maxSeq = 0;
  for (const id of sameMonthIds) {
    if (id === baseId) {
      maxSeq = Math.max(maxSeq, 1);
    } else {
      const match = id.match(/_(\d+)$/);
      if (match) {
        maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
      }
    }
  }

  return `${baseId}_${maxSeq + 1}`;
}

// ==================== import 操作 ====================

/**
 * 导入新版本
 *
 * @param {Object} db - 数据库实例
 * @param {Object} data - 导入数据
 * @param {Array} data.records - 返点记录列表 [{ xingtuId, nickname, mcn, rebateRate, rawRemark }]
 * @param {string} data.fileName - 源文件名
 * @param {string} [data.note] - 备注
 */
async function handleImport(db, data) {
  const { records, fileName, note } = data;

  if (!Array.isArray(records) || records.length === 0) {
    return errorResponse(400, 'records 数组不能为空');
  }

  if (!fileName) {
    return errorResponse(400, '缺少文件名 (fileName)');
  }

  const libraryCollection = db.collection(LIBRARY_COLLECTION);
  const importsCollection = db.collection(IMPORTS_COLLECTION);

  // 获取现有版本ID列表
  const existingImports = await importsCollection.find({}, { projection: { importId: 1 } }).toArray();
  const existingIds = existingImports.map(i => i.importId);

  // 生成新版本ID
  const importId = generateImportId(existingIds);
  const now = new Date();

  // 准备记录数据（去重）
  const uniqueRecords = [];
  const seen = new Set();

  for (const record of records) {
    const { xingtuId, nickname, mcn, rebateRate, rawRemark } = record;

    if (!xingtuId || !nickname || !mcn || rebateRate === undefined) {
      continue; // 跳过不完整的记录
    }

    // 去重键：xingtuId + mcn + rebateRate
    const key = `${xingtuId}|${mcn}|${rebateRate}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    uniqueRecords.push({
      importId,
      xingtuId: String(xingtuId),
      nickname: String(nickname),
      mcn: String(mcn),
      rebateRate: Number(rebateRate),
      rawRemark: rawRemark ? String(rawRemark) : null
    });
  }

  if (uniqueRecords.length === 0) {
    return errorResponse(400, '没有有效的记录可导入');
  }

  // 如果是第一个版本，设为默认
  const isFirstVersion = existingIds.length === 0;

  // 插入版本元信息
  await importsCollection.insertOne({
    importId,
    fileName,
    recordCount: uniqueRecords.length,
    importedAt: now,
    isDefault: isFirstVersion,
    note: note || null
  });

  // 批量插入记录
  const BATCH_SIZE = 1000;
  for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
    const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
    await libraryCollection.insertMany(batch, { ordered: false });
  }

  return successResponse({
    importId,
    importedCount: uniqueRecords.length,
    importedAt: now.toISOString(),
    isDefault: isFirstVersion
  });
}

// ==================== listVersions 操作 ====================

/**
 * 获取版本列表
 */
async function handleListVersions(db) {
  const importsCollection = db.collection(IMPORTS_COLLECTION);

  const versions = await importsCollection
    .find({})
    .sort({ importedAt: -1 })
    .toArray();

  return successResponse({
    versions: versions.map(v => ({
      importId: v.importId,
      fileName: v.fileName,
      recordCount: v.recordCount,
      importedAt: v.importedAt,
      isDefault: v.isDefault,
      note: v.note
    }))
  });
}

// ==================== deleteVersion 操作 ====================

/**
 * 删除指定版本
 *
 * @param {Object} db - 数据库实例
 * @param {Object} data - 删除数据
 * @param {string} data.importId - 要删除的版本ID
 */
async function handleDeleteVersion(db, data) {
  const { importId } = data;

  if (!importId) {
    return errorResponse(400, '缺少版本ID (importId)');
  }

  const libraryCollection = db.collection(LIBRARY_COLLECTION);
  const importsCollection = db.collection(IMPORTS_COLLECTION);

  // 检查版本是否存在
  const version = await importsCollection.findOne({ importId });
  if (!version) {
    return errorResponse(404, `版本不存在: ${importId}`);
  }

  // 如果是默认版本，不允许删除（除非是唯一版本）
  const versionCount = await importsCollection.countDocuments({});
  if (version.isDefault && versionCount > 1) {
    return errorResponse(400, '不能删除默认版本，请先设置其他版本为默认');
  }

  // 删除记录
  const deleteResult = await libraryCollection.deleteMany({ importId });

  // 删除版本元信息
  await importsCollection.deleteOne({ importId });

  return successResponse({
    deletedCount: deleteResult.deletedCount,
    importId
  });
}

// ==================== setDefaultVersion 操作 ====================

/**
 * 设置默认版本
 *
 * @param {Object} db - 数据库实例
 * @param {Object} data - 设置数据
 * @param {string} data.importId - 要设为默认的版本ID
 */
async function handleSetDefaultVersion(db, data) {
  const { importId } = data;

  if (!importId) {
    return errorResponse(400, '缺少版本ID (importId)');
  }

  const importsCollection = db.collection(IMPORTS_COLLECTION);

  // 检查版本是否存在
  const version = await importsCollection.findOne({ importId });
  if (!version) {
    return errorResponse(404, `版本不存在: ${importId}`);
  }

  // 取消当前默认版本
  await importsCollection.updateMany(
    { isDefault: true },
    { $set: { isDefault: false } }
  );

  // 设置新默认版本
  await importsCollection.updateOne(
    { importId },
    { $set: { isDefault: true } }
  );

  return successResponse({
    importId,
    isDefault: true
  });
}

// ==================== compare 操作 ====================

/**
 * 与 agentworks 达人对比
 *
 * @param {Object} db - 数据库实例
 * @param {Object} data - 对比数据
 * @param {string} data.importId - 版本ID（可选，默认使用默认版本）
 * @param {string} data.platform - 平台
 */
async function handleCompare(db, data) {
  const { importId: requestedImportId, platform } = data;

  if (!platform) {
    return errorResponse(400, '缺少平台参数 (platform)');
  }

  const validPlatforms = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];
  if (!validPlatforms.includes(platform)) {
    return errorResponse(400, `不支持的平台: ${platform}`);
  }

  const libraryCollection = db.collection(LIBRARY_COLLECTION);
  const importsCollection = db.collection(IMPORTS_COLLECTION);
  const talentsCollection = db.collection(TALENTS_COLLECTION);
  const agenciesCollection = db.collection(AGENCIES_COLLECTION);

  // 确定使用的版本
  let importId = requestedImportId;
  if (!importId) {
    const defaultVersion = await importsCollection.findOne({ isDefault: true });
    if (!defaultVersion) {
      return errorResponse(404, '没有可用的公司库版本，请先导入数据');
    }
    importId = defaultVersion.importId;
  } else {
    // 验证版本是否存在
    const version = await importsCollection.findOne({ importId });
    if (!version) {
      return errorResponse(404, `版本不存在: ${importId}`);
    }
  }

  // 获取所有机构信息
  const allAgencies = await agenciesCollection.find({}, {
    projection: { id: 1, name: 1 }
  }).toArray();
  const agencyIdToName = new Map(allAgencies.map(a => [a.id, a.name]));
  const agencyNameToId = new Map(allAgencies.map(a => [a.name.toLowerCase(), a.id]));

  // 获取 agentworks 所有达人
  const talents = await talentsCollection.find(
    { platform },
    {
      projection: {
        oneId: 1,
        name: 1,
        platformAccountId: 1,
        agencyId: 1,
        currentRebate: 1,
        rebateMode: 1
      }
    }
  ).toArray();

  if (talents.length === 0) {
    return successResponse({
      importId,
      comparisons: [],
      summary: {
        total: 0,
        matched: 0,
        unmatched: 0,
        canSync: 0,
        referenceOnly: 0,
        companyHigher: 0,
        awHigher: 0,
        equal: 0
      }
    });
  }

  // 获取所有达人的星图ID
  const xingtuIds = talents.map(t => t.platformAccountId).filter(Boolean);

  // 批量查询公司库中匹配的记录
  const companyRecords = await libraryCollection.find({
    importId,
    xingtuId: { $in: xingtuIds }
  }).toArray();

  // 按星图ID分组公司库记录
  const companyRecordsByXingtuId = new Map();
  for (const record of companyRecords) {
    const key = record.xingtuId;
    if (!companyRecordsByXingtuId.has(key)) {
      companyRecordsByXingtuId.set(key, []);
    }
    companyRecordsByXingtuId.get(key).push(record);
  }

  // 构建对比结果
  const comparisons = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let canSyncCount = 0;
  let referenceOnlyCount = 0;
  let companyHigherCount = 0;
  let awHigherCount = 0;
  let equalCount = 0;

  for (const talent of talents) {
    const xingtuId = talent.platformAccountId;
    const awRebate = talent.currentRebate?.rate ?? 5; // 默认5%
    const awAgencyId = talent.agencyId || 'individual';
    const awAgencyName = awAgencyId !== 'individual'
      ? (agencyIdToName.get(awAgencyId) || '未知机构')
      : null;

    const records = companyRecordsByXingtuId.get(xingtuId) || [];

    if (records.length === 0) {
      // 公司库无记录
      unmatchedCount++;
      comparisons.push({
        talentId: talent.oneId,
        talentName: talent.name,
        xingtuId,
        awAgencyId,
        awAgencyName,
        awRebate,
        rebateMode: talent.rebateMode || 'sync',
        companyRecords: [],
        maxCompanyRebate: null,
        sameAgencyRebate: null,
        canSync: false,
        syncRebate: null,
        diffType: 'noMatch'
      });
      continue;
    }

    matchedCount++;

    // 处理公司库记录
    const processedRecords = records.map(r => {
      // 检查是否是同机构
      let isSameAgency = false;
      const mcnLower = (r.mcn || '').toLowerCase().trim();

      if (awAgencyId === 'individual') {
        // 野生达人：只有当公司库 MCN 为空或明确是野生/个人时，才算同类型
        const wildKeywords = ['野生', '个人', '无', ''];
        isSameAgency = wildKeywords.some(kw => mcnLower === kw || mcnLower.includes('野生'));
      } else {
        // 机构达人：MCN 匹配机构名称
        isSameAgency = awAgencyName && mcnLower === awAgencyName.toLowerCase();
      }

      return {
        mcn: r.mcn,
        rebateRate: r.rebateRate,
        isSameAgency
      };
    });

    // 计算统计值
    const maxCompanyRebate = Math.max(...processedRecords.map(r => r.rebateRate));
    const sameAgencyRecords = processedRecords.filter(r => r.isSameAgency);
    const sameAgencyRebate = sameAgencyRecords.length > 0
      ? Math.max(...sameAgencyRecords.map(r => r.rebateRate))
      : null;

    // 判断是否可同步（同机构且公司库更高）
    const canSync = sameAgencyRebate !== null && sameAgencyRebate > awRebate;
    const syncRebate = canSync ? sameAgencyRebate : null;

    // 判断差异类型（基于同机构比较）
    let diffType = 'noMatch';
    if (sameAgencyRebate !== null) {
      if (sameAgencyRebate > awRebate) {
        diffType = 'companyHigher';
        companyHigherCount++;
      } else if (sameAgencyRebate < awRebate) {
        diffType = 'awHigher';
        awHigherCount++;
      } else {
        diffType = 'equal';
        equalCount++;
      }
    }

    // 是否有跨机构参考
    const hasReferenceOnly = processedRecords.some(r => !r.isSameAgency && r.rebateRate > awRebate);
    if (hasReferenceOnly && !canSync) {
      referenceOnlyCount++;
    }
    if (canSync) {
      canSyncCount++;
    }

    comparisons.push({
      talentId: talent.oneId,
      talentName: talent.name,
      xingtuId,
      awAgencyId,
      awAgencyName,
      awRebate,
      rebateMode: talent.rebateMode || 'sync',
      companyRecords: processedRecords,
      maxCompanyRebate,
      sameAgencyRebate,
      canSync,
      syncRebate,
      diffType
    });
  }

  return successResponse({
    importId,
    comparisons,
    summary: {
      total: talents.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      canSync: canSyncCount,
      referenceOnly: referenceOnlyCount,
      companyHigher: companyHigherCount,
      awHigher: awHigherCount,
      equal: equalCount
    }
  });
}

// ==================== 主处理函数 ====================

exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 仅支持 POST 方法
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    // 检查环境变量
    if (!MONGO_URI) {
      console.error('[ERROR] MONGO_URI 环境变量未设置');
      return errorResponse(500, '服务器数据库配置不完整');
    }

    // 解析请求体
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return errorResponse(400, '请求体格式错误');
    }

    const { operation, data = {} } = body;

    // 验证必需参数
    if (!operation) {
      return errorResponse(400, '缺少 operation 参数');
    }

    // 连接数据库
    const dbClient = await connectToDatabase();
    const db = dbClient.db(DB_NAME);

    // 路由到对应的操作处理函数
    switch (operation) {
      case 'import':
        return await handleImport(db, data);

      case 'listVersions':
        return await handleListVersions(db);

      case 'deleteVersion':
        return await handleDeleteVersion(db, data);

      case 'setDefaultVersion':
        return await handleSetDefaultVersion(db, data);

      case 'compare':
        return await handleCompare(db, data);

      default:
        return errorResponse(400, `不支持的操作类型: ${operation}，支持: import, listVersions, deleteVersion, setDefaultVersion, compare`);
    }

  } catch (error) {
    console.error('[ERROR] companyRebateLibrary 处理失败:', error);

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        ...(isProduction ? {} : { error: error.message, stack: error.stack })
      })
    };
  }
};
