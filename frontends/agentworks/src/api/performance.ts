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
  type: 'text' | 'number' | 'percentage' | 'date';
  category: string;
  targetPath: string;
  required?: boolean;
  defaultVisible?: boolean;
  sortable?: boolean;
  pinned?: boolean;  // 是否固定在左侧（不受横向滚动影响）
  width?: number;
  order: number;
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
    mappingConfigId: request.mappingConfigId || 'default'
  });
}
