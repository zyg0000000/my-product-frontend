/**
 * 达人全景页面 - 字段配置
 * 定义所有可用字段的元数据，用于动态列选择
 *
 * @version 1.1.0  (v1.1 基于生产数据库实际字段清理)
 * @date 2025-12-04
 *
 * 注意：以下字段已移除（生产数据库无数据）：
 * - talents: starLevel, mcnName（无小红书/B站数据）
 * - performance.metrics: fansCount, fansChange, avgPlayCount, engagementRate, cpm（deprecated）
 * - performance.metrics: avgLikeCount, avgCommentCount, avgShareCount, worksCount, newWorksCount（不存在）
 * - performance.audience: 整个对象为空 {}
 * - performance.aiFeatures: 无数据
 * - performance.prediction: 无数据
 */

import type { Platform } from '@/types/talent';

// ========== 类型定义 ==========

/**
 * 字段分类（v1.1 移除无数据分类：aiFeatures, prediction）
 */
export type FieldCategory =
  | 'basic' // 基础信息
  | 'price' // 价格信息
  | 'rebate' // 返点信息
  | 'metrics' // 核心指标（表现数据）
  | 'audience' // 受众画像
  | 'customer'; // 客户关系

/**
 * 字段数据类型
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'percentage'
  | 'price'
  | 'date'
  | 'array'
  | 'object';

/**
 * 字段定义接口
 */
export interface FieldDefinition {
  /** 字段唯一标识（与后端 FIELD_WHITELIST key 一致） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 所属分类 */
  category: FieldCategory;
  /** 数据类型 */
  type: FieldType;
  /** 列宽（可选） */
  width?: number;
  /** 是否默认显示 */
  defaultVisible?: boolean;
  /** 平台限制（空=全平台可用） */
  platforms?: Platform[];
  /** 排序权重（数值越小越靠前） */
  order?: number;
  /** 字段描述（用于 tooltip） */
  description?: string;
  /** 格式化函数名（前端使用） */
  formatter?: string;
  /** 是否仅客户视角可用 */
  customerViewOnly?: boolean;
}

/**
 * 分类信息
 */
export interface CategoryInfo {
  id: FieldCategory;
  name: string;
  icon?: string;
  order: number;
  description?: string;
}

// ========== 分类配置（v1.1 移除无数据分类）==========

export const FIELD_CATEGORIES: CategoryInfo[] = [
  { id: 'basic', name: '基础信息', order: 1, description: '达人基本资料' },
  { id: 'price', name: '价格信息', order: 2, description: '视频报价' },
  { id: 'rebate', name: '返点信息', order: 3, description: '返点率及来源' },
  { id: 'metrics', name: '表现数据', order: 4, description: '互动和传播数据' },
  { id: 'audience', name: '受众画像', order: 5, description: '粉丝特征分析' },
  {
    id: 'customer',
    name: '客户关系',
    order: 6,
    description: '客户标签与合作信息',
  },
];

// ========== 字段定义（v1.1 基于生产数据库清理）==========

