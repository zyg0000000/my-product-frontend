/**
 * 达人筛选面板组件
 * 从 BasicInfo 拆分出来的独立组件
 */

import { useMemo, useCallback } from 'react';
import { Input, Select, Checkbox } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import type { Customer } from '../../../../types/customer';

export interface FilterState {
  searchTerm: string;
  selectedTiers: string[];
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
  onFilterChange: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;

  // 可选项数据
  availableTiers: string[];
  availableTags: string[];
  customers: Customer[];

  // 统计信息
  totalTalents: number;

  // UI 状态
  isExpanded: boolean;
  onToggleExpand: () => void;

  // 动作
  onSearch: () => void;
  onReset: () => void;
}

export function TalentFilterPanel({
  filterState,
  onFilterChange,
  availableTiers,
  availableTags,
  customers,
  totalTalents,
  isExpanded,
  onToggleExpand,
  onSearch,
  onReset,
}: TalentFilterPanelProps) {
  const {
    searchTerm,
    selectedTiers,
    selectedTags,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
    selectedCustomerId,
  } = filterState;

  // 处理层级筛选 - 使用 useCallback 避免重复创建
  const handleTierChange = useCallback(
    (tier: string) => {
      const newTiers = selectedTiers.includes(tier)
        ? selectedTiers.filter(t => t !== tier)
        : [...selectedTiers, tier];
      onFilterChange('selectedTiers', newTiers);
    },
    [selectedTiers, onFilterChange]
  );

  // 处理标签筛选 - 使用 useCallback 避免重复创建
  const handleTagChange = useCallback(
    (tag: string) => {
      const newTags = selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag];
      onFilterChange('selectedTags', newTags);
    },
    [selectedTags, onFilterChange]
  );

  // 计算是否有激活的筛选
  const hasActiveFilters = useMemo(() => {
    return !!(
      searchTerm ||
      selectedTiers.length > 0 ||
      selectedTags.length > 0 ||
      rebateMin ||
      rebateMax ||
      priceMin ||
      priceMax ||
      selectedCustomerId
    );
  }, [
    searchTerm,
    selectedTiers.length,
    selectedTags.length,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
    selectedCustomerId,
  ]);

  // 生成已选筛选条件的标签数据（不包含 onRemove 函数，避免依赖问题）
  const activeFilterData = useMemo(() => {
    const data: Array<{
      id: string;
      label: string;
      type: 'search' | 'tier' | 'tag' | 'rebate' | 'price' | 'customer';
      value?: string;
    }> = [];

    // 搜索关键词
    if (searchTerm) {
      data.push({
        id: 'search',
        label: `搜索: "${searchTerm}"`,
        type: 'search',
      });
    }

    // 达人层级
    selectedTiers.forEach(tier => {
      data.push({
        id: `tier-${tier}`,
        label: `层级: ${tier}`,
        type: 'tier',
        value: tier,
      });
    });

    // 内容标签
    selectedTags.forEach(tag => {
      data.push({
        id: `tag-${tag}`,
        label: `标签: ${tag}`,
        type: 'tag',
        value: tag,
      });
    });

    // 返点范围
    if (rebateMin || rebateMax) {
      let label = '返点: ';
      if (rebateMin && rebateMax) {
        label += `${rebateMin}% - ${rebateMax}%`;
      } else if (rebateMin) {
        label += `≥ ${rebateMin}%`;
      } else if (rebateMax) {
        label += `≤ ${rebateMax}%`;
      }
      data.push({
        id: 'rebate',
        label,
        type: 'rebate',
      });
    }

    // 价格范围
    if (priceMin || priceMax) {
      let label = '价格: ';
      if (priceMin && priceMax) {
        label += `¥${priceMin} - ¥${priceMax}`;
      } else if (priceMin) {
        label += `≥ ¥${priceMin}`;
      } else if (priceMax) {
        label += `≤ ¥${priceMax}`;
      }
      data.push({
        id: 'price',
        label,
        type: 'price',
      });
    }

    // 客户筛选
    if (selectedCustomerId) {
      const customer = customers.find(
        c => (c._id || c.code) === selectedCustomerId
      );
      data.push({
        id: 'customer',
        label: `客户: ${customer?.name || selectedCustomerId}`,
        type: 'customer',
      });
    }

    return data;
  }, [
    searchTerm,
    selectedTiers,
    selectedTags,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
    selectedCustomerId,
    customers,
  ]);

  // 处理标签移除
  const handleRemoveFilter = useCallback(
    (type: string, value?: string) => {
      switch (type) {
        case 'search':
          onFilterChange('searchTerm', '');
          break;
        case 'tier':
          if (value) {
            const newTiers = selectedTiers.filter(t => t !== value);
            onFilterChange('selectedTiers', newTiers);
          }
          break;
        case 'tag':
          if (value) {
            const newTags = selectedTags.filter(t => t !== value);
            onFilterChange('selectedTags', newTags);
          }
          break;
        case 'rebate':
          onFilterChange('rebateMin', '');
          onFilterChange('rebateMax', '');
          break;
        case 'price':
          onFilterChange('priceMin', '');
          onFilterChange('priceMax', '');
          break;
        case 'customer':
          onFilterChange('selectedCustomerId', null);
          break;
      }
    },
    [selectedTiers, selectedTags, onFilterChange]
  );

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      {/* 筛选面板头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? '收起筛选条件' : '展开筛选条件'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="font-medium text-gray-900">筛选条件</span>
        </div>
        <div
          className="flex items-center gap-2"
          onClick={e => e.stopPropagation()}
        >
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
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
              {/* 搜索和客户筛选 - 并排 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 搜索框 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    搜索
                  </label>
                  <Input
                    placeholder="按达人名称或OneID搜索..."
                    value={searchTerm}
                    onChange={e => onFilterChange('searchTerm', e.target.value)}
                    prefix={<SearchOutlined />}
                    allowClear
                    onPressEnter={onSearch}
                  />
                </div>

                {/* 客户筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    所属客户{' '}
                    <span className="text-xs text-gray-500">
                      （筛选客户达人池）
                    </span>
                  </label>
                  <Select
                    showSearch
                    allowClear
                    placeholder="选择客户..."
                    value={selectedCustomerId}
                    onChange={value => onFilterChange('selectedCustomerId', value)}
                    options={customers.map(c => ({
                      value: c._id || c.code,
                      label: c.name,
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* 常用筛选区 - 价格和返点并排 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 价格范围筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    价格范围{' '}
                    <span className="text-xs text-gray-500">（常用）</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="最小"
                      value={priceMin}
                      onChange={e => onFilterChange('priceMin', e.target.value)}
                      style={{ width: '50%' }}
                    />
                    <span className="self-center text-gray-400">-</span>
                    <Input
                      type="number"
                      placeholder="最大"
                      value={priceMax}
                      onChange={e => onFilterChange('priceMax', e.target.value)}
                      style={{ width: '50%' }}
                    />
                  </div>
                </div>

                {/* 返点范围筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    返点范围 (%){' '}
                    <span className="text-xs text-gray-500">（常用）</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="最小"
                      value={rebateMin}
                      onChange={e => onFilterChange('rebateMin', e.target.value)}
                      style={{ width: '50%' }}
                    />
                    <span className="self-center text-gray-400">-</span>
                    <Input
                      type="number"
                      placeholder="最大"
                      value={rebateMax}
                      onChange={e => onFilterChange('rebateMax', e.target.value)}
                      style={{ width: '50%' }}
                    />
                  </div>
                </div>
              </div>

              {/* 其他筛选区 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 达人层级筛选 */}
                {availableTiers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      达人层级
                    </label>
                    <div
                      className="border border-gray-200 rounded-md bg-gray-50"
                      style={{ height: '144px' }}
                    >
                      <div className="p-3 h-full overflow-y-auto">
                        <div className="space-y-2">
                          {availableTiers.map(tier => (
                            <Checkbox
                              key={tier}
                              checked={selectedTiers.includes(tier)}
                              onChange={() => handleTierChange(tier)}
                            >
                              {tier}
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 内容标签筛选 - 优化展示 */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      内容标签
                    </label>
                    <div
                      className="border border-gray-200 rounded-md bg-gray-50"
                      style={{ width: '400px', height: '144px' }}
                    >
                      {/* 标签列表 - 横向排列带换行 */}
                      <div className="p-3 h-full">
                        <div className="flex flex-wrap gap-2 h-full overflow-y-auto">
                          {availableTags.map(tag => (
                            <label
                              key={tag}
                              className="inline-flex items-center cursor-pointer hover:bg-white rounded px-1 py-0.5 h-fit"
                            >
                              <Checkbox
                                checked={selectedTags.includes(tag)}
                                onChange={() => handleTagChange(tag)}
                                className="mr-1"
                              />
                              <span className="text-sm" title={tag}>
                                {tag}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：已选条件展示 */}
          <div className="w-96 p-4 bg-gray-50">
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

            {activeFilterData.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeFilterData.map(item => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-sm"
                  >
                    <span className="text-gray-700">{item.label}</span>
                    <button
                      onClick={() => handleRemoveFilter(item.type, item.value)}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      aria-label={`移除筛选条件: ${item.label}`}
                    >
                      <CloseOutlined className="text-xs" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                暂无筛选条件，请在左侧选择
              </div>
            )}

            {/* 筛选统计信息 */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <div>符合条件的达人: {totalTalents} 个</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
