/**
 * 返点调整历史列表组件（共用）
 * 用于：达人详情页、返点管理弹窗
 */

import type { RebateConfig } from '../types/rebate';
import {
  REBATE_STATUS_LABELS,
  REBATE_STATUS_COLORS,
  EFFECT_TYPE_LABELS,
  formatRebateRate,
} from '../types/rebate';

interface RebateHistoryListProps {
  records: RebateConfig[];
  loading?: boolean;
  // 分页相关（可选）
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
}

export function RebateHistoryList({
  records,
  loading = false,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  onPrevPage,
  onNextPage,
}: RebateHistoryListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">加载中...</div>
    );
  }

  if (records.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">暂无调整记录</p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {records.map((record) => (
          <div
            key={record.configId}
            className="relative border-l-2 border-gray-200 pl-6 pb-4 last:pb-0"
          >
            {/* 时间线圆点 */}
            <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white" />

            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatRebateRate(record.rebateRate)}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${REBATE_STATUS_COLORS[record.status]}`}
                    >
                      {REBATE_STATUS_LABELS[record.status]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {EFFECT_TYPE_LABELS[record.effectType]}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">生效时间：</span>
                      {new Date(record.effectiveDate).toLocaleString('zh-CN')}
                      {record.expiryDate && (
                        <>
                          {' → '}
                          <span className="font-medium">失效时间：</span>
                          {new Date(record.expiryDate).toLocaleString('zh-CN')}
                        </>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">
                      操作人：{record.createdBy} · 创建时间：
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      {showPagination && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            共 {totalRecords} 条记录，第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              上一页
            </button>
            <button
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </>
  );
}
