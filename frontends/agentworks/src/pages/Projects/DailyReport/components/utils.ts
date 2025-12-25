/**
 * 日报组件工具函数
 * 分离出来以支持 React Fast Refresh
 */

import type { CPMCategory } from '../../../../types/dailyReport';

// ============================================================================
// 环比变化计算
// ============================================================================

export interface ChangeData {
  value: number; // 变化百分比
  absoluteChange?: number; // 绝对值变化
  direction: 'up' | 'down' | 'neutral';
}

/**
 * 计算环比变化
 */
export function calculateChange(
  current: number,
  previous: number | undefined | null
): ChangeData | undefined {
  if (previous === undefined || previous === null || previous === 0) {
    return undefined;
  }

  const changePercent = ((current - previous) / previous) * 100;
  const absoluteChange = current - previous;

  return {
    value: changePercent,
    absoluteChange,
    direction:
      changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral',
  };
}

// ============================================================================
// CPM 分布计算
// ============================================================================

/**
 * 计算 CPM 分布（纯 CPM 范围分类）
 */
export function calculateCPMDistribution(
  data: Array<{ totalViews: number; cpm: number }>
): Record<CPMCategory, number> {
  const distribution: Record<CPMCategory, number> = {
    excellent: 0,
    acceptable: 0,
    poor: 0,
    critical: 0,
  };

  data.forEach(item => {
    // 纯按 CPM 范围分类
    if (item.cpm < 20) {
      distribution.excellent++;
    } else if (item.cpm < 40) {
      distribution.acceptable++;
    } else if (item.cpm < 100) {
      distribution.poor++;
    } else {
      distribution.critical++;
    }
  });

  return distribution;
}
