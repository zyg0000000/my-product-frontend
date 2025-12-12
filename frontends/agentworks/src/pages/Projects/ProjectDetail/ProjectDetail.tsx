/**
 * 项目详情页
 *
 * 页面结构：
 * - 顶部：项目基本信息卡片（优化布局）
 * - Tab 切换栏（合作达人 | 执行追踪 | 财务管理 | 效果验收）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Spin, Button, Tag, Card, Empty, Progress, App } from 'antd';
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
  PROJECT_STATUS_LABELS,
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
import { useCustomerProjectConfig } from '../../../hooks/useCustomerProjectConfig';

/**
 * 信息项组件 - 统一的标签+值布局
 */
function InfoItem({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-content-muted mb-1 tracking-wide">{label}</div>
      <div className="text-sm text-content">{children}</div>
    </div>
  );
}

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

  // 获取客户项目配置（根据项目的 customerId）
  const { config: projectConfig, loading: configLoading } =
    useCustomerProjectConfig(project?.customerId);

  // 编辑弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 当配置加载完成后，确保 activeTab 是可见的
  useEffect(() => {
    if (!configLoading && projectConfig) {
      const { tabVisibility } = projectConfig;
      const visibleTabs = (
        ['collaborations', 'execution', 'finance', 'effect'] as const
      ).filter(key => tabVisibility[key]);

      // 如果当前 activeTab 不在可见列表中，切换到第一个可见 Tab
      if (
        visibleTabs.length > 0 &&
        !visibleTabs.includes(activeTab as (typeof visibleTabs)[number])
      ) {
        setActiveTab(visibleTabs[0]);
      }
    }
  }, [configLoading, projectConfig, activeTab]);

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

  if (loading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中...">
          <div className="p-12" />
        </Spin>
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

  // Tab 可见性配置
  const { tabVisibility } = projectConfig;

  // Tab 项定义（全量）
  const allTabItems = [
    {
      key: 'collaborations',
      visible: tabVisibility.collaborations,
      label: (
        <span className="flex items-center gap-1">
          <TeamOutlined />
          合作达人
          {stats.collaborationCount ? (
            <span className="ml-1 text-content-muted">
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
      visible: tabVisibility.execution,
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
      visible: tabVisibility.finance,
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
          financeConfig={projectConfig.financeConfig}
          settlementFiles={project.settlementFiles}
          onRefresh={refreshProject}
        />
      ),
    },
    {
      key: 'effect',
      visible: tabVisibility.effect,
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
          effectConfig={projectConfig.effectConfig}
          onRefresh={refreshProject}
        />
      ),
    },
  ];

  // 根据配置过滤可见的 Tab
  const tabItems = allTabItems.filter(tab => tab.visible);

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

        {/* 项目基本信息卡片 - 优化布局 */}
        <Card className="shadow-card overflow-hidden">
          {/* 顶部区域：项目名称 + 状态 */}
          <div className="flex items-start justify-between pb-5 border-b border-stroke">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-semibold text-content truncate">
                  {project.name}
                </h1>
                {project.businessTag && (
                  <Tag className="shrink-0">{project.businessTag}</Tag>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-content-secondary">
                <span>
                  所属客户：
                  <a
                    className="text-primary-600 hover:text-primary-700 cursor-pointer font-medium"
                    onClick={() => navigate(`/customers/${project.customerId}`)}
                  >
                    {project.customerName || project.customerId}
                  </a>
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  执行时间：{project.year}年{project.month}月
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-content-muted mb-1.5">当前状态</div>
              <Tag
                color={PROJECT_STATUS_COLORS[project.status]}
                className="text-sm px-3 py-0.5"
              >
                {PROJECT_STATUS_LABELS[project.status] || project.status}
              </Tag>
            </div>
          </div>

          {/* 中间区域：核心指标 Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 py-5 border-b border-stroke">
            <InfoItem label="投放平台">
              <div className="flex flex-wrap gap-1">
                {project.platforms.map(platform => (
                  <Tag
                    key={platform}
                    color={platformColors[platform] || 'default'}
                    className="text-xs"
                  >
                    {platformNames[platform] || platform}
                  </Tag>
                ))}
              </div>
            </InfoItem>

            <InfoItem label="项目预算">
              <span className="font-semibold text-primary-600">
                {formatMoney(project.budget)}
              </span>
            </InfoItem>

            <InfoItem label="执行金额">
              <span className="font-semibold">
                {formatMoney(stats.totalAmount || 0)}
              </span>
            </InfoItem>

            <InfoItem label="合作达人">
              <span className="font-semibold">
                {stats.collaborationCount || 0}
                <span className="font-normal text-content-muted ml-0.5">人</span>
              </span>
            </InfoItem>

            <InfoItem
              label="执行进度"
              className="col-span-2 sm:col-span-1 lg:col-span-2"
            >
              <div className="flex items-center gap-3">
                <Progress
                  percent={progress}
                  size="small"
                  strokeColor={progress === 100 ? '#52c41a' : '#3b82f6'}
                  className="flex-1 max-w-[200px]"
                />
                <span className="text-xs text-content-secondary whitespace-nowrap shrink-0">
                  {stats.publishedCount || 0}/{stats.collaborationCount || 0}{' '}
                  已发布
                </span>
              </div>
            </InfoItem>
          </div>

          {/* TODO: 底部区域预留给 KPI 卡片 */}
        </Card>

        {/* Tab 切换 - 使用 card 类型样式 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          type="card"
          className="project-detail-tabs"
        />

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
            financialYear: project.financialYear,
            financialMonth: project.financialMonth,
            budget: project.budget,
            platforms: project.platforms,
            platformDiscounts: project.platformDiscounts,
            platformKPIConfigs: project.platformKPIConfigs,
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
