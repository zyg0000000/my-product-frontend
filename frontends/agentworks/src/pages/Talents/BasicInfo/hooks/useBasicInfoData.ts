/**
 * 达人基础信息数据管理 Hook
 * 负责数据加载、筛选、分页等逻辑
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { logger } from '../../../../utils/logger';
import { getTalents } from '../../../../api/talent';
import { getAgencies } from '../../../../api/agency';
import { customerApi } from '../../../../services/customerApi';
import type { Talent, Platform } from '../../../../types/talent';
import type { Agency } from '../../../../types/agency';
import type { Customer } from '../../../../types/customer';
import type { FilterState } from '../components/TalentFilterPanel';

interface UseBasicInfoDataProps {
  selectedPlatform: Platform;
  configLoading: boolean;
  platformsLength: number;
  getPlatformPriceTypes: (platform: Platform) => { key: string; label: string }[];
}

interface UseBasicInfoDataReturn {
  // 数据
  talents: Talent[];
  agencies: Agency[];
  customers: Customer[];
  totalTalents: number;
  loading: boolean;

  // 分页
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;

  // 筛选
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  handleFilterChange: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;

  // 价格档位
  selectedPriceTier: string | null;
  setSelectedPriceTier: (tier: string | null) => void;

  // 批量选择
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;

  // 方法
  loadTalents: () => Promise<void>;
  getUniqueTalentTiers: () => string[];
  getUniqueTalentTypes: () => string[];
}

const PAGE_SIZE = 15;

const initialFilterState: FilterState = {
  searchTerm: '',
  selectedTiers: [],
  selectedTags: [],
  rebateMin: '',
  rebateMax: '',
  priceMin: '',
  priceMax: '',
  selectedCustomerId: null,
};

export function useBasicInfoData({
  selectedPlatform,
  configLoading,
  platformsLength,
  getPlatformPriceTypes,
}: UseBasicInfoDataProps): UseBasicInfoDataReturn {
  // 数据状态
  const [talents, setTalents] = useState<Talent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalTalents, setTotalTalents] = useState(0);
  const [loading, setLoading] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选状态
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);

  // 价格档位状态
  const [selectedPriceTier, setSelectedPriceTier] = useState<string | null>(() => {
    const platformPriceTypes = getPlatformPriceTypes(selectedPlatform);
    return platformPriceTypes && platformPriceTypes.length > 0
      ? platformPriceTypes[0].key
      : null;
  });

  // 批量选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 用于追踪筛选状态的 ref（避免 useCallback 依赖变化导致无限循环）
  const filterStateRef = useRef(filterState);
  filterStateRef.current = filterState;

  // 切换平台时更新状态
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowKeys([]);
    setFilterState(prev => ({ ...prev, selectedCustomerId: null }));
    // 直接计算默认价格档位
    const platformPriceTypes = getPlatformPriceTypes(selectedPlatform);
    const defaultTier =
      platformPriceTypes && platformPriceTypes.length > 0
        ? platformPriceTypes[0].key
        : null;
    setSelectedPriceTier(defaultTier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform]);

  // 加载达人数据
  const loadTalents = useCallback(async () => {
    if (configLoading || platformsLength === 0) {
      return;
    }

    try {
      setLoading(true);

      const params: {
        platform: Platform;
        page: number;
        limit: number;
        sortBy: 'name' | 'updatedAt' | 'createdAt' | 'fansCount';
        order: 'asc' | 'desc';
        searchTerm?: string;
        tiers?: string[];
        tags?: string[];
        rebateMin?: number;
        rebateMax?: number;
        priceMin?: number;
        priceMax?: number;
        customerId?: string;
      } = {
        platform: selectedPlatform,
        page: currentPage,
        limit: PAGE_SIZE,
        sortBy: 'updatedAt',
        order: 'desc',
      };

      // 使用 ref 获取最新的 filterState
      const {
        searchTerm,
        selectedTiers,
        selectedTags,
        rebateMin,
        rebateMax,
        priceMin,
        priceMax,
        selectedCustomerId,
      } = filterStateRef.current;

      if (searchTerm) params.searchTerm = searchTerm;
      if (selectedTiers.length > 0) params.tiers = selectedTiers;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (rebateMin) params.rebateMin = parseFloat(rebateMin);
      if (rebateMax) params.rebateMax = parseFloat(rebateMax);
      if (priceMin) params.priceMin = parseFloat(priceMin);
      if (priceMax) params.priceMax = parseFloat(priceMax);
      if (selectedCustomerId) params.customerId = selectedCustomerId;

      const response = await getTalents(params);

      if (response.success && response.data) {
        const talentsData = Array.isArray(response.data)
          ? response.data
          : [response.data];

        setTalents(talentsData);

        if (response.total !== undefined) {
          setTotalTalents(response.total);
        } else if (response.count !== undefined) {
          setTotalTalents(response.count);
        }
      } else {
        setTalents([]);
        setTotalTalents(0);
      }
    } catch (err) {
      logger.error('加载达人列表失败:', err);
      message.error('加载达人列表失败');
      setTalents([]);
      setTotalTalents(0);
    } finally {
      setLoading(false);
    }
  }, [configLoading, platformsLength, selectedPlatform, currentPage]);

  // 加载达人数据（仅在平台、页码变化时自动加载）
  useEffect(() => {
    loadTalents();
  }, [loadTalents]);

  // 加载机构和客户列表
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const response = await getAgencies();
        if (response.success && response.data) {
          setAgencies(response.data);
        }
      } catch (error) {
        logger.error('加载机构列表失败:', error);
      }
    };

    const loadCustomers = async () => {
      try {
        const response = await customerApi.getCustomers({
          status: 'active',
          pageSize: 100,
        });
        if (response.success && response.data) {
          setCustomers(response.data.customers);
        }
      } catch (error) {
        logger.error('加载客户列表失败:', error);
      }
    };

    loadAgencies();
    loadCustomers();
  }, []);

  // 获取唯一的达人层级
  const getUniqueTalentTiers = useCallback((): string[] => {
    const tiers = new Set<string>();
    talents.forEach(talent => {
      if (talent.talentTier) {
        tiers.add(talent.talentTier);
      }
    });
    return Array.from(tiers).sort();
  }, [talents]);

  // 获取唯一的内容标签
  const getUniqueTalentTypes = useCallback((): string[] => {
    const types = new Set<string>();
    talents.forEach(talent => {
      if (talent.talentType && Array.isArray(talent.talentType)) {
        talent.talentType.forEach(type => types.add(type));
      }
    });
    return Array.from(types).sort();
  }, [talents]);

  // 处理筛选状态变更
  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
      setFilterState(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // 重置筛选条件
  const handleResetFilters = useCallback(() => {
    setFilterState(initialFilterState);
    setCurrentPage(1);
  }, []);

  // 执行搜索
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    loadTalents();
  }, [loadTalents]);

  return {
    // 数据
    talents,
    agencies,
    customers,
    totalTalents,
    loading,

    // 分页
    currentPage,
    pageSize: PAGE_SIZE,
    setCurrentPage,

    // 筛选
    filterState,
    setFilterState,
    handleFilterChange,
    handleResetFilters,
    handleSearch,

    // 价格档位
    selectedPriceTier,
    setSelectedPriceTier,

    // 批量选择
    selectedRowKeys,
    setSelectedRowKeys,

    // 方法
    loadTalents,
    getUniqueTalentTiers,
    getUniqueTalentTypes,
  };
}
