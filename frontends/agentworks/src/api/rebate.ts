/**
 * 返点管理相关 API
 */

import { get, post } from './client';
import type { Platform } from '../types/talent';
import type {
  GetRebateResponse,
  UpdateRebateRequest,
  UpdateRebateResponse,
  GetRebateHistoryResponse,
  CustomerRebate,
  EffectiveRebate,
} from '../types/rebate';

/**
 * 获取达人返点配置（扩展版，v2.1）
 *
 * @param oneId - 达人唯一标识
 * @param platform - 平台名称
 * @param customerId - 可选，客户编码。传入时会返回客户级返点和生效返点
 * @returns 返点配置信息（含客户级返点和生效返点）
 */
export interface GetTalentRebateParams {
  oneId: string;
  platform: Platform;
  customerId?: string;
}

/**
 * 扩展响应类型（v2.1）
 * 当传入 customerId 时，额外返回 customerRebate 和 effectiveRebate
 */
export interface GetTalentRebateExtendedResponse extends GetRebateResponse {
  data?: GetRebateResponse['data'] & {
    customerRebate?: CustomerRebate | null;
    effectiveRebate?: EffectiveRebate;
  };
}

export async function getTalentRebate(
  oneId: string,
  platform: Platform,
  customerId?: string
): Promise<GetTalentRebateExtendedResponse> {
  const params: Record<string, string> = {
    oneId,
    platform,
  };
  if (customerId) {
    params.customerId = customerId;
  }
  return get<GetTalentRebateExtendedResponse>('/getTalentRebate', params);
}

/**
 * 手动更新达人返点
 *
 * @param request - 更新请求参数
 * @returns 更新结果
 */
export async function updateTalentRebate(
  request: UpdateRebateRequest
): Promise<UpdateRebateResponse> {
  return post<UpdateRebateResponse>('/updateTalentRebate', request);
}

/**
 * 获取返点历史记录参数
 */
export interface GetRebateHistoryParams {
  oneId: string; // 达人唯一标识
  platform: Platform; // 平台名称
  limit?: number; // 每页记录数（默认 20，最大 100）
  offset?: number; // 偏移量（默认 0）
}

/**
 * 获取达人返点历史记录
 *
 * @param params - 查询参数
 * @returns 历史记录列表（分页）
 */
export async function getRebateHistory(
  params: GetRebateHistoryParams
): Promise<GetRebateHistoryResponse> {
  return get<GetRebateHistoryResponse>('/getRebateHistory', {
    oneId: params.oneId,
    platform: params.platform,
    limit: params.limit,
    offset: params.offset,
  });
}

/**
 * 获取返点历史记录（无限滚动加载）
 *
 * @param oneId - 达人唯一标识
 * @param platform - 平台名称
 * @param offset - 偏移量
 * @param limit - 每页记录数
 * @returns 历史记录列表
 */
export async function loadMoreRebateHistory(
  oneId: string,
  platform: Platform,
  offset: number = 0,
  limit: number = 20
): Promise<GetRebateHistoryResponse> {
  return getRebateHistory({
    oneId,
    platform,
    limit,
    offset,
  });
}

/**
 * 同步机构返点到达人参数
 */
export interface SyncAgencyRebateRequest {
  oneId: string; // 达人唯一标识
  platform: Platform; // 平台名称
  changeMode?: boolean; // 是否同时切换模式到sync（可选）
  createdBy?: string; // 操作人（可选）
}

/**
 * 同步机构返点到达人响应
 */
export interface SyncAgencyRebateResponse {
  success: boolean;
  data?: {
    configId: string;
    message: string;
    syncedRate: number;
    effectiveDate: string;
    previousRate: number | null;
  };
  message?: string;
  timestamp?: string;
}

/**
 * 同步机构返点到达人
 *
 * @param request - 同步请求参数
 * @returns 同步结果
 */
export async function syncAgencyRebateToTalent(
  request: SyncAgencyRebateRequest
): Promise<SyncAgencyRebateResponse> {
  return post<SyncAgencyRebateResponse>('/syncAgencyRebateToTalent', request);
}
