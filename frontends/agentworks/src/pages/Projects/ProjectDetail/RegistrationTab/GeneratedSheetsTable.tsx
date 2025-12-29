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
  PlusOutlined,
} from '@ant-design/icons';
import { registrationApi } from '../../../../api/registration';
import type { GeneratedSheet } from '../../../../types/registration';

interface GeneratedSheetsTableProps {
  projectId: string;
  /** 追加按钮点击回调 */
  onAppendClick?: (sheet: GeneratedSheet) => void;
}

export function GeneratedSheetsTable({
  projectId,
  onAppendClick,
}: GeneratedSheetsTableProps) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<GeneratedSheet[]>([]);

  // 加载数据
  const loadSheets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await registrationApi.getGeneratedSheets(projectId);
      console.log('[GeneratedSheetsTable] API 响应:', response);
      if (response.success && response.data) {
        console.log(
          '[GeneratedSheetsTable] 原始数据:',
          JSON.stringify(response.data, null, 2)
        );
        // 兼容处理：统一字段名（支持旧格式 name/url/timestamp 和新格式 fileName/sheetUrl/createdAt）
        const normalizedData = response.data.map(item => {
          // 使用类型断言处理可能的旧字段名
          const rawItem = item as GeneratedSheet & {
            name?: string;
            url?: string;
            timestamp?: string;
          };
          return {
            ...item,
            fileName: item.fileName || rawItem.name || '未知文件',
            sheetUrl: item.sheetUrl || rawItem.url || '',
            createdAt:
              item.createdAt || rawItem.timestamp || new Date().toISOString(),
          };
        });
        console.log(
          '[GeneratedSheetsTable] 标准化数据:',
          JSON.stringify(normalizedData, null, 2)
        );
        setSheets(normalizedData);
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
      dataIndex: 'fileName',
      key: 'fileName',
      render: (fileName: string) => (
        <span className="flex items-center gap-2">
          <FileExcelOutlined className="text-success-500" />
          {fileName}
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
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string | Date | { $date: string }) => {
        // 处理多种日期格式：字符串、Date 对象、MongoDB ISODate 对象
        let dateValue: Date;
        if (typeof time === 'string') {
          dateValue = new Date(time);
        } else if (time instanceof Date) {
          dateValue = time;
        } else if (time && typeof time === 'object' && '$date' in time) {
          // MongoDB 返回的 ISODate 格式: { $date: "..." }
          dateValue = new Date(time.$date);
        } else {
          return '-';
        }
        // 检查日期是否有效
        if (isNaN(dateValue.getTime())) {
          console.warn('[GeneratedSheetsTable] 无法解析日期:', time);
          return '-';
        }
        return dateValue.toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            href={record.sheetUrl}
            target="_blank"
          >
            打开
          </Button>
          {onAppendClick && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAppendClick(record)}
            >
              追加
            </Button>
          )}
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

  // 始终显示，让用户知道这个功能存在
  // if (sheets.length === 0 && !loading) {
  //   return null;
  // }

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
