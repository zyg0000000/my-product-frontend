/**
 * 机构管理 API
 */

import { get, post, put, del } from './client';
import type { Agency, AgencyFormData } from '../types/agency';
import type { ApiResponse, Platform } from '../types/talent';

/**
 * 获取机构列表
 */
export async function getAgencies(params?: {
  type?: string;
  status?: string;
  search?: string;
}): Promise<ApiResponse<Agency[]>> {
  return get('/agencyManagement', params);
}

/**
 * 获取单个机构详情
 */
export async function getAgencyDetail(
  id: string
): Promise<ApiResponse<Agency>> {
  return get('/agencyManagement', { id });
}

/**
 * 创建机构
 */
export async function createAgency(
  data: AgencyFormData
): Promise<ApiResponse<Agency>> {
  return post('/agencyManagement', data);
}

/**
 * 更新机构
 */
export async function updateAgency(
  id: string,
  data: Partial<AgencyFormData>
): Promise<ApiResponse<Agency>> {
  return put('/agencyManagement', { id, ...data });
}

/**
 * 删除机构
 */
export async function deleteAgency(id: string): Promise<ApiResponse<void>> {
  return del('/agencyManagement', { id });
}

/**
 * 更新机构返点配置（v3.0 - 按平台）
 */
export interface UpdateAgencyRebateRequest {
  agencyId: string; // 必填：机构ID
  platform: Platform; // 必填：平台
  rebateConfig: {
    baseRebate: number;
    effectiveDate?: string;
    updatedBy?: string;
  };
  syncToTalents?: boolean; // 是否立即同步到达人
}

export async function updateAgencyRebate(
  request: UpdateAgencyRebateRequest
): Promise<ApiResponse<Agency>> {
  return put('/agencyRebateConfig', request);
}

/**
 * 机构返点历史记录（v3.0 - 包含平台信息）
 */
export interface AgencyRebateHistoryRecord {
  agencyId: string;
  agencyName: string;
  platform: Platform; // 新增：平台
  previousRate: number;
  newRate: number;
  effectiveDate: string;
  updatedBy: string;
  syncToTalents: boolean;
  createdAt: string;
}

/**
 * 获取机构返点历史记录（v3.0 - 按平台）
 */
export async function getAgencyRebateHistory(params: {
  agencyId: string;
  platform: Platform; // 必填：平台
  limit?: number;
  offset?: number;
}): Promise<
  ApiResponse<{
    records: AgencyRebateHistoryRecord[];
    total: number;
    limit: number;
    offset: number;
    platform: Platform; // 新增：当前查询的平台
  }>
> {
  return get('/getAgencyRebateHistory', params);
}

/**
 * 机构当前返点配置
 */
export interface CurrentAgencyRebateConfig {
  agencyId: string;
  agencyName: string;
  platform: Platform;
  rebateRate: number;
  effectiveDate: string | null;
  lastUpdatedAt: string | null;
  updatedBy: string | null;
  hasConfig: boolean; // 是否已配置
}

/**
 * 获取机构当前返点配置（v3.0 - 按平台）
 */
export async function getCurrentAgencyRebate(params: {
  agencyId: string;
  platform: Platform;
}): Promise<ApiResponse<CurrentAgencyRebateConfig>> {
  return get('/getCurrentAgencyRebate', params);
}
