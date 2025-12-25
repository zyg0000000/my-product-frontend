/**
 * 价格管理弹窗 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 ProCard 组织左右两栏布局
 * 3. 使用 ProForm 管理新增/更新价格表单
 * 4. 使用 ProFormSelect, ProFormDigit 等组件
 * 5. 使用 message 替代 Toast
 * 6. 使用 Select 替代手写筛选器
 */

import { useState, useEffect } from 'react';
import { Modal, Select, App } from 'antd';
import {
  ProForm,
  ProFormSelect,
  ProFormDigit,
} from '@ant-design/pro-components';
import { ProCard } from '@ant-design/pro-components';
import { logger } from '../utils/logger';
import type {
  Talent,
  PriceRecord,
  PriceType,
  PriceStatus,
} from '../types/talent';
import {
  formatPrice,
  getPriceHistory,
  formatYearMonth,
  yuanToCents,
} from '../utils/formatters';
import { usePlatformConfig } from '../hooks/usePlatformConfig';

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent | null;
  onSave: (talentId: string, prices: PriceRecord[]) => Promise<void>;
  onTalentUpdate?: (updatedTalent: Talent) => void;
}

interface NewPriceForm {
  year: number;
  month: number;
  type: PriceType;
  price: number;
  status: PriceStatus;
}

