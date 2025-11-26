/**
 * @file init-counters.js
 * @description 初始化 counters 集合，用于 oneId 自动生成
 * @database agentworks_db
 *
 * @version 2.0.0
 * @date 2025-11-26
 * @changelog
 * - [v2.0] 增加自动同步功能：从 talents 集合中读取最大 oneId 并同步到 counter
 */

// 初始化 counters 集合
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🚀 初始化 counters 集合');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

/**
 * 从 talents 集合中获取当前最大的 oneId 数字
 */
function getMaxOneIdFromTalents() {
  const lastTalent = db.talents.find({ oneId: { $regex: /^talent_\d+$/ } })
    .sort({ oneId: -1 })
    .limit(1)
    .toArray();

  if (lastTalent.length > 0) {
    const match = lastTalent[0].oneId.match(/talent_(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}

// 检查 counters 集合是否已存在
const counterExists = db.getCollectionNames().includes('counters');

if (!counterExists) {
  print('📦 创建 counters 集合...');
  db.createCollection('counters');
  print('✅ 集合创建成功\n');
}

// 获取 talents 中当前最大的 oneId
const maxOneIdInTalents = getMaxOneIdFromTalents();
print(`📊 talents 集合中最大 oneId 数字: ${maxOneIdInTalents}`);

// 检查 talent_oneId counter 是否存在
const talentCounter = db.counters.findOne({ _id: 'talent_oneId' });

if (talentCounter) {
  print(`📋 当前 counter sequence_value: ${talentCounter.sequence_value}`);

  // 检查是否需要同步
  if (maxOneIdInTalents > talentCounter.sequence_value) {
    print(`⚠️  检测到 counter 值落后于实际数据，正在同步...`);
    db.counters.updateOne(
      { _id: 'talent_oneId' },
      {
        $set: {
          sequence_value: maxOneIdInTalents,
          updatedAt: new Date()
        }
      }
    );
    print(`✅ 已同步 sequence_value 为 ${maxOneIdInTalents}\n`);
  } else {
    print('✅ counter 值正常，无需同步\n');
  }
} else {
  // 创建新的 counter，使用 talents 中的最大值
  print('📝 创建 talent_oneId counter...');
  db.counters.insertOne({
    _id: 'talent_oneId',
    sequence_value: maxOneIdInTalents,
    description: 'oneId 自增序列（格式：talent_00000001）',
    createdAt: new Date()
  });
  print(`✅ talent_oneId counter 创建成功，初始值: ${maxOneIdInTalents}\n`);
}

// 验证
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🔍 验证 counters 集合');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const allCounters = db.counters.find().toArray();
print(`当前 counters 数量: ${allCounters.length}\n`);

allCounters.forEach(counter => {
  print(`  - ${counter._id}`);
  print(`    当前值: ${counter.sequence_value}`);
  if (counter.description) {
    print(`    说明: ${counter.description}`);
  }
  print('');
});

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('✨ 初始化完成！');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

print('📖 下一步：');
print('  1. 测试 oneId 生成：调用 processTalents 云函数创建达人');
print('  2. 验证自增：多次创建达人，确认 oneId 正确递增');
print('  3. 初始化 talents 集合：运行 init-talents.js\n');
