/**
 * 日报分组类型定义
 * 用于将多个项目合并为一份日报
 */

/**
 * 日报分组配置
 */
export interface DailyReportGroup {
  /** 分组 ID */
  id: string;
  /** 分组名称（用于管理界面显示，可选，默认使用主项目名称） */
  name?: string;
  /** 主项目 ID（日报标题使用此项目名称） */
  primaryProjectId: string;
  /** 包含的项目 ID 列表（包括主项目） */
  projectIds: string[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * localStorage 存储的分组数据结构
 */
export interface DailyReportGroupStorage {
  groups: DailyReportGroup[];
  version: number;
}

/**
 * 分组创建/编辑表单数据
 */
export interface DailyReportGroupFormData {
  name?: string;
  primaryProjectId: string;
  projectIds: string[];
}

/**
 * localStorage 存储 key
 */
export const DAILY_REPORT_GROUPS_STORAGE_KEY = 'agentworks_daily_report_groups';

/**
 * 当前存储版本
 */
export const DAILY_REPORT_GROUPS_STORAGE_VERSION = 1;
