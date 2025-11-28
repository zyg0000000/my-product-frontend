/**
 * 数据导入弹窗 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 ProForm 和 ProFormText 管理表单
 * 3. 使用 message 替代 alert()
 * 4. 使用 ProFormDigit 处理数字输入
 */

import { useEffect } from 'react';
import { Modal, Form, message } from 'antd';
import { ProForm, ProFormText, ProFormDigit } from '@ant-design/pro-components';
import type { Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform;
  onImport: (feishuUrl: string, priceYear: number, priceMonth: number) => Promise<void>;
  loading?: boolean;
}

export function DataImportModal({
  isOpen,
  onClose,
  platform,
  onImport,
  loading
}: DataImportModalProps) {
  const [form] = Form.useForm();

  // 价格归属时间（默认当前年月）
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 当弹窗打开时，初始化表单数据
  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        feishuUrl: '',
        priceYear: currentYear,
        priceMonth: currentMonth,
      });
    }
  }, [isOpen, form, currentYear, currentMonth]);

  // 提交表单
  const handleSubmit = async (values: {
    feishuUrl: string;
    priceYear: number;
    priceMonth: number;
  }) => {
    try {
      await onImport(values.feishuUrl, values.priceYear, values.priceMonth);
      message.success('导入任务已提交');
      onClose();
    } catch (err) {
      message.error('导入失败，请重试');
      throw err; // ProForm 需要抛出错误来停止提交
    }
  };

  return (
    <Modal
      title={
        <div>
          <div className="text-base font-semibold">
            导入{PLATFORM_NAMES[platform]}表现数据
          </div>
          <div className="text-xs font-normal text-gray-500 mt-0.5">
            从飞书表格导入达人表现数据
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnHidden
      centered
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        submitter={{
          render: (_, dom) => (
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t">
              {dom[0]} {/* 重置按钮 */}
              {dom[1]} {/* 提交按钮 */}
            </div>
          ),
          submitButtonProps: {
            type: 'primary',
            size: 'middle',
            loading,
            children: '开始导入',
          },
          resetButtonProps: {
            onClick: onClose,
            children: '取消',
            size: 'middle',
          },
        }}
        layout="vertical"
      >
        <ProFormText
          name="feishuUrl"
          label="飞书表格链接"
          placeholder="请粘贴飞书表格的分享链接"
          rules={[
            { required: true, message: '请输入飞书表格链接' },
            { type: 'url', message: '请输入有效的URL' },
          ]}
          fieldProps={{
            size: 'middle',
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <ProFormDigit
            name="priceYear"
            label="价格归属年份"
            placeholder="年份"
            rules={[{ required: true, message: '请输入年份' }]}
            fieldProps={{
              size: 'middle',
              min: 2020,
              max: 2099,
              precision: 0,
            }}
          />

          <ProFormDigit
            name="priceMonth"
            label="价格归属月份"
            placeholder="月份"
            rules={[{ required: true, message: '请输入月份' }]}
            fieldProps={{
              size: 'middle',
              min: 1,
              max: 12,
              precision: 0,
            }}
          />
        </div>

        <div className="mt-4 p-3 bg-primary-50 rounded text-xs text-gray-600">
          <p className="font-medium text-gray-900 mb-1">📌 导入说明</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>确保飞书表格已正确配置字段映射</li>
            <li>价格数据将归属到指定的年月</li>
            <li>导入过程中请勿关闭此页面</li>
          </ul>
        </div>
      </ProForm>
    </Modal>
  );
}
