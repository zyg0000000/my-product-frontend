/**
 * 数据迁移 API
 * ByteProject (kol_data) → AgentWorks (agentworks_db)
 */

import { post } from './client';

// ========== 类型定义 ==========

/** 源项目信息 */
export interface SourceProject {
  id: string;
  name: string;
  status: string;
  financialYear: string;
  financialMonth: string;
  discount: string;
  budget: string;
  collaborationCount: number;
  worksCount: number;
  migrationStatus: 'pending' | 'partial' | 'completed';
  migratedProjectId: string | null;
  /** 目标项目ID（部分迁移或已迁移时存在） */
  targetProjectId?: string;
  /** 是否已迁移合作记录（部分迁移时判断） */
  hasCollaborations?: boolean;
  /** 是否已迁移效果数据（部分迁移时判断） */
  hasEffects?: boolean;
}

/** 达人匹配结果 */
export interface TalentMatch {
  sourceTalentId: string;
  targetOneId: string;
  nickname: string;
  xingtuId: string;
}

/** 未匹配达人 */
export interface UnmatchedTalent {
  talentId: string;
  nickname: string;
  xingtuId: string | null;
  reason: string;
}

/** 达人校验结果 */
export interface TalentValidationResult {
  success: boolean;
  projectId: string;
  totalTalents: number;
  matched: TalentMatch[];
  unmatched: UnmatchedTalent[];
  canProceed: boolean;
}

/** 折扣对比结果 */
export interface DiscountComparison {
  sourceDiscount: number | null;
  customerDiscount: number | null;
  usedDiscount: number;
  hasDiscrepancy: boolean;
}

/** 项目迁移结果 */
export interface ProjectMigrationResult {
  success: boolean;
  newProjectId?: string;
  sourceProjectId?: string;
  projectName?: string;
  discountComparison?: DiscountComparison;
  message?: string;
  existingProjectId?: string;
}

/** 合作记录迁移结果 */
export interface CollaborationMigrationResult {
  success: boolean;
  count: number;
  mappings: Record<string, string>;
  message?: string;
  unmatched?: UnmatchedTalent[];
}

/** 效果数据迁移结果 */
export interface EffectMigrationResult {
  success: boolean;
  totalWorks: number;
  updatedCount: number;
  skippedCount?: number;
  message?: string;
}

/** 日报数据迁移结果 */
export interface DailyStatsMigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  totalWorks: number;
  trackingStatus: 'active' | 'archived' | 'disabled';
  targetProjectId: string | null;
  message?: string;
}

/** 迁移验证结果 */
export interface MigrationValidationResult {
  success: boolean;
  sourceProjectId: string;
  newProjectId: string;
  comparison: {
    collaborations: {
      source: number;
      target: number;
      match: boolean;
    };
    totalAmount: {
      source: number;
      target: number;
      match: boolean;
    };
    effects: {
      sourceWorks: number;
      targetWithEffects: number;
    };
    dailyStats?: {
      sourceWorksWithStats: number;
      targetWithStats: number;
      sourceStatsEntries: number;
      targetStatsEntries: number;
      match: boolean;
    };
  };
  allMatch: boolean;
}

/** 回滚结果 */
export interface RollbackResult {
  success: boolean;
  deletedProject: number;
  deletedCollaborations: number;
}

// ========== API 响应类型 ==========

interface ListSourceProjectsResponse {
  success: boolean;
  count: number;
  data: SourceProject[];
}

// ========== API 函数 ==========

const ENDPOINT = '/dataMigration';

/**
 * 获取源项目列表
 */
export async function listSourceProjects(): Promise<SourceProject[]> {
  const response = await post<ListSourceProjectsResponse>(ENDPOINT, {
    operation: 'listSourceProjects',
  });
  return response.data || [];
}

/**
 * 校验达人
 */
export async function validateTalents(
  projectId: string
): Promise<TalentValidationResult> {
  return post<TalentValidationResult>(ENDPOINT, {
    operation: 'validateTalents',
    projectId,
  });
}

/**
 * 迁移项目基础信息
 */
export async function migrateProject(
  sourceProjectId: string,
  customerId: string = 'CUS20250001'
): Promise<ProjectMigrationResult> {
  return post<ProjectMigrationResult>(ENDPOINT, {
    operation: 'migrateProject',
    sourceProjectId,
    customerId,
  });
}

/**
 * 迁移合作记录
 */
export async function migrateCollaborations(
  sourceProjectId: string,
  newProjectId: string,
  talentMappings?: Record<string, string>
): Promise<CollaborationMigrationResult> {
  return post<CollaborationMigrationResult>(ENDPOINT, {
    operation: 'migrateCollaborations',
    sourceProjectId,
    newProjectId,
    talentMappings,
  });
}

/**
 * 迁移效果数据
 */
export async function migrateEffects(
  sourceProjectId: string,
  collaborationMappings?: Record<string, string>
): Promise<EffectMigrationResult> {
  return post<EffectMigrationResult>(ENDPOINT, {
    operation: 'migrateEffects',
    sourceProjectId,
    collaborationMappings,
  });
}

/**
 * 迁移日报数据
 */
export async function migrateDailyStats(
  sourceProjectId: string,
  collaborationMappings?: Record<string, string>,
  trackingStatus: 'active' | 'archived' | 'disabled' = 'archived'
): Promise<DailyStatsMigrationResult> {
  return post<DailyStatsMigrationResult>(ENDPOINT, {
    operation: 'migrateDailyStats',
    sourceProjectId,
    collaborationMappings,
    trackingStatus,
  });
}

/**
 * 验证迁移结果
 */
export async function validateMigration(
  sourceProjectId: string,
  newProjectId: string
): Promise<MigrationValidationResult> {
  return post<MigrationValidationResult>(ENDPOINT, {
    operation: 'validateMigration',
    sourceProjectId,
    newProjectId,
  });
}

/**
 * 回滚迁移
 */
export async function rollbackMigration(
  newProjectId: string
): Promise<RollbackResult> {
  return post<RollbackResult>(ENDPOINT, {
    operation: 'rollbackMigration',
    newProjectId,
  });
}
