/**
 * 机构管理页面
 */

import { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger';
import {
  PlusIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import type { Agency, AgencyFormData, AgencyType, AgencyStatus } from '../../../types/agency';
import { AGENCY_TYPE_NAMES, AGENCY_STATUS_NAMES, AGENCY_INDIVIDUAL_ID } from '../../../types/agency';
import type { Platform } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import {
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
} from '../../../api/agency';
import { getTalents } from '../../../api/talent';
import { AgencyRebateModal } from '../../../components/AgencyRebateModal_v2';
import { AgencyFormModal } from '../../../components/AgencyFormModal';
import { AgencyDeleteModal } from '../../../components/AgencyDeleteModal';
import { Toast } from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';

export function AgenciesList() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [isRebateModalOpen, setIsRebateModalOpen] = useState(false);
  const [rebateAgency, setRebateAgency] = useState<Agency | null>(null);
  const [talentCounts, setTalentCounts] = useState<Record<string, number>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const { toast, hideToast, success, error: showError, warning } = useToast();

  // 添加平台选择器的state，默认选择抖音
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');

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
        // 加载每个机构的达人数量
        await loadTalentCounts(response.data);
      } else {
        setError(response.message || '加载机构列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载机构列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载各机构的达人数量
  const loadTalentCounts = async (agenciesList: Agency[]) => {
    const counts: Record<string, number> = {};

    try {
      // 为每个机构获取达人数量
      await Promise.all(
        agenciesList.map(async (agency) => {
          try {
            const response = await getTalents({ agencyId: agency.id, view: 'simple' });
            if (response.success && response.data) {
              counts[agency.id] = response.count || response.data.length;
            } else {
              counts[agency.id] = 0;
            }
          } catch (err) {
            logger.error(`Failed to load talent count for agency ${agency.id}:`, err);
            counts[agency.id] = 0;
          }
        })
      );

      setTalentCounts(counts);
    } catch (err) {
      logger.error('Failed to load talent counts:', err);
    }
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingAgency(null);
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      warning('野生达人是系统预设机构，不可编辑');
      return;
    }
    setEditingAgency(agency);
    setIsModalOpen(true);
  };

  // 打开返点管理弹窗
  const handleRebateManagement = (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      warning('野生达人是系统预设机构，不需要设置返点');
      return;
    }
    setRebateAgency(agency);
    setIsRebateModalOpen(true);
  };

  // 删除机构
  const handleDelete = async (agency: Agency) => {
    if (agency.id === AGENCY_INDIVIDUAL_ID) {
      warning('野生达人是系统预设机构，不可删除');
      return;
    }
    setAgencyToDelete(agency);
    setShowDeleteConfirm(true);
  };

  // 确认删除机构
  const confirmDelete = async (agencyId: string) => {
    const response = await deleteAgency(agencyId);
    if (!response.success) {
      throw new Error(response.message || '删除失败');
    }
    // 重新加载列表
    await loadAgencies();
  };

  // 保存机构
  const handleSave = async (data: AgencyFormData) => {
    // 验证手机号格式（如果填写了）
    if (data.phoneNumber && !/^1[3-9]\d{9}$/.test(data.phoneNumber)) {
      throw new Error('请输入正确的手机号格式');
    }

    let response;

    if (editingAgency) {
      // 编辑
      response = await updateAgency(editingAgency.id, data);
    } else {
      // 新增
      response = await createAgency(data);
    }

    if (!response.success) {
      throw new Error(response.message || '保存失败');
    }

    // 重新加载列表
    await loadAgencies();
  };

  // 获取达人数
  const getTalentCount = (agencyId: string) => {
    return talentCounts[agencyId] || 0;
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

      {/* 平台选择器 */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">选择平台查看返点：</span>
          <div className="flex gap-2">
            {(Object.keys(PLATFORM_NAMES) as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlatform === platform
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {PLATFORM_NAMES[platform]}
              </button>
            ))}
          </div>
        </div>
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
                  {PLATFORM_NAMES[selectedPlatform]}返点
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
                      {agency.rebateConfig?.platforms?.[selectedPlatform]?.baseRebate !== undefined ? (
                        <span className="font-medium text-green-600">
                          {agency.rebateConfig.platforms[selectedPlatform].baseRebate}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">未配置</span>
                      )}
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
                      <div className="flex flex-wrap gap-2">
                        {/* 返点管理按钮 */}
                        {agency.id !== AGENCY_INDIVIDUAL_ID && (
                          <button
                            onClick={() => handleRebateManagement(agency)}
                            className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 transition-colors"
                          >
                            返点
                          </button>
                        )}
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => handleEdit(agency)}
                          className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          编辑
                        </button>
                        {/* 删除按钮 */}
                        {agency.id !== AGENCY_INDIVIDUAL_ID && (
                          <button
                            onClick={() => handleDelete(agency)}
                            className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
                          >
                            删除
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

      {/* 新增/编辑机构弹窗 */}
      <AgencyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agency={editingAgency}
        onSave={handleSave}
      />

      {/* 返点管理弹窗 */}
      <AgencyRebateModal
        isOpen={isRebateModalOpen}
        onClose={() => setIsRebateModalOpen(false)}
        agency={rebateAgency}
        onSuccess={() => {
          loadAgencies();
        }}
      />

      {/* 删除确认弹窗 */}
      <AgencyDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAgencyToDelete(null);
        }}
        agency={agencyToDelete}
        onConfirm={confirmDelete}
        talentCount={agencyToDelete ? getTalentCount(agencyToDelete.id) : 0}
      />

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
