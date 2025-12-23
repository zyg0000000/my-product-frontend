/**
 * WorkflowExecutor 组件
 * 工作流选择、执行和结果展示
 *
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Input,
  Button,
  Tag,
  Collapse,
  Timeline,
  Empty,
  Spin,
  App,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  BoltIcon,
  DocumentTextIcon,
  PhotoIcon,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  automationApi,
  type EcsWorkflow,
  type TaskExecuteResponse,
  type ActionResult,
} from '../../api/automation';

/** 输入类型配置 */
const inputTypeConfig: Record<
  string,
  { label: string; placeholder: string; icon: React.ComponentType<{ className?: string }> }
> = {
  xingtuId: {
    label: '星图ID',
    placeholder: '请输入星图达人ID',
    icon: DocumentTextIcon,
  },
  taskId: {
    label: '星图任务ID',
    placeholder: '请输入星图任务ID',
    icon: ClipboardDocumentListIcon,
  },
  videoId: {
    label: '视频ID',
    placeholder: '请输入抖音视频ID',
    icon: PhotoIcon,
  },
  url: {
    label: 'URL',
    placeholder: '请输入完整URL地址',
    icon: DocumentTextIcon,
  },
};

/** 格式化执行时间 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
}

/** 动作结果项 */
function ActionResultItem({ result }: { result: ActionResult }) {
  const isSuccess = result.success;

  return (
    <div
      className={`p-3 rounded-lg border ${
        isSuccess
          ? 'bg-success-50 border-success-200'
          : 'bg-danger-50 border-danger-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircleOutlined className="text-success-600" />
          ) : (
            <CloseCircleOutlined className="text-danger-500" />
          )}
          <span className="font-medium text-content">{result.action}</span>
        </div>
        {result.duration !== undefined && (
          <span className="text-xs text-content-muted">
            {formatDuration(result.duration)}
          </span>
        )}
      </div>
      {result.error && (
        <p className="text-sm text-danger-600 mt-1">{result.error}</p>
      )}
      {result.data !== undefined && result.data !== null && (
        <pre className="text-xs text-content-secondary mt-2 p-2 bg-surface-base rounded overflow-x-auto">
          {JSON.stringify(result.data as Record<string, unknown>, null, 2)}
        </pre>
      )}
    </div>
  );
}

/** 执行结果面板 */
function ExecutionResult({ result }: { result: TaskExecuteResponse }) {
  const summary = result.summary || { total: 0, successful: 0, failed: 0 };
  const results = result.results || [];
  const successRate = summary.total > 0
    ? Math.round((summary.successful / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* 执行摘要 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-surface-sunken">
          <div className="text-xs text-content-muted mb-1">工作流</div>
          <div className="font-medium text-content truncate">
            {result.workflowName || result.workflowId || '-'}
          </div>
        </div>
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
            {successRate}%
          </div>
        </div>
        <div className="p-3 rounded-lg bg-surface-sunken">
          <div className="text-xs text-content-muted mb-1">步骤完成</div>
          <div className="font-medium text-content">
            {summary.successful}/{summary.total}
          </div>
        </div>
      </div>

      {/* 执行时间线 */}
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
                      <ActionResultItem key={index} result={r} />
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

interface WorkflowExecutorProps {
  /** 是否禁用（如服务器离线） */
  disabled?: boolean;
  /** 执行完成回调 */
  onExecutionComplete?: (result: TaskExecuteResponse) => void;
}

export function WorkflowExecutor({
  disabled = false,
  onExecutionComplete,
}: WorkflowExecutorProps) {
  const { message } = App.useApp();

  // 工作流列表（来自 ECS API）
  const [workflows, setWorkflows] = useState<EcsWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);

  // 选中的工作流和输入
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  // 执行状态
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<TaskExecuteResponse | null>(null);

  // 加载工作流列表 - 当服务器连接成功时触发
  useEffect(() => {
    // 只有服务器在线时才加载工作流
    if (disabled) {
      setLoadingWorkflows(false);
      setWorkflows([]);
      return;
    }

    const fetchWorkflows = async () => {
      try {
        setLoadingWorkflows(true);
        const workflows = await automationApi.getWorkflows();
        setWorkflows(workflows);
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
        // 静默失败，不显示错误提示（服务器状态卡片已经显示离线）
      } finally {
        setLoadingWorkflows(false);
      }
    };

    fetchWorkflows();
  }, [disabled]);

  // 当前选中的工作流
  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);
  const inputType = currentWorkflow?.requiredInput || 'xingtuId';
  const inputConfig = inputTypeConfig[inputType] || inputTypeConfig.xingtuId;
  const InputIcon = inputConfig.icon;

  // 执行工作流
  const handleExecute = async () => {
    if (!selectedWorkflow || !inputValue.trim()) {
      message.warning('请选择工作流并输入参数');
      return;
    }

    try {
      setExecuting(true);
      setExecutionResult(null);

      const result = await automationApi.executeTask({
        workflowId: selectedWorkflow,
        inputValue: inputValue.trim(),
        metadata: {
          source: 'agentworks-dashboard',
        },
      });

      setExecutionResult(result);
      onExecutionComplete?.(result);

      if (result.success) {
        message.success('任务执行成功');
      } else {
        message.error(result.error || '任务执行失败');
      }
    } catch (error) {
      console.error('Task execution failed:', error);
      message.error('任务执行失败');
    } finally {
      setExecuting(false);
    }
  };

  // 清空结果
  const handleClear = () => {
    setExecutionResult(null);
    setInputValue('');
  };

  return (
    <Card
      className="shadow-card"
      title={
        <div className="flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-primary-600" />
          <span>工作流执行</span>
        </div>
      }
      extra={
        executionResult && (
          <Button size="small" onClick={handleClear}>
            清空结果
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* 工作流选择和输入 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 工作流选择 */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              选择工作流
            </label>
            <Select
              placeholder="请选择工作流"
              value={selectedWorkflow}
              onChange={setSelectedWorkflow}
              loading={loadingWorkflows}
              disabled={disabled || executing}
              className="w-full"
              options={workflows.map(w => ({
                value: w.id,
                label: (
                  <div className="flex items-center justify-between">
                    <span>{w.name}</span>
                    {w.requiredInput && (
                      <Tag className="ml-2" color="blue">
                        {inputTypeConfig[w.requiredInput]?.label || w.inputLabel || w.requiredInput}
                      </Tag>
                    )}
                  </div>
                ),
              }))}
            />
            {currentWorkflow?.description && (
              <p className="mt-1 text-xs text-content-muted">
                {currentWorkflow.description}
              </p>
            )}
          </div>

          {/* 输入值 */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              {inputConfig.label}
            </label>
            <Input
              placeholder={inputConfig.placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={disabled || executing || !selectedWorkflow}
              prefix={<InputIcon className="w-4 h-4 text-content-muted" />}
              onPressEnter={handleExecute}
            />
          </div>

          {/* 执行按钮 */}
          <div className="flex items-end">
            <Button
              type="primary"
              icon={executing ? <LoadingOutlined /> : <PlayCircleOutlined />}
              onClick={handleExecute}
              loading={executing}
              disabled={disabled || !selectedWorkflow || !inputValue.trim()}
              className="w-full lg:w-auto"
              size="large"
            >
              {executing ? '执行中...' : '执行工作流'}
            </Button>
          </div>
        </div>

        {/* 执行状态指示 */}
        {executing && (
          <div className="flex items-center justify-center py-8 bg-surface-sunken rounded-lg">
            <div className="text-center">
              <Spin
                indicator={<LoadingOutlined className="text-3xl text-primary-600" spin />}
              />
              <p className="mt-3 text-content-secondary">
                正在执行工作流，请稍候...
              </p>
              <p className="mt-1 text-xs text-content-muted">
                任务执行中，浏览器会自动完成所有操作
              </p>
            </div>
          </div>
        )}

        {/* 执行结果 */}
        {executionResult && !executing && (
          <div className="pt-4 border-t border-stroke">
            <div className="flex items-center gap-2 mb-4">
              {executionResult.success ? (
                <CheckCircleOutlined className="text-lg text-success-600" />
              ) : (
                <CloseCircleOutlined className="text-lg text-danger-500" />
              )}
              <span className="font-medium text-content">
                {executionResult.success ? '执行成功' : '执行失败'}
              </span>
              <span className="text-sm text-content-muted">
                ({new Date(executionResult.endTime).toLocaleTimeString()})
              </span>
            </div>
            <ExecutionResult result={executionResult} />
          </div>
        )}

        {/* 空状态 */}
        {!executing && !executionResult && workflows.length === 0 && !loadingWorkflows && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无可用工作流"
          />
        )}

        {/* 使用提示 */}
        {!executing && !executionResult && workflows.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary-50 border border-primary-200">
            <ChevronRightIcon className="w-5 h-5 text-primary-600 mt-0.5" />
            <div className="text-sm text-primary-700">
              <p className="font-medium mb-1">使用说明</p>
              <ol className="list-decimal list-inside space-y-1 text-primary-600">
                <li>选择要执行的工作流</li>
                <li>输入对应的参数（如星图ID）</li>
                <li>点击「执行工作流」按钮</li>
                <li>等待执行完成，查看结果</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default WorkflowExecutor;
