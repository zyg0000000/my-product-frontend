/**
 * 数据迁移工作台
 * ByteProject (kol_data) → AgentWorks (agentworks_db)
 *
 * 支持分步骤、分模块的数据迁移流程
 */

import { useState, useEffect, useCallback } from 'react';
import { ProCard } from '@ant-design/pro-components';
import {
  Steps,
  Table,
  Button,
  Tag,
  Alert,
  message,
  Spin,
  Result,
  Descriptions,
  Popconfirm,
  Radio,
} from 'antd';
import type { RadioChangeEvent } from 'antd';
import {
  DatabaseOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  RollbackOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../components/PageTransition';
import * as migrationApi from '../../api/dataMigration';
import type {
  SourceProject,
  TalentValidationResult,
  ProjectMigrationResult,
  CollaborationMigrationResult,
  EffectMigrationResult,
  DailyStatsMigrationResult,
  MigrationValidationResult,
} from '../../api/dataMigration';

// 迁移状态
type MigrationStep =
  | 'select'
  | 'validate'
  | 'migrate_project'
  | 'migrate_collaborations'
  | 'migrate_effects'
  | 'validation'
  | 'completed';

// 追踪状态类型
type TrackingStatusChoice = 'active' | 'archived' | 'disabled';

interface MigrationState {
  step: MigrationStep;
  selectedProject: SourceProject | null;
  talentValidation: TalentValidationResult | null;
  projectMigration: ProjectMigrationResult | null;
  collaborationMigration: CollaborationMigrationResult | null;
  effectMigration: EffectMigrationResult | null;
  dailyStatsMigration: DailyStatsMigrationResult | null;
  migrationValidation: MigrationValidationResult | null;
  trackingStatusChoice: TrackingStatusChoice;
}

const STEP_CONFIG = [
  { key: 'select', title: '选择项目', icon: <DatabaseOutlined /> },
  { key: 'validate', title: '达人校验', icon: <UserOutlined /> },
  { key: 'migrate', title: '分模块迁移', icon: <SyncOutlined /> },
  { key: 'validation', title: '验收确认', icon: <CheckCircleOutlined /> },
];

export function MigrationHome() {
  // 状态
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<SourceProject[]>([]);
  const [state, setState] = useState<MigrationState>({
    step: 'select',
    selectedProject: null,
    talentValidation: null,
    projectMigration: null,
    collaborationMigration: null,
    effectMigration: null,
    dailyStatsMigration: null,
    migrationValidation: null,
    trackingStatusChoice: 'archived',
  });

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await migrationApi.listSourceProjects();
      setProjects(data);
    } catch (error) {
      message.error('加载项目列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 返回选择并刷新
  const handleBackToSelect = useCallback(() => {
    setState({
      step: 'select',
      selectedProject: null,
      talentValidation: null,
      projectMigration: null,
      collaborationMigration: null,
      effectMigration: null,
      dailyStatsMigration: null,
      migrationValidation: null,
      trackingStatusChoice: 'archived',
    });
    loadProjects();
  }, [loadProjects]);

  // 选择项目
  const handleSelectProject = async (project: SourceProject) => {
    setState(prev => ({
      ...prev,
      selectedProject: project,
      step: 'validate',
    }));

    // 自动执行达人校验
    setLoading(true);
    try {
      const result = await migrationApi.validateTalents(project.id);
      setState(prev => ({
        ...prev,
        talentValidation: result,
      }));
    } catch (error) {
      message.error('达人校验失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 继续迁移（用于部分迁移的项目）
  const handleContinueMigration = async (project: SourceProject) => {
    if (!project.targetProjectId) {
      message.error('无法找到目标项目ID');
      return;
    }

    // 设置状态，跳过项目迁移步骤
    setState(prev => ({
      ...prev,
      selectedProject: project,
      projectMigration: {
        success: true,
        newProjectId: project.targetProjectId!,
        sourceProjectId: project.id,
        projectName: project.name,
      },
      step: project.hasCollaborations
        ? 'migrate_effects'
        : 'migrate_collaborations',
      collaborationMigration: project.hasCollaborations
        ? {
            success: true,
            count: project.collaborationCount || 0,
            mappings: {},
          }
        : null,
    }));

    message.info(`继续迁移项目: ${project.name}`);
  };

  // 迁移项目
  const handleMigrateProject = async () => {
    if (!state.selectedProject) return;

    setLoading(true);
    try {
      const result = await migrationApi.migrateProject(
        state.selectedProject.id
      );
      if (result.success) {
        setState(prev => ({
          ...prev,
          projectMigration: result,
          step: 'migrate_collaborations',
        }));
        message.success('项目基础信息迁移成功');
      } else {
        message.error(result.message || '项目迁移失败');
      }
    } catch (error) {
      message.error('项目迁移失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 迁移合作记录
  const handleMigrateCollaborations = async () => {
    if (!state.selectedProject || !state.projectMigration?.newProjectId) return;

    setLoading(true);
    try {
      const result = await migrationApi.migrateCollaborations(
        state.selectedProject.id,
        state.projectMigration.newProjectId
      );
      if (result.success) {
        setState(prev => ({
          ...prev,
          collaborationMigration: result,
          step: 'migrate_effects',
        }));
        message.success(`成功迁移 ${result.count} 条合作记录`);
      } else {
        message.error(result.message || '合作记录迁移失败');
      }
    } catch (error) {
      message.error('合作记录迁移失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 迁移效果数据
  const handleMigrateEffects = async () => {
    if (!state.selectedProject) return;

    setLoading(true);
    try {
      const result = await migrationApi.migrateEffects(
        state.selectedProject.id,
        state.collaborationMigration?.mappings
      );
      if (result.success) {
        setState(prev => ({
          ...prev,
          effectMigration: result,
        }));
        message.success(
          `效果数据迁移完成，更新了 ${result.updatedCount} 条记录`
        );

        // 检查是否可以进入验证步骤（效果和日报都完成或日报无数据）
        checkAndMoveToValidation();
      } else {
        message.error(result.message || '效果数据迁移失败');
      }
    } catch (error) {
      message.error('效果数据迁移失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 迁移日报数据
  const handleMigrateDailyStats = async () => {
    if (!state.selectedProject) return;

    setLoading(true);
    try {
      const result = await migrationApi.migrateDailyStats(
        state.selectedProject.id,
        state.collaborationMigration?.mappings,
        state.trackingStatusChoice
      );
      if (result.success) {
        setState(prev => ({
          ...prev,
          dailyStatsMigration: result,
        }));
        if (result.migratedCount > 0) {
          message.success(
            `日报数据迁移完成，迁移了 ${result.migratedCount} 条记录`
          );
        } else {
          message.info(result.message || '无日报数据需要迁移');
        }

        // 检查是否可以进入验证步骤
        checkAndMoveToValidation();
      } else {
        message.error(result.message || '日报数据迁移失败');
      }
    } catch (error) {
      message.error('日报数据迁移失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 追踪状态变更
  const handleTrackingStatusChange = (e: RadioChangeEvent) => {
    setState(prev => ({
      ...prev,
      trackingStatusChoice: e.target.value,
    }));
  };

  // 检查并进入验证步骤
  const checkAndMoveToValidation = async () => {
    // 需要在最新状态中检查
    setState(prev => {
      const effectDone = !!prev.effectMigration;
      const dailyStatsDone = !!prev.dailyStatsMigration;

      // 两个都完成后进入验证
      if (effectDone && dailyStatsDone) {
        // 异步执行验证
        if (prev.selectedProject && prev.projectMigration?.newProjectId) {
          migrationApi
            .validateMigration(
              prev.selectedProject.id,
              prev.projectMigration.newProjectId
            )
            .then(validationResult => {
              setState(p => ({
                ...p,
                migrationValidation: validationResult,
                step: 'validation',
              }));
            });
        }
      }

      return prev;
    });
  };

  // 回滚迁移
  const handleRollback = async () => {
    if (!state.projectMigration?.newProjectId) return;

    setLoading(true);
    try {
      const result = await migrationApi.rollbackMigration(
        state.projectMigration.newProjectId
      );
      if (result.success) {
        message.success('回滚成功');
        // 重置状态
        setState({
          step: 'select',
          selectedProject: null,
          talentValidation: null,
          projectMigration: null,
          collaborationMigration: null,
          effectMigration: null,
          dailyStatsMigration: null,
          migrationValidation: null,
          trackingStatusChoice: 'archived',
        });
        loadProjects();
      }
    } catch (error) {
      message.error('回滚失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 完成迁移
  const handleComplete = () => {
    setState({
      step: 'select',
      selectedProject: null,
      talentValidation: null,
      projectMigration: null,
      collaborationMigration: null,
      effectMigration: null,
      dailyStatsMigration: null,
      migrationValidation: null,
      trackingStatusChoice: 'archived',
    });
    loadProjects();
    message.success('迁移流程完成');
  };

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    switch (state.step) {
      case 'select':
        return 0;
      case 'validate':
        return 1;
      case 'migrate_project':
      case 'migrate_collaborations':
      case 'migrate_effects':
        return 2;
      case 'validation':
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  // 项目列表列定义
  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === '执行中' ? 'processing' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '财务周期',
      key: 'period',
      width: 120,
      render: (_: unknown, record: SourceProject) => {
        // 处理月份显示：去掉 M 前缀，显示为 "12月" 格式
        const fm = record.financialMonth;
        const monthNum =
          typeof fm === 'string' && fm.startsWith('M')
            ? fm.replace('M', '')
            : fm;
        return `${record.financialYear} ${monthNum}月`;
      },
    },
    {
      title: '折扣',
      dataIndex: 'discount',
      key: 'discount',
      width: 80,
    },
    {
      title: '合作数',
      dataIndex: 'collaborationCount',
      key: 'collaborationCount',
      width: 80,
    },
    {
      title: '效果数',
      dataIndex: 'worksCount',
      key: 'worksCount',
      width: 80,
    },
    {
      title: '迁移状态',
      dataIndex: 'migrationStatus',
      key: 'migrationStatus',
      width: 100,
      render: (status: string, record: SourceProject) => {
        if (status === 'completed') {
          return <Tag color="success">已完成</Tag>;
        }
        if (status === 'partial') {
          const parts = ['项目'];
          if (record.hasCollaborations) parts.push('合作');
          if (record.hasEffects) parts.push('效果');
          return (
            <Tag color="warning" title={`已迁移: ${parts.join(', ')}`}>
              部分迁移
            </Tag>
          );
        }
        return <Tag color="default">待迁移</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: SourceProject) => {
        if (record.migrationStatus === 'completed') {
          return <Tag color="success">已完成</Tag>;
        }
        if (record.migrationStatus === 'partial') {
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => handleContinueMigration(record)}
            >
              继续迁移
            </Button>
          );
        }
        return (
          <Button
            type="primary"
            size="small"
            onClick={() => handleSelectProject(record)}
          >
            开始迁移
          </Button>
        );
      },
    },
  ];

  // 渲染项目选择步骤
  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-content">选择要迁移的项目</h3>
          <p className="text-sm text-content-secondary">
            从 ByteProject (kol_data) 选择项目迁移到 AgentWorks
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadProjects}>
          刷新列表
        </Button>
      </div>

      <Table
        columns={projectColumns}
        dataSource={projects}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </div>
  );

  // 渲染达人校验步骤
  const renderValidateStep = () => {
    const validation = state.talentValidation;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-content">达人校验</h3>
            <p className="text-sm text-content-secondary">
              项目: {state.selectedProject?.name}
            </p>
          </div>
          <Button onClick={handleBackToSelect}>返回选择</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spin tip="正在校验达人..." />
          </div>
        ) : validation ? (
          <div className="space-y-4">
            {/* 校验结果统计 */}
            <ProCard>
              <div className="grid grid-cols-4 gap-6">
                <div className="flex flex-col">
                  <span className="text-sm text-content-secondary mb-1">
                    涉及达人
                  </span>
                  <span className="text-lg font-medium text-content">
                    {validation.totalTalents}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-content-secondary mb-1">
                    已匹配
                  </span>
                  <span className="text-lg font-medium text-success-600">
                    {validation.matched.length}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-content-secondary mb-1">
                    未匹配
                  </span>
                  <span className="text-lg font-medium text-error-600">
                    {validation.unmatched.length}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-content-secondary mb-1">
                    可继续
                  </span>
                  {validation.canProceed ? (
                    <Tag color="success">是</Tag>
                  ) : (
                    <Tag color="error">否</Tag>
                  )}
                </div>
              </div>
            </ProCard>

            {/* 未匹配达人列表 */}
            {validation.unmatched.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="有未匹配的达人"
                description={
                  <div className="mt-2">
                    <p className="mb-2">
                      以下达人在 AgentWorks 中未找到，请先创建达人后再继续迁移：
                    </p>
                    <ul className="list-disc list-inside">
                      {validation.unmatched.map(t => (
                        <li key={t.talentId}>
                          {t.nickname} (星图ID: {t.xingtuId || '无'}) -{' '}
                          {t.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              />
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end">
              <Button
                type="primary"
                disabled={!validation.canProceed}
                onClick={() =>
                  setState(prev => ({ ...prev, step: 'migrate_project' }))
                }
              >
                继续迁移
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // 渲染分模块迁移步骤
  const renderMigrateStep = () => {
    const getModuleStatus = (
      module: 'project' | 'collaborations' | 'effects' | 'dailyStats'
    ) => {
      switch (module) {
        case 'project':
          return state.projectMigration
            ? 'completed'
            : state.step === 'migrate_project'
              ? 'current'
              : 'pending';
        case 'collaborations':
          return state.collaborationMigration
            ? 'completed'
            : state.step === 'migrate_collaborations'
              ? 'current'
              : 'pending';
        case 'effects':
          return state.effectMigration ? 'completed' : 'pending';
        case 'dailyStats':
          return state.dailyStatsMigration ? 'completed' : 'pending';
      }
    };

    // 是否可以执行数据迁移（效果/日报）
    const canMigrateData = state.step === 'migrate_effects';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-content">分模块迁移</h3>
            <p className="text-sm text-content-secondary">
              项目: {state.selectedProject?.name}
            </p>
          </div>
          {state.projectMigration && (
            <Popconfirm
              title="确定要回滚迁移吗？"
              description="这将删除已迁移到 AgentWorks 的所有数据"
              onConfirm={handleRollback}
            >
              <Button danger icon={<RollbackOutlined />}>
                回滚迁移
              </Button>
            </Popconfirm>
          )}
        </div>

        {/* Step 3a & 3b: 项目和合作记录 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 项目基础信息 */}
          <ProCard
            title="3a. 项目基础信息"
            extra={
              getModuleStatus('project') === 'completed' ? (
                <CheckCircleOutlined className="text-success-500" />
              ) : null
            }
          >
            <div className="space-y-3">
              <div className="text-sm text-content-secondary">
                迁移项目名称、状态、预算、折扣等基础信息
              </div>
              {state.projectMigration ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    新项目ID:{' '}
                    <code className="px-1 py-0.5 bg-surface-sunken rounded">
                      {state.projectMigration.newProjectId}
                    </code>
                  </div>
                  {state.projectMigration.discountComparison
                    ?.hasDiscrepancy && (
                    <Alert
                      type="warning"
                      message="折扣差异"
                      description={`源: ${state.projectMigration.discountComparison.sourceDiscount} vs 配置: ${state.projectMigration.discountComparison.customerDiscount}`}
                    />
                  )}
                </div>
              ) : (
                <Button
                  type="primary"
                  block
                  loading={loading && state.step === 'migrate_project'}
                  disabled={state.step !== 'migrate_project'}
                  onClick={handleMigrateProject}
                >
                  迁移项目信息
                </Button>
              )}
            </div>
          </ProCard>

          {/* 合作记录 */}
          <ProCard
            title="3b. 合作记录"
            extra={
              getModuleStatus('collaborations') === 'completed' ? (
                <CheckCircleOutlined className="text-success-500" />
              ) : null
            }
          >
            <div className="space-y-3">
              <div className="text-sm text-content-secondary">
                迁移达人合作记录、金额、状态等信息
              </div>
              {state.collaborationMigration ? (
                <div className="text-sm">
                  已迁移{' '}
                  <span className="font-medium text-success-600">
                    {state.collaborationMigration.count}
                  </span>{' '}
                  条合作记录
                </div>
              ) : (
                <Button
                  type="primary"
                  block
                  loading={loading && state.step === 'migrate_collaborations'}
                  disabled={state.step !== 'migrate_collaborations'}
                  onClick={handleMigrateCollaborations}
                >
                  迁移合作记录
                </Button>
              )}
            </div>
          </ProCard>
        </div>

        {/* Step 3c: 数据迁移（效果数据 | 日报数据 并行） */}
        <ProCard title="3c. 数据迁移" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 效果数据 */}
            <div className="border border-stroke rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-content">效果数据</h4>
                {getModuleStatus('effects') === 'completed' && (
                  <CheckCircleOutlined className="text-success-500" />
                )}
              </div>
              <div className="text-sm text-content-secondary mb-3">
                T7/T21/T30 播放量数据
              </div>
              {state.effectMigration ? (
                <div className="text-sm">
                  处理 {state.effectMigration.totalWorks} 条，更新{' '}
                  <span className="font-medium text-success-600">
                    {state.effectMigration.updatedCount}
                  </span>{' '}
                  条
                </div>
              ) : (
                <Button
                  type="primary"
                  block
                  loading={loading && !state.effectMigration}
                  disabled={!canMigrateData}
                  onClick={handleMigrateEffects}
                >
                  迁移效果数据
                </Button>
              )}
            </div>

            {/* 日报数据 */}
            <div className="border border-stroke rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-content">日报数据</h4>
                {getModuleStatus('dailyStats') === 'completed' && (
                  <CheckCircleOutlined className="text-success-500" />
                )}
              </div>
              <div className="text-sm text-content-secondary mb-3">
                每日播放量统计数据
              </div>
              {state.dailyStatsMigration ? (
                <div className="text-sm">
                  迁移{' '}
                  <span className="font-medium text-success-600">
                    {state.dailyStatsMigration.migratedCount}
                  </span>{' '}
                  条，追踪状态:{' '}
                  <Tag
                    color={
                      state.dailyStatsMigration.trackingStatus === 'active'
                        ? 'processing'
                        : state.dailyStatsMigration.trackingStatus ===
                            'archived'
                          ? 'default'
                          : 'error'
                    }
                  >
                    {state.dailyStatsMigration.trackingStatus === 'active'
                      ? '追踪中'
                      : state.dailyStatsMigration.trackingStatus === 'archived'
                        ? '已归档'
                        : '未启用'}
                  </Tag>
                </div>
              ) : (
                <Button
                  type="primary"
                  block
                  loading={loading && !state.dailyStatsMigration}
                  disabled={!canMigrateData}
                  onClick={handleMigrateDailyStats}
                >
                  迁移日报数据
                </Button>
              )}
            </div>
          </div>

          {/* 追踪状态选择器 */}
          {canMigrateData && !state.dailyStatsMigration && (
            <div className="mt-4 p-4 border border-stroke rounded-lg bg-surface-sunken">
              <div className="text-sm text-content-secondary mb-2">
                迁移后的追踪状态:
              </div>
              <Radio.Group
                value={state.trackingStatusChoice}
                onChange={handleTrackingStatusChange}
              >
                <Radio value="active">追踪中</Radio>
                <Radio value="archived">
                  已归档{' '}
                  <span className="text-xs text-content-muted">
                    (推荐历史项目)
                  </span>
                </Radio>
                <Radio value="disabled">不启用追踪</Radio>
              </Radio.Group>
            </div>
          )}
        </ProCard>
      </div>
    );
  };

  // 渲染验收确认步骤
  const renderValidationStep = () => {
    const validation = state.migrationValidation;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-content">验收确认</h3>
            <p className="text-sm text-content-secondary">
              确认迁移数据的完整性和准确性
            </p>
          </div>
        </div>

        {validation ? (
          <div className="space-y-4">
            {validation.allMatch ? (
              <Result
                status="success"
                title="迁移成功"
                subTitle="所有数据已成功迁移到 AgentWorks"
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message="数据存在差异"
                description="请检查以下对比结果，确认是否需要处理"
              />
            )}

            <ProCard title="数据对比">
              <Descriptions column={2}>
                <Descriptions.Item label="合作记录 (源)">
                  {validation.comparison.collaborations.source}
                </Descriptions.Item>
                <Descriptions.Item label="合作记录 (目标)">
                  {validation.comparison.collaborations.target}
                  {validation.comparison.collaborations.match ? (
                    <CheckCircleOutlined className="ml-2 text-success-500" />
                  ) : (
                    <ExclamationCircleOutlined className="ml-2 text-warning-500" />
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="总金额 (源)">
                  {(
                    validation.comparison.totalAmount.source / 100
                  ).toLocaleString()}{' '}
                  元
                </Descriptions.Item>
                <Descriptions.Item label="总金额 (目标)">
                  {(
                    validation.comparison.totalAmount.target / 100
                  ).toLocaleString()}{' '}
                  元
                  {validation.comparison.totalAmount.match ? (
                    <CheckCircleOutlined className="ml-2 text-success-500" />
                  ) : (
                    <ExclamationCircleOutlined className="ml-2 text-warning-500" />
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="效果数据 (源)">
                  {validation.comparison.effects.sourceWorks}
                </Descriptions.Item>
                <Descriptions.Item label="效果数据 (目标)">
                  {validation.comparison.effects.targetWithEffects}
                </Descriptions.Item>
                {validation.comparison.dailyStats && (
                  <>
                    <Descriptions.Item label="日报数据 (源)">
                      {validation.comparison.dailyStats.sourceStatsEntries} 条
                      <span className="text-content-muted ml-1">
                        ({validation.comparison.dailyStats.sourceWorksWithStats}{' '}
                        个合作)
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="日报数据 (目标)">
                      {validation.comparison.dailyStats.targetStatsEntries} 条
                      <span className="text-content-muted ml-1">
                        ({validation.comparison.dailyStats.targetWithStats}{' '}
                        个合作)
                      </span>
                      {validation.comparison.dailyStats.match ? (
                        <CheckCircleOutlined className="ml-2 text-success-500" />
                      ) : (
                        <ExclamationCircleOutlined className="ml-2 text-warning-500" />
                      )}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </ProCard>

            <div className="flex justify-end gap-2">
              <Popconfirm
                title="确定要回滚迁移吗？"
                description="这将删除已迁移到 AgentWorks 的所有数据"
                onConfirm={handleRollback}
              >
                <Button danger icon={<RollbackOutlined />}>
                  回滚迁移
                </Button>
              </Popconfirm>
              <Button type="primary" onClick={handleComplete}>
                确认完成
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Spin tip="正在验证迁移结果..." />
          </div>
        )}
      </div>
    );
  };

  // 根据步骤渲染内容
  const renderStepContent = () => {
    switch (state.step) {
      case 'select':
        return renderSelectStep();
      case 'validate':
        return renderValidateStep();
      case 'migrate_project':
      case 'migrate_collaborations':
      case 'migrate_effects':
        return renderMigrateStep();
      case 'validation':
      case 'completed':
        return renderValidationStep();
      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">数据迁移工作台</h1>
          <p className="mt-1 text-sm text-content-secondary">
            将 ByteProject (kol_data) 项目数据迁移到 AgentWorks (agentworks_db)
          </p>
        </div>

        {/* 进度步骤条 */}
        <ProCard>
          <Steps
            current={getCurrentStepIndex()}
            items={STEP_CONFIG.map(step => ({
              title: step.title,
              icon: step.icon,
            }))}
          />
        </ProCard>

        {/* 步骤内容 */}
        <ProCard>{renderStepContent()}</ProCard>
      </div>
    </PageTransition>
  );
}
