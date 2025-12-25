/**
 * 项目看板类型定义
 * @module types/dashboard
 */

import type { Platform } from './talent';
import type { ProjectStatus, ProjectListItem, Collaboration } from './project';
import type { BusinessTypeKey } from './customer';

// ============================================================================
// 筛选条件
// ============================================================================

/**
 * 看板筛选条件
 */
export interface DashboardFilters {
  /** 业务周期-起始年 */
  startYear?: number;
  /** 业务周期-起始月 */
  startMonth?: number;
  /** 业务周期-结束年 */
  endYear?: number;
  /** 业务周期-结束月 */
  endMonth?: number;
  /** 是否使用财务周期筛选 */
  useFinancialPeriod?: boolean;
  /** 客户ID列表（多选） */
  customerIds?: string[];
  /** 项目状态列表（多选） */
  statuses?: ProjectStatus[];
  /** 平台列表（多选） */
  platforms?: Platform[];
  /** 业务类型列表（多选） */
  businessTypes?: BusinessTypeKey[];
}

// ============================================================================
// 汇总统计
// ============================================================================

/**
 * 顶部汇总统计
 */
export interface SummaryStats {
  /** 项目数 */
  projectCount: number;
  /** 达人数（合作记录总数） */
  collaborationCount: number;
  /** 已发布数 */
  publishedCount: number;
  /** 执行金额（刊例价总和，分） */
  totalAmount: number;
  /** 总收入（对客报价，分） */
  totalRevenue: number;
  /** 总成本（下单成本，分） */
  totalCost: number;
  /** 返点收入（分） */
  totalRebateIncome: number;
  /** 基础利润 = 收入 - 成本 + 返点收入（分） */
  baseProfit: number;
  /** 基础利润率 (%) */
  baseProfitRate: number;
  /** 资金占用费（分） */
  totalFundsOccupation: number;
}

// ============================================================================
// 分组统计
// ============================================================================

/**
 * 平台分组统计
 */
export interface PlatformGroupStats {
  /** 平台标识 */
  platform: Platform;
  /** 平台名称 */
  platformName: string;
  /** 项目数 */
  projectCount: number;
  /** 达人数 */
  collaborationCount: number;
  /** 已发布数 */
  publishedCount: number;
  /** 执行金额（分） */
  totalAmount: number;
  /** 总收入（分） */
  totalRevenue: number;
  /** 总成本（分） */
  totalCost: number;
  /** 返点收入（分） */
  totalRebateIncome: number;
  /** 基础利润（分） */
  totalProfit: number;
  /** 利润率 (%) */
  profitRate: number;
}

/**
 * 状态分组统计
 */
export interface StatusGroupStats {
  /** 状态标识 */
  status: ProjectStatus;
  /** 状态名称 */
  statusLabel: string;
  /** 项目数 */
  projectCount: number;
  /** 达人数 */
  collaborationCount: number;
  /** 已发布数 */
  publishedCount: number;
  /** 执行金额（分） */
  totalAmount: number;
  /** 总收入（分） */
  totalRevenue: number;
  /** 总成本（分） */
  totalCost: number;
  /** 返点收入（分） */
  totalRebateIncome: number;
  /** 基础利润（分） */
  totalProfit: number;
  /** 利润率 (%) */
  profitRate: number;
}

/**
 * 客户分组统计
 */
export interface CustomerGroupStats {
  /** 客户ID */
  customerId: string;
  /** 客户名称 */
  customerName: string;
  /** 项目数 */
  projectCount: number;
  /** 达人数 */
  collaborationCount: number;
  /** 已发布数 */
  publishedCount: number;
  /** 执行金额（分） */
  totalAmount: number;
  /** 总收入（分） */
  totalRevenue: number;
  /** 总成本（分） */
  totalCost: number;
  /** 返点收入（分） */
  totalRebateIncome: number;
  /** 基础利润（分） */
  totalProfit: number;
  /** 利润率 (%) */
  profitRate: number;
}

// ============================================================================
// 项目财务数据
// ============================================================================

/**
 * 项目财务统计
 */
export interface ProjectFinanceInfo {
  /** 达人数 */
  collaborationCount: number;
  /** 已发布数 */
  publishedCount: number;
  /** 执行金额（分） */
  totalAmount: number;
  /** 总收入（分） */
  revenue: number;
  /** 总成本（分） */
  cost: number;
  /** 返点收入（分） */
  rebateIncome: number;
  /** 基础利润（分）= 收入 - 成本 + 返点 */
  profit: number;
  /** 基础利润率 (%) */
  profitRate: number;
  /** 资金占用费（分） */
  fundsOccupation: number;
  /** 净利润（分）= 基础利润 - 资金占用费 */
  netProfit: number;
  /** 净利润率 (%) */
  netProfitRate: number;
}

/**
 * 带财务信息的项目
 */
export interface ProjectWithFinance extends ProjectListItem {
  /** 财务统计 */
  financeStats?: ProjectFinanceInfo;
  /** 合作记录（用于计算） */
  collaborations?: Collaboration[];
}

// ============================================================================
// 导出数据
// ============================================================================

/**
 * Excel 导出数据
 */
export interface DashboardExportData {
  /** 汇总统计 */
  summary: SummaryStats | null;
  /** 按平台统计 */
  platformStats: PlatformGroupStats[];
  /** 按状态统计 */
  statusStats: StatusGroupStats[];
  /** 按客户统计 */
  customerStats: CustomerGroupStats[];
  /** 项目列表 */
  projects: ProjectWithFinance[];
  /** 筛选条件 */
  filters: DashboardFilters;
  /** 导出时间 */
  exportedAt: string;
}

// ============================================================================
// Hook 返回值
// ============================================================================

/**
 * useDashboardData Hook 返回值
 */
export interface UseDashboardDataReturn {
  /** 加载状态 */
  loading: boolean;
  /** 是否已执行过查询 */
  hasSearched: boolean;
  /** 筛选条件 */
  filters: DashboardFilters;
  /** 设置筛选条件 */
  setFilters: (filters: Partial<DashboardFilters>) => void;
  /** 汇总统计 */
  summaryStats: SummaryStats | null;
  /** 按平台统计 */
  platformStats: PlatformGroupStats[];
  /** 按状态统计 */
  statusStats: StatusGroupStats[];
  /** 按客户统计 */
  customerStats: CustomerGroupStats[];
  /** 项目列表 */
  projectList: ProjectWithFinance[];
  /** 分页信息 */
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  /** 设置分页 */
  setPagination: (current: number, pageSize: number) => void;
  /** 刷新数据 */
  refresh: () => void;
  /** 排除的项目ID集合 */
  excludedIds: Set<string>;
  /** 设置排除状态 */
  setExcluded: (projectId: string, excluded: boolean) => void;
}
