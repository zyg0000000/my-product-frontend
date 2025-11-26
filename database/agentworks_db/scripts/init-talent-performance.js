/**
 * 初始化 talent_performance 集合
 *
 * 用途：在 MongoDB 中创建 talent_performance 集合并添加索引
 *       用于存储达人表现数据时序（支持 AI 训练和数据预测）
 *
 * 使用方法：
 *   mongosh "mongodb://your-connection-string" --file init-talent-performance.js
 *   或在 mongosh 中: load('init-talent-performance.js')
 *
 * 版本：v1.1 (2025-11-26)
 */

// 切换到 agentworks_db 数据库
db = db.getSiblingDB('agentworks_db');

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🚀 初始化 talent_performance 集合 (v1.1)');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');
print('📋 设计目标：');
print('   - 独立存储达人表现数据（不嵌入 talents 集合）');
print('   - 支持时序数据和历史追溯');
print('   - 支持飞书同步、AI 训练和数据预测');
print('');

// 检查集合是否已存在
const collections = db.getCollectionNames();
if (collections.includes('talent_performance')) {
    print('⚠️  集合 talent_performance 已存在');
    print('');
    const choice = 'skip'; // 修改为 'drop' 可强制重建

    if (choice === 'drop') {
        print('🗑️  删除现有集合...');
        db.talent_performance.drop();
        print('✅ 已删除');
    } else {
        print('ℹ️  跳过创建集合，仅更新索引');
    }
} else {
    print('📦 创建集合 talent_performance...');
    db.createCollection('talent_performance');
    print('✅ 集合创建成功');
}

print('');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📊 创建索引');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');

// 删除所有现有索引（除了 _id）
print('🗑️  清理现有索引...');
db.talent_performance.dropIndexes();
print('✅ 已清理');
print('');

// 创建索引
const indexes = [
    {
        name: 'idx_snapshotId',
        keys: { snapshotId: 1 },
        options: { unique: true },
        description: '快照ID唯一索引',
        important: true
    },
    {
        name: 'idx_oneId_platform_date',
        keys: { oneId: 1, platform: 1, snapshotDate: -1 },
        description: '核心查询索引（达人+平台+日期）',
        important: true
    },
    {
        name: 'idx_oneId_platform_type_date',
        keys: { oneId: 1, platform: 1, snapshotType: 1, snapshotDate: -1 },
        options: { unique: true },
        description: '【核心】联合唯一约束（同一达人同一平台同一类型同一天只有一条记录）',
        important: true
    },
    {
        name: 'idx_snapshotDate',
        keys: { snapshotDate: -1 },
        description: '按快照日期倒序（用于查询最新数据）'
    },
    {
        name: 'idx_dataSource',
        keys: { dataSource: 1 },
        description: '按数据来源查询（feishu/api/crawler/manual/predicted）'
    },
    {
        name: 'idx_platform_date',
        keys: { platform: 1, snapshotDate: -1 },
        description: '按平台+日期查询'
    },
    {
        name: 'idx_platform_type_date',
        keys: { platform: 1, snapshotType: 1, snapshotDate: -1 },
        description: '按平台+快照类型+日期查询'
    },
    {
        name: 'idx_createdAt',
        keys: { createdAt: -1 },
        description: '按创建时间倒序'
    }
];

let successCount = 0;
let failCount = 0;

indexes.forEach((index) => {
    try {
        const options = { name: index.name, ...(index.options || {}) };
        db.talent_performance.createIndex(index.keys, options);

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

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📈 统计');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print(`成功: ${successCount}`);
print(`失败: ${failCount}`);
print('');

// 验证索引
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🔍 验证索引');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const indexList = db.talent_performance.getIndexes();
print(`当前索引数量: ${indexList.length}`);
print('');
indexList.forEach((idx) => {
    print(`  - ${idx.name}`);
    if (idx.unique) {
        print(`    (唯一索引)`);
    }
});
print('');

// 显示集合统计
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📊 集合信息');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const stats = db.talent_performance.stats();
print(`文档数量: ${stats.count || 0}`);
print(`存储大小: ${Math.round((stats.storageSize || 0) / 1024)} KB`);
print('');

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('✨ 初始化完成！');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');
print('💡 下一步：');
print('   1. 配置 dimension_configs 中的 targetCollection 字段');
print('   2. 配置 field_mappings 中的 targetCollection 字段');
print('   3. 改造 sync-from-feishu API 支持分流写入');
print('   4. 测试飞书同步是否正确写入 talent_performance');
print('');
print('📚 相关文档：');
print('   - Schema: database/agentworks_db/schemas/talent_performance.doc.json');
print('   - 索引: database/agentworks_db/indexes/talent_performance.indexes.json');
print('   - 迁移方案: database/agentworks_db/docs/PERFORMANCE_MIGRATION.md');
print('');
