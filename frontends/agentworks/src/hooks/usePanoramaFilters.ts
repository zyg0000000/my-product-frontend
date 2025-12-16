/**
 * 达人全景筛选 Hook
 *
 * 管理所有筛选模块的状态和行为：
 * - 模块注册和启用控制
 * - 筛选配置动态加载
 * - 筛选状态统一管理
 * - 联动逻辑处理
 * - 查询参数构建
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  FilterModule,
  FilterConfig,
  FilterValue,
  FilterState,
  FilterContext,
  ViewMode,
  UsePanoramaFiltersResult,
} from '../types/filterModule';
import type { Platform } from '../types/talent';

interface UsePanoramaFiltersOptions {
  /** 筛选模块列表 */
  modules: FilterModule[];
  /** 当前平台（用于加载平台特定的筛选配置） */
  platform?: Platform;
  /** 当前视角模式 */
  viewMode?: ViewMode;
  /** 选中的客户ID列表（客户视角时使用） */
  customerIds?: string[];
  /** 初始筛选状态 */
  initialFilters?: FilterState;
}

/**
 * 达人全景筛选 Hook
 */
export function usePanoramaFilters({
  modules,
  platform,
  viewMode = 'all',
  customerIds,
  initialFilters = {},
}: UsePanoramaFiltersOptions): UsePanoramaFiltersResult {
  // 筛选状态
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  // 配置加载状态
  const [loading, setLoading] = useState(true);
  // 已加载的筛选配置
  const [loadedConfigs, setLoadedConfigs] = useState<
    Record<string, FilterConfig[]>
  >({});

  // 获取启用的模块（按 order 排序）
  const enabledModules = useMemo(
    () => modules.filter(m => m.enabled).sort((a, b) => a.order - b.order),
    [modules]
  );

  // 加载所有模块的筛选配置
  // 当 platform 或 viewMode 变化时重新加载配置
  // 注意：直接在 useEffect 内部构建 context，确保使用最新的值
  useEffect(() => {
    const loadConfigs = async () => {
      setLoading(true);
      try {
        const configsMap: Record<string, FilterConfig[]> = {};

        // 直接构建 context，确保使用当前的 platform 值
        const context: FilterContext | undefined = platform
          ? { platform, viewMode, customerIds }
          : undefined;

        await Promise.all(
          enabledModules.map(async module => {
            // 使用新的 getFilterConfigs(context) 接口
            const configs = await Promise.resolve(
              module.getFilterConfigs(context)
            );
            configsMap[module.id] = configs.sort((a, b) => a.order - b.order);
          })
        );

        setLoadedConfigs(configsMap);
      } catch (error) {
        console.error('Failed to load filter configs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfigs();
  }, [enabledModules, platform, viewMode, customerIds]);

  // 按模块分组的筛选配置
  const filtersByModule = useMemo(() => {
    return loadedConfigs;
  }, [loadedConfigs]);

  // 所有筛选配置（扁平化）
  const filterConfigs = useMemo(() => {
    const allConfigs: FilterConfig[] = [];
    enabledModules.forEach(module => {
      const configs = loadedConfigs[module.id] || [];
      allConfigs.push(...configs);
    });
    return allConfigs;
  }, [enabledModules, loadedConfigs]);

  // 计算是否有激活的筛选
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;

    Object.entries(filters).forEach(([, value]) => {
      if (!value) return;

      // 文本搜索
      if (value.text && value.text.trim()) {
        count++;
      }
      // 枚举选择
      if (value.selected && value.selected.length > 0) {
        count++;
      }
      // 数值区间（包括复合筛选的范围部分）
      // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
      const hasMin = value.min !== undefined && value.min !== '';
      const hasMax = value.max !== undefined && value.max !== '';
      if (hasMin || hasMax) {
        count++;
      }
      // 日期范围
      if (value.dateRange && value.dateRange.length === 2) {
        count++;
      }
      // 复合筛选的选择器值（只有当 selectorValue 配合 min/max 使用时才算激活）
      // 注：selectorValue 单独存在不计入，因为需要配合范围值使用
    });

    return {
      hasActiveFilters: count > 0,
      activeFilterCount: count,
    };
  }, [filters]);

  // 更新单个筛选值
  const updateFilter = useCallback(
    (filterId: string, value: FilterValue) => {
      setFilters(prev => {
        const next = { ...prev, [filterId]: value };

        // 检查是否触发联动清空
        enabledModules.forEach(module => {
          if (
            module.onDependencyChange &&
            module.dependencies?.field === filterId
          ) {
            const clearFields = module.onDependencyChange(value, next);
            Object.assign(next, clearFields);
          }
        });

        // 检查字段级别的依赖关系
        filterConfigs.forEach(config => {
          if (config.dependsOn === filterId && config.dependsOnCondition) {
            // 如果依赖条件不满足，清空该字段
            if (!config.dependsOnCondition(value)) {
              next[config.id] = {};
            }
          }
        });

        return next;
      });
    },
    [enabledModules, filterConfigs]
  );

  // 重置所有筛选
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // 构建 API 查询参数
  const buildQueryParams = useCallback(() => {
    const params: Record<string, unknown> = {};

    enabledModules.forEach(module => {
      const moduleParams = module.buildQueryParams(filters);
      // 过滤掉 undefined 和空值
      Object.entries(moduleParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // 对于数组，过滤掉空数组
          if (Array.isArray(value) && value.length === 0) {
            return;
          }
          params[key] = value;
        }
      });
    });

    return params;
  }, [enabledModules, filters]);

  return {
    modules: enabledModules,
    filterConfigs,
    filtersByModule,
    filters,
    hasActiveFilters,
    activeFilterCount,
    loading,
    updateFilter,
    resetFilters,
    buildQueryParams,
  };
}

