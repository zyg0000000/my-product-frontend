/**
 * 达人数据加载管理 Hook
 *
 * 提供达人列表的数据加载、分页状态管理
 * 简化组件代码，统一数据加载逻辑
 */

import { useState } from 'react';
import { logger } from '../utils/logger';
import { getTalents, type GetTalentsParams, type GetTalentsResponse } from '../api/talent';
import type { Talent } from '../types/talent';
import { useApiCall } from './useApiCall';

/**
 * 达人数据管理 Hook
 *
 * @example
 * ```typescript
 * const { talents, loading, total, currentPage, loadTalents, setPage } = useTalentData();
 *
 * // 加载数据
 * useEffect(() => {
 *   loadTalents({ platform: 'douyin', page: currentPage, limit: 15 });
 * }, [currentPage]);
 * ```
 */
export function useTalentData() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const api = useApiCall<GetTalentsResponse>();

  /**
   * 加载达人列表
   */
  const loadTalents = async (params: GetTalentsParams): Promise<void> => {
    try {
      const response = await getTalents(params);

      if (response.success && response.data) {
        // 确保 data 总是数组
        const talentsData = Array.isArray(response.data)
          ? response.data
          : [response.data];

        setTalents(talentsData);

        // 更新总记录数
        if (response.total !== undefined) {
          setTotal(response.total);
        } else if (response.count !== undefined) {
          // 兼容旧版本返回格式
          setTotal(response.count);
        } else {
          setTotal(talentsData.length);
        }
      } else {
        setTalents([]);
        setTotal(0);
      }
    } catch (error) {
      logger.error('加载达人列表失败:', error);
      setTalents([]);
      setTotal(0);
    }
  };

  /**
   * 刷新当前页数据
   */
  const refresh = async (params: GetTalentsParams): Promise<void> => {
    await loadTalents(params);
  };

  /**
   * 设置当前页码
   */
  const setPage = (page: number) => {
    setCurrentPage(page);
  };

  /**
   * 重置到第一页
   */
  const resetPage = () => {
    setCurrentPage(1);
  };

  /**
   * 计算总页数
   */
  const totalPages = Math.ceil(total / pageSize);

  return {
    talents,
    loading: api.loading,
    error: api.error,
    total,
    currentPage,
    pageSize,
    totalPages,
    loadTalents,
    refresh,
    setPage,
    resetPage,
  };
}
