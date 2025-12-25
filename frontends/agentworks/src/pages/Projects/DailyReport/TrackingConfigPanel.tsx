/**
 * 追踪配置面板
 *
 * 功能：
 * - 启用/停用项目追踪
 * - 设置追踪状态（active/archived）
 * - 配置基准 CPM
 */

import { useState, useEffect } from 'react';
import { Switch, InputNumber, Button, App, Tag, Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type {
  TrackingConfig,
  TrackingStatus,
  TrackingVersion,
} from '../../../types/dailyReport';
import {
  TRACKING_STATUS_LABELS,
  TRACKING_STATUS_COLORS,
  TRACKING_VERSION_LABELS,
} from '../../../types/dailyReport';
import { updateTrackingConfig as updateTrackingConfigApi } from '../../../api/dailyReport';

interface TrackingConfigPanelProps {
  projectId: string;
  projectName?: string;
  initialConfig?: TrackingConfig;
  onConfigChange?: (config: TrackingConfig) => void;
}

export function TrackingConfigPanel({
  projectId,
  initialConfig,
  onConfigChange,
}: TrackingConfigPanelProps) {
  const { message } = App.useApp();

  // 配置状态
  const [config, setConfig] = useState<TrackingConfig>({
    status: 'disabled',
    version: 'standard',
    benchmarkCPM: 30,
    ...initialConfig,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 加载配置
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  // 更新配置字段
  const updateField = <K extends keyof TrackingConfig>(
    field: K,
    value: TrackingConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // 切换追踪状态
  const handleToggleTracking = (enabled: boolean) => {
    updateField('status', enabled ? 'active' : 'disabled');
  };

  // 切换归档状态
  const handleToggleArchive = () => {
    const newStatus: TrackingStatus =
      config.status === 'archived' ? 'active' : 'archived';
    updateField('status', newStatus);
  };

  // 切换日报版本
  const handleVersionChange = (e: RadioChangeEvent) => {
    updateField('version', e.target.value as TrackingVersion);
  };

  // 是否已选择版本（选择后不可更改）
  const isVersionLocked = !!initialConfig?.version;

  // 保存配置
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateTrackingConfigApi(projectId, config);
      if (response.success) {
        message.success('追踪配置已保存');
        setHasChanges(false);
        onConfigChange?.(config);
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = config.status !== 'disabled';
  const isArchived = config.status === 'archived';

  return (
    <div className="py-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 追踪状态卡片 */}
        <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  isEnabled
                    ? 'bg-[var(--aw-success-50)]'
                    : 'bg-[var(--aw-gray-100)]'
                }`}
              >
                {isEnabled ? (
                  <CheckCircleOutlined
                    className="text-2xl"
                    style={{ color: 'var(--aw-success-600)' }}
                  />
                ) : (
                  <PauseCircleOutlined
                    className="text-2xl"
                    style={{ color: 'var(--aw-gray-400)' }}
                  />
                )}
              </div>
              <div>
                <h3 className="font-medium text-[var(--aw-gray-900)]">
                  日报追踪
                </h3>
                <p className="text-sm text-[var(--aw-gray-500)]">
                  {isEnabled
                    ? '已启用，将自动采集和展示项目数据'
                    : '未启用，开启后可追踪项目效果'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEnabled && (
                <Tag color={TRACKING_STATUS_COLORS[config.status]}>
                  {TRACKING_STATUS_LABELS[config.status]}
                </Tag>
              )}
              <Switch
                checked={isEnabled}
                onChange={handleToggleTracking}
                loading={saving}
              />
            </div>
          </div>

          {/* 日报版本选择（仅当启用时显示） */}
          {isEnabled && (
            <div className="mt-4 pt-4 border-t border-[var(--aw-gray-200)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileTextOutlined className="text-[var(--aw-primary-600)]" />
                  <div>
                    <span className="text-sm text-[var(--aw-gray-700)]">
                      日报版本
                    </span>
                    <p className="text-xs text-[var(--aw-gray-500)] mt-0.5">
                      {isVersionLocked
                        ? '版本已锁定，不可更改'
                        : '选择后不可更改，请谨慎选择'}
                    </p>
                  </div>
                </div>
                <Radio.Group
                  value={config.version || 'standard'}
                  onChange={handleVersionChange}
                  disabled={isVersionLocked}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="standard">
                    {TRACKING_VERSION_LABELS.standard}
                  </Radio.Button>
                  <Radio.Button value="joint">
                    {TRACKING_VERSION_LABELS.joint}
                  </Radio.Button>
                </Radio.Group>
              </div>
            </div>
          )}

          {/* 归档选项（仅当启用时显示） */}
          {isEnabled && (
            <div className="mt-4 pt-4 border-t border-[var(--aw-gray-200)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[var(--aw-gray-700)]">
                    归档项目
                  </span>
                  <p className="text-xs text-[var(--aw-gray-500)] mt-0.5">
                    归档后将停止自动抓取，但保留历史数据
                  </p>
                </div>
                <Button
                  size="small"
                  type={isArchived ? 'primary' : 'default'}
                  onClick={handleToggleArchive}
                >
                  {isArchived ? '取消归档' : '归档'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 追踪配置（仅当启用时显示） */}
        {isEnabled && (
          <>
            {/* 基准 CPM 设置 */}
            <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <SettingOutlined className="text-[var(--aw-primary-600)]" />
                <h4 className="font-medium text-[var(--aw-gray-800)]">
                  效果基准配置
                </h4>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[var(--aw-gray-700)]">
                      基准 CPM
                    </span>
                    <p className="text-xs text-[var(--aw-gray-500)] mt-0.5">
                      低于此值视为「符合预期」，高于此值视为「暂不符合」
                    </p>
                  </div>
                  <InputNumber
                    value={config.benchmarkCPM}
                    onChange={v =>
                      updateField('benchmarkCPM', v ?? config.benchmarkCPM)
                    }
                    onBlur={() => {
                      // 失焦时如果为空，恢复默认值
                      if (!config.benchmarkCPM || config.benchmarkCPM < 1) {
                        updateField('benchmarkCPM', 30);
                      }
                    }}
                    min={1}
                    max={1000}
                    step={5}
                    addonAfter="元"
                    style={{ width: 140 }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* 保存按钮 */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              size="large"
            >
              保存配置
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackingConfigPanel;
