/**
 * 报名管理 API 服务层
 *
 * @description
 * - 云函数 API: registration-results CRUD
 * - ECS API: 任务执行（复用 automation.ts）
 * - 云函数 API: 表格生成（复用 sync-from-feishu）
 */

import { get, post, del } from './client';
import {
  executeTask,
  subscribeToTaskProgress,
  resumeTask,
  type TaskProgress,
} from './automation';
import type {
  RegistrationResult,
  RegistrationTalentItem,
  GeneratedSheet,
  WorkflowOption,
  ReportTemplateOption,
  GenerateSheetRequest,
  RegistrationApiResponse,
} from '../types/registration';

// ========== SSE 任务等待 ==========

/** SSE 任务完成结果 */
interface TaskCompletionResult {
  status: 'completed' | 'failed' | 'paused';
  result?: unknown;
  error?: string;
  duration?: number;
  // 暂停状态时的额外信息
  vncUrl?: string;
  message?: string;
}

/** 暂停信息（用于回调） */
export interface PauseInfo {
  taskId: string;
  vncUrl: string;
  message: string;
}

/**
 * 通过 SSE 等待任务完成
 * @param taskId - 任务 ID
 * @param onStepProgress - 步骤进度回调
 * @param onPause - 暂停回调（验证码需要手动处理时）
 * @param timeout - 超时时间（毫秒），默认 5 分钟
 */
