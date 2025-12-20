/**
 * 合作达人 Tab
 * 展示项目下的所有合作记录，支持添加、编辑、删除
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Tag,
  Space,
  Popconfirm,
  App,
  Modal,
  Select,
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type {
  Collaboration,
  CollaborationStatus,
} from '../../../types/project';
import {
  COLLABORATION_STATUS_COLORS,
  COLLABORATION_STATUS_VALUE_ENUM,
  COLLABORATION_STATUS_OPTIONS,
  formatMoney,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { CollaborationFormModal } from './CollaborationFormModal';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../components/TalentNameWithLinks';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

interface CollaborationsTabProps {
  projectId: string;
  customerId: string; // v2.1: 用于获取客户级返点
  platforms: Platform[];
  onRefresh?: () => void;
}

export function CollaborationsTab({
  projectId,
  customerId,
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

  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchStatus, setBatchStatus] = useState<CollaborationStatus | null>(
    null
  );
  const [batchLoading, setBatchLoading] = useState(false);

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
   * 批量更新状态
   */
  const handleBatchUpdateStatus = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择记录');
      return;
    }
    if (!batchStatus) {
      message.warning('请选择状态');
      return;
    }

    try {
      setBatchLoading(true);
      const response = await projectApi.batchUpdateCollaborations({
        ids: selectedRowKeys as string[],
        updates: { status: batchStatus },
      });

      if (response.success) {
        message.success(`已更新 ${response.data.updated} 条记录`);
        setBatchModalOpen(false);
        setBatchStatus(null);
        setSelectedRowKeys([]);
        loadCollaborations();
        onRefresh?.();
      } else {
        message.error('批量更新失败');
      }
    } catch (error) {
      logger.error('Error batch updating collaborations:', error);
      message.error('批量更新失败');
    } finally {
      setBatchLoading(false);
    }
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
      title: '达人昵称',
      dataIndex: 'talentName',
      width: 140,
      fixed: 'left',
      ellipsis: true,
      search: false,
      render: (_, record) => (
        <TalentNameWithLinks
          {...fromCollaboration(record)}
          onNameClick={() => handleViewTalent(record)}
          nameAsLink
        />
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
      search: false,
      render: (_, record) => record.talentSource || '-',
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 120,
      search: false,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '返点率',
      dataIndex: 'rebateRate',
      width: 80,
      search: false,
      render: (_, record) =>
        record.rebateRate ? `${record.rebateRate}%` : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除该合作记录？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
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
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys),
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <span>已选择 {selectedRowKeys.length} 项</span>
        )}
        tableAlertOptionRender={() => (
          <Space>
            <Button
              size="small"
              onClick={() => setBatchModalOpen(true)}
              disabled={selectedRowKeys.length === 0}
            >
              批量更新状态
            </Button>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        )}
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
        ]}
        scroll={{ x: 1200 }}
        options={{
          fullScreen: true,
          density: true,
          setting: true,
        }}
      />

      {/* 合作记录表单弹窗 */}
      <CollaborationFormModal
        open={formModalOpen}
        projectId={projectId}
        customerId={customerId}
        platforms={platforms}
        editingCollaboration={editingCollaboration}
        onCancel={() => {
          setFormModalOpen(false);
          setEditingCollaboration(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* 批量更新状态弹窗 */}
      <Modal
        title="批量更新状态"
        open={batchModalOpen}
        onOk={handleBatchUpdateStatus}
        onCancel={() => {
          setBatchModalOpen(false);
          setBatchStatus(null);
        }}
        confirmLoading={batchLoading}
        okText="确定"
        cancelText="取消"
      >
        <div className="py-4">
          <p className="text-content-secondary mb-4">
            已选择{' '}
            <span className="font-medium text-primary-600">
              {selectedRowKeys.length}
            </span>{' '}
            条记录，将统一更新为：
          </p>
          <Select
            placeholder="选择目标状态"
            style={{ width: '100%' }}
            value={batchStatus}
            onChange={v => setBatchStatus(v)}
            options={COLLABORATION_STATUS_OPTIONS.map(s => ({
              label: s,
              value: s,
            }))}
          />
        </div>
      </Modal>
    </div>
  );
}

export default CollaborationsTab;
