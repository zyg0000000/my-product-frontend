/**
 * 调整返点弹窗组件
 */

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { updateTalentRebate } from '../api/rebate';
import type { Platform } from '../types/talent';
import type { EffectType, UpdateRebateRequest } from '../types/rebate';
import {
  EFFECT_TYPE_LABELS,
  validateRebateRate,
  REBATE_VALIDATION,
} from '../types/rebate';

interface UpdateRebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  oneId: string;
  platform: Platform;
  currentRate: number;
}

export function UpdateRebateModal({
  isOpen,
  onClose,
  onSuccess,
  oneId,
  platform,
  currentRate,
}: UpdateRebateModalProps) {
  const [rebateRate, setRebateRate] = useState<string>('');
  const [effectType, setEffectType] = useState<EffectType>('immediate');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // 初始化表单
      setRebateRate(currentRate.toString());
      setEffectType('immediate');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setCreatedBy('');
      setError('');
    }
  }, [isOpen, currentRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证返点率
    const rateNum = parseFloat(rebateRate);
    const validation = validateRebateRate(rateNum);
    if (!validation.valid) {
      setError(validation.error || '返点率格式错误');
      return;
    }

    // 验证生效日期（下次合作生效时必填）
    if (effectType === 'next_cooperation' && !effectiveDate) {
      setError('下次合作生效时必须指定生效日期');
      return;
    }

    try {
      setLoading(true);

      const request: UpdateRebateRequest = {
        oneId,
        platform,
        rebateRate: rateNum,
        effectType,
        effectiveDate: effectiveDate || undefined,
        createdBy: createdBy || undefined,
      };

      const response = await updateTalentRebate(request);

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.message || '更新失败');
      }
    } catch (err: any) {
      setError(err.message || '更新返点失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">调整返点</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* 当前返点率 */}
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">当前返点率</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {currentRate.toFixed(2)}%
              </p>
            </div>

            {/* 新返点率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                新返点率 <span className="text-red-500">*</span>
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
                  placeholder="请输入返点率"
                />
                <span className="text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                范围: {REBATE_VALIDATION.min}-{REBATE_VALIDATION.max}，最多{REBATE_VALIDATION.precision}位小数
              </p>
            </div>

            {/* 生效方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                生效方式 <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <input
                    type="radio"
                    name="effectType"
                    value="immediate"
                    checked={effectType === 'immediate'}
                    onChange={(e) => setEffectType(e.target.value as EffectType)}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {EFFECT_TYPE_LABELS.immediate}
                    </p>
                    <p className="text-xs text-gray-500">
                      更新后立即生效，下次合作使用新返点率
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 opacity-60 cursor-not-allowed">
                  <input
                    type="radio"
                    name="effectType"
                    value="next_cooperation"
                    checked={effectType === 'next_cooperation'}
                    onChange={(e) => setEffectType(e.target.value as EffectType)}
                    disabled
                    className="h-4 w-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {EFFECT_TYPE_LABELS.next_cooperation} <span className="text-orange-600 text-xs">(暂不支持)</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      创建待生效配置，等待下次合作时激活
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 生效日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                生效日期
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled
                className="input mt-1 bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                立即生效，默认为当天
              </p>
            </div>

            {/* 操作人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                操作人
              </label>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="input mt-1"
                placeholder="默认为 system"
              />
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
              disabled={loading}
            >
              {loading ? '提交中...' : '确认调整'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
