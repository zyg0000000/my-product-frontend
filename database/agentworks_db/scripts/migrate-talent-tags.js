/**
 * 达人标签数据迁移脚本 (migrate-talent-tags.js)
 *
 * 功能：将 customer_talents 集合中旧的 string[] 格式 tags 字段
 *       迁移为新的结构化格式 { importance: string | null, businessTags: string[] }
 *
 * 迁移逻辑：
 * - 旧格式 tags: string[] 将被转换为 tags: { importance: null, businessTags: [] }
 * - 新格式已经是 { importance, businessTags } 的数据保持不变
 * - null/undefined tags 会被初始化为 { importance: null, businessTags: [] }
 *
 * 执行方式（DRY RUN - 仅预览不修改）：
 * mongosh "mongodb://root:64223902Kz@mongoreplica6a8259b198d70.mongodb.cn-shanghai.volces.com:3717,mongoreplica6a8259b198d71.mongodb.cn-shanghai.volces.com:3717/?authSource=admin&replicaSet=rs-mongo-replica-6a8259b198d7&retryWrites=true" --file scripts/migrate-talent-tags.js
 *
 * 执行方式（实际执行 - 需设置环境变量）：
 * DRY_RUN=false mongosh "mongodb://..." --file scripts/migrate-talent-tags.js
 */

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

// 检查是否为 DRY RUN 模式（默认为 true）
const DRY_RUN = process.env.DRY_RUN !== 'false';

print('==========================================');
print('  达人标签数据迁移脚本');
print('==========================================');
print(`模式: ${DRY_RUN ? '🔍 DRY RUN (仅预览)' : '⚠️  实际执行'}`);
print(`时间: ${new Date().toISOString()}`);
print('');

// 统计信息
const stats = {
  total: 0,
  alreadyMigrated: 0,
  needsMigration: 0,
  migrated: 0,
  errors: 0,
};

// 判断是否为新格式
function isNewFormat(tags) {
  return (
    tags &&
    typeof tags === 'object' &&
    !Array.isArray(tags) &&
    'importance' in tags &&
    'businessTags' in tags
  );
}

// 转换旧格式到新格式
function convertToNewFormat(tags) {
  // 已经是新格式
  if (isNewFormat(tags)) {
    return tags;
  }

  // 旧格式 string[] 或 null/undefined
  return {
    importance: null,
    businessTags: Array.isArray(tags) ? tags : [],
  };
}

// 查询所有 customer_talents 记录
print('📊 正在分析数据...');
const cursor = db.customer_talents.find({});
const docsToMigrate = [];

while (cursor.hasNext()) {
  const doc = cursor.next();
  stats.total++;

  if (isNewFormat(doc.tags)) {
    stats.alreadyMigrated++;
  } else {
    stats.needsMigration++;
    docsToMigrate.push({
      _id: doc._id,
      oldTags: doc.tags,
      newTags: convertToNewFormat(doc.tags),
    });
  }
}

print(`\n📈 分析结果:`);
print(`   总记录数: ${stats.total}`);
print(`   已迁移: ${stats.alreadyMigrated}`);
print(`   待迁移: ${stats.needsMigration}`);

if (stats.needsMigration === 0) {
  print('\n✅ 所有记录已是新格式，无需迁移');
  quit(0);
}

// 显示前 10 条待迁移数据预览
print('\n📋 待迁移数据预览 (前 10 条):');
docsToMigrate.slice(0, 10).forEach((doc, i) => {
  print(`\n   ${i + 1}. ID: ${doc._id}`);
  print(`      旧值: ${JSON.stringify(doc.oldTags)}`);
  print(`      新值: ${JSON.stringify(doc.newTags)}`);
});

if (docsToMigrate.length > 10) {
  print(`\n   ... 还有 ${docsToMigrate.length - 10} 条待迁移`);
}

// DRY RUN 模式下停止
if (DRY_RUN) {
  print('\n⚠️  DRY RUN 模式，未执行实际迁移');
  print('   如需执行迁移，请设置环境变量: DRY_RUN=false');
  quit(0);
}

// 实际执行迁移
print('\n🔄 开始执行迁移...');

docsToMigrate.forEach((doc, i) => {
  try {
    const result = db.customer_talents.updateOne(
      { _id: doc._id },
      {
        $set: {
          tags: doc.newTags,
          _tagsMigratedAt: new Date(),
          _tagsOldFormat: doc.oldTags, // 保留旧值备份
        },
      }
    );

    if (result.modifiedCount === 1) {
      stats.migrated++;
    }

    // 每 100 条输出进度
    if ((i + 1) % 100 === 0) {
      print(`   已处理: ${i + 1}/${docsToMigrate.length}`);
    }
  } catch (error) {
    stats.errors++;
    print(`   ❌ 迁移失败 ID: ${doc._id}, 错误: ${error.message}`);
  }
});

print('\n✅ 迁移完成!');
print(`   成功迁移: ${stats.migrated}`);
print(`   失败: ${stats.errors}`);

// 验证迁移结果
print('\n📊 验证迁移结果...');
const verifyStats = {
  newFormat: 0,
  oldFormat: 0,
};

const verifyCursor = db.customer_talents.find({});
while (verifyCursor.hasNext()) {
  const doc = verifyCursor.next();
  if (isNewFormat(doc.tags)) {
    verifyStats.newFormat++;
  } else {
    verifyStats.oldFormat++;
  }
}

print(`   新格式: ${verifyStats.newFormat}`);
print(`   旧格式: ${verifyStats.oldFormat}`);

if (verifyStats.oldFormat === 0) {
  print('\n✅ 所有记录已成功迁移到新格式!');
} else {
  print(`\n⚠️  仍有 ${verifyStats.oldFormat} 条记录为旧格式，请检查`);
}
