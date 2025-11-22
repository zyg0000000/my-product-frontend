import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../types/customer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface GetCustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface GetCustomersParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  level?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class CustomerApi {
  /**
   * 获取客户列表
   */
  async getCustomers(params: GetCustomersParams): Promise<ApiResponse<GetCustomersResponse>> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_BASE_URL}/customers?${queryParams.toString()}`;
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
   * 获取客户详情
   */
  async getCustomerById(id: string): Promise<ApiResponse<Customer>> {
    const url = `${API_BASE_URL}/customers?id=${encodeURIComponent(id)}`;
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
   * 创建客户
   */
  async createCustomer(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    const url = `${API_BASE_URL}/customers`;
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
   * 更新客户
   */
  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> {
    const url = `${API_BASE_URL}/customers`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        ...data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 删除客户（软删除）
   */
  async deleteCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    const url = `${API_BASE_URL}/customers?id=${encodeURIComponent(id)}`;
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
}

export const customerApi = new CustomerApi();
