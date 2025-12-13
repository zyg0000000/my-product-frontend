/**
 * 日期范围筛选器
 * 通用组件，支持起始-结束日期选择
 */

export interface DateRangeFilterProps {
  label: string;
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}

export function DateRangeFilter({
  label,
  startDate,
  endDate,
  onChange,
}: DateRangeFilterProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-content-secondary">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={e => onChange(e.target.value, endDate)}
          className="flex-1 px-2 py-1.5 text-sm border border-stroke rounded-md bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-content-muted">-</span>
        <input
          type="date"
          value={endDate}
          onChange={e => onChange(startDate, e.target.value)}
          className="flex-1 px-2 py-1.5 text-sm border border-stroke rounded-md bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
