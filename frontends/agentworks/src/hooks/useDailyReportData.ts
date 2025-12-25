/**
 * 单项目日报数据 Hook
 * @module hooks/useDailyReportData
 *
 * v2.0 重大变更：
 * - 后端只返回原始数据，不再返回 cpm/averageCPM 等计算值
 * - 所有财务计算（revenue, cpm, averageCPM, totalRevenue, publishedRevenue）由本 Hook 完成
 * - 使用 financeCalculator.ts 的逻辑计算收入
 * - 后端返回 platformQuotationCoefficients，无需额外获取平台配置
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { App } from 'antd';
import * as dailyReportApi from '../api/dailyReport';
import type {
  DailyReportData,
  DailyReportDataRaw,
  DailyReportDetail,
  DailyReportOverview,
  CPMCategory,
  DailyStatsEntry,
  TrackingConfig,
  PreviousOverview,
} from '../types/dailyReport';
import {
  getCPMCategory,
  getTodayString,
  calculateCPM,
} from '../types/dailyReport';
import type { PricingMode } from '../types/project';

/**
 * 按 CPM 分类的日报数据
 */
export interface GroupedReportDetails {
  excellent: DailyReportDetail[];
  acceptable: DailyReportDetail[];
  poor: DailyReportDetail[];
  critical: DailyReportDetail[];
}

// ============================================================================
// 收入计算函数（简化版，专供日报使用）
// ============================================================================

/**
 * 计算单条合作记录的收入
 * 与 financeCalculator.ts 中 calculateCollaborationFinance 的 revenue 计算逻辑一致
 */
function calculateRevenue(
  item: {
    amount: number;
    pricingMode: PricingMode;
    quotationPrice: number | null;
    talentPlatform: string;
  },
  platformQuotationCoefficients: Record<string, number>
): number {
  if (item.pricingMode === 'project' && item.quotationPrice) {
    // 比价模式：使用对客报价
    return item.quotationPrice;
  }
  // 框架模式：刊例价 × 报价系数
  const coefficient = platformQuotationCoefficients[item.talentPlatform] || 1;
  return Math.round(item.amount * coefficient);
}

/**
 * 处理后端返回的原始数据，计算所有财务字段
 */
function processRawData(rawData: DailyReportDataRaw): DailyReportData {
  const {
    platformQuotationCoefficients,
    allCollaborationsFinanceData,
    previousData,
  } = rawData;

  // 1. 计算每条详情的收入和 CPM
  const details: DailyReportDetail[] = rawData.details.map(detail => {
    const revenue = calculateRevenue(detail, platformQuotationCoefficients);
    const cpm = calculateCPM(revenue, detail.totalViews);

    return {
      ...detail,
      revenue,
      cpm,
      // cpmChange 需要前一天数据，稍后计算
    };
  });

  // 2. 如果有前一天数据，计算 cpmChange 和 viewsChange
  if (previousData?.details) {
    const prevViewsMap = new Map(
      previousData.details.map(d => [d.collaborationId, d.totalViews])
    );

    details.forEach(detail => {
      const prevViews = prevViewsMap.get(detail.collaborationId);
      if (prevViews !== undefined && prevViews > 0) {
        // 计算 CPM 环比
        const prevCpm = calculateCPM(detail.revenue, prevViews);
        detail.cpmChange = Math.round((detail.cpm - prevCpm) * 100) / 100;
        // 计算播放量环比（绝对值）
        detail.viewsChange = detail.totalViews - prevViews;
      }
    });
  }

  // 3. 计算汇总数据
  // 3.1 计算有日报数据的合作总收入（用于平均 CPM）
  let detailsTotalRevenue = 0;
  details.forEach(d => {
    detailsTotalRevenue += d.revenue;
  });

  // 3.2 计算所有合作的收入总和（项目金额）和已发布收入（执行金额）
  let totalRevenue = 0;
  let publishedRevenue = 0;
  allCollaborationsFinanceData.forEach(collab => {
    const revenue = calculateRevenue(collab, platformQuotationCoefficients);
    totalRevenue += revenue;
    if (['published', '视频已发布'].includes(collab.status)) {
      publishedRevenue += revenue;
    }
  });

  // 3.3 计算平均 CPM
  const totalViews = rawData.overview.totalViews;
  const averageCPM = calculateCPM(detailsTotalRevenue, totalViews);

  // 4. 构建计算后的概览数据
  const overview: DailyReportOverview = {
    ...rawData.overview,
    averageCPM,
    totalRevenue,
    publishedRevenue,
  };

  // 5. 计算前一天的汇总数据（用于环比展示）
  let previousOverview: PreviousOverview | undefined;
  if (previousData) {
    // 计算前一天有数据的合作总收入
    let prevTotalRevenue = 0;
    previousData.details.forEach(prev => {
      // 找到对应的合作记录获取收入
      const collab = allCollaborationsFinanceData.find(
        c => c.collaborationId === prev.collaborationId
      );
      if (collab) {
        prevTotalRevenue += calculateRevenue(
          collab,
          platformQuotationCoefficients
        );
      }
    });

    const prevAverageCPM = calculateCPM(
      prevTotalRevenue,
      previousData.totalViews
    );

    previousOverview = {
      date: previousData.date,
      totalViews: previousData.totalViews,
      averageCPM: prevAverageCPM,
    };
  }

  return {
    projectId: rawData.projectId,
    projectName: rawData.projectName,
    platformQuotationCoefficients,
    overview,
    trackingConfig: rawData.trackingConfig,
    details,
    missingDataVideos: rawData.missingDataVideos,
    previousOverview,
    firstReportDate: rawData.firstReportDate,
    lastReportDate: rawData.lastReportDate,
    date: rawData.date,
  };
}

