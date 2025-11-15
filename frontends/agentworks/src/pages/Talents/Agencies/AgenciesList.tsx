/**
 * 机构管理页面
 */

import { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import type { Agency, AgencyFormData, AgencyType } from '../../../types/agency';
import { AGENCY_TYPE_NAMES, AGENCY_INDIVIDUAL_ID } from '../../../types/agency';

export function AgenciesList() {
  const [agencies, setAgencies] = useState<Agency[]>([
    {
      id: AGENCY_INDIVIDUAL_ID,
      name: '野生达人',
      type: 'individual',
      baseRebate: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState<AgencyFormData>({
    name: '',
    type: 'agency',
    baseRebate: 10,
    contactPerson: '',
    contactPhone: '',
    description: '',
  });

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAgency(null);
    setFormData({
      name: '',
      type: 'agency',
      baseRebate: 10,
      contactPerson: '',
      contactPhone: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      alert('野生达人是系统预设机构，不可编辑');
      return;
    }
    setEditingAgency(agency);
    setFormData({
      name: agency.name,
      type: agency.type,
      baseRebate: agency.baseRebate,
      contactPerson: agency.contactPerson || '',
      contactPhone: agency.contactPhone || '',
      description: agency.description || '',
    });
    setIsModalOpen(true);
  };

  // 删除机构
  const handleDelete = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      alert('野生达人是系统预设机构，不可删除');
      return;
    }
    if (confirm(`确定要删除机构「${agency.name}」吗？`)) {
      setAgencies(agencies.filter(a => a.id !== agency.id));
    }
  };

  // 保存机构
  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('请输入机构名称');
      return;
    }
    if (formData.baseRebate < 0 || formData.baseRebate > 100) {
      alert('返点比例应在 0-100 之间');
      return;
    }

    if (editingAgency) {
      // 编辑
      setAgencies(
        agencies.map(a =>
          a.id === editingAgency.id
            ? {
                ...a,
                ...formData,
                updatedAt: new Date(),
              }
            : a
        )
      );
    } else {
      // 新增
      const newAgency: Agency = {
        id: `agency_${Date.now()}`,
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAgencies([...agencies, newAgency]);
    }

    setIsModalOpen(false);
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

      {/* 机构列表 */}
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
                基础返点
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                达人数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                联系人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {agencies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                        <div className="font-medium text-gray-900">{agency.name}</div>
                        {agency.id === AGENCY_INDIVIDUAL_ID && (
                          <div className="text-xs text-gray-500">系统预设</div>
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
                    {agency.baseRebate}%
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {getTalentCount(agency.id)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div>{agency.contactPerson || '-'}</div>
                    {agency.contactPhone && (
                      <div className="text-xs text-gray-400">{agency.contactPhone}</div>
                    )}
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

      {/* 新增/编辑弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            ></div>

            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAgency ? '编辑机构' : '新增机构'}
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    机构名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="如：无忧传媒"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    机构类型
                  </label>
                  <select
                    value={formData.type}
                    onChange={e =>
                      setFormData({ ...formData, type: e.target.value as AgencyType })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="agency">机构</option>
                    <option value="individual">个人</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    基础返点（%） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.baseRebate}
                    onChange={e =>
                      setFormData({ ...formData, baseRebate: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">联系人</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">联系电话</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={e =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">备注</label>
                  <textarea
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
