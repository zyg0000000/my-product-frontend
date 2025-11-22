/**
 * 客户价格策略配置页面 - 多业务类型支持
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormDateRangePicker,
  ProFormCheckbox,
  ProCard,
} from '@ant-design/pro-components';
import { Table, Tag, Tabs, Segmented } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import type { TalentProcurementStrategy } from '../../../types/customer';
import { customerApi } from '../../../services/customerApi';
import { Toast } from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { TALENT_PLATFORMS, getPlatformName } from '../../../config/platforms';
import { PageHeader } from '../../../components/PageHeader';

export default function PricingStrategy() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coefficients, setCoefficients] = useState<any>({});
  const [activeTab, setActiveTab] = useState('talentProcurement');
  const [currentPricingModel, setCurrentPricingModel] = useState('framework');
  const [selectedPlatform, setSelectedPlatform] = useState('douyin'); // 当前配置的平台
  const { toast, hideToast, success, error: showError } = useToast();

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
        setCustomer(response.data);
        if (response.data.businessStrategies?.talentProcurement) {
          setCurrentPricingModel(response.data.businessStrategies.talentProcurement.pricingModel || 'framework');
          calculateCoefficients(response.data.businessStrategies.talentProcurement);
        }
      }
    } catch (error) {
      showError('加载客户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateCoefficients = (strategy: any) => {
    const results: any = {};

    Object.entries(strategy.platformFees).forEach(([platform, config]) => {
      if (config?.enabled) {
        const baseAmount = 1000;
        const platformFeeAmount = baseAmount * (config.platformFeeRate || config.rate || 0);

        // v2.0: 优先使用平台级折扣率，回退到全局折扣率
        const discountRate = config.discountRate || strategy.discount?.rate || 1.0;

        let discountedAmount;
        if (strategy.discount?.includesPlatformFee) {
          discountedAmount = (baseAmount + platformFeeAmount) * discountRate;
        } else {
          discountedAmount = baseAmount * discountRate + platformFeeAmount;
        }

        let serviceFeeAmount;
        if (strategy.serviceFee.calculationBase === 'beforeDiscount') {
          serviceFeeAmount = (baseAmount + platformFeeAmount) * strategy.serviceFee.rate;
        } else {
          serviceFeeAmount = discountedAmount * strategy.serviceFee.rate;
        }

        // 税费计算
        let taxAmount = 0;
        if (!strategy.tax?.includesTax) {
          // 不含税时，根据税费计算基准计算
          if (strategy.tax?.calculationBase === 'includeServiceFee') {
            taxAmount = (discountedAmount + serviceFeeAmount) * (strategy.tax?.rate || 0);
          } else {
            taxAmount = discountedAmount * (strategy.tax?.rate || 0);
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

  const handleSubmit = async (values: any) => {
    if (!id) return;

    // 动态构建 platformFees（v2.0 支持平台级折扣率）
    const platformFees: any = {};
    TALENT_PLATFORMS.forEach(platform => {
      if (platform.fee !== null) {
        platformFees[platform.key] = {
          enabled: values[`${platform.key}Enabled`] || false,
          platformFeeRate: platform.fee,
          discountRate: values[`${platform.key}DiscountRate`] / 100,
        };
      }
    });

    const strategy: any = {
      enabled: true,
      pricingModel: values.pricingModel || 'framework',
      discount: {
        rate: values.discountRate / 100,
        includesPlatformFee: values.includesPlatformFee,
        validFrom: values.validPeriod?.[0] || null,
        validTo: values.validPeriod?.[1] || null,
      },
      serviceFee: {
        rate: values.serviceFeeRate / 100,
        calculationBase: values.serviceFeeBase,
      },
      tax: {
        rate: 0.06,
        includesTax: values.includesTax,
        calculationBase: values.taxCalculationBase || 'excludeServiceFee',
      },
      platformFees,
    };

    calculateCoefficients(strategy);

    try {
      const response = await customerApi.updateCustomer(id, {
        businessStrategies: {
          talentProcurement: strategy,
        },
      });
      if (response.success) {
        success('价格策略保存成功');
      } else {
        showError('保存失败');
      }
    } catch (error) {
      showError('保存失败');
    }
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
          statusIcon: 'ⓘ',
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

  const coefficientColumns = [
    { title: '平台', dataIndex: 'platform', key: 'platform',
      render: (val: string) => getPlatformName(val) },
    { title: '基础金额', dataIndex: 'baseAmount', key: 'baseAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '平台费', dataIndex: 'platformFeeAmount', key: 'platformFeeAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '折扣后', dataIndex: 'discountedAmount', key: 'discountedAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '服务费', dataIndex: 'serviceFeeAmount', key: 'serviceFeeAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '税费', dataIndex: 'taxAmount', key: 'taxAmount',
      render: (val: number) => val > 0 ? `¥${(val / 100).toFixed(2)}` : <span className="text-gray-400">已含税</span> },
    { title: '最终金额', dataIndex: 'finalAmount', key: 'finalAmount',
      render: (val: number) => <span className="font-bold">¥{(val / 100).toFixed(2)}</span> },
    {
      title: '支付系数',
      dataIndex: 'coefficient',
      key: 'coefficient',
      render: (val: number) => <Tag color="blue">{val}</Tag>
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-96">加载中...</div>;
  }

  // Tab 配置
  const tabItems = [
    {
      key: 'talentProcurement',
      label: (
        <span>
          达人采买
          {customer?.businessStrategies?.talentProcurement?.enabled && (
            <Tag color="blue" className="ml-2">已配置</Tag>
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
            <Tag color="orange" className="ml-2">已配置</Tag>
          )}
          <Tag color="default" className="ml-2">开发中</Tag>
        </span>
      ),
    },
    {
      key: 'contentProduction',
      label: (
        <span>
          内容制作
          {customer?.businessStrategies?.contentProduction?.enabled && (
            <Tag color="purple" className="ml-2">已配置</Tag>
          )}
          <Tag color="default" className="ml-2">开发中</Tag>
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {/* 达人采买业务配置 */}
        {activeTab === 'talentProcurement' && (
          <ProForm
            initialValues={{
              pricingModel: customer?.businessStrategies?.talentProcurement?.pricingModel || 'framework',
              discountRate: (customer?.businessStrategies?.talentProcurement?.discount?.rate || 1) * 100,
              serviceFeeRate: (customer?.businessStrategies?.talentProcurement?.serviceFee?.rate || 0) * 100,
              includesPlatformFee: customer?.businessStrategies?.talentProcurement?.discount?.includesPlatformFee || false,
              validPeriod: customer?.businessStrategies?.talentProcurement?.discount?.validFrom && customer?.businessStrategies?.talentProcurement?.discount?.validTo
                ? [customer.businessStrategies.talentProcurement.discount.validFrom, customer.businessStrategies.talentProcurement.discount.validTo]
                : undefined,
              serviceFeeBase: customer?.businessStrategies?.talentProcurement?.serviceFee?.calculationBase || 'beforeDiscount',
              includesTax: customer?.businessStrategies?.talentProcurement?.tax?.includesTax ?? true,
              taxCalculationBase: customer?.businessStrategies?.talentProcurement?.tax?.calculationBase || 'excludeServiceFee',
              // 动态加载所有平台的启用状态和折扣率
              ...TALENT_PLATFORMS.reduce((acc, platform) => ({
                ...acc,
                [`${platform.key}Enabled`]: customer?.businessStrategies?.talentProcurement?.platformFees?.[platform.key]?.enabled || false,
                [`${platform.key}DiscountRate`]: (customer?.businessStrategies?.talentProcurement?.platformFees?.[platform.key]?.discountRate || customer?.businessStrategies?.talentProcurement?.discount?.rate || 1) * 100,
              }), {}),
            }}
            onFinish={handleSubmit}
            onValuesChange={(_changed, all) => {
              // 更新当前定价模式
              if (all.pricingModel) {
                setCurrentPricingModel(all.pricingModel);
              }

              // 动态构建 platformFees（v2.0 支持平台级折扣率）
              const platformFees: any = {};
              TALENT_PLATFORMS.forEach(platform => {
                if (platform.fee !== null) {
                  platformFees[platform.key] = {
                    enabled: all[`${platform.key}Enabled`] || false,
                    platformFeeRate: platform.fee,
                    discountRate: all[`${platform.key}DiscountRate`] / 100,
                  };
                }
              });

              const tempStrategy: any = {
                enabled: true,
                pricingModel: all.pricingModel,
                discount: {
                  rate: all.discountRate / 100,
                  includesPlatformFee: all.includesPlatformFee,
                },
                serviceFee: {
                  rate: all.serviceFeeRate / 100,
                  calculationBase: all.serviceFeeBase,
                },
                tax: {
                  rate: 0.06,
                  includesTax: all.includesTax,
                  calculationBase: all.taxCalculationBase,
                },
                platformFees,
              };
              calculateCoefficients(tempStrategy);
            }}
            submitter={{
              searchConfig: {
                submitText: '保存配置',
                resetText: '取消',
              },
            }}
          >
            {/* 基础配置 */}
            <ProCard title="基础配置" headerBordered collapsible defaultCollapsed={false}>
              <ProForm.Item noStyle shouldUpdate>
                {(form) => {
                  const pricingModel = form.getFieldValue('pricingModel');

                  if (pricingModel === 'framework') {
                    // 框架折扣模式：4列全部在一行
                    return (
                      <>
                        <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(280px, 2fr)' }}>
                          <ProFormRadio.Group
                            name="pricingModel"
                            label="定价模式"
                            options={[
                              { label: '框架折扣', value: 'framework' },
                              { label: '项目比价', value: 'project' },
                              { label: '混合模式', value: 'hybrid' },
                            ]}
                          />
                          <ProFormDigit
                            name="discountRate"
                            label="折扣率 (%)"
                            min={0}
                            max={100}
                            fieldProps={{ precision: 2 }}
                          />
                          <ProFormDigit
                            name="serviceFeeRate"
                            label="服务费率 (%)"
                            min={0}
                            max={100}
                            fieldProps={{ precision: 2 }}
                          />
                          <ProFormDateRangePicker
                            name="validPeriod"
                            label="框架折扣有效期"
                            placeholder={['开始日期', '结束日期']}
                            fieldProps={{
                              format: 'YYYY-MM-DD',
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          有效期留空表示长期有效。到期后系统将提醒续签或调整价格策略。
                        </div>
                      </>
                    );
                  } else {
                    // 项目比价/混合模式：3列（无需有效期）
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <ProFormRadio.Group
                          name="pricingModel"
                          label="定价模式"
                          options={[
                            { label: '框架折扣', value: 'framework' },
                            { label: '项目比价', value: 'project' },
                            { label: '混合模式', value: 'hybrid' },
                          ]}
                        />
                        <ProFormDigit
                          name="discountRate"
                          label="折扣率 (%)"
                          min={0}
                          max={100}
                          fieldProps={{ precision: 2 }}
                        />
                        <ProFormDigit
                          name="serviceFeeRate"
                          label="服务费率 (%)"
                          min={0}
                          max={100}
                          fieldProps={{ precision: 2 }}
                        />
                      </div>
                    );
                  }
                }}
              </ProForm.Item>
            </ProCard>

            {/* 计算选项 */}
            <ProCard title="计算选项" headerBordered collapsible defaultCollapsed={false} className="mt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <ProFormRadio.Group
                  name="includesPlatformFee"
                  label="折扣应用范围"
                  options={[
                    { label: '不包含平台费', value: false },
                    { label: '包含平台费', value: true },
                  ]}
                />
                <ProFormRadio.Group
                  name="serviceFeeBase"
                  label="服务费计算基准"
                  options={[
                    { label: '折扣前', value: 'beforeDiscount' },
                    { label: '折扣后', value: 'afterDiscount' },
                  ]}
                />
              </div>

              <ProForm.Item noStyle shouldUpdate>
                {(form) => {
                  const includesTax = form.getFieldValue('includesTax');
                  return (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <ProFormRadio.Group
                        name="includesTax"
                        label="报价税费设置"
                        options={[
                          { label: '含税报价（6%已含）', value: true },
                          { label: '不含税报价（需计算）', value: false },
                        ]}
                      />
                      <ProFormRadio.Group
                        name="taxCalculationBase"
                        label="税费计算基准（不含税时）"
                        options={[
                          { label: '不含服务费', value: 'excludeServiceFee' },
                          { label: '含服务费', value: 'includeServiceFee' },
                        ]}
                        disabled={includesTax === true}
                      />
                    </div>
                  );
                }}
              </ProForm.Item>
            </ProCard>

            {/* 采买平台设置 */}
            <ProCard
              title="采买平台"
              headerBordered
              collapsible
              defaultCollapsed={false}
              className="mt-4"
            >
              {/* 平台选择 - 5个平台横向一行，每个平台独立折扣率 */}
              <div className="grid grid-cols-5 gap-4">
                {TALENT_PLATFORMS.map(platform => (
                  <div
                    key={platform.key}
                    className={`border rounded-lg p-4 bg-gray-50 ${platform.enabled ? platform.hoverColor : 'opacity-60'} transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-medium text-base ${!platform.enabled && 'text-gray-400'}`}>
                        {platform.name}
                      </span>
                      <ProFormSwitch
                        name={`${platform.key}Enabled`}
                        disabled={!platform.enabled}
                      />
                    </div>

                    {/* 折扣率输入 */}
                    <ProFormDigit
                      name={`${platform.key}DiscountRate`}
                      label="折扣率 (%)"
                      min={0}
                      max={100}
                      fieldProps={{
                        precision: 2,
                        size: 'small',
                        disabled: !platform.enabled
                      }}
                      className="mb-2"
                    />

                    <div className={`text-sm font-semibold ${platform.enabled ? `text-${platform.color}-600` : 'text-gray-400'}`}>
                      平台费：{platform.fee ? `${(platform.fee * 100).toFixed(0)}%` : '待定'}
                    </div>
                    <div className={`text-xs mt-1 ${platform.enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                      {platform.description}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                <strong>说明：</strong>此配置仅适用于水上达人采买业务。平台费是在达人合作金额基础上额外收取的费用，当前仅抖音和小红书已确定费率，其他平台待后续开通。
              </div>
            </ProCard>
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

      {/* 支付系数预览 - 横向放在最下方 */}
      <ProCard
        title={
          <div className="flex items-center gap-2">
            <CalculatorOutlined />
            <span>支付系数预览</span>
          </div>
        }
        headerBordered
      >
        {Object.keys(coefficients).length > 0 ? (
          <>
            {/* 定价模式说明 */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getPricingModeInfo(currentPricingModel).statusIcon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900 mb-1">
                    {getPricingModeInfo(currentPricingModel).title}
                  </div>
                  <div className="text-sm text-blue-700">
                    {getPricingModeInfo(currentPricingModel).description}
                  </div>

                  {/* 项目模块使用指南 */}
                  <div className="mt-3 text-xs text-blue-600 border-t border-blue-200 pt-2">
                    <strong>项目模块使用说明：</strong>
                    {currentPricingModel === 'framework' && (
                      <span className="ml-2">创建项目时，系统将自动应用对应平台的支付系数计算对客报价</span>
                    )}
                    {currentPricingModel === 'project' && (
                      <span className="ml-2">创建项目时，需要手动填写每个合作明细的对客报价，系统将基于此计算利润</span>
                    )}
                    {currentPricingModel === 'hybrid' && (
                      <span className="ml-2">创建项目时，可以选择使用支付系数或手动填写报价，灵活应对不同场景</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 系数表格 */}
            <Table
              columns={coefficientColumns}
              dataSource={Object.values(coefficients)}
              rowKey="platform"
              pagination={false}
              size="middle"
            />
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            请配置业务策略后查看支付系数预览
          </div>
        )}
      </ProCard>

      {/* Toast 通知 */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
