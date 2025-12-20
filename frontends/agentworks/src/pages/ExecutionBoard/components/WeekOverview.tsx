/**
 * 执行看板 - 全周期概览组件
 * 优化版：进度条、增强图例、更宽卡片
 */

import { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import {
  HomeOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ProjectCycle, WeekStat } from '../types';
import { formatShortDate } from '../utils';

interface WeekOverviewProps {
  projectCycle: ProjectCycle | null;
  weekStats: WeekStat[];
  currentWeekIndex: number;
  onWeekClick: (weekIndex: number) => void;
  onGoToToday: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

// 迷你进度条组件
function MiniProgressBar({
  published,
  total,
}: {
  published: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((published / total) * 100) : 0;

  return (
    <div className="w-full h-1.5 bg-stroke rounded-full overflow-hidden mt-2">
      <div
        className="h-full bg-success-500 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function WeekOverview({
  projectCycle,
  weekStats,
  currentWeekIndex,
  onWeekClick,
  onGoToToday,
  onRefresh,
  loading,
}: WeekOverviewProps) {
  // 计算全局统计
  const globalStats = useMemo(() => {
    return weekStats.reduce(
      (acc, week) => ({
        published: acc.published + week.publishedCount,
        scheduled: acc.scheduled + week.scheduledCount,
        delayed: acc.delayed + week.delayedCount,
      }),
      { published: 0, scheduled: 0, delayed: 0 }
    );
  }, [weekStats]);

  if (!projectCycle || weekStats.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-stroke p-5 shadow-sm">
        <div className="text-center text-content-muted py-8">
          <CalendarOutlined className="text-3xl mb-2 opacity-30" />
          <div>暂无数据，请选择项目</div>
        </div>
      </div>
    );
  }

  // 判断某周是否包含今天
  const todayWeekIndex = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < weekStats.length; i++) {
      if (today >= weekStats[i].startDate && today <= weekStats[i].endDate) {
        return i;
      }
    }
    return -1;
  })();

  return (
    <div className="bg-surface rounded-xl border border-stroke p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-content flex items-center">
          <span className="w-2 h-5 bg-primary-500 rounded-full mr-2.5" />
          全周期概览
          <span className="ml-3 px-2.5 py-1 text-xs font-semibold bg-primary-500 text-white rounded-full shadow-sm">
            共 {weekStats.length} 周
          </span>
        </h3>
        <div className="flex items-center gap-2.5">
          <Tooltip title="跳转到包含今天的周">
            <Button
              size="small"
              icon={<HomeOutlined />}
              onClick={onGoToToday}
              className="shadow-sm"
            >
              回到今天
            </Button>
          </Tooltip>
          <Tooltip title="刷新数据">
            <Button
              size="small"
              icon={<ReloadOutlined spin={loading} />}
              onClick={onRefresh}
              className="shadow-sm"
            >
              刷新
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 周卡片列表 */}
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-stroke scrollbar-track-transparent">
        {weekStats.map(week => {
          const isCurrent = week.weekIndex === currentWeekIndex;
          const isToday = week.weekIndex === todayWeekIndex;
          const hasContent = week.totalCount > 0;

          return (
            <Tooltip
              key={week.weekIndex}
              title={
                <div className="text-xs space-y-1.5 p-1">
                  <div className="font-semibold border-b border-white/20 pb-1 mb-1">
                    {formatShortDate(week.startDate)} ~{' '}
                    {formatShortDate(week.endDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span>已发布: {week.publishedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>待发布: {week.scheduledCount}</span>
                  </div>
                  {week.delayedCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span>延期: {week.delayedCount}</span>
                    </div>
                  )}
                </div>
              }
            >
              <button
                onClick={() => onWeekClick(week.weekIndex)}
                className={`
                  flex-shrink-0 w-[90px] p-3 rounded-xl border text-center transition-all duration-200
                  ${
                    isCurrent
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-stroke bg-surface hover:border-primary-300 hover:bg-surface-subtle hover:shadow-sm hover:-translate-y-0.5'
                  }
                  ${isToday && !isCurrent ? 'border-dashed border-primary-400 border-2' : ''}
                `}
              >
                {/* 周标识与今日标记 */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${isCurrent ? 'text-primary-600' : 'text-content-secondary'}`}
                  >
                    W{week.weekIndex + 1}
                  </span>
                  {isToday && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse shadow-sm shadow-primary-500/50" />
                  )}
                </div>

                {/* 日期范围 */}
                <div className="text-[11px] text-content-muted mt-1.5 font-medium">
                  {formatShortDate(week.startDate)}
                </div>

                {/* 进度条 */}
                {hasContent ? (
                  <MiniProgressBar
                    published={week.publishedCount}
                    total={week.totalCount}
                  />
                ) : (
                  <div className="w-full h-1.5 bg-stroke/50 rounded-full mt-2" />
                )}

                {/* 数量统计 */}
                <div
                  className={`text-xs font-semibold mt-2 ${isCurrent ? 'text-primary-600' : 'text-content'}`}
                >
                  {hasContent
                    ? `${week.publishedCount}/${week.totalCount}`
                    : '-'}
                </div>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* 增强图例 - 带统计数量 */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stroke/50">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 rounded-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-success-500 shadow-sm" />
          <span className="text-xs font-medium text-success-700">
            已发布 <span className="font-bold">({globalStats.published})</span>
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 rounded-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-warning-500 shadow-sm" />
          <span className="text-xs font-medium text-warning-700">
            待发布 <span className="font-bold">({globalStats.scheduled})</span>
          </span>
        </div>
        {globalStats.delayed > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-50 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-500 shadow-sm" />
            <span className="text-xs font-medium text-danger-700">
              延期 <span className="font-bold">({globalStats.delayed})</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
