/**
 * 报名管理模块类型定义
 * @module types/registration
 *
 * 核心概念：
 * - 一张达人表，两种操作（抓取 / 生成表格）
 * - 抓取结果与达人（collaboration）一对一绑定
 * - 同一达人可重复抓取（覆盖旧结果）
 */

/**
 * 抓取状态
 */
export type RegistrationFetchStatus =
  | 'pending' // 抓取中
  | 'success' // 成功
  | 'failed'; // 失败

/**
 * 截图信息
 */
export interface RegistrationScreenshot {
  /** 截图名称 */
  name: string;
  /** 截图 URL（TOS 存储） */
  url: string;
}

/**
 * 抓取结果（与 collaboration 一对一关联）
 */
export interface RegistrationResult {
  /** 结果 ID */
  _id: string;
  /** 关联的达人合作 ID（唯一约束） */
  collaborationId: string;
  /** 项目 ID */
  projectId: string;
  /** 达人昵称 */
  talentName: string;
  /** 星图 ID */
  xingtuId: string;
  /** 使用的工作流 ID */
  workflowId: string;
  /** 使用的工作流名称 */
  workflowName: string;
  /** 抓取状态 */
  status: RegistrationFetchStatus;
  /** 截图列表 */
  screenshots: RegistrationScreenshot[];
  /** 抓取的数据 */
  extractedData: Record<string, unknown>;
  /** 错误信息（失败时） */
  error?: string;
  /** 抓取时间 */
  fetchedAt: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 达人列表项（用于 ProTable 显示）
 * 合并 collaboration 基础信息 + 抓取结果状态
 */
export interface RegistrationTalentItem {
  /** 合作 ID */
  collaborationId: string;
  /** 达人昵称 */
  talentName: string;
  /** 平台 */
  platform: string;
  /** 星图 ID（可能为空） */
  xingtuId?: string;
  /** 抓取状态（null 表示未抓取） */
  fetchStatus: RegistrationFetchStatus | null;
  /** 抓取时间 */
  fetchedAt?: string;
  /** 是否有抓取结果 */
  hasResult: boolean;
  /** 关联的抓取结果（用于查看详情） */
  result?: RegistrationResult;
}

/**
 * 生成的飞书表格
 */
export interface GeneratedSheet {
  /** 记录 ID */
  _id: string;
  /** 项目 ID */
  projectId: string;
  /** 表格类型 */
  type: 'registration';
  /** 表格名称 */
  name: string;
  /** 飞书文档 URL */
  url: string;
  /** 使用的模板 ID */
  templateId?: string;
  /** 使用的模板名称 */
  templateName?: string;
  /** 包含的达人数量 */
  talentCount: number;
  /** 生成时间 */
  generatedAt: string;
  /** 生成人 */
  generatedBy?: string;
}

/**
 * 工作流选项（用于下拉选择）
 */
export interface WorkflowOption {
  /** 工作流 ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 描述 */
  description?: string;
}

/**
 * 报告模板选项（用于下拉选择）
 */
export interface ReportTemplateOption {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 描述 */
  description?: string;
}

/**
 * 抓取任务请求参数
 */
export interface FetchTaskRequest {
  /** 项目 ID */
  projectId: string;
  /** 工作流 ID */
  workflowId: string;
  /** 工作流名称 */
  workflowName: string;
  /** 达人列表 */
  talents: {
    collaborationId: string;
    talentName: string;
    xingtuId: string;
  }[];
}

/**
 * 抓取进度
 */
export interface FetchProgress {
  /** 总数 */
  total: number;
  /** 已完成数 */
  completed: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 当前处理的达人 */
  current?: string;
  /** 是否正在抓取 */
  isFetching: boolean;
}

/**
 * 生成表格请求参数
 */
export interface GenerateSheetRequest {
  /** 项目 ID */
  projectId: string;
  /** 模板 ID */
  templateId: string;
  /** 模板名称 */
  templateName: string;
  /** 表格名称 */
  sheetName: string;
  /** 达人合作 ID 列表（必须已有抓取结果） */
  collaborationIds: string[];
}

/**
 * API 响应类型
 */
export interface RegistrationApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
