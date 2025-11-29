/**
 * 达人表现相关 API
 */

import { get, post, put, del } from './client';

/**
 * ========== 字段映射配置管理 ==========
 */

/**
 * 可用的 Transform 函数
 * 这些函数在云函数 mapping-engine.js 中实现
 */
export type TransformFunction =
  | 'extractJsonFirstKey' // 提取 JSON 首个 key
  | 'extractJsonFirstKeyAsArray' // 提取 JSON 首个 key 并返回数组
  | 'splitToArray' // 逗号分隔转数组
  | 'extractJsonAllKeys'; // 提取所有 keys

/**
 * Transform 函数选项配置
 */
export const TRANSFORM_OPTIONS: Array<{
  value: TransformFunction;
  label: string;
  description: string;
}> = [
  {
    value: 'extractJsonFirstKey',
    label: '提取JSON首个Key',
    description: '从 {"key": value} 提取 "key"',
  },
  {
    value: 'extractJsonFirstKeyAsArray',
    label: '提取JSON首个Key(数组)',
    description: '从 {"key": value} 提取 ["key"]',
  },
  {
    value: 'splitToArray',
    label: '逗号分隔转数组',
    description: '"a,b,c" → ["a", "b", "c"]',
  },
  {
    value: 'extractJsonAllKeys',
    label: '提取所有Keys',
    description: '从 {"a":1, "b":2} 提取 ["a", "b"]',
  },
];

export interface FieldMappingRule {
  excelHeader: string;
  targetPath: string;
  format: 'text' | 'number' | 'percentage' | 'date';
  required?: boolean;
  defaultValue?: any;
  order?: number;
  priceType?: string; // 价格类型（当 targetPath = "prices" 时使用）
  targetCollection?: 'talents' | 'talent_performance'; // 目标集合（默认 talents）
  category?: string; // 分类（基础信息、核心绩效、受众分析等）
  transform?: TransformFunction; // 值转换函数（v1.7 新增）
}

export interface CategoryConfig {
  name: string;
  order: number;
  icon?: string;
}

/**
 * 计算字段公式配置
 * v1.6: 支持两种格式
 * - 简单格式（向后兼容）: type + operand1 + operand2
 * - 表达式格式（推荐）: expression 字符串
 */
export interface ComputedFieldFormula {
  // === 新格式：表达式（推荐） ===
  expression?: string; // 完整表达式，如 "(prices.video_60plus * 0.6 + prices.video_21_60 * 0.4) / metrics.expected_plays * 1000"

  // === 旧格式：简单二元运算（向后兼容） ===
  type?: 'division' | 'multiplication' | 'addition' | 'subtraction';
  operand1?: string; // 第一个操作数的 targetPath（如 "prices.video_60plus"）
  operand2?: string; // 第二个操作数的 targetPath（如 "metrics.expected_plays"）
  multiplier?: number; // 乘数（如 CPM 计算需要 × 1000）

  // === 通用配置 ===
  precision?: number; // 保留小数位数
}

/**
 * 计算字段规则
 */
export interface ComputedFieldRule {
  id: string; // 字段ID，如 'cpm_60s_expected'
  name: string; // 显示名称，如 '60s预期CPM'
  targetPath: string; // 目标路径，如 'metrics.cpm_60s_expected'
  targetCollection: 'talents' | 'talent_performance';
  formula: ComputedFieldFormula;
  category?: string; // 分类
  order?: number; // 排序
}

