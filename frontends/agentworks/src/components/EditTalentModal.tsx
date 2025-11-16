/**
 * 编辑达人弹窗
 */

import { useState, useEffect } from 'react';
import type { Talent, Platform, TalentTier, TalentStatus } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import { AGENCY_INDIVIDUAL_ID } from '../types/agency';
import { TagInput } from './TagInput';
import { AgencySelector } from './AgencySelector';

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
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    platformAccountId: '',
    name: '',
    agencyId: AGENCY_INDIVIDUAL_ID, // 默认为野生达人
    talentTier: undefined,
    talentType: [],
    status: 'active',
    platformSpecific: {},
  });

  // 当弹窗打开时，初始化表单数据
  useEffect(() => {
    if (isOpen && talent) {
      setFormData({
        platformAccountId: talent.platformAccountId || '',
        name: talent.name || '',
        agencyId: talent.agencyId || AGENCY_INDIVIDUAL_ID, // 默认野生达人
        talentTier: talent.talentTier,
        talentType: talent.talentType || [],
        status: talent.status || 'active',
        platformSpecific: {
          xingtuId: talent.platformSpecific?.xingtuId || '',
          uid: talent.platformSpecific?.uid || '',
        },
      });
    }
  }, [isOpen, talent]);

  if (!isOpen || !talent) return null;

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
    if (!formData.platformAccountId.trim()) {
      alert(`请输入${getPlatformAccountIdLabel()}`);
      return false;
    }
    if (!formData.name.trim()) {
      alert('请输入达人昵称');
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
      setSaving(true);

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

      // 构建更新数据
      const updateData: Partial<Talent> = {
        platformAccountId: formData.platformAccountId,
        name: formData.name,
        agencyId: formData.agencyId,
        talentTier: formData.talentTier,
        talentType: formData.talentType.length > 0 ? formData.talentType : undefined,
        status: formData.status,
        platformSpecific:
          Object.keys(cleanedPlatformSpecific).length > 0
            ? cleanedPlatformSpecific
            : undefined,
      };

      await onSave(talent.oneId, talent.platform, updateData);
      onClose();
    } catch (error) {
      console.error('保存达人信息失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-10 mx-auto p-0 border-0 w-full max-w-4xl shadow-2xl rounded-xl bg-white overflow-hidden mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">
                编辑达人: <span className="text-blue-100">{talent.name}</span>
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                {PLATFORM_NAMES[talent.platform]} 平台 · 更新达人的基础信息和平台特定字段
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 text-3xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          {/* 单栏布局 */}
          <div className="space-y-5">
            {/* 基础信息卡片 */}
            <div className="border rounded-lg bg-white p-4 shadow-sm">
              <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                基础信息
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 左列：达人昵称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    达人昵称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="输入达人的昵称"
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* 右列：平台账号ID（星图ID） */}
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
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* 左列：商业属性（原归属机构） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    商业属性
                    <span className="ml-1 text-xs text-gray-500">（机构归属）</span>
                  </label>
                  <AgencySelector
                    value={formData.agencyId}
                    onChange={(value) => handleChange('agencyId', value)}
                    disabled={false}
                    placeholder="选择归属机构"
                  />
                </div>

                {/* 右列：平台特定信息（如果有） */}
                {talent.platform === 'douyin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      平台特定信息
                      <span className="ml-1 text-xs text-gray-500">（选填）</span>
                    </label>
                    <input
                      type="text"
                      value={formData.platformSpecific.uid || ''}
                      onChange={e =>
                        handlePlatformSpecificChange('uid', e.target.value)
                      }
                      placeholder="抖音UID（辅助识别）"
                      className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 达人分类与属性卡片 */}
            <div className="border rounded-lg bg-white p-4 shadow-sm">
              <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">
                达人分类与属性
              </h4>
              <div className="space-y-4">
                {/* 第一行：达人等级和状态 - 双列布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 左列：达人等级 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      达人等级
                    </label>
                    <div className="space-y-2">
                      {['头部', '腰部', '尾部'].map((tier) => (
                        <label key={tier} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="talentTier"
                            value={tier}
                            checked={formData.talentTier === tier}
                            onChange={() => handleChange('talentTier', tier as TalentTier)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{tier}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 右列：状态 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      状态
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="active"
                          checked={formData.status === 'active'}
                          onChange={() => handleChange('status', 'active')}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">活跃</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="inactive"
                          checked={formData.status === 'inactive'}
                          onChange={() => handleChange('status', 'inactive')}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">暂停</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value="archived"
                          checked={formData.status === 'archived'}
                          onChange={() => handleChange('status', 'archived')}
                          className="h-4 w-4 text-gray-600 focus:ring-gray-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">归档</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 第二行：达人分类标签 - 全宽 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类标签
                  </label>
                  <TagInput
                    selectedTags={formData.talentType}
                    availableTags={availableTags}
                    onChange={(tags) => handleChange('talentType', tags)}
                    placeholder="输入分类标签后按回车，如：美妆、时尚等"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer: 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={saving}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
