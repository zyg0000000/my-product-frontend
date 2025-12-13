/**
 * 机构数据管理 Hook
 * 参考 useBasicInfoData 实现
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Agency } from '../../../../types/agency';
import type { Platform } from '../../../../types/talent';
import type { AgencyFilterState } from '../components/AgencyFilterPanel';
import { getAgencies, type GetAgenciesParams } from '../../../../api/agency';
import { getTalents } from '../../../../api/talent';
import { logger } from '../../../../utils/logger';

const PAGE_SIZE = 20;

interface UseAgencyDataProps {
  selectedPlatform: Platform;
}

interface UseAgencyDataReturn {
  // 数据
  agencies: Agency[];
  totalAgencies: number;
  loading: boolean;
  talentCounts: Record<string, number>;

  // 分页
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;

  // 筛选
  filterState: AgencyFilterState;
  handleFilterChange: (
    key: keyof AgencyFilterState,
    value: AgencyFilterState[keyof AgencyFilterState]
  ) => void;
  handleResetFilters: () => void;
  handleSearch: () => void;

  // 方法
  loadAgencies: () => Promise<void>;
}

// 初始筛选状态
const initialFilterState: AgencyFilterState = {
  searchTerm: '',
  selectedTypes: [],
  selectedStatuses: [],
  contactPerson: '',
  phoneNumber: '',
  createdAfter: '',
  createdBefore: '',
};

export function useAgencyData({
  selectedPlatform,
}: UseAgencyDataProps): UseAgencyDataReturn {
  // 数据状态
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [totalAgencies, setTotalAgencies] = useState(0);
  const [loading, setLoading] = useState(false);
  const [talentCounts, setTalentCounts] = useState<Record<string, number>>({});

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = PAGE_SIZE;

  // 筛选状态
  const [filterState, setFilterState] =
    useState<AgencyFilterState>(initialFilterState);

  // 使用 ref 追踪筛选状态，避免 useCallback 依赖变化
  const filterStateRef = useRef(filterState);
  useEffect(() => {
    filterStateRef.current = filterState;
  }, [filterState]);

  // 加载机构列表
  const loadAgencies = useCallback(async () => {
    try {
      setLoading(true);

      // 构建请求参数
      const params: GetAgenciesParams = {
        page: currentPage,
        limit: pageSize,
        sortBy: 'createdAt',
        order: 'desc',
      };

      // 添加筛选参数
      const {
        searchTerm,
        selectedTypes,
        selectedStatuses,
        contactPerson,
        phoneNumber,
        createdAfter,
        createdBefore,
      } = filterStateRef.current;

      if (searchTerm) params.search = searchTerm;

      if (selectedTypes.length > 0) {
        // 机构类型（当前只支持单选）
        params.type = selectedTypes[0];
      }

      if (selectedStatuses.length > 0) {
        // 多状态支持
        params.statusList = selectedStatuses.join(',');
      }

      if (contactPerson) params.contactPerson = contactPerson;
      if (phoneNumber) params.phoneNumber = phoneNumber;
      if (createdAfter) params.createdAfter = createdAfter;
      if (createdBefore) params.createdBefore = createdBefore;

      const response = await getAgencies(params);

      if (response.success && response.data) {
        // 后端直接返回 { success, data, total, page, limit, totalPages }
        setAgencies(response.data);
        setTotalAgencies(response.total || 0);
      } else {
        logger.error('加载机构列表失败:', response.message);
        setAgencies([]);
        setTotalAgencies(0);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('加载机构列表失败:', error);
        setAgencies([]);
        setTotalAgencies(0);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  // 加载达人数量统计（复用现有逻辑）
  const loadTalentCounts = useCallback(async () => {
    try {
      const response = await getTalents({ platform: selectedPlatform });
      if (response.success && response.data) {
        const counts: Record<string, number> = {};
        response.data.forEach(talent => {
          const agencyId = talent.agencyId || 'individual';
          counts[agencyId] = (counts[agencyId] || 0) + 1;
        });
        setTalentCounts(counts);
      }
    } catch (error) {
      logger.error('加载达人统计失败:', error);
    }
  }, [selectedPlatform]);

  // 处理筛选变更
  const handleFilterChange = useCallback(
    (
      key: keyof AgencyFilterState,
      value: AgencyFilterState[keyof AgencyFilterState]
    ) => {
      setFilterState(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // 重置筛选
  const handleResetFilters = useCallback(() => {
    setFilterState(initialFilterState);
    setCurrentPage(1);
    // 重置后自动加载数据
    setTimeout(() => loadAgencies(), 0);
  }, [loadAgencies]);

  // 执行搜索
  const handleSearch = useCallback(() => {
    setCurrentPage(1); // 重置到第一页
    loadAgencies();
  }, [loadAgencies]);

  // 页码变化时加载数据
  useEffect(() => {
    loadAgencies();
  }, [currentPage]);

  // 平台变化时重新加载达人统计
  useEffect(() => {
    loadTalentCounts();
  }, [selectedPlatform, loadTalentCounts]);

  return {
    // 数据
    agencies,
    totalAgencies,
    loading,
    talentCounts,

    // 分页
    currentPage,
    pageSize,
    setCurrentPage,

    // 筛选
    filterState,
    handleFilterChange,
    handleResetFilters,
    handleSearch,

    // 方法
    loadAgencies,
  };
}
