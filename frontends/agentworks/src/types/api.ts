/**
 * 统一 API 响应类型定义
 *
 * 规范：
 * - 所有 API 响应都应该使用这些类型
 * - 禁止在 API 层使用 any 类型
 */

/**
 * 基础 API 响应
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * 可选数据的 API 响应（用于可能返回空数据的场景）
 */
export interface ApiResponseOptional<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

/**
 * 列表响应（带总数，不带分页）
 */
export interface ListResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  message?: string;
}

/**
 * 简单操作响应（创建、更新、删除）
 */
export interface OperationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 带 ID 的操作响应（创建后返回 ID）
 */
export interface CreateResponse {
  success: boolean;
  data: {
    _id: string;
    [key: string]: unknown;
  };
  message?: string;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * API 请求参数基础类型
 */
export interface BaseRequestParams {
  dbVersion?: string;
}

/**
 * 分页请求参数
 */
export interface PaginationParams extends BaseRequestParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 类型守卫：检查响应是否成功
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T> | ErrorResponse
): response is ApiResponse<T> {
  return response.success === true;
}

/**
 * 类型守卫：检查响应是否失败
 */
export function isErrorResponse(
  response: ApiResponse<unknown> | ErrorResponse
): response is ErrorResponse {
  return response.success === false;
}

/**
 * 从 unknown 错误中安全提取错误信息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return '未知错误';
}

/**
 * 安全处理 catch 块中的错误
 * 使用示例：
 * ```typescript
 * try {
 *   // ...
 * } catch (err) {
 *   const message = handleCatchError(err);
 *   console.error(message);
 * }
 * ```
 */
export function handleCatchError(error: unknown): string {
  return getErrorMessage(error);
}
