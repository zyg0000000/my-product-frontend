/**
 * 达人基础信息页
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTalents, updateTalent, deleteTalent, deleteTalentAll } from '../../../api/talent';
import type { Talent, Platform, PriceRecord, PriceType } from '../../../types/talent';
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
import { Toast } from '../../../components/Toast';
import { useToast } from '../../../hooks/useToast';
import { getAgencies } from '../../../api/agency';
import type { Agency } from '../../../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../../types/agency';

export function BasicInfo() {
  const navigate = useNavigate();
  const location = useLocation();

  // 从路由状态获取平台，如果没有则默认为 'douyin'
  const initialPlatform = (location.state?.selectedPlatform as Platform) || 'douyin';
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTalents, setTotalTalents] = useState(0); // 总记录数（后端返回）
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [rebateModalOpen, setRebateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15; // 每页显示15个达人

  // 获取平台的默认价格档位
  const getDefaultPriceTier = (platform: Platform): string => {
    const platformPriceTypes = PLATFORM_PRICE_TYPES[platform];
    if (platformPriceTypes && platformPriceTypes.length > 0) {
      // 小红书默认显示图文笔记
      if (platform === 'xiaohongshu') {
        return 'image';
      }
      // 其他平台返回第一个价格类型
      return platformPriceTypes[0].key;
    }
    return 'video_60plus'; // 兜底默认值
  };

  // 价格档位选择状态 (持久化到 localStorage，按平台存储)
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>(() => {
    const saved = localStorage.getItem(`selectedPriceTier_${selectedPlatform}`);
    return saved || getDefaultPriceTier(selectedPlatform);
  });

  // 当档位变化时保存到 localStorage
  const handlePriceTierChange = (tier: string) => {
    setSelectedPriceTier(tier);
    localStorage.setItem(`selectedPriceTier_${selectedPlatform}`, tier);
  };

  // 操作菜单弹窗状态
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuTalent, setActionMenuTalent] = useState<Talent | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rebateMin, setRebateMin] = useState<string>('');
  const [rebateMax, setRebateMax] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [filterPriceTiers, setFilterPriceTiers] = useState<string[]>([]); // 筛选用的价格档位（多选）

  // Toast 通知
  const { toast, hideToast, success, error } = useToast();

  // 组件挂载后清除路由状态
  useEffect(() => {
    // 清除location state，防止刷新页面时还保留
    if (location.state?.selectedPlatform) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  // 加载达人列表（切换平台时）
  useEffect(() => {
    setCurrentPage(1); // 切换平台时重置到第一页
    // 切换平台时更新价格档位
    const saved = localStorage.getItem(`selectedPriceTier_${selectedPlatform}`);
    setSelectedPriceTier(saved || getDefaultPriceTier(selectedPlatform));
  }, [selectedPlatform]);

  // 筛选条件或分页变化时重新加载
  useEffect(() => {
    loadTalents();
  }, [
    selectedPlatform,
    currentPage,
    searchTerm,
    selectedTiers,
    selectedTags,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
    filterPriceTiers
  ]);

  // 加载机构列表
  useEffect(() => {
    loadAgencies();
  }, []);

  const loadTalents = async () => {
    try {
      setLoading(true);

      // 构建查询参数（使用后端分页和筛选）
      const params: any = {
        platform: selectedPlatform,
        page: currentPage,
        limit: pageSize,
        sortBy: 'updatedAt',
        order: 'desc'
      };

      // 添加搜索条件
      if (searchTerm) params.searchTerm = searchTerm;

      // 添加筛选条件
      if (selectedTiers.length > 0) params.tiers = selectedTiers;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (rebateMin) params.rebateMin = parseFloat(rebateMin);
      if (rebateMax) params.rebateMax = parseFloat(rebateMax);
      if (priceMin) params.priceMin = parseFloat(priceMin);
      if (priceMax) params.priceMax = parseFloat(priceMax);
      if (filterPriceTiers.length > 0) params.priceTiers = filterPriceTiers;

      const response = await getTalents(params);

      if (response.success && response.data) {
        // 确保 data 总是数组
        const talentsData = Array.isArray(response.data)
          ? response.data
          : [response.data];

        setTalents(talentsData);

        // 更新总记录数（用于分页）
        if (response.total !== undefined) {
          setTotalTalents(response.total);
        } else if (response.count !== undefined) {
          // 兼容旧版本返回格式
          setTotalTalents(response.count);
        }
      } else {
        setTalents([]);
        setTotalTalents(0);
      }
    } catch (err) {
      console.error('加载达人列表失败:', err);
      error('加载达人列表失败');
      setTalents([]);
      setTotalTalents(0);
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

  // 从所有达人中提取唯一的 talentTier 值
  const getUniqueTalentTiers = (): string[] => {
    const allTiers = new Set<string>();
    talents.forEach(talent => {
      if (talent.talentTier) {
        allTiers.add(talent.talentTier);
      }
    });
    return Array.from(allTiers).sort();
  };

  // 重置所有筛选条件
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTiers([]);
    setSelectedTags([]);
    setRebateMin('');
    setRebateMax('');
    setPriceMin('');
    setPriceMax('');
    setFilterPriceTiers([]);
    setCurrentPage(1);
  };

  // 处理层级复选框变化
  const handleTierChange = (tier: string) => {
    setSelectedTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
    setCurrentPage(1); // 重置到第一页（useEffect 会自动触发 loadTalents）
  };

  // 处理标签复选框变化
  const handleTagChange = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1); // 重置到第一页（useEffect 会自动触发 loadTalents）
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

  // 打开操作菜单弹窗
  const handleOpenActionMenu = (talent: Talent, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX - 150, // 向左偏移150px，使菜单靠右对齐
    });
    setActionMenuTalent(talent);
    setActionMenuOpen(true);
  };

  // 关闭操作菜单弹窗
  const handleCloseActionMenu = () => {
    setActionMenuOpen(false);
    setActionMenuTalent(null);
    setMenuPosition(null);
  };

  // 根据字符串生成颜色 (参考 byteproject)
  const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 85%)`; // 使用柔和的颜色
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

      success('价格保存成功');
    } catch (err) {
      console.error('保存价格失败:', err);
      const errorMessage = err instanceof Error ? err.message : '保存价格失败';
      error(errorMessage);
      throw err;
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

      success('达人信息更新成功');

      // 重新加载列表以确保数据同步
      await loadTalents();
    } catch (err) {
      console.error('保存达人信息失败:', err);
      const errorMessage = err instanceof Error ? err.message : '保存达人信息失败';
      error(errorMessage);
      throw err;
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

      success(deleteAll ? '已删除该达人的所有平台数据' : `已删除该达人的${PLATFORM_NAMES[platform]}平台数据`);

      // 重新加载列表
      await loadTalents();
    } catch (err) {
      console.error('删除达人失败:', err);
      const errorMessage = err instanceof Error ? err.message : '删除达人失败';
      error(errorMessage);
      throw err;
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

  // [v3.3 优化] 移除前端筛选和分页逻辑
  // 筛选和分页现在由后端 getTalents v3.3 处理
  // 前端直接使用后端返回的数据

  // 计算分页数据（使用后端返回的总数）
  const totalRecords = totalTalents;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedTalents = talents; // 直接使用后端返回的分页数据

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

      {/* 搜索和筛选区域 */}
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        {/* 基础搜索框 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="search"
              placeholder="按达人名称或OneID搜索..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 搜索时重置到第一页
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium transition-colors whitespace-nowrap"
          >
            {showAdvancedFilters ? '收起筛选' : '高级筛选'}
          </button>
        </div>

        {/* 高级筛选面板 */}
        {showAdvancedFilters && (
          <div className="border rounded-md p-4 bg-gray-50">
            {/* 检查是否有任何可用的筛选选项 */}
            {getUniqueTalentTiers().length === 0 &&
             getUniqueTalentTypes().length === 0 &&
             !talents.some(t => t.currentRebate?.rate) &&
             !talents.some(t => t.prices && t.prices.length > 0) ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">暂无可用的筛选条件</p>
                <p className="text-xs mt-1">当前平台的达人数据尚未完善</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 达人层级筛选 - 只在有数据时显示 */}
              {getUniqueTalentTiers().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    达人层级
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                    {getUniqueTalentTiers().map(tier => (
                      <label key={tier} className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTiers.includes(tier)}
                          onChange={() => handleTierChange(tier)}
                          className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{tier}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 内容标签筛选 - 只在有数据时显示 */}
              {getUniqueTalentTypes().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    内容标签
                    {getUniqueTalentTypes().length > 10 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({getUniqueTalentTypes().length} 个)
                      </span>
                    )}
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                    {getUniqueTalentTypes().map(tag => (
                      <label key={tag} className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => handleTagChange(tag)}
                          className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 truncate" title={tag}>
                          {tag}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      已选: {selectedTags.length} 个标签
                    </div>
                  )}
                </div>
              )}

              {/* 返点率区间筛选 - 只在有返点数据时显示 */}
              {talents.some(t => t.currentRebate?.rate) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    返点率区间 (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="最低"
                      value={rebateMin}
                      onChange={(e) => {
                        setRebateMin(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      placeholder="最高"
                      value={rebateMax}
                      onChange={(e) => {
                        setRebateMax(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* 价格区间筛选 - 只在有价格数据时显示 */}
              {talents.some(t => t.prices && t.prices.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    价格筛选
                  </label>
                  <div className="space-y-3">
                    {/* 价格档位勾选框 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        选择价格档位（可多选）
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md">
                        {priceTypes.map(type => (
                          <label key={type.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filterPriceTiers.includes(type.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilterPriceTiers([...filterPriceTiers, type.key]);
                                } else {
                                  setFilterPriceTiers(filterPriceTiers.filter(t => t !== type.key));
                                }
                                setCurrentPage(1);
                              }}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 价格区间输入 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        价格区间（元）
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="最低"
                          value={priceMin}
                          onChange={(e) => {
                            setPriceMin(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          placeholder="最高"
                          value={priceMax}
                          onChange={(e) => {
                            setPriceMax(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 筛选操作按钮 */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
              >
                重置筛选
              </button>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
              >
                应用筛选
              </button>
            </div>
              </>
            )}
          </div>
        )}

        {/* 筛选结果统计 */}
        {(searchTerm || selectedTiers.length > 0 || selectedTags.length > 0 || rebateMin || rebateMax || priceMin || priceMax || filterPriceTiers.length > 0) && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-4 py-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                找到 {totalRecords} 个符合条件的达人（第 {currentPage} 页，共 {totalPages} 页）
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              清除所有筛选
            </button>
          </div>
        )}
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
                    达人层级
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    内容标签
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>当月价格</span>
                      <select
                        value={selectedPriceTier}
                        onChange={(e) => handlePriceTierChange(e.target.value)}
                        className="text-xs font-normal border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-2 bg-white"
                      >
                        {priceTypes.map(type => (
                          <option key={type.key} value={type.key}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
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
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
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
                      {/* 达人层级列 */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {talent.talentTier ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            talent.talentTier === '头部'
                              ? 'bg-red-100 text-red-800'
                              : talent.talentTier === '腰部'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {talent.talentTier}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      {/* 内容标签列 */}
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {talent.talentType && talent.talentType.length > 0 ? (
                            <>
                              {talent.talentType.slice(0, 2).map((type, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: stringToColor(type),
                                    color: '#374151'
                                  }}
                                >
                                  {type}
                                </span>
                              ))}
                              {talent.talentType.length > 2 && (
                                <span className="text-xs text-gray-500 self-center">
                                  +{talent.talentType.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {(() => {
                          const price = latestPrices[selectedPriceTier as PriceType];
                          return (
                            <span className={price ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                              {price ? formatPrice(price) : 'N/A'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={talent.currentRebate?.rate !== undefined ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                          {talent.currentRebate?.rate !== undefined ? formatRebate(talent.currentRebate.rate) : '-'}
                        </span>
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
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {/* 主要操作按钮: 价格、返点、编辑 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPriceModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-200 transition-colors"
                          >
                            价格
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRebateModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-200 transition-colors"
                          >
                            返点
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(talent);
                            }}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors"
                          >
                            编辑
                          </button>

                          {/* 更多操作: 三点图标 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenActionMenu(talent, e);
                            }}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            aria-label="更多操作"
                          >
                            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
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
            <div className="border-t bg-gray-50 px-6 py-4">
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

      {/* 操作菜单下拉框 */}
      {actionMenuOpen && actionMenuTalent && menuPosition && (
        <>
          {/* 透明遮罩层，点击关闭菜单 */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseActionMenu}
          />
          {/* 下拉菜单 */}
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                navigate(`/talents/${actionMenuTalent.oneId}/${actionMenuTalent.platform}`);
                handleCloseActionMenu();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              查看详情
            </button>
            <button
              onClick={() => {
                // TODO: 打开合作历史弹窗
                handleCloseActionMenu();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              合作历史
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                handleOpenDeleteModal(actionMenuTalent);
                handleCloseActionMenu();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除达人
            </button>
          </div>
        </>
      )}

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
