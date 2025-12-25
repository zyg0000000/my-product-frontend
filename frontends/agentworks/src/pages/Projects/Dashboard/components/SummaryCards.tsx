/**
 * 汇总统计卡片组件
 * 精工极简设计风格，参考 KPIPanel 的 StatItem 组件
 */

import {
  ProjectOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
  FundOutlined,
} from '@ant-design/icons';
import type { SummaryStats } from '../../../../types/dashboard';
import { formatMoney } from '../../../../types/project';

interface SummaryCardsProps {
  stats: SummaryStats | null;
  loading?: boolean;
  hasSearched?: boolean;
}

/**
 * 格式化百分比
 */
function formatPercent(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * 统计项变体配置
 */
type StatVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'blue'
  | 'pink'
  | 'default';

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: StatVariant;
  suffix?: string;
}

/**
 * 统计项组件 - 精致卡片设计
 */
function StatItem({
  label,
  value,
  icon,
  variant = 'default',
  suffix,
}: StatItemProps) {
  const variantStyles: Record<
    StatVariant,
    { bg: string; text: string; iconBg: string }
  > = {
    primary: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      text: 'text-primary-600 dark:text-primary-400',
      iconBg: 'bg-primary-100 dark:bg-primary-800/40',
    },
    success: {
      bg: 'bg-success-50 dark:bg-success-900/20',
      text: 'text-success-600 dark:text-success-400',
      iconBg: 'bg-success-100 dark:bg-success-800/40',
    },
    warning: {
      bg: 'bg-warning-50 dark:bg-warning-900/20',
      text: 'text-warning-600 dark:text-warning-400',
      iconBg: 'bg-warning-100 dark:bg-warning-800/40',
    },
    danger: {
      bg: 'bg-danger-50 dark:bg-danger-900/20',
      text: 'text-danger-600 dark:text-danger-400',
      iconBg: 'bg-danger-100 dark:bg-danger-800/40',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-800/40',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-800/40',
    },
    pink: {
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      text: 'text-pink-600 dark:text-pink-400',
      iconBg: 'bg-pink-100 dark:bg-pink-800/40',
    },
    default: {
      bg: 'bg-surface-subtle',
      text: 'text-content',
      iconBg: 'bg-surface-sunken',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl p-4
        ${styles.bg}
        border border-transparent
        transition-all duration-200 ease-out
        hover:border-stroke hover:shadow-sm hover:-translate-y-0.5
      `}
    >
      {/* 图标 */}
      {icon && (
        <div
          className={`
            inline-flex items-center justify-center
            w-8 h-8 rounded-lg mb-3
            ${styles.iconBg}
          `}
        >
          <span className={`text-sm ${styles.text}`}>{icon}</span>
        </div>
      )}

      {/* 标签 */}
      <div className="text-xs font-medium text-content-secondary mb-1.5">
        {label}
      </div>

      {/* 数值 */}
      <div className={`text-xl font-bold tabular-nums ${styles.text}`}>
        {value}
        {suffix && (
          <span className="text-sm font-medium text-content-secondary ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 骨架屏加载状态
 */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl p-4 bg-surface-subtle animate-pulse"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-sunken mb-3" />
          <div className="h-3 w-16 bg-surface-sunken rounded mb-2" />
          <div className="h-6 w-20 bg-surface-sunken rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * 空状态
 */
function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-stroke bg-surface-subtle p-8 mb-4">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
          <FundOutlined className="text-xl text-content-muted" />
        </div>
        <p className="text-sm text-content-secondary">
          {hasSearched
            ? '暂无数据，请调整筛选条件'
            : '请配置筛选条件后点击「查询」按钮'}
        </p>
      </div>
    </div>
  );
}

export function SummaryCards({
  stats,
  loading,
  hasSearched = false,
}: SummaryCardsProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!stats) {
    return <EmptyState hasSearched={hasSearched} />;
  }

  const cards: Array<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    variant: StatVariant;
    suffix?: string;
  }> = [
    {
      label: '项目数',
      value: stats.projectCount,
      icon: <ProjectOutlined />,
      variant: 'primary',
    },
    {
      label: '发布/合作',
      value: `${stats.publishedCount}/${stats.collaborationCount}`,
      icon: <TeamOutlined />,
      variant: 'success',
    },
    {
      label: '执行金额',
      value: formatMoney(stats.totalAmount),
      icon: <DollarOutlined />,
      variant: 'purple',
    },
    {
      label: '总收入',
      value: formatMoney(stats.totalRevenue),
      icon: <DollarOutlined />,
      variant: 'blue',
    },
    {
      label: '总成本',
      value: formatMoney(stats.totalCost),
      icon: <DollarOutlined />,
      variant: 'warning',
    },
    {
      label: '返点收入',
      value: formatMoney(stats.totalRebateIncome),
      icon: <PercentageOutlined />,
      variant: 'success',
    },
    {
      label: '基础利润',
      value: formatMoney(stats.baseProfit),
      icon: <RiseOutlined />,
      variant: stats.baseProfit >= 0 ? 'success' : 'danger',
      suffix: formatPercent(stats.baseProfitRate),
    },
    {
      label: '资金占用费',
      value: formatMoney(stats.totalFundsOccupation),
      icon: <ClockCircleOutlined />,
      variant: 'pink',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
      {cards.map((card, index) => (
        <StatItem
          key={index}
          label={card.label}
          value={card.value}
          icon={card.icon}
          variant={card.variant}
          suffix={card.suffix}
        />
      ))}
    </div>
  );
}
