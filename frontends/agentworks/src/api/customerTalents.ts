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
} from '../types/customerTalent';
import type { Platform } from '../types/talent';

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
 */
export async function updateCustomerTalent(
  id: string,
  request: UpdateCustomerTalentRequest
): Promise<CustomerTalentWithInfo> {
  const url = `${ENDPOINT}?id=${id}`;
  const response = await apiRequest<ApiResponse<CustomerTalentWithInfo>>(url, {
    method: 'PATCH',
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
