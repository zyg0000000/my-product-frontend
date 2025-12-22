/**
 * 公司返点库 Hook
 * 处理导入、版本管理和对比逻辑
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import {
  importCompanyRebates,
  listCompanyRebateVersions,
  deleteCompanyRebateVersion,
  setDefaultCompanyRebateVersion,
  compareCompanyRebates,
} from '../../../../api/companyRebateLibrary';
import type { Platform } from '../../../../types/talent';
import type {
  ParsedExcelRecord,
  CompanyRebateVersion,
  ComparisonResult,
  ComparisonSummary,
} from '../types';

interface UseCompanyRebateResult {
  /** 版本列表 */
  versions: CompanyRebateVersion[];
  /** 当前选中的版本ID */
  selectedVersionId: string | null;
  /** 对比结果 */
  comparisons: ComparisonResult[];
  /** 对比摘要 */
  summary: ComparisonSummary | null;
  /** 加载状态 */
  loading: boolean;
  /** 导入中状态 */
  importing: boolean;
  /** 对比中状态 */
  comparing: boolean;
  /** 加载版本列表 */
  loadVersions: () => Promise<void>;
  /** 导入新版本 */
  importVersion: (
    records: ParsedExcelRecord[],
    fileName: string,
    note?: string
  ) => Promise<boolean>;
  /** 删除版本 */
  deleteVersion: (importId: string) => Promise<boolean>;
  /** 设置默认版本 */
  setDefaultVersion: (importId: string) => Promise<boolean>;
  /** 执行对比 */
  runComparison: (platform: Platform, importId?: string) => Promise<void>;
  /** 选择版本 */
  selectVersion: (importId: string | null) => void;
  /** 清除对比结果 */
  clearComparison: () => void;
}

/**
 * 公司返点库 Hook
 */
export function useCompanyRebate(): UseCompanyRebateResult {
  const [versions, setVersions] = useState<CompanyRebateVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [summary, setSummary] = useState<ComparisonSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [comparing, setComparing] = useState(false);

  // 加载版本列表
  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCompanyRebateVersions();
      if (response.success && response.data) {
        setVersions(response.data.versions);
        // 自动选中默认版本
        const defaultVersion = response.data.versions.find(v => v.isDefault);
        if (defaultVersion && !selectedVersionId) {
          setSelectedVersionId(defaultVersion.importId);
        }
      } else {
        message.error(response.message || '加载版本列表失败');
      }
    } catch (err) {
      console.error('Failed to load versions:', err);
      message.error('加载版本列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedVersionId]);

  // 导入新版本
  const importVersion = useCallback(
    async (
      records: ParsedExcelRecord[],
      fileName: string,
      note?: string
    ): Promise<boolean> => {
      setImporting(true);
      try {
        const response = await importCompanyRebates(records, fileName, note);
        if (response.success && response.data) {
          message.success(`成功导入 ${response.data.importedCount} 条记录`);
          // 重新加载版本列表
          await loadVersions();
          // 选中新导入的版本
          setSelectedVersionId(response.data.importId);
          return true;
        } else {
          message.error(response.message || '导入失败');
          return false;
        }
      } catch (err) {
        console.error('Failed to import:', err);
        message.error('导入失败');
        return false;
      } finally {
        setImporting(false);
      }
    },
    [loadVersions]
  );

  // 删除版本
  const deleteVersionHandler = useCallback(
    async (importId: string): Promise<boolean> => {
      try {
        const response = await deleteCompanyRebateVersion(importId);
        if (response.success) {
          message.success('删除成功');
          // 如果删除的是当前选中的版本，清除选择
          if (selectedVersionId === importId) {
            setSelectedVersionId(null);
            setComparisons([]);
            setSummary(null);
          }
          // 重新加载版本列表
          await loadVersions();
          return true;
        } else {
          message.error(response.message || '删除失败');
          return false;
        }
      } catch (err) {
        console.error('Failed to delete version:', err);
        message.error('删除失败');
        return false;
      }
    },
    [selectedVersionId, loadVersions]
  );

  // 设置默认版本
  const setDefaultVersionHandler = useCallback(
    async (importId: string): Promise<boolean> => {
      try {
        const response = await setDefaultCompanyRebateVersion(importId);
        if (response.success) {
          message.success('已设为默认版本');
          // 重新加载版本列表
          await loadVersions();
          return true;
        } else {
          message.error(response.message || '设置失败');
          return false;
        }
      } catch (err) {
        console.error('Failed to set default version:', err);
        message.error('设置失败');
        return false;
      }
    },
    [loadVersions]
  );

  // 执行对比
  const runComparison = useCallback(
    async (platform: Platform, importId?: string) => {
      const versionId = importId || selectedVersionId;
      if (!versionId) {
        message.warning('请先选择要对比的版本');
        return;
      }

      setComparing(true);
      try {
        const response = await compareCompanyRebates(platform, versionId);
        if (response.success && response.data) {
          setComparisons(response.data.comparisons);
          setSummary(response.data.summary);
        } else {
          message.error(response.message || '对比失败');
          setComparisons([]);
          setSummary(null);
        }
      } catch (err) {
        console.error('Failed to compare:', err);
        message.error('对比失败');
        setComparisons([]);
        setSummary(null);
      } finally {
        setComparing(false);
      }
    },
    [selectedVersionId]
  );

  // 选择版本
  const selectVersion = useCallback((importId: string | null) => {
    setSelectedVersionId(importId);
    // 清除之前的对比结果
    setComparisons([]);
    setSummary(null);
  }, []);

  // 清除对比结果
  const clearComparison = useCallback(() => {
    setComparisons([]);
    setSummary(null);
  }, []);

  return {
    versions,
    selectedVersionId,
    comparisons,
    summary,
    loading,
    importing,
    comparing,
    loadVersions,
    importVersion,
    deleteVersion: deleteVersionHandler,
    setDefaultVersion: setDefaultVersionHandler,
    runComparison,
    selectVersion,
    clearComparison,
  };
}
