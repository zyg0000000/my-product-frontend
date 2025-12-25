/**
 * 统一达人表格 - 替代原来的5个分类表格
 * 支持筛选、排序、编辑备注
 */

import { useState } from 'react';
import { Table, Tag, Input, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  SaveOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { DailyReportDetail } from '../../../../types/dailyReport';
import {
  CPM_CATEGORIES,
  getCPMCategoryConfig,
  formatViews,
  formatCPM,
  formatCPMChange,
  getCPMCategory,
} from '../../../../types/dailyReport';

interface TalentDetailTableProps {
  data: DailyReportDetail[];
  onSaveSolution: (
    collaborationId: string,
    solution: string
  ) => Promise<boolean>;
  onViewTrend?: (collaborationId: string, talentName: string) => void;
  saving: boolean;
  /** 是否正在导出图片（隐藏编辑按钮和操作列） */
  isExporting?: boolean;
}

export function TalentDetailTable({
  data,
  onSaveSolution,
  onViewTrend,
  saving,
  isExporting = false,
}: TalentDetailTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // 编辑操作
  const handleEdit = (record: DailyReportDetail) => {
    setEditingId(record.collaborationId);
    setEditValue(record.solution || '');
  };

  const handleSave = async (collaborationId: string) => {
    const success = await onSaveSolution(collaborationId, editValue);
    if (success) {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  // 表格列定义
  const columns: ColumnsType<DailyReportDetail> = [
    {
      title: '达人昵称',
      dataIndex: 'talentName',
      key: 'talentName',
      width: 120,
      render: (name: string) => (
        <span className="font-medium text-[var(--aw-gray-800)]">{name}</span>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishDate',
      key: 'publishDate',
      width: 90,
      render: (date: string | undefined) => {
        if (!date) return <span className="text-[var(--aw-gray-400)]">-</span>;
        // 格式化日期显示 MM-DD
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return <span className="tabular-nums">{`${month}-${day}`}</span>;
      },
      sorter: (a, b) => {
        if (!a.publishDate) return 1;
        if (!b.publishDate) return -1;
        return (
          new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
        );
      },
    },
    {
      title: 'CPM分类',
      key: 'cpmCategory',
      width: 130,
      render: (_, record) => {
        const category = getCPMCategory(record.totalViews, record.cpm);
        const config = getCPMCategoryConfig(category);
        return (
          <Tag
            style={{
              backgroundColor: `${config.color}20`,
              color: config.color,
              border: `1px solid ${config.color}40`,
            }}
          >
            {config.label}
          </Tag>
        );
      },
      filters: CPM_CATEGORIES.map(cat => ({
        text: cat.label,
        value: cat.key,
      })),
      onFilter: (value, record) => {
        const category = getCPMCategory(record.totalViews, record.cpm);
        return category === value;
      },
    },
    {
      title: '播放量',
      dataIndex: 'totalViews',
      key: 'totalViews',
      width: 150,
      align: 'right',
      render: (views: number, record) => (
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-medium tabular-nums">{formatViews(views)}</span>
          {record.viewsChange !== undefined && (
            <span
              className={`text-xs tabular-nums ${
                record.viewsChange > 0
                  ? 'text-[var(--aw-success-500)]'
                  : record.viewsChange < 0
                    ? 'text-[var(--aw-danger-500)]'
                    : 'text-[var(--aw-gray-400)]'
              }`}
            >
              {record.viewsChange > 0 ? '+' : ''}
              {formatViews(record.viewsChange)}
            </span>
          )}
        </span>
      ),
      sorter: (a, b) => a.totalViews - b.totalViews,
    },
    {
      title: 'CPM',
      dataIndex: 'cpm',
      key: 'cpm',
      width: 130,
      align: 'right',
      render: (cpm: number, record) => (
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-medium tabular-nums">{formatCPM(cpm)}</span>
          {record.cpmChange !== undefined && record.cpmChange !== 0 && (
            <span
              className={`text-xs tabular-nums ${record.cpmChange > 0 ? 'text-[var(--aw-danger-500)]' : 'text-[var(--aw-success-500)]'}`}
            >
              {formatCPMChange(record.cpmChange)}
            </span>
          )}
        </span>
      ),
      sorter: (a, b) => a.cpm - b.cpm,
      defaultSortOrder: 'descend',
    },
    {
      title: '备注',
      dataIndex: 'solution',
      key: 'solution',
      width: 200,
      align: 'center',
      render: (solution: string, record) => {
        // 导出时只显示文字，不显示编辑按钮
        if (isExporting) {
          return (
            <span className="text-[var(--aw-gray-600)]">{solution || '-'}</span>
          );
        }

        const isEditing = editingId === record.collaborationId;

        if (isEditing) {
          return (
            <Space size={4}>
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder="输入备注..."
                style={{ width: 140 }}
                onPressEnter={() => handleSave(record.collaborationId)}
                autoFocus
                size="small"
              />
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={() => handleSave(record.collaborationId)}
              />
              <Button size="small" onClick={handleCancel}>
                取消
              </Button>
            </Space>
          );
        }

        return (
          <div className="flex items-center justify-center gap-2">
            <span className="text-[var(--aw-gray-600)] truncate max-w-[160px]">
              {solution || '-'}
            </span>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </div>
        );
      },
    },
    // 导出时不显示操作列
    ...(!isExporting
      ? [
          {
            title: '操作',
            key: 'action',
            width: 70,
            align: 'center' as const,
            render: (_: unknown, record: DailyReportDetail) => (
              <Button
                type="text"
                size="small"
                icon={<LineChartOutlined />}
                onClick={() =>
                  onViewTrend?.(record.collaborationId, record.talentName)
                }
                title="查看趋势"
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="collaborationId"
        pagination={
          data.length > 20 ? { pageSize: 20, showSizeChanger: true } : false
        }
        size="small"
        scroll={{ x: 890 }}
        className="border border-[var(--aw-gray-200)] rounded-lg overflow-hidden"
      />
    </div>
  );
}
