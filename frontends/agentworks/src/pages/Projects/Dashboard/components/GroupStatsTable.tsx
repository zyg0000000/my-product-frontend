/**
 * 分组统计表格组件
 */

import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  PlatformGroupStats,
  StatusGroupStats,
  CustomerGroupStats,
} from '../../../../types/dashboard';

type GroupType = 'platform' | 'status' | 'customer';

interface GroupStatsTableProps {
  type: GroupType;
  data: PlatformGroupStats[] | StatusGroupStats[] | CustomerGroupStats[];
  loading?: boolean;
}

/**
 * 格式化金额（分 → 元，带千分位）
 */
function formatMoney(cents: number): string {
  const yuan = cents / 100;
  if (yuan >= 10000) {
    return `¥${(yuan / 10000).toFixed(2)}万`;
  }
  return `¥${yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * 格式化百分比
 */
function formatPercent(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  executing: 'processing',
  pending_settlement: 'warning',
  settled: 'success',
  closed: 'default',
};

// 平台颜色映射
const PLATFORM_COLORS: Record<string, string> = {
  douyin: '#fe2c55',
  xiaohongshu: '#ff2442',
  kuaishou: '#ff7300',
  bilibili: '#00a1d6',
};

export function GroupStatsTable({ type, data, loading }: GroupStatsTableProps) {
  // 根据类型生成列定义
  const getColumns = (): ColumnsType<
    PlatformGroupStats | StatusGroupStats | CustomerGroupStats
  > => {
    const baseColumns: ColumnsType<
      PlatformGroupStats | StatusGroupStats | CustomerGroupStats
    > = [
      {
        title: '项目数',
        dataIndex: 'projectCount',
        key: 'projectCount',
        width: 80,
        align: 'right',
      },
      {
        title: '达人数',
        dataIndex: 'collaborationCount',
        key: 'collaborationCount',
        width: 80,
        align: 'right',
      },
      {
        title: '已发布',
        dataIndex: 'publishedCount',
        key: 'publishedCount',
        width: 80,
        align: 'right',
      },
      {
        title: '执行金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        align: 'right',
        render: (value: number) => formatMoney(value),
      },
      {
        title: '收入',
        dataIndex: 'totalRevenue',
        key: 'totalRevenue',
        width: 120,
        align: 'right',
        render: (value: number) => (
          <span className="text-blue-600">{formatMoney(value)}</span>
        ),
      },
      {
        title: '成本',
        dataIndex: 'totalCost',
        key: 'totalCost',
        width: 120,
        align: 'right',
        render: (value: number) => formatMoney(value),
      },
      {
        title: '返点收入',
        dataIndex: 'totalRebateIncome',
        key: 'totalRebateIncome',
        width: 100,
        align: 'right',
        render: (value: number) => (
          <span className="text-green-600">{formatMoney(value)}</span>
        ),
      },
      {
        title: '利润',
        dataIndex: 'totalProfit',
        key: 'totalProfit',
        width: 120,
        align: 'right',
        render: (value: number) => (
          <span className={value >= 0 ? 'text-green-600' : 'text-red-500'}>
            {formatMoney(value)}
          </span>
        ),
      },
      {
        title: '利润率',
        dataIndex: 'profitRate',
        key: 'profitRate',
        width: 100,
        align: 'right',
        render: (value: number) => (
          <span className={value >= 0 ? 'text-green-600' : 'text-red-500'}>
            {formatPercent(value)}
          </span>
        ),
      },
    ];

    // 根据类型添加第一列
    if (type === 'platform') {
      const platformColumn = {
        title: '平台',
        dataIndex: 'platformName',
        key: 'platform',
        width: 100,
        fixed: 'left' as const,
        render: (
          name: string,
          record: PlatformGroupStats | StatusGroupStats | CustomerGroupStats
        ) => (
          <Tag
            style={{
              backgroundColor:
                PLATFORM_COLORS[(record as PlatformGroupStats).platform] ||
                '#666',
              color: 'white',
              border: 'none',
            }}
          >
            {name}
          </Tag>
        ),
      };
      return [platformColumn, ...baseColumns];
    }

    if (type === 'status') {
      const statusColumn = {
        title: '状态',
        dataIndex: 'statusLabel',
        key: 'status',
        width: 100,
        fixed: 'left' as const,
        render: (
          label: string,
          record: PlatformGroupStats | StatusGroupStats | CustomerGroupStats
        ) => (
          <Tag
            color={
              STATUS_COLORS[(record as StatusGroupStats).status] || 'default'
            }
          >
            {label}
          </Tag>
        ),
      };
      return [statusColumn, ...baseColumns];
    }

    // customer
    const customerColumn = {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customer',
      width: 150,
      fixed: 'left' as const,
      ellipsis: true,
    };
    return [customerColumn, ...baseColumns];
  };

  // 生成 rowKey
  const getRowKey = (
    record: PlatformGroupStats | StatusGroupStats | CustomerGroupStats
  ): string => {
    if ('platform' in record) return record.platform;
    if ('status' in record) return record.status;
    return (record as CustomerGroupStats).customerId;
  };

  return (
    <Table
      columns={getColumns()}
      dataSource={data}
      rowKey={getRowKey}
      loading={loading}
      size="small"
      pagination={false}
      scroll={{ x: 1100 }}
      summary={pageData => {
        if (pageData.length === 0) return null;

        // 计算合计
        const totals = pageData.reduce(
          (acc, curr) => ({
            projectCount: acc.projectCount + curr.projectCount,
            collaborationCount:
              acc.collaborationCount + curr.collaborationCount,
            publishedCount: acc.publishedCount + curr.publishedCount,
            totalAmount: acc.totalAmount + curr.totalAmount,
            totalRevenue: acc.totalRevenue + curr.totalRevenue,
            totalCost: acc.totalCost + curr.totalCost,
            totalRebateIncome: acc.totalRebateIncome + curr.totalRebateIncome,
            totalProfit: acc.totalProfit + curr.totalProfit,
          }),
          {
            projectCount: 0,
            collaborationCount: 0,
            publishedCount: 0,
            totalAmount: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalRebateIncome: 0,
            totalProfit: 0,
          }
        );

        const profitRate =
          totals.totalRevenue > 0
            ? (totals.totalProfit / totals.totalRevenue) * 100
            : 0;

        return (
          <Table.Summary fixed>
            <Table.Summary.Row className="bg-gray-50 font-medium">
              <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                {totals.projectCount}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                {totals.collaborationCount}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                {totals.publishedCount}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                {formatMoney(totals.totalAmount)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <span className="text-blue-600">
                  {formatMoney(totals.totalRevenue)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                {formatMoney(totals.totalCost)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <span className="text-green-600">
                  {formatMoney(totals.totalRebateIncome)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <span
                  className={
                    totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'
                  }
                >
                  {formatMoney(totals.totalProfit)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right">
                <span
                  className={
                    profitRate >= 0 ? 'text-green-600' : 'text-red-500'
                  }
                >
                  {formatPercent(profitRate)}
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
    />
  );
}
