/**
 * 追踪概览数据 Hook
 * @module hooks/useTrackingOverview
 */

import { useState, useCallback, useEffect } from 'react';
import * as dailyReportApi from '../api/dailyReport';
import type { TrackingOverviewData } from '../types/dailyReport';

/**
 * useTrackingOverview Hook
 * 获取全局追踪概览统计数据
 */
export function useTrackingOverview() {
  // 状态
  const [data, setData] = useState<TrackingOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取概览数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dailyReportApi.getTrackingOverview();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取追踪概览失败';
      setError(errorMsg);
      // 静默失败，不显示 Toast（首页加载时不干扰用户）
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 刷新
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,

    // 便捷访问
    activeProjectCount: data?.activeProjectCount ?? 0,
    archivedProjectCount: data?.archivedProjectCount ?? 0,
    pendingEntriesCount: data?.pendingEntriesCount ?? 0,
    cpmAbnormalProjectCount: data?.cpmAbnormalProjectCount ?? 0,
  };
}
