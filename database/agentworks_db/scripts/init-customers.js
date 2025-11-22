/**
 * 客户管理系统初始化脚本 (v1.0)
 *
 * 功能：
 * 1. 创建 customers 集合
 * 2. 添加必要的索引
 *
 * 使用方法：
 * mongosh "mongodb://your-connection-string" --file init-customers.js
 *
 * @date 2024-11-22
 */

const DB_NAME = 'agentworks_db';
const db = db.getSiblingDB(DB_NAME);

print(`\n========================================`);
print(`客户管理系统初始化 (v1.0)`);
print(`数据库: ${DB_NAME}`);
print(`时间: ${new Date().toISOString()}`);
print(`========================================\n`);

// 1. 创建 customers 集合
print('[1/2] 创建 customers 集合...');

const collections = db.getCollectionNames();
if (collections.includes('customers')) {
    print('  ⚠️  customers 集合已存在，跳过创建');
} else {
    db.createCollection('customers');
    print('  ✅ customers 集合创建成功');
}

// 2. 创建索引
print('\n[2/2] 创建 customers 索引...');

const customersIndexes = [
    {
        keys: { code: 1 },
        options: { unique: true, name: 'code_unique' },
        description: '客户编码唯一索引'
    },
    {
        keys: { name: 1 },
        options: { name: 'name_index' },
        description: '客户名称索引'
    },
    {
        keys: { level: 1, status: 1 },
        options: { name: 'level_status_index' },
        description: '客户级别和状态复合索引'
    },
    {
        keys: { createdAt: -1 },
        options: { name: 'created_at_desc' },
        description: '创建时间倒序索引'
    }
];

customersIndexes.forEach(index => {
    try {
        db.customers.createIndex(index.keys, index.options);
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
print(`1. 通过前端界面 /customers/new 创建客户`);
print(`2. 或使用 MongoDB Compass 手动插入数据`);
print(`3. 访问 /customers/list 查看客户列表\n`);
