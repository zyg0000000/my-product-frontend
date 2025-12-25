/**
 * 财务计算工具函数
 *
 * @version 5.2.1
 * @description 支持三种定价模式的财务计算
 *
 * 定价模式：
 * - framework: 框架折扣（用报价系数自动计算）
 * - project: 项目比价（手动填写对客报价和下单价）
 * - hybrid: 混合模式（每条记录单独选择）
 *
 * 下单方式：
 * - adjusted: 改价下单（默认，可降低成本）
 * - original: 原价下单（全额返点）
 */

import type { Platform } from '../types/talent';
import type { PricingModel } from '../types/customer';
import type {
  Collaboration,
  CollaborationFinance,
  CollaborationAdjustment,
  CollaborationStatus,
  Project,
  PlatformPricingModes,
  PlatformQuotationCoefficients,
  PlatformDiscounts,
  OrderMode,
} from '../types/project';

// ============================================================================
// 状态筛选配置
// ============================================================================

/**
 * 参与财务计算的合作状态
 * 只有这些状态的记录才会被计入财务统计
 */
export const FINANCE_VALID_STATUSES: CollaborationStatus[] = [
  '客户已定档',
  '视频已发布',
];

/**
 * 判断合作记录是否参与财务计算
 */
export function isValidForFinance(collaboration: Collaboration): boolean {
  return FINANCE_VALID_STATUSES.includes(collaboration.status);
}

import type { PlatformConfig } from '../api/platformConfig';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 计算单条合作记录财务数据所需的上下文
 */
export interface FinanceCalculationContext {
  /** 项目的平台定价模式快照 */
  platformPricingModes?: PlatformPricingModes;
  /** 项目的平台折扣率快照 */
  platformDiscounts?: PlatformDiscounts;
  /** 项目的平台报价系数快照 */
  platformQuotationCoefficients?: PlatformQuotationCoefficients;
  /** 平台配置（获取改价系数） */
  platformConfigs: Map<Platform, PlatformConfig>;
}

/**
 * 平台级财务统计
 */
export interface PlatformFinanceStats {
  platform: Platform;
  count: number;
  totalRevenue: number;
  totalCost: number;
  totalRebateIncome: number;
  totalAdjustments: number;
  totalFundsOccupation: number;
  /** 基础利润 = 收入 - 成本 + 返点收入 */
  baseProfit: number;
  /** 基础利润率 (%) */
  baseProfitRate: number;
  /** 净利润 = 基础利润 + 调整项 - 资金占用费 */
  totalProfit: number;
  /** 净利润率 (%) */
  profitRate: number;
}

/**
 * 项目级财务统计
 */
export interface ProjectFinanceStats {
  /** 总收入（对客报价之和） */
  totalRevenue: number;
  /** 总成本（下单价之和） */
  totalCost: number;
  /** 总返点收入 */
  totalRebateIncome: number;
  /** 总调整项金额 */
  totalAdjustments: number;
  /** 资金占用费 */
  fundsOccupation?: number;
  /** 基础利润 = 收入 - 成本 + 返点收入 */
  baseProfit: number;
  /** 基础利润率 (%) */
  baseProfitRate: number;
  /** 净利润 = 基础利润 + 调整项 - 资金占用费 */
  totalProfit: number;
  /** 净利润率 (%) */
  profitRate: number;
  /** 按平台分组的统计 */
  platformStats: PlatformFinanceStats[];
}

// ============================================================================
// 核心计算函数
// ============================================================================

/**
 * 计算单条合作记录的财务数据
 *
 * @param collaboration - 合作记录
 * @param context - 计算上下文（项目快照 + 平台配置）
 * @returns 财务计算结果
 */
