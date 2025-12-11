/**
 * 客户详情页 (v4.4 重构版)
 *
 * 职责：纯展示 + 功能入口导航
 * 路径：/customers/:id
 *
 * 页面结构：
 * - 顶部：客户基本信息卡片
 * - 中部：统计概览卡片
 * - 下部：功能入口卡片（达人池、业务策略、合作历史）
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, Tag, Descriptions, Card, Empty, App } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  DollarOutlined,
  HistoryOutlined,
  SettingOutlined,
  RightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { customerApi } from '../../../services/customerApi';
import { getCustomerTalentStats } from '../../../api/customerTalents';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import type { Customer } from '../../../types/customer';
import type { CustomerTalentStats } from '../../../types/customerTalent';
import {
  CUSTOMER_LEVEL_NAMES,
  CUSTOMER_STATUS_NAMES,
} from '../../../types/customer';
import { logger } from '../../../utils/logger';

/**
 * 动画变体
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

/**
 * 功能入口卡片组件
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  stats?: React.ReactNode;
  status?: 'configured' | 'pending' | 'disabled';
  onClick: () => void;
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  stats,
  status,
  onClick,
}: FeatureCardProps) {
  const statusConfig = {
    configured: {
      color: '#10b981',
      text: '已配置',
      icon: <CheckCircleOutlined />,
    },
    pending: {
      color: '#f59e0b',
      text: '待配置',
      icon: <ClockCircleOutlined />,
    },
    disabled: {
      color: '#9ca3af',
      text: '开发中',
      icon: <ClockCircleOutlined />,
    },
  };

  const statusInfo = status ? statusConfig[status] : null;

  return (
    <motion.div
      variants={itemVariants}
      initial="rest"
      whileHover="hover"
      className="h-full"
    >
      <motion.div variants={cardHoverVariants}>
        <Card
          className="h-full border-0 shadow-card cursor-pointer transition-shadow duration-300 hover:shadow-soft group"
          styles={{ body: { padding: 24 } }}
          onClick={onClick}
        >
          <div className="flex flex-col h-full min-h-[220px]">
            {/* 头部：图标 + 状态 */}
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: iconBg }}
              >
                <span className="text-xl text-white">{icon}</span>
              </div>
              {statusInfo && (
                <Tag
                  className="flex items-center gap-1 rounded-full px-2.5 py-0.5 border-0 text-xs"
                  style={{
                    backgroundColor: `${statusInfo.color}15`,
                    color: statusInfo.color,
                  }}
                >
                  {statusInfo.icon}
                  <span className="ml-0.5">{statusInfo.text}</span>
                </Tag>
              )}
            </div>

            {/* 标题 + 描述 */}
            <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:text-primary-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {description}
            </p>

            {/* 统计信息 - 固定高度区域 */}
            <div className="h-10 mb-3">{stats}</div>

            {/* 底部操作提示 */}
            <div className="flex items-center text-sm text-primary-600 font-medium group-hover:translate-x-1 transition-transform mt-auto">
              进入管理
              <RightOutlined className="ml-1 text-xs" />
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/**
 * 客户详情页主组件
 */
export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 状态
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [talentStats, setTalentStats] = useState<CustomerTalentStats | null>(
    null
  );

  // 平台配置
  const { loading: platformLoading } = usePlatformConfig();

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

  // 检查业务策略配置状态
  const hasTalentProcurement =
    customer.businessStrategies?.talentProcurement?.enabled ?? false;

  // 统计信息
  const totalTalents = talentStats?.totalCount || 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* 返回按钮和标题 */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 m-0">客户详情</h1>
      </motion.div>

      {/* 客户基本信息卡片 */}
      <motion.div variants={itemVariants}>
        <Card
          className="shadow-card border-0"
          extra={
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/edit/${id}`)}
            >
              编辑信息
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
          </Descriptions>
        </Card>
      </motion.div>

      {/* 功能入口卡片 */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">功能模块</h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* 达人池管理 */}
        <FeatureCard
          icon={<TeamOutlined />}
          iconBg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          title="达人池管理"
          description="管理该客户的专属达人池，添加、移除达人，设置标签和分类"
          status={totalTalents > 0 ? 'configured' : 'pending'}
          stats={
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 tabular-nums">
                {totalTalents}
              </span>
              <span className="text-sm text-gray-500">位达人</span>
            </div>
          }
          onClick={() => navigate(`/customers/${id}/talent-pool`)}
        />

        {/* 业务策略配置 */}
        <FeatureCard
          icon={<DollarOutlined />}
          iconBg="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
          title="业务策略配置"
          description="配置达人采买、广告投流、内容制作等业务的定价策略和业务标签"
          status={hasTalentProcurement ? 'configured' : 'pending'}
          stats={
            hasTalentProcurement ? (
              <div className="flex items-center gap-1.5">
                <Tag color="green" className="m-0">
                  达人采买
                </Tag>
                {customer.businessStrategies?.adPlacement?.enabled && (
                  <Tag color="orange" className="m-0">
                    广告投流
                  </Tag>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-400">暂未配置</span>
            )
          }
          onClick={() => navigate(`/customers/${id}/business-strategies`)}
        />

        {/* 项目配置管理 */}
        <FeatureCard
          icon={<SettingOutlined />}
          iconBg="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
          title="项目配置管理"
          description="配置该客户的项目详情页显示内容，包括 Tab 开关和效果指标"
          status={customer.projectConfig?.enabled ? 'configured' : 'pending'}
          stats={
            customer.projectConfig?.enabled ? (
              <div className="flex items-center gap-1.5">
                <Tag color="purple" className="m-0">
                  已定制
                </Tag>
              </div>
            ) : (
              <span className="text-sm text-gray-400">使用系统默认</span>
            )
          }
          onClick={() => navigate(`/customers/${id}/project-config`)}
        />

        {/* 合作历史 */}
        <FeatureCard
          icon={<HistoryOutlined />}
          iconBg="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          title="合作历史"
          description="查看与该客户的项目合作记录、结算历史和关键里程碑"
          status="disabled"
          stats={<span className="text-sm text-gray-400">功能开发中</span>}
          onClick={() => message.info('合作历史功能开发中')}
        />
      </motion.div>
    </motion.div>
  );
}

export default CustomerDetail;
