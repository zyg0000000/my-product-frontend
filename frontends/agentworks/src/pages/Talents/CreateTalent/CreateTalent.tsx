/**
 * 新增达人页面 - 标准表单样式
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTalent } from '../../../api/talent';
import type { Platform, TalentTier, TalentStatus } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../../../types/agency';

interface FormData {
  platform: Platform;
  platformAccountId: string;
  name: string;
  fansCount: string;
  agencyId: string;
  defaultRebate: string;
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
  const [formData, setFormData] = useState<FormData>({
    platform: 'douyin',
    platformAccountId: '',
    name: '',
    fansCount: '',
    agencyId: AGENCY_INDIVIDUAL_ID,
    defaultRebate: '',
    talentTier: undefined,
    talentType: [],
    status: 'active',
    platformSpecific: {},
  });

  // 机构列表（暂时硬编码，后续可以从 API 获取）
  const agencies = [
    { id: AGENCY_INDIVIDUAL_ID, name: '野生达人', baseRebate: 8 },
  ];

  // 获取选中机构的基础返点
  const selectedAgency = agencies.find(a => a.id === formData.agencyId);
  const agencyBaseRebate = selectedAgency?.baseRebate;

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

  // 处理达人类型多选
  const handleTalentTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      talentType: prev.talentType.includes(type)
        ? prev.talentType.filter(t => t !== type)
        : [...prev.talentType, type],
    }));
  };

  // 表单验证
  const validateForm = (): boolean => {
    if (!formData.platform) {
      alert('请选择平台');
      return false;
    }
    if (!formData.platformAccountId.trim()) {
      alert(`请输入${getPlatformAccountIdLabel()}`);
      return false;
    }
    if (!formData.name.trim()) {
      alert('请输入达人昵称');
      return false;
    }
    if (formData.fansCount && isNaN(Number(formData.fansCount))) {
      alert('粉丝数必须是数字');
      return false;
    }
    if (
      formData.defaultRebate &&
      (isNaN(Number(formData.defaultRebate)) ||
        Number(formData.defaultRebate) < 0 ||
        Number(formData.defaultRebate) > 100)
    ) {
      alert('默认返点必须是 0-100 之间的数字');
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
        defaultRebate: formData.defaultRebate
          ? Number(formData.defaultRebate)
          : undefined,
        talentTier: formData.talentTier,
        talentType: formData.talentType.length > 0 ? formData.talentType : undefined,
        status: formData.status,
        platformSpecific:
          Object.keys(cleanedPlatformSpecific).length > 0
            ? cleanedPlatformSpecific
            : undefined,
        prices: [],
        rebates: [],
      };

      const response = await createTalent(submitData);

      if (response.success) {
        alert('达人创建成功！');
        navigate('/talents/basic');
      } else {
        alert(`创建失败：${response.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('创建达人失败:', error);
      alert('创建失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 达人类型选项
  const talentTypeOptions = [
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
  ];

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

        {/* 机构与返点卡片 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">机构与返点</h2>
            <p className="mt-1 text-sm text-gray-500">设置达人的机构归属和默认返点率</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* 所属机构 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  所属机构
                </label>
                <select
                  value={formData.agencyId}
                  onChange={e => handleChange('agencyId', e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  {agencies.map(agency => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name} (基础返点 {agency.baseRebate}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* 默认返点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  默认返点 (%)
                </label>
                <input
                  type="text"
                  value={formData.defaultRebate}
                  onChange={e => handleChange('defaultRebate', e.target.value)}
                  placeholder={
                    agencyBaseRebate
                      ? `不填写则使用机构返点 ${agencyBaseRebate}%`
                      : '输入默认返点率'
                  }
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  设置达人的默认返点率，优先级高于机构返点，新增合作时作为参考值
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 达人分类卡片 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">达人分类</h2>
            <p className="mt-1 text-sm text-gray-500">选择达人的内容类型标签</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {talentTypeOptions.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTalentTypeChange(type)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    formData.talentType.includes(type)
                      ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
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
    </div>
  );
}
