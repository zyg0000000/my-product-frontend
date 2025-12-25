/**
 * 项目看板数据 Hook
 * @module pages/Projects/Dashboard/hooks/useDashboardData
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { projectApi } from '../../../../services/projectApi';
import { customerApi } from '../../../../services/customerApi';
import { usePlatformConfig } from '../../../../hooks/usePlatformConfig';
import {
  calculateCollaborationFinance,
  createFinanceContextFromProject,
  isValidForFinance,
  calculateSingleFundsOccupation,
} from '../../../../utils/financeCalculator';
import type { CustomerProjectConfig } from '../../../../types/projectConfig';
import { DEFAULT_PROJECT_CONFIG } from '../../../../types/projectConfig';
import type { Platform } from '../../../../types/talent';
import type {
  Project,
  ProjectListItem,
  Collaboration,
  ProjectStatus,
} from '../../../../types/project';
import { normalizeBusinessTypes } from '../../../../types/project';
import type {
  DashboardFilters,
  SummaryStats,
  PlatformGroupStats,
  StatusGroupStats,
  CustomerGroupStats,
  ProjectWithFinance,
  ProjectFinanceInfo,
  UseDashboardDataReturn,
} from '../../../../types/dashboard';

// 平台名称映射
const PLATFORM_NAME_MAP: Record<Platform, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  kuaishou: '快手',
  bilibili: 'B站',
};

// 状态名称映射
const STATUS_LABEL_MAP: Record<ProjectStatus, string> = {
  executing: '执行中',
  pending_settlement: '待结算',
  settled: '已收款',
  closed: '已终结',
};

/**
 * 从 URL 参数解析筛选条件
 */
function parseFiltersFromUrl(searchParams: URLSearchParams): DashboardFilters {
  const startYear = searchParams.get('startYear');
  const startMonth = searchParams.get('startMonth');
  const endYear = searchParams.get('endYear');
  const endMonth = searchParams.get('endMonth');
  const useFinancialPeriod = searchParams.get('useFinancialPeriod');
  const customerIds = searchParams.get('customerIds');
  const statuses = searchParams.get('statuses');
  const platforms = searchParams.get('platforms');
  const businessTypes = searchParams.get('businessTypes');

  return {
    startYear: startYear ? Number(startYear) : undefined,
    startMonth: startMonth ? Number(startMonth) : undefined,
    endYear: endYear ? Number(endYear) : undefined,
    endMonth: endMonth ? Number(endMonth) : undefined,
    useFinancialPeriod: useFinancialPeriod === 'true',
    customerIds: customerIds ? customerIds.split(',') : undefined,
    statuses: statuses ? (statuses.split(',') as ProjectStatus[]) : undefined,
    platforms: platforms ? (platforms.split(',') as Platform[]) : undefined,
    businessTypes: businessTypes
      ? (businessTypes.split(',') as DashboardFilters['businessTypes'])
      : undefined,
  };
}

/**
 * 将筛选条件序列化到 URL 参数
 */
function serializeFiltersToUrl(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.startYear) params.set('startYear', String(filters.startYear));
  if (filters.startMonth) params.set('startMonth', String(filters.startMonth));
  if (filters.endYear) params.set('endYear', String(filters.endYear));
  if (filters.endMonth) params.set('endMonth', String(filters.endMonth));
  if (filters.useFinancialPeriod) params.set('useFinancialPeriod', 'true');
  if (filters.customerIds?.length)
    params.set('customerIds', filters.customerIds.join(','));
  if (filters.statuses?.length)
    params.set('statuses', filters.statuses.join(','));
  if (filters.platforms?.length)
    params.set('platforms', filters.platforms.join(','));
  if (filters.businessTypes?.length)
    params.set('businessTypes', filters.businessTypes.join(','));

  return params;
}

/**
 * 检查 URL 是否有筛选参数
 */
function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has('startYear') ||
    searchParams.has('endYear') ||
    searchParams.has('customerIds') ||
    searchParams.has('statuses') ||
    searchParams.has('platforms') ||
    searchParams.has('businessTypes')
  );
}

/**
 * 获取默认筛选条件
 */
