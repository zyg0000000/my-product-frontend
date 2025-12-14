/**
 * 客户达人池 API
 * 实现客户与达人的多对多关联管理
 */

import { get, post, apiRequest } from './client';
import type {
  CustomerTalentListResponse,
  CustomerTalentStats,
  AddCustomerTalentsRequest,
  AddCustomerTalentsResponse,
  UpdateCustomerTalentRequest,
  GetCustomerTalentsParams,
  CustomerTalentWithInfo,
  TalentTagConfigs,
  CustomerTalentTags,
} from '../types/customerTalent';
import type { Platform } from '../types/talent';
import type {
  GetCustomerRebateResponse,
  UpdateCustomerRebateRequest,
  UpdateCustomerRebateResponse,
  BatchUpdateCustomerRebateRequest,
  BatchUpdateCustomerRebateResponse,
} from '../types/rebate';

const ENDPOINT = '/customerTalents';

/**
 * API 响应包装类型
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 获取客户某平台的达人池列表
 */
export async function getCustomerTalents(
  params: GetCustomerTalentsParams
): Promise<CustomerTalentListResponse> {
  const response = await get<ApiResponse<CustomerTalentListResponse>>(
    ENDPOINT,
    {
      ...params,
      includeTalentInfo: params.includeTalentInfo !== false ? 'true' : 'false',
    }
  );
  return response.data;
}

/**
 * 获取客户各平台达人数统计
 */
export async function getCustomerTalentStats(
  customerId: string
): Promise<CustomerTalentStats> {
  const response = await get<ApiResponse<CustomerTalentStats>>(ENDPOINT, {
    action: 'stats',
    customerId,
  });
  return response.data;
}

/**
 * 获取达人所属的客户列表
 */
export async function getTalentCustomers(
  talentOneId: string,
  platform?: Platform
): Promise<CustomerTalentListResponse> {
  const response = await get<ApiResponse<CustomerTalentListResponse>>(
    ENDPOINT,
    {
      talentOneId,
      platform,
      includeTalentInfo: 'false',
    }
  );
  return response.data;
}

/**
 * 添加达人到客户池（支持批量）
 */
export async function addCustomerTalents(
  request: AddCustomerTalentsRequest
): Promise<AddCustomerTalentsResponse> {
  const response = await post<ApiResponse<AddCustomerTalentsResponse>>(
    ENDPOINT,
    request
  );
  return response.data;
}

/**
 * 从客户池移除达人
 */
export async function removeCustomerTalent(
  id: string,
  permanent = false
): Promise<{ message: string }> {
  const url = `${ENDPOINT}?id=${id}${permanent ? '&permanent=true' : ''}`;
  const response = await apiRequest<ApiResponse<{ message: string }>>(url, {
    method: 'DELETE',
  });
  return response.data;
}

/**
 * 更新客户达人池记录（标签/备注）
 * 使用 PUT 方法（比 PATCH 更广泛支持）
 */
