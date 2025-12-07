/**
 * 项目管理模块类型定义
 * @module types/project
 */

import type { Platform } from './talent';
import type { BusinessTypeKey, PricingModel } from './customer';

// ============================================================================
// 项目相关类型
// ============================================================================

/**
 * 项目状态（英文 key，数据库存储格式）
 */
export type ProjectStatus =
  | 'executing'
  | 'pending_settlement'
  | 'settled'
  | 'closed';

/**
 * 项目状态选项
 */
export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  'executing',
  'pending_settlement',
  'settled',
  'closed',
];

/**
 * 项目状态中文映射
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  executing: '执行中',
  pending_settlement: '待结算',
  settled: '已收款',
  closed: '已终结',
};

/**
 * 项目状态颜色映射（Ant Design Badge/Tag 颜色）
 */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  executing: 'processing',
  pending_settlement: 'warning',
  settled: 'success',
  closed: 'default',
};

/**
 * 项目状态 ProTable valueEnum 配置
 * 用于 ProTable 筛选列的 valueEnum 属性
 */
export const PROJECT_STATUS_VALUE_ENUM: Record<
  ProjectStatus,
  { text: string; status: 'Processing' | 'Warning' | 'Success' | 'Default' }
> = {
  executing: { text: PROJECT_STATUS_LABELS.executing, status: 'Processing' },
  pending_settlement: {
    text: PROJECT_STATUS_LABELS.pending_settlement,
    status: 'Warning',
  },
  settled: { text: PROJECT_STATUS_LABELS.settled, status: 'Success' },
  closed: { text: PROJECT_STATUS_LABELS.closed, status: 'Default' },
};

/**
 * 调整项类型
 */
export type AdjustmentType = '额外返点费' | '服务费减免' | '价格调整' | '其他';

/**
 * 调整项
 */
export interface Adjustment {
  id: string;
  date?: string; // YYYY-MM-DD
  type: AdjustmentType;
  description?: string;
  amount: number; // 金额（分），正数为收入，负数为支出
  reason?: string;
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
}

/**
 * 平台统计数据
 */
export interface PlatformStat {
  count: number;
  amount: number;
}

/**
 * 项目统计数据
 */
export interface ProjectStats {
  collaborationCount: number; // 合作达人数
  publishedCount: number; // 已发布数
  totalAmount: number; // 执行总金额（分）
  platformStats: Partial<Record<Platform, PlatformStat>>;
  lastUpdated?: string;
}

/**
 * 平台折扣率配置（v4.4: 按平台存储）
 */
export interface PlatformDiscounts {
  [key: string]: number | undefined;
  douyin?: number;
  xiaohongshu?: number;
  kuaishou?: number;
  bilibili?: number;
}

/**
 * 平台定价模式快照（v4.5: 记录创建时的定价模式）
 */
export interface PlatformPricingModes {
  [key: string]: PricingModel | undefined;
  douyin?: PricingModel;
  xiaohongshu?: PricingModel;
  kuaishou?: PricingModel;
  bilibili?: PricingModel;
}

/**
 * 平台报价系数快照（v4.5: 记录创建时的报价系数）
 * 只有 framework/hybrid 模式的平台才有报价系数
 */
export interface PlatformQuotationCoefficients {
  [key: string]: number | undefined;
  douyin?: number;
  xiaohongshu?: number;
  kuaishou?: number;
  bilibili?: number;
}

/**
 * 单平台 KPI 配置（v4.5）
 */
export interface PlatformProjectKPIConfig {
  /** 是否启用 KPI 考核 */
  enabled: boolean;
  /** 启用的 KPI 指标 keys */
  enabledKPIs: string[];
  /** 目标值 */
  targets?: Record<string, number>;
  /** 实际值（执行后填入） */
  actuals?: Record<string, number>;
}

/**
 * 按平台的项目 KPI 配置（v4.5）
 */
