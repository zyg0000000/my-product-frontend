/**
 * 达人基础信息数据管理 Hook
 * 负责数据加载、筛选、分页等逻辑
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { logger } from '../../../../utils/logger';
import { getTalents, getTalentFilterOptions } from '../../../../api/talent';
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
  getPlatformPriceTypes: (
    platform: Platform
  ) => { key: string; label: string }[];
}

interface UseBasicInfoDataReturn {
  // 数据
  talents: Talent[];
  agencies: Agency[];
  customers: Customer[];
  totalTalents: number;
  loading: boolean;
  availableTags: string[]; // 从 API 获取的完整内容标签列表

  // 分页
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;

  // 筛选
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  handleFilterChange: (
    key: keyof FilterState,
    value: FilterState[keyof FilterState]
  ) => void;
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
}

const PAGE_SIZE = 15;

const initialFilterState: FilterState = {
  searchTerm: '',
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [totalTalents, setTotalTalents] = useState(0);
  const [loading, setLoading] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选状态
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);

  // 价格档位状态
  const [selectedPriceTier, setSelectedPriceTier] = useState<string | null>(
    () => {
      const platformPriceTypes = getPlatformPriceTypes(selectedPlatform);
      return platformPriceTypes && platformPriceTypes.length > 0
        ? platformPriceTypes[0].key
        : null;
    }
  );

  // 批量选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 用于追踪筛选状态的 ref（避免 useCallback 依赖变化导致无限循环）
  const filterStateRef = useRef(filterState);
  filterStateRef.current = filterState;

  // 请求取消控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('组件已卸载');
      }
    };
  }, []);

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

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('被新请求替代');
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);

      const params: {
        platform: Platform;
        page: number;
        limit: number;
        sortBy: 'name' | 'updatedAt' | 'createdAt' | 'fansCount';
        order: 'asc' | 'desc';
        searchTerm?: string;
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
        selectedTags,
        rebateMin,
        rebateMax,
        priceMin,
        priceMax,
        selectedCustomerId,
      } = filterStateRef.current;

      if (searchTerm) params.searchTerm = searchTerm;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (rebateMin) params.rebateMin = parseFloat(rebateMin);
      if (rebateMax) params.rebateMax = parseFloat(rebateMax);
      if (priceMin) params.priceMin = parseFloat(priceMin);
      if (priceMax) params.priceMax = parseFloat(priceMax);
      if (selectedCustomerId) params.customerId = selectedCustomerId;

      const response = await getTalents(params);

      // 检查请求是否已取消
      if (controller.signal.aborted) {
        return;
      }

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
      // 忽略取消错误
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      logger.error('加载达人列表失败:', err);
      message.error('加载达人列表失败');
      setTalents([]);
      setTotalTalents(0);
    } finally {
      // 只有未取消时才更新 loading 状态
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [configLoading, platformsLength, selectedPlatform, currentPage]);

  // 加载达人数据（仅在平台、页码变化时自动加载）
  useEffect(() => {
    loadTalents();
  }, [loadTalents]);

  // 加载机构、客户列表和内容标签
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

    const loadAvailableTags = async () => {
      try {
        const response = await getTalentFilterOptions('v2');
        if (response.success && response.data?.types) {
          setAvailableTags(response.data.types);
        }
      } catch (error) {
        logger.error('加载内容标签失败:', error);
      }
    };

    loadAgencies();
    loadCustomers();
    loadAvailableTags();
  }, []);

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
    availableTags,
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
  };
}
