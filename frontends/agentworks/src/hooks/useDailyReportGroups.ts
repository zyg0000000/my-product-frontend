/**
 * 日报分组管理 Hook
 * 使用后端 API 存储分组配置（持久化到 MongoDB）
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  DailyReportGroup,
  DailyReportGroupFormData,
} from '../types/dailyReportGroup';
import * as dailyReportApi from '../api/dailyReport';

/**
 * 日报分组管理 Hook
 */
export function useDailyReportGroups() {
  const [groups, setGroups] = useState<DailyReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载分组列表
   */
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dailyReportApi.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('加载日报分组失败:', err);
      setError(err instanceof Error ? err.message : '加载分组失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  /**
   * 检查项目是否已在其他分组中
   */
  const checkProjectConflict = useCallback(
    (
      projectIds: string[],
      excludeGroupId?: string
    ): { hasConflict: boolean; conflictProjectIds: string[] } => {
      const conflictProjectIds: string[] = [];

      for (const projectId of projectIds) {
        const existingGroup = groups.find(
          g => g.id !== excludeGroupId && g.projectIds.includes(projectId)
        );
        if (existingGroup) {
          conflictProjectIds.push(projectId);
        }
      }

      return {
        hasConflict: conflictProjectIds.length > 0,
        conflictProjectIds,
      };
    },
    [groups]
  );

  /**
   * 创建分组
   */
  const createGroup = useCallback(
    async (
      formData: DailyReportGroupFormData
    ): Promise<{
      success: boolean;
      error?: string;
      group?: DailyReportGroup;
    }> => {
      try {
        const newGroup = await dailyReportApi.createGroup({
          name: formData.name,
          primaryProjectId: formData.primaryProjectId,
          projectIds: formData.projectIds,
        });

        // 更新本地状态
        setGroups(prev => [...prev, newGroup]);

        return { success: true, group: newGroup };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '创建分组失败';
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * 更新分组
   */
  const updateGroup = useCallback(
    async (
      groupId: string,
      formData: DailyReportGroupFormData
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const updatedGroup = await dailyReportApi.updateGroup(groupId, {
          name: formData.name,
          primaryProjectId: formData.primaryProjectId,
          projectIds: formData.projectIds,
        });

        // 更新本地状态
        setGroups(prev => prev.map(g => (g.id === groupId ? updatedGroup : g)));

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '更新分组失败';
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * 删除分组
   */
  const deleteGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await dailyReportApi.deleteGroup(groupId);
      // 更新本地状态
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err) {
      console.error('删除分组失败:', err);
      throw err;
    }
  }, []);

  /**
   * 根据 ID 获取分组
   */
  const getGroupById = useCallback(
    (groupId: string): DailyReportGroup | undefined => {
      return groups.find(g => g.id === groupId);
    },
    [groups]
  );

  /**
   * 获取项目所属的分组
   */
  const getGroupByProjectId = useCallback(
    (projectId: string): DailyReportGroup | undefined => {
      return groups.find(g => g.projectIds.includes(projectId));
    },
    [groups]
  );

  return {
    groups,
    loading,
    error,
    reload: loadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    getGroupByProjectId,
    checkProjectConflict,
  };
}
