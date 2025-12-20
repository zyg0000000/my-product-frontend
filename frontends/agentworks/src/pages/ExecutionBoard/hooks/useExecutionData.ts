/**
 * 执行看板 - 数据加载 Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { projectApi } from '../../../services/projectApi';
import { customerApi } from '../../../services/customerApi';
import type { Collaboration, ProjectListItem } from '../../../types/project';
import type {
  ExecutionFilters,
  CustomerOption,
  ProjectOption,
  CollaborationWithProject,
} from '../types';
import { getProjectColor } from '../utils';
import { logger } from '../../../utils/logger';

// 执行追踪有效状态（仅显示这两种状态）
const EXECUTION_VALID_STATUSES = ['客户已定档', '视频已发布'];

interface UseExecutionDataReturn {
  customers: CustomerOption[];
  projects: ProjectOption[];
  collaborations: CollaborationWithProject[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateCollaboration: (
    id: string,
    data: Partial<Collaboration>
  ) => Promise<boolean>;
}

export function useExecutionData(
  filters: ExecutionFilters
): UseExecutionDataReturn {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [rawCollaborations, setRawCollaborations] = useState<Collaboration[]>(
    []
  );
  const [projectMap, setProjectMap] = useState<Map<string, ProjectListItem>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载客户列表
  const loadCustomers = useCallback(async () => {
    try {
      logger.info('[useExecutionData] 开始加载客户列表');
      const response = await customerApi.getCustomers({ pageSize: 100 });
      logger.info('[useExecutionData] 客户列表响应:', response);
      if (response.success && response.data?.customers) {
        const customerList = response.data.customers.map(c => ({
          id: c._id || c.code, // MongoDB 使用 _id，如果没有则用 code 作为后备
          name: c.name,
          code: c.code || '',
        }));
        setCustomers(customerList);
      }
    } catch (err) {
      logger.error('[useExecutionData] 加载客户列表失败', err);
    }
  }, []);

  // 加载项目列表（根据客户和周期筛选）
  const loadProjects = useCallback(
    async (customerId: string | null) => {
      if (!customerId) {
        setProjects([]);
        return;
      }

      // 构建查询参数
      const params: Record<string, unknown> = {
        customerId,
        // 仅加载达人采买业务类型
        businessType: 'talentProcurement',
      };

      // 根据周期类型添加筛选条件
      if (filters.cycle.type === 'business') {
        if (filters.cycle.year) params.year = filters.cycle.year;
        if (filters.cycle.month) params.month = filters.cycle.month;
      } else {
        if (filters.cycle.year) params.financialYear = filters.cycle.year;
        if (filters.cycle.month) params.financialMonth = filters.cycle.month;
      }

      try {
        logger.info('[useExecutionData] 加载项目列表, params:', params);
        const response = await projectApi.getProjects(params);

        logger.info('[useExecutionData] 项目列表响应:', response);

        if (response.success && response.data?.items) {
          const projectList: ProjectOption[] = response.data.items.map(
            (p: ProjectListItem) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              customerId: p.customerId || '',
            })
          );
          logger.info('[useExecutionData] 项目列表:', projectList);
          setProjects(projectList);

          // 构建项目映射
          const map = new Map<string, ProjectListItem>();
          response.data.items.forEach((p: ProjectListItem) => {
            map.set(p.id, p);
          });
          setProjectMap(map);
        }
      } catch (err) {
        logger.error('[useExecutionData] 加载项目列表失败', err);
      }
    },
    [filters.cycle.type, filters.cycle.year, filters.cycle.month]
  );

  // 加载合作记录（聚合多个项目）
  const loadCollaborations = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) {
      setRawCollaborations([]);
      return;
    }

    try {
      setLoading(true);

      // 并行请求多个项目的合作记录
      const results = await Promise.all(
        projectIds.map(projectId =>
          projectApi
            .getCollaborations({
              projectId,
              page: 1,
              pageSize: 500,
              statuses: EXECUTION_VALID_STATUSES.join(','),
            })
            .catch(err => {
              logger.error(
                `[useExecutionData] 加载项目 ${projectId} 合作失败`,
                err
              );
              return { success: false, data: { items: [] } };
            })
        )
      );

      // 聚合所有合作记录
      const allCollabs: Collaboration[] = [];
      results.forEach(res => {
        if (res.success && res.data?.items) {
          allCollabs.push(...res.data.items);
        }
      });

      setRawCollaborations(allCollabs);
      setError(null);
    } catch (err) {
      logger.error('[useExecutionData] 加载合作记录失败', err);
      setError('加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载客户列表
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 客户变更时加载项目列表
  useEffect(() => {
    loadProjects(filters.customerId);
  }, [filters.customerId, loadProjects]);

  // 项目变更时加载合作记录
  useEffect(() => {
    loadCollaborations(filters.projectIds);
  }, [filters.projectIds, loadCollaborations]);

  // 处理后的合作记录（添加项目信息和颜色）
  const collaborations = useMemo(() => {
    // 构建项目索引映射（用于颜色分配）
    const projectIndexMap = new Map<string, number>();
    filters.projectIds.forEach((id, index) => {
      projectIndexMap.set(id, index);
    });

    return rawCollaborations
      .filter(collab => {
        // 平台筛选
        if (
          filters.platforms.length > 0 &&
          !filters.platforms.includes(collab.talentPlatform)
        ) {
          return false;
        }
        return true;
      })
      .map(collab => {
        const project = projectMap.get(collab.projectId);
        const projectIndex = projectIndexMap.get(collab.projectId) || 0;

        return {
          ...collab,
          projectName: project?.name || '未知项目',
          projectStatus: project?.status || 'executing',
          projectColor: getProjectColor(projectIndex),
        } as CollaborationWithProject;
      });
  }, [rawCollaborations, projectMap, filters.platforms, filters.projectIds]);

  // 刷新数据
  const refetch = useCallback(async () => {
    await loadCollaborations(filters.projectIds);
  }, [filters.projectIds, loadCollaborations]);

  // 更新合作记录
  const updateCollaboration = useCallback(
    async (id: string, data: Partial<Collaboration>): Promise<boolean> => {
      try {
        const response = await projectApi.updateCollaboration(id, data);
        if (response.success) {
          await refetch();
          return true;
        }
        return false;
      } catch (err) {
        logger.error('[useExecutionData] 更新合作记录失败', err);
        return false;
      }
    },
    [refetch]
  );

  return {
    customers,
    projects,
    collaborations,
    loading,
    error,
    refetch,
    updateCollaboration,
  };
}
