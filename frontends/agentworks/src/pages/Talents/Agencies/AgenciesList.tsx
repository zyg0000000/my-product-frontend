/**
 * 机构管理页面 - v4.0 (多列展示)
 *
 * v4.0 升级要点：
 * 1. 每个平台独立一列，显示「返点 · 达人数」
 * 2. 一目了然，无需交互
 * 3. 单行紧凑展示
 */

import { useState, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Space, Tag, App, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PercentageOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  LinkOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { Agency } from '../../../types/agency';
import {
  AGENCY_TYPE_NAMES,
  AGENCY_STATUS_NAMES,
  AGENCY_INDIVIDUAL_ID,
} from '../../../types/agency';
import { deleteAgency } from '../../../api/agency';
import { AgencyRebateModal } from '../../../components/AgencyRebateModal';
import { AgencyFormModal } from '../../../components/AgencyFormModal';
import { AgencyDeleteModal } from '../../../components/AgencyDeleteModal';
import { BatchCreateAgencyModal } from '../../../components/BatchCreateAgencyModal';
import { BatchBindTalentModal } from '../../../components/BatchBindTalentModal';
import { AgencyTalentListModal } from '../../../components/AgencyTalentListModal';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import type { Platform } from '../../../types/talent';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../../components/PageTransition';
import { AgencyFilterPanel } from './components';
import { useAgencyData } from './hooks';

export function AgenciesList() {
  const { message, modal } = App.useApp();

  // 平台配置
  const { getPlatformList, getPlatformNames } = usePlatformConfig(false);
  const platforms = getPlatformList();
  const platformNames = getPlatformNames();

  // 使用数据管理 Hook
  const {
    agencies,
    totalAgencies,
    loading,
    talentCounts,
    currentPage,
    pageSize,
    setCurrentPage,
    filterState,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    loadAgencies,
    refreshTalentCounts,
  } = useAgencyData();

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [isRebateModalOpen, setIsRebateModalOpen] = useState(false);
  const [rebateAgency, setRebateAgency] = useState<Agency | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [batchCreateModalOpen, setBatchCreateModalOpen] = useState(false);
  const [batchBindModalOpen, setBatchBindModalOpen] = useState(false);
  const [bindTargetAgency, setBindTargetAgency] = useState<Agency | null>(null);
  const [talentListModalOpen, setTalentListModalOpen] = useState(false);
  const [talentListAgency, setTalentListAgency] = useState<Agency | null>(null);

  const actionRef = useRef<ActionType>(null);

  // 获取机构的总达人数（所有平台）
  const getTotalTalentCount = (agencyId: string): number => {
    const counts = talentCounts[agencyId];
    if (!counts) return 0;
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAgency(null);
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      // 系统预设机构需要二次确认
      modal.confirm({
        title: '编辑系统预设机构',
        icon: <ExclamationCircleOutlined />,
        content:
          '野生达人是系统预设机构，修改将影响所有归属于野生达人的达人。确定要编辑吗？',
        okText: '确认编辑',
        cancelText: '取消',
        onOk() {
          setEditingAgency(agency);
          setIsModalOpen(true);
        },
      });
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

  // 打开批量绑定达人弹窗（从机构行操作）
  const handleBindTalents = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      message.warning('野生达人不支持绑定达人');
      return;
    }
    setBindTargetAgency(agency);
    setBatchBindModalOpen(true);
  };

  // 打开机构达人列表弹窗
  const handleManageTalents = (agency: Agency) => {
    setTalentListAgency(agency);
    setTalentListModalOpen(true);
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

  // 动态生成各平台列（返点 · 达人数）
  const platformColumns: ProColumns<Agency>[] = useMemo(
    () =>
      platforms.map((platform: Platform) => ({
        title: platformNames[platform] || platform,
        key: `platform_${platform}`,
        width: 100,
        align: 'center' as const,
        render: (_: unknown, record: Agency) => {
          const rebate = record.rebateConfig?.platforms?.[platform]?.baseRebate;
          const count = talentCounts[record.id]?.[platform] || 0;

          const rebateText =
            rebate !== undefined && rebate !== null ? `${rebate}%` : '-';
          const countText = count > 0 ? count : '0';

          return (
            <span>
              <span
                className={
                  rebate !== undefined
                    ? 'text-success-600 dark:text-success-400 font-medium'
                    : 'text-content-muted'
                }
              >
                {rebateText}
              </span>
              <span className="text-content-muted mx-1">·</span>
              <span
                className={count > 0 ? 'font-medium' : 'text-content-muted'}
              >
                {countText}
              </span>
            </span>
          );
        },
      })),
    [platforms, platformNames, talentCounts]
  );

  // ProTable 列定义 - v4.0 多列展示
  const columns: ProColumns<Agency>[] = useMemo(
    () => [
      {
        title: '机构名称',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        fixed: 'left',
        ellipsis: true,
        render: (_, record) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-content">{record.name}</span>
            {record.id === AGENCY_INDIVIDUAL_ID && (
              <Tag color="purple" className="text-xs">
                系统预设
              </Tag>
            )}
          </div>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (_, record) => (
          <Tag color={record.type === 'agency' ? 'blue' : 'default'}>
            {AGENCY_TYPE_NAMES[record.type as keyof typeof AGENCY_TYPE_NAMES]}
          </Tag>
        ),
      },
      // v4.0: 动态插入各平台列
      ...platformColumns,
      {
        title: '联系人',
        key: 'contact',
        width: 130,
        render: (_, record) => (
          <div className="text-sm">
            <div className="text-content">
              {record.contactInfo?.contactPerson || '-'}
            </div>
            {record.contactInfo?.phoneNumber && (
              <div className="text-xs text-content-secondary">
                {record.contactInfo.phoneNumber}
              </div>
            )}
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        render: (_, record) => {
          const colorMap = {
            active: 'success',
            suspended: 'warning',
            inactive: 'default',
          };
          return (
            <Tag color={colorMap[record.status as keyof typeof colorMap]}>
              {AGENCY_STATUS_NAMES[
                record.status as keyof typeof AGENCY_STATUS_NAMES
              ] || record.status}
            </Tag>
          );
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            {/* 绑定达人 */}
            {record.id !== AGENCY_INDIVIDUAL_ID && (
              <Tooltip title="绑定达人">
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => handleBindTalents(record)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700"
                />
              </Tooltip>
            )}
            {/* 管理达人 */}
            <Tooltip title="管理达人">
              <Button
                type="text"
                size="small"
                icon={<TeamOutlined />}
                onClick={() => handleManageTalents(record)}
                className="text-content-secondary hover:text-content"
              />
            </Tooltip>
            {/* 返点管理 */}
            {record.id !== AGENCY_INDIVIDUAL_ID && (
              <Tooltip title="返点管理">
                <Button
                  type="text"
                  size="small"
                  icon={<PercentageOutlined />}
                  onClick={() => handleRebateManagement(record)}
                  className="text-success-600 dark:text-success-400 hover:text-success-700 dark:text-success-300"
                />
              </Tooltip>
            )}
            {/* 编辑 */}
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            {/* 删除 */}
            {record.id !== AGENCY_INDIVIDUAL_ID && (
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [platformColumns]
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">机构管理</h1>
          <p className="mt-2 text-sm text-content-secondary">
            管理MCN机构和独立达人，配置各平台返点政策
          </p>
        </div>

        {/* 筛选面板 */}
        <AgencyFilterPanel
          filterState={filterState}
          onFilterChange={handleFilterChange}
          totalAgencies={totalAgencies}
          onSearch={handleSearch}
          onReset={handleResetFilters}
        />

        {/* ProTable - 新版实现 */}
        {loading && agencies.length === 0 ? (
          <TableSkeleton columnCount={7} rowCount={10} />
        ) : (
          <ProTable<Agency>
            columns={columns}
            actionRef={actionRef}
            dataSource={agencies}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalAgencies,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 个机构`,
              onChange: page => setCurrentPage(page),
            }}
            search={false}
            cardBordered
            headerTitle={
              <div className="flex items-center gap-3">
                <span className="font-medium">机构列表</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-sm text-content-secondary">
                  共 {totalAgencies} 个机构
                </span>
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
                <Button
                  key="batch-add"
                  icon={<UploadOutlined />}
                  onClick={() => setBatchCreateModalOpen(true)}
                >
                  批量新增
                </Button>,
                <Button
                  key="batch-bind"
                  icon={<LinkOutlined />}
                  onClick={() => {
                    setBindTargetAgency(null);
                    setBatchBindModalOpen(true);
                  }}
                >
                  批量绑定达人
                </Button>,
              ],
            }}
            options={{
              fullScreen: true,
              density: true,
              reload: async () => {
                await loadAgencies();
                message.success('数据已刷新');
                return true;
              },
              setting: true,
            }}
            scroll={{ x: 1200 }}
          />
        )}

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
          talentCount={
            agencyToDelete ? getTotalTalentCount(agencyToDelete.id) : 0
          }
        />

        {/* 批量新增机构弹窗 */}
        <BatchCreateAgencyModal
          open={batchCreateModalOpen}
          onClose={() => setBatchCreateModalOpen(false)}
          onSuccess={loadAgencies}
        />

        {/* 批量绑定达人弹窗 - 不预设平台，用户必须手动选择 */}
        <BatchBindTalentModal
          open={batchBindModalOpen}
          onClose={() => {
            setBatchBindModalOpen(false);
            setBindTargetAgency(null);
          }}
          onSuccess={() => {
            loadAgencies();
            refreshTalentCounts();
          }}
          initialAgency={bindTargetAgency || undefined}
        />

        {/* 机构达人管理弹窗 */}
        {talentListAgency && (
          <AgencyTalentListModal
            open={talentListModalOpen}
            onClose={() => {
              setTalentListModalOpen(false);
              setTalentListAgency(null);
            }}
            onSuccess={() => {
              loadAgencies();
              refreshTalentCounts();
            }}
            agency={talentListAgency}
          />
        )}
      </div>
    </PageTransition>
  );
}
