/**
 * 同步确认弹窗
 */

import { Modal, Table, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ComparisonResult } from '../types';

interface SyncConfirmModalProps {
  open: boolean;
  items: ComparisonResult[];
  syncing: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function SyncConfirmModal({
  open,
  items,
  syncing,
  onConfirm,
  onCancel,
}: SyncConfirmModalProps) {
  // 表格列定义
  const columns: ColumnsType<ComparisonResult> = [
    {
      title: '达人',
      key: 'talent',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.talentName}</div>
          <div className="text-xs text-content-muted">{record.xingtuId}</div>
        </div>
      ),
    },
    {
      title: '机构',
      dataIndex: 'awAgencyName',
      key: 'awAgencyName',
      render: (name: string | null) => name || '野生达人',
    },
    {
      title: '当前返点',
      dataIndex: 'awRebate',
      key: 'awRebate',
      width: 100,
      render: (rate: number) => `${rate}%`,
    },
    {
      title: '',
      key: 'arrow',
      width: 50,
      render: () => <span className="text-content-muted">→</span>,
    },
    {
      title: '同步后返点',
      dataIndex: 'syncRebate',
      key: 'syncRebate',
      width: 100,
      render: (rate: number) => (
        <span className="font-medium text-green-600">{rate}%</span>
      ),
    },
    {
      title: '变化',
      key: 'change',
      width: 80,
      render: (_, record) => {
        const change = (record.syncRebate || 0) - record.awRebate;
        return (
          <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        );
      },
    },
  ];

  return (
    <Modal
      title="确认同步"
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="确认同步"
      cancelText="取消"
      okButtonProps={{ loading: syncing }}
      width={700}
    >
      <div className="space-y-4">
        <Alert
          type="info"
          showIcon
          message={`即将同步 ${items.length} 个达人的返点`}
          description="同步后，这些达人将被设置为独立返点模式，不再跟随机构基准返点。"
        />

        <Table
          columns={columns}
          dataSource={items}
          rowKey="talentId"
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
        />

        <div className="text-sm text-content-secondary">
          <div className="font-medium mb-1">同步说明：</div>
          <ul className="list-disc list-inside space-y-1">
            <li>同步将使用公司库中同机构的返点值</li>
            <li>同步后达人返点模式变为"独立返点"</li>
            <li>此操作可在达人详情页撤销（改回跟随机构）</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
