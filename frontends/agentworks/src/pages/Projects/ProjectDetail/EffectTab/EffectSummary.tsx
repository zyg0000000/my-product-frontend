/**
 * EffectSummary - 效果验收汇总卡片
 * 参考 ByteProject T+21 验收设计
 */

import React from 'react';
import { Progress } from 'antd';
import './EffectSummary.css';

export interface EffectSummaryProps {
  /** 项目名称 */
  projectName?: string;
  /** 当前播放量 */
  currentViews: number;
  /** 目标播放量 */
  targetViews: number;
  /** 达成率 */
  achievementRate: number;
  /** 缺口 (可正可负) */
  viewsGap: number;
  /** 实际 CPM */
  actualCPM: number;
  /** 目标 CPM */
  targetCPM: number;
  /** 验收周期 */
  period: 't7' | 't21';
  /** 验收日期 */
  acceptanceDate?: string;
}

export const EffectSummary: React.FC<EffectSummaryProps> = ({
  projectName,
  currentViews,
  targetViews,
  achievementRate,
  viewsGap,
  actualCPM,
  targetCPM,
  period,
  acceptanceDate,
}) => {
  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN');
  };

  const isAchieved = achievementRate >= 100;
  const isCPMAchieved = actualCPM <= targetCPM;

  const periodLabel = period === 't7' ? 'T+7' : 'T+21';
  const periodDays = period === 't7' ? '7' : '21';

  return (
    <div className="effect-summary-card">
      {/* 标题行：标题 + 验收日期 */}
      <div className="effect-summary-header-row">
        <div className="effect-summary-header">
          <h3 className="effect-summary-title">
            {projectName ? `${projectName} ` : ''}{periodLabel} 交付目标达成
          </h3>
          <div className="effect-summary-subtitle">
            核心交付指标以最后一个合作作品发布后{periodDays}天的数据为准。
          </div>
        </div>
        {acceptanceDate && (
          <div className="effect-summary-date-inline">
            <span className="effect-summary-date-label">
              数据交付日期（{periodLabel}）
            </span>
            <span className="effect-summary-date-value">{acceptanceDate}</span>
          </div>
        )}
      </div>

      {/* 播放量达成进度 */}
      <div className="effect-summary-progress-section">
        <div className="effect-summary-progress-header">
          <span className="effect-summary-progress-label">播放量达成进度</span>
          <div className="effect-summary-progress-numbers">
            <span className="effect-summary-progress-current">
              当前 {formatNumber(currentViews)}
            </span>
            <span className="effect-summary-progress-separator">/</span>
            <span className="effect-summary-progress-target">
              目标 {formatNumber(targetViews)}
            </span>
          </div>
        </div>

        <Progress
          percent={Math.min(achievementRate, 100)}
          strokeColor={isAchieved ? '#10b981' : '#3b82f6'}
          size="default"
          showInfo={false}
          trailColor="var(--color-fill)"
        />
        <div className="effect-summary-progress-info">
          <span
            className={`effect-summary-progress-percent ${isAchieved ? 'achieved' : ''}`}
          >
            {achievementRate.toFixed(0)}%
          </span>
          <span
            className={`effect-summary-gap ${viewsGap > 0 ? 'positive' : 'negative'}`}
          >
            GAP: {viewsGap > 0 ? '+' : ''}
            {formatNumber(viewsGap)}
          </span>
        </div>
      </div>

      {/* 指标卡片区域 */}
      <div className="effect-summary-metrics">
        <div className="effect-summary-metric-card">
          <div className="effect-summary-metric-label">总播放量</div>
          <div className="effect-summary-metric-value">
            {formatNumber(currentViews)}
          </div>
        </div>

        <div className="effect-summary-metric-card highlight">
          <div className="effect-summary-metric-label">实际CPM</div>
          <div
            className={`effect-summary-metric-value ${isCPMAchieved ? 'success' : 'warning'}`}
          >
            ¥{actualCPM.toFixed(2)}
          </div>
        </div>

        <div className="effect-summary-metric-card">
          <div className="effect-summary-metric-label">目标CPM</div>
          <div className="effect-summary-metric-value">
            ¥{targetCPM.toFixed(2)}
          </div>
        </div>

        <div className="effect-summary-metric-card">
          <div className="effect-summary-metric-label">目标播放量</div>
          <div className="effect-summary-metric-value">
            {formatNumber(targetViews)}
          </div>
        </div>
      </div>
    </div>
  );
};
