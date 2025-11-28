/**
 * 统一 API 调用 Hook
 *
 * 提供统一的 API 调用、加载状态管理、错误处理
 * 减少重复代码，提升用户体验一致性
 */

import { useState } from 'react';
import { useToast } from './useToast';
import type { ApiResponse } from '../types/talent';

/**
 * API 调用配置选项
 */
export interface ApiCallOptions<T> {
  onSuccess?: (data: T) => void; // 成功回调
  onError?: (error: string) => void; // 错误回调
  showToast?: boolean; // 是否显示 Toast（默认 true）
  successMessage?: string; // 成功提示消息
  errorMessage?: string; // 错误提示消息（可选，默认使用 API 返回的错误）
}

/**
 * 统一 API 调用 Hook
 *
 * @example
 * ```typescript
 * const api = useApiCall<Talent[]>();
 *
 * const loadData = async () => {
 *   await api.execute(
 *     () => getTalents({ platform: 'douyin' }),
 *     {
 *       onSuccess: (data) => setTalents(data),
 *       showToast: false, // 列表加载不需要 Toast
 *     }
 *   );
 * };
 * ```
 */
export function useApiCall<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  /**
   * 执行 API 调用
   *
   * @param apiFunc API 函数（返回 Promise）
   * @param options 配置选项
   * @returns 成功时返回数据，失败时返回 null
   */
  const execute = async (
    apiFunc: () => Promise<ApiResponse<T>>,
    options: ApiCallOptions<T> = {}
  ): Promise<T | null> => {
    const {
      onSuccess,
      onError,
      showToast = true,
      successMessage,
      errorMessage,
    } = options;

    try {
      setLoading(true);
      setError(null);

      const response = await apiFunc();

      if (!response.success) {
        throw new Error(response.error || response.message || '操作失败');
      }

      // 成功回调
      if (onSuccess && response.data !== undefined) {
        onSuccess(response.data);
      }

      // 显示成功提示
      if (showToast && successMessage) {
        showSuccess(successMessage);
      }

      return response.data !== undefined ? response.data : null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError(errorMsg);

      // 错误回调
      if (onError) {
        onError(errorMsg);
      }

      // 显示错误提示
      if (showToast) {
        showError(errorMessage || errorMsg);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置错误状态
   */
  const clearError = () => {
    setError(null);
  };

  return {
    execute,
    loading,
    error,
    clearError,
  };
}

/**
 * 带自动重试的 API 调用 Hook
 *
 * @param maxRetries 最大重试次数（默认 3）
 * @param retryDelay 重试延迟（毫秒，默认 1000）
 */
export function useApiCallWithRetry<T = any>(
  maxRetries: number = 3,
  retryDelay: number = 1000
) {
  const baseHook = useApiCall<T>();
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = async (
    apiFunc: () => Promise<ApiResponse<T>>,
    options: ApiCallOptions<T> = {}
  ): Promise<T | null> => {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        setRetryCount(i);
        const result = await baseHook.execute(apiFunc, {
          ...options,
          showToast: i === maxRetries, // 只在最后一次失败时显示 Toast
        });

        if (result !== null) {
          setRetryCount(0);
          return result;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('未知错误');

        if (i < maxRetries) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 所有重试都失败
    if (lastError && options.showToast !== false) {
      baseHook.error && options.onError?.(lastError.message);
    }

    setRetryCount(0);
    return null;
  };

  return {
    ...baseHook,
    executeWithRetry,
    retryCount,
  };
}
