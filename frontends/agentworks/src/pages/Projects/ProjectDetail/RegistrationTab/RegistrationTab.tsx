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
  DesktopOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { registrationApi } from '../../../../api/registration';
import { automationApi } from '../../../../api/automation';
import type {
  RegistrationTalentItem,
  WorkflowOption,
  FetchProgress,
  TalentFetchStatusType,
} from '../../../../types/registration';
import type { Platform } from '../../../../types/talent';
import { ResultViewModal } from './ResultViewModal';
import { GeneratedSheetsTable } from './GeneratedSheetsTable';
import { GenerateSheetModal } from './GenerateSheetModal';
import { HistoryRecordsModal } from './HistoryRecordsModal';

interface RegistrationTabProps {
  projectId: string;
  projectName: string;
  platforms: Platform[];
  onRefresh?: () => void;
}

export function RegistrationTab({
  projectId,
  projectName,
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

  // 暂停状态（验证码需要手动处理时）
  const [pauseInfo, setPauseInfo] = useState<{
    taskId: string;
    vncUrl: string;
    message: string;
  } | null>(null);

  // 结果查看弹窗
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTalent, setViewingTalent] =
    useState<RegistrationTalentItem | null>(null);

  // 历史记录查看弹窗（跨项目复用）
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyViewingTalent, setHistoryViewingTalent] =
    useState<RegistrationTalentItem | null>(null);

  // 生成表格弹窗
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  // 已生成表格列表刷新触发器
  const [sheetsRefreshKey, setSheetsRefreshKey] = useState(0);

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
            enableVNC: w.enableVNC,
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

  // 可生成表格的达人（当前项目已抓取成功，或有可复用的历史记录）
  const generatableTalents = useMemo(() => {
    return selectedTalents.filter(
      t =>
        t.fetchStatus === 'success' ||
        (t.fetchStatusType === 'reusable' && t.recommendedRecord)
    );
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

    // 初始化进度状态，包含每个达人的执行结果列表
    setFetchProgress({
      total: fetchableTalents.length,
      completed: 0,
      success: 0,
      failed: 0,
      isFetching: true,
      startTime: Date.now(),
      talentResults: fetchableTalents.map(t => ({
        collaborationId: t.collaborationId,
        talentName: t.talentName,
        status: 'pending' as const,
      })),
    });

    try {
      const result = await registrationApi.executeBatchFetch(
        {
          projectId,
          workflowId: selectedWorkflow,
          workflowName: workflow.name,
          enableVNC: workflow.enableVNC,
          talents: fetchableTalents.map(t => ({
            collaborationId: t.collaborationId,
            talentName: t.talentName,
            xingtuId: t.xingtuId!,
          })),
        },
        {
          onProgress: (current, _total, talentName) => {
            setFetchProgress(prev => ({
              ...prev,
              completed: current,
              current: talentName,
              stepInfo: undefined, // 开始新达人时重置步骤进度
              // 更新当前达人状态为 running
              talentResults: prev.talentResults?.map(t =>
                t.talentName === talentName
                  ? { ...t, status: 'running' as const, startTime: Date.now() }
                  : t
              ),
            }));
          },
          onStepProgress: stepInfo => {
            setFetchProgress(prev => ({
              ...prev,
              stepInfo,
            }));
          },
          onSuccess: (collaborationId, _result, duration) => {
            setFetchProgress(prev => ({
              ...prev,
              success: prev.success + 1,
              stepInfo: undefined, // 成功后清除步骤进度
              // 更新该达人状态为 success
              talentResults: prev.talentResults?.map(t =>
                t.collaborationId === collaborationId
                  ? { ...t, status: 'success' as const, duration }
                  : t
              ),
            }));
            // 立即更新达人列表表格
            setTalents(prev =>
              prev.map(t =>
                t.collaborationId === collaborationId
                  ? {
                      ...t,
                      fetchStatus: 'success',
                      fetchedAt: new Date().toISOString(),
                      hasResult: true,
                    }
                  : t
              )
            );
          },
          onError: (collaborationId, error, duration) => {
            setFetchProgress(prev => ({
              ...prev,
              failed: prev.failed + 1,
              stepInfo: undefined, // 失败后清除步骤进度
              // 更新该达人状态为 failed
              talentResults: prev.talentResults?.map(t =>
                t.collaborationId === collaborationId
                  ? { ...t, status: 'failed' as const, duration, error }
                  : t
              ),
            }));
            // 立即更新达人列表表格
            setTalents(prev =>
              prev.map(t =>
                t.collaborationId === collaborationId
                  ? {
                      ...t,
                      fetchStatus: 'failed',
                      fetchedAt: new Date().toISOString(),
                    }
                  : t
              )
            );
          },
          onPause: info => {
            setPauseInfo(info);
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
  const handleGenerateSheet = () => {
    if (generatableTalents.length === 0) {
      message.warning('没有可生成表格的达人（需要先抓取成功）');
      return;
    }
    setGenerateModalOpen(true);
  };

  // 生成表格成功回调
  const handleGenerateSuccess = () => {
    setGenerateModalOpen(false);
    // 刷新已生成表格列表
    setSheetsRefreshKey(prev => prev + 1);
  };

  // 查看结果
  const handleViewResult = (record: RegistrationTalentItem) => {
    setViewingTalent(record);
    setViewModalOpen(true);
  };

  // 查看历史记录（跨项目复用）
  const handleViewHistoryRecord = (record: RegistrationTalentItem) => {
    setHistoryViewingTalent(record);
    setHistoryModalOpen(true);
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

    const workflow = workflows.find(w => w.id === selectedWorkflow);
    if (!workflow) return;

    // 使用批量抓取接口（只传一个达人）
    setFetchProgress({
      total: 1,
      completed: 0,
      success: 0,
      failed: 0,
      isFetching: true,
      current: record.talentName,
    });

    try {
      const result = await registrationApi.executeBatchFetch(
        {
          projectId,
          workflowId: selectedWorkflow,
          workflowName: workflow.name,
          enableVNC: workflow.enableVNC,
          talents: [
            {
              collaborationId: record.collaborationId,
              talentName: record.talentName,
              xingtuId: record.xingtuId,
            },
          ],
        },
        {
          onProgress: (_current, _total, talentName) => {
            setFetchProgress(prev => ({
              ...prev,
              current: talentName,
            }));
          },
          onStepProgress: stepInfo => {
            setFetchProgress(prev => ({
              ...prev,
              stepInfo,
            }));
          },
          onSuccess: collaborationId => {
            setFetchProgress(prev => ({
              ...prev,
              completed: 1,
              success: 1,
              stepInfo: undefined,
            }));
            // 立即更新该达人的状态
            setTalents(prev =>
              prev.map(t =>
                t.collaborationId === collaborationId
                  ? {
                      ...t,
                      fetchStatus: 'success',
                      fetchedAt: new Date().toISOString(),
                      hasResult: true,
                    }
                  : t
              )
            );
          },
          onError: collaborationId => {
            setFetchProgress(prev => ({
              ...prev,
              completed: 1,
              failed: 1,
              stepInfo: undefined,
            }));
            // 立即更新该达人的状态
            setTalents(prev =>
              prev.map(t =>
                t.collaborationId === collaborationId
                  ? {
                      ...t,
                      fetchStatus: 'failed',
                      fetchedAt: new Date().toISOString(),
                    }
                  : t
              )
            );
          },
          onPause: info => {
            setPauseInfo(info);
          },
        }
      );

      if (result.success > 0) {
        message.success(`重试成功: ${record.talentName}`);
      } else {
        message.error(`重试失败: ${record.talentName}`);
      }
      loadData();
      onRefresh?.();
    } catch (error) {
      message.error('重试执行出错');
      console.error('Retry error:', error);
    } finally {
      setFetchProgress(prev => ({ ...prev, isFetching: false }));
    }
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
      dataIndex: 'fetchStatusType',
      key: 'fetchStatusType',
      width: 160,
      render: (
        _: TalentFetchStatusType | undefined,
        record: RegistrationTalentItem
      ) => {
        const { fetchStatusType, fetchStatus, recommendedRecord } = record;

        // 当前项目正在抓取中
        if (fetchStatus === 'pending') {
          return (
            <Tag icon={<LoadingOutlined spin />} color="processing">
              抓取中
            </Tag>
          );
        }

        // 兼容性处理：如果 fetchStatusType 未定义，根据 fetchStatus 判断
        // （云函数未部署时，旧 API 只返回 fetchStatus 不返回 fetchStatusType）
        const effectiveStatusType: TalentFetchStatusType | undefined =
          fetchStatusType ??
          (fetchStatus === 'success'
            ? 'fetched'
            : fetchStatus === 'failed'
              ? 'fetched'
              : undefined);

        // 根据综合状态类型渲染
        switch (effectiveStatusType) {
          case 'fetched':
            // 已抓取（当前项目）
            if (fetchStatus === 'failed') {
              return (
                <Tag icon={<CloseCircleOutlined />} color="error">
                  失败
                </Tag>
              );
            }
            return (
              <Tag icon={<CheckCircleOutlined />} color="success">
                已抓取
              </Tag>
            );

          case 'reusable':
            // 可复用（其他项目有未过期记录）
            return (
              <Tooltip
                title={
                  recommendedRecord
                    ? `来自「${recommendedRecord.projectName}」(${recommendedRecord.daysDiff}天前)`
                    : '可复用历史数据'
                }
              >
                <Tag
                  icon={<HistoryOutlined />}
                  color="blue"
                  className="cursor-pointer"
                  onClick={() => handleViewHistoryRecord(record)}
                >
                  可复用
                  {recommendedRecord && ` (${recommendedRecord.daysDiff}天)`}
                </Tag>
              </Tooltip>
            );

          case 'expired':
            // 数据过期（其他项目有记录但超过30天）
            return (
              <Tooltip title="历史数据已过期（>30天），建议重新抓取">
                <Tag
                  icon={<ExclamationCircleOutlined />}
                  color="warning"
                  className="cursor-pointer"
                  onClick={() => handleViewHistoryRecord(record)}
                >
                  数据过期
                </Tag>
              </Tooltip>
            );

          case 'none':
          default:
            // 未抓取（全局无记录）
            return (
              <Tag icon={<MinusCircleOutlined />} color="default">
                未抓取
              </Tag>
            );
        }
      },
      filters: [
        { text: '已抓取', value: 'fetched' },
        { text: '可复用', value: 'reusable' },
        { text: '数据过期', value: 'expired' },
        { text: '未抓取', value: 'none' },
      ],
      onFilter: (value, record) => {
        // 兼容性处理：fetchStatusType 未定义时根据 fetchStatus 计算
        const effectiveStatus =
          record.fetchStatusType ??
          (record.fetchStatus === 'success' || record.fetchStatus === 'failed'
            ? 'fetched'
            : 'none');
        return effectiveStatus === value;
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
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {/* 当前项目有结果：查看 */}
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
          {/* 可复用/过期：查看历史 */}
          {!record.hasResult &&
            (record.fetchStatusType === 'reusable' ||
              record.fetchStatusType === 'expired') && (
              <Button
                type="link"
                size="small"
                icon={<HistoryOutlined />}
                onClick={() => handleViewHistoryRecord(record)}
              >
                查看历史
              </Button>
            )}
          {/* 失败：重试 */}
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

        {/* 批量抓取进度面板 */}
        {fetchProgress.isFetching && (
          <div className="mt-4 pt-4 border-t border-stroke">
            <div className="p-4 bg-surface-sunken rounded-lg">
              {/* 头部：当前达人和时间信息 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/10">
                    <LoadingOutlined className="text-primary-500" spin />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-content">
                      正在处理: {fetchProgress.current || '准备中...'}
                    </div>
                    <div className="text-xs text-content-muted">
                      第 {fetchProgress.completed}/{fetchProgress.total} 位达人
                    </div>
                  </div>
                </div>

                {/* 时间信息 */}
                <div className="flex items-center gap-4 text-xs">
                  {fetchProgress.startTime && (
                    <div className="flex items-center gap-1.5 text-content-secondary">
                      <ClockCircleOutlined />
                      <span>
                        已用:{' '}
                        {Math.floor(
                          (Date.now() - fetchProgress.startTime) / 1000
                        )}
                        秒
                      </span>
                    </div>
                  )}
                  {fetchProgress.success + fetchProgress.failed > 0 && (
                    <div className="text-content-muted">
                      预计剩余:{' '}
                      {Math.round(
                        (((Date.now() -
                          (fetchProgress.startTime || Date.now())) /
                          (fetchProgress.success + fetchProgress.failed)) *
                          (fetchProgress.total -
                            fetchProgress.success -
                            fetchProgress.failed)) /
                          1000
                      )}
                      秒
                    </div>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              <Progress
                percent={Math.round(
                  ((fetchProgress.success + fetchProgress.failed) /
                    fetchProgress.total) *
                    100
                )}
                status="active"
                strokeColor={{
                  '0%': 'var(--aw-primary-500)',
                  '100%': 'var(--aw-primary-600)',
                }}
              />

              {/* 步骤级进度 */}
              {fetchProgress.stepInfo && (
                <div className="mt-3 flex items-center gap-2">
                  {fetchProgress.stepInfo.captcha ? (
                    <Tag
                      icon={
                        fetchProgress.stepInfo.captchaStatus === 'detecting' ? (
                          <LoadingOutlined spin />
                        ) : fetchProgress.stepInfo.captchaStatus ===
                          'success' ? (
                          <CheckCircleOutlined />
                        ) : (
                          <CloseCircleOutlined />
                        )
                      }
                      color={
                        fetchProgress.stepInfo.captchaStatus === 'detecting'
                          ? 'processing'
                          : fetchProgress.stepInfo.captchaStatus === 'success'
                            ? 'success'
                            : 'error'
                      }
                    >
                      {fetchProgress.stepInfo.captchaMessage}
                    </Tag>
                  ) : (
                    <>
                      <Tag color="blue" className="font-mono">
                        步骤 {fetchProgress.stepInfo.currentStep}/
                        {fetchProgress.stepInfo.totalSteps}
                      </Tag>
                      <span className="text-xs text-content-muted truncate max-w-[280px]">
                        {fetchProgress.stepInfo.currentAction}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* 汇总统计 */}
              <div className="mt-3 pt-3 border-t border-stroke flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                  <span className="text-xs text-content-secondary">
                    进度{' '}
                    <span className="font-medium text-content">
                      {fetchProgress.completed}/{fetchProgress.total}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-xs text-content-secondary">
                    成功{' '}
                    <span className="font-medium text-success-600">
                      {fetchProgress.success}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger-500" />
                  <span className="text-xs text-content-secondary">
                    失败{' '}
                    <span className="font-medium text-danger-500">
                      {fetchProgress.failed}
                    </span>
                  </span>
                </div>
              </div>

              {/* 达人执行列表 */}
              {fetchProgress.talentResults &&
                fetchProgress.talentResults.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stroke space-y-1.5 max-h-[160px] overflow-y-auto">
                    {fetchProgress.talentResults.map(t => (
                      <div
                        key={t.collaborationId}
                        className="flex items-center gap-2 text-sm py-1"
                      >
                        {t.status === 'success' && (
                          <CheckCircleOutlined className="text-success-500" />
                        )}
                        {t.status === 'failed' && (
                          <CloseCircleOutlined className="text-danger-500" />
                        )}
                        {t.status === 'running' && (
                          <LoadingOutlined className="text-primary-500" spin />
                        )}
                        {t.status === 'pending' && (
                          <MinusCircleOutlined className="text-content-muted" />
                        )}

                        <span
                          className={
                            t.status === 'running'
                              ? 'text-content font-medium'
                              : 'text-content-secondary'
                          }
                        >
                          {t.talentName}
                        </span>

                        <span className="ml-auto text-xs text-content-muted">
                          {t.status === 'success' &&
                            `${Math.round((t.duration || 0) / 1000)}秒`}
                          {t.status === 'failed' && (
                            <Tooltip title={t.error}>
                              <span className="text-danger-500 cursor-help">
                                失败
                              </span>
                            </Tooltip>
                          )}
                          {t.status === 'running' && '执行中...'}
                          {t.status === 'pending' && '等待中'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* 验证码暂停提示 */}
        {pauseInfo && (
          <div className="mt-4 p-4 bg-warning-500/10 dark:bg-warning-900/20 border border-warning-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <WarningOutlined className="text-warning-500 text-xl mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-content mb-1">
                  验证码需要手动处理
                </h4>
                <p className="text-sm text-content-secondary mb-3">
                  {pauseInfo.message}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="primary"
                    icon={<DesktopOutlined />}
                    onClick={() => window.open(pauseInfo.vncUrl, '_blank')}
                  >
                    打开远程桌面
                  </Button>
                  <Button
                    onClick={async () => {
                      const res = await registrationApi.resumeTask(
                        pauseInfo.taskId
                      );
                      if (res.success) {
                        setPauseInfo(null);
                        message.success('任务已恢复');
                      } else {
                        message.warning(res.message || '验证码仍未完成');
                      }
                    }}
                  >
                    继续执行
                  </Button>
                </div>
              </div>
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
      <GeneratedSheetsTable projectId={projectId} key={sheetsRefreshKey} />

      {/* 结果查看弹窗 */}
      <ResultViewModal
        open={viewModalOpen}
        talent={viewingTalent}
        onClose={() => {
          setViewModalOpen(false);
          setViewingTalent(null);
        }}
      />

      {/* 生成表格弹窗 */}
      <GenerateSheetModal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        onSuccess={handleGenerateSuccess}
        projectId={projectId}
        projectName={projectName}
        selectedTalents={generatableTalents}
      />

      {/* 历史记录查看弹窗（跨项目复用） */}
      <HistoryRecordsModal
        open={historyModalOpen}
        talent={historyViewingTalent}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryViewingTalent(null);
        }}
      />
    </div>
  );
}
