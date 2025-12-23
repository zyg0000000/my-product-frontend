/**
 * ServerStatus 组件
 * 显示 ECS 服务器的运行状态、内存使用和运行时间
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Progress, Tooltip, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  ServerStackIcon,
  SignalIcon,
  SignalSlashIcon,
  ClockIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { automationApi, type ServerStatus as ServerStatusType } from '../../api/automation';

/** 格式化运行时间 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}天 ${hours}小时`;
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

/** 状态指示点样式 */
function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {connected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          connected ? 'bg-success-500' : 'bg-danger-500'
        }`}
      />
    </span>
  );
}

interface ServerStatusProps {
  /** 自动刷新间隔（毫秒），0 表示不自动刷新 */
  refreshInterval?: number;
  /** 状态变化回调 */
  onStatusChange?: (connected: boolean) => void;
}

export function ServerStatus({
  refreshInterval = 30000,
  onStatusChange,
}: ServerStatusProps) {
  const { message } = App.useApp();

  const [status, setStatus] = useState<ServerStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async (showMessage = false) => {
    try {
      setLoading(true);
      const data = await automationApi.getServerStatus();
      setStatus(data);
      setConnected(data.status === 'running');
      setLastUpdated(new Date());
      onStatusChange?.(data.status === 'running');

      if (showMessage) {
        message.success('服务器状态已刷新');
      }
    } catch (error) {
      console.error('Failed to fetch server status:', error);
      setConnected(false);
      onStatusChange?.(false);

      if (showMessage) {
        message.error('无法连接到服务器');
      }
    } finally {
      setLoading(false);
    }
  }, [message, onStatusChange]);

  // 初始加载和自动刷新
  useEffect(() => {
    fetchStatus();

    if (refreshInterval > 0) {
      const interval = setInterval(() => fetchStatus(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, refreshInterval]);

  // 内存使用率
  const memoryPercent = status
    ? Math.round((status.memory.used / status.memory.total) * 100)
    : 0;

  // 内存状态颜色
  const getMemoryColor = (percent: number) => {
    if (percent >= 90) return 'var(--aw-danger-500)';
    if (percent >= 70) return 'var(--aw-warning-500)';
    return 'var(--aw-success-500)';
  };

  return (
    <Card
      className="h-full shadow-card hover:shadow-card-hover transition-shadow duration-200"
      bodyStyle={{ padding: 0 }}
    >
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-stroke flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ServerStackIcon className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-content">服务器状态</span>
        </div>
        <Tooltip title="刷新状态">
          <button
            onClick={() => fetchStatus(true)}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-surface-subtle text-content-secondary hover:text-content transition-colors disabled:opacity-50"
          >
            <ReloadOutlined spin={loading} className="text-sm" />
          </button>
        </Tooltip>
      </div>

      {/* 内容区 */}
      <div className="p-4 space-y-4">
        {/* 连接状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            {connected ? (
              <SignalIcon className="w-4 h-4 text-success-600" />
            ) : (
              <SignalSlashIcon className="w-4 h-4 text-danger-500" />
            )}
            <span>连接状态</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot connected={connected} />
            <span
              className={`text-sm font-medium ${
                connected ? 'text-success-600' : 'text-danger-500'
              }`}
            >
              {connected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>

        {/* 运行时间 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            <ClockIcon className="w-4 h-4" />
            <span>运行时间</span>
          </div>
          <span className="text-sm font-medium text-content">
            {status ? formatUptime(status.uptime) : '-'}
          </span>
        </div>

        {/* 内存使用 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <CpuChipIcon className="w-4 h-4" />
              <span>内存使用</span>
            </div>
            <span className="text-sm font-medium text-content">
              {status
                ? `${status.memory.used}GB / ${status.memory.total}GB`
                : '-'}
            </span>
          </div>
          <Progress
            percent={memoryPercent}
            showInfo={false}
            strokeColor={getMemoryColor(memoryPercent)}
            trailColor="var(--color-bg-sunken)"
            size="small"
          />
        </div>

        {/* 最后更新时间 */}
        {lastUpdated && (
          <div className="pt-2 border-t border-stroke">
            <span className="text-xs text-content-muted">
              最后更新: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ServerStatus;
