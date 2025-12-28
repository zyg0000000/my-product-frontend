/**
 * Automation API 服务层
 * 对接 ECS 服务器和云函数 API
 *
 * @version 2.1.0
 * @description
 * - ECS API: 服务器状态、Cookie 管理、任务执行
 * - 云函数 API: 工作流 CRUD 管理
 *
 * --- UPDATE (v2.1.0) ---
 * - [双数据库] 所有 API 调用自动携带 dbVersion=v2（读写 agentworks_db）
 * - [PUT/DELETE] 正确传递 id 参数到 query string
 */

import { logger } from '../utils/logger';
import { get, post, put, del } from './client';
import type { Platform } from '../types/talent';
import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowsResponse,
  WorkflowResponse,
  WorkflowOperationResponse,
} from '../types/workflow';

// ECS 服务器地址（通过 Cloudflare Tunnel 提供 HTTPS）
const ECS_API_BASE_URL =
  import.meta.env.VITE_ECS_API_URL || 'https://ecs.agent-works.net';

// ========== 类型定义 ==========

/** 服务器状态响应 */
export interface ServerStatus {
  status: 'running' | 'stopped' | 'error';
  uptime: number; // 秒
  memory: {
    used: number; // GB
    total: number; // GB
  };
  timestamp: string;
}

/** Cookie 状态响应 */
export interface CookieStatus {
  valid: boolean;
  expiresAt?: string;
  daysUntilExpiry?: number;
  warning?: boolean;
  cookieCount?: number;
  error?: string;
}

/**
 * ECS 工作流定义（简化版，用于 ECS API 返回）
 * @description 与 types/workflow.ts 中的 Workflow 不同，这是 ECS 返回的简化格式
 */
export interface EcsWorkflow {
  id: string;
  name: string;
  description?: string;
  requiredInput?: 'xingtuId' | 'taskId' | 'videoId' | 'url';
  inputLabel?: string;
  /** 是否启用 VNC 远程桌面模式 */
  enableVNC?: boolean;
}

/** 任务执行请求 */
export interface TaskExecuteRequest {
  workflowId: string;
  inputValue: string;
  /** 是否启用 VNC 远程桌面模式 */
  enableVNC?: boolean;
  metadata?: {
    source?: string;
    projectId?: string;
    talentId?: string;
    collaborationId?: string;
  };
}

/** 任务执行结果 - 单个动作 */
export interface ActionResult {
  action: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: number;
}

/** 任务执行响应 */
export interface TaskExecuteResponse {
  success: boolean;
  taskId: string;
  workflowId: string;
  workflowName: string;
  inputValue: string;
  startTime: string;
  endTime: string;
  duration: number;
  results: ActionResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  error?: string;
}

/** 健康检查响应 */
export interface HealthResponse {
  status: 'ok' | 'error';
}

/** 任务进度（SSE 推送） */
export interface TaskProgress {
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep?: number;
  totalSteps?: number;
  currentAction?: string;
  result?: unknown;
  // 暂停状态时的额外字段（验证码手动处理）
  reason?: 'captcha';
  vncUrl?: string;
  message?: string;
}

/** API 错误 */
export class EcsApiError extends Error {
  statusCode?: number;
  responseData?: unknown;

  constructor(message: string, statusCode?: number, responseData?: unknown) {
    super(message);
    this.name = 'EcsApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

// ========== 请求函数 ==========

/**
 * ECS API 请求封装
 */
async function ecsRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ECS_API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new EcsApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof EcsApiError) {
      throw error;
    }

    // 网络错误
    logger.error('ECS API Request Error:', error);
    throw new EcsApiError(
      error instanceof Error ? error.message : '网络请求失败'
    );
  }
}

// ========== API 方法 ==========

/**
 * 获取服务器状态
 */
export async function getServerStatus(): Promise<ServerStatus> {
  return ecsRequest<ServerStatus>('/api/status');
}

/**
 * 获取 Cookie 状态
 */
export async function getCookieStatus(): Promise<CookieStatus> {
  return ecsRequest<CookieStatus>('/api/cookie-status');
}

/**
 * 获取工作流列表（ECS API）
 * @description 返回 ECS 服务器的简化工作流列表
 */
export async function getWorkflows(): Promise<EcsWorkflow[]> {
  return ecsRequest<EcsWorkflow[]>('/api/workflows');
}

/**
 * 执行任务
 */