export const PANORAMA_FIELDS: FieldDefinition[] = [
  // ===== 基础信息 =====
  {
    id: 'name',
    name: '达人名称',
    category: 'basic',
    type: 'string',
    width: 180,
    defaultVisible: true,
    order: 1,
  },
  {
    id: 'oneId',
    name: 'OneID',
    category: 'basic',
    type: 'string',
    width: 140,
    defaultVisible: true,
    order: 2,
    description: '达人统一标识',
  },
  {
    id: 'platform',
    name: '平台',
    category: 'basic',
    type: 'string',
    width: 80,
    defaultVisible: false,
    order: 3,
  },
  {
    id: 'followerCount',
    name: '粉丝数',
    category: 'basic',
    type: 'number',
    width: 100,
    defaultVisible: true,
    order: 5,
    formatter: 'formatNumber',
  },
  {
    id: 'contentTags',
    name: '内容标签',
    category: 'basic',
    type: 'array',
    width: 150,
    defaultVisible: true,
    order: 6,
    description: '达人内容分类标签',
  },
  {
    id: 'platformAccountId',
    name: '平台账号ID',
    category: 'basic',
    type: 'string',
    width: 120,
    defaultVisible: false,
    order: 7,
  },
  {
    id: 'agencyId',
    name: '机构',
    category: 'basic',
    type: 'string',
    width: 100,
    defaultVisible: false,
    order: 8,
  },
  {
    id: 'uid',
    name: '抖音UID',
    category: 'basic',
    type: 'string',
    width: 120,
    defaultVisible: false,
    order: 10,
    platforms: ['douyin'],
    description: '抖音用户UID',
  },
  {
    id: 'status',
    name: '状态',
    category: 'basic',
    type: 'string',
    width: 80,
    defaultVisible: false,
    order: 11,
  },
  {
    id: 'createdAt',
    name: '创建时间',
    category: 'basic',
    type: 'date',
    width: 120,
    defaultVisible: false,
    order: 12,
  },
  {
    id: 'updatedAt',
    name: '更新时间',
    category: 'basic',
    type: 'date',
    width: 120,
    defaultVisible: false,
    order: 13,
  },

  // ===== 价格信息 =====
  {
    id: 'prices',
    name: '视频报价',
    category: 'price',
    type: 'object',
    width: 200,
    defaultVisible: true,
    order: 1,
    description: '包含60s+/21-60s/1-20s报价',
    formatter: 'formatPrices',
  },

  // ===== 返点信息 =====
  {
    id: 'rebate',
    name: '返点率',
    category: 'rebate',
    type: 'percentage',
    width: 80,
    defaultVisible: true,
    order: 1,
    formatter: 'formatPercentage',
  },
  {
    id: 'rebateSource',
    name: '返点来源',
    category: 'rebate',
    type: 'string',
    width: 100,
    defaultVisible: false,
    order: 2,
    description: '返点数据来源（机构同步/手动录入等）',
  },
  {
    id: 'rebateEffectiveDate',
    name: '返点生效日期',
    category: 'rebate',
    type: 'date',
    width: 120,
    defaultVisible: false,
    order: 3,
  },

  // ===== 表现数据（v1.2 实际字段名）=====
  {
    id: 'followers',
    name: '粉丝数(快照)',
    category: 'metrics',
    type: 'number',
    width: 110,
    defaultVisible: false,
    order: 1,
    formatter: 'formatNumber',
    description: '表现快照中的粉丝数',
  },
  {
    id: 'followerGrowth',
    name: '粉丝增长',
    category: 'metrics',
    type: 'number',
    width: 100,
    defaultVisible: false,
    order: 2,
    formatter: 'formatChange',
    description: '相比上期粉丝变化',
  },
  {
    id: 'expectedPlays',
    name: '预期播放量',
    category: 'metrics',
    type: 'number',
    width: 110,
    defaultVisible: false,
    order: 3,
    formatter: 'formatNumber',
  },
  {
    id: 'connectedUsers',
    name: '触达用户数',
    category: 'metrics',
    type: 'number',
    width: 110,
    defaultVisible: false,
    order: 4,
    formatter: 'formatNumber',
  },
  {
    id: 'interactionRate30d',
    name: '30日互动率',
    category: 'metrics',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 5,
    formatter: 'formatPercentage',
  },
  {
    id: 'completionRate30d',
    name: '30日完播率',
    category: 'metrics',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 6,
    formatter: 'formatPercentage',
  },
  {
    id: 'spreadIndex',
    name: '传播指数',
    category: 'metrics',
    type: 'number',
    width: 90,
    defaultVisible: false,
    order: 7,
    formatter: 'formatNumber',
  },
  {
    id: 'viralRate',
    name: '爆文率',
    category: 'metrics',
    type: 'percentage',
    width: 80,
    defaultVisible: false,
    order: 8,
    formatter: 'formatPercentage',
    description: '视频爆款率',
  },
  {
    id: 'cpm60sExpected',
    name: '60s预期CPM',
    category: 'metrics',
    type: 'number',
    width: 100,
    defaultVisible: false,
    order: 9,
    formatter: 'formatNumber',
    description: '60秒视频预期千次播放成本',
  },

  // ===== 受众画像（v1.2 嵌套在 metrics 中）=====
  {
    id: 'audienceGenderMale',
    name: '男性占比',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 1,
    formatter: 'formatPercentage',
  },
  {
    id: 'audienceGenderFemale',
    name: '女性占比',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 2,
    formatter: 'formatPercentage',
  },
  {
    id: 'audienceAge18_23',
    name: '18-23岁占比',
    category: 'audience',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 3,
    formatter: 'formatPercentage',
  },
  {
    id: 'audienceAge24_30',
    name: '24-30岁占比',
    category: 'audience',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 4,
    formatter: 'formatPercentage',
  },
  {
    id: 'audienceAge31_40',
    name: '31-40岁占比',
    category: 'audience',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 5,
    formatter: 'formatPercentage',
  },
  {
    id: 'audienceAge41_50',
    name: '41-50岁占比',
    category: 'audience',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 6,
    formatter: 'formatPercentage',
  },
  {
    id: 'audienceAge50Plus',
    name: '50+岁占比',
    category: 'audience',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 7,
    formatter: 'formatPercentage',
  },
  // 抖音八大人群（v1.1 新增）
  {
    id: 'crowdPackageTownMiddleAged',
    name: '小镇中老年',
    category: 'audience',
    type: 'percentage',
    width: 100,
    defaultVisible: false,
    order: 8,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-小镇中老年占比',
  },
  {
    id: 'crowdPackageSeniorMiddleClass',
    name: '资深中产',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 9,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-资深中产占比',
  },
  {
    id: 'crowdPackageZEra',
    name: 'Z世代',
    category: 'audience',
    type: 'percentage',
    width: 80,
    defaultVisible: false,
    order: 10,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-Z世代占比',
  },
  {
    id: 'crowdPackageUrbanSilver',
    name: '都市银发',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 11,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-都市银发占比',
  },
  {
    id: 'crowdPackageTownYouth',
    name: '小镇青年',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 12,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-小镇青年占比',
  },
  {
    id: 'crowdPackageExquisiteMom',
    name: '精致妈妈',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 13,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-精致妈妈占比',
  },
  {
    id: 'crowdPackageNewWhiteCollar',
    name: '新锐白领',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 14,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-新锐白领占比',
  },
  {
    id: 'crowdPackageUrbanBlueCollar',
    name: '都市蓝领',
    category: 'audience',
    type: 'percentage',
    width: 90,
    defaultVisible: false,
    order: 15,
    platforms: ['douyin'],
    formatter: 'formatPercentage',
    description: '抖音八大人群-都市蓝领占比',
  },

  // ===== 客户关系 =====
  {
    id: 'customerRelations',
    name: '关注客户',
    category: 'customer',
    type: 'array',
    width: 200,
    defaultVisible: true,
    order: 1,
    customerViewOnly: true,
    description: '关注该达人的客户列表',
  },
  {
    id: 'cooperationCount',
    name: '合作次数',
    category: 'customer',
    type: 'number',
    width: 90,
    defaultVisible: false,
    order: 2,
    customerViewOnly: true,
  },
  {
    id: 'lastCooperationDate',
    name: '最近合作日期',
    category: 'customer',
    type: 'date',
    width: 120,
    defaultVisible: false,
    order: 3,
    customerViewOnly: true,
  },
  {
    id: 'addedAt',
    name: '添加时间',
    category: 'customer',
    type: 'date',
    width: 120,
    defaultVisible: false,
    order: 4,
    customerViewOnly: true,
    description: '添加到客户池的时间',
  },
];

