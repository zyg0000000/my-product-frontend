/**
 * 工作流列表页
 *
 * @version 3.1.0
 * @description ProTable 表格形式的工作流管理，支持平台筛选
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Tag,
  Popconfirm,
  Space,
  App,
  Switch,
  Select,
  Tooltip,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../../components/PageTransition';
import { useWorkflows } from '../../../hooks/useWorkflows';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { WorkflowExecuteModal } from './WorkflowExecuteModal';
import type { Workflow } from '../../../types/workflow';
import type { Platform } from '../../../types/talent';

export function WorkflowList() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = getPlatformNames();
  const platformColors = getPlatformColors();

  // 工作流数据
  const { workflows, loading, deleteWorkflow, toggleActive, refreshWorkflows } =
    useWorkflows();

  // 平台筛选状态
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>(
    'all'
  );

  // 筛选后的工作流
  const filteredWorkflows = useMemo(() => {
    if (selectedPlatform === 'all') {
      return workflows;
    }
    return workflows.filter(w => w.platform === selectedPlatform);
  }, [workflows, selectedPlatform]);

  // 平台选项
  const platformOptions = useMemo(() => {
    const options = [{ value: 'all', label: '全部平台' }];
    Object.entries(platformNames).forEach(([key, name]) => {
      options.push({ value: key, label: name });
    });
    return options;
  }, [platformNames]);

  // 执行弹窗状态
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null
  );

  // 处理删除
  const handleDelete = async (id: string) => {
    const success = await deleteWorkflow(id);
    if (success) {
      message.success('工作流已删除');
    }
  };

  // 处理状态切换
  const handleToggle = async (id: string, active: boolean) => {
    await toggleActive(id, active);
  };

  // 处理执行
  const handleExecute = (workflow: Workflow) => {
    setSelectedWorkflowId(workflow._id);
    setExecuteModalOpen(true);
  };

  // 表格列定义
  const columns: ProColumns<Workflow>[] = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      width: 220,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-content">{record.name}</span>
          {record.enableVNC && (
            <Tooltip title="远程桌面模式">
              <DesktopOutlined className="text-blue-500" />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 280,
      ellipsis: true,
      render: (_, record) => (
        <span className="text-content-secondary">
          {record.description || '-'}
        </span>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 100,
      render: (_, record) => (
        <Tag color={platformColors[record.platform] || 'blue'}>
          {platformNames[record.platform] || record.platform}
        </Tag>
      ),
    },
    {
      title: '步骤数',
      dataIndex: 'steps',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <span className="text-content-muted">{record.steps?.length || 0}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isActive}
          onChange={checked => handleToggle(record._id, checked)}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 120,
      render: (_, record) => (
        <span className="text-content-muted text-xs">
          {new Date(record.updatedAt).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record)}
            disabled={!record.isActive}
          >
            执行
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/automation/workflows/${record._id}/edit`)}
          />
          <Popconfirm
            title="确定删除此工作流？"
            description="删除后将无法恢复"
            onConfirm={() => handleDelete(record._id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">工作流管理</h1>
          <p className="mt-1 text-sm text-content-secondary">
            管理自动化工作流，创建、编辑和执行数据采集任务
          </p>
        </div>

        {/* ProTable */}
        <ProTable<Workflow>
          columns={columns}
          dataSource={filteredWorkflows}
          loading={loading}
          rowKey="_id"
          search={false}
          options={{
            reload: refreshWorkflows,
            density: false,
            setting: false,
          }}
          pagination={false}
          headerTitle={
            <div className="flex items-center gap-4">
              <span className="text-content-secondary text-sm">
                共 {filteredWorkflows.length} 个工作流
              </span>
              <Select
                value={selectedPlatform}
                onChange={setSelectedPlatform}
                options={platformOptions}
                style={{ width: 120 }}
                size="small"
              />
            </div>
          }
          toolBarRender={() => [
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/automation/workflows/new')}
            >
              新建工作流
            </Button>,
          ]}
          scroll={{ x: 1000 }}
        />
      </div>

      {/* 执行弹窗 */}
      <WorkflowExecuteModal
        open={executeModalOpen}
        onClose={() => {
          setExecuteModalOpen(false);
          setSelectedWorkflowId(null);
        }}
        workflowId={selectedWorkflowId || undefined}
      />
    </PageTransition>
  );
}

export default WorkflowList;
