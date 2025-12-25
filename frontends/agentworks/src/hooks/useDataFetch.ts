/**
 * 数据抓取 Hook
 * @module hooks/useDataFetch
 *
 * 功能：
 * - 管理抓取会话状态
 * - 根据发布日期自动选择工作流
 * - 串行执行任务（避免反爬）
 * - 抓取成功后写入日报数据
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { App } from 'antd';
import * as automationApi from '../api/automation';
import { getWorkflows } from '../api/automation';
import { saveDailyStats } from '../api/dailyReport';
import type { MissingDataVideo, DailyStatsEntry } from '../types/dailyReport';
import type {
  FetchTask,
  FetchSession,
  FetchConfig,
  WorkflowRule,
  FetchProgress,
} from '../types/dataFetch';
import type { EcsWorkflow } from '../api/automation';

/**
 * 默认抓取配置
 */
const DEFAULT_CONFIG: FetchConfig = {
  workflowRules: [], // 动态加载
  concurrency: 1,
  timeout: 120000, // 2 分钟
  interval: 2000, // 2 秒间隔
};

/**
 * 工作流名称匹配关键词
 * 注意：匹配顺序很重要，先排除再匹配
 */
const WORKFLOW_KEYWORDS = {
  // 14 天内：包含"当日播放量"但不包含"14天后"
  within14Days: {
    include: ['当日播放量'],
    exclude: ['14天后'],
  },
  // 14 天后：必须包含"14天后"
  after14Days: {
    include: ['14天后'],
    exclude: [],
  },
};

interface UseDataFetchOptions {
  projectId: string;
  /** 保存日报数据的目标日期（YYYY-MM-DD 格式） */
  targetDate?: string;
  onFetchComplete?: (session: FetchSession) => void;
  config?: Partial<FetchConfig>;
}

interface UseDataFetchReturn {
  // 状态
  session: FetchSession | null;
  isRunning: boolean;
  progress: FetchProgress;
  workflowRules: WorkflowRule[];
  workflowsLoading: boolean;

  // 操作
  startFetch: (videos: MissingDataVideo[]) => Promise<void>;
  stopFetch: () => void;
  retryFailed: () => Promise<void>;
  clearSession: () => void;

  // 工具
  getWorkflowForVideo: (publishDate?: string) => WorkflowRule | null;
  canFetch: (video: MissingDataVideo) => { canFetch: boolean; reason?: string };
}

/**
 * 计算发布距今天数
 */
