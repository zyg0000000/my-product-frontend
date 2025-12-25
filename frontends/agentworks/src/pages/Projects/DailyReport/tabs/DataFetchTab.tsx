/**
 * 数据抓取 Tab
 * 实现手动抓取日报数据功能
 *
 * 功能：
 * - 显示待抓取视频统计
 * - 触发批量抓取
 * - 显示抓取进度
 * - 重试失败任务
 */

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Progress,
  Table,
  Tag,
  Tooltip,
  Collapse,
  Statistic,
  Space,
  Alert,
  Spin,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDataFetch } from '../../../../hooks/useDataFetch';
import type { MissingDataVideo } from '../../../../types/dailyReport';
import type { FetchTask, FetchTaskStatus } from '../../../../types/dataFetch';

interface DataFetchTabProps {
  projectId: string;
  /** 当前选择的日期（YYYY-MM-DD 格式），用于保存日报数据 */
  currentDate: string;
  missingDataVideos: MissingDataVideo[];
  onFetchComplete?: () => void;
}

/**
 * 状态图标映射
 */
const STATUS_ICONS: Record<FetchTaskStatus, React.ReactNode> = {
  pending: <ClockCircleOutlined style={{ color: '#8c8c8c' }} />,
  running: <LoadingOutlined style={{ color: '#1890ff' }} spin />,
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  failed: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  skipped: <WarningOutlined style={{ color: '#faad14' }} />,
};

/**
 * 状态标签配置
 */
const STATUS_TAGS: Record<FetchTaskStatus, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待中' },
  running: { color: 'processing', label: '抓取中' },
  success: { color: 'success', label: '成功' },
  failed: { color: 'error', label: '失败' },
  skipped: { color: 'warning', label: '跳过' },
};

/**
 * 格式化播放量
 */
function formatViews(views?: number): string {
  if (views === undefined || views === null) return '-';
  if (views >= 10000) {
    return `${(views / 10000).toFixed(1)}万`;
  }
  return views.toLocaleString();
}

/**
 * 计算发布天数
 */
