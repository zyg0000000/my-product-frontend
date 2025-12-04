/**
 * 筛选模块类型定义
 *
 * 可扩展的筛选模块架构，支持：
 * - 模块化：每个筛选维度独立封装为模块
 * - 配置驱动：筛选条件可静态配置或动态加载
 * - 联动支持：内置依赖关系和联动清空机制
 */

import type { ReactNode } from 'react';
import type { Platform } from './talent';

/**
 * 筛选值类型
 */
export interface FilterValue {
  /** 文本搜索值 */
  text?: string;
  /** 枚举多选值 */
  selected?: string[];
  /** 数值/百分比区间 - 最小值 */
  min?: string;
  /** 数值/百分比区间 - 最大值 */
  max?: string;
  /** 日期范围 */
  dateRange?: [string, string];
  /** 复合筛选 - 选择器值（如价格档位 key） */
  selectorValue?: string;
}

/**
 * 筛选状态（统一管理所有筛选器的值）
 */
export type FilterState = Record<string, FilterValue>;

/**
 * 筛选条件类型
 */
export type FilterType =
  | 'text'
  | 'enum'
  | 'range'
  | 'date'
  | 'compound'
  | 'custom';

/**
 * 视角模式
 */
export type ViewMode = 'all' | 'customer';

/**
 * 筛选上下文
 * 用于传递筛选器所需的上下文信息，支持上下文感知的动态筛选配置
 */
export interface FilterContext {
  /** 当前平台（影响价格档位选项等） */
  platform: Platform;
  /** 当前视角模式 */
  viewMode: ViewMode;
  /** 选中的客户ID列表（客户视角时使用） */
  customerIds?: string[];
}

/**
 * 复合筛选选择器选项
 */
export interface CompoundSelectorOption {
  /** 选项值 */
  key: string;
  /** 显示标签 */
  label: string;
}

/**
 * 复合筛选配置
 * 支持"选择器 + 子筛选"模式，如：选择价格档位 + 输入价格范围
 */
export interface CompoundConfig {
  /** 选择器配置 */
  selector: {
    /** 选项列表 */
    options: CompoundSelectorOption[];
    /** 默认选中值 */
    defaultValue?: string;
    /** 占位符 */
    placeholder?: string;
  };
  /** 子筛选器配置 */
  subFilter: {
    /** 子筛选类型 */
    type: 'range' | 'text';
    /** 范围筛选配置（当 type='range' 时） */
    config?: RangeConfig;
  };
}

/**
 * 范围筛选配置
 */
export interface RangeConfig {
  /** 最小值限制 */
  min?: number;
  /** 最大值限制 */
  max?: number;
  /** 步进值 */
  step?: number;
  /** 单位显示（如 '%', '元', '万'） */
  unit?: string;
  /** 是否百分比类型 */
  isPercentage?: boolean;
}

/**
 * 筛选器布局行组
 * 同一组的筛选器会放在同一行展示
 */
export type LayoutGroup = 'inline-fixed' | 'inline-flex' | 'default';

/**
 * 布局配置
 */
export interface LayoutConfig {
  /** 布局分组：inline-fixed（固定宽度行内）、inline-flex（弹性行内）、default（默认网格） */
  group?: LayoutGroup;
  /** 行组标识，相同 rowGroup 的筛选器会放在同一行 */
  rowGroup?: string;
  /** 宽度权重（用于 inline 布局） */
  flex?: number;
  /** 最小宽度 */
  minWidth?: number;
}

/**
 * 筛选渲染器 Props
 */
export interface FilterRendererProps {
  /** 筛选配置 */
  config: FilterConfig;
  /** 当前值 */
  value: FilterValue;
  /** 值变化回调 */
  onChange: (value: FilterValue) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 筛选条件配置
 */
export interface FilterConfig {
  /** 字段ID（唯一标识） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 筛选类型 */
  type: FilterType;
  /** 排序权重（数值越小越靠前） */
  order: number;

  /** 枚举选项（静态数组或动态加载函数） */
  enumOptions?: string[] | (() => Promise<string[]>);
  /** 范围筛选配置 */
  rangeConfig?: RangeConfig;
  /** 复合筛选配置（当 type='compound' 时使用） */
  compoundConfig?: CompoundConfig;
  /** 自定义渲染器 */
  customRenderer?: React.ComponentType<FilterRendererProps>;

