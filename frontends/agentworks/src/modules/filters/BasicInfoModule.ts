/**
 * 基础信息筛选模块
 *
 * 包含达人基础属性筛选：
 * - 搜索（按达人名称/OneID）
 * - 达人层级（头部/腰部/尾部）
 * - 返点范围
 * - 价格范围
 * - 内容标签
 */

import { SearchOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import { getTalentFilterOptions } from '../../api/talent';
import type {
  FilterModule,
  FilterConfig,
  FilterState,
} from '../../types/filterModule';

/**
 * 基础信息筛选模块
 */
export const BasicInfoModule: FilterModule = {
  id: 'basicInfo',
  name: '基础信息',
  order: 1,
  enabled: true,
  icon: createElement(SearchOutlined),

  getFilterConfigs: (): FilterConfig[] => [
    // 第一行：固定字段（达人昵称、价格、返点）
    {
      id: 'searchTerm',
      name: '达人昵称',
      type: 'text',
      order: 1,
      placeholder: '输入达人昵称或 OneID...',
      layout: { group: 'inline-fixed', rowGroup: 'row1', flex: 2 },
    },
    {
      id: 'price',
      name: '价格范围',
      type: 'range',
      order: 2,
      rangeConfig: {
        min: 0,
        unit: '元',
      },
      layout: { group: 'inline-fixed', rowGroup: 'row1', flex: 1.5 },
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
    // 第二行：动态字段（层级、内容标签，可能新增）
    {
      id: 'talentTier',
      name: '达人层级',
      type: 'enum',
      order: 4,
      enumOptions: async () => {
        try {
          const res = await getTalentFilterOptions('v2');
          return res.success && res.data?.tiers ? res.data.tiers : [];
        } catch {
          return ['头部', '腰部', '尾部'];
        }
      },
      multiple: true,
      layout: { group: 'inline-flex', rowGroup: 'row2' },
    },
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
  ],

  buildQueryParams: (filters: FilterState) => {
    const params: Record<string, unknown> = {};

    // 搜索词
    if (filters.searchTerm?.text?.trim()) {
      params.searchTerm = filters.searchTerm.text.trim();
    }

    // 达人层级
    if (filters.talentTier?.selected?.length) {
      params.tiers = filters.talentTier.selected;
    }

    // 返点范围
    if (filters.rebate?.min) {
      params.rebateMin = parseFloat(filters.rebate.min) / 100; // 转换为小数
    }
    if (filters.rebate?.max) {
      params.rebateMax = parseFloat(filters.rebate.max) / 100;
    }

    // 价格范围
    if (filters.price?.min) {
      params.priceMin = parseFloat(filters.price.min);
    }
    if (filters.price?.max) {
      params.priceMax = parseFloat(filters.price.max);
    }

    // 内容标签
    if (filters.contentTags?.selected?.length) {
      params.contentTags = filters.contentTags.selected;
    }

    return params;
  },
};

export default BasicInfoModule;
