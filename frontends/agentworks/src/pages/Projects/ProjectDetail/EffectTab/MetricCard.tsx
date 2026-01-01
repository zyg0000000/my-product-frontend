/**
 * MetricCard - 效果指标卡片（简洁版）
 * 参考 ByteProject 的专业设计风格
 */

import React from 'react';
import { Progress } from 'antd';
import type { ProgressProps } from 'antd';
import './MetricCard.css';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: {
    label: string;
    icon?: React.ReactNode;
  };
  description?: string;
  progress?: {
    percent: number;
    strokeColor: ProgressProps['strokeColor'];
  };
  delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  status,
  description,
  progress,
}) => {
  return (
    <div
      className="metric-card-modern"
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="metric-card-content">
        {/* 图标区域 */}
        <div className="metric-card-icon-wrapper">
          <div className="metric-card-icon">{icon}</div>
        </div>

        {/* 数据区域 */}
        <div className="metric-card-data">
          <div className="metric-card-title">{title}</div>

          <div className="metric-card-value-section">
            <div className="metric-card-value">{value}</div>

            {trend && (
              <div
                className={`metric-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  {trend.isPositive ? (
                    <path d="M6 2L10 8H2L6 2Z" />
                  ) : (
                    <path d="M6 10L2 4H10L6 10Z" />
                  )}
                </svg>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>

          {description && (
            <div className="metric-card-description">{description}</div>
          )}

          {status && (
            <div className="metric-card-status">
              {status.icon}
              <span>{status.label}</span>
            </div>
          )}

          {progress && (
            <div className="metric-card-progress">
              <Progress
                percent={progress.percent}
                strokeColor={progress.strokeColor}
                size="small"
                showInfo={false}
                trailColor="#f3f4f6"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