export function calculateCollaborationFinance(
  collaboration: Collaboration,
  context: FinanceCalculationContext
): CollaborationFinance {
  const { amount, rebateRate = 0, talentPlatform: platform } = collaboration;

  // 下单方式：'adjusted'(改价) | 'original'(原价)，默认改价
  const orderMode: OrderMode = collaboration.orderMode || 'adjusted';

  // 获取定价模式（优先使用记录级别的，否则从项目快照读取）
  const pricingMode: PricingModel =
    collaboration.pricingMode ||
    context.platformPricingModes?.[platform] ||
    'framework';

  // 获取平台配置
  const platformConfig = context.platformConfigs.get(platform);
  const orderPriceRatio = platformConfig?.business?.orderPriceRatio ?? 1;
  const platformFeeRate = platformConfig?.business?.fee ?? 0; // 平台费率（如 0.05 = 5%）

  let revenue: number; // 对客报价（收入）
  let cost: number; // 下单成本（星图平台支出）
  let rebateIncome: number; // 返点收入

  if (pricingMode === 'framework') {
    // ========== 框架模式：用系数自动计算 ==========
    const coefficient = context.platformQuotationCoefficients?.[platform] ?? 1;

    // 收入 = 刊例价 × 报价系数
    revenue = Math.round(amount * coefficient);

    // 成本和返点计算
    const { cost: calculatedCost, rebateIncome: calculatedRebate } =
      calculateOrderCost(
        amount,
        platformFeeRate,
        rebateRate,
        orderPriceRatio,
        orderMode
      );
    cost = calculatedCost;
    rebateIncome = calculatedRebate;
  } else {
    // ========== 比价模式：用手动填写的值 ==========
    revenue = collaboration.quotationPrice || 0;
    cost = collaboration.orderPrice || 0;

    // 比价模式的返点计算
    if (orderMode === 'original') {
      rebateIncome = Math.round(amount * (rebateRate / 100));
    } else {
      const maxDiscountRatio = 1 - orderPriceRatio;
      rebateIncome = Math.round(
        amount * Math.max(0, rebateRate / 100 - maxDiscountRatio)
      );
    }
  }

  const profit = revenue - cost + rebateIncome;

  return {
    revenue,
    cost,
    rebateIncome,
    profit,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * 计算下单成本和返点收入
 *
 * 成本公式：
 * - 原价下单：成本 = 刊例价 × (1 + 平台费率)
 * - 改价下单：成本 = 刊例价 × (1 + 平台费率) × (1 - 实际改价比例)
 *
 * 实际改价比例 = min(平台允许的最大改价, 达人返点率)
 * - 平台允许的最大改价 = 1 - 改价系数（如 1 - 0.8 = 20%）
 * - 达人返点率决定了改价上限，不能超过返点率（否则达人会亏钱）
 *
 * 返点规则：
 * - 原价下单：返点收入 = 刊例价 × 返点率（全额返点）
 * - 改价下单：返点收入 = 刊例价 × (返点率 - 实际改价比例)
 *
 * @param amount - 刊例价（分）
 * @param platformFeeRate - 平台费率（如 0.05 = 5%）
 * @param rebateRate - 返点率（%，如 10 表示 10%）
 * @param orderPriceRatio - 改价系数（如 0.8 表示平台允许最低改到 80%）
 * @param orderMode - 下单方式（'adjusted' 改价下单 | 'original' 原价下单）
 * @returns { cost, rebateIncome }
 */
function calculateOrderCost(
  amount: number,
  platformFeeRate: number,
  rebateRate: number,
  orderPriceRatio: number,
  orderMode: OrderMode
): { cost: number; rebateIncome: number } {
  const rebateRatio = rebateRate / 100; // 返点率（如 0.24）

  let cost: number;
  let rebateIncome: number;

  if (orderMode === 'original') {
    // 【原价下单】
    // 成本 = 刊例价 × (1 + 平台费率)
    cost = Math.round(amount * (1 + platformFeeRate));
    // 返点收入 = 刊例价 × 返点率（全额返点）
    rebateIncome = Math.round(amount * rebateRatio);
  } else {
    // 【改价下单】
    // 平台允许的最大改价比例 = 1 - 改价系数（如 1 - 0.8 = 0.2，最多可改 20%）
    const maxDiscountRatio = 1 - orderPriceRatio;
    // 实际改价比例 = min(平台允许的最大改价, 达人返点率)
    // 改价不能超过返点，否则达人会亏钱
    const actualDiscountRatio = Math.min(maxDiscountRatio, rebateRatio);

    // 成本 = 刊例价 × (1 + 平台费率) × (1 - 实际改价比例)
    cost = Math.round(
      amount * (1 + platformFeeRate) * (1 - actualDiscountRatio)
    );

    // 返点收入 = 刊例价 × (返点率 - 实际改价比例)
    // 改价用掉的部分不再返点
    rebateIncome = Math.round(amount * (rebateRatio - actualDiscountRatio));
  }

  return { cost, rebateIncome };
}

/**
 * 计算调整项合计
 */
export function calculateAdjustmentsTotal(
  adjustments?: CollaborationAdjustment[]
): number {
  if (!adjustments || adjustments.length === 0) return 0;
  return adjustments.reduce((sum, adj) => sum + adj.amount, 0);
}

// ============================================================================
// 聚合统计函数
// ============================================================================

/**
 * 计算项目级财务统计
 *
 * @param collaborations - 合作记录列表
 * @param context - 计算上下文
 * @param fundsOccupationConfig - 资金占用费配置（可选）
 * @param filterByStatus - 是否按状态筛选（默认 true，只计算"客户已定档"和"视频已发布"的记录）
 * @returns 项目财务统计
 */
export function calculateProjectFinanceStats(
  collaborations: Collaboration[],
  context: FinanceCalculationContext,
  fundsOccupationConfig?: {
    enabled: boolean;
    monthlyRate: number; // 月费率 %
  },
  filterByStatus: boolean = true
): ProjectFinanceStats {
  // 状态筛选：只计算已确认的合作记录
  const validCollaborations = filterByStatus
    ? collaborations.filter(isValidForFinance)
    : collaborations;

  // 按平台分组
  const byPlatform = new Map<Platform, Collaboration[]>();
  for (const collab of validCollaborations) {
    const platform = collab.talentPlatform;
    if (!byPlatform.has(platform)) {
      byPlatform.set(platform, []);
    }
    byPlatform.get(platform)!.push(collab);
  }

  // 计算各平台统计
  const platformStats: PlatformFinanceStats[] = [];
  const monthlyRate = fundsOccupationConfig?.monthlyRate ?? 0;
  const enableFundsOccupation = fundsOccupationConfig?.enabled ?? false;

  for (const [platform, items] of byPlatform) {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalRebateIncome = 0;
    let totalAdjustments = 0;
    let totalFundsOccupation = 0;

    for (const collab of items) {
      // 使用已计算的 finance，或重新计算
      const finance =
        collab.finance || calculateCollaborationFinance(collab, context);

      totalRevenue += finance.revenue;
      totalCost += finance.cost;
      totalRebateIncome += finance.rebateIncome;
      totalAdjustments += calculateAdjustmentsTotal(collab.adjustments);

      // 计算单条记录的资金占用费
      if (enableFundsOccupation) {
        const fundsResult = calculateSingleFundsOccupation(collab, monthlyRate);
        if (fundsResult) {
          totalFundsOccupation += fundsResult.fee;
        }
      }
    }

    // 基础利润 = 收入 - 成本 + 返点收入
    const baseProfit = totalRevenue - totalCost + totalRebateIncome;
    const baseProfitRate =
      totalRevenue > 0 ? (baseProfit / totalRevenue) * 100 : 0;
    // 净利润 = 基础利润 + 调整项 - 资金占用费
    const totalProfit = baseProfit + totalAdjustments - totalFundsOccupation;
    const profitRate =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    platformStats.push({
      platform,
      count: items.length,
      totalRevenue,
      totalCost,
      totalRebateIncome,
      totalAdjustments,
      totalFundsOccupation,
      baseProfit,
      baseProfitRate,
      totalProfit,
      profitRate,
    });
  }

  // 计算项目级汇总
  const totalRevenue = platformStats.reduce(
    (sum, p) => sum + p.totalRevenue,
    0
  );
  const totalCost = platformStats.reduce((sum, p) => sum + p.totalCost, 0);
  const totalRebateIncome = platformStats.reduce(
    (sum, p) => sum + p.totalRebateIncome,
    0
  );
  const totalAdjustments = platformStats.reduce(
    (sum, p) => sum + p.totalAdjustments,
    0
  );
  const fundsOccupation = platformStats.reduce(
    (sum, p) => sum + p.totalFundsOccupation,
    0
  );
  // 基础利润 = 收入 - 成本 + 返点收入
  const baseProfit = totalRevenue - totalCost + totalRebateIncome;
  const baseProfitRate =
    totalRevenue > 0 ? (baseProfit / totalRevenue) * 100 : 0;
  // 净利润 = 基础利润 + 调整项 - 资金占用费
  const totalProfit = baseProfit + totalAdjustments - fundsOccupation;
  const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    totalRebateIncome,
    totalAdjustments,
    fundsOccupation: enableFundsOccupation ? fundsOccupation : undefined,
    baseProfit,
    baseProfitRate,
    totalProfit,
    profitRate,
    platformStats,
  };
}

/**
 * 计算资金占用费
 *
 * 公式：资金占用费 = Σ(下单价 × (月费率/30) × 占用天数)
 *
 * @param collaborations - 合作记录列表
 * @param context - 计算上下文
 * @param monthlyRate - 月费率 (%)
 * @returns 资金占用费（分）
 */
export function calculateFundsOccupation(
  collaborations: Collaboration[],
  context: FinanceCalculationContext,
  monthlyRate: number
): number {
  const now = new Date();
  let total = 0;

  for (const collab of collaborations) {
    if (!collab.orderDate) continue;

    // 获取下单价（优先使用已计算的，否则重新计算）
    let orderPrice: number;
    if (collab.orderPrice !== undefined) {
      orderPrice = collab.orderPrice;
    } else if (collab.finance?.cost !== undefined) {
      orderPrice = collab.finance.cost;
    } else {
      const finance = calculateCollaborationFinance(collab, context);
      orderPrice = finance.cost;
    }

    // 计算占用天数
    const orderDate = new Date(collab.orderDate);
    const endDate = collab.recoveryDate ? new Date(collab.recoveryDate) : now;
    const days = Math.max(
      0,
      Math.ceil(
        (endDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // 资金占用费 = 下单价 × (月费率/30) × 占用天数
    const fee = orderPrice * (monthlyRate / 100 / 30) * days;
    total += fee;
  }

  return Math.round(total);
}

/**
 * 计算单条合作记录的资金占用费
 *
 * 公式：资金占用费 = 下单成本 × (月费率/30) × 占用天数
 *
 * @param collaboration - 合作记录
 * @param monthlyRate - 月费率 (%)
 * @param context - 计算上下文（可选，用于计算成本）
 * @returns 资金占用费（分），如果没有下单日期则返回 null
 */
export function calculateSingleFundsOccupation(
  collaboration: Collaboration,
  monthlyRate: number,
  context?: FinanceCalculationContext
): { fee: number; days: number } | null {
  if (!collaboration.orderDate) return null;

  const now = new Date();

  // 获取下单成本
  let cost: number;
  if (collaboration.finance?.cost !== undefined) {
    cost = collaboration.finance.cost;
  } else if (collaboration.orderPrice !== undefined) {
    cost = collaboration.orderPrice;
  } else if (context) {
    const finance = calculateCollaborationFinance(collaboration, context);
    cost = finance.cost;
  } else {
    return null;
  }

  // 计算占用天数
  const orderDate = new Date(collaboration.orderDate);
  const endDate = collaboration.recoveryDate
    ? new Date(collaboration.recoveryDate)
    : now;
  const days = Math.max(
    0,
    Math.ceil((endDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // 资金占用费 = 下单成本 × (月费率/30) × 占用天数
  const fee = Math.round(cost * (monthlyRate / 100 / 30) * days);

  return { fee, days };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从项目数据创建计算上下文
 */
export function createFinanceContextFromProject(
  project: Project,
  platformConfigs: PlatformConfig[]
): FinanceCalculationContext {
  const configMap = new Map<Platform, PlatformConfig>();
  for (const config of platformConfigs) {
    configMap.set(config.platform, config);
  }

  return {
    platformPricingModes: project.platformPricingModes,
    platformDiscounts: project.platformDiscounts,
    platformQuotationCoefficients: project.platformQuotationCoefficients,
    platformConfigs: configMap,
  };
}

/**
 * 批量计算合作记录的财务数据
 */
export function batchCalculateFinance(
  collaborations: Collaboration[],
  context: FinanceCalculationContext
): Collaboration[] {
  return collaborations.map(collab => ({
    ...collab,
    finance: calculateCollaborationFinance(collab, context),
  }));
}

/**
 * 下单方式选项
 */
export const ORDER_MODE_OPTIONS: Array<{ value: OrderMode; label: string }> = [
  { value: 'adjusted', label: '改价下单' },
  { value: 'original', label: '原价下单' },
];

/**
 * 获取下单方式显示文本
 */
export function getOrderModeLabel(mode: OrderMode): string {
  return mode === 'adjusted' ? '改价下单' : '原价下单';
}

/**
 * 计价方式选项
 */
export const PRICING_MODE_OPTIONS: Array<{
  value: 'framework' | 'project';
  label: string;
}> = [
  { value: 'framework', label: '框架计价' },
  { value: 'project', label: '比价计价' },
];

/**
 * 获取计价方式显示文本
 */
export function getPricingModeLabel(mode: 'framework' | 'project'): string {
  return mode === 'framework' ? '框架计价' : '比价计价';
}
