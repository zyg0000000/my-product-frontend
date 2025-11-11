/**
 * 数据迁移脚本模板
 *
 * 迁移编号: XXX
 * 迁移名称: [简短描述]
 * 创建日期: YYYY-MM-DD
 * 说明: [详细说明迁移的目的和影响]
 *
 * 使用方法:
 * 1. 复制此模板文件
 * 2. 重命名为 [序号]_[描述].js (如: 001_add_price_type.js)
 * 3. 实现 up() 和 down() 函数
 * 4. 在测试环境验证
 * 5. 在生产环境执行
 */

/**
 * 执行迁移（向上）
 * @param {Object} db - MongoDB 数据库实例
 * @returns {Promise<void>}
 */
async function up(db) {
    console.log('========================================');
    console.log('开始执行迁移: [迁移名称]');
    console.log('时间:', new Date().toISOString());
    console.log('========================================');

    try {
        // 步骤 1: [第一步的描述]
        console.log('\n步骤 1: [描述]...');
        const collection = db.collection('your_collection');

        // 示例：更新文档
        // const result = await collection.updateMany(
        //     { /* 查询条件 */ },
        //     { $set: { /* 更新内容 */ } }
        // );
        // console.log(`  ✓ 更新了 ${result.modifiedCount} 个文档`);

        // 步骤 2: [第二步的描述]
        console.log('\n步骤 2: [描述]...');
        // ... 执行第二步操作 ...

        console.log('\n========================================');
        console.log('✓ 迁移完成！');
        console.log('========================================');

    } catch (error) {
        console.error('\n========================================');
        console.error('✗ 迁移失败:', error);
        console.error('========================================');
        throw error;
    }
}

/**
 * 回滚迁移（向下）
 * @param {Object} db - MongoDB 数据库实例
 * @returns {Promise<void>}
 */
async function down(db) {
    console.log('========================================');
    console.log('开始回滚迁移: [迁移名称]');
    console.log('时间:', new Date().toISOString());
    console.log('========================================');

    try {
        // 步骤 1: [回滚第一步]
        console.log('\n步骤 1: 回滚 [描述]...');
        const collection = db.collection('your_collection');

        // 示例：移除字段
        // const result = await collection.updateMany(
        //     {},
        //     { $unset: { /* 要移除的字段 */ } }
        // );
        // console.log(`  ✓ 回滚了 ${result.modifiedCount} 个文档`);

        // 步骤 2: [回滚第二步]
        console.log('\n步骤 2: 回滚 [描述]...');
        // ... 执行回滚操作 ...

        console.log('\n========================================');
        console.log('✓ 回滚完成！');
        console.log('========================================');

    } catch (error) {
        console.error('\n========================================');
        console.error('✗ 回滚失败:', error);
        console.error('========================================');
        throw error;
    }
}

/**
 * 迁移脚本元数据
 */
const metadata = {
    id: 'XXX',
    name: '[迁移名称]',
    description: '[详细描述]',
    author: '开发团队',
    date: 'YYYY-MM-DD',
    version: '1.0',

    // 受影响的集合
    affectedCollections: [
        'collection1',
        'collection2'
    ],

    // 前置条件
    prerequisites: [
        '数据库版本 >= 4.0',
        '所有云函数已停止'
    ],

    // 风险评估
    risk: 'low', // 可选值: low, medium, high

    // 预计执行时间
    estimatedDuration: '5 分钟',

    // 是否可回滚
    reversible: true
};

// 导出迁移函数
module.exports = {
    up,
    down,
    metadata
};
