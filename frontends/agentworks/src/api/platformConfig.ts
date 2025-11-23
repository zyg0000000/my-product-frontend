/**
 * 平台配置 API
 *
 * @version 1.0.0
 * @description 平台配置的增删改查接口
 *
 * 功能：
 * - 获取所有平台配置
 * - 获取单个平台配置
 * - 创建新平台配置
 * - 更新平台配置
 * - 删除平台配置（软删除）
 */

import { get, post, put, del } from './client';
import type { Platform, PriceType } from '../types/talent';

// ==================== 类型定义 ====================

/**
 * 价格类型配置
 */
export interface PriceTypeConfig {
  key: PriceType;
  label: string;
  required: boolean;
  bgColor: string;
  textColor: string;
  order: number;
}

/**
 * 字段配置
 */
export interface FieldConfig {
  label: string;
  type: 'string' | 'number';
  required: boolean;
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  platform: Platform;
  name: string;
  enabled: boolean;
  color: string;
  order: number;

  accountId: {
    label: string;
    placeholder: string;
    helpText?: string;
  };

  priceTypes: PriceTypeConfig[];
  specificFields: Record<string, FieldConfig>;

  link?: {
    template: string;
    idField: string;
  } | null;

  business: {
    fee: number | null;
    defaultRebate?: number;
    minRebate?: number;
    maxRebate?: number;
  };

  features: {
    priceManagement: boolean;
    performanceTracking: boolean;
    rebateManagement: boolean;
    dataImport: boolean;
  };

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  version?: number;
}

/**
 * API 响应类型
 */
export interface PlatformConfigsResponse {
  success: boolean;
  data?: PlatformConfig[];
  count?: number;
  message?: string;
  timestamp?: string;
}

export interface PlatformConfigResponse {
  success: boolean;
  data?: PlatformConfig;
  message?: string;
  timestamp?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

// ==================== API 方法 ====================

/**
 * 获取所有平台配置
 *
 * @param enabled - 是否只获取启用的平台（可选）
 * @returns 平台配置列表
 */
export async function getPlatformConfigs(
  enabled?: boolean
): Promise<PlatformConfigsResponse> {
  const params: Record<string, any> = {};
  if (enabled !== undefined) {
    params.enabled = enabled;
  }
  return get('/platformConfigManager', params);
}

/**
 * 获取单个平台配置
 *
 * @param platform - 平台标识
 * @returns 平台配置
 */
export async function getPlatformConfig(
  platform: Platform
): Promise<PlatformConfigsResponse> {
  return get('/platformConfigManager', { platform });
}

/**
 * 创建平台配置
 *
 * @param data - 平台配置数据
 * @returns 创建结果
 */
export async function createPlatformConfig(
  data: PlatformConfig
): Promise<ApiResponse> {
  return post('/platformConfigManager', data);
}

/**
 * 更新平台配置
 *
 * @param data - 要更新的配置数据（必须包含 platform 字段）
 * @returns 更新结果
 */
export async function updatePlatformConfig(
  data: Partial<PlatformConfig> & { platform: Platform }
): Promise<ApiResponse> {
  return put('/platformConfigManager', data);
}

/**
 * 删除平台配置（软删除）
 *
 * @param platform - 平台标识
 * @returns 删除结果
 */
export async function deletePlatformConfig(
  platform: Platform
): Promise<ApiResponse> {
  return del('/platformConfigManager', { platform });
}
