/**
 * 数值/百分比区间筛选器
 * 通用组件，支持数值范围筛选，可选百分比显示
 */

export interface RangeFilterProps {
  label: string;
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  isPercentage?: boolean;
  placeholder?: { min?: string; max?: string };
}

export function RangeFilter({
  label,
  min,
  max,
  onChange,
  isPercentage = false,
  placeholder,
}: RangeFilterProps) {
  const suffix = isPercentage ? '%' : '';
  const minPlaceholder = placeholder?.min || `最小${suffix}`;
  const maxPlaceholder = placeholder?.max || `最大${suffix}`;

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-content-secondary">
        {label}
        {isPercentage && <span className="text-content-muted ml-1">(%)</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={min}
          onChange={e => onChange(e.target.value, max)}
          placeholder={minPlaceholder}
          className="flex-1 min-w-32 px-3 py-1.5 text-sm border border-stroke rounded-md bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-content-muted">-</span>
        <input
          type="number"
          value={max}
          onChange={e => onChange(min, e.target.value)}
          placeholder={maxPlaceholder}
          className="flex-1 min-w-32 px-3 py-1.5 text-sm border border-stroke rounded-md bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
