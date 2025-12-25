/**
 * 日报首页 - 项目追踪管理
 *
 * 核心功能：
 * - 项目列表展示（ProTable 形式）
 * - 追踪配置管理（弹窗编辑）
 * - 筛选功能（项目名称、日报版本、追踪状态、CPM状态、待录入）
 * - 分组视图：将多个项目合并为一份日报
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable, ProCard } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Button,
  Tag,
  Space,
  App,
  Tooltip,
  Progress,
  Select,
  Switch,
  Radio,
  Spin,
  Table,
  Empty,
  Segmented,
  Card,
  Popconfirm,
} from 'antd';
import type { RadioChangeEvent } from 'antd';
import {
  ReloadOutlined,
  SettingOutlined,
  BarChartOutlined,
  PlusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  SaveOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../../components/PageTransition';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { TrackingConfigModal } from './TrackingConfigModal';
import { GroupCreateModal } from './GroupCreateModal';
import { projectApi } from '../../../services/projectApi';
import { useDailyReportGroups } from '../../../hooks/useDailyReportGroups';
import type {
  DailyReportGroup,
  DailyReportGroupFormData,
} from '../../../types/dailyReportGroup';
import type {
  ProjectListItem,
  Project,
  Collaboration,
} from '../../../types/project';
import type {
  TrackingConfig,
  TrackingStatus,
  TrackingVersion,
  SchedulerConfig,
  EligibleProject,
  ScheduledExecution,
  ScheduleFrequency,
} from '../../../types/dailyReport';
import {
  generateTimeOptions,
  calculateNextExecutionTime,
  formatRelativeTime,
  FREQUENCY_LABELS,
  EXECUTION_STATUS_LABELS,
  EXECUTION_STATUS_COLORS,
  TRIGGER_TYPE_LABELS,
} from '../../../types/dailyReport';
import * as dailyReportApi from '../../../api/dailyReport';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import {
  calculateCollaborationFinance,
  createFinanceContextFromProject,
  FINANCE_VALID_STATUSES,
} from '../../../utils/financeCalculator';
import {
  TRACKING_STATUS_LABELS,
  TRACKING_STATUS_COLORS,
  TRACKING_VERSION_LABELS,
  TRACKING_VERSION_COLORS,
  formatCPM,
} from '../../../types/dailyReport';
import type { ProjectTrackingStats } from '../../../types/dailyReport';

// 扩展项目类型，包含追踪统计
interface ProjectWithTracking extends ProjectListItem {
  trackingConfig?: TrackingConfig;
  trackingStats?: ProjectTrackingStats;
}

// 追踪状态筛选选项
const TRACKING_STATUS_VALUE_ENUM = {
  active: { text: '追踪中', status: 'Processing' },
  archived: { text: '已归档', status: 'Default' },
  disabled: { text: '未启用', status: 'Error' },
};

// 日报版本筛选选项
const TRACKING_VERSION_VALUE_ENUM = {
  standard: { text: '常规业务' },
  joint: { text: '联投业务' },
};

// CPM 状态筛选选项
const CPM_STATUS_VALUE_ENUM = {
  normal: { text: '正常' },
  abnormal: { text: '异常' },
};

// 进度筛选选项（备用，暂未启用）
// const PROGRESS_VALUE_ENUM = {
//   has: { text: '未完成' },
//   none: { text: '已完成' },
// };

// 视图类型
type ViewType = 'project' | 'group';

export function DailyReportHome() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 平台配置（用于财务计算）
  const { configs: platformConfigs, loading: configLoading } =
    usePlatformConfig();

  // 视图切换状态
  const [viewType, setViewType] = useState<ViewType>('project');

  // 分组管理 Hook
  const {
    groups,
    loading: groupsLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupByProjectId,
  } = useDailyReportGroups();

  // 分组弹窗状态
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DailyReportGroup | null>(
    null
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithTracking[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectWithTracking[]>([]); // 所有项目（用于分组选择）
  const [allFilteredProjects, setAllFilteredProjects] = useState<
    ProjectWithTracking[]
  >([]); // 全量筛选后的数据，用于统计
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [nameFilter, setNameFilter] = useState('');
  const [trackingStatusFilter, setTrackingStatusFilter] = useState<
    TrackingStatus | ''
  >('');
  const [versionFilter, setVersionFilter] = useState<TrackingVersion | ''>('');
  const [cpmStatusFilter, setCpmStatusFilter] = useState<
    'normal' | 'abnormal' | ''
  >('');
  const [pendingFilter, setPendingFilter] = useState<'has' | 'none' | ''>('');

  // 弹窗状态
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithTracking | null>(null);

  // 调度配置状态
  const [schedulerConfig, setSchedulerConfig] =
    useState<SchedulerConfig | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [eligibleProjects, setEligibleProjects] = useState<EligibleProject[]>(
    []
  );
  const [executions, setExecutions] = useState<ScheduledExecution[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  // 调度配置编辑状态（本地修改，保存时提交）
  const [editedConfig, setEditedConfig] = useState<Partial<SchedulerConfig>>(
    {}
  );
  const [configDirty, setConfigDirty] = useState(false);

  /**
   * 计算项目的 trackingStats（在前端计算）
   * 使用财务计算模块的逻辑来计算金额
   */
  const calculateTrackingStats = useCallback(
    (project: Project): ProjectTrackingStats => {
      const collaborations = (project.collaborations || []) as Collaboration[];

      // 筛选已定档+已发布的合作记录（达人进度分母）
      const scheduledCollabs = collaborations.filter(c =>
        FINANCE_VALID_STATUSES.includes(c.status)
      );

      // 找出最新数据日期
      let latestDataDate: string | null = null;
      collaborations.forEach(c => {
        (c.dailyStats || []).forEach(stat => {
          if (!latestDataDate || stat.date > latestDataDate) {
            latestDataDate = stat.date;
          }
        });
      });

      // 筛选在 latestDataDate 有数据的合作（达人进度分子）
      const enteredCollabs = latestDataDate
        ? scheduledCollabs.filter(c =>
            (c.dailyStats || []).some(s => s.date === latestDataDate)
          )
        : [];

      // 计算金额：使用财务计算模块
      let totalAmount = 0;
      let enteredAmount = 0;
      let totalViews = 0;

      // 创建财务计算上下文（如果平台配置可用）
      const financeContext =
        platformConfigs.length > 0
          ? createFinanceContextFromProject(project, platformConfigs)
          : null;

      // 计算总金额（所有已定档+已发布的合作）
      scheduledCollabs.forEach(collab => {
        if (financeContext) {
          const finance =
            collab.finance ||
            calculateCollaborationFinance(collab, financeContext);
          totalAmount += finance.revenue;
        } else if (collab.finance?.revenue) {
          // 如果有预计算的 finance，直接使用
          totalAmount += collab.finance.revenue;
        }
      });

      // 计算已录入金额和播放量（latestDataDate 有数据的合作）
      enteredCollabs.forEach(collab => {
        if (financeContext) {
          const finance =
            collab.finance ||
            calculateCollaborationFinance(collab, financeContext);
          enteredAmount += finance.revenue;
        } else if (collab.finance?.revenue) {
          enteredAmount += collab.finance.revenue;
        }

        // 获取 latestDataDate 的播放量
        const stat = (collab.dailyStats || []).find(
          s => s.date === latestDataDate
        );
        if (stat) {
          totalViews += stat.totalViews || 0;
        }
      });

      // 计算平均 CPM
      const avgCPM =
        totalViews > 0
          ? Math.round((enteredAmount / 100 / totalViews) * 1000 * 100) / 100
          : 0;

      return {
        collaborationCount: scheduledCollabs.length,
        dataEnteredCount: enteredCollabs.length,
        totalAmount,
        enteredAmount,
        totalViews,
        avgCPM,
        latestDataDate,
      };
    },
    [platformConfigs]
  );

  // 加载项目列表（使用完整视图获取 collaborations，前端计算 trackingStats）
  const loadProjects = useCallback(async () => {
    // 等待平台配置加载完成
    if (configLoading) {
      return;
    }

    try {
      setLoading(true);
      // 使用完整视图 API 获取所有项目数据（前端筛选需要全量数据）
      const response = await projectApi.getProjects({
        page: 1,
        pageSize: 1000, // 获取全量数据用于前端筛选
        keyword: nameFilter || undefined,
      });

      if (response.success && response.data) {
        // 前端计算 trackingStats
        const items = response.data.items || [];
        let filtered = (items as Project[])
          .filter(project => project != null)
          .map(project => ({
            ...project,
            trackingStats: calculateTrackingStats(project),
          })) as ProjectWithTracking[];

        // 前端筛选追踪状态和版本
        if (trackingStatusFilter) {
          filtered = filtered.filter(
            p =>
              (p.trackingConfig?.status || 'disabled') === trackingStatusFilter
          );
        }

        if (versionFilter) {
          filtered = filtered.filter(
            p => p.trackingConfig?.version === versionFilter
          );
        }

        // CPM 状态筛选
        if (cpmStatusFilter) {
          filtered = filtered.filter(p => {
            const avgCPM = p.trackingStats?.avgCPM || 0;
            const benchmarkCPM = p.trackingConfig?.benchmarkCPM || 30;
            if (cpmStatusFilter === 'abnormal') {
              return avgCPM > benchmarkCPM;
            }
            return avgCPM <= benchmarkCPM;
          });
        }

        // 进度筛选（是否全部录入）
        if (pendingFilter) {
          filtered = filtered.filter(p => {
            const entered = p.trackingStats?.dataEnteredCount || 0;
            const total = p.trackingStats?.collaborationCount || 0;
            const isComplete = total > 0 && entered === total;
            if (pendingFilter === 'has') {
              return !isComplete; // 有未录入的
            }
            return isComplete; // 全部录入完成
          });
        }

        // 保存全量筛选后的数据（用于统计和分页）
        setAllFilteredProjects(filtered);
        setTotal(filtered.length);

        // 保存所有项目（用于分组选择）
        setAllProjects(
          (items as Project[])
            .filter(project => project != null)
            .map(project => ({
              ...project,
              trackingStats: calculateTrackingStats(project),
            })) as ProjectWithTracking[]
        );

        // 筛选条件变化时重置到第一页
        setCurrentPage(1);
      }
    } catch (error) {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [
    configLoading,
    platformConfigs,
    nameFilter,
    trackingStatusFilter,
    versionFilter,
    cpmStatusFilter,
    pendingFilter,
    calculateTrackingStats,
    message,
  ]);

  // 分组项目选项（用于分组弹窗）- 只显示追踪中的项目
  const groupProjectOptions = useMemo(() => {
    return allProjects
      .filter(p => p.trackingConfig?.status === 'active')
      .map(p => {
        const existingGroup = getGroupByProjectId(p.id);
        const isOccupied =
          !!existingGroup && existingGroup.id !== editingGroup?.id;

        return {
          id: p.id,
          name: p.name,
          isOccupied,
          occupiedGroupName: isOccupied
            ? existingGroup?.name || '未命名分组'
            : undefined,
        };
      });
  }, [allProjects, getGroupByProjectId, editingGroup]);

  // 处理分组保存
  const handleGroupSave = useCallback(
    (
      formData: DailyReportGroupFormData
    ): { success: boolean; error?: string } => {
      if (editingGroup) {
        const result = updateGroup(editingGroup.id, formData);
        if (result.success) {
          message.success('分组已更新');
        }
        return result;
      } else {
        const result = createGroup(formData);
        if (result.success) {
          message.success('分组创建成功');
        }
        return result;
      }
    },
    [editingGroup, createGroup, updateGroup, message]
  );

  // 处理分组删除
  const handleGroupDelete = useCallback(
    (groupId: string) => {
      deleteGroup(groupId);
      message.success('分组已删除');
    },
    [deleteGroup, message]
  );

  // 跳转到分组日报
  const handleViewGroupReport = (groupId: string) => {
    navigate(`/projects/daily-report/group/${groupId}`);
  };

  // 打开创建分组弹窗
  const handleOpenGroupModal = () => {
    setEditingGroup(null);
    setGroupModalOpen(true);
  };

  // 打开编辑分组弹窗
  const handleEditGroup = (group: DailyReportGroup) => {
    setEditingGroup(group);
    setGroupModalOpen(true);
  };

  // 分页切片（仅在翻页时更新，不触发 API 请求）
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = allFilteredProjects.slice(
      startIndex,
      startIndex + pageSize
    );
    setProjects(paginatedData);
  }, [currentPage, pageSize, allFilteredProjects]);

  // 加载调度配置和可选项目
  const loadSchedulerData = useCallback(async () => {
    setSchedulerLoading(true);
    try {
      const [configRes, projectsRes] = await Promise.all([
        dailyReportApi.getSchedulerConfig().catch(() => null),
        dailyReportApi.getEligibleProjects().catch(() => []),
      ]);

      // 如果API未部署，使用默认配置
      const defaultConfig: SchedulerConfig = {
        _id: 'global',
        enabled: false,
        time: '10:00',
        frequency: 'daily',
        selectedProjectIds: [],
      };

      const config = configRes || defaultConfig;
      setSchedulerConfig(config);
      setEligibleProjects(projectsRes || []);

      // 初始化编辑状态
      setEditedConfig({
        enabled: config.enabled,
        time: config.time,
        frequency: config.frequency,
        selectedProjectIds: config.selectedProjectIds,
      });
      setConfigDirty(false);
    } catch (error) {
      // 静默失败，使用默认配置
      console.error('加载调度配置失败:', error);
      setEditedConfig({
        enabled: false,
        time: '10:00',
        frequency: 'daily',
        selectedProjectIds: [],
      });
    } finally {
      setSchedulerLoading(false);
    }
  }, []);

  // 加载执行记录
  const loadExecutions = useCallback(async () => {
    setExecutionsLoading(true);
    try {
      const data = await dailyReportApi.getExecutions(undefined, 10);
      setExecutions(data);
    } catch (error) {
      // 静默失败，不阻塞页面
      console.error('加载执行记录失败:', error);
    } finally {
      setExecutionsLoading(false);
    }
  }, []);

  // 保存调度配置
  const handleSaveSchedulerConfig = async () => {
    if (!configDirty) return;
    setSchedulerSaving(true);
    try {
      const updated = await dailyReportApi.updateSchedulerConfig(editedConfig);
      setSchedulerConfig(updated);
      setConfigDirty(false);
      message.success('调度配置已保存');
    } catch (error) {
      message.error('保存调度配置失败');
    } finally {
      setSchedulerSaving(false);
    }
  };

  // 更新编辑状态
  const updateEditedConfig = (updates: Partial<SchedulerConfig>) => {
    setEditedConfig(prev => ({ ...prev, ...updates }));
    setConfigDirty(true);
  };

  // 计算下次执行时间
  const nextExecutionTime = useMemo(() => {
    if (!editedConfig.enabled || !editedConfig.selectedProjectIds?.length) {
      return null;
    }
    const tempConfig: SchedulerConfig = {
      _id: 'global',
      enabled: editedConfig.enabled ?? false,
      time: editedConfig.time ?? '10:00',
      frequency: editedConfig.frequency ?? 'daily',
      selectedProjectIds: editedConfig.selectedProjectIds ?? [],
    };
    return calculateNextExecutionTime(tempConfig);
  }, [editedConfig]);

  // 初始加载
  useEffect(() => {
    loadProjects();
    loadSchedulerData();
    loadExecutions();
  }, [loadProjects, loadSchedulerData, loadExecutions]);

  // 打开配置弹窗
  const handleOpenConfig = (project: ProjectWithTracking) => {
    setSelectedProject(project);
    setConfigModalOpen(true);
  };

  // 配置保存成功
  const handleConfigSave = () => {
    setConfigModalOpen(false);
    setSelectedProject(null);
    loadProjects();
    message.success('追踪配置已更新');
  };

  // 跳转到项目日报
  const handleViewReport = (projectId: string) => {
    navigate(`/projects/${projectId}/daily-report`);
  };

  // 快速启用追踪
  const handleQuickEnable = (project: ProjectWithTracking) => {
    setSelectedProject(project);
    setConfigModalOpen(true);
  };

  // 统计数据（基于全量筛选后的数据，而非当前页）
  const stats = useMemo(() => {
    const activeCount = allFilteredProjects.filter(
      p => p.trackingConfig?.status === 'active'
    ).length;
    const archivedCount = allFilteredProjects.filter(
      p => p.trackingConfig?.status === 'archived'
    ).length;
    const disabledCount = allFilteredProjects.filter(
      p => !p.trackingConfig || p.trackingConfig.status === 'disabled'
    ).length;

    return {
      activeCount,
      archivedCount,
      disabledCount,
      total: allFilteredProjects.length,
    };
  }, [allFilteredProjects]);

  // 表格列定义
  const columns: ProColumns<ProjectWithTracking>[] = [
    {
      title: '项目名称',
      dataIndex: 'name',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      valueType: 'text',
      fieldProps: {
        placeholder: '搜索项目名称',
      },
      render: (_, record) => (
        <a
          className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
          onClick={() => handleViewReport(record.id)}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: '日报版本',
      dataIndex: ['trackingConfig', 'version'],
      width: 90,
      valueType: 'select',
      valueEnum: TRACKING_VERSION_VALUE_ENUM,
      render: (_, record) => {
        const version = record.trackingConfig?.version;
        if (!version || record.trackingConfig?.status === 'disabled') {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        return (
          <Tag color={TRACKING_VERSION_COLORS[version]}>
            {TRACKING_VERSION_LABELS[version]}
          </Tag>
        );
      },
    },
    {
      title: '追踪状态',
      dataIndex: ['trackingConfig', 'status'],
      width: 85,
      valueType: 'select',
      valueEnum: TRACKING_STATUS_VALUE_ENUM,
      render: (_, record) => {
        const status = record.trackingConfig?.status || 'disabled';
        return (
          <Tag color={TRACKING_STATUS_COLORS[status]}>
            {TRACKING_STATUS_LABELS[status]}
          </Tag>
        );
      },
    },
    {
      title: '达人',
      dataIndex: ['trackingStats', 'dataEnteredCount'],
      width: 100,
      search: false,
      render: (_, record) => {
        if (
          !record.trackingConfig ||
          record.trackingConfig.status === 'disabled'
        ) {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        const entered = record.trackingStats?.dataEnteredCount || 0;
        const total = record.trackingStats?.collaborationCount || 0;
        const percent = total > 0 ? Math.round((entered / total) * 100) : 0;
        return (
          <div className="flex flex-col gap-1">
            <span className="tabular-nums text-sm font-medium">
              {entered}/{total}
            </span>
            <Progress percent={percent} size="small" showInfo={false} />
          </div>
        );
      },
    },
    {
      title: '总播放量',
      dataIndex: ['trackingStats', 'totalViews'],
      width: 110,
      align: 'right',
      search: false,
      render: (_, record) => {
        if (
          !record.trackingConfig ||
          record.trackingConfig.status === 'disabled'
        ) {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        const views = record.trackingStats?.totalViews || 0;
        // 显示完整数值，用逗号分隔
        return <span className="tabular-nums">{views.toLocaleString()}</span>;
      },
    },
    {
      title: '平均CPM',
      dataIndex: ['trackingStats', 'avgCPM'],
      width: 90,
      align: 'right',
      valueType: 'select',
      valueEnum: CPM_STATUS_VALUE_ENUM,
      render: (_, record) => {
        if (
          !record.trackingConfig ||
          record.trackingConfig.status === 'disabled'
        ) {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        const avgCPM = record.trackingStats?.avgCPM || 0;
        const benchmarkCPM = record.trackingConfig?.benchmarkCPM || 30;
        const isAbnormal = avgCPM > benchmarkCPM;

        return (
          <Space size={4}>
            <span className="tabular-nums">{formatCPM(avgCPM)}</span>
            {isAbnormal ? (
              <WarningOutlined className="text-[var(--aw-warning-500)]" />
            ) : avgCPM > 0 ? (
              <CheckCircleOutlined className="text-[var(--aw-success-500)]" />
            ) : null}
          </Space>
        );
      },
    },
    {
      title: '金额',
      dataIndex: ['trackingStats', 'enteredAmount'],
      width: 150,
      search: false,
      render: (_, record) => {
        if (
          !record.trackingConfig ||
          record.trackingConfig.status === 'disabled'
        ) {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        const entered = record.trackingStats?.enteredAmount || 0;
        const total = record.trackingStats?.totalAmount || 0;
        const percent = total > 0 ? Math.round((entered / total) * 100) : 0;
        // 格式化金额（分 → 元，超过1万显示"万"）
        const formatAmount = (amountInCents: number) => {
          const yuan = amountInCents / 100; // 分转元
          if (yuan >= 10000) {
            return `¥${(yuan / 10000).toFixed(1)}万`;
          }
          return `¥${yuan.toLocaleString()}`;
        };
        return (
          <div className="flex flex-col gap-1">
            <span className="tabular-nums text-sm font-medium">
              {formatAmount(entered)} / {formatAmount(total)}
            </span>
            <Progress percent={percent} size="small" showInfo={false} />
          </div>
        );
      },
    },
    {
      title: '基准CPM',
      dataIndex: ['trackingConfig', 'benchmarkCPM'],
      width: 80,
      align: 'right',
      search: false,
      render: (_, record) => {
        if (
          !record.trackingConfig ||
          record.trackingConfig.status === 'disabled'
        ) {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        const cpm = record.trackingConfig?.benchmarkCPM || 30;
        return <span className="tabular-nums">¥{cpm}</span>;
      },
    },
    {
      title: '数据日期',
      dataIndex: ['trackingStats', 'latestDataDate'],
      width: 80,
      align: 'center',
      search: false,
      render: (_, record) => {
        if (
          !record.trackingConfig ||
          record.trackingConfig.status === 'disabled'
        ) {
          return <span className="text-[var(--aw-gray-400)]">-</span>;
        }
        const date = record.trackingStats?.latestDataDate;
        if (!date) {
          return <span className="text-[var(--aw-gray-400)]">暂无数据</span>;
        }
        // 格式化日期：2025-12-25 -> 12-25
        const shortDate = date.slice(5);
        return <span className="tabular-nums">{shortDate}</span>;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => {
        const isDisabled =
          !record.trackingConfig || record.trackingConfig.status === 'disabled';

        if (isDisabled) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleQuickEnable(record)}
            >
              启用
            </Button>
          );
        }

        return (
          <Space size={4}>
            <Tooltip title="追踪配置">
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleOpenConfig(record)}
              />
            </Tooltip>
            <Tooltip title="查看日报">
              <Button
                type="text"
                size="small"
                icon={<BarChartOutlined />}
                onClick={() => handleViewReport(record.id)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  // 获取分组对应的项目名称
  const getGroupProjectNames = useCallback(
    (group: DailyReportGroup): string[] => {
      return group.projectIds
        .map(id => allProjects.find(p => p.id === id)?.name || id)
        .slice(0, 3); // 最多显示3个
    },
    [allProjects]
  );

  // 获取主项目名称
  const getPrimaryProjectName = useCallback(
    (group: DailyReportGroup): string => {
      return (
        allProjects.find(p => p.id === group.primaryProjectId)?.name ||
        '未知项目'
      );
    },
    [allProjects]
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">项目日报</h1>
          <p className="mt-2 text-sm text-content-secondary">
            管理项目效果追踪配置，设置自动抓取调度
          </p>
        </div>

        {/* 视图切换栏 */}
        <div className="flex items-center justify-between py-3 px-4 bg-[var(--color-bg-elevated)] rounded-lg border border-stroke">
          <Segmented
            value={viewType}
            onChange={value => setViewType(value as ViewType)}
            size="large"
            options={[
              {
                label: (
                  <Space size={6}>
                    <UnorderedListOutlined />
                    <span>项目视图</span>
                  </Space>
                ),
                value: 'project',
              },
              {
                label: (
                  <Space size={6}>
                    <AppstoreOutlined />
                    <span>分组视图</span>
                    {groups.length > 0 && (
                      <Tag color="blue" style={{ marginLeft: 4 }}>
                        {groups.length}
                      </Tag>
                    )}
                  </Space>
                ),
                value: 'group',
              },
            ]}
          />
          {viewType === 'group' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenGroupModal}
            >
              创建分组
            </Button>
          )}
        </div>

        {/* 全局调度配置区 - 仅在项目视图显示 */}
        {viewType === 'project' && (
          <ProCard
            title={
              <Space>
                <ClockCircleOutlined />
                <span>自动抓取调度</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={schedulerSaving}
                disabled={!configDirty}
                onClick={handleSaveSchedulerConfig}
              >
                保存配置
              </Button>
            }
            loading={schedulerLoading}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：配置区 */}
              <div className="space-y-4">
                {/* 启用开关 */}
                <div className="flex items-center gap-3">
                  <span className="text-content-secondary w-20">启用调度:</span>
                  <Switch
                    checked={editedConfig.enabled ?? false}
                    onChange={checked =>
                      updateEditedConfig({ enabled: checked })
                    }
                  />
                  {editedConfig.enabled && <Tag color="processing">已启用</Tag>}
                </div>

                {/* 项目选择 */}
                <div className="flex items-start gap-3">
                  <span className="text-content-secondary w-20 pt-1">
                    选择项目:
                  </span>
                  <div className="flex-1">
                    <Select
                      mode="multiple"
                      placeholder="选择要自动抓取的项目"
                      value={editedConfig.selectedProjectIds ?? []}
                      onChange={ids =>
                        updateEditedConfig({ selectedProjectIds: ids })
                      }
                      options={eligibleProjects.map(p => ({
                        label: p.name,
                        value: p.id,
                      }))}
                      className="w-full"
                      maxTagCount={3}
                      maxTagPlaceholder={omitted => `+${omitted.length} 个项目`}
                      disabled={!editedConfig.enabled}
                      filterOption={(input, option) =>
                        (option?.label as string)
                          ?.toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    />
                    <div className="text-xs text-content-muted mt-1">
                      仅显示「追踪中」状态的项目，共 {eligibleProjects.length}{' '}
                      个可选
                    </div>
                  </div>
                </div>

                {/* 执行时间 */}
                <div className="flex items-center gap-3">
                  <span className="text-content-secondary w-20">执行时间:</span>
                  <Select
                    value={editedConfig.time ?? '10:00'}
                    onChange={time => updateEditedConfig({ time })}
                    options={generateTimeOptions()}
                    className="w-32"
                    disabled={!editedConfig.enabled}
                  />
                </div>

                {/* 执行频率 */}
                <div className="flex items-center gap-3">
                  <span className="text-content-secondary w-20">执行频率:</span>
                  <Radio.Group
                    value={editedConfig.frequency ?? 'daily'}
                    onChange={(e: RadioChangeEvent) =>
                      updateEditedConfig({
                        frequency: e.target.value as ScheduleFrequency,
                      })
                    }
                    disabled={!editedConfig.enabled}
                  >
                    <Radio value="daily">{FREQUENCY_LABELS.daily}</Radio>
                    <Radio value="weekdays">
                      {FREQUENCY_LABELS.weekdays}
                      <span className="text-xs text-content-muted ml-1">
                        (周一至周五)
                      </span>
                    </Radio>
                  </Radio.Group>
                </div>

                {/* 下次执行时间预览 */}
                <div className="flex items-center gap-3 pt-2 border-t border-stroke">
                  <span className="text-content-secondary w-20">下次执行:</span>
                  {nextExecutionTime ? (
                    <span className="text-primary-600 font-medium">
                      <CalendarOutlined className="mr-1" />
                      {nextExecutionTime.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <span className="text-content-muted ml-2">
                        ({formatRelativeTime(nextExecutionTime)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-content-muted">
                      {!editedConfig.enabled ? '调度未启用' : '请选择项目'}
                    </span>
                  )}
                </div>

                {/* 上次执行时间 */}
                {schedulerConfig?.lastExecutedAt && (
                  <div className="flex items-center gap-3">
                    <span className="text-content-secondary w-20">
                      上次执行:
                    </span>
                    <span className="text-content-muted">
                      {new Date(schedulerConfig.lastExecutedAt).toLocaleString(
                        'zh-CN'
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* 右侧：执行记录 */}
              <div className="border-l border-stroke pl-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-content">最近执行记录</h4>
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined spin={executionsLoading} />}
                    onClick={loadExecutions}
                  >
                    刷新
                  </Button>
                </div>
                {executionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : executions.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无执行记录"
                  />
                ) : (
                  <Table
                    dataSource={executions}
                    rowKey="_id"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: '时间',
                        dataIndex: 'executedAt',
                        width: 90,
                        render: (val: string) => {
                          const date = new Date(val);
                          return (
                            <span className="tabular-nums text-xs">
                              {date.toLocaleDateString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                              })}{' '}
                              {date.toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          );
                        },
                      },
                      {
                        title: '项目',
                        dataIndex: 'projectName',
                        ellipsis: true,
                        render: (name: string, record: ScheduledExecution) => (
                          <a
                            className="text-primary-600 hover:text-primary-700 cursor-pointer"
                            onClick={() => handleViewReport(record.projectId)}
                          >
                            {name}
                          </a>
                        ),
                      },
                      {
                        title: '触发',
                        dataIndex: 'triggerType',
                        width: 50,
                        render: (type: 'scheduled' | 'manual') => (
                          <Tag
                            color={type === 'scheduled' ? 'blue' : 'default'}
                          >
                            {TRIGGER_TYPE_LABELS[type]}
                          </Tag>
                        ),
                      },
                      {
                        title: '结果',
                        width: 80,
                        render: (_: unknown, record: ScheduledExecution) => (
                          <Space size={4}>
                            <span className="text-success-600 tabular-nums">
                              {record.successCount}
                            </span>
                            <span className="text-content-muted">/</span>
                            <span className="text-error-600 tabular-nums">
                              {record.failedCount}
                            </span>
                          </Space>
                        ),
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        width: 70,
                        render: (status: ScheduledExecution['status']) => (
                          <Tag color={EXECUTION_STATUS_COLORS[status]}>
                            {EXECUTION_STATUS_LABELS[status]}
                          </Tag>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          </ProCard>
        )}

        {/* 分组视图 */}
        {viewType === 'group' && (
          <div className="space-y-4">
            {groupsLoading ? (
              <div className="flex justify-center py-12">
                <Spin tip="加载分组数据..." />
              </div>
            ) : groups.length === 0 ? (
              <Card>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-content-muted">
                      暂无分组，点击「创建分组」将多个项目合并为一份日报
                    </span>
                  }
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenGroupModal}
                  >
                    创建分组
                  </Button>
                </Empty>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => {
                  const projectNames = getGroupProjectNames(group);
                  const primaryName = getPrimaryProjectName(group);
                  const displayName = group.name || primaryName;

                  return (
                    <Card
                      key={group.id}
                      hoverable
                      className="cursor-pointer"
                      onClick={() => handleViewGroupReport(group.id)}
                      actions={[
                        <Tooltip key="edit" title="编辑分组">
                          <EditOutlined
                            onClick={e => {
                              e.stopPropagation();
                              handleEditGroup(group);
                            }}
                          />
                        </Tooltip>,
                        <Popconfirm
                          key="delete"
                          title="确定删除此分组？"
                          description="删除后分组内的项目将恢复为独立项目"
                          onConfirm={e => {
                            e?.stopPropagation();
                            handleGroupDelete(group.id);
                          }}
                          onCancel={e => e?.stopPropagation()}
                          okText="删除"
                          cancelText="取消"
                        >
                          <DeleteOutlined
                            onClick={e => e.stopPropagation()}
                            className="text-error-500 hover:text-error-600"
                          />
                        </Popconfirm>,
                        <Tooltip key="view" title="查看日报">
                          <BarChartOutlined />
                        </Tooltip>,
                      ]}
                    >
                      <Card.Meta
                        title={
                          <div className="flex items-center gap-2">
                            <AppstoreOutlined className="text-primary-500" />
                            <span className="truncate">{displayName}</span>
                          </div>
                        }
                        description={
                          <div className="space-y-2 mt-2">
                            <div className="text-xs text-content-muted">
                              包含 {group.projectIds.length} 个项目
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {projectNames.map((name, idx) => (
                                <Tag
                                  key={idx}
                                  color="default"
                                  className="text-xs"
                                >
                                  {name}
                                </Tag>
                              ))}
                              {group.projectIds.length > 3 && (
                                <Tag color="default" className="text-xs">
                                  +{group.projectIds.length - 3}
                                </Tag>
                              )}
                            </div>
                            <div className="text-xs text-content-muted pt-1 border-t border-stroke">
                              主项目:{' '}
                              <span className="text-content">
                                {primaryName}
                              </span>
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 主内容区 - 项目视图 */}
        {viewType === 'project' && loading && projects.length === 0 ? (
          <TableSkeleton columnCount={10} rowCount={10} />
        ) : viewType === 'project' ? (
          <ProTable<ProjectWithTracking>
            columns={columns}
            actionRef={actionRef}
            cardBordered
            dataSource={projects}
            loading={loading}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: t => `共 ${t} 条`,
              onChange: (page, size) => {
                // 如果每页条数改变，重置到第一页
                if (size !== pageSize) {
                  setCurrentPage(1);
                } else {
                  setCurrentPage(page);
                }
                setPageSize(size);
              },
            }}
            search={{
              labelWidth: 80,
              span: 6,
              defaultCollapsed: false,
            }}
            onSubmit={params => {
              setNameFilter((params.name as string) || '');
              setTrackingStatusFilter(
                ((params.trackingConfig as { status?: TrackingStatus })
                  ?.status as TrackingStatus) || ''
              );
              setVersionFilter(
                ((params.trackingConfig as { version?: TrackingVersion })
                  ?.version as TrackingVersion) || ''
              );
              setCpmStatusFilter(
                ((params.trackingStats as { avgCPM?: string })?.avgCPM as
                  | 'normal'
                  | 'abnormal') || ''
              );
              setPendingFilter(
                ((params.trackingStats as { pendingCount?: string })
                  ?.pendingCount as 'has' | 'none') || ''
              );
              setCurrentPage(1);
            }}
            onReset={() => {
              setNameFilter('');
              setTrackingStatusFilter('');
              setVersionFilter('');
              setCpmStatusFilter('');
              setPendingFilter('');
              setCurrentPage(1);
            }}
            dateFormatter="string"
            headerTitle={
              <Space>
                <Tag color="blue">{stats.activeCount} 追踪中</Tag>
                <Tag>{stats.archivedCount} 已归档</Tag>
                <Tag color="default">{stats.disabledCount} 未启用</Tag>
              </Space>
            }
            toolBarRender={() => []}
            scroll={{ x: 1200 }}
            options={{
              fullScreen: true,
              density: true,
              setting: {
                draggable: true,
                checkable: true,
                listsHeight: 400,
              },
            }}
          />
        ) : null}

        {/* 追踪配置弹窗 */}
        <TrackingConfigModal
          open={configModalOpen}
          projectId={selectedProject?.id || ''}
          projectName={selectedProject?.name}
          initialConfig={selectedProject?.trackingConfig}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedProject(null);
          }}
          onSave={handleConfigSave}
        />

        {/* 分组创建/编辑弹窗 */}
        <GroupCreateModal
          open={groupModalOpen}
          onClose={() => {
            setGroupModalOpen(false);
            setEditingGroup(null);
          }}
          onSave={handleGroupSave}
          editingGroup={editingGroup}
          projects={groupProjectOptions}
        />
      </div>
    </PageTransition>
  );
}

export default DailyReportHome;
