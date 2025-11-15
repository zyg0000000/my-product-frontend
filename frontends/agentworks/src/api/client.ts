/**
 * API 客户端配置
 */

// 旧 API Gateway（大部分函数）
const LEGACY_API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

// 新 API Gateway（新函数）
const NEW_API_BASE_URL = 'https://sd4c5lst6qlgb4inv1glg.apigateway-cn-shanghai.volceapi.com';

// 新 Gateway 上的接口列表
const NEW_GATEWAY_ENDPOINTS = [
  '/getTalentStats',
  // 未来迁移的接口逐步添加到这里
];

const DB_VERSION = 'v2'; // 使用 v2 数据库（agentworks_db）

/**
 * 根据 endpoint 选择合适的 API Gateway
 */
function getApiBaseUrl(endpoint: string): string {
  // 检查是否在新 Gateway 的接口列表中
  if (NEW_GATEWAY_ENDPOINTS.some(e => endpoint.startsWith(e))) {
    return NEW_API_BASE_URL;
  }
  // 默认使用旧 Gateway
  return LEGACY_API_BASE_URL;
}

/**
 * 通用请求函数
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl(endpoint);
  const url = `${baseUrl}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * GET 请求
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  let url = endpoint;

  // 合并 dbVersion 到参数中
  const allParams = {
    dbVersion: DB_VERSION,
    ...params,
  };

  const queryString = new URLSearchParams(
    Object.entries(allParams).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>
    )
  ).toString();

  if (queryString) {
    url += `?${queryString}`;
  }

  return apiRequest<T>(url, {
    method: 'GET',
  });
}

/**
 * POST 请求
 */
export async function post<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      dbVersion: DB_VERSION,
      ...data,
    }),
  });
}

/**
 * PUT 请求
 */
export async function put<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify({
      dbVersion: DB_VERSION,
      ...data,
    }),
  });
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    body: JSON.stringify({
      dbVersion: DB_VERSION,
      ...data,
    }),
  });
}
