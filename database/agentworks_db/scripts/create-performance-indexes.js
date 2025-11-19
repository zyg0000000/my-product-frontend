/**
 * 达人表现功能索引创建脚本
 * 数据库: agentworks_db
 * 集合: field_mappings, dimension_configs
 *
 * 创建日期: 2025-11-18
 * 用途: 为达人表现页面的配置管理功能创建索引
 *
 * 执行方式:
 * 1. 通过 MongoDB Compass 连接数据库
 * 2. 选择 agentworks_db 数据库
 * 3. 打开 Mongosh 终端
 * 4. 执行: load('/path/to/create-performance-indexes.js')
 *
 * 注意：确保当前已经在 agentworks_db 数据库中（通过 use agentworks_db 切换）
 */

// 获取当前数据库（确保在 agentworks_db 中）
const currentDb = db.getName();
if (currentDb !== 'agentworks_db') {
  print(`❌ 错误: 当前数据库是 '${currentDb}'，请先执行 'use agentworks_db' 切换到正确的数据库`);
  throw new Error('数据库错误');
}

print('开始创建达人表现功能相关索引...\n');

// ========== field_mappings 集合索引 ==========

print('=== 创建 field_mappings 集合索引 ===\n');

// 索引 1: 平台 + 配置名 + 激活状态（主查询索引）
print('创建索引 1: { platform: 1, configName: 1, isActive: 1 }');
db.field_mappings.createIndex(
  { platform: 1, configName: 1, isActive: 1 },
  {
    name: 'idx_platform_configName_active',
    background: true
  }
);
print('✓ 索引 1 创建成功\n');

// 索引 2: 平台 + 激活状态（查询平台所有活跃配置）
print('创建索引 2: { platform: 1, isActive: 1 }');
db.field_mappings.createIndex(
  { platform: 1, isActive: 1 },
  {
    name: 'idx_platform_active',
    background: true
  }
);
print('✓ 索引 2 创建成功\n');

// ========== dimension_configs 集合索引 ==========

print('=== 创建 dimension_configs 集合索引 ===\n');

// 索引 3: 平台 + 配置名 + 激活状态（主查询索引）
print('创建索引 3: { platform: 1, configName: 1, isActive: 1 }');
db.dimension_configs.createIndex(
  { platform: 1, configName: 1, isActive: 1 },
  {
    name: 'idx_platform_configName_active',
    background: true
  }
);
print('✓ 索引 3 创建成功\n');

// 索引 4: 平台 + 激活状态（查询平台所有活跃配置）
print('创建索引 4: { platform: 1, isActive: 1 }');
db.dimension_configs.createIndex(
  { platform: 1, isActive: 1 },
  {
    name: 'idx_platform_active',
    background: true
  }
);
print('✓ 索引 4 创建成功\n');

// 验证索引创建结果
print('===== 索引创建完成 =====\n');

print('field_mappings 集合的索引:\n');
db.field_mappings.getIndexes().forEach(function(index) {
  print('  - ' + index.name + ': ' + JSON.stringify(index.key));
});

print('\ndimension_configs 集合的索引:\n');
db.dimension_configs.getIndexes().forEach(function(index) {
  print('  - ' + index.name + ': ' + JSON.stringify(index.key));
});

print('\n✅ 所有索引创建完成！');
print('\n提示：索引已在后台创建，可能需要几秒钟才能完全生效。');
