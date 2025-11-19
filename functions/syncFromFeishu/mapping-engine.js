/**
 * mapping-engine.js - 通用映射引擎
 * @version 1.1 - Debug Logging
 *
 * --- v1.1 更新日志 (2025-11-18) ---
 * - [调试优化] 添加详细的调试日志，帮助排查映射失败问题
 *   - 打印实际表头列名 vs 期望列名
 *   - 打印缺少的必需字段
 * - [匹配逻辑] 修复 v2 抖音匹配字段为 platformSpecific.xingtuId
 *
 * --- v1.0 更新日志 (2025-11-18) ---
 * - [初始版本] 从数据库读取映射配置
 * - [通用引擎] 应用映射规则，支持嵌套路径
 * - [批量更新] 支持 v1/v2 数据库
 *
 * 说明: 通用的字段映射处理引擎，完全独立
 * 依赖: 无
 * 可剥离性: ⭐⭐⭐⭐⭐ 完全独立，零依赖
 */

/**
 * 解析灵活的数字格式
 * 支持: 百分比、千位分隔符、万单位等
 */
function parseFlexibleNumber(value, isPercentage = false) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  let numStr = value.replace(/,/g, '').trim();

  // 处理百分比
  if (isPercentage || numStr.endsWith('%')) {
    const num = parseFloat(numStr.replace('%', ''));
    // 只有包含 % 符号时才除以 100
    return isNaN(num) ? 0 : (numStr.endsWith('%') ? num / 100 : num);
  }

  // 处理万单位
  if (numStr.toLowerCase().endsWith('w') || numStr.includes('万')) {
    const num = parseFloat(numStr.replace(/w|万/gi, ''));
    return isNaN(num) ? 0 : num * 10000;
  }

  const num = parseFloat(numStr);
  return isNaN(num) ? 0 : num;
}

/**
 * 设置嵌套属性值
 * @param {Object} obj - 目标对象
 * @param {string} path - 嵌套路径（如 'performanceData.audienceGender.male'）
 * @param {any} value - 要设置的值
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * 从数据库获取映射配置
 * @param {Object} db - 数据库连接
 * @param {string} platform - 平台
 * @param {string} configName - 配置名称
 * @returns {Object} 映射配置
 */
async function getMappingConfig(db, platform, configName = 'default') {
  const config = await db.collection('field_mappings').findOne({
    platform,
    configName,
    isActive: true
  });

  if (!config) {
    throw new Error(`未找到平台 ${platform} 的映射配置（configName: ${configName}）`);
  }

  return config;
}

/**
 * 应用映射规则（核心引擎）
 * @param {Array} rows - 原始数据行（第一行为表头）
 * @param {Array} mappingRules - 映射规则数组
 * @param {string} platform - 平台
 * @returns {Object} { validData, invalidRows }
 */
function applyMappingRules(rows, mappingRules, platform) {
  if (!rows || rows.length < 2) {
    return { validData: [], invalidRows: [] };
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  const validData = [];
  const invalidRows = [];

  // 构建表头索引 Map
  const headerMap = new Map(
    header
      .map((col, i) => [(col && typeof col === 'string') ? col.trim() : '', i])
      .filter(([col]) => col !== '')
  );

  console.log(`[映射引擎] 表头列数: ${header.length}`);
  console.log(`[映射引擎] 数据行数: ${dataRows.length}`);
  console.log(`[映射引擎] 映射规则数: ${mappingRules.length}`);

  // 🔍 调试：打印前10个表头列名
  console.log(`[映射引擎] 前10个表头:`, header.slice(0, 10).filter(h => h).join(', '));

  // 🔍 调试：打印期望的列名
  const expectedHeaders = mappingRules.map(r => r.excelHeader).slice(0, 10);
  console.log(`[映射引擎] 期望的列名（前10个）:`, expectedHeaders.join(', '));

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];

    try {
      const processedRow = {
        platform: platform
      };
      let hasRequiredFields = true;
      let processedFieldsCount = 0;

      // 遍历映射规则
      for (const rule of mappingRules) {
        const colIndex = headerMap.get(rule.excelHeader);

        if (colIndex === undefined) {
          // Excel中没有这一列
          if (rule.required) {
            // 🔍 调试：记录缺少的必需字段
            if (rowIndex === 0) {
              console.log(`[映射引擎] ❌ 缺少必需列: "${rule.excelHeader}"`);
            }
            hasRequiredFields = false;
            break;
          }
          continue;
        }

        let value = row[colIndex];

        // 空值处理
        if (value === null || value === undefined || String(value).trim() === '') {
          if (rule.required) {
            hasRequiredFields = false;
            break;
          }
          continue;
        }

        // 格式转换
        let processedValue = value;
        try {
          switch (rule.format) {
            case 'percentage':
              processedValue = parseFlexibleNumber(value, true);
              break;
            case 'number':
              processedValue = parseFlexibleNumber(value, false);
              break;
            case 'date':
              processedValue = new Date(value);
              if (isNaN(processedValue.getTime())) {
                console.warn(`[映射引擎] 行${rowIndex + 1}: 日期格式无效: ${value}`);
                continue;
              }
              break;
            case 'text':
            default:
              processedValue = String(value).trim();
          }
        } catch (error) {
          console.warn(`[映射引擎] 行${rowIndex + 1}: 格式转换失败 ${rule.excelHeader}:`, error.message);
          continue;
        }

        // 自定义转换（预留，Phase 2可实现）
        if (rule.transform) {
          // TODO: 执行自定义转换函数
        }

        // 验证（预留，Phase 2可实现）
        if (rule.validator) {
          // TODO: 执行验证函数
        }

        // 设置到目标路径
        setNestedValue(processedRow, rule.targetPath, processedValue);
        processedFieldsCount++;
      }

      // 验证必需字段
      if (!hasRequiredFields) {
        invalidRows.push({
          index: rowIndex + 1,
          row: row,
          reason: '缺少必需字段'
        });
        continue;
      }

      // 至少要有一些数据字段
      if (processedFieldsCount === 0) {
        invalidRows.push({
          index: rowIndex + 1,
          row: row,
          reason: '空行或无有效数据'
        });
        continue;
      }

      validData.push(processedRow);

    } catch (error) {
      invalidRows.push({
        index: rowIndex + 1,
        row: row,
        reason: error.message
      });
    }
  }

  console.log(`[映射引擎] 处理完成: 成功${validData.length}, 失败${invalidRows.length}`);

  return { validData, invalidRows };
}

