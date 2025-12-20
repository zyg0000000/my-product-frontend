/**
 * 执行看板 - KPI 统计面板
 *
 * 卡片布局：两侧各 4 个指标，发布率用数字展示
 */

import { Card } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
  RiseOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ExecutionStats, ProjectCycle } from '../types';
import { formatShortDate } from '../utils';

interface KPIPanelProps {
  stats: ExecutionStats;
  currentWeekStart: Date;
  projectCycle: ProjectCycle | null;
}

// 统计卡片项组件
interface StatItemProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  suffix?: string;
}

function StatItem({
  label,
  value,
  icon,
  variant = 'default',
  suffix,
}: StatItemProps) {
  const variantStyles = {
    default: 'bg-surface-subtle',
    success: 'bg-success-50',
    warning: 'bg-warning-50',
    danger: 'bg-danger-50',
    primary: 'bg-primary-50',
  };

  const valueStyles = {
    default: 'text-content',
    success: 'text-success-700',
    warning: 'text-warning-700',
    danger: 'text-danger-700',
    primary: 'text-primary-600',
  };

  return (
    <div
      className={`text-center p-4 rounded-xl ${variantStyles[variant]} transition-colors`}
    >
      <div className="text-xs text-content-secondary mb-2 flex items-center justify-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${valueStyles[variant]}`}>
        {value}
        {suffix && <span className="text-sm font-medium ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

export function KPIPanel({
  stats,
  currentWeekStart,
  projectCycle,
}: KPIPanelProps) {
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  // 发布率变体
  const getRateVariant = (rate: number): 'success' | 'warning' | 'default' => {
    if (rate >= 80) return 'success';
    if (rate >= 50) return 'warning';
    return 'default';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 全周期统计 */}
      <Card
        size="small"
        title={
          <span className="text-sm font-medium text-content flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center mr-3">
              <RiseOutlined className="text-primary-500" />
            </span>
            全周期统计
            {projectCycle && (
              <span className="ml-3 px-2.5 py-1 text-xs font-semibold bg-primary-500 text-white rounded-full shadow-sm">
                {formatShortDate(projectCycle.startDate)} ~{' '}
                {formatShortDate(projectCycle.endDate)}
              </span>
            )}
          </span>
        }
        className="shadow-sm rounded-xl border-stroke hover:shadow-md transition-shadow"
        styles={{ body: { padding: '16px' } }}
      >
        <div className="grid grid-cols-4 gap-3">
          <StatItem
            label="计划总数"
            value={stats.all.totalPlan}
            icon={<FileTextOutlined className="text-content-muted" />}
          />
          <StatItem
            label="已发布"
            value={stats.all.publishedCount}
            icon={<CheckCircleOutlined className="text-success-500" />}
            variant="success"
          />
          <StatItem
            label="发布率"
            value={stats.all.publishRate}
            suffix="%"
            variant={getRateVariant(stats.all.publishRate)}
          />
          <StatItem
            label="延期"
            value={stats.all.delayedCount}
            icon={
              <WarningOutlined
                className={
                  stats.all.delayedCount > 0
                    ? 'text-danger-500'
                    : 'text-content-muted'
                }
              />
            }
            variant={stats.all.delayedCount > 0 ? 'danger' : 'default'}
          />
        </div>
      </Card>

      {/* 当周统计 */}
      <Card
        size="small"
        title={
          <span className="text-sm font-medium text-content flex items-center">
            <span className="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center mr-3">
              <CalendarOutlined className="text-warning-500" />
            </span>
            当周统计
            <span className="ml-3 px-2.5 py-1 text-xs font-semibold bg-warning-500 text-white rounded-full shadow-sm">
              {formatShortDate(currentWeekStart)} ~ {formatShortDate(weekEnd)}
            </span>
          </span>
        }
        className="shadow-sm rounded-xl border-stroke hover:shadow-md transition-shadow"
        styles={{ body: { padding: '16px' } }}
      >
        <div className="grid grid-cols-4 gap-3">
          <StatItem
            label="本周计划"
            value={stats.current.totalPlan}
            icon={<FileTextOutlined className="text-content-muted" />}
          />
          <StatItem
            label="已发布"
            value={stats.current.publishedCount}
            icon={<CheckCircleOutlined className="text-success-500" />}
            variant="success"
          />
          <StatItem
            label="待发布"
            value={stats.current.dueWeek}
            icon={
              <ClockCircleOutlined
                className={
                  stats.current.dueWeek > 0
                    ? 'text-warning-500'
                    : 'text-content-muted'
                }
              />
            }
            variant={stats.current.dueWeek > 0 ? 'warning' : 'default'}
          />
          <StatItem
            label="延期"
            value={stats.current.delayedCount}
            icon={
              <WarningOutlined
                className={
                  stats.current.delayedCount > 0
                    ? 'text-danger-500'
                    : 'text-content-muted'
                }
              />
            }
            variant={stats.current.delayedCount > 0 ? 'danger' : 'default'}
          />
        </div>
      </Card>
    </div>
  );
}
