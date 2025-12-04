/**
 * 模块化筛选面板
 *
 * 按筛选模块分组展示筛选器，支持：
 * - 可折叠的筛选面板
 * - 按模块分类展示
 * - 已选条件标签展示
 * - 重置和搜索操作
 */

import { useState, useMemo } from 'react';
import { Spin, Tag, Button } from 'antd';
import { FilterRenderer } from './FilterRenderer';
import {
  formatFilterValue,
  isFilterValueEmpty,
} from '../../hooks/usePanoramaFilters';
import type {
  FilterModule,
  FilterConfig,
  ModularFilterPanelProps,
} from '../../types/filterModule';

/**
 * 已选筛选条件标签信息
 */
interface ActiveFilterTag {
  moduleId: string;
  moduleName: string;
  filterId: string;
  filterName: string;
  label: string;
  type: FilterConfig['type'];
}

/**
 * 模块化筛选面板
 */
export function ModularFilterPanel({
  modules,
  filtersByModule,
  filters,
  onFilterChange,
  onReset,
  onSearch,
  loading = false,
  defaultExpanded = false,
  className = '',
}: ModularFilterPanelProps) {
  // 面板展开状态
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // 各模块展开状态
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach((module, index) => {
      // 默认展开第一个模块
      initial[module.id] = index === 0;
    });
    return initial;
  });

  // 使用传入的配置（优先）或回退到本地加载
  // 如果父组件传入了 filtersByModule，直接使用；否则自己加载（向后兼容）
  const [localConfigs, setLocalConfigs] = useState<
    Record<string, FilterConfig[]>
  >({});
  const [localConfigsLoading, setLocalConfigsLoading] =
    useState(!filtersByModule);

  // 仅在未传入 filtersByModule 时自行加载配置（向后兼容）
  useState(() => {
    if (filtersByModule) {
      // 使用传入的配置，不需要本地加载
      return;
    }

    const loadConfigs = async () => {
      setLocalConfigsLoading(true);
      const configsMap: Record<string, FilterConfig[]> = {};

      await Promise.all(
        modules.map(async module => {
          try {
            const configs = await Promise.resolve(module.getFilterConfigs());
            configsMap[module.id] = configs.sort((a, b) => a.order - b.order);
          } catch (error) {
            console.error(
              `Failed to load configs for module ${module.id}:`,
              error
            );
            configsMap[module.id] = [];
          }
        })
      );

      setLocalConfigs(configsMap);
      setLocalConfigsLoading(false);
    };

    loadConfigs();
  });

  // 最终使用的配置：优先使用传入的，否则使用本地加载的
  const loadedConfigs = filtersByModule || localConfigs;
  const configsLoading = filtersByModule ? false : localConfigsLoading;

  // 计算是否有激活的筛选
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => !isFilterValueEmpty(value));
  }, [filters]);

  // 计算激活的筛选数量
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(value => !isFilterValueEmpty(value))
      .length;
  }, [filters]);

  // 生成已选筛选条件标签
  const activeFilterTags = useMemo(() => {
    const tags: ActiveFilterTag[] = [];

    modules.forEach(module => {
      const configs = loadedConfigs[module.id] || [];
      configs.forEach(config => {
        const value = filters[config.id];
        if (!isFilterValueEmpty(value)) {
          const label = formatFilterValue(config, value);
          if (label) {
            tags.push({
              moduleId: module.id,
              moduleName: module.name,
              filterId: config.id,
              filterName: config.name,
              label: `${config.name}: ${label}`,
              type: config.type,
            });
          }
        }
      });
    });

    return tags;
  }, [modules, loadedConfigs, filters]);

  // 移除单个筛选标签
  const removeFilterTag = (tag: ActiveFilterTag) => {
    onFilterChange(tag.filterId, {});
  };

  // 切换模块展开状态
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // 检查字段是否应该隐藏（根据依赖关系）
  const shouldHideField = (config: FilterConfig): boolean => {
    if (!config.dependsOn || !config.dependsOnCondition) {
      return false;
    }
    const dependencyValue = filters[config.dependsOn];
    return !config.dependsOnCondition(dependencyValue);
  };

  // 按行组分组筛选配置
  const groupConfigsByRow = (configs: FilterConfig[]) => {
    const rowGroups: Record<string, FilterConfig[]> = {};
    const defaultConfigs: FilterConfig[] = [];

    configs.forEach(config => {
      const rowGroup = config.layout?.rowGroup;
      if (rowGroup) {
        if (!rowGroups[rowGroup]) {
          rowGroups[rowGroup] = [];
        }
        rowGroups[rowGroup].push(config);
      } else {
        defaultConfigs.push(config);
      }
    });

    return { rowGroups, defaultConfigs };
  };

  // 渲染行组
  const renderRowGroup = (configs: FilterConfig[], groupKey: string) => {
    const layoutGroup = configs[0]?.layout?.group || 'default';

    if (layoutGroup === 'inline-fixed' || layoutGroup === 'inline-flex') {
      // 行内布局
      return (
        <div key={groupKey} className="flex gap-4 mb-4">
          {configs.map(config => (
            <div
              key={config.id}
              style={{
                flex: config.layout?.flex || 1,
                minWidth: config.layout?.minWidth || 0,
              }}
            >
              <FilterRenderer
                config={config}
                value={filters[config.id] || {}}
                onChange={value => onFilterChange(config.id, value)}
              />
            </div>
          ))}
        </div>
      );
    }

    // 默认网格布局（每行3个）
    return (
      <div
        key={groupKey}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
      >
        {configs.map(config => (
          <FilterRenderer
            key={config.id}
            config={config}
            value={filters[config.id] || {}}
            onChange={value => onFilterChange(config.id, value)}
          />
        ))}
      </div>
    );
  };

  // 渲染单个模块
  const renderModule = (module: FilterModule) => {
    const configs = loadedConfigs[module.id] || [];
    const isModuleExpanded = expandedModules[module.id] ?? false;

    // 过滤掉隐藏的字段
    const visibleConfigs = configs.filter(config => !shouldHideField(config));

    if (visibleConfigs.length === 0) {
      return null;
    }

    // 按行组分组
    const { rowGroups, defaultConfigs } = groupConfigsByRow(visibleConfigs);
    // 按 rowGroup 名称排序（row1, row2, ...）
    const sortedRowGroupKeys = Object.keys(rowGroups).sort();

    return (
      <div key={module.id} className="mb-4 last:mb-0">
        {/* 模块标题 */}
        <div
          className="flex items-center gap-2 mb-3 cursor-pointer"
          onClick={() => toggleModule(module.id)}
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isModuleExpanded ? 'rotate-90' : ''
            }`}
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
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            {module.icon}
            {module.name}
          </span>
        </div>

        {/* 模块内的筛选器 */}
        {isModuleExpanded && (
          <div className="pl-6">
            {/* 渲染行组 */}
            {sortedRowGroupKeys.map(key => renderRowGroup(rowGroups[key], key))}
            {/* 渲染默认布局的筛选器 */}
            {defaultConfigs.length > 0 &&
              renderRowGroup(defaultConfigs, 'default')}
          </div>
        )}
      </div>
    );
  };

  if (configsLoading) {
    return (
      <div className={`bg-white rounded-lg shadow mb-4 p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Spin>
            <span className="ml-2 text-gray-500">加载筛选配置...</span>
          </Spin>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow mb-4 ${className}`}>
      {/* 筛选面板头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
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
          <span className="font-medium text-gray-900">筛选条件</span>
          {activeFilterCount > 0 && (
            <Tag color="blue" className="ml-2">
              {activeFilterCount} 个条件
            </Tag>
          )}
        </div>
        <div
          className="flex items-center gap-2"
          onClick={e => e.stopPropagation()}
        >
          {hasActiveFilters && (
            <Button size="small" onClick={onReset}>
              重置
            </Button>
          )}
          <Button
            type="primary"
            size="small"
            onClick={onSearch}
            loading={loading}
          >
            搜索
          </Button>
        </div>
      </div>

      {/* 筛选内容区域 */}
      {isExpanded && (
        <div className="flex">
          {/* 左侧：筛选器分类面板 */}
          <div className="flex-1 p-4 border-r border-gray-100">
            {modules.map(renderModule)}
          </div>

          {/* 右侧：已选条件展示 */}
          <div className="w-80 p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
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
                    key={`${tag.filterId}-${index}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-sm"
                  >
                    <span className="text-gray-700">{tag.label}</span>
                    <button
                      onClick={() => removeFilterTag(tag)}
                      className="ml-1 text-gray-400 hover:text-gray-600"
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
              <div className="text-sm text-gray-500">
                暂无筛选条件，请在左侧选择
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModularFilterPanel;
