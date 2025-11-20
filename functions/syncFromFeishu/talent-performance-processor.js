/**
 * talent-performance-processor.js - 达人性能数据处理器
 * @version 1.1 - Price Import Support
 *
 * --- v1.1 更新日志 (2025-11-20) ---
 * - [价格导入] processTalentPerformance 支持 priceYear/priceMonth 参数
 * - [参数传递] 将价格年月传递给 applyMappingRules 映射引擎
 * - [调试日志] 添加价格归属时间的日志输出
 *
 * --- v1.0 更新日志 (2025-11-18) ---
 * - [初始版本] 处理达人表现数据导入的业务逻辑
 * - [配置驱动] 支持从数据库读取映射配置（v2）
 * - [向后兼容] 保留 v1 硬编码映射逻辑
 * - [双版本支持] 同时支持 v1（kol_data）和 v2（agentworks_db）
 *
 * 说明: 处理达人表现数据导入的业务逻辑
 * 依赖: mapping-engine.js
 * 可剥离性: ⭐⭐⭐⭐⭐ 可独立为 performanceImportService
 */

const { getMappingConfig, applyMappingRules, bulkUpdateTalents } = require('./mapping-engine');

/**
 * 处理达人表现数据导入（v12.0 新版本）
 * 支持 v2 数据库 + 配置驱动 + 价格导入
 *
 * @param {Object} db - 数据库连接
 * @param {Array} rows - 飞书/Excel数据行
 * @param {string} platform - 平台（douyin/xiaohongshu/etc）
 * @param {string} dbVersion - 数据库版本（v1/v2）
 * @param {string} mappingConfigId - 映射配置ID
 * @param {number} priceYear - 价格归属年份
 * @param {number} priceMonth - 价格归属月份
 * @returns {Object} { validData, invalidRows, stats }
 */
async function processTalentPerformance(db, rows, platform, dbVersion, mappingConfigId = 'default', priceYear, priceMonth) {
  console.log(`[性能数据导入] 开始处理 - 平台: ${platform}, 数据库: ${dbVersion}`);
  console.log(`[性能数据导入] 价格时间: ${priceYear || '未指定'}年${priceMonth || '未指定'}月`);

  // 1. 获取映射配置
  const mappingConfig = await getMappingConfig(db, platform, mappingConfigId);
  console.log(`[性能数据导入] 使用映射配置: ${mappingConfig.configName} (v${mappingConfig.version})`);
  console.log(`[性能数据导入] 映射规则数: ${mappingConfig.mappings.length}`);

  // 2. 应用映射引擎（传递价格年月）
  const { validData, invalidRows } = applyMappingRules(rows, mappingConfig.mappings, platform, priceYear, priceMonth);

  // 3. 批量更新数据库
  const stats = await bulkUpdateTalents(db, validData, dbVersion);

  console.log(`[性能数据导入] 完成 - 成功:${stats.modified}, 失败:${stats.failed}`);

  return {
    validData,
    invalidRows,
    stats: {
      total: rows.length - 1,  // 减去表头行
      valid: validData.length,
      invalid: invalidRows.length,
      matched: stats.matched,
      modified: stats.modified,
      failed: stats.failed
    }
  };
}

/**
 * 处理达人表现数据导入（v1 兼容模式）
 * 使用硬编码映射（保持 ByteProject 兼容）
 *
 * @param {Object} db - 数据库连接
 * @param {Array} rows - 飞书数据行
 * @returns {Object} { data, updated, failed }
 */
