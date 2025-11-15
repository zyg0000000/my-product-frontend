/**
 * 价格管理弹窗
 */

import { useState, useEffect } from 'react';
import type { Talent, PriceRecord, PriceType, PriceStatus } from '../types/talent';
import { PLATFORM_PRICE_TYPES } from '../types/talent';
import { formatPrice, getPriceHistory, formatYearMonth } from '../utils/formatters';

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent | null;
  onSave: (talentId: string, prices: PriceRecord[]) => Promise<void>;
}

export function PriceModal({ isOpen, onClose, talent, onSave }: PriceModalProps) {
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | ''>(''); // 历史价格筛选年份
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(''); // 历史价格筛选月份
  const [newPrice, setNewPrice] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    type: '' as PriceType,
    price: 0, // 以万元为单位
    status: 'confirmed' as PriceStatus,
  });

  // 当前年月
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 重置表单
  useEffect(() => {
    if (isOpen && talent) {
      setNewPrice({
        year: currentYear,
        month: currentMonth,
        type: '' as PriceType,
        price: 0,
        status: 'confirmed',
      });
      setSelectedYear('');
      setSelectedMonth('');
    }
  }, [isOpen, talent, currentYear, currentMonth]);

  if (!isOpen || !talent) return null;

  const priceTypes = PLATFORM_PRICE_TYPES[talent.platform] || [];

  // 获取价格历史
  const priceHistory = getPriceHistory(talent.prices);

  // 筛选后的历史价格
  const filteredHistory = priceHistory.filter((h) => {
    if (selectedYear && h.year !== selectedYear) return false;
    if (selectedMonth && h.month !== selectedMonth) return false;
    return true;
  });

  // 处理新增/更新价格
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrice.type || newPrice.price <= 0) {
      alert('请填写完整的价格信息');
      return;
    }

    try {
      setSaving(true);

      // 查找是否已存在该类型的价格
      const existingIndex = talent.prices.findIndex(
        (p) =>
          p.year === newPrice.year &&
          p.month === newPrice.month &&
          p.type === newPrice.type
      );

      let updatedPrices = [...talent.prices];

      if (existingIndex !== -1) {
        // 更新现有价格
        updatedPrices[existingIndex] = {
          ...newPrice,
          price: Math.round(newPrice.price * 10000 * 100), // 万元转换为分
        };
      } else {
        // 新增价格
        updatedPrices.push({
          ...newPrice,
          price: Math.round(newPrice.price * 10000 * 100), // 万元转换为分
        });
      }

      await onSave(talent.oneId, updatedPrices);

      // 重置表单
      setNewPrice({
        year: currentYear,
        month: currentMonth,
        type: '' as PriceType,
        price: 0,
        status: 'confirmed',
      });
    } catch (error) {
      console.error('保存价格失败:', error);
      alert('保存价格失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-10 mx-auto p-0 border-0 w-full max-w-4xl shadow-2xl rounded-xl bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">
                价格管理: <span className="text-purple-100">{talent.name}</span>
              </h3>
              <p className="text-purple-100 text-sm mt-1">
                管理{priceTypes.length}档价格类型和趋势分析
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-100 text-3xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 上部：左右两栏布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 左侧：历史价格记录 */}
            <div className="flex flex-col border rounded-md bg-gray-50 p-4 shadow-sm" style={{ height: '350px' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">历史价格记录</h4>
                <div className="flex gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                    className="text-xs rounded-md border-gray-300 shadow-sm px-2 py-1"
                  >
                    <option value="">全部年份</option>
                    {Array.from(new Set(priceHistory.map(h => h.year))).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
                    className="text-xs rounded-md border-gray-300 shadow-sm px-2 py-1"
                  >
                    <option value="">全部月份</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">暂无价格记录</p>
                ) : (
                  filteredHistory.map((history, index) => (
                    <div key={index} className="bg-white rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatYearMonth(history.year, history.month)}
                        </span>
                        {history.isLatest && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            当前
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {priceTypes.map((pt) => {
                          const price = history.prices[pt.key];
                          return (
                            <div key={pt.key} className="flex items-center gap-2 text-xs">
                              <span
                                className="inline-flex items-center justify-center rounded-md px-2 py-0.5 font-semibold w-16"
                                style={{
                                  backgroundColor: pt.bgColor,
                                  color: pt.textColor,
                                }}
                              >
                                {pt.label}
                              </span>
                              <span className={price ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                {price ? formatPrice(price) : 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 右侧：新增/更新价格 */}
            <div className="flex flex-col border rounded-md bg-white p-4 shadow-sm" style={{ height: '350px' }}>
              <h4 className="font-semibold text-gray-800 text-sm mb-3">
                新增/更新价格
              </h4>
              <form onSubmit={handleSubmit} className="space-y-3 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      年份
                    </label>
                    <select
                      value={newPrice.year}
                      onChange={(e) =>
                        setNewPrice({ ...newPrice, year: parseInt(e.target.value) })
                      }
                      className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      月份
                    </label>
                    <select
                      value={newPrice.month}
                      onChange={(e) =>
                        setNewPrice({ ...newPrice, month: parseInt(e.target.value) })
                      }
                      className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m}月
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    视频类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPrice.type}
                    onChange={(e) =>
                      setNewPrice({ ...newPrice, type: e.target.value as PriceType })
                    }
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="">请选择类型</option>
                    {priceTypes.map((pt) => (
                      <option key={pt.key} value={pt.key}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    金额（万元） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newPrice.price || ''}
                    onChange={(e) =>
                      setNewPrice({ ...newPrice, price: parseFloat(e.target.value) || 0 })
                    }
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="例如: 5 表示5万元"
                    min="0"
                    step="0.01"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">请输入万元为单位的金额，例如：5 = 5万元</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={newPrice.status}
                    onChange={(e) =>
                      setNewPrice({ ...newPrice, status: e.target.value as PriceStatus })
                    }
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="confirmed">已确认</option>
                    <option value="provisional">暂定价</option>
                  </select>
                </div>
                <div className="text-right pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存价格'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
