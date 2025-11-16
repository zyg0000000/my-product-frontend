/**
 * 达人-机构关系迁移脚本 (v1.0)
 *
 * 功能：
 * 1. 将 talents 集合中的 belongType 从枚举值改为机构ID
 * 2. 将 "wild" 改为 "individual"（野生达人机构ID）
 * 3. 更新索引
 *
 * 使用方法：
 * mongosh "mongodb://your-connection-string/agentworks_db" --file migrate-talent-agency-relation.js
 *
 * @date 2025-11-16
 */

// 连接到数据库
const DB_NAME = 'agentworks_db';
const db = db.getSiblingDB(DB_NAME);

print('\n========================================');
print('达人-机构关系迁移 (v1.0)');
print(`数据库: ${DB_NAME}`);
print(`时间: ${new Date().toISOString()}`);
print('========================================\n');

// ============================================
// Step 1: 统计当前数据
// ============================================
print('[1/5] 统计当前数据...');

const wildCount = db.talents.countDocuments({ belongType: "wild" });
const agencyCount = db.talents.countDocuments({ belongType: "agency" });
const individualCount = db.talents.countDocuments({ belongType: "individual" });
const totalCount = db.talents.countDocuments();

print(`  - 野生达人(wild): ${wildCount}`);
print(`  - 机构达人(agency): ${agencyCount}`);
print(`  - 已迁移(individual): ${individualCount}`);
print(`  - 达人总数: ${totalCount}`);

// ============================================
// Step 2: 迁移 belongType 字段
// ============================================
print('\n[2/5] 迁移 belongType 字段...');
print('  将 "wild" 改为 "individual"（野生达人机构ID）');

try {
    const updateResult = db.talents.updateMany(
        { belongType: "wild" },
        { $set: { belongType: "individual" } }
    );
    print(`  ✅ 更新了 ${updateResult.modifiedCount} 条记录`);
} catch (e) {
    print(`  ❌ 更新失败: ${e.message}`);
}

// ============================================
// Step 3: 处理其他类型的归属
// ============================================
print('\n[3/5] 处理其他归属类型...');

// 将 "agency" 类型暂时也改为 "individual"，后续需要关联实际机构
try {
    const agencyUpdateResult = db.talents.updateMany(
        { belongType: "agency" },
        {
            $set: {
                belongType: "individual",
                needsAgencyMapping: true  // 标记需要后续映射到实际机构
            }
        }
    );
    if (agencyUpdateResult.modifiedCount > 0) {
        print(`  ⚠️  将 ${agencyUpdateResult.modifiedCount} 个 "agency" 类型暂时改为 "individual"`);
        print('     （后续需要映射到实际机构）');
    }
} catch (e) {
    print(`  ❌ 处理 agency 类型失败: ${e.message}`);
}

// ============================================
// Step 4: 更新索引
// ============================================
print('\n[4/5] 更新索引...');

// 检查并删除旧索引
const existingIndexes = db.talents.getIndexes();
const oldIndexExists = existingIndexes.some(idx => idx.name === 'idx_belongType');

if (oldIndexExists) {
    try {
        db.talents.dropIndex('idx_belongType');
        print('  ✅ 删除旧索引 idx_belongType');
    } catch (e) {
        print(`  ⚠️  删除旧索引失败: ${e.message}`);
    }
}

// 创建新索引（现在 belongType 存储的是机构ID）
try {
    db.talents.createIndex(
        { belongType: 1 },
        { name: 'idx_agencyId' }
    );
    print('  ✅ 创建新索引 idx_agencyId');
} catch (e) {
    if (e.codeName === 'IndexOptionsConflict' || e.code === 85) {
        print('  ⚠️  索引 idx_agencyId 已存在');
    } else {
        print(`  ❌ 创建索引失败: ${e.message}`);
    }
}

// 为 needsAgencyMapping 字段创建索引（方便后续查找需要映射的记录）
try {
    db.talents.createIndex(
        { needsAgencyMapping: 1 },
        {
            name: 'idx_needsAgencyMapping',
            sparse: true  // 稀疏索引，只索引存在该字段的文档
        }
    );
    print('  ✅ 创建临时索引 idx_needsAgencyMapping');
} catch (e) {
    if (e.codeName === 'IndexOptionsConflict' || e.code === 85) {
        print('  ⚠️  索引 idx_needsAgencyMapping 已存在');
    } else {
        print(`  ⚠️  创建临时索引失败: ${e.message}`);
    }
}

// ============================================
// Step 5: 验证迁移结果
// ============================================
print('\n[5/5] 验证迁移结果...');

const newIndividualCount = db.talents.countDocuments({ belongType: "individual" });
const remainingWildCount = db.talents.countDocuments({ belongType: "wild" });
const remainingAgencyCount = db.talents.countDocuments({ belongType: "agency" });
const needsMappingCount = db.talents.countDocuments({ needsAgencyMapping: true });

print(`  - 野生达人(individual): ${newIndividualCount}`);
print(`  - 剩余 wild 记录: ${remainingWildCount}`);
print(`  - 剩余 agency 记录: ${remainingAgencyCount}`);
print(`  - 需要机构映射的记录: ${needsMappingCount}`);

if (remainingWildCount === 0 && remainingAgencyCount === 0) {
    print('  ✅ 迁移成功！所有记录已更新');
} else if (remainingWildCount > 0 || remainingAgencyCount > 0) {
    print('  ⚠️  还有未迁移的记录，请检查');
} else {
    print('  ✅ 基础迁移完成');
}

// ============================================
// 输出统计报告
// ============================================
print('\n========================================');
print('📊 迁移统计报告');
print('========================================');

print(`\n迁移前:`);
print(`  - wild 类型: ${wildCount}`);
print(`  - agency 类型: ${agencyCount}`);
print(`  - 总计: ${wildCount + agencyCount}`);

print(`\n迁移后:`);
print(`  - individual 类型: ${newIndividualCount}`);
print(`  - 需要映射到机构: ${needsMappingCount}`);

// ============================================
// 后续步骤提示
// ============================================
print('\n========================================');
print('📝 后续步骤');
print('========================================\n');

print('1. 前端代码更新：');
print('   - 更新类型定义，将 belongType 改为存储机构ID');
print('   - 修改显示逻辑，"individual" 显示为 "野生达人"');
print('   - 在达人编辑页面添加机构选择功能');
print('');

print('2. 云函数更新：');
print('   - 更新查询逻辑，支持按机构ID筛选');
print('   - 添加达人-机构关联接口');
print('');

print('3. 数据完善：');
if (needsMappingCount > 0) {
    print(`   - 有 ${needsMappingCount} 个达人需要关联到实际机构`);
    print('   - 可通过管理界面手动分配或批量导入');
} else {
    print('   - 所有达人已完成基础归属设置');
}
print('');

print('4. 机构字段更新：');
print('   - 将机构的 "基础返点" 改为 "当前返点"');
print('   - 添加达人数量统计功能');
print('');

print('========================================');
print('✅ 数据迁移脚本执行完成！');
print('========================================\n');