export interface ProjectKPIConfigs {
  [key: string]: PlatformProjectKPIConfig | undefined;
  douyin?: PlatformProjectKPIConfig;
  xiaohongshu?: PlatformProjectKPIConfig;
  kuaishou?: PlatformProjectKPIConfig;
  bilibili?: PlatformProjectKPIConfig;
}

/**
 * 项目 KPI 配置（v4.5）
 * @deprecated 建议使用 ProjectKPIConfigs 按平台配置
 */
export interface ProjectKPIConfig {
  /** 是否启用 KPI 考核 */
  enabled: boolean;
  /** 启用的 KPI 指标 keys */
  enabledKPIs: string[];
  /** 目标值 */
  targets?: Record<string, number>;
  /** 实际值（执行后填入） */
  actuals?: Record<string, number>;
}

/**
 * 项目完整信息（v4.5: 新增 platformPricingModes, kpiConfig）
 */
export interface Project {
  id: string;
  /** 项目编号（手动填写，如 PRJ202512001） */
  projectCode?: string;
  name: string;

  // v4.4: 业务类型改造
  businessType: BusinessTypeKey; // 一级业务类型
  businessTag?: string; // 二级业务标签（可选，如 '常规秒杀'）

  /** @deprecated 请使用 businessTag，保留用于兼容旧数据 */
  type?: string; // 原项目类型字段

  status: ProjectStatus;

  // 客户关联
  customerId: string; // 关联 customers.code
  customerName?: string; // 冗余字段

  // 时间维度
  year: number;
  month: number;
  financialYear?: number; // 财务年度
  financialMonth?: number; // 财务月份

  // 财务信息
  budget: number; // 预算（分）

  // v4.4: 折扣率改为按平台存储（创建时从客户策略读取的快照）
  platformDiscounts?: PlatformDiscounts; // 按平台折扣率 { douyin: 0.795, xiaohongshu: 0.9 }

  // v4.5: 定价模式快照（用于判断折扣来源）
  platformPricingModes?: PlatformPricingModes; // { douyin: 'framework', xiaohongshu: 'project' }

  // v4.5: 报价系数快照（只有 framework/hybrid 模式的平台才有）
  platformQuotationCoefficients?: PlatformQuotationCoefficients;

  /** @deprecated 请使用 platformDiscounts，保留用于兼容旧数据 */
  discount?: number; // 原全局折扣率 (0-1)

  // v4.5: 按平台的 KPI 配置（推荐）
  platformKPIConfigs?: ProjectKPIConfigs;
  /** @deprecated 请使用 platformKPIConfigs */
  kpiConfig?: ProjectKPIConfig;

  /** @deprecated 请使用 kpiConfig.targets.cpm，保留用于兼容旧数据 */
  benchmarkCPM?: number; // 基准 CPM

  capitalRateId?: string; // 资金费率配置ID

  /** @deprecated v4.5 已移除 */
  qianchuanId?: string; // 千川ID

  // 多平台支持
  platforms: Platform[];

  // 调整项和审计
  adjustments?: Adjustment[];
  auditLog?: AuditLogEntry[];

  // 统计缓存
  stats?: ProjectStats;

  // 元数据
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * 项目列表项（用于列表页显示）（v4.4: 新增业务类型字段）
 */
export interface ProjectListItem {
  id: string;
  /** 项目编号（手动填写） */
  projectCode?: string;
  name: string;

  // v4.4: 业务类型
  businessType: BusinessTypeKey;
  businessTag?: string;

  /** @deprecated 兼容旧数据 */
  type?: string;

  status: ProjectStatus;
  customerId: string;
  customerName?: string;
  /** 业务周期-年（面向客户） */
  year: number;
  /** 业务周期-月（面向客户） */
  month: number;
  /** 财务周期-年（面向公司财务） */
  financialYear?: number;
  /** 财务周期-月（面向公司财务） */
  financialMonth?: number;
  budget: number;
  platforms: Platform[];

  // v4.4: 按平台折扣率
  platformDiscounts?: PlatformDiscounts;
  /** @deprecated 兼容旧数据 */
  discount?: number;

