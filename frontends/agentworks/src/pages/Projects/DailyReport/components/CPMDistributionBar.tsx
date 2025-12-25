/**
 * CPM 分布可视化条
 * 横向显示各 CPM 分类的占比
 */

import { Tooltip } from 'antd';
import type { CPMCategory } from '../../../../types/dailyReport';
import {
  CPM_CATEGORIES,
  getCPMCategoryConfig,
} from '../../../../types/dailyReport';

interface CPMDistributionBarProps {
  distribution: Record<CPMCategory, number>;
  total: number;
  className?: string;
}

export function CPMDistributionBar({
  distribution,
  total,
  className = '',
}: CPMDistributionBarProps) {
  if (total === 0) {
    return (
      <div className={`${className}`}>
        <div className="h-6 rounded-full bg-[var(--aw-gray-100)] flex items-center justify-center">
          <span className="text-xs text-[var(--aw-gray-400)]">暂无数据</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 分布条 */}
      <div className="flex h-6 rounded-full overflow-hidden bg-[var(--aw-gray-100)]">
        {CPM_CATEGORIES.map(cat => {
          const count = distribution[cat.key] || 0;
          const percent = total > 0 ? (count / total) * 100 : 0;
          if (percent === 0) return null;

          const config = getCPMCategoryConfig(cat.key);

          return (
            <Tooltip
              key={cat.key}
              title={
                <div className="text-center">
                  <div className="font-medium">{config.label}</div>
                  <div>
                    {count} 个 ({percent.toFixed(1)}%)
                  </div>
                </div>
              }
            >
              <div
                style={{
                  width: `${percent}%`,
                  backgroundColor: config.color,
                  minWidth: count > 0 ? '8px' : 0,
                }}
                className="h-full transition-all duration-300 hover:opacity-80 cursor-pointer"
              />
            </Tooltip>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {CPM_CATEGORIES.map(cat => {
          const count = distribution[cat.key] || 0;
          if (count === 0) return null;

          const config = getCPMCategoryConfig(cat.key);

          return (
            <span
              key={cat.key}
              className="flex items-center gap-1.5 text-xs text-[var(--aw-gray-600)]"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
              <span className="text-[var(--aw-gray-400)]">({count})</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// 计算 CPM 分布（纯 CPM 范围分类）
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
