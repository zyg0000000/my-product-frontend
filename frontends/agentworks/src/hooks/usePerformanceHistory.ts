/**
 * 达人表现历史数据 Hook
 * 用于趋势分析页面
 */

import { useState, useEffect, useCallback } from 'react';
import { getPerformanceHistory } from '../api/performance';
import type { Platform } from '../types/talent';
import { logger } from '../utils/logger';

export interface PerformanceHistoryParams {
  platform: Platform;
  oneIds: string[];
  metrics: string[];
  startDate: string;
  endDate: string;
}

// 达人指标数据
interface TalentMetrics {
  [metricKey: string]: number | string | null;
}

// 时间序列数据点
interface SeriesDataPoint {
  date: string;
  [oneId: string]: TalentMetrics | string; // oneId -> 指标数据，date 字段是 string
}

export interface PerformanceHistoryData {
  talents: Array<{ oneId: string; name: string }>;
  series: SeriesDataPoint[];
}

export function usePerformanceHistory(params: PerformanceHistoryParams) {
  const [data, setData] = useState<PerformanceHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { platform, oneIds, metrics, startDate, endDate } = params;

  // 将数组转为字符串作为依赖项（避免引用变化导致重复请求）
  const oneIdsKey = oneIds.join(',');
  const metricsKey = metrics.join(',');

  const loadData = useCallback(async () => {
    // 如果没有选中达人或指标，不请求
    if (oneIds.length === 0 || metrics.length === 0) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getPerformanceHistory({
        platform,
        oneIds,
        metrics,
        startDate,
        endDate,
      });

      // 类型断言处理 API 响应
      const res = response as {
        success?: boolean;
        data?: PerformanceHistoryData;
        message?: string;
      };

      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || '加载失败');
        setData(null);
      }
    } catch (err) {
      logger.error('加载历史数据失败:', err);
      setError('网络请求失败');
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, oneIdsKey, metricsKey, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    reload: loadData,
  };
}
