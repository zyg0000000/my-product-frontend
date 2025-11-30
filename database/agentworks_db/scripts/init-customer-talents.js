/**
 * 客户达人池初始化脚本 (v1.0)
 *
 * 功能：
 * 1. 创建 customer_talents 集合
 * 2. 添加必要的索引
 *
 * 使用方法：
 * mongosh "mongodb://your-connection-string" --file init-customer-talents.js
 *
 * @date 2025-11-30
 */

const DB_NAME = 'agentworks_db';
const db = db.getSiblingDB(DB_NAME);

print(`\n========================================`);
print(`客户达人池初始化 (v1.0)`);
print(`数据库: ${DB_NAME}`);
print(`时间: ${new Date().toISOString()}`);
print(`========================================\n`);

// 1. 创建 customer_talents 集合
print('[1/2] 创建 customer_talents 集合...');

const collections = db.getCollectionNames();
if (collections.includes('customer_talents')) {
    print('  ⚠️  customer_talents 集合已存在，跳过创建');
} else {
    db.createCollection('customer_talents');
    print('  ✅ customer_talents 集合创建成功');
}

// 2. 创建索引
print('\n[2/2] 创建 customer_talents 索引...');

const indexes = [
    {
        keys: { customerId: 1, talentOneId: 1, platform: 1 },
        options: { unique: true, name: 'unique_customer_talent_platform' },
        description: '唯一约束：防止重复添加'
    },
    {
        keys: { customerId: 1, platform: 1, status: 1, addedAt: -1 },
        options: { name: 'idx_customer_platform_status_addedAt' },
        description: '按客户+平台查达人（支持分页）'
    },
    {
        keys: { talentOneId: 1, platform: 1, status: 1 },
        options: { name: 'idx_talent_platform_status' },
        description: '按达人+平台查所属客户'
    },
    {
        keys: { customerId: 1, status: 1 },
        options: { name: 'idx_customer_status' },
        description: '按客户统计各平台达人数'
    }
];

indexes.forEach(index => {
    try {
        db.customer_talents.createIndex(index.keys, index.options);
        print(`  ✅ ${index.description}`);
    } catch (e) {
        if (e.codeName === 'IndexOptionsConflict' || e.codeName === 'IndexKeySpecsConflict') {
            print(`  ⚠️  ${index.description} - 已存在，跳过`);
        } else {
            print(`  ❌ ${index.description} - 失败: ${e.message}`);
        }
    }
});

print(`\n========================================`);
print(`初始化完成！`);
print(`========================================\n`);
print(`下一步:`);
print(`1. 通过客户详情页添加达人到达人池`);
print(`2. 或通过达人列表页批量添加到客户`);
print(`3. 使用 customerTalents API 进行 CRUD 操作\n`);
