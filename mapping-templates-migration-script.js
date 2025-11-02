/**
 * @file 数据迁移脚本 - mapping_templates v4.0
 * @description 为现有模板添加 allowedWorkflowIds 字段
 * @usage 在 MongoDB Shell 或 MongoDB Compass 中执行
 */

// ============================================
// 方式1: MongoDB Shell 脚本
// ============================================

// 连接到数据库（根据实际情况修改连接字符串）
// use kol_data

// 查看当前没有 allowedWorkflowIds 字段的模板数量
db.mapping_templates.countDocuments({ allowedWorkflowIds: { $exists: false } });

// 为所有缺少 allowedWorkflowIds 字段的模板添加默认值 []
db.mapping_templates.updateMany(
  { allowedWorkflowIds: { $exists: false } },
  { $set: { allowedWorkflowIds: [] } }
);

// 验证更新结果
db.mapping_templates.find({}, { name: 1, allowedWorkflowIds: 1 }).pretty();


// ============================================
// 方式2: Node.js 迁移脚本（完整版）
// ============================================

const { MongoClient } = require('mongodb');

const MONGO_URI = 'YOUR_MONGO_URI_HERE'; // 替换为实际的 MongoDB 连接字符串
const DB_NAME = 'kol_data';
const COLLECTION_NAME = 'mapping_templates';

async function migrateTemplates() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔌 连接到 MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log('📊 检查需要迁移的模板数量...');
    const countBefore = await collection.countDocuments({ allowedWorkflowIds: { $exists: false } });
    console.log(`📝 发现 ${countBefore} 个模板需要添加 allowedWorkflowIds 字段`);

    if (countBefore === 0) {
      console.log('✅ 所有模板已包含 allowedWorkflowIds 字段，无需迁移');
      return;
    }

    console.log('🔄 开始迁移...');
    const result = await collection.updateMany(
      { allowedWorkflowIds: { $exists: false } },
      {
        $set: {
          allowedWorkflowIds: [],
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ 迁移完成！`);
    console.log(`   - 匹配文档数: ${result.matchedCount}`);
    console.log(`   - 修改文档数: ${result.modifiedCount}`);

    // 验证迁移结果
    console.log('\n📋 验证迁移结果...');
    const templates = await collection.find({}).project({ name: 1, allowedWorkflowIds: 1 }).toArray();
    console.log('\n所有模板的 allowedWorkflowIds 状态:');
    templates.forEach(template => {
      const status = Array.isArray(template.allowedWorkflowIds) ? `✅ [${template.allowedWorkflowIds.length}个工作流]` : '❌ 缺失';
      console.log(`  - ${template.name}: ${status}`);
    });

    const countAfter = await collection.countDocuments({ allowedWorkflowIds: { $exists: false } });
    if (countAfter === 0) {
      console.log('\n✅ 验证通过：所有模板都已包含 allowedWorkflowIds 字段');
    } else {
      console.log(`\n⚠️ 警告：仍有 ${countAfter} 个模板缺少 allowedWorkflowIds 字段`);
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行迁移
if (require.main === module) {
  migrateTemplates()
    .then(() => {
      console.log('\n🎉 迁移脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateTemplates };


// ============================================
// 方式3: 云函数临时迁移端点（可选）
// ============================================

/**
 * 如果不方便直接访问数据库，可以临时在云函数中添加一个迁移端点
 *
 * 在 mapping-templates-api 的 handler 中添加:
 *
 * if (event.queryStringParameters?.action === 'migrate') {
 *   const result = await collection.updateMany(
 *     { allowedWorkflowIds: { $exists: false } },
 *     { $set: { allowedWorkflowIds: [], updatedAt: new Date() } }
 *   );
 *   return createResponse(200, {
 *     success: true,
 *     message: 'Migration completed',
 *     matched: result.matchedCount,
 *     modified: result.modifiedCount
 *   });
 * }
 *
 * 然后访问: GET /mapping-templates?action=migrate
 *
 * ⚠️ 注意: 迁移完成后务必删除此端点，避免安全风险
 */


// ============================================
// 使用说明
// ============================================

/**
 * 选择合适的迁移方式:
 *
 * 1. 如果有 MongoDB Compass 或 Shell 访问权限:
 *    - 使用方式1（最简单）
 *    - 直接在 Compass 或 Shell 中执行前面的命令
 *
 * 2. 如果可以在本地/服务器运行 Node.js 脚本:
 *    - 使用方式2（最安全）
 *    - 修改 MONGO_URI 后执行: node mapping-templates-migration-script.js
 *
 * 3. 如果只能访问云函数:
 *    - 使用方式3（临时方案）
 *    - 添加临时迁移端点，执行后删除
 *
 * 注意事项:
 * - ✅ 此迁移是可选的，不执行也不影响系统运行
 * - ✅ 迁移是幂等的，多次执行不会造成问题
 * - ✅ 建议在低峰期执行
 * - ⚠️ 建议先在测试环境验证
 * - ⚠️ 执行前建议备份数据库
 */
