/**
 * 报告模板列表页
 *
 * @version 1.0.0
 * @description ProTable 表格形式的模板管理，支持类型筛选
 */

import { useState, useMemo } from 'react';
import { Button, Tag, Popconfirm, Space, App, Select, Tooltip } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../../components/PageTransition';
import { useTemplates } from '../../../hooks/useTemplates';
import { TemplateEditor } from './TemplateEditor';
import type { ReportTemplateListItem } from '../../../types/template';

/** 模板类型配置 */
const TYPE_CONFIG = {
  registration: { label: '报名管理', color: 'blue' },
  general: { label: '通用', color: 'default' },
};

export function TemplateList() {
  const { message } = App.useApp();

  // 模板数据
  const { templates, loading, remove, refresh } = useTemplates();

  // 类型筛选状态
  const [selectedType, setSelectedType] = useState<'all' | 'registration' | 'general'>('all');

  // 筛选后的模板
  const filteredTemplates = useMemo(() => {
    if (selectedType === 'all') {
      return templates;
    }
    return templates.filter(t => t.type === selectedType);
  }, [templates, selectedType]);

  // 类型选项
  const typeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'registration', label: '报名管理' },
    { value: 'general', label: '通用' },
  ];

  // 编辑弹窗状态
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // 处理删除
  const handleDelete = async (id: string) => {
    const success = await remove(id);
    if (success) {
      message.success('模板已删除');
    }
  };

  // 处理新建
  const handleCreate = () => {
    setEditingTemplateId(null);
    setEditorOpen(true);
  };

  // 处理编辑
  const handleEdit = (template: ReportTemplateListItem) => {
    setEditingTemplateId(template._id);
    setEditorOpen(true);
  };

  // 编辑器关闭回调
  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingTemplateId(null);
  };

  // 编辑器保存成功回调
  const handleEditorSuccess = () => {
    setEditorOpen(false);
    setEditingTemplateId(null);
    refresh();
  };

  // 构建飞书链接
  const buildFeishuUrl = (token: string) => {
    if (!token) return '#';
    if (token.startsWith('http')) return token;
    return `https://feishu.cn/sheets/${token}`;
  };

  // 表格列定义
  const columns: ProColumns<ReportTemplateListItem>[] = [
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 220,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-primary-500" />
          <span className="font-medium text-content">{record.name}</span>
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
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (_, record) => {
        const config = TYPE_CONFIG[record.type] || TYPE_CONFIG.general;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '关联飞书表格',
      dataIndex: 'spreadsheetToken',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title="点击打开飞书表格">
          <a
            href={buildFeishuUrl(record.spreadsheetToken)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline flex items-center gap-1"
          >
            <LinkOutlined />
            <span className="truncate" style={{ maxWidth: 150 }}>
              {record.spreadsheetToken}
            </span>
          </a>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (_, record) => (
        <span className="text-content-secondary text-sm">
          {new Date(record.createdAt).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
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
            title="确定删除此模板吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-content">模板管理</h1>
            <p className="text-sm text-content-secondary mt-1">
              创建和管理用于生成飞书报告的数据映射模板
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建模板
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-stroke">
          <span className="text-sm text-content-secondary">类型筛选：</span>
          <Select
            value={selectedType}
            onChange={setSelectedType}
            options={typeOptions}
            style={{ width: 140 }}
            size="small"
          />
          <span className="text-sm text-content-muted ml-auto">
            共 {filteredTemplates.length} 个模板
          </span>
        </div>

        {/* 模板列表 */}
        <ProTable<ReportTemplateListItem>
          columns={columns}
          dataSource={filteredTemplates}
          rowKey="_id"
          loading={loading}
          search={false}
          options={{
            density: false,
            setting: false,
            reload: () => refresh(),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: 1100 }}
          tableClassName="bg-surface"
        />
      </div>

      {/* 模板编辑弹窗 */}
      <TemplateEditor
        open={editorOpen}
        templateId={editingTemplateId}
        onClose={handleEditorClose}
        onSuccess={handleEditorSuccess}
      />
    </PageTransition>
  );
}

export default TemplateList;
