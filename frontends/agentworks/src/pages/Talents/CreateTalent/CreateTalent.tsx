/**
 * 新增达人页面
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
}

export function CreateTalent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    platform: 'douyin',
    platformAccountId: '',
    name: '',
    fansCount: '',
    agencyId: AGENCY_INDIVIDUAL_ID, // 默认"野生达人"
    defaultRebate: '',
    talentTier: undefined,
    talentType: [],
    status: 'active',
  });

  // 机构列表（暂时硬编码，后续可以从 API 获取）
  const agencies = [
    { id: AGENCY_INDIVIDUAL_ID, name: '野生达人', baseRebate: 8 },
    // 后续可以从 API 加载更多机构
  ];

  // 获取选中机构的基础返点
  const selectedAgency = agencies.find(a => a.id === formData.agencyId);
  const agencyBaseRebate = selectedAgency?.baseRebate;

  // 处理表单字段变化
  const handleChange = (
    field: keyof FormData,
    value: string | string[] | TalentTier | undefined
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      alert('请输入平台账号ID');
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
        prices: [], // 初始为空数组
        rebates: [], // 初始为空数组
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
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新增达人</h1>
          <p className="mt-1 text-sm text-gray-500">
            添加新的达人信息到系统
          </p>
        </div>
        <button
          onClick={() => navigate('/talents/basic')}
          className="btn btn-secondary"
        >
          返回列表
        </button>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* 基础信息 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">基础信息</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 平台 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                平台 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.platform}
                onChange={e =>
                  handleChange('platform', e.target.value as Platform)
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="douyin">{PLATFORM_NAMES.douyin}</option>
                <option value="xiaohongshu">{PLATFORM_NAMES.xiaohongshu}</option>
                <option value="bilibili">{PLATFORM_NAMES.bilibili}</option>
                <option value="kuaishou">{PLATFORM_NAMES.kuaishou}</option>
              </select>
            </div>

            {/* 平台账号ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                平台账号ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.platformAccountId}
                onChange={e =>
                  handleChange('platformAccountId', e.target.value)
                }
                placeholder="例如：抖音号、小红书ID等"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* 达人昵称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                达人昵称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="达人的昵称"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* 粉丝数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                粉丝数
              </label>
              <input
                type="text"
                value={formData.fansCount}
                onChange={e => handleChange('fansCount', e.target.value)}
                placeholder="例如：1000000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* 达人等级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">请选择</option>
                <option value="头部">头部</option>
                <option value="腰部">腰部</option>
                <option value="尾部">尾部</option>
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                状态
              </label>
              <select
                value={formData.status}
                onChange={e =>
                  handleChange('status', e.target.value as TalentStatus)
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="active">活跃</option>
                <option value="inactive">暂停</option>
                <option value="archived">归档</option>
              </select>
            </div>
          </div>
        </div>

        {/* 机构与返点 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            机构与返点
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 所属机构 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                所属机构
              </label>
              <select
                value={formData.agencyId}
                onChange={e => handleChange('agencyId', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                设置达人的默认返点率，优先级高于机构返点。新增合作时作为参考值。
              </p>
            </div>
          </div>
        </div>

        {/* 达人类型 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">达人类型</h3>
          <div className="flex flex-wrap gap-2">
            {talentTypeOptions.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleTalentTypeChange(type)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.talentType.includes(type)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/talents/basic')}
            className="btn btn-secondary"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '提交中...' : '创建达人'}
          </button>
        </div>
      </form>
    </div>
  );
}
