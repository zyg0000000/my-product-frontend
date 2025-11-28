/**
 * 调整返点弹窗组件 v2.0
 *
 * v2.0 更新：
 * - 支持机构达人的返点模式切换（sync/independent）
 * - 支持同步机构返点按钮
 * - 手动调整仅在 independent 模式下可用
 * - 野生达人固定使用 independent 模式，不显示模式切换
 */

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { updateTalentRebate, syncAgencyRebateToTalent } from '../api/rebate';
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
  rebateMode: 'sync' | 'independent';
  agencyId: string;
  agencyName: string;
}

export function UpdateRebateModal({
  isOpen,
  onClose,
  onSuccess,
  oneId,
  platform,
  currentRate,
  rebateMode: initialRebateMode,
  agencyId,
  agencyName,
}: UpdateRebateModalProps) {
  const isAgencyTalent = agencyId !== 'individual';

  // 返点模式状态
  const [rebateMode, setRebateMode] = useState<'sync' | 'independent'>(
    initialRebateMode
  );

  // 手动调整表单状态
  const [rebateRate, setRebateRate] = useState<string>('');
  const [effectType, setEffectType] = useState<EffectType>('immediate');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // 初始化表单
      setRebateRate(currentRate.toString());
      setRebateMode(initialRebateMode);
      setEffectType('immediate');
      setCreatedBy('');
      setError('');
    }
  }, [isOpen, currentRate, initialRebateMode]);

  // 切换返点模式
  const handleToggleMode = () => {
    setRebateMode(prev => (prev === 'sync' ? 'independent' : 'sync'));
    setError('');
  };

  // 同步机构返点
  const handleSyncFromAgency = async () => {
    try {
      setSyncLoading(true);
      setError('');

      const response = await syncAgencyRebateToTalent({
        oneId,
        platform,
        changeMode: rebateMode !== 'sync', // 如果当前不是sync模式，同步时切换到sync
        createdBy: createdBy || undefined,
      });

      if (response.success) {
        // 如果切换了模式，更新本地状态
        if (rebateMode !== 'sync') {
          setRebateMode('sync');
        }
        onSuccess();
        onClose();
      } else {
        setError(response.message || '同步失败');
      }
    } catch (err: any) {
      setError(err.message || '同步机构返点失败');
    } finally {
      setSyncLoading(false);
    }
  };

  // 手动调整返点
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

    try {
      setLoading(true);

      const request: UpdateRebateRequest = {
        oneId,
        platform,
        rebateRate: rateNum,
        effectType,
        createdBy: createdBy || undefined,
      };

      const response = await updateTalentRebate(request);

      if (response.success) {
        // 手动调整后，如果原来是sync模式，自动切换到independent
        if (rebateMode === 'sync') {
          setRebateMode('independent');
        }
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

  const modeLabel = rebateMode === 'sync' ? '绑定机构返点' : '独立设置返点';
  const canManualAdjust = rebateMode === 'independent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">返点管理</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 当前返点率 */}
          <div className="rounded-lg bg-gradient-to-r from-primary-50 to-primary-100 p-5 border border-primary-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">归属机构</p>
                <p className="text-base font-semibold text-gray-900">
                  {agencyName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">当前返点率</p>
                <p className="text-2xl font-bold text-primary-700">
                  {currentRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* 机构达人：返点模式切换 */}
          {isAgencyTalent && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    返点模式
                  </h3>
                  <p className="text-xs text-gray-600">
                    {rebateMode === 'sync'
                      ? `当前绑定机构"${agencyName}"的返点配置，机构调整时自动同步`
                      : '当前使用独立设置，不跟随机构返点变化'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={rebateMode === 'sync'}
                    onChange={handleToggleMode}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {modeLabel}
                  </span>
                </label>
              </div>

              {/* 同步按钮 */}
              {rebateMode === 'sync' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSyncFromAgency}
                    disabled={syncLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowPathIcon
                      className={`h-5 w-5 ${syncLoading ? 'animate-spin' : ''}`}
                    />
                    {syncLoading
                      ? '同步中...'
                      : `从机构"${agencyName}"同步返点`}
                  </button>
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    点击后将使用机构在该平台的当前返点配置
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 提示信息：绑定模式下不可手动调整 */}
          {isAgencyTalent && rebateMode === 'sync' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  绑定机构返点模式
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  当前返点绑定机构配置，如需手动调整，请切换到"独立设置返点"模式
                </p>
              </div>
            </div>
          )}

          {/* 手动调整表单 */}
          {canManualAdjust && (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 border rounded-lg p-5 bg-white"
            >
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b">
                手动调整返点
              </h3>

              {/* 新返点率 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  新返点率 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    value={rebateRate}
                    onChange={e => setRebateRate(e.target.value)}
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
                  范围: {REBATE_VALIDATION.min}-{REBATE_VALIDATION.max}，最多
                  {REBATE_VALIDATION.precision}位小数
                </p>
              </div>

              {/* 生效方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生效方式 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="effectType"
                      value="immediate"
                      checked={effectType === 'immediate'}
                      onChange={e =>
                        setEffectType(e.target.value as EffectType)
                      }
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
                      onChange={e =>
                        setEffectType(e.target.value as EffectType)
                      }
                      disabled
                      className="h-4 w-4 text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {EFFECT_TYPE_LABELS.next_cooperation}{' '}
                        <span className="text-orange-600 text-xs">
                          (暂不支持)
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        创建待生效配置，等待下次合作时激活
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 操作人 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  操作人
                </label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={e => setCreatedBy(e.target.value)}
                  className="input mt-1"
                  placeholder="默认为 system"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* 按钮组 */}
              <div className="flex justify-end gap-3 pt-2">
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
          )}

          {/* 错误提示（全局） */}
          {error && !canManualAdjust && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* 底部按钮（绑定模式下） */}
        {!canManualAdjust && (
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
            <button onClick={onClose} className="btn btn-secondary">
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