export interface FieldMappingConfig {
  _id?: string;
  platform: string;
  configName: string;
  version: string;
  isActive: boolean;
  description?: string;
  mappings: FieldMappingRule[];
  computedFields?: ComputedFieldRule[]; // 计算字段配置
  categories?: CategoryConfig[]; // 分类配置
  totalMappings?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 获取字段映射配置
 */
export async function getFieldMappings(platform?: string, configName?: string) {
  const params: any = {};
  if (platform) params.platform = platform;
  if (configName) params.configName = configName;
  return get('/fieldMappingManager', params);
}

/**
 * 创建字段映射配置
 */
export async function createFieldMapping(config: Partial<FieldMappingConfig>) {
  return post('/fieldMappingManager', config);
}

/**
 * 更新字段映射配置
 */
export async function updateFieldMapping(config: FieldMappingConfig) {
  return put('/fieldMappingManager', config);
}

/**
 * 删除字段映射配置
 */
export async function deleteFieldMapping(id: string) {
  return del('/fieldMappingManager', { _id: id });
}

/**
 * ========== 维度配置管理 ==========
 */

export interface DimensionConfig {
  id: string;
  name: string;
  type: 'text' | 'number' | 'percentage' | 'date' | 'price'; // 新增 price 类型
  category: string;
  targetPath: string;
  required?: boolean;
  defaultVisible?: boolean;
  sortable?: boolean;
  pinned?: boolean; // 是否固定在左侧（不受横向滚动影响）
  width?: number;
  order: number;
  priceType?: string; // 价格类型（当 type = "price" 时使用）
  targetCollection?: 'talents' | 'talent_performance'; // 数据来源集合（默认 talents）
  // v1.1 新增：筛选相关字段
  filterable?: boolean; // 是否可作为筛选条件
  filterType?: 'text' | 'range' | 'enum'; // 筛选器类型
  filterOrder?: number; // 筛选面板中的显示顺序
  filterOptions?: string[]; // 枚举筛选的选项列表（仅 filterType=enum 时使用）
  // v1.2 新增：计算字段标识
  isComputed?: boolean; // 是否为计算字段
  computedFrom?: {
    formula: string; // 公式描述（用于展示）
  };
}

export interface DimensionConfigDoc {
  _id?: string;
  platform: string;
  configName: string;
  version?: string;
  isActive: boolean;
  description?: string;
  dimensions: DimensionConfig[];
  categories?: Array<{ name: string; order: number; icon?: string }>;
  defaultVisibleIds?: string[];
  totalDimensions?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 获取维度配置
 */
export async function getDimensionConfigs(
  platform?: string,
  configName?: string
) {
  const params: any = {};
  if (platform) params.platform = platform;
  if (configName) params.configName = configName;
  return get('/dimensionConfigManager', params);
}

/**
 * 创建维度配置
 */
export async function createDimensionConfig(
  config: Partial<DimensionConfigDoc>
) {
  return post('/dimensionConfigManager', config);
}

/**
 * 更新维度配置
 */
export async function updateDimensionConfig(config: DimensionConfigDoc) {
  return put('/dimensionConfigManager', config);
}

/**
 * 删除维度配置
 */
export async function deleteDimensionConfig(id: string) {
  return del('/dimensionConfigManager', { _id: id });
}

/**
 * ========== 数据导入 ==========
 */

/**
 * 数据导入请求参数
 * v2.1: 新增 snapshotDate 支持导入历史数据
 */
export interface ImportRequest {
  /** 飞书表格分享链接 */
  feishuUrl?: string;
  /** 平台标识（douyin/xiaohongshu 等） */
  platform: string;
  /** 数据库版本（v1/v2） */
  dbVersion?: string;
  /** 字段映射配置名称 */
  mappingConfigId?: string;
  /** 价格归属年份（用于价格数据的时间标记） */
  priceYear?: number;
  /** 价格归属月份（用于价格数据的时间标记） */
  priceMonth?: number;
  /**
   * 快照日期（用于表现数据的时间标记）
   * 格式：YYYY-MM-DD
   * 默认为当天日期，设置后可导入历史表现数据
   */
  snapshotDate?: string;
}

export interface ImportResult {
  success: boolean;
  data?: {
    validData: any[];
    invalidRows: any[];
    stats: {
      total: number;
      valid: number;
      invalid: number;
      matched: number;
      modified: number;
      failed: number;
    };
  };
  message?: string;
  error?: string;
}

/**
 * 从飞书导入达人表现数据
 *
 * v2.1: 支持 snapshotDate 参数，用于导入历史数据
 * - 价格数据使用 priceYear + priceMonth 标记时间（月度粒度）
 * - 表现数据使用 snapshotDate 标记时间（日度粒度）
 * - 两者独立，可以分别设置不同的时间
 *
 * @param request - 导入请求参数
 * @returns 导入结果（含统计信息）
 */
export async function importPerformanceFromFeishu(
  request: ImportRequest
): Promise<ImportResult> {
  return post('/sync-from-feishu', {
    dataType: 'talentPerformance',
    feishuUrl: request.feishuUrl,
    platform: request.platform,
    dbVersion: request.dbVersion || 'v2',
    mappingConfigId: request.mappingConfigId || 'default',
    priceYear: request.priceYear,
    priceMonth: request.priceMonth,
    snapshotDate: request.snapshotDate, // v2.1: 快照日期（用于历史数据导入）
  });
}

/**
 * ========== talent_performance 集合查询 API ==========
 */

export interface TalentPerformanceRecord {
  _id?: string;
  snapshotId: string;
  oneId: string;
  platform: string;
  snapshotDate: string;
  snapshotType: 'daily' | 'weekly' | 'monthly';
  dataSource: 'feishu_sync' | 'api_import' | 'manual';
  metrics: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TalentPerformanceQuery {
  oneId?: string;
  oneIds?: string; // 逗号分隔的多个 oneId
  platform: string;
  snapshotType?: 'daily' | 'weekly' | 'monthly';
  snapshotDate?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}

/**
 * 查询单个达人的最新表现数据
 */
export async function getTalentPerformance(
  oneId: string,
  platform: string,
  snapshotType = 'daily'
) {
  return get('/talent-performance', { oneId, platform, snapshotType });
}

/**
 * 批量查询多个达人的最新表现数据
 */
export async function getBatchTalentPerformance(
  oneIds: string[],
  platform: string,
  snapshotType = 'daily'
) {
  return get('/talent-performance', {
    oneIds: oneIds.join(','),
    platform,
    snapshotType,
  });
}

/**
 * 查询达人的历史表现数据
 */
export async function getTalentPerformanceHistory(
  oneId: string,
  platform: string,
  snapshotType = 'daily',
  limit = 30
) {
  return get('/talent-performance/history', {
    oneId,
    platform,
    snapshotType,
    limit,
  });
}

/**
 * 列表查询表现数据（分页）
 */
export async function listTalentPerformance(query: TalentPerformanceQuery) {
  return get('/talent-performance', query);
}

/**
 * 查询多个达人的历史表现数据（趋势分析用）
 */
export interface PerformanceHistoryParams {
  platform: string;
  oneIds: string[];
  metrics: string[];
  startDate: string;
  endDate: string;
}

export async function getPerformanceHistory(params: PerformanceHistoryParams) {
  return get('/performance/history', {
    platform: params.platform,
    oneIds: params.oneIds.join(','),
    metrics: params.metrics.join(','),
    startDate: params.startDate,
    endDate: params.endDate,
  });
}