  // v4.5: 按平台 KPI 配置
  platformKPIConfigs?: ProjectKPIConfigs;

  stats?: ProjectStats;
  createdAt: string;
}

/**
 * 创建项目请求（v4.5: 新增 platformPricingModes, kpiConfig）
 */
export interface CreateProjectRequest {
  /** 项目编号（手动填写，可选） */
  projectCode?: string;
  name: string;
  customerId: string;
  /** 业务周期-年（面向客户） */
  year: number;
  /** 业务周期-月（面向客户） */
  month: number;
  /** 财务周期-年（面向公司财务） */
  financialYear: number;
  /** 财务周期-月（面向公司财务） */
  financialMonth: number;
  budget: number;
  platforms: Platform[];

  // v4.4: 业务类型（必填）
  businessType: BusinessTypeKey;
  businessTag?: string; // 二级业务标签（可选）

  // v4.4: 按平台折扣率（从客户策略读取的快照）
  platformDiscounts?: PlatformDiscounts;

  // v4.5: 定价模式快照
  platformPricingModes?: PlatformPricingModes;

  // v4.5: 报价系数快照
  platformQuotationCoefficients?: PlatformQuotationCoefficients;

  // v4.5: 按平台 KPI 配置
  platformKPIConfigs?: ProjectKPIConfigs;
  /** @deprecated 请使用 platformKPIConfigs */
  kpiConfig?: ProjectKPIConfig;

  /** @deprecated 请使用 platformDiscounts */
  discount?: number;

  /** @deprecated 请使用 businessTag */
  type?: string;

  /** @deprecated 请使用 platformKPIConfigs */
  benchmarkCPM?: number;
}

/**
 * 更新项目请求（v4.5: 新增 platformKPIConfigs）
 */
export interface UpdateProjectRequest {
  /** 项目编号（手动填写） */
  projectCode?: string;
  name?: string;
  status?: ProjectStatus;
  budget?: number;
  platforms?: Platform[];
  adjustments?: Adjustment[];

  // 业务周期
  year?: number;
  month?: number;

  // 财务周期
  financialYear?: number;
  financialMonth?: number;

  // v4.4: 业务类型
  businessType?: BusinessTypeKey;
  businessTag?: string;

  // v4.4: 按平台折扣率
  platformDiscounts?: PlatformDiscounts;

  // v4.5: 定价模式快照
  platformPricingModes?: PlatformPricingModes;

  // v4.5: 报价系数快照
  platformQuotationCoefficients?: PlatformQuotationCoefficients;

  // v4.5: 按平台 KPI 配置
  platformKPIConfigs?: ProjectKPIConfigs;
  /** @deprecated 请使用 platformKPIConfigs */
  kpiConfig?: ProjectKPIConfig;

  /** @deprecated 请使用 platformDiscounts */
  discount?: number;

  /** @deprecated 请使用 businessTag */
  type?: string;

