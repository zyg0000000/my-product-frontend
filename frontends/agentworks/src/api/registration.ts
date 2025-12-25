/**
 * 报名管理 API 服务层
 *
 * @description
 * - 云函数 API: registration-results CRUD
 * - ECS API: 任务执行（复用 automation.ts）
 * - 云函数 API: 表格生成（复用 sync-from-feishu）
 */

import { get, post, del } from './client';
import { executeTask } from './automation';
import type {
  RegistrationResult,
  RegistrationTalentItem,
  GeneratedSheet,
  WorkflowOption,
  ReportTemplateOption,
  GenerateSheetRequest,
  RegistrationApiResponse,
} from '../types/registration';

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
 */
export async function executeFetchTask(
  workflowId: string,
  xingtuId: string,
  metadata: {
    projectId: string;
    collaborationId: string;
    talentName: string;
    workflowName: string;
  }
) {
  return executeTask({
    workflowId,
    inputValue: xingtuId,
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
  talents: Array<{
    collaborationId: string;
    talentName: string;
    xingtuId: string;
  }>;
}

/**
 * 批量抓取回调
 */
export interface BatchFetchCallbacks {
  onProgress?: (current: number, total: number, talentName: string) => void;
  onSuccess?: (collaborationId: string, result: unknown) => void;
  onError?: (collaborationId: string, error: string) => void;
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
  const { projectId, workflowId, workflowName, talents } = request;
  const results: Array<{
    collaborationId: string;
    status: 'success' | 'failed';
    error?: string;
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < talents.length; i++) {
    const talent = talents[i];

    // 进度回调
    callbacks?.onProgress?.(i + 1, talents.length, talent.talentName);

    try {
      // 执行抓取
      const taskResult = await executeFetchTask(workflowId, talent.xingtuId, {
        projectId,
        collaborationId: talent.collaborationId,
        talentName: talent.talentName,
        workflowName,
      });

      if (taskResult.success) {
        // ECS executeActions 返回格式：
        // results: { status: 'completed', result: { screenshots: [], data: {} }, completedAt }
        const ecsResult = taskResult.results as unknown as {
          status: string;
          result?: {
            screenshots?: Array<{ name: string; url: string }>;
            data?: Record<string, unknown>;
          };
          errorMessage?: string;
        };

        if (ecsResult.status === 'completed' && ecsResult.result) {
          // 保存成功结果到数据库
          await saveRegistrationResult({
            collaborationId: talent.collaborationId,
            projectId,
            talentName: talent.talentName,
            xingtuId: talent.xingtuId,
            workflowId,
            workflowName,
            status: 'success',
            screenshots: ecsResult.result.screenshots || [],
            extractedData: ecsResult.result.data || {},
            fetchedAt: new Date().toISOString(),
          });

          successCount++;
          results.push({
            collaborationId: talent.collaborationId,
            status: 'success',
          });
          callbacks?.onSuccess?.(talent.collaborationId, taskResult);
        } else {
          // ECS 返回 status: 'failed'
          throw new Error(ecsResult.errorMessage || '工作流执行失败');
        }
      } else {
        throw new Error(taskResult.error || '抓取失败');
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
      callbacks?.onError?.(talent.collaborationId, errorMessage);
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
  return get('/report-templates', { type: 'registration' });
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
  return post('/sync-from-feishu', {
    action: 'generate-registration-sheet',
    ...request,
  });
}

/**
 * 获取项目的已生成表格列表
 *
 * @param projectId - 项目 ID
 */
export async function getGeneratedSheets(
  projectId: string
): Promise<RegistrationApiResponse<GeneratedSheet[]>> {
  return get('/generated-sheets', { projectId, type: 'registration' });
}

/**
 * 删除生成的表格记录
 *
 * @param sheetId - 表格记录 ID
 */
export async function deleteGeneratedSheet(
  sheetId: string
): Promise<RegistrationApiResponse<void>> {
  return del('/generated-sheets', undefined, { id: sheetId });
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

  // 工作流
  getRegistrationWorkflows,

  // 模板
  getReportTemplates,

  // 表格生成
  generateRegistrationSheet,
  getGeneratedSheets,
  deleteGeneratedSheet,
};
