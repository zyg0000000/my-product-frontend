/**
 * 日报功能类型定义
 * @module types/dailyReport
 * @description AgentWorks 项目日报追踪功能
 *
 * v2.0 重大变更：
 * - 后端不再返回 cpm/averageCPM 等计算值
 * - 所有财务计算由前端 financeCalculator.ts 完成
 * - 类型定义分为「后端返回的原始数据」和「前端计算后的展示数据」
 */

import type { PricingModel } from './customer';
import type { OrderMode } from './project';

// ============================================================================
// 追踪配置类型
// ============================================================================

/**
 * 追踪状态
 */
export type TrackingStatus = 'active' | 'archived' | 'disabled';

/**
 * 日报版本
 * - standard: 常规业务版（ECS 爬虫自动抓取）
 * - joint: 联投业务版（飞书表格导入）
 */
export type TrackingVersion = 'standard' | 'joint';

/**
 * 抓取状态
 */
export type FetchStatus = 'success' | 'partial' | 'failed';

/**
 * 项目追踪配置
 * 存储在 projects.trackingConfig
 */
export interface TrackingConfig {
  /** 追踪状态 */
  status: TrackingStatus;
  /** 日报版本（选择后不可更改） */
  version?: TrackingVersion;
  /** 追踪开始日期 */
  startDate?: string;
  /** 追踪结束日期 */
  endDate?: string;
  /** 基准 CPM（超过此值视为异常） */
  benchmarkCPM?: number;
  /** 最后抓取时间 */
  lastFetchAt?: string;
  /** 最后抓取状态 */
  lastFetchStatus?: FetchStatus;
}

/**
 * 追踪状态标签
 */
export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  active: '追踪中',
  archived: '已归档',
  disabled: '已停用',
};

/**
 * 追踪状态颜色
 */
export const TRACKING_STATUS_COLORS: Record<TrackingStatus, string> = {
  active: 'processing',
  archived: 'default',
  disabled: 'error',
};

/**
 * 日报版本标签
 */
export const TRACKING_VERSION_LABELS: Record<TrackingVersion, string> = {
  standard: '常规业务',
  joint: '联投业务',
};

/**
 * 日报版本颜色
 */
export const TRACKING_VERSION_COLORS: Record<TrackingVersion, string> = {
  standard: 'blue',
  joint: 'purple',
};

// ============================================================================
// 日报数据类型（后端返回的原始数据）
// ============================================================================

/**
 * 数据来源
 */
export type DailyStatsSource = 'auto' | 'manual' | 'migrated';

/**
 * 单日统计数据（后端存储格式）
 * 存储在 collaborations.dailyStats[]
 * 注意：v2.0 起不再存储 cpm/cpmChange
 */
