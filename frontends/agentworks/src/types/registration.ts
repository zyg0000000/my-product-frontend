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
 * 抓取状态（当前项目）
 */
export type RegistrationFetchStatus =
  | 'pending' // 抓取中
  | 'success' // 成功
  | 'failed'; // 失败

/**
 * 达人抓取状态类型（综合跨项目历史）
 * - fetched: 当前项目已有抓取结果
 * - reusable: 其他项目有可复用的记录（未过期）
 * - expired: 其他项目有记录但已过期（>30天）
 * - none: 全局无抓取记录
 */
export type TalentFetchStatusType = 'fetched' | 'reusable' | 'expired' | 'none';

/**
 * 跨项目历史抓取记录
 */
export interface HistoryRecord {
  /** 来源项目 ID */
  projectId: string;
  /** 来源项目名称 */
  projectName: string;
  /** 来源合作 ID */
  collaborationId: string;
  /** 抓取时间 */
  fetchedAt: string;
  /** 距离当前合作创建时间的天数 */
  daysDiff: number;
  /** 是否已过期（>30天） */
  isExpired: boolean;
  /** 完整的抓取结果 */
  result: RegistrationResult;
}

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
 * 合并 collaboration 基础信息 + 抓取结果状态 + 跨项目历史
 */
export interface RegistrationTalentItem {
  /** 合作 ID */
  collaborationId: string;
  /** 合作创建时间（用于计算历史记录是否过期） */
  collaborationCreatedAt?: string;
  /** 达人昵称 */
  talentName: string;
  /** 平台 */
  platform: string;
  /** 星图 ID（可能为空） */
  xingtuId?: string;
  /** 当前项目的抓取状态（null 表示未抓取） */
  fetchStatus: RegistrationFetchStatus | null;
  /** 抓取时间 */
  fetchedAt?: string;
  /** 是否有抓取结果（当前项目） */
  hasResult: boolean;
  /** 关联的抓取结果（用于查看详情） */
  result?: RegistrationResult;

  // ===== 跨项目复用相关字段 =====
  /** 综合抓取状态类型 */
  fetchStatusType?: TalentFetchStatusType;
  /** 其他项目的历史抓取记录列表（按距离排序） */
  historyRecords?: HistoryRecord[];
  /** 系统推荐的复用记录（未过期且距离最近） */
  recommendedRecord?: HistoryRecord | null;

  // ===== 已生成表格关联 =====
  /** 该达人已在哪些表格中（当前项目） */
  generatedSheets?: GeneratedSheetRef[];
}

/**
 * 已生成表格的简要引用（用于达人列表展示）
 */
export interface GeneratedSheetRef {
  /** 表格记录 ID */
  sheetId: string;
  /** 表格文件名 */
  fileName: string;
  /** 飞书文档 URL */
  sheetUrl: string;
  /** 生成时间 */
  createdAt: string;
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
  /** 表格名称（兼容 fileName） */
  fileName: string;
  /** 飞书文档 URL（兼容 sheetUrl） */
  sheetUrl: string;
  /** 飞书文件 Token */
  sheetToken?: string;
  /** 使用的模板 ID */
  templateId?: string;
  /** 使用的模板名称 */
  templateName?: string;
  /** 包含的达人数量 */
  talentCount: number;
  /** 生成时间（兼容 createdAt） */
  createdAt: string;
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
  /** 是否启用 VNC 远程桌面模式 */
  enableVNC?: boolean;
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
 * 步骤级进度信息（SSE 推送）
 */
export interface StepProgressInfo {
  /** 当前步骤 */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 当前动作描述 */
  currentAction: string;
  /** 是否遇到滑块验证 */
  captcha?: boolean;
  /** 滑块验证状态 */
  captchaStatus?: 'detecting' | 'success' | 'failed';
  /** 滑块验证消息 */
  captchaMessage?: string;
}

/**
 * 单个达人的抓取结果（用于进度面板实时展示）
 */
export interface TalentFetchResult {
  /** 达人合作 ID */
  collaborationId: string;
  /** 达人名称 */
  talentName: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'success' | 'failed';
  /** 耗时（毫秒） */
  duration?: number;
  /** 错误信息 */
  error?: string;
  /** 开始执行时间戳 */
  startTime?: number;
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
  /** 步骤级进度（SSE 实时推送） */
  stepInfo?: StepProgressInfo;
  /** 批量抓取开始时间 */
  startTime?: number;
  /** 每个达人的执行结果列表 */
  talentResults?: TalentFetchResult[];
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
  /** 目标文件夹 Token（可选，留空则保存在模板所在文件夹） */
  destinationFolderToken?: string;
}

/**
 * 追加数据到已有表格请求参数
 */
export interface AppendToSheetRequest {
  /** generated_sheets 记录 ID */
  sheetId: string;
  /** 飞书表格 Token */
  sheetToken: string;
  /** 报告模板 ID */
  templateId: string;
  /** 项目 ID */
  projectId: string;
  /** 要追加的合作 ID 列表 */
  collaborationIds: string[];
}

/**
 * 追加数据响应
 */
export interface AppendToSheetResponse {
  /** 追加的达人数量 */
  appendedCount: number;
  /** 跳过的达人数量（已在表格中） */
  skippedCount?: number;
  /** 追加后的总达人数量 */
  totalCount: number;
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
