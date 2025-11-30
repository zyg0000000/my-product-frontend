/**
 * 客户达人池相关类型定义
 */

import type { Platform, TalentTier } from './talent';

/**
 * 客户达人池关联记录状态
 */
export type CustomerTalentStatus = 'active' | 'removed';

/**
 * 客户达人池关联记录
 */
export interface CustomerTalent {
  _id?: string;
  customerId: string; // 客户编码 (如 "CUS202401001")
  talentOneId: string; // 达人统一ID (如 "talent_00000123")
  platform: Platform; // 平台
  tags: string[]; // 自定义标签
  notes: string; // 备注
  status: CustomerTalentStatus;
  addedBy: string; // 添加人
  addedAt: string; // 添加时间
  removedAt?: string; // 移除时间
  cooperationCount: number; // 合作次数（统计缓存）
  lastCooperationDate?: string; // 最近合作时间
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
    talentTier?: TalentTier;
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
    tags?: string[];
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
  tags?: string[];
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
 * 常用标签预设
 */
export const CUSTOMER_TALENT_TAG_PRESETS = [
  '核心',
  '备选',
  '测试',
  '优先',
  '暂停',
  '新晋',
  '重点关注',
];