function getDaysSincePublish(publishDate?: string): number | null {
  if (!publishDate) return null;
  const publish = new Date(publishDate);
  const today = new Date();
  const diffTime = today.getTime() - publish.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function DataFetchTab({
  projectId,
  currentDate,
  missingDataVideos,
  onFetchComplete,
}: DataFetchTabProps) {
  const [showVideoList, setShowVideoList] = useState(false);

  const {
    session,
    isRunning,
    progress,
    workflowRules,
    workflowsLoading,
    startFetch,
    stopFetch,
    retryFailed,
    clearSession,
    getWorkflowForVideo,
    canFetch,
  } = useDataFetch({
    projectId,
    targetDate: currentDate, // 传入当前选择的日期
    onFetchComplete: () => {
      onFetchComplete?.();
    },
  });

  // 统计可抓取视频
  const videoStats = useMemo(() => {
    const total = missingDataVideos.length;
    let fetchable = 0;
    let within14Days = 0;
    let after14Days = 0;
    let noVideoId = 0;
    let noWorkflow = 0;

    for (const video of missingDataVideos) {
      const check = canFetch(video);
      if (check.canFetch) {
        fetchable++;
        const days = getDaysSincePublish(video.publishDate);
        if (days !== null && days <= 14) {
          within14Days++;
        } else {
          after14Days++;
        }
      } else {
        if (!video.videoId) {
          noVideoId++;
        } else {
          noWorkflow++;
        }
      }
    }

    return {
      total,
      fetchable,
      within14Days,
      after14Days,
      noVideoId,
      noWorkflow,
    };
  }, [missingDataVideos, canFetch]);

  // 开始抓取
  const handleStartFetch = async () => {
    const fetchableVideos = missingDataVideos.filter(v => canFetch(v).canFetch);
    if (fetchableVideos.length === 0) {
      return;
    }
    await startFetch(fetchableVideos);
  };

  // 任务列表列定义
  const taskColumns: ColumnsType<FetchTask> = [
    {
      title: '达人',
      dataIndex: 'talentName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '工作流',
      dataIndex: 'workflowName',
      width: 180,
      ellipsis: true,
      render: (name: string) => (
        <Tooltip title={name}>
          <span className="text-xs">{name || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: FetchTaskStatus) => (
        <Space size={4}>
          {STATUS_ICONS[status]}
          <Tag color={STATUS_TAGS[status].color}>
            {STATUS_TAGS[status].label}
          </Tag>
        </Space>
      ),
    },
    {
      title: '播放量',
      dataIndex: 'fetchedViews',
      width: 100,
      render: (views?: number) => (
        <span
          className={views ? 'text-[var(--aw-success-600)] font-medium' : ''}
        >
          {formatViews(views)}
        </span>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      width: 80,
      render: (duration?: number) =>
        duration ? `${(duration / 1000).toFixed(1)}s` : '-',
    },
    {
      title: '备注',
      dataIndex: 'error',
      ellipsis: true,
      render: (error?: string) =>
        error ? (
          <Tooltip title={error}>
            <span className="text-[var(--aw-error-500)]">{error}</span>
          </Tooltip>
        ) : null,
    },
  ];

  // 视频预览列表列定义
  const videoColumns: ColumnsType<MissingDataVideo> = [
    {
      title: '达人',
      dataIndex: 'talentName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '视频ID',
      dataIndex: 'videoId',
      width: 180,
      ellipsis: true,
      render: (id?: string) =>
        id ? (
          <span className="text-xs font-mono">{id}</span>
        ) : (
          <Tag color="warning">无</Tag>
        ),
    },
    {
      title: '发布天数',
      dataIndex: 'publishDate',
      width: 100,
      render: (date?: string) => {
        const days = getDaysSincePublish(date);
        if (days === null) return '-';
        return <Tag color={days <= 14 ? 'blue' : 'orange'}>{days} 天</Tag>;
      },
    },
    {
      title: '适用工作流',
      width: 180,
      render: (_: unknown, record: MissingDataVideo) => {
        const workflow = getWorkflowForVideo(record.publishDate);
        return workflow ? (
          <Tooltip title={workflow.workflowName}>
            <Tag color="green">{workflow.name}</Tag>
          </Tooltip>
        ) : (
          <Tag color="red">无匹配</Tag>
        );
      },
    },
    {
      title: '可抓取',
      width: 80,
      render: (_: unknown, record: MissingDataVideo) => {
        const check = canFetch(record);
        return check.canFetch ? (
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
        ) : (
          <Tooltip title={check.reason}>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          </Tooltip>
        );
      },
    },
  ];

  // 渲染工作流加载状态
  if (workflowsLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Spin size="large" />
        <p className="mt-4 text-[var(--aw-gray-500)]">加载工作流配置中...</p>
      </div>
    );
  }

  // 渲染无工作流提示
  if (workflowRules.length === 0) {
    return (
      <div className="py-6">
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="未找到抓取工作流"
          description={
            <div className="space-y-2">
              <p>未找到匹配的数据抓取工作流，请先在自动化模块中配置：</p>
              <ul className="list-disc list-inside text-sm">
                <li>
                  包含「当日播放量」或「14天内」关键词的工作流（14天内视频）
                </li>
                <li>包含「14天后」关键词的工作流（14天后视频）</li>
              </ul>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* 工作流规则提示 */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="已加载抓取工作流"
        description={
          <div className="space-y-1">
            {workflowRules.map(rule => (
              <div key={rule.workflowId} className="text-sm">
                <Tag color="blue">{rule.name}</Tag>
                <span className="text-[var(--aw-gray-500)]">
                  {rule.daysRange[1] === null
                    ? `发布 ${rule.daysRange[0]} 天后`
                    : `发布 ${rule.daysRange[0]}-${rule.daysRange[1]} 天内`}
                  → {rule.workflowName}
                </span>
              </div>
            ))}
          </div>
        }
      />

      {/* 统计卡片 */}
      <Card size="small" title="待抓取视频">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Statistic
            title="总缺失数据"
            value={videoStats.total}
            suffix="个"
            valueStyle={{ color: '#1890ff' }}
          />
          <Statistic
            title="可抓取"
            value={videoStats.fetchable}
            suffix="个"
            valueStyle={{ color: '#52c41a' }}
          />
          <Statistic
            title="14天内"
            value={videoStats.within14Days}
            suffix="个"
            valueStyle={{ color: '#722ed1' }}
          />
          <Statistic
            title="14天后"
            value={videoStats.after14Days}
            suffix="个"
            valueStyle={{ color: '#fa8c16' }}
          />
        </div>

        {/* 不可抓取原因 */}
        {(videoStats.noVideoId > 0 || videoStats.noWorkflow > 0) && (
          <div className="mt-4 text-sm text-[var(--aw-gray-500)]">
            <WarningOutlined className="mr-1" />
            不可抓取：
            {videoStats.noVideoId > 0 && (
              <Tag color="warning">{videoStats.noVideoId} 个无视频ID</Tag>
            )}
            {videoStats.noWorkflow > 0 && (
              <Tag color="error">{videoStats.noWorkflow} 个无匹配工作流</Tag>
            )}
          </div>
        )}

        {/* 视频列表预览 */}
        {missingDataVideos.length > 0 && (
          <Collapse
            ghost
            className="mt-4"
            items={[
              {
                key: 'videos',
                label: (
                  <span className="text-[var(--aw-gray-600)]">
                    查看待抓取视频列表 ({missingDataVideos.length})
                  </span>
                ),
                children: (
                  <Table
                    size="small"
                    columns={videoColumns}
                    dataSource={missingDataVideos}
                    rowKey="collaborationId"
                    pagination={{ pageSize: 10, size: 'small' }}
                    scroll={{ x: 700 }}
                  />
                ),
              },
            ]}
            activeKey={showVideoList ? ['videos'] : []}
            onChange={keys => setShowVideoList(keys.includes('videos'))}
          />
        )}
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        {!isRunning ? (
          <>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartFetch}
              disabled={videoStats.fetchable === 0}
            >
              开始抓取 ({videoStats.fetchable})
            </Button>
            {session && progress.failed > 0 && (
              <Button icon={<ReloadOutlined />} onClick={retryFailed}>
                重试失败 ({progress.failed})
              </Button>
            )}
            {session && <Button onClick={clearSession}>清除记录</Button>}
          </>
        ) : (
          <Button danger icon={<PauseCircleOutlined />} onClick={stopFetch}>
            停止抓取
          </Button>
        )}
      </div>

      {/* 抓取进度面板 */}
      {session && (
        <Card
          size="small"
          title={
            <Space>
              <SyncOutlined spin={isRunning} />
              <span>抓取进度</span>
              {isRunning && <Tag color="processing">执行中</Tag>}
            </Space>
          }
          extra={
            <Space>
              <Tag color="success">成功: {progress.success}</Tag>
              <Tag color="error">失败: {progress.failed}</Tag>
              <Tag color="warning">跳过: {progress.skipped}</Tag>
            </Space>
          }
        >
          {/* 进度条 */}
          <Progress
            percent={progress.percentage}
            status={
              isRunning
                ? 'active'
                : progress.failed > 0
                  ? 'exception'
                  : 'success'
            }
            format={() =>
              `${progress.completed}/${progress.total - progress.skipped}`
            }
          />

          {/* 任务列表 */}
          <Table
            className="mt-4"
            size="small"
            columns={taskColumns}
            dataSource={session.tasks}
            rowKey="collaborationId"
            pagination={{ pageSize: 20, size: 'small' }}
            scroll={{ x: 800 }}
            rowClassName={record =>
              record.status === 'running' ? 'bg-blue-50' : ''
            }
          />
        </Card>
      )}

      {/* 无数据提示 */}
      {missingDataVideos.length === 0 && (
        <Card size="small">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <p className="text-[var(--aw-success-500)]">
                  <CheckCircleOutlined className="mr-2" />
                  所有视频数据已完整
                </p>
                <p className="text-xs text-[var(--aw-gray-400)] mt-1">
                  无需抓取
                </p>
              </div>
            }
          />
        </Card>
      )}

      {/* 规则说明 */}
      <div className="rounded-lg bg-[var(--aw-gray-50)] p-4">
        <h4 className="font-medium text-[var(--aw-gray-700)] mb-2">
          <ClockCircleOutlined className="mr-2" />
          抓取规则说明
        </h4>
        <ul className="text-sm text-[var(--aw-gray-500)] space-y-1 list-disc list-inside">
          <li>
            <strong>发布后 14 天内:</strong> 使用「当日播放量」工作流抓取
          </li>
          <li>
            <strong>发布后 14 天后:</strong> 使用「14天后播放量」工作流抓取
          </li>
          <li>串行执行任务，避免触发平台反爬机制</li>
          <li>抓取成功后自动写入日报数据</li>
        </ul>
      </div>
    </div>
  );
}
