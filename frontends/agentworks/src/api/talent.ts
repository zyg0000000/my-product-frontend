/**
 * 达人相关 API
 */

import { get, post, put, del, type RequestOptions } from './client';
import type { Talent, Platform, ApiResponse } from '../types/talent';

/**
 * 获取达人列表参数
 */
export interface GetTalentsParams {
  platform?: Platform;

  // 分页参数（v3.3 新增）
  page?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'name' | 'fansCount';
  order?: 'asc' | 'desc';

  // 筛选参数（v3.3 新增）
  searchTerm?: string; // 搜索（名称/OneID）
  tiers?: string[]; // 达人层级（前端数组）
  tags?: string[]; // 内容标签（前端数组）
  rebateMin?: number; // 返点率下限（百分比）
  rebateMax?: number; // 返点率上限（百分比）
  priceMin?: number; // 价格下限（元）
  priceMax?: number; // 价格上限（元）
  priceTiers?: string[]; // 价格档位（前端数组）
  priceMonth?: string; // 价格月份（YYYY-MM）

  // 兼容旧参数
  agencyId?: string; // 按机构ID筛选
  groupBy?: 'oneId'; // 按 oneId 分组
  view?: 'simple';
}

/**
 * 获取达人列表响应
 */
export interface GetTalentsResponse {
  success: boolean;

  // 分页模式下返回（v3.3 新增）
  data?: Talent[];
  total?: number; // 总记录数
  page?: number; // 当前页
  limit?: number; // 每页数量
  totalPages?: number; // 总页数

  // 传统模式下返回（兼容）
  count?: number; // 记录数
  view?: string;
  groupBy?: string;

  // 错误信息
  message?: string;
  error?: string;
}

/**
 * 获取达人列表
 */
export async function getTalents(
  params?: GetTalentsParams
): Promise<GetTalentsResponse> {
  // 将数组参数转换为逗号分隔的字符串（后端要求）
  const queryParams: any = { ...params };

  if (Array.isArray(params?.tiers) && params.tiers.length > 0) {
    queryParams.tiers = params.tiers.join(',');
  } else {
    delete queryParams.tiers;
  }

  if (Array.isArray(params?.tags) && params.tags.length > 0) {
    queryParams.tags = params.tags.join(',');
  } else {
    delete queryParams.tags;
  }

  if (Array.isArray(params?.priceTiers) && params.priceTiers.length > 0) {
    queryParams.priceTiers = params.priceTiers.join(',');
  } else {
    delete queryParams.priceTiers;
  }

  return get('/talents', queryParams);
}

/**
 * 获取单个达人详情
 */
export async function getTalentDetail(
  oneId: string,
  platform: Platform
): Promise<ApiResponse<Talent>> {
  return get('/talents', {
    oneId,
    platform,
  });
}

/**
 * 更新达人信息
 */
export interface UpdateTalentData {
  oneId: string;
  platform: Platform;
  [key: string]: any; // 其他可更新字段
}

export async function updateTalent(
  data: UpdateTalentData
): Promise<ApiResponse<void>> {
  return put('/update-talent', data);
}

/**
 * 删除达人（单个平台）
 */
export async function deleteTalent(
  oneId: string,
  platform: Platform
): Promise<ApiResponse<void>> {
  return del('/delete-talent', {
    oneId,
    platform,
  });
}

/**
 * 删除达人（所有平台）
 */
export async function deleteTalentAll(
  oneId: string
): Promise<ApiResponse<void>> {
  return del('/delete-talent', {
    oneId,
    deleteAll: true,
  });
}

/**
 * 创建达人
 */
export interface CreateTalentData {
  oneId?: string; // 可选，如果关联到已有达人
  platform: Platform;
  platformAccountId: string;
  name: string;
  [key: string]: any; // 其他字段
}

export async function createTalent(
  data: CreateTalentData
): Promise<ApiResponse<Talent>> {
  return post('/talents', data);
}

// ==================== getTalentsSearch 高级搜索接口 ====================

/**
 * 筛选条件类型
 */
export interface SearchFilter {
  dimension: string; // 字段名
  operator:
    | '>'
    | '>='
    | '<'
    | '<='
    | '='
    | '!='
    | 'contains'
    | 'notContains'
    | 'between'
    | 'isEmpty'
    | 'isNotEmpty';
  value: any; // 值（between 时为 [min, max] 数组）
}

/**
 * 高级搜索参数 (getTalentsSearch)
 */