export async function executeTask(
  request: TaskExecuteRequest
): Promise<TaskExecuteResponse> {
  return ecsRequest<TaskExecuteResponse>('/api/task/execute', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * 批量执行任务
 */
export async function executeBatchTasks(
  workflowId: string,
  inputValues: string[],
  metadata?: TaskExecuteRequest['metadata']
): Promise<{
  success: boolean;
  totalTasks: number;
  results: TaskExecuteResponse[];
}> {
  return ecsRequest('/api/task/batch', {
    method: 'POST',
    body: JSON.stringify({
      workflowId,
      inputValues,
      metadata,
    }),
  });
}

/**
 * 健康检查
 */
export async function checkHealth(): Promise<HealthResponse> {
  return ecsRequest<HealthResponse>('/health');
}

/**
 * 检查服务器是否可达
 */
export async function checkServerReachable(): Promise<boolean> {
  try {
    const result = await checkHealth();
    return result.status === 'ok';
  } catch {
    return false;
  }
}

/** 恢复任务响应 */
export interface ResumeTaskResponse {
  success: boolean;
  message?: string;
}

/**
 * 恢复暂停的任务（用户完成验证码后调用）
 * @param taskId - 任务 ID
 */
export async function resumeTask(taskId: string): Promise<ResumeTaskResponse> {
  return ecsRequest<ResumeTaskResponse>(`/api/task/${taskId}/resume`, {
    method: 'POST',
  });
}

// ========== SSE 实时进度 ==========

/**
 * 订阅任务进度（SSE）
 * 支持断开后自动重连，最多重试 5 次
 *
 * @param taskId - 任务 ID
 * @param onProgress - 进度回调函数
 * @param onError - 连接错误回调（可选，只在最终失败时调用）
 * @returns 取消订阅函数
 */
export function subscribeToTaskProgress(
  taskId: string,
  onProgress: (progress: TaskProgress) => void,
  onError?: (error: Error) => void
): () => void {
  const url = `${ECS_API_BASE_URL}/api/task/stream/${taskId}`;
  let eventSource: EventSource | null = null;
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 2000; // 2 秒后重连
  let isCancelled = false;
  let isCompleted = false;

  function connect() {
    if (isCancelled || isCompleted) return;

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      logger.info(`[SSE] 连接成功: ${taskId}`);
      retryCount = 0; // 连接成功后重置重试计数
    };

    eventSource.onmessage = event => {
      try {
        const progress = JSON.parse(event.data) as TaskProgress;
        onProgress(progress);

        // 任务完成或失败时标记完成并关闭连接
        if (progress.status === 'completed' || progress.status === 'failed') {
          isCompleted = true;
          eventSource?.close();
        }
      } catch (e) {
        logger.error('SSE 解析进度数据失败:', e);
      }
    };

    eventSource.onerror = () => {
      logger.warn(
        `[SSE] 连接断开: ${taskId}, 重试次数: ${retryCount}/${maxRetries}`
      );
      eventSource?.close();

      // 如果任务已完成或被取消，不重连
      if (isCancelled || isCompleted) return;

      // 重试逻辑
      if (retryCount < maxRetries) {
        retryCount++;
        logger.info(`[SSE] ${retryDelay}ms 后重连 (第 ${retryCount} 次)...`);
        setTimeout(connect, retryDelay);
      } else {
        logger.error(`[SSE] 达到最大重试次数，放弃连接: ${taskId}`);
        onError?.(new Error('SSE 连接失败，已达到最大重试次数'));
      }
    };
  }

  // 开始连接
  connect();

  // 返回取消订阅函数
  return () => {
    isCancelled = true;
    eventSource?.close();
  };
}

/** Cookie 上传响应 */
export interface CookieUploadResponse {
  success: boolean;
  message?: string;
  cookieCount?: number;
  expiresAt?: string;
  daysUntilExpiry?: number;
  error?: string;
}

/**
 * 上传 Cookie 到 ECS
 * @param cookies - Puppeteer 格式的 Cookie 数组
 */
export async function uploadCookie(
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  }>
): Promise<CookieUploadResponse> {
  return ecsRequest<CookieUploadResponse>('/api/cookie/upload', {
    method: 'POST',
    body: JSON.stringify({ cookies }),
  });
}

// ========== 工作流 CRUD API（云函数） ==========

/**
 * 获取工作流列表（从云函数）
 * @param platform - 按平台筛选（可选）
 * @param isActive - 按激活状态筛选（可选）
 */
export async function getWorkflowList(params?: {
  platform?: Platform;
  isActive?: boolean;
}): Promise<WorkflowsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.platform) {
    queryParams.platform = params.platform;
  }
  if (params?.isActive !== undefined) {
    queryParams.isActive = String(params.isActive);
  }
  return get('/automation-workflows', queryParams);
}

/**
 * 获取单个工作流详情
 * @param id - 工作流 ID
 */
export async function getWorkflowById(id: string): Promise<WorkflowResponse> {
  return get('/automation-workflows', { id });
}

/**
 * 创建工作流
 * @param data - 工作流数据
 */
export async function createWorkflow(
  data: CreateWorkflowRequest
): Promise<WorkflowOperationResponse> {
  return post('/automation-workflows', data);
}

/**
 * 更新工作流
 * @param data - 更新数据（必须包含 _id）
 */
export async function updateWorkflow(
  data: UpdateWorkflowRequest
): Promise<WorkflowOperationResponse> {
  const { _id, ...updateData } = data;
  return put('/automation-workflows', updateData, { id: _id });
}

/**
 * 删除工作流
 * @param id - 工作流 ID
 */
export async function deleteWorkflow(
  id: string
): Promise<WorkflowOperationResponse> {
  // 云函数要求 id 必须在 query params 中
  return del('/automation-workflows', undefined, { id });
}

/**
 * 切换工作流激活状态
 * @param id - 工作流 ID
 * @param isActive - 是否激活
 */
export async function toggleWorkflowActive(
  id: string,
  isActive: boolean
): Promise<WorkflowOperationResponse> {
  return put('/automation-workflows', { isActive }, { id });
}

// ========== 导出 API 对象 ==========

export const automationApi = {
  // ECS API
  getServerStatus,
  getCookieStatus,
  getWorkflows,
  executeTask,
  executeBatchTasks,
  checkHealth,
  checkServerReachable,
  uploadCookie,
  resumeTask,

  // SSE 实时进度
  subscribeToTaskProgress,

  // 工作流 CRUD API（云函数）
  getWorkflowList,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflowActive,
};

// 重新导出工作流类型（从 types/workflow.ts）
export type {
  Workflow,
  WorkflowListItem,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowsResponse,
  WorkflowResponse,
  WorkflowOperationResponse,
} from '../types/workflow';
