/**
 * 调度器 API 服务层
 * @module api/scheduler
 * @description 全局调度配置和执行记录 API
 */

import { get, put, post } from './client';
import type {
  SchedulerConfig,
  EligibleProject,
  ScheduledExecution,
} from '../types/scheduler';

// API 基础路径（合并后的单一端点）
const SCHEDULER_API = '/scheduler-api';

// ============================================================================
// API 响应类型
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ============================================================================
// 调度配置 API
// ============================================================================

/**
 * 获取全局调度配置
 */
export async function getSchedulerConfig(): Promise<SchedulerConfig> {
  const response = await get<ApiResponse<SchedulerConfig>>(
    `${SCHEDULER_API}/config`
  );
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
  const response = await put<ApiResponse<SchedulerConfig>>(
    `${SCHEDULER_API}/config`,
    config
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || '更新调度配置失败');
  }
  return response.data;
}

/**
 * 获取可选项目列表（仅 active 状态）
 */
export async function getEligibleProjects(): Promise<EligibleProject[]> {
  const response = await get<ApiResponse<EligibleProject[]>>(
    `${SCHEDULER_API}/config/projects`
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取项目列表失败');
  }
  return response.data;
}

// ============================================================================
// 执行记录 API
// ============================================================================

/**
 * 获取执行记录列表
 */
export async function getExecutions(
  projectId?: string,
  limit: number = 20
): Promise<ScheduledExecution[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (projectId) {
    params.projectId = projectId;
  }

  const response = await get<ApiResponse<ScheduledExecution[]>>(
    `${SCHEDULER_API}/executions`,
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
    `${SCHEDULER_API}/executions/${executionId}`
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
    `${SCHEDULER_API}/executions`,
    data
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
    `${SCHEDULER_API}/executions/${executionId}`,
    data
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || '更新执行记录失败');
  }
  return response.data;
}
