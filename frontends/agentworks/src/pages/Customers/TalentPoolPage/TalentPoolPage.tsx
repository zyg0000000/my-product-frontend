/**
 * 达人池管理页面 (v4.4)
 *
 * 独立的达人池管理页面，从客户详情页分离
 * 路径: /customers/:id/talent-pool
 *
 * 功能：
 * - 平台 Tab 切换
 * - 达人列表展示与管理
 * - 添加/移除达人
 * - 标签管理与筛选
 * - 批量操作
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Spin, Empty, Card, Tag, App } from 'antd';
import { TeamOutlined, UserOutlined, StarOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { customerApi } from '../../../services/customerApi';
import { getCustomerTalentStats } from '../../../api/customerTalents';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import type { Customer } from '../../../types/customer';
import type { CustomerTalentStats } from '../../../types/customerTalent';
import type { Platform } from '../../../types/talent';
import { PageHeader } from '../../../components/PageHeader';
import { TalentPoolTab } from '../CustomerDetail/TalentPoolTab';
import { logger } from '../../../utils/logger';

/**
 * 动画变体
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * 统计卡片组件
 */
function StatsCard({
  icon,
  title,
  value,
  suffix,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  suffix?: string;
  color: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        className="h-full border-0 shadow-card hover:shadow-soft transition-shadow duration-300"
        styles={{ body: { padding: '20px 24px' } }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <span style={{ color, fontSize: 20 }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-500 mb-1">{title}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-gray-900 tabular-nums">
                {value}
              </span>
              {suffix && (
                <span className="text-sm text-gray-400">{suffix}</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * 达人池管理页面主组件
 */
export function TalentPoolPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 状态
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [talentStats, setTalentStats] = useState<CustomerTalentStats | null>(
    null
  );
  const [activePlatform, setActivePlatform] = useState<Platform>('douyin');

  // 平台配置
  const { configs: platformConfigs, loading: platformLoading } =
    usePlatformConfig();

  // 加载客户信息
  useEffect(() => {
    if (id) {
      loadCustomer(id);
    }
  }, [id]);

  // 客户信息加载完成后，加载统计数据
  useEffect(() => {
    if (customer?.code) {
      loadTalentStats(customer.code);
    }
  }, [customer?.code]);

  const loadCustomer = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await customerApi.getCustomerById(customerId);
      if (response.success && response.data) {
        setCustomer(response.data);
      } else {
        message.error('客户信息加载失败');
      }
    } catch (error) {
      logger.error('Failed to load customer:', error);
      message.error('客户信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTalentStats = async (customerCode: string) => {
    try {
      const stats = await getCustomerTalentStats(customerCode);
      setTalentStats(stats);
    } catch (error) {
      logger.error('Failed to load talent stats:', error);
    }
  };

  // 刷新达人池统计
  const refreshTalentStats = () => {
    if (customer?.code) {
      loadTalentStats(customer.code);
    }
  };

  if (loading || platformLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" tip="加载中...">
          <div className="p-12" />
        </Spin>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Empty description="客户不存在" />
      </div>
    );
  }

  // 平台 Tab 项
  // platformStats 是 Record<string, number>，不是数组
  const platformTabs = platformConfigs.map(config => {
    const count = talentStats?.platformStats?.[config.platform] || 0;

    return {
      key: config.platform,
      label: (
        <span className="flex items-center gap-2">
          {config.name}
          {count > 0 && (
            <Tag
              className="ml-1 rounded-full px-2 py-0 text-xs"
              style={{
                backgroundColor: '#4f46e515',
                color: '#4f46e5',
                border: 'none',
              }}
            >
              {count}
            </Tag>
          )}
        </span>
      ),
    };
  });

  // 统计数据
  const totalCount = talentStats?.totalCount || 0;
  const currentPlatformCount =
    talentStats?.platformStats?.[activePlatform] || 0;
  // 重点达人数暂时使用 0（后端未提供此字段）
  const importantCount = 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* 页面头部 */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="达人池管理"
          description={`客户：${customer.name} (${customer.code})`}
          onBack={() => navigate(-1)}
          backText="返回"
        />
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatsCard
          icon={<TeamOutlined />}
          title="达人总数"
          value={totalCount}
          suffix="人"
          color="#4f46e5"
        />
        <StatsCard
          icon={<UserOutlined />}
          title="当前平台"
          value={currentPlatformCount}
          suffix="人"
          color="#10b981"
        />
        <StatsCard
          icon={<StarOutlined />}
          title="重点达人"
          value={importantCount}
          suffix="人"
          color="#f59e0b"
        />
      </motion.div>

      {/* 平台 Tab + 达人列表 */}
      <motion.div variants={itemVariants}>
        <Card
          className="shadow-card border-0"
          styles={{ body: { padding: 0 } }}
        >
          {/* 平台切换 Tab */}
          <Tabs
            activeKey={activePlatform}
            onChange={key => setActivePlatform(key as Platform)}
            items={platformTabs}
            tabBarStyle={{
              marginBottom: 0,
              paddingLeft: 20,
              paddingRight: 20,
              borderBottom: '1px solid #f0f0f0',
            }}
            size="large"
          />

          {/* 达人列表内容 */}
          <div className="p-4">
            <TalentPoolTab
              customerId={customer.code}
              platform={activePlatform}
              onRefresh={refreshTalentStats}
            />
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default TalentPoolPage;
