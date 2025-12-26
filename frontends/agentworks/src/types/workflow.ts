/**
 * 工作流类型定义
 *
 * @version 1.0.0
 * @description 自动化工作流相关类型，适配 AgentWorks 多平台架构
 */

import type { Platform } from './talent';

// ==================== 工作流输入配置 ====================

/**
 * 工作流输入参数来源
 * @description 指定从哪个数据对象中获取输入参数
 */
export type WorkflowInputSource =
  | 'talent' // 从达人数据获取（platformSpecific 或顶层字段）
  | 'collaboration' // 从合作记录获取（如 taskId、videoId）
  | 'custom'; // 用户手动输入

/**
 * 工作流输入配置
 * @description 定义工作流所需的输入参数及其来源
 */
export interface WorkflowInputConfig {
  /** 参数键名（如 xingtuId、taskId） */
  key: string;
  /** 显示标签（如 "星图ID"、"任务ID"） */
  label: string;
  /** 输入提示文本 */
  placeholder?: string;
  /** 关联平台（可选，用于验证） */
  platform?: Platform;
  /** 数据来源 */
  idSource: WorkflowInputSource;
  /** 对应的字段路径（如 platformSpecific.xingtuId、taskId） */
  idField?: string;
  /** 是否必填 */
  required?: boolean;
}

// ==================== 工作流步骤 ====================

/**
 * 工作流动作类型
 */
export type WorkflowActionType =
  | 'Go to URL' // 导航到 URL
  | 'waitForSelector' // 等待元素出现
  | 'click' // 点击元素
  | 'screenshot' // 截图
  | 'wait' // 等待指定时间
  | 'scrollPage' // 滚动页面
  | 'waitForNetworkIdle' // 等待网络空闲
  | 'extractData' // 提取单个数据
  | 'compositeExtract' // 复合数据提取
  | 'type' // 输入文本
  | 'select' // 选择下拉选项
  | 'evaluate'; // 执行自定义脚本

/**
 * 工作流步骤
 * @description 扁平结构，与 ECS 执行器数据格式一致
 */
export interface WorkflowStep {
  /** 步骤ID（用于排序和引用） */
  id: string;
  /** 动作类型 */
  action: WorkflowActionType;
  /** 步骤描述（可选） */
  description?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 失败时是否继续 */
  continueOnError?: boolean;

  // ========== 动作特定参数（扁平结构） ==========
  /** Go to URL: 目标 URL */
  url?: string;
  /** 通用: CSS 选择器 */
  selector?: string;
  /** wait: 等待时间（毫秒） */
  milliseconds?: number;
  /** screenshot: 保存文件名 */
  saveAs?: string;
  /** screenshot: 是否长截图模式 */
  stitched?: boolean;
  /** extractData/compositeExtract: 数据名称 */
  dataName?: string;
  /** compositeExtract: 组合模板 */
  template?: string;
  /** compositeExtract: 数据源列表 */
  sources?: Array<{ name: string; selector: string }>;
  /** type: 输入文本 */
  text?: string;
  /** select: 选项值 */
  value?: string;
  /** evaluate: JavaScript 脚本 */
  script?: string;
}

// ==================== 工作流定义 ====================

/**
 * 工作流类型
 */
export type WorkflowType =
  | 'screenshot' // 截图类
  | 'data_scraping' // 数据抓取类
  | 'composite'; // 组合任务

/**
 * 工作流定义
 * @description 完整的工作流配置，适配多平台架构
 */
export interface Workflow {
  /** MongoDB 文档 ID */
  _id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流类型 */
  type?: WorkflowType;

  // ========== 多平台支持 ==========
  /** 适用平台 */
  platform: Platform;

  // ========== 输入配置 ==========
  /** 输入参数配置（新版，配置驱动） */
  inputConfig: WorkflowInputConfig;

