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

import { useEffect, useState, useRef } from 'react';
import { Modal, Space, App } from 'antd';
import {
  ProForm,
  ProFormText,
  ProFormSelect,
  ProCard,
} from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-components';
import { logger } from '../utils/logger';
import type { Talent, Platform, TalentStatus } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';
import { TagInput } from './TagInput';
import { AgencySelector } from './AgencySelector';
import { usePlatformConfig } from '../hooks/usePlatformConfig';

interface EditTalentModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent | null;
  onSave: (
    oneId: string,
    platform: Platform,
    data: Partial<Talent>
  ) => Promise<void>;
  availableTags: string[];
}

interface FormData {
  platformAccountId: string;
  name: string;
  agencyId: string;
  talentType: string[];
  status: TalentStatus;
  // 平台特定字段
  platformSpecific: {
    uid?: string;
  };
}

export function EditTalentModal({
  isOpen,
  onClose,
  talent,
  onSave,
  availableTags,
}: EditTalentModalProps) {
  const { message } = App.useApp();
  // 使用 ProFormInstance ref 替代 Form.useForm，避免 "not connected" 警告
  const formRef = useRef<ProFormInstance<FormData> | undefined>(undefined);
  // 使用 state 管理 talentType，避免在渲染时访问 ref
  const [currentTalentType, setCurrentTalentType] = useState<string[]>([]);
  usePlatformConfig(false);

  // 当弹窗打开时，初始化表单数据
  // 这里需要同步 talent prop 到内部 state，是 useEffect + setState 的正确使用场景
  useEffect(() => {
    if (isOpen && talent) {
      const talentType = talent.talentType || [];
      // 使用 setTimeout 确保 formRef.current 已经准备好
      // ProForm 在 Modal 打开时需要一个渲染周期来初始化 formRef
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.setFieldsValue({
            platformAccountId: talent.platformAccountId || '',
            name: talent.name || '',
            agencyId: talent.agencyId || AGENCY_INDIVIDUAL_ID,
            talentType,
            status: talent.status || 'active',
            platformSpecific: {
              uid: talent.platformSpecific?.uid || '',
            },
          });
        }
      }, 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentTalentType(talentType);
      return () => clearTimeout(timer);
    }
  }, [isOpen, talent]);

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
        talentType:
          values.talentType && values.talentType.length > 0
            ? values.talentType
            : undefined,
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
            编辑达人: <span className="text-primary-600">{talent.name}</span>
          </div>
          <div className="text-sm font-normal text-content-secondary mt-1">
            {PLATFORM_NAMES[talent.platform]} 平台 ·
            更新达人的基础信息和平台特定字段
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
        formRef={formRef}
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
              rules={[
                {
                  required: true,
                  message: `请输入${getPlatformAccountIdLabel()}`,
                },
              ]}
              fieldProps={{
                size: 'middle',
              }}
            />

            {/* 商业属性（机构选择器） */}
            <ProForm.Item
              name="agencyId"
              label={
                <span>
                  商业属性
                  <span className="ml-1 text-xs text-content-secondary">
                    （机构归属）
                  </span>
                </span>
              }
              rules={[{ required: true, message: '请选择商业属性' }]}
            >
              <AgencySelector placeholder="选择归属机构" />
            </ProForm.Item>

            {/* 平台特定信息（仅抖音） */}
            {talent.platform === 'douyin' && (
              <ProFormText
                name={['platformSpecific', 'uid']}
                label={
                  <span>
                    平台特定信息
                    <span className="ml-1 text-xs text-content-secondary">
                      （选填）
                    </span>
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
            {/* 第一行：状态 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 状态 */}
              <ProFormSelect
                name="status"
                label="状态"
                initialValue="active"
                options={[
                  { label: '活跃', value: 'active' },
                  { label: '暂停', value: 'inactive' },
                  { label: '归档', value: 'archived' },
                ]}
                fieldProps={{
                  size: 'middle',
                }}
              />
            </div>

            {/* 第二行：分类标签（使用自定义 TagInput 组件） */}
            <ProForm.Item
              name="talentType"
              label="分类标签"
              tooltip="输入标签后按回车添加，或点击下方常用标签快速添加"
            >
              <TagInput
                selectedTags={currentTalentType}
                availableTags={availableTags}
                onChange={tags => {
                  setCurrentTalentType(tags);
                  formRef.current?.setFieldValue?.('talentType', tags);
                }}
                placeholder="输入分类标签后按回车，如：美妆、时尚等"
                onError={msg => message.warning(msg)}
              />
            </ProForm.Item>
          </div>
        </ProCard>
      </ProForm>
    </Modal>
  );
}
