/**
 * 机构返点管理弹窗
 * 用于设置和管理机构的默认返点率
 */

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { InformationCircleIcon } from '@heroicons/react/20/solid';
import type { Agency } from '../types/agency';
import { updateAgencyRebate } from '../api/agency';
import { REBATE_VALIDATION } from '../types/rebate';

interface AgencyRebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSuccess?: () => void;
}

export function AgencyRebateModal({
  isOpen,
  onClose,
  agency,
  onSuccess,
}: AgencyRebateModalProps) {
  const [rebateRate, setRebateRate] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [updatedBy, setUpdatedBy] = useState<string>('');
  const [syncImmediately, setSyncImmediately] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && agency) {
      // 初始化表单数据
      const currentRate = agency.rebateConfig?.baseRebate || 0;
      setRebateRate(currentRate.toString());

      // 默认生效日期为今天
      const today = new Date().toISOString().split('T')[0];
      setEffectiveDate(agency.rebateConfig?.effectiveDate || today);

      setUpdatedBy('');
      setSyncImmediately(false);
      setError('');
    }
  }, [isOpen, agency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;

    // 验证返点率
    const rateNum = parseFloat(rebateRate);
    if (isNaN(rateNum) || rateNum < REBATE_VALIDATION.min || rateNum > REBATE_VALIDATION.max) {
      setError(`返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`);
      return;
    }

    // 验证小数位数
    const decimalPlaces = rebateRate.includes('.') ? rebateRate.split('.')[1].length : 0;
    if (decimalPlaces > REBATE_VALIDATION.precision) {
      setError(`返点率最多 ${REBATE_VALIDATION.precision} 位小数`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await updateAgencyRebate({
        agencyId: agency._id,
        rebateConfig: {
          baseRebate: rateNum,
          effectiveDate,
          updatedBy: updatedBy || 'system',
        },
        syncToTalents: syncImmediately,
      });

      if (response.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(response.message || '更新失败');
      }
    } catch (err: any) {
      setError(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !agency) return null;

  const currentRate = agency.rebateConfig?.baseRebate || 0;
  const hasChanged = parseFloat(rebateRate) !== currentRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">机构返点管理</h2>
            <p className="mt-1 text-sm text-gray-500">{agency.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* 当前配置展示 */}
            {agency.rebateConfig && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">当前机构返点配置</p>
                    <div className="mt-2 space-y-1 text-sm text-blue-700">
                      <p>基础返点率: <span className="font-bold">{currentRate.toFixed(2)}%</span></p>
                      {agency.rebateConfig.effectiveDate && (
                        <p>生效日期: {agency.rebateConfig.effectiveDate}</p>
                      )}
                      {agency.rebateConfig.lastUpdatedAt && (
                        <p>最后更新: {new Date(agency.rebateConfig.lastUpdatedAt).toLocaleDateString('zh-CN')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 基础返点率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                基础返点率 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={rebateRate}
                  onChange={(e) => setRebateRate(e.target.value)}
                  min={REBATE_VALIDATION.min}
                  max={REBATE_VALIDATION.max}
                  step={REBATE_VALIDATION.step}
                  required
                  className="input flex-1"
                  placeholder={`请输入返点率 (${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max})`}
                />
                <span className="text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                该返点率将作为机构下所有同步模式达人的默认返点
              </p>
            </div>

            {/* 生效日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                生效日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="input mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">
                设置返点率的生效开始日期
              </p>
            </div>

            {/* 操作人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                操作人
              </label>
              <input
                type="text"
                value={updatedBy}
                onChange={(e) => setUpdatedBy(e.target.value)}
                className="input mt-1"
                placeholder="请输入操作人姓名（默认为 system）"
              />
            </div>

            {/* 同步选项 */}
            <div className="rounded-lg border border-gray-200 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={syncImmediately}
                  onChange={(e) => setSyncImmediately(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-primary-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">立即同步到达人</p>
                  <p className="mt-1 text-sm text-gray-500">
                    勾选后将立即更新所有同步模式达人的返点率。
                    如不勾选，需要后续手动触发同步或等待达人下次合作时自动同步。
                  </p>
                  {syncImmediately && hasChanged && (
                    <div className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-700">
                      <strong>注意：</strong>此操作将影响该机构下所有同步模式的达人
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* 按钮组 */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !hasChanged}
            >
              {loading ? '保存中...' : '保存设置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}