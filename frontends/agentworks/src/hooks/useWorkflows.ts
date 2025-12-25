/**
 * 工作流数据管理 Hook
 *
 * @version 1.0.0
 * @description 提供工作流的加载、筛选、CRUD 操作
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { App } from 'antd';
import {
  automationApi,
  type Workflow,
  type CreateWorkflowRequest,
  type UpdateWorkflowRequest,
} from '../api/automation';
import type { Platform } from '../types/talent';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/api';

interface UseWorkflowsOptions {
  /** 自动加载（默认 true） */
  autoLoad?: boolean;
  /** 按平台筛选 */
  platform?: Platform;
  /** 只加载激活的工作流 */
  activeOnly?: boolean;
}

interface UseWorkflowsReturn {
  // 状态
  workflows: Workflow[];
  loading: boolean;
  error: string | null;

  // 筛选状态
  selectedPlatform: Platform | null;
  setSelectedPlatform: (platform: Platform | null) => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;

  // 筛选后的数据
  filteredWorkflows: Workflow[];
  workflowsByPlatform: Record<Platform, Workflow[]>;

  // 操作方法
  loadWorkflows: () => Promise<void>;
  createWorkflow: (data: CreateWorkflowRequest) => Promise<boolean>;
  updateWorkflow: (data: UpdateWorkflowRequest) => Promise<boolean>;
  deleteWorkflow: (id: string) => Promise<boolean>;
  toggleActive: (id: string, isActive: boolean) => Promise<boolean>;

  // 工具方法
  getWorkflowById: (id: string) => Workflow | undefined;
  refreshWorkflows: () => Promise<void>;
}

/**
 * 工作流数据管理 Hook
 */
export function useWorkflows(
  options: UseWorkflowsOptions = {}
): UseWorkflowsReturn {
  const {
    autoLoad = true,
    platform: initialPlatform,
    activeOnly = false,
  } = options;
  const { message } = App.useApp();

  // 状态
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 筛选状态
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    initialPlatform || null
  );
  const [searchKeyword, setSearchKeyword] = useState('');

  // 加载工作流列表
  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await automationApi.getWorkflowList({
        platform: selectedPlatform || undefined,
        isActive: activeOnly ? true : undefined,
      });

      if (response.success && response.data) {
        setWorkflows(response.data);
        logger.info(`工作流加载成功，共 ${response.data.length} 条`);
      } else {
        throw new Error(response.message || '加载工作流失败');
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err) || '加载工作流失败';
      logger.error('加载工作流失败:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, activeOnly]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadWorkflows();
    }
  }, [autoLoad, loadWorkflows]);

  // 创建工作流
  const createWorkflow = useCallback(
    async (data: CreateWorkflowRequest): Promise<boolean> => {
      try {
        const response = await automationApi.createWorkflow(data);
        if (response.success) {
          message.success('工作流创建成功');
          await loadWorkflows();
          return true;
        } else {
          throw new Error(response.message || '创建失败');
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || '创建工作流失败';
        logger.error('创建工作流失败:', err);
        message.error(errorMsg);
        return false;
      }
    },
    [loadWorkflows, message]
  );

  // 更新工作流
  const updateWorkflow = useCallback(
    async (data: UpdateWorkflowRequest): Promise<boolean> => {
      try {
        const response = await automationApi.updateWorkflow(data);
        if (response.success) {
          message.success('工作流更新成功');
          await loadWorkflows();
          return true;
        } else {
          throw new Error(response.message || '更新失败');
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || '更新工作流失败';
        logger.error('更新工作流失败:', err);
        message.error(errorMsg);
        return false;
      }
    },
    [loadWorkflows, message]
  );

  // 删除工作流
  const deleteWorkflow = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await automationApi.deleteWorkflow(id);
        if (response.success) {
          message.success('工作流删除成功');
          await loadWorkflows();
          return true;
        } else {
          throw new Error(response.message || '删除失败');
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || '删除工作流失败';
        logger.error('删除工作流失败:', err);
        message.error(errorMsg);
        return false;
      }
    },
    [loadWorkflows, message]
  );

  // 切换激活状态
  const toggleActive = useCallback(
    async (id: string, isActive: boolean): Promise<boolean> => {
      try {
        const response = await automationApi.toggleWorkflowActive(id, isActive);
        if (response.success) {
          message.success(isActive ? '工作流已启用' : '工作流已停用');
          // 本地更新状态，避免重新加载导致排序变化
          setWorkflows(prev =>
            prev.map(w => (w._id === id ? { ...w, isActive } : w))
          );
          return true;
        } else {
          throw new Error(response.message || '操作失败');
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || '操作失败';
        logger.error('切换工作流状态失败:', err);
        message.error(errorMsg);
        return false;
      }
    },
    [message]
  );

  // 根据 ID 获取工作流
  const getWorkflowById = useCallback(
    (id: string): Workflow | undefined => {
      return workflows.find(w => w._id === id);
    },
    [workflows]
  );

  // 刷新工作流列表
  const refreshWorkflows = useCallback(async () => {
    await loadWorkflows();
  }, [loadWorkflows]);

  // 筛选后的工作流
  const filteredWorkflows = useMemo(() => {
    let result = workflows;

    // 按平台筛选
    if (selectedPlatform) {
      result = result.filter(w => w.platform === selectedPlatform);
    }

    // 按关键字搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter(
        w =>
          w.name.toLowerCase().includes(keyword) ||
          w.description?.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [workflows, selectedPlatform, searchKeyword]);

  // 按平台分组
  const workflowsByPlatform = useMemo(() => {
    const grouped: Record<Platform, Workflow[]> = {
      douyin: [],
      xiaohongshu: [],
      bilibili: [],
      kuaishou: [],
    };

    workflows.forEach(w => {
      if (grouped[w.platform]) {
        grouped[w.platform].push(w);
      }
    });

    return grouped;
  }, [workflows]);

  return {
    // 状态
    workflows,
    loading,
    error,

    // 筛选状态
    selectedPlatform,
    setSelectedPlatform,
    searchKeyword,
    setSearchKeyword,

    // 筛选后的数据
    filteredWorkflows,
    workflowsByPlatform,

    // 操作方法
    loadWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleActive,

    // 工具方法
    getWorkflowById,
    refreshWorkflows,
  };
}

export default useWorkflows;