  /** @deprecated 请使用 platformKPIConfigs */
  benchmarkCPM?: number;
}

// ============================================================================
// 合作记录相关类型
// ============================================================================

/**
 * 合作状态
 */
export type CollaborationStatus =
  | '待提报工作台'
  | '工作台已提交'
  | '客户已定档'
  | '视频已发布';

/**
 * 合作状态选项
 */
export const COLLABORATION_STATUS_OPTIONS: CollaborationStatus[] = [
  '待提报工作台',
  '工作台已提交',
  '客户已定档',
  '视频已发布',
];

/**
 * 合作状态颜色映射
 */
export const COLLABORATION_STATUS_COLORS: Record<CollaborationStatus, string> =
  {
    待提报工作台: 'default',
    工作台已提交: 'processing',
    客户已定档: 'warning',
    视频已发布: 'success',
  };

/**
 * 合作状态 ProTable valueEnum 配置
 */
export const COLLABORATION_STATUS_VALUE_ENUM: Record<
  CollaborationStatus,
  { text: string; status: 'Default' | 'Processing' | 'Warning' | 'Success' }
> = {
  待提报工作台: { text: '待提报工作台', status: 'Default' },
  工作台已提交: { text: '工作台已提交', status: 'Processing' },
  客户已定档: { text: '客户已定档', status: 'Warning' },
  视频已发布: { text: '视频已发布', status: 'Success' },
};

/**
 * 订单类型
 */
export type OrderType = 'new' | 'modified' | 'cancelled';

/**
 * 达人来源
 */
export type TalentSource = '机构达人' | '独立达人' | '客户指定';

/**
 * 效果指标数据
 */
export interface EffectMetrics {
  plays?: number; // 播放量
  likes?: number; // 点赞数
  comments?: number; // 评论数
  shares?: number; // 转发数
  cpm?: number; // CPM（计算值）
  recordedAt?: string; // 录入时间
}

/**
 * 效果数据（T+7 / T+21）
 */
export interface EffectData {
  t7?: EffectMetrics;
  t21?: EffectMetrics;
}

/**
 * 合作记录调整项
 */
export interface CollaborationAdjustment {
  id: string;
  type: '价格调整' | '其他';
  amount: number;
  reason?: string;
}

/**
 * 合作记录完整信息
 */
export interface Collaboration {
  id: string;
  projectId: string;

  // 达人关联
  talentOneId: string;
  talentPlatform: Platform;
  talentName?: string; // 冗余字段
  talentSource?: TalentSource;

  // 状态
  status: CollaborationStatus;
  orderType?: OrderType;

  // 财务信息
  amount: number; // 执行金额（分）
  priceInfo?: string; // 价格档期说明
  rebateRate?: number; // 返点率 (%)
  actualRebate?: number; // 实际返点金额（分）

  // 执行追踪
  plannedReleaseDate?: string; // 计划发布日期 YYYY-MM-DD
  actualReleaseDate?: string; // 实际发布日期
  taskId?: string; // 星图任务ID
  videoId?: string; // 视频ID
  videoUrl?: string; // 视频链接

  // 财务管理
  orderDate?: string; // 下单日期
  paymentDate?: string; // 打款日期
  recoveryDate?: string; // 回款日期

  // 差异处理
  discrepancyReason?: string;
  rebateScreenshots?: string[];

  // 效果数据
  effectData?: EffectData;

  // 调整项
  adjustments?: CollaborationAdjustment[];

