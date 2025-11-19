/**
 * 数据导入管理 Hook
 * 处理飞书/Excel 数据导入流程
 */

import { useState } from 'react';
import { importPerformanceFromFeishu, type ImportRequest, type ImportResult } from '../api/performance';
import type { Platform } from '../types/talent';
import { useToast } from './useToast';

export function useDataImport(platform: Platform) {
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportResult['data'] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { success, error } = useToast();

  /**
   * 从飞书导入
   */
  const importFromFeishu = async (feishuUrl: string) => {
    try {
      setImporting(true);

      const request: ImportRequest = {
        feishuUrl,
        platform,
        dbVersion: 'v2',
        mappingConfigId: 'default'
      };

      const result = await importPerformanceFromFeishu(request);

      if (result.success && result.data) {
        setPreviewData(result.data);
        setShowPreview(true);
        success(`数据处理完成：成功 ${result.data.stats.modified} 条`);
        return result.data;
      } else {
        throw new Error(result.error || result.message || '导入失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '导入失败';
      error(errorMsg);
      throw err;
    } finally {
      setImporting(false);
    }
  };

  /**
   * 关闭预览
   */
  const closePreview = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  return {
    importing,
    previewData,
    showPreview,
    importFromFeishu,
    closePreview
  };
}
