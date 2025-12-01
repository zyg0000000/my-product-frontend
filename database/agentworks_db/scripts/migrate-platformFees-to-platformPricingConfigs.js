/**
 * 数据库迁移脚本：platformFees -> platformPricingConfigs
 *
 * v4.2 字段重命名迁移
 *
 * 功能：
 * 1. 将 businessStrategies.talentProcurement.platformFees 重命名为 platformPricingConfigs
 * 2. 保留原字段作为备份（可选删除）
 *
 * 执行方式：
 * mongosh "mongodb://..." --file migrate-platformFees-to-platformPricingConfigs.js
 */

// 切换到目标数据库
use('agentworks_db');

print('=== 开始迁移：platformFees -> platformPricingConfigs ===');
print('时间: ' + new Date().toISOString());

// 1. 查找所有有 platformFees 字段的客户
const customersWithPlatformFees = db.customers.find({
  'businessStrategies.talentProcurement.platformFees': { $exists: true }
}).toArray();

print(`\n找到 ${customersWithPlatformFees.length} 个需要迁移的客户`);

// 2. 逐个迁移
let successCount = 0;
let skipCount = 0;
let errorCount = 0;

customersWithPlatformFees.forEach(customer => {
  try {
    const platformFees = customer.businessStrategies?.talentProcurement?.platformFees;

    // 跳过已经有 platformPricingConfigs 的记录
    if (customer.businessStrategies?.talentProcurement?.platformPricingConfigs) {
      print(`  跳过 ${customer.code} (${customer.name}): 已有 platformPricingConfigs`);
      skipCount++;
      return;
    }

    if (!platformFees || Object.keys(platformFees).length === 0) {
      print(`  跳过 ${customer.code} (${customer.name}): platformFees 为空`);
      skipCount++;
      return;
    }

    // 执行迁移：添加新字段，保留旧字段
    const result = db.customers.updateOne(
      { _id: customer._id },
      {
        $set: {
          'businessStrategies.talentProcurement.platformPricingConfigs': platformFees,
          'updatedAt': new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      print(`  ✓ 迁移成功: ${customer.code} (${customer.name})`);
      successCount++;
    } else {
      print(`  ! 未修改: ${customer.code} (${customer.name})`);
      skipCount++;
    }
  } catch (err) {
    print(`  ✗ 迁移失败: ${customer.code} (${customer.name}): ${err.message}`);
    errorCount++;
  }
});

// 3. 打印迁移结果
print('\n=== 迁移完成 ===');
print(`成功: ${successCount}`);
print(`跳过: ${skipCount}`);
print(`失败: ${errorCount}`);

// 4. 验证迁移结果
const verifyCount = db.customers.countDocuments({
  'businessStrategies.talentProcurement.platformPricingConfigs': { $exists: true }
});
print(`\n验证: 现在有 ${verifyCount} 个客户拥有 platformPricingConfigs 字段`);

// 5. 可选：删除旧字段（谨慎操作，建议先验证新字段正常工作后再执行）
// 取消注释以下代码来删除旧字段：
/*
print('\n=== 删除旧字段 platformFees ===');
const deleteResult = db.customers.updateMany(
  { 'businessStrategies.talentProcurement.platformFees': { $exists: true } },
  { $unset: { 'businessStrategies.talentProcurement.platformFees': '' } }
);
print(`已删除 ${deleteResult.modifiedCount} 个客户的 platformFees 字段`);
*/

print('\n迁移脚本执行完毕');
print('注意: 旧字段 platformFees 已保留，前端代码已兼容两种字段名');
print('建议: 验证功能正常后，可手动执行脚本末尾注释的代码删除旧字段');
