/**
 * 达人全景数据 Hook
 *
 * 管理达人全景页面的数据加载和分页：
 * - 调用 panoramaSearch API
 * - 管理分页状态
 * - 缓存查询参数
 */

import { useState, useCallback } from 'react';
import type { Platform } from '../types/talent';
import {
  panoramaSearch,
  type PanoramaSearchParams,
  type PanoramaTalentItem,
} from '../api/customerTalents';

interface UsePanoramaDataResult {
  /** 达人列表 */
  talents: PanoramaTalentItem[];
  /** 加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 总数 */
  total: number;
  /** 当前页码 */
  currentPage: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 设置页码 */
  setPage: (page: number) => void;
  /** 设置每页数量 */
  setPageSize: (size: number) => void;
  /** 执行搜索 */
  search: (
    params: Omit<PanoramaSearchParams, 'platform' | 'page' | 'pageSize'>
  ) => Promise<void>;
  /** 刷新当前数据 */
  refresh: () => Promise<void>;
}

/**
 * 达人全景数据 Hook
 */
export function usePanoramaData(platform: Platform): UsePanoramaDataResult {
  const [talents, setTalents] = useState<PanoramaTalentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [lastSearchParams, setLastSearchParams] = useState<
    Omit<PanoramaSearchParams, 'platform' | 'page' | 'pageSize'>
  >({});

  // 执行搜索
  const search = useCallback(
    async (
      params: Omit<PanoramaSearchParams, 'platform' | 'page' | 'pageSize'>
    ) => {
      setLoading(true);
      setError(null);
      setLastSearchParams(params);

      try {
        const response = await panoramaSearch({
          platform,
          page: 1, // 新搜索从第一页开始
          pageSize,
          ...params,
        });

        setTalents(response.list);
        setTotal(response.total);
        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
      } catch (err) {
        const message = err instanceof Error ? err.message : '搜索失败';
        setError(message);
        console.error('panoramaSearch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [platform, pageSize]
  );

  // 切换页码
  const setPage = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);

      try {
        const response = await panoramaSearch({
          platform,
          page,
          pageSize,
          ...lastSearchParams,
        });

        setTalents(response.list);
        setTotal(response.total);
        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载失败';
        setError(message);
        console.error('panoramaSearch pagination error:', err);
      } finally {
        setLoading(false);
      }
    },
    [platform, pageSize, lastSearchParams]
  );

  // 改变每页数量
  const handleSetPageSize = useCallback(
    async (size: number) => {
      setPageSize(size);
      setLoading(true);
      setError(null);

      try {
        const response = await panoramaSearch({
          platform,
          page: 1, // 重置到第一页
          pageSize: size,
          ...lastSearchParams,
        });

        setTalents(response.list);
        setTotal(response.total);
        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载失败';
        setError(message);
        console.error('panoramaSearch pageSize change error:', err);
      } finally {
        setLoading(false);
      }
    },
    [platform, lastSearchParams]
  );

  // 刷新当前数据
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await panoramaSearch({
        platform,
        page: currentPage,
        pageSize,
        ...lastSearchParams,
      });

      setTalents(response.list);
      setTotal(response.total);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失败';
      setError(message);
      console.error('panoramaSearch refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [platform, currentPage, pageSize, lastSearchParams]);

  return {
    talents,
    loading,
    error,
    total,
    currentPage,
    pageSize,
    totalPages,
    setPage,
    setPageSize: handleSetPageSize,
    search,
    refresh,
  };
}
