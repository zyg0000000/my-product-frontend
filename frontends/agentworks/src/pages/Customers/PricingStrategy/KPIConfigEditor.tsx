/**
 * 客户级 KPI 配置编辑器（按平台）
 *
 * @version 2.0.0
 * @description 用于配置客户各平台的 KPI 考核设置，每个平台独立配置启用的指标和默认目标值
 */

import { useState } from 'react';
import {
  Switch,
  InputNumber,
  Card,
  Empty,
  Tooltip,
  Tag,
  Tabs,
  Badge,
} from 'antd';
import {
  QuestionCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type {
  PlatformKPIConfig,
  PlatformKPIConfigs,
} from '../../../types/customer';

/**
 * KPI 元数据定义
 */
interface KPIMetadata {
  key: string;
  name: string;
  unit: string;
  description: string;
  targetDirection: 'lower_better' | 'higher_better';
}

/**
 * 可用的 KPI 指标列表（硬编码）
 */
const AVAILABLE_KPIS: KPIMetadata[] = [
  {
    key: 'cpm',
    name: 'CPM',
    unit: '元',
    description: '千次播放成本',
    targetDirection: 'lower_better',
  },
  {
    key: 'cpe',
    name: 'CPE',
    unit: '元',
    description: '单次互动成本',
    targetDirection: 'lower_better',
  },
  {
    key: 'cpc',
    name: 'CPC',
    unit: '元',
    description: '单次点击成本',
    targetDirection: 'lower_better',
  },
  {
    key: 'roi',
    name: 'ROI',
    unit: '%',
    description: '投资回报率',
    targetDirection: 'higher_better',
  },
];

interface EnabledPlatform {
  platform: string;
  name: string;
}

interface KPIConfigEditorProps {
  /** 启用的平台列表 */
  enabledPlatforms: EnabledPlatform[];
  /** 当前配置值 */
  value?: PlatformKPIConfigs;
  /** 配置变化回调 */
  onChange?: (config: PlatformKPIConfigs) => void;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 获取平台名称 */
  getPlatformName?: (platform: string) => string;
}

/**
 * 默认单平台 KPI 配置
 */
const DEFAULT_PLATFORM_KPI_CONFIG: PlatformKPIConfig = {
  enabled: false,
  enabledKPIs: [],
  defaultTargets: {},
};

export function KPIConfigEditor({
  enabledPlatforms,
  value = {},
  onChange,
  readOnly = false,
  getPlatformName,
}: KPIConfigEditorProps) {
  const [activePlatform, setActivePlatform] = useState<string>(
    enabledPlatforms[0]?.platform || ''
  );

  // 使用硬编码的 KPI 列表
  const availableKPIs = AVAILABLE_KPIS;

  // 获取当前平台的配置
  const getCurrentPlatformConfig = (platform: string): PlatformKPIConfig => {
    return value[platform] || { ...DEFAULT_PLATFORM_KPI_CONFIG };
  };

  // 更新某个平台的配置
  const updatePlatformConfig = (
    platform: string,
    config: PlatformKPIConfig
  ) => {
    onChange?.({
      ...value,
      [platform]: config,
    });
  };

  // 处理平台总开关变化
  const handleEnabledChange = (platform: string, enabled: boolean) => {
    const currentConfig = getCurrentPlatformConfig(platform);
    updatePlatformConfig(platform, {
      ...currentConfig,
      enabled,
      // 如果关闭，清空启用的 KPI 列表
      enabledKPIs: enabled ? currentConfig.enabledKPIs : [],
      defaultTargets: enabled ? currentConfig.defaultTargets : {},
    });
  };

  // 处理单个 KPI 启用/禁用
  const handleKPIToggle = (
    platform: string,
    kpiKey: string,
    checked: boolean
  ) => {
    const currentConfig = getCurrentPlatformConfig(platform);
    const newEnabledKPIs = checked
      ? [...currentConfig.enabledKPIs, kpiKey]
      : currentConfig.enabledKPIs.filter(k => k !== kpiKey);

    // 如果禁用某个 KPI，同时清除其默认目标值
    const newDefaultTargets = { ...currentConfig.defaultTargets };
    if (!checked) {
      delete newDefaultTargets[kpiKey];
    }

    updatePlatformConfig(platform, {
      ...currentConfig,
      enabledKPIs: newEnabledKPIs,
      defaultTargets: newDefaultTargets,
    });
  };

  // 处理默认目标值变化
  const handleTargetChange = (
    platform: string,
    kpiKey: string,
    targetValue: number | null
  ) => {
    const currentConfig = getCurrentPlatformConfig(platform);
    const newDefaultTargets = { ...currentConfig.defaultTargets };
    if (targetValue === null || targetValue === undefined) {
      delete newDefaultTargets[kpiKey];
    } else {
      newDefaultTargets[kpiKey] = targetValue;
    }

    updatePlatformConfig(platform, {
      ...currentConfig,
      defaultTargets: newDefaultTargets,
    });
  };

  // 获取 KPI 方向指示图标
  const getDirectionIcon = (direction: 'lower_better' | 'higher_better') => {
    if (direction === 'lower_better') {
      return (
        <Tooltip title="越低越好">
          <ArrowDownOutlined className="text-green-500" />
        </Tooltip>
      );
    }
    return (
      <Tooltip title="越高越好">
        <ArrowUpOutlined className="text-blue-500" />
      </Tooltip>
    );
  };

  // 渲染单个平台的 KPI 配置
  const renderPlatformKPIConfig = (platform: string) => {
    const config = getCurrentPlatformConfig(platform);

    return (
      <div className="space-y-4">
        {/* 平台总开关 */}
        <div className="flex items-center justify-between p-4 bg-surface-base rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium text-content">启用 KPI 考核</span>
            <Tooltip title="启用后，该平台的项目需要配置 KPI 目标值，用于交付效果评估">
              <QuestionCircleOutlined className="text-content-muted" />
            </Tooltip>
          </div>
          {readOnly ? (
            <Tag color={config.enabled ? 'green' : 'default'}>
              {config.enabled ? '已启用' : '未启用'}
            </Tag>
          ) : (
            <Switch
              checked={config.enabled}
              onChange={enabled => handleEnabledChange(platform, enabled)}
              checkedChildren="开"
              unCheckedChildren="关"
            />
          )}
        </div>

        {/* KPI 指标列表 */}
        {config.enabled && (
          <div className="space-y-3">
            <div className="text-sm text-content-secondary mb-2">
              选择该平台需要考核的 KPI
              指标，并设置默认目标值（项目创建时可覆盖）
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableKPIs.map(kpi => {
                const isEnabled = config.enabledKPIs.includes(kpi.key);
                const targetValue = config.defaultTargets?.[kpi.key];

                return (
                  <Card
                    key={kpi.key}
                    size="small"
                    className={`transition-all ${
                      isEnabled
                        ? 'border-primary-300 bg-primary-50/30'
                        : 'border-stroke bg-surface-base/50'
                    }`}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {readOnly ? (
                          <Tag color={isEnabled ? 'blue' : 'default'}>
                            {isEnabled ? '已启用' : '未启用'}
                          </Tag>
                        ) : (
                          <Switch
                            size="small"
                            checked={isEnabled}
                            onChange={checked =>
                              handleKPIToggle(platform, kpi.key, checked)
                            }
                          />
                        )}
                        <span
                          className={`font-semibold ${isEnabled ? 'text-content' : 'text-content-secondary'}`}
                        >
                          {kpi.name}
                        </span>
                        {getDirectionIcon(kpi.targetDirection)}
                      </div>
                      <span className="text-xs text-content-muted">{kpi.unit}</span>
                    </div>

                    <div className="text-xs text-content-secondary mb-3">
                      {kpi.description}
                    </div>

                    {isEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-content-secondary whitespace-nowrap">
                          默认目标:
                        </span>
                        {readOnly ? (
                          <span className="font-medium text-content">
                            {targetValue !== undefined
                              ? `${targetValue} ${kpi.unit}`
                              : '未设置'}
                          </span>
                        ) : (
                          <InputNumber
                            size="small"
                            value={targetValue}
                            onChange={val =>
                              handleTargetChange(platform, kpi.key, val)
                            }
                            placeholder="可选"
                            min={0}
                            precision={kpi.unit === '%' ? 1 : 2}
                            suffix={kpi.unit}
                            className="flex-1"
                            style={{ maxWidth: 150 }}
                          />
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 未启用时的提示 */}
        {!config.enabled && (
          <div className="text-center py-6 text-content-muted bg-surface-base/50 rounded-lg">
            {readOnly
              ? '该平台未启用 KPI 考核'
              : '启用 KPI 考核后，可选择考核指标并设置默认目标值'}
          </div>
        )}
      </div>
    );
  };

  // 计算每个平台启用的 KPI 数量
  const getEnabledKPICount = (platform: string): number => {
    const config = value[platform];
    if (!config?.enabled) return 0;
    return config.enabledKPIs?.length || 0;
  };

  if (availableKPIs.length === 0) {
    return (
      <Empty
        description="暂无可用的 KPI 指标"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (enabledPlatforms.length === 0) {
    return (
      <Empty description="请先配置平台" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  }

  // 生成平台 Tab 项
  const platformTabItems = enabledPlatforms.map(p => {
    const kpiCount = getEnabledKPICount(p.platform);
    const config = value[p.platform];
    const isEnabled = config?.enabled;

    return {
      key: p.platform,
      label: (
        <span className="flex items-center gap-2">
          {getPlatformName?.(p.platform) || p.name}
          {isEnabled && kpiCount > 0 && (
            <Badge count={kpiCount} size="small" color="blue" />
          )}
          {isEnabled && kpiCount === 0 && (
            <Tag color="orange" className="text-xs ml-1">
              已启用
            </Tag>
          )}
        </span>
      ),
      children: renderPlatformKPIConfig(p.platform),
    };
  });

  return (
    <div className="space-y-4">
      <div className="text-sm text-content-secondary mb-4">
        按平台配置 KPI 考核指标，每个平台可以独立设置不同的考核要求
      </div>

      <Tabs
        activeKey={activePlatform}
        onChange={setActivePlatform}
        type="card"
        items={platformTabItems}
      />
    </div>
  );
}

export default KPIConfigEditor;
