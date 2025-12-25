/**
 * 定价配置编辑弹窗 (v5.0)
 *
 * 用于新增/编辑单个时间段的定价配置
 * 供 PricingStrategy 页面和 TalentProcurementCard 使用
 */

import { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Checkbox,
  Radio,
  Tag,
  Popover,
  message,
} from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PlatformConfig as ApiPlatformConfig } from '../../../api/platformConfig';
import {
  type PricingConfigItem,
  generateConfigId,
  getDefaultConfigItem,
  validateNoOverlap,
  calculateCoefficientFromConfig,
} from './talentProcurement';

interface PricingConfigModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 保存回调 */
  onSave: (config: PricingConfigItem) => void;
  /** 编辑的配置（新增时为 undefined） */
  editingConfig?: PricingConfigItem;
  /** 现有配置列表（用于重叠校验） */
  existingConfigs: PricingConfigItem[];
  /** 平台名称 */
  platformName: string;
  /** 平台配置（获取平台费率） */
  platformConfig?: ApiPlatformConfig;
}

export function PricingConfigModal({
  open,
  onClose,
  onSave,
  editingConfig,
  existingConfigs,
  platformName,
  platformConfig,
}: PricingConfigModalProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingConfig;
  const platformFeeRate = platformConfig?.business?.fee || 0;

  // 监听表单值变化，计算报价系数
  const formValues = Form.useWatch([], form);

  // 计算当前配置的报价系数
  const coefficient = useMemo(() => {
    if (!formValues) return null;

    const config: PricingConfigItem = {
      id: editingConfig?.id || '',
      // 表单值是百分比（100 = 100%），需要转换为小数（1.0 = 100%）
      discountRate: (formValues.discountRate || 100) / 100,
      serviceFeeRate: (formValues.serviceFeeRate || 0) / 100,
      platformFeeRate,
      includesPlatformFee: formValues.includesPlatformFee || false,
      serviceFeeBase: formValues.serviceFeeBase || 'beforeDiscount',
      includesTax: formValues.includesTax ?? true,
      taxCalculationBase: formValues.taxCalculationBase || 'excludeServiceFee',
      validFrom: null,
      validTo: null,
      isPermanent: false,
      createdAt: '',
      updatedAt: '',
    };

    return calculateCoefficientFromConfig(config);
  }, [formValues, platformFeeRate, editingConfig?.id]);

  // 初始化表单值
  useEffect(() => {
    if (open) {
      if (editingConfig) {
        form.setFieldsValue({
          discountRate: editingConfig.discountRate * 100,
          serviceFeeRate: editingConfig.serviceFeeRate * 100,
          validityRange:
            editingConfig.validFrom && editingConfig.validTo
              ? [dayjs(editingConfig.validFrom), dayjs(editingConfig.validTo)]
              : null,
          isPermanent: editingConfig.isPermanent,
          includesPlatformFee: editingConfig.includesPlatformFee,
          serviceFeeBase: editingConfig.serviceFeeBase,
          includesTax: editingConfig.includesTax,
          taxCalculationBase: editingConfig.taxCalculationBase,
        });
      } else {
        // 新增时使用默认值
        const defaultConfig = getDefaultConfigItem(platformFeeRate);
        form.setFieldsValue({
          discountRate: defaultConfig.discountRate * 100,
          serviceFeeRate: defaultConfig.serviceFeeRate * 100,
          validityRange: null,
          isPermanent: false,
          includesPlatformFee: defaultConfig.includesPlatformFee,
          serviceFeeBase: defaultConfig.serviceFeeBase,
          includesTax: defaultConfig.includesTax,
          taxCalculationBase: defaultConfig.taxCalculationBase,
        });
      }
    }
  }, [open, editingConfig, form, platformFeeRate]);

  // 处理长期有效勾选
  const handlePermanentChange = (checked: boolean) => {
    if (checked) {
      form.setFieldValue('validityRange', null);
    }
  };

  // 处理日期选择
  const handleValidityChange = () => {
    form.setFieldValue('isPermanent', false);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const now = new Date().toISOString();
      const config: PricingConfigItem = {
        id: editingConfig?.id || generateConfigId(),
        discountRate: values.discountRate / 100,
        serviceFeeRate: values.serviceFeeRate / 100,
        platformFeeRate,
        includesPlatformFee: values.includesPlatformFee || false,
        serviceFeeBase: values.serviceFeeBase || 'beforeDiscount',
        includesTax: values.includesTax ?? true,
        taxCalculationBase: values.taxCalculationBase || 'excludeServiceFee',
        validFrom: values.validityRange?.[0]?.format('YYYY-MM-DD') || null,
        validTo: values.validityRange?.[1]?.format('YYYY-MM-DD') || null,
        isPermanent: values.isPermanent || false,
        createdAt: editingConfig?.createdAt || now,
        updatedAt: now,
      };

      // 校验有效期
      if (!config.isPermanent && (!config.validFrom || !config.validTo)) {
        message.error('请设置有效期或勾选"长期有效"');
        return;
      }

      // 校验时间重叠
      const overlapResult = validateNoOverlap(
        config,
        existingConfigs,
        editingConfig?.id
      );
      if (!overlapResult.valid) {
        message.error(overlapResult.error);
        return;
      }

      onSave(config);
      onClose();
    } catch (error) {
      // 表单验证失败
    }
  };

  return (
    <Modal
      title={`${isEditing ? '编辑' : '新增'}定价配置 - ${platformName}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        {/* 第一行：折扣率、服务费率 */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="discountRate"
            label="折扣率 (%)"
            rules={[{ required: true, message: '请输入折扣率' }]}
          >
            <InputNumber
              min={0}
              max={200}
              precision={2}
              style={{ width: '100%' }}
              placeholder="如 79.5 表示 79.5%"
            />
          </Form.Item>
          <Form.Item
            name="serviceFeeRate"
            label="服务费率 (%)"
            rules={[{ required: true, message: '请输入服务费率' }]}
          >
            <InputNumber
              min={0}
              max={100}
              precision={2}
              style={{ width: '100%' }}
              placeholder="如 5 表示 5%"
            />
          </Form.Item>
        </div>

        {/* 第二行：有效期、长期有效 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Form.Item
              name="validityRange"
              label={
                <span>
                  有效期 <span className="text-danger-500">*</span>
                </span>
              }
            >
              <DatePicker.RangePicker
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
                placeholder={['开始日期', '结束日期']}
                onChange={handleValidityChange}
                disabled={form.getFieldValue('isPermanent')}
              />
            </Form.Item>
          </div>
          <Form.Item name="isPermanent" valuePropName="checked" label=" ">
            <Checkbox onChange={e => handlePermanentChange(e.target.checked)}>
              长期有效
            </Checkbox>
          </Form.Item>
        </div>

        {/* 第三行：计算选项 */}
        <div className="p-4 bg-surface-base rounded-lg space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                平台费
              </label>
              <Tag color="blue">
                {(platformFeeRate * 100).toFixed(0)}% (固定)
              </Tag>
            </div>
            <Form.Item
              name="includesPlatformFee"
              label="折扣包含平台费"
              className="mb-0"
            >
              <Radio.Group>
                <Radio value={false}>不含</Radio>
                <Radio value={true}>含</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="serviceFeeBase"
              label="服务费计算基准"
              className="mb-0"
            >
              <Radio.Group>
                <Radio value="beforeDiscount">折扣前</Radio>
                <Radio value="afterDiscount">折扣后</Radio>
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="includesTax" label="报价税费设置" className="mb-0">
              <Radio.Group>
                <Radio value={true}>含税</Radio>
                <Radio value={false}>不含</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="taxCalculationBase"
              label="税费计算基准"
              className="mb-0"
            >
              <Radio.Group disabled={form.getFieldValue('includesTax')}>
                <Radio value="excludeServiceFee">不含服务费</Radio>
                <Radio value="includeServiceFee">含服务费</Radio>
              </Radio.Group>
            </Form.Item>
            <div>
              <label className="block text-sm font-medium text-content mb-2">
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
              <Tag color="blue" className="text-base font-semibold">
                {coefficient?.coefficient.toFixed(5) || '-'}
              </Tag>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
}

export default PricingConfigModal;
