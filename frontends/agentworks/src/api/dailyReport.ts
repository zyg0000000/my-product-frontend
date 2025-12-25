/**
 * 日报 API 服务层
 * @module api/dailyReport
 * @description AgentWorks 项目日报追踪功能 API
 *
 * 包含:
 * - 日报数据读写
 * - 分组管理（CRUD）
 * - 调度配置和执行记录
 */

import { get, post, put, del } from './client';
import type {
  DailyReportData,
  TrackingOverviewData,
  GetDailyReportParams,
  GetTalentTrendParams,
  TalentTrendDataRaw,
  SaveDailyStatsRequest,
  SaveReportSolutionRequest,
  TrackingConfig,
  SchedulerConfig,
  EligibleProject,
  ScheduledExecution,
} from '../types/dailyReport';
import type { DailyReportGroup } from '../types/dailyReportGroup';

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
 * @param params - 查询参数（projectId, date, includePrevious, forceRefresh）
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
  if (params.forceRefresh) {
    queryParams.forceRefresh = 'true';
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

// ============================================================================
// 分组管理 API（使用 action 参数路由）
// ============================================================================

/**
 * 获取所有分组
 */
export async function getGroups(): Promise<DailyReportGroup[]> {
  const response = await get<ApiResponse<DailyReportGroup[]>>(
    DAILY_REPORT_API,
    { action: 'getGroups' }
  );

  if (!response.success) {
    throw new Error(response.message || '获取分组列表失败');
  }

  return response.data || [];
}

/**
 * 创建分组
 */
export async function createGroup(data: {
  name?: string;
  primaryProjectId: string;
  projectIds: string[];
}): Promise<DailyReportGroup> {
  const response = await post<ApiResponse<DailyReportGroup>>(DAILY_REPORT_API, {
    ...data,
    action: 'createGroup',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '创建分组失败');
  }

  return response.data;
}

/**
 * 更新分组
 */
export async function updateGroup(
  groupId: string,
  data: {
    name?: string;
    primaryProjectId?: string;
    projectIds?: string[];
  }
): Promise<DailyReportGroup> {
  const response = await put<ApiResponse<DailyReportGroup>>(DAILY_REPORT_API, {
    ...data,
    action: 'updateGroup',
    id: groupId,
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '更新分组失败');
  }

  return response.data;
}

/**
 * 删除分组
 */
export async function deleteGroup(
  groupId: string
): Promise<{ success: boolean; message: string }> {
  const response = await del<ApiResponse<null>>(DAILY_REPORT_API, undefined, {
    action: 'deleteGroup',
    id: groupId,
  });

  return {
    success: response.success,
    message: response.message || '',
  };
}

// ============================================================================
// 调度配置 API（使用 action 参数路由）
// ============================================================================

/**
 * 获取调度配置
 */
export async function getSchedulerConfig(): Promise<SchedulerConfig> {
  const response = await get<ApiResponse<SchedulerConfig>>(DAILY_REPORT_API, {
    action: 'getSchedulerConfig',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取调度配置失败');
  }

  return response.data;
}

/**
 * 更新调度配置
 */
export async function updateSchedulerConfig(
  config: Partial<SchedulerConfig>
): Promise<SchedulerConfig> {
  const response = await put<ApiResponse<SchedulerConfig>>(DAILY_REPORT_API, {
    ...config,
    action: 'updateSchedulerConfig',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '更新调度配置失败');
  }

  return response.data;
}

/**
 * 获取可选项目列表（仅 active 状态）
 */
export async function getEligibleProjects(): Promise<EligibleProject[]> {
  const response = await get<ApiResponse<EligibleProject[]>>(DAILY_REPORT_API, {
    action: 'getEligibleProjects',
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取项目列表失败');
  }

  return response.data;
}

// ============================================================================
// 执行记录 API（使用 action 参数路由）
// ============================================================================

/**
 * 获取执行记录列表
 */
export async function getExecutions(
  projectId?: string,
  limit: number = 20
): Promise<ScheduledExecution[]> {
  const params: Record<string, string> = {
    action: 'getExecutions',
    limit: String(limit),
  };
  if (projectId) {
    params.projectId = projectId;
  }

  const response = await get<ApiResponse<ScheduledExecution[]>>(
    DAILY_REPORT_API,
    params
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取执行记录失败');
  }

  return response.data;
}

/**
 * 获取单条执行记录详情
 */
export async function getExecutionDetail(
  executionId: string
): Promise<ScheduledExecution> {
  const response = await get<ApiResponse<ScheduledExecution>>(
    DAILY_REPORT_API,
    {
      action: 'getExecutionDetail',
      id: executionId,
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '获取执行记录详情失败');
  }

  return response.data;
}

/**
 * 创建执行记录
 */
export async function createExecution(
  data: Partial<ScheduledExecution>
): Promise<ScheduledExecution> {
  const response = await post<ApiResponse<ScheduledExecution>>(
    DAILY_REPORT_API,
    { ...data, action: 'createExecution' }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '创建执行记录失败');
  }

  return response.data;
}

/**
 * 更新执行记录
 */
export async function updateExecution(
  executionId: string,
  data: Partial<ScheduledExecution>
): Promise<ScheduledExecution> {
  const response = await put<ApiResponse<ScheduledExecution>>(
    DAILY_REPORT_API,
    { ...data, action: 'updateExecution', id: executionId }
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || '更新执行记录失败');
  }

  return response.data;
}
