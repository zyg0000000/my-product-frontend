/**
 * 客户标签筛选模块
 *
 * 仅在客户视角模式下显示，包含：
 * - 重要程度（多选）
 * - 业务标签（多选）
 *
 * 注意：客户选择器已移至视角选择器组件 (ViewModeSelector)
 * 此模块仅负责客户标签相关筛选
 */

import { TagOutlined } from '@ant-design/icons';
import { createElement } from 'react';
import { getTagConfigs } from '../../api/customerTalents';
import type {
  FilterModule,
  FilterConfig,
  FilterState,
} from '../../types/filterModule';

// 默认重要程度选项
const DEFAULT_IMPORTANCE_LEVELS = ['核心', '重点', '常规', '备选', '观察'];

// 默认业务标签选项
const DEFAULT_BUSINESS_TAGS = [
  '长期合作',
  '新晋达人',
  '效果优秀',
  '待考察',
  '高性价比',
  '高端定制',
];

/**
 * 客户标签筛选模块
 *
 * 此模块仅在客户视角模式下有效，由页面根据 viewMode 控制是否显示
 */
export const CustomerTagModule: FilterModule = {
  id: 'customerTag',
  name: '客户标签',
  order: 2,
  enabled: true,
  icon: createElement(TagOutlined),

  getFilterConfigs: async (): Promise<FilterConfig[]> => {
    // 尝试从 API 加载标签配置
    let importanceLevels = DEFAULT_IMPORTANCE_LEVELS;
    let businessTags = DEFAULT_BUSINESS_TAGS;

    try {
      const configs = await getTagConfigs();
      // API 返回格式: { importanceLevels: [{name, key, ...}], businessTags: [{name, key, ...}] }
      if (configs?.importanceLevels?.length) {
        importanceLevels = configs.importanceLevels.map(
          (item: { name: string }) => item.name
        );
      }
      if (configs?.businessTags?.length) {
        businessTags = configs.businessTags.map(
          (item: { name: string }) => item.name
        );
      }
    } catch (error) {
      console.error('Failed to load tag configs:', error);
      // 使用默认值
    }

    return [
      {
        id: 'importance',
        name: '重要程度',
        type: 'enum',
        order: 1,
        enumOptions: importanceLevels,
        multiple: true,
        placeholder: '选择重要程度',
        layout: { group: 'inline-flex', rowGroup: 'row1' },
      },
      {
        id: 'businessTags',
        name: '业务标签',
        type: 'enum',
        order: 2,
        enumOptions: businessTags,
        multiple: true,
        placeholder: '选择业务标签',
        layout: { group: 'inline-flex', rowGroup: 'row1' },
      },
    ];
  },

  buildQueryParams: (filters: FilterState) => {
    const params: Record<string, unknown> = {};

    // 重要程度
    if (filters.importance?.selected?.length) {
      params.importance = filters.importance.selected;
    }

    // 业务标签
    if (filters.businessTags?.selected?.length) {
      params.businessTags = filters.businessTags.selected;
    }

    return params;
  },
};

export default CustomerTagModule;
