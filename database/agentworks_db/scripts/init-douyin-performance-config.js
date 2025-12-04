/**
 * 抖音达人表现数据初始配置
 * 数据库: agentworks_db
 * 集合: field_mappings, dimension_configs
 *
 * 创建日期: 2025-11-18
 * 用途: 插入抖音平台的默认字段映射和维度配置
 *
 * 执行方式:
 * 1. 确保已在 agentworks_db 数据库中（use agentworks_db）
 * 2. 执行: load('/path/to/init-douyin-performance-config.js')
 */

// 验证当前数据库
const currentDb = db.getName();
if (currentDb !== 'agentworks_db') {
  print(`❌ 错误: 当前数据库是 '${currentDb}'，请先执行 'use agentworks_db'`);
  throw new Error('数据库错误');
}

print('开始插入抖音达人表现默认配置...\n');

// ========== 1. 字段映射配置 ==========

print('=== 插入 field_mappings 配置 ===\n');

const fieldMappingConfig = {
  platform: 'douyin',
  configName: 'default',
  version: '1.0',
  isActive: true,
  description: '抖音达人表现数据默认映射配置（基于ByteProject performance页面）',
  mappings: [
    // 基础信息（星图ID对应platformAccountId）
    { excelHeader: '星图ID', targetPath: 'platformAccountId', format: 'text', required: true, order: 1 },
    { excelHeader: '达人昵称', targetPath: 'name', format: 'text', required: false, order: 2 },
    { excelHeader: '达人UID', targetPath: 'platformSpecific.uid', format: 'text', required: false, order: 3 },

    // 价格信息（存入 prices 数组）
    { excelHeader: '60s+报价', targetPath: 'prices', format: 'number', required: false, order: 5, priceType: 'video_60plus' },
    { excelHeader: '21-60s报价', targetPath: 'prices', format: 'number', required: false, order: 6, priceType: 'video_21_60' },
    { excelHeader: '1-20s报价', targetPath: 'prices', format: 'number', required: false, order: 7, priceType: 'video_1_20' },

    // 核心绩效
    { excelHeader: '预期cpm', targetPath: 'performanceData.cpm', format: 'number', required: false, order: 10 },
    // 注意：更新日期不再从 Excel 导入，而是使用 snapshotDate（导入时的快照日期）

    // 受众分析 - 性别
    { excelHeader: '男性粉丝占比', targetPath: 'performanceData.audienceGender.male', format: 'percentage', required: false, order: 20 },
    { excelHeader: '女性粉丝占比', targetPath: 'performanceData.audienceGender.female', format: 'percentage', required: false, order: 21 },

    // 受众分析 - 年龄段
    { excelHeader: '18-23岁粉丝比例', targetPath: 'performanceData.audienceAge.18_23', format: 'percentage', required: false, order: 30 },
    { excelHeader: '24-30岁粉丝比例', targetPath: 'performanceData.audienceAge.24_30', format: 'percentage', required: false, order: 31 },
    { excelHeader: '31-40岁粉丝比例', targetPath: 'performanceData.audienceAge.31_40', format: 'percentage', required: false, order: 32 },
    { excelHeader: '41-50岁粉丝比例', targetPath: 'performanceData.audienceAge.41_50', format: 'percentage', required: false, order: 33 },
    { excelHeader: '50岁以上粉丝比例', targetPath: 'performanceData.audienceAge.50_plus', format: 'percentage', required: false, order: 34 },

    // 人群包分析（抖音特有）
    { excelHeader: '小镇中老年粉丝比例', targetPath: 'performanceData.crowdPackage.town_middle_aged', format: 'percentage', required: false, order: 40 },
    { excelHeader: '资深中产粉丝比例', targetPath: 'performanceData.crowdPackage.senior_middle_class', format: 'percentage', required: false, order: 41 },
    { excelHeader: 'Z时代粉丝比例', targetPath: 'performanceData.crowdPackage.z_era', format: 'percentage', required: false, order: 42 },
    { excelHeader: '都市银发粉丝比例', targetPath: 'performanceData.crowdPackage.urban_silver', format: 'percentage', required: false, order: 43 },
    { excelHeader: '小镇青年粉丝比例', targetPath: 'performanceData.crowdPackage.town_youth', format: 'percentage', required: false, order: 44 },
    { excelHeader: '精致妈妈粉丝比例', targetPath: 'performanceData.crowdPackage.exquisite_mom', format: 'percentage', required: false, order: 45 },
    { excelHeader: '新锐白领粉丝比例', targetPath: 'performanceData.crowdPackage.new_white_collar', format: 'percentage', required: false, order: 46 },
    { excelHeader: '都市蓝领粉丝比例', targetPath: 'performanceData.crowdPackage.urban_blue_collar', format: 'percentage', required: false, order: 47 }
  ],
  totalMappings: 22,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system'
};

