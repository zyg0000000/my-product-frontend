/**
 * 平台配置管理页面 - Ant Design Pro 版本
 *
 * 版本: v1.0.0
 * 更新时间: 2025-11-23
 *
 * 功能说明：
 * - 管理系统支持的平台及其相关配置
 * - 支持查看、编辑平台配置
 * - 支持启用/禁用平台
 * - 配置修改后立即生效，无需重新部署
 *
 * 技术栈：
 * - ProTable 列表展示
 * - Modal + ProForm 编辑弹窗
 * - LocalStorage 缓存
 * - 遵循 UI_UX_GUIDELINES.md 规范
 */

import { useState, useRef } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import type { PlatformConfig } from '../../api/platformConfig';
import { PlatformConfigModal } from '../../components/PlatformConfigModal';

export function PlatformConfig() {
  const actionRef = useRef<ActionType>(null);
  const {
    configs,
    loading,
    error,
    refreshConfigs,
  } = usePlatformConfig(true); // 包含禁用的平台

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<PlatformConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 刷新配置
  const handleRefresh = async () => {
    await refreshConfigs();
    actionRef.current?.reload();
    message.success('配置已刷新');
  };

  // 打开新增弹窗
  const handleCreate = () => {
    setIsCreating(true);
    setSelectedConfig(null);
    setEditModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (config: PlatformConfig) => {
    setIsCreating(false);
    setSelectedConfig(config);
    setEditModalOpen(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedConfig(null);
    setIsCreating(false);
  };

  // 保存配置后刷新
  const handleSaveConfig = async () => {
    await refreshConfigs();
    actionRef.current?.reload();
    handleCloseModal();
  };

  // 表格列定义
  const columns: ProColumns<PlatformConfig>[] = [
    {
      title: '序号',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      sorter: (a, b) => a.order - b.order,
    },
    {
      title: '平台名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tag color={record.color}>{record.name}</Tag>
          <span className="text-xs text-gray-500">({record.platform})</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (_, record) => (
        <Tag color={record.enabled ? 'success' : 'default'}>
          {record.enabled ? '✓ 启用' : '✗ 禁用'}
        </Tag>
      ),
      filters: [
        { text: '启用', value: true },
        { text: '禁用', value: false },
      ],
      onFilter: (value, record) => record.enabled === value,
    },
    {
      title: '价格类型',
      dataIndex: 'priceTypes',
      key: 'priceTypes',
      width: 100,
      render: (_, record) => {
        const count = record.priceTypes?.length || 0;
        return (
          <span className={count > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
            {count} 个
          </span>
        );
      },
    },
    {
      title: '平台费率',
      dataIndex: 'business',
      key: 'fee',
      width: 100,
      render: (_, record) => {
        const fee = record.business?.fee;
        return fee !== null && fee !== undefined ? (
          <span className="text-gray-900">{(fee * 100).toFixed(1)}%</span>
        ) : (
          <span className="text-gray-400">未配置</span>
        );
      },
    },
    {
      title: '功能支持',
      dataIndex: 'features',
      key: 'features',
      width: 250,
      render: (_, record) => (
        <div className="overflow-x-auto">
          <Space size={4} wrap={false}>
            {record.features?.priceManagement && <Tag color="blue">价格管理</Tag>}
            {record.features?.rebateManagement && <Tag color="green">返点管理</Tag>}
            {record.features?.performanceTracking && <Tag color="purple">达人数据</Tag>}
            {record.features?.dataImport && <Tag color="orange">数据导入</Tag>}
          </Space>
        </div>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (_, record) => {
        if (!record.updatedAt) return '-';
        const date = new Date(record.updatedAt);
        return date.toLocaleString('zh-CN');
      },
      sorter: (a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">平台配置管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          管理系统支持的平台及其相关配置，配置修改后立即生效
        </p>
      </div>

      {/* ProTable */}
      <ProTable<PlatformConfig>
        actionRef={actionRef}
        columns={columns}
        dataSource={configs}
        loading={loading}
        rowKey="platform"
        search={false}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个平台`,
        }}
        options={{
          reload: false,
          density: false,
          setting: true,
        }}
        headerTitle={
          <div className="flex items-center gap-3">
            <SettingOutlined className="text-lg" />
            <span className="font-medium">平台列表</span>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">共 {configs.length} 个平台</span>
          </div>
        }
        toolbar={{
          actions: [
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新配置
            </Button>,
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新增平台
            </Button>,
          ],
        }}
        dateFormatter="string"
      />

      {/* 编辑/新增弹窗 */}
      <PlatformConfigModal
        isOpen={editModalOpen}
        onClose={handleCloseModal}
        config={selectedConfig}
        isCreating={isCreating}
        onSave={handleSaveConfig}
      />

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
}