function waitForTaskCompletion(
  taskId: string,
  onStepProgress?: (stepInfo: StepProgressInfo) => void,
  onPause?: (pauseInfo: PauseInfo) => void,
  timeout = 5 * 60 * 1000
): Promise<TaskCompletionResult> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error('任务执行超时'));
    }, timeout);

    const unsubscribe = subscribeToTaskProgress(
      taskId,
      (
        progress: TaskProgress & {
          captcha?: boolean;
          captchaStatus?: string;
          captchaMessage?: string;
        }
      ) => {
        // 调试日志
        console.log('[SSE] 收到进度更新:', progress.status, progress);

        // 推送步骤进度（包含滑块验证信息）
        if (progress.status === 'running') {
          // 滑块验证状态
          if (progress.captcha) {
            onStepProgress?.({
              currentStep: progress.currentStep || 0,
              totalSteps: progress.totalSteps || 0,
              currentAction: progress.captchaMessage || '处理滑块验证...',
              captcha: progress.captcha,
              captchaStatus: progress.captchaStatus as
                | 'detecting'
                | 'success'
                | 'failed',
              captchaMessage: progress.captchaMessage,
            });
          } else if (
            progress.currentStep &&
            progress.totalSteps &&
            progress.currentAction
          ) {
            // 普通步骤进度
            onStepProgress?.({
              currentStep: progress.currentStep,
              totalSteps: progress.totalSteps,
              currentAction: progress.currentAction,
            });
          }
        }

        // 任务暂停（需要手动处理验证码）
        if (progress.status === 'paused') {
          // 通知上层显示 VNC 弹窗
          onPause?.({
            taskId,
            vncUrl: progress.vncUrl || 'http://14.103.18.8:6080/vnc.html',
            message: progress.message || '验证码需要手动处理',
          });
          // 注意：不关闭 SSE 连接，等待用户处理完成后继续接收进度
        }

        // 任务完成或失败
        if (progress.status === 'completed' || progress.status === 'failed') {
          console.log('[SSE] 任务最终状态:', progress.status);
          console.log('[SSE] 任务结果:', JSON.stringify(progress, null, 2));
          clearTimeout(timeoutId);
          unsubscribe();
          resolve({
            status: progress.status,
            result: progress.result,
            error: (progress as TaskProgress & { error?: string }).error,
          });
        }
      },
      // SSE 连接错误时 reject
      (error: Error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

// ========== 抓取结果 API ==========

/**
 * 获取项目的所有抓取结果
 * @param projectId - 项目 ID
 */
export async function getRegistrationResults(
  projectId: string
): Promise<RegistrationApiResponse<RegistrationResult[]>> {
  return get('/registration-results', { projectId });
}

/**
 * 获取单个达人的抓取结果
 * @param collaborationId - 达人合作 ID
 */
export async function getResultByCollaboration(
  collaborationId: string
): Promise<RegistrationApiResponse<RegistrationResult | null>> {
  return get('/registration-results', { collaborationId });
}

/**
 * 保存抓取结果（创建或更新）
 * @param result - 抓取结果数据
 */
export async function saveRegistrationResult(
  result: Omit<RegistrationResult, '_id' | 'createdAt' | 'updatedAt'>
): Promise<RegistrationApiResponse<RegistrationResult>> {
  return post('/registration-results', result);
}

/**
 * 删除抓取结果
 * @param collaborationId - 达人合作 ID
 */
export async function deleteRegistrationResult(
  collaborationId: string
): Promise<RegistrationApiResponse<void>> {
  return del('/registration-results', undefined, { collaborationId });
}

// ========== 达人列表 API（组合 collaborations + results） ==========

/**
 * 获取报名管理的达人列表
 * 合并 collaborations 和 registration-results 数据
 *
 * @param projectId - 项目 ID
 */
export async function getRegistrationTalents(
  projectId: string
): Promise<RegistrationApiResponse<RegistrationTalentItem[]>> {
  return get('/registration-results', { projectId, action: 'list-talents' });
}

// ========== 抓取执行 API（调用 ECS） ==========

/**
 * 执行单个达人的抓取任务
 * @param workflowId - 工作流 ID
 * @param xingtuId - 星图 ID
 * @param metadata - 元数据
 * @param enableVNC - 是否启用 VNC 远程桌面模式
 */
export async function executeFetchTask(
  workflowId: string,
  xingtuId: string,
  metadata: {
    projectId: string;
    collaborationId: string;
    talentName: string;
    workflowName: string;
  },
  enableVNC?: boolean
) {
  return executeTask({
    workflowId,
    inputValue: xingtuId,
    enableVNC,
    metadata: {
      source: 'registration',
      projectId: metadata.projectId,
      collaborationId: metadata.collaborationId,
    },
  });
}

/**
 * 批量抓取请求参数
 */
export interface BatchFetchRequest {
  projectId: string;
  workflowId: string;
  workflowName: string;
  /** 是否启用 VNC 远程桌面模式 */
  enableVNC?: boolean;
  talents: Array<{
    collaborationId: string;
    talentName: string;
    xingtuId: string;
  }>;
}

/** 步骤级进度信息 */
export interface StepProgressInfo {
  currentStep: number;
  totalSteps: number;
  currentAction: string;
  /** 滑块验证状态 */
  captcha?: boolean;
  captchaStatus?: 'detecting' | 'success' | 'failed';
  captchaMessage?: string;
}

/**
 * 批量抓取回调
 */
export interface BatchFetchCallbacks {
  /** 整体进度回调（第几个达人） */
  onProgress?: (current: number, total: number, talentName: string) => void;
  /** 步骤级进度回调（当前达人的执行步骤，SSE 推送） */
  onStepProgress?: (stepInfo: StepProgressInfo) => void;
  /** 单个任务成功回调（增加 duration 参数） */
  onSuccess?: (
    collaborationId: string,
    result: unknown,
    duration: number
  ) => void;
  /** 单个任务失败回调（增加 duration 参数） */
  onError?: (collaborationId: string, error: string, duration: number) => void;
  /** 任务暂停回调（验证码需要手动处理时） */
  onPause?: (pauseInfo: PauseInfo) => void;
}

/**
 * 批量执行抓取任务（串行执行，支持进度回调）
 *
 * @param request - 批量抓取请求
 * @param callbacks - 回调函数
 * @returns 执行结果汇总
 */
export async function executeBatchFetch(
  request: BatchFetchRequest,
  callbacks?: BatchFetchCallbacks
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{
    collaborationId: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}> {
  const { projectId, workflowId, workflowName, enableVNC, talents } = request;
  const results: Array<{
    collaborationId: string;
    status: 'success' | 'failed';
    error?: string;
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < talents.length; i++) {
    const talent = talents[i];
    const talentStartTime = Date.now(); // 记录单个达人开始时间

    // 进度回调
    callbacks?.onProgress?.(i + 1, talents.length, talent.talentName);

    try {
      // 1. 发起执行请求（异步模式，立即返回 taskId）
      const taskResult = await executeFetchTask(
        workflowId,
        talent.xingtuId,
        {
          projectId,
          collaborationId: talent.collaborationId,
          talentName: talent.talentName,
          workflowName,
        },
        enableVNC
      );

      if (!taskResult.success || !taskResult.taskId) {
        throw new Error(taskResult.error || '任务提交失败');
      }

      // 2. 通过 SSE 等待任务完成并获取结果
      const finalResult = await waitForTaskCompletion(
        taskResult.taskId,
        callbacks?.onStepProgress,
        callbacks?.onPause
      );

      // 3. 处理执行结果
      console.log(
        '[Registration] finalResult:',
        JSON.stringify(finalResult, null, 2)
      );
      console.log('[Registration] finalResult.status:', finalResult.status);
      console.log('[Registration] finalResult.result:', !!finalResult.result);
      if (finalResult.status === 'completed' && finalResult.result) {
        // ECS 返回的格式: { status, result: { screenshots, data }, ... }
        const ecsResult = finalResult.result as {
          status?: string;
          result?: {
            screenshots?: Array<{ name: string; url: string }>;
            data?: Record<string, unknown>;
          };
          // 兼容旧格式（直接返回 screenshots/data）
          screenshots?: Array<{ name: string; url: string }>;
          data?: Record<string, unknown>;
        };

        // 兼容两种格式
        const screenshots =
          ecsResult.result?.screenshots || ecsResult.screenshots || [];
        const extractedData = ecsResult.result?.data || ecsResult.data || {};

        console.log(
          '[Registration] ECS 返回结果:',
          JSON.stringify(ecsResult, null, 2)
        );
        console.log('[Registration] 解析后截图数量:', screenshots.length);
        console.log(
          '[Registration] 解析后数据字段:',
          Object.keys(extractedData)
        );

        // 保存成功结果到数据库
        await saveRegistrationResult({
          collaborationId: talent.collaborationId,
          projectId,
          talentName: talent.talentName,
          xingtuId: talent.xingtuId,
          workflowId,
          workflowName,
          status: 'success',
          screenshots,
          extractedData,
          fetchedAt: new Date().toISOString(),
        });

        successCount++;
        results.push({
          collaborationId: talent.collaborationId,
          status: 'success',
        });
        const duration = Date.now() - talentStartTime;
        callbacks?.onSuccess?.(talent.collaborationId, finalResult, duration);
      } else {
        throw new Error(finalResult.error || '工作流执行失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      // 保存失败结果
      await saveRegistrationResult({
        collaborationId: talent.collaborationId,
        projectId,
        talentName: talent.talentName,
        xingtuId: talent.xingtuId,
        workflowId,
        workflowName,
        status: 'failed',
        screenshots: [],
        extractedData: {},
        error: errorMessage,
        fetchedAt: new Date().toISOString(),
      });

      failedCount++;
      results.push({
        collaborationId: talent.collaborationId,
        status: 'failed',
        error: errorMessage,
      });
      const duration = Date.now() - talentStartTime;
      callbacks?.onError?.(talent.collaborationId, errorMessage, duration);
    }
  }

  return {
    total: talents.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

// ========== 工作流选项 API ==========

/**
 * 获取可用的报名抓取工作流
 */
export async function getRegistrationWorkflows(): Promise<
  RegistrationApiResponse<WorkflowOption[]>
> {
  // 从云函数获取工作流列表，筛选报名相关的
  return get('/automation-workflows', {
    category: 'registration',
    isActive: 'true',
  });
}

// ========== 报告模板 API ==========

/**
 * 获取可用的报告模板
 */
export async function getReportTemplates(): Promise<
  RegistrationApiResponse<ReportTemplateOption[]>
> {
  const response = await get<
    RegistrationApiResponse<
      Array<{ _id: string; name: string; description?: string }>
    >
  >('/report-templates', { type: 'registration' });

  // 转换 _id 为 id
  if (response.success && response.data) {
    return {
      ...response,
      data: response.data.map(t => ({
        id: t._id,
        name: t.name,
        description: t.description,
      })),
    };
  }

  // 失败时返回空数组
  return {
    success: false,
    data: [],
    message: response.message,
  };
}

// ========== 生成表格 API ==========

/**
 * 生成飞书报名表
 *
 * @param request - 生成请求参数
 */
export async function generateRegistrationSheet(
  request: GenerateSheetRequest
): Promise<RegistrationApiResponse<GeneratedSheet>> {
  // 注意：sync-from-feishu 云函数期望 dataType + payload 格式
  return post(
    '/sync-from-feishu',
    {
      dataType: 'generateRegistrationSheet',
      payload: {
        projectId: request.projectId,
        templateId: request.templateId,
        templateName: request.templateName,
        sheetName: request.sheetName,
        collaborationIds: request.collaborationIds,
        destinationFolderToken: request.destinationFolderToken,
      },
    },
    {
      // 生成表格是写操作，云函数需要30-40秒写多张图片
      // 延长超时时间到2分钟，并禁用重试防止重复创建
      timeout: 120000,
      skipRetry: true,
    }
  );
}

/**
 * 获取项目的已生成表格列表
 *
 * @param projectId - 项目 ID
 */
export async function getGeneratedSheets(
  projectId: string
): Promise<RegistrationApiResponse<GeneratedSheet[]>> {
  return get('/generated-sheets-manager', {
    projectId,
    type: 'registration',
    dbVersion: 'v2',
  });
}

/**
 * 删除生成的表格记录
 *
 * @param sheetId - 表格记录 ID
 */
export async function deleteGeneratedSheet(
  sheetId: string
): Promise<RegistrationApiResponse<void>> {
  return del('/generated-sheets-manager', undefined, {
    id: sheetId,
    dbVersion: 'v2',
  });
}

// ========== 导出 API 对象 ==========

export const registrationApi = {
  // 抓取结果
  getRegistrationResults,
  getResultByCollaboration,
  saveRegistrationResult,
  deleteRegistrationResult,

  // 达人列表
  getRegistrationTalents,

  // 抓取执行
  executeFetchTask,
  executeBatchFetch,
  resumeTask,

  // 工作流
  getRegistrationWorkflows,

  // 模板
  getReportTemplates,

  // 表格生成
  generateRegistrationSheet,
  getGeneratedSheets,
  deleteGeneratedSheet,
};
