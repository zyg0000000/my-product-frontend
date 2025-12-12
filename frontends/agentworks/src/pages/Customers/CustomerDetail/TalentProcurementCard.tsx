/**
 * 达人采买策略卡片组件 (v5.0)
 * 支持只读展示和内嵌编辑两种模式
 *
 * v5.0 变更：
 * - 抽取共用表单组件 TalentProcurementForm
 * - 与 PricingStrategy 页面共用相同的表单 UI
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Popover,
  App,
  Spin,
  Popconfirm,
  Empty,
  Switch,
} from 'antd';
import {
  ShoppingOutlined,
  CheckOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { Customer } from '../../../types/customer';
import type { Platform } from '../../../types/talent';
import { customerApi } from '../../../services/customerApi';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { logger } from '../../../utils/logger';
import {
  PRICING_MODEL_NAMES,
  getDefaultPlatformConfig,
  calculateCoefficient,
  getPricingModeInfo,
  validateAllPlatformsValidity,
  type PlatformConfig,
  type PlatformPricingConfigs,
  type CoefficientResult,
} from '../shared/talentProcurement';
import { TalentProcurementForm } from '../shared/TalentProcurementForm';

interface TalentProcurementCardProps {
  customer: Customer;
  /** 可选：传入时只显示该平台的配置（单平台模式） */
  platform?: Platform;
  onUpdate: () => void;
}