async function processTalentPerformanceLegacy(db, rows) {
  console.log(`[性能数据导入 v1] 开始处理（兼容模式）`);

  if (!rows || rows.length < 2) {
    return { data: [], updated: 0, failed: 0 };
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  const processedData = [];

  // 构建表头索引
  const headerMap = new Map(
    header.map((col, i) => [(col && typeof col === 'string') ? col.trim() : '', i])
      .filter(([col]) => col !== '')
  );

  const getValue = (colName, isPercentage = false) => {
    const index = headerMap.get(colName);
    if (index !== undefined && row[index] !== null && row[index] !== '') {
      return parseFlexibleNumber(row[index], isPercentage);
    }
    return 0;
  };

  // 硬编码映射（v1 兼容）
  const mappings = [
    { key: 'cpm60s', header: '预期cpm' },
    { key: 'maleAudienceRatio', header: '男性粉丝占比', isPercentage: true },
    { key: 'femaleAudienceRatio', header: '女性粉丝占比', isPercentage: true },
    { key: 'ratio_18_23', header: '18-23岁粉丝比例', isPercentage: true },
    { key: 'ratio_24_30', header: '24-30岁粉丝比例', isPercentage: true },
    { key: 'ratio_31_40', header: '31-40岁粉丝比例', isPercentage: true },
    { key: 'ratio_41_50', header: '41-50岁粉丝比例', isPercentage: true },
    { key: 'ratio_50_plus', header: '50岁以上粉丝比例', isPercentage: true },
    { key: 'ratio_town_middle_aged', header: '小镇中老年粉丝比例', isPercentage: true },
    { key: 'ratio_senior_middle_class', header: '资深中产粉丝比例', isPercentage: true },
    { key: 'ratio_z_era', header: 'Z时代粉丝比例', isPercentage: true },
    { key: 'ratio_urban_silver', header: '都市银发粉丝比例', isPercentage: true },
    { key: 'ratio_town_youth', header: '小镇青年粉丝比例', isPercentage: true },
    { key: 'ratio_exquisite_mom', header: '精致妈妈粉丝比例', isPercentage: true },
    { key: 'ratio_new_white_collar', header: '新锐白领粉丝比例', isPercentage: true },
    { key: 'ratio_urban_blue_collar', header: '都市蓝领粉丝比例', isPercentage: true }
  ];

  const xingtuIdIndex = headerMap.get('达人id') ?? headerMap.get('星图ID');
  if (xingtuIdIndex === undefined) {
    throw new Error('飞书表格中找不到"达人id"或"星图ID"列');
  }

  let stats = { processed: 0, updated: 0, failed: 0 };

  for (const row of dataRows) {
    const xingtuId = (xingtuIdIndex !== undefined && row[xingtuIdIndex])
      ? String(row[xingtuIdIndex]).trim()
      : null;

    if (!xingtuId) {
      stats.failed++;
      continue;
    }

    const talentData = { xingtuId, performanceData: {} };

    mappings.forEach(m => {
      const value = getValue(m.header, m.isPercentage);
      if (value !== 0 || (headerMap.has(m.header) && row[headerMap.get(m.header)] !== null)) {
        talentData.performanceData[m.key] = value;
      }
    });

    // 计算聚合字段
    const ratio18_40 =
      (talentData.performanceData.ratio_18_23 || 0) +
      (talentData.performanceData.ratio_24_30 || 0) +
      (talentData.performanceData.ratio_31_40 || 0);
    const ratio40_plus =
      (talentData.performanceData.ratio_41_50 || 0) +
      (talentData.performanceData.ratio_50_plus || 0);

    if (ratio18_40 > 0) talentData.performanceData.audience_18_40_ratio = ratio18_40;
    if (ratio40_plus > 0) talentData.performanceData.audience_40_plus_ratio = ratio40_plus;

    processedData.push(talentData);
    stats.processed++;
  }

  // 批量更新数据库（使用原有逻辑）
  const bulkOps = [];
  const currentTime = new Date();

  for (const talent of processedData) {
    const updateFields = {};

    for (const [key, value] of Object.entries(talent.performanceData)) {
      updateFields[`performanceData.${key}`] = value;
    }

    updateFields['performanceData.lastUpdated'] = currentTime;
    updateFields['updatedAt'] = currentTime;

    bulkOps.push({
      updateOne: {
        filter: { xingtuId: talent.xingtuId },
        update: { $set: updateFields },
        upsert: false
      }
    });
  }

  if (bulkOps.length > 0) {
    const result = await db.collection('talents').bulkWrite(bulkOps, { ordered: false });
    stats.updated = processedData.length;
    stats.failed = 0;
  }

  console.log(`[性能数据导入 v1] 完成: 处理${stats.processed}, 更新${stats.updated}`);

  return {
    data: processedData,
    updated: stats.updated,
    failed: stats.failed
  };
}

module.exports = {
  processTalentPerformance,
  processTalentPerformanceLegacy
};
