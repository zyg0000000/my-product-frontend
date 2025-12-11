/**
 * 获取客户项目配置的 Hook
 * @module hooks/useCustomerProjectConfig
 */

import { useState, useEffect, useCallback } from 'react';
import { customerApi } from '../services/customerApi';
import type { CustomerProjectConfig } from '../types/projectConfig';
import { DEFAULT_PROJECT_CONFIG } from '../types/projectConfig';

interface UseCustomerProjectConfigResult {
  /** 项目配置（合并默认值后） */
  config: CustomerProjectConfig;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 重新获取配置 */
  refetch: () => void;
}

/**
 * 获取客户项目配置
 * - 如果客户有自定义配置且已启用，返回客户配置
 * - 否则返回系统默认配置
 *
 * @param customerId 客户 ID（code 或 _id）
 * @returns 配置结果
 */
export function useCustomerProjectConfig(
  customerId: string | undefined
): UseCustomerProjectConfigResult {
  const [config, setConfig] = useState<CustomerProjectConfig>(
    DEFAULT_PROJECT_CONFIG
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!customerId) {
      setConfig(DEFAULT_PROJECT_CONFIG);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await customerApi.getCustomerById(customerId);
      if (response.success && response.data) {
        const customerConfig = response.data.projectConfig;
        // 如果客户有配置且已启用，使用客户配置（合并默认值）
        if (customerConfig?.enabled) {
          setConfig({
            ...DEFAULT_PROJECT_CONFIG,
            ...customerConfig,
            // 确保 tabVisibility 完整（防止部分字段缺失）
            tabVisibility: {
              ...DEFAULT_PROJECT_CONFIG.tabVisibility,
              ...customerConfig.tabVisibility,
            },
            // 确保 effectConfig 完整
            effectConfig: customerConfig.effectConfig
              ? {
                  enabledPeriods:
                    customerConfig.effectConfig.enabledPeriods ||
                    DEFAULT_PROJECT_CONFIG.effectConfig!.enabledPeriods,
                  enabledMetrics:
                    customerConfig.effectConfig.enabledMetrics ||
                    DEFAULT_PROJECT_CONFIG.effectConfig!.enabledMetrics,
                  benchmarks: {
                    ...DEFAULT_PROJECT_CONFIG.effectConfig!.benchmarks,
                    ...customerConfig.effectConfig.benchmarks,
                  },
                  customMetrics: customerConfig.effectConfig.customMetrics,
                }
              : DEFAULT_PROJECT_CONFIG.effectConfig,
          });
        } else {
          setConfig(DEFAULT_PROJECT_CONFIG);
        }
      } else {
        setConfig(DEFAULT_PROJECT_CONFIG);
      }
    } catch (err) {
      setError(err as Error);
      setConfig(DEFAULT_PROJECT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}
