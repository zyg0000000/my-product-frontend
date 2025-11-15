/**
 * 编辑达人弹窗
 */

import { useState, useEffect } from 'react';
import type { Talent, Platform, TalentTier, TalentStatus } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';

interface EditTalentModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent | null;
  onSave: (oneId: string, platform: Platform, data: Partial<Talent>) => Promise<void>;
}

interface FormData {
  platformAccountId: string;
  name: string;
  fansCount: string;
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

export function EditTalentModal({ isOpen, onClose, talent, onSave }: EditTalentModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    platformAccountId: '',
    name: '',
    fansCount: '',
    defaultRebate: '',
    talentTier: undefined,
    talentType: [],
    status: 'active',
    platformSpecific: {},
  });

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

  // 当弹窗打开时，初始化表单数据
  useEffect(() => {
    if (isOpen && talent) {
      setFormData({
        platformAccountId: talent.platformAccountId || '',
        name: talent.name || '',
        fansCount: talent.fansCount ? String(talent.fansCount) : '',
        defaultRebate: talent.defaultRebate ? String(talent.defaultRebate) : '',
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
        fansCount: formData.fansCount ? Number(formData.fansCount) : undefined,
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
        className="relative top-10 mx-auto p-0 border-0 w-full max-w-5xl shadow-2xl rounded-xl bg-white overflow-hidden mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">
                编辑达人: <span className="text-purple-100">{talent.name}</span>
              </h3>
              <p className="text-purple-100 text-sm mt-1">
                {PLATFORM_NAMES[talent.platform]} 平台 · 管理基础信息和平台特定字段
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-100 text-3xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 上部：左右两栏布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 左侧：基础信息 */}
            <div className="flex flex-col border rounded-md bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">基础信息</h4>
              <div className="space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
                {/* 平台账号ID */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {getPlatformAccountIdLabel()} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.platformAccountId}
                    onChange={e =>
                      handleChange('platformAccountId', e.target.value)
                    }
                    placeholder={getPlatformAccountIdPlaceholder()}
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* 达人昵称 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    达人昵称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="输入达人的昵称"
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* 粉丝数 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    粉丝数
                  </label>
                  <input
                    type="text"
                    value={formData.fansCount}
                    onChange={e => handleChange('fansCount', e.target.value)}
                    placeholder="例如：1000000"
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                {/* 达人等级 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">请选择</option>
                    <option value="头部">头部</option>
                    <option value="腰部">腰部</option>
                    <option value="尾部">尾部</option>
                  </select>
                </div>

                {/* 默认返点 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    默认返点 (%)
                  </label>
                  <input
                    type="text"
                    value={formData.defaultRebate}
                    onChange={e => handleChange('defaultRebate', e.target.value)}
                    placeholder="输入默认返点率"
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    0-100 之间的数字
                  </p>
                </div>

                {/* 状态 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={formData.status}
                    onChange={e =>
                      handleChange('status', e.target.value as TalentStatus)
                    }
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">暂停</option>
                    <option value="archived">归档</option>
                  </select>
                </div>

                {/* 达人分类 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    达人分类
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {talentTypeOptions.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTalentTypeChange(type)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          formData.talentType.includes(type)
                            ? 'bg-purple-600 text-white shadow-md hover:bg-purple-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：平台特定信息 */}
            <div className="flex flex-col border rounded-md bg-gray-50 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">平台特定信息</h4>
              <div className="space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
                {talent.platform === 'douyin' ? (
                  <>
                    <p className="text-xs text-gray-500 mb-3">
                      抖音平台的辅助ID信息
                    </p>
                    {/* 抖音UID */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
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
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </>
                ) : talent.platform === 'xiaohongshu' ? (
                  <p className="text-xs text-gray-500">
                    小红书平台暂无特定字段
                  </p>
                ) : talent.platform === 'bilibili' ? (
                  <p className="text-xs text-gray-500">
                    B站平台暂无特定字段
                  </p>
                ) : talent.platform === 'kuaishou' ? (
                  <p className="text-xs text-gray-500">
                    快手平台暂无特定字段
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    该平台暂无特定字段
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer: 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              disabled={saving}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
