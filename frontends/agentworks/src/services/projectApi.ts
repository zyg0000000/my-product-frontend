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
const DB_VERSION = 'v2'; // AgentWorks 使用 v2 数据库

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
   * 注意：后端不支持分页参数，返回所有项目后前端做筛选
   */
  async getProjects(
    params: GetProjectsParams
  ): Promise<ApiResponse<ProjectListResponse>> {
    // 使用完整视图（不带 view 参数）以获取 platforms 等字段
    // 添加 dbVersion=v2 使用 AgentWorks 数据库
    const url = `${API_BASE_URL}/projects?dbVersion=${DB_VERSION}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 后端返回 { success, count, data: Project[] }
    // 需要转换为前端期望的 { success, data: { items, total } }
    const result = await response.json();

    if (result.success) {
      let items = result.data || [];

      // 前端筛选
      if (params.keyword) {
        const keyword = params.keyword.toLowerCase();
        items = items.filter((p: ProjectListItem) =>
          p.name?.toLowerCase().includes(keyword)
        );
      }
      if (params.projectCode) {
        items = items.filter(
          (p: ProjectListItem) => p.projectCode === params.projectCode
        );
      }
      if (params.status) {
        items = items.filter((p: ProjectListItem) => p.status === params.status);
      }
      if (params.year) {
        items = items.filter((p: ProjectListItem) => p.year === params.year);
      }
      if (params.month) {
        items = items.filter((p: ProjectListItem) => p.month === params.month);
      }
      if (params.platforms && params.platforms.length > 0) {
        // 筛选包含指定平台的项目（只要项目平台列表包含任一筛选平台即匹配）
        items = items.filter((p: ProjectListItem) =>
          p.platforms?.some(platform => params.platforms?.includes(platform))
        );
      }
      if (params.businessType) {
        items = items.filter(
          (p: ProjectListItem) => p.businessType === params.businessType
        );
      }
      if (params.customerKeyword) {
        const keyword = params.customerKeyword.toLowerCase();
        items = items.filter((p: ProjectListItem) =>
          p.customerName?.toLowerCase().includes(keyword)
        );
      }
      if (params.financialYear) {
        items = items.filter(
          (p: ProjectListItem) => p.financialYear === params.financialYear
        );
      }
      if (params.financialMonth) {
        items = items.filter(
          (p: ProjectListItem) => p.financialMonth === params.financialMonth
        );
      }

      // 前端分页
      const total = items.length;
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      const start = (page - 1) * pageSize;
      const paginatedItems = items.slice(start, start + pageSize);

      return {
        success: true,
        data: {
          items: paginatedItems,
          total,
          page,
          pageSize,
        },
      };
    }

    return {
      success: false,
      data: { items: [], total: 0, page: 1, pageSize: 20 },
      message: result.message,
    };
  }

  /**
   * 获取项目详情
   */
  async getProjectById(id: string): Promise<ApiResponse<Project>> {
    // 后端使用 projectId 参数
    const url = `${API_BASE_URL}/projects?dbVersion=${DB_VERSION}&projectId=${encodeURIComponent(id)}`;

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
    const url = `${API_BASE_URL}/projects?dbVersion=${DB_VERSION}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, dbVersion: DB_VERSION }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 更新项目
   * 注意：后端 updateProject 云函数绑定的是 /update-project 路由
   */
  async updateProject(
    id: string,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> {
    const url = `${API_BASE_URL}/update-project`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, id, dbVersion: DB_VERSION }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 删除项目
   * 注意：后端 deleteProject 云函数绑定的是 /delete-project 路由
   */
  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    const url = `${API_BASE_URL}/delete-project`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: id,
        dbVersion: DB_VERSION,
      }),
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
    const url = `${API_BASE_URL}/collaborations?${queryParams.toString()}`;

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
    const url = `${API_BASE_URL}/collaborations?id=${encodeURIComponent(id)}`;

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
    const url = `${API_BASE_URL}/collaborations`;

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
    const url = `${API_BASE_URL}/collaborations?id=${encodeURIComponent(id)}`;

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
    const url = `${API_BASE_URL}/collaborations?id=${encodeURIComponent(id)}`;

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
    const url = `${API_BASE_URL}/collaborations/batch`;

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
    const url = `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/stats`;

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
    const url = `${API_BASE_URL}/projects/dashboard`;

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
    const url = `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/refresh-stats`;

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
