/**
 * 客户列表页面 - 使用 Ant Design Pro (紧凑布局)
 */

import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, Popconfirm, Popover } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, UndoOutlined, StopOutlined, ReloadOutlined, ShoppingOutlined, ThunderboltOutlined, VideoCameraOutlined } from '@ant-design/icons';
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

  // 渲染达人采买策略 - 表格式单行布局（极致紧凑）
  const renderTalentProcurement = (strategy: any) => {
    if (!strategy?.enabled) return null;

    const platformNames: Record<string, string> = {
      douyin: '抖音',
      xiaohongshu: '小红书',
      kuaishou: '快手',
    };

    const pricingModelNames: Record<string, string> = {
      framework: '框架协议',
      project: '项目制',
      hybrid: '混合模式',
    };

    const enabledPlatforms = Object.entries(strategy.platformFees || {})
      .filter(([_, config]: [string, any]) => config?.enabled)
      .map(([key, config]: [string, any]) => ({
        name: platformNames[key] || key,
        key,
        config,
        paymentCoefficient: strategy.paymentCoefficients?.[key],
      }));

    // 生成支付系数计算说明（完整计算步骤）
    const generateTooltipContent = (platform: any) => {
      const { config, paymentCoefficient } = platform;
      const baseAmount = 1000; // 使用 1000 作为基数（与后端逻辑一致）
      const discountRate = config.discountRate || 0;
      const platformFeeRate = config.platformFeeRate || 0;
      const serviceFeeRate = config.serviceFeeRate || 0;
      const includesPlatformFee = config.includesPlatformFee;
      const includesTax = config.includesTax;
      const taxRate = 0.06;

      // 步骤 1: 计算平台费金额
      const platformFeeAmount = baseAmount * platformFeeRate;

      // 步骤 2: 计算折扣后金额
      let discountedAmount;
      if (includesPlatformFee) {
        // 折扣含平台费：(基础价 + 平台费) × 折扣率
        discountedAmount = (baseAmount + platformFeeAmount) * discountRate;
      } else {
        // 折扣不含平台费：基础价 × 折扣率 + 平台费
        discountedAmount = baseAmount * discountRate + platformFeeAmount;
      }

      // 步骤 3: 计算服务费金额
      let serviceFeeAmount = 0;
      if (serviceFeeRate > 0) {
        if (config.serviceFeeBase === 'beforeDiscount') {
          serviceFeeAmount = (baseAmount + platformFeeAmount) * serviceFeeRate;
        } else {
          serviceFeeAmount = discountedAmount * serviceFeeRate;
        }
      }

      // 步骤 4: 计算税费
      let taxAmount = 0;
      if (!includesTax) {
        if (config.taxCalculationBase === 'includeServiceFee') {
          taxAmount = (discountedAmount + serviceFeeAmount) * taxRate;
        } else {
          taxAmount = discountedAmount * taxRate;
        }
      }

      // 步骤 5: 最终金额和系数
      const finalAmount = discountedAmount + serviceFeeAmount + taxAmount;
      const calculatedCoefficient = finalAmount / baseAmount;

      return (
        <div style={{ width: '340px' }}>
          <div className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-600">
            💡 {platform.name} - 支付系数计算
          </div>

          {/* 计算步骤 */}
          <div className="space-y-2 bg-gray-800 p-3 rounded text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-gray-300 whitespace-nowrap">① 基础刊例价:</span>
              <span className="font-medium text-white whitespace-nowrap">¥{(baseAmount / 100).toFixed(2)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-300 whitespace-nowrap">② 平台费 ({(platformFeeRate * 100).toFixed(2)}%):</span>
              <span className="font-medium text-white whitespace-nowrap">¥{(platformFeeAmount / 100).toFixed(2)}</span>
            </div>

            <div className="border-t border-gray-600 pt-1.5 space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-300 whitespace-nowrap">③ 折扣率 ({(discountRate * 100).toFixed(2)}%):</span>
                <span className="text-white text-xs whitespace-nowrap">
                  {includesPlatformFee ? '含平台费' : '不含平台费'}
                </span>
              </div>

              <div className="text-gray-400 text-xs pl-3">
                {includesPlatformFee
                  ? `(¥${(baseAmount / 100).toFixed(2)} + ¥${(platformFeeAmount / 100).toFixed(2)}) × ${(discountRate * 100).toFixed(2)}%`
                  : `¥${(baseAmount / 100).toFixed(2)} × ${(discountRate * 100).toFixed(2)}% + ¥${(platformFeeAmount / 100).toFixed(2)}`
                }
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-300 whitespace-nowrap">= 折扣后金额:</span>
                <span className="font-medium text-white whitespace-nowrap">¥{(discountedAmount / 100).toFixed(2)}</span>
              </div>
            </div>

            {serviceFeeRate > 0 && (
              <div className="flex justify-between gap-4 border-t border-gray-600 pt-1">
                <span className="text-gray-300 whitespace-nowrap">④ 服务费 ({(serviceFeeRate * 100).toFixed(2)}%):</span>
                <span className="font-medium text-white whitespace-nowrap">¥{(serviceFeeAmount / 100).toFixed(2)}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between gap-4 border-t border-gray-600 pt-1">
                <span className="text-gray-300 whitespace-nowrap">⑤ 增值税 (6%):</span>
                <span className="font-medium text-white whitespace-nowrap">¥{(taxAmount / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between gap-4 border-t border-gray-600 pt-1.5 mt-1">
              <span className="text-gray-300 font-semibold whitespace-nowrap">⑥ 最终金额:</span>
              <span className="font-bold text-green-300 whitespace-nowrap">¥{(finalAmount / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* 配置信息 */}
          <div className="space-y-1 pt-2 text-xs">
            <div className="flex justify-between gap-4 text-gray-400">
              <span className="whitespace-nowrap">折扣含平台费:</span>
              <span className="whitespace-nowrap">{includesPlatformFee ? '是' : '否'}</span>
            </div>

            <div className="flex justify-between gap-4 text-gray-400">
              <span className="whitespace-nowrap">含税报价:</span>
              <span className="whitespace-nowrap">{includesTax ? '是（已含6%税）' : '否（需加税）'}</span>
            </div>

            {config.validFrom && config.validTo && (
              <div className="flex justify-between gap-4 text-gray-400">
                <span className="whitespace-nowrap">有效期:</span>
                <span className="whitespace-nowrap">{config.validFrom.substring(0, 7)} ~ {config.validTo.substring(0, 7)}</span>
              </div>
            )}
          </div>

          {/* 最终系数 */}
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className="font-semibold text-blue-300 whitespace-nowrap">支付系数:</span>
              <div className="text-right">
                <div className="font-bold text-blue-200 text-sm whitespace-nowrap">{paymentCoefficient?.toFixed(4) || calculatedCoefficient.toFixed(4)}</div>
                <div className="text-xs text-gray-400 whitespace-nowrap">= ¥{(finalAmount / 100).toFixed(2)} ÷ ¥{(baseAmount / 100).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="px-4 py-2.5 bg-white">
        {/* 单行展示：标题 + 所有平台 */}
        <div className="flex items-center gap-3 text-sm">
          {/* 标题 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShoppingOutlined className="text-blue-500" style={{ fontSize: '14px' }} />
            <span className="font-semibold text-gray-800 text-sm">达人采买</span>
            <Tag color="blue" style={{ fontSize: '12px', lineHeight: '20px', padding: '0 7px', margin: 0 }}>
              {pricingModelNames[strategy.pricingModel] || strategy.pricingModel}
            </Tag>
          </div>

          {/* 分隔线 */}
          <div className="w-px h-4 bg-gray-300 flex-shrink-0"></div>

          {/* 所有平台横向排列 */}
          <div className="flex items-center gap-5 flex-1">
            {enabledPlatforms.map((platform) => (
              <div key={platform.key} className="flex items-center gap-2">
                <span className="text-gray-600 text-sm font-medium">{platform.name}</span>
                <Popover
                  content={generateTooltipContent(platform)}
                  placement="top"
                  trigger="hover"
                  overlayStyle={{ padding: 0 }}
                  overlayInnerStyle={{
                    padding: '12px',
                    backgroundColor: '#1f2937',
                    borderRadius: '6px'
                  }}
                >
                  <span className="font-bold text-blue-600 cursor-help border-b border-dashed border-blue-300 text-sm">
                    {platform.paymentCoefficient?.toFixed(4) || '-'}
                  </span>
                </Popover>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染广告投流策略
  const renderAdPlacement = (strategy: any) => {
    if (!strategy?.enabled) return null;

    return (
      <div className="px-4 py-2.5 bg-white">
        <div className="flex items-center gap-2">
          <ThunderboltOutlined className="text-orange-500" style={{ fontSize: '14px' }} />
          <span className="font-semibold text-gray-800 text-sm">广告投流</span>
          <Tag color="orange" style={{ fontSize: '12px', lineHeight: '20px', padding: '0 7px', margin: 0 }}>
            待配置详细策略
          </Tag>
        </div>
      </div>
    );
  };

  // 渲染内容制作策略
  const renderContentProduction = (strategy: any) => {
    if (!strategy?.enabled) return null;

    return (
      <div className="px-4 py-2.5 bg-white">
        <div className="flex items-center gap-2">
          <VideoCameraOutlined className="text-purple-600" style={{ fontSize: '14px' }} />
          <span className="font-semibold text-gray-800 text-sm">内容制作</span>
          <Tag color="purple" style={{ fontSize: '12px', lineHeight: '20px', padding: '0 7px', margin: 0 }}>
            待配置详细策略
          </Tag>
        </div>
      </div>
    );
  };

  // 展开行渲染 - 极简布局（无嵌套）
  const expandedRowRender = (record: Customer) => {
    const { businessStrategies } = record;

    if (!businessStrategies) {
      return (
        <div className="py-6 px-6 bg-gray-50 text-gray-400 text-center text-sm">
          该客户暂未配置业务策略
        </div>
      );
    }

    const hasAnyStrategy =
      businessStrategies.talentProcurement?.enabled ||
      businessStrategies.adPlacement?.enabled ||
      businessStrategies.contentProduction?.enabled;

    if (!hasAnyStrategy) {
      return (
        <div className="py-6 px-6 bg-gray-50 text-gray-400 text-center text-sm">
          该客户暂未启用任何业务策略
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ marginLeft: '40px' }}>
        <div className="divide-y divide-gray-200">
          {businessStrategies.talentProcurement?.enabled && renderTalentProcurement(businessStrategies.talentProcurement)}
          {businessStrategies.adPlacement?.enabled && renderAdPlacement(businessStrategies.adPlacement)}
          {businessStrategies.contentProduction?.enabled && renderContentProduction(businessStrategies.contentProduction)}
        </div>
      </div>
    );
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
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => !!record.businessStrategies,
            }}
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
