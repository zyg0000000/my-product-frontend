/**
 * 修复脚本：更新日期字段从 lastUpdated 改为 _snapshotDate
 *
 * 问题背景：
 * - 之前维度配置中的"更新日期"指向 performanceData.lastUpdated（从 Excel 导入）
 * - 实际上应该使用 performanceData._snapshotDate（从 talent_performance 关联查询得来）
 * - _snapshotDate 代表数据的快照日期，更准确反映数据的时效性
 *
 * 修复内容：
 * 1. 更新 dimension_configs 中的维度配置
 * 2. 更新 field_mappings 中的字段映射（移除 lastUpdated 映射）
 *
 * 执行方式：
 * mongosh agentworks_db --file fix-update-date-to-snapshot-date.js
 */

// 验证当前数据库
const currentDb = db.getName();
if (currentDb !== 'agentworks_db') {
  print(`❌ 错误: 当前数据库是 '${currentDb}'，请先执行 'use agentworks_db'`);
  throw new Error('数据库错误');
}

print('开始修复更新日期字段配置...\n');

// ========== 1. 修复 dimension_configs ==========

print('=== 修复 dimension_configs ===\n');

// 查找所有包含 lastUpdated 维度的配置
const dimensionConfigs = db.dimension_configs.find({
  'dimensions.id': 'lastUpdated'
}).toArray();

print(`找到 ${dimensionConfigs.length} 个需要修复的维度配置`);

for (const config of dimensionConfigs) {
  print(`\n处理配置: ${config.platform} - ${config.configName}`);

  // 更新维度配置
  const result = db.dimension_configs.updateOne(
    { _id: config._id },
    {
      $set: {
        'dimensions.$[elem].id': 'snapshotDate',
        'dimensions.$[elem].targetPath': 'performanceData._snapshotDate',
        updatedAt: new Date()
      }
    },
    {
      arrayFilters: [{ 'elem.id': 'lastUpdated' }]
    }
  );

  print(`  维度更新: ${result.modifiedCount > 0 ? '✓ 成功' : '⚠️ 未修改'}`);

  // 更新 defaultVisibleIds
  if (config.defaultVisibleIds && config.defaultVisibleIds.includes('lastUpdated')) {
    const newVisibleIds = config.defaultVisibleIds.map(id =>
      id === 'lastUpdated' ? 'snapshotDate' : id
    );

    const visibleResult = db.dimension_configs.updateOne(
      { _id: config._id },
      { $set: { defaultVisibleIds: newVisibleIds } }
    );

    print(`  默认显示ID更新: ${visibleResult.modifiedCount > 0 ? '✓ 成功' : '⚠️ 未修改'}`);
  }
}

// ========== 2. 修复 field_mappings ==========

print('\n=== 修复 field_mappings ===\n');

// 查找并移除 lastUpdated 映射
const fieldMappings = db.field_mappings.find({
  'mappings.targetPath': 'performanceData.lastUpdated'
}).toArray();

print(`找到 ${fieldMappings.length} 个需要修复的字段映射配置`);

for (const mapping of fieldMappings) {
  print(`\n处理配置: ${mapping.platform} - ${mapping.configName}`);

  // 移除 lastUpdated 映射（因为更新日期不再从 Excel 导入）
  const result = db.field_mappings.updateOne(
    { _id: mapping._id },
    {
      $pull: {
        mappings: { targetPath: 'performanceData.lastUpdated' }
      },
      $set: {
        updatedAt: new Date()
      }
    }
  );

  print(`  映射移除: ${result.modifiedCount > 0 ? '✓ 成功' : '⚠️ 未修改'}`);

  // 更新 totalMappings 计数
  const updatedMapping = db.field_mappings.findOne({ _id: mapping._id });
  if (updatedMapping) {
    const newCount = updatedMapping.mappings ? updatedMapping.mappings.length : 0;
    db.field_mappings.updateOne(
      { _id: mapping._id },
      { $set: { totalMappings: newCount } }
    );
    print(`  映射计数更新: ${newCount}`);
  }
}

// ========== 3. 验证修复结果 ==========

print('\n=== 验证修复结果 ===\n');

// 检查是否还有 lastUpdated
const remainingDimensions = db.dimension_configs.countDocuments({
  'dimensions.id': 'lastUpdated'
});

const remainingMappings = db.field_mappings.countDocuments({
  'mappings.targetPath': 'performanceData.lastUpdated'
});

if (remainingDimensions === 0 && remainingMappings === 0) {
  print('✓ 所有配置已修复完成！');
} else {
  print(`⚠️ 仍有未修复的配置：`);
  print(`  - 维度配置: ${remainingDimensions} 个`);
  print(`  - 字段映射: ${remainingMappings} 个`);
}

// 显示修复后的配置示例
print('\n=== 修复后的配置示例 ===\n');

const sampleConfig = db.dimension_configs.findOne({ platform: 'douyin' });
if (sampleConfig) {
  const snapshotDim = sampleConfig.dimensions.find(d => d.id === 'snapshotDate');
  if (snapshotDim) {
    print('snapshotDate 维度配置:');
    print(`  id: ${snapshotDim.id}`);
    print(`  name: ${snapshotDim.name}`);
    print(`  targetPath: ${snapshotDim.targetPath}`);
    print(`  type: ${snapshotDim.type}`);
  }
}

print('\n===== 修复完成 =====\n');
print('注意事项：');
print('1. 更新日期现在从 talent_performance 集合的 snapshotDate 字段获取');
print('2. snapshotDate 是导入时的快照日期，格式为 YYYY-MM-DD 字符串');
print('3. 前端通过 getTalentsSearch 的 $lookup 关联查询获取 _snapshotDate');
