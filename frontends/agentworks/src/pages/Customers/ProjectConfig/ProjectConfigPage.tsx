/**
 * 客户项目配置管理页面
 * 路径：/customers/:id/project-config
 *
 * 功能：
 * - Tab 显示配置（控制项目详情页显示哪些 Tab）
 * - 效果验收配置（配置效果指标和基准值）
 * - 预留执行追踪、财务配置的扩展点
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Tabs, App, Button, Spin, Empty, Switch, Alert } from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  LineChartOutlined,
  ScheduleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { customerApi } from '../../../services/customerApi';
import { TabVisibilityEditor } from './TabVisibilityEditor';
import { EffectConfigEditor } from './EffectConfigEditor';
import type { CustomerProjectConfig } from '../../../types/projectConfig';
import { DEFAULT_PROJECT_CONFIG } from '../../../types/projectConfig';
import type { Customer } from '../../../types/customer';

export function ProjectConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [config, setConfig] = useState<CustomerProjectConfig>(
    DEFAULT_PROJECT_CONFIG
  );
  const [activeTab, setActiveTab] = useState('tabs');

  // 加载客户数据
  const loadCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await customerApi.getCustomerById(id);
      if (response.success && response.data) {
        setCustomer(response.data);
        // 合并现有配置和默认配置
        const existingConfig = response.data.projectConfig;
        if (existingConfig) {
          setConfig({
            ...DEFAULT_PROJECT_CONFIG,
            ...existingConfig,
            tabVisibility: {
              ...DEFAULT_PROJECT_CONFIG.tabVisibility,
              ...existingConfig.tabVisibility,
            },
            effectConfig: existingConfig.effectConfig
              ? {
                  enabledPeriods:
                    existingConfig.effectConfig.enabledPeriods ||
                    DEFAULT_PROJECT_CONFIG.effectConfig!.enabledPeriods,
                  enabledMetrics:
                    existingConfig.effectConfig.enabledMetrics ||
                    DEFAULT_PROJECT_CONFIG.effectConfig!.enabledMetrics,
                  benchmarks: {
                    ...DEFAULT_PROJECT_CONFIG.effectConfig!.benchmarks,
                    ...existingConfig.effectConfig.benchmarks,
                  },
                  customMetrics: existingConfig.effectConfig.customMetrics,
                }
              : DEFAULT_PROJECT_CONFIG.effectConfig,
          });
        } else {
          setConfig(DEFAULT_PROJECT_CONFIG);
        }
      }
    } catch {
      message.error('加载客户信息失败');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  // 保存配置
  const handleSave = async () => {
    // 验证：至少保留一个 Tab
    const enabledTabs = Object.values(config.tabVisibility).filter(Boolean);
    if (enabledTabs.length === 0) {
      message.warning('至少需要保留一个可见的 Tab');
      return;
    }

    // 验证：效果验收开启时需要有周期和指标
    if (config.tabVisibility.effect && config.effectConfig) {
      if (config.effectConfig.enabledPeriods.length === 0) {
        message.warning('效果验收需要至少一个数据周期');
        return;
      }
      if (config.effectConfig.enabledMetrics.length === 0) {
        message.warning('效果验收需要至少一个效果指标');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await customerApi.updateCustomer(id!, {
        projectConfig: {
          ...config,
          updatedAt: new Date().toISOString(),
        },
      });
      if (response.success) {
        message.success('配置保存成功');
        loadCustomer();
      } else {
        message.error('保存失败');
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 启用/禁用配置
  const handleToggleEnabled = (enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin tip="加载中..." />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <Empty description="客户不存在" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'tabs',
      label: (
        <span className="flex items-center gap-1">
          <EyeOutlined />
          Tab 显示配置
        </span>
      ),
      children: (
        <TabVisibilityEditor
          value={config.tabVisibility}
          onChange={tabVisibility =>
            setConfig(prev => ({ ...prev, tabVisibility }))
          }
          disabled={!config.enabled}
        />
      ),
    },
    {
      key: 'effect',
      label: (
        <span className="flex items-center gap-1">
          <LineChartOutlined />
          效果验收配置
        </span>
      ),
      children: (
        <EffectConfigEditor
          value={config.effectConfig}
          onChange={effectConfig =>
            setConfig(prev => ({ ...prev, effectConfig }))
          }
          disabled={!config.enabled || !config.tabVisibility.effect}
        />
      ),
    },
    {
      key: 'execution',
      label: (
        <span className="flex items-center gap-1">
          <ScheduleOutlined />
          执行追踪配置
          <span className="ml-1 text-xs text-gray-400">（开发中）</span>
        </span>
      ),
      children: (
        <div className="py-12 text-center text-gray-400">
          <ScheduleOutlined className="text-4xl mb-4" />
          <div>执行追踪配置功能开发中...</div>
        </div>
      ),
    },
    {
      key: 'finance',
      label: (
        <span className="flex items-center gap-1">
          <DollarOutlined />
          财务管理配置
          <span className="ml-1 text-xs text-gray-400">（开发中）</span>
        </span>
      ),
      children: (
        <div className="py-12 text-center text-gray-400">
          <DollarOutlined className="text-4xl mb-4" />
          <div>财务管理配置功能开发中...</div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 m-0">
              项目配置管理
            </h1>
            <p className="text-sm text-gray-500 m-0 mt-1">
              客户：{customer.name}（{customer.code}）
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button icon={<CloseOutlined />} onClick={() => navigate(-1)}>
            取消
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存配置
          </Button>
        </div>
      </div>

      {/* 启用开关 */}
      <Card className="shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              启用自定义项目配置
            </h3>
            <p className="text-sm text-gray-500 m-0">
              启用后，该客户的项目详情页将使用以下自定义配置；关闭则使用系统默认配置
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onChange={handleToggleEnabled}
            checkedChildren="开"
            unCheckedChildren="关"
          />
        </div>
      </Card>

      {!config.enabled && (
        <Alert
          message="当前使用系统默认配置"
          description="启用自定义配置后，可以控制项目详情页显示的 Tab 和效果验收的指标列"
          type="info"
          showIcon
        />
      )}

      {/* 配置内容 */}
      <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{ marginBottom: 0, padding: '0 16px' }}
        />
      </Card>
    </div>
  );
}

export default ProjectConfigPage;