/**
 * 批量更新达人数据到数据库
 * @param {Object} db - 数据库连接
 * @param {Array} processedData - 处理后的数据
 * @param {string} dbVersion - 数据库版本（v1/v2）
 * @returns {Object} 更新统计
 */
async function bulkUpdateTalents(db, processedData, dbVersion) {
  const collection = db.collection('talents');
  const bulkOps = [];
  const currentTime = new Date();

  for (const talent of processedData) {
    const updateFields = {};

    // 提取顶层字段和嵌套字段
    for (const [key, value] of Object.entries(talent)) {
      if (key === 'platform') continue;  // platform 用于 filter，不更新

      if (key === 'performanceData' && typeof value === 'object') {
        // performanceData 使用点表示法更新
        for (const [perfKey, perfValue] of Object.entries(value)) {
          if (typeof perfValue === 'object' && perfValue !== null && !(perfValue instanceof Date)) {
            // 嵌套对象（如 audienceGender, audienceAge, crowdPackage）
            for (const [nestedKey, nestedValue] of Object.entries(perfValue)) {
              updateFields[`performanceData.${perfKey}.${nestedKey}`] = nestedValue;
            }
          } else {
            updateFields[`performanceData.${perfKey}`] = perfValue;
          }
        }
      } else if (key === 'platformSpecific' && typeof value === 'object') {
        // platformSpecific 使用点表示法
        for (const [specKey, specValue] of Object.entries(value)) {
          updateFields[`platformSpecific.${specKey}`] = specValue;
        }
      } else {
        // 顶层字段直接更新
        updateFields[key] = value;
      }
    }

    // 添加更新时间
    updateFields['performanceData.lastUpdated'] = currentTime;
    updateFields['updatedAt'] = currentTime;

    // 构建查询条件
    let filter;
    if (dbVersion === 'v2') {
      // v2 抖音: platformAccountId 就是星图ID
      if (talent.platformAccountId) {
        filter = { platformAccountId: talent.platformAccountId, platform: talent.platform };
      } else if (talent.oneId) {
        // 备选: 使用 oneId（如果有）
        filter = { oneId: talent.oneId, platform: talent.platform };
      } else {
        console.warn('[批量更新] 跳过：缺少 platformAccountId 或 oneId');
        continue;
      }
    } else {
      // v1: 使用 xingtuId
      if (talent.platformSpecific?.xingtuId) {
        filter = { xingtuId: talent.platformSpecific.xingtuId };
      } else {
        console.warn('[批量更新] 跳过：缺少 xingtuId');
        continue;
      }
    }

    bulkOps.push({
      updateOne: {
        filter,
        update: { $set: updateFields },
        upsert: false  // 不创建新文档，只更新已存在的
      }
    });
  }

  // 执行批量更新
  if (bulkOps.length === 0) {
    return { matched: 0, modified: 0, failed: 0 };
  }

  console.log(`[批量更新] 准备更新 ${bulkOps.length} 条记录`);

  const result = await collection.bulkWrite(bulkOps, { ordered: false });

  console.log(`[批量更新] 完成: Matched=${result.matchedCount}, Modified=${result.modifiedCount}`);

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    failed: bulkOps.length - result.matchedCount
  };
}

module.exports = {
  parseFlexibleNumber,
  setNestedValue,
  getMappingConfig,
  applyMappingRules,
  bulkUpdateTalents
};
