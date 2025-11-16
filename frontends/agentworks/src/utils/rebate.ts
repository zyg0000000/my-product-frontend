/**
 * 返点相关工具函数
 */

import type { Talent, RebateMode, RebateSource } from '../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';

/**
 * 判断是否为野生达人
 */
export function isWildTalent(talent: Talent): boolean {
  return talent.agencyId === AGENCY_INDIVIDUAL_ID;
}

/**
 * 判断是否可以切换返点模式
 * 只有机构达人可以切换模式
 */
export function canSwitchRebateMode(talent: Talent): boolean {
  return !isWildTalent(talent);
}

/**
 * 判断是否应该与机构同步
 * 只有机构达人的同步模式才需要同步
 */
export function shouldSyncWithAgency(talent: Talent): boolean {
  return !isWildTalent(talent) && talent.rebateMode === 'sync';
}

/**
 * 获取返点属性显示文本
 * 用于在UI上显示返点属性
 */
export function getRebateAttribute(talent: Talent): string {
  if (isWildTalent(talent)) {
    return '独立设置';  // 野生达人
  }
  // 如果没有设置rebateMode，默认为sync
  const mode = talent.rebateMode || 'sync';
  return mode === 'sync' ? '机构同步' : '独立设置';
}

/**
 * 获取商业属性显示文本
 * 用于在UI上显示商业属性（机构归属）
 */
export function getBusinessAttribute(talent: Talent, agencyName?: string): string {
  if (isWildTalent(talent)) {
    return '野生达人';
  }
  return agencyName || '未知机构';
}

/**
 * 判断是否可以手动调整返点
 * 野生达人或独立模式的机构达人可以手动调整
 */
export function canManuallyAdjustRebate(talent: Talent): boolean {
  if (isWildTalent(talent)) {
    return true;  // 野生达人总是可以手动调整
  }
  return talent.rebateMode === 'independent';  // 机构达人只有独立模式可以
}

/**
 * 获取默认返点率
 * 野生达人默认0%，机构达人根据机构设置
 */
export function getDefaultRebateRate(isWild: boolean, agencyRate?: number): number {
  return isWild ? 0 : (agencyRate || 0);
}

/**
 * 获取默认返点模式
 * 野生达人永远是independent，机构达人默认sync
 */
export function getDefaultRebateMode(isWild: boolean): RebateMode {
  return isWild ? 'independent' : 'sync';
}

/**
 * 获取默认返点来源
 * 野生达人是manual，机构达人同步模式是agency_sync
 */
export function getDefaultRebateSource(isWild: boolean, mode: RebateMode): RebateSource {
  if (isWild) {
    return 'manual';
  }
  return mode === 'sync' ? 'agency_sync' : 'manual';
}

/**
 * 格式化返点率显示
 * 将数值转换为百分比字符串
 */
export function formatRebateRate(rate?: number): string {
  if (rate === undefined || rate === null) {
    return '0%';
  }
  // 如果是整数，不显示小数位
  if (rate % 1 === 0) {
    return `${rate}%`;
  }
  // 否则显示一位小数
  return `${rate.toFixed(1)}%`;
}

/**
 * 验证返点率是否合法
 * 必须在0-100之间
 */
export function validateRebateRate(rate: number): boolean {
  return rate >= 0 && rate <= 100;
}

/**
 * 根据达人类型和模式获取应该显示的Tab列表
 */
export function getRebateTabs(talent: Talent): string[] {
  const isWild = isWildTalent(talent);

  if (isWild) {
    // 野生达人的Tab
    return ['current', 'manual', 'stepRule', 'history'];
  }

  // 机构达人根据模式显示不同Tab
  // 如果没有设置rebateMode，默认为sync
  const mode = talent.rebateMode || 'sync';

  if (mode === 'sync') {
    // 同步模式
    return ['current', 'agencySync', 'history'];
  } else {
    // 独立模式
    return ['current', 'manual', 'stepRule', 'history'];
  }
}

/**
 * 获取Tab显示名称
 */
export function getTabDisplayName(tab: string): string {
  const tabNames: Record<string, string> = {
    current: '当前配置',
    manual: '手动调整',
    agencySync: '机构同步',
    stepRule: '阶梯规则',
    history: '调整历史',
  };
  return tabNames[tab] || tab;
}

/**
 * 判断Tab是否应该显示Phase标记
 */
export function isPhaseTab(tab: string): boolean {
  return tab === 'stepRule';  // 阶梯规则是Phase 2功能
}