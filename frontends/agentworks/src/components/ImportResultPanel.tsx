/**
 * 数据导入结果展示面板（精简版）
 * 只展示统计信息和失败记录，成功记录在 Performance 页面查看
 */

import type { ImportResult } from '../api/performance';

interface ImportResultPanelProps {
  result: ImportResult;
  onClose: () => void;
}

export function ImportResultPanel({ result, onClose }: ImportResultPanelProps) {
  if (!result.data) return null;

  const stats = result.data.stats;
  const failedRecords = result.data.invalidRows || [];

  // 适配后端返回的字段名：modified/valid vs success
  const successCount = stats.modified || stats.valid || 0;
  const successRate =
    stats.total > 0 ? ((successCount / stats.total) * 100).toFixed(1) : '0';
  const hasFailures = stats.failed > 0;

  // 导出失败记录为 CSV
  const exportFailedRecords = () => {
    const csvContent = [
      ['行号', '达人标识', '达人名称', '失败原因'].join(','),
      ...failedRecords.map(record =>
        [
          record.rowNumber,
          record.identifier || '',
          record.talentName || '',
          `"${record.reason}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `导入失败记录_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className={`px-6 py-4 ${hasFailures ? 'bg-gradient-to-r from-orange-600 to-orange-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}
        >
          <h3 className="text-xl font-bold text-white">
            {hasFailures ? '⚠️ 导入完成（部分失败）' : '✅ 导入成功'}
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-base rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-content">
                {stats.total}
              </div>
              <div className="text-xs text-content-secondary mt-1">总计</div>
            </div>
            <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                {successCount}
              </div>
              <div className="text-xs text-content-secondary mt-1">
                成功 ({successRate}%)
              </div>
            </div>
            <div
              className={`rounded-lg p-4 text-center ${hasFailures ? 'bg-danger-50 dark:bg-danger-900/20' : 'bg-surface-base'}`}
            >
              <div
                className={`text-2xl font-bold ${hasFailures ? 'text-danger-600 dark:text-danger-400' : 'text-content-muted'}`}
              >
                {stats.failed}
              </div>
              <div className="text-xs text-content-secondary mt-1">失败</div>
            </div>
          </div>

          {/* 失败记录 */}
          {hasFailures && (
            <div className="border border-danger-200 dark:border-danger-700 rounded-lg bg-danger-50 dark:bg-danger-900/20 p-4">
              <h4 className="text-sm font-semibold text-danger-900 dark:text-danger-100 mb-3">
                ❌ 失败记录 ({failedRecords.length} 条)
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {failedRecords.map((record, idx) => {
                  const rowNum = record.index || record.rowNumber || idx + 1;
                  return (
                    <div key={idx} className="bg-surface rounded p-3 text-sm">
                      <div className="font-medium text-content">
                        行号 {rowNum}
                      </div>
                      <div className="text-danger-600 dark:text-danger-400 text-xs mt-1">
                        原因: {record.reason || '未知错误'}
                      </div>
                    </div>
                  );
                })}
              </div>
              {stats.failed > failedRecords.length && (
                <p className="text-xs text-danger-700 dark:text-danger-300 mt-2">
                  还有 {stats.failed - failedRecords.length}{' '}
                  条失败记录未显示，请导出完整列表查看
                </p>
              )}
            </div>
          )}

          {/* 成功提示 */}
          {!hasFailures && (
            <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700 rounded-lg p-4">
              <p className="text-success-900 dark:text-success-100 text-sm">
                🎉 所有数据导入成功！前往{' '}
                <a
                  href="/performance"
                  className="text-success-600 dark:text-success-400 underline font-medium"
                >
                  Performance 页面
                </a>{' '}
                查看更新后的数据
              </p>
            </div>
          )}

          {/* 下一步建议 */}
          {hasFailures && (
            <div className="alert-info">
              <h4 className="alert-info-title">💡 下一步建议</h4>
              <ul className="alert-info-text space-y-1">
                <li>
                  • 前往{' '}
                  <a href="/performance" className="underline font-medium">
                    Performance 页面
                  </a>{' '}
                  查看成功导入的 {successCount} 条数据
                </li>
                <li>• 检查失败记录，修复数据后可重新导入</li>
                <li>• 常见失败原因：达人不存在、必填字段缺失、字段格式错误</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-base px-6 py-4 flex justify-end gap-3 border-t">
          {hasFailures && (
            <button
              onClick={exportFailedRecords}
              className="px-4 py-2 text-sm font-medium text-content bg-surface border border-stroke-hover rounded-lg hover:bg-surface-base transition-colors"
            >
              📥 导出失败记录
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
