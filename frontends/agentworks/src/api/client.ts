/**
 * API 客户端配置
 * Phase 2: 增强版 - 支持请求取消、重试机制、统一错误处理
 */

import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/api';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

const DB_VERSION = 'v2'; // 使用 v2 数据库（agentworks_db）

// ========== 配置常量 ==========

/** 默认请求超时时间（毫秒） */
const DEFAULT_TIMEOUT = 30000;

/** 默认重试次数 */
const DEFAULT_RETRY_COUNT = 2;

/** 重试延迟基数（毫秒），实际延迟 = BASE * 2^attempt */
const RETRY_DELAY_BASE = 1000;

/** 可重试的 HTTP 状态码 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// ========== 类型定义 ==========

/** 请求参数值类型 */
type RequestParamValue =
  | string
  | number
  | boolean
  | string[]
  | undefined
  | null;

/** 请求体数据类型 - 使用泛型约束允许任意对象类型 */
type RequestBodyData = object;

/** 请求配置选项 */
export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数（0 表示不重试） */
  retryCount?: number;
  /** AbortController 信号，用于外部取消请求 */
  signal?: AbortSignal;
  /** 是否跳过重试 */
  skipRetry?: boolean;
}

/** API 错误类型 */
export class ApiError extends Error {
  statusCode?: number;
  responseData?: unknown;

  constructor(message: string, statusCode?: number, responseData?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

// ========== 工具函数 ==========

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算重试延迟时间（指数退避）
 */
function getRetryDelay(attempt: number): number {
  return RETRY_DELAY_BASE * Math.pow(2, attempt);
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
  // 网络错误可重试
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // 特定状态码可重试
  if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
    return true;
  }

  return false;
}

/**
 * 创建带超时的 AbortController
 */
function createTimeoutController(
  timeout: number,
  externalSignal?: AbortSignal
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();

  // 设置超时
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('请求超时'));
  }, timeout);

  // 监听外部取消信号
  const abortHandler = () => {
    controller.abort(externalSignal?.reason || new Error('请求已取消'));
  };

  if (externalSignal) {
    externalSignal.addEventListener('abort', abortHandler);
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortHandler);
    }
  };

  return { controller, cleanup };
}

// ========== 核心请求函数 ==========

/**
 * 通用请求函数（增强版）
 * - 支持请求超时
 * - 支持请求取消
 * - 支持自动重试
 * - 统一错误处理
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retryCount = DEFAULT_RETRY_COUNT,
    signal: externalSignal,
    skipRetry = false,
    ...fetchOptions
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
  };

  // 重试逻辑
  let lastError: unknown;
  const maxAttempts = skipRetry ? 1 : retryCount + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 创建带超时的 controller
    const { controller, cleanup } = createTimeoutController(
      timeout,
      externalSignal
    );

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      cleanup();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText,
        }));

        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;

        // 判断是否需要重试
        if (
          attempt < maxAttempts - 1 &&
          isRetryableError(null, response.status)
        ) {
          const retryDelay = getRetryDelay(attempt);
          logger.warn(
            `请求失败 (${response.status})，${retryDelay}ms 后重试... (${attempt + 1}/${maxAttempts - 1})`
          );
          await delay(retryDelay);
          continue;
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      cleanup();

      // 请求被取消，不重试
      if (error instanceof Error && error.name === 'AbortError') {
        const reason = error.message === '请求超时' ? '请求超时' : '请求已取消';
        logger.warn(`API 请求中断: ${reason}`, endpoint);
        throw new ApiError(reason);
      }

      lastError = error;

      // 判断是否需要重试
      if (attempt < maxAttempts - 1 && isRetryableError(error)) {
        const retryDelay = getRetryDelay(attempt);
        logger.warn(
          `请求出错，${retryDelay}ms 后重试... (${attempt + 1}/${maxAttempts - 1})`
        );
        await delay(retryDelay);
        continue;
      }
    }
  }

  // 所有重试都失败
  logger.error('API Request Error:', lastError);

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(getErrorMessage(lastError));
}

// ========== HTTP 方法封装 ==========

/**
 * GET 请求
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, RequestParamValue>,
  options?: RequestOptions
): Promise<T> {
  let url = endpoint;

  // 合并 dbVersion 到参数中
  const allParams = {
    dbVersion: DB_VERSION,
    ...params,
  };

  const queryString = new URLSearchParams(
    Object.entries(allParams).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>
    )
  ).toString();

  if (queryString) {
    url += `?${queryString}`;
  }

  return apiRequest<T>(url, {
    method: 'GET',
    ...options,
  });
}

/**
 * POST 请求
 */
export async function post<T>(
  endpoint: string,
  data?: RequestBodyData,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      dbVersion: DB_VERSION,
      ...data,
    }),
    ...options,
  });
}

/**
 * PUT 请求
 */
export async function put<T>(
  endpoint: string,
  data?: RequestBodyData,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify({
      dbVersion: DB_VERSION,
      ...data,
    }),
    ...options,
  });
}

/**
 * DELETE 请求
 */
export async function del<T>(
  endpoint: string,
  data?: RequestBodyData,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    body: JSON.stringify({
      dbVersion: DB_VERSION,
      ...data,
    }),
    ...options,
  });
}

// ========== 请求取消工具 ==========

/**
 * 创建可取消的请求
 * 用于组件卸载时自动取消正在进行的请求
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   const { signal, cancel } = createCancellableRequest();
 *
 *   fetchData({ signal }).then(setData).catch(handleError);
 *
 *   return () => cancel(); // 组件卸载时取消请求
 * }, []);
 * ```
 */
export function createCancellableRequest(): {
  signal: AbortSignal;
  cancel: (reason?: string) => void;
} {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    cancel: (reason?: string) => {
      controller.abort(reason || '请求已取消');
    },
  };
}

/**
 * 创建请求取消管理器
 * 用于管理多个请求的取消
 *
 * @example
 * ```ts
 * const requestManager = createRequestManager();
 *
 * // 发起请求时注册
 * const signal = requestManager.register('fetchUsers');
 * fetchUsers({ signal });
 *
 * // 取消特定请求
 * requestManager.cancel('fetchUsers');
 *
 * // 取消所有请求
 * requestManager.cancelAll();
 * ```
 */
export function createRequestManager(): {
  register: (key: string) => AbortSignal;
  cancel: (key: string, reason?: string) => void;
  cancelAll: (reason?: string) => void;
  isActive: (key: string) => boolean;
} {
  const controllers = new Map<string, AbortController>();

  return {
    register(key: string): AbortSignal {
      // 如果已存在，先取消旧的
      const existing = controllers.get(key);
      if (existing) {
        existing.abort('被新请求替代');
      }

      const controller = new AbortController();
      controllers.set(key, controller);

      return controller.signal;
    },

    cancel(key: string, reason?: string): void {
      const controller = controllers.get(key);
      if (controller) {
        controller.abort(reason || '请求已取消');
        controllers.delete(key);
      }
    },

    cancelAll(reason?: string): void {
      controllers.forEach(controller => {
        controller.abort(reason || '所有请求已取消');
      });
      controllers.clear();
    },

    isActive(key: string): boolean {
      const controller = controllers.get(key);
      return !!controller && !controller.signal.aborted;
    },
  };
}
