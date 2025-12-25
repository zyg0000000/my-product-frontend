/**
 * 平台特有ID字段迁移脚本 (migrate-platform-specific-ids.js)
 *
 * 功能：为各平台达人补全 platformSpecific 中的平台ID字段
 * - 抖音：platformSpecific.xingtuId = platformAccountId
 * - 小红书：platformSpecific.xiaohongshuId = platformAccountId（预留）
 * - B站：platformSpecific.bilibiliId = platformAccountId（预留）
 * - 快手：platformSpecific.kuaishouId = platformAccountId（预留）
 *
 * 执行方式（DRY RUN - 仅预览不修改）：
 * mongosh "mongodb://root:64223902Kz@mongoreplica6a8259b198d70.mongodb.cn-shanghai.volces.com:3717,mongoreplica6a8259b198d71.mongodb.cn-shanghai.volces.com:3717/?authSource=admin&replicaSet=rs-mongo-replica-6a8259b198d7&retryWrites=true" --file scripts/migrate-platform-specific-ids.js
 *
 * 执行方式（实际执行 - 需设置环境变量）：
 * DRY_RUN=false mongosh "mongodb://..." --file scripts/migrate-platform-specific-ids.js
 */

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

// 检查是否为 DRY RUN 模式（默认为 true）
const DRY_RUN = process.env.DRY_RUN !== 'false';

print('==========================================');
print('  平台特有ID字段迁移脚本');
print('==========================================');
print(`模式: ${DRY_RUN ? '🔍 DRY RUN (仅预览)' : '⚠️  实际执行'}`);
print(`时间: ${new Date().toISOString()}`);
print('');

// 平台ID字段映射配置
const PLATFORM_ID_MAPPING = {
  douyin: 'xingtuId',
  xiaohongshu: 'xiaohongshuId',
  bilibili: 'bilibiliId',
  kuaishou: 'kuaishouId',
};

// 统计信息
const stats = {
  total: 0,
  byPlatform: {},
  alreadyMigrated: 0,
  needsMigration: 0,
  migrated: 0,
  errors: 0,
};

// 初始化平台统计
Object.keys(PLATFORM_ID_MAPPING).forEach(p => {
  stats.byPlatform[p] = { total: 0, needsMigration: 0, migrated: 0 };
});

print('📊 正在分析数据...\n');

// Step 1: 统计各平台数据
for (const [platform, idField] of Object.entries(PLATFORM_ID_MAPPING)) {
  const total = db.talents.countDocuments({ platform });
  stats.byPlatform[platform].total = total;
  stats.total += total;

  // 需要迁移的条件：
  // 1. platformAccountId 存在且不为空
  // 2. platformSpecific 中的对应字段不存在、为空或为 null
  const needsMigrationQuery = {
    platform,
    platformAccountId: { $exists: true, $ne: null, $ne: '' },
    $or: [
      { [`platformSpecific.${idField}`]: { $exists: false } },
      { [`platformSpecific.${idField}`]: null },
      { [`platformSpecific.${idField}`]: '' },
    ],
  };

  const needsMigration = db.talents.countDocuments(needsMigrationQuery);
  stats.byPlatform[platform].needsMigration = needsMigration;
  stats.needsMigration += needsMigration;
  stats.alreadyMigrated += total - needsMigration;

  print(`  ${platform}: 总计 ${total}, 待迁移 ${needsMigration}`);
}

print(`\n📈 汇总:`);
print(`   总记录数: ${stats.total}`);
print(`   已有字段: ${stats.alreadyMigrated}`);
print(`   待迁移: ${stats.needsMigration}`);

if (stats.needsMigration === 0) {
  print('\n✅ 所有记录已完成迁移，无需操作');
  quit(0);
}

// Step 2: 预览待迁移数据
print('\n📋 待迁移数据预览 (每平台前3条):');

for (const [platform, idField] of Object.entries(PLATFORM_ID_MAPPING)) {
  if (stats.byPlatform[platform].needsMigration === 0) continue;

  print(`\n  【${platform}】`);
  const samples = db.talents
    .find({
      platform,
      platformAccountId: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { [`platformSpecific.${idField}`]: { $exists: false } },
        { [`platformSpecific.${idField}`]: null },
        { [`platformSpecific.${idField}`]: '' },
      ],
    })
    .limit(3)
    .toArray();

  samples.forEach((doc, i) => {
    print(`   ${i + 1}. oneId: ${doc.oneId}`);
    print(`      name: ${doc.name}`);
    print(`      platformAccountId: ${doc.platformAccountId}`);
    print(
      `      platformSpecific.${idField}: ${doc.platformSpecific?.[idField] || '(空)'}`
    );
  });
}

// DRY RUN 停止
if (DRY_RUN) {
  print('\n⚠️  DRY RUN 模式，未执行实际迁移');
  print('   如需执行迁移，请设置环境变量: DRY_RUN=false');
  quit(0);
}

// Step 3: 执行迁移
print('\n🔄 开始执行迁移...');

for (const [platform, idField] of Object.entries(PLATFORM_ID_MAPPING)) {
  if (stats.byPlatform[platform].needsMigration === 0) continue;

  print(`\n  正在处理 ${platform}...`);

  try {
    // 使用 aggregation pipeline 更新，将 platformAccountId 复制到 platformSpecific.idField
    const result = db.talents.updateMany(
      {
        platform,
        platformAccountId: { $exists: true, $ne: null, $ne: '' },
        $or: [
          { [`platformSpecific.${idField}`]: { $exists: false } },
          { [`platformSpecific.${idField}`]: null },
          { [`platformSpecific.${idField}`]: '' },
        ],
      },
      [
        {
          $set: {
            [`platformSpecific.${idField}`]: '$platformAccountId',
            updatedAt: new Date(),
            _platformIdMigratedAt: new Date(),
          },
        },
      ]
    );

    stats.byPlatform[platform].migrated = result.modifiedCount;
    stats.migrated += result.modifiedCount;
    print(`   ✅ ${platform}: 更新了 ${result.modifiedCount} 条记录`);
  } catch (error) {
    stats.errors++;
    print(`   ❌ ${platform}: 迁移失败 - ${error.message}`);
  }
}

// Step 4: 验证迁移结果
print('\n📊 验证迁移结果...');

for (const [platform, idField] of Object.entries(PLATFORM_ID_MAPPING)) {
  const stillNeedsMigration = db.talents.countDocuments({
    platform,
    platformAccountId: { $exists: true, $ne: null, $ne: '' },
    $or: [
      { [`platformSpecific.${idField}`]: { $exists: false } },
      { [`platformSpecific.${idField}`]: null },
      { [`platformSpecific.${idField}`]: '' },
    ],
  });

  if (stillNeedsMigration === 0) {
    print(`   ✅ ${platform}: 全部迁移完成`);
  } else {
    print(`   ⚠️  ${platform}: 仍有 ${stillNeedsMigration} 条待迁移`);
  }
}

print('\n========================================');
print('✅ 数据迁移脚本执行完成！');
print(`   成功迁移: ${stats.migrated}`);
print(`   失败: ${stats.errors}`);
print('========================================\n');
