/**
 * 达人采买策略 - 共享类型和工具函数
 *
 * ====== 数据库 Schema 文档 (MongoDB) ======
 *
 * Collection: customers
 * Field: businessStrategies.talentProcurement.platformPricingConfigs
 *
 * 数据结构示例：
 * ```json
 * {
 *   "douyin": {
 *     "enabled": true,
 *     "pricingModel": "framework",  // "framework" | "project" | "hybrid"
 *     "configs": [
 *       {
 *         "id": "cfg_1702521600_abc123",
 *         "discountRate": 0.795,           // 折扣率 (0-1)
 *         "serviceFeeRate": 0.05,          // 服务费率 (0-1)
 *         "platformFeeRate": 0.05,         // 平台费率 (0-1)
 *         "includesPlatformFee": false,    // 折扣是否包含平台费
 *         "serviceFeeBase": "beforeDiscount", // 服务费计算基准
 *         "includesTax": true,             // 报价是否含税
 *         "taxCalculationBase": "excludeServiceFee",
 *         "validFrom": "2025-01-01",       // 有效期开始 (YYYY-MM-DD)
 *         "validTo": "2025-08-31",         // 有效期结束 (YYYY-MM-DD)
 *         "isPermanent": false,            // 是否长期有效
 *         "createdAt": "2024-12-15T10:00:00.000Z",
 *         "updatedAt": "2024-12-15T10:00:00.000Z"
 *       },
 *       {
 *         "id": "cfg_1702521601_def456",
 *         "discountRate": 0.85,
 *         "serviceFeeRate": 0.05,
 *         "platformFeeRate": 0.05,
 *         "includesPlatformFee": false,
 *         "serviceFeeBase": "beforeDiscount",
 *         "includesTax": true,
 *         "taxCalculationBase": "excludeServiceFee",
 *         "validFrom": "2025-09-01",
 *         "validTo": "2025-12-31",
 *         "isPermanent": false,
 *         "createdAt": "2024-12-15T10:00:00.000Z",
 *         "updatedAt": "2024-12-15T10:00:00.000Z"
 *       }
 *     ]
 *   },
 *   "xiaohongshu": {
 *     "enabled": true,
 *     "pricingModel": "project",
 *     "configs": null  // project 模式不需要配置
 *   }
 * }
 * ```
 *
 * 业务规则：
 * 1. getEffectiveConfig: 获取当前生效配置
 *    - 优先匹配「日期范围覆盖今天」的配置
 *    - 其次匹配「长期有效」的配置
 *    - 都没有返回 null
 *
 * 2. 时间段重叠校验
 *    - 有日期范围的配置之间不能重叠
 *    - isPermanent 的配置不参与重叠校验
 *
 * 3. 定价模式：
 *    - framework: 框架折扣，项目自动使用报价系数
 *    - project: 项目比价，每个项目手动填写报价
 *    - hybrid: 混合模式，达人可选择使用系数或手动填写
 *
 * Collection: pricing_history (审计日志)
 * 变更类型：config_create, config_update, config_delete,
 *          model_change, platform_enable, platform_disable
 *
 * ====== 版本历史 ======
 *
 * v5.1: 2024-12
 * - 多时间段定价策略支持
 * - PlatformPricingStrategy: 新的平台策略结构（含 configs 数组）
 * - PricingConfigItem: 单个时间段的配置项
 * - getEffectiveConfig: 获取当前有效配置
 * - hasTimeOverlap: 时间段重叠校验
 * - calculateAllEffectiveCoefficients: 计算所有平台当前有效系数
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

/** 配置状态名称映射 */
export const CONFIG_STATUS_NAMES: Record<string, string> = {
  active: '当前生效',
  upcoming: '即将生效',
  expired: '已过期',
  permanent: '长期有效',
};

// ============ 类型定义 ============

/** 定价模式类型 */
export type PricingModel = 'framework' | 'project' | 'hybrid';

/** 配置状态类型 */
export type ConfigStatus = 'active' | 'upcoming' | 'expired' | 'permanent';

/**
 * v5.0: 单个时间段的定价配置项
 * 用于 framework/hybrid 模式的多时间段配置
 */
