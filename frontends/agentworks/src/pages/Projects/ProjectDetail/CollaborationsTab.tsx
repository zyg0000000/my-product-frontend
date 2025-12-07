/**
 * 合作达人 Tab
 * 展示项目下的所有合作记录，支持添加、编辑、删除
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, Popconfirm, App, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type {
  Collaboration,
  CollaborationStatus,
} from '../../../types/project';
import {
  COLLABORATION_STATUS_COLORS,
  COLLABORATION_STATUS_VALUE_ENUM,
  formatMoney,
  isDelayed,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { CollaborationFormModal } from './CollaborationFormModal';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

interface CollaborationsTabProps {
  projectId: string;
  platforms: Platform[];
  onRefresh?: () => void;
}

export function CollaborationsTab({
  projectId,
  platforms,
  onRefresh,
}: CollaborationsTabProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('');
  const [statusFilter, setStatusFilter] = useState<CollaborationStatus | ''>(
    ''
  );

  // 弹窗状态
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCollaboration, setEditingCollaboration] =
    useState<Collaboration | null>(null);

  /**
   * 加载合作记录
   */
  const loadCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApi.getCollaborations({
        projectId,
        page: currentPage,
        pageSize,
        platform: platformFilter || undefined,
        status: statusFilter || undefined,
      });

      if (response.success) {
        setCollaborations(response.data.items);
        setTotal(response.data.total);
      } else {
        setCollaborations([]);
        setTotal(0);
        message.error('获取合作记录失败');
      }
    } catch (error) {
      logger.error('Error loading collaborations:', error);
      message.error('获取合作记录失败');
      setCollaborations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentPage, pageSize, platformFilter, statusFilter, message]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 删除合作记录
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await projectApi.deleteCollaboration(id);
      if (response.success) {
        message.success('删除成功');
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  /**
   * 新建合作记录
   */
  const handleCreate = () => {
    setEditingCollaboration(null);
    setFormModalOpen(true);
  };

  /**
   * 编辑合作记录
   */
  const handleEdit = (record: Collaboration) => {
    setEditingCollaboration(record);
    setFormModalOpen(true);
  };

  /**
   * 表单提交成功
   */
  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setEditingCollaboration(null);
    loadCollaborations();
    onRefresh?.();
  };

  /**
   * 跳转到达人详情
   */
  const handleViewTalent = (record: Collaboration) => {
    navigate(`/talents/${record.talentOneId}/${record.talentPlatform}`);
  };

  /**
   * 生成平台筛选选项
   */
  const getPlatformOptions = () => {
    const options: Record<string, { text: string }> = {};
    platforms.forEach(p => {
      options[p] = { text: platformNames[p] || p };
    });
    return options;
  };

  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人',
      dataIndex: 'talentName',
      width: 140,
      fixed: 'left',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (
        <a
          className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
          onClick={() => handleViewTalent(record)}
        >
          {record.talentName || record.talentOneId}
        </a>
      ),
    },
    {
      title: '平台',
      dataIndex: 'talentPlatform',
      width: 100,
      valueType: 'select',
      valueEnum: getPlatformOptions(),
      render: (_, record) => (
        <Tag color={platformColors[record.talentPlatform] || 'default'}>
          {platformNames[record.talentPlatform] || record.talentPlatform}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: COLLABORATION_STATUS_VALUE_ENUM,
      render: (_, record) => (
        <Tag color={COLLABORATION_STATUS_COLORS[record.status]}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: '达人来源',
      dataIndex: 'talentSource',
      width: 100,
      hideInSearch: true,
      render: (_, record) => record.talentSource || '-',
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 120,
      hideInSearch: true,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '返点率',
      dataIndex: 'rebateRate',
      width: 80,
      hideInSearch: true,
      render: (_, record) =>
        record.rebateRate ? `${record.rebateRate}%` : '-',
    },
    {
      title: '计划发布',
      dataIndex: 'plannedReleaseDate',
      width: 110,
      hideInSearch: true,
      render: (_, record) => {
        const delayed = isDelayed(
          record.plannedReleaseDate,
          record.actualReleaseDate,
          record.status
        );
        return record.plannedReleaseDate ? (
          <Tooltip title={delayed ? '已延期' : undefined}>
            <span className={delayed ? 'text-red-500' : ''}>
              {record.plannedReleaseDate}
            </span>
          </Tooltip>
        ) : (
          '-'
        );
      },
    },
    {
      title: '实际发布',
      dataIndex: 'actualReleaseDate',
      width: 110,
      hideInSearch: true,
      render: (_, record) => record.actualReleaseDate || '-',
    },
    {
      title: '视频链接',
      dataIndex: 'videoUrl',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.videoUrl ? (
          <a
            href={record.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700"
          >
            <ExportOutlined /> 查看
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该合作记录？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
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

  return (
    <div>
      <ProTable<Collaboration>
        columns={columns}
        actionRef={actionRef}
        cardBordered={false}
        dataSource={collaborations}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: t => `共 ${t} 条`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
        search={{
          labelWidth: 80,
          span: 8,
          defaultCollapsed: true,
        }}
        onSubmit={params => {
          setPlatformFilter((params.talentPlatform as Platform) || '');
          setStatusFilter((params.status as CollaborationStatus) || '');
          setCurrentPage(1);
        }}
        onReset={() => {
          setPlatformFilter('');
          setStatusFilter('');
          setCurrentPage(1);
        }}
        dateFormatter="string"
        headerTitle={false}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            添加达人
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => loadCollaborations()}
          >
            刷新
          </Button>,
        ]}
        scroll={{ x: 1200 }}
        options={{
          reload: false,
          density: false,
          setting: true,
        }}
        size="middle"
      />

      {/* 合作记录表单弹窗 */}
      <CollaborationFormModal
        open={formModalOpen}
        projectId={projectId}
        platforms={platforms}
        editingCollaboration={editingCollaboration}
        onCancel={() => {
          setFormModalOpen(false);
          setEditingCollaboration(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

export default CollaborationsTab;
