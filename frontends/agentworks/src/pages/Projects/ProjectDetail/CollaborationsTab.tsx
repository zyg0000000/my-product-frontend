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
  Project,
} from '../../../types/project';
import {
  COLLABORATION_STATUS_COLORS,
  COLLABORATION_STATUS_OPTIONS,
  formatMoney,
} from '../../../types/project';
import {
  createFinanceContextFromProject,
  batchCalculateFinance,
  type FinanceCalculationContext,
} from '../../../utils/financeCalculator';
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
  /** 项目数据（用于财务计算） */
  project?: Project;
  onRefresh?: () => void;
  /** 是否可编辑（项目状态为「执行中」时才可编辑） */
  editable?: boolean;
}

export function CollaborationsTab({
  projectId,
  customerId,
  platforms,
  project,
  onRefresh,
  editable = true,
}: CollaborationsTabProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);

  // 平台配置
  const {
    configs: platformConfigs,
    getPlatformNames,
    getPlatformColors,
  } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 财务计算上下文
  const financeContext = useMemo<FinanceCalculationContext | null>(() => {
    if (!project || platformConfigs.length === 0) return null;
    return createFinanceContextFromProject(project, platformConfigs);
  }, [project, platformConfigs]);

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [rawCollaborations, setRawCollaborations] = useState<Collaboration[]>(
    []
  );
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('');
  const [statusFilter, setStatusFilter] = useState<CollaborationStatus[]>([]);

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
        statuses: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
      });

      if (response.success) {
        setRawCollaborations(response.data.items);
        setTotal(response.data.total);
      } else {
        setRawCollaborations([]);
        setTotal(0);
        message.error('获取合作记录失败');
      }
    } catch (error) {
      logger.error('Error loading collaborations:', error);
      message.error('获取合作记录失败');
      setRawCollaborations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    currentPage,
    pageSize,
    platformFilter,
    statusFilter.join(','),
    message,
  ]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  // 当原始数据或财务上下文变化时，计算财务字段
  useEffect(() => {
    if (rawCollaborations.length === 0) {
      setCollaborations([]);
      return;
    }

    // 如果有财务计算上下文，计算财务数据
    if (financeContext) {
      const calculatedItems = batchCalculateFinance(
        rawCollaborations,
        financeContext
      );
      setCollaborations(calculatedItems);
    } else {
      setCollaborations(rawCollaborations);
    }
  }, [rawCollaborations, financeContext]);

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
      search: false,
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
      search: false,
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
      title: '刊例价',
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
      title: '客户收入',
      dataIndex: ['finance', 'revenue'],
      width: 120,
      search: false,
      render: (_, record) => {
        const revenue = record.finance?.revenue;
        if (revenue === undefined) return '-';
        return (
          <span className="font-semibold text-primary-600">
            {formatMoney(revenue)}
          </span>
        );
      },
    },
    {
      title: (
        <Tooltip title="基础利润 = 收入 - 成本 + 返点收入">基础利润</Tooltip>
      ),
      dataIndex: ['finance', 'profit'],
      width: 140,
      search: false,
      render: (_, record) => {
        const profit = record.finance?.profit;
        const revenue = record.finance?.revenue;
        if (profit === undefined) return '-';
        const profitRate = revenue ? (profit / revenue) * 100 : 0;
        return (
          <div>
            <span className="font-semibold">{formatMoney(profit)}</span>
            <span
              className={`ml-1 text-xs ${profitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
            >
              {profitRate.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title={editable ? '编辑' : '项目已进入结算阶段，无法编辑'}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={!editable}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除该合作记录？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!editable}
          >
            <Tooltip title={editable ? '删除' : '项目已进入结算阶段，无法删除'}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={!editable}
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
        rowSelection={
          editable
            ? {
                selectedRowKeys,
                onChange: keys => setSelectedRowKeys(keys),
              }
            : undefined
        }
        tableAlertRender={({ selectedRowKeys: keys }) => {
          // 计算选中项的统计数据
          const selectedItems = collaborations.filter(c => keys.includes(c.id));
          const stats = selectedItems.reduce(
            (acc, item) => {
              const amount = item.amount ?? 0;
              const rebateRate = item.rebateRate ?? 0;
              const revenue = item.finance?.revenue ?? 0;
              const profit = item.finance?.profit ?? 0;
              return {
                count: acc.count + 1,
                amount: acc.amount + amount,
                // 加权返点：刊例价 × 返点率
                weightedRebate: acc.weightedRebate + amount * rebateRate,
                revenue: acc.revenue + revenue,
                profit: acc.profit + profit,
              };
            },
            { count: 0, amount: 0, weightedRebate: 0, revenue: 0, profit: 0 }
          );
          // 加权平均返点率 = Σ(刊例价 × 返点率) / Σ(刊例价)
          const avgRebateRate =
            stats.amount > 0 ? stats.weightedRebate / stats.amount : 0;
          const profitRate =
            stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;

          return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium">已选择 {keys.length} 人</span>
              <span className="text-gray-300">|</span>
              <span>
                刊例价{' '}
                <span className="font-semibold">
                  {formatMoney(stats.amount)}
                </span>
              </span>
              <span>
                返点率{' '}
                <span className="font-semibold">
                  {avgRebateRate.toFixed(1)}%
                </span>
              </span>
              <span>
                客户收入{' '}
                <span className="font-semibold text-primary-600">
                  {formatMoney(stats.revenue)}
                </span>
              </span>
              <span>
                基础利润{' '}
                <span
                  className={`font-semibold ${stats.profit >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                >
                  {formatMoney(stats.profit)}
                </span>
                <span
                  className={`ml-1 text-xs ${profitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                >
                  ({profitRate.toFixed(1)}%)
                </span>
              </span>
            </div>
          );
        }}
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
        search={false}
        dateFormatter="string"
        headerTitle={false}
        toolBarRender={() => [
          <Select
            key="platform"
            placeholder="选择平台"
            allowClear
            style={{ width: 120 }}
            value={platformFilter || undefined}
            onChange={v => {
              setPlatformFilter(v || '');
              setCurrentPage(1);
            }}
            options={platforms.map(p => ({
              label: platformNames[p] || p,
              value: p,
            }))}
          />,
          <Select
            key="status"
            mode="multiple"
            placeholder="选择状态"
            allowClear
            maxTagCount="responsive"
            style={{ width: 200 }}
            value={statusFilter.length > 0 ? statusFilter : undefined}
            onChange={v => {
              setStatusFilter(v || []);
              setCurrentPage(1);
            }}
            options={COLLABORATION_STATUS_OPTIONS.map(s => ({
              label: s,
              value: s,
            }))}
          />,
          <Tooltip
            key="add"
            title={!editable ? '项目已进入结算阶段，无法添加达人' : undefined}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              disabled={!editable}
            >
              添加达人
            </Button>
          </Tooltip>,
        ]}
        scroll={{ x: 1460 }}
        options={{
          fullScreen: true,
          reload: () => loadCollaborations(),
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
