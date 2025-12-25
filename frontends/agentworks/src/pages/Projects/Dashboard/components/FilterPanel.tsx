/**
 * 筛选面板组件
 * 精工极简设计风格
 */

import { useState, useEffect } from 'react';
import { Form, Select, Checkbox, Button, Space } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { usePlatformConfig } from '../../../../hooks/usePlatformConfig';
import { customerApi } from '../../../../services/customerApi';
import type { Customer } from '../../../../types/customer';
import type { DashboardFilters } from '../../../../types/dashboard';
import type { ProjectStatus } from '../../../../types/project';
import { BUSINESS_TYPE_OPTIONS } from '../../../../types/customer';

const { Option } = Select;

interface FilterPanelProps {
  filters: DashboardFilters;
  onChange: (filters: Partial<DashboardFilters>) => void;
  onReset: () => void;
  onSearch: () => void;
  loading?: boolean;
}

// 生成年份选项
function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years;
}

// 月份选项
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

// 状态选项
const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'executing', label: '执行中' },
  { value: 'pending_settlement', label: '待结算' },
  { value: 'settled', label: '已收款' },
  { value: 'closed', label: '已终结' },
];

export function FilterPanel({
  filters,
  onChange,
  onReset,
  onSearch,
  loading,
}: FilterPanelProps) {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const { configs: platformConfigs } = usePlatformConfig();

  // 加载客户列表
  useEffect(() => {
    const loadCustomers = async () => {
      setCustomersLoading(true);
      try {
        const response = await customerApi.getCustomers({ pageSize: 500 });
        if (response.success && response.data?.customers) {
          setCustomers(response.data.customers);
        }
      } catch (error) {
        console.error('加载客户列表失败:', error);
      } finally {
        setCustomersLoading(false);
      }
    };
    loadCustomers();
  }, []);

  // 同步 filters 到表单
  useEffect(() => {
    form.setFieldsValue({
      startYear: filters.startYear,
      startMonth: filters.startMonth,
      endYear: filters.endYear,
      endMonth: filters.endMonth,
      useFinancialPeriod: filters.useFinancialPeriod,
      customerIds: filters.customerIds,
      statuses: filters.statuses,
      platforms: filters.platforms,
      businessTypes: filters.businessTypes,
    });
  }, [form, filters]);

  // 处理表单值变化
  const handleValuesChange = (changedValues: Record<string, unknown>) => {
    onChange(changedValues as Partial<DashboardFilters>);
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <div className="rounded-xl border border-stroke bg-surface p-4 mb-4 shadow-sm">
      <Form
        form={form}
        layout="inline"
        onValuesChange={handleValuesChange}
        className="flex flex-wrap items-center gap-3"
      >
        {/* 时间范围区域 */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-subtle">
          <CalendarOutlined className="text-content-muted text-sm" />
          <Space size={4}>
            <Form.Item name="startYear" noStyle>
              <Select
                placeholder="起始年"
                style={{ width: 90 }}
                allowClear
                size="small"
                className="filter-select"
              >
                {generateYearOptions().map(year => (
                  <Option key={year} value={year}>
                    {year}年
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="startMonth" noStyle>
              <Select
                placeholder="月"
                style={{ width: 70 }}
                allowClear
                size="small"
              >
                {MONTH_OPTIONS.map(month => (
                  <Option key={month} value={month}>
                    {month}月
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <span className="text-content-muted text-xs">至</span>
            <Form.Item name="endYear" noStyle>
              <Select
                placeholder="结束年"
                style={{ width: 90 }}
                allowClear
                size="small"
              >
                {generateYearOptions().map(year => (
                  <Option key={year} value={year}>
                    {year}年
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="endMonth" noStyle>
              <Select
                placeholder="月"
                style={{ width: 70 }}
                allowClear
                size="small"
              >
                {MONTH_OPTIONS.map(month => (
                  <Option key={month} value={month}>
                    {month}月
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="useFinancialPeriod" valuePropName="checked" noStyle>
            <Checkbox className="ml-2 text-xs">
              <span className="text-content-secondary text-xs">财务周期</span>
            </Checkbox>
          </Form.Item>
        </div>

        {/* 筛选条件区域 */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-subtle">
          <Form.Item name="customerIds" noStyle>
            <Select
              mode="multiple"
              placeholder="客户"
              style={{ width: 160 }}
              allowClear
              showSearch
              optionFilterProp="children"
              loading={customersLoading}
              maxTagCount={1}
              size="small"
            >
              {customers.map(customer => (
                <Option key={customer.code} value={customer.code}>
                  {customer.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="statuses" noStyle>
            <Select
              mode="multiple"
              placeholder="状态"
              style={{ width: 120 }}
              allowClear
              maxTagCount={1}
              size="small"
            >
              {STATUS_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="platforms" noStyle>
            <Select
              mode="multiple"
              placeholder="平台"
              style={{ width: 120 }}
              allowClear
              maxTagCount={1}
              size="small"
            >
              {platformConfigs.map(config => (
                <Option key={config.platform} value={config.platform}>
                  {config.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="businessTypes" noStyle>
            <Select
              mode="multiple"
              placeholder="业务类型"
              style={{ width: 120 }}
              allowClear
              maxTagCount={1}
              size="small"
            >
              {BUSINESS_TYPE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={onSearch}
            loading={loading}
            className="shadow-sm"
          >
            查询
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={loading}
          >
            重置
          </Button>
        </div>
      </Form>
    </div>
  );
}
