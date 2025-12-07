/**
 * 项目列表页面
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, App, Checkbox } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type {
  ProjectListItem,
  ProjectStatus,
  GetProjectsParams,
} from '../../../types/project';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VALUE_ENUM,
  formatMoney,
  generateYearValueEnum,
  generateMonthValueEnum,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_VALUE_ENUM,
  type BusinessTypeKey,
} from '../../../types/customer';
import { projectApi } from '../../../services/projectApi';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../../components/PageTransition';
import { logger } from '../../../utils/logger';
import { ProjectFormModal } from './ProjectFormModal';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

export function ProjectList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);

  // 平台配置
  const {
    configs: platformConfigs,
    getPlatformNames,
    getPlatformColors,
  } = usePlatformConfig();

  // 动态生成平台 valueEnum
  const platformValueEnum = useMemo(() => {
    return platformConfigs.reduce(
      (acc, c) => {
        acc[c.platform] = { text: c.name };
        return acc;
      },
      {} as Record<string, { text: string }>
    );
  }, [platformConfigs]);

  // 动态获取平台名称和颜色映射
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [projectCodeFilter, setProjectCodeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [monthFilter, setMonthFilter] = useState<number | undefined>();
  const [useFinancialPeriod, setUseFinancialPeriod] = useState(false); // 是否按财务周期搜索
  const [platformFilter, setPlatformFilter] = useState<Platform | undefined>();
  const [businessTypeFilter, setBusinessTypeFilter] = useState<
    BusinessTypeKey | undefined
  >();
  const [customerNameFilter, setCustomerNameFilter] = useState<string>('');

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
        projectCode: projectCodeFilter || undefined,
        status: statusFilter || undefined,
        // 根据勾选状态决定按业务周期还是财务周期搜索
        year: useFinancialPeriod ? undefined : yearFilter,
        month: useFinancialPeriod ? undefined : monthFilter,
        financialYear: useFinancialPeriod ? yearFilter : undefined,
        financialMonth: useFinancialPeriod ? monthFilter : undefined,
        platforms: platformFilter ? [platformFilter] : undefined,
        businessType: businessTypeFilter,
        customerKeyword: customerNameFilter || undefined,
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
    projectCodeFilter,
    statusFilter,
    yearFilter,
    monthFilter,
    useFinancialPeriod,
    platformFilter,
    businessTypeFilter,
    customerNameFilter,
    message,
  ]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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

  const columns: ProColumns<ProjectListItem>[] = [
    {
      title: '项目编号',
      dataIndex: 'projectCode',
      width: 110,
      ellipsis: true,
      valueType: 'text',
      fieldProps: {
        placeholder: '精确匹配',
      },
      render: (_, record) => record.projectCode || '-',
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      width: 160,
      fixed: 'left',
      ellipsis: true,
      search: false,
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
      width: 100,
      ellipsis: true,
      valueType: 'text',
      fieldProps: {
        placeholder: '输入客户名称',
      },
      render: (_, record) => record.customerName || '-',
    },
    {
      title: '业务类型',
      dataIndex: 'businessType',
      width: 90,
      valueType: 'select',
      valueEnum: BUSINESS_TYPE_VALUE_ENUM,
      render: (_, record) => {
        const config = BUSINESS_TYPES[record.businessType];
        return config?.name || record.businessType || '-';
      },
    },
    {
      title: '平台',
      dataIndex: 'platforms',
      width: 120,
      valueType: 'select',
      valueEnum: platformValueEnum,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {(record.platforms || []).map(platform => (
            <Tag key={platform} color={platformColors[platform] || 'default'}>
              {platformNames[platform] || platform}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      valueEnum: PROJECT_STATUS_VALUE_ENUM,
      render: (_, record) => (
        <Tag color={PROJECT_STATUS_COLORS[record.status]}>
          {PROJECT_STATUS_LABELS[record.status]}
        </Tag>
      ),
    },
    {
      title: '年份',
      dataIndex: 'year',
      width: 70,
      valueType: 'select',
      valueEnum: generateYearValueEnum(),
      render: (_, record) => `${record.year}年`,
    },
    {
      title: '月份',
      dataIndex: 'month',
      width: 60,
      valueType: 'select',
      valueEnum: generateMonthValueEnum(),
      render: (_, record) => `${record.month}月`,
    },
    {
      title: '预算',
      dataIndex: 'budget',
      width: 100,
      search: false,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.budget)}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 100,
      valueType: 'date',
      search: false,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 110,
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
                <Checkbox
                  key="financialPeriod"
                  checked={useFinancialPeriod}
                  onChange={e => setUseFinancialPeriod(e.target.checked)}
                  style={{ marginRight: 16, whiteSpace: 'nowrap' }}
                >
                  财务周期
                </Checkbox>,
                ...dom.reverse(),
              ],
            }}
            onSubmit={params => {
              setProjectCodeFilter((params.projectCode as string) || '');
              setStatusFilter((params.status as ProjectStatus) || '');
              setYearFilter(params.year ? Number(params.year) : undefined);
              setMonthFilter(params.month ? Number(params.month) : undefined);
              setPlatformFilter((params.platforms as Platform) || undefined);
              setBusinessTypeFilter(
                (params.businessType as BusinessTypeKey) || undefined
              );
              setCustomerNameFilter((params.customerName as string) || '');
              setCurrentPage(1);
            }}
            onReset={() => {
              setProjectCodeFilter('');
              setStatusFilter('');
              setYearFilter(undefined);
              setMonthFilter(undefined);
              setUseFinancialPeriod(false);
              setPlatformFilter(undefined);
              setBusinessTypeFilter(undefined);
              setCustomerNameFilter('');
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
            scroll={{ x: 1200 }}
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
