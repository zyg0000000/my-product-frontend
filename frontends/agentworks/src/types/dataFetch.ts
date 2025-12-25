/**
 * 数据抓取相关类型定义
 * @module types/dataFetch
 */

import type { TaskExecuteResponse } from '../api/automation';

/**
 * 抓取任务状态
 */
export type FetchTaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped';

/**
 * 单个视频的抓取任务
 */
export interface FetchTask {
  /** 合作记录 ID */
  collaborationId: string;
  /** 达人名称 */
  talentName: string;
  /** 视频 ID（14 天后使用） */
  videoId: string;
  /** 星图任务 ID（14 天内使用） */
  taskId?: string;
  /** 发布日期 */
  publishDate?: string;
  /** 使用的工作流 ID */
  workflowId: string;
  /** 使用的工作流名称 */
  workflowName: string;
  /** 工作流需要的输入类型 */
  requiredInput: 'taskId' | 'videoId';
  /** 实际传给工作流的输入值 */
  inputValue: string;
  /** 任务状态 */
  status: FetchTaskStatus;
  /** 抓取到的播放量 */
  fetchedViews?: number;
  /** 执行结果 */
  result?: TaskExecuteResponse;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  duration?: number;
}

/**
 * 抓取会话状态
 */
export interface FetchSession {
  /** 会话 ID */
  sessionId: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 总任务数 */
  totalTasks: number;
  /** 已完成数 */
  completedTasks: number;
  /** 成功数 */
  successTasks: number;
  /** 失败数 */
  failedTasks: number;
  /** 跳过数（无 videoId） */
  skippedTasks: number;
  /** 是否正在执行 */
  isRunning: boolean;
  /** 任务列表 */
  tasks: FetchTask[];
}

/**
 * 工作流选择规则
 * 发布后 14 天内使用「获取合作视频当日播放量」→ 需要 taskId
 * 发布后 14 天后使用「获取合作视频14天后当日播放量」→ 需要 videoId
 */
export interface WorkflowRule {
  /** 规则名称 */
  name: string;
  /** 适用天数范围 [min, max]，null 表示无上限 */
  daysRange: [number, number | null];
  /** 对应的工作流 ID */
  workflowId: string;
  /** 工作流名称 */
  workflowName: string;
  /** 工作流需要的输入类型 */
  requiredInput: 'taskId' | 'videoId';
}

/**
 * 抓取配置
 */
export interface FetchConfig {
  /** 工作流规则列表 */
  workflowRules: WorkflowRule[];
  /** 并发数（默认 1，串行执行避免被反爬） */
  concurrency: number;
  /** 单个任务超时时间（毫秒） */
  timeout: number;
  /** 任务间隔时间（毫秒） */
  interval: number;
}

/**
 * 抓取进度信息
 */
export interface FetchProgress {
  /** 总任务数 */
  total: number;
  /** 已完成数 */
  completed: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped: number;
  /** 完成百分比 */
  percentage: number;
}
