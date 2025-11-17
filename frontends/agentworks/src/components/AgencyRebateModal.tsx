/**
 * 机构返点管理弹窗 v3.0
 * 参考达人返点管理弹窗的设计，采用Tab切换式布局
 *
 * v3.0 变更：
 * - 添加平台选择功能
 * - 从 rebate_configs 集合读取当前配置
 * - 支持按平台管理返点
 */

import { useState, useEffect } from 'react';
import { InformationCircleIcon } from '@heroicons/react/20/solid';
import type { Agency } from '../types/agency';
import type { Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import {
  updateAgencyRebate,
  getAgencyRebateHistory,
  getCurrentAgencyRebate,
  type AgencyRebateHistoryRecord,
  type CurrentAgencyRebateConfig
} from '../api/agency';
import { REBATE_VALIDATION, formatRebateRate } from '../types/rebate';

interface AgencyRebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSuccess?: () => void;
}

type TabType = 'current' | 'manual' | 'stepRule' | 'history';

// 支持的平台列表
const SUPPORTED_PLATFORMS: Platform[] = ['douyin', 'kuaishou', 'xiaohongshu', 'bilibili'];

export function AgencyRebateModal({
  isOpen,
  onClose,
  agency,
  onSuccess,
}: AgencyRebateModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin'); // 默认抖音

  // 当前平台的配置（从 rebate_configs 读取）
  const [currentConfig, setCurrentConfig] = useState<CurrentAgencyRebateConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // 手动调整Tab的状态
  const [rebateRate, setRebateRate] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [updatedBy, setUpdatedBy] = useState<string>('');
  const [syncImmediately, setSyncImmediately] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 历史记录Tab的状态
  const [historyRecords, setHistoryRecords] = useState<AgencyRebateHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 5; // 每页显示5条记录

  // 加载当前平台的配置
  const loadCurrentConfig = async (platform: Platform) => {
    if (!agency) return;

    try {
      setConfigLoading(true);
      const response = await getCurrentAgencyRebate({
        agencyId: agency.id,
        platform
      });

      if (response.success && response.data) {
        setCurrentConfig(response.data);
        // 初始化表单数据
        setRebateRate(response.data.rebateRate.toString());
        setEffectiveDate(response.data.effectiveDate || new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('加载当前配置失败:', error);
      // 使用默认值
      setCurrentConfig(null);
      setRebateRate('0');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
    } finally {
      setConfigLoading(false);
    }
  };

  // 加载历史记录
  const loadHistory = async (page: number) => {
    if (!agency) return;

    try {
      setHistoryLoading(true);
      const offset = (page - 1) * pageSize;
      const response = await getAgencyRebateHistory({
        agencyId: agency.id,
        platform: selectedPlatform,
        limit: pageSize,
        offset
      });

      if (response.success && response.data) {
        setHistoryRecords(response.data.records);
        setTotalRecords(response.data.total);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 当弹窗打开时，重置状态并加载数据
  useEffect(() => {
    if (isOpen && agency) {
      loadCurrentConfig(selectedPlatform);
      loadHistory(1);
      setUpdatedBy('');
      setSyncImmediately(false);
      setError('');
      setActiveTab('current'); // 弹窗打开时重置到当前配置Tab
    }
  }, [isOpen, agency]);

  // 当平台切换时，只重新加载数据，不切换tab
  useEffect(() => {
    if (isOpen && agency) {
      loadCurrentConfig(selectedPlatform);
      loadHistory(1);
    }
  }, [selectedPlatform]);

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

      const requestData = {
        agencyId: agency.id,
        platform: selectedPlatform,  // ← 新增平台参数
        rebateConfig: {
          baseRebate: rateNum,
          effectiveDate,
          updatedBy: updatedBy || 'system',
        },
        syncToTalents: syncImmediately,
      };

      const response = await updateAgencyRebate(requestData);

      if (response.success) {
        // 重新加载当前配置和历史记录
        await loadCurrentConfig(selectedPlatform);
        await loadHistory(1);
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

  const currentRate = currentConfig?.rebateRate || 0;
  const hasChanged = parseFloat(rebateRate) !== currentRate;

  const tabs: { key: TabType; label: string; disabled?: boolean; badge?: string }[] = [
    { key: 'current', label: '当前配置' },
    { key: 'manual', label: '手动调整' },
    { key: 'stepRule', label: '阶梯规则', disabled: true, badge: 'Phase 2' },
    { key: 'history', label: '调整历史' },
  ];

  // 分页处理
  const totalPages = Math.ceil(totalRecords / pageSize);
  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadHistory(currentPage - 1);
    }
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadHistory(currentPage + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-10 mx-auto p-0 border-0 w-full max-w-4xl shadow-2xl rounded-xl bg-white overflow-hidden mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              机构返点管理 - {agency.name}
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 平台选择器 */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-blue-100 mb-1.5">
              选择平台
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
              className="w-48 px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            >
              {SUPPORTED_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {PLATFORM_NAMES[platform]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Tabs */}
          <div className="flex space-x-1 border-b mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => !tab.disabled && setActiveTab(tab.key)}
                disabled={tab.disabled}
                className={`
                  px-4 py-2.5 text-sm font-medium transition-all relative
                  ${
                    activeTab === tab.key
                      ? 'text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-800'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {/* Tab: 当前配置 */}
            {activeTab === 'current' && (
              <div className="border rounded-lg bg-white p-4 shadow-sm">
                <h4 className="text-base font-semibold text-gray-800 mb-4">
                  {PLATFORM_NAMES[selectedPlatform]}平台当前配置
                </h4>

                {configLoading ? (
                  <div className="py-12 text-center text-gray-500">加载中...</div>
                ) : currentConfig && currentConfig.hasConfig ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">基础返点率</p>
                        <p className="mt-1 text-base font-bold text-green-600">
                          {formatRebateRate(currentRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">生效日期</p>
                        <p className="mt-1 text-base font-medium text-gray-900">
                          {currentConfig.effectiveDate || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">最后更新</p>
                        <p className="mt-1 text-base font-medium text-gray-900">
                          {currentConfig.lastUpdatedAt
                            ? new Date(currentConfig.lastUpdatedAt).toLocaleString('zh-CN')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">更新人</p>
                        <p className="mt-1 text-base font-medium text-gray-900">
                          {currentConfig.updatedBy || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">提示</p>
                        <p className="mt-1 text-blue-700">
                          此配置仅针对{PLATFORM_NAMES[selectedPlatform]}平台生效。如需调整其他平台，请切换平台选择器。
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 mb-3">
                      {PLATFORM_NAMES[selectedPlatform]}平台暂未配置返点
                    </p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      立即配置
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: 手动调整 */}
            {activeTab === 'manual' && (
              <div className="border rounded-lg bg-white p-4 shadow-sm">
                <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                  手动调整{PLATFORM_NAMES[selectedPlatform]}平台返点
                </h4>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 当前返点率展示 */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">当前返点率</p>
                        <p className="mt-1 text-base font-bold text-gray-900">
                          {currentRate.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">当前生效日期</p>
                        <p className="mt-1 text-base font-medium text-gray-700">
                          {currentConfig?.effectiveDate || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 表单输入 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      新返点率 (%)
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={REBATE_VALIDATION.min}
                      max={REBATE_VALIDATION.max}
                      value={rebateRate}
                      onChange={(e) => setRebateRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`输入 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间的数值`}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      范围：{REBATE_VALIDATION.min}% - {REBATE_VALIDATION.max}%，最多2位小数
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      生效日期
                    </label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      操作人
                    </label>
                    <input
                      type="text"
                      value={updatedBy}
                      onChange={(e) => setUpdatedBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入操作人姓名（可选）"
                    />
                  </div>

                  {/* 同步选项 */}
                  <div className="border-t pt-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncImmediately}
                        onChange={(e) => setSyncImmediately(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          立即同步到达人
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          勾选后，将自动更新所有属于该机构且使用同步模式的{PLATFORM_NAMES[selectedPlatform]}平台达人的返点率
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* 错误提示 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  {/* 提交按钮 */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !hasChanged}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? '提交中...' : '确认调整'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: 阶梯规则 */}
            {activeTab === 'stepRule' && (
              <div className="border rounded-lg bg-white p-4 shadow-sm">
                <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                  阶梯规则
                </h4>
                <div className="py-8 text-center text-gray-400">
                  <p>阶梯规则功能将在 Phase 2 开放</p>
                  <p className="text-xs mt-2">支持按机构总合作量设置阶梯返点率</p>
                </div>
              </div>
            )}

            {/* Tab: 调整历史 */}
            {activeTab === 'history' && (
              <div className="border rounded-lg bg-white p-4 shadow-sm">
                <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                  {PLATFORM_NAMES[selectedPlatform]}平台调整历史
                </h4>

                {historyLoading ? (
                  <div className="py-12 text-center text-gray-500">加载中...</div>
                ) : historyRecords.length > 0 ? (
                  <div className="space-y-4">
                    {/* 历史记录列表 */}
                    {historyRecords.map((record, index) => (
                      <div key={index} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {record.previousRate.toFixed(2)}% → {record.newRate.toFixed(2)}%
                              </span>
                              {record.syncToTalents && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  已同步达人
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-xs text-gray-500">
                              <p>生效日期: {record.effectiveDate}</p>
                              <p>操作人: {record.updatedBy}</p>
                              <p>操作时间: {new Date(record.createdAt).toLocaleString('zh-CN')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 分页 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          共 {totalRecords} 条记录，第 {currentPage} / {totalPages} 页
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            上一页
                          </button>
                          <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            下一页
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <p>暂无{PLATFORM_NAMES[selectedPlatform]}平台调整历史记录</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
