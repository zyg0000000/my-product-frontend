/**
 * 通用筛选渲染器
 *
 * 根据 FilterConfig 配置动态渲染不同类型的筛选器：
 * - text: 文本搜索输入框
 * - enum: 枚举多选（标签点击式）
 * - range: 数值/百分比区间输入
 * - date: 日期范围选择
 * - custom: 自定义渲染器
 */

import { useState, useEffect, useMemo } from 'react';
import { Input, DatePicker, Spin, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { FilterConfig, FilterValue } from '../../types/filterModule';

const { RangePicker } = DatePicker;

interface FilterRendererProps {
  /** 筛选配置 */
  config: FilterConfig;
  /** 当前值 */
  value: FilterValue;
  /** 值变化回调 */
  onChange: (value: FilterValue) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 筛选渲染器主组件
 */
export function FilterRenderer({
  config,
  value,
  onChange,
  disabled = false,
}: FilterRendererProps) {
  // 如果有自定义渲染器，优先使用
  if (config.customRenderer) {
    const CustomRenderer = config.customRenderer;
    return (
      <CustomRenderer
        config={config}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  // 根据类型渲染不同的筛选器
  switch (config.type) {
    case 'text':
      return (
        <TextFilter
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'enum':
      return (
        <EnumFilter
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'range':
      return (
        <RangeFilter
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'date':
      return (
        <DateFilter
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'compound':
      return (
        <CompoundFilter
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}

/**
 * 文本搜索筛选器
 */
function TextFilter({
  config,
  value,
  onChange,
  disabled,
}: FilterRendererProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {config.name}
      </label>
      <Input
        value={value?.text || ''}
        onChange={e => onChange({ ...value, text: e.target.value })}
        placeholder={config.placeholder || `搜索${config.name}...`}
        prefix={<SearchOutlined className="text-gray-400" />}
        disabled={disabled}
        allowClear
        className="w-full"
      />
    </div>
  );
}

/**
 * 枚举多选筛选器
 */
function EnumFilter({
  config,
  value,
  onChange,
  disabled,
}: FilterRendererProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载选项
  useEffect(() => {
    const loadOptions = async () => {
      if (!config.enumOptions) {
        setOptions([]);
        return;
      }

      // 静态数组
      if (Array.isArray(config.enumOptions)) {
        setOptions(config.enumOptions);
        return;
      }

      // 动态加载函数
      setLoading(true);
      try {
        const loadedOptions = await config.enumOptions();
        setOptions(loadedOptions);
      } catch (error) {
        console.error('Failed to load enum options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [config.enumOptions]);

  const selected = useMemo(() => value?.selected || [], [value?.selected]);

  const toggleOption = (option: string) => {
    if (disabled) return;

    const isMultiple = config.multiple !== false; // 默认多选
    let newSelected: string[];

    if (isMultiple) {
      if (selected.includes(option)) {
        newSelected = selected.filter(s => s !== option);
      } else {
        newSelected = [...selected, option];
      }
    } else {
      // 单选模式
      newSelected = selected.includes(option) ? [] : [option];
    }

    onChange({ ...value, selected: newSelected });
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {config.name}
      </label>
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <Spin size="small" />
        ) : options.length > 0 ? (
          options.map(option => (
            <button
              key={option}
              onClick={() => toggleOption(option)}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selected.includes(option)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface text-content-secondary border-stroke hover:border-primary-400'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          ))
        ) : (
          <span className="text-xs text-gray-400">暂无选项</span>
        )}
      </div>
    </div>
  );
}

/**
 * 数值/百分比区间筛选器
 */
function RangeFilter({
  config,
  value,
  onChange,
  disabled,
}: FilterRendererProps) {
  const { rangeConfig } = config;
  const isPercentage = rangeConfig?.isPercentage;
  const unit = rangeConfig?.unit || '';

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {config.name}
        {unit && <span className="text-gray-400 ml-1">({unit})</span>}
      </label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value?.min || ''}
          onChange={e => onChange({ ...value, min: e.target.value })}
          placeholder={`最小${isPercentage ? '' : unit}`}
          disabled={disabled}
          min={rangeConfig?.min}
          max={rangeConfig?.max}
          step={rangeConfig?.step}
          className="w-20"
        />
        <span className="text-gray-400">-</span>
        <Input
          type="number"
          value={value?.max || ''}
          onChange={e => onChange({ ...value, max: e.target.value })}
          placeholder={`最大${isPercentage ? '' : unit}`}
          disabled={disabled}
          min={rangeConfig?.min}
          max={rangeConfig?.max}
          step={rangeConfig?.step}
          className="w-20"
        />
      </div>
    </div>
  );
}

/**
 * 日期范围筛选器
 */
function DateFilter({
  config,
  value,
  onChange,
  disabled,
}: FilterRendererProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {config.name}
      </label>
      <RangePicker
        value={
          value?.dateRange
            ? [
                value.dateRange[0] ? undefined : undefined,
                value.dateRange[1] ? undefined : undefined,
              ]
            : undefined
        }
        onChange={(_, dateStrings) => {
          onChange({
            ...value,
            dateRange:
              dateStrings[0] && dateStrings[1]
                ? [dateStrings[0], dateStrings[1]]
                : undefined,
          });
        }}
        disabled={disabled}
        placeholder={['开始日期', '结束日期']}
        className="w-full"
      />
    </div>
  );
}

/**
 * 复合筛选器
 * 支持"选择器 + 子筛选"模式，如：选择价格档位 + 输入价格范围
 */
function CompoundFilter({
  config,
  value,
  onChange,
  disabled,
}: FilterRendererProps) {
  const { compoundConfig } = config;

  if (!compoundConfig) {
    return null;
  }

  const { selector, subFilter } = compoundConfig;
  const options = selector.options || [];

  // 当前选择器值，默认为第一个选项或配置的默认值
  const currentSelectorValue =
    value?.selectorValue || selector.defaultValue || options[0]?.key || '';

  // 处理选择器变化
  const handleSelectorChange = (newKey: string) => {
    onChange({
      ...value,
      selectorValue: newKey,
    });
  };

  // 处理子筛选器变化（范围值）
  const handleSubFilterChange = (field: 'min' | 'max', newValue: string) => {
    onChange({
      ...value,
      selectorValue: currentSelectorValue, // 确保选择器值始终存在
      [field]: newValue,
    });
  };

  // 渲染子筛选器
  const renderSubFilter = () => {
    if (subFilter.type === 'range') {
      const rangeConfig = subFilter.config;
      const unit = rangeConfig?.unit || '';
      const isPercentage = rangeConfig?.isPercentage;

      return (
        <div className="flex items-center gap-2 flex-1">
          <Input
            type="number"
            value={value?.min || ''}
            onChange={e => handleSubFilterChange('min', e.target.value)}
            placeholder={`最小${isPercentage ? '' : unit}`}
            disabled={disabled}
            min={rangeConfig?.min}
            max={rangeConfig?.max}
            step={rangeConfig?.step}
            className="w-20"
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            value={value?.max || ''}
            onChange={e => handleSubFilterChange('max', e.target.value)}
            placeholder={`最大${isPercentage ? '' : unit}`}
            disabled={disabled}
            min={rangeConfig?.min}
            max={rangeConfig?.max}
            step={rangeConfig?.step}
            className="w-20"
          />
          {unit && <span className="text-gray-400 text-xs">{unit}</span>}
        </div>
      );
    }

    if (subFilter.type === 'text') {
      return (
        <Input
          value={value?.text || ''}
          onChange={e =>
            onChange({
              ...value,
              selectorValue: currentSelectorValue,
              text: e.target.value,
            })
          }
          placeholder={config.placeholder || '请输入...'}
          disabled={disabled}
          allowClear
          className="flex-1"
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {config.name}
      </label>
      <div className="flex items-center gap-2">
        {/* 选择器 */}
        <Select
          value={currentSelectorValue}
          onChange={handleSelectorChange}
          disabled={disabled || options.length === 0}
          placeholder={selector.placeholder || '请选择'}
          style={{ minWidth: 100 }}
          size="middle"
          options={options.map(opt => ({
            value: opt.key,
            label: opt.label,
          }))}
        />
        {/* 子筛选器 */}
        {renderSubFilter()}
      </div>
    </div>
  );
}

export default FilterRenderer;
