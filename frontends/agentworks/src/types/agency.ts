/**
 * 机构类型定义
 */

/**
 * 机构类型枚举
 */
export type AgencyType = 'agency' | 'individual';

/**
 * 机构类型显示名称
 */
export const AGENCY_TYPE_NAMES: Record<AgencyType, string> = {
  agency: '机构',
  individual: '个人',
};

/**
 * 机构接口
 */
export interface Agency {
  id: string;
  name: string;
  type: AgencyType;
  baseRebate: number; // 基础返点（%）
  contactPerson?: string;
  contactPhone?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建/更新机构的表单数据
 */
export interface AgencyFormData {
  name: string;
  type: AgencyType;
  baseRebate: number;
  contactPerson?: string;
  contactPhone?: string;
  description?: string;
}

/**
 * 特殊机构ID常量
 */
export const AGENCY_INDIVIDUAL_ID = 'individual'; // 野生达人的统一机构ID
