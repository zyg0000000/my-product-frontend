/**
 * 调度器相关类型定义
 * @module types/scheduler
 */

/**
 * 执行频率
 */
export type ScheduleFrequency = 'daily' | 'weekdays';

/**
 * 执行触发类型
 */
export type ExecutionTriggerType = 'scheduled' | 'manual';

/**
 * 执行状态
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

/**
 * 全局调度配置
 */
export interface SchedulerConfig {
  _id: 'global';
  /** 是否启用定时调度 */
  enabled: boolean;
  /** 执行时间，如 "10:00"（仅支持整点） */
  time: string;
  /** 执行频率 */
  frequency: ScheduleFrequency;
  /** 选中的项目 ID 列表 */
  selectedProjectIds: string[];
  /** 上次执行时间 */
  lastExecutedAt?: string;
  /** 配置更新时间 */
  updatedAt?: string;
}

/**
 * 可选项目（用于项目选择器）
 */
export interface EligibleProject {
  id: string;
  name: string;
  trackingStatus: 'active';
  trackingVersion?: 'standard' | 'joint';
  benchmarkCPM?: number;
}

/**
 * 执行任务详情
 */
export interface ExecutionTask {
  collaborationId: string;
  talentName: string;
  videoId?: string;
  status: TaskStatus;
  fetchedViews?: number;
  error?: string;
  duration?: number;
}

/**
 * 调度执行记录
 */
export interface ScheduledExecution {
  _id: string;
  projectId: string;
  projectName: string;
  triggerType: ExecutionTriggerType;
  /** 计划执行时间 */
  scheduledAt: string;
  /** 实际执行时间 */
  executedAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 总任务数 */
  taskCount: number;
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failedCount: number;
  /** 跳过数 */
  skippedCount: number;
  /** 总耗时 ms */
  duration?: number;
  /** 错误信息 */
  error?: string;
  /** 任务详情 */
  tasks: ExecutionTask[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 频率标签
 */
export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: '每天',
  weekdays: '仅工作日',
};

/**
 * 执行状态标签
 */
export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
};

/**
 * 执行状态颜色
 */
export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
};

/**
 * 触发类型标签
 */
export const TRIGGER_TYPE_LABELS: Record<ExecutionTriggerType, string> = {
  scheduled: '定时',
  manual: '手动',
};

/**
 * 生成整点时间选项
 */
export function generateTimeOptions(): { label: string; value: string }[] {
  const options = [];
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, '0');
    options.push({
      label: `${hour}:00`,
      value: `${hour}:00`,
    });
  }
  return options;
}

/**
 * 计算下次执行时间
 */
export function calculateNextExecutionTime(
  config: SchedulerConfig
): Date | null {
  if (!config.enabled || config.selectedProjectIds.length === 0) {
    return null;
  }

  const now = new Date();
  const [hour] = config.time.split(':').map(Number);

  // 今天的执行时间
  const todayExecution = new Date(now);
  todayExecution.setHours(hour, 0, 0, 0);

  // 如果今天的时间还没过
  if (todayExecution > now) {
    // 检查是否是工作日
    if (config.frequency === 'weekdays') {
      const day = todayExecution.getDay();
      if (day === 0 || day === 6) {
        // 周末，跳到下周一
        const daysUntilMonday = day === 0 ? 1 : 2;
        todayExecution.setDate(todayExecution.getDate() + daysUntilMonday);
      }
    }
    return todayExecution;
  }

  // 今天已过，计算明天
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, 0, 0, 0);

  if (config.frequency === 'weekdays') {
    let day = tomorrow.getDay();
    while (day === 0 || day === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
      day = tomorrow.getDay();
    }
  }

  return tomorrow;
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '明天';
  } else if (diffDays === -1) {
    return '昨天';
  } else if (diffDays > 0) {
    return `${diffDays} 天后`;
  } else {
    return `${-diffDays} 天前`;
  }
}