export interface SearchTalentsParams {
  // 平台筛选（v2 必需）
  platform?: Platform;

  // 分页参数
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // 基础搜索
  search?: string; // 名称/ID 搜索
  tiers?: string[]; // 达人层级
  types?: string[]; // 达人类型

  // 高级筛选（灵活操作符）
  filters?: SearchFilter[];
  filterLogic?: 'AND' | 'OR';

  // 简化筛选参数（直接值）
  cpmMin?: number;
  cpmMax?: number;
  maleRatioMin?: number;
  maleRatioMax?: number;
  femaleRatioMin?: number;
  femaleRatioMax?: number;

  // 价格/返点筛选
  rebateMin?: number;
  rebateMax?: number;
  priceYear?: number;
  priceMonth?: number;
  priceMin?: number;
  priceMax?: number;
}

/**
 * Dashboard 统计数据
 */
export interface DashboardStats {
  tierDistribution: Array<{ tier: string; count: number }>;
  cpmDistribution: Array<{ _id: number | string; count: number }>;
  maleAudienceDistribution: Array<{ _id: number | string; count: number }>;
  femaleAudienceDistribution: Array<{ _id: number | string; count: number }>;
}

/**
 * 高级搜索响应
 */
export interface SearchTalentsResponse {
  success: boolean;
  dbVersion?: string;
  data?: {
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
    talents: Talent[];
    dashboardStats: DashboardStats;
  };
  message?: string;
  error?: string;
}

/**
 * 高级搜索达人 (使用 getTalentsSearch 接口)
 * 支持更强大的筛选能力和 Dashboard 统计
 *
 * @param params 搜索参数
 * @param options 请求选项（可传入 signal 用于取消请求）
 */
export async function searchTalents(
  params: SearchTalentsParams,
  options?: RequestOptions
): Promise<SearchTalentsResponse> {
  // 构建请求体，自动添加 dbVersion: 'v2' 标识
  const requestBody = {
    dbVersion: 'v2', // agentworks 使用 v2 数据库
    ...params,
  };

  return post('/talents/search', requestBody, options);
}

// ==================== 批量创建达人接口 ====================

/**
 * 批量创建达人 - 单条数据
 */
export interface BulkCreateTalentItem {
  name: string; // 达人昵称（必填）
  platformAccountId: string; // 平台账号ID（必填，如星图ID）
  uid?: string; // 平台UID（可选）
  talentTier?: string; // 达人层级（可选，默认"常规达人"）
  agencyId?: string; // 机构ID（可选，默认"individual"野生达人）
}

/**
 * 批量创建达人请求参数
 */
export interface BulkCreateTalentsParams {
  platform: Platform; // 目标平台（必填）
  talents: BulkCreateTalentItem[]; // 达人数据数组（必填）
}

/**
 * 批量创建达人响应 - 错误详情
 */
export interface BulkCreateError {
  platformAccountId: string;
  name: string;
  reason: string;
}

/**
 * 批量创建达人响应
 */
export interface BulkCreateTalentsResponse {
  success: boolean;
  message?: string;
  dbVersion?: string;
  data?: {
    created: number; // 成功创建数量
    failed: number; // 失败数量
    total: number; // 总提交数量
    errors: BulkCreateError[]; // 失败详情
  };
  error?: string;
}

/**
 * 批量创建达人
 * @param params 批量创建参数
 * @returns 创建结果
 */
export async function bulkCreateTalents(
  params: BulkCreateTalentsParams
): Promise<BulkCreateTalentsResponse> {
  const requestBody = {
    dbVersion: 'v2', // agentworks 使用 v2 数据库
    platform: params.platform,
    talents: params.talents,
  };

  return post('/talents/bulk-create', requestBody);
}

/**
 * 筛选选项响应
 */
export interface FilterOptionsResponse {
  success: boolean;
  data?: {
    tiers: string[]; // 达人层级选项
    types: string[]; // 内容标签选项
  };
  message?: string;
}

/**
 * 获取达人筛选选项（达人层级、内容标签等的唯一值列表）
 * 用于动态填充筛选器的枚举选项
 * @param dbVersion 数据库版本（必填）: v1=kol_data (byteproject), v2=agentworks_db (agentworks)
 */
export async function getTalentFilterOptions(
  dbVersion: 'v1' | 'v2'
): Promise<FilterOptionsResponse> {
  return get('/talents/filter-options', { dbVersion });
}
