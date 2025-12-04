/**
 * 基础信息筛选模块
 *
 * 包含达人基础属性筛选：
 * - 搜索（按达人名称/OneID/平台账号ID，精确匹配）
 * - 返点范围
 * - 价格范围（复合筛选：选择档位 + 输入范围）
 * - 内容标签
 */

import { SearchOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import { getTalentFilterOptions } from '../../api/talent';
import { getPlatformConfigs } from '../../api/platformConfig';
import type {
  FilterModule,
  FilterConfig,
  FilterState,
  FilterContext,
  CompoundSelectorOption,
} from '../../types/filterModule';
import type { Platform } from '../../types/talent';

/**
 * 缓存平台配置（避免重复请求）
 */
let platformConfigCache: Record<Platform, CompoundSelectorOption[]> | null =
  null;

/**
 * 获取平台的价格档位选项
 */
async function getPriceTypeOptions(
  platform: Platform
): Promise<CompoundSelectorOption[]> {
  // 使用缓存
  if (platformConfigCache && platformConfigCache[platform]) {
    return platformConfigCache[platform];
  }

  try {
    const res = await getPlatformConfigs(true);
    if (res.success && res.data) {
      platformConfigCache = {} as Record<Platform, CompoundSelectorOption[]>;
      res.data.forEach(config => {
        platformConfigCache![config.platform] = config.priceTypes.map(pt => ({
          key: pt.key,
          label: pt.label,
        }));
      });
      return platformConfigCache[platform] || [];
    }
  } catch (error) {
    console.error('Failed to load platform price types:', error);
  }

  // 回退到硬编码默认值
  const defaultOptions: Record<Platform, CompoundSelectorOption[]> = {
    douyin: [
      { key: 'video_60plus', label: '60s+' },
      { key: 'video_21_60', label: '21-60s' },
      { key: 'video_1_20', label: '1-20s' },
    ],
    xiaohongshu: [
      { key: 'video', label: '视频笔记' },
      { key: 'image', label: '图文笔记' },
    ],
    bilibili: [],
    kuaishou: [],
  };
  return defaultOptions[platform] || [];
}

/**
 * 基础信息筛选模块
 */
export const BasicInfoModule: FilterModule = {
  id: 'basicInfo',
  name: '基础信息',
  order: 1,
  enabled: true,
  icon: createElement(SearchOutlined),

  getFilterConfigs: async (
    context?: FilterContext
  ): Promise<FilterConfig[]> => {
    // 获取价格档位选项（根据平台）
    const platform = context?.platform || 'douyin';
    const priceTypeOptions = await getPriceTypeOptions(platform);

    // 基础配置
    const configs: FilterConfig[] = [
      // 第一行：固定字段（搜索、价格、返点）
      {
        id: 'searchTerm',
        name: '搜索',
        type: 'text',
        order: 1,
        placeholder: '输入达人昵称、OneID 或平台账号ID（精确匹配）',
        layout: { group: 'inline-fixed', rowGroup: 'row1', flex: 2 },
      },
      // 价格筛选：使用复合筛选（选择档位 + 输入范围）
      {
        id: 'price',
        name: '价格筛选',
        type: 'compound',
        order: 2,
        compoundConfig: {
          selector: {
            options: priceTypeOptions,
            defaultValue: priceTypeOptions[0]?.key || 'video_60plus',
            placeholder: '选择档位',
          },
          subFilter: {
            type: 'range',
            config: {
              min: 0,
              unit: '元',
            },
          },
        },
        layout: { group: 'inline-fixed', rowGroup: 'row1', flex: 2 },
      },
      {
        id: 'rebate',
        name: '返点范围',
        type: 'range',
        order: 3,
        rangeConfig: {
          min: 0,
          max: 100,
          unit: '%',
          isPercentage: true,
        },
        layout: { group: 'inline-fixed', rowGroup: 'row1', flex: 1.5 },
      },
      // 第二行：动态字段（内容标签，可能新增）
      {
        id: 'contentTags',
        name: '内容标签',
        type: 'enum',
        order: 5,
        enumOptions: async () => {
          try {
            const res = await getTalentFilterOptions('v2');
            return res.success && res.data?.types ? res.data.types : [];
          } catch {
            return [];
          }
        },
        multiple: true,
        layout: { group: 'inline-flex', rowGroup: 'row2' },
      },
    ];

    return configs;
  },

  buildQueryParams: (filters: FilterState) => {
    const params: Record<string, unknown> = {};

    // 搜索词
    if (filters.searchTerm?.text?.trim()) {
      params.searchTerm = filters.searchTerm.text.trim();
    }

    // 返点范围
    if (filters.rebate?.min) {
      params.rebateMin = parseFloat(filters.rebate.min) / 100; // 转换为小数
    }
    if (filters.rebate?.max) {
      params.rebateMax = parseFloat(filters.rebate.max) / 100;
    }

    // 价格范围（复合筛选：包含档位和范围）
    if (filters.price?.min || filters.price?.max) {
      // 价格档位类型
      if (filters.price?.selectorValue) {
        params.priceType = filters.price.selectorValue;
      }
      // 价格范围
      if (filters.price?.min) {
        params.priceMin = parseFloat(filters.price.min);
      }
      if (filters.price?.max) {
        params.priceMax = parseFloat(filters.price.max);
      }
    }

    // 内容标签
    if (filters.contentTags?.selected?.length) {
      params.contentTags = filters.contentTags.selected;
    }

    return params;
  },
};

export default BasicInfoModule;
