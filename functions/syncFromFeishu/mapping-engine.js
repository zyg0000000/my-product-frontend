/**
 * mapping-engine.js - 通用映射引擎
 * @version 1.3 - Multi-Collection Support
 *
 * --- v1.3 更新日志 (2025-11-26) ---
 * - [多集合支持] 支持 targetCollection 字段，实现数据分流写入
 *   - talents: 达人基础信息（默认）
 *   - talent_performance: 表现数据时序（新增）
 * - [分流逻辑] applyMappingRules 按 targetCollection 分离数据
 * - [时序数据] 写入 talent_performance 时自动添加：
 *   - snapshotId: 唯一标识
 *   - snapshotDate: 当天日期
 *   - snapshotType: 'daily'
 *   - dataSource: 'feishu'
 * - [批量更新] bulkUpdateTalents 支持多集合写入
 *
 * --- v1.2 更新日志 (2025-11-20) ---
 * - [价格字段识别] applyMappingRules 支持通过 priceType 元数据识别价格类型
 * - [PriceRecord 构建] 自动构建价格记录：{ year, month, type, price, status }
 * - [单位转换] 自动将飞书表格中的元转换为分（× 100）
 * - [智能合并] bulkUpdateTalents 实现 prices 数组智能合并逻辑
 *   - 同年月同类型：覆盖旧值
 *   - 不同时间：追加新值
 *   - 保留历史数据
 * - [调试日志] 输出价格识别和合并操作的详细日志
 * - [平台通用] 价格识别逻辑完全配置驱动，支持所有平台
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
 * 生成快照ID
 * 格式: perf_{oneId}_{platform}_{date}_{随机串}
 */
function generateSnapshotId(oneId, platform) {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `perf_${oneId || 'unknown'}_${platform}_${dateStr}_${random}`;
}

/**
 * 应用映射规则（核心引擎）
 * v1.3: 支持 targetCollection 分流
 *
 * @param {Array} rows - 原始数据行（第一行为表头）
 * @param {Array} mappingRules - 映射规则数组
 * @param {string} platform - 平台
 * @param {number} priceYear - 价格归属年份
 * @param {number} priceMonth - 价格归属月份
 * @returns {Object} { validData, invalidRows, performanceData }
 *   - validData: 写入 talents 集合的数据
 *   - performanceData: 写入 talent_performance 集合的数据
 *   - invalidRows: 无效行
 */
