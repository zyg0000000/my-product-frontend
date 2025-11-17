/**
 * 新增达人页面 - 标准表单样式
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTalent, getTalents } from '../../../api/talent';
import type { Platform, TalentTier, TalentStatus, Talent } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../../../types/agency';
import { TagInput } from '../../../components/TagInput';
import { AgencySelector } from '../../../components/AgencySelector';
import { Toast } from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';

interface FormData {
  platform: Platform;
  platformAccountId: string;
  name: string;
  fansCount: string;
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

export function CreateTalent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { toast, hideToast, success, error: showError } = useToast();
  const [formData, setFormData] = useState<FormData>({
    platform: 'douyin',
    platformAccountId: '',
    name: '',
    fansCount: '',
    agencyId: AGENCY_INDIVIDUAL_ID,
    talentTier: undefined,
    talentType: [],
    status: 'active',
    platformSpecific: {},
  });

  // 加载已有的达人类型标签
  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        // 获取所有达人数据
        const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];
        const allTags = new Set<string>();

        for (const platform of platforms) {
          const response = await getTalents({ platform });
          if (response.success && response.data) {
            const talents = Array.isArray(response.data) ? response.data : [response.data];
            talents.forEach((talent: Talent) => {
              if (talent.talentType && Array.isArray(talent.talentType)) {
                talent.talentType.forEach(type => allTags.add(type));
              }
            });
          }
        }

        setAvailableTags(Array.from(allTags).sort());
      } catch (error) {
        console.error('加载标签失败:', error);
        // 失败时设置一些默认标签
        setAvailableTags(['美妆', '时尚', '美食', '旅游', '科技', '游戏', '教育', '母婴', '运动', '其他']);
      }
    };

    loadAvailableTags();
  }, []);

  // 根据平台获取 platformAccountId 的提示文本
  const getPlatformAccountIdPlaceholder = () => {
    switch (formData.platform) {
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
    switch (formData.platform) {
      case 'douyin':
        return '星图ID';
      case 'xiaohongshu':
        return '主要ID';
      default:
        return '平台账号ID';
    }
  };

  // 处理表单字段变化
  const handleChange = (
    field: keyof FormData,
    value: string | string[] | TalentTier | undefined
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 处理平台特定字段变化
  const handlePlatformSpecificChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      platformSpecific: {
        ...prev.platformSpecific,
        [field]: value || undefined,
      },
    }));
  };

  // 表单验证
  const validateForm = (): boolean => {
    if (!formData.platform) {
      showError('请选择平台');
      return false;
    }
    if (!formData.platformAccountId.trim()) {
      showError(`请输入${getPlatformAccountIdLabel()}`);
      return false;
    }
    if (!formData.name.trim()) {
      showError('请输入达人昵称');
      return false;
    }
    if (formData.fansCount && isNaN(Number(formData.fansCount))) {
      showError('粉丝数必须是数字');
      return false;
    }
    return true;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // 清理 platformSpecific 中的空值
      const cleanedPlatformSpecific = Object.entries(
        formData.platformSpecific
      ).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      // 构建提交数据
      const submitData = {
        platform: formData.platform,
        platformAccountId: formData.platformAccountId,
        name: formData.name,
        fansCount: formData.fansCount ? Number(formData.fansCount) : undefined,
        agencyId: formData.agencyId,
        talentTier: formData.talentTier,
        talentType: formData.talentType.length > 0 ? formData.talentType : undefined,
        status: formData.status,
        platformSpecific:
          Object.keys(cleanedPlatformSpecific).length > 0
            ? cleanedPlatformSpecific
            : undefined,
        prices: [],
      };

      const response = await createTalent(submitData);

      if (response.success) {
        success('达人创建成功');
        navigate('/talents/basic');
      } else {
        showError(`创建失败：${response.message || '未知错误'}`);
      }
    } catch (err) {
      console.error('创建达人失败:', err);
      showError('创建失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">新增达人</h1>
          <p className="mt-2 text-sm text-gray-600">
            添加新的达人信息到系统，所有带 <span className="text-red-500">*</span> 的字段为必填项
          </p>
        </div>
        <button
          onClick={() => navigate('/talents/basic')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          取消
        </button>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基础信息卡片 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">基础信息</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* 平台 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  平台 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.platform}
                  onChange={e =>
                    handleChange('platform', e.target.value as Platform)
                  }
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="douyin">{PLATFORM_NAMES.douyin}</option>
                  <option value="xiaohongshu">{PLATFORM_NAMES.xiaohongshu}</option>
                  <option value="bilibili">{PLATFORM_NAMES.bilibili}</option>
                  <option value="kuaishou">{PLATFORM_NAMES.kuaishou}</option>
                </select>
              </div>

              {/* 平台账号ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {getPlatformAccountIdLabel()} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.platformAccountId}
                  onChange={e =>
                    handleChange('platformAccountId', e.target.value)
                  }
                  placeholder={getPlatformAccountIdPlaceholder()}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              {/* 达人昵称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  达人昵称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="输入达人的昵称"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              {/* 粉丝数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.fansCount}
                  onChange={e => handleChange('fansCount', e.target.value)}
                  placeholder="例如：1000000"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              {/* 达人等级 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  达人等级
                </label>
                <select
                  value={formData.talentTier || ''}
                  onChange={e =>
                    handleChange(
                      'talentTier',
                      e.target.value ? (e.target.value as TalentTier) : undefined
                    )
                  }
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">请选择</option>
                  <option value="头部">头部</option>
                  <option value="腰部">腰部</option>
                  <option value="尾部">尾部</option>
                </select>
              </div>

              {/* 状态 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  状态
                </label>
                <select
                  value={formData.status}
                  onChange={e =>
                    handleChange('status', e.target.value as TalentStatus)
                  }
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">暂停</option>
                  <option value="archived">归档</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 平台特定信息卡片 - 仅抖音显示 */}
        {formData.platform === 'douyin' && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">平台特定信息</h2>
              <p className="mt-1 text-sm text-gray-500">抖音平台的辅助ID信息</p>
            </div>
            <div className="p-6">
              {/* 抖音UID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  抖音UID
                  <span className="ml-1 text-xs text-gray-500">（选填）</span>
                </label>
                <input
                  type="text"
                  value={formData.platformSpecific.uid || ''}
                  onChange={e =>
                    handlePlatformSpecificChange('uid', e.target.value)
                  }
                  placeholder="输入抖音用户ID（辅助识别）"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* 机构归属卡片 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">机构归属</h2>
            <p className="mt-1 text-sm text-gray-500">设置达人的机构归属</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6">
              {/* 所属机构 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  所属机构
                </label>
                <AgencySelector
                  value={formData.agencyId}
                  onChange={(value) => handleChange('agencyId', value)}
                  disabled={false}
                  placeholder="选择归属机构"
                  className="w-full"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  选择达人所属的机构，野生达人为独立达人
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 达人分类卡片 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">达人分类</h2>
            <p className="mt-1 text-sm text-gray-500">输入自定义标签或从常用标签中选择</p>
          </div>
          <div className="p-6">
            <TagInput
              selectedTags={formData.talentType}
              availableTags={availableTags}
              onChange={(tags) => handleChange('talentType', tags)}
              placeholder="输入分类标签后按回车，如：美妆、时尚等"
              onError={showError}
            />
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/talents/basic')}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? '提交中...' : '创建达人'}
          </button>
        </div>
      </form>

      {/* Toast 通知 */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
