/**
 * ProgressSection - 播放量达成进度区域
 * 采用动态渐变进度条 + 视觉化 GAP 展示
 */

import React from 'react';
import { Progress } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import './ProgressSection.css';

export interface ProgressSectionProps {
  currentViews: number;
  targetViews: number;
  achievementRate: number;
  viewsGap: number;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  currentViews,
  targetViews,
  achievementRate,
  viewsGap,
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(1)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString('zh-CN');
  };

  // 根据达成率选择颜色主题
  const getTheme = () => {
    if (achievementRate >= 100) {
      return {
        gradient: { '0%': '#10b981', '100%': '#059669' },
        glowColor: '#10b981',
        textColor: '#059669',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        label: '目标达成',
        icon: <TrophyOutlined />,
      };
    } else if (achievementRate >= 80) {
      return {
        gradient: { '0%': '#0ea5e9', '100%': '#0284c7' },
        glowColor: '#0ea5e9',
        textColor: '#0284c7',
        bgColor: 'rgba(14, 165, 233, 0.1)',
        label: '即将达成',
        icon: null,
      };
    } else if (achievementRate >= 60) {
      return {
        gradient: { '0%': '#f59e0b', '100%': '#d97706' },
        glowColor: '#f59e0b',
        textColor: '#d97706',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        label: '需要努力',
        icon: null,
      };
    } else {
      return {
        gradient: { '0%': '#f43f5e', '100%': '#e11d48' },
        glowColor: '#f43f5e',
        textColor: '#e11d48',
        bgColor: 'rgba(244, 63, 94, 0.1)',
        label: '需要关注',
        icon: null,
      };
    }
  };

  const theme = getTheme();
  const progressPercent = Math.min(achievementRate, 100);
  void (achievementRate > 100); // isOverAchieved - 暂未使用

  return (
    <div className="progress-section-modern">
      <div className="progress-section-content">
        {/* 头部信息 - 单行紧凑布局 */}
        <div className="progress-header">
          <div className="progress-header-left">
            <div className="progress-title">
              <span className="progress-icon">📊</span>
              <span>播放量达成</span>
            </div>
            {theme.icon && (
              <div className="progress-badge">
                {theme.icon}
                <span>{theme.label}</span>
              </div>
            )}
          </div>

          <div className="progress-numbers">
            <span
              className="progress-current"
              style={{ color: theme.textColor }}
            >
              {formatNumber(currentViews)}
            </span>
            <span className="progress-separator">/</span>
            <span className="progress-target">{formatNumber(targetViews)}</span>
            <span
              className="progress-percent"
              style={{ color: theme.textColor }}
            >
              ({achievementRate.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="progress-bar-wrapper">
          <Progress
            percent={progressPercent}
            strokeColor={theme.gradient}
            size="small"
            showInfo={false}
            trailColor="#f3f4f6"
            className="progress-bar-modern"
          />
        </div>

        {/* GAP 展示 - 简化版 */}
        <div className="progress-gap-section">
          <div className="progress-gap-label">缺口</div>
          <div
            className={`progress-gap-display ${viewsGap > 0 ? 'positive' : 'negative'}`}
          >
            <div className="progress-gap-value">
              {viewsGap > 0 ? '+' : ''}
              {formatNumber(viewsGap)}
            </div>
            <div className="progress-gap-icon">
              {viewsGap > 0 ? (
                <ArrowUpOutlined style={{ color: '#10b981' }} />
              ) : (
                <ArrowDownOutlined style={{ color: '#f43f5e' }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