export interface PricingConfigItem {
  /** 配置唯一ID */
  id: string;
  /** 折扣率 (0-1) */
  discountRate: number;
  /** 服务费率 (0-1) */
  serviceFeeRate: number;
  /** 平台费率 (0-1) */
  platformFeeRate: number;
  /** 折扣是否包含平台费 */
  includesPlatformFee: boolean;
  /** 服务费计算基准 */
  serviceFeeBase: 'beforeDiscount' | 'afterDiscount';
  /** 报价是否含税 */
  includesTax: boolean;
  /** 税费计算基准 */
  taxCalculationBase: 'excludeServiceFee' | 'includeServiceFee';
  /** 有效期开始日期 (YYYY-MM-DD)，长期有效时为 null */
  validFrom: string | null;
  /** 有效期结束日期 (YYYY-MM-DD)，长期有效时为 null */
  validTo: string | null;
  /** 是否长期有效 */
  isPermanent: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * v5.0: 单个平台的定价策略
 * 包含定价模式和配置列表
 */
export interface PlatformPricingStrategy {
  /** 是否启用该平台 */
  enabled: boolean;
  /** 定价模式 */
  pricingModel: PricingModel;
  /** 配置列表 (framework/hybrid 模式使用，project 模式为 null) */
  configs?: PricingConfigItem[] | null;
}

/**
 * v5.0: 平台定价配置集合
 * key 为平台标识 (douyin, xiaohongshu, kuaishou 等)
 */
export interface PlatformPricingConfigs {
  [platform: string]: PlatformPricingStrategy;
}

/**
 * @deprecated v5.0 废弃，使用 PricingConfigItem 代替
 * 保留用于向后兼容旧代码
 */
export interface PlatformConfig {
  enabled?: boolean;
  pricingModel?: PricingModel;
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

/** @deprecated 使用 PlatformPricingConfigs 代替 */
export type PlatformFees = Record<string, PlatformConfig>;

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

/** 达人采买策略数据 */
export interface TalentProcurementStrategy {
  enabled?: boolean;
  /** v5.0: 平台定价配置（新结构） */
  platformPricingConfigs?: PlatformPricingConfigs;
  /** @deprecated 使用 platformPricingConfigs 代替 */
  platformFees?: Record<string, PlatformConfig>;
  /** 报价系数（保存时自动计算当前有效配置的系数） */
  quotationCoefficients?: Record<string, number>;
}

// ============ 工具函数 ============

/**
 * 生成配置ID
 */
export const generateConfigId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `cfg_${timestamp}_${random}`;
};

/**
 * 获取配置项默认值
 * @param platformFeeRate - 平台费率（从 usePlatformConfig 获取）
 */
export const getDefaultConfigItem = (
  platformFeeRate = 0
): PricingConfigItem => {
  const now = new Date().toISOString();
  return {
    id: generateConfigId(),
    discountRate: 1.0,
    serviceFeeRate: 0,
    platformFeeRate,
    includesPlatformFee: false,
    serviceFeeBase: 'beforeDiscount',
    includesTax: true,
    taxCalculationBase: 'excludeServiceFee',
    validFrom: null,
    validTo: null,
    isPermanent: false,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * 获取平台策略默认值
 * @param _platformFeeRate - 平台费率（保留参数，用于向后兼容）
 */
export const getDefaultPlatformStrategy = (
  _platformFeeRate = 0
): PlatformPricingStrategy => {
  return {
    enabled: false,
    pricingModel: 'framework',
    configs: null,
  };
};

/**
 * @deprecated v5.0 废弃，使用 getDefaultConfigItem 代替
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
    isPermanent: false,
    includesPlatformFee: false,
    serviceFeeBase: 'beforeDiscount',
    includesTax: true,
    taxCalculationBase: 'excludeServiceFee',
  };
};

/**
 * v5.0: 获取当前有效的配置
 * 规则：
 * 1. 优先查找「日期范围覆盖今天」的配置
 * 2. 如没有，查找「长期有效」的配置
 * 3. 都没有返回 null
 *
 * @param configs - 配置列表
 * @param date - 参考日期，默认为今天
 */
export const getEffectiveConfig = (
  configs: PricingConfigItem[] | null | undefined,
  date: Date = new Date()
): PricingConfigItem | null => {
  if (!configs || configs.length === 0) return null;

  const dateStr = date.toISOString().split('T')[0];

  // 1. 优先找日期范围匹配的
  const dateMatched = configs.find(
    c =>
      c.validFrom && c.validTo && c.validFrom <= dateStr && c.validTo >= dateStr
  );
  if (dateMatched) return dateMatched;

  // 2. 兜底：找长期有效的
  const permanent = configs.find(c => c.isPermanent);
  if (permanent) return permanent;

  return null;
};

/**
 * v5.0: 获取配置的状态
 * @param config - 配置项
 * @param date - 参考日期，默认为今天
 */
export const getConfigStatus = (
  config: PricingConfigItem,
  date: Date = new Date()
): ConfigStatus => {
  const dateStr = date.toISOString().split('T')[0];

  if (config.isPermanent) {
    return 'permanent';
  }

  if (!config.validFrom || !config.validTo) {
    return 'expired'; // 无日期且非长期有效，视为过期
  }

  if (config.validFrom > dateStr) {
    return 'upcoming';
  }

  if (config.validTo < dateStr) {
    return 'expired';
  }

  return 'active';
};

/**
 * v5.0: 检查时间段是否重叠
 * @param configs - 配置列表
 * @param excludeId - 排除的配置ID（编辑时排除自身）
 * @returns 如有重叠返回重叠的两个配置，否则返回 null
 */
export const findTimeOverlap = (
  configs: PricingConfigItem[],
  excludeId?: string
): [PricingConfigItem, PricingConfigItem] | null => {
  // 只检查有日期范围的配置
  const datedConfigs = configs.filter(
    c => c.validFrom && c.validTo && c.id !== excludeId
  );

  for (let i = 0; i < datedConfigs.length; i++) {
    for (let j = i + 1; j < datedConfigs.length; j++) {
      const a = datedConfigs[i];
      const b = datedConfigs[j];

      // 检查是否重叠：A.start <= B.end && A.end >= B.start
      if (a.validFrom! <= b.validTo! && a.validTo! >= b.validFrom!) {
        return [a, b];
      }
    }
  }

  return null;
};

/**
 * v5.0: 检查是否有时间重叠
 */
export const hasTimeOverlap = (
  configs: PricingConfigItem[],
  excludeId?: string
): boolean => {
  return findTimeOverlap(configs, excludeId) !== null;
};

/**
 * v5.0: 校验新配置是否与现有配置重叠
 * @param newConfig - 新配置
 * @param existingConfigs - 现有配置列表
 * @param excludeId - 排除的配置ID（编辑时排除自身）
 */
export const validateNoOverlap = (
  newConfig: PricingConfigItem,
  existingConfigs: PricingConfigItem[],
  excludeId?: string
): { valid: boolean; error?: string } => {
  if (newConfig.isPermanent || !newConfig.validFrom || !newConfig.validTo) {
    return { valid: true }; // 长期有效或无日期不参与重叠检查
  }

  const datedConfigs = existingConfigs.filter(
    c => c.validFrom && c.validTo && c.id !== excludeId
  );

  for (const existing of datedConfigs) {
    if (
      newConfig.validFrom! <= existing.validTo! &&
      newConfig.validTo! >= existing.validFrom!
    ) {
      return {
        valid: false,
        error: `配置时间段 (${newConfig.validFrom} ~ ${newConfig.validTo}) 与现有配置 (${existing.validFrom} ~ ${existing.validTo}) 重叠`,
      };
    }
  }

  return { valid: true };
};

/**
 * v5.0: 校验平台策略配置
 * @param strategy - 平台策略
 * @param platformName - 平台名称（用于错误信息）
 */
export const validatePlatformStrategy = (
  strategy: PlatformPricingStrategy,
  platformName: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!strategy.enabled) {
    return { valid: true, errors: [] }; // 未启用的平台不需要校验
  }

  // project 模式不需要配置
  if (strategy.pricingModel === 'project') {
    return { valid: true, errors: [] };
  }

  // framework/hybrid 模式必须有配置
  if (!strategy.configs || strategy.configs.length === 0) {
    errors.push(`${platformName}：请至少添加一个定价配置`);
    return { valid: false, errors };
  }

  // 检查每个配置是否设置了有效期
  for (const config of strategy.configs) {
    if (!config.isPermanent && (!config.validFrom || !config.validTo)) {
      errors.push(`${platformName}：配置必须设置有效期或勾选"长期有效"`);
      break;
    }
  }

  // 检查时间重叠
  const overlap = findTimeOverlap(strategy.configs);
  if (overlap) {
    errors.push(
      `${platformName}：配置时间段重叠 (${overlap[0].validFrom} ~ ${overlap[0].validTo}) 与 (${overlap[1].validFrom} ~ ${overlap[1].validTo})`
    );
  }

  return { valid: errors.length === 0, errors };
};

/**
 * v5.0: 校验所有平台的策略配置
 */
export const validateAllPlatformStrategies = (
  configs: PlatformPricingConfigs,
  getPlatformName: (key: string) => string
): { valid: boolean; errors: string[] } => {
  const allErrors: string[] = [];

  Object.entries(configs).forEach(([key, strategy]) => {
    const result = validatePlatformStrategy(strategy, getPlatformName(key));
    allErrors.push(...result.errors);
  });

  return { valid: allErrors.length === 0, errors: allErrors };
};

/**
 * @deprecated v5.0 废弃，使用 validatePlatformStrategy 代替
 */
export const validatePlatformValidity = (
  config: PlatformConfig,
  platformName: string
): string | null => {
  if (!config.enabled) return null;
  if (!config.isPermanent && (!config.validFrom || !config.validTo)) {
    return `${platformName}：请设置有效期或勾选"长期有效"`;
  }
  return null;
};

/**
 * @deprecated v5.0 废弃，使用 validateAllPlatformStrategies 代替
 */
export const validateAllPlatformsValidity = (
  configs: Record<string, PlatformConfig>,
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

/**
 * 计算报价系数（适用于 PricingConfigItem）
 */
export const calculateCoefficientFromConfig = (
  config: PricingConfigItem
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

/**
 * @deprecated v5.0 废弃，使用 calculateCoefficientFromConfig 代替
 */
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

/**
 * v5.0: 计算所有启用平台的当前有效系数
 */
export const calculateAllEffectiveCoefficients = (
  platformPricingConfigs: PlatformPricingConfigs
): Record<string, number> => {
  const coefficients: Record<string, number> = {};

  Object.entries(platformPricingConfigs).forEach(([platform, strategy]) => {
    if (!strategy.enabled || strategy.pricingModel === 'project') {
      return; // project 模式无系数
    }

    const effectiveConfig = getEffectiveConfig(strategy.configs);
    if (effectiveConfig) {
      const result = calculateCoefficientFromConfig(effectiveConfig);
      coefficients[platform] = result.coefficient;
    }
  });

  return coefficients;
};

/**
 * @deprecated v5.0 废弃
 */
export const calculateAllCoefficients = (
  platformPricingConfigs: Record<string, PlatformConfig>
): Record<string, CoefficientResult> => {
  const results: Record<string, CoefficientResult> = {};

  Object.entries(platformPricingConfigs).forEach(([platform, config]) => {
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
        description: '每个项目需单独填写对客报价，无需配置折扣策略',
        coefficientLabel: '参考系数',
        coefficientColor: 'default' as const,
        statusText: '单独定价',
        statusIcon: 'i',
      };
    case 'hybrid':
      return {
        title: '混合模式',
        description: '项目中不同达人可选择使用系数或手动填写报价',
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

/** 获取配置状态的显示信息 */
export const getConfigStatusInfo = (status: ConfigStatus) => {
  switch (status) {
    case 'active':
      return {
        label: '当前生效',
        color: 'success' as const,
        tagColor: 'green',
      };
    case 'upcoming':
      return {
        label: '即将生效',
        color: 'processing' as const,
        tagColor: 'blue',
      };
    case 'expired':
      return {
        label: '已过期',
        color: 'default' as const,
        tagColor: 'default',
      };
    case 'permanent':
      return {
        label: '长期有效',
        color: 'success' as const,
        tagColor: 'green',
      };
    default:
      return {
        label: '未知',
        color: 'default' as const,
        tagColor: 'default',
      };
  }
};
