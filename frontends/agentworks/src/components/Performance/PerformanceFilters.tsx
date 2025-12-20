/**
 * Performance 页面筛选面板组件
 * 根据 dimension_configs 中的筛选配置动态渲染筛选器
 *
 * 排序规则：
 * - 分类按其中最小的 filterOrder 排序（分类出现越早）
 * - 分类内的筛选器按 filterOrder 排序
 *
 * 布局：
 * - 左侧：筛选器分类折叠面板
 * - 右侧：已选筛选条件标签展示
 *
 * v2.0 更新（2025-12-13）：
 * - 使用通用筛选器组件（TextFilter、EnumFilter、RangeFilter）
 * - 删除内部子组件定义，减少代码重复
 */

import { useState, useMemo, useEffect } from 'react';
import type {
  FilterValue,
  FilterableDimension,
  PerformanceFilters as FiltersType,
} from '../../hooks/usePerformanceFilters';
import { getTalentFilterOptions } from '../../api/talent';
import { TextFilter, EnumFilter, RangeFilter } from '../Filters';

interface PerformanceFiltersProps {
  // 可筛选的维度列表（已按 filterOrder 排序）
  filterableDimensions: FilterableDimension[];
  // 按分类分组的维度
  filtersByCategory: Record<string, FilterableDimension[]>;
  // 当前筛选状态
  filters: FiltersType;
  // 是否有激活的筛选
  hasActiveFilters: boolean;
  // 激活的筛选数量
  activeFilterCount: number;
  // 更新筛选
  onFilterChange: (dimensionId: string, value: FilterValue) => void;
  // 重置筛选
  onReset: () => void;
  // 执行搜索
  onSearch: () => void;
}

// 已选筛选条件的标签信息
interface ActiveFilterTag {
  dimensionId: string;
  dimensionName: string;
  label: string; // 显示的标签文本
  type: 'text' | 'range' | 'enum';
}

