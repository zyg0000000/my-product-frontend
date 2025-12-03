/**
 * 客户详情页
 *
 * 页面结构：
 * - 顶部：客户基本信息卡片
 * - 平台 Tab 切换栏（抖音 | 小红书 | ...）
 * - 内容区 Tab（达人池 | 价格策略 | 合作历史）
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Spin, Button, Tag, Descriptions, Card, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  DollarOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { customerApi } from '../../../services/customerApi';
import { getCustomerTalentStats } from '../../../api/customerTalents';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import type { Customer } from '../../../types/customer';
import type { CustomerTalentStats } from '../../../types/customerTalent';
import type { Platform } from '../../../types/talent';
import {
  CUSTOMER_LEVEL_NAMES,
  CUSTOMER_STATUS_NAMES,
} from '../../../types/customer';
import { PageTransition } from '../../../components/PageTransition';
import { TalentPoolTab } from './TalentPoolTab';
import { PricingTab } from './PricingTab';
import { logger } from '../../../utils/logger';

/**
 * 客户详情页主组件
 */
export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 状态
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [talentStats, setTalentStats] = useState<CustomerTalentStats | null>(
    null
  );
  const [activePlatform, setActivePlatform] = useState<Platform>('douyin');
  const [activeContentTab, setActiveContentTab] = useState('talentPool');

  // 平台配置
  const { configs: platformConfigs, loading: platformLoading } =
    usePlatformConfig();

  // 加载客户信息
  useEffect(() => {
    if (id) {
      loadCustomer(id);
      loadTalentStats(id);
    }
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await customerApi.getCustomerById(customerId);
      if (response.success && response.data) {
        setCustomer(response.data);
      }
    } catch (error) {
      logger.error('Failed to load customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTalentStats = async (customerId: string) => {
    try {
      const stats = await getCustomerTalentStats(customerId);
      setTalentStats(stats);
    } catch (error) {
      logger.error('Failed to load talent stats:', error);
    }
  };

  // 刷新达人池统计（供子组件调用）
  const refreshTalentStats = () => {
    if (customer?.code) {
      loadTalentStats(customer.code);
    }
  };

  if (loading || platformLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中...">
          <div className="p-12" />
        </Spin>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Empty description="客户不存在" />
      </div>
    );
  }

  // 客户级别颜色
  const levelColorMap: Record<string, string> = {
    VIP: 'gold',
    large: 'blue',
    medium: 'green',
    small: 'default',
  };

  // 客户状态颜色
  const statusColorMap: Record<string, string> = {
    active: 'success',
    inactive: 'warning',
    suspended: 'default',
    deleted: 'error',
  };

  // 平台 Tab 项
  const platformTabs = platformConfigs.map(config => ({
    key: config.platform,
    label: config.name,
  }));

  // 内容区 Tab 项
  const contentTabs = [
    {
      key: 'talentPool',
      label: (
        <span className="flex items-center gap-1">
          <TeamOutlined />
          达人池
        </span>
      ),
      children: (
        <TalentPoolTab
          customerId={customer.code}
          platform={activePlatform}
          onRefresh={refreshTalentStats}
        />
      ),
    },
    {
      key: 'pricing',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          价格策略
        </span>
      ),
      children: (
        <PricingTab
          customer={customer}
          platform={activePlatform}
          onUpdate={() => loadCustomer(id!)}
        />
      ),
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-1">
          <HistoryOutlined />
          合作历史
        </span>
      ),
      children: (
        <Empty
          description="功能开发中"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="py-12"
        />
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 返回按钮和标题 */}
        <div className="flex items-center gap-4">
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/customers/list')}
          >
            返回列表
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 m-0">客户详情</h1>
        </div>

        {/* 客户基本信息卡片 */}
        <Card
          className="shadow-sm"
          extra={
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/edit/${id}`)}
            >
              编辑
            </Button>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2, md: 3, lg: 4 }} size="middle">
            <Descriptions.Item label="客户名称">
              <span className="font-semibold text-lg">{customer.name}</span>
            </Descriptions.Item>
            <Descriptions.Item label="客户编码">
              <span className="font-mono text-gray-600">{customer.code}</span>
            </Descriptions.Item>
            <Descriptions.Item label="客户级别">
              <Tag color={levelColorMap[customer.level]}>
                {CUSTOMER_LEVEL_NAMES[customer.level]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag color={statusColorMap[customer.status]}>
                {CUSTOMER_STATUS_NAMES[customer.status]}
              </Tag>
            </Descriptions.Item>
            {customer.industry && (
              <Descriptions.Item label="所属行业">
                {customer.industry}
              </Descriptions.Item>
            )}
            {customer.contacts?.[0] && (
              <Descriptions.Item label="主要联系人">
                {customer.contacts[0].name}
                {customer.contacts[0].position &&
                  ` (${customer.contacts[0].position})`}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="达人池总数">
              <span className="font-semibold text-primary-600">
                {talentStats?.totalCount || 0} 人
              </span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 平台 Tab 切换 */}
        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={activePlatform}
            onChange={key => setActivePlatform(key as Platform)}
            items={platformTabs}
            tabBarStyle={{
              marginBottom: 0,
              paddingLeft: 16,
              paddingRight: 16,
              borderBottom: '1px solid #f0f0f0',
            }}
            size="large"
          />

          {/* 内容区 Tab */}
          <div className="p-4">
            <Tabs
              activeKey={activeContentTab}
              onChange={setActiveContentTab}
              items={contentTabs}
              type="card"
            />
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}

export default CustomerDetail;
