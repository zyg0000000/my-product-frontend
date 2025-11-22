/**
 * 客户列表页面 - 使用 Ant Design Pro (紧凑布局)
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Customer, CustomerLevel, CustomerStatus } from '../../../types/customer';
import { CUSTOMER_LEVEL_NAMES, CUSTOMER_STATUS_NAMES } from '../../../types/customer';
import { customerApi } from '../../../services/customerApi';

export default function CustomerList() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>();

  const handleDelete = async (id: string) => {
    try {
      const response = await customerApi.deleteCustomer(id);
      if (response.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<Customer>[] = [
    {
      title: '客户编码',
      dataIndex: 'code',
      width: 120,
      fixed: 'left',
      copyable: true,
      hideInSearch: true,
    },
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
      formItemProps: {
        label: '搜索',
      },
    },
    {
      title: '客户级别',
      dataIndex: 'level',
      width: 100,
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
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        active: { text: '活跃' },
        inactive: { text: '停用' },
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
      title: '行业',
      dataIndex: 'industry',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '主要联系人',
      dataIndex: 'contacts',
      width: 140,
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
      width: 180,
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
      width: 120,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => navigate(`/customers/edit/${record._id || record.code}`)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定删除？"
          onConfirm={() => handleDelete(record._id || record.code)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">客户列表</h1>
        <p className="mt-2 text-sm text-gray-600">
          管理客户基础信息、联系人和业务配置
        </p>
      </div>

      <ProTable<Customer>
        columns={columns}
        actionRef={actionRef}
        cardBordered
        request={async (params) => {
        try {
          const response = await customerApi.getCustomers({
            page: params.current || 1,
            pageSize: params.pageSize || 20,
            searchTerm: params.name || '',
            level: params.level || '',
            status: params.status || '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          });

          return {
            data: response.data.customers,
            success: response.success,
            total: response.data.total,
          };
        } catch (error) {
          message.error('获取客户列表失败');
          return {
            data: [],
            success: false,
            total: 0,
          };
        }
      }}
      rowKey={(record) => record._id || record.code}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
      search={{
        labelWidth: 80,
        span: 6,
        defaultCollapsed: false,
        optionRender: (searchConfig, formProps, dom) => [...dom.reverse()],
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
      ]}
        scroll={{ x: 1300 }}
        options={{
          reload: true,
          density: false,
          setting: true,
        }}
        size="middle"
      />
    </div>
  );
}