// ========== 导出默认字段 ==========

/**
 * 默认显示的字段ID列表
 */
export const DEFAULT_VISIBLE_FIELDS = PANORAMA_FIELDS.filter(
  f => f.defaultVisible
).map(f => f.id);

/**
 * 按分类获取字段
 */
export function getFieldsByCategory(
  category: FieldCategory
): FieldDefinition[] {
  return PANORAMA_FIELDS.filter(f => f.category === category).sort(
    (a, b) => (a.order || 999) - (b.order || 999)
  );
}

/**
 * 根据平台过滤可用字段
 */
export function getFieldsForPlatform(platform: Platform): FieldDefinition[] {
  return PANORAMA_FIELDS.filter(f => {
    if (!f.platforms || f.platforms.length === 0) return true;
    return f.platforms.includes(platform);
  });
}

/**
 * 根据视角模式过滤可用字段
 */
export function getFieldsForViewMode(
  viewMode: 'all' | 'customer',
  platform?: Platform
): FieldDefinition[] {
  let fields = platform ? getFieldsForPlatform(platform) : PANORAMA_FIELDS;

  if (viewMode === 'all') {
    // 全量视角：排除仅客户视角可用的字段
    fields = fields.filter(f => !f.customerViewOnly);
  }

  return fields;
}

/**
 * 获取字段定义
 */
export function getFieldById(id: string): FieldDefinition | undefined {
  return PANORAMA_FIELDS.find(f => f.id === id);
}

/**
 * 获取分类信息
 */
export function getCategoryInfo(
  categoryId: FieldCategory
): CategoryInfo | undefined {
  return FIELD_CATEGORIES.find(c => c.id === categoryId);
}

/**
 * 分类字段映射
 */
export function getFieldsGroupedByCategory(
  fields: FieldDefinition[] = PANORAMA_FIELDS
): Record<FieldCategory, FieldDefinition[]> {
  const grouped: Record<FieldCategory, FieldDefinition[]> = {
    basic: [],
    price: [],
    rebate: [],
    metrics: [],
    audience: [],
    customer: [],
  };

  for (const field of fields) {
    grouped[field.category].push(field);
  }

  // 排序
  for (const category of Object.keys(grouped) as FieldCategory[]) {
    grouped[category].sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  return grouped;
}
