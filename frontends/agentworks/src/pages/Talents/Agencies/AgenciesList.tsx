/**
 * 机构管理页面
 */

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import type { Agency, AgencyFormData, AgencyType, AgencyStatus } from '../../../types/agency';
import { AGENCY_TYPE_NAMES, AGENCY_STATUS_NAMES, AGENCY_INDIVIDUAL_ID } from '../../../types/agency';
import {
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
} from '../../../api/agency';

export function AgenciesList() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState<AgencyFormData>({
    name: '',
    type: 'agency',
    baseRebate: 10,
    contactPerson: '',
    wechatId: '',
    phoneNumber: '',
    email: '',
    description: '',
    status: 'active',
  });
  const [baseRebateInput, setBaseRebateInput] = useState<string>('10');

  // 加载机构列表
  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAgencies();
      if (response.success && response.data) {
        setAgencies(response.data);
      } else {
        setError(response.message || '加载机构列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载机构列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAgency(null);
    setFormData({
      name: '',
      type: 'agency',
      baseRebate: 10,
      contactPerson: '',
      wechatId: '',
      phoneNumber: '',
      email: '',
      description: '',
      status: 'active',
    });
    setBaseRebateInput('10');
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      alert('野生达人是系统预设机构，不可编辑');
      return;
    }
    setEditingAgency(agency);
    const rebateValue = agency.rebateConfig?.baseRebate || 10;
    setFormData({
      name: agency.name,
      type: agency.type,
      baseRebate: rebateValue,
      contactPerson: agency.contactInfo?.contactPerson || '',
      wechatId: agency.contactInfo?.wechatId || '',
      phoneNumber: agency.contactInfo?.phoneNumber || '',
      email: agency.contactInfo?.email || '',
      description: agency.description || '',
      status: agency.status || 'active',
    });
    setBaseRebateInput(rebateValue.toString());
    setIsModalOpen(true);
  };

  // 删除机构
  const handleDelete = async (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      alert('野生达人是系统预设机构，不可删除');
      return;
    }
    if (confirm(`确定要删除机构「${agency.name}」吗？`)) {
      try {
        const response = await deleteAgency(agency.id);
        if (response.success) {
          // 重新加载列表
          await loadAgencies();
        } else {
          alert(response.message || '删除失败');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : '删除失败');
      }
    }
  };

  // 保存机构
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入机构名称');
      return;
    }
    if (formData.baseRebate < 0 || formData.baseRebate > 100) {
      alert('返点比例应在 0-100 之间');
      return;
    }

    // 验证手机号格式（如果填写了）
    if (formData.phoneNumber && !/^1[3-9]\d{9}$/.test(formData.phoneNumber)) {
      alert('请输入正确的手机号格式');
      return;
    }

    try {
      setSaving(true);
      let response;

      if (editingAgency) {
        // 编辑
        response = await updateAgency(editingAgency.id, formData);
      } else {
        // 新增
        response = await createAgency(formData);
      }

      if (response.success) {
        // 重新加载列表
        await loadAgencies();
        setIsModalOpen(false);
      } else {
        alert(response.message || '保存失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 统计达人数（模拟数据）
  const getTalentCount = (agencyId: string) => {
    // TODO: 后续从实际数据计算
    return agencyId === AGENCY_INDIVIDUAL_ID ? 0 : 0;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">机构管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理MCN机构和野生达人归属，设置基础返点
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          新增机构
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 机构列表 */}
      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  机构名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  当前返点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  达人数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  联系人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {agencies.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">暂无机构数据</p>
                    <button
                      onClick={handleAdd}
                      className="mt-4 text-primary-600 hover:text-primary-700"
                    >
                      点击新增机构
                    </button>
                  </td>
                </tr>
              ) : (
                agencies.map(agency => (
                  <tr key={agency.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <BuildingOffice2Icon className="mr-3 h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {agency.name}
                          </div>
                          {agency.description && (
                            <div className="text-xs text-gray-500 max-w-xs">
                              {agency.description}
                            </div>
                          )}
                          {agency.id === AGENCY_INDIVIDUAL_ID && !agency.description && (
                            <div className="text-xs text-gray-500">
                              系统预设
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          agency.type === 'agency'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {AGENCY_TYPE_NAMES[agency.type]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <span className="font-medium text-green-600">
                        {agency.rebateConfig?.baseRebate || 0}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {getTalentCount(agency.id)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>{agency.contactInfo?.contactPerson || '-'}</div>
                      {agency.contactInfo?.phoneNumber && (
                        <div className="text-xs text-gray-400">
                          {agency.contactInfo.phoneNumber}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          agency.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : agency.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {AGENCY_STATUS_NAMES[agency.status] || agency.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(agency)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {agency.id !== AGENCY_INDIVIDUAL_ID && (
                          <button
                            onClick={() => handleDelete(agency)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑弹窗 - 优化后的样式 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative top-10 mx-auto p-0 border-0 w-full max-w-3xl shadow-2xl rounded-xl bg-white overflow-hidden mb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 渐变色头部 */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {editingAgency ? '编辑机构' : '新增机构'}
                  </h3>
                  <p className="text-primary-100 text-sm mt-1">
                    {editingAgency
                      ? `更新机构信息：${editingAgency.name}`
                      : '创建新的机构并配置当前返点'}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:text-primary-100 text-3xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 表单内容区 */}
            <form className="p-6">
              <div className="space-y-6">
                {/* 基础信息卡片 */}
                <div className="border rounded-lg bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b">
                    基础信息
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 机构名称 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        机构名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="如：无忧传媒"
                      />
                    </div>

                    {/* 机构类型 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        机构类型
                      </label>
                      <select
                        value={formData.type}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            type: e.target.value as AgencyType,
                          })
                        }
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="agency">机构</option>
                        <option value="individual">个人</option>
                      </select>
                    </div>

                    {/* 当前返点 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        当前返点 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={baseRebateInput}
                          onChange={e => {
                            const value = e.target.value;
                            setBaseRebateInput(value);
                            setFormData({
                              ...formData,
                              baseRebate: parseFloat(value) || 0,
                            });
                          }}
                          className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 pr-10"
                          placeholder="10"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>

                    {/* 机构状态 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        机构状态
                      </label>
                      <select
                        value={formData.status}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            status: e.target.value as AgencyStatus,
                          })
                        }
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="active">🟢 正常</option>
                        <option value="suspended">🟡 暂停</option>
                        <option value="inactive">🔴 停用</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 联系信息卡片 */}
                <div className="border rounded-lg bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b">
                    联系信息
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 联系人 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        联系人
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            contactPerson: e.target.value,
                          })
                        }
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="联系人姓名"
                      />
                    </div>

                    {/* 手机号 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        手机号
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={e =>
                          setFormData({ ...formData, phoneNumber: e.target.value })
                        }
                        pattern="^1[3-9]\d{9}$"
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="11位手机号"
                      />
                    </div>

                    {/* 微信号 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        微信号
                      </label>
                      <input
                        type="text"
                        value={formData.wechatId}
                        onChange={e =>
                          setFormData({ ...formData, wechatId: e.target.value })
                        }
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="商务微信号"
                      />
                    </div>

                    {/* 邮箱 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        邮箱
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* 备注信息 */}
                <div className="border rounded-lg bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b">
                    其他信息
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      备注说明
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={4}
                      className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="可以记录机构特点、合作方式、特殊要求等信息"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* 底部按钮区 */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {editingAgency ? '更新后将立即生效' : '创建后可在列表中查看和管理'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        保存中...
                      </span>
                    ) : (
                      editingAgency ? '更新' : '创建'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
