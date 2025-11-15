/**
 * 返点管理系统初始化脚本 (v2.1)
 *
 * 功能：
 * 1. 创建 rebate_configs 集合并添加索引
 * 2. 更新 talents 集合，添加 belongType, agencyId, currentRebate 字段
 * 3. 为现有达人添加默认返点配置
 *
 * 使用方法：
 * mongosh "mongodb://your-connection-string" --file init-rebate-system.js
 *
 * 或在 mongosh 中执行：
 * load('init-rebate-system.js')
 */

// 连接到数据库
const DB_NAME = 'agentworks_db';
const db = db.getSiblingDB(DB_NAME);

print(`\n========================================`);
print(`返点管理系统初始化 (v2.1)`);
print(`数据库: ${DB_NAME}`);
print(`========================================\n`);

// ============================================
// 1. 创建 rebate_configs 集合
// ============================================
print('[1/4] 创建 rebate_configs 集合...');

// 检查集合是否已存在
const collections = db.getCollectionNames();
if (collections.includes('rebate_configs')) {
    print('  ⚠️  rebate_configs 集合已存在，跳过创建');
} else {
    db.createCollection('rebate_configs');
    print('  ✅ rebate_configs 集合创建成功');
}

// ============================================
// 2. 创建 rebate_configs 索引
// ============================================
print('\n[2/4] 创建 rebate_configs 索引...');

const rebateConfigsIndexes = [
    {
        keys: { configId: 1 },
        options: { unique: true, name: 'idx_configId' },
        description: '配置ID唯一索引'
    },
    {
        keys: { targetId: 1, platform: 1, createdAt: -1 },
        options: { name: 'idx_target_platform_createdAt' },
        description: '查询某达人某平台的返点历史'
    },
    {
        keys: { status: 1 },
        options: { name: 'idx_status' },
        description: '按状态查询'
    },
    {
        keys: { effectiveDate: 1 },
        options: { name: 'idx_effectiveDate' },
        description: '按生效日期查询'
    },
    {
        keys: { createdBy: 1 },
        options: { name: 'idx_createdBy' },
        description: '按操作人查询'
    },
    {
        keys: { targetId: 1, platform: 1, status: 1 },
        options: { name: 'idx_target_platform_status' },
        description: '查找当前生效配置'
    }
];

rebateConfigsIndexes.forEach(index => {
    try {
        db.rebate_configs.createIndex(index.keys, index.options);
        print(`  ✅ ${index.options.name}: ${index.description}`);
    } catch (e) {
        if (e.code === 85 || e.code === 86) {
            print(`  ⚠️  ${index.options.name}: 索引已存在`);
        } else {
            print(`  ❌ ${index.options.name}: ${e.message}`);
        }
    }
});

// ============================================
// 3. 更新 talents 集合 - 添加新字段
// ============================================
print('\n[3/4] 更新 talents 集合，添加新字段...');

const updateResult = db.talents.updateMany(
    {
        $or: [
            { belongType: { $exists: false } },
            { currentRebate: { $exists: false } }
        ]
    },
    {
        $set: {
            belongType: 'wild',
            agencyId: null,
            currentRebate: {
                rate: 10.00,
                source: 'default',
                effectiveDate: new Date().toISOString().split('T')[0],
                lastUpdated: new Date()
            }
        }
    }
);

print(`  ✅ 更新了 ${updateResult.modifiedCount} 条达人记录`);

// ============================================
// 4. 验证配置
// ============================================
print('\n[4/4] 验证配置...');

// 检查 rebate_configs 集合
const rebateConfigsCount = db.rebate_configs.countDocuments();
print(`  ✅ rebate_configs 集合记录数: ${rebateConfigsCount}`);

// 检查 rebate_configs 索引
const rebateConfigsIndexList = db.rebate_configs.getIndexes();
print(`  ✅ rebate_configs 索引数量: ${rebateConfigsIndexList.length}`);

// 检查 talents 集合
const talentsCount = db.talents.countDocuments();
const talentsWithRebate = db.talents.countDocuments({ currentRebate: { $exists: true } });
print(`  ✅ talents 集合记录数: ${talentsCount}`);
print(`  ✅ 已配置返点的达人数: ${talentsWithRebate}`);

// 查看一条示例记录
const sampleTalent = db.talents.findOne(
    { currentRebate: { $exists: true } },
    {
        oneId: 1,
        platform: 1,
        name: 1,
        belongType: 1,
        agencyId: 1,
        currentRebate: 1
    }
);

if (sampleTalent) {
    print('\n  示例达人记录:');
    print(`    oneId: ${sampleTalent.oneId}`);
    print(`    platform: ${sampleTalent.platform}`);
    print(`    name: ${sampleTalent.name}`);
    print(`    belongType: ${sampleTalent.belongType}`);
    print(`    agencyId: ${sampleTalent.agencyId}`);
    print(`    currentRebate.rate: ${sampleTalent.currentRebate.rate}%`);
    print(`    currentRebate.source: ${sampleTalent.currentRebate.source}`);
    print(`    currentRebate.effectiveDate: ${sampleTalent.currentRebate.effectiveDate}`);
}

// ============================================
// 完成
// ============================================
print('\n========================================');
print('✅ 返点管理系统初始化完成！');
print('========================================\n');

print('下一步操作：');
print('1. 部署云函数到火山引擎:');
print('   - getTalentRebate');
print('   - updateTalentRebate');
print('   - getRebateHistory');
print('');
print('2. 前端部署:');
print('   - 提交代码并推送');
print('   - 触发 Cloudflare Pages 重新部署');
print('');
print('3. 测试验证:');
print('   - 访问达人详情页，查看返点配置区域');
print('   - 测试手动调整返点功能');
print('   - 验证返点历史记录显示');
print('');
