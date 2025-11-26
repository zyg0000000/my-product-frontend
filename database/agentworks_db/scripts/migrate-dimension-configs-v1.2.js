/**
 * migrate-to-multi-collection-v1.2.js
 * 迁移脚本：为 field_mappings 和 dimension_configs 添加 targetCollection 字段
 *
 * 用途：
 * - field_mappings: 将 performanceData.* 路径的映射规则标记为写入 talent_performance 集合
 * - dimension_configs: 将 performanceData.* 路径的维度标记为从 talent_performance 集合读取
 *
 * 执行方式：
 *   mongosh "mongodb+srv://..." --file migrate-to-multi-collection-v1.2.js
 *   或在 MongoDB Compass Shell 中执行
 */

// 切换到目标数据库
// use agentworks_db;

// 定义需要迁移到 talent_performance 的 targetPath 前缀
const performancePaths = [
  'performanceData.cpm',
  'performanceData.audienceGender',
  'performanceData.audienceAge',
  'performanceData.crowdPackage',
  'performanceData.lastUpdated'
];

// 检查 targetPath 是否属于 performance 数据
function isPerformancePath(targetPath) {
  return performancePaths.some(prefix => targetPath.startsWith(prefix));
}

console.log('========================================');
console.log('  Multi-Collection 迁移脚本 v1.2');
console.log('========================================\n');

// ========== 1. 迁移 field_mappings ==========
console.log('[1/2] 迁移 field_mappings 集合...\n');

const fieldMappingConfigs = db.field_mappings.find({}).toArray();
console.log(`找到 ${fieldMappingConfigs.length} 个字段映射配置文档`);

let fmUpdated = 0;
let fmMappingsUpdated = 0;

fieldMappingConfigs.forEach(config => {
  console.log(`\n[field_mappings] 平台: ${config.platform}, 配置: ${config.configName}`);

  let mappingsToUpdate = 0;
  const updatedMappings = config.mappings.map(mapping => {
    // 如果已经有 targetCollection，跳过
    if (mapping.targetCollection) {
      return mapping;
    }

    // 检查是否是 performance 数据路径
    if (isPerformancePath(mapping.targetPath)) {
      mappingsToUpdate++;
      console.log(`  → ${mapping.excelHeader} (${mapping.targetPath}) → talent_performance`);
      return {
        ...mapping,
        targetCollection: 'talent_performance'
      };
    }

    // 其他字段保持默认（talents）
    return mapping;
  });

  if (mappingsToUpdate > 0) {
    const result = db.field_mappings.updateOne(
      { _id: config._id },
      {
        $set: {
          mappings: updatedMappings,
          version: '1.1',  // 升级版本号
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      fmUpdated++;
      fmMappingsUpdated += mappingsToUpdate;
      console.log(`  ✓ 已更新 ${mappingsToUpdate} 个映射规则`);
    }
  } else {
    console.log(`  - 无需更新`);
  }
});

console.log(`\n[field_mappings 完成] 更新了 ${fmUpdated} 个配置，共 ${fmMappingsUpdated} 个映射规则`);

// ========== 2. 迁移 dimension_configs ==========
console.log('\n\n[2/2] 迁移 dimension_configs 集合...\n');

const dimensionConfigs = db.dimension_configs.find({}).toArray();
console.log(`找到 ${dimensionConfigs.length} 个维度配置文档`);

let dcUpdated = 0;
let dcDimensionsUpdated = 0;

dimensionConfigs.forEach(config => {
  console.log(`\n[dimension_configs] 平台: ${config.platform}, 配置: ${config.configName}`);

  let dimensionsToUpdate = 0;
  const updatedDimensions = config.dimensions.map(dim => {
    // 如果已经有 targetCollection，跳过
    if (dim.targetCollection) {
      return dim;
    }

    // 检查是否是 performance 数据路径
    if (isPerformancePath(dim.targetPath)) {
      dimensionsToUpdate++;
      console.log(`  → ${dim.name} (${dim.targetPath}) → talent_performance`);
      return {
        ...dim,
        targetCollection: 'talent_performance'
      };
    }

    // 其他字段保持默认（talents）
    return dim;
  });

  if (dimensionsToUpdate > 0) {
    const result = db.dimension_configs.updateOne(
      { _id: config._id },
      {
        $set: {
          dimensions: updatedDimensions,
          version: '1.2',  // 升级版本号
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      dcUpdated++;
      dcDimensionsUpdated += dimensionsToUpdate;
      console.log(`  ✓ 已更新 ${dimensionsToUpdate} 个维度`);
    }
  } else {
    console.log(`  - 无需更新`);
  }
});

console.log(`\n[dimension_configs 完成] 更新了 ${dcUpdated} 个配置，共 ${dcDimensionsUpdated} 个维度`);

// ========== 3. 验证迁移结果 ==========
console.log('\n\n========================================');
console.log('  迁移结果验证');
console.log('========================================\n');

// 验证 field_mappings
const verifyFM = db.field_mappings.findOne({ platform: 'douyin', configName: 'default' });
if (verifyFM) {
  const perfMappings = verifyFM.mappings.filter(m => m.targetCollection === 'talent_performance');
  const talentMappings = verifyFM.mappings.filter(m => !m.targetCollection || m.targetCollection === 'talents');
  console.log(`[field_mappings] 抖音-default:`);
  console.log(`  - talents 映射: ${talentMappings.length} 条 (基础信息+价格)`);
  console.log(`  - talent_performance 映射: ${perfMappings.length} 条 (表现数据)`);
}

// 验证 dimension_configs
const verifyDC = db.dimension_configs.findOne({ platform: 'douyin', configName: 'default' });
if (verifyDC) {
  const perfDims = verifyDC.dimensions.filter(d => d.targetCollection === 'talent_performance');
  const talentDims = verifyDC.dimensions.filter(d => !d.targetCollection || d.targetCollection === 'talents');
  console.log(`\n[dimension_configs] 抖音-default:`);
  console.log(`  - talents 维度: ${talentDims.length} 个`);
  console.log(`  - talent_performance 维度: ${perfDims.length} 个`);
}

console.log('\n========================================');
console.log('  迁移完成！');
console.log('========================================');
