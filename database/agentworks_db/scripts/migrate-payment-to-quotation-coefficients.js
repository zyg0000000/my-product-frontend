/**
 * 迁移 paymentCoefficients 字段名为 quotationCoefficients
 * v4.2 字段重命名：支付系数 → 报价系数
 *
 * 使用方法:
 * mongosh "your-mongodb-uri/agentworks_db" --file database/agentworks_db/scripts/migrate-payment-to-quotation-coefficients.js
 */

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🔄 迁移字段名: paymentCoefficients → quotationCoefficients');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');

// 统计需要迁移的客户数量
const beforeCount = db.customers.countDocuments({
  'businessStrategies.talentProcurement.paymentCoefficients': { $exists: true }
});
print(`📊 需要迁移: ${beforeCount} 个客户有 paymentCoefficients 字段`);
print('');

if (beforeCount === 0) {
  print('✅ 无需迁移，所有客户数据已是最新格式');
  print('');
} else {
  // 执行字段重命名
  print('🔄 正在重命名字段...');

  const result = db.customers.updateMany(
    { 'businessStrategies.talentProcurement.paymentCoefficients': { $exists: true } },
    { $rename: { 'businessStrategies.talentProcurement.paymentCoefficients': 'businessStrategies.talentProcurement.quotationCoefficients' } }
  );

  print('');
  print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  print('📈 执行结果');
  print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  print(`✅ 匹配文档数: ${result.matchedCount}`);
  print(`✅ 修改文档数: ${result.modifiedCount}`);

  // 验证迁移结果
  const afterOldCount = db.customers.countDocuments({
    'businessStrategies.talentProcurement.paymentCoefficients': { $exists: true }
  });
  const afterNewCount = db.customers.countDocuments({
    'businessStrategies.talentProcurement.quotationCoefficients': { $exists: true }
  });

  print('');
  print(`📊 迁移后: ${afterOldCount} 个客户仍有旧字段 (应为 0)`);
  print(`📊 迁移后: ${afterNewCount} 个客户有新字段 quotationCoefficients`);
}

print('');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('✨ 迁移完成！');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');