  /** @deprecated 旧版输入类型，保留用于向后兼容 */
  requiredInput?: 'xingtuId' | 'taskId' | 'videoId' | 'url';
  /** @deprecated 旧版输入标签 */
  inputLabel?: string;

  // ========== 步骤定义 ==========
  /** 工作流步骤 */
  steps: WorkflowStep[];

  // ========== 状态管理 ==========
  /** 是否激活 */
  isActive: boolean;

  // ========== 执行配置 ==========
  /** 是否启用远程桌面模式（VNC），便于处理验证码 */
  enableVNC?: boolean;

  // ========== 元数据 ==========
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version?: number;
}

/**
 * 工作流列表项（用于列表展示）
 */
export interface WorkflowListItem {
  _id: string;
  name: string;
  description?: string;
  type?: WorkflowType;
  platform: Platform;
  inputConfig: WorkflowInputConfig;
  stepsCount: number;
  isActive: boolean;
  enableVNC?: boolean;
  updatedAt: string;
}

// ==================== 工作流 CRUD ====================

/**
 * 创建工作流请求
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  type?: WorkflowType;
  platform: Platform;
  inputConfig: WorkflowInputConfig;
  steps: WorkflowStep[];
  isActive?: boolean;
  enableVNC?: boolean;
}

/**
 * 更新工作流请求
 */
export interface UpdateWorkflowRequest {
  _id: string;
  name?: string;
  description?: string;
  type?: WorkflowType;
  platform?: Platform;
  inputConfig?: WorkflowInputConfig;
  steps?: WorkflowStep[];
  isActive?: boolean;
  enableVNC?: boolean;
}

// ==================== API 响应 ====================

/**
 * 工作流列表响应
 */
export interface WorkflowsResponse {
  success: boolean;
  data?: Workflow[];
  count?: number;
  message?: string;
}

/**
 * 单个工作流响应
 */
export interface WorkflowResponse {
  success: boolean;
  data?: Workflow;
  message?: string;
}

/**
 * 工作流操作响应
 */
export interface WorkflowOperationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ==================== 输入类型配置（配置驱动） ====================

/**
 * 预定义的输入类型配置
 * @description 根据平台动态扩展，避免硬编码
 */
export const WORKFLOW_INPUT_CONFIGS: Record<string, WorkflowInputConfig> = {
  // 抖音平台
  xingtuId: {
    key: 'xingtuId',
    label: '星图ID',
    placeholder: '请输入星图达人ID',
    platform: 'douyin',
    idSource: 'talent',
    idField: 'platformAccountId', // 直接使用 platformAccountId，避免冗余字段
    required: true,
  },
  douyinTaskId: {
    key: 'taskId',
    label: '星图任务ID',
    placeholder: '请输入星图任务ID',
    platform: 'douyin',
    idSource: 'collaboration',
    idField: 'taskId',
    required: true,
  },
  douyinVideoId: {
    key: 'videoId',
    label: '抖音视频ID',
    placeholder: '请输入抖音视频ID',
    platform: 'douyin',
    idSource: 'collaboration',
    idField: 'videoId',
    required: true,
  },

  // 小红书平台（预留）
  dandelionId: {
    key: 'dandelionId',
    label: '蒲公英ID',
    placeholder: '请输入蒲公英达人ID',
    platform: 'xiaohongshu',
    idSource: 'talent',
    idField: 'platformSpecific.dandelionId',
    required: true,
  },

  // 通用
  customUrl: {
    key: 'url',
    label: 'URL',
    placeholder: '请输入完整URL地址',
    idSource: 'custom',
    required: true,
  },
};

/**
 * 根据平台获取可用的输入类型配置
 * @param platform - 平台标识
 * @returns 该平台可用的输入类型配置列表
 */
export function getInputConfigsByPlatform(
  platform: Platform
): WorkflowInputConfig[] {
  return Object.values(WORKFLOW_INPUT_CONFIGS).filter(
    config => !config.platform || config.platform === platform
  );
}
