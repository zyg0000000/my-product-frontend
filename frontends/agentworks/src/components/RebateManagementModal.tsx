/**
 * 返点管理弹窗
 */

import { useState, useEffect } from 'react';
import { getTalentRebate, getRebateHistory as fetchRebateHistory, updateTalentRebate } from '../api/rebate';
import { getAgencies } from '../api/agency';
import type { Talent } from '../types/talent';
import type { Agency } from '../types/agency';
import type { GetRebateResponse, RebateConfig, EffectType, UpdateRebateRequest } from '../types/rebate';
import {
  REBATE_SOURCE_LABELS,
  formatRebateRate,
  EFFECT_TYPE_LABELS,
  validateRebateRate,
  REBATE_VALIDATION,
} from '../types/rebate';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';
import { RebateHistoryList } from './RebateHistoryList';
import {
  isWildTalent,
  getRebateTabs,
  getTabDisplayName,
  isPhaseTab,
  getBusinessAttribute,
  getRebateAttribute
} from '../utils/rebate';

interface RebateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent;
}

type TabType = 'current' | 'manual' | 'agencySync' | 'stepRule' | 'history';

export function RebateManagementModal({
  isOpen,
  onClose,
  talent,
}: RebateManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [rebateData, setRebateData] = useState<GetRebateResponse['data'] | null>(null);
  const [rebateHistory, setRebateHistory] = useState<RebateConfig[]>([]);
  const [rebateLoading, setRebateLoading] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // 手动调整Tab的状态
  const [manualRebateRate, setManualRebateRate] = useState<string>('');
  const [manualEffectType, setManualEffectType] = useState<EffectType>('immediate');
  const [manualCreatedBy, setManualCreatedBy] = useState<string>('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string>('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 3; // 每页显示 3 条记录

  useEffect(() => {
    if (isOpen) {
      loadRebateData();
      loadAgencies();
      // 初始化手动调整表单
      setManualError('');
    }
  }, [isOpen, talent.oneId, talent.platform]);

  // 当rebateData更新时，初始化手动调整的返点率
  useEffect(() => {
    if (rebateData?.currentRebate?.rate !== undefined) {
      setManualRebateRate(rebateData.currentRebate.rate.toString());
    }
  }, [rebateData]);

  const loadRebateData = async (page: number = 1) => {
    try {
      setRebateLoading(true);

      // 加载当前返点配置
      const rebateResponse = await getTalentRebate(talent.oneId, talent.platform);
      if (rebateResponse.success && rebateResponse.data) {
        setRebateData(rebateResponse.data);
      }

      // 加载返点历史记录（分页）
      const offset = (page - 1) * pageSize;
      const historyResponse = await fetchRebateHistory({
        oneId: talent.oneId,
        platform: talent.platform,
        limit: pageSize,
        offset,
      });
      if (historyResponse.success && historyResponse.data) {
        setRebateHistory(historyResponse.data.records);
        setTotalRecords(historyResponse.data.total);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('加载返点数据失败:', error);
    } finally {
      setRebateLoading(false);
    }
  };

  const loadAgencies = async () => {
    try {
      const response = await getAgencies({ status: 'active' });
      if (response.success && response.data) {
        setAgencies(response.data);
      }
    } catch (error) {
      console.error('加载机构列表失败:', error);
    }
  };

  const getAgencyName = (agencyId: string | null | undefined): string => {
    if (!agencyId || agencyId === AGENCY_INDIVIDUAL_ID) {
      return '野生达人';
    }
    const agency = agencies.find(a => a.id === agencyId);
    return agency?.name || agencyId;
  };

  // 分页处理
  const totalPages = Math.ceil(totalRecords / pageSize);
  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadRebateData(currentPage - 1);
    }
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadRebateData(currentPage + 1);
    }
  };

  // 手动调整返点的提交处理
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    // 验证返点率
    const rateNum = parseFloat(manualRebateRate);
    const validation = validateRebateRate(rateNum);
    if (!validation.valid) {
      setManualError(validation.error || '返点率格式错误');
      return;
    }

    try {
      setManualLoading(true);

      const request: UpdateRebateRequest = {
        oneId: talent.oneId,
        platform: talent.platform,
        rebateRate: rateNum,
        effectType: manualEffectType,
        createdBy: manualCreatedBy || undefined,
      };

      const response = await updateTalentRebate(request);

      if (response.success) {
        // 重新加载数据
        await loadRebateData(currentPage);
        // 显示成功提示（可以用更优雅的提示组件替代）
        alert('返点调整成功');
        // 重置表单
        setManualCreatedBy('');
        setManualEffectType('immediate');
      } else {
        setManualError(response.message || '更新失败');
      }
    } catch (err: any) {
      setManualError(err.message || '更新返点失败');
    } finally {
      setManualLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
        onClick={onClose}
      >
        <div
          className="relative top-10 mx-auto p-0 border-0 w-full max-w-4xl shadow-2xl rounded-xl bg-white overflow-hidden mb-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">
                  返点管理: <span className="text-green-100">{talent.name}</span>
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  {isWildTalent(talent) ? '野生达人' : '机构达人'} · 查看和调整达人的返点配置
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-green-100 text-3xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-5" aria-label="Tabs">
              {getRebateTabs(talent).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  disabled={isPhaseTab(tab)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab
                      ? 'border-green-600 text-green-600'
                      : isPhaseTab(tab)
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {getTabDisplayName(tab)}
                  {isPhaseTab(tab) && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                      Phase 2
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-5">
            {rebateLoading ? (
              <div className="py-12 text-center text-gray-500">加载中...</div>
            ) : rebateData ? (
              <div className="space-y-6">
                {/* Tab: 当前配置 */}
                {activeTab === 'current' && (
                  <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b">
                    <h4 className="text-base font-semibold text-gray-800">
                      当前返点配置
                    </h4>
                    {!isWildTalent(talent) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // TODO: 实现模式切换功能
                            console.log('切换返点模式');
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          切换模式
                        </button>
                        <button
                          onClick={() => {
                            // 机构达人切换到手动调整Tab
                            setActiveTab('manual');
                          }}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                          调整返点
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* 返点模式提示（仅机构达人） */}
                    {!isWildTalent(talent) && (
                      <div className={`border rounded-lg p-3 ${
                        (talent.rebateMode || 'sync') === 'sync'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}>
                        <p className={`text-sm font-medium ${
                          (talent.rebateMode || 'sync') === 'sync'
                            ? 'text-blue-800'
                            : 'text-amber-800'
                        }`}>
                          返点模式: {getRebateAttribute(talent)}
                        </p>
                        <p className={`text-xs mt-1 ${
                          (talent.rebateMode || 'sync') === 'sync'
                            ? 'text-blue-600'
                            : 'text-amber-600'
                        }`}>
                          {(talent.rebateMode || 'sync') === 'sync'
                            ? '返点率将自动跟随机构设置变化'
                            : '返点率独立设置，不受机构设置影响'}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">商业属性</p>
                        <p className="mt-1 text-base font-medium text-gray-900">
                          {getBusinessAttribute(talent, getAgencyName(rebateData.agencyId))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">当前返点率</p>
                        <p className="mt-1 text-base font-bold text-green-600">
                          {formatRebateRate(rebateData.currentRebate.rate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">返点来源</p>
                        <p className="mt-1 text-base font-medium text-gray-900">
                          {REBATE_SOURCE_LABELS[rebateData.currentRebate.source]}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">生效日期</p>
                        <p className="mt-1 text-base font-medium text-gray-900">
                          {rebateData.currentRebate.effectiveDate}
                        </p>
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                {/* Tab: 手动调整 */}
                {activeTab === 'manual' && (
                  <div className="border rounded-lg bg-white p-4 shadow-sm">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                      手动调整返点
                    </h4>

                    <form onSubmit={handleManualSubmit} className="space-y-5">
                      {/* 当前返点率展示 */}
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">当前返点率</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">
                              {rebateData?.currentRebate?.rate?.toFixed(2) || '0.00'}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">当前生效日期</p>
                            <p className="mt-1 text-base font-medium text-gray-700">
                              {rebateData?.currentRebate?.effectiveDate || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 新返点率输入 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          新返点率 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={manualRebateRate}
                            onChange={(e) => setManualRebateRate(e.target.value)}
                            min={REBATE_VALIDATION.min}
                            max={REBATE_VALIDATION.max}
                            step={REBATE_VALIDATION.step}
                            required
                            disabled={manualLoading}
                            className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="请输入返点率"
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          范围: {REBATE_VALIDATION.min}-{REBATE_VALIDATION.max}%，最多{REBATE_VALIDATION.precision}位小数
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
                              checked={manualEffectType === 'immediate'}
                              onChange={(e) => setManualEffectType(e.target.value as EffectType)}
                              disabled={manualLoading}
                              className="h-4 w-4 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
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
                              disabled
                              className="h-4 w-4 text-green-600"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {EFFECT_TYPE_LABELS.next_cooperation}
                                <span className="text-orange-600 text-xs ml-2">(暂不支持)</span>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          操作人
                          <span className="ml-1 text-xs text-gray-500">(选填)</span>
                        </label>
                        <input
                          type="text"
                          value={manualCreatedBy}
                          onChange={(e) => setManualCreatedBy(e.target.value)}
                          disabled={manualLoading}
                          className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="默认为 system"
                        />
                      </div>

                      {/* 错误提示 */}
                      {manualError && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                          {manualError}
                        </div>
                      )}

                      {/* 提交按钮 */}
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            // 重置表单
                            setManualRebateRate(rebateData?.currentRebate?.rate?.toString() || '0');
                            setManualEffectType('immediate');
                            setManualCreatedBy('');
                            setManualError('');
                          }}
                          disabled={manualLoading}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          重置
                        </button>
                        <button
                          type="submit"
                          disabled={manualLoading}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {manualLoading ? '提交中...' : '确认调整'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tab: 机构同步 */}
                {activeTab === 'agencySync' && (
                  <div className="border rounded-lg bg-white p-4 shadow-sm">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                      机构同步配置
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          当前为同步模式，返点率将自动跟随机构设置
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">同步机构</p>
                          <p className="mt-1 text-base font-medium text-gray-900">
                            {getAgencyName(talent.agencyId)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">机构返点率</p>
                          <p className="mt-1 text-base font-bold text-green-600">
                            {rebateData ? formatRebateRate(rebateData.currentRebate.rate) : '0%'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: 阶梯规则 (Phase 2) */}
                {activeTab === 'stepRule' && (
                  <div className="border rounded-lg bg-white p-4 shadow-sm">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                      阶梯规则配置
                    </h4>
                    <div className="py-8 text-center text-gray-400">
                      <p>阶梯规则功能将在 Phase 2 开放</p>
                    </div>
                  </div>
                )}

                {/* Tab: 调整历史 */}
                {activeTab === 'history' && (
                  <div className="border rounded-lg bg-white p-4 shadow-sm">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                      调整历史
                    </h4>

                  <RebateHistoryList
                    records={rebateHistory}
                    loading={rebateLoading}
                    showPagination={true}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                  />
                </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                暂无返点配置信息
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 py-3 bg-gray-50 border-t">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