export function PriceModal({
  isOpen,
  onClose,
  talent,
  onSave,
  onTalentUpdate,
}: PriceModalProps) {
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined
  );
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
    undefined
  );
  const [form] = ProForm.useForm<NewPriceForm>();

  // 使用平台配置 Hook（获取所有平台，包括禁用的）
  const { getPlatformPriceTypes } = usePlatformConfig(true);

  // 当前年月
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 重置表单
  useEffect(() => {
    if (isOpen && talent) {
      form.setFieldsValue({
        year: currentYear,
        month: currentMonth,
        type: '' as PriceType,
        price: 0,
        status: 'confirmed',
      });
      setSelectedYear(undefined);
      setSelectedMonth(undefined);
    }
  }, [isOpen, talent, currentYear, currentMonth, form]);

  if (!talent) return null;

  // 使用动态配置获取价格类型（hook 内部已处理 fallback）
  const priceTypes = getPlatformPriceTypes(talent.platform);

  // 获取价格历史
  const priceHistory = getPriceHistory(talent.prices);

  // 筛选后的历史价格
  const filteredHistory = priceHistory.filter(h => {
    if (selectedYear && h.year !== selectedYear) return false;
    if (selectedMonth && h.month !== selectedMonth) return false;
    return true;
  });

  // 处理新增/更新价格
  const handleSubmit = async (values: NewPriceForm) => {
    if (!values.type || values.price <= 0) {
      message.warning('请填写完整的价格信息');
      return;
    }

    try {
      setSaving(true);

      // 查找是否已存在该类型的价格
      const existingIndex = talent.prices.findIndex(
        p =>
          p.year === values.year &&
          p.month === values.month &&
          p.type === values.type
      );

      const updatedPrices = [...talent.prices];

      if (existingIndex !== -1) {
        // 更新现有价格
        updatedPrices[existingIndex] = {
          ...values,
          price: yuanToCents(values.price), // 元转换为分
        };
      } else {
        // 新增价格
        updatedPrices.push({
          ...values,
          price: yuanToCents(values.price), // 元转换为分
        });
      }

      await onSave(talent.oneId, updatedPrices);

      // 更新本地 talent 数据以刷新左侧列表
      if (onTalentUpdate) {
        onTalentUpdate({ ...talent, prices: updatedPrices });
      }

      message.success('价格保存成功');

      // 重置表单
      form.setFieldsValue({
        year: currentYear,
        month: currentMonth,
        type: '' as PriceType,
        price: 0,
        status: 'confirmed',
      });
    } catch (err) {
      logger.error('保存价格失败:', err);
      message.error('保存价格失败，请重试');
      throw err; // ProForm 需要抛出错误
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div>
          <div className="text-lg font-semibold">
            价格管理: <span className="text-purple-600">{talent.name}</span>
          </div>
          <div className="text-sm font-normal text-content-secondary mt-0.5">
            管理{priceTypes.length}档价格类型和趋势分析
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnHidden
      centered
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左侧：历史价格记录 */}
        <ProCard
          title="历史价格记录"
          headerBordered
          extra={
            <div className="flex gap-2">
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                placeholder="全部年份"
                size="small"
                style={{ width: 100 }}
                allowClear
                options={Array.from(new Set(priceHistory.map(h => h.year))).map(
                  y => ({
                    label: `${y}`,
                    value: y,
                  })
                )}
              />
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder="全部月份"
                size="small"
                style={{ width: 100 }}
                allowClear
                options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                  label: `${m}月`,
                  value: m,
                }))}
              />
            </div>
          }
        >
          <div
            className="space-y-2"
            style={{ maxHeight: '350px', overflowY: 'auto' }}
          >
            {filteredHistory.length === 0 ? (
              <p className="text-center text-content-secondary text-sm py-8">
                暂无价格记录
              </p>
            ) : (
              filteredHistory.map((history, index) => (
                <div
                  key={index}
                  className="bg-surface-base rounded-md border p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-content">
                      {formatYearMonth(history.year, history.month)}
                    </span>
                    {history.isLatest && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                        当前
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {priceTypes.map(pt => {
                      const price =
                        history.prices[pt.key as keyof typeof history.prices];
                      return (
                        <div
                          key={pt.key}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className="inline-flex items-center justify-center rounded-md px-2 py-0.5 font-semibold w-16"
                            style={{
                              backgroundColor: pt.bgColor,
                              color: pt.textColor,
                            }}
                          >
                            {pt.label}
                          </span>
                          <span
                            className={
                              price
                                ? 'text-content font-medium'
                                : 'text-content-muted'
                            }
                          >
                            {price ? formatPrice(price) : 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ProCard>

        {/* 右侧：新增/更新价格 */}
        <ProCard title="新增/更新价格" headerBordered>
          <ProForm
            form={form}
            onFinish={handleSubmit}
            submitter={{
              searchConfig: {
                submitText: '保存价格',
                resetText: '重置',
              },
              submitButtonProps: {
                loading: saving,
              },
            }}
            layout="vertical"
          >
            <div className="grid grid-cols-2 gap-3">
              <ProFormSelect
                name="year"
                label="年份"
                options={[currentYear - 1, currentYear, currentYear + 1].map(
                  y => ({
                    label: `${y}`,
                    value: y,
                  })
                )}
                fieldProps={{
                  size: 'middle',
                }}
              />
              <ProFormSelect
                name="month"
                label="月份"
                options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                  label: `${m}月`,
                  value: m,
                }))}
                fieldProps={{
                  size: 'middle',
                }}
              />
            </div>

            <ProFormSelect
              name="type"
              label={
                talent.platform === 'xiaohongshu' ? '笔记类型' : '视频类型'
              }
              placeholder="请选择类型"
              rules={[
                {
                  required: true,
                  message: `请选择${talent.platform === 'xiaohongshu' ? '笔记类型' : '视频类型'}`,
                },
              ]}
              options={priceTypes.map(pt => ({
                label: pt.label,
                value: pt.key,
              }))}
              fieldProps={{
                size: 'middle',
              }}
            />

            <ProFormDigit
              name="price"
              label="金额（元）"
              placeholder="例如: 318888 或 50000"
              rules={[
                { required: true, message: '请输入金额' },
                { type: 'number', min: 1, message: '金额必须大于0' },
              ]}
              fieldProps={{
                size: 'middle',
                precision: 0,
                min: 0,
                step: 1,
              }}
              extra="请输入精确金额，例如：318888元 或 50000元"
            />

            <ProFormSelect
              name="status"
              label="状态"
              options={[
                { label: '已确认', value: 'confirmed' },
                { label: '暂定价', value: 'provisional' },
              ]}
              fieldProps={{
                size: 'middle',
              }}
            />
          </ProForm>
        </ProCard>
      </div>
    </Modal>
  );
}
