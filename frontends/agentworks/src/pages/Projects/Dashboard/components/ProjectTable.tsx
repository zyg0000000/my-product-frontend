/**
 * 项目列表表格组件（使用 ProTable）
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Tag, Space, Button, Tooltip } from 'antd';
import { EyeOutlined, StopOutlined } from '@ant-design/icons';
import type { ProjectWithFinance } from '../../../../types/dashboard';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  formatMoney,
} from '../../../../types/project';
import { PLATFORM_NAMES } from '../../../../types/talent';

interface ProjectTableProps {
  data: ProjectWithFinance[];
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPaginationChange: (current: number, pageSize: number) => void;
  excludedIds: Set<string>;
  onExcludeChange: (projectId: string, excluded: boolean) => void;
}

/**
 * 格式化百分比
 */
function formatPercent(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

// 平台颜色映射
const PLATFORM_COLORS: Record<string, string> = {
  douyin: '#fe2c55',
  xiaohongshu: '#ff2442',
  kuaishou: '#ff7300',
  bilibili: '#00a1d6',
};

export function ProjectTable({
  data,
  loading,
  pagination,
  onPaginationChange,
  excludedIds,
  onExcludeChange,
}: ProjectTableProps) {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<ProjectWithFinance>[] = [
    {
      title: '项目名称',
      dataIndex: 'name',
      width: 180,
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => (
        <a
          className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
          onClick={() => navigate(`/projects/${record.id}`)}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      width: 100,
      ellipsis: true,
      render: (_, record) => record.customerName || '-',
    },
    {
      title: '平台',
      dataIndex: 'platforms',
      width: 120,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {(record.platforms || []).map(platform => (
            <Tag
              key={platform}
              style={{
                backgroundColor: PLATFORM_COLORS[platform] || '#666',
                color: 'white',
                border: 'none',
                fontSize: '11px',
                padding: '0 4px',
                margin: 0,
              }}
            >
              {PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES] || platform}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, record) => (
        <Tag color={PROJECT_STATUS_COLORS[record.status] || 'default'}>
          {PROJECT_STATUS_LABELS[record.status] || record.status}
        </Tag>
      ),
    },
    {
      title: '周期',
      key: 'period',
      width: 90,
      render: (_, record) => `${record.year}年${record.month}月`,
    },
    {
      title: '达人数',
      key: 'collaborationCount',
      width: 70,
      align: 'right',
      render: (_, record) =>
        record.financeStats?.collaborationCount ??
        record.stats?.collaborationCount ??
        '-',
    },
    {
      title: '已发布',
      key: 'publishedCount',
      width: 70,
      align: 'right',
      render: (_, record) =>
        record.financeStats?.publishedCount ?? record.stats?.publishedCount ?? '-',
    },
    {
      title: '执行金额',
      key: 'totalAmount',
      width: 110,
      align: 'right',
      render: (_, record) => {
        const amount =
          record.financeStats?.totalAmount ?? record.stats?.totalAmount;
        return amount ? (
          <span className="font-medium">{formatMoney(amount)}</span>
        ) : (
          '-'
        );
      },
    },
    {
      title: '收入',
      key: 'revenue',
      width: 110,
      align: 'right',
      render: (_, record) =>
        record.financeStats?.revenue ? (
          <span className="text-blue-600 font-medium">
            {formatMoney(record.financeStats.revenue)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '成本',
      key: 'cost',
      width: 110,
      align: 'right',
      render: (_, record) =>
        record.financeStats?.cost ? (
          <span className="font-medium">{formatMoney(record.financeStats.cost)}</span>
        ) : (
          '-'
        ),
    },
    {
      title: '返点',
      key: 'rebateIncome',
      width: 100,
      align: 'right',
      render: (_, record) =>
        record.financeStats?.rebateIncome ? (
          <span className="text-green-600 font-medium">
            {formatMoney(record.financeStats.rebateIncome)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '基础利润',
      key: 'profit',
      width: 110,
      align: 'right',
      render: (_, record) => {
        if (record.financeStats?.profit === undefined) return '-';
        const profit = record.financeStats.profit;
        return (
          <span
            className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {formatMoney(profit)}
          </span>
        );
      },
    },
    {
      title: '基础利润率',
      key: 'profitRate',
      width: 90,
      align: 'right',
      render: (_, record) => {
        if (record.financeStats?.profitRate === undefined) return '-';
        const rate = record.financeStats.profitRate;
        return (
          <span className={rate >= 0 ? 'text-green-600' : 'text-red-500'}>
            {formatPercent(rate)}
          </span>
        );
      },
    },
    {
      title: '资金占用费',
      key: 'fundsOccupation',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const fee = record.financeStats?.fundsOccupation;
        if (fee === undefined || fee === 0) return '-';
        return (
          <span className="text-pink-500 font-medium">
            {formatMoney(fee)}
          </span>
        );
      },
    },
    {
      title: '净利润',
      key: 'netProfit',
      width: 110,
      align: 'right',
      render: (_, record) => {
        if (record.financeStats?.netProfit === undefined) return '-';
        const netProfit = record.financeStats.netProfit;
        return (
          <span
            className={`font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {formatMoney(netProfit)}
          </span>
        );
      },
    },
    {
      title: '净利润率',
      key: 'netProfitRate',
      width: 90,
      align: 'right',
      render: (_, record) => {
        if (record.financeStats?.netProfitRate === undefined) return '-';
        const rate = record.financeStats.netProfitRate;
        return (
          <span className={rate >= 0 ? 'text-green-600' : 'text-red-500'}>
            {formatPercent(rate)}
          </span>
        );
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const isExcluded = excludedIds.has(record.id);
        return (
          <Space size={4}>
            <Tooltip title={isExcluded ? '取消排除' : '排除此项目'}>
              <Button
                type="text"
                size="small"
                danger={!isExcluded}
                icon={<StopOutlined />}
                onClick={() => onExcludeChange(record.id, !isExcluded)}
                style={{
                  color: isExcluded ? '#52c41a' : undefined,
                }}
              />
            </Tooltip>
            <Tooltip title="查看详情">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/projects/${record.id}`)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  // 统计排除数量
  const excludedCount = data.filter(p => excludedIds.has(p.id)).length;

  return (
    <div>
      {excludedCount > 0 && (
        <div className="mb-2 text-sm text-orange-500">
          已排除 {excludedCount} 个项目（不计入汇总统计）
        </div>
      )}
      <ProTable<ProjectWithFinance>
        columns={columns}
        actionRef={actionRef}
        dataSource={data}
        loading={loading}
        rowKey="id"
        search={false}
        options={{
          fullScreen: true,
          density: true,
          setting: true,
        }}
        rowClassName={record =>
          excludedIds.has(record.id) ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''
        }
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => `共 ${total} 个项目`,
          pageSizeOptions: ['20', '50', '100'],
          onChange: (page, size) => {
            onPaginationChange(page, size);
          },
        }}
        scroll={{ x: 1800 }}
      />
    </div>
  );
}
