/**
 * 达人采买策略表单组件 (v5.0)
 * 共用组件，被 TalentProcurementCard 和 PricingStrategy 页面使用
 *
 * 功能：
 * - 平台选择和启用开关
 * - 定价模式选择（框架折扣/项目比价/混合模式）
 * - 配置参数编辑（折扣率、服务费率、有效期等）
 * - 报价系数实时计算
 */

import { useMemo } from 'react';
import {
  Radio,
  InputNumber,
  DatePicker,
  Switch,
  Select,
  Tag,
  Checkbox,
  Popover,
} from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PlatformConfig as ApiPlatformConfig } from '../../../api/platformConfig';
import {
  getDefaultPlatformConfig,
  calculateCoefficient,
  getPricingModeInfo,
  type PlatformConfig,
  type PlatformPricingConfigs,
  type PricingModel,
} from './talentProcurement';

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
  const currentConfig = useMemo(() => {
    return (
      platformPricingConfigs[selectedPlatform] ||
      getDefaultPlatformConfig(currentPlatformFeeRate)
    );
  }, [platformPricingConfigs, selectedPlatform, currentPlatformFeeRate]);

  // 更新当前平台配置
  const updateCurrentPlatformConfig = (
    field: keyof PlatformConfig,
    value: PlatformConfig[keyof PlatformConfig]
  ) => {
    const platformData = enabledPlatforms.find(
      p => p.platform === selectedPlatform
    );
    const feeRate = platformData?.business?.fee || 0;
    const existingConfig = platformPricingConfigs[selectedPlatform];
    const baseConfig = existingConfig || getDefaultPlatformConfig(feeRate);

    onConfigChange({
      ...platformPricingConfigs,
      [selectedPlatform]: {
        ...baseConfig,
        [field]: value,
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
        [value]: getDefaultPlatformConfig(platformFeeRate),
      });
    }
    onPlatformChange(value);
  };

  // 处理有效期变化
  const handleValidityChange = (
    dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  ) => {
    if (dates && dates[0] && dates[1]) {
      onConfigChange({
        ...platformPricingConfigs,
        [selectedPlatform]: {
          ...platformPricingConfigs[selectedPlatform],
          validFrom: dates[0].format('YYYY-MM-DD'),
          validTo: dates[1].format('YYYY-MM-DD'),
          isPermanent: false, // 选择日期时取消长期有效
        },
      });
    } else {
      onConfigChange({
        ...platformPricingConfigs,
        [selectedPlatform]: {
          ...platformPricingConfigs[selectedPlatform],
          validFrom: null,
          validTo: null,
        },
      });
    }
  };

  // 处理长期有效变化
  const handlePermanentChange = (e: CheckboxChangeEvent) => {
    const isPermanent = e.target.checked;
    onConfigChange({
      ...platformPricingConfigs,
      [selectedPlatform]: {
        ...platformPricingConfigs[selectedPlatform],
        isPermanent,
        // 勾选长期有效时清空日期
        validFrom: isPermanent
          ? null
          : platformPricingConfigs[selectedPlatform]?.validFrom,
        validTo: isPermanent
          ? null
          : platformPricingConfigs[selectedPlatform]?.validTo,
      },
    });
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
              checked={currentConfig.enabled}
              onChange={checked =>
                updateCurrentPlatformConfig('enabled', checked)
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
              checked={currentConfig.enabled}
              onChange={checked =>
                updateCurrentPlatformConfig('enabled', checked)
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
          value={currentConfig.pricingModel || 'framework'}
          onChange={e =>
            updateCurrentPlatformConfig(
              'pricingModel',
              e.target.value as PricingModel
            )
          }
          disabled={!currentConfig.enabled}
        >
          <Radio value="framework">框架折扣</Radio>
          <Radio value="project">项目比价</Radio>
          <Radio value="hybrid">混合模式</Radio>
        </Radio.Group>
        <div className="mt-2 text-sm text-content-secondary">
          {
            getPricingModeInfo(currentConfig.pricingModel || 'framework')
              .description
          }
        </div>
      </div>

      {/* 项目比价模式提示 */}
      {currentConfig.pricingModel === 'project' && currentConfig.enabled && (
        <div className="text-center py-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg">
          <div className="text-primary-900 dark:text-primary-100 font-semibold mb-1">
            项目比价模式
          </div>
          <div className="text-sm text-primary-700 dark:text-primary-300">
            该平台采用项目比价，创建项目时手动填写对客报价
          </div>
        </div>
      )}

      {/* 框架折扣/混合模式配置 */}
      {currentConfig.pricingModel !== 'project' && currentConfig.enabled && (
        <div className="space-y-4 p-4 border border-stroke rounded-lg">
          {/* 第一行：折扣率、服务费率、有效期、长期有效 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                折扣率 (%)
              </label>
              <InputNumber
                min={0}
                max={100}
                precision={2}
                value={Number(
                  ((currentConfig.discountRate || 0) * 100).toFixed(2)
                )}
                onChange={val =>
                  updateCurrentPlatformConfig('discountRate', (val || 0) / 100)
                }
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                服务费率 (%)
              </label>
              <InputNumber
                min={0}
                max={100}
                precision={2}
                value={Number(
                  ((currentConfig.serviceFeeRate || 0) * 100).toFixed(2)
                )}
                onChange={val =>
                  updateCurrentPlatformConfig(
                    'serviceFeeRate',
                    (val || 0) / 100
                  )
                }
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                有效期 <span className="text-danger-500">*</span>
              </label>
              <DatePicker.RangePicker
                format="YYYY-MM-DD"
                value={
                  currentConfig.validFrom && currentConfig.validTo
                    ? [
                        dayjs(currentConfig.validFrom),
                        dayjs(currentConfig.validTo),
                      ]
                    : null
                }
                onChange={handleValidityChange}
                style={{ width: '100%' }}
                placeholder={['开始', '结束']}
                disabled={currentConfig.isPermanent}
                allowEmpty={[true, true]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                长期有效
              </label>
              <div className="h-8 flex items-center">
                <Checkbox
                  checked={currentConfig.isPermanent}
                  onChange={handlePermanentChange}
                  className="whitespace-nowrap"
                >
                  长期有效
                </Checkbox>
              </div>
            </div>
          </div>

          {/* 第二行：平台费 + 配置选项 + 报价系数 */}
          <div className="grid grid-cols-6 gap-4 pt-3 border-t border-stroke">
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                平台费
              </label>
              <div className="h-8 flex items-center">
                <Tag color="blue">
                  {(
                    (currentPlatformConfigData?.business?.fee || 0) * 100
                  ).toFixed(0)}
                  % (固定)
                </Tag>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                折扣包含平台费
              </label>
              <Radio.Group
                value={currentConfig.includesPlatformFee}
                onChange={e =>
                  updateCurrentPlatformConfig(
                    'includesPlatformFee',
                    e.target.value
                  )
                }
              >
                <Radio value={false}>不含</Radio>
                <Radio value={true}>含</Radio>
              </Radio.Group>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                服务费计算基准
              </label>
              <Radio.Group
                value={currentConfig.serviceFeeBase}
                onChange={e =>
                  updateCurrentPlatformConfig('serviceFeeBase', e.target.value)
                }
              >
                <Radio value="beforeDiscount">折扣前</Radio>
                <Radio value="afterDiscount">折扣后</Radio>
              </Radio.Group>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                报价税费设置
              </label>
              <Radio.Group
                value={currentConfig.includesTax}
                onChange={e =>
                  updateCurrentPlatformConfig('includesTax', e.target.value)
                }
              >
                <Radio value={true}>含税</Radio>
                <Radio value={false}>不含</Radio>
              </Radio.Group>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                税费计算基准
              </label>
              <Radio.Group
                value={currentConfig.taxCalculationBase}
                onChange={e =>
                  updateCurrentPlatformConfig(
                    'taxCalculationBase',
                    e.target.value
                  )
                }
                disabled={currentConfig.includesTax}
              >
                <Radio value="excludeServiceFee">不含服务费</Radio>
                <Radio value="includeServiceFee">含服务费</Radio>
              </Radio.Group>
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                报价系数
                <Popover
                  content={
                    <div className="text-xs text-content-secondary max-w-xs">
                      报价系数 = 最终对客报价 ÷ 达人刊例价
                      <br />
                      用于计算项目中达人的对客报价
                    </div>
                  }
                  placement="top"
                >
                  <QuestionCircleOutlined className="ml-1 text-content-muted cursor-help" />
                </Popover>
              </label>
              <div className="h-8 flex items-center">
                {(() => {
                  const config = platformPricingConfigs[selectedPlatform];
                  if (config?.enabled && config.pricingModel !== 'project') {
                    const result = calculateCoefficient(config);
                    return (
                      <Tag color="blue" className="text-base font-semibold">
                        {result.coefficient.toFixed(4)}
                      </Tag>
                    );
                  }
                  return <span className="text-content-muted">-</span>;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TalentProcurementForm;