export function PerformanceFilters({
  filterableDimensions,
  filtersByCategory,
  filters,
  hasActiveFilters,
  activeFilterCount,
  onFilterChange,
  onReset,
  onSearch,
}: PerformanceFiltersProps) {
  // 控制面板展开/折叠（默认折叠）
  const [isExpanded, setIsExpanded] = useState(false);
  // 控制各分类展开状态（默认只展开"基础信息"）
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(() => {
    // 初始化：只有"基础信息"展开，其他折叠
    const initial: Record<string, boolean> = {};
    Object.keys(filtersByCategory).forEach(category => {
      initial[category] = category === '基础信息';
    });
    return initial;
  });

  // 按 filterOrder 排序的分类列表
  // 每个分类的排序值 = 该分类中最小的 filterOrder
  const sortedCategories = useMemo(() => {
    const categoryMinOrder: Record<string, number> = {};

    // 计算每个分类的最小 filterOrder
    Object.entries(filtersByCategory).forEach(([category, dims]) => {
      const minOrder = Math.min(...dims.map(d => d.filterOrder));
      categoryMinOrder[category] = minOrder;
    });

    // 按最小 filterOrder 排序分类
    return Object.keys(filtersByCategory).sort(
      (a, b) => categoryMinOrder[a] - categoryMinOrder[b]
    );
  }, [filtersByCategory]);

  // 生成已选筛选条件的标签列表
  const activeFilterTags = useMemo(() => {
    const tags: ActiveFilterTag[] = [];

    Object.entries(filters).forEach(([dimId, value]) => {
      const dim = filterableDimensions.find(d => d.id === dimId);
      if (!dim) return;

      switch (dim.filterType) {
        case 'text':
          if (value.text && value.text.trim()) {
            tags.push({
              dimensionId: dimId,
              dimensionName: dim.name,
              label: `${dim.name}: "${value.text.trim()}"`,
              type: 'text',
            });
          }
          break;
        case 'enum':
          if (value.selected && value.selected.length > 0) {
            value.selected.forEach(sel => {
              tags.push({
                dimensionId: dimId,
                dimensionName: dim.name,
                label: `${dim.name}: ${sel}`,
                type: 'enum',
              });
            });
          }
          break;
        case 'range': {
          // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
          const hasMin = value.min !== undefined && value.min !== '';
          const hasMax = value.max !== undefined && value.max !== '';
          if (hasMin || hasMax) {
            const isPercentage = dim.type === 'percentage';
            const suffix = isPercentage ? '%' : '';
            let rangeText = '';
            if (hasMin && hasMax) {
              rangeText = `${value.min}${suffix} - ${value.max}${suffix}`;
            } else if (hasMin) {
              rangeText = `≥ ${value.min}${suffix}`;
            } else if (hasMax) {
              rangeText = `≤ ${value.max}${suffix}`;
            }
            tags.push({
              dimensionId: dimId,
              dimensionName: dim.name,
              label: `${dim.name}: ${rangeText}`,
              type: 'range',
            });
          }
          break;
        }
      }
    });

    return tags;
  }, [filters, filterableDimensions]);

  // 移除单个筛选标签
  const removeFilterTag = (tag: ActiveFilterTag) => {
    const currentValue = filters[tag.dimensionId] || {};

    switch (tag.type) {
      case 'text':
        onFilterChange(tag.dimensionId, { ...currentValue, text: '' });
        break;
      case 'enum': {
        // 从 selected 数组中移除对应的值
        const labelParts = tag.label.split(': ');
        const valueToRemove = labelParts[1];
        const newSelected = (currentValue.selected || []).filter(
          s => s !== valueToRemove
        );
        onFilterChange(tag.dimensionId, {
          ...currentValue,
          selected: newSelected,
        });
        break;
      }
      case 'range':
        onFilterChange(tag.dimensionId, { ...currentValue, min: '', max: '' });
        break;
    }
  };

  // 切换分类展开状态
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 检查分类是否展开
  const isCategoryExpanded = (category: string) => {
    // 如果没有设置过，基础信息默认展开，其他默认折叠
    if (expandedCategories[category] === undefined) {
      return category === '基础信息';
    }
    return expandedCategories[category];
  };

  // 渲染单个筛选器（使用通用组件）
  const renderFilter = (dim: FilterableDimension) => {
    const value = filters[dim.id] || {};

    switch (dim.filterType) {
      case 'text':
        return (
          <TextFilter
            key={dim.id}
            label={dim.name}
            value={value.text || ''}
            onChange={text => onFilterChange(dim.id, { ...value, text })}
            placeholder={`搜索${dim.name}...`}
          />
        );

      case 'enum':
        return (
          <PerformanceEnumFilter
            key={dim.id}
            dimension={dim}
            selected={value.selected || []}
            onChange={selected =>
              onFilterChange(dim.id, { ...value, selected })
            }
          />
        );

      case 'range':
        return (
          <RangeFilter
            key={dim.id}
            label={dim.name}
            min={value.min || ''}
            max={value.max || ''}
            onChange={(min, max) =>
              onFilterChange(dim.id, { ...value, min, max })
            }
            isPercentage={dim.type === 'percentage'}
          />
        );

      default:
        return null;
    }
  };

  if (filterableDimensions.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-lg shadow mb-4 overflow-hidden">
      {/* 筛选面板头部 */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-base ${!isExpanded ? 'rounded-lg' : 'rounded-t-lg border-b'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-content-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="font-medium text-content">筛选条件</span>
        </div>
        <div
          className="flex items-center gap-2"
          onClick={e => e.stopPropagation()}
        >
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-3 py-1 text-sm text-content-secondary hover:text-content hover:bg-surface-sunken rounded"
            >
              重置
            </button>
          )}
          <button
            onClick={onSearch}
            className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 筛选内容区域 - 左右双列布局 */}
      {isExpanded && (
        <div className="flex">
          {/* 左侧：筛选器分类面板 */}
          <div className="flex-1 p-4 border-r border-gray-100">
            {sortedCategories.map(category => (
              <div key={category} className="mb-4 last:mb-0">
                {/* 分类标题 */}
                <div
                  className="flex items-center gap-2 mb-3 cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  <svg
                    className={`w-4 h-4 text-content-muted transition-transform ${isCategoryExpanded(category) ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="text-sm font-medium text-content-secondary">
                    {category}
                  </span>
                </div>

                {/* 分类下的筛选器（按 filterOrder 排序）*/}
                {isCategoryExpanded(category) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-6">
                    {filtersByCategory[category]
                      .sort((a, b) => a.filterOrder - b.filterOrder)
                      .map(renderFilter)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 右侧：已选条件展示 */}
          <div className="w-96 p-4 bg-surface-base">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-content-secondary">
                已选条件
              </span>
              {hasActiveFilters && (
                <button
                  onClick={onReset}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  清空全部
                </button>
              )}
            </div>

            {activeFilterTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeFilterTags.map((tag, index) => (
                  <span
                    key={`${tag.dimensionId}-${index}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface border border-stroke rounded-md text-sm"
                  >
                    <span className="text-content-secondary">{tag.label}</span>
                    <button
                      onClick={() => removeFilterTag(tag)}
                      className="ml-1 text-content-muted hover:text-content-secondary"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-content-muted">
                暂无筛选条件，请在左侧选择
              </div>
            )}

            {/* 筛选统计信息 */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-stroke">
                <div className="text-xs text-content-muted">
                  <div>已选择 {activeFilterCount} 个筛选条件</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Performance 专用枚举筛选器（保留特殊的动态加载逻辑）
 * 支持动态从 API 加载选项（talentType）
 *
 * 注：内部使用通用 EnumFilter 组件，只添加动态加载逻辑层
 */
function PerformanceEnumFilter({
  dimension,
  selected,
  onChange,
}: {
  dimension: FilterableDimension;
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [dynamicOptions, setDynamicOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 判断是否需要动态加载（仅 talentType 需要从 API 获取选项）
  const needsDynamicLoad =
    dimension.id === 'talentType' ||
    dimension.targetPath?.includes('talentType');

  // 动态加载选项
  useEffect(() => {
    if (!needsDynamicLoad) return;

    const loadOptions = async () => {
      setLoading(true);
      try {
        const res = await getTalentFilterOptions('v2');
        if (res.success && res.data) {
          if (
            dimension.id === 'talentType' ||
            dimension.targetPath?.includes('talentType')
          ) {
            setDynamicOptions(res.data.types || []);
          }
        }
      } catch {
        // 加载失败时使用配置中的静态选项
        setDynamicOptions(dimension.filterOptions || []);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [
    dimension.id,
    dimension.targetPath,
    dimension.filterOptions,
    needsDynamicLoad,
  ]);

  // 优先使用动态加载的选项，否则使用配置中的静态选项
  const finalOptions = needsDynamicLoad
    ? dynamicOptions
    : dimension.filterOptions || [];

  // 转换为 EnumFilter 需要的格式
  const enumOptions = finalOptions.map(opt => ({ value: opt, label: opt }));

  // 加载中显示
  if (loading) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-content-secondary">
          {dimension.name}
        </label>
        <span className="text-xs text-content-muted">加载中...</span>
      </div>
    );
  }

  // 使用通用 EnumFilter 组件
  return (
    <EnumFilter
      label={dimension.name}
      options={enumOptions}
      selected={selected}
      onChange={onChange}
    />
  );
}
