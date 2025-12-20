/**
 * 执行看板 - 工具函数
 */

import dayjs from 'dayjs';
import type { Collaboration } from '../../types/project';
import type {
  ProjectColor,
  ProjectCycle,
  WeekStat,
  ExecutionStats,
} from './types';

/**
 * 项目颜色配置（8色循环）
 */
export const PROJECT_COLORS: ProjectColor[] = [
  {
    index: 0,
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    text: 'text-blue-600',
    hex: '#3B82F6',
  },
  {
    index: 1,
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-500',
    text: 'text-emerald-600',
    hex: '#10B981',
  },
  {
    index: 2,
    bg: 'bg-purple-50',
    border: 'border-l-purple-500',
    text: 'text-purple-600',
    hex: '#8B5CF6',
  },
  {
    index: 3,
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    text: 'text-orange-600',
    hex: '#F59E0B',
  },
  {
    index: 4,
    bg: 'bg-pink-50',
    border: 'border-l-pink-500',
    text: 'text-pink-600',
    hex: '#EC4899',
  },
  {
    index: 5,
    bg: 'bg-cyan-50',
    border: 'border-l-cyan-500',
    text: 'text-cyan-600',
    hex: '#06B6D4',
  },
  {
    index: 6,
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    text: 'text-amber-600',
    hex: '#D97706',
  },
  {
    index: 7,
    bg: 'bg-indigo-50',
    border: 'border-l-indigo-500',
    text: 'text-indigo-600',
    hex: '#6366F1',
  },
];

/**
 * 状态颜色配置（使用设计系统语义化变量，自动适配深色模式）
 */
export const STATUS_COLORS = {
  published: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    dot: 'bg-success-500',
    label: '已发布',
  },
  scheduled: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    dot: 'bg-warning-500',
    label: '待发布',
  },
  delayed: {
    bg: 'bg-danger-50',
    text: 'text-danger-700',
    dot: 'bg-danger-500',
    label: '延期',
  },
} as const;

/**
 * 获取项目颜色
 */
export function getProjectColor(projectIndex: number): ProjectColor {
  return PROJECT_COLORS[projectIndex % PROJECT_COLORS.length];
}

/**
 * 解析本地日期（避免时区问题）
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * 格式化日期为 MM-DD
 */
export function formatShortDate(date: Date): string {
  return dayjs(date).format('MM-DD');
}

/**
 * 获取周一
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

/**
 * 获取周日
 */
export function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

/**
 * 判断日期是否为今天
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * 判断合作是否延期
 */
