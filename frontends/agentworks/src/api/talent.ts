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
  agencyId?: string; // 按机构ID筛选
  groupBy?: 'oneId'; // 按 oneId 分组
  view?: 'simple';
}

/**
 * 获取达人列表
 */
export async function getTalents(
  params?: GetTalentsParams
): Promise<ApiResponse<Talent[]>> {
  return get('/talents', params);
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
