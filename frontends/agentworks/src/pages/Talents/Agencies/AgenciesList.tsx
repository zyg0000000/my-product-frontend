/**
 * 机构管理页面 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 ProTable 替代手写表格
 * 2. 使用 Tabs 组件管理平台切换
 * 3. 使用 ProCard 包裹内容
 * 4. 使用 Space 和 Button 组件
 * 5. 集成新的弹窗组件
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tabs, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PercentageOutlined } from '@ant-design/icons';
import type { Agency } from '../../../types/agency';
import type { Platform } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { AGENCY_TYPE_NAMES, AGENCY_STATUS_NAMES, AGENCY_INDIVIDUAL_ID } from '../../../types/agency';
import {
  getAgencies,
  deleteAgency,
} from '../../../api/agency';
import { getTalents } from '../../../api/talent';
import { AgencyRebateModal } from '../../../components/AgencyRebateModal';
import { AgencyFormModal } from '../../../components/AgencyFormModal';
import { AgencyDeleteModal } from '../../../components/AgencyDeleteModal';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

export function AgenciesList() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [talentCounts, setTalentCounts] = useState<Record<string, number>>({});

  // 使用平台配置 Hook（只获取启用的平台）
  const { getPlatformList, loading: configLoading } = usePlatformConfig(false);
  const platforms = getPlatformList();

  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(platforms[0] || 'douyin');

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [isRebateModalOpen, setIsRebateModalOpen] = useState(false);
  const [rebateAgency, setRebateAgency] = useState<Agency | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);

  const actionRef = useRef<ActionType>(null);

  // 加载机构列表
  const loadAgencies = async () => {
    try {
      setLoading(true);
      const response = await getAgencies();
      if (response.success && response.data) {
        setAgencies(response.data);
      }
    } catch (error) {
      message.error('加载机构列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载达人数量统计
  const loadTalentCounts = async () => {
    try {
      const response = await getTalents({ platform: selectedPlatform });
      if (response.success && response.data) {
        const counts: Record<string, number> = {};
        response.data.forEach((talent) => {
          const agencyId = talent.agencyId || AGENCY_INDIVIDUAL_ID;
          counts[agencyId] = (counts[agencyId] || 0) + 1;
        });
        setTalentCounts(counts);
      }
    } catch (error) {
      console.error('加载达人统计失败:', error);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    loadTalentCounts();
  }, [selectedPlatform]);

  // 获取达人数
  const getTalentCount = (agencyId: string) => {
    return talentCounts[agencyId] || 0;
  };

  // 获取平台返点
  const getPlatformRebate = (agency: Agency) => {
    return agency.rebateConfig?.platforms?.[selectedPlatform]?.baseRebate;
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAgency(null);
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      message.warning('野生达人是系统预设机构，不可编辑');
      return;
    }
    setEditingAgency(agency);
    setIsModalOpen(true);
  };

  // 打开返点管理弹窗
  const handleRebateManagement = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      message.warning('野生达人是系统预设机构，不支持返点管理');
      return;
    }
    setRebateAgency(agency);
    setIsRebateModalOpen(true);
  };

  // 打开删除确认弹窗
  const handleDelete = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      message.warning('野生达人是系统预设机构，不可删除');
      return;
    }
    setAgencyToDelete(agency);
    setShowDeleteConfirm(true);
  };

  // 确认删除机构
  const confirmDelete = async (agencyId: string) => {
    const response = await deleteAgency(agencyId);
    if (!response.success) {
      throw new Error(response.message || '删除失败');
    }
    await loadAgencies();
  };

  // 保存机构
  const handleSave = async (data: any) => {
    if (data.phoneNumber && !/^1[3-9]\d{9}$/.test(data.phoneNumber)) {
      throw new Error('请输入正确的手机号格式');
    }

    const { createAgency, updateAgency } = await import('../../../api/agency');

    let response;
    if (editingAgency) {
      response = await updateAgency(editingAgency.id, data);
    } else {
      response = await createAgency(data);
    }

    if (!response.success) {
      throw new Error(response.message || '保存失败');
    }

    await loadAgencies();
  };

  // ProTable 列定义
  const columns: ProColumns<Agency>[] = useMemo(() => [
    {
      title: '机构名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{record.name}</span>
          {record.id === AGENCY_INDIVIDUAL_ID && (
            <Tag color="purple" className="text-xs">系统预设</Tag>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (_, record) => (
        <Tag color={record.type === 'agency' ? 'blue' : 'default'}>
          {AGENCY_TYPE_NAMES[record.type as keyof typeof AGENCY_TYPE_NAMES]}
        </Tag>
      ),
    },
    {
      title: `${PLATFORM_NAMES[selectedPlatform]}返点`,
      key: 'rebate',
      width: 120,
      render: (_, record) => {
        const rebate = getPlatformRebate(record);
        return rebate !== undefined ? (
          <span className="font-medium text-green-600">{rebate.toFixed(2)}%</span>
        ) : (
          <span className="text-gray-400 text-xs">未配置</span>
        );
      },
    },
    {
      title: '达人数',
      key: 'talentCount',
      width: 100,
      render: (_, record) => (
        <span className="text-gray-900">{getTalentCount(record.id)}</span>
      ),
    },
    {
      title: '联系人',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div className="text-sm">
          <div className="text-gray-900">{record.contactInfo?.contactPerson || '-'}</div>
          {record.contactInfo?.phoneNumber && (
            <div className="text-xs text-gray-500">{record.contactInfo.phoneNumber}</div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const colorMap = {
          active: 'success',
          suspended: 'warning',
          inactive: 'default',
        };
        return (
          <Tag color={colorMap[record.status as keyof typeof colorMap]}>
            {AGENCY_STATUS_NAMES[record.status as keyof typeof AGENCY_STATUS_NAMES] || record.status}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.id !== AGENCY_INDIVIDUAL_ID && (
            <Button
              type="link"
              size="small"
              icon={<PercentageOutlined />}
              onClick={() => handleRebateManagement(record)}
              className="text-green-600 hover:text-green-700"
            >
              返点
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.id !== AGENCY_INDIVIDUAL_ID && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ], [selectedPlatform, talentCounts]);

  return (
    <div className="space-y-4">
      {/* 页面标题 - Tailwind */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">机构管理</h1>
        <p className="text-gray-600 mt-1 text-sm">管理MCN机构和野生达人归属，设置基础返点</p>
      </div>

      {/* 平台 Tabs - Ant Design Tabs */}
      <Tabs
        activeKey={selectedPlatform}
        onChange={(key) => setSelectedPlatform(key as Platform)}
        items={platforms.map(platform => ({
          key: platform,
          label: PLATFORM_NAMES[platform],
        }))}
      />

      {/* ProTable - 新版实现 */}
      <ProTable<Agency>
        columns={columns}
        actionRef={actionRef}
        dataSource={agencies}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个机构`,
        }}
        search={false}
        cardBordered
        headerTitle={
          <div className="flex items-center gap-3">
            <span className="font-medium">机构列表</span>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">共 {agencies.length} 个机构</span>
          </div>
        }
        toolbar={{
          actions: [
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增机构
            </Button>,
          ],
        }}
        options={{
          reload: async () => {
            await loadAgencies();
            message.success('数据已刷新');
            return true;
          },
          density: false,
          setting: true,
        }}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* 新增/编辑机构弹窗 */}
      <AgencyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agency={editingAgency}
        onSave={handleSave}
      />

      {/* 返点管理弹窗 */}
      <AgencyRebateModal
        isOpen={isRebateModalOpen}
        onClose={() => setIsRebateModalOpen(false)}
        agency={rebateAgency}
        onSuccess={() => {
          loadAgencies();
        }}
      />

      {/* 删除确认弹窗 */}
      <AgencyDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAgencyToDelete(null);
        }}
        agency={agencyToDelete}
        onConfirm={confirmDelete}
        talentCount={agencyToDelete ? getTalentCount(agencyToDelete.id) : 0}
      />
    </div>
  );
}
