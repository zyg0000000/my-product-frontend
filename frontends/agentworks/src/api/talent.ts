/**
 * 达人相关 API
 */

import { get, post, put, del } from './client';
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
  searchTerm?: string;          // 搜索（名称/OneID）
  tiers?: string[];             // 达人层级（前端数组）
  tags?: string[];              // 内容标签（前端数组）
  rebateMin?: number;           // 返点率下限（百分比）
  rebateMax?: number;           // 返点率上限（百分比）
  priceMin?: number;            // 价格下限（元）
  priceMax?: number;            // 价格上限（元）
  priceTiers?: string[];        // 价格档位（前端数组）
  priceMonth?: string;          // 价格月份（YYYY-MM）

  // 兼容旧参数
  agencyId?: string;            // 按机构ID筛选
  groupBy?: 'oneId';            // 按 oneId 分组
  view?: 'simple';
}

/**
 * 获取达人列表响应
 */
export interface GetTalentsResponse {
  success: boolean;

  // 分页模式下返回（v3.3 新增）
  data?: Talent[];
  total?: number;               // 总记录数
  page?: number;                // 当前页
  limit?: number;               // 每页数量
  totalPages?: number;          // 总页数

  // 传统模式下返回（兼容）
  count?: number;               // 记录数
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
