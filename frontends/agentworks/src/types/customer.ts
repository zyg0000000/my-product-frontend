/**
 * 客户管理相关类型定义
 */

// 客户级别
export type CustomerLevel = 'VIP' | 'large' | 'medium' | 'small';

// 客户状态
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

// 联系人信息
export interface Contact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

// 客户主体
export interface Customer {
  _id?: string;
  code: string;
  name: string;
  level: CustomerLevel;
  status: CustomerStatus;
  industry?: string;
  contacts: Contact[];
  businessStrategies?: any;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

// 创建客户请求
export interface CreateCustomerRequest {
  name: string;
  level: CustomerLevel;
  status: CustomerStatus;
  industry?: string;
  contacts?: Contact[];
  businessStrategies?: any;
  notes?: string;
}

// 更新客户请求
export interface UpdateCustomerRequest {
  name?: string;
  level?: CustomerLevel;
  status?: CustomerStatus;
  industry?: string;
  contacts?: Contact[];
  businessStrategies?: any;
  notes?: string;
}

// 常量定义
export const CUSTOMER_LEVEL_NAMES: Record<CustomerLevel, string> = {
  VIP: 'VIP',
  large: '大型',
  medium: '中型',
  small: '小型',
};

export const CUSTOMER_STATUS_NAMES: Record<CustomerStatus, string> = {
  active: '活跃',
  inactive: '停用',
  suspended: '暂停',
  deleted: '已删除',
};
