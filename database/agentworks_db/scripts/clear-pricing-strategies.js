/**
 * 清除所有客户的达人采买策略数据
 * 用于 v4.0 数据结构升级后清除旧数据
 *
 * 使用方法:
 * mongosh "your-mongodb-uri/agentworks_db" --file database/agentworks_db/scripts/clear-pricing-strategies.js
 */

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('🧹 清除达人采买策略数据 (v4.0 升级)');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');

// 统计当前有价格策略的客户数量
const beforeCount = db.customers.countDocuments({
  'businessStrategies.talentProcurement': { $exists: true }
});
print(`📊 清除前: ${beforeCount} 个客户有达人采买策略数据`);
print('');

// 方案1: 完全清除 talentProcurement 字段
print('🔄 正在清除 businessStrategies.talentProcurement 字段...');

const result = db.customers.updateMany(
  {},
  { $unset: { 'businessStrategies.talentProcurement': '' } }
);

print('');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('📈 执行结果');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print(`✅ 匹配文档数: ${result.matchedCount}`);
print(`✅ 修改文档数: ${result.modifiedCount}`);

// 验证清除结果
const afterCount = db.customers.countDocuments({
  'businessStrategies.talentProcurement': { $exists: true }
});
print('');
print(`📊 清除后: ${afterCount} 个客户有达人采买策略数据`);

print('');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('✨ 清除完成！');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
print('');
print('💡 提示: 客户下次打开价格策略配置页面时，');
print('   将自动使用 v4.0 的默认配置。');
print('');
