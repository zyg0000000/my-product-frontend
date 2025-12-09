/**
 * 财务管理 Tab
 * 展示项目财务信息，支持批量设置日期和调整项管理
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Card,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  DatePicker,
  Button,
  App,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Popconfirm,
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  Collaboration,
  CollaborationAdjustment,
} from '../../../types/project';
import { formatMoney, centsToYuan, yuanToCents } from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../components/TalentNameWithLinks';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

/**
 * 财务统计数据
 */
interface FinancialStats {
  totalAmount: number; // 执行总金额
  orderedAmount: number; // 已下单金额
  paidAmount: number; // 已打款金额
  recoveredAmount: number; // 已回款金额
  pendingCount: number; // 待下单数量
  adjustmentTotal: number; // 调整项合计
}

interface FinancialTabProps {
  projectId: string;
  platforms: Platform[];
  onRefresh?: () => void;
}

export function FinancialTab({
  projectId,
  platforms: _platforms,
  onRefresh,
}: FinancialTabProps) {
  // platforms 参数保留用于后续平台筛选功能
  void _platforms;
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalAmount: 0,
    orderedAmount: 0,
    paidAmount: 0,
    recoveredAmount: 0,
    pendingCount: 0,
    adjustmentTotal: 0,
  });

  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 批量操作弹窗
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchField, setBatchField] = useState<
    'orderDate' | 'paymentDate' | 'recoveryDate'
  >('orderDate');
  const [batchDate, setBatchDate] = useState<dayjs.Dayjs | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // 调整项弹窗
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [editingCollaborationId, setEditingCollaborationId] = useState<
    string | null
  >(null);
  const [adjustmentForm] = Form.useForm();

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Collaboration[]): FinancialStats => {
    let totalAmount = 0;
    let orderedAmount = 0;
    let paidAmount = 0;
    let recoveredAmount = 0;
    let pendingCount = 0;
    let adjustmentTotal = 0;

    data.forEach(c => {
      totalAmount += c.amount;

      if (c.orderDate) {
        orderedAmount += c.amount;
      } else {
        pendingCount++;
      }

      if (c.paymentDate) {
        paidAmount += c.amount;
      }

      if (c.recoveryDate) {
        recoveredAmount += c.amount;
      }

      // 计算调整项
      if (c.adjustments) {
        c.adjustments.forEach(adj => {
          adjustmentTotal += adj.amount;
        });
      }
    });

    return {
      totalAmount,
      orderedAmount,
      paidAmount,
      recoveredAmount,
      pendingCount,
      adjustmentTotal,
    };
  };

  /**
   * 加载合作记录
   */
  const loadCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApi.getCollaborations({
        projectId,
        page: 1,
        pageSize: 500,
      });

      if (response.success) {
        setCollaborations(response.data.items);
        setStats(calculateStats(response.data.items));
      } else {
        setCollaborations([]);
        message.error('获取财务数据失败');
      }
    } catch (error) {
      logger.error('Error loading financial data:', error);
      message.error('获取财务数据失败');
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, message]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 快速更新日期
   */
  const handleUpdateDate = async (
    id: string,
    field: 'orderDate' | 'paymentDate' | 'recoveryDate',
    value: string | null
  ) => {
    try {
      const response = await projectApi.updateCollaboration(id, {
        [field]: value,
      });
      if (response.success) {
        message.success('更新成功');
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  /**
   * 批量更新日期
   */
  const handleBatchUpdate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择记录');
      return;
    }

    if (!batchDate) {
      message.warning('请选择日期');
      return;
    }

    try {
      setBatchLoading(true);
      const response = await projectApi.batchUpdateCollaborations({
        ids: selectedRowKeys,
        updates: {
          [batchField]: batchDate.format('YYYY-MM-DD'),
        },
      });

      if (response.success) {
        message.success(`批量更新成功，共 ${selectedRowKeys.length} 条`);
        setBatchModalOpen(false);
        setBatchDate(null);
        setSelectedRowKeys([]);
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('批量更新失败');
    } finally {
      setBatchLoading(false);
    }
  };

  /**
   * 打开添加调整项弹窗
   */
  const handleOpenAdjustmentModal = (collaborationId: string) => {
    setEditingCollaborationId(collaborationId);
    adjustmentForm.resetFields();
    setAdjustmentModalOpen(true);
  };

  /**
   * 添加调整项
   */
  const handleAddAdjustment = async () => {
    if (!editingCollaborationId) return;

    try {
      const values = await adjustmentForm.validateFields();
      const collaboration = collaborations.find(
        c => c.id === editingCollaborationId
      );
      if (!collaboration) return;

      const newAdjustment: CollaborationAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: values.type,
        amount: yuanToCents(values.amount) * (values.isNegative ? -1 : 1),
        reason: values.reason,
      };

      const updatedAdjustments = [
        ...(collaboration.adjustments || []),
        newAdjustment,
      ];

      const response = await projectApi.updateCollaboration(
        editingCollaborationId,
        {
          adjustments: updatedAdjustments,
        }
      );

      if (response.success) {
        message.success('添加调整项成功');
        setAdjustmentModalOpen(false);
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('添加调整项失败');
    }
  };

  /**
   * 删除调整项
   */
  const handleDeleteAdjustment = async (
    collaborationId: string,
    adjustmentId: string
  ) => {
    try {
      const collaboration = collaborations.find(c => c.id === collaborationId);
      if (!collaboration) return;

      const updatedAdjustments = (collaboration.adjustments || []).filter(
        adj => adj.id !== adjustmentId
      );

      const response = await projectApi.updateCollaboration(collaborationId, {
        adjustments: updatedAdjustments,
      });

      if (response.success) {
        message.success('删除调整项成功');
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('删除调整项失败');
    }
  };

  /**
   * 批量操作字段选项
   */
  const batchFieldOptions = [
    { label: '下单日期', value: 'orderDate' },
    { label: '打款日期', value: 'paymentDate' },
    { label: '回款日期', value: 'recoveryDate' },
  ];

  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人',
      dataIndex: 'talentName',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => <TalentNameWithLinks {...fromCollaboration(record)} />,
    },
    {
      title: '平台',
      dataIndex: 'talentPlatform',
      width: 90,
      render: (_, record) => (
        <Tag color={platformColors[record.talentPlatform] || 'default'}>
          {platformNames[record.talentPlatform] || record.talentPlatform}
        </Tag>
      ),
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 110,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '返点率',
      dataIndex: 'rebateRate',
      width: 80,
      render: (_, record) =>
        record.rebateRate ? `${record.rebateRate}%` : '-',
    },
    {
      title: '下单日期',
      dataIndex: 'orderDate',
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.orderDate ? dayjs(record.orderDate) : null}
          onChange={date =>
            handleUpdateDate(
              record.id,
              'orderDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '打款日期',
      dataIndex: 'paymentDate',
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.paymentDate ? dayjs(record.paymentDate) : null}
          onChange={date =>
            handleUpdateDate(
              record.id,
              'paymentDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '回款日期',
      dataIndex: 'recoveryDate',
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.recoveryDate ? dayjs(record.recoveryDate) : null}
          onChange={date =>
            handleUpdateDate(
              record.id,
              'recoveryDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '调整项',
      dataIndex: 'adjustments',
      width: 200,
      render: (_, record) => {
        const adjustments = record.adjustments || [];
        const total = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

        return (
          <Space direction="vertical" size="small" className="w-full">
            {adjustments.length > 0 ? (
              <>
                {adjustments.map(adj => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>
                      {adj.type}:{' '}
                      <span
                        className={
                          adj.amount >= 0 ? 'text-green-600' : 'text-red-500'
                        }
                      >
                        {adj.amount >= 0 ? '+' : ''}
                        {formatMoney(adj.amount)}
                      </span>
                    </span>
                    <Popconfirm
                      title="确定删除该调整项？"
                      onConfirm={() =>
                        handleDeleteAdjustment(record.id, adj.id)
                      }
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className="p-0"
                      />
                    </Popconfirm>
                  </div>
                ))}
                <div className="text-xs border-t pt-1">
                  合计:{' '}
                  <span
                    className={`font-medium ${total >= 0 ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {total >= 0 ? '+' : ''}
                    {formatMoney(total)}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-gray-400">-</span>
            )}
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleOpenAdjustmentModal(record.id)}
              className="p-0"
            >
              添加
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 财务统计面板 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="执行总额"
              value={centsToYuan(stats.totalAmount)}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="已下单"
              value={centsToYuan(stats.orderedAmount)}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#722ed1', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="已打款"
              value={centsToYuan(stats.paidAmount)}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#faad14', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="已回款"
              value={centsToYuan(stats.recoveredAmount)}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#52c41a', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="待下单"
              value={stats.pendingCount}
              suffix="条"
              valueStyle={{
                color: stats.pendingCount > 0 ? '#ff4d4f' : '#8c8c8c',
                fontSize: '18px',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="调整合计"
              value={centsToYuan(stats.adjustmentTotal)}
              precision={2}
              suffix="元"
              valueStyle={{
                color: stats.adjustmentTotal >= 0 ? '#52c41a' : '#ff4d4f',
                fontSize: '18px',
              }}
              prefix={stats.adjustmentTotal >= 0 ? '+' : ''}
            />
          </Card>
        </Col>
      </Row>

      {/* 财务列表 */}
      <ProTable<Collaboration>
        columns={columns}
        actionRef={actionRef}
        cardBordered={false}
        dataSource={collaborations}
        loading={loading}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as string[]),
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <Space>
            <span>已选择 {selectedRowKeys.length} 条</span>
          </Space>
        )}
        tableAlertOptionRender={() => (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckSquareOutlined />}
              onClick={() => setBatchModalOpen(true)}
            >
              批量设置日期
            </Button>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        )}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: t => `共 ${t} 条`,
        }}
        search={false}
        dateFormatter="string"
        headerTitle="财务明细"
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => loadCollaborations()}
          >
            刷新
          </Button>,
        ]}
        scroll={{ x: 1100 }}
        options={{
          reload: false,
          density: false,
          setting: true,
        }}
        size="middle"
      />

      {/* 批量设置日期弹窗 */}
      <Modal
        title="批量设置日期"
        open={batchModalOpen}
        onOk={handleBatchUpdate}
        onCancel={() => {
          setBatchModalOpen(false);
          setBatchDate(null);
        }}
        confirmLoading={batchLoading}
      >
        <div className="space-y-4 py-4">
          <div>
            <div className="mb-2 text-gray-600">设置字段</div>
            <Select
              value={batchField}
              onChange={setBatchField}
              options={batchFieldOptions}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <div className="mb-2 text-gray-600">日期</div>
            <DatePicker
              value={batchDate}
              onChange={setBatchDate}
              style={{ width: '100%' }}
              placeholder="选择日期"
            />
          </div>
          <div className="text-gray-400 text-sm">
            将为选中的 {selectedRowKeys.length} 条记录设置{' '}
            {batchFieldOptions.find(o => o.value === batchField)?.label}
          </div>
        </div>
      </Modal>

      {/* 添加调整项弹窗 */}
      <Modal
        title="添加调整项"
        open={adjustmentModalOpen}
        onOk={handleAddAdjustment}
        onCancel={() => setAdjustmentModalOpen(false)}
        destroyOnClose
      >
        <Form form={adjustmentForm} layout="vertical" className="mt-4">
          <Form.Item
            name="type"
            label="调整类型"
            rules={[{ required: true, message: '请选择调整类型' }]}
            initialValue="价格调整"
          >
            <Select
              options={[
                { label: '价格调整', value: '价格调整' },
                { label: '其他', value: '其他' },
              ]}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="amount"
                label="金额（元）"
                rules={[
                  { required: true, message: '请输入金额' },
                  { type: 'number', min: 0, message: '金额不能为负数' },
                ]}
              >
                <InputNumber
                  placeholder="输入金额"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isNegative"
                label="方向"
                initialValue={false}
                valuePropName="checked"
              >
                <Select
                  options={[
                    { label: '增加 (+)', value: false },
                    { label: '减少 (-)', value: true },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="原因说明">
            <Input.TextArea placeholder="可选" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default FinancialTab;