/**
 * useDailyReportData Hook
 * 管理单项目日报数据的获取、计算、保存、分类
 */
export function useDailyReportData(projectId: string | undefined) {
  const { message } = App.useApp();

  // 状态
  const [data, setData] = useState<DailyReportData | null>(null);
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getTodayString());

  // 获取日报数据
  const fetchData = useCallback(
    async (date?: string, includePrevious = true) => {
      if (!projectId) return;

      const targetDate = date || currentDate;

      try {
        setLoading(true);
        setError(null);

        // 获取原始数据
        const rawResult = (await dailyReportApi.getDailyReport({
          projectId,
          date: targetDate,
          includePrevious,
        })) as unknown as DailyReportDataRaw;

        // 处理原始数据，计算所有财务字段
        // 后端返回的 rawResult 已包含 platformQuotationCoefficients
        const processedData = processRawData(rawResult);

        setData(processedData);
        setCurrentDate(targetDate);

        // 从返回数据中提取追踪配置
        if (processedData.trackingConfig) {
          setTrackingConfig(processedData.trackingConfig);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : '获取日报数据失败';
        setError(errorMsg);
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [projectId, currentDate, message]
  );

  // 初始加载
  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换日期
  const changeDate = useCallback(
    (date: string) => {
      setCurrentDate(date);
      fetchData(date);
    },
    [fetchData]
  );

  // 按 CPM 分类的数据
  const groupedDetails = useMemo<GroupedReportDetails>(() => {
    const groups: GroupedReportDetails = {
      excellent: [],
      acceptable: [],
      poor: [],
      critical: [],
    };

    if (!data?.details) return groups;

    data.details.forEach(detail => {
      const category = getCPMCategory(detail.totalViews, detail.cpm);
      groups[category].push(detail);
    });

    // 每个分类内按 CPM 排序（降序，CPM 高的排前面更需要关注）
    Object.keys(groups).forEach(key => {
      groups[key as CPMCategory].sort((a, b) => b.cpm - a.cpm);
    });

    return groups;
  }, [data?.details]);

  // 保存日报数据
  const saveStats = useCallback(
    async (entries: DailyStatsEntry[]) => {
      if (!projectId) return false;

      try {
        setSaving(true);

        const result = await dailyReportApi.saveDailyStats({
          projectId,
          date: currentDate,
          data: entries,
        });

        if (result.success) {
          message.success(result.message || '保存成功');
          // 重新获取数据
          await fetchData(currentDate);
          return true;
        } else {
          message.error(result.message || '保存失败');
          return false;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '保存失败';
        message.error(errorMsg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId, currentDate, fetchData, message]
  );

  // 保存备注
  const saveSolution = useCallback(
    async (collaborationId: string, solution: string) => {
      try {
        setSaving(true);

        const result = await dailyReportApi.saveReportSolution({
          collaborationId,
          date: currentDate,
          solution,
        });

        if (result.success) {
          message.success('备注保存成功');
          // 更新本地数据
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              details: prev.details.map(d =>
                d.collaborationId === collaborationId ? { ...d, solution } : d
              ),
            };
          });
          return true;
        } else {
          message.error(result.message || '保存失败');
          return false;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '保存失败';
        message.error(errorMsg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [currentDate, message]
  );

  // 刷新数据
  const refresh = useCallback(() => {
    fetchData(currentDate);
  }, [fetchData, currentDate]);

  // 日期范围信息
  const dateRange = useMemo(
    () => ({
      first: data?.firstReportDate,
      last: data?.lastReportDate,
      current: currentDate,
    }),
    [data?.firstReportDate, data?.lastReportDate, currentDate]
  );

  // 更新追踪配置的回调
  const updateTrackingConfig = useCallback((config: TrackingConfig) => {
    setTrackingConfig(config);
  }, []);

  return {
    // 数据
    data,
    overview: data?.overview,
    previousOverview: data?.previousOverview,
    details: data?.details || [],
    groupedDetails,
    missingDataVideos: data?.missingDataVideos || [],
    trackingConfig,

    // 状态
    loading,
    saving,
    error,

    // 日期
    currentDate,
    dateRange,
    changeDate,

    // 操作
    saveStats,
    saveSolution,
    refresh,
    updateTrackingConfig,
  };
}
