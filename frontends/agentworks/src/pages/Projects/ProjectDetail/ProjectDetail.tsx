/**
 * 项目详情页
 *
 * 页面结构：
 * - 顶部：项目基本信息卡片（优化布局）
 * - Tab 切换栏（合作达人 | 执行追踪 | 财务管理 | 效果验收）
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs,
  Spin,
  Button,
  Tag,
  Card,
  Empty,
  Progress,
  App,
  Popover,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  TeamOutlined,
  ScheduleOutlined,
  DollarOutlined,
  LineChartOutlined,
  FormOutlined,
  RightOutlined,
  RollbackOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { projectApi } from '../../../services/projectApi';
import type { Project } from '../../../types/project';
import type { ProjectStatus } from '../../../types/project';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_OPTIONS,
  formatMoney,
  normalizeBusinessTypes,
} from '../../../types/project';
import { BUSINESS_TYPES } from '../../../types/customer';
import {
  FINANCE_VALID_STATUSES,
  createFinanceContextFromProject,
  calculateProjectFinanceStats,
} from '../../../utils/financeCalculator';
import { PageTransition } from '../../../components/PageTransition';
import { PageHeader } from '../../../components/PageHeader';
import { CollaborationsTab } from './CollaborationsTab';
import { ExecutionTab } from './ExecutionTab';
import { FinancialTab } from './FinancialTab';
import { EffectTab } from './EffectTab';
import { RegistrationTab } from './RegistrationTab';
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
      <div className="text-xs text-content-muted mb-1 tracking-wide">
        {label}
      </div>
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
  const {
    configs: platformConfigs,
    getPlatformNames,
    getPlatformColors,
  } = usePlatformConfig();
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

  // 状态变更
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  // 获取当前状态在流程中的索引
  const currentStatusIndex = project
    ? PROJECT_STATUS_OPTIONS.indexOf(project.status)
    : 0;
  const canAdvance = currentStatusIndex < PROJECT_STATUS_OPTIONS.length - 1;
  const canRollback = currentStatusIndex > 0;

  // 状态变更处理
  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project || statusUpdating) return;

    try {
      setStatusUpdating(true);
      setStatusPopoverOpen(false);
      const response = await projectApi.updateProject(project.id, {
        status: newStatus,
      });
      if (response.success) {
        message.success(
          `项目状态已更新为「${PROJECT_STATUS_LABELS[newStatus]}」`
        );
        loadProject();
      } else {
        message.error('状态更新失败');
      }
    } catch (error) {
      logger.error('Failed to update project status:', error);
      message.error('状态更新失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  // 推进到下一阶段
  const handleAdvanceStatus = () => {
    if (canAdvance) {
      const nextStatus = PROJECT_STATUS_OPTIONS[currentStatusIndex + 1];
      handleStatusChange(nextStatus);
    }
  };

  // 回退到上一阶段
  const handleRollbackStatus = () => {
    if (canRollback) {
      const prevStatus = PROJECT_STATUS_OPTIONS[currentStatusIndex - 1];
      handleStatusChange(prevStatus);
    }
  };

  // 当配置加载完成后，确保 activeTab 是可见的
  useEffect(() => {
    if (!configLoading && projectConfig) {
      const { tabVisibility } = projectConfig;
      const visibleTabs = (
        [
          'collaborations',
          'execution',
          'finance',
          'effect',
          'registration',
        ] as const
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

  // 从 collaborations 计算统计数据（仅有效状态：客户已定档、视频已发布）
  // 注意：useMemo 必须在条件返回之前调用，遵循 React hooks 规则
  const computedStats = useMemo(() => {
    const collabs = project?.collaborations || [];
    const validCollabs = collabs.filter(c =>
      FINANCE_VALID_STATUSES.includes(c.status)
    );

    const collaborationCount = validCollabs.length;
    const publishedCount = collabs.filter(
      c => c.status === '视频已发布'
    ).length;
    const totalAmount = validCollabs.reduce(
      (sum, c) => sum + (c.amount || 0),
      0
    );

    // 预算使用率（%）
    const budgetUtilization =
      project?.budget && project.budget > 0
        ? (totalAmount / project.budget) * 100
        : 0;

    // 计算财务数据（客户收入、基础利润）
    let totalRevenue = 0;
    let baseProfit = 0;
    let baseProfitRate = 0;

    if (project && platformConfigs.length > 0 && collabs.length > 0) {
      const financeContext = createFinanceContextFromProject(
        project,
        platformConfigs
      );
      const financeStats = calculateProjectFinanceStats(
        collabs,
        financeContext,
        undefined,
        true // filterByStatus
      );
      totalRevenue = financeStats.totalRevenue;
      baseProfit = financeStats.baseProfit;
      baseProfitRate = financeStats.baseProfitRate;
    }

    return {
      collaborationCount,
      publishedCount,
      totalAmount,
      budgetUtilization,
      totalRevenue,
      baseProfit,
      baseProfitRate,
    };
  }, [project, platformConfigs]);

  // 执行进度计算
  const progress =
    computedStats.collaborationCount > 0
      ? Math.round(
          (computedStats.publishedCount / computedStats.collaborationCount) *
            100
        )
      : 0;

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

  // Tab 可见性配置
  const { tabVisibility } = projectConfig;

  // 编辑权限：只有「执行中」状态才能编辑合作达人和执行追踪
  const isExecuting = project.status === 'executing';

  // Tab 项定义（全量）
  const allTabItems = [
    {
      key: 'collaborations',
      visible: tabVisibility.collaborations,
      label: (
        <span className="flex items-center gap-1">
          <TeamOutlined />
          合作达人
          {computedStats.collaborationCount ? (
            <span className="ml-1 text-content-muted">
              ({computedStats.collaborationCount})
            </span>
          ) : null}
        </span>
      ),
      children: (
        <CollaborationsTab
          projectId={project.id}
          customerId={project.customerId}
          platforms={project.platforms}
          project={project}
          onRefresh={refreshProject}
          editable={isExecuting}
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
          editable={isExecuting}
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
          project={project}
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
    {
      key: 'registration',
      visible: tabVisibility.registration ?? false,
      label: (
        <span className="flex items-center gap-1">
          <FormOutlined />
          报名管理
        </span>
      ),
      children: (
        <RegistrationTab
          projectId={project.id}
          projectName={project.name}
          platforms={project.platforms}
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
            <div className="flex items-center gap-2">
              <Button
                icon={<BarChartOutlined />}
                onClick={() => navigate(`/projects/${project.id}/daily-report`)}
              >
                查看日报
              </Button>
              <Tooltip
                title={
                  !isExecuting ? '项目已进入结算阶段，无法编辑' : undefined
                }
              >
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditModalOpen(true)}
                  disabled={!isExecuting}
                >
                  编辑项目
                </Button>
              </Tooltip>
            </div>
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
                {/* 业务类型标签 */}
                {normalizeBusinessTypes(project.businessType).map(type => (
                  <Tag key={type} color="blue" className="shrink-0">
                    {BUSINESS_TYPES[type]?.name || type}
                  </Tag>
                ))}
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
              <Popover
                open={statusPopoverOpen}
                onOpenChange={setStatusPopoverOpen}
                trigger="hover"
                placement="bottomRight"
                content={
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    {canRollback && (
                      <Button
                        type="text"
                        size="small"
                        icon={<RollbackOutlined />}
                        onClick={handleRollbackStatus}
                        loading={statusUpdating}
                        className="justify-start text-left"
                      >
                        回退到「
                        {
                          PROJECT_STATUS_LABELS[
                            PROJECT_STATUS_OPTIONS[currentStatusIndex - 1]
                          ]
                        }
                        」
                      </Button>
                    )}
                    {canAdvance && (
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowRightOutlined />}
                        onClick={handleAdvanceStatus}
                        loading={statusUpdating}
                        className="justify-start text-left"
                      >
                        推进到「
                        {
                          PROJECT_STATUS_LABELS[
                            PROJECT_STATUS_OPTIONS[currentStatusIndex + 1]
                          ]
                        }
                        」
                      </Button>
                    )}
                    {!canRollback && !canAdvance && (
                      <span className="text-content-muted text-xs px-2 py-1">
                        已是最终状态
                      </span>
                    )}
                  </div>
                }
              >
                <Tag
                  color={PROJECT_STATUS_COLORS[project.status]}
                  className="text-sm px-3 py-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={canAdvance ? handleAdvanceStatus : undefined}
                >
                  {PROJECT_STATUS_LABELS[project.status] || project.status}
                  {canAdvance && (
                    <RightOutlined className="ml-1 text-xs opacity-60" />
                  )}
                </Tag>
              </Popover>
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
                {formatMoney(computedStats.totalAmount)}
              </span>
            </InfoItem>

            <InfoItem label="合作达人">
              <span className="font-semibold">
                {computedStats.collaborationCount}
                <span className="font-normal text-content-muted ml-0.5">
                  人
                </span>
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
                  {computedStats.publishedCount}/
                  {computedStats.collaborationCount} 已发布
                </span>
              </div>
            </InfoItem>
          </div>

          {/* 第二行：财务指标 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 py-5">
            <InfoItem label="预算使用率">
              <span
                className={`font-semibold ${
                  computedStats.budgetUtilization >= 100
                    ? 'text-success-600'
                    : computedStats.budgetUtilization >= 80
                      ? 'text-warning-500'
                      : 'text-danger-500'
                }`}
              >
                {computedStats.budgetUtilization.toFixed(1)}%
              </span>
            </InfoItem>

            <InfoItem label="客户收入">
              <span className="font-semibold text-primary-600">
                {formatMoney(computedStats.totalRevenue)}
              </span>
            </InfoItem>

            <InfoItem label="基础利润">
              <div>
                <span className="font-semibold">
                  {formatMoney(computedStats.baseProfit)}
                </span>
                <span
                  className={`ml-1 text-xs ${
                    computedStats.baseProfitRate >= 0
                      ? 'text-success-600'
                      : 'text-danger-500'
                  }`}
                >
                  {computedStats.baseProfitRate.toFixed(1)}%
                </span>
              </div>
            </InfoItem>
          </div>
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
