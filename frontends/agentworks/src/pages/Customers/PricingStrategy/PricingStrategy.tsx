/**
 * 业务策略中心页面 (v5.1)
 * 支持多时间段定价配置
 *
 * v5.1 变更：
 * - 支持每个平台配置多个时间段的定价策略
 * - 使用 PricingConfigList 组件管理配置列表
 * - 配置状态标记（当前生效/即将生效/已过期）
 *
 * v5.0 变更：
 * - 抽取共用表单组件 TalentProcurementForm
 * - 与 TalentProcurementCard 共用相同的表单 UI
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Tag,
  Tabs,
  App,
  Button,
  Popconfirm,
  Empty,
  Spin,
  Switch,
  Card,
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  TagsOutlined,
  DollarOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { customerApi } from '../../../services/customerApi';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { PageHeader } from '../../../components/PageHeader';
import { logger } from '../../../utils/logger';
import {
  PRICING_MODEL_NAMES,
  getDefaultPlatformStrategy,
  calculateAllCoefficients,
  calculateAllEffectiveCoefficients,
  getPricingModeInfo,
  getEffectiveConfig,
  validateAllPlatformStrategies,
  type PlatformPricingStrategy,
  type PlatformPricingConfigs,
  type PricingConfigItem,
  type CoefficientResult,
  type TalentProcurementStrategy,
} from '../shared/talentProcurement';
import { PricingConfigList } from '../shared/PricingConfigList';
import { TalentProcurementForm } from '../shared/TalentProcurementForm';
import {
  BusinessTagsEditor,
  type PlatformBusinessTags,
} from './BusinessTagsEditor';
import { KPIConfigEditor } from './KPIConfigEditor';
import type {
  CustomerKPIConfig,
  PlatformKPIConfigs,
} from '../../../types/customer';

// 客户数据类型
interface CustomerData {
  _id?: string;
  code?: string;
  name?: string;
  businessStrategies?: {
    talentProcurement?: TalentProcurementStrategy & {
      platformBusinessTags?: PlatformBusinessTags;
      platformKPIConfigs?: PlatformKPIConfigs;
      /** @deprecated 使用 platformKPIConfigs */
      kpiConfig?: CustomerKPIConfig;
    };
    adPlacement?: {
      enabled?: boolean;
      platformBusinessTags?: PlatformBusinessTags;
    };
    contentProduction?: {
      enabled?: boolean;
      platformBusinessTags?: PlatformBusinessTags;
    };
  };
}

