/**
 * 日报 API 服务层
 * @module api/dailyReport
 * @description AgentWorks 项目日报追踪功能 API
 */

import { get, post, put } from './client';
import type {
  DailyReportData,
  TrackingOverviewData,
  GetDailyReportParams,
  GetTalentTrendParams,
  TalentTrendDataRaw,
  SaveDailyStatsRequest,
  SaveReportSolutionRequest,
  TrackingConfig,
} from '../types/dailyReport';

// API 基础路径
const DAILY_REPORT_API = '/daily-report-api';

// ============================================================================
// API 响应类型
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ============================================================================
// 日报数据 API
// ============================================================================

/**
 * 获取项目日报数据
 * @param params - 查询参数（projectId, date, includePrevious）
 */
export async function getDailyReport(
  params: GetDailyReportParams
): Promise<DailyReportData> {
  const queryParams: Record<string, string> = {
    projectId: params.projectId,
  };
  if (params.date) {
    queryParams.date = params.date;
  }
  if (params.includePrevious) {
    queryParams.includePrevious = 'true';
  }

  const response = await get<ApiResponse<DailyReportData>>(
    `${DAILY_REPORT_API}/daily-report`,
    queryParams
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取日报数据失败');
  }

  return response.data;
}

/**
 * 批量写入日报数据
 * @param request - 写入请求（projectId, date, data[]）
 */
export async function saveDailyStats(
  request: SaveDailyStatsRequest
): Promise<{ success: boolean; message: string }> {
  const response = await post<ApiResponse<null>>(
    `${DAILY_REPORT_API}/daily-stats`,
    request
  );

  return {
    success: response.success,
    message: response.message || '',
  };
}

/**
 * 保存日报备注
 * @param request - 保存请求（collaborationId, date, solution）
 */
export async function saveReportSolution(
  request: SaveReportSolutionRequest
): Promise<{ success: boolean; message: string }> {
  const response = await post<ApiResponse<null>>(
    `${DAILY_REPORT_API}/report-solution`,
    request
  );

  return {
    success: response.success,
    message: response.message || '',
  };
}

// ============================================================================
// 追踪概览 API
// ============================================================================

/**
 * 获取追踪概览统计
 * @returns 全局追踪统计数据
 */
export async function getTrackingOverview(): Promise<TrackingOverviewData> {
  const response = await get<ApiResponse<TrackingOverviewData>>(
    `${DAILY_REPORT_API}/tracking-overview`
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取追踪概览失败');
  }

  return response.data;
}

/**
 * 获取达人趋势数据（原始数据）
 * @param params - 查询参数（collaborationIds, days）
 * @returns 达人趋势原始数据列表（前端计算 CPM）
 */
export async function getTalentTrend(
  params: GetTalentTrendParams
): Promise<TalentTrendDataRaw[]> {
  const queryParams: Record<string, string> = {
    collaborationIds: params.collaborationIds.join(','),
  };
  if (params.days) {
    queryParams.days = String(params.days);
  }

  const response = await get<ApiResponse<TalentTrendDataRaw[]>>(
    `${DAILY_REPORT_API}/talent-trend`,
    queryParams
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取达人趋势数据失败');
  }

  return response.data;
}

// ============================================================================
// 追踪配置 API（通过 updateProject 实现）
// ============================================================================

/**
 * 更新项目追踪配置
 * @param projectId - 项目 ID
 * @param trackingConfig - 追踪配置
 */
export async function updateTrackingConfig(
  projectId: string,
  trackingConfig: Partial<TrackingConfig>
): Promise<{ success: boolean; message: string }> {
  // 使用 updateProject API 更新 trackingConfig 字段
  // 注意：id 必须放在请求体中，而不是查询参数
  const response = await put<ApiResponse<null>>('/update-project', {
    id: projectId,
    trackingConfig,
  });

  return {
    success: response.success,
    message: response.message || '',
  };
}

/**
 * 启用项目追踪
 * @param projectId - 项目 ID
 * @param benchmarkCPM - 基准 CPM（可选）
 */
export async function enableTracking(
  projectId: string,
  benchmarkCPM?: number
): Promise<{ success: boolean; message: string }> {
  return updateTrackingConfig(projectId, {
    status: 'active',
    benchmarkCPM,
  });
}

/**
 * 归档项目追踪
 * @param projectId - 项目 ID
 */
export async function archiveTracking(
  projectId: string
): Promise<{ success: boolean; message: string }> {
  return updateTrackingConfig(projectId, {
    status: 'archived',
  });
}

/**
 * 停用项目追踪
 * @param projectId - 项目 ID
 */
export async function disableTracking(
  projectId: string
): Promise<{ success: boolean; message: string }> {
  return updateTrackingConfig(projectId, {
    status: 'disabled',
  });
}
