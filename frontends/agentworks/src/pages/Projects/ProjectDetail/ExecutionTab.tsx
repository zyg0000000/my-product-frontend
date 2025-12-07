/**
 * 执行追踪 Tab
 * 展示项目执行进度，包括 KPI 面板和发布列表
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Card,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Progress,
  DatePicker,
  Input,
  App,
  Button,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExportOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  Collaboration,
  CollaborationStatus,
} from '../../../types/project';
import {
  COLLABORATION_STATUS_COLORS,
  COLLABORATION_STATUS_VALUE_ENUM,
  formatMoney,
  isDelayed,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

/**
 * KPI 统计数据
 */
interface ExecutionStats {
  plannedCount: number; // 计划数（有计划发布日期）
  publishedCount: number; // 已发布数
  publishRate: number; // 发布率
  delayedCount: number; // 延期数
  upcomingCount: number; // 近7天待发布
}

interface ExecutionTabProps {
  projectId: string;
  platforms: Platform[];
  onRefresh?: () => void;
}

export function ExecutionTab({
  projectId,
  platforms,
  onRefresh,
}: ExecutionTabProps) {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [stats, setStats] = useState<ExecutionStats>({
    plannedCount: 0,
    publishedCount: 0,
    publishRate: 0,
    delayedCount: 0,
    upcomingCount: 0,
  });

  // 筛选状态
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('');
  const [statusFilter, setStatusFilter] = useState<CollaborationStatus | ''>(
    ''
  );

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Collaboration[]): ExecutionStats => {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const plannedCount = data.filter(c => c.plannedReleaseDate).length;
    const publishedCount = data.filter(c => c.status === '视频已发布').length;
    const publishRate =
      plannedCount > 0 ? Math.round((publishedCount / plannedCount) * 100) : 0;

    const delayedCount = data.filter(c =>
      isDelayed(c.plannedReleaseDate, c.actualReleaseDate, c.status)
    ).length;

    const upcomingCount = data.filter(c => {
      if (c.status === '视频已发布' || !c.plannedReleaseDate) return false;
      const plannedDate = new Date(c.plannedReleaseDate);
      return plannedDate >= now && plannedDate <= in7Days;
    }).length;

    return {
      plannedCount,
      publishedCount,
      publishRate,
      delayedCount,
      upcomingCount,
    };
  };

  /**
   * 加载合作记录
   */
  const loadCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApi.getCollaborations({
        projectId,
        page: 1,
        pageSize: 500, // 加载所有用于统计
        platform: platformFilter || undefined,
        status: statusFilter || undefined,
      });

      if (response.success) {
        // 按计划发布日期排序
        const sorted = response.data.items.sort((a, b) => {
          if (!a.plannedReleaseDate && !b.plannedReleaseDate) return 0;
          if (!a.plannedReleaseDate) return 1;
          if (!b.plannedReleaseDate) return -1;
          return (
            new Date(a.plannedReleaseDate).getTime() -
            new Date(b.plannedReleaseDate).getTime()
          );
        });

        setCollaborations(sorted);
        setStats(calculateStats(sorted));
      } else {
        setCollaborations([]);
        message.error('获取执行数据失败');
      }
    } catch (error) {
      logger.error('Error loading execution data:', error);
      message.error('获取执行数据失败');
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, platformFilter, statusFilter, message]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 快速更新发布日期
   */
  const handleUpdateDate = async (
    id: string,
    field: 'plannedReleaseDate' | 'actualReleaseDate',
    value: string | null
  ) => {
    try {
      const response = await projectApi.updateCollaboration(id, {
        [field]: value,
      });
      if (response.success) {
        message.success('更新成功');
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  /**
   * 快速更新视频链接
   */
  const handleUpdateVideoUrl = async (id: string, value: string) => {
    try {
      const response = await projectApi.updateCollaboration(id, {
        videoUrl: value || undefined,
      });
      if (response.success) {
        message.success('更新成功');
        loadCollaborations();
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  /**
   * 生成平台筛选选项
   */
  const getPlatformOptions = () => {
    const options: Record<string, { text: string }> = {};
    platforms.forEach(p => {
      options[p] = { text: platformNames[p] || p };
    });
    return options;
  };

  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人',
      dataIndex: 'talentName',
      width: 140,
      fixed: 'left',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.talentName || record.talentOneId,
    },
    {
      title: '平台',
      dataIndex: 'talentPlatform',
      width: 100,
      valueType: 'select',
      valueEnum: getPlatformOptions(),
      render: (_, record) => (
        <Tag color={platformColors[record.talentPlatform] || 'default'}>
          {platformNames[record.talentPlatform] || record.talentPlatform}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: COLLABORATION_STATUS_VALUE_ENUM,
      render: (_, record) => (
        <Tag color={COLLABORATION_STATUS_COLORS[record.status]}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 110,
      hideInSearch: true,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '计划发布',
      dataIndex: 'plannedReleaseDate',
      width: 140,
      hideInSearch: true,
      render: (_, record) => {
        const delayed = isDelayed(
          record.plannedReleaseDate,
          record.actualReleaseDate,
          record.status
        );
        return (
          <DatePicker
            value={
              record.plannedReleaseDate
                ? dayjs(record.plannedReleaseDate)
                : null
            }
            onChange={date =>
              handleUpdateDate(
                record.id,
                'plannedReleaseDate',
                date ? date.format('YYYY-MM-DD') : null
              )
            }
            placeholder="选择日期"
            size="small"
            style={{ width: 120 }}
            status={delayed ? 'error' : undefined}
          />
        );
      },
    },
    {
      title: '实际发布',
      dataIndex: 'actualReleaseDate',
      width: 140,
      hideInSearch: true,
      render: (_, record) => (
        <DatePicker
          value={
            record.actualReleaseDate ? dayjs(record.actualReleaseDate) : null
          }
          onChange={date =>
            handleUpdateDate(
              record.id,
              'actualReleaseDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '延期状态',
      dataIndex: 'delayStatus',
      width: 90,
      hideInSearch: true,
      render: (_, record) => {
        const delayed = isDelayed(
          record.plannedReleaseDate,
          record.actualReleaseDate,
          record.status
        );
        if (!record.plannedReleaseDate) return '-';
        return delayed ? (
          <Tag color="error" icon={<WarningOutlined />}>
            已延期
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            正常
          </Tag>
        );
      },
    },
    {
      title: '星图任务ID',
      dataIndex: 'taskId',
      width: 140,
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => record.taskId || '-',
    },
    {
      title: '视频链接',
      dataIndex: 'videoUrl',
      width: 200,
      hideInSearch: true,
      render: (_, record) => (
        <Space size="small">
          <Input
            size="small"
            placeholder="输入视频链接"
            defaultValue={record.videoUrl}
            onBlur={e => {
              if (e.target.value !== record.videoUrl) {
                handleUpdateVideoUrl(record.id, e.target.value);
              }
            }}
            onPressEnter={e => {
              const target = e.target as HTMLInputElement;
              if (target.value !== record.videoUrl) {
                handleUpdateVideoUrl(record.id, target.value);
              }
            }}
            style={{ width: 140 }}
          />
          {record.videoUrl && (
            <Tooltip title="打开视频">
              <a
                href={record.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600"
              >
                <ExportOutlined />
              </a>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI 面板 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="计划数"
              value={stats.plannedCount}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="已发布"
              value={stats.publishedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <span className="text-sm text-gray-400">
                  / {stats.plannedCount}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <div className="mb-2 text-gray-500">发布率</div>
            <Progress
              type="circle"
              percent={stats.publishRate}
              size={80}
              strokeColor={stats.publishRate >= 80 ? '#52c41a' : '#faad14'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="延期"
                  value={stats.delayedCount}
                  prefix={<WarningOutlined />}
                  valueStyle={{
                    color: stats.delayedCount > 0 ? '#ff4d4f' : '#8c8c8c',
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="近7天待发"
                  value={stats.upcomingCount}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 执行列表 */}
      <ProTable<Collaboration>
        columns={columns}
        actionRef={actionRef}
        cardBordered={false}
        dataSource={collaborations}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: t => `共 ${t} 条`,
        }}
        search={{
          labelWidth: 80,
          span: 8,
          defaultCollapsed: true,
        }}
        onSubmit={params => {
          setPlatformFilter((params.talentPlatform as Platform) || '');
          setStatusFilter((params.status as CollaborationStatus) || '');
        }}
        onReset={() => {
          setPlatformFilter('');
          setStatusFilter('');
        }}
        dateFormatter="string"
        headerTitle="执行明细"
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => loadCollaborations()}
          >
            刷新
          </Button>,
        ]}
        scroll={{ x: 1200 }}
        options={{
          reload: false,
          density: false,
          setting: true,
        }}
        size="middle"
      />
    </div>
  );
}

export default ExecutionTab;
