/**
 * 数据导入管理 Hook
 * @version 1.1.0 - 支持快照日期
 *
 * v1.1.0 更新日志 (2025-11-29):
 * - [快照日期] importFromFeishu 新增 snapshotDate 参数
 *   - 用于导入历史表现数据
 *   - 价格数据使用 priceYear + priceMonth（月度粒度）
 *   - 表现数据使用 snapshotDate（日度粒度）
 *
 * v1.0.0:
 * - 处理飞书/Excel 数据导入流程
 * - 支持导入结果展示和关闭
 */

import { useState } from 'react';
import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  importPerformanceFromFeishu,
  type ImportRequest,
  type ImportResult,
} from '../api/performance';
import type { Platform } from '../types/talent';

/**
 * 数据导入 Hook
 * @param platform - 平台
 * @param messageInstance - 可选的 message 实例，如果不传则使用 App.useApp() 获取
 */
export function useDataImport(platform: Platform, messageInstance?: MessageInstance) {
  const appMessage = App.useApp().message;
  const message = messageInstance || appMessage;

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  /**
   * 从飞书导入达人表现数据
   *
   * @param feishuUrl - 飞书表格分享链接
   * @param priceYear - 价格归属年份（月度粒度）
   * @param priceMonth - 价格归属月份（月度粒度）
   * @param snapshotDate - 快照日期（日度粒度，YYYY-MM-DD 格式，用于历史数据导入）
   */
  const importFromFeishu = async (
    feishuUrl: string,
    priceYear: number,
    priceMonth: number,
    snapshotDate?: string
  ) => {
    try {
      setImporting(true);

      const request: ImportRequest = {
        feishuUrl,
        platform,
        dbVersion: 'v2',
        mappingConfigId: 'default',
        priceYear,
        priceMonth,
        snapshotDate, // v1.1: 快照日期（用于历史数据导入）
      };

      const result = await importPerformanceFromFeishu(request);

      if (result.success && result.data) {
        // 保存完整的导入结果
        setImportResult(result);
        setShowResult(true);

        // Toast 提示
        const failedCount = result.data.stats?.failed || 0;
        const successCount =
          result.data.stats?.modified || result.data.stats?.valid || 0;

        if (failedCount > 0) {
          message.error(`导入完成：成功 ${successCount} 条，失败 ${failedCount} 条`);
        } else {
          message.success(`导入成功：${successCount} 条数据已更新`);
        }

        return result.data;
      } else {
        throw new Error(result.error || result.message || '导入失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '导入失败';
      message.error(errorMsg);
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
    closeResult,
  };
}
