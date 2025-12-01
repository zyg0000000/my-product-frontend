/**
 * 项目管理模块类型定义
 * @module types/project
 */

import type { Platform } from './talent';

// ============================================================================
// 项目相关类型
// ============================================================================

/**
 * 项目状态
 */
export type ProjectStatus = '执行中' | '待结算' | '已收款' | '已终结';

/**
 * 项目状态选项
 */
export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  '执行中',
  '待结算',
  '已收款',
  '已终结',
];

/**
 * 项目状态颜色映射（Ant Design Badge/Tag 颜色）
 */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  执行中: 'processing',
  待结算: 'warning',
  已收款: 'success',
  已终结: 'default',
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
 * 项目完整信息
 */
export interface Project {
  id: string;
  name: string;
  type: string; // 项目类型（由客户配置决定）
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
  discount?: number; // 折扣率 (0-1)
  benchmarkCPM?: number; // 基准 CPM
  capitalRateId?: string; // 资金费率配置ID
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
 * 项目列表项（用于列表页显示）
 */
export interface ProjectListItem {
  id: string;
  name: string;
  type: string;
  status: ProjectStatus;
  customerId: string;
  customerName?: string;
  year: number;
  month: number;
  budget: number;
  platforms: Platform[];
  stats?: ProjectStats;
  createdAt: string;
}

/**
 * 创建项目请求
 */
export interface CreateProjectRequest {
  name: string;
  type: string;
  customerId: string;
  year: number;
  month: number;
  budget: number;
  platforms: Platform[];
  discount?: number;
  benchmarkCPM?: number;
  qianchuanId?: string;
}

/**
 * 更新项目请求
 */
export interface UpdateProjectRequest {
  name?: string;
  type?: string;
  status?: ProjectStatus;
  budget?: number;
  discount?: number;
  benchmarkCPM?: number;
  qianchuanId?: string;
  platforms?: Platform[];
  adjustments?: Adjustment[];
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
  status?: ProjectStatus;
  customerId?: string;
  year?: number;
  month?: number;
  platforms?: Platform[];
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
