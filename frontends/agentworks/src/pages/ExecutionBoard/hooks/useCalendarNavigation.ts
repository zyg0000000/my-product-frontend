/**
 * 执行看板 - 日历导航 Hook
 */

import { useState, useMemo, useCallback } from 'react';
import type { Collaboration } from '../../../types/project';
import type { ProjectCycle, WeekStat } from '../types';
import {
  getMonday,
  calculateProjectCycle,
  calculateWeekStats,
  getCurrentWeekIndex,
} from '../utils';

interface UseCalendarNavigationReturn {
  currentWeekStart: Date;
  projectCycle: ProjectCycle | null;
  weekStats: WeekStat[];
  currentWeekIndex: number;
  navigateWeek: (direction: 'prev' | 'next') => void;
  jumpToWeek: (weekIndex: number) => void;
  goToToday: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function useCalendarNavigation(
  collaborations: Collaboration[]
): UseCalendarNavigationReturn {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getMonday(new Date())
  );

  // 计算项目周期
  const projectCycle = useMemo(() => {
    return calculateProjectCycle(collaborations);
  }, [collaborations]);

  // 计算周统计数据
  const weekStats = useMemo(() => {
    if (!projectCycle) return [];
    return calculateWeekStats(collaborations, projectCycle);
  }, [collaborations, projectCycle]);

  // 当前周索引
  const currentWeekIndex = useMemo(() => {
    if (!projectCycle) return 0;
    return getCurrentWeekIndex(projectCycle, currentWeekStart);
  }, [projectCycle, currentWeekStart]);

  // 导航控制 - 基于周索引判断，与 WeekOverview 保持一致
  const canGoPrev = useMemo(() => {
    if (!projectCycle) return false;
    return currentWeekIndex > 0;
  }, [projectCycle, currentWeekIndex]);

  const canGoNext = useMemo(() => {
    if (!projectCycle) return false;
    return currentWeekIndex < projectCycle.totalWeeks - 1;
  }, [projectCycle, currentWeekIndex]);

  // 周导航
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  }, []);

  // 跳转到指定周
  const jumpToWeek = useCallback(
    (weekIndex: number) => {
      if (!projectCycle) return;

      const targetDate = new Date(projectCycle.startDate);
      targetDate.setDate(targetDate.getDate() + weekIndex * 7);
      setCurrentWeekStart(targetDate);
    },
    [projectCycle]
  );

  // 回到今天
  const goToToday = useCallback(() => {
    setCurrentWeekStart(getMonday(new Date()));
  }, []);

  return {
    currentWeekStart,
    projectCycle,
    weekStats,
    currentWeekIndex,
    navigateWeek,
    jumpToWeek,
    goToToday,
    canGoPrev,
    canGoNext,
  };
}
