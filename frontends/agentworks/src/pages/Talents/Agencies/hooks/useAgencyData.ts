/**
 * 机构数据管理 Hook
 * 参考 useBasicInfoData 实现
 *
 * v2.0: 支持多平台达人数统计，移除平台依赖
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Agency } from '../../../../types/agency';
import type { Platform } from '../../../../types/talent';
import type { AgencyFilterState } from '../components/AgencyFilterPanel';
import { getAgencies, type GetAgenciesParams } from '../../../../api/agency';
import { getTalents } from '../../../../api/talent';
import { usePlatformConfig } from '../../../../hooks/usePlatformConfig';
import { logger } from '../../../../utils/logger';

const PAGE_SIZE = 20;

/** 多平台达人数统计类型 */
type MultiPlatformTalentCounts = Record<string, Record<Platform, number>>;

interface UseAgencyDataReturn {
  // 数据
  agencies: Agency[];
  totalAgencies: number;
  loading: boolean;
  /** 多平台达人数统计 { agencyId: { douyin: 10, xiaohongshu: 5 } } */
  talentCounts: MultiPlatformTalentCounts;
  /** 加载达人统计的状态 */
  loadingCounts: boolean;

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
  refreshTalentCounts: () => Promise<void>;
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

export function useAgencyData(): UseAgencyDataReturn {
  // 获取平台配置
  const { getPlatformList } = usePlatformConfig(false);
  const platforms = getPlatformList();

  // 使用 ref 追踪平台列表，避免数组引用变化导致无限循环
  const platformsRef = useRef<Platform[]>(platforms);
  const platformsKey = platforms.join(',');

  // 当平台列表内容变化时更新 ref
  useEffect(() => {
    platformsRef.current = platforms;
  }, [platformsKey]);

  // 数据状态
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [totalAgencies, setTotalAgencies] = useState(0);
  const [loading, setLoading] = useState(false);
  const [talentCounts, setTalentCounts] = useState<MultiPlatformTalentCounts>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

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

  // 加载所有平台的达人数量统计（使用 ref 避免无限循环）
  const loadTalentCounts = useCallback(async () => {
    const currentPlatforms = platformsRef.current;
    if (currentPlatforms.length === 0) return;

    setLoadingCounts(true);

    try {
      // 并行请求所有平台的达人数据
      const results = await Promise.all(
        currentPlatforms.map(async (platform) => {
          try {
            const response = await getTalents({ platform });
            if (response.success && response.data) {
              return { platform, data: response.data };
            }
            return { platform, data: [] };
          } catch (error) {
            logger.error(`加载 ${platform} 达人统计失败:`, error);
            return { platform, data: [] };
          }
        })
      );

      // 汇总所有平台的达人数统计
      const counts: MultiPlatformTalentCounts = {};

      results.forEach(({ platform, data }) => {
        data.forEach((talent) => {
          const agencyId = talent.agencyId || 'individual';
          if (!counts[agencyId]) {
            counts[agencyId] = {} as Record<Platform, number>;
          }
          counts[agencyId][platform] = (counts[agencyId][platform] || 0) + 1;
        });
      });

      setTalentCounts(counts);
    } catch (error) {
      logger.error('加载达人统计失败:', error);
    } finally {
      setLoadingCounts(false);
    }
  }, []); // 移除 platforms 依赖，使用 ref

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

  // 平台列表变化时重新加载达人统计（使用 platformsKey 作为稳定依赖）
  useEffect(() => {
    if (platformsKey) {
      loadTalentCounts();
    }
  }, [platformsKey, loadTalentCounts]);

  return {
    // 数据
    agencies,
    totalAgencies,
    loading,
    talentCounts,
    loadingCounts,

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
    refreshTalentCounts: loadTalentCounts,
  };
}
