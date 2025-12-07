/**
 * 业务策略中心页面 (v5.0)
 * 支持只读展示和编辑模式切换
 *
 * v5.0 变更：
 * - 抽取共用表单组件 TalentProcurementForm
 * - 与 TalentProcurementCard 共用相同的表单 UI
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProCard } from '@ant-design/pro-components';
import {
  Tag,
  Tabs,
  App,
  Button,
  Popover,
  Popconfirm,
  Empty,
  Spin,
  Switch,
  Card,
} from 'antd';
import {
  PlusOutlined,
  QuestionCircleOutlined,
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
  getDefaultPlatformConfig,
  calculateCoefficient,
  calculateAllCoefficients,
  getPricingModeInfo,
  validateAllPlatformsValidity,
  type PlatformConfig,
  type PlatformPricingConfigs,
  type CoefficientResult,
  type TalentProcurementStrategy,
} from '../shared/talentProcurement';
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
  const [coefficients, setCoefficients] = useState<
    Record<string, CoefficientResult>
  >({});
  const [selectedPlatform, setSelectedPlatform] = useState('');

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
          const loadedConfigs: PlatformPricingConfigs = {};
          const savedConfigs =
            strategy.platformPricingConfigs || strategy.platformFees || {};
          Object.entries(savedConfigs).forEach(([platformKey, savedConfig]) => {
            if (savedConfig) {
              const platformConfig = enabledPlatforms.find(
                p => p.platform === platformKey
              );
              const platformFeeRate =
                platformConfig?.business?.fee ||
                savedConfig.platformFeeRate ||
                0;
              loadedConfigs[platformKey] = {
                enabled: savedConfig.enabled || false,
                pricingModel: savedConfig.pricingModel || 'framework',
                platformFeeRate: savedConfig.platformFeeRate || platformFeeRate,
                discountRate: savedConfig.discountRate ?? 1.0,
                serviceFeeRate: savedConfig.serviceFeeRate ?? 0,
                validFrom: savedConfig.validFrom || null,
                validTo: savedConfig.validTo || null,
                isPermanent: savedConfig.isPermanent || false,
                includesPlatformFee: savedConfig.includesPlatformFee || false,
                serviceFeeBase: savedConfig.serviceFeeBase || 'beforeDiscount',
                includesTax: savedConfig.includesTax ?? true,
                taxCalculationBase:
                  savedConfig.taxCalculationBase || 'excludeServiceFee',
              };
            }
          });
          setPlatformPricingConfigs(loadedConfigs);
          setCoefficients(calculateAllCoefficients(loadedConfigs));

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

  // 检测策略是否有变化
  const hasStrategyChanged = (): boolean => {
    if (!originalSnapshot) return true;

    // 检查平台配置变化
    const originalKeys = Object.keys(originalSnapshot.platformPricingConfigs);
    const currentKeys = Object.keys(platformPricingConfigs);

    if (originalKeys.length !== currentKeys.length) {
      return true;
    }

    for (const key of currentKeys) {
      const original = originalSnapshot.platformPricingConfigs[key];
      const current = platformPricingConfigs[key];

      if (!original || !current) {
        return true;
      }

      if (
        original.enabled !== current.enabled ||
        original.pricingModel !== current.pricingModel ||
        original.discountRate !== current.discountRate ||
        original.serviceFeeRate !== current.serviceFeeRate ||
        original.platformFeeRate !== current.platformFeeRate ||
        original.validFrom !== current.validFrom ||
        original.validTo !== current.validTo ||
        original.includesPlatformFee !== current.includesPlatformFee ||
        original.serviceFeeBase !== current.serviceFeeBase ||
        original.includesTax !== current.includesTax ||
        original.taxCalculationBase !== current.taxCalculationBase
      ) {
        return true;
      }
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

  // 保存策略
  const handleSave = async () => {
    if (!id) return;

    if (!hasStrategyChanged()) {
      message.warning('策略配置未发生变化');
      return;
    }

    const validityErrors = validateAllPlatformsValidity(
      platformPricingConfigs,
      getPlatformName
    );
    if (validityErrors.length > 0) {
      message.error(validityErrors[0]);
      return;
    }

    setSaving(true);

    const quotationCoefficients: Record<string, number> = {};
    let hasInvalidCoefficient = false;

    Object.entries(platformPricingConfigs).forEach(([platform, config]) => {
      if (config?.enabled && config.pricingModel !== 'project') {
        const coefficientData = coefficients[platform];
        if (coefficientData) {
          const coefficient = Number(coefficientData.coefficient);
          if (
            !isNaN(coefficient) &&
            isFinite(coefficient) &&
            coefficient > 0 &&
            coefficient < 10
          ) {
            quotationCoefficients[platform] = Number(coefficient.toFixed(4));
          } else {
            logger.error(
              `Invalid coefficient for ${platform}:`,
              coefficientData.coefficient
            );
            hasInvalidCoefficient = true;
          }
        }
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

    // v4.4: 包含业务标签; v4.5: 包含按平台 KPI 配置
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

  // 删除平台配置
  const handleDeletePlatform = async (platformKey: string) => {
    if (!id) return;
    setSaving(true);

    try {
      const updatedConfigs = { ...platformPricingConfigs };
      delete updatedConfigs[platformKey];

      const newCoefficients = calculateAllCoefficients(updatedConfigs);
      const quotationCoefficients: Record<string, number> = {};
      Object.entries(updatedConfigs).forEach(([platform, config]) => {
        if (config?.enabled && config.pricingModel !== 'project') {
          const coefficientData = newCoefficients[platform];
          if (coefficientData) {
            quotationCoefficients[platform] = Number(
              coefficientData.coefficient.toFixed(4)
            );
          }
        }
      });

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

  // 开始新建策略
  const handleStartCreate = () => {
    setIsEditing(true);

    if (Object.keys(platformPricingConfigs).length === 0) {
      if (enabledPlatforms.length > 0) {
        const firstPlatform = enabledPlatforms[0];
        const platformFeeRate = firstPlatform.business?.fee || 0;
        setPlatformPricingConfigs({
          [firstPlatform.platform]: getDefaultPlatformConfig(platformFeeRate),
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

  // 切换平台启用状态
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
      const newCoefficients = calculateAllCoefficients(updatedConfigs);
      const quotationCoefficients: Record<string, number> = {};
      Object.entries(updatedConfigs).forEach(([platform, config]) => {
        if (config?.enabled && config.pricingModel !== 'project') {
          const result = newCoefficients[platform];
          if (result) {
            quotationCoefficients[platform] = Number(
              result.coefficient.toFixed(4)
            );
          }
        }
      });

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

  // 获取所有已配置的平台列表
  const configuredPlatformConfigsList = Object.entries(platformPricingConfigs)
    .filter(([_, config]) => config !== undefined && config !== null)
    .map(([key, config]) => ({
      key,
      name: getPlatformName(key),
      config,
      pricingModel: config.pricingModel || 'framework',
      coefficient:
        config.enabled && config.pricingModel !== 'project'
          ? calculateCoefficient(config)
          : null,
      quotationCoefficient: strategy?.quotationCoefficients?.[key],
    }));

  // 生成 tooltip 内容
  const generateTooltipContent = (platform: {
    key: string;
    name: string;
    config: PlatformConfig;
    coefficient: CoefficientResult;
    quotationCoefficient?: number;
  }) => {
    const { config, coefficient, quotationCoefficient } = platform;
    const {
      baseAmount,
      platformFeeAmount,
      discountedAmount,
      serviceFeeAmount,
      taxAmount,
      finalAmount,
    } = coefficient;

    const discountRate = config.discountRate || 0;
    const platformFeeRate = config.platformFeeRate || 0;
    const serviceFeeRate = config.serviceFeeRate || 0;

    return (
      <div style={{ width: '340px' }}>
        <div className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-600">
          {platform.name} - 报价系数计算
        </div>

        <div className="space-y-2 bg-gray-800 p-3 rounded text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-300 whitespace-nowrap">
              1. 基础刊例价:
            </span>
            <span className="font-medium text-white whitespace-nowrap">
              ¥{(baseAmount / 100).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-gray-300 whitespace-nowrap">
              2. 平台费 ({(platformFeeRate * 100).toFixed(2)}%):
            </span>
            <span className="font-medium text-white whitespace-nowrap">
              ¥{(platformFeeAmount / 100).toFixed(2)}
            </span>
          </div>

          <div className="border-t border-gray-600 pt-1.5 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-300 whitespace-nowrap">
                3. 折扣率 ({(discountRate * 100).toFixed(2)}%):
              </span>
              <span className="text-white text-xs whitespace-nowrap">
                {config.includesPlatformFee ? '含平台费' : '不含平台费'}
              </span>
            </div>

            <div className="text-gray-400 text-xs pl-3">
              {config.includesPlatformFee
                ? `(¥${(baseAmount / 100).toFixed(2)} + ¥${(platformFeeAmount / 100).toFixed(2)}) × ${(discountRate * 100).toFixed(2)}%`
                : `¥${(baseAmount / 100).toFixed(2)} × ${(discountRate * 100).toFixed(2)}% + ¥${(platformFeeAmount / 100).toFixed(2)}`}
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-300 whitespace-nowrap">
                = 折扣后金额:
              </span>
              <span className="font-medium text-white whitespace-nowrap">
                ¥{(discountedAmount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {serviceFeeRate > 0 && (
            <div className="flex justify-between gap-4 border-t border-gray-600 pt-1">
              <span className="text-gray-300 whitespace-nowrap">
                4. 服务费 ({(serviceFeeRate * 100).toFixed(2)}%):
              </span>
              <span className="font-medium text-white whitespace-nowrap">
                ¥{(serviceFeeAmount / 100).toFixed(2)}
              </span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between gap-4 border-t border-gray-600 pt-1">
              <span className="text-gray-300 whitespace-nowrap">
                5. 增值税 (6%):
              </span>
              <span className="font-medium text-white whitespace-nowrap">
                ¥{(taxAmount / 100).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between gap-4 border-t border-gray-600 pt-1.5 mt-1">
            <span className="text-gray-300 font-semibold whitespace-nowrap">
              6. 最终金额:
            </span>
            <span className="font-bold text-green-300 whitespace-nowrap">
              ¥{(finalAmount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-1 pt-2 text-xs">
          <div className="flex justify-between gap-4 text-gray-400">
            <span className="whitespace-nowrap">折扣含平台费:</span>
            <span className="whitespace-nowrap">
              {config.includesPlatformFee ? '是' : '否'}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-gray-400">
            <span className="whitespace-nowrap">含税报价:</span>
            <span className="whitespace-nowrap">
              {config.includesTax ? '是（已含6%税）' : '否（需加税）'}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-gray-400">
            <span className="whitespace-nowrap">有效期:</span>
            <span className="whitespace-nowrap">
              {config.isPermanent
                ? '长期有效'
                : config.validFrom && config.validTo
                  ? `${config.validFrom.substring(0, 10)} ~ ${config.validTo.substring(0, 10)}`
                  : '未设置'}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-600 pt-2 mt-2">
          <div className="flex justify-between items-center gap-4">
            <span className="font-semibold text-primary-300 whitespace-nowrap">
              报价系数:
            </span>
            <div className="text-right">
              <div className="font-bold text-primary-200 text-sm whitespace-nowrap">
                {quotationCoefficient?.toFixed(4) ||
                  coefficient.coefficient.toFixed(4)}
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                = ¥{(finalAmount / 100).toFixed(2)} ÷ ¥
                {(baseAmount / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  // 渲染只读模式的平台卡片
  const renderReadOnlyPlatformCard = (platform: {
    key: string;
    name: string;
    config: PlatformConfig;
    pricingModel: string;
    coefficient: CoefficientResult | null;
    quotationCoefficient?: number;
  }) => {
    const pricingModeInfo = getPricingModeInfo(platform.pricingModel);
    const isProjectMode = platform.pricingModel === 'project';
    const isEnabled = platform.config.enabled;

    return (
      <div
        key={platform.key}
        className={`border rounded-lg p-4 transition-all ${
          isEnabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 bg-gray-100 opacity-60'
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
              className={`font-semibold ${isEnabled ? 'text-gray-800' : 'text-gray-500'}`}
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
          <div className="text-sm text-gray-400 py-2 text-center">
            平台已停用，点击开关启用
          </div>
        ) : isProjectMode ? (
          <div className="text-sm text-gray-500 py-4 text-center bg-blue-50 rounded">
            项目比价模式，创建项目时手动填写对客报价
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">折扣率:</span>
              <span className="font-medium">
                {((platform.config.discountRate || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">服务费率:</span>
              <span className="font-medium">
                {((platform.config.serviceFeeRate || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">平台费:</span>
              <span className="font-medium">
                {((platform.config.platformFeeRate || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">有效期:</span>
              <span className="font-medium">
                {platform.config.isPermanent ? (
                  '长期有效'
                ) : platform.config.validFrom && platform.config.validTo ? (
                  `${platform.config.validFrom.substring(0, 10)} ~ ${platform.config.validTo.substring(0, 10)}`
                ) : (
                  <span className="text-red-500">未设置</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-gray-500">
                {pricingModeInfo.coefficientLabel}:
              </span>
              {platform.coefficient ? (
                <Popover
                  content={generateTooltipContent({
                    ...platform,
                    coefficient: platform.coefficient,
                  })}
                  placement="top"
                  trigger="hover"
                  overlayInnerStyle={{
                    padding: '12px',
                    backgroundColor: '#1f2937',
                    borderRadius: '6px',
                  }}
                >
                  <span className="font-bold text-blue-600 cursor-help border-b border-dashed border-blue-300 flex items-center gap-1">
                    {platform.quotationCoefficient?.toFixed(4) ||
                      platform.coefficient.coefficient.toFixed(4)}
                    <QuestionCircleOutlined className="text-xs" />
                  </span>
                </Popover>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
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
                        <div className="flex justify-end gap-3 bg-gray-50 p-4 rounded-lg">
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
                          <div className="text-center py-6 text-gray-400">
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
                        <div className="text-sm text-gray-500 mb-4">
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
                        <div className="flex justify-end gap-3 bg-gray-50 p-4 rounded-lg">
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
                          <div className="text-sm text-gray-500">
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
                        <div className="flex justify-end gap-3 bg-gray-50 p-4 rounded-lg">
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
            <div className="text-center py-12 text-gray-500">
              广告投流业务配置功能开发中...
            </div>
          </div>
        )}

        {/* 内容制作业务（开发中） */}
        {activeTab === 'contentProduction' && (
          <div className="p-4">
            <div className="text-center py-12 text-gray-500">
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
