/**
 * SessionManager 组件
 * 显示抖音 Cookie 状态，提供 Cookie 上传功能
 *
 * @version 1.1.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Tooltip, App } from 'antd';
import {
  ReloadOutlined,
  UploadOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  KeyIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { automationApi, type CookieStatus } from '../../api/automation';

/** Cookie 状态类型 */
type CookieState = 'valid' | 'expiring' | 'expired' | 'unknown';

/** 获取 Cookie 状态 */
function getCookieState(status: CookieStatus | null): CookieState {
  if (!status) return 'unknown';
  if (!status.valid) return 'expired';
  if (status.daysUntilExpiry !== undefined && status.daysUntilExpiry <= 7) {
    return 'expiring';
  }
  return 'valid';
}

/** 状态配置 */
const stateConfig: Record<
  CookieState,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  valid: {
    label: '有效',
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    icon: ShieldCheckIcon,
  },
  expiring: {
    label: '即将过期',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    icon: ExclamationTriangleIcon,
  },
  expired: {
    label: '已过期',
    color: 'text-danger-500',
    bgColor: 'bg-danger-50',
    icon: ShieldExclamationIcon,
  },
  unknown: {
    label: '未知',
    color: 'text-content-muted',
    bgColor: 'bg-surface-sunken',
    icon: KeyIcon,
  },
};

interface SessionManagerProps {
  /** 自动刷新间隔（毫秒），0 表示不自动刷新 */
  refreshInterval?: number;
  /** Cookie 状态变化回调 */
  onStatusChange?: (valid: boolean) => void;
}

export function SessionManager({
  refreshInterval = 60000,
  onStatusChange,
}: SessionManagerProps) {
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchStatus = useCallback(
    async (showMessage = false) => {
      try {
        setLoading(true);
        const data = await automationApi.getCookieStatus();
        setStatus(data);
        onStatusChange?.(data.valid);

        if (showMessage) {
          message.success('Cookie 状态已刷新');
        }
      } catch (error) {
        console.error('Failed to fetch cookie status:', error);
        setStatus(null);
        onStatusChange?.(false);

        // 只有手动刷新时才显示错误
        if (showMessage) {
          message.error('获取 Cookie 状态失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [message, onStatusChange]
  );

  // 初始加载和自动刷新
  useEffect(() => {
    fetchStatus();

    if (refreshInterval > 0) {
      const interval = setInterval(() => fetchStatus(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, refreshInterval]);

  // 处理文件上传
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 重置 input 以便可以再次选择同一文件
    event.target.value = '';

    // 验证文件类型
    if (!file.name.endsWith('.json')) {
      message.error('请选择 JSON 格式的 Cookie 文件');
      return;
    }

    try {
      setUploading(true);

      // 读取文件内容
      const text = await file.text();
      const cookies = JSON.parse(text);

      // 验证是否为数组
      if (!Array.isArray(cookies)) {
        throw new Error('Cookie 文件格式错误：应为数组');
      }

      // 上传到 ECS
      const result = await automationApi.uploadCookie(cookies);

      if (result.success) {
        message.success(`Cookie 上传成功！有效期 ${result.daysUntilExpiry} 天`);
        // 刷新状态
        fetchStatus();
      } else {
        throw new Error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('Cookie upload failed:', error);
      message.error(error instanceof Error ? error.message : 'Cookie 上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 触发文件选择
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const cookieState = getCookieState(status);
  const config = stateConfig[cookieState];
  const StateIcon = config.icon;

  return (
    <Card
      className="h-full shadow-card hover:shadow-card-hover transition-shadow duration-200"
      bodyStyle={{ padding: 0 }}
    >
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-stroke flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-content">会话状态</span>
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
        {/* 状态指示 */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}
          >
            <StateIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <div className={`text-lg font-semibold ${config.color}`}>
              {config.label}
            </div>
            <div className="text-sm text-content-secondary">
              {status?.valid ? '抖音登录凭证' : '需要重新登录'}
            </div>
          </div>
        </div>

        {/* 过期时间 */}
        {status?.valid && status.daysUntilExpiry !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken">
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <CalendarDaysIcon className="w-4 h-4" />
              <span>剩余有效期</span>
            </div>
            <span
              className={`text-sm font-semibold ${
                status.daysUntilExpiry <= 7
                  ? 'text-warning-600'
                  : 'text-success-600'
              }`}
            >
              {status.daysUntilExpiry} 天
            </span>
          </div>
        )}

        {/* 过期提示或操作按钮 */}
        {cookieState === 'expired' && (
          <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
            <p className="text-sm text-danger-600">
              登录凭证已过期，请在本地运行登录脚本后上传新的 Cookie 文件。
            </p>
          </div>
        )}

        {cookieState === 'expiring' && (
          <div className="p-3 rounded-lg bg-warning-50 border border-warning-200">
            <p className="text-sm text-warning-700">
              登录凭证即将过期，建议尽快刷新 Cookie。
            </p>
          </div>
        )}

        {/* 隐藏的文件输入框 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* 上传按钮 - 当 Cookie 过期或即将过期时显示 */}
        {(cookieState === 'expired' || cookieState === 'expiring') && (
          <Button
            type={cookieState === 'expired' ? 'primary' : 'default'}
            icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
            onClick={handleUploadClick}
            loading={uploading}
            block
            className="mt-2"
          >
            {uploading ? '上传中...' : '上传 Cookie 文件'}
          </Button>
        )}

        {/* 使用说明 */}
        {(cookieState === 'expired' || cookieState === 'expiring') && (
          <div className="mt-3 p-3 rounded-lg bg-surface-sunken">
            <p className="text-xs text-content-muted">
              <strong>刷新步骤：</strong>
              <br />
              1. 在本地运行{' '}
              <code className="text-primary-600">node refresh-cookie.js</code>
              <br />
              2. 在浏览器中完成登录
              <br />
              3. 脚本会自动上传 Cookie 到服务器
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default SessionManager;
