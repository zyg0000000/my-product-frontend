/**
 * 新增达人页面 - Ant Design Pro 升级版
 *
 * 升级要点：
 * 1. 使用 ProForm 组件替代原生表单
 * 2. 使用 ProCard 替代自定义卡片
 * 3. 使用 Ant Design 的 Form 组件和验证
 * 4. 使用 message API 替代 Toast
 * 5. 统一使用 Ant Design 组件
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormDigit,
  ProCard,
} from '@ant-design/pro-components';
import { Button, message, Tag, Form } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { logger } from '../../../utils/logger';
import { createTalent, getTalents } from '../../../api/talent';
import type {
  Platform,
  TalentTier,
  TalentStatus,
  Talent,
} from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../../../types/agency';
import { AgencySelector } from '../../../components/AgencySelector';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

interface FormData {
  platform: Platform;
  platformAccountId: string;
  name: string;
  fansCount?: number;
  agencyId: string;
  talentTier?: TalentTier;
  talentType: string[];
  status: TalentStatus;
  // 平台特定字段
  uid?: string;
}

export function CreateTalent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [form] = Form.useForm();

  // 使用平台配置 Hook（只获取启用的平台）
  const {
    getPlatformList,
    getPlatformNames,
    getTalentTiers,
    loading: configLoading,
  } = usePlatformConfig(false);
  const platforms = getPlatformList();
  const platformNames = getPlatformNames();

  // 加载已有的达人类型标签
  useEffect(() => {
    const loadAvailableTags = async () => {
      // 等待平台配置加载完成
      if (configLoading || platforms.length === 0) {
        return;
      }

      try {
        // 获取所有达人数据
        const allTags = new Set<string>();

        for (const platform of platforms) {
          const response = await getTalents({ platform });
          if (response.success && response.data) {
            const talents = Array.isArray(response.data)
              ? response.data
              : [response.data];
            talents.forEach((talent: Talent) => {
              if (talent.talentType && Array.isArray(talent.talentType)) {
                talent.talentType.forEach(type => allTags.add(type));
              }
            });
          }
        }

        setAvailableTags(Array.from(allTags).sort());
      } catch (error) {
        logger.error('加载标签失败:', error);
        // 失败时设置一些默认标签
        setAvailableTags([
          '美妆',
          '时尚',
          '美食',
          '旅游',
          '科技',
          '游戏',
          '教育',
          '母婴',
          '运动',
          '其他',
        ]);
      }
    };

    loadAvailableTags();
  }, [configLoading, platforms]);

  // 根据平台获取 platformAccountId 的提示文本
  const getPlatformAccountIdPlaceholder = () => {
    switch (selectedPlatform) {
      case 'douyin':
        return '请输入星图ID';
      case 'xiaohongshu':
        return '请输入蒲公英ID 或 小红书ID';
      case 'bilibili':
        return '请输入B站UID';
      case 'kuaishou':
        return '请输入快手ID';
      default:
        return '请输入平台账号ID';
    }
  };

  // 根据平台获取 platformAccountId 的标签
  const getPlatformAccountIdLabel = () => {
    switch (selectedPlatform) {
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
      setLoading(true);

      // 构建提交数据
      const submitData = {
        platform: values.platform,
        platformAccountId: values.platformAccountId,
        name: values.name,
        fansCount: values.fansCount,
        agencyId: values.agencyId || AGENCY_INDIVIDUAL_ID,
        talentTier: values.talentTier,
        talentType:
          values.talentType?.length > 0 ? values.talentType : undefined,
        status: values.status,
        platformSpecific: values.uid ? { uid: values.uid } : undefined,
        prices: [],
      };

      const response = await createTalent(submitData);

      if (response.success) {
        message.success('达人创建成功');
        navigate('/talents/basic', {
          state: { selectedPlatform: values.platform },
        });
      } else {
        message.error(`创建失败：${response.message || '未知错误'}`);
      }
    } catch (err) {
      logger.error('创建达人失败:', err);
      message.error('创建失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* 页面标题 - Ant Design Pro 风格 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">新增达人</h1>
            <p className="mt-1 text-sm text-gray-500">添加新的达人信息到系统</p>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/talents/basic')}
          >
            返回列表
          </Button>
        </div>
      </div>

      <ProForm<FormData>
        form={form}
        onFinish={handleSubmit}
        loading={loading || configLoading}
        initialValues={{
          platform: platforms[0] || 'douyin',
          status: 'active',
          agencyId: AGENCY_INDIVIDUAL_ID,
        }}
        submitter={{
          searchConfig: {
            submitText: '创建达人',
            resetText: '重置',
          },
          render: (_, dom) => (
            <div className="flex justify-end gap-2 pt-4">{dom}</div>
          ),
        }}
      >
        {/* 基础信息 */}
        <ProCard title="基础信息" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <ProFormSelect
              name="platform"
              label="平台"
              rules={[{ required: true, message: '请选择平台' }]}
              options={platforms.map(platform => ({
                label: platformNames[platform] || PLATFORM_NAMES[platform],
                value: platform,
              }))}
              fieldProps={{
                onChange: (value: Platform) => {
                  setSelectedPlatform(value);
                  // 清空平台账号ID
                  form.setFieldValue('platformAccountId', '');
                },
              }}
            />

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
              tooltip={
                selectedPlatform === 'douyin'
                  ? '星图ID是抖音平台的唯一标识'
                  : undefined
              }
            />

            <ProFormText
              name="name"
              label="达人昵称"
              placeholder="请输入达人昵称"
              rules={[{ required: true, message: '请输入达人昵称' }]}
            />

            <ProFormDigit
              name="fansCount"
              label="粉丝数"
              placeholder="请输入粉丝数"
              fieldProps={{
                min: 0,
                precision: 0,
                formatter: value =>
                  value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '',
                parser: value =>
                  value ? parseInt(value.replace(/\$\s?|(,*)/g, '')) || 0 : 0,
              }}
            />

            <ProFormSelect
              name="talentTier"
              label="达人层级"
              placeholder="请选择达人层级"
              options={getTalentTiers(selectedPlatform).map(tier => ({
                label: tier.label,
                value: tier.label,
              }))}
            />

            <ProFormSelect
              name="status"
              label="状态"
              rules={[{ required: true }]}
              options={[
                { label: '活跃', value: 'active' },
                { label: '暂停', value: 'inactive' },
                { label: '归档', value: 'archived' },
              ]}
            />
          </div>
        </ProCard>

        {/* 商业信息 */}
        <ProCard title="商业信息" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <Form.Item name="agencyId" label="所属机构" className="mb-6">
              <AgencySelector
                value={form.getFieldValue('agencyId')}
                onChange={value => form.setFieldValue('agencyId', value)}
              />
            </Form.Item>

            <ProFormSelect
              name="talentType"
              label="内容标签"
              placeholder="请选择或输入内容标签"
              mode="tags"
              options={availableTags.map(tag => ({ label: tag, value: tag }))}
              fieldProps={{
                tokenSeparators: [',', '，'],
              }}
            />
          </div>
        </ProCard>

        {/* 平台特定信息 - 仅抖音显示 */}
        {selectedPlatform === 'douyin' && (
          <ProCard
            title="平台特定信息"
            className="mb-4"
            extra={<Tag color="blue">抖音平台</Tag>}
          >
            <ProFormText
              name="uid"
              label="抖音UID"
              placeholder="请输入抖音UID（选填）"
              tooltip="抖音UID是用户在抖音平台的唯一数字标识"
              width="md"
            />
          </ProCard>
        )}
      </ProForm>
    </div>
  );
}
