/**
 * 效果验收配置编辑器
 * 配置效果验收的数据周期和指标列
 *
 * 设计系统：统一配置编辑器风格
 */

import { Checkbox, InputNumber, Tag } from 'antd';
import {
  LineChartOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  HeartOutlined,
  MessageOutlined,
  ShareAltOutlined,
  StarOutlined,
  RiseOutlined,
  DollarOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import type {
  EffectTabConfig,
  EffectPeriod,
} from '../../../types/projectConfig';
import {
  AVAILABLE_EFFECT_METRICS,
  EFFECT_PERIOD_OPTIONS,
} from '../../../types/projectConfig';
import './ConfigEditor.css';

interface EffectConfigEditorProps {
  value?: EffectTabConfig;
  onChange: (config: EffectTabConfig) => void;
  disabled?: boolean;
}

const DEFAULT_EFFECT_CONFIG: EffectTabConfig = {
  enabledPeriods: ['t7', 't21'],
  enabledMetrics: ['plays', 'likes', 'comments', 'shares', 'cpm'],
  benchmarks: {},
};

/** 指标图标映射 */
const METRIC_ICONS: Record<string, React.ReactNode> = {
  plays: <PlayCircleOutlined />,
  likes: <HeartOutlined />,
  comments: <MessageOutlined />,
  shares: <ShareAltOutlined />,
  favorites: <StarOutlined />,
  engagementRate: <RiseOutlined />,
  cpm: <DollarOutlined />,
  cpe: <DollarOutlined />,
  roi: <PercentageOutlined />,
};

/** 指标颜色映射 */
const METRIC_COLORS: Record<string, string> = {
  plays: 'var(--config-metric-blue)',
  likes: 'var(--config-metric-red)',
  comments: 'var(--config-metric-orange)',
  shares: 'var(--config-metric-green)',
  favorites: 'var(--config-metric-purple)',
  engagementRate: 'var(--config-metric-green)',
  cpm: 'var(--config-metric-blue)',
  cpe: 'var(--config-metric-orange)',
  roi: 'var(--config-metric-purple)',
};

export function EffectConfigEditor({
  value,
  onChange,
  disabled,
}: EffectConfigEditorProps) {
  const config: EffectTabConfig = value || DEFAULT_EFFECT_CONFIG;

  const handlePeriodToggle = (period: EffectPeriod, checked: boolean) => {
    const newPeriods = checked
      ? [...config.enabledPeriods, period]
      : config.enabledPeriods.filter(p => p !== period);
    onChange({ ...config, enabledPeriods: newPeriods });
  };

  const handleMetricToggle = (metricKey: string, checked: boolean) => {
    const newMetrics = checked
      ? [...config.enabledMetrics, metricKey]
      : config.enabledMetrics.filter(m => m !== metricKey);
    onChange({ ...config, enabledMetrics: newMetrics });
  };

  const handleBenchmarkChange = (key: string, val: number | null) => {
    onChange({
      ...config,
      benchmarks: {
        ...config.benchmarks,
        [key]: val ?? undefined,
      },
    });
  };

  // 计算启用的数量
  const enabledPeriodsCount = config.enabledPeriods.length;
  const enabledMetricsCount = config.enabledMetrics.length;

  // 可设置基准值的指标
  const benchmarkableMetrics = config.enabledMetrics.filter(k =>
    ['cpm', 'cpe', 'roi'].includes(k)
  );

  return (
    <div className={`config-editor ${disabled ? 'config-editor--disabled' : ''}`}>
      {disabled && (
        <div className="config-warning">
          <SafetyCertificateOutlined />
          效果验收 Tab 已关闭，请先在「Tab 显示配置」中开启
        </div>
      )}

      {/* 数据周期配置 */}
      <section className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon">
            <ClockCircleOutlined />
          </div>
          <div>
            <h4 className="config-section__title">数据周期</h4>
            <p className="config-section__desc">
              选择需要录入效果数据的时间维度，可多选
            </p>
          </div>
        </div>

        <div className="config-option-grid config-option-grid--compact">
          {EFFECT_PERIOD_OPTIONS.map(period => {
            const isEnabled = config.enabledPeriods.includes(period.key);
            return (
              <div
                key={period.key}
                className={`config-option-card ${isEnabled ? 'config-option-card--active' : ''}`}
                style={{ '--option-color': 'var(--config-accent)' } as React.CSSProperties}
                onClick={() => !disabled && handlePeriodToggle(period.key, !isEnabled)}
              >
                <div className="config-option-card__checkbox">
                  <Checkbox checked={isEnabled} disabled={disabled} />
                </div>
                <div className="config-option-card__icon">
                  <ClockCircleOutlined />
                </div>
                <div className="config-option-card__content">
                  <span className="config-option-card__label">{period.label}</span>
                  <span className="config-option-card__unit">天</span>
                </div>
              </div>
            );
          })}
        </div>

        {enabledPeriodsCount === 0 && (
          <div className="config-warning config-warning--error" style={{ marginTop: 12, marginBottom: 0 }}>
            <SafetyCertificateOutlined />
            至少需要选择一个数据周期
          </div>
        )}
      </section>

      <hr className="config-divider" />

      {/* 指标列配置 */}
      <section className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon config-section__icon--accent">
            <BarChartOutlined />
          </div>
          <div>
            <h4 className="config-section__title">显示指标列</h4>
            <p className="config-section__desc">
              选择需要在效果验收页面显示的数据指标
            </p>
          </div>
        </div>

        <div className="config-option-grid config-option-grid--wide">
          {AVAILABLE_EFFECT_METRICS.map(metric => {
            const isEnabled = config.enabledMetrics.includes(metric.key);
            const colorVar = METRIC_COLORS[metric.key] || 'var(--config-accent)';
            return (
              <div
                key={metric.key}
                className={`config-option-card ${isEnabled ? 'config-option-card--active' : ''}`}
                style={{ '--option-color': colorVar } as React.CSSProperties}
                onClick={() => !disabled && handleMetricToggle(metric.key, !isEnabled)}
              >
                <div className="config-option-card__checkbox">
                  <Checkbox checked={isEnabled} disabled={disabled} />
                </div>
                <div className="config-option-card__icon">
                  {METRIC_ICONS[metric.key] || <LineChartOutlined />}
                </div>
                <div className="config-option-card__content">
                  <span className="config-option-card__label">{metric.label}</span>
                  {metric.unit && (
                    <span className="config-option-card__unit">{metric.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {enabledMetricsCount === 0 && (
          <div className="config-warning config-warning--error" style={{ marginTop: 12, marginBottom: 0 }}>
            <SafetyCertificateOutlined />
            至少需要选择一个效果指标
          </div>
        )}
      </section>

      <hr className="config-divider" />

      {/* 基准值配置 */}
      <section className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon config-section__icon--success">
            <RiseOutlined />
          </div>
          <div>
            <h4 className="config-section__title">默认基准值</h4>
            <p className="config-section__desc">
              设置效果评估的基准值，用于达成率计算（创建项目时可覆盖）
            </p>
          </div>
        </div>

        {benchmarkableMetrics.length > 0 ? (
          <div className="config-input-grid">
            {benchmarkableMetrics.map(key => {
              const metric = AVAILABLE_EFFECT_METRICS.find(m => m.key === key);
              if (!metric) return null;
              return (
                <div key={key} className="config-input-item">
                  <label className="config-input-item__label">
                    {metric.label} 基准值
                  </label>
                  <InputNumber
                    value={config.benchmarks?.[key]}
                    onChange={val => handleBenchmarkChange(key, val)}
                    placeholder="可选"
                    addonAfter={metric.unit}
                    disabled={disabled}
                    className="w-full"
                    min={0}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="config-preview">
            <p className="config-preview__empty">
              选择 CPM、CPE 或 ROI 指标后可配置基准值
            </p>
          </div>
        )}
      </section>

      <hr className="config-divider" />

      {/* 配置预览 */}
      <section className="config-preview">
        <h4 className="config-preview__title">配置预览</h4>
        <div className="config-preview__tags">
          {config.enabledPeriods.map(key => {
            const period = EFFECT_PERIOD_OPTIONS.find(p => p.key === key);
            return (
              <Tag key={key} color="blue">
                {period?.label}
              </Tag>
            );
          })}
          {config.enabledMetrics.map(key => {
            const metric = AVAILABLE_EFFECT_METRICS.find(m => m.key === key);
            return (
              <Tag key={key} color="purple">
                {metric?.label}
              </Tag>
            );
          })}
          {Object.entries(config.benchmarks || {}).map(([key, val]) => {
            if (val === undefined) return null;
            const metric = AVAILABLE_EFFECT_METRICS.find(m => m.key === key);
            return (
              <Tag key={`benchmark-${key}`} color="green">
                {metric?.label} 基准: {val}{metric?.unit}
              </Tag>
            );
          })}
        </div>
      </section>

      {/* 底部计数 */}
      <div className="config-footer">
        <span className="config-footer__count">
          已选择 <strong>{enabledPeriodsCount}</strong> 个周期，
          <strong>{enabledMetricsCount}</strong> 个指标
        </span>
      </div>
    </div>
  );
}
