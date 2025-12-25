/**
 * 分组日报数据聚合 Hook
 * @module hooks/useGroupDailyReportData
 *
 * 将多个项目的日报数据合并为一份日报
 * - 复用 useDailyReportData 的数据处理逻辑
 * - 合并所有项目的达人数据
 * - 聚合计算总播放量、平均 CPM
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
  TrackingConfig,
  PreviousOverview,
  MissingDataVideo,
} from '../types/dailyReport';
import {
  getCPMCategory,
  getTodayString,
  calculateCPM,
} from '../types/dailyReport';
import type { DailyReportGroup } from '../types/dailyReportGroup';
import type { GroupedReportDetails } from './useDailyReportData';

// 定价模式类型（本地定义，避免循环依赖）
type PricingMode = 'framework' | 'project' | 'hybrid';

/**
 * 计算单条合作记录的收入
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
    return item.quotationPrice;
  }
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
        const prevCpm = calculateCPM(detail.revenue, prevViews);
        detail.cpmChange = Math.round((detail.cpm - prevCpm) * 100) / 100;
        detail.viewsChange = detail.totalViews - prevViews;
      }
    });
  }

  // 3. 计算汇总数据
  let detailsTotalRevenue = 0;
  details.forEach(d => {
    detailsTotalRevenue += d.revenue;
  });

  let totalRevenue = 0;
  let publishedRevenue = 0;
  allCollaborationsFinanceData.forEach(collab => {
    const revenue = calculateRevenue(collab, platformQuotationCoefficients);
    totalRevenue += revenue;
    if (['published', '视频已发布'].includes(collab.status)) {
      publishedRevenue += revenue;
    }
  });

  const totalViews = rawData.overview.totalViews;
  const averageCPM = calculateCPM(detailsTotalRevenue, totalViews);

  const overview: DailyReportOverview = {
    ...rawData.overview,
    averageCPM,
    totalRevenue,
    publishedRevenue,
  };

  // 4. 计算前一天的汇总数据
  let previousOverview: PreviousOverview | undefined;
  if (previousData) {
    let prevTotalRevenue = 0;
    previousData.details.forEach(prev => {
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
 * 合并多个项目的日报数据
 */
function mergeProjectsData(
  projectsData: DailyReportData[],
  primaryProjectId: string,
  groupName?: string
): DailyReportData | null {
  if (projectsData.length === 0) return null;

  // 找到主项目
  const primaryProject =
    projectsData.find(p => p.projectId === primaryProjectId) || projectsData[0];

  // 合并所有 details
  const allDetails: DailyReportDetail[] = [];
  projectsData.forEach(project => {
    allDetails.push(...project.details);
  });

  // 合并所有 missingDataVideos
  const allMissingVideos: MissingDataVideo[] = [];
  projectsData.forEach(project => {
    allMissingVideos.push(...project.missingDataVideos);
  });

  // 合并 platformQuotationCoefficients（使用主项目的，其他项目可能有不同）
  // 这里简单处理：合并所有项目的系数，如果有冲突，使用主项目的
  const mergedCoefficients: Record<string, number> = {};
  projectsData.forEach(project => {
    Object.assign(mergedCoefficients, project.platformQuotationCoefficients);
  });
  // 主项目的系数优先
  Object.assign(
    mergedCoefficients,
    primaryProject.platformQuotationCoefficients
  );

  // 计算合并后的 overview
  let totalViews = 0;
  let totalRevenue = 0;
  let publishedRevenue = 0;
  let totalCollaborations = 0;
  let publishedVideos = 0;
  let detailsTotalRevenue = 0;

  projectsData.forEach(project => {
    totalViews += project.overview.totalViews;
    totalRevenue += project.overview.totalRevenue;
    publishedRevenue += project.overview.publishedRevenue;
    totalCollaborations += project.overview.totalCollaborations;
    publishedVideos += project.overview.publishedVideos;
  });

  allDetails.forEach(d => {
    detailsTotalRevenue += d.revenue;
  });

  // 加权平均 CPM（基于有数据的合作的总收入和总播放量）
  const averageCPM = calculateCPM(detailsTotalRevenue, totalViews);

  const mergedOverview: DailyReportOverview = {
    totalCollaborations,
    publishedVideos,
    totalViews,
    averageCPM,
    totalRevenue,
    publishedRevenue,
    benchmarkCPM: primaryProject.overview.benchmarkCPM,
  };

  // 计算合并后的前一天数据
  // 关键：每个项目的 previousOverview.averageCPM 已经被 processRawData 正确计算
  // 合并时使用加权平均：Σ(CPM_i × Views_i) / Σ(Views_i)
  let mergedPreviousOverview: PreviousOverview | undefined;
  const projectsWithPrevious = projectsData.filter(p => p.previousOverview);
  if (projectsWithPrevious.length > 0) {
    let prevTotalViews = 0;
    let weightedCpmSum = 0; // Σ(CPM_i × Views_i)

    projectsWithPrevious.forEach(project => {
      if (project.previousOverview) {
        const prevViews = project.previousOverview.totalViews;
        const prevCpm = project.previousOverview.averageCPM;
        prevTotalViews += prevViews;
        weightedCpmSum += prevCpm * prevViews;
      }
    });

    // 加权平均 CPM
    const prevAverageCPM =
      prevTotalViews > 0
        ? Math.round((weightedCpmSum / prevTotalViews) * 100) / 100
        : 0;

    mergedPreviousOverview = {
      date: projectsWithPrevious[0].previousOverview!.date,
      totalViews: prevTotalViews,
      averageCPM: prevAverageCPM,
    };
  }

  // 确定日期范围
  let firstReportDate: string | undefined;
  let lastReportDate: string | undefined;

  projectsData.forEach(project => {
    if (project.firstReportDate) {
      if (!firstReportDate || project.firstReportDate < firstReportDate) {
        firstReportDate = project.firstReportDate;
      }
    }
    if (project.lastReportDate) {
      if (!lastReportDate || project.lastReportDate > lastReportDate) {
        lastReportDate = project.lastReportDate;
      }
    }
  });

  return {
    projectId: primaryProjectId,
    projectName: groupName || primaryProject.projectName,
    platformQuotationCoefficients: mergedCoefficients,
    overview: mergedOverview,
    trackingConfig: primaryProject.trackingConfig,
    details: allDetails,
    missingDataVideos: allMissingVideos,
    previousOverview: mergedPreviousOverview,
    firstReportDate,
    lastReportDate,
    date: primaryProject.date,
  };
}

