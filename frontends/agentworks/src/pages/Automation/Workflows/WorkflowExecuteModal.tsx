/**
 * 工作流执行弹窗
 *
 * @version 1.0.0
 * @description 选择工作流并执行，支持从业务数据自动填充参数
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Select,
  Input,
  Button,
  Spin,
  Timeline,
  Tag,
  Collapse,
  App,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  BoltIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  automationApi,
  type TaskExecuteResponse,
} from '../../../api/automation';
import { useWorkflows } from '../../../hooks/useWorkflows';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import type { Workflow } from '../../../types/workflow';
import type { Platform } from '../../../types/talent';

/** 平台图标映射 */
const PLATFORM_ICONS: Record<Platform, string> = {
  douyin: '🎵',
  xiaohongshu: '📕',
  bilibili: '📺',
  kuaishou: '⚡',
};

/** 格式化执行时间 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
}

/** 执行结果展示 */
function ExecutionResultView({ result }: { result: TaskExecuteResponse }) {
  const summary = result.summary || { total: 0, successful: 0, failed: 0 };
  const results = result.results || [];
  const successRate =
    summary.total > 0
      ? Math.round((summary.successful / summary.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* 执行摘要 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-surface-sunken">
          <div className="text-xs text-content-muted mb-1">执行时间</div>
          <div className="font-medium text-content">
            {result.duration ? formatDuration(result.duration) : '-'}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-surface-sunken">
          <div className="text-xs text-content-muted mb-1">成功率</div>
          <div
            className={`font-medium ${
              successRate === 100
                ? 'text-success-600'
                : successRate >= 50
                  ? 'text-warning-600'
                  : 'text-danger-500'
            }`}
          >
            {successRate}% ({summary.successful}/{summary.total})
          </div>
        </div>
      </div>

      {/* 执行详情 */}
      {results.length > 0 && (
        <Collapse
          ghost
          items={[
            {
              key: 'details',
              label: (
                <span className="text-sm font-medium text-content-secondary">
                  执行详情 ({results.length} 个步骤)
                </span>
              ),
              children: (
                <Timeline
                  className="mt-4"
                  items={results.map((r, index) => ({
                    color: r.success ? 'green' : 'red',
                    dot: r.success ? (
                      <CheckCircleOutlined className="text-success-600" />
                    ) : (
                      <CloseCircleOutlined className="text-danger-500" />
                    ),
                    children: (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          r.success
                            ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                            : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-content text-sm">
                            {r.action}
                          </span>
                          {r.duration !== undefined && (
                            <span className="text-xs text-content-muted">
                              {formatDuration(r.duration)}
                            </span>
                          )}
                        </div>
                        {r.error && (
                          <p className="text-xs text-danger-600 dark:text-danger-400">
                            {r.error}
                          </p>
                        )}
                      </div>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

interface WorkflowExecuteModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 执行完成回调 */
  onComplete?: (result: TaskExecuteResponse) => void;
  /** 预选的工作流 ID */
  workflowId?: string;
  /** 预填的输入值 */
  inputValue?: string;
  /** 限制平台（只显示该平台的工作流） */
  platform?: Platform;
  /** 元数据（传递给执行 API） */
  metadata?: {
    source?: string;
    projectId?: string;
    talentId?: string;
  };
}

export function WorkflowExecuteModal({
  open,
  onClose,
  onComplete,
  workflowId: initialWorkflowId,
  inputValue: initialInputValue,
  platform,
  metadata,
}: WorkflowExecuteModalProps) {
  const { message } = App.useApp();

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = getPlatformNames();
  const platformColors = getPlatformColors();

  // 工作流数据
  const { workflows, loading: loadingWorkflows } = useWorkflows({
    platform,
    activeOnly: true,
  });

  // 状态
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    initialWorkflowId || null
  );
  const [inputValue, setInputValue] = useState(initialInputValue || '');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<TaskExecuteResponse | null>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setSelectedWorkflowId(initialWorkflowId || null);
      setInputValue(initialInputValue || '');
      setResult(null);
    }
  }, [open, initialWorkflowId, initialInputValue]);

  // 当前选中的工作流
  const selectedWorkflow = useMemo(
    () => workflows.find(w => w._id === selectedWorkflowId),
    [workflows, selectedWorkflowId]
  );

  // 输入配置
  const inputConfig = selectedWorkflow?.inputConfig;
  const inputLabel = inputConfig?.label || '参数';
  const inputPlaceholder = inputConfig?.placeholder || '请输入参数值';

  // 执行工作流
  const handleExecute = async () => {
    if (!selectedWorkflowId || !inputValue.trim()) {
      message.warning('请选择工作流并输入参数');
      return;
    }

    try {
      setExecuting(true);
      setResult(null);

      const response = await automationApi.executeTask({
        workflowId: selectedWorkflowId,
        inputValue: inputValue.trim(),
        metadata: {
          source: metadata?.source || 'workflow-execute-modal',
          ...metadata,
        },
      });

      setResult(response);
      onComplete?.(response);

      if (response.success) {
        message.success('任务执行成功');
      } else {
        message.error(response.error || '任务执行失败');
      }
    } catch (error) {
      console.error('Task execution failed:', error);
      message.error('任务执行失败');
    } finally {
      setExecuting(false);
    }
  };

  // 关闭并重置
  const handleClose = () => {
    if (executing) {
      message.warning('任务执行中，请稍候');
      return;
    }
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-primary-600" />
          <span>执行工作流</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={560}
      footer={
        result ? (
          <Button onClick={handleClose}>关闭</Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} disabled={executing}>
              取消
            </Button>
            <Button
              type="primary"
              icon={executing ? <LoadingOutlined /> : <PlayCircleOutlined />}
              onClick={handleExecute}
              loading={executing}
              disabled={!selectedWorkflowId || !inputValue.trim()}
            >
              {executing ? '执行中...' : '执行'}
            </Button>
          </div>
        )
      }
    >
      {loadingWorkflows ? (
        <div className="py-12 text-center">
          <Spin size="large" />
          <p className="mt-4 text-content-secondary">加载工作流列表...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="py-12 text-center">
          <InfoCircleOutlined className="text-4xl text-content-muted mb-4" />
          <p className="text-content-secondary">
            {platform
              ? `该平台暂无可用的工作流`
              : '暂无可用的工作流'}
          </p>
        </div>
      ) : executing ? (
        <div className="py-12 text-center">
          <Spin
            indicator={<LoadingOutlined className="text-4xl text-primary-600" spin />}
          />
          <p className="mt-4 text-content-secondary">正在执行工作流，请稍候...</p>
          <p className="mt-1 text-xs text-content-muted">
            任务执行中，浏览器会自动完成所有操作
          </p>
        </div>
      ) : result ? (
        <div className="space-y-4">
          {/* 执行状态 */}
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${
              result.success
                ? 'bg-success-50 dark:bg-success-900/20'
                : 'bg-danger-50 dark:bg-danger-900/20'
            }`}
          >
            {result.success ? (
              <CheckCircleOutlined className="text-2xl text-success-600" />
            ) : (
              <CloseCircleOutlined className="text-2xl text-danger-500" />
            )}
            <div>
              <div className="font-medium text-content">
                {result.success ? '执行成功' : '执行失败'}
              </div>
              <div className="text-sm text-content-secondary">
                {result.workflowName || selectedWorkflow?.name}
              </div>
            </div>
          </div>

          {/* 执行结果 */}
          <ExecutionResultView result={result} />

          {/* 再次执行 */}
          <div className="pt-4 border-t border-stroke">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => setResult(null)}
            >
              再次执行
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 工作流选择 */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              选择工作流
            </label>
            <Select
              placeholder="请选择工作流"
              value={selectedWorkflowId}
              onChange={setSelectedWorkflowId}
              className="w-full"
              showSearch
              optionFilterProp="label"
              options={workflows.map(w => ({
                value: w._id,
                label: w.name,
                workflow: w,
              }))}
              optionRender={option => {
                const w = option.data.workflow as Workflow;
                return (
                  <div className="flex items-center justify-between py-1">
                    <span>{w.name}</span>
                    <Tag
                      color={platformColors[w.platform] || 'blue'}
                      className="text-xs"
                    >
                      {PLATFORM_ICONS[w.platform]}{' '}
                      {platformNames[w.platform] || w.platform}
                    </Tag>
                  </div>
                );
              }}
            />
            {selectedWorkflow?.description && (
              <p className="mt-1 text-xs text-content-muted">
                {selectedWorkflow.description}
              </p>
            )}
          </div>

          {/* 输入参数 */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              {inputLabel}
            </label>
            <Input
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={!selectedWorkflowId}
              prefix={<DocumentTextIcon className="w-4 h-4 text-content-muted" />}
              onPressEnter={handleExecute}
            />
          </div>

          {/* 工作流信息 */}
          {selectedWorkflow && (
            <div className="p-3 rounded-lg bg-surface-sunken text-sm">
              <div className="flex items-center gap-4 text-content-secondary">
                <div className="flex items-center gap-1">
                  <BoltIcon className="w-4 h-4" />
                  <span>{selectedWorkflow.steps?.length || 0} 个步骤</span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    更新于{' '}
                    {new Date(selectedWorkflow.updatedAt).toLocaleDateString(
                      'zh-CN'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default WorkflowExecuteModal;
