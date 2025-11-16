/**
 * 返点管理相关类型定义（AgentWorks v2.0）
 *
 * 说明：
 * - 支持野生达人和机构达人的返点管理
 * - 支持立即生效和下次合作生效两种模式
 * - 返点率精度：小数点后 2 位
 * - 完整的历史记录追溯
 */

import type { Platform } from './talent';

/**
 * 返点来源
 */
export type RebateSource =
  | 'default'       // 系统默认
  | 'personal'      // 个人配置
  | 'rule_trigger'  // 规则触发
  | 'agency';       // 机构统一

/**
 * 生效方式
 */
export type EffectType =
  | 'immediate'         // 立即生效
  | 'next_cooperation'; // 下次合作生效

/**
 * 返点配置状态
 */
export type RebateStatus =
  | 'pending'   // 待生效
  | 'active'    // 已生效
  | 'expired';  // 已失效

/**
 * 当前返点配置（存储在 talents 表中）
 */
export interface CurrentRebate {
  rate: number;              // 返点率（百分比，2位小数）
  source: RebateSource;      // 返点来源
  effectiveDate: string;     // 生效日期 (YYYY-MM-DD)
  lastUpdated: string;       // 最后更新时间 (ISO 8601)
}

/**
 * 返点配置历史记录（rebate_configs 集合）
 */
export interface RebateConfig {
  configId: string;          // 配置ID
  targetType: 'talent';      // 目标类型（固定为 talent）
  targetId: string;          // 目标ID（oneId）
  platform: Platform;        // 平台
  rebateRate: number;        // 返点率（百分比，2位小数）
  effectType: EffectType;    // 生效方式
  effectiveDate: string;     // 生效时间 (ISO 8601 时间戳)
  expiryDate: string | null; // 失效时间 (ISO 8601 时间戳)，null 表示当前生效中
  status: RebateStatus;      // 状态
  reason?: string;           // 调整原因
  createdBy: string;         // 操作人
  createdAt: string;         // 创建时间 (ISO 8601)
}

/**
 * 获取达人返点配置 - API 响应
 */
export interface GetRebateResponse {
  success: boolean;
  data?: {
    oneId: string;
    platform: Platform;
    name: string;
    agencyId: string;  // 'individual' for wild talents, agency ID for agency talents
    currentRebate: CurrentRebate;
  };
  message?: string;
  timestamp: string;
}

/**
 * 更新达人返点 - API 请求
 */
export interface UpdateRebateRequest {
  oneId: string;              // 达人唯一标识
  platform: Platform;         // 平台名称
  rebateRate: number;         // 新返点率（0-100，最多2位小数）
  effectType: EffectType;     // 生效方式
  createdBy?: string;         // 操作人（默认 system）
}

/**
 * 更新达人返点 - API 响应
 */
export interface UpdateRebateResponse {
  success: boolean;
  data?: {
    configId: string;
    message: string;
    newRate: number;
    effectType: EffectType;
    effectiveDate: string;
    status?: RebateStatus;
  };
  message?: string;
  timestamp: string;
}

/**
 * 获取返点历史 - API 响应
 */
export interface GetRebateHistoryResponse {
  success: boolean;
  data?: {
    total: number;
    limit: number;
    offset: number;
    records: RebateConfig[];
  };
  message?: string;
  timestamp: string;
}

/**
 * 返点配置项（用于 UI 展示）
 */
export interface RebateConfigItem {
  configId: string;
  rebateRate: number;
  effectType: EffectType;
  effectTypeLabel: string;    // '立即生效' | '下次合作生效'
  effectiveDate: string;
  status: RebateStatus;
  statusLabel: string;        // '待生效' | '已生效' | '已失效'
  statusColor: string;        // 状态颜色（用于UI）
  reason?: string;
  createdBy: string;
  createdAt: string;
  formattedDate: string;      // 格式化的日期（用于UI展示）
}

/**
 * 返点状态标签映射
 */
export const REBATE_STATUS_LABELS: Record<RebateStatus, string> = {
  pending: '待生效',
  active: '已生效',
  expired: '已失效',
};

/**
 * 返点状态颜色映射（Tailwind CSS）
 */
export const REBATE_STATUS_COLORS: Record<RebateStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  active: 'text-green-600 bg-green-50',
  expired: 'text-gray-600 bg-gray-50',
};

