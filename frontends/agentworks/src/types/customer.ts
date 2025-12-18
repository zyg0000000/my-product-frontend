/**
 * 客户管理相关类型定义
 *
 * v5.0: 多时间段定价策略支持
 * - PricingConfigItem: 单个时间段的配置项
 * - PlatformPricingStrategy: 平台定价策略（含 configs 数组）
 */

import type { CustomerProjectConfig } from './projectConfig';
import type {
  PricingConfigItem,
  PlatformPricingStrategy,
  PlatformPricingConfigs,
  PricingModel,
} from '../pages/Customers/shared/talentProcurement';

// 重新导出供其他模块使用
export type { PricingConfigItem, PlatformPricingStrategy, PlatformPricingConfigs, PricingModel };

// 客户级别
export type CustomerLevel = 'VIP' | 'large' | 'medium' | 'small';

// 客户状态
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

// 联系人信息
export interface Contact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

/**
 * @deprecated v5.0 废弃，使用 PricingConfigItem 代替
 */
export interface DiscountConfig {
  rate: number;
  includesPlatformFee: boolean;
  validFrom?: string;
  validTo?: string;
}

/**
 * @deprecated v5.0 废弃
 */
export interface ServiceFeeConfig {
  rate: number;
  calculationBase: 'beforeDiscount' | 'afterDiscount';
}

/**
 * @deprecated v5.0 废弃，使用 PlatformPricingStrategy 代替
 */
export interface PlatformFeeConfig {
  enabled: boolean;
  pricingModel: PricingModel;
  platformFeeRate?: number;
  discountRate?: number;
  serviceFeeRate?: number;
  validFrom?: string | null;
  validTo?: string | null;
  isPermanent?: boolean;
  includesPlatformFee?: boolean;
  serviceFeeBase?: 'beforeDiscount' | 'afterDiscount';
  includesTax?: boolean;
  taxCalculationBase?: 'excludeServiceFee' | 'includeServiceFee';
}

/**
 * 平台级 KPI 配置（v4.5）
 * 每个平台独立配置 KPI 考核
 */
export interface PlatformKPIConfig {
  /** 是否启用 KPI 考核 */
  enabled: boolean;
  /** 启用的 KPI 指标 keys（如 ['cpm', 'cpe']） */
  enabledKPIs: string[];
  /** 默认目标值（项目创建时继承） */
  defaultTargets?: Record<string, number>;
}

/**
 * 客户级 KPI 配置（v4.5）
 * @deprecated 建议使用 platformKPIConfigs 按平台配置
 */
export interface CustomerKPIConfig {
  /** 是否启用 KPI 考核 */
  enabled: boolean;
  /** 启用的 KPI 指标 keys（如 ['cpm', 'cpe']） */
  enabledKPIs: string[];
  /** 默认目标值（项目创建时继承） */
  defaultTargets?: Record<string, number>;
}

/**
 * 按平台的 KPI 配置映射（v4.5）
 */
export interface PlatformKPIConfigs {
  [key: string]: PlatformKPIConfig | undefined;
  douyin?: PlatformKPIConfig;
  xiaohongshu?: PlatformKPIConfig;
  kuaishou?: PlatformKPIConfig;
}

/**
 * 达人采买业务策略
 * v5.0: 支持多时间段定价配置
 */
export interface TalentProcurementStrategy {
  enabled: boolean;

  /**
   * v5.0: 平台定价配置（新结构，支持多时间段）
   * key 为平台标识，value 包含 enabled、pricingModel 和 configs 数组
   */
  platformPricingConfigs?: PlatformPricingConfigs;

  /**
   * 报价系数：保存时自动计算当前有效配置的系数
   * 只有 framework/hybrid 模式的平台才有
   */
  quotationCoefficients?: {
    [key: string]: number | undefined;
    douyin?: number;
    xiaohongshu?: number;
    kuaishou?: number;
  };

  /** v4.4: 二级业务标签（按平台，客户自定义） */
  platformBusinessTags?: {
    [key: string]: string[] | undefined;
    douyin?: string[];
    xiaohongshu?: string[];
    kuaishou?: string[];
  };

  /** v4.5: 按平台的 KPI 配置 */
  platformKPIConfigs?: PlatformKPIConfigs;

  // ===== 以下为废弃字段，保留用于向后兼容 =====

  /** @deprecated v5.0 废弃 */
  discount?: DiscountConfig;
  /** @deprecated v5.0 废弃 */
  serviceFee?: ServiceFeeConfig;
  /** @deprecated v5.0 废弃，请使用 platformPricingConfigs */
  platformFees?: {
    [key: string]: PlatformFeeConfig | undefined;
    douyin?: PlatformFeeConfig;
    xiaohongshu?: PlatformFeeConfig;
    kuaishou?: PlatformFeeConfig;
  };
  /** @deprecated v5.0 废弃，请使用 platformKPIConfigs */
  kpiConfig?: CustomerKPIConfig;
}

