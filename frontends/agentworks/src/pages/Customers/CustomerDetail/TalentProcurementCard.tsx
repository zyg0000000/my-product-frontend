/**
 * 达人采买策略卡片组件 (v5.1)
 * 支持只读展示和内嵌编辑两种模式
 *
 * v5.1 变更：
 * - 支持多时间段定价配置
 * - 使用 PricingConfigList 组件展示配置列表
 * - 使用 calculateAllEffectiveCoefficients 计算当前有效系数
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
  PlusOutlined,
} from '@ant-design/icons';
import type { Customer } from '../../../types/customer';
import type { Platform } from '../../../types/talent';
import { customerApi } from '../../../services/customerApi';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { logger } from '../../../utils/logger';
import {
  PRICING_MODEL_NAMES,
  getDefaultPlatformStrategy,
  getEffectiveConfig,
  calculateAllEffectiveCoefficients,
  getPricingModeInfo,
  validateAllPlatformStrategies,
  type PlatformPricingStrategy,
  type PlatformPricingConfigs,
  type PricingConfigItem,
} from '../shared/talentProcurement';
import { PricingConfigList } from '../shared/PricingConfigList';
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

  // v5.1: 使用动态平台列表初始化，支持新的 configs 数组结构
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
          // v5.1: 检查是否为新结构（有 configs 数组）
          if (saved.configs !== undefined) {
            // 新结构：直接使用
            configs[platformKey] = {
              enabled: saved.enabled || false,
              pricingModel: saved.pricingModel || 'framework',
              configs: saved.configs || null,
            };
          } else {
            // 旧结构：转换为新结构（单配置转换为数组）
            const legacyConfig: PricingConfigItem = {
              id: `legacy_${platformKey}_${Date.now()}`,
              discountRate: saved.discountRate ?? 1.0,
              serviceFeeRate: saved.serviceFeeRate ?? 0,
              platformFeeRate: saved.platformFeeRate || platformFeeRate,
              includesPlatformFee: saved.includesPlatformFee || false,
              serviceFeeBase: saved.serviceFeeBase || 'beforeDiscount',
              includesTax: saved.includesTax ?? true,
              taxCalculationBase: saved.taxCalculationBase || 'excludeServiceFee',
              validFrom: saved.validFrom || null,
              validTo: saved.validTo || null,
              isPermanent: saved.isPermanent || false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            configs[platformKey] = {
              enabled: saved.enabled || false,
              pricingModel: saved.pricingModel || 'framework',
              configs: saved.pricingModel === 'project' ? null : [legacyConfig],
            };
          }
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

  // v5.1: 获取所有已配置的平台列表（使用新的 PlatformPricingStrategy 结构）
  // 单平台模式下只显示指定平台
  const configuredPlatformConfigsList = Object.entries(platformPricingConfigs)
    .filter(([key, config]) => {
      if (config === undefined || config === null) return false;
      // 单平台模式下只显示指定平台
      if (isSinglePlatformMode && key !== platform) return false;
      return true;
    })
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

  // v5.1: 检测策略是否有变化（使用 JSON 深度比较）
  const hasStrategyChanged = (): boolean => {
    if (!originalSnapshot) return true;
    return (
      JSON.stringify(originalSnapshot.platformPricingConfigs) !==
      JSON.stringify(platformPricingConfigs)
    );
  };

  // v5.1: 保存策略（使用 calculateAllEffectiveCoefficients）
  const handleSave = async () => {
    if (!hasStrategyChanged()) {
      message.warning('策略配置未发生变化');
      return;
    }

    const validationResult = validateAllPlatformStrategies(
      platformPricingConfigs,
      getPlatformName
    );
    if (!validationResult.valid) {
      message.error(validationResult.errors[0]);
      return;
    }

    setSaving(true);
    try {
      // v5.1: 使用 calculateAllEffectiveCoefficients 计算所有有效系数
      const quotationCoefficients =
        calculateAllEffectiveCoefficients(platformPricingConfigs);

      // 检查是否有无效系数
      const hasInvalidCoefficient = Object.entries(quotationCoefficients).some(
        ([platform, coefficient]) => {
          if (
            isNaN(coefficient) ||
            !isFinite(coefficient) ||
            coefficient <= 0 ||
            coefficient >= 10
          ) {
            logger.error(`Invalid coefficient for ${platform}:`, coefficient);
            return true;
          }
          return false;
        }
      );

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

  // v5.1: 取消编辑（恢复原始快照）
  const handleCancel = () => {
    if (originalSnapshot) {
      // 从原始快照恢复
      setPlatformPricingConfigs(
        JSON.parse(JSON.stringify(originalSnapshot.platformPricingConfigs))
      );
    }
    setIsEditing(false);
    setIsCreating(false);
  };

  // v5.1: 开始新建策略（使用 getDefaultPlatformStrategy）
  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    const configs: PlatformPricingConfigs = {};
    enabledPlatforms.forEach(platformConfig => {
      const platformFeeRate = platformConfig.business?.fee || 0;
      configs[platformConfig.platform] =
        getDefaultPlatformStrategy(platformFeeRate);
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

  // v5.1: 删除某个平台配置
  const handleDeletePlatform = async (platformKey: string) => {
    setSaving(true);
    try {
      // 将要删除的平台配置设置为 null（而不是 delete），
      // 这样 MongoDB 的 $set 操作才能正确清除该字段
      const updatedConfigs = { ...platformPricingConfigs };
      updatedConfigs[platformKey] = null as any;

      // v5.1: 使用 calculateAllEffectiveCoefficients 计算剩余平台的系数
      const validConfigs = Object.fromEntries(
        Object.entries(updatedConfigs).filter(([, v]) => v !== null)
      );
      const calculatedCoefficients =
        calculateAllEffectiveCoefficients(validConfigs);

      // 被删除的平台系数设为 null
      const quotationCoefficients: Record<string, number | null> = {
        ...calculatedCoefficients,
        [platformKey]: null,
      };

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

  // v5.1: 切换平台启用状态
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
      // v5.1: 使用 calculateAllEffectiveCoefficients 计算所有系数
      const quotationCoefficients =
        calculateAllEffectiveCoefficients(updatedConfigs);

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
                  // v5.1: 初始化当前平台的配置（使用 getDefaultPlatformStrategy）
                  const platformConfig = enabledPlatforms.find(
                    p => p.platform === platform
                  );
                  const platformFeeRate = platformConfig?.business?.fee || 0;
                  setPlatformPricingConfigs({
                    ...platformPricingConfigs,
                    [platform!]: getDefaultPlatformStrategy(platformFeeRate),
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
          // v5.1: 只读模式 - 使用 PricingConfigList 展示多时间段配置
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
                  const isEnabled = platformItem.strategy.enabled;

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
                        // v5.1: 使用 PricingConfigList 展示多时间段配置
                        <div className="space-y-3">
                          <PricingConfigList
                            configs={platformItem.strategy.configs || []}
                            readonly={true}
                            compact={true}
                            quotationCoefficient={platformItem.quotationCoefficient}
                          />
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
