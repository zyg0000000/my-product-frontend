/**
 * 项目管理 API 服务
 * @module services/projectApi
 */

import type {
  Project,
  ProjectListItem,
  ProjectListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  GetProjectsParams,
  Collaboration,
  CollaborationListResponse,
  CreateCollaborationRequest,
  UpdateCollaborationRequest,
  BatchUpdateCollaborationsRequest,
  GetCollaborationsParams,
  DashboardOverview,
} from '../types/project';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * API 响应格式
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 构建查询参数字符串
 */
function buildQueryParams(params: Record<string, unknown>): URLSearchParams {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // 数组参数：platforms=douyin,xiaohongshu
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, String(value));
      }
    }
  });

  return queryParams;
}

/**
 * 项目 API 服务类
 */
class ProjectApi {
  // ==========================================================================
  // 项目 CRUD
  // ==========================================================================

  /**
   * 获取项目列表
   */
  async getProjects(
    params: GetProjectsParams
  ): Promise<ApiResponse<ProjectListResponse>> {
    const queryParams = buildQueryParams(
      params as unknown as Record<string, unknown>
    );
    const url = `${API_BASE_URL}/aw-projects?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 获取项目详情
   */
  async getProjectById(id: string): Promise<ApiResponse<Project>> {
    const url = `${API_BASE_URL}/aw-projects?id=${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 创建项目
   */
  async createProject(
    data: CreateProjectRequest
  ): Promise<ApiResponse<Project>> {
    const url = `${API_BASE_URL}/aw-projects`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 更新项目
   */
  async updateProject(
    id: string,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> {
    const url = `${API_BASE_URL}/aw-projects?id=${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    const url = `${API_BASE_URL}/aw-projects?id=${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ==========================================================================
  // 合作记录 CRUD
  // ==========================================================================

  /**
   * 获取合作记录列表
   */
  async getCollaborations(
    params: GetCollaborationsParams
  ): Promise<ApiResponse<CollaborationListResponse>> {
    const queryParams = buildQueryParams(
      params as unknown as Record<string, unknown>
    );
    const url = `${API_BASE_URL}/aw-collaborations?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 获取合作记录详情
   */
  async getCollaborationById(id: string): Promise<ApiResponse<Collaboration>> {
    const url = `${API_BASE_URL}/aw-collaborations?id=${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 创建合作记录
   */
  async createCollaboration(
    data: CreateCollaborationRequest
  ): Promise<ApiResponse<Collaboration>> {
    const url = `${API_BASE_URL}/aw-collaborations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 更新合作记录
   */
  async updateCollaboration(
    id: string,
    data: UpdateCollaborationRequest
  ): Promise<ApiResponse<Collaboration>> {
    const url = `${API_BASE_URL}/aw-collaborations?id=${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 删除合作记录
   */
  async deleteCollaboration(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    const url = `${API_BASE_URL}/aw-collaborations?id=${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 批量更新合作记录
   */
  async batchUpdateCollaborations(
    data: BatchUpdateCollaborationsRequest
  ): Promise<ApiResponse<{ updated: number }>> {
    const url = `${API_BASE_URL}/aw-collaborations/batch`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ==========================================================================
  // 统计与工作台
  // ==========================================================================

  /**
   * 获取项目统计数据
   */
  async getProjectStats(
    projectId: string
  ): Promise<ApiResponse<Project['stats']>> {
    const url = `${API_BASE_URL}/aw-projects/${encodeURIComponent(projectId)}/stats`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 获取工作台概览数据
   */
  async getDashboard(): Promise<ApiResponse<DashboardOverview>> {
    const url = `${API_BASE_URL}/aw-projects/dashboard`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ==========================================================================
  // 辅助方法
  // ==========================================================================

  /**
   * 刷新项目统计缓存
   */
  async refreshProjectStats(projectId: string): Promise<ApiResponse<Project>> {
    const url = `${API_BASE_URL}/aw-projects/${encodeURIComponent(projectId)}/refresh-stats`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * 项目 API 单例
 */
export const projectApi = new ProjectApi();

/**
 * 导出类型（供其他模块使用）
 */
export type { ProjectListItem, Project, Collaboration };
