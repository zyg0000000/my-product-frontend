/**
 * 执行看板 - 日历周视图组件
 * 优化版：增强日期头部、空状态、导航栏
 */

import { useMemo, useCallback, useState } from 'react';
import { Button, Empty, App, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { CollaborationWithProject } from '../types';
import { TalentCard } from './TalentCard';
import {
  getWeekDays,
  getWeekDayName,
  formatDate,
  formatShortDate,
  parseLocalDate,
  getCollabDisplayDate,
  isToday,
} from '../utils';

interface CalendarViewProps {
  weekStart: Date;
  collaborations: CollaborationWithProject[];
  onCardClick: (collab: CollaborationWithProject) => void;
  onCardDrop: (collabId: string, newDate: string) => Promise<void>;
  onNavigate: (direction: 'prev' | 'next') => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function CalendarView({
  weekStart,
  collaborations,
  onCardClick,
  onCardDrop,
  onNavigate,
  canGoPrev,
  canGoNext,
}: CalendarViewProps) {
  const { message } = App.useApp();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // 获取一周的日期
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // 按日期分组合作记录
  const collabsByDate = useMemo(() => {
    const map = new Map<string, CollaborationWithProject[]>();

    weekDays.forEach(day => {
      map.set(formatDate(day), []);
    });

    collaborations.forEach(collab => {
      const dateStr = getCollabDisplayDate(collab);
      if (!dateStr) return;

      const date = parseLocalDate(dateStr);
      const key = formatDate(date);

      if (map.has(key)) {
        map.get(key)!.push(collab);
      }
    });

    return map;
  }, [weekDays, collaborations]);

  // 处理拖拽开始
  const handleDragStart = useCallback(
    (e: React.DragEvent, collabId: string) => {
      e.dataTransfer.setData('collabId', collabId);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setDragOverDate(null);
  }, []);

  // 处理拖拽经过
  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  // 处理放置
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetDate: string) => {
      e.preventDefault();
      setDragOverDate(null);
      const collabId = e.dataTransfer.getData('collabId');
      if (!collabId) return;

      // 查找合作记录
      const collab = collaborations.find(c => c.id === collabId);
      if (!collab) return;

      // 检查项目是否可编辑
      if (collab.projectStatus !== 'executing') {
        message.warning('项目非执行中状态，无法修改发布日期');
        return;
      }

      // 调用更新
      await onCardDrop(collabId, targetDate);
      message.success('发布日期已更新');
    },
    [collaborations, onCardDrop, message]
  );

  // 周导航范围显示
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return (
    <div className="bg-surface rounded-xl border border-stroke overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 导航栏 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stroke bg-gradient-to-r from-surface-subtle via-surface to-surface-subtle">
        <Tooltip title="上一周 (←)">
          <Button
            icon={<LeftOutlined />}
            onClick={() => onNavigate('prev')}
            disabled={!canGoPrev}
            className="shadow-sm hover:shadow-md transition-shadow !border !border-stroke"
          />
        </Tooltip>
        <div className="flex items-center gap-2 px-5 py-2 bg-surface rounded-full border border-stroke shadow-sm">
          <CalendarOutlined className="text-primary-500" />
          <span className="text-sm font-semibold text-content">
            {formatShortDate(weekStart)} ~ {formatShortDate(weekEnd)}
          </span>
        </div>
        <Tooltip title="下一周 (→)">
          <Button
            icon={<RightOutlined />}
            onClick={() => onNavigate('next')}
            disabled={!canGoNext}
            className="shadow-sm hover:shadow-md transition-shadow !border !border-stroke"
          />
        </Tooltip>
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 min-h-[520px]">
        {weekDays.map(day => {
          const dateKey = formatDate(day);
          const dayCollabs = collabsByDate.get(dateKey) || [];
          const isTodayDate = isToday(day);
          const isDragOver = dragOverDate === dateKey;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={dateKey}
              className={`
                border-r border-stroke last:border-r-0 flex flex-col transition-all duration-200
                ${isTodayDate ? 'bg-primary-50/50' : ''}
                ${isDragOver ? 'bg-primary-100/70 ring-2 ring-inset ring-primary-400' : ''}
                ${isWeekend && !isTodayDate ? 'bg-surface-subtle/50' : ''}
              `}
              onDragOver={e => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, dateKey)}
            >
              {/* 日期头部 */}
              <div
                className={`
                px-3 py-3.5 border-b border-stroke text-center relative
                ${
                  isTodayDate
                    ? 'bg-gradient-to-b from-primary-100 to-primary-50/50'
                    : isWeekend
                      ? 'bg-surface-subtle/80'
                      : 'bg-surface-subtle'
                }
              `}
              >
                {/* 今日顶部高亮条 */}
                {isTodayDate && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-400" />
                )}

                {/* 星期 */}
                <div
                  className={`text-xs font-semibold tracking-wide ${
                    isTodayDate
                      ? 'text-primary-600'
                      : isWeekend
                        ? 'text-content-muted'
                        : 'text-content-secondary'
                  }`}
                >
                  {getWeekDayName(day)}
                </div>

                {/* 日期数字 */}
                <div
                  className={`text-2xl font-bold mt-1 ${
                    isTodayDate
                      ? 'text-primary-600'
                      : isWeekend
                        ? 'text-content-secondary'
                        : 'text-content'
                  }`}
                >
                  {day.getDate()}
                </div>

                {/* 任务数徽标 */}
                <div
                  className={`
                  text-[11px] mt-2 px-3 py-1 rounded-full inline-flex items-center gap-1 font-medium transition-all
                  ${
                    dayCollabs.length > 0
                      ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                      : 'text-content-muted/60'
                  }
                `}
                >
                  {dayCollabs.length > 0 ? (
                    <>
                      <span>{dayCollabs.length}</span>
                      <span>个任务</span>
                    </>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              {/* 卡片列表 */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[440px] scrollbar-thin scrollbar-thumb-stroke scrollbar-track-transparent scroll-smooth">
                {dayCollabs.length > 0 ? (
                  dayCollabs.map(collab => (
                    <TalentCard
                      key={collab.id}
                      collaboration={collab}
                      isEditable={collab.projectStatus === 'executing'}
                      onClick={() => onCardClick(collab)}
                      onDragStart={e => handleDragStart(e, collab.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))
                ) : (
                  <div
                    className={`
                    h-full flex flex-col items-center justify-center min-h-[100px] rounded-lg
                    ${isDragOver ? 'border-2 border-dashed border-primary-400 bg-primary-50/50' : ''}
                  `}
                  >
                    <InboxOutlined
                      className={`text-2xl mb-1 ${isDragOver ? 'text-primary-400' : 'text-content-muted/30'}`}
                    />
                    <span
                      className={`text-xs ${isDragOver ? 'text-primary-500 font-medium' : 'text-content-muted/40'}`}
                    >
                      {isDragOver ? '放置到此处' : '暂无任务'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {collaborations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/90 backdrop-blur-sm">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-content-muted">暂无发布计划</span>
            }
          />
        </div>
      )}
    </div>
  );
}
