/**
 * AgentWorks 达人管理索引创建脚本
 * 数据库: agentworks_db
 * 集合: talents
 *
 * 创建日期: 2025-11-18
 * 用途: 为 getTalents v3.3 分页和筛选功能优化查询性能
 *
 * 执行方式:
 * 1. 通过 MongoDB Compass 连接数据库
 * 2. 选择 agentworks_db 数据库
 * 3. 打开 Mongosh 终端
 * 4. 执行: load('/path/to/create-talent-indexes.js')
 *
 * 注意：确保当前已经在 agentworks_db 数据库中（通过 use agentworks_db 切换）
 */

// 获取当前数据库（确保在 agentworks_db 中）
const currentDb = db.getName();
if (currentDb !== 'agentworks_db') {
  print(`❌ 错误: 当前数据库是 '${currentDb}'，请先执行 'use agentworks_db' 切换到正确的数据库`);
  throw new Error('数据库错误');
}

print('开始创建 talents 集合索引...\n');

// 索引 1: 分页排序主索引
// 用途: 支持按平台筛选 + 时间排序 + 分页
// 覆盖: 大部分列表查询场景
print('创建索引 1: { platform: 1, updatedAt: -1, _id: 1 }');
db.talents.createIndex(
  { platform: 1, updatedAt: -1, _id: 1 },
  {
    name: 'idx_platform_updatedAt_id',
    background: true  // 后台创建，不阻塞其他操作
  }
);
print('✓ 索引 1 创建成功\n');

// 索引 2: 标签筛选索引
// 用途: 支持按平台 + 内容标签筛选
// 查询示例: { platform: 'douyin', talentType: { $in: ['美妆', '时尚'] } }
print('创建索引 2: { platform: 1, talentType: 1 }');
db.talents.createIndex(
  { platform: 1, talentType: 1 },
  {
    name: 'idx_platform_tags',
    background: true
  }
);
print('✓ 索引 2 创建成功\n');

// 索引 3: 机构筛选索引
// 用途: 支持按平台 + 机构ID筛选
// 查询示例: { platform: 'douyin', agencyId: 'agency_xxx' }
print('创建索引 3: { platform: 1, agencyId: 1 }');
db.talents.createIndex(
  { platform: 1, agencyId: 1 },
  {
    name: 'idx_platform_agency',
    background: true
  }
);
print('✓ 索引 3 创建成功\n');

// 索引 4: 返点率筛选索引
// 用途: 支持按平台 + 返点率区间筛选
// 查询示例: { platform: 'douyin', 'currentRebate.rate': { $gte: 10, $lte: 30 } }
print('创建索引 4: { platform: 1, "currentRebate.rate": 1 }');
db.talents.createIndex(
  { platform: 1, 'currentRebate.rate': 1 },
  {
    name: 'idx_platform_rebate',
    background: true
  }
);
print('✓ 索引 4 创建成功\n');

// 索引 5: 全文搜索索引
// 用途: 支持按名称和 OneID 搜索
// 注意: MongoDB 每个集合只能有一个文本索引，需要先删除旧的
print('创建索引 5: { name: "text", oneId: "text" }');
try {
  // 先删除旧的文本索引（如果存在）
  try {
    db.talents.dropIndex('idx_name_text');
    print('  已删除旧的文本索引: idx_name_text');
  } catch (e) {
    // 旧索引不存在，忽略错误
  }

  // 创建新的文本索引
  db.talents.createIndex(
    { name: 'text', oneId: 'text' },
    {
      name: 'idx_text_search',
      background: true,
      default_language: 'none',  // 禁用语言分析，支持中文
      weights: {
        name: 10,    // 名称权重更高
        oneId: 5     // OneID 权重较低
      }
    }
  );
  print('✓ 索引 5 创建成功\n');
} catch (e) {
  print('⚠️ 索引 5 创建失败: ' + e.message);
  print('  提示: 如果已存在文本索引，请手动删除后重试\n');
}

// 索引 6: OneID 查询索引
// 用途: 支持按 oneId 精确查询（单个达人详情）
// 查询示例: { oneId: 'talent_00000123' }
// 注意: 该索引可能已作为唯一索引存在
print('创建索引 6: { oneId: 1, platform: 1 }');
try {
  db.talents.createIndex(
    { oneId: 1, platform: 1 },
    {
      name: 'idx_oneId_platform',
      background: true
    }
  );
  print('✓ 索引 6 创建成功\n');
} catch (e) {
  if (e.codeName === 'IndexKeySpecsConflict' || e.code === 85) {
    print('⚠️ 索引 6 已存在（可能是唯一索引），跳过创建\n');
  } else {
    print('⚠️ 索引 6 创建失败: ' + e.message + '\n');
  }
}

// 验证索引创建结果
print('===== 索引创建完成 =====\n');
print('当前 talents 集合的所有索引:\n');
db.talents.getIndexes().forEach(function(index) {
  print('- ' + index.name + ': ' + JSON.stringify(index.key));
});

print('\n===== 性能测试建议 =====');
print('1. 执行查询并查看执行计划:');
print('   db.talents.find({ platform: "douyin" }).sort({ updatedAt: -1 }).limit(15).explain("executionStats")');
print('\n2. 检查索引是否被使用:');
print('   - 查看 executionStats.executionStages.inputStage.indexName');
print('   - 确认 totalDocsExamined 接近 nReturned（避免全表扫描）');
print('\n3. 监控索引大小:');
print('   db.talents.stats().indexSizes');

print('\n✅ 所有索引创建完成！');
