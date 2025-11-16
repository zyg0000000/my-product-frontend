/**
 * 机构管理系统初始化脚本 (v1.0)
 *
 * 功能：
 * 1. 创建 agencies 集合
 * 2. 添加必要的索引
 * 3. 插入预设机构（野生达人）
 * 4. 可选插入示例数据
 *
 * 使用方法：
 * mongosh "mongodb://your-connection-string" --file init-agencies.js
 *
 * 或在 mongosh 中执行：
 * load('init-agencies.js')
 *
 * @date 2025-11-16
 */

// 连接到数据库
const DB_NAME = 'agentworks_db';
const db = db.getSiblingDB(DB_NAME);

print(`\n========================================`);
print(`机构管理系统初始化 (v1.0)`);
print(`数据库: ${DB_NAME}`);
print(`时间: ${new Date().toISOString()}`);
print(`========================================\n`);

// ============================================
// 1. 创建 agencies 集合
// ============================================
print('[1/4] 创建 agencies 集合...');

// 检查集合是否已存在
const collections = db.getCollectionNames();
if (collections.includes('agencies')) {
    print('  ⚠️  agencies 集合已存在，跳过创建');
} else {
    db.createCollection('agencies');
    print('  ✅ agencies 集合创建成功');
}

// ============================================
// 2. 创建索引
// ============================================
print('\n[2/4] 创建 agencies 索引...');

const agenciesIndexes = [
    {
        keys: { id: 1 },
        options: { unique: true, name: 'idx_id' },
        description: '机构ID唯一索引'
    },
    {
        keys: { name: 1 },
        options: { name: 'idx_name' },
        description: '机构名称索引'
    },
    {
        keys: { type: 1 },
        options: { name: 'idx_type' },
        description: '机构类型索引'
    },
    {
        keys: { status: 1 },
        options: { name: 'idx_status' },
        description: '状态索引'
    },
    {
        keys: { type: 1, status: 1 },
        options: { name: 'idx_type_status' },
        description: '类型+状态复合索引'
    },
    {
        keys: {
            name: "text",
            "contactInfo.contactPerson": "text",
            description: "text"
        },
        options: {
            name: 'idx_text_search',
            default_language: "none"
        },
        description: '全文搜索索引'
    }
];

agenciesIndexes.forEach(index => {
    try {
        db.agencies.createIndex(index.keys, index.options);
        print(`  ✅ ${index.options.name}: ${index.description}`);
    } catch (e) {
        if (e.codeName === 'IndexOptionsConflict') {
            print(`  ⚠️  ${index.options.name} 索引已存在`);
        } else {
            print(`  ❌ 创建 ${index.options.name} 失败: ${e.message}`);
        }
    }
});

// ============================================
// 3. 插入预设机构（野生达人）
// ============================================
print('\n[3/4] 插入预设机构...');

const wildTalentAgency = {
    id: 'individual',
    name: '野生达人',
    type: 'individual',
    contactInfo: {
        contactPerson: '系统管理员'
    },
    rebateConfig: {
        baseRebate: 8.0,  // 默认8%返点
        tieredRules: [],
        specialRules: []
    },
    description: '系统预设机构，用于管理无机构归属的独立达人',
    status: 'active',
    statistics: {
        talentCount: 0,
        totalRevenue: 0,
        lastUpdated: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
};

// 检查是否已存在
const existingWildAgency = db.agencies.findOne({ id: 'individual' });
if (existingWildAgency) {
    print('  ⚠️  野生达人机构已存在，跳过插入');
} else {
    try {
        db.agencies.insertOne(wildTalentAgency);
        print('  ✅ 插入预设机构：野生达人');
    } catch (e) {
        print(`  ❌ 插入野生达人失败: ${e.message}`);
    }
}

// ============================================
// 4. 插入示例数据（可选）
// ============================================
const INSERT_SAMPLE_DATA = false;  // 修改为 true 以插入示例数据

if (INSERT_SAMPLE_DATA) {
    print('\n[4/4] 插入示例数据...');

    const sampleAgencies = [
        {
            id: `agency_${Date.now()}`,
            name: '无忧传媒',
            type: 'agency',
            contactInfo: {
                contactPerson: '张经理',
                wechatId: 'wuyouchuanmei',
                phoneNumber: '13800138000',
                email: 'contact@wuyou.com'
            },
            rebateConfig: {
                baseRebate: 12.0,
                tieredRules: [],
                specialRules: []
            },
            businessInfo: {
                registrationNumber: '91110000MA00XXXX00',
                legalRepresentative: '张三',
                address: '北京市朝阳区xxx大厦'
            },
            description: '专业MCN机构，主营美妆、时尚类达人',
            status: 'active',
            statistics: {
                talentCount: 0,
                totalRevenue: 0,
                lastUpdated: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `agency_${Date.now() + 1}`,
            name: '星辰文化',
            type: 'agency',
            contactInfo: {
                contactPerson: '李总',
                wechatId: 'xingchenwenhua',
                phoneNumber: '13900139000'
            },
            rebateConfig: {
                baseRebate: 10.0,
                tieredRules: [],
                specialRules: []
            },
            description: '新锐MCN机构，专注游戏、科技领域',
            status: 'active',
            statistics: {
                talentCount: 0,
                totalRevenue: 0,
                lastUpdated: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    sampleAgencies.forEach(agency => {
        try {
            db.agencies.insertOne(agency);
            print(`  ✅ 插入示例机构：${agency.name}`);
        } catch (e) {
            print(`  ❌ 插入 ${agency.name} 失败: ${e.message}`);
        }
    });
} else {
    print('\n[4/4] 跳过示例数据插入');
}

// ============================================
// 验证结果
// ============================================
print('\n========================================');
print('验证初始化结果');
print('========================================');

// 统计集合信息
const agencyCount = db.agencies.countDocuments();
const indexCount = db.agencies.getIndexes().length;
const activeCount = db.agencies.countDocuments({ status: 'active' });
const agencyTypeCount = db.agencies.countDocuments({ type: 'agency' });
const individualTypeCount = db.agencies.countDocuments({ type: 'individual' });

print(`\n📊 统计信息：`);
print(`  - 机构总数：${agencyCount}`);
print(`  - 索引数量：${indexCount}`);
print(`  - 活跃机构：${activeCount}`);
print(`  - 机构类型：${agencyTypeCount}`);
print(`  - 个人类型：${individualTypeCount}`);

// 显示预设机构
const presetAgency = db.agencies.findOne({ id: 'individual' });
if (presetAgency) {
    print(`\n📋 预设机构信息：`);
    print(`  - 名称：${presetAgency.name}`);
    print(`  - 类型：${presetAgency.type}`);
    print(`  - 基础返点：${presetAgency.rebateConfig.baseRebate}%`);
    print(`  - 状态：${presetAgency.status}`);
}

// ============================================
// 完成
// ============================================
print('\n========================================');
print('✅ 机构管理系统初始化完成！');
print('========================================\n');

// 输出下一步指引
print('📝 下一步操作：');
print('  1. 部署云函数 agencyManagement');
print('  2. 在前端测试机构管理功能');
print('  3. 关联达人到对应机构');
print('');
print('💡 提示：');
print('  - 野生达人(individual)是系统预设，不可删除或编辑');
print('  - 可通过修改 INSERT_SAMPLE_DATA = true 插入示例数据');
print('');