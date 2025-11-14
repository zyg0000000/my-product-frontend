/**
 * 达人详情页
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTalentDetail } from '../../api/talent';
import type { Talent, Platform } from '../../types/talent';
import { PLATFORM_NAMES, PLATFORM_PRICE_TYPES } from '../../types/talent';
import {
  formatPrice,
  formatRebate,
  formatFansCount,
  formatYearMonth,
  getPriceHistory,
  getRebateHistory,
} from '../../utils/formatters';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export function TalentDetail() {
  const { oneId, platform } = useParams<{
    oneId: string;
    platform: Platform;
  }>();
  const navigate = useNavigate();
  const [talent, setTalent] = useState<Talent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (oneId && platform) {
      loadTalentDetail();
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
      console.error('加载达人详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">加载中...</div>;
  }

  if (!talent) {
    return <div className="p-12 text-center text-gray-500">未找到达人信息</div>;
  }

  const priceHistory = getPriceHistory(talent.prices);
  const rebateHistory = getRebateHistory(talent.rebates);
  const priceTypes = PLATFORM_PRICE_TYPES[talent.platform];

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/talents')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        返回列表
      </button>

      {/* 基础信息 */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {talent.avatar && (
              <img
                src={talent.avatar}
                alt={talent.name}
                className="h-20 w-20 rounded-full"
              />
            )}
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

      {/* 返点历史 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">返点历史</h2>
          <button className="btn btn-secondary text-sm">添加返点</button>
        </div>

        <div className="mt-6">
          {rebateHistory.length === 0 ? (
            <p className="text-center text-gray-500">暂无返点记录</p>
          ) : (
            <div className="space-y-3">
              {rebateHistory.map((rebate, index) => (
                <div
                  key={`${rebate.year}-${rebate.month}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {formatYearMonth(rebate.year, rebate.month)}
                    </span>
                    {index === 0 && (
                      <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                        最新
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatRebate(rebate.rate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
