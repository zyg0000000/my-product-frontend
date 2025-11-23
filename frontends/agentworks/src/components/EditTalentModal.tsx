/**
 * 编辑达人弹窗 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 ProForm 和 ProCard 组织表单
 * 3. 使用 Ant Design message 替代 Toast
 * 4. 保留自定义组件 (TagInput, AgencySelector)
 * 5. 简化状态管理，使用 Form.useForm()
 */

import { useEffect } from 'react';
import { Modal, Form, Input, Radio, Space, message } from 'antd';
import { ProForm, ProFormText, ProFormRadio } from '@ant-design/pro-components';
import { ProCard } from '@ant-design/pro-components';
import { logger } from '../utils/logger';
import type { Talent, Platform, TalentTier, TalentStatus } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';
import { TagInput } from './TagInput';
import { AgencySelector } from './AgencySelector_v2';

interface EditTalentModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent | null;
  onSave: (oneId: string, platform: Platform, data: Partial<Talent>) => Promise<void>;
  availableTags: string[];
}

interface FormData {
  platformAccountId: string;
  name: string;
  agencyId: string;
  talentTier?: TalentTier;
  talentType: string[];
  status: TalentStatus;
  // 平台特定字段
  platformSpecific: {
    xingtuId?: string;
    uid?: string;
  };
}

export function EditTalentModal({ isOpen, onClose, talent, onSave, availableTags }: EditTalentModalProps) {
  const [form] = Form.useForm<FormData>();

  // 当弹窗打开时，初始化表单数据
  useEffect(() => {
    if (isOpen && talent) {
      form.setFieldsValue({
        platformAccountId: talent.platformAccountId || '',
        name: talent.name || '',
        agencyId: talent.agencyId || AGENCY_INDIVIDUAL_ID,
        talentTier: talent.talentTier,
        talentType: talent.talentType || [],
        status: talent.status || 'active',
        platformSpecific: {
          xingtuId: talent.platformSpecific?.xingtuId || '',
          uid: talent.platformSpecific?.uid || '',
        },
      });
    }
  }, [isOpen, talent, form]);

  if (!talent) return null;

  // 根据平台获取 platformAccountId 的提示文本
  const getPlatformAccountIdPlaceholder = () => {
    switch (talent.platform) {
      case 'douyin':
        return '星图ID';
      case 'xiaohongshu':
        return '蒲公英ID 或 小红书ID';
      case 'bilibili':
        return 'B站UID';
      case 'kuaishou':
        return '快手ID';
      default:
        return '平台账号ID';
    }
  };

  // 根据平台获取 platformAccountId 的标签
  const getPlatformAccountIdLabel = () => {
    switch (talent.platform) {
      case 'douyin':
        return '星图ID';
      case 'xiaohongshu':
        return '主要ID';
      default:
        return '平台账号ID';
    }
  };

  // 提交表单
  const handleSubmit = async (values: FormData) => {
    try {
      // 清理 platformSpecific 中的空值
      const cleanedPlatformSpecific = Object.entries(
        values.platformSpecific || {}
      ).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      // 构建更新数据
      const updateData: Partial<Talent> = {
        platformAccountId: values.platformAccountId,
        name: values.name,
        agencyId: values.agencyId,
        talentTier: values.talentTier,
        talentType: values.talentType && values.talentType.length > 0 ? values.talentType : undefined,
        status: values.status,
        platformSpecific:
          Object.keys(cleanedPlatformSpecific).length > 0
            ? cleanedPlatformSpecific
            : undefined,
      };

      await onSave(talent.oneId, talent.platform, updateData);
      message.success('达人信息更新成功');
      onClose();
    } catch (err) {
      logger.error('保存达人信息失败:', err);
      message.error('保存失败，请重试');
      throw err; // ProForm 需要抛出错误来停止提交
    }
  };

  return (
    <Modal
      title={
        <div>
          <div className="text-lg font-semibold">
            编辑达人: <span className="text-blue-600">{talent.name}</span>
          </div>
          <div className="text-sm font-normal text-gray-500 mt-1">
            {PLATFORM_NAMES[talent.platform]} 平台 · 更新达人的基础信息和平台特定字段
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
      centered
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        submitter={{
          render: (_, dom) => (
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              <Space>
                {dom[0]} {/* 重置按钮 */}
                {dom[1]} {/* 提交按钮 */}
              </Space>
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
      >
        {/* 基础信息卡片 */}
        <ProCard title="基础信息" headerBordered className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 达人昵称 */}
            <ProFormText
              name="name"
              label="达人昵称"
              placeholder="输入达人的昵称"
              rules={[{ required: true, message: '请输入达人昵称' }]}
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 平台账号ID */}
            <ProFormText
              name="platformAccountId"
              label={getPlatformAccountIdLabel()}
              placeholder={getPlatformAccountIdPlaceholder()}
              rules={[{ required: true, message: `请输入${getPlatformAccountIdLabel()}` }]}
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 商业属性（机构选择器） */}
            <Form.Item
              name="agencyId"
              label={
                <span>
                  商业属性
                  <span className="ml-1 text-xs text-gray-500">（机构归属）</span>
                </span>
              }
              rules={[{ required: true, message: '请选择商业属性' }]}
            >
              <AgencySelector placeholder="选择归属机构" />
            </Form.Item>

            {/* 平台特定信息（仅抖音） */}
            {talent.platform === 'douyin' && (
              <ProFormText
                name={['platformSpecific', 'uid']}
                label={
                  <span>
                    平台特定信息
                    <span className="ml-1 text-xs text-gray-500">（选填）</span>
                  </span>
                }
                placeholder="抖音UID（辅助识别）"
                fieldProps={{
                  size: 'middle',
                }}
              />
            )}
          </div>
        </ProCard>

        {/* 达人分类与属性卡片 */}
        <ProCard title="达人分类与属性" headerBordered>
          <div className="space-y-4">
            {/* 第一行：达人等级和状态 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 达人等级 */}
              <ProFormRadio.Group
                name="talentTier"
                label="达人等级"
                options={[
                  { label: '头部', value: '头部' },
                  { label: '腰部', value: '腰部' },
                  { label: '尾部', value: '尾部' },
                ]}
                fieldProps={{
                  optionType: 'default',
                }}
              />

              {/* 状态 */}
              <ProFormRadio.Group
                name="status"
                label="状态"
                options={[
                  { label: '活跃', value: 'active' },
                  { label: '暂停', value: 'inactive' },
                  { label: '归档', value: 'archived' },
                ]}
                fieldProps={{
                  optionType: 'default',
                }}
              />
            </div>

            {/* 第二行：分类标签（使用自定义 TagInput 组件） */}
            <Form.Item
              name="talentType"
              label="分类标签"
              tooltip="输入标签后按回车添加，或点击下方常用标签快速添加"
            >
              <TagInput
                selectedTags={form.getFieldValue('talentType') || []}
                availableTags={availableTags}
                onChange={(tags) => form.setFieldValue('talentType', tags)}
                placeholder="输入分类标签后按回车，如：美妆、时尚等"
                onError={(msg) => message.warning(msg)}
              />
            </Form.Item>
          </div>
        </ProCard>
      </ProForm>
    </Modal>
  );
}