/**
 * 广告投放业务策略（v4.4: 添加业务标签，定价策略预留）
 */
export interface AdPlacementStrategy {
  enabled: boolean;
  // v4.4: 二级业务标签（按平台，客户自定义）
  platformBusinessTags?: {
    [key: string]: string[] | undefined;
    douyin?: string[];
    xiaohongshu?: string[];
    kuaishou?: string[];
  };
  // 预留：未来添加定价策略
  // platformPricingConfigs?: { [key: string]: PlatformFeeConfig | undefined };
  [key: string]: unknown;
}

/**
 * 内容制作业务策略（v4.4: 添加业务标签，定价策略预留）
 */
export interface ContentProductionStrategy {
  enabled: boolean;
  // v4.4: 二级业务标签（按平台，客户自定义）
  platformBusinessTags?: {
    [key: string]: string[] | undefined;
    douyin?: string[];
    xiaohongshu?: string[];
    kuaishou?: string[];
  };
  // 预留：未来添加定价策略
  // platformPricingConfigs?: { [key: string]: PlatformFeeConfig | undefined };
  [key: string]: unknown;
}

// 业务策略配置
export interface BusinessStrategies {
  talentProcurement?: TalentProcurementStrategy;
  adPlacement?: AdPlacementStrategy;
  contentProduction?: ContentProductionStrategy;
}

// 客户主体
export interface Customer {
  _id?: string;
  code: string;
  name: string;
  level: CustomerLevel;
  status: CustomerStatus;
  industry?: string;
  contacts: Contact[];
  businessStrategies?: BusinessStrategies;
  /** 项目配置（v5.0 新增：控制项目详情页的显示） */
  projectConfig?: CustomerProjectConfig;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date; // 软删除时间
}

// 创建客户请求
export interface CreateCustomerRequest {
  name: string;
  level: CustomerLevel;
  status: CustomerStatus;
  industry?: string;
  contacts?: Contact[];
  businessStrategies?: BusinessStrategies;
  notes?: string;
}

// 更新客户请求
export interface UpdateCustomerRequest {
  name?: string;
  level?: CustomerLevel;
  status?: CustomerStatus;
  industry?: string;
  contacts?: Contact[];
  businessStrategies?: BusinessStrategies;
  /** 项目配置（v5.0 新增） */
  projectConfig?: CustomerProjectConfig;
  notes?: string;
}

// 常量定义
export const CUSTOMER_LEVEL_NAMES: Record<CustomerLevel, string> = {
  VIP: 'VIP',
  large: '大型',
  medium: '中型',
  small: '小型',
};

// v4.4: 一级业务类型定义
export type BusinessTypeKey =
  | 'talentProcurement'
  | 'adPlacement'
  | 'contentProduction';

export interface BusinessTypeConfig {
  key: BusinessTypeKey;
  name: string;
  hasPricing: boolean; // 是否有定价策略
}

export const BUSINESS_TYPES: Record<BusinessTypeKey, BusinessTypeConfig> = {
  talentProcurement: {
    key: 'talentProcurement',
    name: '达人采买',
    hasPricing: true,
  },
  adPlacement: { key: 'adPlacement', name: '广告投流', hasPricing: false },
  contentProduction: {
    key: 'contentProduction',
    name: '内容制作',
    hasPricing: false,
  },
};

export const BUSINESS_TYPE_OPTIONS: Array<{
  label: string;
  value: BusinessTypeKey;
}> = [
  { label: '达人采买', value: 'talentProcurement' },
  { label: '广告投流', value: 'adPlacement' },
  { label: '内容制作', value: 'contentProduction' },
];

export const CUSTOMER_STATUS_NAMES: Record<CustomerStatus, string> = {
  active: '活跃',
  inactive: '停用',
  suspended: '暂停',
  deleted: '已删除',
};

/**
 * 客户级别 ProTable valueEnum 配置
 */
export const CUSTOMER_LEVEL_VALUE_ENUM: Record<
  CustomerLevel,
  { text: string }
> = {
  VIP: { text: 'VIP' },
  large: { text: '大型' },
  medium: { text: '中型' },
  small: { text: '小型' },
};

/**
 * 客户状态 ProTable valueEnum 配置
 */
export const CUSTOMER_STATUS_VALUE_ENUM: Record<
  CustomerStatus,
  { text: string }
> = {
  active: { text: '活跃' },
  inactive: { text: '停用' },
  suspended: { text: '暂停' },
  deleted: { text: '已删除' },
};

/**
 * 业务类型 ProTable valueEnum 配置
 */
export const BUSINESS_TYPE_VALUE_ENUM: Record<
  BusinessTypeKey,
  { text: string }
> = {
  talentProcurement: { text: '达人采买' },
  adPlacement: { text: '广告投流' },
  contentProduction: { text: '内容制作' },
};
