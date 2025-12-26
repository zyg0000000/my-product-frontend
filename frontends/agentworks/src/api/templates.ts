/**
 * 报告模板 API 服务层
 *
 * @description
 * - 模板 CRUD 操作
 * - 飞书表头加载
 * - 数据源映射配置获取
 */

import { get, post, put, del } from './client';
import type {
  ReportTemplate,
  ReportTemplateListItem,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  MappingSchemas,
  TemplateApiResponse,
} from '../types/template';

// ========== 模板 CRUD API ==========

/**
 * 获取模板列表
 * @param type - 模板类型筛选（可选）
 */
export async function getTemplates(
  type?: 'registration' | 'general'
): Promise<TemplateApiResponse<ReportTemplateListItem[]>> {
  const params: Record<string, string> = {};
  if (type) {
    params.type = type;
  }
  return get('/report-templates', params);
}

/**
 * 获取单个模板详情
 * @param id - 模板 ID
 */
export async function getTemplateById(
  id: string
): Promise<TemplateApiResponse<ReportTemplate>> {
  return get('/report-templates', { id });
}

/**
 * 创建模板
 * @param data - 模板数据
 */
export async function createTemplate(
  data: CreateTemplateRequest
): Promise<TemplateApiResponse<ReportTemplate>> {
  return post('/report-templates', data);
}

/**
 * 更新模板
 * @param data - 更新数据（必须包含 _id）
 */
export async function updateTemplate(
  data: UpdateTemplateRequest
): Promise<TemplateApiResponse<ReportTemplate>> {
  const { _id, ...updateData } = data;
  return put('/report-templates', updateData, { id: _id });
}

/**
 * 删除模板
 * @param id - 模板 ID
 */
export async function deleteTemplate(
  id: string
): Promise<TemplateApiResponse<void>> {
  return del('/report-templates', undefined, { id });
}

// ========== 飞书辅助 API ==========

/**
 * 获取数据源映射配置（用于映射规则下拉菜单）
 * @param source - 数据源类型，默认 'registration'
 */
export async function getMappingSchemas(
  source: 'registration' | 'automation' = 'registration'
): Promise<TemplateApiResponse<MappingSchemas>> {
  return get('/sync-from-feishu', {
    dataType: 'getMappingSchemas',
    source,
  });
}

/**
 * 加载飞书表格表头
 * @param spreadsheetToken - 飞书表格 Token 或 URL
 */
export async function loadSheetHeaders(
  spreadsheetToken: string
): Promise<TemplateApiResponse<string[]>> {
  const result = await post<{
    success: boolean;
    headers?: string[];
    data?: { headers?: string[] };
    message?: string;
    error?: string;
  }>('/sync-from-feishu', {
    dataType: 'getSheetHeaders',
    payload: { spreadsheetToken },
  });
  return {
    success: result.success,
    data: result.headers || result.data?.headers || [],
    message: result.message,
    error: result.error,
  };
}

// ========== 导出 API 对象 ==========

export const templatesApi = {
  // 模板 CRUD
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,

  // 飞书辅助
  getMappingSchemas,
  loadSheetHeaders,
};