  /** 占位符文本 */
  placeholder?: string;
  /** 是否多选（仅对 enum 类型有效） */
  multiple?: boolean;
  /** 是否隐藏（用于联动控制） */
  hidden?: boolean;
  /** 依赖字段（用于联动显示） */
  dependsOn?: string;
  /** 依赖条件（返回 true 时显示） */
  dependsOnCondition?: (dependencyValue: FilterValue | undefined) => boolean;
  /** 布局配置 */
  layout?: LayoutConfig;
}

/**
 * 筛选模块依赖配置
 */
export interface FilterModuleDependency {
  /** 依赖的模块ID */
  moduleId: string;
  /** 依赖的字段ID */
  field: string;
  /** 显示条件（返回 true 时显示依赖字段） */
  condition: (value: FilterValue | undefined) => boolean;
}

/**
 * 筛选模块接口
 *
 * 所有筛选模块必须实现此接口
 */
export interface FilterModule {
  /** 模块唯一标识 */
  id: string;
  /** 模块名称（用于分类显示） */
  name: string;
  /** 排序权重（数值越小越靠前） */
  order: number;
  /** 模块是否启用 */
  enabled: boolean;
  /** 模块图标（可选） */
  icon?: ReactNode;

  /**
   * 获取筛选条件配置（支持上下文感知）
   * @param context - 筛选上下文，包含平台、视角模式等信息
   * 支持静态返回或异步加载
   */
  getFilterConfigs: (
    context?: FilterContext
  ) => FilterConfig[] | Promise<FilterConfig[]>;

  /**
   * @deprecated 使用 getFilterConfigs(context) 替代
   * 按平台获取筛选配置（保留用于向后兼容）
   */
  getFilterConfigsForPlatform?: (
    platform: Platform
  ) => FilterConfig[] | Promise<FilterConfig[]>;

  /**
   * 构建 API 查询参数
   * 将当前筛选状态转换为后端 API 接受的参数格式
   */
  buildQueryParams: (filters: FilterState) => Record<string, unknown>;

  /**
   * 依赖关系配置（可选）
   * 定义模块内字段的依赖关系
   */
  dependencies?: FilterModuleDependency;

  /**
   * 联动变化处理（可选）
   * 当依赖字段变化时，返回需要清空或更新的字段
   */
  onDependencyChange?: (
    dependencyValue: FilterValue | undefined,
    currentFilters: FilterState
  ) => Partial<FilterState>;

  /**
   * 验证筛选值（可选）
   * 返回错误信息，如果验证通过返回 undefined
   */
  validate?: (filters: FilterState) => string | undefined;
}

/**
 * 筛选模块注册表类型
 */
export type FilterModuleRegistry = FilterModule[];

/**
 * 筛选面板 Props
 */
export interface ModularFilterPanelProps {
  /** 筛选模块列表 */
  modules: FilterModule[];
  /** 按模块分组的筛选配置（从 usePanoramaFilters 传入，已根据平台加载） */
  filtersByModule?: Record<string, FilterConfig[]>;
  /** 当前筛选状态 */
  filters: FilterState;
  /** 筛选变化回调 */
  onFilterChange: (filterId: string, value: FilterValue) => void;
  /** 重置筛选回调 */
  onReset: () => void;
  /** 搜索回调 */
  onSearch: () => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * usePanoramaFilters Hook 返回值
 */
export interface UsePanoramaFiltersResult {
  /** 启用的筛选模块列表（按 order 排序） */
  modules: FilterModule[];
  /** 所有筛选配置（扁平化，已加载） */
  filterConfigs: FilterConfig[];
  /** 按模块分组的筛选配置 */
  filtersByModule: Record<string, FilterConfig[]>;
  /** 当前筛选状态 */
  filters: FilterState;
  /** 是否有激活的筛选条件 */
  hasActiveFilters: boolean;
  /** 激活的筛选数量 */
  activeFilterCount: number;
  /** 配置加载中 */
  loading: boolean;
  /** 更新单个筛选值 */
  updateFilter: (filterId: string, value: FilterValue) => void;
  /** 重置所有筛选 */
  resetFilters: () => void;
  /** 构建 API 查询参数 */
  buildQueryParams: () => Record<string, unknown>;
}
