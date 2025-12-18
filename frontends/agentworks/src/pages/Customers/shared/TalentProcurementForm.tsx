/**
 * 达人采买策略表单组件 (v5.1)
 * 共用组件，被 TalentProcurementCard 和 PricingStrategy 页面使用
 *
 * 功能：
 * - 平台选择和启用开关
 * - 定价模式选择（框架折扣/项目比价/混合模式）
 * - 多时间段配置列表编辑
 * - 报价系数实时计算
 *
 * v5.1 变更：
 * - 配置参数编辑改用 PricingConfigList 组件，支持多时间段
 * - 移除单配置参数编辑界面
 */

import { useMemo } from 'react';
import { Radio, Switch, Select, Tag, Popover } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { PlatformConfig as ApiPlatformConfig } from '../../../api/platformConfig';
import {
  getDefaultPlatformStrategy,
  calculateCoefficientFromConfig,
  getEffectiveConfig,
  getPricingModeInfo,
  type PlatformPricingStrategy,
  type PlatformPricingConfigs,
  type PricingModel,
  type PricingConfigItem,
} from './talentProcurement';
import { PricingConfigList } from './PricingConfigList';

interface TalentProcurementFormProps {
  /** 启用价格管理的平台列表 */
  enabledPlatforms: ApiPlatformConfig[];
  /** 当前选中的平台 */
  selectedPlatform: string;
  /** 平台选择变化回调 */
  onPlatformChange: (platform: string) => void;
  /** 平台定价配置 */
  platformPricingConfigs: PlatformPricingConfigs;
  /** 配置变化回调 */
  onConfigChange: (configs: PlatformPricingConfigs) => void;
  /** 获取平台名称 */
  getPlatformName: (platformKey: string) => string;
  /** 获取平台配置 */
  getPlatformConfigByKey: (
    platformKey: string
  ) => ApiPlatformConfig | undefined;
  /** 单平台模式：隐藏平台选择器 */
  singlePlatformMode?: boolean;
}

