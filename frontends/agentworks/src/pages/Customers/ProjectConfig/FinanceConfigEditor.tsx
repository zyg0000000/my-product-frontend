/**
 * 财务管理配置编辑器
 *
 * 设计系统：统一配置编辑器风格
 * 功能：
 * - 启用的财务指标选择（基础指标 + 高级指标）
 * - 资金占用费用开关及费率配置
 * - 结算文件管理开关
 */

import { useState } from 'react';
import { Checkbox, InputNumber, Tag, Switch, Tooltip } from 'antd';
import {
  DollarOutlined,
  BankOutlined,
  WalletOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PercentageOutlined,
  SwapOutlined,
  CalculatorOutlined,
  FundOutlined,
  FileOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type {
  FinanceTabConfig,
  FinanceMetricKey,
} from '../../../types/projectConfig';
import {
  AVAILABLE_FINANCE_METRICS,
  DEFAULT_FINANCE_CONFIG,
} from '../../../types/projectConfig';
import './ConfigEditor.css';

interface FinanceConfigEditorProps {
  value?: FinanceTabConfig;
  onChange: (config: FinanceTabConfig) => void;
  disabled?: boolean;
}

/** 指标图标映射 */
const METRIC_ICONS: Record<FinanceMetricKey, React.ReactNode> = {
  totalAmount: <DollarOutlined />,
  orderedAmount: <ShoppingOutlined />,
  paidAmount: <WalletOutlined />,
  recoveredAmount: <BankOutlined />,
  pendingCount: <ClockCircleOutlined />,
  adjustmentTotal: <SwapOutlined />,
  totalExpense: <CalculatorOutlined />,
  fundsOccupation: <FundOutlined />,
  expenseAdjustment: <SwapOutlined />,
  incomeAdjustment: <SwapOutlined />,
  operationalCost: <CalculatorOutlined />,
  grossProfit: <RiseOutlined />,
  grossMargin: <PercentageOutlined />,
};

/** 颜色类型映射到 CSS 变量 */
const COLOR_TYPE_MAP: Record<string, string> = {
  income: 'var(--config-metric-blue)',
  expense: 'var(--config-metric-red)',
  profit: 'var(--config-metric-green)',
  adjustment: 'var(--config-metric-orange)',
  progress: 'var(--config-metric-purple)',
};

export function FinanceConfigEditor({
  value,
  onChange,
  disabled,
}: FinanceConfigEditorProps) {
  const config: FinanceTabConfig = value || DEFAULT_FINANCE_CONFIG;
  const [expandedCategory, setExpandedCategory] = useState<
    'basic' | 'advanced' | null
  >('basic');

  // 按分类分组指标
  const basicMetrics = AVAILABLE_FINANCE_METRICS.filter(
    m => m.category === 'basic'
  );
  const advancedMetrics = AVAILABLE_FINANCE_METRICS.filter(
    m => m.category === 'advanced'
  );

  const handleMetricToggle = (
    metricKey: FinanceMetricKey,
    checked: boolean
  ) => {
    const newMetrics = checked
      ? [...config.enabledMetrics, metricKey]
      : config.enabledMetrics.filter(m => m !== metricKey);
    onChange({ ...config, enabledMetrics: newMetrics });
  };

  const handleFundsOccupationToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enableFundsOccupation: enabled,
      // 如果开启，自动添加资金占用费用指标
      enabledMetrics: enabled
        ? config.enabledMetrics.includes('fundsOccupation')
          ? config.enabledMetrics
          : [...config.enabledMetrics, 'fundsOccupation']
        : config.enabledMetrics.filter(m => m !== 'fundsOccupation'),
    });
  };

  const handleFundsRateChange = (rate: number | null) => {
    onChange({
      ...config,
      fundsOccupationRate: rate ?? 0.7,
    });
  };

  const handleSettlementFilesToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enableSettlementFiles: enabled,
    });
  };

  const enabledBasicCount = basicMetrics.filter(m =>
    config.enabledMetrics.includes(m.key)
  ).length;
  const enabledAdvancedCount = advancedMetrics.filter(m =>
    config.enabledMetrics.includes(m.key)
  ).length;

  return (
    <div
      className={`config-editor ${disabled ? 'config-editor--disabled' : ''}`}
    >
      {disabled && (
        <div className="config-warning">
          <SafetyCertificateOutlined />
          财务管理 Tab 已关闭，请先在「Tab 显示配置」中开启
        </div>
      )}

      {/* 功能开关区 */}
      <section className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon config-section__icon--warning">
            <ThunderboltOutlined />
          </div>
          <div>
            <h4 className="config-section__title">高级功能</h4>
            <p className="config-section__desc">按需开启额外的财务管理功能</p>
          </div>
        </div>

        <div className="config-feature-grid">
          {/* 资金占用费用 */}
          <div
            className={`config-feature-card ${config.enableFundsOccupation ? 'config-feature-card--active' : ''}`}
          >
            <div className="config-feature-card__header">
              <div className="config-feature-card__icon config-feature-card__icon--danger">
                <FundOutlined />
              </div>
              <Switch
                checked={config.enableFundsOccupation}
                onChange={handleFundsOccupationToggle}
                disabled={disabled}
                size="small"
              />
            </div>
            <h5 className="config-feature-card__title">资金占用费用</h5>
            <p className="config-feature-card__desc">
              计算从下单到回款期间的资金占用成本
            </p>
            {config.enableFundsOccupation && (
              <div className="config-feature-card__extra">
                <label className="config-feature-card__label">
                  月费率
                  <Tooltip title="资金占用费用 = 支出金额 × (月费率/30) × 占用天数">
                    <InfoCircleOutlined
                      style={{ marginLeft: 4, color: '#94a3b8' }}
                    />
                  </Tooltip>
                </label>
                <InputNumber
                  value={config.fundsOccupationRate ?? 0.7}
                  onChange={handleFundsRateChange}
                  min={0}
                  max={10}
                  step={0.1}
                  precision={2}
                  addonAfter="%"
                  disabled={disabled}
                  className="w-full"
                  size="small"
                />
              </div>
            )}
          </div>

          {/* 结算文件管理 */}
          <div
            className={`config-feature-card ${config.enableSettlementFiles ? 'config-feature-card--active' : ''}`}
          >
            <div className="config-feature-card__header">
              <div className="config-feature-card__icon config-feature-card__icon--success">
                <FileOutlined />
              </div>
              <Switch
                checked={config.enableSettlementFiles}
                onChange={handleSettlementFilesToggle}
                disabled={disabled}
                size="small"
              />
            </div>
            <h5 className="config-feature-card__title">结算文件管理</h5>
            <p className="config-feature-card__desc">
              上传、预览、下载项目结算相关文件
            </p>
            {config.enableSettlementFiles && (
              <div className="config-feature-card__extra">
                <Tag color="success" style={{ margin: 0 }}>
                  支持 PDF/Excel/图片
                </Tag>
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className="config-divider" />

      {/* 指标选择区 */}
      <section className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon">
            <DollarOutlined />
          </div>
          <div>
            <h4 className="config-section__title">财务看板指标</h4>
            <p className="config-section__desc">
              选择在财务管理页面显示的指标卡片
            </p>
          </div>
        </div>

        {/* 基础指标 */}
        <div className="config-category">
          <div
            className="config-category__header"
            onClick={() =>
              setExpandedCategory(expandedCategory === 'basic' ? null : 'basic')
            }
          >
            <div className="config-category__title">
              <span
                className={`config-category__badge ${enabledBasicCount === 0 ? 'config-category__badge--muted' : ''}`}
              >
                {enabledBasicCount}
              </span>
              基础指标
              <span className="config-category__hint">
                前端实时计算，无需后端支持
              </span>
            </div>
            <div
              className={`config-category__arrow ${expandedCategory === 'basic' ? 'config-category__arrow--expanded' : ''}`}
            >
              ›
            </div>
          </div>
          {expandedCategory === 'basic' && (
            <div className="config-category__content">
              <div className="config-option-grid config-option-grid--wide">
                {basicMetrics.map(metric => {
                  const isEnabled = config.enabledMetrics.includes(metric.key);
                  const colorVar = COLOR_TYPE_MAP[metric.colorType || 'income'];
                  return (
                    <div
                      key={metric.key}
                      className={`config-option-card ${isEnabled ? 'config-option-card--active' : ''}`}
                      style={
                        { '--option-color': colorVar } as React.CSSProperties
                      }
                      onClick={() =>
                        !disabled && handleMetricToggle(metric.key, !isEnabled)
                      }
                    >
                      <div className="config-option-card__checkbox">
                        <Checkbox checked={isEnabled} disabled={disabled} />
                      </div>
                      <div className="config-option-card__icon">
                        {METRIC_ICONS[metric.key]}
                      </div>
                      <div className="config-option-card__content">
                        <span className="config-option-card__label">
                          {metric.label}
                        </span>
                        <span className="config-option-card__unit">
                          {metric.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 高级指标 */}
        <div className="config-category config-category--muted">
          <div
            className="config-category__header"
            onClick={() =>
              setExpandedCategory(
                expandedCategory === 'advanced' ? null : 'advanced'
              )
            }
          >
            <div className="config-category__title">
              <span
                className={`config-category__badge ${enabledAdvancedCount === 0 ? 'config-category__badge--muted' : ''}`}
              >
                {enabledAdvancedCount}
              </span>
              高级指标
              <span className="config-category__hint">
                需要额外数据或配置支持
              </span>
            </div>
            <div
              className={`config-category__arrow ${expandedCategory === 'advanced' ? 'config-category__arrow--expanded' : ''}`}
            >
              ›
            </div>
          </div>
          {expandedCategory === 'advanced' && (
            <div className="config-category__content">
              <div className="config-option-grid config-option-grid--wide">
                {advancedMetrics.map(metric => {
                  const isEnabled = config.enabledMetrics.includes(metric.key);
                  const colorVar =
                    COLOR_TYPE_MAP[metric.colorType || 'expense'];
                  // 资金占用指标受开关控制
                  const isLocked =
                    metric.key === 'fundsOccupation' &&
                    !config.enableFundsOccupation;
                  return (
                    <Tooltip
                      key={metric.key}
                      title={isLocked ? '请先开启「资金占用费用」功能' : ''}
                    >
                      <div
                        className={`config-option-card ${isEnabled ? 'config-option-card--active' : ''} ${isLocked ? 'config-option-card--locked' : ''}`}
                        style={
                          { '--option-color': colorVar } as React.CSSProperties
                        }
                        onClick={() =>
                          !disabled &&
                          !isLocked &&
                          handleMetricToggle(metric.key, !isEnabled)
                        }
                      >
                        <div className="config-option-card__checkbox">
                          <Checkbox
                            checked={isEnabled}
                            disabled={disabled || isLocked}
                          />
                        </div>
                        <div
                          className="config-option-card__icon"
                          style={{ color: isLocked ? '#d9d9d9' : colorVar }}
                        >
                          {METRIC_ICONS[metric.key]}
                        </div>
                        <div className="config-option-card__content">
                          <span className="config-option-card__label">
                            {metric.label}
                          </span>
                          <span className="config-option-card__unit">
                            {metric.unit}
                          </span>
                        </div>
                        {isLocked && (
                          <div className="config-option-card__lock">
                            <SafetyCertificateOutlined />
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {config.enabledMetrics.length === 0 && (
          <div
            className="config-warning config-warning--error"
            style={{ marginTop: 12, marginBottom: 0 }}
          >
            <SafetyCertificateOutlined />
            至少需要选择一个财务指标
          </div>
        )}
      </section>

      <hr className="config-divider" />

      {/* 配置预览 */}
      <section className="config-preview">
        <h4 className="config-preview__title">配置预览</h4>
        <div className="config-preview__tags">
          {config.enabledMetrics.map(key => {
            const metric = AVAILABLE_FINANCE_METRICS.find(m => m.key === key);
            if (!metric) return null;
            const colorVar = COLOR_TYPE_MAP[metric.colorType || 'income'];
            return (
              <Tag
                key={key}
                closable={!disabled}
                onClose={() => handleMetricToggle(key, false)}
                style={{
                  borderColor: colorVar,
                  color: colorVar,
                  background: `${colorVar}10`,
                }}
              >
                {metric.label}
              </Tag>
            );
          })}
          {config.enableFundsOccupation && (
            <Tag color="orange">
              资金占用费率: {config.fundsOccupationRate ?? 0.7}%/月
            </Tag>
          )}
          {config.enableSettlementFiles && (
            <Tag color="green">结算文件管理</Tag>
          )}
        </div>
      </section>

      {/* 底部计数 */}
      <div className="config-footer">
        <span className="config-footer__count">
          已启用 <strong>{enabledBasicCount}</strong> 个基础指标，
          <strong>{enabledAdvancedCount}</strong> 个高级指标
        </span>
      </div>
    </div>
  );
}

export default FinanceConfigEditor;
