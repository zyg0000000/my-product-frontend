/**
 * 公司返点库 API
 */

import { post } from './client';
import type { Platform } from '../types/talent';
import type {
  ParsedExcelRecord,
  ImportResponse,
  ListVersionsResponse,
  DeleteVersionResponse,
  SetDefaultVersionResponse,
  CompareResponse,
} from '../pages/Talents/RebateComparison/types';

/**
 * 导入新版本
 *
 * @param records - 解析后的 Excel 记录
 * @param fileName - 源文件名
 * @param note - 备注（可选）
 */
export async function importCompanyRebates(
  records: ParsedExcelRecord[],
  fileName: string,
  note?: string
): Promise<ImportResponse> {
  return post<ImportResponse>('/companyRebateLibrary', {
    operation: 'import',
    data: {
      records,
      fileName,
      note,
    },
  });
}

/**
 * 获取版本列表
 */
export async function listCompanyRebateVersions(): Promise<ListVersionsResponse> {
  return post<ListVersionsResponse>('/companyRebateLibrary', {
    operation: 'listVersions',
  });
}

/**
 * 删除指定版本
 *
 * @param importId - 版本ID
 */
export async function deleteCompanyRebateVersion(
  importId: string
): Promise<DeleteVersionResponse> {
  return post<DeleteVersionResponse>('/companyRebateLibrary', {
    operation: 'deleteVersion',
    data: { importId },
  });
}

/**
 * 设置默认版本
 *
 * @param importId - 版本ID
 */
export async function setDefaultCompanyRebateVersion(
  importId: string
): Promise<SetDefaultVersionResponse> {
  return post<SetDefaultVersionResponse>('/companyRebateLibrary', {
    operation: 'setDefaultVersion',
    data: { importId },
  });
}

/**
 * 获取对比结果
 *
 * @param platform - 平台
 * @param importId - 版本ID（可选，默认使用默认版本）
 */
export async function compareCompanyRebates(
  platform: Platform,
  importId?: string
): Promise<CompareResponse> {
  return post<CompareResponse>('/companyRebateLibrary', {
    operation: 'compare',
    data: {
      platform,
      importId,
    },
  });
}