export interface DailyStat {
  /** 日期 (YYYY-MM-DD) */
  date: string;
  /** 累计播放量 */
  totalViews: number;
  /** 备注/解决方案 */
  solution?: string;
  /** 数据来源 */
  source: DailyStatsSource;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 合作记录的财务原始字段（用于前端计算）
 */
export interface CollaborationFinanceFields {
  /** 刊例价（分） */
  amount: number;
  /** 返点率（%） */
  rebateRate: number;
  /** 定价模式 */
  pricingMode: PricingModel;
  /** 对客报价（分）- 比价模式 */
  quotationPrice: number | null;
  /** 下单价（分）- 比价模式 */
  orderPrice: number | null;
  /** 下单方式 */
  orderMode: OrderMode;
  /** 平台 */
  talentPlatform: string;
}

/**
 * 日报详情项（后端返回的原始数据）
 * 包含财务原始字段，前端用这些计算 cpm
 */
export interface DailyReportDetailRaw extends CollaborationFinanceFields {
  /** 合作记录 ID */
  collaborationId: string;
  /** 达人 oneId */
  talentId: string;
  /** 达人名称 */
  talentName: string;
  /** 平台账号 ID（如星图ID） */
  platformAccountId?: string;
  /** 合作状态 */
  status: string;
  /** 累计播放量 */
  totalViews: number;
  /** 备注 */
  solution?: string;
  /** 数据来源 */
  source: DailyStatsSource;
  /** 发布日期 */
  publishDate?: string;
}

/**
 * 日报详情项（前端计算后的展示数据）
 */
export interface DailyReportDetail extends DailyReportDetailRaw {
  /** 收入（分）- 前端计算 */
  revenue: number;
  /** 当日 CPM - 前端计算 */
  cpm: number;
  /** CPM 变化 - 前端计算 */
  cpmChange?: number;
  /** 播放量变化（绝对值）- 前端计算 */
  viewsChange?: number;
}

/**
 * 待录入视频项（后端返回）
 */
export interface MissingDataVideo extends CollaborationFinanceFields {
  /** 合作记录 ID */
  collaborationId: string;
  /** 达人 oneId */
  talentId: string;
  /** 达人名称 */
  talentName: string;
  /** 发布日期 */
  publishDate?: string;
  /** 视频 ID（用于 14 天后抓取） */
  videoId?: string | null;
  /** 星图任务 ID（用于 14 天内抓取） */
  taskId?: string | null;
  /** 是否已有当日数据（强制刷新模式下使用） */
  hasCurrentData?: boolean;
}

/**
 * 日报概览数据（后端返回的原始数据）
 * 只包含数量统计，财务数据由前端计算
 */
export interface DailyReportOverviewRaw {
  /** 总合作数 */
  totalCollaborations: number;
  /** 已发布视频数 */
  publishedVideos: number;
  /** 总播放量 */
  totalViews: number;
  /** 基准 CPM */
  benchmarkCPM?: number;
}

/**
 * 日报概览数据（前端计算后的展示数据）
 */
export interface DailyReportOverview extends DailyReportOverviewRaw {
  /** 平均 CPM - 前端计算 */
  averageCPM: number;
  /** 项目金额：所有合作的收入总和（分）- 前端计算 */
  totalRevenue: number;
  /** 执行金额：已发布达人的收入总和（分）- 前端计算 */
  publishedRevenue: number;
}

/**
 * 前一天数据（后端返回，用于环比计算）
 */
export interface PreviousData {
  /** 日期 */
  date: string;
  /** 总播放量 */
  totalViews: number;
  /** 每条合作的播放量 */
  details: Array<{
    collaborationId: string;
    totalViews: number;
  }>;
}

/**
 * 所有合作的财务原始数据（用于前端汇总计算）
 */
export interface CollaborationFinanceDataItem extends CollaborationFinanceFields {
  collaborationId: string;
  status: string;
}

/**
 * 日报数据响应（后端返回的原始数据）
 */
export interface DailyReportDataRaw {
  /** 项目 ID */
  projectId: string;
  /** 项目名称 */
  projectName: string;
  /** 项目的平台报价系数（前端计算需要） */
  platformQuotationCoefficients: Record<string, number>;
  /** 项目的平台定价模式 */
  platformPricingModels: Record<string, PricingModel>;
  /** 概览统计（原始数据） */
  overview: DailyReportOverviewRaw;
  /** 项目追踪配置 */
  trackingConfig?: TrackingConfig;
  /** 所有合作的财务原始数据（用于前端汇总计算） */
  allCollaborationsFinanceData: CollaborationFinanceDataItem[];
  /** 日报详情列表（原始数据） */
  details: DailyReportDetailRaw[];
  /** 待录入视频列表 */
  missingDataVideos: MissingDataVideo[];
  /** 前一天数据（用于环比） */
  previousData?: PreviousData;
  /** 最早日报日期 */
  firstReportDate?: string;
  /** 最新日报日期 */
  lastReportDate?: string;
  /** 当前查询日期 */
  date: string;
}

/**
 * 日报数据（前端计算后的展示数据）
 */
export interface DailyReportData {
  /** 项目 ID */
  projectId: string;
  /** 项目名称 */
  projectName: string;
  /** 项目的平台报价系数 */
  platformQuotationCoefficients: Record<string, number>;
  /** 概览统计（计算后） */
  overview: DailyReportOverview;
  /** 项目追踪配置 */
  trackingConfig?: TrackingConfig;
  /** 日报详情列表（计算后） */
  details: DailyReportDetail[];
  /** 待录入视频列表 */
  missingDataVideos: MissingDataVideo[];
  /** 前一天汇总数据（计算后，用于环比展示） */
  previousOverview?: PreviousOverview;
  /** 最早日报日期 */
  firstReportDate?: string;
  /** 最新日报日期 */
  lastReportDate?: string;
  /** 当前查询日期 */
  date: string;
}

// ============================================================================
// 追踪概览类型（全局统计）
// ============================================================================

/**
 * 追踪概览数据
 */
export interface TrackingOverviewData {
  /** 追踪中项目数 */
  activeProjectCount: number;
  /** 已归档项目数 */
  archivedProjectCount: number;
  /** 今日待录入数据条数 */
  pendingEntriesCount: number;
  /** CPM 异常项目数 */
  cpmAbnormalProjectCount?: number;
  /** 当前日期 */
  date: string;
}

// ============================================================================
// CPM 分类类型
// ============================================================================

/**
 * CPM 分类
 */
export type CPMCategory =
  | 'excellent' // 优秀（CPM<20）
  | 'acceptable' // 良好（CPM 20-40）
  | 'poor' // 较差（CPM 40-100）
  | 'critical'; // 很差（CPM>100）

/**
 * CPM 分类配置
 */
export interface CPMCategoryConfig {
  key: CPMCategory;
  label: string;
  color: string;
  /** 判断条件：CPM 范围 [min, max) 或播放量阈值 */
  condition: {
    type: 'cpm' | 'views';
    min?: number;
    max?: number;
  };
}

/**
 * CPM 分类配置列表
 * 只按 CPM 范围分类，不再有「爆款视频」特殊分类
 */
export const CPM_CATEGORIES: CPMCategoryConfig[] = [
  {
    key: 'excellent',
    label: '优秀 (CPM<20)',
    color: '#52c41a', // green
    condition: { type: 'cpm', max: 20 },
  },
  {
    key: 'acceptable',
    label: '良好 (CPM 20-40)',
    color: '#faad14', // gold
    condition: { type: 'cpm', min: 20, max: 40 },
  },
  {
    key: 'poor',
    label: '较差 (CPM 40-100)',
    color: '#fa8c16', // orange
    condition: { type: 'cpm', min: 40, max: 100 },
  },
  {
    key: 'critical',
    label: '很差 (CPM>100)',
    color: '#f5222d', // red
    condition: { type: 'cpm', min: 100 },
  },
];

/**
 * 根据 CPM 判断分类（纯 CPM 范围分类）
 */
export function getCPMCategory(_totalViews: number, cpm: number): CPMCategory {
  // 纯按 CPM 范围分类
  if (cpm < 20) return 'excellent';
  if (cpm < 40) return 'acceptable';
  if (cpm < 100) return 'poor';
  return 'critical';
}

/**
 * 获取 CPM 分类配置
 */
export function getCPMCategoryConfig(category: CPMCategory): CPMCategoryConfig {
  return CPM_CATEGORIES.find(c => c.key === category) || CPM_CATEGORIES[0];
}

// ============================================================================
// API 请求/响应类型
// ============================================================================

/**
 * 获取日报请求参数
 */
export interface GetDailyReportParams {
  projectId: string;
  date?: string; // YYYY-MM-DD，默认今天
  includePrevious?: boolean; // 是否包含前一天数据（用于环比）
  forceRefresh?: boolean; // 强制刷新模式：返回所有已发布视频（含已有当日数据的）
}

/**
 * 获取达人趋势请求参数
 */
export interface GetTalentTrendParams {
  collaborationIds: string[];
  days?: number; // 默认 14 天
}

/**
 * 单日趋势数据点（后端返回的原始数据）
 */
export interface TrendDataPointRaw {
  date: string;
  totalViews: number;
}

/**
 * 单日趋势数据点（前端计算后）
 */
export interface TrendDataPoint extends TrendDataPointRaw {
  cpm: number;
}

/**
 * 达人趋势数据（后端返回的原始数据）
 */
export interface TalentTrendDataRaw extends CollaborationFinanceFields {
  collaborationId: string;
  talentName: string;
  data: TrendDataPointRaw[];
}

/**
 * 达人趋势数据（前端计算后）
 */
export interface TalentTrendData {
  collaborationId: string;
  talentName: string;
  /** 收入（分）- 前端计算 */
  revenue: number;
  data: TrendDataPoint[];
}

/**
 * 前一天汇总数据（前端计算后，用于环比展示）
 */
export interface PreviousOverview {
  totalViews: number;
  averageCPM: number;
  date: string;
}

/**
 * 批量写入日报数据项
 */
export interface DailyStatsEntry {
  collaborationId: string;
  totalViews: number;
  solution?: string;
  source?: DailyStatsSource;
}

/**
 * 批量写入日报请求
 */
export interface SaveDailyStatsRequest {
  projectId: string;
  date?: string;
  data: DailyStatsEntry[];
}

/**
 * 保存备注请求
 */
export interface SaveReportSolutionRequest {
  collaborationId: string;
  date: string;
  solution: string;
}

/**
 * 更新追踪配置请求
 */
export interface UpdateTrackingConfigRequest {
  projectId: string;
  trackingConfig: Partial<TrackingConfig>;
}

// ============================================================================
// 项目追踪列表项（用于日报首页）
// ============================================================================

/**
 * 项目追踪统计数据
 * 基于"最近有数据的日期"计算
 */
export interface ProjectTrackingStats {
  /** 已发布的合作数量（达人进度分母） */
  collaborationCount: number;
  /** 已录入数据的合作数量（达人进度分子） */
  dataEnteredCount: number;
  /** 已发布合作的总金额（金额进度分母） */
  totalAmount: number;
  /** 已录入数据的合作金额（金额进度分子） */
  enteredAmount: number;
  /** 总播放量（最近数据日期的汇总） */
  totalViews: number;
  /** 最近有数据的日期 */
  latestDataDate: string | null;
  /** 平均 CPM（前端计算，可选） */
  avgCPM?: number;
}

/**
 * 项目追踪列表项
 */
export interface ProjectTrackingItem {
  /** 项目 ID */
  id: string;
  /** 项目名称 */
  name: string;
  /** 追踪配置 */
  trackingConfig?: TrackingConfig;
  /** 追踪统计数据（从后端返回） */
  trackingStats?: ProjectTrackingStats;
  /** 合作数量 */
  collaborationCount?: number;
  /** 已发布视频数 */
  publishedCount?: number;
  /** 今日待录入数 */
  pendingCount?: number;
  /** 最后更新时间 */
  lastReportDate?: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化播放量（带单位）
 */
export function formatViews(views: number): string {
  if (views >= 100000000) {
    return `${(views / 100000000).toFixed(1)}亿`;
  }
  if (views >= 10000) {
    return `${(views / 10000).toFixed(1)}万`;
  }
  return views.toLocaleString();
}

/**
 * 格式化 CPM
 */
export function formatCPM(cpm: number): string {
  return `¥${cpm.toFixed(2)}`;
}

/**
 * 格式化 CPM 变化
 */
export function formatCPMChange(change: number): string {
  if (change === 0) return '-';
  const prefix = change > 0 ? '+' : '';
  return `${prefix}${change.toFixed(2)}`;
}

/**
 * 获取今天的日期字符串
 */
export function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * 格式化日期显示
 */
export function formatReportDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = dateStr.split('T')[0];
  const todayStr = getTodayString();
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateOnly === todayStr) return '今天';
  if (dateOnly === yesterdayStr) return '昨天';

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 计算 CPM
 * @param revenueInCents 收入（分）
 * @param totalViews 播放量
 * @returns CPM 值
 */
export function calculateCPM(
  revenueInCents: number,
  totalViews: number
): number {
  if (totalViews <= 0) return 0;
  const revenueInYuan = revenueInCents / 100;
  return Math.round((revenueInYuan / totalViews) * 1000 * 100) / 100;
}
