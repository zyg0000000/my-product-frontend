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
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormDigit,
  ProCard,
} from '@ant-design/pro-components';
import { Button, App, Tag, Form } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { logger } from '../../../utils/logger';
import { createTalent, getTalents } from '../../../api/talent';
import type { Platform, TalentStatus, Talent } from '../../../types/talent';
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
  talentType: string[];
  status: TalentStatus;
  // 平台特定字段（动态，从配置读取）
  [key: string]: unknown;
}

export function CreateTalent() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [form] = Form.useForm();

  // 从路由 state 获取传入的平台，默认抖音
  const initialPlatform =
    (location.state as { platform?: Platform })?.platform || 'douyin';
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform>(initialPlatform);

  // 使用平台配置 Hook（只获取启用的平台）
  const {
    getPlatformList,
    getPlatformNames,
    getPlatformConfigByKey,
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

  // 获取当前平台的 accountId 配置
  const getAccountIdConfig = () => {
    const config = getPlatformConfigByKey(selectedPlatform);
    return (
      config?.accountId || {
        label: '平台账号ID',
        placeholder: '请输入平台账号ID',
        helpText: undefined,
      }
    );
  };

  // 获取当前平台的特定字段配置
  const getSpecificFields = () => {
    const config = getPlatformConfigByKey(selectedPlatform);
    return config?.specificFields || {};
  };

  // 提交表单
  const handleSubmit = async (values: FormData) => {
    try {
      setLoading(true);

      // 动态构建 platformSpecific 数据
      const specificFields = getSpecificFields();
      const platformSpecific: Record<string, string> = {};
      Object.keys(specificFields).forEach(fieldKey => {
        const value = values[fieldKey];
        if (value) {
          platformSpecific[fieldKey] = String(value);
        }
      });

      // 构建提交数据
      const submitData = {
        platform: values.platform,
        platformAccountId: values.platformAccountId,
        name: values.name,
        fansCount: values.fansCount,
        agencyId: values.agencyId || AGENCY_INDIVIDUAL_ID,
        talentType:
          values.talentType?.length > 0 ? values.talentType : undefined,
        status: values.status,
        platformSpecific:
          Object.keys(platformSpecific).length > 0
            ? platformSpecific
            : undefined,
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
            <h1 className="text-2xl font-bold text-content">新增达人</h1>
            <p className="mt-1 text-sm text-content-secondary">添加新的达人信息到系统</p>
          </div>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
        </div>
      </div>

      <ProForm<FormData>
        form={form}
        onFinish={handleSubmit}
        loading={loading || configLoading}
        initialValues={{
          platform: initialPlatform,
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
              label={getAccountIdConfig().label}
              placeholder={getAccountIdConfig().placeholder}
              rules={[
                {
                  required: true,
                  message: `请输入${getAccountIdConfig().label}`,
                },
              ]}
              tooltip={getAccountIdConfig().helpText}
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

        {/* 平台特定信息 - 根据配置动态显示 */}
        {Object.keys(getSpecificFields()).length > 0 && (
          <ProCard
            title="平台特定信息"
            className="mb-4"
            extra={
              <Tag color="blue">
                {platformNames[selectedPlatform] || selectedPlatform}平台
              </Tag>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
              {Object.entries(getSpecificFields()).map(
                ([fieldKey, fieldConfig]) => (
                  <ProFormText
                    key={fieldKey}
                    name={fieldKey}
                    label={fieldConfig.label}
                    placeholder={`请输入${fieldConfig.label}${fieldConfig.required ? '' : '（选填）'}`}
                    rules={
                      fieldConfig.required
                        ? [
                            {
                              required: true,
                              message: `请输入${fieldConfig.label}`,
                            },
                          ]
                        : undefined
                    }
                    width="md"
                  />
                )
              )}
            </div>
          </ProCard>
        )}
      </ProForm>
    </div>
  );
}
