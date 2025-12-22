/**
 * 对比结果表格组件
 */

import { useMemo, useState } from 'react';
import { Table, Tag, Input, Select, Tooltip, Button, Popover } from 'antd';
import {
  SearchOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  ComparisonResult,
  ComparisonFilter,
  DiffType,
  CompanyRecord,
} from '../types';

interface ComparisonTableProps {
  comparisons: ComparisonResult[];
  loading?: boolean;
  selectedRowKeys: string[];
  onSelectionChange: (keys: string[], rows: ComparisonResult[]) => void;
}

// 差异类型标签配置
const DIFF_TYPE_CONFIG: Record<
  DiffType,
  { color: string; text: string; icon: React.ReactNode }
> = {
  companyHigher: {
    color: 'orange',
    text: '公司更高',
    icon: <ArrowUpOutlined />,
  },
  awHigher: {
    color: 'green',
    text: '我方更高',
    icon: <ArrowDownOutlined />,
  },
  equal: {
    color: 'blue',
    text: '一致',
    icon: <SwapOutlined />,
  },
  noMatch: {
    color: 'default',
    text: '无记录',
    icon: <InfoCircleOutlined />,
  },
};

// 多记录展示组件
function MultiRecordCell({
  records,
}: {
  records: CompanyRecord[];
  awAgencyName: string | null;
}) {
  if (records.length === 0) {
    return <span className="text-content-muted">-</span>;
  }

  if (records.length === 1) {
    const record = records[0];
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">{record.rebateRate}%</span>
        <span className="text-content-secondary text-xs">({record.mcn})</span>
        {record.isSameAgency && (
          <Tag color="green" className="text-xs">
            同机构
          </Tag>
        )}
      </div>
    );
  }

  // 找到最高返点和同机构返点
  const maxRate = Math.max(...records.map(r => r.rebateRate));
  const sameAgencyRecord = records.find(r => r.isSameAgency);

  const content = (
    <div className="space-y-2 max-w-xs">
      <div className="text-sm font-medium mb-2">
        公司库记录 ({records.length}条)
      </div>
      {records.map((record, index) => (
        <div
          key={index}
          className={`flex items-center justify-between gap-4 p-2 rounded ${
            record.isSameAgency
              ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
              : 'bg-surface-subtle'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{record.rebateRate}%</span>
            {record.rebateRate === maxRate && (
              <Tag color="orange" className="text-xs">
                最高
              </Tag>
            )}
            {record.isSameAgency && (
              <Tag color="green" className="text-xs">
                同机构
              </Tag>
            )}
          </div>
          <span className="text-content-secondary text-xs truncate">
            {record.mcn}
          </span>
        </div>
      ))}
      {sameAgencyRecord && sameAgencyRecord.rebateRate < maxRate && (
        <div className="text-xs text-warning-600 dark:text-warning-400 mt-2">
          * 其他机构有更高返点，仅作参考
        </div>
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="right">
      <Button type="link" size="small" className="p-0">
        <div className="flex items-center gap-1">
          <span className="font-medium">{maxRate}%</span>
          <span className="text-content-muted text-xs">
            ({records.length}条)
          </span>
          <DownOutlined className="text-xs" />
        </div>
      </Button>
    </Popover>
  );
}

export function ComparisonTable({
  comparisons,
  loading,
  selectedRowKeys,
  onSelectionChange,
}: ComparisonTableProps) {
  // 筛选状态
  const [filter, setFilter] = useState<ComparisonFilter>({
    diffType: 'all',
    syncStatus: 'all',
    search: '',
  });

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return comparisons.filter(item => {
      // 差异类型筛选
      if (filter.diffType !== 'all' && item.diffType !== filter.diffType) {
        return false;
      }

      // 同步状态筛选
      if (filter.syncStatus === 'canSync' && !item.canSync) {
        return false;
      }
      if (filter.syncStatus === 'referenceOnly' && item.canSync) {
        return false;
      }

      // 搜索筛选
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchName = item.talentName.toLowerCase().includes(searchLower);
        const matchXingtuId = item.xingtuId.toLowerCase().includes(searchLower);
        const matchAgency = item.awAgencyName
          ?.toLowerCase()
          .includes(searchLower);
        if (!matchName && !matchXingtuId && !matchAgency) {
          return false;
        }
      }

      return true;
    });
  }, [comparisons, filter]);

  // 表格列定义
  const columns: ColumnsType<ComparisonResult> = [
    {
      title: '达人',
      key: 'talent',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.talentName}</div>
          <div className="text-xs text-content-muted">{record.xingtuId}</div>
        </div>
      ),
    },
    {
      title: 'AW 机构',
      dataIndex: 'awAgencyName',
      key: 'awAgencyName',
      width: 120,
      ellipsis: true,
      render: (name: string | null) =>
        name || <span className="text-content-muted">野生达人</span>,
    },
    {
      title: 'AW 返点',
      key: 'awRebate',
      width: 100,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{record.awRebate}%</span>
          {record.rebateMode === 'independent' && (
            <Tooltip title="独立返点">
              <Tag className="text-xs">独立</Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '公司库返点',
      key: 'companyRebate',
      width: 180,
      render: (_, record) => (
        <MultiRecordCell
          records={record.companyRecords}
          awAgencyName={record.awAgencyName}
        />
      ),
    },
    {
      title: '差异',
      key: 'diff',
      width: 100,
      render: (_, record) => {
        const config = DIFF_TYPE_CONFIG[record.diffType];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '同步状态',
      key: 'syncStatus',
      width: 100,
      render: (_, record) => {
        if (record.diffType === 'noMatch') {
          return <span className="text-content-muted">-</span>;
        }
        if (record.canSync) {
          return (
            <Tooltip title={`可同步至 ${record.syncRebate}%`}>
              <Tag color="green">可同步</Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="跨机构返点更高，需线下确认">
            <Tag color="yellow">仅参考</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '建议同步值',
      key: 'syncRebate',
      width: 100,
      render: (_, record) => {
        if (!record.canSync || record.syncRebate === null) {
          return <span className="text-content-muted">-</span>;
        }
        return (
          <span className="font-medium text-success-600 dark:text-success-400">
            {record.syncRebate}%
          </span>
        );
      },
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: ComparisonResult[]) => {
      onSelectionChange(keys as string[], rows);
    },
    getCheckboxProps: (record: ComparisonResult) => ({
      disabled: !record.canSync,
      name: record.talentId,
    }),
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索达人名称、星图ID、机构"
          prefix={<SearchOutlined className="text-content-muted" />}
          value={filter.search}
          onChange={e =>
            setFilter(prev => ({ ...prev, search: e.target.value }))
          }
          style={{ width: 260 }}
          allowClear
        />

        <Select
          value={filter.diffType}
          onChange={value => setFilter(prev => ({ ...prev, diffType: value }))}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: '全部差异' },
            { value: 'companyHigher', label: '公司更高' },
            { value: 'awHigher', label: '我方更高' },
            { value: 'equal', label: '一致' },
            { value: 'noMatch', label: '无记录' },
          ]}
        />

        <Select
          value={filter.syncStatus}
          onChange={value =>
            setFilter(prev => ({ ...prev, syncStatus: value }))
          }
          style={{ width: 140 }}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'canSync', label: '可同步' },
            { value: 'referenceOnly', label: '仅参考' },
          ]}
        />

        <div className="text-sm text-content-secondary">
          共 {filteredData.length} 条记录
          {selectedRowKeys.length > 0 && (
            <span className="ml-2">
              ，已选{' '}
              <span className="text-primary-600">{selectedRowKeys.length}</span>{' '}
              条
            </span>
          )}
        </div>
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="talentId"
        rowSelection={rowSelection}
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => `共 ${total} 条`,
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1000 }}
        size="small"
      />
    </div>
  );
}
