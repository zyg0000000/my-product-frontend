/**
 * 数据导入弹窗
 * 支持飞书URL导入（简化版）
 */

import { useState } from 'react';
import type { Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform;
  onImport: (feishuUrl: string, priceYear: number, priceMonth: number) => Promise<void>;
  loading?: boolean;
}

export function DataImportModal({
  isOpen,
  onClose,
  platform,
  onImport,
  loading
}: DataImportModalProps) {
  const [feishuUrl, setFeishuUrl] = useState('');

  // 价格归属时间（默认当前年月）
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [priceYear, setPriceYear] = useState(currentYear);
  const [priceMonth, setPriceMonth] = useState(currentMonth);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feishuUrl.trim()) {
      alert('请输入飞书表格链接');
      return;
    }

    try {
      await onImport(feishuUrl, priceYear, priceMonth);
      setFeishuUrl('');
      setPriceYear(currentYear);
      setPriceMonth(currentMonth);
      onClose();
    } catch (err) {
      // 错误已由 Hook 处理
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            导入{PLATFORM_NAMES[platform]}表现数据
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            从飞书表格导入达人表现数据
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              飞书表格链接 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={feishuUrl}
              onChange={(e) => setFeishuUrl(e.target.value)}
              placeholder="粘贴飞书表格分享链接"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              提示：需要包含达人UID/星图ID列，以及表现数据列
            </p>
          </div>

          {/* 价格归属时间 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              价格归属时间 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">年份</label>
                <select
                  value={priceYear}
                  onChange={(e) => setPriceYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">月份</label>
                <select
                  value={priceMonth}
                  onChange={(e) => setPriceMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 表格中的价格将记录为 <strong className="text-blue-600">{priceYear}年{priceMonth}月</strong>，如果已存在该月价格将被覆盖
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '导入中...' : '开始导入'}
            </button>
          </div>
        </form>

        {/* 说明 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>导入说明：</strong>
            <br />
            1. 表格需要包含"达人UID"或"星图ID"列
            <br />
            2. 数据列名需要与字段映射配置一致
            <br />
            3. 导入后会自动更新达人的 performanceData 字段
          </p>
        </div>
      </div>
    </div>
  );
}