function getDaysSincePublish(publishDate?: string): number {
  if (!publishDate) return Infinity;
  const publish = new Date(publishDate);
  const today = new Date();
  const diffTime = today.getTime() - publish.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 检查工作流名称是否匹配规则
 */
function matchesKeywords(
  name: string,
  rule: { include: string[]; exclude: string[] }
): boolean {
  const hasInclude = rule.include.some(keyword => name.includes(keyword));
  const hasExclude = rule.exclude.some(keyword => name.includes(keyword));
  return hasInclude && !hasExclude;
}

/**
 * 从工作流列表中匹配抓取工作流
 * 使用 ECS API 返回的工作流格式（执行任务必须用 ECS 的工作流 ID）
 */
function matchWorkflowRules(workflows: EcsWorkflow[]): WorkflowRule[] {
  const rules: WorkflowRule[] = [];

  // 查找 14 天内工作流（需要 taskId）
  // 包含"当日播放量"但不包含"14天后"
  const within14DaysWf = workflows.find(wf =>
    matchesKeywords(wf.name, WORKFLOW_KEYWORDS.within14Days)
  );
  if (within14DaysWf) {
    rules.push({
      name: '14天内抓取',
      daysRange: [0, 14],
      workflowId: within14DaysWf.id,
      workflowName: within14DaysWf.name,
      requiredInput: 'taskId',
    });
  }

  // 查找 14 天后工作流（需要 videoId）
  // 必须包含"14天后"
  const after14DaysWf = workflows.find(wf =>
    matchesKeywords(wf.name, WORKFLOW_KEYWORDS.after14Days)
  );
  if (after14DaysWf) {
    rules.push({
      name: '14天后抓取',
      daysRange: [14, null],
      workflowId: after14DaysWf.id,
      workflowName: after14DaysWf.name,
      requiredInput: 'videoId',
    });
  }

  return rules;
}

/**
 * 解析播放量字符串为数字
 * 支持格式: "10,792,155" / "1692.14w" / 10792155
 */
function parseViewsValue(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;

  // 移除逗号，尝试直接解析
  const cleaned = value.replace(/,/g, '');

  // 检查是否是 "万" 格式 (如 "1692.14w" 或 "1,692.14万")
  const wanMatch = cleaned.match(/^([\d.]+)\s*[w万]$/i);
  if (wanMatch) {
    return Math.round(parseFloat(wanMatch[1]) * 10000);
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * 从执行结果中解析播放量
 *
 * ECS 返回的结构：
 * {
 *   success: true,
 *   results: {
 *     status: 'completed',
 *     result: { screenshots: [...], data: { '播放量': '10,792,727' } }
 *   }
 * }
 */
function parseViewsFromResult(
  result: automationApi.TaskExecuteResponse
): number | null {
  if (!result.success) return null;

  // 可能的字段名（包括中文）
  const possibleKeys = [
    '播放量',
    'views',
    'playCount',
    'totalViews',
    'play_count',
    '播放数',
    '视频播放量',
  ];

  // ECS 返回的 results 是一个对象，不是数组
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = result.results as any;

  // 处理 ECS 返回格式: results.result.data
  if (results?.result?.data) {
    const data = results.result.data as Record<string, unknown>;
    for (const key of possibleKeys) {
      if (data[key] !== undefined) {
        const views = parseViewsValue(data[key]);
        console.log('[DataFetch] parseViewsFromResult ECS格式:', {
          key,
          raw: data[key],
          parsed: views,
        });
        if (views !== null) return views;
      }
    }
  }

  // 处理 results.data 格式（备用）
  if (results?.data) {
    const data = results.data as Record<string, unknown>;
    for (const key of possibleKeys) {
      if (data[key] !== undefined) {
        const views = parseViewsValue(data[key]);
        if (views !== null) return views;
      }
    }
  }

  // 处理数组格式（如果将来改回数组）
  if (Array.isArray(results)) {
    for (const actionResult of results) {
      if (actionResult.success && actionResult.data) {
        const data = actionResult.data as Record<string, unknown>;
        for (const key of possibleKeys) {
          if (data[key] !== undefined) {
            const views = parseViewsValue(data[key]);
            if (views !== null) return views;
          }
        }
      }
    }
  }

  console.log(
    '[DataFetch] parseViewsFromResult 未找到播放量, results结构:',
    JSON.stringify(results, null, 2)
  );
  return null;
}

export function useDataFetch({
  projectId,
  targetDate,
  onFetchComplete,
  config: userConfig,
}: UseDataFetchOptions): UseDataFetchReturn {
  const { message } = App.useApp();
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // 状态
  const [session, setSession] = useState<FetchSession | null>(null);
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAbortedRef = useRef(false);

  // 加载工作流规则（从 ECS API 获取，因为执行任务用的是 ECS）
  useEffect(() => {
    async function loadWorkflows() {
      setWorkflowsLoading(true);
      try {
        // 必须用 ECS API 获取工作流，因为执行任务时用的是 ECS 的工作流 ID
        const workflows = await getWorkflows();
        const rules = matchWorkflowRules(workflows);
        setWorkflowRules(rules);
        console.log('[DataFetch] 加载工作流规则 (ECS):', rules);
        if (rules.length === 0) {
          console.warn('未找到匹配的抓取工作流');
        }
      } catch (error) {
        console.error('加载工作流失败:', error);
      } finally {
        setWorkflowsLoading(false);
      }
    }
    loadWorkflows();
  }, []);

  // 根据发布日期选择工作流
  const getWorkflowForVideo = useCallback(
    (publishDate?: string): WorkflowRule | null => {
      const days = getDaysSincePublish(publishDate);

      for (const rule of workflowRules) {
        const [min, max] = rule.daysRange;
        if (days >= min && (max === null || days < max)) {
          return rule;
        }
      }
      return null;
    },
    [workflowRules]
  );

  // 检查视频是否可抓取
  const canFetch = useCallback(
    (video: MissingDataVideo): { canFetch: boolean; reason?: string } => {
      const workflow = getWorkflowForVideo(video.publishDate);
      if (!workflow) {
        return { canFetch: false, reason: '无匹配的抓取工作流' };
      }

      // 根据工作流需要的输入类型检查
      if (workflow.requiredInput === 'taskId') {
        if (!video.taskId) {
          return { canFetch: false, reason: '无星图任务 ID' };
        }
      } else if (workflow.requiredInput === 'videoId') {
        if (!video.videoId) {
          return { canFetch: false, reason: '无视频 ID' };
        }
      }

      return { canFetch: true };
    },
    [getWorkflowForVideo]
  );

  // 执行单个抓取任务
  const executeTask = useCallback(
    async (task: FetchTask): Promise<FetchTask> => {
      const startTime = Date.now();

      console.log('[DataFetch] executeTask 开始:', {
        workflowId: task.workflowId,
        workflowName: task.workflowName,
        requiredInput: task.requiredInput,
        inputValue: task.inputValue,
        collaborationId: task.collaborationId,
      });

      try {
        const result = await automationApi.executeTask({
          workflowId: task.workflowId,
          inputValue: task.inputValue, // 使用任务中预设的输入值
          metadata: {
            source: 'daily-report-fetch',
            projectId,
            collaborationId: task.collaborationId,
          },
        });

        console.log('[DataFetch] executeTask 结果:', {
          success: result.success,
          error: result.error,
          resultsCount: result.results?.length,
          results: result.results,
        });

        const views = parseViewsFromResult(result);
        console.log('[DataFetch] 解析播放量:', views);

        return {
          ...task,
          status: result.success ? 'success' : 'failed',
          fetchedViews: views ?? undefined,
          result,
          error: result.success ? undefined : result.error || '抓取失败',
          duration: Date.now() - startTime,
        };
      } catch (error) {
        console.error('[DataFetch] executeTask 异常:', error);
        return {
          ...task,
          status: 'failed',
          error: error instanceof Error ? error.message : '网络错误',
          duration: Date.now() - startTime,
        };
      }
    },
    [projectId]
  );

  // 保存抓取结果到日报
  const saveResults = useCallback(
    async (tasks: FetchTask[]): Promise<void> => {
      console.log(
        '[DataFetch] saveResults 收到任务:',
        tasks.map(t => ({
          talent: t.talentName,
          status: t.status,
          views: t.fetchedViews,
        }))
      );

      const successTasks = tasks.filter(
        t => t.status === 'success' && t.fetchedViews !== undefined
      );

      console.log('[DataFetch] 成功任务数:', successTasks.length);

      if (successTasks.length === 0) {
        console.log('[DataFetch] 没有成功的任务需要保存');
        return;
      }

      const entries: DailyStatsEntry[] = successTasks.map(t => ({
        collaborationId: t.collaborationId,
        totalViews: t.fetchedViews!,
        source: 'auto' as const,
      }));

      console.log(
        '[DataFetch] 准备保存的数据:',
        entries,
        '目标日期:',
        targetDate
      );

      try {
        const result = await saveDailyStats({
          projectId,
          date: targetDate, // 保存到用户选择的日期
          data: entries,
        });
        console.log('[DataFetch] saveDailyStats 返回:', result);
        message.success(`成功保存 ${entries.length} 条日报数据`);
      } catch (error) {
        message.error('保存日报数据失败');
        console.error('[DataFetch] 保存日报数据失败:', error);
      }
    },
    [projectId, targetDate, message]
  );

  // 开始抓取
  const startFetch = useCallback(
    async (videos: MissingDataVideo[]) => {
      if (workflowRules.length === 0) {
        message.error('未找到抓取工作流，请先配置工作流');
        return;
      }

      console.log('[DataFetch] 开始抓取，视频数:', videos.length);

      try {
        // 初始化任务列表
        const tasks: FetchTask[] = videos.map(video => {
          const check = canFetch(video);
          const workflow = getWorkflowForVideo(video.publishDate);

          // 根据工作流类型选择输入值
          const requiredInput = workflow?.requiredInput || 'videoId';
          const inputValue =
            requiredInput === 'taskId'
              ? video.taskId || ''
              : video.videoId || '';

          console.log('[DataFetch] 任务初始化:', {
            talent: video.talentName,
            videoId: video.videoId,
            taskId: video.taskId,
            requiredInput,
            inputValue,
            canFetch: check.canFetch,
            workflow: workflow?.workflowName,
          });

          return {
            collaborationId: video.collaborationId,
            talentName: video.talentName,
            videoId: video.videoId || '',
            taskId: video.taskId || undefined,
            publishDate: video.publishDate,
            workflowId: workflow?.workflowId || '',
            workflowName: workflow?.workflowName || '',
            requiredInput,
            inputValue,
            status: check.canFetch ? 'pending' : 'skipped',
            error: check.canFetch ? undefined : check.reason,
          };
        });

        const sessionId = `fetch_${Date.now()}`;
        const newSession: FetchSession = {
          sessionId,
          startTime: new Date().toISOString(),
          totalTasks: tasks.length,
          completedTasks: 0,
          successTasks: 0,
          failedTasks: 0,
          skippedTasks: tasks.filter(t => t.status === 'skipped').length,
          isRunning: true,
          tasks,
        };

        setSession(newSession);
        abortControllerRef.current = new AbortController();
        isAbortedRef.current = false;

        // 过滤出可执行的任务
        const executableTasks = tasks.filter(t => t.status === 'pending');
        console.log('[DataFetch] 可执行任务数:', executableTasks.length);

        // 收集已完成的任务（用于最后保存）
        const finishedTasks: FetchTask[] = [];

        // 串行执行（避免反爬）
        for (let i = 0; i < executableTasks.length; i++) {
          // 检查是否被中止
          if (isAbortedRef.current) {
            console.log('[DataFetch] 任务被中止');
            break;
          }

          const task = executableTasks[i];
          console.log(
            `[DataFetch] 执行任务 ${i + 1}/${executableTasks.length}:`,
            task.talentName
          );

          // 更新状态为 running
          setSession(prev => {
            if (!prev) return prev;
            const updatedTasks = prev.tasks.map(t =>
              t.collaborationId === task.collaborationId
                ? { ...t, status: 'running' as const }
                : t
            );
            return { ...prev, tasks: updatedTasks };
          });

          // 执行任务
          const completedTask = await executeTask(task);
          console.log('[DataFetch] 任务完成:', {
            talent: completedTask.talentName,
            status: completedTask.status,
            views: completedTask.fetchedViews,
            error: completedTask.error,
          });

          // 收集已完成的任务
          finishedTasks.push(completedTask);

          // 更新任务结果
          setSession(prev => {
            if (!prev) return prev;
            const updatedTasks = prev.tasks.map(t =>
              t.collaborationId === completedTask.collaborationId
                ? completedTask
                : t
            );
            const successCount = updatedTasks.filter(
              t => t.status === 'success'
            ).length;
            const failedCount = updatedTasks.filter(
              t => t.status === 'failed'
            ).length;

            return {
              ...prev,
              tasks: updatedTasks,
              completedTasks: successCount + failedCount,
              successTasks: successCount,
              failedTasks: failedCount,
            };
          });

          // 任务间隔
          if (
            i < executableTasks.length - 1 &&
            config.interval > 0 &&
            !isAbortedRef.current
          ) {
            await new Promise(resolve => setTimeout(resolve, config.interval));
          }
        }

        console.log('[DataFetch] 所有任务执行完毕');

        // 先保存结果到数据库
        console.log('[DataFetch] 准备保存结果，任务数:', finishedTasks.length);
        await saveResults(finishedTasks);

        // 完成抓取，更新 session 状态
        setSession(prev => {
          if (!prev) return prev;
          const finalSession: FetchSession = {
            ...prev,
            endTime: new Date().toISOString(),
            isRunning: false,
          };

          // 回调
          onFetchComplete?.(finalSession);

          return finalSession;
        });
      } catch (error) {
        console.error('[DataFetch] 抓取过程出错:', error);
        message.error(
          `抓取失败: ${error instanceof Error ? error.message : '未知错误'}`
        );

        // 出错时也要更新状态
        setSession(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            isRunning: false,
            endTime: new Date().toISOString(),
          };
        });
      }
    },
    [
      workflowRules,
      canFetch,
      getWorkflowForVideo,
      executeTask,
      saveResults,
      config.interval,
      onFetchComplete,
      message,
    ]
  );

  // 停止抓取
  const stopFetch = useCallback(() => {
    isAbortedRef.current = true;
    abortControllerRef.current?.abort();
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, isRunning: false, endTime: new Date().toISOString() };
    });
    message.info('抓取已停止');
  }, [message]);

  // 重试失败的任务
  const retryFailed = useCallback(async () => {
    if (!session) return;

    const failedTasks = session.tasks.filter(t => t.status === 'failed');
    if (failedTasks.length === 0) {
      message.info('没有失败的任务需要重试');
      return;
    }

    // 构造 MissingDataVideo 格式
    const videosToRetry: MissingDataVideo[] = failedTasks.map(t => ({
      collaborationId: t.collaborationId,
      talentId: '',
      talentName: t.talentName,
      publishDate: t.publishDate,
      videoId: t.videoId,
      taskId: t.taskId,
      // 财务字段（这里不需要，但类型要求）
      amount: 0,
      rebateRate: 0,
      pricingMode: 'framework' as const,
      quotationPrice: null,
      orderPrice: null,
      orderMode: 'adjusted' as const,
      talentPlatform: 'douyin',
    }));

    await startFetch(videosToRetry);
  }, [session, startFetch, message]);

  // 清空会话
  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  // 计算进度
  const progress = useMemo((): FetchProgress => {
    if (!session) {
      return {
        total: 0,
        completed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        percentage: 0,
      };
    }
    const {
      totalTasks,
      completedTasks,
      successTasks,
      failedTasks,
      skippedTasks,
    } = session;
    const executable = totalTasks - skippedTasks;
    const percentage =
      executable > 0 ? Math.round((completedTasks / executable) * 100) : 0;

    return {
      total: totalTasks,
      completed: completedTasks,
      success: successTasks,
      failed: failedTasks,
      skipped: skippedTasks,
      percentage,
    };
  }, [session]);

  return {
    session,
    isRunning: session?.isRunning ?? false,
    progress,
    workflowRules,
    workflowsLoading,
    startFetch,
    stopFetch,
    retryFailed,
    clearSession,
    getWorkflowForVideo,
    canFetch,
  };
}
