/**
 * 达人池 Tab 组件 (v2.0)
 *
 * 显示客户在某平台的达人池列表
 * 支持：
 * - 达人列表展示
 * - 添加达人（弹窗选择）
 * - 移除达人
 * - 结构化标签管理（重要程度 + 业务标签）
 * - 标签筛选
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Space,
  Popconfirm,
  Tag,
  App,
  Empty,
  Select,
  Modal,
  Form,
  Input,
  Radio,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  TagsOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  getCustomerTalents,
  removeCustomerTalent,
  updateCustomerTalent,
  batchUpdateTags,
} from '../../../api/customerTalents';
import type { CustomerTalentWithInfo } from '../../../types/customerTalent';
import { getNormalizedTags } from '../../../types/customerTalent';
import type { Platform } from '../../../types/talent';
import { TalentSelectorModal } from '../../../components/TalentSelectorModal';
import { TalentTagEditor } from '../shared/TalentTagEditor';
import { TalentNameWithLinks } from '../../../components/TalentNameWithLinks';
import { useTagConfigs } from '../../../hooks/useTagConfigs';
import { logger } from '../../../utils/logger';

interface TalentPoolTabProps {
  customerId: string;
  platform: Platform;
  onRefresh?: () => void;
}

export function TalentPoolTab({
  customerId,
  platform,
  onRefresh,
}: TalentPoolTabProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);

  // 标签配置
  const { getImportanceLevels, getBusinessTags } = useTagConfigs();
  const importanceLevels = useMemo(
    () => getImportanceLevels(),
    [getImportanceLevels]
  );
  const businessTags = useMemo(() => getBusinessTags(), [getBusinessTags]);

  // 状态
  const [loading, setLoading] = useState(false);
  const [talents, setTalents] = useState<CustomerTalentWithInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // 筛选状态
  const [filterImportance, setFilterImportance] = useState<string | undefined>(
    undefined
  );
  const [filterBusinessTags, setFilterBusinessTags] = useState<string[]>([]);

  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTalent, setEditingTalent] =
    useState<CustomerTalentWithInfo | null>(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // 多选状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 批量打标弹窗状态
  const [batchTagModalVisible, setBatchTagModalVisible] = useState(false);
  const [batchTagForm] = Form.useForm();
  const [batchTagSaving, setBatchTagSaving] = useState(false);

  // 请求取消控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('组件已卸载');
      }
    };
  }, []);

  // 加载达人池数据
  const loadTalents = async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('被新请求替代');
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const response = await getCustomerTalents({
        customerId,
        platform,
        page: currentPage,
        pageSize,
        includeTalentInfo: true,
      });

      // 检查请求是否已取消
      if (controller.signal.aborted) {
        return;
      }

      setTalents(response.list);
      setTotal(response.total);
    } catch (error) {
      // 忽略取消错误
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      logger.error('Failed to load talents:', error);
      message.error('加载达人池失败');
    } finally {
      // 只有未取消时才更新 loading 状态
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // 平台或页码变化时重新加载
  useEffect(() => {
    loadTalents();
  }, [customerId, platform, currentPage, pageSize]);

  // 前端过滤后的数据
  const filteredTalents = useMemo(() => {
    let result = talents;

    // 按重要程度筛选
    if (filterImportance) {
      result = result.filter(t => {
        const tags = getNormalizedTags(t.tags);
        return tags.importance === filterImportance;
      });
    }

    // 按业务标签筛选（任意匹配）
    if (filterBusinessTags.length > 0) {
      result = result.filter(t => {
        const tags = getNormalizedTags(t.tags);
        return filterBusinessTags.some(tag => tags.businessTags.includes(tag));
      });
    }

    return result;
  }, [talents, filterImportance, filterBusinessTags]);

  // 移除达人
  const handleRemove = async (id: string) => {
    try {
      await removeCustomerTalent(id);
      message.success('已移除');
      loadTalents();
      onRefresh?.();
    } catch (error) {
      message.error('移除失败');
    }
  };

  // 添加成功后刷新
  const handleAddSuccess = () => {
    loadTalents();
    onRefresh?.();
  };

  // 打开编辑弹窗
  const handleEdit = (record: CustomerTalentWithInfo) => {
    setEditingTalent(record);
    const normalizedTags = getNormalizedTags(record.tags);
    editForm.setFieldsValue({
      tags: normalizedTags,
      notes: record.notes || '',
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTalent?._id) return;

    try {
      setSaving(true);
      const values = await editForm.validateFields();
      await updateCustomerTalent(editingTalent._id, {
        tags: values.tags,
        notes: values.notes,
      });
      message.success('保存成功');
      setEditModalVisible(false);
      setEditingTalent(null);
      loadTalents();
    } catch (error) {
      logger.error('Failed to save:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 打开批量打标弹窗
  const handleOpenBatchTag = () => {
    batchTagForm.setFieldsValue({
      tags: { importance: null, businessTags: [] },
      mode: 'merge',
    });
    setBatchTagModalVisible(true);
  };

  // 批量打标
  const handleBatchTag = async () => {
    if (selectedRowKeys.length === 0) return;

    try {
      setBatchTagSaving(true);
      const values = await batchTagForm.validateFields();
      const result = await batchUpdateTags({
        ids: selectedRowKeys as string[],
        tags: values.tags,
        mode: values.mode,
      });
      message.success(`已更新 ${result.modifiedCount} 个达人的标签`);
      setBatchTagModalVisible(false);
      setSelectedRowKeys([]);
      loadTalents();
    } catch (error) {
      logger.error('Batch tag failed:', error);
      message.error('批量打标失败');
    } finally {
      setBatchTagSaving(false);
    }
  };

  // 表格列定义
  const columns: ProColumns<CustomerTalentWithInfo>[] = [
    {
      title: '达人昵称',
      dataIndex: ['talentInfo', 'name'],
      width: 220,
      render: (_, record) => (
        <TalentNameWithLinks
          name={record.talentInfo?.name || record.talentOneId}
          platform={platform}
          platformAccountId={record.talentInfo?.platformAccountId}
          platformSpecific={record.talentInfo?.platformSpecific}
        />
      ),
    },
    {
      title: '重要程度',
      dataIndex: 'tags',
      width: 90,
      align: 'center',
      render: (_, record) => {
        const tags = getNormalizedTags(record.tags);
        if (!tags.importance)
          return <span className="text-content-muted">-</span>;
        const level = importanceLevels.find(l => l.key === tags.importance);
        return level ? (
          <Tag
            style={{
              backgroundColor: level.bgColor,
              color: level.textColor,
              borderColor: level.textColor,
              margin: 0,
            }}
          >
            {level.name}
          </Tag>
        ) : (
          <span className="text-content-muted">-</span>
        );
      },
    },
    {
      title: '业务标签',
      dataIndex: 'tags',
      width: 200,
      render: (_, record) => {
        const tags = getNormalizedTags(record.tags);
        if (!tags.businessTags?.length)
          return <span className="text-content-muted">-</span>;
        return (
          <Space size={4} wrap>
            {tags.businessTags.slice(0, 3).map(tagKey => {
              const tag = businessTags.find(t => t.key === tagKey);
              return tag ? (
                <Tag
                  key={tagKey}
                  style={{
                    backgroundColor: tag.bgColor,
                    color: tag.textColor,
                    borderColor: tag.textColor,
                    margin: 0,
                  }}
                >
                  {tag.name}
                </Tag>
              ) : null;
            })}
            {tags.businessTags.length > 3 && (
              <span className="text-content-muted text-xs">
                +{tags.businessTags.length - 3}
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      width: 150,
      ellipsis: true,
      render: (_, record) =>
        record.notes || <span className="text-content-muted">-</span>,
    },
    {
      title: '添加时间',
      dataIndex: 'addedAt',
      width: 100,
      render: (_, record) => {
        if (!record.addedAt) return '-';
        const date = new Date(record.addedAt);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="编辑标签">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(`/talents/${record.talentOneId}/${record.platform}`)
              }
            />
          </Tooltip>
          <Popconfirm
            title="确定移除？"
            onConfirm={() => handleRemove(record._id!)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="移除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (talents.length === 0 && !loading) {
    return (
      <div className="py-12">
        <Empty
          description={`暂无达人，点击添加达人到${platform === 'douyin' ? '抖音' : platform === 'xiaohongshu' ? '小红书' : platform}池`}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setSelectorVisible(true)}
          >
            添加达人
          </Button>
        </Empty>

        <TalentSelectorModal
          visible={selectorVisible}
          customerId={customerId}
          platform={platform}
          onClose={() => setSelectorVisible(false)}
          onSuccess={handleAddSuccess}
        />
      </div>
    );
  }

  // 是否有筛选条件
  const hasFilter = filterImportance || filterBusinessTags.length > 0;

  return (
    <div>
      {/* 筛选区域 */}
      <div className="mb-4 p-3 bg-surface-base rounded-lg flex items-center gap-4 flex-wrap">
        <Space>
          <FilterOutlined className="text-content-secondary" />
          <span className="text-sm text-content-secondary">筛选:</span>
        </Space>
        <Select
          placeholder="重要程度"
          value={filterImportance}
          onChange={setFilterImportance}
          allowClear
          style={{ width: 120 }}
          options={importanceLevels.map(level => ({
            value: level.key,
            label: <Tag color={level.color}>{level.name}</Tag>,
          }))}
        />
        <Select
          mode="multiple"
          placeholder="业务标签"
          value={filterBusinessTags}
          onChange={setFilterBusinessTags}
          allowClear
          style={{ minWidth: 200 }}
          maxTagCount={2}
          options={businessTags.map(tag => ({
            value: tag.key,
            label: tag.name,
          }))}
        />
        {hasFilter && (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setFilterImportance(undefined);
              setFilterBusinessTags([]);
            }}
          >
            清除筛选
          </Button>
        )}
        <span className="text-sm text-content-secondary ml-auto">
          {hasFilter
            ? `筛选结果: ${filteredTalents.length}/${total}`
            : `共 ${total} 个达人`}
        </span>
      </div>

      <ProTable<CustomerTalentWithInfo>
        columns={columns}
        actionRef={actionRef}
        dataSource={filteredTalents}
        loading={loading}
        rowKey="_id"
        search={false}
        options={{
          fullScreen: true,
          density: true,
          setting: true,
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
        }}
        tableAlertRender={({ selectedRowKeys: keys }) => (
          <Space size="middle">
            <span>已选择 {keys.length} 个达人</span>
          </Space>
        )}
        tableAlertOptionRender={() => (
          <Space size="middle">
            <Button
              type="primary"
              size="small"
              icon={<TagsOutlined />}
              onClick={handleOpenBatchTag}
            >
              批量打标
            </Button>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        )}
        pagination={{
          current: currentPage,
          pageSize,
          total: hasFilter ? filteredTalents.length : total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: t => `共 ${t} 个达人`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
        headerTitle={`达人池 (${total})`}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setSelectorVisible(true)}
          >
            添加达人
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => loadTalents()}
          >
            刷新
          </Button>,
        ]}
        scroll={{ x: 950 }}
      />

      <TalentSelectorModal
        visible={selectorVisible}
        customerId={customerId}
        platform={platform}
        onClose={() => setSelectorVisible(false)}
        onSuccess={handleAddSuccess}
      />

      {/* 编辑标签/备注弹窗 */}
      <Modal
        title={`编辑 - ${editingTalent?.talentInfo?.name || editingTalent?.talentOneId || ''}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTalent(null);
          editForm.resetFields();
        }}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item name="tags" label="标签">
            <TalentTagEditor layout="vertical" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea
              placeholder="输入备注信息"
              rows={2}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量打标弹窗 */}
      <Modal
        title={`批量打标 (${selectedRowKeys.length}个)`}
        open={batchTagModalVisible}
        onCancel={() => {
          setBatchTagModalVisible(false);
          batchTagForm.resetFields();
        }}
        onOk={handleBatchTag}
        confirmLoading={batchTagSaving}
        okText="确认"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form form={batchTagForm} layout="vertical" className="mt-4">
          <Form.Item name="tags" label="标签">
            <TalentTagEditor layout="vertical" />
          </Form.Item>
          <Form.Item
            name="mode"
            label="更新模式"
            initialValue="merge"
            extra={
              <span className="text-content-muted text-xs">
                合并：保留原有标签，追加新标签；替换：清除原有标签，使用新标签
              </span>
            }
          >
            <Radio.Group>
              <Radio value="merge">合并</Radio>
              <Radio value="replace">替换</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TalentPoolTab;
