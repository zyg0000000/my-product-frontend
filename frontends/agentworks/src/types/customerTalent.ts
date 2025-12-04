/**
 * 客户达人池相关类型定义
 */

import type { Platform } from './talent';

/**
 * 客户达人池关联记录状态
 */
export type CustomerTalentStatus = 'active' | 'removed';

/**
 * 重要程度类型（5级）
 */
export type ImportanceLevel =
  | 'core'
  | 'key'
  | 'normal'
  | 'backup'
  | 'observe'
  | null;

/**
 * 客户达人池标签结构（v2.0）
 */
export interface CustomerTalentTags {
  /** 重要程度（单选，5级） */
  importance: ImportanceLevel;
  /** 业务标签（多选，key 数组） */
  businessTags: string[];
}

/**
 * 标签配置项 (v2.0)
 * 支持自定义背景色和文字颜色
 */
export interface TagConfigItem {
  key: string;
  name: string;
  /** 背景色（十六进制，如 #dbeafe） */
  bgColor: string;
  /** 文字色（十六进制，如 #1e40af） */
  textColor: string;
  sortOrder: number;
  description?: string;
  /** 兼容旧版 Ant Design 预设颜色名（只读，不再使用） */
  color?: string;
}

/**
 * 标签配置（从系统配置读取）
 */
export interface TalentTagConfigs {
  importanceLevels: TagConfigItem[];
  businessTags: TagConfigItem[];
}

/**
 * 客户达人池关联记录
 */
export interface CustomerTalent {
  _id?: string;
  customerId: string; // 客户编码 (如 "CUS202401001")
  talentOneId: string; // 达人统一ID (如 "talent_00000123")
  platform: Platform; // 平台

  /**
   * 标签（v2.0 结构化标签）
   * - importance: 重要程度（单选）
   * - businessTags: 业务标签（多选）
   *
   * 兼容旧数据：如果是 string[]，前端需要转换
   */
  tags: CustomerTalentTags | string[];

  notes: string; // 备注
  status: CustomerTalentStatus;
  addedBy: string; // 添加人
  addedAt: string; // 添加时间
  removedAt?: string; // 移除时间
  cooperationCount: number; // 合作次数（统计缓存）
  lastCooperationDate?: string; // 最近合作时间

  // 权限预留字段
  organizationId?: string | null;
  departmentId?: string | null;
  updatedBy?: string;
  updatedAt?: string;
}

/**
 * 带达人信息的客户达人池记录（关联查询结果）
 */
export interface CustomerTalentWithInfo extends CustomerTalent {
  talentInfo?: {
    _id: string;
    oneId: string;
    platform: Platform;
    name: string;
    fansCount?: number;
    talentType?: string[];
    agencyId?: string;
  };
}

/**
 * 各平台达人数统计
 */
export interface CustomerTalentStats {
  customerId: string;
  platformStats: Record<string, number>;
  totalCount: number;
}

/**
 * 添加达人到客户池的请求参数
 */
export interface AddCustomerTalentsRequest {
  customerId: string;
  platform: Platform;
  talents: Array<{
    oneId: string;
    /** v2.0 结构化标签 */
    tags?: CustomerTalentTags;
    notes?: string;
  }>;
}

/**
 * 添加达人到客户池的响应
 */
export interface AddCustomerTalentsResponse {
  success: boolean;
  message: string;
  insertedCount: number;
  restoredCount: number;
  duplicates?: Array<{ talentOneId: string; name: string }>;
  notFound?: Array<{ talentOneId: string; platform: string; reason: string }>;
}

/**
 * 更新客户达人池记录的请求参数
 */
export interface UpdateCustomerTalentRequest {
  /** v2.0 结构化标签 */
  tags?: CustomerTalentTags;
  notes?: string;
}

/**
 * 查询客户达人池的参数
 */
export interface GetCustomerTalentsParams {
  customerId?: string;
  talentOneId?: string;
  platform?: Platform;
  status?: CustomerTalentStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'addedAt' | 'cooperationCount' | 'lastCooperationDate';
  sortOrder?: 'asc' | 'desc';
  includeTalentInfo?: boolean;
}

/**
 * 客户达人池分页响应
 */
export interface CustomerTalentListResponse {
  list: CustomerTalentWithInfo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 默认空标签（用于初始化）
 */
export const DEFAULT_CUSTOMER_TALENT_TAGS: CustomerTalentTags = {
  importance: null,
  businessTags: [],
};

/**
 * 判断标签是否为新版结构化格式
 */
export function isStructuredTags(
  tags: CustomerTalentTags | string[]
): tags is CustomerTalentTags {
  return (
    tags !== null &&
    typeof tags === 'object' &&
    !Array.isArray(tags) &&
    'importance' in tags
  );
}

/**
 * 旧版标签转换为新版结构
 * 用于兼容历史数据
 */
export function convertLegacyTags(tags: string[]): CustomerTalentTags {
  // 重要程度映射（旧标签 -> 新 key）
  const importanceMap: Record<string, ImportanceLevel> = {
    核心: 'core',
    重点: 'key',
    重点关注: 'key',
    常规: 'normal',
    备选: 'backup',
    观察: 'observe',
    测试: 'observe',
  };

  let importance: ImportanceLevel = null;
  const businessTags: string[] = [];

  for (const tag of tags) {
    if (importanceMap[tag] && !importance) {
      importance = importanceMap[tag];
    } else {
      // 其他标签暂时丢弃（不在预设列表中）
      // 如果需要保留，可以添加到 businessTags
    }
  }

  return { importance, businessTags };
}

/**
 * 获取规范化的标签对象
 */
export function getNormalizedTags(
  tags: CustomerTalentTags | string[] | undefined
): CustomerTalentTags {
  if (!tags) return DEFAULT_CUSTOMER_TALENT_TAGS;
  if (isStructuredTags(tags)) return tags;
  return convertLegacyTags(tags);
}
