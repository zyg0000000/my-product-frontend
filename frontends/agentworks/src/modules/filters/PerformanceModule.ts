/**
 * 表现数据筛选模块
 *
 * 从 dimension_config 动态加载筛选配置：
 * - 播放量、点赞数、评论数等数值筛选
 * - 完播率等百分比筛选
 * - 达人类型等枚举筛选
 *
 * 复用现有的 getDimensionConfigs API
 */

import { LineChartOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import { getDimensionConfigs } from '../../api/performance';
import type {
  DimensionConfig,
  DimensionConfigDoc,
} from '../../api/performance';
import type {
  FilterModule,
  FilterConfig,
  FilterState,
  FilterType,
  FilterContext,
} from '../../types/filterModule';
import type { Platform } from '../../types/talent';

/**
 * 基础信息字段路径黑名单
 * 这些字段已在 BasicInfoModule 中定义，避免重复显示
 */
const BASIC_INFO_FIELD_PATHS = [
  'name',
  'oneId',
  'rebate',
  'prices',
  'price', // dimension_config 中的字段 ID 是 'price'（单数）
  'contentTags',
  'followerCount',
  'platform',
];

/**
 * 将 DimensionConfig 转换为 FilterConfig
 */
function convertToFilterConfig(dim: DimensionConfig): FilterConfig {
  // 映射筛选类型
  let filterType: FilterType = 'text';
  if (dim.filterType === 'range') {
    filterType = 'range';
  } else if (dim.filterType === 'enum') {
    filterType = 'enum';
  } else if (dim.filterType === 'text') {
    filterType = 'text';
  }

  // 基础配置
  const config: FilterConfig = {
    id: dim.id,
    name: dim.name,
    type: filterType,
    order: dim.filterOrder ?? dim.order,
  };

  // 范围筛选配置
  if (filterType === 'range') {
    config.rangeConfig = {
      isPercentage: dim.type === 'percentage',
      unit: dim.type === 'percentage' ? '%' : '',
    };
  }

  // 枚举筛选配置
  if (filterType === 'enum' && dim.filterOptions) {
    config.enumOptions = dim.filterOptions;
    config.multiple = true;
  }

  return config;
}

/**
 * 从 dimension_config 加载平台特定的筛选配置
 * @param platform 平台标识（可选，不传则加载所有平台配置）
 */
async function loadFilterConfigsForPlatform(
  platform?: Platform
): Promise<FilterConfig[]> {
  try {
    // 从 API 获取维度配置，传入平台参数
    const res = (await getDimensionConfigs(platform)) as {
      success: boolean;
      data: DimensionConfigDoc[] | DimensionConfigDoc;
    };

    if (!res.success || !res.data) {
      return getDefaultFilterConfigs();
    }

    // 获取第一个激活的配置文档
    const configDocs = Array.isArray(res.data) ? res.data : [res.data];
    const activeDoc = configDocs.find(
      (doc: DimensionConfigDoc) => doc.isActive
    );

    if (!activeDoc?.dimensions) {
      return getDefaultFilterConfigs();
    }

    // 过滤出可筛选的维度并转换
    // 条件：1. filterable=true  2. 来自 talent_performance 集合  3. 不在基础信息黑名单中
    const filterableDimensions = activeDoc.dimensions.filter(
      (dim: DimensionConfig) =>
        dim.filterable === true &&
        dim.targetCollection === 'talent_performance' &&
        !BASIC_INFO_FIELD_PATHS.some(path => dim.targetPath.startsWith(path))
    );

    if (filterableDimensions.length === 0) {
      return getDefaultFilterConfigs();
    }

    return filterableDimensions
      .map(convertToFilterConfig)
      .sort((a: FilterConfig, b: FilterConfig) => a.order - b.order);
  } catch (error) {
    console.error('Failed to load dimension configs:', error);
    return getDefaultFilterConfigs();
  }
}

/**
 * 表现数据筛选模块
 */
export const PerformanceModule: FilterModule = {
  id: 'performance',
  name: '表现数据',
  order: 3,
  enabled: true,
  icon: createElement(LineChartOutlined),

  // 获取配置（支持上下文感知）
  getFilterConfigs: async (
    context?: FilterContext
  ): Promise<FilterConfig[]> => {
    // 从上下文获取平台，如果没有则使用默认值
    const platform = context?.platform;
    return loadFilterConfigsForPlatform(platform);
  },

  buildQueryParams: (filters: FilterState) => {
    const params: Record<string, unknown> = {};
    const performanceFilters: Record<string, { min?: number; max?: number }> =
      {};

    // 基础信息字段黑名单 - 这些字段由 BasicInfoModule 处理，不应放入 performanceFilters
    const EXCLUDED_FIELDS = [
      'searchTerm',
      'rebate',
      'price',
      'prices',
      'contentTags',
      'customerName',
      'importance',
      'businessTags',
    ];

    Object.entries(filters).forEach(([filterId, value]) => {
      if (!value) return;

      // 跳过基础信息字段
      if (EXCLUDED_FIELDS.includes(filterId)) return;

      // 文本搜索
      if (value.text?.trim()) {
        params[`filter_${filterId}`] = value.text.trim();
      }

      // 枚举筛选
      if (value.selected?.length) {
        // 特殊处理达人类型
        if (filterId === 'talentType') {
          params.types = value.selected;
        } else {
          params[`filter_${filterId}`] = value.selected;
        }
      }

      // 范围筛选（注意：使用 !== undefined 和 !== '' 判断，因为 0 也是有效值）
      const hasMin = value.min !== undefined && value.min !== '';
      const hasMax = value.max !== undefined && value.max !== '';
      if (hasMin || hasMax) {
        performanceFilters[filterId] = {};
        if (hasMin) {
          performanceFilters[filterId].min = parseFloat(value.min as string);
        }
        if (hasMax) {
          performanceFilters[filterId].max = parseFloat(value.max as string);
        }
      }
    });

    // 如果有表现筛选条件，添加到参数中
    if (Object.keys(performanceFilters).length > 0) {
      params.performanceFilters = performanceFilters;
    }

    return params;
  },
};

/**
 * 默认的筛选配置（当 API 加载失败时使用）
 */
function getDefaultFilterConfigs(): FilterConfig[] {
  return [
    {
      id: 'playCount',
      name: '播放量',
      type: 'range',
      order: 1,
      rangeConfig: { unit: '' },
    },
    {
      id: 'likeCount',
      name: '点赞数',
      type: 'range',
      order: 2,
      rangeConfig: { unit: '' },
    },
    {
      id: 'commentCount',
      name: '评论数',
      type: 'range',
      order: 3,
      rangeConfig: { unit: '' },
    },
    {
      id: 'shareCount',
      name: '分享数',
      type: 'range',
      order: 4,
      rangeConfig: { unit: '' },
    },
    {
      id: 'completionRate',
      name: '完播率',
      type: 'range',
      order: 5,
      rangeConfig: { isPercentage: true, unit: '%' },
    },
  ];
}

export default PerformanceModule;
