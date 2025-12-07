/**
 * 项目详情页
 *
 * 页面结构：
 * - 顶部：项目基本信息卡片
 * - Tab 切换栏（合作达人 | 执行追踪 | 财务管理 | 效果验收）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs,
  Spin,
  Button,
  Tag,
  Descriptions,
  Card,
  Empty,
  Progress,
  Space,
  App,
} from 'antd';
import {
  EditOutlined,
  TeamOutlined,
  ScheduleOutlined,
  DollarOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { projectApi } from '../../../services/projectApi';
import type { Project, ProjectStats } from '../../../types/project';
import {
  PROJECT_STATUS_COLORS,
  formatMoney,
  calculateProgress,
} from '../../../types/project';
import { PageTransition } from '../../../components/PageTransition';
import { PageHeader } from '../../../components/PageHeader';
import { CollaborationsTab } from './CollaborationsTab';
import { ExecutionTab } from './ExecutionTab';
import { FinancialTab } from './FinancialTab';
import { EffectTab } from './EffectTab';
import { ProjectFormModal } from '../ProjectList/ProjectFormModal';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

/**
 * 项目详情页主组件
 */
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 状态
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collaborations');

  // 编辑弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 加载项目信息
  const loadProject = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await projectApi.getProjectById(id);
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        message.error('获取项目详情失败');
      }
    } catch (error) {
      logger.error('Failed to load project:', error);
      message.error('获取项目详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // 刷新项目（供子组件调用）
  const refreshProject = () => {
    loadProject();
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    setEditModalOpen(false);
    loadProject();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Empty description="项目不存在" />
      </div>
    );
  }

  const stats = project.stats || ({} as ProjectStats);
  const progress = calculateProgress(stats);

  // Tab 项
  const tabItems = [
    {
      key: 'collaborations',
      label: (
        <span className="flex items-center gap-1">
          <TeamOutlined />
          合作达人
          {stats.collaborationCount ? (
            <span className="ml-1 text-gray-400">
              ({stats.collaborationCount})
            </span>
          ) : null}
        </span>
      ),
      children: (
        <CollaborationsTab
          projectId={project.id}
          platforms={project.platforms}
          onRefresh={refreshProject}
        />
      ),
    },
    {
      key: 'execution',
      label: (
        <span className="flex items-center gap-1">
          <ScheduleOutlined />
          执行追踪
        </span>
      ),
      children: (
        <ExecutionTab
          projectId={project.id}
          platforms={project.platforms}
          onRefresh={refreshProject}
        />
      ),
    },
    {
      key: 'finance',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          财务管理
        </span>
      ),
      children: (
        <FinancialTab
          projectId={project.id}
          platforms={project.platforms}
          onRefresh={refreshProject}
        />
      ),
    },
    {
      key: 'effect',
      label: (
        <span className="flex items-center gap-1">
          <LineChartOutlined />
          效果验收
        </span>
      ),
      children: (
        <EffectTab
          projectId={project.id}
          platforms={project.platforms}
          benchmarkCPM={project.benchmarkCPM}
          onRefresh={refreshProject}
        />
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面头部 */}
        <PageHeader
          title="项目详情"
          onBack={() => navigate(-1)}
          backText="返回"
          extra={
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditModalOpen(true)}
            >
              编辑项目
            </Button>
          }
        />

        {/* 项目基本信息卡片 */}
        <Card className="shadow-card">
          <Descriptions column={{ xs: 1, sm: 2, md: 3, lg: 4 }} size="middle">
            <Descriptions.Item label="项目名称" span={2}>
              <span className="font-semibold text-lg">{project.name}</span>
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag color={PROJECT_STATUS_COLORS[project.status]}>
                {project.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="项目类型">
              <Tag>{project.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="所属客户">
              <a
                className="text-primary-600 hover:text-primary-700 cursor-pointer"
                onClick={() => navigate(`/customers/${project.customerId}`)}
              >
                {project.customerName || project.customerId}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="执行时间">
              {project.year}年{project.month}月
            </Descriptions.Item>
            <Descriptions.Item label="投放平台">
              <Space size={[4, 4]} wrap>
                {project.platforms.map(platform => (
                  <Tag
                    key={platform}
                    color={platformColors[platform] || 'default'}
                  >
                    {platformNames[platform] || platform}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="项目预算">
              <span className="font-semibold text-primary-600">
                {formatMoney(project.budget)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="合作达人">
              <span className="font-medium">
                {stats.collaborationCount || 0} 人
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="执行金额">
              <span className="font-medium">
                {formatMoney(stats.totalAmount || 0)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="执行进度" span={2}>
              <div className="flex items-center gap-3 max-w-xs">
                <Progress
                  percent={progress}
                  size="small"
                  strokeColor={progress === 100 ? '#52c41a' : undefined}
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {stats.publishedCount || 0}/{stats.collaborationCount || 0}{' '}
                  已发布
                </span>
              </div>
            </Descriptions.Item>
            {project.discount && (
              <Descriptions.Item label="折扣率">
                {(project.discount * 100).toFixed(1)}%
              </Descriptions.Item>
            )}
            {project.benchmarkCPM && (
              <Descriptions.Item label="基准CPM">
                {project.benchmarkCPM}
              </Descriptions.Item>
            )}
            {project.qianchuanId && (
              <Descriptions.Item label="千川ID">
                {project.qianchuanId}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Tab 切换 */}
        <Card className="shadow-card">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
          />
        </Card>

        {/* 编辑弹窗 */}
        <ProjectFormModal
          open={editModalOpen}
          editingProject={{
            id: project.id,
            name: project.name,
            businessType: project.businessType,
            businessTag: project.businessTag,
            type: project.type,
            status: project.status,
            customerId: project.customerId,
            customerName: project.customerName,
            year: project.year,
            month: project.month,
            budget: project.budget,
            platforms: project.platforms,
            platformDiscounts: project.platformDiscounts,
            discount: project.discount,
            stats: project.stats,
            createdAt: project.createdAt,
          }}
          onCancel={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      </div>
    </PageTransition>
  );
}

export default ProjectDetail;