/**
 * 判断筛选值是否为空
 */
export function isFilterValueEmpty(value: FilterValue | undefined): boolean {
  if (!value) return true;

  const hasText = value.text && value.text.trim().length > 0;
  const hasSelected = value.selected && value.selected.length > 0;
  // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
  const hasMin = value.min !== undefined && value.min !== '';
  const hasMax = value.max !== undefined && value.max !== '';
  const hasRange = hasMin || hasMax;
  const hasDateRange = value.dateRange && value.dateRange.length === 2;
  // 复合筛选：只有当有范围值时才算非空（selectorValue 单独存在不算）
  const hasCompoundValue = value.selectorValue && hasRange;

  return (
    !hasText && !hasSelected && !hasRange && !hasDateRange && !hasCompoundValue
  );
}

/**
 * 格式化筛选值为显示文本
 */
export function formatFilterValue(
  config: FilterConfig,
  value: FilterValue
): string {
  if (!value) return '';

  switch (config.type) {
    case 'text':
      return value.text || '';

    case 'enum':
      return value.selected?.join(', ') || '';

    case 'range': {
      const unit = config.rangeConfig?.unit || '';
      // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
      const hasMin = value.min !== undefined && value.min !== '';
      const hasMax = value.max !== undefined && value.max !== '';
      if (hasMin && hasMax) {
        return `${value.min}${unit} - ${value.max}${unit}`;
      }
      if (hasMin) {
        return `≥ ${value.min}${unit}`;
      }
      if (hasMax) {
        return `≤ ${value.max}${unit}`;
      }
      return '';
    }

    case 'date':
      if (value.dateRange && value.dateRange.length === 2) {
        return `${value.dateRange[0]} ~ ${value.dateRange[1]}`;
      }
      return '';

    case 'compound': {
      // 复合筛选：显示选择器值 + 范围值
      const unit = config.compoundConfig?.subFilter.config?.unit || '';
      const selectorLabel = value.selectorValue || '';
      // 注意：使用 !== undefined && !== '' 判断，因为 0 也是有效值
      const hasMin = value.min !== undefined && value.min !== '';
      const hasMax = value.max !== undefined && value.max !== '';
      let rangeText = '';
      if (hasMin && hasMax) {
        rangeText = `${value.min}${unit} - ${value.max}${unit}`;
      } else if (hasMin) {
        rangeText = `≥ ${value.min}${unit}`;
      } else if (hasMax) {
        rangeText = `≤ ${value.max}${unit}`;
      }
      return selectorLabel && rangeText
        ? `${selectorLabel}: ${rangeText}`
        : rangeText;
    }

    default:
      return '';
  }
}
