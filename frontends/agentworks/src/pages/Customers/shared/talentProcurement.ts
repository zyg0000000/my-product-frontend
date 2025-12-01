/**
 * 达人采买策略 - 共享类型和工具函数
 *
 * v4.1: 移除硬编码平台常量，平台列表从 usePlatformConfig Hook 动态获取
 * 平台需要启用 features.priceManagement 功能开关才会显示
 */

// ============ 常量定义 ============

/** 定价模式名称映射 */
export const PRICING_MODEL_NAMES: Record<string, string> = {
  framework: '框架折扣',
  project: '项目比价',
  hybrid: '混合模式',
};

// ============ 类型定义 ============

/** 定价模式类型 */
export type PricingModel = 'framework' | 'project' | 'hybrid';

/** 平台配置类型（v4.0: 每个平台独立定价模式） */
export interface PlatformConfig {
  enabled?: boolean;
  pricingModel?: PricingModel; // v4.0: 平台级定价模式
  platformFeeRate?: number;
  discountRate?: number;
  serviceFeeRate?: number;
  validFrom?: string | null;
  validTo?: string | null;
  isPermanent?: boolean; // v4.3: 长期有效标记
  includesPlatformFee?: boolean;
  serviceFeeBase?: 'beforeDiscount' | 'afterDiscount';
  includesTax?: boolean;
  taxCalculationBase?: 'excludeServiceFee' | 'includeServiceFee';
}

/** 平台定价配置集合（v4.2: 重命名 PlatformFees -> PlatformPricingConfigs） */
export interface PlatformPricingConfigs {
  [key: string]: PlatformConfig;
}

/** @deprecated 使用 PlatformPricingConfigs 代替 */
export type PlatformFees = PlatformPricingConfigs;

/** 系数计算结果 */
export interface CoefficientResult {
  platform: string;
  baseAmount: number;
  platformFeeAmount: number;
  discountedAmount: number;
  serviceFeeAmount: number;
  taxAmount: number;
  finalAmount: number;
  coefficient: number;
}

/** 达人采买策略数据（v4.2: platformFees 重命名为 platformPricingConfigs） */
export interface TalentProcurementStrategy {
  enabled?: boolean;
  // v4.2: 重命名 platformFees -> platformPricingConfigs（平台定价配置）
  platformPricingConfigs?: PlatformPricingConfigs;
  /** @deprecated 使用 platformPricingConfigs 代替 */
  platformFees?: PlatformPricingConfigs;
  quotationCoefficients?: Record<string, number>;
}

// ============ 工具函数 ============

/**
 * 获取平台配置默认值
 * v4.1: 参数改为接收 platformFeeRate，不再依赖硬编码的 getPlatformByKey
 * @param platformFeeRate - 平台费率（从 usePlatformConfig 获取）
 */
export const getDefaultPlatformConfig = (
  platformFeeRate = 0
): PlatformConfig => {
  return {
    enabled: false,
    pricingModel: 'framework',
    platformFeeRate,
    discountRate: 1.0,
    serviceFeeRate: 0,
    validFrom: null,
    validTo: null,
    isPermanent: false, // v4.3: 默认不是长期有效，需要明确选择
    includesPlatformFee: false,
    serviceFeeBase: 'beforeDiscount',
    includesTax: true,
    taxCalculationBase: 'excludeServiceFee',
  };
};

/**
 * v4.3: 校验平台有效期配置
 * @returns 错误信息，如果校验通过返回 null
 */
export const validatePlatformValidity = (
  config: PlatformConfig,
  platformName: string
): string | null => {
  if (!config.enabled) return null; // 未启用的平台不需要校验

  // 必须设置有效期或勾选长期有效
  if (!config.isPermanent && (!config.validFrom || !config.validTo)) {
    return `${platformName}：请设置有效期或勾选"长期有效"`;
  }

  return null;
};

/**
 * v4.3: 校验所有平台的有效期配置
 * @returns 错误信息数组
 */
export const validateAllPlatformsValidity = (
  configs: PlatformPricingConfigs,
  getPlatformName: (key: string) => string
): string[] => {
  const errors: string[] = [];

  Object.entries(configs).forEach(([key, config]) => {
    if (config?.enabled) {
      const error = validatePlatformValidity(config, getPlatformName(key));
      if (error) errors.push(error);
    }
  });

  return errors;
};

/** 计算报价系数 */
export const calculateCoefficient = (
  config: PlatformConfig
): CoefficientResult => {
  const baseAmount = 1000;
  const platformFeeAmount = baseAmount * (config.platformFeeRate || 0);
  const discountRate = config.discountRate || 1.0;

  let discountedAmount;
  if (config.includesPlatformFee) {
    discountedAmount = (baseAmount + platformFeeAmount) * discountRate;
  } else {
    discountedAmount = baseAmount * discountRate + platformFeeAmount;
  }

  let serviceFeeAmount = 0;
  if (config.serviceFeeBase === 'beforeDiscount') {
    serviceFeeAmount =
      (baseAmount + platformFeeAmount) * (config.serviceFeeRate || 0);
  } else {
    serviceFeeAmount = discountedAmount * (config.serviceFeeRate || 0);
  }

  let taxAmount = 0;
  const taxRate = 0.06;
  if (!config.includesTax) {
    if (config.taxCalculationBase === 'includeServiceFee') {
      taxAmount = (discountedAmount + serviceFeeAmount) * taxRate;
    } else {
      taxAmount = discountedAmount * taxRate;
    }
  }

  const finalAmount = discountedAmount + serviceFeeAmount + taxAmount;
  const coefficient = finalAmount / baseAmount;

  return {
    platform: '',
    baseAmount,
    platformFeeAmount,
    discountedAmount,
    serviceFeeAmount,
    taxAmount,
    finalAmount,
    coefficient: Number(coefficient.toFixed(4)),
  };
};

/** 计算所有启用平台的系数 - v4.2: 参数名更新为 platformPricingConfigs */
export const calculateAllCoefficients = (
  platformPricingConfigs: PlatformPricingConfigs
): Record<string, CoefficientResult> => {
  const results: Record<string, CoefficientResult> = {};

  Object.entries(platformPricingConfigs).forEach(([platform, config]) => {
    // v4.0: 只有启用的、且是 framework/hybrid 模式的平台才计算系数
    if (config?.enabled && config.pricingModel !== 'project') {
      const result = calculateCoefficient(config);
      results[platform] = { ...result, platform };
    }
  });

  return results;
};

/** 根据定价模式获取提示信息 */
export const getPricingModeInfo = (pricingModel: string) => {
  switch (pricingModel) {
    case 'framework':
      return {
        title: '框架折扣模式',
        description: '项目将自动使用以下报价系数计算对客报价',
        coefficientLabel: '报价系数',
        coefficientColor: 'blue' as const,
        statusText: '项目可用',
        statusIcon: '✓',
      };
    case 'project':
      return {
        title: '项目比价模式',
        description: '以下系数仅供参考，每个项目需单独填写对客报价',
        coefficientLabel: '参考系数',
        coefficientColor: 'default' as const,
        statusText: '仅供参考',
        statusIcon: 'i',
      };
    case 'hybrid':
      return {
        title: '混合模式',
        description: '项目创建时可选择使用系数或手动填写报价',
        coefficientLabel: '基准系数',
        coefficientColor: 'orange' as const,
        statusText: '可选使用',
        statusIcon: '◐',
      };
    default:
      return {
        title: '定价模式',
        description: '',
        coefficientLabel: '报价系数',
        coefficientColor: 'blue' as const,
        statusText: '',
        statusIcon: '',
      };
  }
};
