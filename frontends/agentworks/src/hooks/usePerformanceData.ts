/**
 * 达人表现数据加载 Hook
 * 使用 getTalentsSearch 高级搜索接口，支持更强大的筛选和 Dashboard 统计
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import {
  searchTalents,
  type SearchTalentsParams,
  type DashboardStats,
} from '../api/talent';
import type { Talent, Platform } from '../types/talent';

// 筛选参数类型
export interface PerformanceFilterParams {
  searchTerm?: string;
  tiers?: string[] | string; // 支持数组或逗号分隔字符串
  // 数值区间筛选
  cpmMin?: number;
  cpmMax?: number;
  maleRatioMin?: number;
  maleRatioMax?: number;
  femaleRatioMin?: number;
  femaleRatioMax?: number;
  // 可扩展更多筛选参数
  [key: string]: any;
}

export function usePerformanceData(
  platform: Platform,
  filterParams?: PerformanceFilterParams
) {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const pageSize = 20; // 表现页面每页20条

  // 保存当前筛选参数的引用，用于比较
  const filterParamsRef = useRef<PerformanceFilterParams | undefined>(
    filterParams
  );

  const loadData = useCallback(
    async (
      page: number = currentPage,
      filters: PerformanceFilterParams = filterParams || {}
    ) => {
      try {
        setLoading(true);

        // 使用新的 searchTalents 接口（getTalentsSearch）
        const params: SearchTalentsParams = {
          platform,
          page,
          pageSize,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        };

        // 添加搜索参数
        if (filters.searchTerm) {
          params.search = filters.searchTerm;
        }

        // 处理 tiers 参数（可能是数组或逗号分隔字符串）
        if (filters.tiers) {
          if (Array.isArray(filters.tiers) && filters.tiers.length > 0) {
            params.tiers = filters.tiers;
          } else if (
            typeof filters.tiers === 'string' &&
            filters.tiers.trim()
          ) {
            // 字符串格式转数组
            params.tiers = filters.tiers
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
          }
        }

        // 处理数值区间筛选
        if (filters.cpmMin !== undefined) params.cpmMin = filters.cpmMin;
        if (filters.cpmMax !== undefined) params.cpmMax = filters.cpmMax;
        if (filters.maleRatioMin !== undefined)
          params.maleRatioMin = filters.maleRatioMin;
        if (filters.maleRatioMax !== undefined)
          params.maleRatioMax = filters.maleRatioMax;
        if (filters.femaleRatioMin !== undefined)
          params.femaleRatioMin = filters.femaleRatioMin;
        if (filters.femaleRatioMax !== undefined)
          params.femaleRatioMax = filters.femaleRatioMax;

        const response = await searchTalents(params);

        if (response.success && response.data) {
          setTalents(response.data.talents || []);
          setTotal(response.data.pagination?.totalItems || 0);
          setDashboardStats(response.data.dashboardStats || null);
        } else {
          setTalents([]);
          setTotal(0);
          setDashboardStats(null);
        }
      } catch (err) {
        logger.error('加载达人表现数据失败:', err);
        setTalents([]);
        setTotal(0);
        setDashboardStats(null);
      } finally {
        setLoading(false);
      }
    },
    [platform, currentPage, pageSize]
  );

  // 平台或页码变化时自动加载
  useEffect(() => {
    loadData(currentPage, filterParamsRef.current);
  }, [platform, currentPage]);

  // 设置页码
  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 执行搜索（带筛选参数）
  const search = useCallback(
    (filters: PerformanceFilterParams) => {
      filterParamsRef.current = filters;
      setCurrentPage(1); // 搜索时重置到第一页
      loadData(1, filters);
    },
    [loadData]
  );

  // 重新加载当前数据
  const reload = useCallback(() => {
    loadData(currentPage, filterParamsRef.current);
  }, [loadData, currentPage]);

  return {
    talents,
    loading,
    total,
    currentPage,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    dashboardStats, // 新增：Dashboard 统计数据
    setPage,
    reload,
    search,
  };
}