function applyMappingRules(rows, mappingRules, platform, priceYear, priceMonth) {
  if (!rows || rows.length < 2) {
    return { validData: [], invalidRows: [], performanceData: [] };
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  const validData = [];          // talents 集合数据
  const performanceData = [];    // talent_performance 集合数据
  const invalidRows = [];

  // 构建表头索引 Map
  const headerMap = new Map(
    header
      .map((col, i) => [(col && typeof col === 'string') ? col.trim() : '', i])
      .filter(([col]) => col !== '')
  );

  // v1.3: 按 targetCollection 分组映射规则
  const talentRules = mappingRules.filter(r => !r.targetCollection || r.targetCollection === 'talents');
  const performanceRules = mappingRules.filter(r => r.targetCollection === 'talent_performance');

  console.log(`[映射引擎] 表头列数: ${header.length}`);
  console.log(`[映射引擎] 数据行数: ${dataRows.length}`);
  console.log(`[映射引擎] 映射规则数: ${mappingRules.length}`);
  console.log(`[映射引擎] → talents 规则: ${talentRules.length}, talent_performance 规则: ${performanceRules.length}`);

  // 🔍 调试：打印前10个表头列名
  console.log(`[映射引擎] 前10个表头:`, header.slice(0, 10).filter(h => h).join(', '));

  // 🔍 调试：打印期望的列名
  const expectedHeaders = mappingRules.map(r => r.excelHeader).slice(0, 10);
  console.log(`[映射引擎] 期望的列名（前10个）:`, expectedHeaders.join(', '));

  // 获取今天的日期（用于 snapshotDate）
  const today = new Date().toISOString().split('T')[0];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];

    try {
      // talents 集合数据
      const talentRow = {
        platform: platform
      };
      // talent_performance 集合数据
      const perfRow = {
        platform: platform,
        snapshotDate: today,
        snapshotType: 'daily',
        dataSource: 'feishu',
        metrics: {},
        audience: {}
      };

      let hasRequiredFields = true;
      let talentFieldsCount = 0;
      let perfFieldsCount = 0;

      // 首先处理 talents 规则（获取 platformAccountId/oneId 用于关联）
      for (const rule of talentRules) {
        const colIndex = headerMap.get(rule.excelHeader);

        if (colIndex === undefined) {
          if (rule.required) {
            if (rowIndex === 0) {
              console.log(`[映射引擎] ❌ 缺少必需列: "${rule.excelHeader}"`);
            }
            hasRequiredFields = false;
            break;
          }
          continue;
        }

        let value = row[colIndex];

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

        // 价格字段特殊处理
        if (rule.targetPath === 'prices' && rule.priceType) {
          if (processedValue > 0) {
            if (!talentRow.prices) {
              talentRow.prices = [];
            }
            const priceRecord = {
              year: priceYear || new Date().getFullYear(),
              month: priceMonth || (new Date().getMonth() + 1),
              type: rule.priceType,
              price: Math.round(processedValue * 100),
              status: 'confirmed'
            };
            talentRow.prices.push(priceRecord);
            talentFieldsCount++;
            if (rowIndex === 0) {
              console.log(`[映射引擎] 🏷️ 识别价格字段: ${rule.excelHeader} → ${rule.priceType}`);
            }
          }
        } else {
          setNestedValue(talentRow, rule.targetPath, processedValue);
          talentFieldsCount++;
        }
      }

      // 处理 talent_performance 规则
      for (const rule of performanceRules) {
        const colIndex = headerMap.get(rule.excelHeader);

        if (colIndex === undefined) {
          continue;  // performance 字段不强制要求
        }

        let value = row[colIndex];

        if (value === null || value === undefined || String(value).trim() === '') {
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
              if (isNaN(processedValue.getTime())) continue;
              break;
            case 'text':
            default:
              processedValue = String(value).trim();
          }
        } catch (error) {
          continue;
        }

        // 设置到 perfRow（targetPath 应该是如 metrics.cpm, audience.gender.male 等）
        setNestedValue(perfRow, rule.targetPath, processedValue);
        perfFieldsCount++;

        if (rowIndex === 0) {
          console.log(`[映射引擎] 📊 Performance 字段: ${rule.excelHeader} → ${rule.targetPath}`);
        }
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
      if (talentFieldsCount === 0 && perfFieldsCount === 0) {
        invalidRows.push({
          index: rowIndex + 1,
          row: row,
          reason: '空行或无有效数据'
        });
        continue;
      }

      // 添加到对应集合
      if (talentFieldsCount > 0) {
        validData.push(talentRow);
      }

      // 如果有 performance 数据，需要关联到达人
      if (perfFieldsCount > 0) {
        // 从 talentRow 获取关联字段
        perfRow.oneId = talentRow.oneId || null;
        perfRow.platformAccountId = talentRow.platformAccountId || null;

        // 生成 snapshotId（唯一标识）
        perfRow.snapshotId = generateSnapshotId(
          perfRow.oneId || perfRow.platformAccountId,
          platform
        );

        // 添加时间戳
        perfRow.lastUpdated = new Date();
        perfRow.createdAt = new Date();
        perfRow.updatedAt = new Date();

        performanceData.push(perfRow);
      }

    } catch (error) {
      invalidRows.push({
        index: rowIndex + 1,
        row: row,
        reason: error.message
      });
    }
  }

  console.log(`[映射引擎] 处理完成:`);
  console.log(`  → talents: ${validData.length} 条`);
  console.log(`  → talent_performance: ${performanceData.length} 条`);
  console.log(`  → 失败: ${invalidRows.length} 条`);

  return { validData, invalidRows, performanceData };
}

/**
 * 批量更新达人数据到数据库
 * v1.3: 支持同时写入 talents 和 talent_performance 集合
 *
 * @param {Object} db - 数据库连接
 * @param {Array} processedData - 处理后的 talents 数据
 * @param {string} dbVersion - 数据库版本（v1/v2）
 * @param {Array} performanceData - 处理后的 talent_performance 数据（可选）
 * @returns {Object} 更新统计
 */
