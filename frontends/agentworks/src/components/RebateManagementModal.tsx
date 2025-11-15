/**
 * 返点管理弹窗
 */

import { useState, useEffect } from 'react';
import { getTalentRebate, getRebateHistory as fetchRebateHistory } from '../api/rebate';
import type { Platform } from '../types/talent';
import type { GetRebateResponse, RebateConfig } from '../types/rebate';
import {
  BELONG_TYPE_LABELS,
  REBATE_SOURCE_LABELS,
  REBATE_STATUS_LABELS,
  REBATE_STATUS_COLORS,
  EFFECT_TYPE_LABELS,
  formatRebateRate,
} from '../types/rebate';
import { UpdateRebateModal } from './UpdateRebateModal';

interface RebateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  oneId: string;
  platform: Platform;
  talentName: string;
}

export function RebateManagementModal({
  isOpen,
  onClose,
  oneId,
  platform,
  talentName,
}: RebateManagementModalProps) {
  const [rebateData, setRebateData] = useState<GetRebateResponse['data'] | null>(null);
  const [rebateHistory, setRebateHistory] = useState<RebateConfig[]>([]);
  const [rebateLoading, setRebateLoading] = useState(false);
  const [showUpdateRebateModal, setShowUpdateRebateModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRebateData();
    }
  }, [isOpen, oneId, platform]);

  const loadRebateData = async () => {
    try {
      setRebateLoading(true);

      // 加载当前返点配置
      const rebateResponse = await getTalentRebate(oneId, platform);
      if (rebateResponse.success && rebateResponse.data) {
        setRebateData(rebateResponse.data);
      }

      // 加载返点历史记录
      const historyResponse = await fetchRebateHistory({
        oneId,
        platform,
        limit: 20,
        offset: 0,
      });
      if (historyResponse.success && historyResponse.data) {
        setRebateHistory(historyResponse.data.records);
      }
    } catch (error) {
      console.error('加载返点数据失败:', error);
    } finally {
      setRebateLoading(false);
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
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  返点管理: <span className="text-green-100">{talentName}</span>
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  查看和调整达人的返点配置
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

          {/* Content */}
          <div className="p-6">
            {rebateLoading ? (
              <div className="py-12 text-center text-gray-500">加载中...</div>
            ) : rebateData ? (
              <div className="space-y-6">
                {/* 当前返点配置卡片 */}
                <div className="border rounded-lg bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <h4 className="text-base font-semibold text-gray-800">
                      当前返点配置
                    </h4>
                    <button
                      onClick={() => setShowUpdateRebateModal(true)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      调整返点
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500">归属类型</p>
                      <p className="mt-1 text-base font-medium text-gray-900">
                        {BELONG_TYPE_LABELS[rebateData.belongType]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">当前返点率</p>
                      <p className="mt-1 text-2xl font-bold text-green-600">
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

                {/* 返点历史时间线卡片 */}
                <div className="border rounded-lg bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b">
                    调整历史
                  </h4>

                  {rebateHistory.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">暂无调整记录</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {rebateHistory.map((record) => (
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
                                    <span className="font-medium">生效日期：</span>
                                    {record.effectiveDate}
                                    {record.expiryDate && (
                                      <>
                                        {' → '}
                                        <span className="font-medium">失效日期：</span>
                                        {record.expiryDate}
                                      </>
                                    )}
                                  </p>
                                  {record.reason && (
                                    <p className="text-gray-600">
                                      <span className="font-medium">调整原因：</span>
                                      {record.reason}
                                    </p>
                                  )}
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
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                暂无返点配置信息
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 调整返点子弹窗 */}
      {rebateData && (
        <UpdateRebateModal
          isOpen={showUpdateRebateModal}
          onClose={() => setShowUpdateRebateModal(false)}
          onSuccess={() => {
            loadRebateData();
          }}
          oneId={oneId}
          platform={platform}
          currentRate={rebateData.currentRebate.rate}
        />
      )}
    </>
  );
}