function getDefaultFilters(): DashboardFilters {
  return {
    startYear: undefined,
    startMonth: undefined,
    endYear: undefined,
    endMonth: undefined,
    useFinancialPeriod: false,
  };
}

/**
 * 项目看板数据 Hook
 */
export function useDashboardData(): UseDashboardDataReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const initializedRef = useRef(false);

  // 从 URL 初始化筛选条件
  const initialFilters = useMemo(() => {
    if (hasUrlFilters(searchParams)) {
      return parseFiltersFromUrl(searchParams);
    }
    return getDefaultFilters();
  }, []); // 只在首次渲染时执行

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFiltersState] = useState<DashboardFilters>(initialFilters);
  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
  const [projectDetails, setProjectDetails] = useState<Map<string, Project>>(
    new Map()
  );
  const [projectCollaborations, setProjectCollaborations] = useState<
    Map<string, Collaboration[]>
  >(new Map());
  const [pagination, setPaginationState] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  // 排除的项目ID集合（不计入汇总统计）
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  // 客户财务配置缓存（按 customerId）
  const [customerConfigs, setCustomerConfigs] = useState<
    Map<string, CustomerProjectConfig>
  >(new Map());

  const { configs: platformConfigs } = usePlatformConfig();

  // 加载所有项目（全量）
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const response = await projectApi.getProjects({ pageSize: 1000 });
      if (response.success) {
        setAllProjects(response.data.items);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 前端筛选项目
  const filteredProjects = useMemo(() => {
    return allProjects.filter(project => {
      // 时间范围筛选
      const periodYear = filters.useFinancialPeriod
        ? project.financialYear
        : project.year;
      const periodMonth = filters.useFinancialPeriod
        ? project.financialMonth
        : project.month;

      // 起始时间筛选：只要有年份就生效，月份默认为 1 月
      if (filters.startYear) {
        const startMonth = filters.startMonth ?? 1;
        const start = filters.startYear * 100 + startMonth;
        const projectPeriod = (periodYear ?? 0) * 100 + (periodMonth ?? 0);
        if (projectPeriod < start) return false;
      }

      // 结束时间筛选：只要有年份就生效，月份默认为 12 月
      if (filters.endYear) {
        const endMonth = filters.endMonth ?? 12;
        const end = filters.endYear * 100 + endMonth;
        const projectPeriod = (periodYear ?? 0) * 100 + (periodMonth ?? 0);
        if (projectPeriod > end) return false;
      }

      // 客户筛选
      if (filters.customerIds?.length) {
        if (!filters.customerIds.includes(project.customerId)) return false;
      }

      // 状态筛选
      if (filters.statuses?.length) {
        if (!filters.statuses.includes(project.status)) return false;
      }

      // 平台筛选
      if (filters.platforms?.length) {
        if (!project.platforms?.some(p => filters.platforms!.includes(p)))
          return false;
      }

      // 业务类型筛选
      if (filters.businessTypes?.length) {
        const projectTypes = normalizeBusinessTypes(project.businessType);
        if (!projectTypes.some(t => filters.businessTypes!.includes(t)))
          return false;
      }

      return true;
    });
  }, [allProjects, filters]);

  // 批量获取合作记录和客户配置
  useEffect(() => {
    if (filteredProjects.length === 0) {
      setProjectCollaborations(new Map());
      setCustomerConfigs(new Map());
      return;
    }

    const loadCollaborations = async () => {
      const map = new Map<string, Collaboration[]>();
      const detailsMap = new Map<string, Project>();
      const configsMap = new Map<string, CustomerProjectConfig>();

      // 收集所有需要获取配置的客户 ID
      const customerIds = new Set<string>();
      filteredProjects.forEach(p => {
        if (p.customerId) customerIds.add(p.customerId);
      });

      // 并发获取客户配置
      const customerIdList = Array.from(customerIds);
      const configBatchSize = 10;
      for (let i = 0; i < customerIdList.length; i += configBatchSize) {
        const batch = customerIdList.slice(i, i + configBatchSize);
        const results = await Promise.all(
          batch.map(async customerId => {
            try {
              const res = await customerApi.getCustomerById(customerId);
              if (res.success && res.data?.projectConfig?.enabled) {
                return {
                  customerId,
                  config: {
                    ...DEFAULT_PROJECT_CONFIG,
                    ...res.data.projectConfig,
                    financeConfig: res.data.projectConfig.financeConfig
                      ? {
                          ...DEFAULT_PROJECT_CONFIG.financeConfig,
                          ...res.data.projectConfig.financeConfig,
                        }
                      : DEFAULT_PROJECT_CONFIG.financeConfig,
                  } as CustomerProjectConfig,
                };
              }
              return { customerId, config: DEFAULT_PROJECT_CONFIG };
            } catch {
              return { customerId, config: DEFAULT_PROJECT_CONFIG };
            }
          })
        );
        results.forEach(r => configsMap.set(r.customerId, r.config));
      }

      // 并发控制：每次最多5个请求
      const batchSize = 5;
      for (let i = 0; i < filteredProjects.length; i += batchSize) {
        const batch = filteredProjects.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async p => {
            try {
              // 获取项目详情（包含 platformPricingModes 等配置）
              const detailRes = await projectApi.getProjectById(p.id);
              // 获取合作记录
              const collabRes = await projectApi.getCollaborations({
                projectId: p.id,
                pageSize: 500,
              });
              return {
                projectId: p.id,
                detail: detailRes.success ? detailRes.data : null,
                collaborations: collabRes.success ? collabRes.data.items : [],
              };
            } catch (error) {
              console.error(`获取项目 ${p.id} 数据失败:`, error);
              return { projectId: p.id, detail: null, collaborations: [] };
            }
          })
        );

        results.forEach(result => {
          map.set(result.projectId, result.collaborations);
          if (result.detail) {
            detailsMap.set(result.projectId, result.detail);
          }
        });
      }

      setProjectCollaborations(map);
      setProjectDetails(detailsMap);
      setCustomerConfigs(configsMap);
    };

    loadCollaborations();
  }, [filteredProjects]);

  // 计算汇总统计（排除 excludedIds 中的项目）
  const summaryStats = useMemo<SummaryStats | null>(() => {
    // 过滤掉被排除的项目
    const activeProjects = filteredProjects.filter(p => !excludedIds.has(p.id));
    if (activeProjects.length === 0) return null;

    let totalAmount = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalRebateIncome = 0;
    let totalFundsOccupation = 0;
    let collaborationCount = 0;
    let publishedCount = 0;

    activeProjects.forEach(project => {
      const collaborations = projectCollaborations.get(project.id) || [];
      const detail = projectDetails.get(project.id);
      // 获取客户配置（用于资金占用费计算）
      const customerConfig = customerConfigs.get(project.customerId);
      const enableFundsOccupation =
        customerConfig?.financeConfig?.enableFundsOccupation ?? false;
      const fundsOccupationRate =
        customerConfig?.financeConfig?.fundsOccupationRate ?? 0.7;

      if (detail && collaborations.length > 0) {
        const context = createFinanceContextFromProject(
          detail,
          platformConfigs
        );

        collaborations.filter(isValidForFinance).forEach(collab => {
          collaborationCount++;
          if (collab.status === '视频已发布') publishedCount++;

          totalAmount += collab.amount || 0;

          const finance =
            collab.finance || calculateCollaborationFinance(collab, context);
          totalRevenue += finance.revenue;
          totalCost += finance.cost;
          totalRebateIncome += finance.rebateIncome;

          // 计算资金占用费（仅当客户开启时）
          if (enableFundsOccupation) {
            const fundsResult = calculateSingleFundsOccupation(
              collab,
              fundsOccupationRate,
              context
            );
            if (fundsResult) {
              totalFundsOccupation += fundsResult.fee;
            }
          }
        });
      } else {
        // 没有详情时使用 stats 数据
        collaborationCount += project.stats?.collaborationCount ?? 0;
        publishedCount += project.stats?.publishedCount ?? 0;
        totalAmount += project.stats?.totalAmount ?? 0;
      }
    });

    const baseProfit = totalRevenue - totalCost + totalRebateIncome;
    const baseProfitRate =
      totalRevenue > 0 ? (baseProfit / totalRevenue) * 100 : 0;

    return {
      projectCount: activeProjects.length,
      collaborationCount,
      publishedCount,
      totalAmount,
      totalRevenue,
      totalCost,
      totalRebateIncome,
      baseProfit,
      baseProfitRate,
      totalFundsOccupation,
    };
  }, [
    filteredProjects,
    excludedIds,
    projectCollaborations,
    projectDetails,
    customerConfigs,
    platformConfigs,
  ]);

  // 按平台分组统计（排除 excludedIds 中的项目）
  const platformStats = useMemo<PlatformGroupStats[]>(() => {
    const statsMap = new Map<
      Platform,
      {
        projectIds: Set<string>;
        collaborationCount: number;
        publishedCount: number;
        totalAmount: number;
        totalRevenue: number;
        totalCost: number;
        totalRebateIncome: number;
      }
    >();

    // 过滤掉被排除的项目
    const activeProjects = filteredProjects.filter(p => !excludedIds.has(p.id));

    activeProjects.forEach(project => {
      const collaborations = projectCollaborations.get(project.id) || [];
      const detail = projectDetails.get(project.id);

      project.platforms?.forEach(platform => {
        if (!statsMap.has(platform)) {
          statsMap.set(platform, {
            projectIds: new Set(),
            collaborationCount: 0,
            publishedCount: 0,
            totalAmount: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalRebateIncome: 0,
          });
        }
        const stats = statsMap.get(platform)!;
        stats.projectIds.add(project.id);

        // 筛选该平台的合作记录
        const platformCollabs = collaborations.filter(
          c => c.talentPlatform === platform
        );

        if (detail && platformCollabs.length > 0) {
          const context = createFinanceContextFromProject(
            detail,
            platformConfigs
          );

          platformCollabs.filter(isValidForFinance).forEach(collab => {
            stats.collaborationCount++;
            if (collab.status === '视频已发布') stats.publishedCount++;
            stats.totalAmount += collab.amount || 0;

            const finance =
              collab.finance || calculateCollaborationFinance(collab, context);
            stats.totalRevenue += finance.revenue;
            stats.totalCost += finance.cost;
            stats.totalRebateIncome += finance.rebateIncome;
          });
        }
      });
    });

    return Array.from(statsMap.entries()).map(([platform, stats]) => {
      const baseProfit =
        stats.totalRevenue - stats.totalCost + stats.totalRebateIncome;
      const profitRate =
        stats.totalRevenue > 0 ? (baseProfit / stats.totalRevenue) * 100 : 0;

      return {
        platform,
        platformName: PLATFORM_NAME_MAP[platform] || platform,
        projectCount: stats.projectIds.size,
        collaborationCount: stats.collaborationCount,
        publishedCount: stats.publishedCount,
        totalAmount: stats.totalAmount,
        totalRevenue: stats.totalRevenue,
        totalCost: stats.totalCost,
        totalRebateIncome: stats.totalRebateIncome,
        totalProfit: baseProfit,
        profitRate,
      };
    });
  }, [
    filteredProjects,
    excludedIds,
    projectCollaborations,
    projectDetails,
    platformConfigs,
  ]);

  // 按状态分组统计（排除 excludedIds 中的项目）
  const statusStats = useMemo<StatusGroupStats[]>(() => {
    const statsMap = new Map<
      ProjectStatus,
      {
        projectCount: number;
        collaborationCount: number;
        publishedCount: number;
        totalAmount: number;
        totalRevenue: number;
        totalCost: number;
        totalRebateIncome: number;
      }
    >();

    // 过滤掉被排除的项目
    const activeProjects = filteredProjects.filter(p => !excludedIds.has(p.id));

    activeProjects.forEach(project => {
      const status = project.status;
      if (!statsMap.has(status)) {
        statsMap.set(status, {
          projectCount: 0,
          collaborationCount: 0,
          publishedCount: 0,
          totalAmount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalRebateIncome: 0,
        });
      }
      const stats = statsMap.get(status)!;
      stats.projectCount++;

      const collaborations = projectCollaborations.get(project.id) || [];
      const detail = projectDetails.get(project.id);

      if (detail && collaborations.length > 0) {
        const context = createFinanceContextFromProject(
          detail,
          platformConfigs
        );

        collaborations.filter(isValidForFinance).forEach(collab => {
          stats.collaborationCount++;
          if (collab.status === '视频已发布') stats.publishedCount++;
          stats.totalAmount += collab.amount || 0;

          const finance =
            collab.finance || calculateCollaborationFinance(collab, context);
          stats.totalRevenue += finance.revenue;
          stats.totalCost += finance.cost;
          stats.totalRebateIncome += finance.rebateIncome;
        });
      } else {
        stats.collaborationCount += project.stats?.collaborationCount ?? 0;
        stats.publishedCount += project.stats?.publishedCount ?? 0;
        stats.totalAmount += project.stats?.totalAmount ?? 0;
      }
    });

    return Array.from(statsMap.entries()).map(([status, stats]) => {
      const baseProfit =
        stats.totalRevenue - stats.totalCost + stats.totalRebateIncome;
      const profitRate =
        stats.totalRevenue > 0 ? (baseProfit / stats.totalRevenue) * 100 : 0;

      return {
        status,
        statusLabel: STATUS_LABEL_MAP[status] || status,
        projectCount: stats.projectCount,
        collaborationCount: stats.collaborationCount,
        publishedCount: stats.publishedCount,
        totalAmount: stats.totalAmount,
        totalRevenue: stats.totalRevenue,
        totalCost: stats.totalCost,
        totalRebateIncome: stats.totalRebateIncome,
        totalProfit: baseProfit,
        profitRate,
      };
    });
  }, [
    filteredProjects,
    excludedIds,
    projectCollaborations,
    projectDetails,
    platformConfigs,
  ]);

  // 按客户分组统计（排除 excludedIds 中的项目）
  const customerStats = useMemo<CustomerGroupStats[]>(() => {
    const statsMap = new Map<
      string,
      {
        customerName: string;
        projectCount: number;
        collaborationCount: number;
        publishedCount: number;
        totalAmount: number;
        totalRevenue: number;
        totalCost: number;
        totalRebateIncome: number;
      }
    >();

    // 过滤掉被排除的项目
    const activeProjects = filteredProjects.filter(p => !excludedIds.has(p.id));

    activeProjects.forEach(project => {
      const customerId = project.customerId;
      if (!statsMap.has(customerId)) {
        statsMap.set(customerId, {
          customerName: project.customerName || customerId,
          projectCount: 0,
          collaborationCount: 0,
          publishedCount: 0,
          totalAmount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalRebateIncome: 0,
        });
      }
      const stats = statsMap.get(customerId)!;
      stats.projectCount++;

      const collaborations = projectCollaborations.get(project.id) || [];
      const detail = projectDetails.get(project.id);

      if (detail && collaborations.length > 0) {
        const context = createFinanceContextFromProject(
          detail,
          platformConfigs
        );

        collaborations.filter(isValidForFinance).forEach(collab => {
          stats.collaborationCount++;
          if (collab.status === '视频已发布') stats.publishedCount++;
          stats.totalAmount += collab.amount || 0;

          const finance =
            collab.finance || calculateCollaborationFinance(collab, context);
          stats.totalRevenue += finance.revenue;
          stats.totalCost += finance.cost;
          stats.totalRebateIncome += finance.rebateIncome;
        });
      } else {
        stats.collaborationCount += project.stats?.collaborationCount ?? 0;
        stats.publishedCount += project.stats?.publishedCount ?? 0;
        stats.totalAmount += project.stats?.totalAmount ?? 0;
      }
    });

    return Array.from(statsMap.entries())
      .map(([customerId, stats]) => {
        const baseProfit =
          stats.totalRevenue - stats.totalCost + stats.totalRebateIncome;
        const profitRate =
          stats.totalRevenue > 0 ? (baseProfit / stats.totalRevenue) * 100 : 0;

        return {
          customerId,
          customerName: stats.customerName,
          projectCount: stats.projectCount,
          collaborationCount: stats.collaborationCount,
          publishedCount: stats.publishedCount,
          totalAmount: stats.totalAmount,
          totalRevenue: stats.totalRevenue,
          totalCost: stats.totalCost,
          totalRebateIncome: stats.totalRebateIncome,
          totalProfit: baseProfit,
          profitRate,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // 按收入降序
  }, [
    filteredProjects,
    excludedIds,
    projectCollaborations,
    projectDetails,
    platformConfigs,
  ]);

  // 带财务信息的项目列表
  const projectList = useMemo<ProjectWithFinance[]>(() => {
    return filteredProjects.map(project => {
      const collaborations = projectCollaborations.get(project.id) || [];
      const detail = projectDetails.get(project.id);
      // 获取客户配置（用于资金占用费计算）
      const customerConfig = customerConfigs.get(project.customerId);
      const enableFundsOccupation =
        customerConfig?.financeConfig?.enableFundsOccupation ?? false;
      const fundsOccupationRate =
        customerConfig?.financeConfig?.fundsOccupationRate ?? 0.7;

      let financeStats: ProjectFinanceInfo | undefined;

      if (detail && collaborations.length > 0) {
        const context = createFinanceContextFromProject(
          detail,
          platformConfigs
        );
        const validCollabs = collaborations.filter(isValidForFinance);

        let totalAmount = 0;
        let revenue = 0;
        let cost = 0;
        let rebateIncome = 0;
        let publishedCount = 0;
        let fundsOccupation = 0;

        validCollabs.forEach(collab => {
          if (collab.status === '视频已发布') publishedCount++;
          totalAmount += collab.amount || 0;

          const finance =
            collab.finance || calculateCollaborationFinance(collab, context);
          revenue += finance.revenue;
          cost += finance.cost;
          rebateIncome += finance.rebateIncome;

          // 计算资金占用费（仅当客户开启时）
          if (enableFundsOccupation) {
            const fundsResult = calculateSingleFundsOccupation(
              collab,
              fundsOccupationRate,
              context
            );
            if (fundsResult) {
              fundsOccupation += fundsResult.fee;
            }
          }
        });

        const profit = revenue - cost + rebateIncome;
        const profitRate = revenue > 0 ? (profit / revenue) * 100 : 0;
        const netProfit = profit - fundsOccupation;
        const netProfitRate = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        financeStats = {
          collaborationCount: validCollabs.length,
          publishedCount,
          totalAmount,
          revenue,
          cost,
          rebateIncome,
          profit,
          profitRate,
          fundsOccupation,
          netProfit,
          netProfitRate,
        };
      }

      return {
        ...project,
        financeStats,
        collaborations,
      };
    });
  }, [
    filteredProjects,
    projectCollaborations,
    projectDetails,
    customerConfigs,
    platformConfigs,
  ]);

  // 不自动加载，需要用户点击查询按钮
  // useEffect(() => {
  //   loadProjects();
  // }, [loadProjects]);

  // 更新分页 total
  useEffect(() => {
    setPaginationState(prev => ({
      ...prev,
      total: filteredProjects.length,
    }));
  }, [filteredProjects.length]);

  // 设置筛选条件（同步到 URL）
  const setFilters = useCallback(
    (newFilters: Partial<DashboardFilters>) => {
      setFiltersState(prev => {
        const updated = { ...prev, ...newFilters };
        // 同步到 URL（使用 replace 避免产生新的历史记录）
        setSearchParams(serializeFiltersToUrl(updated), { replace: true });
        return updated;
      });
      setPaginationState(prev => ({ ...prev, current: 1 })); // 重置分页
    },
    [setSearchParams]
  );

  // 首次加载时，如果 URL 有参数则自动查询
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (hasUrlFilters(searchParams)) {
        loadProjects();
      }
    }
  }, [searchParams, loadProjects]);

  // 设置分页
  const setPagination = useCallback((current: number, pageSize: number) => {
    setPaginationState(prev => ({ ...prev, current, pageSize }));
  }, []);

  // 设置项目排除状态
  const setExcluded = useCallback((projectId: string, excluded: boolean) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (excluded) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  }, []);

  return {
    loading,
    hasSearched,
    filters,
    setFilters,
    summaryStats,
    platformStats,
    statusStats,
    customerStats,
    projectList,
    pagination,
    setPagination,
    refresh: loadProjects,
    excludedIds,
    setExcluded,
  };
}