export function TalentProcurementForm({
  enabledPlatforms,
  selectedPlatform,
  onPlatformChange,
  platformPricingConfigs,
  onConfigChange,
  getPlatformName,
  getPlatformConfigByKey,
  singlePlatformMode = false,
}: TalentProcurementFormProps) {
  // 当前选中平台的配置
  const currentPlatformConfigData = getPlatformConfigByKey(selectedPlatform);
  const currentPlatformFeeRate = currentPlatformConfigData?.business?.fee || 0;

  // v5.1: 获取当前平台策略（使用新的 PlatformPricingStrategy 结构）
  const currentStrategy = useMemo((): PlatformPricingStrategy => {
    return (
      platformPricingConfigs[selectedPlatform] ||
      getDefaultPlatformStrategy(currentPlatformFeeRate)
    );
  }, [platformPricingConfigs, selectedPlatform, currentPlatformFeeRate]);

  // v5.1: 计算当前有效配置的报价系数
  const currentQuotationCoefficient = useMemo(() => {
    if (!currentStrategy.enabled || currentStrategy.pricingModel === 'project') {
      return null;
    }
    const effectiveConfig = getEffectiveConfig(currentStrategy.configs || []);
    if (!effectiveConfig) return null;
    // calculateCoefficientFromConfig 返回 CoefficientResult 对象，需要取 .coefficient
    const result = calculateCoefficientFromConfig(effectiveConfig);
    return result.coefficient;
  }, [currentStrategy]);

  // v5.1: 更新当前平台策略的字段
  const updateCurrentPlatformStrategy = (
    field: keyof PlatformPricingStrategy,
    value: PlatformPricingStrategy[keyof PlatformPricingStrategy]
  ) => {
    const platformData = enabledPlatforms.find(
      p => p.platform === selectedPlatform
    );
    const feeRate = platformData?.business?.fee || 0;
    const existingStrategy = platformPricingConfigs[selectedPlatform];
    const baseStrategy = existingStrategy || getDefaultPlatformStrategy(feeRate);

    onConfigChange({
      ...platformPricingConfigs,
      [selectedPlatform]: {
        ...baseStrategy,
        [field]: value,
      },
    });
  };

  // v5.1: 处理配置列表变化
  const handleConfigsChange = (newConfigs: PricingConfigItem[]) => {
    const platformData = enabledPlatforms.find(
      p => p.platform === selectedPlatform
    );
    const feeRate = platformData?.business?.fee || 0;
    const existingStrategy = platformPricingConfigs[selectedPlatform];
    const baseStrategy = existingStrategy || getDefaultPlatformStrategy(feeRate);

    onConfigChange({
      ...platformPricingConfigs,
      [selectedPlatform]: {
        ...baseStrategy,
        configs: newConfigs,
      },
    });
  };

  // 处理平台选择变化
  const handlePlatformChange = (value: string) => {
    // 如果选择的平台没有配置，自动初始化
    if (!platformPricingConfigs[value]) {
      const platformConfig = enabledPlatforms.find(p => p.platform === value);
      const platformFeeRate = platformConfig?.business?.fee || 0;
      onConfigChange({
        ...platformPricingConfigs,
        [value]: getDefaultPlatformStrategy(platformFeeRate),
      });
    }
    onPlatformChange(value);
  };

  return (
    <div className="space-y-4">
      {/* 平台选择区域 - 单平台模式下只显示启用开关 */}
      <div className="flex items-center gap-4 p-4 bg-surface-base rounded-lg">
        {singlePlatformMode ? (
          // 单平台模式：显示平台名称 + 启用开关
          <>
            <span className="text-sm font-medium text-content">
              {getPlatformName(selectedPlatform)}
            </span>
            <span className="text-sm text-content-secondary">|</span>
            <span className="text-sm text-content-secondary">启用</span>
            <Switch
              checked={currentStrategy.enabled}
              onChange={checked =>
                updateCurrentPlatformStrategy('enabled', checked)
              }
            />
          </>
        ) : (
          // 多平台模式：显示平台选择器 + 启用开关
          <>
            <span className="text-sm text-content-secondary">选择平台:</span>
            <Select
              value={selectedPlatform}
              onChange={handlePlatformChange}
              options={enabledPlatforms.map(p => ({
                value: p.platform,
                label: p.name,
              }))}
              style={{ width: 120 }}
            />
            <span className="text-sm text-content-secondary">|</span>
            <span className="text-sm text-content-secondary">启用</span>
            <Switch
              checked={currentStrategy.enabled}
              onChange={checked =>
                updateCurrentPlatformStrategy('enabled', checked)
              }
            />
          </>
        )}
      </div>

      {/* 定价模式选择 */}
      <div className="p-4 border border-stroke rounded-lg">
        <div className="text-sm font-medium text-content mb-2">
          定价模式 ({getPlatformName(selectedPlatform)})
        </div>
        <Radio.Group
          value={currentStrategy.pricingModel || 'framework'}
          onChange={e =>
            updateCurrentPlatformStrategy(
              'pricingModel',
              e.target.value as PricingModel
            )
          }
          disabled={!currentStrategy.enabled}
        >
          <Radio value="framework">框架折扣</Radio>
          <Radio value="project">项目比价</Radio>
          <Radio value="hybrid">混合模式</Radio>
        </Radio.Group>
        <div className="mt-2 text-sm text-content-secondary">
          {
            getPricingModeInfo(currentStrategy.pricingModel || 'framework')
              .description
          }
        </div>
      </div>

      {/* 项目比价模式提示 */}
      {currentStrategy.pricingModel === 'project' && currentStrategy.enabled && (
        <div className="text-center py-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg">
          <div className="text-primary-900 dark:text-primary-100 font-semibold mb-1">
            项目比价模式
          </div>
          <div className="text-sm text-primary-700 dark:text-primary-300">
            该平台采用项目比价，创建项目时手动填写对客报价
          </div>
        </div>
      )}

      {/* v5.1: 框架折扣/混合模式配置 - 使用 PricingConfigList 组件 */}
      {currentStrategy.pricingModel !== 'project' && currentStrategy.enabled && (
        <div className="space-y-4 p-4 border border-stroke rounded-lg">
          {/* 报价系数显示 */}
          <div className="flex items-center justify-between pb-3 border-b border-stroke">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-content">
                当前有效报价系数
              </span>
              <Popover
                content={
                  <div className="text-xs text-content-secondary max-w-xs">
                    报价系数 = 最终对客报价 ÷ 达人刊例价
                    <br />
                    用于计算项目中达人的对客报价
                    <br />
                    <br />
                    系数根据当前有效的配置项自动计算
                  </div>
                }
                placement="top"
              >
                <QuestionCircleOutlined className="text-content-muted cursor-help" />
              </Popover>
            </div>
            <div>
              {currentQuotationCoefficient !== null ? (
                <Tag color="blue" className="text-base font-semibold">
                  {currentQuotationCoefficient.toFixed(4)}
                </Tag>
              ) : (
                <span className="text-content-muted text-sm">
                  暂无有效配置
                </span>
              )}
            </div>
          </div>

          {/* 多时间段配置列表 */}
          <PricingConfigList
            configs={currentStrategy.configs || []}
            onChange={handleConfigsChange}
            platformName={getPlatformName(selectedPlatform)}
            platformConfig={currentPlatformConfigData}
            readonly={false}
          />
        </div>
      )}
    </div>
  );
}

export default TalentProcurementForm;
