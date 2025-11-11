/**
 * 初始化 talents 集合
 *
 * 用途：在 MongoDB 中创建 talents 集合并添加索引
 *
 * 使用方法：
 *   mongosh "mongodb://your-connection-string" --file init-talents.js
 *   或在 mongosh 中: load('init-talents.js')
 */

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🚀 初始化 talents 集合 (v2.0)');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');

// 检查集合是否已存在
const collections = db.getCollectionNames();
if (collections.includes('talents')) {
    print('⚠️  集合 talents 已存在');
    print('');
    const choice = 'skip'; // 修改为 'drop' 可强制重建

    if (choice === 'drop') {
        print('🗑️  删除现有集合...');
        db.talents.drop();
        print('✅ 已删除');
    } else {
        print('ℹ️  跳过创建集合，仅更新索引');
    }
} else {
    print('📦 创建集合 talents...');
    db.createCollection('talents');
    print('✅ 集合创建成功');
}

print('');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📊 创建索引');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');

// 删除所有现有索引（除了 _id）
print('🗑️  清理现有索引...');
db.talents.dropIndexes();
print('✅ 已清理');
print('');

// 创建索引
const indexes = [
    {
        name: 'idx_oneId',
        keys: { oneId: 1 },
        description: '查询某达人的所有平台账号'
    },
    {
        name: 'idx_platform',
        keys: { platform: 1 },
        description: '查询某平台的所有达人'
    },
    {
        name: 'idx_oneId_platform',
        keys: { oneId: 1, platform: 1 },
        options: { unique: true },
        description: '【核心】联合唯一索引',
        important: true
    },
    {
        name: 'idx_platformAccountId',
        keys: { platformAccountId: 1 },
        description: '按平台账号ID查询'
    },
    {
        name: 'idx_name_text',
        keys: { name: 'text' },
        description: '昵称全文搜索'
    },
    {
        name: 'idx_status',
        keys: { status: 1 },
        description: '状态索引'
    },
    {
        name: 'idx_createdAt',
        keys: { createdAt: -1 },
        description: '按创建时间倒序'
    },
    {
        name: 'idx_platform_status',
        keys: { platform: 1, status: 1 },
        description: '平台+状态复合索引'
    }
];

let successCount = 0;
let failCount = 0;

indexes.forEach((index) => {
    try {
        const options = { name: index.name, ...(index.options || {}) };
        db.talents.createIndex(index.keys, options);

        const marker = index.important ? '⭐' : '✅';
        print(`${marker} ${index.name}`);
        print(`   ${index.description}`);
        print('');

        successCount++;
    } catch (error) {
        print(`❌ ${index.name}`);
        print(`   错误: ${error.message}`);
        print('');
        failCount++;
    }
});

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📈 统计');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print(`成功: ${successCount}`);
print(`失败: ${failCount}`);
print('');

// 验证索引
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🔍 验证索引');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const indexList = db.talents.getIndexes();
print(`当前索引数量: ${indexList.length}`);
print('');
indexList.forEach((idx) => {
    print(`  - ${idx.name}`);
    if (idx.unique) {
        print(`    (唯一索引)`);
    }
});
print('');

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('✨ 初始化完成！');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');
print('💡 下一步：');
print('   1. 使用前端或 API 创建达人记录');
print('   2. 验证 oneId + platform 唯一约束是否生效');
print('   3. 测试查询性能');
print('');
