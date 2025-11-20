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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { success, error } = useToast();

  /**
   * 从飞书导入
   */
  const importFromFeishu = async (feishuUrl: string, priceYear: number, priceMonth: number) => {
    try {
      setImporting(true);

      const request: ImportRequest = {
        feishuUrl,
        platform,
        dbVersion: 'v2',
        mappingConfigId: 'default',
        priceYear,
        priceMonth
      };

      const result = await importPerformanceFromFeishu(request);

      if (result.success && result.data) {
        // 保存完整的导入结果
        setImportResult(result);
        setShowResult(true);

        // Toast 提示
        const failedCount = result.data.stats?.failed || 0;
        const successCount = result.data.stats?.modified || result.data.stats?.valid || 0;

        if (failedCount > 0) {
          error(`导入完成：成功 ${successCount} 条，失败 ${failedCount} 条`);
        } else {
          success(`导入成功：${successCount} 条数据已更新`);
        }

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
   * 关闭结果面板
   */
  const closeResult = () => {
    setShowResult(false);
    setImportResult(null);
  };

  return {
    importing,
    importResult,
    showResult,
    importFromFeishu,
    closeResult
  };
}
