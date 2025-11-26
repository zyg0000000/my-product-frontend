/**
 * 达人详情页
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { getTalentDetail } from '../../api/talent';
import { getTalentRebate, getRebateHistory as fetchRebateHistory } from '../../api/rebate';
import { getAgencies } from '../../api/agency';
import type { Talent, Platform } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import type { Agency } from '../../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../types/agency';
import type { GetRebateResponse, RebateConfig } from '../../types/rebate';
import {
  REBATE_SOURCE_LABELS,
  formatRebateRate,
} from '../../types/rebate';
import {
  formatPrice,
  formatFansCount,
  formatYearMonth,
  getPriceHistory,
} from '../../utils/formatters';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { UpdateRebateModal } from '../../components/UpdateRebateModal';
import { RebateHistoryList } from '../../components/RebateHistoryList';
import { PageSkeleton } from '../../components/Skeletons/PageSkeleton';
import { Skeleton } from 'antd';

export function TalentDetail() {
  const { oneId, platform } = useParams<{
    oneId: string;
    platform: Platform;
  }>();
  const navigate = useNavigate();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);

  // 使用平台配置 Hook 获取价格类型（动态配置）
  const { getPlatformPriceTypes } = usePlatformConfig(true);

  // 新返点管理系统状态
  const [rebateData, setRebateData] = useState<GetRebateResponse['data'] | null>(null);
  const [rebateHistory, setRebateHistory] = useState<RebateConfig[]>([]);
  const [rebateLoading, setRebateLoading] = useState(false);
  const [showUpdateRebateModal, setShowUpdateRebateModal] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 3; // 每页显示 3 条记录

  useEffect(() => {
    if (oneId && platform) {
      loadTalentDetail();
      loadRebateData();
      loadAgencies();
    }
  }, [oneId, platform]);

  const loadTalentDetail = async () => {
    if (!oneId || !platform) return;

    try {
      setLoading(true);
      const response = await getTalentDetail(oneId, platform as Platform);
      if (response.success && response.data) {
        setTalent(response.data);
      }
    } catch (error) {
      logger.error('加载达人详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRebateData = async (page: number = 1) => {
    if (!oneId || !platform) return;

    try {
      setRebateLoading(true);

      // 加载当前返点配置
      const rebateResponse = await getTalentRebate(oneId, platform as Platform);
      if (rebateResponse.success && rebateResponse.data) {
        setRebateData(rebateResponse.data);
      }

      // 加载返点历史记录（分页）
      const offset = (page - 1) * pageSize;
      const historyResponse = await fetchRebateHistory({
        oneId,
        platform: platform as Platform,
        limit: pageSize,
        offset,
      });
      if (historyResponse.success && historyResponse.data) {
        setRebateHistory(historyResponse.data.records);
        setTotalRecords(historyResponse.data.total);
        setCurrentPage(page);
      }
    } catch (error) {
      logger.error('加载返点数据失败:', error);
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
      logger.error('加载机构列表失败:', error);
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

  if (loading) {
    return <PageSkeleton />;
  }

  if (!talent) {
    return <div className="p-12 text-center text-gray-500">未找到达人信息</div>;
  }

  const priceHistory = getPriceHistory(talent.prices);
  // 使用动态配置获取价格类型
  const priceTypes = getPlatformPriceTypes(talent.platform);

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <button
        onClick={() => {
          // 返回到对应平台的基础信息页面，并保持平台选中状态
          navigate('/talents/basic', {
            state: { selectedPlatform: platform }
          });
        }}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        返回列表
      </button>

      {/* 基础信息 */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {talent.name}
              </h1>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>oneId: {talent.oneId}</p>
                <p>平台: {PLATFORM_NAMES[talent.platform]}</p>
                <p>平台账号ID: {talent.platformAccountId}</p>
                {talent.fansCount && (
                  <p>粉丝数: {formatFansCount(talent.fansCount)}</p>
                )}
              </div>
            </div>
          </div>

          <button className="btn btn-primary">编辑</button>
        </div>

        {/* 平台特有信息 */}
        {talent.platformSpecific && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900">平台特有信息</h3>
            <div className="mt-3 grid grid-cols-3 gap-4">
              {talent.platformSpecific.xingtuId && (
                <div>
                  <p className="text-xs text-gray-500">星图ID</p>
                  <p className="mt-1 text-sm font-medium">
                    {talent.platformSpecific.xingtuId}
                  </p>
                </div>
              )}
              {talent.platformSpecific.starLevel && (
                <div>
                  <p className="text-xs text-gray-500">星图等级</p>
                  <p className="mt-1 text-sm font-medium">
                    {talent.platformSpecific.starLevel}星
                  </p>
                </div>
              )}
              {talent.platformSpecific.mcnName && (
                <div>
                  <p className="text-xs text-gray-500">MCN机构</p>
                  <p className="mt-1 text-sm font-medium">
                    {talent.platformSpecific.mcnName}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 价格历史 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">价格历史</h2>
          <button className="btn btn-secondary text-sm">添加价格</button>
        </div>

        <div className="mt-6 space-y-6">
          {priceHistory.length === 0 ? (
            <p className="text-center text-gray-500">暂无价格记录</p>
          ) : (
            priceHistory.map(history => (
              <div
                key={`${history.year}-${history.month}`}
                className="border-l-2 border-primary-500 pl-6"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900">
                    {formatYearMonth(history.year, history.month)}
                  </h3>
                  {history.isLatest && (
                    <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                      最新
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {priceTypes.map(priceType => {
                    const price = history.prices[priceType.key];
                    return (
                      <div key={priceType.key}>
                        <p className="text-xs text-gray-500">
                          {priceType.label}
                        </p>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          {price ? formatPrice(price) : '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 返点配置 (v2) */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">返点配置</h2>
          <button
            onClick={() => setShowUpdateRebateModal(true)}
            className="btn btn-secondary text-sm"
            disabled={!rebateData}
          >
            调整返点
          </button>
        </div>

        {rebateLoading ? (
          <div className="mt-6 p-4">
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : rebateData ? (
          <div className="mt-6 space-y-6">
            {/* 当前返点信息 */}
            <div className="grid grid-cols-2 gap-6 rounded-lg border border-gray-200 p-6 md:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">归属机构</p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {getAgencyName(rebateData.agencyId)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">当前返点率</p>
                <p className="mt-1 text-base font-medium text-gray-900">
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

            {/* 返点历史时间线 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">调整历史</h3>

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
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-500">
            暂无返点配置信息
          </div>
        )}
      </div>

      {/* 调整返点弹窗 */}
      {rebateData && (
        <UpdateRebateModal
          isOpen={showUpdateRebateModal}
          onClose={() => setShowUpdateRebateModal(false)}
          onSuccess={() => {
            loadRebateData();
          }}
          oneId={oneId!}
          platform={platform as Platform}
          currentRate={rebateData.currentRebate.rate}
          rebateMode={rebateData.rebateMode}
          agencyId={rebateData.agencyId}
          agencyName={rebateData.agencyName}
        />
      )}
    </div>
  );
}
