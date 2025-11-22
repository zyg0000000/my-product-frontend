/**
 * 客户价格策略配置页面
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormSwitch,
  ProCard,
} from '@ant-design/pro-components';
import { Button, message, Table, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalculatorOutlined } from '@ant-design/icons';
import type { TalentProcurementStrategy } from '../../../types/customer';
import { customerApi } from '../../../services/customerApi';

export default function PricingStrategy() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coefficients, setCoefficients] = useState<any>({});

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
          calculateCoefficients(response.data.businessStrategies.talentProcurement);
        }
      }
    } catch (error) {
      message.error('加载客户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateCoefficients = (strategy: TalentProcurementStrategy) => {
    const results: any = {};

    Object.entries(strategy.platformFees).forEach(([platform, config]) => {
      if (config?.enabled) {
        const baseAmount = 1000;
        const platformFeeAmount = baseAmount * config.rate;

        let discountedAmount;
        if (strategy.discount.includesPlatformFee) {
          discountedAmount = (baseAmount + platformFeeAmount) * strategy.discount.rate;
        } else {
          discountedAmount = baseAmount * strategy.discount.rate + platformFeeAmount;
        }

        let serviceFeeAmount;
        if (strategy.serviceFee.calculationBase === 'beforeDiscount') {
          serviceFeeAmount = (baseAmount + platformFeeAmount) * strategy.serviceFee.rate;
        } else {
          serviceFeeAmount = discountedAmount * strategy.serviceFee.rate;
        }

        const finalAmount = discountedAmount + serviceFeeAmount;
        const coefficient = finalAmount / baseAmount;

        results[platform] = {
          platform,
          baseAmount,
          platformFeeAmount,
          discountedAmount,
          serviceFeeAmount,
          finalAmount,
          coefficient: Number(coefficient.toFixed(4)),
        };
      }
    });

    setCoefficients(results);
  };

  const handleSubmit = async (values: any) => {
    if (!id) return;

    const strategy: TalentProcurementStrategy = {
      enabled: true,
      pricingModel: values.pricingModel || 'framework',
      discount: {
        rate: values.discountRate / 100,
        includesPlatformFee: values.includesPlatformFee,
      },
      serviceFee: {
        rate: values.serviceFeeRate / 100,
        calculationBase: values.serviceFeeBase,
      },
      platformFees: {
        douyin: {
          enabled: values.douyinEnabled,
          rate: 0.05,
        },
        xiaohongshu: {
          enabled: values.xiaohongshuEnabled,
          rate: 0.10,
        },
      },
    };

    calculateCoefficients(strategy);

    try {
      await customerApi.updateCustomer(id, {
        businessStrategies: {
          talentProcurement: strategy,
        },
      });
      message.success('价格策略保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const coefficientColumns = [
    { title: '平台', dataIndex: 'platform', key: 'platform',
      render: (val: string) => val === 'douyin' ? '抖音' : '小红书' },
    { title: '基础金额', dataIndex: 'baseAmount', key: 'baseAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '平台费', dataIndex: 'platformFeeAmount', key: 'platformFeeAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '折扣后', dataIndex: 'discountedAmount', key: 'discountedAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '服务费', dataIndex: 'serviceFeeAmount', key: 'serviceFeeAmount',
      render: (val: number) => `¥${(val / 100).toFixed(2)}` },
    { title: '最终金额', dataIndex: 'finalAmount', key: 'finalAmount',
      render: (val: number) => <span className="font-bold">¥{(val / 100).toFixed(2)}</span> },
    { title: '支付系数', dataIndex: 'coefficient', key: 'coefficient',
      render: (val: number) => <Tag color="blue">{val}</Tag> },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-96">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <ProCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers/list')}>
              返回列表
            </Button>
            <div>
              <h1 className="text-lg font-semibold m-0">价格策略配置</h1>
              <p className="text-sm text-gray-500 mt-1">客户：{customer?.name}</p>
            </div>
          </div>
        </div>
      </ProCard>

      <ProCard>
        <ProForm
          initialValues={{
            pricingModel: 'framework',
            discountRate: 90,
            serviceFeeRate: 10,
            includesPlatformFee: false,
            serviceFeeBase: 'beforeDiscount',
            douyinEnabled: true,
            xiaohongshuEnabled: true,
            ...customer?.businessStrategies?.talentProcurement,
          }}
          onFinish={handleSubmit}
          onValuesChange={(_changed, all) => {
            const tempStrategy: TalentProcurementStrategy = {
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
              platformFees: {
                douyin: { enabled: all.douyinEnabled, rate: 0.05 },
                xiaohongshu: { enabled: all.xiaohongshuEnabled, rate: 0.10 },
              },
            };
            calculateCoefficients(tempStrategy);
          }}
          submitter={{
            render: (props) => (
              <div className="flex gap-2 pt-4 border-t">
                <Button type="primary" icon={<SaveOutlined />} onClick={() => props.form?.submit()}>
                  保存配置
                </Button>
                <Button onClick={() => navigate('/customers/list')}>取消</Button>
              </div>
            ),
          }}
        >
          <ProCard title="达人采买业务配置" headerBordered>
            <div className="grid grid-cols-3 gap-4 mb-4">
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
                fieldProps={{ precision: 0 }}
              />
              <ProFormDigit
                name="serviceFeeRate"
                label="服务费率 (%)"
                min={0}
                max={100}
                fieldProps={{ precision: 0 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
          </ProCard>

          <ProCard title="平台费用设置" headerBordered className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">抖音</span>
                  <span className="text-sm text-gray-500 ml-2">(5%平台费)</span>
                </div>
                <ProFormSwitch name="douyinEnabled" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">小红书</span>
                  <span className="text-sm text-gray-500 ml-2">(10%平台费)</span>
                </div>
                <ProFormSwitch name="xiaohongshuEnabled" />
              </div>
            </div>
          </ProCard>

          <ProCard
            title={
              <div className="flex items-center gap-2">
                <CalculatorOutlined />
                <span>支付系数预览</span>
              </div>
            }
            headerBordered
            className="mt-4"
          >
            <Table
              columns={coefficientColumns}
              dataSource={Object.values(coefficients)}
              rowKey="platform"
              pagination={false}
              size="small"
            />
          </ProCard>
        </ProForm>
      </ProCard>
    </div>
  );
}
