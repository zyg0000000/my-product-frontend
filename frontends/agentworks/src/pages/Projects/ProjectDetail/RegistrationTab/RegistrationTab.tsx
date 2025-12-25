/**
 * 报名管理 Tab 组件
 *
 * 功能：
 * - 一张达人表，两种操作（抓取 / 生成表格）
 * - 手动选择工作流执行星图页面截图+数据抓取
 * - 查看抓取结果（截图+数据弹窗）
 * - 生成飞书报名表，管理表格链接
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Progress,
  App,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlayCircleOutlined,
  FileAddOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { registrationApi } from '../../../../api/registration';
import { automationApi } from '../../../../api/automation';
import type {
  RegistrationTalentItem,
  WorkflowOption,
  FetchProgress,
} from '../../../../types/registration';
import type { Platform } from '../../../../types/talent';
import { ResultViewModal } from './ResultViewModal';
import { GeneratedSheetsTable } from './GeneratedSheetsTable';

interface RegistrationTabProps {
  projectId: string;
  platforms: Platform[];
  onRefresh?: () => void;
}

export function RegistrationTab({
  projectId,
  platforms,
  onRefresh,
}: RegistrationTabProps) {
  const { message } = App.useApp();

  // 状态
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<RegistrationTalentItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    string | undefined
  >();

  // 抓取进度
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
    isFetching: false,
  });

  // 结果查看弹窗
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTalent, setViewingTalent] =
    useState<RegistrationTalentItem | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 并行加载达人列表和工作流列表
      const [talentsRes, workflowsRes] = await Promise.all([
        registrationApi.getRegistrationTalents(projectId),
        automationApi.getWorkflows(),
      ]);

      if (talentsRes.success && talentsRes.data) {
        setTalents(talentsRes.data);
      }

      // 转换 ECS 工作流格式
      if (Array.isArray(workflowsRes)) {
        setWorkflows(
          workflowsRes.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description,
          }))
        );
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('Load registration data error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 选中的达人
  const selectedTalents = useMemo(() => {
    return talents.filter(t => selectedRowKeys.includes(t.collaborationId));
  }, [talents, selectedRowKeys]);

  // 可抓取的达人（有星图ID）
  const fetchableTalents = useMemo(() => {
    return selectedTalents.filter(t => t.xingtuId);
  }, [selectedTalents]);

  // 可生成表格的达人（已抓取成功）
  const generatableTalents = useMemo(() => {
    return selectedTalents.filter(t => t.fetchStatus === 'success');
  }, [selectedTalents]);

  // 开始抓取
  const handleStartFetch = async () => {
    if (!selectedWorkflow) {
      message.warning('请先选择工作流');
      return;
    }

    if (fetchableTalents.length === 0) {
      message.warning('没有可抓取的达人（需要有星图ID）');
      return;
    }

    const workflow = workflows.find(w => w.id === selectedWorkflow);
    if (!workflow) return;

    setFetchProgress({
      total: fetchableTalents.length,
      completed: 0,
      success: 0,
      failed: 0,
      isFetching: true,
    });

    try {
      const result = await registrationApi.executeBatchFetch(
        {
          projectId,
          workflowId: selectedWorkflow,
          workflowName: workflow.name,
          talents: fetchableTalents.map(t => ({
            collaborationId: t.collaborationId,
            talentName: t.talentName,
            xingtuId: t.xingtuId!,
          })),
        },
        {
          onProgress: (current, total, talentName) => {
            setFetchProgress(prev => ({
              ...prev,
              completed: current,
              current: talentName,
            }));
          },
          onSuccess: () => {
            setFetchProgress(prev => ({
              ...prev,
              success: prev.success + 1,
            }));
          },
          onError: () => {
            setFetchProgress(prev => ({
              ...prev,
              failed: prev.failed + 1,
            }));
          },
        }
      );

      message.success(
        `抓取完成：成功 ${result.success}，失败 ${result.failed}`
      );
      loadData();
      onRefresh?.();
    } catch (error) {
      message.error('抓取执行出错');
      console.error('Fetch error:', error);
    } finally {
      setFetchProgress(prev => ({ ...prev, isFetching: false }));
    }
  };

  // 生成表格
  const handleGenerateSheet = async () => {
    if (generatableTalents.length === 0) {
      message.warning('没有可生成表格的达人（需要先抓取成功）');
      return;
    }

    message.info('表格生成功能开发中...');
  };

  // 查看结果
  const handleViewResult = (record: RegistrationTalentItem) => {
    setViewingTalent(record);
    setViewModalOpen(true);
  };

  // 重试单个
  const handleRetry = async (record: RegistrationTalentItem) => {
    if (!selectedWorkflow) {
      message.warning('请先选择工作流');
      return;
    }

    if (!record.xingtuId) {
      message.warning('该达人没有星图ID');
      return;
    }

    message.info('重试功能开发中...');
  };

  // 表格列定义
  const columns: ColumnsType<RegistrationTalentItem> = [
    {
      title: '达人昵称',
      dataIndex: 'talentName',
      key: 'talentName',
      width: 200,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: string) => <Tag>{platform}</Tag>,
      filters: platforms.map(p => ({ text: p, value: p })),
      onFilter: (value, record) => record.platform === value,
    },
    {
      title: '星图ID',
      dataIndex: 'xingtuId',
      key: 'xingtuId',
      width: 150,
      render: (xingtuId?: string) =>
        xingtuId ? (
          <span className="font-mono text-xs">{xingtuId}</span>
        ) : (
          <Tooltip title="该达人没有星图ID，无法抓取">
            <span className="text-content-muted flex items-center gap-1">
              <WarningOutlined className="text-warning-500" />无
            </span>
          </Tooltip>
        ),
    },
    {
      title: '抓取状态',
      dataIndex: 'fetchStatus',
      key: 'fetchStatus',
      width: 120,
      render: (status: RegistrationTalentItem['fetchStatus']) => {
        if (!status) {
          return (
            <Tag icon={<MinusCircleOutlined />} color="default">
              未抓取
            </Tag>
          );
        }
        if (status === 'success') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              已完成
            </Tag>
          );
        }
        if (status === 'failed') {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              失败
            </Tag>
          );
        }
        return (
          <Tag icon={<PlayCircleOutlined />} color="processing">
            抓取中
          </Tag>
        );
      },
      filters: [
        { text: '未抓取', value: 'null' },
        { text: '已完成', value: 'success' },
        { text: '失败', value: 'failed' },
      ],
      onFilter: (value, record) => {
        if (value === 'null') return record.fetchStatus === null;
        return record.fetchStatus === value;
      },
    },
    {
      title: '抓取时间',
      dataIndex: 'fetchedAt',
      key: 'fetchedAt',
      width: 180,
      render: (fetchedAt?: string) =>
        fetchedAt ? new Date(fetchedAt).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {record.hasResult && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewResult(record)}
            >
              查看
            </Button>
          )}
          {record.fetchStatus === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record)}
            >
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as string[]);
    },
  };

  return (
    <div className="space-y-4">
      {/* 操作区域 */}
      <Card size="small" className="shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-content-secondary">工作流:</span>
              <Select
                placeholder="选择抓取工作流"
                style={{ width: 240 }}
                value={selectedWorkflow}
                onChange={setSelectedWorkflow}
                options={workflows.map(w => ({
                  label: w.name,
                  value: w.id,
                }))}
                loading={loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartFetch}
              loading={fetchProgress.isFetching}
              disabled={
                !selectedWorkflow ||
                fetchableTalents.length === 0 ||
                fetchProgress.isFetching
              }
            >
              开始抓取
              {fetchableTalents.length > 0 && ` (${fetchableTalents.length})`}
            </Button>
            <Button
              icon={<FileAddOutlined />}
              onClick={handleGenerateSheet}
              disabled={
                generatableTalents.length === 0 || fetchProgress.isFetching
              }
            >
              生成飞书表格
              {generatableTalents.length > 0 &&
                ` (${generatableTalents.length})`}
            </Button>
          </div>
        </div>

        {/* 抓取进度条 */}
        {fetchProgress.isFetching && (
          <div className="mt-4 pt-4 border-t border-stroke">
            <div className="flex items-center gap-4">
              <Progress
                percent={Math.round(
                  (fetchProgress.completed / fetchProgress.total) * 100
                )}
                status="active"
                className="flex-1"
              />
              <span className="text-sm text-content-secondary whitespace-nowrap">
                {fetchProgress.current && `正在处理: ${fetchProgress.current}`}
              </span>
            </div>
            <div className="mt-2 text-xs text-content-muted">
              进度: {fetchProgress.completed}/{fetchProgress.total} | 成功:{' '}
              {fetchProgress.success} | 失败: {fetchProgress.failed}
            </div>
          </div>
        )}
      </Card>

      {/* 达人列表 */}
      <Card
        title={
          <span className="flex items-center gap-2">
            达人列表
            <span className="text-content-muted font-normal text-sm">
              ({talents.length} 人)
            </span>
          </span>
        }
        size="small"
        className="shadow-sm"
      >
        <Table
          rowKey="collaborationId"
          columns={columns}
          dataSource={talents}
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条`,
          }}
          size="small"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无达人数据"
              />
            ),
          }}
        />
      </Card>

      {/* 已生成表格列表 */}
      <GeneratedSheetsTable projectId={projectId} />

      {/* 结果查看弹窗 */}
      <ResultViewModal
        open={viewModalOpen}
        talent={viewingTalent}
        onClose={() => {
          setViewModalOpen(false);
          setViewingTalent(null);
        }}
      />
    </div>
  );
}
