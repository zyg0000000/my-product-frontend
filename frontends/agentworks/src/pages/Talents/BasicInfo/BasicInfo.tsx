/**
 * 达人基础信息页 - v2.4 (完整重构版)
 *
 * 重构要点：
 * 1. 筛选面板拆分为 TalentFilterPanel 组件
 * 2. 表格列配置拆分为 useTalentColumns Hook
 * 3. 数据逻辑拆分为 useBasicInfoData Hook
 * 4. 主组件只负责 UI 渲染和用户交互
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Tabs, Button, Select, message, Space } from 'antd';
import { PlusOutlined, UploadOutlined, TeamOutlined } from '@ant-design/icons';
import { logger } from '../../../utils/logger';
import {
  updateTalent,
  deleteTalent,
  deleteTalentAll,
} from '../../../api/talent';
import type { Talent, Platform } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { PriceModal } from '../../../components/PriceModal';
import { EditTalentModal } from '../../../components/EditTalentModal';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal';
import { RebateManagementModal } from '../../../components/RebateManagementModal';
import { BatchCreateTalentModal } from '../../../components/BatchCreateTalentModal';
import { AddToCustomerModal } from '../../../components/AddToCustomerModal';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../../components/PageTransition';

// 拆分的组件和 Hook
import { TalentFilterPanel } from './components';
import { useTalentColumns, useBasicInfoData } from './hooks';

export function BasicInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const actionRef = useRef<ActionType>(null);

  // 使用平台配置 Hook（只获取启用的平台）
  const {
    getPlatformList,
    getPlatformPriceTypes,
    getPlatformConfigByKey,
    loading: configLoading,
  } = usePlatformConfig(false);
  const platforms = getPlatformList();

  // 从路由状态获取平台，如果没有则默认为第一个平台
  const initialPlatform =
    (location.state?.selectedPlatform as Platform) || platforms[0] || 'douyin';
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform>(initialPlatform);

  // 使用数据逻辑 Hook
  const {
    talents,
    agencies,
    totalTalents,
    loading,
    currentPage,
    pageSize,
    setCurrentPage,
    filterState,
    handleFilterChange,
    handleResetFilters,
    handleSearch,
    selectedPriceTier,
    setSelectedPriceTier,
    selectedRowKeys,
    setSelectedRowKeys,
    loadTalents,
    availableTags,
  } = useBasicInfoData({
    selectedPlatform,
    configLoading,
    platformsLength: platforms.length,
    getPlatformPriceTypes,
  });

  // 弹窗状态
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [rebateModalOpen, setRebateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [batchCreateModalOpen, setBatchCreateModalOpen] = useState(false);
  const [addToCustomerModalOpen, setAddToCustomerModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  // 价格类型配置
  const priceTypes = getPlatformPriceTypes(selectedPlatform);

  // 组件挂载后清除路由状态
  useEffect(() => {
    if (location.state?.selectedPlatform) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.selectedPlatform]);

  // 处理菜单点击
  const handleMenuClick = useCallback(
    (key: string, record: Talent) => {
      switch (key) {
        case 'edit':
          setSelectedTalent(record);
          setEditModalOpen(true);
          break;
        case 'price':
          setSelectedTalent(record);
          setPriceModalOpen(true);
          break;
        case 'rebate':
          setSelectedTalent(record);
          setRebateModalOpen(true);
          break;
        case 'detail':
          navigate(`/talents/${record.oneId}/${record.platform}`);
          break;
        case 'history':
          message.info('合作历史功能即将上线，敬请期待！');
          break;
        case 'delete':
          setSelectedTalent(record);
          setDeleteModalOpen(true);
          break;
      }
    },
    [navigate]
  );

  // 使用表格列配置 Hook
  const columns = useTalentColumns({
    platform: selectedPlatform,
    selectedPriceTier,
    agencies,
    getPlatformConfigByKey,
    onMenuClick: handleMenuClick,
  });

  // 关闭价格管理弹窗
  const handleClosePriceModal = async () => {
    setPriceModalOpen(false);
    setSelectedTalent(null);
    await loadTalents();
  };

  // 保存价格
  const handleSavePrices = async () => {
    await loadTalents();
  };

  // 关闭返点管理弹窗
  const handleCloseRebateModal = async () => {
    setRebateModalOpen(false);
    setSelectedTalent(null);
    await loadTalents();
  };

  // 关闭编辑弹窗
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedTalent(null);
  };

  // 关闭删除弹窗
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedTalent(null);
  };

  // 保存达人信息
  const handleSaveTalent = async (updatedTalent: Partial<Talent>) => {
    if (!updatedTalent.oneId || !updatedTalent.platform) {
      message.error('缺少必要参数');
      return;
    }

    try {
      const response = await updateTalent({
        oneId: updatedTalent.oneId,
        platform: updatedTalent.platform as Platform,
        ...updatedTalent,
      });

      if (!response.success) {
        throw new Error(response.error || response.message || '更新失败');
      }

      message.success('达人信息更新成功');
      await loadTalents();
    } catch (err) {
      logger.error('保存达人信息失败:', err);
      const errorMessage =
        err instanceof Error ? err.message : '保存达人信息失败';
      message.error(errorMessage);
      throw err;
    }
  };

  // 确认删除
  const handleConfirmDelete = async (
    oneId: string,
    platform: Platform,
    deleteAll: boolean
  ) => {
    try {
      let response;
      if (deleteAll) {
        response = await deleteTalentAll(oneId);
      } else {
        response = await deleteTalent(oneId, platform);
      }

      if (!response.success) {
        throw new Error(response.error || response.message || '删除失败');
      }

      message.success(
        deleteAll
          ? '已删除该达人的所有平台数据'
          : `已删除该达人的${PLATFORM_NAMES[platform]}平台数据`
      );

      await loadTalents();
    } catch (err) {
      logger.error('删除达人失败:', err);
      const errorMessage = err instanceof Error ? err.message : '删除达人失败';
      message.error(errorMessage);
      throw err;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">基础信息</h1>
          <p className="mt-1 text-sm text-content-secondary">
            管理多平台达人信息、价格和返点
          </p>
        </div>

        {/* 平台 Tabs */}
        <Tabs
          activeKey={selectedPlatform}
          onChange={key => setSelectedPlatform(key as Platform)}
          items={platforms.map(platform => ({
            key: platform,
            label: PLATFORM_NAMES[platform],
          }))}
        />

        {/* 筛选面板 */}
        <TalentFilterPanel
          filterState={filterState}
          onFilterChange={handleFilterChange}
          availableTags={availableTags}
          totalTalents={totalTalents}
          onSearch={handleSearch}
          onReset={handleResetFilters}
        />

        {/* ProTable - 达人列表 */}
        {(configLoading || loading) && talents.length === 0 ? (
          <TableSkeleton columnCount={8} rowCount={10} />
        ) : (
          <ProTable<Talent>
            columns={columns}
            actionRef={actionRef}
            dataSource={talents}
            rowKey="oneId"
            loading={configLoading || loading}
            rowSelection={{
              selectedRowKeys,
              onChange: keys => setSelectedRowKeys(keys),
              preserveSelectedRowKeys: true,
            }}
            tableAlertRender={({ selectedRowKeys: keys }) =>
              keys.length > 0 ? (
                <Space size="middle">
                  <span>已选择 {keys.length} 个达人</span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<TeamOutlined />}
                    onClick={() => setAddToCustomerModalOpen(true)}
                  >
                    添加到客户池
                  </Button>
                  <Button size="small" onClick={() => setSelectedRowKeys([])}>
                    取消选择
                  </Button>
                </Space>
              ) : null
            }
            tableAlertOptionRender={false}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalTalents,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 个达人`,
              onChange: page => setCurrentPage(page),
            }}
            search={false}
            cardBordered
            headerTitle={
              <div className="flex items-center gap-3">
                <span className="font-medium">达人列表</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-sm text-content-secondary">
                  共 {totalTalents} 个达人
                </span>
              </div>
            }
            toolbar={{
              actions: [
                // 新增达人按钮
                <Button
                  key="add"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    navigate('/talents/create', {
                      state: { platform: selectedPlatform },
                    })
                  }
                >
                  新增达人
                </Button>,
                // 批量新增按钮
                <Button
                  key="batch-add"
                  icon={<UploadOutlined />}
                  onClick={() => setBatchCreateModalOpen(true)}
                >
                  批量新增
                </Button>,
                // 价格类型选择器
                <div
                  key="price"
                  className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
                >
                  <span className="text-sm font-medium text-primary-700">
                    价格类型
                  </span>
                  <Select
                    value={selectedPriceTier ?? '__HIDE__'}
                    onChange={val =>
                      setSelectedPriceTier(val === '__HIDE__' ? null : val)
                    }
                    style={{ width: 130 }}
                    size="small"
                    options={[
                      ...priceTypes.map(pt => ({
                        label: pt.label,
                        value: pt.key,
                      })),
                      {
                        label: '隐藏价格',
                        value: '__HIDE__',
                      },
                    ]}
                  />
                </div>,
              ],
            }}
            options={{
              fullScreen: true,
              density: true,
              reload: async () => {
                await loadTalents();
                message.success('数据已刷新');
                return true;
              },
              setting: true,
            }}
            scroll={{ x: 1500 }}
          />
        )}

        {/* 价格管理弹窗 */}
        {selectedTalent && (
          <PriceModal
            isOpen={priceModalOpen}
            onClose={handleClosePriceModal}
            talent={selectedTalent}
            onSave={handleSavePrices}
          />
        )}

        {/* 编辑达人弹窗 */}
        {selectedTalent && (
          <EditTalentModal
            isOpen={editModalOpen}
            onClose={handleCloseEditModal}
            talent={selectedTalent}
            onSave={async (
              oneId: string,
              platform: Platform,
              data: Partial<Talent>
            ) => {
              await handleSaveTalent({ ...data, oneId, platform });
            }}
            availableTags={availableTags}
          />
        )}

        {/* 删除确认弹窗 */}
        {selectedTalent && (
          <DeleteConfirmModal
            isOpen={deleteModalOpen}
            onClose={handleCloseDeleteModal}
            talent={selectedTalent}
            onConfirm={handleConfirmDelete}
          />
        )}

        {/* 返点管理弹窗 */}
        {selectedTalent && (
          <RebateManagementModal
            isOpen={rebateModalOpen}
            onClose={handleCloseRebateModal}
            talent={selectedTalent}
          />
        )}

        {/* 批量新增达人弹窗 */}
        <BatchCreateTalentModal
          open={batchCreateModalOpen}
          onClose={() => setBatchCreateModalOpen(false)}
          onSuccess={loadTalents}
          initialPlatform={selectedPlatform}
        />

        {/* 添加到客户池弹窗 */}
        <AddToCustomerModal
          visible={addToCustomerModalOpen}
          platform={selectedPlatform}
          selectedTalents={talents
            .filter(t => selectedRowKeys.includes(t.oneId))
            .map(t => ({ oneId: t.oneId, name: t.name }))}
          onClose={() => setAddToCustomerModalOpen(false)}
          onSuccess={() => {
            setSelectedRowKeys([]);
            loadTalents();
          }}
        />
      </div>
    </PageTransition>
  );
}