/**
 * useGroupDailyReportData Hook
 * 管理分组日报数据的获取、合并、分类
 */
export function useGroupDailyReportData(group: DailyReportGroup | null) {
  const { message } = App.useApp();

  // 状态
  const [data, setData] = useState<DailyReportData | null>(null);
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getTodayString());

  // 获取日报数据
  const fetchData = useCallback(
    async (date?: string, includePrevious = true, forceRefresh = false) => {
      if (!group || group.projectIds.length === 0) return;

      const targetDate = date || currentDate;

      try {
        setLoading(true);
        setError(null);

        // 并行获取所有项目的日报数据
        const fetchPromises = group.projectIds.map(projectId =>
          dailyReportApi
            .getDailyReport({
              projectId,
              date: targetDate,
              includePrevious,
              forceRefresh,
            })
            .then(rawResult => {
              const rawData = rawResult as unknown as DailyReportDataRaw;
              return processRawData(rawData);
            })
            .catch(err => {
              console.warn(`获取项目 ${projectId} 日报失败:`, err);
              return null;
            })
        );

        const results = await Promise.all(fetchPromises);

        // 过滤掉获取失败的项目
        const validResults = results.filter(
          (r): r is DailyReportData => r !== null
        );

        if (validResults.length === 0) {
          setError('所有项目的日报数据获取失败');
          setData(null);
          return;
        }

        // 合并数据
        const mergedData = mergeProjectsData(
          validResults,
          group.primaryProjectId,
          group.name
        );

        setData(mergedData);
        setCurrentDate(targetDate);

        // 从主项目提取追踪配置
        if (mergedData?.trackingConfig) {
          setTrackingConfig(mergedData.trackingConfig);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : '获取分组日报数据失败';
        setError(errorMsg);
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [group, currentDate, message]
  );

  // 初始加载
  useEffect(() => {
    if (group && group.projectIds.length > 0) {
      fetchData();
    }
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // 每个分类内按 CPM 排序（降序）
    Object.keys(groups).forEach(key => {
      groups[key as CPMCategory].sort((a, b) => b.cpm - a.cpm);
    });

    return groups;
  }, [data?.details]);

  // 刷新数据
  const refresh = useCallback(
    (forceRefresh = false) => {
      fetchData(currentDate, true, forceRefresh);
    },
    [fetchData, currentDate]
  );

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
    error,

    // 日期
    currentDate,
    dateRange,
    changeDate,

    // 操作
    refresh,
    updateTrackingConfig,

    // 分组信息
    groupName: group?.name || data?.projectName,
    projectCount: group?.projectIds.length || 0,
  };
}