  // 元数据
  createdAt: string;
  updatedAt: string;
}

/**
 * 合作记录列表项
 */
export interface CollaborationListItem {
  id: string;
  projectId: string;
  talentOneId: string;
  talentPlatform: Platform;
  talentName?: string;
  talentSource?: TalentSource;
  status: CollaborationStatus;
  amount: number;
  rebateRate?: number;
  plannedReleaseDate?: string;
  actualReleaseDate?: string;
  createdAt: string;
}

/**
 * 创建合作记录请求
 */
export interface CreateCollaborationRequest {
  projectId: string;
  talentOneId: string;
  talentPlatform: Platform;
  amount: number;
  plannedReleaseDate?: string;
  rebateRate?: number;
  talentSource?: TalentSource;
}

/**
 * 更新合作记录请求
 */
export interface UpdateCollaborationRequest {
  status?: CollaborationStatus;
  amount?: number;
  plannedReleaseDate?: string;
  actualReleaseDate?: string;
  taskId?: string;
  videoId?: string;
  videoUrl?: string;
  orderDate?: string;
  paymentDate?: string;
  recoveryDate?: string;
  discrepancyReason?: string;
  effectData?: EffectData;
  adjustments?: CollaborationAdjustment[];
}

/**
 * 批量更新合作记录请求
 */
export interface BatchUpdateCollaborationsRequest {
  ids: string[];
  updates: Partial<UpdateCollaborationRequest>;
}

// ============================================================================
// API 响应类型
// ============================================================================

/**
 * 项目列表响应
 */
export interface ProjectListResponse {
  items: ProjectListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 合作记录列表响应
 */
export interface CollaborationListResponse {
  items: Collaboration[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 工作台概览数据
 */
export interface DashboardOverview {
  monthlyOverview: {
    executingCount: number; // 执行中项目数
    pendingSettlementCount: number; // 待结算项目数
    totalRevenue: number; // 总收入（分）
    profitRate: number; // 利润率 (%)
  };
  alerts: Array<{
    projectId: string;
    projectName: string;
    type: 'delay' | 'budget_exceeded' | 'pending_long';
    message: string;
  }>;
  weeklySchedule: Array<{
    date: string;
    collaborations: Array<{
      id: string;
      talentName: string;
      projectName: string;
    }>;
  }>;
  recentProjects: ProjectListItem[];
}

// ============================================================================
// 查询参数类型
// ============================================================================

/**
 * 项目列表查询参数
 */
export interface GetProjectsParams {
  page?: number;
  pageSize?: number;
  keyword?: string; // 项目名称搜索
  projectCode?: string; // 项目编号精准搜索
  status?: ProjectStatus;
  customerId?: string;
  customerKeyword?: string; // 客户名称模糊搜索
  year?: number; // 业务周期-年
  month?: number; // 业务周期-月
  financialYear?: number; // 财务周期-年
  financialMonth?: number; // 财务周期-月
  platforms?: Platform[];
  businessType?: BusinessTypeKey; // 业务类型筛选
}

/**
 * 合作记录查询参数
 */
export interface GetCollaborationsParams {
  projectId: string;
  page?: number;
  pageSize?: number;
  platform?: Platform;
  status?: CollaborationStatus;
}

// ============================================================================
// 项目类型配置（客户级别）
// ============================================================================

/**
 * 项目类型配置项
 */
export interface ProjectTypeItem {
  id: string;
  name: string;
  isDefault?: boolean;
}

/**
 * 项目类型配置
 */
export interface ProjectTypeConfig {
  types: ProjectTypeItem[];
  allowCustomType?: boolean;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化金额（分 → 元）
 */
export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  });
}

/**
 * 金额元转分
 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 金额分转元
 */
export function centsToYuan(cents: number): number {
  return cents / 100;
}

/**
 * 生成项目业务ID
 */
export function generateProjectId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `proj_${timestamp}_${random}`;
}

/**
 * 生成合作记录业务ID
 */
export function generateCollaborationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `collab_${timestamp}_${random}`;
}

/**
 * 计算执行进度（已发布数/总数）
 */
export function calculateProgress(stats?: ProjectStats): number {
  if (!stats || stats.collaborationCount === 0) return 0;
  return Math.round((stats.publishedCount / stats.collaborationCount) * 100);
}

/**
 * 判断合作是否延期
 */
export function isDelayed(
  plannedDate?: string,
  actualDate?: string,
  status?: CollaborationStatus
): boolean {
  if (!plannedDate) return false;
  if (status === '视频已发布' && actualDate) {
    return new Date(actualDate) > new Date(plannedDate);
  }
  if (status !== '视频已发布') {
    return new Date() > new Date(plannedDate);
  }
  return false;
}

/**
 * 生成年份 valueEnum（动态：当前年 -2 ~ +1 年）
 * 用于 ProTable 筛选列的 valueEnum 属性
 */
export function generateYearValueEnum(): Record<number, { text: string }> {
  const currentYear = new Date().getFullYear();
  const years: Record<number, { text: string }> = {};
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years[y] = { text: `${y}年` };
  }
  return years;
}

/**
 * 生成月份 valueEnum（固定：1-12月）
 * 用于 ProTable 筛选列的 valueEnum 属性
 */
export function generateMonthValueEnum(): Record<number, { text: string }> {
  const months: Record<number, { text: string }> = {};
  for (let m = 1; m <= 12; m++) {
    months[m] = { text: `${m}月` };
  }
  return months;
}
