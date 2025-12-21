/**
 * 返点对比看板类型定义
 */

// Platform type imported in API files

// ==================== 公司库版本 ====================

/** 公司库版本信息 */
export interface CompanyRebateVersion {
  importId: string;
  fileName: string;
  recordCount: number;
  importedAt: string;
  isDefault: boolean;
  note: string | null;
}

// ==================== 公司库记录 ====================

/** Excel 解析后的记录 */
export interface ParsedExcelRecord {
  xingtuId: string;
  nickname: string;
  mcn: string;
  rebateRate: number;
  rawRemark: string | null;
}

/** 公司库对比记录 */
export interface CompanyRecord {
  mcn: string;
  rebateRate: number;
  isSameAgency: boolean;
}

// ==================== 对比结果 ====================

/** 差异类型 */
export type DiffType = 'companyHigher' | 'awHigher' | 'equal' | 'noMatch';

/** 单个达人的对比结果 */
export interface ComparisonResult {
  talentId: string;
  talentName: string;
  xingtuId: string;
  awAgencyId: string;
  awAgencyName: string | null;
  awRebate: number;
  rebateMode: 'sync' | 'independent';
  companyRecords: CompanyRecord[];
  maxCompanyRebate: number | null;
  sameAgencyRebate: number | null;
  canSync: boolean;
  syncRebate: number | null;
  diffType: DiffType;
}

/** 对比统计摘要 */
export interface ComparisonSummary {
  total: number;
  matched: number;
  unmatched: number;
  canSync: number;
  referenceOnly: number;
  companyHigher: number;
  awHigher: number;
  equal: number;
}

// ==================== API 响应 ====================

/** 导入响应 */
export interface ImportResponse {
  success: boolean;
  data?: {
    importId: string;
    importedCount: number;
    importedAt: string;
    isDefault: boolean;
  };
  message?: string;
}

/** 版本列表响应 */
export interface ListVersionsResponse {
  success: boolean;
  data?: {
    versions: CompanyRebateVersion[];
  };
  message?: string;
}

/** 删除版本响应 */
export interface DeleteVersionResponse {
  success: boolean;
  data?: {
    deletedCount: number;
    importId: string;
  };
  message?: string;
}

/** 设置默认版本响应 */
export interface SetDefaultVersionResponse {
  success: boolean;
  data?: {
    importId: string;
    isDefault: boolean;
  };
  message?: string;
}

/** 对比响应 */
export interface CompareResponse {
  success: boolean;
  data?: {
    importId: string;
    comparisons: ComparisonResult[];
    summary: ComparisonSummary;
  };
  message?: string;
}

// ==================== 筛选条件 ====================

/** 筛选条件 */
export interface ComparisonFilter {
  /** 差异类型 */
  diffType: DiffType | 'all';
  /** 同步状态 */
  syncStatus: 'all' | 'canSync' | 'referenceOnly';
  /** 搜索关键词 */
  search: string;
}

// ==================== 表格选中状态 ====================

/** 选中的同步项 */
export interface SelectedSyncItem {
  talentId: string;
  talentName: string;
  rebateRate: number;
}
