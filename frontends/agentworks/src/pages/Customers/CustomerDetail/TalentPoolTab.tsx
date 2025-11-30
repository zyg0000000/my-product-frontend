/**
 * 达人池 Tab 组件
 *
 * 显示客户在某平台的达人池列表
 * 支持：
 * - 达人列表展示
 * - 添加达人（弹窗选择）
 * - 移除达人
 * - 标签和备注管理
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Space, Popconfirm, Tag, App, Empty } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getCustomerTalents,
  removeCustomerTalent,
} from '../../../api/customerTalents';
import type { CustomerTalentWithInfo } from '../../../types/customerTalent';
import type { Platform } from '../../../types/talent';
import { formatFansCount } from '../../../utils/formatters';
import { TalentSelectorModal } from '../../../components/TalentSelectorModal';

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

  // 状态
  const [loading, setLoading] = useState(false);
  const [talents, setTalents] = useState<CustomerTalentWithInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // 加载达人池数据
  const loadTalents = async () => {
    try {
      setLoading(true);
      const response = await getCustomerTalents({
        customerId,
        platform,
        page: currentPage,
        pageSize,
        includeTalentInfo: true,
      });

      setTalents(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load talents:', error);
      message.error('加载达人池失败');
    } finally {
      setLoading(false);
    }
  };

  // 平台或页码变化时重新加载
  useEffect(() => {
    loadTalents();
  }, [customerId, platform, currentPage, pageSize]);

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

  // 表格列定义
  const columns: ProColumns<CustomerTalentWithInfo>[] = [
    {
      title: '达人昵称',
      dataIndex: ['talentInfo', 'name'],
      width: 180,
      fixed: 'left',
      render: (_, record) => (
        <span className="font-medium">
          {record.talentInfo?.name || record.talentOneId}
        </span>
      ),
    },
    {
      title: '粉丝数',
      dataIndex: ['talentInfo', 'fansCount'],
      width: 120,
      align: 'right',
      render: (_, record) =>
        record.talentInfo?.fansCount
          ? formatFansCount(record.talentInfo.fansCount)
          : '-',
    },
    {
      title: '达人层级',
      dataIndex: ['talentInfo', 'talentTier'],
      width: 100,
      align: 'center',
      render: (_, record) => {
        const tier = record.talentInfo?.talentTier;
        if (!tier) return '-';
        const colorMap: Record<string, string> = {
          头部: 'red',
          腰部: 'orange',
          尾部: 'blue',
        };
        return <Tag color={colorMap[tier] || 'default'}>{tier}</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 200,
      render: (_, record) =>
        record.tags?.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {record.tags.map((tag, i) => (
              <Tag key={i} color="blue">
                {tag}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      width: 200,
      ellipsis: true,
      render: (_, record) => record.notes || '-',
    },
    {
      title: '添加时间',
      dataIndex: 'addedAt',
      width: 160,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate(`/talents/${record.talentOneId}/${record.platform}`)
            }
          >
            详情
          </Button>
          <Popconfirm
            title="确定从达人池移除？"
            onConfirm={() => handleRemove(record._id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              移除
            </Button>
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

  return (
    <div>
      <ProTable<CustomerTalentWithInfo>
        columns={columns}
        actionRef={actionRef}
        dataSource={talents}
        loading={loading}
        rowKey="_id"
        search={false}
        options={false}
        pagination={{
          current: currentPage,
          pageSize,
          total,
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
        scroll={{ x: 1100 }}
        size="middle"
      />

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

export default TalentPoolTab;
