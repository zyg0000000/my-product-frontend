/**
 * 达人全景数据 Hook
 *
 * 管理达人全景页面的数据加载和分页：
 * - 调用 panoramaSearch API
 * - 管理分页状态
 * - 支持请求取消（AbortController）
 * - 统一数据加载入口
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Platform } from '../types/talent';
import {
  panoramaSearch,
  type PanoramaSearchParams,
  type PanoramaTalentItem,
} from '../api/customerTalents';

/**
 * 达人全景页面的必需字段（即使用户未选择也必须请求）
 * 这些字段对于页面功能（如外链）是必需的
 */
const REQUIRED_FIELDS = [
  'oneId',
  'name',
  'platform',
  'platformAccountId', // 外链必需字段
  'platformSpecific', // 外链必需字段
];

/**
 * 达人全景页面的默认字段列表
 * 当用户未自定义选择字段时使用
 */
const DEFAULT_PANORAMA_FIELDS = [
  ...REQUIRED_FIELDS,
  'rebate',
  'prices',
  'contentTags',
  'followerCount',
  'customerRelations',
];

/**
 * 合并用户选择的字段和必需字段
 * @param userFields 用户选择的字段列表
 * @returns 合并后的字段列表（去重）
 */
function mergeWithRequiredFields(userFields?: string[]): string[] {
  if (!userFields || userFields.length === 0) {
    return DEFAULT_PANORAMA_FIELDS;
  }
  // 合并并去重
  const merged = new Set([...REQUIRED_FIELDS, ...userFields]);
  return Array.from(merged);
}

/** 排序状态 */
interface SortState {
  field?: string;
  order?: 'asc' | 'desc';
}

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
  /** 当前排序状态 */
  sortState: SortState;
  /** 设置页码 */
  setPage: (page: number) => void;
  /** 设置每页数量 */
  setPageSize: (size: number) => void;
  /** 设置排序（触发重新加载） */
  setSort: (field?: string, order?: 'asc' | 'desc') => void;
  /** 执行搜索 */
  search: (
    params: Omit<PanoramaSearchParams, 'platform' | 'page' | 'pageSize'>
  ) => void;
  /** 刷新当前数据 */
  refresh: () => Promise<void>;
}

/**
 * 达人全景数据 Hook
 *
 * 架构说明：
 * - 所有操作函数（search/setSort/setPageSize/setPage）只更新状态
 * - 唯一的 useEffect 负责数据加载，统一管理请求取消
 * - 使用 AbortController 防止竞态条件和内存泄漏
 */
export function usePanoramaData(platform: Platform): UsePanoramaDataResult {
  const [talents, setTalents] = useState<PanoramaTalentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [sortState, setSortState] = useState<SortState>({});
  const [lastSearchParams, setLastSearchParams] = useState<
    Omit<PanoramaSearchParams, 'platform' | 'page' | 'pageSize'>
  >({});

  // 使用 ref 保存最新值，避免 useEffect 依赖对象引用
  const lastSearchParamsRef = useRef(lastSearchParams);
  const sortStateRef = useRef(sortState);
  const pageSizeRef = useRef(pageSize);

  // 请求取消控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 用于强制刷新的计数器（避免使用 page=0 导致 $skip 为负数）
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 同步 ref
  lastSearchParamsRef.current = lastSearchParams;
  sortStateRef.current = sortState;
  pageSizeRef.current = pageSize;

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('组件已卸载');
      }
    };
  }, []);

  // ========== 唯一数据加载入口 ==========
  useEffect(() => {
    // 只有在有搜索参数时才加载（避免初始加载）
    if (Object.keys(lastSearchParamsRef.current).length === 0) {
      return;
    }

    // 取消旧请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('被新请求替代');
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await panoramaSearch(
          {
            platform,
            page: currentPage,
            pageSize: pageSizeRef.current,
            sortField: sortStateRef.current.field,
            sortOrder: sortStateRef.current.order,
            ...lastSearchParamsRef.current,
            fields: mergeWithRequiredFields(lastSearchParamsRef.current.fields),
          },
          { signal: controller.signal }
        );

        // 检查是否已取消
        if (controller.signal.aborted) return;

        setTalents(response.list);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } catch (err) {
        // 忽略取消错误
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : '加载失败';
        setError(message);
        console.error('panoramaSearch error:', err);
      } finally {
        // 只有未取消时才更新 loading 状态
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [platform, currentPage, refreshTrigger]); // 依赖 platform、currentPage 和 refreshTrigger

  // ========== 简化的操作函数（只更新状态） ==========

  /**
   * 执行搜索
   * 更新搜索参数并重置到第1页，由 useEffect 自动触发数据加载
   */
  const search = useCallback(
    (params: Omit<PanoramaSearchParams, 'platform' | 'page' | 'pageSize'>) => {
      // 直接更新 ref（立即生效）
      lastSearchParamsRef.current = params;
      sortStateRef.current = {};

      // 更新 state
      setLastSearchParams(params);
      setSortState({});

      // 重置到第1页（如果已经在第1页，通过 refreshTrigger 触发加载）
      if (currentPage === 1) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setCurrentPage(1);
      }
    },
    [currentPage]
  );

  /**
   * 设置页码
   */
  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * 设置排序
   * 更新排序状态并重置到第1页
   */
  const setSort = useCallback(
    (field?: string, order?: 'asc' | 'desc') => {
      const newSortState: SortState = { field, order };
      // 直接更新 ref
      sortStateRef.current = newSortState;
      // 更新 state
      setSortState(newSortState);

      // 重置到第1页（如果已经在第1页，通过 refreshTrigger 触发加载）
      if (currentPage === 1) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setCurrentPage(1);
      }
    },
    [currentPage]
  );

  /**
   * 设置每页数量
   * 更新 pageSize 并重置到第1页
   */
  const handleSetPageSize = useCallback(
    (size: number) => {
      // 直接更新 ref
      pageSizeRef.current = size;
      // 更新 state
      setPageSizeState(size);

      // 重置到第1页（如果已经在第1页，通过 refreshTrigger 触发加载）
      if (currentPage === 1) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setCurrentPage(1);
      }
    },
    [currentPage]
  );

  /**
   * 刷新当前数据
   * 这是用户显式操作，直接调用 API
   */
  const refresh = useCallback(async () => {
    // 取消旧请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('刷新替代');
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await panoramaSearch(
        {
          platform,
          page: currentPage,
          pageSize: pageSizeRef.current,
          sortField: sortStateRef.current.field,
          sortOrder: sortStateRef.current.order,
          ...lastSearchParamsRef.current,
          fields: mergeWithRequiredFields(lastSearchParamsRef.current.fields),
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      setTalents(response.list);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : '刷新失败';
      setError(message);
      console.error('panoramaSearch refresh error:', err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [platform, currentPage]);

  return {
    talents,
    loading,
    error,
    total,
    currentPage,
    pageSize,
    totalPages,
    sortState,
    setPage,
    setPageSize: handleSetPageSize,
    setSort,
    search,
    refresh,
  };
}