export function TalentProcurementCard({
  customer,
  platform,
  onUpdate,
}: TalentProcurementCardProps) {
  // 单平台模式：由外部平台 Tab 决定显示哪个平台
  const isSinglePlatformMode = !!platform;
  const { message } = App.useApp();

  // 使用 usePlatformConfig Hook 获取平台配置
  const {
    configs: allPlatformConfigs,
    loading: configsLoading,
    getPlatformConfigByKey,
  } = usePlatformConfig();

  // 获取启用了价格管理功能的平台列表
  const enabledPlatforms = useMemo(() => {
    return allPlatformConfigs.filter(c => c.features?.priceManagement === true);
  }, [allPlatformConfigs]);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 编辑状态
  const [platformPricingConfigs, setPlatformPricingConfigs] =
    useState<PlatformPricingConfigs>({});
  const [selectedPlatform, setSelectedPlatform] = useState('');

  // 原始数据快照（用于检测变化）
  const [originalSnapshot, setOriginalSnapshot] = useState<{
    platformPricingConfigs: PlatformPricingConfigs;
  } | null>(null);

  // 从 customer 数据初始化
  const strategy = customer.businessStrategies?.talentProcurement;

  // 当平台列表加载完成后，设置默认选中的平台
  // 单平台模式下直接使用传入的平台
  useEffect(() => {
    if (isSinglePlatformMode && platform) {
      setSelectedPlatform(platform);
    } else if (enabledPlatforms.length > 0) {
      setSelectedPlatform(prev => prev || enabledPlatforms[0].platform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledPlatforms.length, isSinglePlatformMode, platform]);

  // 使用动态平台列表初始化，兼容新旧字段名
  // 只加载数据库中已保存的平台配置，不自动创建默认配置
  useEffect(() => {
    if (strategy && enabledPlatforms.length > 0) {
      const configs: PlatformPricingConfigs = {};
      const savedConfigs =
        strategy.platformPricingConfigs || strategy.platformFees || {};
      enabledPlatforms.forEach(platformConfig => {
        const platformKey = platformConfig.platform;
        const platformFeeRate = platformConfig.business?.fee || 0;
        const saved = savedConfigs[platformKey];
        // 只有数据库中存在该平台配置时才加载，不自动创建默认配置
        if (saved) {
          configs[platformKey] = {
            enabled: saved.enabled || false,
            pricingModel: saved.pricingModel || 'framework',
            platformFeeRate: saved.platformFeeRate ?? platformFeeRate,
            discountRate: saved.discountRate ?? 1.0,
            serviceFeeRate: saved.serviceFeeRate ?? 0,
            validFrom: saved.validFrom || null,
            validTo: saved.validTo || null,
            isPermanent: saved.isPermanent || false,
            includesPlatformFee: saved.includesPlatformFee || false,
            serviceFeeBase: saved.serviceFeeBase || 'beforeDiscount',
            includesTax: saved.includesTax ?? true,
            taxCalculationBase: saved.taxCalculationBase || 'excludeServiceFee',
          };
        }
      });
      setPlatformPricingConfigs(configs);

      // 保存原始快照用于变化检测
      setOriginalSnapshot({
        platformPricingConfigs: JSON.parse(JSON.stringify(configs)),
      });
    }
  }, [customer, enabledPlatforms]);

  // 获取平台名称的辅助函数
  const getPlatformName = (platformKey: string): string => {
    const config = getPlatformConfigByKey(platformKey as any);
    return config?.name || platformKey;
  };

  // 获取所有已配置的平台列表（包括停用的）
  // 单平台模式下只显示指定平台
  const configuredPlatformConfigsList = Object.entries(platformPricingConfigs)
    .filter(([key, config]) => {
      if (config === undefined || config === null) return false;
      // 单平台模式下只显示指定平台
      if (isSinglePlatformMode && key !== platform) return false;
      return true;
    })
    .map(([key, config]) => ({
      key,
      name: getPlatformName(key),
      config,
      pricingModel: config.pricingModel || 'framework',
      coefficient:
        config.pricingModel !== 'project' ? calculateCoefficient(config) : null,
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

        <div className="space-y-2 bg-surface-elevated dark:bg-gray-900 p-3 rounded text-xs">
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

            <div className="text-content-muted text-xs pl-3">
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
          <div className="flex justify-between gap-4 text-content-muted">
            <span className="whitespace-nowrap">折扣含平台费:</span>
            <span className="whitespace-nowrap">
              {config.includesPlatformFee ? '是' : '否'}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-content-muted">
            <span className="whitespace-nowrap">含税报价:</span>
            <span className="whitespace-nowrap">
              {config.includesTax ? '是（已含6%税）' : '否（需加税）'}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-content-muted">
            <span className="whitespace-nowrap">有效期:</span>
            <span className="whitespace-nowrap">
              {config.isPermanent
                ? '长期有效'
                : config.validFrom && config.validTo
                  ? `${config.validFrom.substring(0, 7)} ~ ${config.validTo.substring(0, 7)}`
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
              <div className="text-xs text-content-muted whitespace-nowrap">
                = ¥{(finalAmount / 100).toFixed(2)} ÷ ¥
                {(baseAmount / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 检测策略是否有变化
  const hasStrategyChanged = (): boolean => {
    if (!originalSnapshot) return true;

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

    return false;
  };

  // 保存策略
  const handleSave = async () => {
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
    try {
      const quotationCoefficients: Record<string, number> = {};
      let hasInvalidCoefficient = false;

      Object.entries(platformPricingConfigs).forEach(([platform, config]) => {
        if (config?.enabled && config.pricingModel !== 'project') {
          const result = calculateCoefficient(config);
          const coefficient = result.coefficient;

          if (
            !isNaN(coefficient) &&
            isFinite(coefficient) &&
            coefficient > 0 &&
            coefficient < 10
          ) {
            quotationCoefficients[platform] = Number(coefficient.toFixed(4));
          } else {
            logger.error(`Invalid coefficient for ${platform}:`, coefficient);
            hasInvalidCoefficient = true;
          }
        }
      });

      if (hasInvalidCoefficient) {
        message.error('报价系数计算异常，请检查配置后重试');
        return;
      }

      const hasEnabledPlatform = Object.values(platformPricingConfigs).some(
        c => c?.enabled
      );

      const strategyData = {
        enabled: hasEnabledPlatform,
        platformPricingConfigs: platformPricingConfigs,
        quotationCoefficients: quotationCoefficients,
      };

      const response = await customerApi.updateCustomer(
        customer._id || customer.code,
        {
          businessStrategies: {
            talentProcurement: strategyData as any,
          },
        }
      );

      if (response.success) {
        message.success('策略保存成功');
        setIsEditing(false);
        setIsCreating(false);
        onUpdate();
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      logger.error('Failed to save strategy:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (strategy && enabledPlatforms.length > 0) {
      const configs: PlatformPricingConfigs = {};
      const savedConfigs =
        strategy.platformPricingConfigs || strategy.platformFees || {};
      enabledPlatforms.forEach(platformConfig => {
        const platformKey = platformConfig.platform;
        const platformFeeRate = platformConfig.business?.fee || 0;
        const saved = savedConfigs[platformKey];
        configs[platformKey] = saved
          ? {
              enabled: saved.enabled || false,
              pricingModel: saved.pricingModel || 'framework',
              platformFeeRate: saved.platformFeeRate ?? platformFeeRate,
              discountRate: saved.discountRate ?? 1.0,
              serviceFeeRate: saved.serviceFeeRate ?? 0,
              validFrom: saved.validFrom || null,
              validTo: saved.validTo || null,
              isPermanent: saved.isPermanent || false,
              includesPlatformFee: saved.includesPlatformFee || false,
              serviceFeeBase: saved.serviceFeeBase || 'beforeDiscount',
              includesTax: saved.includesTax ?? true,
              taxCalculationBase:
                saved.taxCalculationBase || 'excludeServiceFee',
            }
          : getDefaultPlatformConfig(platformFeeRate);
      });
      setPlatformPricingConfigs(configs);
    }
    setIsEditing(false);
    setIsCreating(false);
  };

  // 开始新建策略
  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    const configs: PlatformPricingConfigs = {};
    enabledPlatforms.forEach(platformConfig => {
      const platformFeeRate = platformConfig.business?.fee || 0;
      configs[platformConfig.platform] =
        getDefaultPlatformConfig(platformFeeRate);
    });
    setPlatformPricingConfigs(configs);
    if (enabledPlatforms.length > 0) {
      setSelectedPlatform(enabledPlatforms[0].platform);
    }
  };

  // 开始编辑某个平台
  const handleStartEditPlatform = (platformKey: string) => {
    setSelectedPlatform(platformKey);
    setIsEditing(true);
  };

  // 删除某个平台配置
  const handleDeletePlatform = async (platformKey: string) => {
    setSaving(true);
    try {
      // 将要删除的平台配置设置为 null（而不是 delete），
      // 这样 MongoDB 的 $set 操作才能正确清除该字段
      const updatedConfigs = { ...platformPricingConfigs };
      updatedConfigs[platformKey] = null as any;

      const quotationCoefficients: Record<string, number | null> = {};
      Object.entries(updatedConfigs).forEach(([platform, config]) => {
        if (config?.enabled && config.pricingModel !== 'project') {
          const result = calculateCoefficient(config);
          quotationCoefficients[platform] = Number(
            result.coefficient.toFixed(4)
          );
        } else if (config === null) {
          // 同样将报价系数设置为 null
          quotationCoefficients[platform] = null;
        }
      });

      const hasEnabledPlatform = Object.values(updatedConfigs).some(
        c => c?.enabled
      );

      const strategyData = {
        enabled: hasEnabledPlatform,
        platformPricingConfigs: updatedConfigs,
        quotationCoefficients: quotationCoefficients,
      };

      const response = await customerApi.updateCustomer(
        customer._id || customer.code,
        {
          businessStrategies: {
            talentProcurement: strategyData as any,
          },
        }
      );

      if (response.success) {
        message.success('平台配置已删除');
        onUpdate();
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
      const quotationCoefficients: Record<string, number> = {};
      Object.entries(updatedConfigs).forEach(([platform, config]) => {
        if (config?.enabled && config.pricingModel !== 'project') {
          const result = calculateCoefficient(config);
          quotationCoefficients[platform] = Number(
            result.coefficient.toFixed(4)
          );
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

      const response = await customerApi.updateCustomer(
        customer._id || customer.code,
        {
          businessStrategies: {
            talentProcurement: strategyData as any,
          },
        }
      );

      if (response.success) {
        message.success(enabled ? '平台已启用' : '平台已停用');
        onUpdate();
      } else {
        message.error('保存失败');
        setPlatformPricingConfigs(platformPricingConfigs);
      }
    } catch (error) {
      logger.error('Failed to toggle platform enabled:', error);
      message.error('保存失败');
      setPlatformPricingConfigs(platformPricingConfigs);
    }
  };

  // 加载状态
  if (configsLoading) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingOutlined className="text-blue-500" />
            <span>达人采买策略</span>
          </div>
        }
        className="mb-4"
      >
        <div className="text-center py-8">
          <Spin tip="加载平台配置...">
            <div className="p-8" />
          </Spin>
        </div>
      </Card>
    );
  }

  // 没有启用价格管理的平台时显示提示
  if (enabledPlatforms.length === 0) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingOutlined className="text-blue-500" />
            <span>达人采买策略</span>
          </div>
        }
        className="mb-4"
      >
        <Empty
          description="暂无启用价格管理功能的平台"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // 检查当前平台是否有配置（单平台模式下使用）
  const currentPlatformConfig =
    isSinglePlatformMode && platform ? platformPricingConfigs[platform] : null;
  const currentPlatformHasConfig =
    currentPlatformConfig !== undefined && currentPlatformConfig !== null;

  // 未配置状态判断
  // - 多平台模式：整体策略未启用
  // - 单平台模式：当前平台没有配置
  const isNotConfigured = isSinglePlatformMode
    ? !currentPlatformHasConfig
    : !strategy?.enabled;

  if (isNotConfigured && !isCreating) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingOutlined className="text-blue-500" />
            <span>达人采买策略</span>
          </div>
        }
        extra={<Tag color="default">未配置</Tag>}
        className="mb-4"
      >
        <div className="text-center py-8">
          {isSinglePlatformMode ? (
            // 单平台模式：显示当前平台的配置状态
            <>
              <div className="text-content-muted mb-4">
                {getPlatformName(platform!)} 暂未配置达人采买策略
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelectedPlatform(platform!);
                  setIsEditing(true);
                  setIsCreating(true);
                  // 初始化当前平台的配置
                  const platformConfig = enabledPlatforms.find(
                    p => p.platform === platform
                  );
                  const platformFeeRate = platformConfig?.business?.fee || 0;
                  setPlatformPricingConfigs({
                    ...platformPricingConfigs,
                    [platform!]: getDefaultPlatformConfig(platformFeeRate),
                  });
                }}
              >
                配置策略
              </Button>
            </>
          ) : (
            // 多平台模式：显示整体状态
            <>
              <div className="text-content-muted mb-4">
                该客户暂未配置达人采买策略
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleStartCreate}
              >
                新增策略
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <ShoppingOutlined className="text-blue-500" />
          <span>达人采买策略</span>
        </div>
      }
      extra={
        isEditing ? (
          <Space>
            <Button
              icon={<CloseOutlined />}
              onClick={handleCancel}
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
              保存
            </Button>
          </Space>
        ) : (
          // 单平台模式下不显示"添加平台"按钮
          !isSinglePlatformMode && (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsEditing(true);
                if (enabledPlatforms.length > 0) {
                  setSelectedPlatform(enabledPlatforms[0].platform);
                }
              }}
            >
              添加平台
            </Button>
          )
        )
      }
      className="mb-4"
    >
      <Spin spinning={saving}>
        {isEditing ? (
          // 编辑模式 - 使用共用表单组件
          <TalentProcurementForm
            enabledPlatforms={enabledPlatforms}
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
            platformPricingConfigs={platformPricingConfigs}
            onConfigChange={setPlatformPricingConfigs}
            getPlatformName={getPlatformName}
            getPlatformConfigByKey={key => getPlatformConfigByKey(key as any)}
            singlePlatformMode={isSinglePlatformMode}
          />
        ) : (
          // 只读模式
          <div className="space-y-4">
            {configuredPlatformConfigsList.length > 0 ? (
              <div
                className={isSinglePlatformMode ? '' : 'grid grid-cols-2 gap-4'}
              >
                {configuredPlatformConfigsList.map(platformItem => {
                  const pricingModeInfo = getPricingModeInfo(
                    platformItem.pricingModel
                  );
                  const isProjectMode = platformItem.pricingModel === 'project';
                  const isEnabled = platformItem.config.enabled;

                  return (
                    <div
                      key={platformItem.key}
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
                              handleTogglePlatformEnabled(
                                platformItem.key,
                                checked
                              )
                            }
                          />
                          <span
                            className={`font-semibold ${isEnabled ? 'text-content' : 'text-content-secondary'}`}
                          >
                            {platformItem.name}
                          </span>
                          {isEnabled && (
                            <Tag color={pricingModeInfo.coefficientColor}>
                              {PRICING_MODEL_NAMES[platformItem.pricingModel] ||
                                platformItem.pricingModel}
                            </Tag>
                          )}
                          {!isEnabled && <Tag color="default">已停用</Tag>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="link"
                            size="small"
                            onClick={() =>
                              handleStartEditPlatform(platformItem.key)
                            }
                          >
                            编辑
                          </Button>
                          <Popconfirm
                            title="删除平台配置"
                            description={`确定要删除 ${platformItem.name} 的配置吗？`}
                            onConfirm={() =>
                              handleDeletePlatform(platformItem.key)
                            }
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
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-content-secondary">
                              折扣率:
                            </span>
                            <span className="font-medium">
                              {(
                                (platformItem.config.discountRate || 0) * 100
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-content-secondary">
                              服务费率:
                            </span>
                            <span className="font-medium">
                              {(
                                (platformItem.config.serviceFeeRate || 0) * 100
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-content-secondary">
                              平台费:
                            </span>
                            <span className="font-medium">
                              {(
                                (platformItem.config.platformFeeRate || 0) * 100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-content-secondary">
                              有效期:
                            </span>
                            <span className="font-medium">
                              {platformItem.config.isPermanent ? (
                                '长期有效'
                              ) : platformItem.config.validFrom &&
                                platformItem.config.validTo ? (
                                `${platformItem.config.validFrom.substring(0, 7)} ~ ${platformItem.config.validTo.substring(0, 7)}`
                              ) : (
                                <span className="text-danger-500">未设置</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-stroke">
                            <span className="text-content-secondary">
                              {pricingModeInfo.coefficientLabel}:
                            </span>
                            {platformItem.coefficient ? (
                              <Popover
                                content={generateTooltipContent({
                                  ...platformItem,
                                  coefficient: platformItem.coefficient,
                                })}
                                placement="top"
                                trigger="hover"
                                overlayInnerStyle={{
                                  padding: '12px',
                                  backgroundColor: '#1f2937',
                                  borderRadius: '6px',
                                }}
                              >
                                <span className="font-bold text-primary-600 dark:text-primary-400 cursor-help border-b border-dashed border-blue-300 flex items-center gap-1">
                                  {platformItem.quotationCoefficient?.toFixed(
                                    4
                                  ) ||
                                    platformItem.coefficient.coefficient.toFixed(
                                      4
                                    )}
                                  <QuestionCircleOutlined className="text-xs" />
                                </span>
                              </Popover>
                            ) : (
                              <span className="text-content-muted">-</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-content-muted">
                暂无平台配置
              </div>
            )}
          </div>
        )}
      </Spin>
    </Card>
  );
}

export default TalentProcurementCard;
