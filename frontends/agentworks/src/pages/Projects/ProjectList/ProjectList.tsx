/**
 * 项目列表页面
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, Popconfirm, Progress, App } from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type {
  ProjectListItem,
  ProjectStatus,
  GetProjectsParams,
} from '../../../types/project';
import {
  PROJECT_STATUS_COLORS,
  formatMoney,
  calculateProgress,
} from '../../../types/project';
import { PLATFORM_NAMES, type Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../../components/PageTransition';
import { logger } from '../../../utils/logger';
import { ProjectFormModal } from './ProjectFormModal';

/**
 * 平台标签颜色
 */
const PLATFORM_COLORS: Record<Platform, string> = {
  douyin: 'blue',
  xiaohongshu: 'red',
  bilibili: 'cyan',
  kuaishou: 'orange',
};

export function ProjectList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [monthFilter, setMonthFilter] = useState<number | undefined>();

  // 弹窗状态
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(
    null
  );

  /**
   * 加载项目列表
   */
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params: GetProjectsParams = {
        page: currentPage,
        pageSize: pageSize,
        keyword: keyword || undefined,
        status: statusFilter || undefined,
        year: yearFilter,
        month: monthFilter,
      };

      const response = await projectApi.getProjects(params);

      if (response.success) {
        setProjects(response.data.items);
        setTotal(response.data.total);
      } else {
        setProjects([]);
        setTotal(0);
        message.error('获取项目列表失败');
      }
    } catch (error) {
      logger.error('Error loading projects:', error);
      message.error('获取项目列表失败');
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    keyword,
    statusFilter,
    yearFilter,
    monthFilter,
    message,
  ]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /**
   * 删除项目
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await projectApi.deleteProject(id);
      if (response.success) {
        message.success('删除成功');
        loadProjects();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  /**
   * 新建项目
   */
  const handleCreate = () => {
    setEditingProject(null);
    setFormModalOpen(true);
  };

  /**
   * 编辑项目
   */
  const handleEdit = (record: ProjectListItem) => {
    setEditingProject(record);
    setFormModalOpen(true);
  };

  /**
   * 表单提交成功
   */
  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setEditingProject(null);
    loadProjects();
  };

  /**
   * 生成年份选项（当前年 ± 2 年）
   */
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years: Record<number, { text: string }> = {};
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      years[y] = { text: `${y}年` };
    }
    return years;
  };

  /**
   * 生成月份选项
   */
  const getMonthOptions = () => {
    const months: Record<number, { text: string }> = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = { text: `${m}月` };
    }
    return months;
  };

  const columns: ProColumns<ProjectListItem>[] = [
    {
      title: '项目名称',
      dataIndex: 'name',
      width: 220,
      fixed: 'left',
      ellipsis: true,
      formItemProps: {
        label: '搜索',
      },
      render: (_, record) => (
        <a
          className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
          onClick={() => navigate(`/projects/${record.id}`)}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.customerName || '-',
    },
    {
      title: '平台',
      dataIndex: 'platforms',
      width: 180,
      hideInSearch: true,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.platforms.map(platform => (
            <Tag key={platform} color={PLATFORM_COLORS[platform]}>
              {PLATFORM_NAMES[platform]}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        执行中: { text: '执行中', status: 'Processing' },
        待结算: { text: '待结算', status: 'Warning' },
        已收款: { text: '已收款', status: 'Success' },
        已终结: { text: '已终结', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={PROJECT_STATUS_COLORS[record.status]}>{record.status}</Tag>
      ),
    },
    {
      title: '年份',
      dataIndex: 'year',
      width: 90,
      valueType: 'select',
      valueEnum: getYearOptions(),
      render: (_, record) => `${record.year}年`,
    },
    {
      title: '月份',
      dataIndex: 'month',
      width: 80,
      valueType: 'select',
      valueEnum: getMonthOptions(),
      render: (_, record) => `${record.month}月`,
    },
    {
      title: '预算',
      dataIndex: 'budget',
      width: 120,
      hideInSearch: true,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.budget)}</span>
      ),
    },
    {
      title: '合作数',
      dataIndex: ['stats', 'collaborationCount'],
      width: 80,
      hideInSearch: true,
      render: (_, record) => record.stats?.collaborationCount ?? 0,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 140,
      hideInSearch: true,
      render: (_, record) => {
        const progress = calculateProgress(record.stats);
        const published = record.stats?.publishedCount ?? 0;
        const total = record.stats?.collaborationCount ?? 0;
        return (
          <div className="flex items-center gap-2">
            <Progress
              percent={progress}
              size="small"
              style={{ width: 80 }}
              strokeColor={progress === 100 ? '#52c41a' : undefined}
            />
            <span className="text-xs text-gray-500">
              {published}/{total}
            </span>
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该项目？"
            description="删除后关联的合作记录也将被删除"
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
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目列表</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理投放项目、查看执行进度和财务状态
          </p>
        </div>

        {loading && projects.length === 0 ? (
          <TableSkeleton columnCount={10} rowCount={10} />
        ) : (
          <ProTable<ProjectListItem>
            columns={columns}
            actionRef={actionRef}
            cardBordered
            dataSource={projects}
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
              span: 6,
              defaultCollapsed: false,
              optionRender: (_searchConfig, _formProps, dom) => [
                ...dom.reverse(),
              ],
            }}
            onSubmit={params => {
              setKeyword(params.name || '');
              setStatusFilter((params.status as ProjectStatus) || '');
              setYearFilter(params.year ? Number(params.year) : undefined);
              setMonthFilter(params.month ? Number(params.month) : undefined);
              setCurrentPage(1);
            }}
            onReset={() => {
              setKeyword('');
              setStatusFilter('');
              setYearFilter(undefined);
              setMonthFilter(undefined);
              setCurrentPage(1);
            }}
            dateFormatter="string"
            headerTitle="项目列表"
            toolBarRender={() => [
              <Button
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建项目
              </Button>,
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={() => loadProjects()}
              >
                刷新
              </Button>,
            ]}
            scroll={{ x: 1500 }}
            options={{
              reload: false,
              density: false,
              setting: true,
            }}
            size="middle"
          />
        )}

        {/* 项目表单弹窗 */}
        <ProjectFormModal
          open={formModalOpen}
          editingProject={editingProject}
          onCancel={() => {
            setFormModalOpen(false);
            setEditingProject(null);
          }}
          onSuccess={handleFormSuccess}
        />
      </div>
    </PageTransition>
  );
}

export default ProjectList;
