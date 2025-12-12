/**
 * 项目管理工作台
 * 本月概览、需要关注、本周待发布、最近项目
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Button,
  Badge,
  Space,
  Spin,
  Empty,
  App,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
  RightOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../components/PageTransition';
import { projectApi } from '../../services/projectApi';
import type { ProjectListItem, DashboardOverview } from '../../types/project';
import {
  PROJECT_STATUS_COLORS,
  formatMoney,
  calculateProgress,
} from '../../types/project';
import { ProjectFormModal } from './ProjectList/ProjectFormModal';
import { logger } from '../../utils/logger';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';

export function ProjectsHome() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectListItem[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<
    Array<{
      date: string;
      collaborations: Array<{
        id: string;
        talentName: string;
        projectName: string;
      }>;
    }>
  >([]);

  // 弹窗状态
  const [formModalOpen, setFormModalOpen] = useState(false);

  /**
   * 加载工作台数据
   */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      // 并行加载数据
      const [dashboardRes, projectsRes] = await Promise.all([
        projectApi.getDashboard(),
        projectApi.getProjects({ page: 1, pageSize: 8 }),
      ]);

      if (dashboardRes.success && dashboardRes.data) {
        setOverview(dashboardRes.data);
        setWeeklySchedule(dashboardRes.data.weeklySchedule || []);
      }

      if (projectsRes.success) {
        setRecentProjects(projectsRes.data.items);
      }
    } catch (error) {
      logger.error('Error loading dashboard:', error);
      message.error('加载工作台数据失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /**
   * 新建项目成功回调
   */
  const handleCreateSuccess = () => {
    setFormModalOpen(false);
    loadDashboard();
  };

  /**
   * 格式化日期为周几
   */
  const formatWeekday = (dateStr: string): string => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  };

  /**
   * 格式化日期显示
   */
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${formatWeekday(dateStr)}`;
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <Spin size="large" tip="加载中..." />
        </div>
      </PageTransition>
    );
  }

  const monthlyOverview = overview?.monthlyOverview || {
    executingCount: 0,
    pendingSettlementCount: 0,
    totalRevenue: 0,
    profitRate: 0,
  };

  const alerts = overview?.alerts || [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content">项目工作台</h1>
            <p className="mt-1 text-sm text-content-secondary">本月项目概览与待办事项</p>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormModalOpen(true)}
            >
              新建项目
            </Button>
            <Button onClick={() => navigate('/projects/list')}>
              查看全部项目
            </Button>
          </Space>
        </div>

        {/* 本月概览 */}
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card
              hoverable
              onClick={() => navigate('/projects/list?status=执行中')}
            >
              <Statistic
                title="执行中项目"
                value={monthlyOverview.executingCount}
                prefix={<FolderOutlined />}
                styles={{ content: { color: 'var(--aw-primary-500)' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card
              hoverable
              onClick={() => navigate('/projects/list?status=待结算')}
            >
              <Statistic
                title="待结算项目"
                value={monthlyOverview.pendingSettlementCount}
                prefix={<ClockCircleOutlined />}
                styles={{
                  content: {
                    color:
                      monthlyOverview.pendingSettlementCount > 0
                        ? 'var(--aw-warning-500)'
                        : 'var(--aw-gray-500)',
                  },
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="本月收入"
                value={monthlyOverview.totalRevenue / 100}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="元"
                styles={{ content: { color: 'var(--aw-success-500)' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div className="flex flex-col items-center">
                <div className="text-content-secondary mb-2">利润率</div>
                <Progress
                  type="circle"
                  percent={monthlyOverview.profitRate}
                  size={80}
                  strokeColor={
                    monthlyOverview.profitRate >= 20
                      ? 'var(--aw-success-500)'
                      : 'var(--aw-warning-500)'
                  }
                  format={p => `${p}%`}
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* 需要关注 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <WarningOutlined className="text-orange-500" />
                  需要关注
                  {alerts.length > 0 && (
                    <Badge count={alerts.length} size="small" />
                  )}
                </span>
              }
              extra={
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate('/projects/list')}
                >
                  查看全部
                </Button>
              }
              className="h-full"
            >
              {alerts.length > 0 ? (
                <List
                  size="small"
                  dataSource={alerts.slice(0, 5)}
                  renderItem={item => (
                    <List.Item
                      className="cursor-pointer hover:bg-surface-base -mx-3 px-3"
                      onClick={() => navigate(`/projects/${item.projectId}`)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Tag
                          color={
                            item.type === 'delay'
                              ? 'error'
                              : item.type === 'budget_exceeded'
                                ? 'warning'
                                : 'default'
                          }
                        >
                          {item.type === 'delay'
                            ? '延期'
                            : item.type === 'budget_exceeded'
                              ? '超预算'
                              : '长期待处理'}
                        </Tag>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.projectName}
                          </div>
                          <div className="text-xs text-content-secondary truncate">
                            {item.message}
                          </div>
                        </div>
                        <RightOutlined className="text-content-muted" />
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="暂无预警"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className="py-8"
                />
              )}
            </Card>
          </Col>

          {/* 本周待发布 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <CalendarOutlined className="text-blue-500" />
                  本周待发布
                </span>
              }
              className="h-full"
            >
              {weeklySchedule.length > 0 ? (
                <div className="space-y-4">
                  {weeklySchedule.slice(0, 5).map(day => (
                    <div key={day.date}>
                      <div className="text-sm font-medium text-content mb-2">
                        {formatDateDisplay(day.date)}
                        <Badge
                          count={day.collaborations.length}
                          size="small"
                          className="ml-2"
                          style={{ backgroundColor: 'var(--aw-primary-500)' }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {day.collaborations.slice(0, 4).map(collab => (
                          <Tag key={collab.id} className="mb-1">
                            {collab.talentName}
                          </Tag>
                        ))}
                        {day.collaborations.length > 4 && (
                          <Tag className="mb-1">
                            +{day.collaborations.length - 4} 更多
                          </Tag>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  description="本周暂无待发布"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className="py-8"
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* 最近项目 */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <FolderOutlined className="text-primary-500" />
              最近项目
            </span>
          }
          extra={
            <Button
              type="link"
              size="small"
              onClick={() => navigate('/projects/list')}
            >
              查看全部 <RightOutlined />
            </Button>
          }
        >
          {recentProjects.length > 0 ? (
            <Row gutter={[16, 16]}>
              {recentProjects.map(project => {
                const progress = calculateProgress(project.stats);
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                    <Card
                      size="small"
                      hoverable
                      className="h-full"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-content truncate flex-1 pr-2">
                            {project.name}
                          </div>
                          <Tag
                            color={PROJECT_STATUS_COLORS[project.status]}
                            className="shrink-0"
                          >
                            {project.status}
                          </Tag>
                        </div>
                        <div className="text-xs text-content-secondary">
                          {project.customerName || project.customerId}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {project.platforms.map(p => (
                            <Tag
                              key={p}
                              color={platformColors[p] || 'default'}
                              className="text-xs"
                            >
                              {platformNames[p] || p}
                            </Tag>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-content-secondary">
                            {project.year}年{project.month}月
                          </span>
                          <span className="font-medium">
                            {formatMoney(project.budget)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            percent={progress}
                            size="small"
                            className="flex-1"
                            strokeColor={
                              progress === 100
                                ? 'var(--aw-success-500)'
                                : undefined
                            }
                          />
                          <span className="text-xs text-content-secondary">
                            {project.stats?.publishedCount || 0}/
                            {project.stats?.collaborationCount || 0}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" onClick={() => setFormModalOpen(true)}>
                创建第一个项目
              </Button>
            </Empty>
          )}
        </Card>

        {/* 新建项目弹窗 */}
        <ProjectFormModal
          open={formModalOpen}
          editingProject={null}
          onCancel={() => setFormModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </PageTransition>
  );
}