export function isCollabDelayed(collab: Collaboration): boolean {
  if (collab.status === '视频已发布') return false;
  if (!collab.plannedReleaseDate) return false;

  const plannedDate = parseLocalDate(collab.plannedReleaseDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return plannedDate < today;
}

/**
 * 获取合作的显示日期（已发布用实际日期，未发布用计划日期）
 */
export function getCollabDisplayDate(collab: Collaboration): string | null {
  if (collab.status === '视频已发布') {
    return collab.actualReleaseDate || collab.plannedReleaseDate || null;
  }
  return collab.plannedReleaseDate || null;
}

/**
 * 获取合作的状态标签
 */
export function getCollabStatusLabel(
  collab: Collaboration
): 'published' | 'scheduled' | 'delayed' {
  if (collab.status === '视频已发布') return 'published';
  if (isCollabDelayed(collab)) return 'delayed';
  return 'scheduled';
}

/**
 * 计算项目周期
 */
export function calculateProjectCycle(
  collaborations: Collaboration[]
): ProjectCycle | null {
  if (!collaborations.length) return null;

  const dates: Date[] = [];

  collaborations.forEach(collab => {
    const dateStr = getCollabDisplayDate(collab);
    if (dateStr) {
      dates.push(parseLocalDate(dateStr));
    }
  });

  if (!dates.length) return null;

  // 找出最早和最晚日期
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // 扩展到完整周
  const startDate = getMonday(minDate);
  const endDate = getSunday(maxDate);

  // 计算总周数
  const diffTime = endDate.getTime() - startDate.getTime();
  const totalWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;

  return { startDate, endDate, totalWeeks };
}

/**
 * 计算周统计数据
 */
export function calculateWeekStats(
  collaborations: Collaboration[],
  projectCycle: ProjectCycle
): WeekStat[] {
  const stats: WeekStat[] = [];

  for (let i = 0; i < projectCycle.totalWeeks; i++) {
    const weekStart = new Date(projectCycle.startDate);
    weekStart.setDate(weekStart.getDate() + i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // 过滤该周的合作
    const weekCollabs = collaborations.filter(collab => {
      const dateStr = getCollabDisplayDate(collab);
      if (!dateStr) return false;
      const date = parseLocalDate(dateStr);
      return date >= weekStart && date <= weekEnd;
    });

    stats.push({
      weekIndex: i,
      startDate: weekStart,
      endDate: weekEnd,
      publishedCount: weekCollabs.filter(c => c.status === '视频已发布').length,
      scheduledCount: weekCollabs.filter(
        c => c.status === '客户已定档' && !isCollabDelayed(c)
      ).length,
      delayedCount: weekCollabs.filter(c => isCollabDelayed(c)).length,
      totalCount: weekCollabs.length,
    });
  }

  return stats;
}

/**
 * 计算 KPI 统计数据
 */
export function calculateExecutionStats(
  collaborations: Collaboration[],
  currentWeekStart: Date
): ExecutionStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  // 全周期统计
  const allPublished = collaborations.filter(
    c => c.status === '视频已发布'
  ).length;
  const allDelayed = collaborations.filter(c => isCollabDelayed(c)).length;
  const allTotal = collaborations.length;

  // 当周合作
  const currentWeekCollabs = collaborations.filter(collab => {
    const dateStr = getCollabDisplayDate(collab);
    if (!dateStr) return false;
    const date = parseLocalDate(dateStr);
    return date >= currentWeekStart && date <= weekEnd;
  });

  const currentPublished = currentWeekCollabs.filter(
    c => c.status === '视频已发布'
  ).length;
  const currentDelayed = currentWeekCollabs.filter(c =>
    isCollabDelayed(c)
  ).length;
  const currentTotal = currentWeekCollabs.length;

  // 今日到期
  const dueToday = collaborations.filter(collab => {
    if (collab.status === '视频已发布') return false;
    const dateStr = collab.plannedReleaseDate;
    if (!dateStr) return false;
    const date = parseLocalDate(dateStr);
    return isToday(date);
  }).length;

  // 本周到期（未发布且计划日期在本周）
  const dueWeek = collaborations.filter(collab => {
    if (collab.status === '视频已发布') return false;
    const dateStr = collab.plannedReleaseDate;
    if (!dateStr) return false;
    const date = parseLocalDate(dateStr);
    return date >= today && date <= weekEnd;
  }).length;

  return {
    all: {
      totalPlan: allTotal,
      publishedCount: allPublished,
      publishRate:
        allTotal > 0 ? Math.round((allPublished / allTotal) * 100) : 0,
      delayedCount: allDelayed,
    },
    current: {
      totalPlan: currentTotal,
      publishedCount: currentPublished,
      publishRate:
        currentTotal > 0
          ? Math.round((currentPublished / currentTotal) * 100)
          : 0,
      dueToday,
      dueWeek,
      delayedCount: currentDelayed,
    },
  };
}

/**
 * 获取一周的日期数组（周一到周日）
 */
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * 获取星期几的中文名称
 */
export function getWeekDayName(date: Date): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[date.getDay()];
}

/**
 * 判断当前周索引
 */
export function getCurrentWeekIndex(
  projectCycle: ProjectCycle,
  currentWeekStart: Date
): number {
  const diffTime =
    currentWeekStart.getTime() - projectCycle.startDate.getTime();
  return Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
}