/**
 * 生效方式标签映射
 */
export const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  immediate: '立即生效',
  next_cooperation: '下次合作生效',
};

/**
 * 返点来源标签映射
 */
export const REBATE_SOURCE_LABELS: Record<RebateSource, string> = {
  default: '系统默认',
  personal: '个人配置',
  rule_trigger: '规则触发',
  agency: '机构统一',
};

/**
 * 默认返点率
 */
export const DEFAULT_REBATE_RATE = 10.00;

/**
 * 返点率验证
 */
export interface RebateValidation {
  min: number;  // 最小值
  max: number;  // 最大值
  step: number; // 步长
  precision: number; // 精度（小数位数）
}

/**
 * 返点率验证规则
 */
export const REBATE_VALIDATION: RebateValidation = {
  min: 0,
  max: 100,
  step: 0.01,
  precision: 2,
};

/**
 * 格式化返点率（保留2位小数）
 */
export function formatRebateRate(rate: number): string {
  return rate.toFixed(2) + '%';
}

/**
 * 验证返点率是否合法
 */
export function validateRebateRate(rate: number): {
  valid: boolean;
  error?: string;
} {
  const num = parseFloat(rate.toString());

  if (isNaN(num)) {
    return { valid: false, error: '返点率必须是数字' };
  }

  if (num < REBATE_VALIDATION.min || num > REBATE_VALIDATION.max) {
    return {
      valid: false,
      error: `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
    };
  }

  // 检查小数位数
  const decimalPart = (rate.toString().split('.')[1] || '');
  if (decimalPart.length > REBATE_VALIDATION.precision) {
    return {
      valid: false,
      error: `返点率最多支持小数点后${REBATE_VALIDATION.precision}位`
    };
  }

  return { valid: true };
}

/**
 * 转换 RebateConfig 为 RebateConfigItem（用于 UI 展示）
 */
export function toRebateConfigItem(config: RebateConfig): RebateConfigItem {
  return {
    configId: config.configId,
    rebateRate: config.rebateRate,
    effectType: config.effectType,
    effectTypeLabel: EFFECT_TYPE_LABELS[config.effectType],
    effectiveDate: config.effectiveDate,
    status: config.status,
    statusLabel: REBATE_STATUS_LABELS[config.status],
    statusColor: REBATE_STATUS_COLORS[config.status],
    reason: config.reason,
    createdBy: config.createdBy,
    createdAt: config.createdAt,
    formattedDate: new Date(config.createdAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

// ==================== Phase 2: 阶梯返点规则（预留） ====================

/**
 * 触发类型
 */
export type TriggerType =
  | 'cooperation_count'  // 合作次数
  | 'cooperation_amount' // 合作金额累计
  | 'time_based';        // 基于时间

/**
 * 触发条件
 */
export interface TriggerCondition {
  threshold: number;           // 阈值（次数或金额）
  operator: '>=' | '>' | '=';  // 比较运算符
  timeRange?: string;          // 时间范围（可选）
}

/**
 * 规则状态
 */
export type RuleStatus = 'active' | 'inactive' | 'expired';

/**
 * 返点跃迁规则（rebate_rules 集合）
 * @status Phase 2 - 待开发，依赖 cooperations 集合
 */
export interface RebateRule {
  ruleId: string;                  // 规则ID
  targetType: 'talent' | 'agency'; // 目标类型
  targetId: string;                // 目标ID（oneId）
  platform: Platform;              // 平台
  triggerType: TriggerType;        // 触发类型
  triggerCondition: TriggerCondition; // 触发条件
  targetRebateRate: number;        // 目标返点率
  status: RuleStatus;              // 规则状态
  priority?: number;               // 优先级
  notes?: string;                  // 规则说明
  lastTriggered?: string;          // 最后触发时间（ISO 8601）
  triggeredCount?: number;         // 触发次数统计
  createdBy: string;               // 创建人
  createdAt: string;               // 创建时间（ISO 8601）
  updatedAt?: string;              // 更新时间（ISO 8601）
}

/**
 * 扩展 RebateConfig 以支持规则触发
 */
export interface RebateConfigWithRule extends RebateConfig {
  triggeredByRuleId?: string;  // 如果是规则触发，记录规则ID
}