// 删除旧配置（如果存在）
db.field_mappings.deleteMany({ platform: 'douyin', configName: 'default' });

// 插入新配置
const mappingResult = db.field_mappings.insertOne(fieldMappingConfig);
print(`✓ field_mappings 配置已插入，ID: ${mappingResult.insertedId}`);
print(`  平台: ${fieldMappingConfig.platform}`);
print(`  映射数量: ${fieldMappingConfig.totalMappings}\n`);

// ========== 2. 维度配置 ==========

print('=== 插入 dimension_configs 配置 ===\n');

const dimensionConfig = {
  platform: 'douyin',
  configName: 'default',
  version: '1.1',
  isActive: true,
  description: '抖音达人表现数据维度配置（v1.1 新增筛选功能）',
  dimensions: [
    // 基础信息
    { id: 'name', name: '达人昵称', type: 'text', category: '基础信息', targetPath: 'name', required: true, defaultVisible: true, sortable: true, width: 150, order: 1, filterable: true, filterType: 'text', filterOrder: 1 },
    { id: 'xingtuId', name: '星图ID', type: 'text', category: '基础信息', targetPath: 'platformAccountId', defaultVisible: true, sortable: false, width: 120, order: 2 },
    { id: 'platformAccountId', name: '抖音UID', type: 'text', category: '基础信息', targetPath: 'platformSpecific.uid', defaultVisible: false, sortable: false, width: 120, order: 3 },
    { id: 'price', name: '报价', type: 'price', category: '基础信息', targetPath: 'prices', defaultVisible: true, sortable: true, width: 120, order: 4 },

    // 核心绩效
    { id: 'cpm', name: '60s+ 预期CPM', type: 'number', category: '核心绩效', targetPath: 'performanceData.cpm', defaultVisible: true, sortable: true, width: 120, order: 10, filterable: true, filterType: 'range', filterOrder: 3 },
    // 更新日期使用 _snapshotDate（从 talent_performance 关联查询得来，字符串格式 YYYY-MM-DD）
    { id: 'snapshotDate', name: '更新日期', type: 'date', category: '核心绩效', targetPath: 'performanceData._snapshotDate', defaultVisible: true, sortable: true, width: 120, order: 11 },

    // 受众分析 - 性别
    { id: 'maleRatio', name: '男性观众比例', type: 'percentage', category: '受众分析-性别', targetPath: 'performanceData.audienceGender.male', defaultVisible: true, sortable: true, width: 120, order: 20, filterable: true, filterType: 'range', filterOrder: 4 },
    { id: 'femaleRatio', name: '女性观众比例', type: 'percentage', category: '受众分析-性别', targetPath: 'performanceData.audienceGender.female', defaultVisible: true, sortable: true, width: 120, order: 21, filterable: true, filterType: 'range', filterOrder: 5 },

    // 受众分析 - 年龄段
    { id: 'age_18_23', name: '18-23岁', type: 'percentage', category: '受众分析-年龄', targetPath: 'performanceData.audienceAge.18_23', defaultVisible: false, sortable: true, width: 100, order: 30 },
    { id: 'age_24_30', name: '24-30岁', type: 'percentage', category: '受众分析-年龄', targetPath: 'performanceData.audienceAge.24_30', defaultVisible: false, sortable: true, width: 100, order: 31 },
    { id: 'age_31_40', name: '31-40岁', type: 'percentage', category: '受众分析-年龄', targetPath: 'performanceData.audienceAge.31_40', defaultVisible: false, sortable: true, width: 100, order: 32 },
    { id: 'age_41_50', name: '41-50岁', type: 'percentage', category: '受众分析-年龄', targetPath: 'performanceData.audienceAge.41_50', defaultVisible: false, sortable: true, width: 100, order: 33 },
    { id: 'age_50_plus', name: '50岁以上', type: 'percentage', category: '受众分析-年龄', targetPath: 'performanceData.audienceAge.50_plus', defaultVisible: false, sortable: true, width: 100, order: 34 },

    // 人群包分析
    { id: 'crowd_town_middle_aged', name: '小镇中老年', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.town_middle_aged', defaultVisible: false, sortable: true, width: 110, order: 40 },
    { id: 'crowd_senior_middle_class', name: '资深中产', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.senior_middle_class', defaultVisible: false, sortable: true, width: 100, order: 41 },
    { id: 'crowd_z_era', name: 'Z世代', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.z_era', defaultVisible: false, sortable: true, width: 90, order: 42 },
    { id: 'crowd_urban_silver', name: '都市银发', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.urban_silver', defaultVisible: false, sortable: true, width: 100, order: 43 },
    { id: 'crowd_town_youth', name: '小镇青年', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.town_youth', defaultVisible: false, sortable: true, width: 100, order: 44 },
    { id: 'crowd_exquisite_mom', name: '精致妈妈', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.exquisite_mom', defaultVisible: false, sortable: true, width: 100, order: 45 },
    { id: 'crowd_new_white_collar', name: '新锐白领', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.new_white_collar', defaultVisible: false, sortable: true, width: 100, order: 46 },
    { id: 'crowd_urban_blue_collar', name: '都市蓝领', type: 'percentage', category: '人群包分析', targetPath: 'performanceData.crowdPackage.urban_blue_collar', defaultVisible: false, sortable: true, width: 100, order: 47 }
  ],
  categories: [
    { name: '基础信息', order: 1, icon: 'user' },
    { name: '核心绩效', order: 2, icon: 'chart' },
    { name: '受众分析-性别', order: 3, icon: 'users' },
    { name: '受众分析-年龄', order: 4, icon: 'calendar' },
    { name: '人群包分析', order: 5, icon: 'group' }
  ],
  defaultVisibleIds: ['name', 'xingtuId', 'price', 'cpm', 'snapshotDate', 'maleRatio', 'femaleRatio'],
  totalDimensions: 20,
  createdAt: new Date(),
  updatedAt: new Date()
};

// 删除旧配置（如果存在）
db.dimension_configs.deleteMany({ platform: 'douyin', configName: 'default' });

// 插入新配置
const dimensionResult = db.dimension_configs.insertOne(dimensionConfig);
print(`✓ dimension_configs 配置已插入，ID: ${dimensionResult.insertedId}`);
print(`  平台: ${dimensionConfig.platform}`);
print(`  维度数量: ${dimensionConfig.totalDimensions}`);
print(`  默认显示: ${dimensionConfig.defaultVisibleIds.length} 个\n`);

// ========== 验证 ==========

print('=== 验证配置 ===\n');

const mappingCount = db.field_mappings.countDocuments({ platform: 'douyin', isActive: true });
const dimensionCount = db.dimension_configs.countDocuments({ platform: 'douyin', isActive: true });

print(`✓ field_mappings: ${mappingCount} 条活跃配置`);
print(`✓ dimension_configs: ${dimensionCount} 条活跃配置\n`);

print('===== 配置初始化完成 =====\n');
print('抖音平台的字段映射和维度配置已就绪！');
print('\n下一步：');
print('1. 升级 syncFromFeishu 云函数（Phase 2）');
print('2. 创建配置管理界面（Phase 3）');
