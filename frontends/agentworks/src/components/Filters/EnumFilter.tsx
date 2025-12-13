/**
 * 枚举多选筛选器
 * 通用组件，支持多个选项的圆形按钮组选择
 */

export interface EnumFilterProps<T extends string = string> {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (selected: T[]) => void;
}

export function EnumFilter<T extends string = string>({
  label,
  options,
  selected,
  onChange,
}: EnumFilterProps<T>) {
  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-content-secondary">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.length > 0 ? (
          options.map(option => (
            <button
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selected.includes(option.value)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface text-content-secondary border-stroke hover:border-primary-400'
              }`}
            >
              {option.label}
            </button>
          ))
        ) : (
          <span className="text-xs text-content-muted">暂无选项</span>
        )}
      </div>
    </div>
  );
}
