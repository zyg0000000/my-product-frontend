/**
 * 执行看板 - 筛选栏组件
 */

import { useMemo } from 'react';
import { Select, Button, Space, Tag, Radio } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Platform } from '../../../types/talent';
import type {
  ExecutionFilters,
  CustomerOption,
  ProjectOption,
  CycleType,
} from '../types';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

// 周期类型选项
const CYCLE_TYPE_OPTIONS = [
  { value: 'business', label: '业务周期' },
  { value: 'financial', label: '财务周期' },
];

// 生成年份选项（当前年 -2 ~ +1 年）
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push({ value: y, label: `${y}年` });
  }
  return years;
};

// 生成月份选项（1-12月）
const generateMonthOptions = () => {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push({ value: m, label: `${m}月` });
  }
  return months;
};

const YEAR_OPTIONS = generateYearOptions();
const MONTH_OPTIONS = generateMonthOptions();

interface FilterBarProps {
  customers: CustomerOption[];
  projects: ProjectOption[];
  filters: ExecutionFilters;
  onFilterChange: (filters: Partial<ExecutionFilters>) => void;
  onReset: () => void;
  loading?: boolean;
}

export function FilterBar({
  customers,
  projects,
  filters,
  onFilterChange,
  onReset,
  loading,
}: FilterBarProps) {
  const { getPlatformNames } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);

  // 平台选项
  const platformOptions = useMemo(() => {
    return Object.entries(platformNames).map(([key, name]) => ({
      value: key as Platform,
      label: name,
    }));
  }, [platformNames]);

  // 客户选项（过滤掉 id 为空的客户）
  const customerOptions = useMemo(() => {
    return customers
      .filter(c => c.id)
      .map(c => ({
        value: c.id,
        label: c.name,
      }));
  }, [customers]);

  // 项目选项（仅显示执行中的项目，但允许选择其他状态）
  const projectOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: p.name,
      status: p.status,
    }));
  }, [projects]);

  // 处理客户变更
  const handleCustomerChange = (customerId: string | null) => {
    onFilterChange({
      customerId,
      projectIds: [], // 清空项目选择
    });
  };

  // 处理项目变更
  const handleProjectChange = (projectIds: string[]) => {
    onFilterChange({ projectIds });
  };

  // 处理平台变更
  const handlePlatformChange = (platforms: Platform[]) => {
    onFilterChange({ platforms });
  };

  // 处理周期类型变更
  const handleCycleTypeChange = (type: CycleType) => {
    onFilterChange({
      cycle: { ...filters.cycle, type },
      projectIds: [], // 周期类型变化时清空项目选择
    });
  };

  // 处理年份变更
  const handleYearChange = (year: number | null) => {
    onFilterChange({
      cycle: { ...filters.cycle, year },
      projectIds: [], // 年份变化时清空项目选择
    });
  };

  // 处理月份变更
  const handleMonthChange = (month: number | null) => {
    onFilterChange({
      cycle: { ...filters.cycle, month },
      projectIds: [], // 月份变化时清空项目选择
    });
  };

  // 自动选择所有执行中的项目
  const handleSelectExecuting = () => {
    const executingIds = projects
      .filter(p => p.status === 'executing')
      .map(p => p.id);
    onFilterChange({ projectIds: executingIds });
  };

  return (
    <div className="bg-surface rounded-xl border border-stroke p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-5">
        {/* 周期类型切换 */}
        <div className="flex items-center gap-2.5">
          <Radio.Group
            value={filters.cycle.type}
            onChange={e => handleCycleTypeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            {CYCLE_TYPE_OPTIONS.map(opt => (
              <Radio.Button key={opt.value} value={opt.value}>
                {opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        {/* 年份选择 */}
        <div className="flex items-center gap-2.5">
          <Select
            placeholder="选择年份"
            value={filters.cycle.year}
            onChange={handleYearChange}
            style={{ width: 100 }}
            allowClear
            options={YEAR_OPTIONS}
          />
        </div>

        {/* 月份选择 */}
        <div className="flex items-center gap-2.5">
          <Select
            placeholder="选择月份"
            value={filters.cycle.month}
            onChange={handleMonthChange}
            style={{ width: 88 }}
            allowClear
            options={MONTH_OPTIONS}
          />
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-stroke" />

        {/* 客户选择 */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-content-secondary whitespace-nowrap">
            客户
          </span>
          <Select
            placeholder="选择客户"
            value={filters.customerId}
            onChange={handleCustomerChange}
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            allowClear
            options={customerOptions}
          />
        </div>

        {/* 项目选择 */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-content-secondary whitespace-nowrap">
            项目
          </span>
          <Select
            mode="multiple"
            placeholder="选择项目"
            value={filters.projectIds}
            onChange={handleProjectChange}
            options={projectOptions}
            optionRender={option => (
              <Space>
                <span>{option.label}</span>
                {option.data.status === 'executing' && (
                  <Tag color="processing" className="text-xs">
                    执行中
                  </Tag>
                )}
              </Space>
            )}
            style={{ minWidth: 200 }}
            maxTagCount={2}
            disabled={!filters.customerId}
            popupRender={menu => (
              <div>
                {menu}
                <div className="border-t border-stroke p-2">
                  <Button
                    type="link"
                    size="small"
                    onClick={handleSelectExecuting}
                    className="w-full text-left"
                  >
                    选择所有执行中项目
                  </Button>
                </div>
              </div>
            )}
          />
        </div>

        {/* 平台筛选 */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-content-secondary whitespace-nowrap">
            平台
          </span>
          <Select
            mode="multiple"
            placeholder="全部平台"
            value={filters.platforms}
            onChange={handlePlatformChange}
            options={platformOptions}
            style={{ minWidth: 140 }}
            maxTagCount={1}
            allowClear
          />
        </div>

        {/* 重置按钮 */}
        <Button icon={<ReloadOutlined spin={loading} />} onClick={onReset}>
          重置
        </Button>
      </div>

      {/* 已选项目标签 */}
      {filters.projectIds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stroke/50 flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-medium text-content-muted">
            已选项目：
          </span>
          {filters.projectIds.map((id, index) => {
            const project = projects.find(p => p.id === id);
            if (!project) return null;
            return (
              <Tag
                key={id}
                closable
                onClose={() => {
                  const newIds = filters.projectIds.filter(pid => pid !== id);
                  onFilterChange({ projectIds: newIds });
                }}
                className="text-xs"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: [
                    '#3B82F6',
                    '#10B981',
                    '#8B5CF6',
                    '#F59E0B',
                    '#EC4899',
                    '#06B6D4',
                    '#D97706',
                    '#6366F1',
                  ][index % 8],
                }}
              >
                {project.name}
              </Tag>
            );
          })}
        </div>
      )}
    </div>
  );
}
