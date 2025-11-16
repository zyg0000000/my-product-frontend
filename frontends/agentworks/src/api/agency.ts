/**
 * 机构管理 API
 */

import { get, post, put, del } from './client';
import type { Agency, AgencyFormData } from '../types/agency';
import type { ApiResponse } from '../types/talent';

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
export async function getAgencyDetail(id: string): Promise<ApiResponse<Agency>> {
  return get('/agencyManagement', { id });
}

/**
 * 创建机构
 */
export async function createAgency(data: AgencyFormData): Promise<ApiResponse<Agency>> {
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