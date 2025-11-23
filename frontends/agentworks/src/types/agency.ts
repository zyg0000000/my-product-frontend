/**
 * 机构类型定义
 */

/**
 * 机构类型枚举
 */
export type AgencyType = 'agency' | 'individual';

/**
 * 机构状态
 */
export type AgencyStatus = 'active' | 'inactive' | 'suspended';

/**
 * 机构类型显示名称
 */
export const AGENCY_TYPE_NAMES: Record<AgencyType, string> = {
  agency: '机构',
  individual: '个人',
};

/**
 * 机构状态显示名称
 */
export const AGENCY_STATUS_NAMES: Record<AgencyStatus, string> = {
  active: '正常',
  inactive: '停用',
  suspended: '暂停',
};

/**
 * 联系信息
 */
export interface ContactInfo {
  contactPerson?: string;    // 联系人姓名
  wechatId?: string;         // 微信号
  phoneNumber?: string;      // 手机号
  email?: string;            // 邮箱
}

/**
 * 返点配置
 */
export interface RebateConfig {
  baseRebate: number;        // 基础返点率（%）- v1.0-v2.0 遗留字段，已弃用
  effectiveDate?: string;    // 生效日期
  lastUpdatedAt?: string;    // 最后更新时间
  updatedBy?: string;        // 更新人
  tieredRules?: Array<{      // 阶梯返点规则（预留）
    minAmount: number;
    maxAmount: number;
    rebateRate: number;
  }>;
  specialRules?: Array<{     // 特殊返点规则（预留）
    condition: string;
    rebateRate: number;
    effectiveDate?: Date;
    expiryDate?: Date;
  }>;
  platforms?: {              // v3.0 新增：按平台设置的返点配置
    [key: string]: {
      baseRebate: number;
      effectiveDate: string;
      lastUpdatedAt: string;
      updatedBy: string;
    };
  };
}

/**
 * 机构接口（完整）
 */
export interface Agency {
  _id?: string;              // MongoDB ID
  id: string;                // 机构唯一标识
  name: string;              // 机构名称
  type: AgencyType;          // 机构类型
  contactInfo?: ContactInfo; // 联系信息
  rebateConfig?: RebateConfig; // 返点配置
  description?: string;      // 备注说明
  status: AgencyStatus;      // 状态
  statistics?: {             // 统计信息
    talentCount: number;
    totalRevenue?: number;
    lastUpdated?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建/更新机构的表单数据
 */
export interface AgencyFormData {
  name: string;
  type: AgencyType;
  contactPerson?: string;
  wechatId?: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  status?: AgencyStatus;
}

/**
 * 特殊机构ID常量
 */
export const AGENCY_INDIVIDUAL_ID = 'individual'; // 野生达人的统一机构ID
