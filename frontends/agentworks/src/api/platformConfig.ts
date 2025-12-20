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
import type { Platform } from '../types/talent';

// ==================== 类型定义 ====================

/**
 * 价格类型配置
 * 注意：key 使用 string 而非 PriceType，允许用户自定义价格类型
 */
export interface PriceTypeConfig {
  key: string;
  label: string;
  required?: boolean;
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
 * 外链数据来源
 * @description 指定从哪个数据对象中获取 ID 字段
 */
export type LinkIdSource =
  | 'talent' // 从达人数据获取（platformSpecific 或顶层字段）
  | 'collaboration'; // 从合作记录获取（如 videoId）

/**
 * 外链配置项
 * @description 单个外链的配置，支持多个外链
 */
export interface LinkConfig {
  name: string; // 链接名称，如"星图主页"（内部标识）
  label: string; // 显示标签，限2个中文字，如"星图"、"抖音"
  template: string; // URL模板，使用 {id} 作为占位符
  idField: string; // ID字段名，如"xingtuId"、"videoId"
  idSource?: LinkIdSource; // 数据来源，默认 'talent'
  showInTalentName?: boolean; // 是否在达人昵称后显示，默认 true（仅 talent 来源有效）
  showInCollaboration?: boolean; // 是否在合作记录中显示，默认 false
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

  /** @deprecated 使用 links 替代，保留用于向后兼容 */
  link?: {
    template: string;
    idField: string;
  } | null;

  /** 外链配置列表（支持多个外链） */
  links?: LinkConfig[] | null;

  business: {
    fee: number | null;
    defaultRebate?: number;
    minRebate?: number;
    maxRebate?: number;
    /** v5.2: 改价下单系数，如 0.8 表示可改价 20%（默认 1.0 表示不支持改价） */
    orderPriceRatio?: number;
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
