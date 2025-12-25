/**
 * 统计卡片组件 - 支持环比显示
 */

import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

export interface ChangeData {
  value: number; // 变化百分比
  absoluteChange?: number; // 绝对值变化
  direction: 'up' | 'down' | 'neutral';
}

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  change?: ChangeData;
  /** 变化方向的含义：positive 表示上升是好的（如播放量），negative 表示下降是好的（如 CPM） */
  changeDirection?: 'positive' | 'negative';
  /** 绝对值变化的格式化函数 */
  formatAbsoluteChange?: (value: number) => string;
  className?: string;
}

export function StatCard({
  title,
  value,
  suffix,
  change,
  changeDirection = 'positive',
  formatAbsoluteChange,
  className = '',
}: StatCardProps) {
  // 计算变化的颜色
  const getChangeColor = () => {
    if (!change || change.direction === 'neutral') return 'text-[var(--aw-gray-500)]';

    const isGood =
      (changeDirection === 'positive' && change.direction === 'up') ||
      (changeDirection === 'negative' && change.direction === 'down');

    return isGood ? 'text-[var(--aw-success-500)]' : 'text-[var(--aw-danger-500)]';
  };

  const ChangeIcon =
    change?.direction === 'up'
      ? ArrowUpOutlined
      : change?.direction === 'down'
        ? ArrowDownOutlined
        : MinusOutlined;

  return (
    <div
      className={`rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4 ${className}`}
    >
      <p className="text-sm text-[var(--aw-gray-500)]">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[var(--aw-gray-900)] tabular-nums">
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-[var(--aw-gray-500)]">{suffix}</span>
        )}
      </div>
      {change && (
        <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${getChangeColor()}`}>
          <ChangeIcon className="text-xs" />
          {change.absoluteChange !== undefined && formatAbsoluteChange ? (
            <>
              <span>{change.direction === 'down' ? '-' : '+'}{formatAbsoluteChange(Math.abs(change.absoluteChange))}</span>
              <span className="text-[var(--aw-gray-400)] font-normal">({change.direction === 'down' ? '' : '+'}{change.value.toFixed(1)}%)</span>
            </>
          ) : (
            <span>{change.direction === 'down' ? '' : '+'}{change.value.toFixed(1)}%</span>
          )}
          <span className="text-[var(--aw-gray-400)] font-normal">vs 昨日</span>
        </div>
      )}
    </div>
  );
}

// 计算环比变化
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
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral',
  };
}
