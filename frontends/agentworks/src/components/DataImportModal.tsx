/**
 * 数据导入弹窗组件
 * @version 2.1.0 - 支持快照日期
 *
 * v2.1.0 更新日志 (2025-11-29):
 * - [快照日期] 新增 snapshotDate 日期选择器，用于导入历史数据
 *   - 价格数据使用 priceYear + priceMonth 标记（月度粒度）
 *   - 表现数据使用 snapshotDate 标记（日度粒度）
 *   - 两者独立设置，互不影响
 *
 * v2.0.0 更新日志 (2025-11-28):
 * - 使用 Modal 替代手写弹窗容器
 * - 使用 ProForm 和 ProFormText 管理表单
 * - 使用 message 替代 alert()
 * - 使用 ProFormDigit 处理数字输入
 */

import { useEffect } from 'react';
import { Modal, Form, App } from 'antd';
import {
  ProForm,
  ProFormText,
  ProFormDigit,
  ProFormDatePicker,
} from '@ant-design/pro-components';
import type { Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import dayjs from 'dayjs';

/**
 * 数据导入弹窗组件 Props
 */
interface DataImportModalProps {
  /** 弹窗是否可见 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 当前平台 */
  platform: Platform;
  /**
   * 导入回调函数
   * @param feishuUrl - 飞书表格链接
   * @param priceYear - 价格归属年份
   * @param priceMonth - 价格归属月份
   * @param snapshotDate - 表现数据快照日期（YYYY-MM-DD）
   */
  onImport: (
    feishuUrl: string,
    priceYear: number,
    priceMonth: number,
    snapshotDate?: string
  ) => Promise<void>;
  /** 加载状态 */
  loading?: boolean;
}

export function DataImportModal({
  isOpen,
  onClose,
  platform,
  onImport,
  loading,
}: DataImportModalProps) {
  const { message } = App.useApp();
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
        snapshotDate: dayjs(), // 默认当天
      });
    }
  }, [isOpen, form, currentYear, currentMonth]);

  // 提交表单
  // 注意：ProFormDatePicker 返回的是字符串（YYYY-MM-DD 格式），不是 dayjs 对象
  const handleSubmit = async (values: {
    feishuUrl: string;
    priceYear: number;
    priceMonth: number;
    snapshotDate?: string | dayjs.Dayjs;
  }) => {
    try {
      // 处理 snapshotDate：可能是字符串或 dayjs 对象
      let snapshotDateStr: string | undefined;
      if (values.snapshotDate) {
        if (typeof values.snapshotDate === 'string') {
          // ProFormDatePicker 返回的字符串格式
          snapshotDateStr = values.snapshotDate;
        } else if (values.snapshotDate.format) {
          // dayjs 对象（初始化时设置的默认值）
          snapshotDateStr = values.snapshotDate.format('YYYY-MM-DD');
        }
      }

      await onImport(
        values.feishuUrl,
        values.priceYear,
        values.priceMonth,
        snapshotDateStr
      );
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
          <div className="text-xs font-normal text-content-muted mt-0.5">
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

        {/* 价格归属时间（月度粒度） */}
        <div className="grid grid-cols-2 gap-3">
          <ProFormDigit
            name="priceYear"
            label="价格归属年份"
            placeholder="年份"
            tooltip="价格数据的时间标记（月度粒度）"
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

        {/* 表现数据快照日期（日度粒度） */}
        <ProFormDatePicker
          name="snapshotDate"
          label="表现数据日期"
          tooltip="表现数据的快照日期（日度粒度），用于导入历史数据"
          placeholder="选择日期"
          rules={[{ required: true, message: '请选择表现数据日期' }]}
          fieldProps={{
            size: 'middle',
            style: { width: '100%' },
            disabledDate: (current: dayjs.Dayjs) => {
              // 不能选择未来日期
              return current && current > dayjs().endOf('day');
            },
          }}
        />

        <div className="mt-4 p-3 bg-primary-50 rounded text-xs text-content-secondary">
          <p className="font-medium text-content mb-1">📌 导入说明</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>确保飞书表格已正确配置字段映射</li>
            <li>
              <strong>价格数据</strong>
              ：按「年份+月份」归属（同年月同类型会覆盖）
            </li>
            <li>
              <strong>表现数据</strong>
              ：按「日期」归属（用于趋势分析和历史回溯）
            </li>
            <li>导入过程中请勿关闭此页面</li>
          </ul>
        </div>
      </ProForm>
    </Modal>
  );
}
