/**
 * 文本搜索筛选器
 * 通用组件，支持任意文本输入筛选
 */

export interface TextFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: TextFilterProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-content-secondary">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `搜索${label}...`}
        className="w-full px-3 py-1.5 text-sm border border-stroke rounded-md bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}
