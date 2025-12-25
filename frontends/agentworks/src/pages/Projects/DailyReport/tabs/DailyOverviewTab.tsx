/**
 * 日报概览 Tab
 * 包含汇总仪表板、CPM分布、达人表格
 */

import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Alert, Empty } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
  calculateChange,
  TalentDetailTable,
  CPMDistributionBar,
  calculateCPMDistribution,
} from '../components';
import type {
  DailyReportData,
  DailyReportDetail,
  PreviousOverview,
} from '../../../../types/dailyReport';
import { formatViews, formatCPM } from '../../../../types/dailyReport';

interface DailyOverviewTabProps {
  data: DailyReportData | null;
  previousOverview?: PreviousOverview | null;
  details: DailyReportDetail[];
  missingDataVideos: Array<{
    collaborationId: string;
    talentName: string;
    publishDate?: string;
  }>;
  onSaveSolution: (
    collaborationId: string,
    solution: string
  ) => Promise<boolean>;
  onViewTrend?: (collaborationId: string, talentName: string) => void;
  saving: boolean;
  /** 当前日期，用于导出文件名 */
  currentDate?: string;
  /** 导出区域 ref（由父组件传入） */
  exportRef?: RefObject<HTMLDivElement>;
  /** 是否正在导出（由父组件传入） */
  isExporting?: boolean;
}

export function DailyOverviewTab({
  data,
  previousOverview,
  details,
  missingDataVideos,
  onSaveSolution,
  onViewTrend,
  saving,
  currentDate,
  exportRef,
  isExporting = false,
}: DailyOverviewTabProps) {
  // 计算环比数据
  const changes = useMemo(() => {
    if (!data?.overview || !previousOverview) {
      return { views: undefined, cpm: undefined };
    }
    return {
      views: calculateChange(
        data.overview.totalViews,
        previousOverview.totalViews
      ),
      cpm: calculateChange(
        data.overview.averageCPM,
        previousOverview.averageCPM
      ),
    };
  }, [data, previousOverview]);

  // 计算 CPM 分布
  const cpmDistribution = useMemo(() => {
    return calculateCPMDistribution(details);
  }, [details]);

  if (!data) {
    return <Empty description="暂无数据" />;
  }

  const { overview } = data;

  // 格式化金额（分转元，显示完整数值）
  const formatMoney = (cents: number) => {
    const yuan = cents / 100;
    return `¥${yuan.toLocaleString()}`;
  };

  // 计算执行进度
  const totalRevenue = overview?.totalRevenue || 0;
  const publishedRevenue = overview?.publishedRevenue || 0;
  const executionRate =
    totalRevenue > 0 ? Math.round((publishedRevenue / totalRevenue) * 100) : 0;

  // 达人发布进度
  const totalTalents = overview?.totalCollaborations || 0;
  const publishedTalents = overview?.publishedVideos || 0;

  return (
    <div className="py-6 space-y-6">
      {/* 可导出区域 - 包含完整日报概览 */}
      <div ref={exportRef} className="space-y-6 p-4">
        {/* 标题区域：项目名称 + 日期 */}
        <div className="text-center pb-2">
          <h2 className="text-xl font-semibold text-[var(--aw-gray-900)]">
            {data?.projectName || '项目'} - 日报概览
          </h2>
          <p className="text-sm text-[var(--aw-gray-500)] mt-1">
            {currentDate || new Date().toISOString().slice(0, 10)}
          </p>
        </div>

        {/* 汇总仪表板 - 4个卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 播放量卡片 */}
          <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4">
            <div className="text-sm text-[var(--aw-gray-500)] mb-1">
              总播放量
            </div>
            <div className="text-2xl font-semibold text-[var(--aw-gray-900)] tabular-nums">
              {(overview?.totalViews || 0).toLocaleString()}
            </div>
            {changes.views && (
              <div
                className={`mt-2 text-sm ${changes.views.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}
              >
                {changes.views.direction === 'up' ? '↑' : '↓'}{' '}
                {formatViews(Math.abs(changes.views.absoluteChange || 0))}
                <span className="text-[var(--aw-gray-400)] ml-1">
                  ({changes.views.direction === 'up' ? '+' : ''}
                  {changes.views.value.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* CPM卡片 */}
          <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4">
            <div className="text-sm text-[var(--aw-gray-500)] mb-1">
              平均 CPM
            </div>
            <div className="text-2xl font-semibold text-[var(--aw-gray-900)] tabular-nums">
              {formatCPM(overview?.averageCPM || 0)}
            </div>
            {changes.cpm && (
              <div
                className={`mt-2 text-sm ${changes.cpm.direction === 'down' ? 'text-green-500' : 'text-red-500'}`}
              >
                {changes.cpm.direction === 'up' ? '↑' : '↓'} ¥
                {Math.abs(changes.cpm.absoluteChange || 0).toFixed(2)}
                <span className="text-[var(--aw-gray-400)] ml-1">
                  ({changes.cpm.direction === 'up' ? '+' : ''}
                  {changes.cpm.value.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* 达人进度卡片 */}
          <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4">
            <div className="text-sm text-[var(--aw-gray-500)] mb-1">
              达人进度
            </div>
            <div className="text-2xl font-semibold text-[var(--aw-gray-900)] tabular-nums">
              {publishedTalents}/{totalTalents}
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-[var(--aw-gray-200)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${totalTalents > 0 ? (publishedTalents / totalTalents) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 金额进度卡片 */}
          <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4">
            <div className="text-sm text-[var(--aw-gray-500)] mb-1">
              执行金额
            </div>
            <div className="text-2xl font-semibold text-[var(--aw-gray-900)] tabular-nums">
              {formatMoney(publishedRevenue)}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[var(--aw-gray-400)]">
                / {formatMoney(totalRevenue)}
              </span>
              <span className="text-blue-500 font-medium">
                {executionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* CPM 分布 - 不导出 */}
        <div
          className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4"
          data-export-ignore="true"
        >
          <h3 className="text-sm font-medium text-[var(--aw-gray-700)] mb-3">
            CPM 分布
          </h3>
          <CPMDistributionBar
            distribution={cpmDistribution}
            total={details.length}
          />
        </div>

        {/* 待录入提醒 */}
        {missingDataVideos.length > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            title={
              <span>
                有 <strong>{missingDataVideos.length}</strong> 条数据需要录入
              </span>
            }
            description={
              <div className="mt-2 text-sm">
                {missingDataVideos.slice(0, 5).map(v => (
                  <div key={v.collaborationId} className="py-1">
                    {v.talentName}
                    {v.publishDate && ` - 发布于 ${v.publishDate}`}
                  </div>
                ))}
                {missingDataVideos.length > 5 && (
                  <div className="text-[var(--aw-gray-500)]">
                    还有 {missingDataVideos.length - 5} 条...
                  </div>
                )}
              </div>
            }
          />
        )}

        {/* 达人表格 */}
        {details.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当日暂无日报数据"
          />
        ) : (
          <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4">
            <h3 className="text-sm font-medium text-[var(--aw-gray-700)] mb-4">
              达人明细
            </h3>
            <TalentDetailTable
              data={details}
              onSaveSolution={onSaveSolution}
              onViewTrend={onViewTrend}
              saving={saving}
              isExporting={isExporting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