export async function updateCustomerTalent(
  id: string,
  request: UpdateCustomerTalentRequest
): Promise<CustomerTalentWithInfo> {
  const url = `${ENDPOINT}?id=${id}&action=update`;
  const response = await apiRequest<ApiResponse<CustomerTalentWithInfo>>(url, {
    method: 'PUT',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

/**
 * 批量检查达人是否已在客户池中
 * @param customerId 客户ID
 * @param platform 平台
 * @param talentOneIds 达人ID列表
 * @returns 已存在的达人ID集合
 */
export async function checkExistingTalents(
  customerId: string,
  platform: Platform,
  talentOneIds: string[]
): Promise<Set<string>> {
  const response = await getCustomerTalents({
    customerId,
    platform,
    pageSize: 9999, // 获取所有
    includeTalentInfo: false,
  });

  const existingIds = new Set(response.list.map(item => item.talentOneId));
  return new Set(talentOneIds.filter(id => existingIds.has(id)));
}

/**
 * 获取达人标签配置
 * 从 system_config 集合获取全局标签配置
 */
export async function getTagConfigs(): Promise<TalentTagConfigs> {
  const response = await get<ApiResponse<TalentTagConfigs>>(ENDPOINT, {
    action: 'getTagConfigs',
  });
  return response.data;
}

/**
 * 更新达人标签配置
 * 更新 system_config 集合中的标签配置
 */
export async function updateTagConfigs(
  configs: TalentTagConfigs
): Promise<{ success: boolean; version: number }> {
  const response = await post<
    ApiResponse<{ success: boolean; version: number }>
  >(`${ENDPOINT}?action=updateTagConfigs`, configs);
  return response.data;
}

/**
 * 批量更新达人标签
 * @param ids 客户达人池记录ID列表（最多100个）
 * @param tags 要设置的标签
 * @param mode 更新模式：replace=替换所有标签，merge=合并业务标签
 */
export async function batchUpdateTags(request: {
  ids: string[];
  tags: CustomerTalentTags;
  mode?: 'replace' | 'merge';
}): Promise<{ success: boolean; modifiedCount: number }> {
  const response = await post<
    ApiResponse<{ success: boolean; modifiedCount: number }>
  >(`${ENDPOINT}?action=batchUpdateTags`, request);
  return response.data;
}

/**
 * ========== 达人全景搜索 API ==========
 */

/**
 * 达人全景搜索请求参数
 */
export interface PanoramaSearchParams {
  /** 平台（必填） */
  platform: Platform;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;

  // --- 基础筛选 ---
  /** 搜索词（达人名称/OneID） */
  searchTerm?: string;
  /** 返点范围 - 最小值（小数，如 0.1 = 10%） */
  rebateMin?: number;
  /** 返点范围 - 最大值 */
  rebateMax?: number;
  /** 价格范围 - 最小值 */
  priceMin?: number;
  /** 价格范围 - 最大值 */
  priceMax?: number;
  /** 价格档位类型（如 video_60plus, video_21_60, video_1_20）v2.6 新增 */
  priceType?: string;
  /** 内容标签（多选） */
  contentTags?: string[];

  // --- 客户视角筛选 ---
  /** 客户名称（单选，向后兼容） */
  customerName?: string;
  /** 客户名称列表（多选） */
  customerNames?: string[];
  /** 重要程度（多选，依赖客户选择） */
  importance?: string[];
  /** 业务标签（多选，依赖客户选择） */
  businessTags?: string[];

  // --- 表现筛选 ---
  /** 表现数据筛选（字段名 -> {min, max}） */
  performanceFilters?: Record<string, { min?: number; max?: number }>;

  // --- 字段选择（v2.4 新增） ---
  /**
   * 请求返回的字段列表
   * 不传则返回默认字段（oneId, name, platform, rebate, prices, contentTags, followerCount, customerRelations）
   * 可选字段请参考 FIELD_WHITELIST（后端定义）或 PANORAMA_FIELDS（前端配置）
   */
  fields?: string[];

  // --- 排序（v2.8 新增） ---
  /** 排序字段（如 cpm60sExpected, audienceGenderMale 等） */
  sortField?: string;
  /** 排序方向（asc 升序, desc 降序，默认 asc） */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 客户关系信息（多客户模式）
 */
export interface CustomerRelation {
  /** 客户ID */
  customerId: string;
  /** 客户名称 */
  customerName: string;
  /** 重要程度 */
  importance?: string;
  /** 业务标签 */
  businessTags?: string[];
  /** 备注 */
  notes?: string;
}

/**
 * 达人全景搜索结果项
 */
export interface PanoramaTalentItem {
  /** 达人唯一ID */
  oneId: string;
  /** 达人名称 */
  name: string;
  /** 平台 */
  platform: Platform;
  /** 平台账号ID（星图ID等） */
  platformAccountId?: string;
  /** 平台特定字段（如抖音UID等） */
  platformSpecific?: Record<string, string>;
  /** 返点比例 */
  rebate?: number;
  /** 价格信息 */
  prices?: Record<string, number>;
  /** 内容标签 */
  contentTags?: string[];
  /** 粉丝数 */
  followerCount?: number;
  /** 客户关系列表（客户视角模式下返回） */
  customerRelations?: CustomerRelation[] | null;
  /** 表现数据（最新快照） */
  performance?: Record<string, number> | null;
}

/**
 * 视角模式
 */
export type ViewMode = 'all' | 'customer';

/**
 * 达人全景搜索响应
 */
export interface PanoramaSearchResponse {
  /** 达人列表 */
  list: PanoramaTalentItem[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 当前视角模式 */
  viewMode?: ViewMode;
  /** 已选客户列表（客户视角模式） */
  selectedCustomers?: string[] | null;
  /** 实际返回的字段列表（v2.4 新增） */
  fields?: string[];
}

/**
 * 达人全景搜索
 *
 * 支持多维度筛选：
 * - 基础筛选：搜索词、返点范围、价格范围、内容标签
 * - 客户筛选：客户名称、重要程度、业务标签（需先选择客户）
 * - 表现筛选：从 dimension_config 配置的表现维度
 *
 * @param params 搜索参数
 * @returns 分页搜索结果
 */
export async function panoramaSearch(
  params: PanoramaSearchParams,
  options?: { signal?: AbortSignal }
): Promise<PanoramaSearchResponse> {
  // 构建查询参数
  const queryParams: Record<string, string | undefined> = {
    action: 'panoramaSearch',
    platform: params.platform,
    page: params.page?.toString(),
    pageSize: params.pageSize?.toString(),
    // 基础筛选
    searchTerm: params.searchTerm,
    rebateMin: params.rebateMin?.toString(),
    rebateMax: params.rebateMax?.toString(),
    priceMin: params.priceMin?.toString(),
    priceMax: params.priceMax?.toString(),
    priceType: params.priceType, // v2.6: 价格档位类型
    contentTags: params.contentTags?.join(','),
    // 客户筛选（多客户模式用 customerNames，单客户向后兼容用 customerName）
    customerNames: params.customerNames?.join(','),
    customerName: params.customerName,
    importance: params.importance?.join(','),
    businessTags: params.businessTags?.join(','),
    // 表现筛选
    performanceFilters: params.performanceFilters
      ? JSON.stringify(params.performanceFilters)
      : undefined,
    // 字段选择（v2.4 新增）
    fields: params.fields?.join(','),
    // 排序（v2.8 新增）
    sortField: params.sortField,
    sortOrder: params.sortOrder,
  };

  // 移除 undefined 值
  const cleanParams = Object.fromEntries(
    Object.entries(queryParams).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  const response = await get<ApiResponse<PanoramaSearchResponse>>(
    ENDPOINT,
    cleanParams,
    { signal: options?.signal }
  );
  return response.data;
}

// ========== 客户返点管理 API (v2.9 新增) ==========

/**
 * 获取客户达人返点详情
 * 返回客户级返点、达人默认返点、生效返点和历史记录
 */
export async function getCustomerRebate(
  customerId: string,
  talentOneId: string,
  platform: Platform
): Promise<GetCustomerRebateResponse> {
  const response = await get<GetCustomerRebateResponse>(ENDPOINT, {
    action: 'getCustomerRebate',
    customerId,
    talentOneId,
    platform,
  });
  return response;
}

/**
 * 更新单个客户达人返点
 */
export async function updateCustomerRebate(
  request: UpdateCustomerRebateRequest
): Promise<UpdateCustomerRebateResponse> {
  const response = await post<UpdateCustomerRebateResponse>(
    `${ENDPOINT}?action=updateCustomerRebate`,
    request
  );
  return response;
}

/**
 * 批量更新客户达人返点
 */
export async function batchUpdateCustomerRebate(
  request: BatchUpdateCustomerRebateRequest
): Promise<BatchUpdateCustomerRebateResponse> {
  const response = await post<BatchUpdateCustomerRebateResponse>(
    `${ENDPOINT}?action=batchUpdateCustomerRebate`,
    request
  );
  return response;
}
