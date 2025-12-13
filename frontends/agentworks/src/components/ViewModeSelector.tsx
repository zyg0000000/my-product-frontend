/**
 * 视角选择器组件
 *
 * 用于达人全景页面切换查看模式：
 * - 全量达人库：展示所有达人
 * - 客户视角：展示选中客户关注的达人（支持多选）
 */

import { useState, useEffect } from 'react';
import { Radio, Select, Spin } from 'antd';
import { EyeOutlined, TeamOutlined } from '@ant-design/icons';
import { customerApi } from '../services/customerApi';
import type { ViewMode } from '../api/customerTalents';

interface ViewModeSelectorProps {
  /** 当前视角模式 */
  viewMode: ViewMode;
  /** 已选客户列表 */
  selectedCustomers: string[];
  /** 视角模式变化回调 */
  onViewModeChange: (mode: ViewMode) => void;
  /** 客户选择变化回调 */
  onCustomersChange: (customers: string[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

interface CustomerOption {
  value: string;
  label: string;
}

export function ViewModeSelector({
  viewMode,
  selectedCustomers,
  onViewModeChange,
  onCustomersChange,
  disabled = false,
}: ViewModeSelectorProps) {
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载客户列表
  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const res = await customerApi.getCustomers({ page: 1, pageSize: 200 });
        if (res.success && res.data?.customers) {
          // 过滤掉已删除的客户
          const activeCustomers = res.data.customers.filter(
            c => c.status === 'active' && !c.deletedAt
          );
          setCustomerOptions(
            activeCustomers.map(c => ({
              value: c.name,
              label: c.name,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load customers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  // 切换模式时清空客户选择
  const handleModeChange = (mode: ViewMode) => {
    onViewModeChange(mode);
    if (mode === 'all') {
      onCustomersChange([]);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-base rounded-lg border border-stroke">
      <span className="text-sm font-medium text-content-secondary">
        查看视角：
      </span>

      <Radio.Group
        value={viewMode}
        onChange={e => handleModeChange(e.target.value)}
        disabled={disabled}
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="all">
          <EyeOutlined className="mr-1" />
          全量达人库
        </Radio.Button>
        <Radio.Button value="customer">
          <TeamOutlined className="mr-1" />
          客户视角
        </Radio.Button>
      </Radio.Group>

      {viewMode === 'customer' && (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-content-muted">选择客户：</span>
          <Select
            mode="multiple"
            placeholder="请选择要查看的客户（可多选）"
            value={selectedCustomers}
            onChange={onCustomersChange}
            options={customerOptions}
            loading={loading}
            disabled={disabled}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ minWidth: 300, flex: 1, maxWidth: 500 }}
            notFoundContent={loading ? <Spin size="small" /> : '暂无客户'}
            maxTagCount={3}
            maxTagPlaceholder={omitted => `+${omitted.length}...`}
          />
          {selectedCustomers.length > 0 && (
            <span className="text-xs text-content-muted">
              已选 {selectedCustomers.length} 个客户
            </span>
          )}
        </div>
      )}

      {viewMode === 'all' && (
        <span className="text-sm text-content-muted">
          展示所有入库达人，不包含客户标签信息
        </span>
      )}
    </div>
  );
}

export default ViewModeSelector;
