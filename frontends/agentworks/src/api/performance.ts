/**
 * 达人表现相关 API
 */

import { get, post, put, del } from './client';

/**
 * ========== 字段映射配置管理 ==========
 */

export interface FieldMappingRule {
  excelHeader: string;
  targetPath: string;
  format: 'text' | 'number' | 'percentage' | 'date';
  required?: boolean;
  defaultValue?: any;
  order?: number;
  priceType?: string;  // 价格类型（当 targetPath = "prices" 时使用）
  targetCollection?: 'talents' | 'talent_performance';  // 目标集合（默认 talents）
}

export interface FieldMappingConfig {
  _id?: string;
  platform: string;
  configName: string;
  version: string;
  isActive: boolean;
  description?: string;
  mappings: FieldMappingRule[];
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
  type: 'text' | 'number' | 'percentage' | 'date' | 'price';  // 新增 price 类型
  category: string;
  targetPath: string;
  required?: boolean;
  defaultVisible?: boolean;
  sortable?: boolean;
  pinned?: boolean;  // 是否固定在左侧（不受横向滚动影响）
  width?: number;
  order: number;
  priceType?: string;  // 价格类型（当 type = "price" 时使用）
  targetCollection?: 'talents' | 'talent_performance';  // 数据来源集合（默认 talents）
  // v1.1 新增：筛选相关字段
  filterable?: boolean;  // 是否可作为筛选条件
  filterType?: 'text' | 'range' | 'enum';  // 筛选器类型
  filterOrder?: number;  // 筛选面板中的显示顺序
  filterOptions?: string[];  // 枚举筛选的选项列表（仅 filterType=enum 时使用）
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
export async function getDimensionConfigs(platform?: string, configName?: string) {
  const params: any = {};
  if (platform) params.platform = platform;
  if (configName) params.configName = configName;
  return get('/dimensionConfigManager', params);
}

/**
 * 创建维度配置
 */
export async function createDimensionConfig(config: Partial<DimensionConfigDoc>) {
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

export interface ImportRequest {
  feishuUrl?: string;
  platform: string;
  dbVersion?: string;
  mappingConfigId?: string;
  priceYear?: number;   // 价格归属年份
  priceMonth?: number;  // 价格归属月份
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
 */
export async function importPerformanceFromFeishu(request: ImportRequest): Promise<ImportResult> {
  return post('/sync-from-feishu', {
    dataType: 'talentPerformance',
    feishuUrl: request.feishuUrl,
    platform: request.platform,
    dbVersion: request.dbVersion || 'v2',
    mappingConfigId: request.mappingConfigId || 'default',
    priceYear: request.priceYear,
    priceMonth: request.priceMonth
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
  oneIds?: string;  // 逗号分隔的多个 oneId
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
export async function getTalentPerformance(oneId: string, platform: string, snapshotType = 'daily') {
  return get('/talent-performance', { oneId, platform, snapshotType });
}

/**
 * 批量查询多个达人的最新表现数据
 */
export async function getBatchTalentPerformance(oneIds: string[], platform: string, snapshotType = 'daily') {
  return get('/talent-performance', { oneIds: oneIds.join(','), platform, snapshotType });
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
  return get('/talent-performance/history', { oneId, platform, snapshotType, limit });
}

/**
 * 列表查询表现数据（分页）
 */
export async function listTalentPerformance(query: TalentPerformanceQuery) {
  return get('/talent-performance', query);
}
