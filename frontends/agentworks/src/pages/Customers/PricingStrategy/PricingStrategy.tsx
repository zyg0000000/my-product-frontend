/**
 * 客户价格策略配置页面 - 平台独立配置模式
 * v3.0: 每个平台完全独立配置（折扣率、服务费率、有效期、计算选项等）
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormDateRangePicker,
  ProFormSwitch,
  ProCard,
} from '@ant-design/pro-components';
import { Table, Tag, Tabs, Select, App } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerApi } from '../../../services/customerApi';
import { getPlatformName, getPlatformByKey } from '../../../config/platforms';
import { PageHeader } from '../../../components/PageHeader';
import { logger } from '../../../utils/logger';

// 获取所有平台（包括预留的）
const TALENT_PLATFORMS_ALL = [
  { key: 'douyin', name: '抖音', fee: 0.05, enabled: true },
  { key: 'xiaohongshu', name: '小红书', fee: 0.1, enabled: true },
  { key: 'shipinhao', name: '视频号', fee: null, enabled: false },
  { key: 'bilibili', name: 'B站', fee: null, enabled: false },
  { key: 'weibo', name: '微博', fee: null, enabled: false },
];

const ENABLED_PLATFORMS = TALENT_PLATFORMS_ALL.filter(p => p.enabled);

// 平台配置的默认值
const getDefaultPlatformConfig = (platformKey: string) => {
  const platform = getPlatformByKey(platformKey);
  return {
    enabled: false,
    platformFeeRate: platform?.fee || 0,
    discountRate: 1.0, // 默认 100%
    serviceFeeRate: 0, // 默认 0%
    validFrom: null as string | null,
    validTo: null as string | null,
    includesPlatformFee: false,
    serviceFeeBase: 'beforeDiscount' as 'beforeDiscount' | 'afterDiscount',
    includesTax: true,
    taxCalculationBase: 'excludeServiceFee' as
      | 'excludeServiceFee'
      | 'includeServiceFee',
  };
};

// 类型定义
interface PlatformConfig {
  enabled?: boolean;
  platformFeeRate?: number;
  discountRate?: number;
  serviceFeeRate?: number;
  validFrom?: string | null;
  validTo?: string | null;
  includesPlatformFee?: boolean;
  serviceFeeBase?: 'beforeDiscount' | 'afterDiscount';
  includesTax?: boolean;
  taxCalculationBase?: 'excludeServiceFee' | 'includeServiceFee';
}

interface PlatformFees {
  [key: string]: PlatformConfig;
}

export default function PricingStrategy() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // 客户数据类型
  interface CustomerData {
    _id?: string;
    code?: string;
    name?: string;
    businessStrategies?: {
      talentProcurement?: {
        enabled?: boolean;
        pricingModel?: string;
        platformFees?: PlatformFees;
      };
      adPlacement?: { enabled?: boolean };
      contentProduction?: { enabled?: boolean };
    };
  }

  // 系数计算结果类型
  interface CoefficientResult {
    platform: string;
    baseAmount: number;
    platformFeeAmount: number;
    discountedAmount: number;
    serviceFeeAmount: number;
    taxAmount: number;
    finalAmount: number;
    coefficient: number;
  }

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [coefficients, setCoefficients] = useState<
    Record<string, CoefficientResult>
  >({});
  const [activeTab, setActiveTab] = useState('talentProcurement');
  const [currentPricingModel, setCurrentPricingModel] = useState('framework');
  const [selectedPlatform, setSelectedPlatform] = useState('douyin');

  // 平台配置状态（核心数据）
  const [platformFees, setPlatformFees] = useState<PlatformFees>(() => {
    const initial: PlatformFees = {};
    ENABLED_PLATFORMS.forEach(p => {
      initial[p.key] = getDefaultPlatformConfig(p.key);
    });
    return initial;
  });

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await customerApi.getCustomerById(id);
      if (response.success) {
        setCustomer(response.data as CustomerData);
        const strategy = response.data.businessStrategies?.talentProcurement;
        if (strategy) {
          const pricingModel = strategy.pricingModel || 'framework';
          setCurrentPricingModel(pricingModel);

          // 加载平台配置
          const loadedPlatformFees: PlatformFees = {};
          ENABLED_PLATFORMS.forEach(p => {
            const savedConfig = strategy.platformFees?.[p.key];
            if (savedConfig) {
              loadedPlatformFees[p.key] = {
                enabled: savedConfig.enabled || false,
                platformFeeRate: savedConfig.platformFeeRate || p.fee || 0,
                discountRate: savedConfig.discountRate ?? 1.0, // 默认 100%
                serviceFeeRate: savedConfig.serviceFeeRate ?? 0, // 默认 0%
                validFrom: savedConfig.validFrom || null,
                validTo: savedConfig.validTo || null,
                includesPlatformFee: savedConfig.includesPlatformFee || false,
                serviceFeeBase: savedConfig.serviceFeeBase || 'beforeDiscount',
                includesTax: savedConfig.includesTax ?? true,
                taxCalculationBase:
                  savedConfig.taxCalculationBase || 'excludeServiceFee',
              };
            } else {
              loadedPlatformFees[p.key] = getDefaultPlatformConfig(p.key);
            }
          });
          setPlatformFees(loadedPlatformFees);
          // 使用刚加载的 pricingModel，而不是 state 中的（因为 setState 是异步的）
          calculateCoefficients(pricingModel, loadedPlatformFees);
        }
      }
    } catch (error) {
      message.error('加载客户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateCoefficients = (_pricingModel: string, fees: PlatformFees) => {
    const results: Record<string, CoefficientResult> = {};

    Object.entries(fees).forEach(([platform, config]) => {
      if (config?.enabled) {
        const baseAmount = 1000;
        const platformFeeAmount = baseAmount * (config.platformFeeRate || 0);
        const discountRate = config.discountRate || 1.0;

        let discountedAmount;
        if (config.includesPlatformFee) {
          discountedAmount = (baseAmount + platformFeeAmount) * discountRate;
        } else {
          discountedAmount = baseAmount * discountRate + platformFeeAmount;
        }

        let serviceFeeAmount;
        if (config.serviceFeeBase === 'beforeDiscount') {
          serviceFeeAmount =
            (baseAmount + platformFeeAmount) * (config.serviceFeeRate || 0);
        } else {
          serviceFeeAmount = discountedAmount * (config.serviceFeeRate || 0);
        }

        // 税费计算
        let taxAmount = 0;
        const taxRate = 0.06;
        if (!config.includesTax) {
          if (config.taxCalculationBase === 'includeServiceFee') {
            taxAmount = (discountedAmount + serviceFeeAmount) * taxRate;
          } else {
            taxAmount = discountedAmount * taxRate;
          }
        }

        const finalAmount = discountedAmount + serviceFeeAmount + taxAmount;
        const coefficient = finalAmount / baseAmount;

        results[platform] = {
          platform,
          baseAmount,
          platformFeeAmount,
          discountedAmount,
          serviceFeeAmount,
          taxAmount,
          finalAmount,
          coefficient: Number(coefficient.toFixed(4)),
        };
      }
    });

    setCoefficients(results);
  };

  const handleSubmit = async (values: { pricingModel?: string }) => {
    if (!id) return;

    // 构建 paymentCoefficients（从 coefficients 提取系数值，带数值校验）
    const paymentCoefficients: Record<string, number> = {};
    let hasInvalidCoefficient = false;

    Object.entries(coefficients).forEach(([platform, data]) => {
      const coefficient = Number(data.coefficient);

      // 严格校验：必须是有效数字，且在合理范围内
      if (
        !isNaN(coefficient) &&
        isFinite(coefficient) &&
        coefficient > 0 &&
        coefficient < 10
      ) {
        paymentCoefficients[platform] = Number(coefficient.toFixed(4));
      } else {
        logger.error(`Invalid coefficient for ${platform}:`, data.coefficient);
        hasInvalidCoefficient = true;
      }
    });

    if (hasInvalidCoefficient) {
      message.error('支付系数计算异常，请检查配置后重试');
      return;
    }

    // 构建保存数据
    const strategy = {
      enabled: true,
      pricingModel: (values.pricingModel || 'framework') as
        | 'framework'
        | 'project'
        | 'hybrid',
      platformFees: platformFees,
      paymentCoefficients: paymentCoefficients, // 保存计算出的支付系数（仅当前快照）
    };

    try {
      const response = await customerApi.updateCustomer(id, {
        businessStrategies: {
          talentProcurement: strategy as any,
        },
      });
      if (response.success) {
        message.success('价格策略保存成功');
        // 重新加载以同步数据
        await loadCustomer();
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 更新当前选中平台的配置
  const updateCurrentPlatformConfig = (
    field: keyof PlatformConfig,
    value: PlatformConfig[keyof PlatformConfig]
  ) => {
    setPlatformFees(prev => {
      const updated = {
        ...prev,
        [selectedPlatform]: {
          ...prev[selectedPlatform],
          [field]: value,
        },
      };
      calculateCoefficients(currentPricingModel, updated);
      return updated;
    });
  };

  // 根据定价模式获取提示信息
  const getPricingModeInfo = (pricingModel: string) => {
    switch (pricingModel) {
      case 'framework':
        return {
          title: '框架折扣模式',
          description: '项目将自动使用以下支付系数计算对客报价',
          coefficientLabel: '支付系数',
          coefficientColor: 'blue',
          statusText: '项目可用',
          statusIcon: '✓',
        };
      case 'project':
        return {
          title: '项目比价模式',
          description: '以下系数仅供参考，每个项目需单独填写对客报价',
          coefficientLabel: '参考系数',
          coefficientColor: 'default',
          statusText: '仅供参考',
          statusIcon: 'i',
        };
      case 'hybrid':
        return {
          title: '混合模式',
          description: '项目创建时可选择使用系数或手动填写报价',
          coefficientLabel: '基准系数',
          coefficientColor: 'orange',
          statusText: '可选使用',
          statusIcon: '◐',
        };
      default:
        return {
          title: '定价模式',
          description: '',
          coefficientLabel: '支付系数',
          coefficientColor: 'blue',
          statusText: '',
          statusIcon: '',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">加载中...</div>
    );
  }

  // 当前选中平台的配置
  const currentConfig =
    platformFees[selectedPlatform] ||
    getDefaultPlatformConfig(selectedPlatform);
  const currentPlatformInfo = getPlatformByKey(selectedPlatform);

  // Tab 配置
  const tabItems = [
    {
      key: 'talentProcurement',
      label: (
        <span>
          达人采买
          {customer?.businessStrategies?.talentProcurement?.enabled && (
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

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <PageHeader
        title="价格策略配置"
        description={`客户：${customer?.name || ''} (${customer?.code || ''})`}
        onBack={() => navigate('/customers/list')}
      />

      {/* 业务类型 Tabs */}
      <ProCard>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        {/* 达人采买业务配置 */}
        {activeTab === 'talentProcurement' && (
          <ProForm
            initialValues={{
              pricingModel:
                customer?.businessStrategies?.talentProcurement?.pricingModel ||
                'framework',
            }}
            onFinish={handleSubmit}
            onValuesChange={changed => {
              if (changed.pricingModel) {
                setCurrentPricingModel(changed.pricingModel);
                calculateCoefficients(changed.pricingModel, platformFees);
              }
            }}
            submitter={{
              searchConfig: {
                submitText: '保存配置',
                resetText: '取消',
              },
              render: (_props, doms) => {
                return (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-end gap-3 bg-gray-50 p-4 rounded-lg">
                      {doms}
                    </div>
                  </div>
                );
              },
            }}
          >
            {/* 定价模式选择（一行显示） */}
            <ProCard title="定价模式" headerBordered className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <ProFormRadio.Group
                    name="pricingModel"
                    options={[
                      { label: '框架折扣', value: 'framework' },
                      { label: '项目比价', value: 'project' },
                      { label: '混合模式', value: 'hybrid' },
                    ]}
                  />
                </div>
                <div className="text-sm text-primary-600 flex items-center gap-2">
                  <span className="text-2xl">
                    {getPricingModeInfo(currentPricingModel).statusIcon}
                  </span>
                  <span>
                    {getPricingModeInfo(currentPricingModel).description}
                  </span>
                </div>
              </div>
            </ProCard>

            {/* 项目比价模式：只显示说明 */}
            {currentPricingModel === 'project' && (
              <div className="text-center py-12 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="text-primary-900 font-semibold mb-2">
                  项目比价模式
                </div>
                <div className="text-sm text-primary-700">
                  项目比价模式下无需预设配置。创建项目时，请在合作明细中手动填写对客报价。
                </div>
              </div>
            )}

            {/* 框架折扣/混合模式：显示平台配置 */}
            {(currentPricingModel === 'framework' ||
              currentPricingModel === 'hybrid') && (
              <>
                {/* 平台配置卡片（融合选择器） */}
                <ProCard
                  title="平台配置"
                  headerBordered
                  className="mb-4"
                  extra={
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">选择平台:</span>
                      <Select
                        value={selectedPlatform}
                        onChange={setSelectedPlatform}
                        options={TALENT_PLATFORMS_ALL.map(p => ({
                          value: p.key,
                          label: p.name,
                          disabled: !p.enabled && p.fee === null,
                        }))}
                        style={{ width: 150 }}
                      />
                      <span className="text-sm text-gray-400 mx-2">|</span>
                      <span className="text-sm text-gray-500">启用</span>
                      <ProFormSwitch
                        name={`${selectedPlatform}Enabled`}
                        noStyle
                        fieldProps={{
                          checked: currentConfig.enabled,
                          onChange: checked =>
                            updateCurrentPlatformConfig('enabled', checked),
                        }}
                      />
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {/* 第一行：基础配置（4列） */}
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          折扣率 (%)
                        </label>
                        <ProFormDigit
                          name={`${selectedPlatform}DiscountRate`}
                          noStyle
                          min={0}
                          max={100}
                          fieldProps={{
                            precision: 2,
                            value: Number(
                              ((currentConfig.discountRate || 0) * 100).toFixed(
                                2
                              )
                            ),
                            onChange: val =>
                              updateCurrentPlatformConfig(
                                'discountRate',
                                (val || 0) / 100
                              ),
                            disabled: !currentConfig.enabled,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          服务费率 (%)
                        </label>
                        <ProFormDigit
                          name={`${selectedPlatform}ServiceFeeRate`}
                          noStyle
                          min={0}
                          max={100}
                          fieldProps={{
                            precision: 2,
                            value: Number(
                              (
                                (currentConfig.serviceFeeRate || 0) * 100
                              ).toFixed(2)
                            ),
                            onChange: val =>
                              updateCurrentPlatformConfig(
                                'serviceFeeRate',
                                (val || 0) / 100
                              ),
                            disabled: !currentConfig.enabled,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          有效期
                        </label>
                        <ProFormDateRangePicker
                          name={`${selectedPlatform}ValidPeriod`}
                          noStyle
                          placeholder={['开始', '结束']}
                          fieldProps={{
                            format: 'YYYY-MM-DD',
                            value:
                              currentConfig.validFrom && currentConfig.validTo
                                ? [
                                    dayjs(currentConfig.validFrom),
                                    dayjs(currentConfig.validTo),
                                  ]
                                : undefined,
                            onChange: (
                              dates:
                                | [dayjs.Dayjs | null, dayjs.Dayjs | null]
                                | null
                            ) => {
                              if (dates && dates[0] && dates[1]) {
                                const validFrom = dates[0].format('YYYY-MM-DD');
                                const validTo = dates[1].format('YYYY-MM-DD');
                                setPlatformFees(prev => ({
                                  ...prev,
                                  [selectedPlatform]: {
                                    ...prev[selectedPlatform],
                                    validFrom,
                                    validTo,
                                  },
                                }));
                                calculateCoefficients(currentPricingModel, {
                                  ...platformFees,
                                  [selectedPlatform]: {
                                    ...platformFees[selectedPlatform],
                                    validFrom,
                                    validTo,
                                  },
                                });
                              } else {
                                setPlatformFees(prev => ({
                                  ...prev,
                                  [selectedPlatform]: {
                                    ...prev[selectedPlatform],
                                    validFrom: null,
                                    validTo: null,
                                  },
                                }));
                              }
                            },
                            disabled: !currentConfig.enabled,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          平台费
                        </label>
                        <div className="h-8 flex items-center">
                          <Tag color="blue">
                            {((currentPlatformInfo?.fee || 0) * 100).toFixed(0)}
                            % (固定)
                          </Tag>
                        </div>
                      </div>
                    </div>

                    {/* 第二行：配置选项（4列统一） */}
                    <div className="grid grid-cols-4 gap-4 pt-3">
                      <ProFormRadio.Group
                        name={`${selectedPlatform}IncludesPlatformFee`}
                        label="折扣包含平台费"
                        fieldProps={{
                          value: currentConfig.includesPlatformFee,
                          onChange: e =>
                            updateCurrentPlatformConfig(
                              'includesPlatformFee',
                              e.target.value
                            ),
                          disabled: !currentConfig.enabled,
                        }}
                        options={[
                          { label: '不含', value: false },
                          { label: '含', value: true },
                        ]}
                      />
                      <ProFormRadio.Group
                        name={`${selectedPlatform}ServiceFeeBase`}
                        label="服务费计算基准"
                        fieldProps={{
                          value: currentConfig.serviceFeeBase,
                          onChange: e =>
                            updateCurrentPlatformConfig(
                              'serviceFeeBase',
                              e.target.value
                            ),
                          disabled: !currentConfig.enabled,
                        }}
                        options={[
                          { label: '折扣前', value: 'beforeDiscount' },
                          { label: '折扣后', value: 'afterDiscount' },
                        ]}
                      />
                      <ProFormRadio.Group
                        name={`${selectedPlatform}IncludesTax`}
                        label="报价税费设置"
                        fieldProps={{
                          value: currentConfig.includesTax,
                          onChange: e =>
                            updateCurrentPlatformConfig(
                              'includesTax',
                              e.target.value
                            ),
                          disabled: !currentConfig.enabled,
                        }}
                        options={[
                          { label: '含税', value: true },
                          { label: '不含', value: false },
                        ]}
                      />
                      <ProFormRadio.Group
                        name={`${selectedPlatform}TaxCalculationBase`}
                        label="税费计算基准"
                        fieldProps={{
                          value: currentConfig.taxCalculationBase,
                          onChange: e =>
                            updateCurrentPlatformConfig(
                              'taxCalculationBase',
                              e.target.value
                            ),
                          disabled:
                            !currentConfig.enabled || currentConfig.includesTax,
                        }}
                        options={[
                          { label: '不含服务费', value: 'excludeServiceFee' },
                          { label: '含服务费', value: 'includeServiceFee' },
                        ]}
                      />
                    </div>

                    {/* 说明 */}
                    <div className="text-xs text-gray-500">
                      有效期留空表示长期有效。各平台配置完全独立。
                    </div>
                  </div>
                </ProCard>

                {/* 配置总览 */}
                <ProCard title="配置总览" headerBordered className="mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    {ENABLED_PLATFORMS.map(p => {
                      const config = platformFees[p.key];
                      return (
                        <div
                          key={p.key}
                          className={`border rounded-lg p-3 ${config?.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{p.name}</span>
                            <Tag color={config?.enabled ? 'green' : 'default'}>
                              {config?.enabled ? '已启用' : '未启用'}
                            </Tag>
                          </div>
                          {config?.enabled && (
                            <div className="mt-2 text-xs text-gray-600 space-y-1">
                              <div>
                                折扣率:{' '}
                                {((config.discountRate || 0) * 100).toFixed(0)}%
                              </div>
                              <div>
                                服务费率:{' '}
                                {((config.serviceFeeRate || 0) * 100).toFixed(
                                  0
                                )}
                                %
                              </div>
                              <div>
                                平台费: {((p.fee || 0) * 100).toFixed(0)}%
                              </div>
                              {config.validFrom && config.validTo && (
                                <div>
                                  有效期: {config.validFrom} ~ {config.validTo}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ProCard>
              </>
            )}
          </ProForm>
        )}

        {/* 广告投流业务（开发中） */}
        {activeTab === 'adPlacement' && (
          <div className="text-center py-12 text-gray-500">
            广告投流业务配置功能开发中...
          </div>
        )}

        {/* 内容制作业务（开发中） */}
        {activeTab === 'contentProduction' && (
          <div className="text-center py-12 text-gray-500">
            内容制作业务配置功能开发中...
          </div>
        )}
      </ProCard>

      {/* 支付系数记录 - 横向放在最下方 */}
      <ProCard
        title={
          <div className="flex items-center gap-2">
            <CalculatorOutlined />
            <span>支付系数记录</span>
          </div>
        }
        headerBordered
      >
        {Object.keys(coefficients).length > 0 ? (
          <Table
            columns={[
              {
                title: '平台',
                dataIndex: 'platform',
                key: 'platform',
                render: (val: string) => getPlatformName(val),
              },
              {
                title: '折扣率',
                dataIndex: 'discountRate',
                key: 'discountRate',
                render: (_: unknown, record: CoefficientResult) =>
                  `${((platformFees[record.platform]?.discountRate || 0) * 100).toFixed(2)}%`,
              },
              {
                title: '服务费率',
                dataIndex: 'serviceFeeRate',
                key: 'serviceFeeRate',
                render: (_: unknown, record: CoefficientResult) =>
                  `${((platformFees[record.platform]?.serviceFeeRate || 0) * 100).toFixed(2)}%`,
              },
              {
                title: '平台费',
                dataIndex: 'platformFeeAmount',
                key: 'platformFeeAmount',
                render: (val: number) => `¥${(val / 100).toFixed(2)}`,
              },
              {
                title: '有效期',
                dataIndex: 'validPeriod',
                key: 'validPeriod',
                render: (_: unknown, record: CoefficientResult) => {
                  const config = platformFees[record.platform];
                  return config?.validFrom && config?.validTo ? (
                    `${config.validFrom} ~ ${config.validTo}`
                  ) : (
                    <span className="text-gray-400">长期有效</span>
                  );
                },
              },
              {
                title: '最终金额',
                dataIndex: 'finalAmount',
                key: 'finalAmount',
                render: (val: number) => (
                  <span className="font-bold">¥{(val / 100).toFixed(2)}</span>
                ),
              },
              {
                title: '支付系数',
                dataIndex: 'coefficient',
                key: 'coefficient',
                render: (val: number) => <Tag color="blue">{val}</Tag>,
              },
            ]}
            dataSource={Object.values(coefficients)}
            rowKey="platform"
            pagination={false}
            size="middle"
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            请启用至少一个平台后查看支付系数记录
          </div>
        )}
      </ProCard>
    </div>
  );
}
