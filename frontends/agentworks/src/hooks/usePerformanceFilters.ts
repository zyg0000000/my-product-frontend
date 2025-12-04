/**
 * Performance 页面筛选 Hook
 * 从维度配置中提取可筛选的维度，管理筛选状态
 */

import { useState, useMemo, useCallback } from 'react';
import type { DimensionConfig } from '../api/performance';

// 筛选值类型
export interface FilterValue {
  // 文本搜索
  text?: string;
  // 枚举多选
  selected?: string[];
  // 数值/百分比区间
  min?: string;
  max?: string;
}

// 筛选状态
export interface PerformanceFilters {
  [dimensionId: string]: FilterValue;
}

// 可筛选维度（带筛选配置）
export interface FilterableDimension extends DimensionConfig {
  filterable: true;
  filterType: 'text' | 'range' | 'enum';
  filterOrder: number;
}

// Hook 返回值
export interface UsePerformanceFiltersResult {
  // 可筛选的维度列表（按 filterOrder 排序）
  filterableDimensions: FilterableDimension[];
  // 按分类分组的可筛选维度
  filtersByCategory: Record<string, FilterableDimension[]>;
  // 当前筛选状态
  filters: PerformanceFilters;
  // 是否有任何筛选条件激活
  hasActiveFilters: boolean;
  // 激活的筛选数量
  activeFilterCount: number;
  // 更新单个筛选值
  updateFilter: (dimensionId: string, value: FilterValue) => void;
  // 重置所有筛选
  resetFilters: () => void;
  // 构建 API 查询参数
  buildQueryParams: () => Record<string, any>;
}

/**
 * 从维度配置中提取可筛选维度，管理筛选状态
 */
export function usePerformanceFilters(
  dimensions: DimensionConfig[]
): UsePerformanceFiltersResult {
  // 筛选状态
  const [filters, setFilters] = useState<PerformanceFilters>({});

  // 提取可筛选维度
  const filterableDimensions = useMemo(() => {
    return dimensions
      .filter(
        (d): d is FilterableDimension =>
          d.filterable === true &&
          d.filterType !== undefined &&
          d.filterOrder !== undefined
      )
      .sort((a, b) => a.filterOrder - b.filterOrder);
  }, [dimensions]);

  // 按分类分组
  const filtersByCategory = useMemo(() => {
    const grouped: Record<string, FilterableDimension[]> = {};

    filterableDimensions.forEach(dim => {
      const category = dim.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(dim);
    });

    return grouped;
  }, [filterableDimensions]);

  // 计算是否有激活的筛选
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;

    Object.entries(filters).forEach(([dimId, value]) => {
      const dim = filterableDimensions.find(d => d.id === dimId);
      if (!dim) return;

      switch (dim.filterType) {
        case 'text':
          if (value.text && value.text.trim()) count++;
          break;
        case 'enum':
          if (value.selected && value.selected.length > 0) count++;
          break;
        case 'range':
          if (value.min || value.max) count++;
          break;
      }
    });

    return {
      hasActiveFilters: count > 0,
      activeFilterCount: count,
    };
  }, [filters, filterableDimensions]);

  // 更新单个筛选值
  const updateFilter = useCallback(
    (dimensionId: string, value: FilterValue) => {
      setFilters(prev => ({
        ...prev,
        [dimensionId]: value,
      }));
    },
    []
  );

  // 重置所有筛选
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // 构建 API 查询参数
  const buildQueryParams = useCallback(() => {
    const params: Record<string, any> = {};

    Object.entries(filters).forEach(([dimId, value]) => {
      const dim = filterableDimensions.find(d => d.id === dimId);
      if (!dim) return;

      switch (dim.filterType) {
        case 'text':
          if (value.text && value.text.trim()) {
            // 文本搜索：使用 searchTerm 参数
            if (dimId === 'name') {
              params.searchTerm = value.text.trim();
            } else {
              // 其他文本字段可以扩展
              params[`filter_${dimId}`] = value.text.trim();
            }
          }
          break;

        case 'enum':
          if (value.selected && value.selected.length > 0) {
            // 枚举筛选：根据字段映射到后端参数
            if (dimId === 'talentType') {
              params.types = value.selected;
            } else {
              params[`filter_${dimId}`] = value.selected;
            }
          }
          break;

        case 'range':
          // 数值/百分比区间
          if (value.min) {
            const minKey = `${dimId}Min`;
            params[minKey] =
              dim.type === 'percentage'
                ? parseFloat(value.min) / 100 // 百分比转小数
                : parseFloat(value.min);
          }
          if (value.max) {
            const maxKey = `${dimId}Max`;
            params[maxKey] =
              dim.type === 'percentage'
                ? parseFloat(value.max) / 100
                : parseFloat(value.max);
          }
          break;
      }
    });

    return params;
  }, [filters, filterableDimensions]);

  return {
    filterableDimensions,
    filtersByCategory,
    filters,
    hasActiveFilters,
    activeFilterCount,
    updateFilter,
    resetFilters,
    buildQueryParams,
  };
}
