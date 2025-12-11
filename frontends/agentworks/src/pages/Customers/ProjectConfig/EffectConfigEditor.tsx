/**
 * 效果验收配置编辑器
 * 配置效果验收的数据周期和指标列
 */

import { Card, Checkbox, InputNumber, Divider, Tag } from 'antd';
import type {
  EffectTabConfig,
  EffectPeriod,
} from '../../../types/projectConfig';
import {
  AVAILABLE_EFFECT_METRICS,
  EFFECT_PERIOD_OPTIONS,
} from '../../../types/projectConfig';

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

  return (
    <div
      className={`p-4 space-y-6 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {disabled && (
        <div className="text-orange-500 text-sm bg-orange-50 p-3 rounded-lg">
          效果验收 Tab 已关闭，请先在「Tab 显示配置」中开启
        </div>
      )}

      {/* 数据周期配置 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">数据周期</h4>
        <p className="text-xs text-gray-500 mb-3">
          选择需要录入效果数据的时间维度
        </p>
        <div className="flex gap-4">
          {EFFECT_PERIOD_OPTIONS.map(period => (
            <Card
              key={period.key}
              size="small"
              className={`cursor-pointer transition-all min-w-[120px] ${
                config.enabledPeriods.includes(period.key)
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() =>
                !disabled &&
                handlePeriodToggle(
                  period.key,
                  !config.enabledPeriods.includes(period.key)
                )
              }
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={config.enabledPeriods.includes(period.key)}
                  disabled={disabled}
                />
                <span className="font-medium">{period.label}</span>
              </div>
            </Card>
          ))}
        </div>
        {config.enabledPeriods.length === 0 && (
          <div className="text-orange-500 text-xs mt-2">
            至少需要选择一个数据周期
          </div>
        )}
      </div>

      <Divider />

      {/* 指标列配置 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">显示指标列</h4>
        <p className="text-xs text-gray-500 mb-3">
          选择需要在效果验收页面显示的数据指标
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {AVAILABLE_EFFECT_METRICS.map(metric => {
            const isEnabled = config.enabledMetrics.includes(metric.key);
            return (
              <Card
                key={metric.key}
                size="small"
                className={`cursor-pointer transition-all ${
                  isEnabled
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() =>
                  !disabled && handleMetricToggle(metric.key, !isEnabled)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isEnabled} disabled={disabled} />
                    <span className="font-medium text-sm">{metric.label}</span>
                  </div>
                  {metric.unit && (
                    <Tag color="default" className="text-xs m-0">
                      {metric.unit}
                    </Tag>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        {config.enabledMetrics.length === 0 && (
          <div className="text-orange-500 text-xs mt-2">
            至少需要选择一个效果指标
          </div>
        )}
      </div>

      <Divider />

      {/* 基准值配置 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">默认基准值</h4>
        <p className="text-xs text-gray-500 mb-4">
          设置效果评估的基准值，用于达成率计算（创建项目时可覆盖）
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {config.enabledMetrics
            .filter(key => ['cpm', 'cpe', 'roi'].includes(key))
            .map(key => {
              const metric = AVAILABLE_EFFECT_METRICS.find(m => m.key === key);
              if (!metric) return null;
              return (
                <div key={key}>
                  <label className="text-sm text-gray-600 block mb-1">
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
          {!config.enabledMetrics.some(k =>
            ['cpm', 'cpe', 'roi'].includes(k)
          ) && (
            <div className="col-span-full text-gray-400 text-sm">
              选择 CPM、CPE 或 ROI 指标后可配置基准值
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
