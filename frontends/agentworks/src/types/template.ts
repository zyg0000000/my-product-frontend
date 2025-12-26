/**
 * 报告模板类型定义
 * @module types/template
 *
 * 用于管理飞书报告生成的模板配置
 * 包含：模板基础信息、飞书表格关联、映射规则配置
 */

/**
 * 映射规则：直接映射（字符串形式，如 "talents.nickname"）
 */
export type DirectMappingRule = string;

/**
 * 映射规则：公式计算
 */
export interface FormulaMappingRule {
  /** 公式表达式，如 "({talents.latestPrice} / {metrics.plays}) * 1000" */
  formula: string;
  /** 输出格式 */
  output: 'default' | 'percentage' | 'number(0)' | 'number(2)';
}

/**
 * 映射规则（联合类型）
 */
export type MappingRule = DirectMappingRule | FormulaMappingRule;

/**
 * 判断映射规则是否为公式类型
 */
export function isFormulaMappingRule(rule: MappingRule): rule is FormulaMappingRule {
  return typeof rule === 'object' && rule !== null && 'formula' in rule;
}

/**
 * 报告模板
 */
export interface ReportTemplate {
  /** 模板 ID */
  _id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 飞书表格 Token 或 URL */
  spreadsheetToken: string;
  /** 飞书表格表头列表 */
  feishuSheetHeaders: string[];
  /** 映射规则（表头名称 -> 数据路径或公式） */
  mappingRules: Record<string, MappingRule>;
  /** 限制可使用该模板的工作流 ID 列表（空数组表示不限制） */
  allowedWorkflowIds?: string[];
  /** 模板类型 */
  type: 'registration' | 'general';
  /** 是否激活 */
  isActive: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 模板列表项（简化版，用于列表展示）
 */
export interface ReportTemplateListItem {
  _id: string;
  name: string;
  description?: string;
  spreadsheetToken: string;
  type: 'registration' | 'general';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建模板请求
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  spreadsheetToken: string;
  feishuSheetHeaders: string[];
  mappingRules: Record<string, MappingRule>;
  allowedWorkflowIds?: string[];
  type?: 'registration' | 'general';
}

/**
 * 更新模板请求
 */
export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  _id: string;
}

/**
 * 数据源字段定义（用于映射配置下拉菜单）
 */
export interface MappingSchemaField {
  /** 字段路径，如 "xingtuId" 或 "screenshots.0.url" */
  path: string;
  /** 显示名称 */
  displayName: string;
}

/**
 * 数据源分组（用于映射配置下拉菜单）
 */
export interface MappingSchema {
  /** 分组显示名称，如 "抓取结果"、"达人信息" */
  displayName: string;
  /** 该分组下的字段列表 */
  fields: MappingSchemaField[];
}

/**
 * 所有数据源的映射配置
 * key 为集合名称，如 "registrationResults"、"talents"
 */
export type MappingSchemas = Record<string, MappingSchema>;

/**
 * API 响应类型
 */
export interface TemplateApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
