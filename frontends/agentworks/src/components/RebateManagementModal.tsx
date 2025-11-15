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
  formatRebateRate,
} from '../types/rebate';
import { UpdateRebateModal } from './UpdateRebateModal';
import { RebateHistoryList } from './RebateHistoryList';

interface RebateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  oneId: string;
  platform: Platform;
  talentName: string;
}

type TabType = 'current' | 'history' | 'rules';

export function RebateManagementModal({
  isOpen,
  onClose,
  oneId,
  platform,
  talentName,
}: RebateManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [rebateData, setRebateData] = useState<GetRebateResponse['data'] | null>(null);
  const [rebateHistory, setRebateHistory] = useState<RebateConfig[]>([]);
  const [rebateLoading, setRebateLoading] = useState(false);
  const [showUpdateRebateModal, setShowUpdateRebateModal] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 3; // 每页显示 3 条记录

  useEffect(() => {
    if (isOpen) {
      loadRebateData();
    }
  }, [isOpen, oneId, platform]);

  const loadRebateData = async (page: number = 1) => {
    try {
      setRebateLoading(true);

      // 加载当前返点配置
      const rebateResponse = await getTalentRebate(oneId, platform);
      if (rebateResponse.success && rebateResponse.data) {
        setRebateData(rebateResponse.data);
      }

      // 加载返点历史记录（分页）
      const offset = (page - 1) * pageSize;
      const historyResponse = await fetchRebateHistory({
        oneId,
        platform,
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

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('current')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'current'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                当前配置
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                调整历史
              </button>
              <button
                disabled
                className="py-4 px-6 text-sm font-medium border-b-2 border-transparent text-gray-400 cursor-not-allowed flex items-center gap-2"
              >
                协议规则
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Phase 2</span>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {rebateLoading ? (
              <div className="py-12 text-center text-gray-500">加载中...</div>
            ) : rebateData ? (
              <div className="space-y-6">
                {/* Tab: 当前配置 */}
                {activeTab === 'current' && (
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
                )}

                {/* Tab: 调整历史 */}
                {activeTab === 'history' && (
                  <div className="border rounded-lg bg-white p-5 shadow-sm">
                    <h4 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b">
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
