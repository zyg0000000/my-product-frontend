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
  validFrom?: string; // 有效期开始日期
  validTo?: string; // 有效期结束日期
}

// 服务费配置
export interface ServiceFeeConfig {
  rate: number;
  calculationBase: 'beforeDiscount' | 'afterDiscount';
}

// 平台费配置（v4.0 每个平台独立定价模式）
export interface PlatformFeeConfig {
  enabled: boolean;
  pricingModel: PricingModel; // v4.0: 平台级定价模式（每个平台独立）
  platformFeeRate?: number; // 平台费率（如抖音5%）
  discountRate?: number; // 平台级折扣率（如抖音79.5%，小红书90%）- framework/hybrid 模式必填
  serviceFeeRate?: number; // 平台级服务费率 - framework/hybrid 模式可选
  validFrom?: string | null; // 平台级有效期开始 - framework/hybrid 模式可选
  validTo?: string | null; // 平台级有效期结束 - framework/hybrid 模式可选
  isPermanent?: boolean; // v4.3: 长期有效标记（与日期互斥）
  includesPlatformFee?: boolean; // 折扣是否包含平台费 - framework/hybrid 模式可选
  serviceFeeBase?: 'beforeDiscount' | 'afterDiscount'; // 服务费计算基准 - framework/hybrid 模式可选
  includesTax?: boolean; // 是否含税报价 - framework/hybrid 模式可选
  taxCalculationBase?: 'excludeServiceFee' | 'includeServiceFee'; // 税费计算基准 - framework/hybrid 模式可选
}

// 达人采买业务策略（v4.2: platformFees 改名为 platformPricingConfigs）
export interface TalentProcurementStrategy {
  enabled: boolean;
  // v4.0: pricingModel 已移到 PlatformFeeConfig 中，每个平台独立设置
  // 保留 discount 和 serviceFee 用于向后兼容，但建议使用平台级配置
  discount?: DiscountConfig;
  serviceFee?: ServiceFeeConfig;
  // v4.2: 重命名 platformFees -> platformPricingConfigs（平台定价配置）
  platformPricingConfigs?: {
    [key: string]: PlatformFeeConfig | undefined;
    douyin?: PlatformFeeConfig;
    xiaohongshu?: PlatformFeeConfig;
    kuaishou?: PlatformFeeConfig;
  };
  /** @deprecated 已弃用，请使用 platformPricingConfigs */
  platformFees?: {
    [key: string]: PlatformFeeConfig | undefined;
    douyin?: PlatformFeeConfig;
    xiaohongshu?: PlatformFeeConfig;
    kuaishou?: PlatformFeeConfig;
  };
  // 报价系数：只有 framework/hybrid 模式的平台才有
  quotationCoefficients?: {
    [key: string]: number | undefined;
    douyin?: number;
    xiaohongshu?: number;
    kuaishou?: number;
  };
}

/**
 * 广告投放业务策略（预留，待实现）
 */
export interface AdPlacementStrategy {
  enabled: boolean;
  // 预留字段，后续根据业务需求扩展
  [key: string]: unknown;
}

/**
 * 内容制作业务策略（预留，待实现）
 */
export interface ContentProductionStrategy {
  enabled: boolean;
  // 预留字段，后续根据业务需求扩展
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
