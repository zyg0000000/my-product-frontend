/**
 * 达人表现数据加载 Hook
 * 基于 useTalentData 扩展，专门用于加载带 performanceData 的达人列表
 */

import { useState, useEffect } from 'react';
import { getTalents, type GetTalentsParams } from '../api/talent';
import type { Talent, Platform } from '../types/talent';

export function usePerformanceData(platform: Platform) {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;  // 表现页面每页20条

  const loadData = async () => {
    try {
      setLoading(true);

      const params: GetTalentsParams = {
        platform,
        page: currentPage,
        limit: pageSize,
        sortBy: 'updatedAt',
        order: 'desc'
      };

      const response = await getTalents(params);

      if (response.success && response.data) {
        const talentsData = Array.isArray(response.data) ? response.data : [response.data];
        setTalents(talentsData);
        setTotal(response.total || response.count || talentsData.length);
      } else {
        setTalents([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('加载达人表现数据失败:', err);
      setTalents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [platform, currentPage]);

  return {
    talents,
    loading,
    total,
    currentPage,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    setPage: setCurrentPage,
    reload: loadData
  };
}
