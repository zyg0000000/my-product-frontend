/**
 * 达人基础信息页
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTalents, updateTalent, deleteTalent, deleteTalentAll } from '../../../api/talent';
import type { Talent, Platform, PriceRecord } from '../../../types/talent';
import { PLATFORM_NAMES, PLATFORM_PRICE_TYPES } from '../../../types/talent';
import {
  formatPrice,
  formatRebate,
  getLatestPricesMap,
} from '../../../utils/formatters';
import { PriceModal } from '../../../components/PriceModal';
import { EditTalentModal } from '../../../components/EditTalentModal';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal';
import { RebateManagementModal } from '../../../components/RebateManagementModal';
import { Pagination } from '../../../components/Pagination';
import { getAgencies } from '../../../api/agency';
import type { Agency } from '../../../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../../types/agency';

export function BasicInfo() {
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [talents, setTalents] = useState<Talent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [rebateModalOpen, setRebateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15; // 每页显示15个达人

  // 加载达人列表
  useEffect(() => {
    setCurrentPage(1); // 切换平台时重置到第一页
    loadTalents();
  }, [selectedPlatform]);

  // 加载机构列表
  useEffect(() => {
    loadAgencies();
  }, []);

  const loadTalents = async () => {
    try {
      setLoading(true);
      const response = await getTalents({ platform: selectedPlatform });
      console.log('📊 API Response:', response); // 调试日志
      if (response.success && response.data) {
        // 确保 data 总是数组
        const talentsData = Array.isArray(response.data)
          ? response.data
          : [response.data];
        console.log('✅ Talents Data:', talentsData); // 调试日志
        // 检查 currentRebate 字段
        talentsData.forEach((talent, index) => {
          console.log(`👤 Talent ${index + 1} - ${talent.name}:`, {
            currentRebate: talent.currentRebate
          });
        });
        setTalents(talentsData);
      } else {
        console.warn('⚠️ No data in response:', response); // 调试日志
        setTalents([]);
      }
    } catch (error) {
      console.error('❌ 加载达人列表失败:', error);
      setTalents([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载机构列表
  const loadAgencies = async () => {
    try {
      const response = await getAgencies();
      if (response.success && response.data) {
        setAgencies(response.data);
      }
    } catch (error) {
      console.error('加载机构列表失败:', error);
    }
  };

  // 平台Tab配置
  const platforms: Platform[] = [
    'douyin',
    'xiaohongshu',
    'bilibili',
    'kuaishou',
  ];

  // 获取当前平台的价格类型配置
  const priceTypes = PLATFORM_PRICE_TYPES[selectedPlatform];

  // 从所有达人中提取唯一的 talentType 值
  const getUniqueTalentTypes = (): string[] => {
    const allTypes = new Set<string>();
    talents.forEach(talent => {
      if (talent.talentType && Array.isArray(talent.talentType)) {
        talent.talentType.forEach(type => allTypes.add(type));
      }
    });
    return Array.from(allTypes).sort();
  };

  // 根据机构ID获取机构名称
  const getAgencyName = (agencyId: string | undefined): string => {
    if (!agencyId || agencyId === AGENCY_INDIVIDUAL_ID) {
      return '野生达人';
    }
    const agency = agencies.find(a => a.id === agencyId);
    return agency?.name || agencyId;
  };

  // 打开价格管理弹窗
  const handleOpenPriceModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setPriceModalOpen(true);
  };

  // 关闭价格管理弹窗
  const handleClosePriceModal = () => {
    setPriceModalOpen(false);
    setSelectedTalent(null);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setEditModalOpen(true);
  };

  // 关闭编辑弹窗
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedTalent(null);
  };

  // 打开返点管理弹窗
  const handleOpenRebateModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setRebateModalOpen(true);
  };

  // 关闭返点管理弹窗
  const handleCloseRebateModal = () => {
    setRebateModalOpen(false);
    setSelectedTalent(null);
  };

  // 打开删除确认弹窗
  const handleOpenDeleteModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setDeleteModalOpen(true);
  };

  // 关闭删除确认弹窗
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedTalent(null);
  };

  // 保存价格
  const handleSavePrice = async (talentId: string, prices: PriceRecord[]) => {
    if (!selectedTalent) return;

    try {
      // 调用 API 更新价格
      const response = await updateTalent({
        oneId: talentId,
        platform: selectedTalent.platform,
        prices: prices,
      });

      if (!response.success) {
        throw new Error(response.error || response.message || '保存失败');
      }

      // 更新本地状态
      setTalents((prevTalents) =>
        prevTalents.map((t) =>
          t.oneId === talentId ? { ...t, prices } : t
        )
      );

      // 同步更新 selectedTalent，使弹窗中的价格实时刷新
      setSelectedTalent((prev) =>
        prev ? { ...prev, prices } : prev
      );

      alert('价格保存成功');
    } catch (error) {
      console.error('保存价格失败:', error);
      const errorMessage = error instanceof Error ? error.message : '保存价格失败';
      alert(errorMessage);
      throw error;
    }
  };

  // 保存编辑
  const handleSaveEdit = async (oneId: string, platform: Platform, data: Partial<Talent>) => {
    try {
      // 调用 API 更新达人信息
      const response = await updateTalent({
        oneId,
        platform,
        ...data,
      });

      if (!response.success) {
        throw new Error(response.error || response.message || '保存失败');
      }

      // 更新本地状态
      setTalents((prevTalents) =>
        prevTalents.map((t) =>
          t.oneId === oneId && t.platform === platform ? { ...t, ...data } : t
        )
      );

      alert('达人信息更新成功');

      // 重新加载列表以确保数据同步
      await loadTalents();
    } catch (error) {
      console.error('保存达人信息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '保存达人信息失败';
      alert(errorMessage);
      throw error;
    }
  };

  // 确认删除
  const handleConfirmDelete = async (oneId: string, platform: Platform, deleteAll: boolean) => {
    try {
      let response;
      if (deleteAll) {
        // 删除所有平台
        response = await deleteTalentAll(oneId);
      } else {
        // 仅删除当前平台
        response = await deleteTalent(oneId, platform);
      }

      if (!response.success) {
        throw new Error(response.error || response.message || '删除失败');
      }

      alert(deleteAll ? '已删除该达人的所有平台数据' : `已删除该达人的${PLATFORM_NAMES[platform]}平台数据`);

      // 重新加载列表
      await loadTalents();
    } catch (error) {
      console.error('删除达人失败:', error);
      const errorMessage = error instanceof Error ? error.message : '删除达人失败';
      alert(errorMessage);
      throw error;
    }
  };

  // 获取平台达人的外链（星图、蒲公英等）
  const getPlatformLink = (talent: Talent): string | null => {
    if (talent.platform === 'douyin') {
      // 抖音：使用星图ID或platformAccountId
      const xingtuId = talent.platformSpecific?.xingtuId || talent.platformAccountId;
      return `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${xingtuId}`;
    }
    // 其他平台后续添加
    return null;
  };

  // 计算分页数据
  const totalRecords = talents.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTalents = talents.slice(startIndex, endIndex);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">基础信息</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理多平台达人信息、价格和返点
          </p>
        </div>
        <button
          onClick={() => navigate('/talents/create')}
          className="btn btn-primary"
        >
          + 新增达人
        </button>
      </div>

      {/* 平台Tab切换 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                selectedPlatform === platform
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {PLATFORM_NAMES[platform]}
            </button>
          ))}
        </nav>
      </div>

      {/* 达人列表 */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-12 text-center text-gray-500">加载中...</div>
        ) : talents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            暂无{PLATFORM_NAMES[selectedPlatform]}平台的达人数据
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    达人名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    商业属性
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    当月价格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    返点
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
                {paginatedTalents.map(talent => {
                  const latestPrices = getLatestPricesMap(talent.prices);
                  const platformLink = getPlatformLink(talent);

                  return (
                    <tr
                      key={`${talent.oneId}-${talent.platform}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        {platformLink ? (
                          <a
                            href={platformLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary-600 hover:text-primary-900 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {talent.name}
                          </a>
                        ) : (
                          <div className="font-medium text-gray-900">
                            {talent.name}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                          {getAgencyName(talent.agencyId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1.5">
                          {priceTypes.map(priceType => {
                            const price = latestPrices[priceType.key];
                            return (
                              <div key={priceType.key} className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold w-16"
                                  style={{
                                    backgroundColor: priceType.bgColor,
                                    color: priceType.textColor,
                                  }}
                                >
                                  {priceType.label}
                                </span>
                                <span className={price ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                  {price ? formatPrice(price) : 'N/A'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {talent.currentRebate?.rate !== undefined ? formatRebate(talent.currentRebate.rate) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            talent.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : talent.status === 'inactive'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {talent.status === 'active'
                            ? '活跃'
                            : talent.status === 'inactive'
                              ? '暂停'
                              : '归档'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/talents/${talent.oneId}/${talent.platform}`);
                            }}
                            className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-200 transition-colors"
                          >
                            详情
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPriceModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 hover:bg-purple-200 transition-colors"
                          >
                            价格
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRebateModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 transition-colors"
                          >
                            返点
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
                          >
                            删除
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: 打开合作历史弹窗
                              console.log('查看历史:', talent.oneId);
                            }}
                            className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200 transition-colors"
                          >
                            历史
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页组件 */}
          {totalPages > 0 && (
            <div className="mt-4 border-t pt-4 px-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            </div>
          )}
          </>
        )}
      </div>

      {/* 价格管理弹窗 */}
      <PriceModal
        isOpen={priceModalOpen}
        onClose={handleClosePriceModal}
        talent={selectedTalent}
        onSave={handleSavePrice}
      />

      {/* 编辑达人弹窗 */}
      <EditTalentModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        talent={selectedTalent}
        onSave={handleSaveEdit}
        availableTags={getUniqueTalentTypes()}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        talent={selectedTalent}
        onConfirm={handleConfirmDelete}
      />

      {/* 返点管理弹窗 */}
      {selectedTalent && (
        <RebateManagementModal
          isOpen={rebateModalOpen}
          onClose={handleCloseRebateModal}
          talent={selectedTalent}
        />
      )}
    </div>
  );
}
