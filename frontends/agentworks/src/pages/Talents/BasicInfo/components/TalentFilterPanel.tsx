/**
 * 达人筛选面板组件
 * 从 BasicInfo 拆分出来的独立组件
 *
 * v2.0 更新（2025-12-13）：
 * - 迁移到原生 HTML + Tailwind CSS
 * - 使用通用筛选器组件（TextFilter、EnumFilter、RangeFilter）
 * - 与 PerformanceFilters 和 AgencyFilterPanel 保持一致的样式
 */

import { useState, useMemo, useCallback } from 'react';
import {
  TextFilter,
  EnumFilter,
  RangeFilter,
} from '../../../../components/Filters';

export interface FilterState {
  searchTerm: string;
  selectedTags: string[];
  rebateMin: string;
  rebateMax: string;
  priceMin: string;
  priceMax: string;
  selectedCustomerId: string | null;
}

export interface TalentFilterPanelProps {
  // 筛选状态
  filterState: FilterState;
  onFilterChange: (
    key: keyof FilterState,
    value: FilterState[keyof FilterState]
  ) => void;

  // 可选项数据
  availableTags: string[];

  // 统计信息
  totalTalents: number;

  // 动作
  onSearch: () => void;
  onReset: () => void;
}

export function TalentFilterPanel({
  filterState,
  onFilterChange,
  availableTags,
  totalTalents,
  onSearch,
  onReset,
}: TalentFilterPanelProps) {
  // 控制面板展开/折叠（默认折叠）
  const [isExpanded, setIsExpanded] = useState(false);

  const { searchTerm, selectedTags, rebateMin, rebateMax, priceMin, priceMax } =
    filterState;

  // 计算激活的筛选条件数量
  // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedTags.length > 0) count++;
    const hasRebateMin = rebateMin !== undefined && rebateMin !== '';
    const hasRebateMax = rebateMax !== undefined && rebateMax !== '';
    if (hasRebateMin || hasRebateMax) count++;
    const hasPriceMin = priceMin !== undefined && priceMin !== '';
    const hasPriceMax = priceMax !== undefined && priceMax !== '';
    if (hasPriceMin || hasPriceMax) count++;
    return count;
  }, [
    searchTerm,
    selectedTags.length,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
  ]);

  const hasActiveFilters = activeFiltersCount > 0;

  // 内容标签选项（转换为 EnumFilter 格式）
  const tagOptions = useMemo(
    () => availableTags.map(tag => ({ value: tag, label: tag })),
    [availableTags]
  );

  // 生成已选筛选条件的标签列表
  const activeFilterTags = useMemo(() => {
    const tags: Array<{
      key: string;
      label: string;
      removeKey: keyof FilterState | 'tag' | 'rebate' | 'price';
      removeValue?: string;
    }> = [];

    // 搜索关键词
    if (searchTerm) {
      tags.push({
        key: 'searchTerm',
        label: `搜索: "${searchTerm}"`,
        removeKey: 'searchTerm',
      });
    }

    // 内容标签（每个标签单独一个）
    selectedTags.forEach(tag => {
      tags.push({
        key: `tag-${tag}`,
        label: `标签: ${tag}`,
        removeKey: 'tag',
        removeValue: tag,
      });
    });

    // 返点范围（注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值）
    const hasRebateMin = rebateMin !== undefined && rebateMin !== '';
    const hasRebateMax = rebateMax !== undefined && rebateMax !== '';
    if (hasRebateMin || hasRebateMax) {
      const rangeText =
        hasRebateMin && hasRebateMax
          ? `${rebateMin}% - ${rebateMax}%`
          : hasRebateMin
            ? `≥ ${rebateMin}%`
            : `≤ ${rebateMax}%`;
      tags.push({
        key: 'rebate',
        label: `返点: ${rangeText}`,
        removeKey: 'rebate',
      });
    }

    // 价格范围（注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值）
    const hasPriceMin = priceMin !== undefined && priceMin !== '';
    const hasPriceMax = priceMax !== undefined && priceMax !== '';
    if (hasPriceMin || hasPriceMax) {
      const rangeText =
        hasPriceMin && hasPriceMax
          ? `¥${priceMin} - ¥${priceMax}`
          : hasPriceMin
            ? `≥ ¥${priceMin}`
            : `≤ ¥${priceMax}`;
      tags.push({
        key: 'price',
        label: `价格: ${rangeText}`,
        removeKey: 'price',
      });
    }

    return tags;
  }, [searchTerm, selectedTags, rebateMin, rebateMax, priceMin, priceMax]);

  // 移除单个筛选标签
  const removeFilterTag = useCallback(
    (removeKey: string, value?: string) => {
      if (removeKey === 'tag' && value) {
        const newTags = selectedTags.filter(t => t !== value);
        onFilterChange('selectedTags', newTags);
      } else if (removeKey === 'rebate') {
        onFilterChange('rebateMin', '');
        onFilterChange('rebateMax', '');
      } else if (removeKey === 'price') {
        onFilterChange('priceMin', '');
        onFilterChange('priceMax', '');
      } else {
        onFilterChange(removeKey as keyof FilterState, '');
      }
    },
    [selectedTags, onFilterChange]
  );

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
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {activeFiltersCount}
            </span>
          )}
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
          {/* 左侧：筛选器面板 */}
          <div className="flex-1 p-4 border-r border-gray-100">
            <div className="space-y-4">
              {/* 第一行：搜索、价格范围、返点范围 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 搜索框 - 使用 TextFilter 组件 */}
                <TextFilter
                  label="搜索"
                  value={searchTerm}
                  onChange={value => onFilterChange('searchTerm', value)}
                  placeholder="按达人名称或OneID搜索..."
                />

                {/* 价格范围 - 使用 RangeFilter 组件 */}
                <RangeFilter
                  label="价格范围"
                  min={priceMin}
                  max={priceMax}
                  onChange={(min, max) => {
                    onFilterChange('priceMin', min);
                    onFilterChange('priceMax', max);
                  }}
                  placeholder={{ min: '最小价格', max: '最大价格' }}
                />

                {/* 返点范围 - 使用 RangeFilter 组件（百分比）*/}
                <RangeFilter
                  label="返点范围"
                  min={rebateMin}
                  max={rebateMax}
                  onChange={(min, max) => {
                    onFilterChange('rebateMin', min);
                    onFilterChange('rebateMax', max);
                  }}
                  isPercentage={true}
                />
              </div>

              {/* 第二行：内容标签 - 使用 EnumFilter 组件 */}
              {availableTags.length > 0 && (
                <div>
                  <EnumFilter
                    label="内容标签"
                    options={tagOptions}
                    selected={selectedTags}
                    onChange={value => onFilterChange('selectedTags', value)}
                  />
                </div>
              )}
            </div>
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
                {activeFilterTags.map(tag => (
                  <span
                    key={tag.key}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface border border-stroke rounded-md text-sm"
                  >
                    <span className="text-content-secondary">{tag.label}</span>
                    <button
                      onClick={() =>
                        removeFilterTag(tag.removeKey, tag.removeValue)
                      }
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
                  <div>已选择 {activeFiltersCount} 个筛选条件</div>
                  <div className="mt-1">
                    符合条件的达人：
                    <span className="font-medium text-primary-600 ml-1">
                      {totalTalents}
                    </span>{' '}
                    个
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
