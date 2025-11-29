/**
 * 达人选择器组件
 * 支持搜索、多选、展示已选达人
 */

import { useState, useCallback } from 'react';
import { Select, Spin } from 'antd';
// @ts-expect-error - lodash-es 类型声明可选
import { debounce } from 'lodash-es';
import type { Platform } from '../../types/talent';
import { searchTalents } from '../../api/talent';

interface TalentOption {
  oneId: string;
  name: string;
  platformAccountId?: string;
}

interface TalentSelectorProps {
  platform: Platform;
  selectedTalents: TalentOption[];
  onSelect: (talent: TalentOption) => void;
  onRemove?: (oneId: string) => void; // 可选：删除在父组件 Tag 中实现
  maxCount?: number;
}

export function TalentSelector({
  platform,
  selectedTalents,
  onSelect,
  maxCount = 5,
}: TalentSelectorProps) {
  const [options, setOptions] = useState<TalentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 搜索达人（带防抖）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSearch = useCallback(
    debounce(async (value: string) => {
      if (!value || value.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await searchTalents({
          platform,
          search: value,
          page: 1,
          pageSize: 20,
        });

        if (response.success && response.data?.talents) {
          const talents = response.data.talents.map((t: TalentOption) => ({
            oneId: t.oneId,
            name: t.name,
            platformAccountId: t.platformAccountId,
          }));
          setOptions(talents);
        }
      } catch (error) {
        console.error('搜索达人失败:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [platform]
  );

  // 选中达人
  const handleSelect = (value: string) => {
    const talent = options.find(o => o.oneId === value);
    if (talent && selectedTalents.length < maxCount) {
      onSelect(talent);
      setSearchValue('');
      setOptions([]);
    }
  };

  // 过滤已选中的选项
  const filteredOptions = options.filter(
    o => !selectedTalents.some(s => s.oneId === o.oneId)
  );

  const isMaxReached = selectedTalents.length >= maxCount;

  return (
    <Select
      showSearch
      value={undefined}
      placeholder={
        isMaxReached
          ? `已达到最大数量（${maxCount}个）`
          : `搜索达人名称或账号ID（${selectedTalents.length}/${maxCount}）`
      }
      filterOption={false}
      onSearch={value => {
        setSearchValue(value);
        handleSearch(value);
      }}
      onChange={handleSelect}
      notFoundContent={
        loading ? (
          <Spin size="small" />
        ) : searchValue.length < 2 ? (
          <span className="text-gray-400">请输入至少2个字符搜索</span>
        ) : (
          <span className="text-gray-400">未找到匹配的达人</span>
        )
      }
      disabled={isMaxReached}
      style={{ width: '100%' }}
      dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
    >
      {filteredOptions.map(option => (
        <Select.Option key={option.oneId} value={option.oneId}>
          <div className="flex items-center justify-between">
            <span className="font-medium">{option.name}</span>
            {option.platformAccountId && (
              <span className="text-xs text-gray-400 ml-2">
                {option.platformAccountId}
              </span>
            )}
          </div>
        </Select.Option>
      ))}
    </Select>
  );
}
