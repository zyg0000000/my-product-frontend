/**
 * 机构选择器组件 - v2.0 (Ant Design 升级版)
 *
 * 升级要点：
 * 1. 使用 Ant Design Select 替代手写下拉菜单
 * 2. 内置搜索功能 (showSearch)
 * 3. 自定义选项渲染 (optionRender)
 * 4. 统一的样式和交互
 */

import { useState, useEffect } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { logger } from '../utils/logger';
import type { Agency } from '../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';
import { getAgencies } from '../api/agency';

interface AgencySelectorProps {
  value?: string; // 机构ID（可选，支持在 Form.Item 中使用）
  onChange?: (value: string) => void; // 可选，支持在 Form.Item 中使用
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface AgencyOption {
  label: string;
  value: string;
  agency?: Agency; // 完整的机构信息（用于显示详情）
}

export function AgencySelector({
  value,
  onChange,
  disabled = false,
  placeholder = '选择机构',
  className = '',
}: AgencySelectorProps) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<AgencyOption[]>([]);

  // 加载机构列表
  useEffect(() => {
    loadAgencies();
  }, []);

  // 构建选项列表
  useEffect(() => {
    const agencyOptions: AgencyOption[] = [
      // 野生达人选项（置顶）
      {
        label: '野生达人',
        value: AGENCY_INDIVIDUAL_ID,
      },
      // 机构列表（过滤掉 id 为 individual 的机构，避免重复 key）
      ...agencies
        .filter(agency => agency.id !== AGENCY_INDIVIDUAL_ID)
        .map(agency => ({
          label: agency.name,
          value: agency.id,
          agency: agency,
        })),
    ];
    setOptions(agencyOptions);
  }, [agencies]);

  const loadAgencies = async () => {
    try {
      setLoading(true);
      const response = await getAgencies({ status: 'active' });
      if (response.success && response.data) {
        setAgencies(response.data);
      }
    } catch (error) {
      logger.error('加载机构列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 自定义搜索逻辑（支持名称和ID搜索）
  const filterOption: SelectProps['filterOption'] = (input, option) => {
    const searchValue = input.toLowerCase();
    const label = (option?.label || '').toString().toLowerCase();
    const value = (option?.value || '').toString().toLowerCase();

    // 搜索名称或ID
    return label.includes(searchValue) || value.includes(searchValue);
  };

  // 自定义选项渲染（简洁模式：仅显示名称）
  const optionRender: SelectProps['optionRender'] = option => {
    const data = option.data as AgencyOption;

    // 统一样式：只显示名称
    return (
      <div className="py-1">
        <div className="text-gray-900">{data.label}</div>
      </div>
    );
  };

  return (
    <Select
      className={className}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      loading={loading}
      showSearch
      filterOption={filterOption}
      optionRender={optionRender}
      options={options}
      size="middle"
      style={{ width: '100%' }}
      popupMatchSelectWidth={true}
      notFoundContent={loading ? '加载中...' : '未找到匹配的机构'}
      // 下拉列表样式配置（使用新 API 替代已废弃的 dropdownStyle）
      styles={{
        popup: {
          root: {
            maxHeight: 400,
            overflow: 'auto',
          },
        },
      }}
      // 搜索框配置
      optionFilterProp="label"
      // 显示清除按钮
      allowClear={false}
    />
  );
}
