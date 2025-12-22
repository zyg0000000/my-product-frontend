/**
 * 版本管理弹窗
 */

import { Modal, Table, Button, Popconfirm, Tag, Tooltip, Empty } from 'antd';
import { DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { CompanyRebateVersion } from '../types';

interface VersionManagerModalProps {
  open: boolean;
  versions: CompanyRebateVersion[];
  loading?: boolean;
  onSetDefault: (importId: string) => Promise<boolean>;
  onDelete: (importId: string) => Promise<boolean>;
  onClose: () => void;
}

export function VersionManagerModal({
  open,
  versions,
  loading,
  onSetDefault,
  onDelete,
  onClose,
}: VersionManagerModalProps) {
  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 表格列定义
  const columns: ColumnsType<CompanyRebateVersion> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (fileName: string, record) => (
        <div className="flex items-center gap-2">
          <span>{fileName}</span>
          {record.isDefault && (
            <Tag color="green" className="text-xs">
              默认
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      align: 'right',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: '导入时间',
      dataIndex: 'importedAt',
      key: 'importedAt',
      width: 160,
      render: (date: string) => formatDate(date),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      width: 150,
      ellipsis: true,
      render: (note: string | null) => note || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {/* 设为默认 */}
          {!record.isDefault && (
            <Tooltip title="设为默认版本">
              <Button
                type="text"
                size="small"
                icon={<StarOutlined />}
                onClick={() => onSetDefault(record.importId)}
              />
            </Tooltip>
          )}
          {record.isDefault && (
            <Tooltip title="当前默认版本">
              <Button
                type="text"
                size="small"
                icon={<StarFilled className="text-yellow-500" />}
                disabled
              />
            </Tooltip>
          )}

          {/* 删除 */}
          <Popconfirm
            title="确认删除"
            description={
              <div className="max-w-xs">
                确定要删除版本 "{record.fileName}" 吗？
                <br />
                此操作不可恢复。
              </div>
            }
            onConfirm={() => onDelete(record.importId)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除版本">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={record.isDefault}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="管理版本"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={800}
    >
      <div className="py-2">
        {versions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无版本，请先导入 Excel 文件"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={versions}
            rowKey="importId"
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ y: 400 }}
          />
        )}
      </div>

      <div className="mt-4 text-xs text-content-muted">
        <ul className="list-disc list-inside space-y-1">
          <li>默认版本将在对比时自动使用</li>
          <li>默认版本无法删除，需要先设置其他版本为默认</li>
          <li>删除版本后，该版本的所有记录将被永久删除</li>
        </ul>
      </div>
    </Modal>
  );
}
