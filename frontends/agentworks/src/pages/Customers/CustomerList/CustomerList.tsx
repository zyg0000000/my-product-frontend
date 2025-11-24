/**
 * 客户列表页面 - 使用 Ant Design Pro (紧凑布局)
 */

import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, UndoOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Customer, CustomerLevel, CustomerStatus } from '../../../types/customer';
import { CUSTOMER_LEVEL_NAMES, CUSTOMER_STATUS_NAMES } from '../../../types/customer';
import { customerApi } from '../../../services/customerApi';
import { Toast } from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../../components/PageTransition';

export default function CustomerList() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const { toast, hideToast, success, error: showError } = useToast();

  // Manual data fetching state
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerApi.getCustomers({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: searchTerm,
        level: levelFilter,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (response.success) {
        setCustomers(response.data.customers);
        setTotal(response.data.total);
      } else {
        setCustomers([]);
        setTotal(0);
        showError('获取客户列表失败');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      showError('获取客户列表失败');
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [currentPage, pageSize, searchTerm, levelFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    try {
      const response = await customerApi.deleteCustomer(id);
      if (response.success) {
        success('删除成功');
        loadCustomers();
      }
    } catch (error) {
      showError('删除失败');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      const response = await customerApi.permanentDeleteCustomer(id);
      if (response.success) {
        success('永久删除成功');
        loadCustomers();
      }
    } catch (error) {
      showError('永久删除失败');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const response = await customerApi.restoreCustomer(id);
      if (response.success) {
        success('恢复成功');
        loadCustomers();
      }
    } catch (error) {
      showError('恢复失败');
    }
  };

  const columns: ProColumns<Customer>[] = [
    {
      title: '客户编码',
      dataIndex: 'code',
      width: 140,
      fixed: 'left',
      copyable: true,
      hideInSearch: true,
    },
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 200,
      align: 'center',
      ellipsis: true,
      formItemProps: {
        label: '搜索',
      },
    },
    {
      title: '客户级别',
      dataIndex: 'level',
      width: 110,
      align: 'center',
      valueType: 'select',
      valueEnum: {
        VIP: { text: 'VIP' },
        large: { text: '大型' },
        medium: { text: '中型' },
        small: { text: '小型' },
      },
      render: (_, record) => {
        const colorMap: Record<CustomerLevel, string> = {
          VIP: 'gold',
          large: 'blue',
          medium: 'green',
          small: 'default',
        };
        return <Tag color={colorMap[record.level]}>{CUSTOMER_LEVEL_NAMES[record.level]}</Tag>;
      },
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      width: 110,
      align: 'center',
      valueType: 'select',
      valueEnum: {
        active: { text: '活跃' },
        inactive: { text: '停用' },
        deleted: { text: '已删除' },
      },
      render: (_, record) => {
        const colorMap: Record<CustomerStatus, string> = {
          active: 'success',
          inactive: 'warning',
          suspended: 'default',
          deleted: 'error',
        };
        return <Tag color={colorMap[record.status]}>{CUSTOMER_STATUS_NAMES[record.status]}</Tag>;
      },
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      width: 110,
      align: 'center',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '主要联系人',
      dataIndex: 'contacts',
      width: 140,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => {
        const contact = record.contacts?.find((c) => c.isPrimary) || record.contacts?.[0];
        if (!contact) return '-';
        return (
          <div>
            <div className="font-medium">{contact.name}</div>
            {contact.position && (
              <div className="text-xs text-gray-500">{contact.position}</div>
            )}
          </div>
        );
      },
    },
    {
      title: '业务类型',
      dataIndex: 'businessStrategies',
      width: 200,
      align: 'center',
      hideInSearch: true,
      render: (_, record) => {
        const types = [];
        if (record.businessStrategies?.talentProcurement?.enabled) {
          types.push(<Tag key="talent" color="blue">达人采买</Tag>);
        }
        if (record.businessStrategies?.adPlacement?.enabled) {
          types.push(<Tag key="ad" color="orange">广告投流</Tag>);
        }
        if (record.businessStrategies?.contentProduction?.enabled) {
          types.push(<Tag key="content" color="purple">内容制作</Tag>);
        }
        return types.length > 0 ? <Space size={[4, 4]} wrap>{types}</Space> : <span className="text-gray-400">未配置</span>;
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
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const isDeleted = record.status === 'deleted';

        if (isDeleted) {
          // 已删除客户：显示恢复和永久删除
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<UndoOutlined />}
                onClick={() => handleRestore(record._id || record.code)}
              >
                恢复
              </Button>
              <Popconfirm
                title="确定永久删除？此操作不可恢复！"
                onConfirm={() => handlePermanentDelete(record._id || record.code)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}>
                  永久删除
                </Button>
              </Popconfirm>
            </Space>
          );
        }

        // 普通客户：显示价格、编辑、删除
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => navigate(`/customers/${record._id || record.code}/pricing`)}
            >
              价格
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/edit/${record._id || record.code}`)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除？"
              onConfirm={() => handleDelete(record._id || record.code)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户列表</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理客户基础信息、联系人和业务配置
          </p>
        </div>

        {loading && customers.length === 0 ? (
          <TableSkeleton columnCount={8} rowCount={10} />
        ) : (
          <ProTable<Customer>
            columns={columns}
            actionRef={actionRef}
            cardBordered
            dataSource={customers}
            loading={loading}
            rowKey={(record) => record._id || record.code}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
            search={{
              labelWidth: 80,
              span: 6,
              defaultCollapsed: false,
              optionRender: (_searchConfig, _formProps, dom) => [...dom.reverse()],
            }}
            onSubmit={(params) => {
              setSearchTerm(params.name || '');
              setLevelFilter(params.level || '');
              setStatusFilter(params.status || '');
              setCurrentPage(1);
            }}
            onReset={() => {
              setSearchTerm('');
              setLevelFilter('');
              setStatusFilter('');
              setCurrentPage(1);
            }}
            dateFormatter="string"
            headerTitle="客户列表"
            toolBarRender={() => [
              <Button
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/customers/new')}
              >
                新增客户
              </Button>,
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={() => loadCustomers()}
              >
                刷新
              </Button>,
            ]}
            scroll={{ x: 1300 }}
            options={{
              reload: false,
              density: false,
              setting: true,
            }}
            size="middle"
          />
        )}

        {/* Toast 通知 */}
        {toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </div>
    </PageTransition>
  );
}
