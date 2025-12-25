/**
 * 已生成表格列表组件
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Space, App, Popconfirm, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileExcelOutlined,
  LinkOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { registrationApi } from '../../../../api/registration';
import type { GeneratedSheet } from '../../../../types/registration';

interface GeneratedSheetsTableProps {
  projectId: string;
}

export function GeneratedSheetsTable({ projectId }: GeneratedSheetsTableProps) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<GeneratedSheet[]>([]);

  // 加载数据
  const loadSheets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await registrationApi.getGeneratedSheets(projectId);
      if (response.success && response.data) {
        setSheets(response.data);
      }
    } catch (error) {
      console.error('Load generated sheets error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  // 删除表格
  const handleDelete = async (sheet: GeneratedSheet) => {
    try {
      const response = await registrationApi.deleteGeneratedSheet(sheet._id);
      if (response.success) {
        message.success('删除成功');
        loadSheets();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('删除失败');
      console.error('Delete sheet error:', error);
    }
  };

  // 表格列定义
  const columns: ColumnsType<GeneratedSheet> = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className="flex items-center gap-2">
          <FileExcelOutlined className="text-success-500" />
          {name}
        </span>
      ),
    },
    {
      title: '使用模板',
      dataIndex: 'templateName',
      key: 'templateName',
      width: 150,
    },
    {
      title: '达人数量',
      dataIndex: 'talentCount',
      key: 'talentCount',
      width: 100,
      render: (count: number) => `${count} 人`,
    },
    {
      title: '生成时间',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            href={record.url}
            target="_blank"
          >
            打开
          </Button>
          <Popconfirm
            title="确定要删除这个表格记录吗？"
            description="删除后无法恢复，但飞书文档不会被删除"
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (sheets.length === 0 && !loading) {
    return null; // 没有表格时不显示这个区域
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <FileExcelOutlined />
          已生成表格
        </span>
      }
      size="small"
      className="shadow-sm"
    >
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={sheets}
        loading={loading}
        pagination={false}
        size="small"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无已生成的表格"
            />
          ),
        }}
      />
    </Card>
  );
}