export default function PricingStrategy() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // 使用 usePlatformConfig Hook 获取平台配置
  const {
    configs: allPlatformConfigs,
    loading: configsLoading,
    getPlatformsByFeature,
    getPlatformConfigByKey,
  } = usePlatformConfig();

  // 获取启用了价格管理功能的平台列表
  const enabledPlatforms = useMemo(() => {
    const priceManagementPlatforms = getPlatformsByFeature('priceManagement');
    return allPlatformConfigs.filter(c =>
      priceManagementPlatforms.includes(c.platform)
    );
  }, [allPlatformConfigs, getPlatformsByFeature]);

  // 基础状态
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('talentProcurement');
  // v4.4: 子级 Tab（业务标签 / 定价配置 / KPI考核）
  const [activeSubTab, setActiveSubTab] = useState<'tags' | 'pricing' | 'kpi'>(
    'pricing'
  );

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  // 报价系数
  const [coefficients, setCoefficients] = useState<
    Record<string, CoefficientResult>
  >({});

  // 当平台列表加载完成后，设置默认选中的平台
  useEffect(() => {
    if (enabledPlatforms.length > 0 && !selectedPlatform) {
      setSelectedPlatform(enabledPlatforms[0].platform);
    }
  }, [enabledPlatforms, selectedPlatform]);

  // 平台配置状态
  const [platformPricingConfigs, setPlatformPricingConfigs] =
    useState<PlatformPricingConfigs>({});

  // v4.4: 业务标签状态
  const [platformBusinessTags, setPlatformBusinessTags] =
    useState<PlatformBusinessTags>({});

  // v4.5: 按平台的 KPI 配置状态
  const [platformKPIConfigs, setPlatformKPIConfigs] =
    useState<PlatformKPIConfigs>({});

  // 原始数据快照（用于检测变化）
  const [originalSnapshot, setOriginalSnapshot] = useState<{
    platformPricingConfigs: PlatformPricingConfigs;
    platformBusinessTags: PlatformBusinessTags;
    platformKPIConfigs: PlatformKPIConfigs;
  } | null>(null);

  // 在 id 或 enabledPlatforms 变化时加载客户数据
  useEffect(() => {
    if (id && enabledPlatforms.length > 0) {
      loadCustomer();
    }
  }, [id, enabledPlatforms.length]);

  const loadCustomer = async () => {
    if (!id || enabledPlatforms.length === 0) return;
    setLoading(true);
    try {
      const response = await customerApi.getCustomerById(id);
      if (response.success) {
        setCustomer(response.data as CustomerData);
        const strategy = response.data.businessStrategies?.talentProcurement;
        if (strategy) {
          // v5.1: 加载新的 configs 数组结构
          const loadedConfigs: PlatformPricingConfigs = {};
          const savedConfigs =
            strategy.platformPricingConfigs || strategy.platformFees || {};

          Object.entries(savedConfigs).forEach(([platformKey, savedConfig]) => {
            if (savedConfig) {
              const platformConfig = enabledPlatforms.find(
                p => p.platform === platformKey
              );
              const platformFeeRate = platformConfig?.business?.fee || 0;

              // v5.1: 检查是否为新结构（有 configs 数组）
              if (savedConfig.configs !== undefined) {
                // 新结构：直接使用
                loadedConfigs[platformKey] = {
                  enabled: savedConfig.enabled || false,
                  pricingModel: savedConfig.pricingModel || 'framework',
                  configs: savedConfig.configs || null,
                };
              } else {
                // 旧结构：转换为新结构（单配置转换为数组）
                const legacyConfig: PricingConfigItem = {
                  id: `legacy_${platformKey}_${Date.now()}`,
                  discountRate: savedConfig.discountRate ?? 1.0,
                  serviceFeeRate: savedConfig.serviceFeeRate ?? 0,
                  platformFeeRate: savedConfig.platformFeeRate || platformFeeRate,
                  includesPlatformFee: savedConfig.includesPlatformFee || false,
                  serviceFeeBase: savedConfig.serviceFeeBase || 'beforeDiscount',
                  includesTax: savedConfig.includesTax ?? true,
                  taxCalculationBase: savedConfig.taxCalculationBase || 'excludeServiceFee',
                  validFrom: savedConfig.validFrom || null,
                  validTo: savedConfig.validTo || null,
                  isPermanent: savedConfig.isPermanent || false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                loadedConfigs[platformKey] = {
                  enabled: savedConfig.enabled || false,
                  pricingModel: savedConfig.pricingModel || 'framework',
                  configs: savedConfig.pricingModel === 'project' ? null : [legacyConfig],
                };
              }
            }
          });

          setPlatformPricingConfigs(loadedConfigs);

          // v4.4: 加载业务标签
          const loadedTags = strategy.platformBusinessTags || {};
          setPlatformBusinessTags(loadedTags);

          // v4.5: 加载按平台的 KPI 配置
          const loadedPlatformKPIConfigs: PlatformKPIConfigs =
            strategy.platformKPIConfigs || {};
          setPlatformKPIConfigs(loadedPlatformKPIConfigs);

          // 保存原始快照用于变化检测
          setOriginalSnapshot({
            platformPricingConfigs: JSON.parse(JSON.stringify(loadedConfigs)),
            platformBusinessTags: JSON.parse(JSON.stringify(loadedTags)),
            platformKPIConfigs: JSON.parse(
              JSON.stringify(loadedPlatformKPIConfigs)
            ),
          });
        }
      }
    } catch (error) {
      message.error('加载客户信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理配置变化（更新系数）
  const handleConfigChange = (configs: PlatformPricingConfigs) => {
    setPlatformPricingConfigs(configs);
    setCoefficients(calculateAllCoefficients(configs));
  };

  // 检测策略是否有变化 (v5.1 支持新的 configs 数组结构)
  const hasStrategyChanged = (): boolean => {
    if (!originalSnapshot) return true;

    // v5.1: 直接比较 JSON 字符串，支持新的 configs 数组结构
    const originalConfigsStr = JSON.stringify(
      originalSnapshot.platformPricingConfigs || {}
    );
    const currentConfigsStr = JSON.stringify(platformPricingConfigs || {});
    if (originalConfigsStr !== currentConfigsStr) {
      return true;
    }

    // v4.4: 检查业务标签变化
    const originalTagsStr = JSON.stringify(
      originalSnapshot.platformBusinessTags || {}
    );
    const currentTagsStr = JSON.stringify(platformBusinessTags || {});
    if (originalTagsStr !== currentTagsStr) {
      return true;
    }

    // v4.5: 检查按平台 KPI 配置变化
    const originalKpiStr = JSON.stringify(
      originalSnapshot.platformKPIConfigs || {}
    );
    const currentKpiStr = JSON.stringify(platformKPIConfigs || {});
    if (originalKpiStr !== currentKpiStr) {
      return true;
    }

    return false;
  };

  // 获取平台名称的辅助函数
  const getPlatformName = (platformKey: string): string => {
    const config = getPlatformConfigByKey(platformKey as any);
    return config?.name || platformKey;
  };

  // 保存策略 (v5.1 支持新的 configs 数组结构)
  const handleSave = async () => {
    if (!id) return;

    if (!hasStrategyChanged()) {
      message.warning('策略配置未发生变化');
      return;
    }

    // v5.1: 使用新的校验逻辑
    const validationResult = validateAllPlatformStrategies(
      platformPricingConfigs,
      getPlatformName
    );
    if (!validationResult.valid) {
      message.error(validationResult.errors[0]);
      return;
    }

    setSaving(true);

    // v5.1: 使用 calculateAllEffectiveCoefficients 计算当前有效配置的系数
    const quotationCoefficients = calculateAllEffectiveCoefficients(platformPricingConfigs);

    // 校验系数
    let hasInvalidCoefficient = false;
    Object.entries(quotationCoefficients).forEach(([platform, coefficient]) => {
      if (
        isNaN(coefficient) ||
        !isFinite(coefficient) ||
        coefficient <= 0 ||
        coefficient >= 10
      ) {
        logger.error(`Invalid coefficient for ${platform}:`, coefficient);
        hasInvalidCoefficient = true;
      }
    });

    if (hasInvalidCoefficient) {
      message.error('报价系数计算异常，请检查配置后重试');
      setSaving(false);
      return;
    }

    const hasEnabledPlatform = Object.values(platformPricingConfigs).some(
      c => c?.enabled
    );

    // v5.1: 包含新的 configs 数组结构
    const strategy = {
      enabled: hasEnabledPlatform,
      platformPricingConfigs: platformPricingConfigs,
      quotationCoefficients: quotationCoefficients,
      platformBusinessTags: platformBusinessTags,
      platformKPIConfigs: platformKPIConfigs,
    };

    try {
      const response = await customerApi.updateCustomer(id, {
        businessStrategies: {
          talentProcurement: strategy as any,
        },
      });
      if (response.success) {
        message.success('策略保存成功');
        setIsEditing(false);
        await loadCustomer();
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除平台配置 (v5.1 支持新的 configs 数组结构)
  const handleDeletePlatform = async (platformKey: string) => {
    if (!id) return;
    setSaving(true);

    try {
      const updatedConfigs = { ...platformPricingConfigs };
      delete updatedConfigs[platformKey];

      // v5.1: 使用 calculateAllEffectiveCoefficients
      const quotationCoefficients = calculateAllEffectiveCoefficients(updatedConfigs);

      const hasEnabledPlatform = Object.values(updatedConfigs).some(
        c => c?.enabled
      );

      const strategy = {
        enabled: hasEnabledPlatform,
        platformPricingConfigs: updatedConfigs,
        quotationCoefficients: quotationCoefficients,
      };

      const response = await customerApi.updateCustomer(id, {
        businessStrategies: {
          talentProcurement: strategy as any,
        },
      });

      if (response.success) {
        message.success('平台配置已删除');
        await loadCustomer();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      logger.error('Failed to delete platform config:', error);
      message.error('删除失败');
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    loadCustomer();
  };

  // 开始新建策略 (v5.1 使用新的 getDefaultPlatformStrategy)
  const handleStartCreate = () => {
    setIsEditing(true);

    if (Object.keys(platformPricingConfigs).length === 0) {
      if (enabledPlatforms.length > 0) {
        const firstPlatform = enabledPlatforms[0];
        const platformFeeRate = firstPlatform.business?.fee || 0;
        // v5.1: 使用新的 getDefaultPlatformStrategy，返回 { enabled, pricingModel, configs }
        setPlatformPricingConfigs({
          [firstPlatform.platform]: getDefaultPlatformStrategy(platformFeeRate),
        });
        setSelectedPlatform(firstPlatform.platform);
      }
    } else {
      const configuredPlatforms = Object.keys(platformPricingConfigs);
      if (configuredPlatforms.length > 0) {
        setSelectedPlatform(configuredPlatforms[0]);
      }
    }
  };

  // 开始编辑（针对特定平台）
  const handleStartEditPlatform = (platformKey: string) => {
    setSelectedPlatform(platformKey);
    setIsEditing(true);
  };

  // 切换平台启用状态 (v5.1 支持新的 configs 数组结构)
  const handleTogglePlatformEnabled = async (
    platformKey: string,
    enabled: boolean
  ) => {
    const updatedConfigs = {
      ...platformPricingConfigs,
      [platformKey]: {
        ...platformPricingConfigs[platformKey],
        enabled,
      },
    };
    setPlatformPricingConfigs(updatedConfigs);

    try {
      // v5.1: 使用 calculateAllEffectiveCoefficients
      const quotationCoefficients = calculateAllEffectiveCoefficients(updatedConfigs);

      const hasEnabledPlatform = Object.values(updatedConfigs).some(
        c => c?.enabled
      );
      const strategyData = {
        enabled: hasEnabledPlatform,
        platformPricingConfigs: updatedConfigs,
        quotationCoefficients,
      };

      await customerApi.updateCustomer(id!, {
        businessStrategies: {
          talentProcurement: strategyData as any,
        },
      });
      message.success(enabled ? '平台已启用' : '平台已停用');
      await loadCustomer();
    } catch (error) {
      message.error('保存失败');
      setPlatformPricingConfigs(platformPricingConfigs);
    }
  };

  // 加载状态
  if (loading || configsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin tip="加载中...">
          <div className="p-12" />
        </Spin>
      </div>
    );
  }

  // 没有启用价格管理的平台时显示提示
  if (enabledPlatforms.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="业务策略中心"
          description="请先在平台配置中启用价格管理功能"
          onBack={() => navigate(-1)}
          backText="返回"
        />
        <ProCard>
          <Empty
            description="暂无启用价格管理功能的平台"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => navigate('/settings/platform-config')}
            >
              前往平台配置
            </Button>
          </Empty>
        </ProCard>
      </div>
    );
  }

  const strategy = customer?.businessStrategies?.talentProcurement;
  const savedConfigs =
    strategy?.platformPricingConfigs || strategy?.platformFees;
  const isConfigured = savedConfigs && Object.keys(savedConfigs).length > 0;

  // v5.1: 获取所有已配置的平台列表（使用新的 PlatformPricingStrategy 结构）
  const configuredPlatformConfigsList = Object.entries(platformPricingConfigs)
    .filter(([_, config]) => config !== undefined && config !== null)
    .map(([key, config]) => {
      // 获取当前有效配置
      const effectiveConfig = config.pricingModel !== 'project'
        ? getEffectiveConfig(config.configs || [])
        : null;

      return {
        key,
        name: getPlatformName(key),
        strategy: config as PlatformPricingStrategy, // v5.1: 使用 strategy 而非 config
        pricingModel: config.pricingModel || 'framework',
        effectiveConfig, // v5.1: 当前有效配置
        quotationCoefficient: strategy?.quotationCoefficients?.[key],
      };
    });

  // Tab 配置
  const tabItems = [
    {
      key: 'talentProcurement',
      label: (
        <span>
          达人采买
          {isConfigured && (
            <Tag color="blue" className="ml-2">
              已配置
            </Tag>
          )}
        </span>
      ),
    },
    {
      key: 'adPlacement',
      label: (
        <span>
          广告投流
          {customer?.businessStrategies?.adPlacement?.enabled && (
            <Tag color="orange" className="ml-2">
              已配置
            </Tag>
          )}
          <Tag color="default" className="ml-2">
            开发中
          </Tag>
        </span>
      ),
    },
    {
      key: 'contentProduction',
      label: (
        <span>
          内容制作
          {customer?.businessStrategies?.contentProduction?.enabled && (
            <Tag color="purple" className="ml-2">
              已配置
            </Tag>
          )}
          <Tag color="default" className="ml-2">
            开发中
          </Tag>
        </span>
      ),
    },
  ];

  // v5.1: 渲染只读模式的平台卡片（使用 PricingConfigList 展示多时间段配置）
  const renderReadOnlyPlatformCard = (platform: {
    key: string;
    name: string;
    strategy: PlatformPricingStrategy;
    pricingModel: string;
    effectiveConfig: PricingConfigItem | null;
    quotationCoefficient?: number;
  }) => {
    const pricingModeInfo = getPricingModeInfo(platform.pricingModel);
    const isProjectMode = platform.pricingModel === 'project';
    const isEnabled = platform.strategy.enabled;
    const platformConfig = getPlatformConfigByKey(platform.key as any);

    // v5.1: 处理配置变更的回调
    const handleConfigsChange = (newConfigs: PricingConfigItem[]) => {
      const updatedStrategy: PlatformPricingStrategy = {
        ...platform.strategy,
        configs: newConfigs,
      };
      const updatedPlatformConfigs = {
        ...platformPricingConfigs,
        [platform.key]: updatedStrategy,
      };
      setPlatformPricingConfigs(updatedPlatformConfigs);
    };

    return (
      <div
        key={platform.key}
        className={`border rounded-lg p-4 transition-all ${
          isEnabled
            ? 'border-stroke bg-surface-base'
            : 'border-stroke bg-surface-sunken opacity-60'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Switch
              size="small"
              checked={isEnabled}
              onChange={checked =>
                handleTogglePlatformEnabled(platform.key, checked)
              }
            />
            <span
              className={`font-semibold ${isEnabled ? 'text-content' : 'text-content-secondary'}`}
            >
              {platform.name}
            </span>
            {isEnabled && (
              <Tag color={pricingModeInfo.coefficientColor}>
                {PRICING_MODEL_NAMES[platform.pricingModel] ||
                  platform.pricingModel}
              </Tag>
            )}
            {!isEnabled && <Tag color="default">已停用</Tag>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="link"
              size="small"
              onClick={() => handleStartEditPlatform(platform.key)}
            >
              编辑
            </Button>
            <Popconfirm
              title="删除平台配置"
              description={`确定要删除 ${platform.name} 的配置吗？`}
              onConfirm={() => handleDeletePlatform(platform.key)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </div>
        </div>

        {!isEnabled ? (
          <div className="text-sm text-content-muted py-2 text-center">
            平台已停用，点击开关启用
          </div>
        ) : isProjectMode ? (
          <div className="text-sm text-content-secondary py-4 text-center bg-primary-50 dark:bg-primary-900/20 rounded">
            项目比价模式，创建项目时手动填写对客报价
          </div>
        ) : (
          // v5.1: 使用 PricingConfigList 组件展示多时间段配置
          <PricingConfigList
            configs={platform.strategy.configs || []}
            onChange={handleConfigsChange}
            platformName={platform.name}
            platformConfig={platformConfig}
            readonly={false} // 在只读模式下也允许编辑配置项
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <PageHeader
        title="业务策略中心"
        description={`客户：${customer?.name || ''} (${customer?.code || ''})`}
        onBack={() => navigate(-1)}
        backText="返回"
      />

      {/* 业务类型 Tabs - 使用与 PerformanceConfig 一致的嵌套结构 */}
      <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
        {/* 主级 Tab：业务类型切换 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{
            marginBottom: 0,
            paddingLeft: 16,
            paddingRight: 16,
            borderBottom: '1px solid #f0f0f0',
          }}
          size="large"
        />

        {/* 达人采买业务 */}
        {activeTab === 'talentProcurement' && (
          <div className="p-4">
            {/* 未配置状态 */}
            {!isConfigured && !isEditing && (
              <div className="text-center py-12">
                <Empty
                  description="该客户暂未配置达人采买策略"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleStartCreate}
                  className="mt-4"
                >
                  配置策略
                </Button>
              </div>
            )}

            {/* 已配置 - 使用子级 Tab */}
            {(isConfigured || isEditing) && (
              <Tabs
                activeKey={activeSubTab}
                onChange={key =>
                  setActiveSubTab(key as 'tags' | 'pricing' | 'kpi')
                }
                type="card"
                items={[
                  {
                    key: 'pricing',
                    label: (
                      <span className="flex items-center">
                        <DollarOutlined className="mr-1" />
                        定价配置
                      </span>
                    ),
                    children: isEditing ? (
                      // 编辑模式
                      <div className="space-y-4">
                        <TalentProcurementForm
                          enabledPlatforms={enabledPlatforms}
                          selectedPlatform={selectedPlatform}
                          onPlatformChange={setSelectedPlatform}
                          platformPricingConfigs={platformPricingConfigs}
                          onConfigChange={handleConfigChange}
                          getPlatformName={getPlatformName}
                          getPlatformConfigByKey={key =>
                            getPlatformConfigByKey(key as any)
                          }
                        />
                        {/* 底部操作栏 */}
                        <div className="flex justify-end gap-3 bg-surface-base p-4 rounded-lg">
                          <Button
                            icon={<CloseOutlined />}
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
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
                    ) : (
                      // 只读模式
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleStartCreate}
                          >
                            编辑配置
                          </Button>
                        </div>
                        {configuredPlatformConfigsList.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {configuredPlatformConfigsList.map(
                              renderReadOnlyPlatformCard
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-content-muted">
                            暂无平台配置
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'tags',
                    label: (
                      <span className="flex items-center">
                        <TagsOutlined className="mr-1" />
                        业务标签
                      </span>
                    ),
                    children: isEditing ? (
                      // 编辑模式
                      <div className="space-y-4">
                        <div className="text-sm text-content-secondary mb-4">
                          配置用于项目创建时选择的二级业务标签，可跨平台复用相同标签名称
                        </div>
                        <BusinessTagsEditor
                          enabledPlatforms={enabledPlatforms.map(p => ({
                            platform: p.platform,
                            name: getPlatformName(p.platform),
                          }))}
                          value={platformBusinessTags}
                          onChange={setPlatformBusinessTags}
                          getPlatformName={getPlatformName}
                        />
                        {/* 底部操作栏 */}
                        <div className="flex justify-end gap-3 bg-surface-base p-4 rounded-lg">
                          <Button
                            icon={<CloseOutlined />}
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
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
                    ) : (
                      // 只读模式
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="text-sm text-content-secondary">
                            用于项目创建时选择的二级业务标签，可跨平台复用相同标签名称
                          </div>
                          <Button type="link" onClick={handleStartCreate}>
                            编辑标签
                          </Button>
                        </div>
                        <BusinessTagsEditor
                          enabledPlatforms={enabledPlatforms.map(p => ({
                            platform: p.platform,
                            name: getPlatformName(p.platform),
                          }))}
                          value={platformBusinessTags}
                          getPlatformName={getPlatformName}
                          readOnly
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'kpi',
                    label: (
                      <span className="flex items-center">
                        <AimOutlined className="mr-1" />
                        KPI 考核
                        {Object.values(platformKPIConfigs).some(
                          c => c?.enabled
                        ) && (
                          <Tag color="green" className="ml-2 text-xs">
                            已启用
                          </Tag>
                        )}
                      </span>
                    ),
                    children: isEditing ? (
                      // 编辑模式
                      <div className="space-y-4">
                        <KPIConfigEditor
                          enabledPlatforms={enabledPlatforms.map(p => ({
                            platform: p.platform,
                            name: getPlatformName(p.platform),
                          }))}
                          value={platformKPIConfigs}
                          onChange={setPlatformKPIConfigs}
                          getPlatformName={getPlatformName}
                        />
                        {/* 底部操作栏 */}
                        <div className="flex justify-end gap-3 bg-surface-base p-4 rounded-lg">
                          <Button
                            icon={<CloseOutlined />}
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
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
                    ) : (
                      // 只读模式
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button type="link" onClick={handleStartCreate}>
                            编辑 KPI 配置
                          </Button>
                        </div>
                        <KPIConfigEditor
                          enabledPlatforms={enabledPlatforms.map(p => ({
                            platform: p.platform,
                            name: getPlatformName(p.platform),
                          }))}
                          value={platformKPIConfigs}
                          getPlatformName={getPlatformName}
                          readOnly
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* 广告投流业务（开发中） */}
        {activeTab === 'adPlacement' && (
          <div className="p-4">
            <div className="text-center py-12 text-content-secondary">
              广告投流业务配置功能开发中...
            </div>
          </div>
        )}

        {/* 内容制作业务（开发中） */}
        {activeTab === 'contentProduction' && (
          <div className="p-4">
            <div className="text-center py-12 text-content-secondary">
              内容制作业务配置功能开发中...
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// 命名导出以支持懒加载
export { PricingStrategy };
