/**
 * 机构表单弹窗 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 ProForm 和 ProCard 组织表单
 * 3. 使用 Ant Design message 替代 Toast
 * 4. 简化状态管理，使用 Form.useForm()
 */

import { useEffect } from 'react';
import { Modal, Form, App } from 'antd';
import {
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { ProCard } from '@ant-design/pro-components';
import type { Agency, AgencyFormData } from '../types/agency';

interface AgencyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSave: (data: AgencyFormData) => Promise<void>;
}

const AGENCY_TYPE_OPTIONS = [
  { label: '机构', value: 'agency' },
  { label: '个人', value: 'individual' },
];

const AGENCY_STATUS_OPTIONS = [
  { label: '🟢 正常', value: 'active' },
  { label: '🟡 暂停', value: 'suspended' },
  { label: '🔴 停用', value: 'inactive' },
];

export function AgencyFormModal({
  isOpen,
  onClose,
  agency,
  onSave,
}: AgencyFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AgencyFormData>();
  const isEditing = !!agency;

  // 当弹窗打开时，初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (agency) {
        // 编辑模式
        form.setFieldsValue({
          name: agency.name || '',
          type: agency.type || 'agency',
          contactPerson: agency.contactInfo?.contactPerson || '',
          wechatId: agency.contactInfo?.wechatId || '',
          phoneNumber: agency.contactInfo?.phoneNumber || '',
          email: agency.contactInfo?.email || '',
          description: agency.description || '',
          status: agency.status || 'active',
        });
      } else {
        // 新增模式
        form.resetFields();
      }
    }
  }, [isOpen, agency, form]);

  // 提交表单
  const handleSubmit = async (values: AgencyFormData) => {
    try {
      await onSave(values);
      message.success(isEditing ? '机构更新成功' : '机构创建成功');
      onClose();
    } catch (err) {
      message.error(isEditing ? '更新失败，请重试' : '创建失败，请重试');
      throw err; // ProForm 需要抛出错误来停止提交
    }
  };

  return (
    <Modal
      title={
        <div>
          <div className="text-base font-semibold">
            {isEditing ? '编辑机构' : '新增机构'}
          </div>
          <div className="text-xs font-normal text-content-secondary mt-0.5">
            {isEditing ? `更新机构信息：${agency?.name}` : '创建新的机构'}
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
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
          },
          resetButtonProps: {
            onClick: onClose,
            children: '取消',
            size: 'middle',
          },
        }}
        layout="vertical"
        className="compact-form"
      >
        {/* 基础信息卡片 */}
        <ProCard
          title="基础信息"
          headerBordered
          className="mb-3"
          bodyStyle={{ padding: '12px 16px' }}
        >
          <div className="grid grid-cols-3 gap-3">
            {/* 机构名称 */}
            <div className="col-span-2">
              <ProFormText
                name="name"
                label="机构名称"
                placeholder="如：无忧传媒"
                rules={[{ required: true, message: '请输入机构名称' }]}
                fieldProps={{
                  size: 'middle',
                }}
              />
            </div>

            {/* 机构类型 */}
            <ProFormSelect
              name="type"
              label="机构类型"
              options={AGENCY_TYPE_OPTIONS}
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 机构状态 - 单独一行，占满 */}
            <ProFormSelect
              name="status"
              label="机构状态"
              options={AGENCY_STATUS_OPTIONS}
              fieldProps={{
                size: 'middle',
              }}
            />
          </div>
        </ProCard>

        {/* 联系信息卡片 */}
        <ProCard
          title="联系信息"
          headerBordered
          className="mb-3"
          bodyStyle={{ padding: '12px 16px' }}
        >
          <div className="grid grid-cols-2 gap-3">
            {/* 联系人 */}
            <ProFormText
              name="contactPerson"
              label="联系人"
              placeholder="主要联系人姓名"
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 手机号 */}
            <ProFormText
              name="phoneNumber"
              label="手机号"
              placeholder="联系电话"
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 微信ID */}
            <ProFormText
              name="wechatId"
              label="微信ID"
              placeholder="微信号"
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 邮箱 */}
            <ProFormText
              name="email"
              label="邮箱"
              placeholder="电子邮箱"
              fieldProps={{
                size: 'middle',
              }}
            />
          </div>
        </ProCard>

        {/* 备注信息卡片 */}
        <ProCard
          title="备注信息"
          headerBordered
          bodyStyle={{ padding: '12px 16px' }}
        >
          <ProFormTextArea
            name="description"
            label="备注说明"
            placeholder="关于机构的补充说明（选填）"
            fieldProps={{
              rows: 3,
              size: 'middle',
            }}
          />
        </ProCard>
      </ProForm>

      <style>{`
        .compact-form .ant-form-item {
          margin-bottom: 12px;
        }
        .compact-form .ant-form-item-label {
          padding-bottom: 4px;
        }
        .compact-form .ant-form-item-label > label {
          font-size: 13px;
        }
        .compact-form .ant-pro-card-header {
          padding: 10px 16px;
          min-height: auto;
        }
        .compact-form .ant-pro-card-header-title {
          font-size: 14px;
        }
      `}</style>
    </Modal>
  );
}
