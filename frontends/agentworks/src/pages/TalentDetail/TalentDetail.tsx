/**
 * 达人详情页
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { getTalentDetail, updateTalent } from '../../api/talent';
import {
  getTalentRebate,
  getRebateHistory as fetchRebateHistory,
} from '../../api/rebate';
import { getAgencies } from '../../api/agency';
import type { Talent, Platform, PriceRecord } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import type { Agency } from '../../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../types/agency';
import type { GetRebateResponse, RebateConfig } from '../../types/rebate';
import { REBATE_SOURCE_LABELS, formatRebateRate } from '../../types/rebate';
import {
  formatPrice,
  formatFansCount,
  formatYearMonth,
  getPriceHistory,
} from '../../utils/formatters';
import { RebateManagementModal } from '../../components/RebateManagementModal';
import { RebateHistoryList } from '../../components/RebateHistoryList';
import { PageSkeleton } from '../../components/Skeletons/PageSkeleton';
import { EditTalentModal } from '../../components/EditTalentModal';
import { PriceModal } from '../../components/PriceModal';
import { Button, Skeleton, App } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

export function TalentDetail() {
  const { oneId, platform } = useParams<{
    oneId: string;
    platform: Platform;
  }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);

  // 使用平台配置 Hook 获取价格类型（动态配置）
  const { getPlatformPriceTypes } = usePlatformConfig(true);

  // 新返点管理系统状态
  const [rebateData, setRebateData] = useState<
    GetRebateResponse['data'] | null
  >(null);
  const [rebateHistory, setRebateHistory] = useState<RebateConfig[]>([]);
  const [rebateLoading, setRebateLoading] = useState(false);
  const [showUpdateRebateModal, setShowUpdateRebateModal] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // 编辑和价格弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

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

  // 保存达人信息
  const handleSaveTalent = async (
    talentOneId: string,
    talentPlatform: Platform,
    data: Partial<Talent>
  ) => {
    try {
      await updateTalent({
        oneId: talentOneId,
        platform: talentPlatform,
        ...data,
      });
      message.success('保存成功');
      loadTalentDetail(); // 重新加载详情
    } catch (error) {
      logger.error('保存达人信息失败:', error);
      message.error('保存失败');
      throw error;
    }
  };

  // 保存价格
  const handleSavePrice = async (
    _talentOneId: string,
    prices: PriceRecord[]
  ) => {
    if (!talent) return;
    try {
      await updateTalent({
        oneId: talent.oneId,
        platform: talent.platform,
        prices,
      });
      message.success('价格保存成功');
      loadTalentDetail(); // 重新加载详情
    } catch (error) {
      logger.error('保存价格失败:', error);
      message.error('保存失败');
      throw error;
    }
  };

  // 计算可用标签（来自当前达人）
  const availableTags = useMemo(() => {
    return talent?.talentType || [];
  }, [talent]);

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
      {/* 页面头部 - 与客户详情页风格一致 */}
      <div className="flex items-center gap-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 m-0">达人详情</h1>
      </div>

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

          <Button type="primary" onClick={() => setShowEditModal(true)}>
            编辑
          </Button>
        </div>

        {/* 平台特有信息 */}
        {talent.platformSpecific && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900">平台特有信息</h3>
            <div className="mt-3 grid grid-cols-3 gap-4">
              {talent.platformAccountId && (
                <div>
                  <p className="text-xs text-gray-500">星图ID</p>
                  <p className="mt-1 text-sm font-medium">
                    {talent.platformAccountId}
                  </p>
                </div>
              )}
              {talent.platformSpecific.uid && (
                <div>
                  <p className="text-xs text-gray-500">抖音UID</p>
                  <p className="mt-1 text-sm font-medium">
                    {talent.platformSpecific.uid}
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
          <Button onClick={() => setShowPriceModal(true)}>添加价格</Button>
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
                    const price =
                      history.prices[
                        priceType.key as keyof typeof history.prices
                      ];
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
          <Button onClick={() => setShowUpdateRebateModal(true)}>
            调整返点
          </Button>
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
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                调整历史
              </h3>

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
          <div className="mt-6 text-center text-gray-500">暂无返点配置信息</div>
        )}
      </div>

      {/* 返点管理弹窗 */}
      {talent && (
        <RebateManagementModal
          isOpen={showUpdateRebateModal}
          onClose={() => {
            setShowUpdateRebateModal(false);
            loadRebateData(); // 关闭时刷新返点数据
          }}
          talent={talent}
        />
      )}

      {/* 编辑达人弹窗 */}
      <EditTalentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        talent={talent}
        onSave={handleSaveTalent}
        availableTags={availableTags}
      />

      {/* 价格弹窗 */}
      <PriceModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        talent={talent}
        onSave={handleSavePrice}
      />
    </div>
  );
}
