/**
 * 机构筛选面板组件
 * 与 PerformanceFilters 保持一致的样式和布局（组件复用模式）
 */

import { useState, useMemo } from 'react';
import {
  AGENCY_TYPE_NAMES,
  AGENCY_STATUS_NAMES,
} from '../../../../types/agency';
import type { AgencyType, AgencyStatus } from '../../../../types/agency';
import {
  TextFilter,
  EnumFilter,
  DateRangeFilter,
} from '../../../../components/Filters';

/**
 * 筛选状态接口
 */
export interface AgencyFilterState {
  searchTerm: string;
  selectedTypes: AgencyType[];
  selectedStatuses: AgencyStatus[];
  contactPerson: string;
  phoneNumber: string;
  createdAfter: string;
  createdBefore: string;
}

/**
 * 组件 Props
 */
export interface AgencyFilterPanelProps {
  filterState: AgencyFilterState;
  onFilterChange: (
    key: keyof AgencyFilterState,
    value: AgencyFilterState[keyof AgencyFilterState]
  ) => void;
  totalAgencies: number;
  onSearch: () => void;
  onReset: () => void;
}

export function AgencyFilterPanel({
  filterState,
  onFilterChange,
  totalAgencies,
  onSearch,
  onReset,
}: AgencyFilterPanelProps) {
  // 控制面板展开/折叠（默认折叠）
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    searchTerm,
    selectedTypes,
    selectedStatuses,
    contactPerson,
    phoneNumber,
    createdAfter,
    createdBefore,
  } = filterState;

  // 计算激活的筛选条件数量
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedTypes.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (contactPerson) count++;
    if (phoneNumber) count++;
    if (createdAfter || createdBefore) count++;
    return count;
  }, [
    searchTerm,
    selectedTypes,
    selectedStatuses,
    contactPerson,
    phoneNumber,
    createdAfter,
    createdBefore,
  ]);

  const hasActiveFilters = activeFiltersCount > 0;

  // 生成已选筛选条件的标签列表
  const activeFilterTags = useMemo(() => {
    const tags: Array<{
      key: string;
      label: string;
      removeKey: keyof AgencyFilterState;
    }> = [];

    if (searchTerm) {
      tags.push({
        key: 'searchTerm',
        label: `搜索: "${searchTerm}"`,
        removeKey: 'searchTerm',
      });
    }

    if (selectedTypes.length > 0) {
      selectedTypes.forEach(type => {
        tags.push({
          key: `type-${type}`,
          label: `类型: ${AGENCY_TYPE_NAMES[type]}`,
          removeKey: 'selectedTypes',
        });
      });
    }

    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach(status => {
        tags.push({
          key: `status-${status}`,
          label: `状态: ${AGENCY_STATUS_NAMES[status]}`,
          removeKey: 'selectedStatuses',
        });
      });
    }

    if (contactPerson) {
      tags.push({
        key: 'contactPerson',
        label: `联系人: "${contactPerson}"`,
        removeKey: 'contactPerson',
      });
    }

    if (phoneNumber) {
      tags.push({
        key: 'phoneNumber',
        label: `电话: ${phoneNumber}`,
        removeKey: 'phoneNumber',
      });
    }

    if (createdAfter || createdBefore) {
      const rangeText =
        createdAfter && createdBefore
          ? `${createdAfter} - ${createdBefore}`
          : createdAfter
            ? `≥ ${createdAfter}`
            : `≤ ${createdBefore}`;
      tags.push({
        key: 'dateRange',
        label: `创建时间: ${rangeText}`,
        removeKey: 'createdAfter',
      });
    }

    return tags;
  }, [
    searchTerm,
    selectedTypes,
    selectedStatuses,
    contactPerson,
    phoneNumber,
    createdAfter,
    createdBefore,
  ]);

  // 机构类型选项
  const typeOptions = useMemo(
    () =>
      Object.entries(AGENCY_TYPE_NAMES).map(([value, label]) => ({
        value: value as AgencyType,
        label,
      })),
    []
  );

  // 机构状态选项
  const statusOptions = useMemo(
    () =>
      Object.entries(AGENCY_STATUS_NAMES).map(([value, label]) => ({
        value: value as AgencyStatus,
        label,
      })),
    []
  );

  // 移除单个筛选标签
  const removeFilterTag = (removeKey: keyof AgencyFilterState) => {
    if (removeKey === 'selectedTypes' || removeKey === 'selectedStatuses') {
      onFilterChange(removeKey, []);
    } else if (removeKey === 'createdAfter') {
      onFilterChange('createdAfter', '');
      onFilterChange('createdBefore', '');
    } else {
      onFilterChange(removeKey, '');
    }
  };

  return (
    <div className="bg-surface rounded-lg shadow mb-4">
      {/* 筛选面板头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-surface-base"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 机构名称搜索 - 使用 TextFilter 组件 */}
              <TextFilter
                label="机构名称"
                value={searchTerm}
                onChange={value => onFilterChange('searchTerm', value)}
                placeholder="搜索机构名称..."
              />

              {/* 机构类型 - 使用 EnumFilter 组件 */}
              <EnumFilter<AgencyType>
                label="机构类型"
                options={typeOptions}
                selected={selectedTypes}
                onChange={value => onFilterChange('selectedTypes', value)}
              />

              {/* 机构状态 - 使用 EnumFilter 组件 */}
              <EnumFilter<AgencyStatus>
                label="机构状态"
                options={statusOptions}
                selected={selectedStatuses}
                onChange={value => onFilterChange('selectedStatuses', value)}
              />

              {/* 联系人姓名 - 使用 TextFilter 组件 */}
              <TextFilter
                label="联系人姓名"
                value={contactPerson}
                onChange={value => onFilterChange('contactPerson', value)}
                placeholder="输入联系人姓名..."
              />

              {/* 电话号码 - 使用 TextFilter 组件 */}
              <TextFilter
                label="电话号码"
                value={phoneNumber}
                onChange={value => onFilterChange('phoneNumber', value)}
                placeholder="输入电话号码..."
              />

              {/* 创建时间范围 - 使用 DateRangeFilter 组件 */}
              <DateRangeFilter
                label="创建时间"
                startDate={createdAfter}
                endDate={createdBefore}
                onChange={(start, end) => {
                  onFilterChange('createdAfter', start);
                  onFilterChange('createdBefore', end);
                }}
              />
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
                      onClick={() => removeFilterTag(tag.removeKey)}
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
                    符合条件的机构：
                    <span className="font-medium text-primary-600 ml-1">
                      {totalAgencies}
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
