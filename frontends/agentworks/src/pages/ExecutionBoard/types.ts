/**
 * 执行看板 - 类型定义
 */

import type {
  Collaboration,
  ProjectStatus,
  CollaborationStatus,
} from '../../types/project';
import type { Platform } from '../../types/talent';

/**
 * 周期类型：业务周期（面向客户） / 财务周期（面向公司财务）
 */
export type CycleType = 'business' | 'financial';

/**
 * 周期筛选条件
 */
export interface CycleFilter {
  type: CycleType;
  year: number | null;
  month: number | null;
}

/**
 * 执行看板筛选条件
 */
export interface ExecutionFilters {
  customerId: string | null;
  projectIds: string[];
  platforms: Platform[];
  cycle: CycleFilter;
}

/**
 * 项目周期信息
 */
export interface ProjectCycle {
  startDate: Date;
  endDate: Date;
  totalWeeks: number;
}

/**
 * 周统计数据
 */
export interface WeekStat {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  publishedCount: number;
  scheduledCount: number;
  delayedCount: number;
  totalCount: number;
}

/**
 * KPI 统计数据
 */
export interface ExecutionStats {
  // 全周期统计
  all: {
    totalPlan: number;
    publishedCount: number;
    publishRate: number;
    delayedCount: number;
  };
  // 当周统计
  current: {
    totalPlan: number;
    publishedCount: number;
    publishRate: number;
    dueToday: number;
    dueWeek: number;
    delayedCount: number;
  };
}

/**
 * 项目颜色配置
 */
export interface ProjectColor {
  index: number;
  bg: string;
  border: string;
  text: string;
  hex: string;
}

/**
 * 带项目信息的合作记录（用于看板展示）
 */
export interface CollaborationWithProject extends Collaboration {
  projectName: string;
  projectStatus: ProjectStatus;
  projectColor: ProjectColor;
}

/**
 * 客户选项
 */
export interface CustomerOption {
  id: string;
  name: string;
  code: string;
}

/**
 * 项目选项
 */
export interface ProjectOption {
  id: string;
  name: string;
  status: ProjectStatus;
  customerId: string;
}

/**
 * 更新合作记录请求
 */
export interface UpdateCollaborationRequest {
  plannedReleaseDate?: string;
  actualReleaseDate?: string;
  taskId?: string;
  videoId?: string;
  status?: CollaborationStatus;
}
