/**
 * @file init-counters.js
 * @description 初始化 counters 集合，用于 oneId 自动生成
 * @database agentworks_db
 */

// 初始化 counters 集合
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🚀 初始化 counters 集合');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

// 检查 counters 集合是否已存在
const counterExists = db.getCollectionNames().includes('counters');

if (counterExists) {
  print('⚠️  counters 集合已存在');

  // 检查 talent_oneId counter 是否存在
  const talentCounter = db.counters.findOne({ _id: 'talent_oneId' });

  if (talentCounter) {
    print(`✅ talent_oneId counter 已存在，当前值: ${talentCounter.sequence_value}`);
  } else {
    print('📝 创建 talent_oneId counter...');
    db.counters.insertOne({
      _id: 'talent_oneId',
      sequence_value: 0,
      description: 'oneId 自增序列（格式：talent_00000001）',
      createdAt: new Date()
    });
    print('✅ talent_oneId counter 创建成功\n');
  }
} else {
  print('📦 创建 counters 集合...');
  db.createCollection('counters');
  print('✅ 集合创建成功\n');

  print('📝 初始化 talent_oneId counter...');
  db.counters.insertOne({
    _id: 'talent_oneId',
    sequence_value: 0,
    description: 'oneId 自增序列（格式：talent_00000001）',
    createdAt: new Date()
  });
  print('✅ talent_oneId counter 创建成功\n');
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