async function bulkUpdateTalents(db, processedData, dbVersion, performanceData = []) {
  const collection = db.collection('talents');
  const bulkOps = [];
  const currentTime = new Date();

  for (const talent of processedData) {
    const updateFields = {};
    let hasPriceUpdates = false;

    // 提取顶层字段和嵌套字段
    for (const [key, value] of Object.entries(talent)) {
      if (key === 'platform') continue;  // platform 用于 filter，不更新

      if (key === 'prices' && Array.isArray(value) && value.length > 0) {
        // 🔥 价格字段特殊处理：需要合并而不是覆盖
        hasPriceUpdates = true;
        // 暂存价格数据，稍后处理
        continue;
      } else if (key === 'performanceData' && typeof value === 'object') {
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

    // 🔥 处理价格更新（合并逻辑）
    let priceUpdateOperation = null;
    if (hasPriceUpdates && talent.prices) {
      // 需要先查询现有达人，获取已有的 prices 数组
      priceUpdateOperation = {
        newPrices: talent.prices
      };
    }

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

    // 🔥 如果有价格更新，需要特殊处理
    if (priceUpdateOperation) {
      bulkOps.push({
        filter,
        updateFields,
        priceUpdateOperation
      });
    } else {
      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: updateFields },
          upsert: false
        }
      });
    }
  }

  // 执行批量更新
  if (bulkOps.length === 0) {
    return { matched: 0, modified: 0, failed: 0 };
  }

  console.log(`[批量更新] 准备更新 ${bulkOps.length} 条记录`);

  // 🔥 分离处理：有价格更新的需要先查询再合并
  const standardOps = bulkOps.filter(op => !op.priceUpdateOperation);
  const priceOps = bulkOps.filter(op => op.priceUpdateOperation);

  let matchedCount = 0;
  let modifiedCount = 0;

  // 1. 执行标准更新
  if (standardOps.length > 0) {
    const standardResult = await collection.bulkWrite(standardOps, { ordered: false });
    matchedCount += standardResult.matchedCount;
    modifiedCount += standardResult.modifiedCount;
  }

  // 2. 执行价格合并更新
  for (const op of priceOps) {
    try {
      // 查询现有达人
      const existingTalent = await collection.findOne(op.filter);

      if (existingTalent) {
        // 合并 prices 数组
        const existingPrices = existingTalent.prices || [];
        const mergedPrices = [...existingPrices];

        // 遍历新价格，覆盖同年月同类型的
        for (const newPrice of op.priceUpdateOperation.newPrices) {
          const existingIndex = mergedPrices.findIndex(p =>
            p.year === newPrice.year &&
            p.month === newPrice.month &&
            p.type === newPrice.type
          );

          if (existingIndex !== -1) {
            mergedPrices[existingIndex] = newPrice;  // 覆盖
            console.log(`[价格合并] 覆盖价格: ${newPrice.year}-${newPrice.month} ${newPrice.type}`);
          } else {
            mergedPrices.push(newPrice);             // 追加
            console.log(`[价格合并] 新增价格: ${newPrice.year}-${newPrice.month} ${newPrice.type}`);
          }
        }

        // 执行更新
        op.updateFields.prices = mergedPrices;
        const updateResult = await collection.updateOne(op.filter, { $set: op.updateFields });

        matchedCount += updateResult.matchedCount;
        modifiedCount += updateResult.modifiedCount;
      }
    } catch (err) {
      console.error('[价格合并] 更新失败:', err);
    }
  }

  const result = { matchedCount, modifiedCount };

  console.log(`[批量更新 talents] 完成: Matched=${result.matchedCount}, Modified=${result.modifiedCount}`);

  // ========== v1.3: 写入 talent_performance 集合 ==========
  let perfStats = { upserted: 0, modified: 0, failed: 0 };

  if (performanceData && performanceData.length > 0) {
    console.log(`[批量更新 talent_performance] 准备写入 ${performanceData.length} 条记录`);

    const perfCollection = db.collection('talent_performance');
    const perfBulkOps = [];

    for (const perf of performanceData) {
      // 需要先查询达人获取 oneId（如果只有 platformAccountId）
      if (!perf.oneId && perf.platformAccountId) {
        const talent = await collection.findOne({
          platformAccountId: perf.platformAccountId,
          platform: perf.platform
        });
        if (talent) {
          perf.oneId = talent.oneId;
        }
      }

      // 必须有 oneId 才能写入
      if (!perf.oneId) {
        console.warn(`[talent_performance] 跳过：无法确定 oneId (platformAccountId: ${perf.platformAccountId})`);
        perfStats.failed++;
        continue;
      }

      // 使用 upsert：同一达人+平台+类型+日期 只保留一条
      perfBulkOps.push({
        updateOne: {
          filter: {
            oneId: perf.oneId,
            platform: perf.platform,
            snapshotType: perf.snapshotType,
            snapshotDate: perf.snapshotDate
          },
          update: {
            $set: {
              ...perf,
              updatedAt: currentTime
            },
            $setOnInsert: {
              createdAt: currentTime
            }
          },
          upsert: true
        }
      });
    }

    if (perfBulkOps.length > 0) {
      try {
        const perfResult = await perfCollection.bulkWrite(perfBulkOps, { ordered: false });
        perfStats.upserted = perfResult.upsertedCount || 0;
        perfStats.modified = perfResult.modifiedCount || 0;
        console.log(`[批量更新 talent_performance] 完成: Upserted=${perfStats.upserted}, Modified=${perfStats.modified}`);
      } catch (err) {
        console.error('[批量更新 talent_performance] 失败:', err);
        perfStats.failed = perfBulkOps.length;
      }
    }
  }

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    failed: bulkOps.length - result.matchedCount,
    // v1.3: 新增 talent_performance 统计
    performance: perfStats
  };
}

module.exports = {
  parseFlexibleNumber,
  setNestedValue,
  getMappingConfig,
  applyMappingRules,
  bulkUpdateTalents
};
