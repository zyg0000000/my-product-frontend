/**
 * 客户管理相关类型定义
 */

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

// 定价模式
export type PricingModel = 'framework' | 'project' | 'hybrid';

// 折扣配置
export interface DiscountConfig {
  rate: number;
  includesPlatformFee: boolean;
  validFrom?: string;  // 有效期开始日期
  validTo?: string;    // 有效期结束日期
}

// 服务费配置
export interface ServiceFeeConfig {
  rate: number;
  calculationBase: 'beforeDiscount' | 'afterDiscount';
}

// 平台费配置（v3.0 支持完全独立的平台级配置）
export interface PlatformFeeConfig {
  enabled: boolean;
  platformFeeRate: number;                                    // 平台费率（如抖音5%）
  discountRate?: number;                                      // 平台级折扣率（如抖音79.5%，小红书90%）
  serviceFeeRate?: number;                                    // 平台级服务费率
  validFrom?: string | null;                                  // 平台级有效期开始
  validTo?: string | null;                                    // 平台级有效期结束
  includesPlatformFee?: boolean;                              // 折扣是否包含平台费
  serviceFeeBase?: 'beforeDiscount' | 'afterDiscount';        // 服务费计算基准
  includesTax?: boolean;                                      // 是否含税报价
  taxCalculationBase?: 'excludeServiceFee' | 'includeServiceFee'; // 税费计算基准
}

// 达人采买业务策略
export interface TalentProcurementStrategy {
  enabled: boolean;
  pricingModel: PricingModel;
  discount?: DiscountConfig;
  serviceFee?: ServiceFeeConfig;
  platformFees: {
    [key: string]: PlatformFeeConfig | undefined;
    douyin?: PlatformFeeConfig;
    xiaohongshu?: PlatformFeeConfig;
    kuaishou?: PlatformFeeConfig;
  };
  paymentCoefficients?: {
    [key: string]: number | undefined;
    douyin?: number;
    xiaohongshu?: number;
    kuaishou?: number;
  };
}

// 业务策略配置
export interface BusinessStrategies {
  talentProcurement?: TalentProcurementStrategy;
  adPlacement?: any;
  contentProduction?: any;
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
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

// 创建客户请求
export interface CreateCustomerRequest {
  name: string;
  level: CustomerLevel;
  status: CustomerStatus;
  industry?: string;
  contacts?: Contact[];
  businessStrategies?: any;
  notes?: string;
}

// 更新客户请求
export interface UpdateCustomerRequest {
  name?: string;
  level?: CustomerLevel;
  status?: CustomerStatus;
  industry?: string;
  contacts?: Contact[];
  businessStrategies?: any;
  notes?: string;
}

// 常量定义
export const CUSTOMER_LEVEL_NAMES: Record<CustomerLevel, string> = {
  VIP: 'VIP',
  large: '大型',
  medium: '中型',
  small: '小型',
};

export const CUSTOMER_STATUS_NAMES: Record<CustomerStatus, string> = {
  active: '活跃',
  inactive: '停用',
  suspended: '暂停',
  deleted: '已删除',
};
